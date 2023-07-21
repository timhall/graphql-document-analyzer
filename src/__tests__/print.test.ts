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

test("should print document-level comments", () => {
	const source = `# A (before)
query A {
  a
}
#A (after)

# B (before, 1)

# B (before, 2)
query B {
  b
}
# B (after, 1)
# B (after, 2)

# C (before)
query C {
  c
}
# C (after, 1)

# C (after, 2)`;
	const document = analyze(source);

	expect(print(document)).toEqual(`${source}\n`);
});

test("should print selection comments", () => {
	const source = `query A {
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
}`;
	const document = analyze(source);

	expect(print(document)).toEqual(`${source}\n`);
});
