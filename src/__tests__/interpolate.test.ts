import { expect, test } from "vitest";
import { analyze } from "../analyze";
import { ExtendedASTNode } from "../extended-ast";
import { interpolate } from "../interpolate";

test("should interpolate single anonymous operation", () => {
	const reference = analyze(`query { a }`);
	const document = analyze("query { a { }");
	const interpolated = interpolate(document, reference);

	expect(withoutLoc(interpolated.definitions[0])).toEqual(
		withoutLoc(reference.definitions[0])
	);
});

test("should interpolate single named operation", () => {
	const reference = analyze(`query A { a }`);
	const document = analyze("query A { a { }");
	const interpolated = interpolate(document, reference);

	expect(withoutLoc(interpolated.definitions[0])).toEqual(
		withoutLoc(reference.definitions[0])
	);
});

test("should interpolate single named operation", () => {
	const reference = analyze(`query A { a }`);
	const document = analyze("query A { a { }");
	const interpolated = interpolate(document, reference);

	expect(withoutLoc(interpolated.definitions[0])).toEqual(
		withoutLoc(reference.definitions[0])
	);
});

test("should interpolate document", () => {
	const reference = analyze(`
query A { a }
query { b }
mutation D { d }
mutation { e }
subscription F { f }
subscription { g }
`);
	const document = analyze(`
query A { a }
query { b { }
mutation D { d { }
mutation { e }
subscription F { f }
subscription { g { }
`);
	const interpolated = interpolate(document, reference);

	expect(interpolated.definitions.length).toBe(document.definitions.length);
	expect(withoutLoc(interpolated.definitions[0])).toEqual(
		withoutLoc(document.definitions[0])
	);
	expect(withoutLoc(interpolated.definitions[1])).toEqual(
		withoutLoc(reference.definitions[1])
	);
	expect(withoutLoc(interpolated.definitions[2])).toEqual(
		withoutLoc(reference.definitions[2])
	);
	expect(withoutLoc(interpolated.definitions[3])).toEqual(
		withoutLoc(document.definitions[3])
	);
	expect(withoutLoc(interpolated.definitions[4])).toEqual(
		withoutLoc(document.definitions[4])
	);
	expect(withoutLoc(interpolated.definitions[5])).toEqual(
		withoutLoc(reference.definitions[5])
	);
});

test("should use location of existing section", () => {
	const reference = analyze(`query A {
  a
}
`);
	const document = analyze(`

query A {
  a {
    b {
  } 
}
`);
	const interpolated = interpolate(document, reference);

	expect(interpolated.definitions[0].loc).toEqual(document.definitions[0].loc);
});

function withoutLoc(value: ExtendedASTNode): ExtendedASTNode {
	return { ...value, loc: undefined };
}
