import { print } from "../print";
import { test, expect } from "vitest";
import { parse } from "graphql";
import { analyze } from "../analyze";

test("should print valid ExtendedDocumentNode", () => {
	const source = `query A {
  a
}`;
	const document = analyze(source);

	expect(print(document)).toEqual(`${source}\n`);
});

test("should print comments and invalid", () => {
	const source = `# A

query A {
  a
}

query B {
  b {
}

# A
# B
# C`;
	const document = analyze(source);

	expect(print(document)).toEqual(`${source}\n`);
});

test("should print invalid, but readable documents", () => {
	const source = `query A {
  a {

  }
}

query B {
  b
  c {
    d
  }
}`;
	const document = analyze(source);

	expect(print(document)).toEqual(`${source}\n`);
});

test("should print document", () => {
	const source = `{
  a
}`;
	const document = parse(source);

	expect(print(document)).toEqual(`${source}\n`);
});

test("should wrap variables and arguments, if needed", () => {
	const source = `query A($b: Int, $c: Float) {
	d(e: "f", g: "h") {
		i
	}
}

query J($kReallyReallyReallyReallyLong: Boolean!, $lReallyReallyReallyReallyLong: ID!) {
	m(n: "................................", o: {p: { q: { r: "..............................", s: "........................" } } }) {
		s
	}
}`;
	const document = parse(source);

	expect(print(document)).toMatchInlineSnapshot(`
		"query A($b: Int, $c: Float) {
		  d(e: \\"f\\", g: \\"h\\") {
		    i
		  }
		}

		query J(
		  $kReallyReallyReallyReallyLong: Boolean!
		  $lReallyReallyReallyReallyLong: ID!
		) {
		  m(
		    n: \\"................................\\"
		    o: {
		      p: { q: { r: \\"..............................\\", s: \\"........................\\" } }
		    }
		  ) {
		    s
		  }
		}
		"
	`);
});
