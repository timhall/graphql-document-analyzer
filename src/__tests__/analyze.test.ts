import { OperationDefinitionNode } from "graphql";
import { test, expect } from "vitest";
import { analyze } from "../analyze";
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

  expect(document.definitions.length).toBe(0);
  expect(document.sections.length).toBe(1);
  expect((document.sections[0] as IgnoredNode).value).toEqual(
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

  expect(document.definitions.length).toBe(2);
  expect(document.sections.length).toBe(5);
  expect(document.definitions[0]).toBe(document.sections[1]);
  expect(document.definitions[1]).toBe(document.sections[3]);
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

  expect(document.definitions.length).toBe(1);
  expect(document.sections.length).toBe(7);
  expect(document.definitions[0].kind).toEqual("OperationDefinition");
  expect(
    (document.definitions[0] as OperationDefinitionNode).name?.value
  ).toEqual("B");
});

test("should include operation information for invalid definitions", () => {
  const document = analyze(`
query A {
  a {
}

{
  b {
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
  ).toEqual("query");
  expect(
    (document.sections[1] as InvalidOperationDefinitionNode).name?.value
  ).toEqual("A");

  expect(
    (document.sections[3] as InvalidOperationDefinitionNode).operation
  ).toEqual("query");
  expect((document.sections[3] as InvalidOperationDefinitionNode).name).toEqual(
    undefined
  );

  expect(
    (document.sections[5] as InvalidOperationDefinitionNode).operation
  ).toEqual("query");
  expect((document.sections[5] as InvalidOperationDefinitionNode).name).toEqual(
    undefined
  );

  expect(
    (document.sections[7] as InvalidOperationDefinitionNode).operation
  ).toEqual("mutation");
  expect(
    (document.sections[7] as InvalidOperationDefinitionNode).name?.value
  ).toEqual("D");

  expect(
    (document.sections[9] as InvalidOperationDefinitionNode).operation
  ).toEqual("subscription");
  expect((document.sections[9] as InvalidOperationDefinitionNode).name).toEqual(
    undefined
  );
});

test("should include operation information for invalid definitions", () => {
  const document = analyze(`
fragment F {
  a {
}
`);

  expect(
    (document.sections[1] as InvalidFragmentDefinitionNode).name.value
  ).toEqual("F");
});

test("should parse empty selection sets", () => {
  const document = analyze(`
query A {
  a {

  }
}
`);

  expect(document.definitions.length).toBe(1);
  expect(
    (document.definitions[0] as OperationDefinitionNode).name?.value
  ).toEqual("A");
});
