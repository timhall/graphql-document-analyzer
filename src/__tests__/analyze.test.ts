import {
	FragmentDefinitionNode,
	OperationDefinitionNode,
	SelectionNode,
} from "graphql";
import { describe, expect, test } from "vitest";
import { analyze, ExtendedParser } from "../analyze";
import { Comments, Extended } from "../extended-ast";
import { substring } from "../lib/substring";

test("should parse comment sections", () => {
	const document = analyze(`
# A

# B

# C
`);

	expect(document.definitions.length).toBe(0);
});

test("should parse operations", () => {
	const document = analyze(`
query A {
  a
}

query B {
  b
}
`);

	expect(document.definitions.length).toBe(2);
});

test("should parse invalid operations", () => {
	const document = analyze(`
query A {
  a {
}

query B {
  b
}

query C {
  c {
}
`);

	expect(document.definitions.length).toBe(3);
	expect(document.definitions[1].kind).toBe("OperationDefinition");
	expect((document.definitions[1] as OperationDefinitionNode).name?.value).toBe(
		"B"
	);
});

test("should include operation information for invalid definitions", () => {
	const document = analyze(`
query A {
  a {
}

query {
  c {
}

mutation D {
  d {
}

subscription {
  e {
}
`);

	expect(
		(document.definitions[0] as InvalidOperationDefinitionNode).operation
	).toBe("query");
	expect(
		(document.definitions[0] as InvalidOperationDefinitionNode).name?.value
	).toBe("A");

	expect(
		(document.definitions[1] as InvalidOperationDefinitionNode).operation
	).toBe("query");
	expect((document.definitions[1] as InvalidOperationDefinitionNode).name).toBe(
		undefined
	);

	expect(
		(document.definitions[2] as InvalidOperationDefinitionNode).operation
	).toBe("mutation");
	expect(
		(document.definitions[2] as InvalidOperationDefinitionNode).name?.value
	).toBe("D");

	expect(
		(document.definitions[3] as InvalidOperationDefinitionNode).operation
	).toBe("subscription");
	expect((document.definitions[3] as InvalidOperationDefinitionNode).name).toBe(
		undefined
	);
});

test("should include operation information for invalid definitions", () => {
	const document = analyze(`
fragment F on G {
  a {
}
`);

	expect(
		(document.definitions[0] as InvalidFragmentDefinitionNode).name.value
	).toBe("F");
});

test("should parse empty selection sets", () => {
	const document = analyze(`
query A {
  a {

  }
}
`);

	expect(document.definitions.length).toBe(1);
	expect((document.definitions[0] as OperationDefinitionNode).name?.value).toBe(
		"A"
	);
});

test("should analyze single line operation", () => {
	const document = analyze("query A { a }");

	expect(document.definitions.length).toBe(1);
	expect((document.definitions[0] as OperationDefinitionNode).name?.value).toBe(
		"A"
	);
});

test("should analyze single line fragment", () => {
	const document = analyze("fragment B on C { d }");

	expect(document.definitions.length).toBe(1);
	expect((document.definitions[0] as FragmentDefinitionNode).name.value).toBe(
		"B"
	);
});

test("should analyze query with variables", () => {
	const document = analyze(`
query A($id: ID!) {
  a(id: $id) {
    b
  }
}

query C($id: ID!) {
  c(id: $id) {


}
  `);

	expect(document.definitions.length).toBe(2);
	expect(document.definitions[0].kind).toBe("OperationDefinition");
	expect((document.definitions[0] as OperationDefinitionNode).name?.value).toBe(
		"A"
	);

	expect(document.definitions[1].kind).toBe("OperationDefinition");
	expect((document.definitions[1] as OperationDefinitionNode).name?.value).toBe(
		"C"
	);
});

test("should analyze query with /r/n line endings", () => {
	const document = analyze("query A {\r\n\ta {\r\n\t\tid\r\n\t}\r\n}\n");

	expect(document.definitions.length).toBe(1);
	expect(document.definitions[0].kind).toBe("OperationDefinition");
});

test("should analyze with top-level curlies", () => {
	const document = analyze(
		`
{
a {
b
}
}
query A {
a {
b
}
}

query B {
c 
	{d(e: "}"}}
`
	);
});

test("should add comments to selections", () => {
	const document = analyze(`
query A {
	# a
  a {

  }

	#b.before
	b
	#b.after

	# c.1

	# c.2
	c
	# c.after
}
`);

	expect(document.definitions.length).toBe(1);
	expect(document.definitions[0].kind).toBe("OperationDefinition");

	const selections = (document.definitions[0] as OperationDefinitionNode)
		.selectionSet.selections as Array<SelectionNode & { comments?: Comments }>;
	expect(selections[0].comments?.preceding?.[0]?.value).toBe(" a");
	expect(selections[0].comments?.following?.length).toBe(0);
	expect(selections[1].comments?.preceding?.[0]?.value).toBe("b.before");
	expect(selections[1].comments?.following?.[0]?.value).toBe("b.after");
	expect(selections[2].comments?.preceding?.[0]?.value).toBe(" c.1");
	expect(selections[2].comments?.preceding?.[1]?.value).toBe(" c.2");
	expect(selections[2].comments?.following?.[0]?.value).toBe(" c.after");
});

describe("ResilientParser", () => {
	test("should parse sections", () => {
		const parser = new ExtendedParser(`
# leading

	{
a {
b
}

query A {	
a {
b
}
}
# comment

# another
{

query B {
c
	{d(e: "}")}}

fragment A on B {
}
}

fragment C on D {
	e
}

# trailing
    `);

		const document = parser.parseExtendedDocument();

		expect(document.definitions.length).toBe(5);

		expect(document.definitions[0].kind).toBe("OperationDefinition");
		expect(
			substring(
				(document.definitions[0] as Extended<OperationDefinitionNode>)
					.errors?.[0].loc
			)
		).toBe("{\na {\nb\n}");
		expect(document.definitions[0].comments?.preceding?.[0]?.value).toBe(
			" leading"
		);

		expect(document.definitions[1].kind).toBe("OperationDefinition");
		expect(
			substring(
				(document.definitions[1] as Extended<OperationDefinitionNode>)
					.errors?.[0].loc
			)
		).toBe("query A {\t\na {\nb\n}\n}\n# comment\n\n# another\n{");

		expect(document.definitions[2].kind).toBe("OperationDefinition");

		expect(document.definitions[3].kind).toBe("FragmentDefinition");
		expect(
			substring(
				(document.definitions[3] as Extended<FragmentDefinitionNode>)
					.errors?.[0].loc
			)
		).toBe("fragment A on B {\n}\n}");

		expect(document.definitions[4].kind).toBe("FragmentDefinition");
		expect(document.definitions[4].comments?.following?.[0]?.value).toBe(
			" trailing"
		);
	});

	test("should parse odd indentation", () => {
		const parser = new ExtendedParser(`query Cart {
			cart(id: "123") {
					grandTotal {
							formatted
					}
					id
					items {
							name
							quantity
							lineTotal {
									formatted
							}
					}
	}
	}
	
	mutation AddItem {
			addItem(
					input: {cartId: "123", id: "shirt", name: "Shirt", price: 2500, quantity: 5, type: SKU}
			) {
					id
			}
	}
	
	mutation EmptyCart {
			emptyCart(input: {id: "123"}) {
					id
			}
	}
	`);

		const document = parser.parseExtendedDocument();
		expect(document.definitions.length).toBe(3);
		expect(document.definitions[0].kind).toBe("OperationDefinition");
	});

	test("should handle syntax errors", () => {
		const source = `query Test {
		# \u042B
		Ы
	}`;
		const parser = new ExtendedParser(source);

		const document = parser.parseExtendedDocument();
		expect(document.definitions.length).toBe(1);
		expect(document.definitions[0].kind).toBe("OperationDefinition");
		expect(
			substring(
				(document.definitions[0] as Extended<OperationDefinitionNode>)
					.errors?.[0].loc
			)
		).toBe(source);
	});
});
