import { expect, test } from "vitest";
import { IgnoredNode, InvalidOperationDefinitionNode } from "../extended-ast";
import { ResilientParser } from "../resilient-parser";

test("should parse sections", () => {
	const parser = new ResilientParser(`
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
		"{\na {\nb\n}",
	);

	expect(document.sections[2].kind).toBe("Ignored");
	expect((document.sections[2] as IgnoredNode).value).toBe("");

	expect(document.sections[3].kind).toBe("InvalidOperationDefinition");
	expect((document.sections[3] as InvalidOperationDefinitionNode).value).toBe(
		"query A {\t\na {\nb\n}\n}\n# comment\n\n# another\n{",
	);

	expect(document.sections[4].kind).toBe("Ignored");
	expect((document.sections[4] as IgnoredNode).value).toBe("");

	expect(document.sections[5].kind).toBe("OperationDefinition");

	expect(document.sections[6].kind).toBe("Ignored");
	expect((document.sections[6] as IgnoredNode).value).toBe("");

	expect(document.sections[7].kind).toBe("InvalidFragmentDefinition");
	expect((document.sections[7] as IgnoredNode).value).toBe(
		"fragment A on B {\n}\n}",
	);

	expect(document.sections[8].kind).toBe("Ignored");
	expect((document.sections[8] as IgnoredNode).value).toBe("");

	expect(document.sections[9].kind).toBe("FragmentDefinition");

	expect(document.sections[10].kind).toBe("Ignored");
	expect((document.sections[10] as IgnoredNode).value).toBe(
		"\n# trailing\n    ",
	);
});

test("should parse odd indentation", () => {
	const parser = new ResilientParser(`query Cart {
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
	const parser = new ResilientParser(source);

	const document = parser.parseExtendedDocument();
	expect(document.sections.length).toBe(1);
	expect(document.sections[0].kind).toBe("InvalidOperationDefinition");
	expect((document.sections[0] as InvalidOperationDefinitionNode).value).toBe(
		source,
	);
});
