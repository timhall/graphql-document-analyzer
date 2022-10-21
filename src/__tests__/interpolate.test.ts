import { test, expect } from "vitest";
import { interpolate } from "../interpolate";
import { analyze } from "../analyze";

test("should interpolate single anonymous operation", () => {
  const reference = analyze(`query { a }`);
  const document = analyze("query { a { }");
  const interpolated = interpolate(document, reference);

  expect(reference.definitions.length).toBe(1);
  expect(document.definitions.length).toBe(0);
  expect(interpolated.definitions[0]).toBe(reference.definitions[0]);
});

test("should interpolate single named operation", () => {
  const reference = analyze(`query A { a }`);
  const document = analyze("query A { a { }");
  const interpolated = interpolate(document, reference);

  expect(reference.definitions.length).toBe(1);
  expect(document.definitions.length).toBe(0);
  expect(interpolated.definitions[0]).toBe(reference.definitions[0]);
});

test("should interpolate single named operation", () => {
  const reference = analyze(`query A { a }`);
  const document = analyze("query A { a { }");
  const interpolated = interpolate(document, reference);

  expect(reference.definitions.length).toBe(1);
  expect(document.definitions.length).toBe(0);
  expect(interpolated.definitions[0]).toBe(reference.definitions[0]);
});

test("should interpolate document", () => {
  const reference = analyze(`
query A { a }
query { b }
{ c }
mutation D { d }
mutation { e }
subscription F { f }
subscription { g }
`);
  const document = analyze(`
query A { a }
query { b { }
{ c }
mutation D { d { }
mutation { e }
subscription F { f }
subscription { g { }
`);
  const interpolated = interpolate(document, reference);

  expect(reference.definitions.length).toBe(7);
  expect(document.definitions.length).toBe(4);
  // expect(interpolated.definitions[0]).toBe(reference.definitions[0]);
});
