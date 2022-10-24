import { test, expect } from "vitest";
import { interpolate } from "../interpolate";
import { analyze } from "../analyze";

test("should interpolate single anonymous operation", () => {
  const reference = analyze(`query { a }`);
  const document = analyze("query { a { }");
  const interpolated = interpolate(document, reference);

  expect(interpolated.sections[0]).toBe(reference.sections[0]);
});

test("should interpolate single named operation", () => {
  const reference = analyze(`query A { a }`);
  const document = analyze("query A { a { }");
  const interpolated = interpolate(document, reference);

  expect(interpolated.sections[0]).toBe(reference.sections[0]);
});

test("should interpolate single named operation", () => {
  const reference = analyze(`query A { a }`);
  const document = analyze("query A { a { }");
  const interpolated = interpolate(document, reference);

  expect(interpolated.sections[0]).toBe(reference.sections[0]);
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

  expect(interpolated.sections.length).toBe(document.sections.length);
  expect(interpolated.sections[0]).toBe(document.sections[0]);
  expect(interpolated.sections[1]).toBe(document.sections[1]);
  expect(interpolated.sections[2]).toBe(reference.sections[2]);
  expect(interpolated.sections[3]).toBe(document.sections[3]);
  expect(interpolated.sections[4]).toBe(reference.sections[4]);
  expect(interpolated.sections[5]).toBe(document.sections[5]);
  expect(interpolated.sections[6]).toBe(document.sections[6]);
  expect(interpolated.sections[7]).toBe(reference.sections[7]);
});
