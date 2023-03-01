import { FragmentDefinitionNode, OperationDefinitionNode } from "graphql";
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
  ).toBe("query");
  expect((document.sections[5] as InvalidOperationDefinitionNode).name).toBe(
    undefined
  );

  expect(
    (document.sections[7] as InvalidOperationDefinitionNode).operation
  ).toBe("mutation");
  expect(
    (document.sections[7] as InvalidOperationDefinitionNode).name?.value
  ).toBe("D");

  expect(
    (document.sections[9] as InvalidOperationDefinitionNode).operation
  ).toBe("subscription");
  expect((document.sections[9] as InvalidOperationDefinitionNode).name).toBe(
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
}
  `);

  expect(document.sections.length).toBe(5);
  expect(document.sections[1].kind).toBe('OperationDefinition');
  expect((document.sections[1] as OperationDefinitionNode).name?.value).toBe(
    "A"
  );
  expect(document.sections[3].kind).toBe('InvalidOperationDefinition');
  expect((document.sections[3] as InvalidOperationDefinitionNode).name?.value).toBe(
    "C"
  );
})

test("should analyze query with /r/n line endings", () => {
  const document = analyze('query A {\r\n\ta {\r\n\t\tid\r\n\t}\r\n}\n');

  expect(document.sections.length).toBe(2);
  expect(document.sections[0].kind).toBe('OperationDefinition');
  expect(document.sections[1].kind).toBe('Ignored');
})
