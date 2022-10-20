import { print } from "../print";
import { test, expect } from "vitest";
import { parse } from "graphql";
import { analyze } from "../analyze";

test("should print DocumentNode", () => {
  const source = `query A {
  a
}`;
  const document = parse(source);

  expect(print(document)).toEqual(source);
});

test("should print valid analyzed document", () => {
  const source = `query A {
  a
}`;
  const document = analyze(source);

  expect(print(document)).toEqual(source);
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

  expect(print(document)).toEqual(source);
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

  expect(print(document)).toEqual(source);
});
