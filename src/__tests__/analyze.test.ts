import { FragmentDefinitionNode, OperationDefinitionNode } from "graphql";
import { describe, expect, test } from "vitest";
import { analyze, ExtendedParser } from "../analyze";
import {
	IgnoredNode,
	InvalidFragmentDefinitionNode,
	InvalidOperationDefinitionNode,
} from "../extended-ast";

test("should parse comment sections", () => {
	const document = analyze(`
# A

# B

# C
`);

	expect(document.sections.length).toBe(1);
	expect((document.sections[0] as IgnoredNode).value).toBe(
		"\n# A\n\n# B\n\n# C\n"
	);
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

	expect(document.sections.length).toBe(5);
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

	expect(document.sections.length).toBe(7);
	expect(document.sections[3].kind).toBe("OperationDefinition");
	expect((document.sections[3] as OperationDefinitionNode).name?.value).toBe(
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
		(document.sections[1] as InvalidOperationDefinitionNode).operation
	).toBe("query");
	expect(
		(document.sections[1] as InvalidOperationDefinitionNode).name?.value
	).toBe("A");

	expect(
		(document.sections[3] as InvalidOperationDefinitionNode).operation
	).toBe("query");
	expect((document.sections[3] as InvalidOperationDefinitionNode).name).toBe(
		undefined
	);

	expect(
		(document.sections[5] as InvalidOperationDefinitionNode).operation
	).toBe("mutation");
	expect(
		(document.sections[5] as InvalidOperationDefinitionNode).name?.value
	).toBe("D");

	expect(
		(document.sections[7] as InvalidOperationDefinitionNode).operation
	).toBe("subscription");
	expect((document.sections[7] as InvalidOperationDefinitionNode).name).toBe(
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
		(document.sections[1] as InvalidFragmentDefinitionNode).name.value
	).toBe("F");
});

test("should parse empty selection sets", () => {
	const document = analyze(`
query A {
  a {

  }
}
`);

	expect(document.sections.length).toBe(3);
	expect((document.sections[1] as OperationDefinitionNode).name?.value).toBe(
		"A"
	);
});

test("should analyze single line operation", () => {
	const document = analyze("query A { a }");

	expect(document.sections.length).toBe(1);
	expect((document.sections[0] as OperationDefinitionNode).name?.value).toBe(
		"A"
	);
});

test("should analyze single line fragment", () => {
	const document = analyze("fragment B on C { d }");

	expect(document.sections.length).toBe(1);
	expect((document.sections[0] as FragmentDefinitionNode).name.value).toBe("B");
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

	expect(document.sections.length).toBe(5);
	expect(document.sections[1].kind).toBe("OperationDefinition");
	expect((document.sections[1] as OperationDefinitionNode).name?.value).toBe(
		"A"
	);

	expect(document.sections[3].kind).toBe("InvalidOperationDefinition");
	expect(
		(document.sections[3] as InvalidOperationDefinitionNode).name?.value
	).toBe("C");
});

test("should analyze query with /r/n line endings", () => {
	const document = analyze("query A {\r\n\ta {\r\n\t\tid\r\n\t}\r\n}\n");

	expect(document.sections.length).toBe(2);
	expect(document.sections[0].kind).toBe("OperationDefinition");
	expect(document.sections[1].kind).toBe("Ignored");
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

		expect(document.sections.length).toBe(11);

		expect(document.sections[0].kind).toBe("Ignored");
		expect((document.sections[0] as IgnoredNode).value).toBe("\n# leading\n");

		expect(document.sections[1].kind).toBe("InvalidOperationDefinition");
		expect((document.sections[1] as InvalidOperationDefinitionNode).value).toBe(
			"{\na {\nb\n}"
		);

		expect(document.sections[2].kind).toBe("Ignored");
		expect((document.sections[2] as IgnoredNode).value).toBe("");

		expect(document.sections[3].kind).toBe("InvalidOperationDefinition");
		expect((document.sections[3] as InvalidOperationDefinitionNode).value).toBe(
			"query A {\t\na {\nb\n}\n}\n# comment\n\n# another\n{"
		);

		expect(document.sections[4].kind).toBe("Ignored");
		expect((document.sections[4] as IgnoredNode).value).toBe("");

		expect(document.sections[5].kind).toBe("OperationDefinition");

		expect(document.sections[6].kind).toBe("Ignored");
		expect((document.sections[6] as IgnoredNode).value).toBe("");

		expect(document.sections[7].kind).toBe("InvalidFragmentDefinition");
		expect((document.sections[7] as IgnoredNode).value).toBe(
			"fragment A on B {\n}\n}"
		);

		expect(document.sections[8].kind).toBe("Ignored");
		expect((document.sections[8] as IgnoredNode).value).toBe("");

		expect(document.sections[9].kind).toBe("FragmentDefinition");

		expect(document.sections[10].kind).toBe("Ignored");
		expect((document.sections[10] as IgnoredNode).value).toBe(
			"\n# trailing\n    "
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
		expect(document.sections.length).toBe(6);
		expect(document.sections[0].kind).toBe("OperationDefinition");
	});

	test("should handle syntax errors", () => {
		const source = `query Test {
		# \u042B
		Ы
	}`;
		const parser = new ExtendedParser(source);

		const document = parser.parseExtendedDocument();
		expect(document.sections.length).toBe(1);
		expect(document.sections[0].kind).toBe("InvalidOperationDefinition");
		expect((document.sections[0] as InvalidOperationDefinitionNode).value).toBe(
			source
		);
	});
});
