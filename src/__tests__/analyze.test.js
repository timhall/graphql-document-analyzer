import { test, expect } from "vitest";
import { analyze } from "../analyze";

test("should parse comment sections", () => {
  const document = analyze(`
# A

# B

# C
  `);

  expect(document.definitions.length).toBe(0);
  expect(document.sections.length).toBe(3);
  expect(document.sections[1].value).toEqual("# B");
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
  expect(document.sections.length).toBe(2);
  expect(document.definitions[0]).toBe(document.sections[0]);
  expect(document.definitions[1]).toBe(document.sections[1]);
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

  console.log("DOCUMENT", document);

  expect(document.definitions.length).toBe(1);
  expect(document.sections.length).toBe(3);
  expect(document.definitions[0].kind).toEqual("OperationDefinition");
  expect(document.definitions[0].name?.value).toEqual("B");
});

test("should combine multi-line comments", () => {
  const document = analyze(`
# A
# B
# C
  `);

  expect(document.sections.length).toBe(1);
  expect(document.sections[0].value).toEqual("# A\n# B\n# C");
});
