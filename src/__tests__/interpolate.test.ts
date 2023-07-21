import { expect, test } from "vitest";
import { analyze } from "../analyze";
import { ExtendedASTNode } from "../extended-ast";
import { interpolate } from "../interpolate";

test("should interpolate single anonymous operation", () => {
	const reference = analyze(`query { a }`);
	const document = analyze("query { a { }");
	const interpolated = interpolate(document, reference);

	expect(withoutLoc(interpolated.sections[0])).toEqual(
		withoutLoc(reference.sections[0])
	);
});

test("should interpolate single named operation", () => {
	const reference = analyze(`query A { a }`);
	const document = analyze("query A { a { }");
	const interpolated = interpolate(document, reference);

	expect(withoutLoc(interpolated.sections[0])).toEqual(
		withoutLoc(reference.sections[0])
	);
});

test("should interpolate single named operation", () => {
	const reference = analyze(`query A { a }`);
	const document = analyze("query A { a { }");
	const interpolated = interpolate(document, reference);

	expect(withoutLoc(interpolated.sections[0])).toEqual(
		withoutLoc(reference.sections[0])
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

	expect(interpolated.sections.length).toBe(document.sections.length);
	expect(withoutLoc(interpolated.sections[0])).toEqual(
		withoutLoc(document.sections[0])
	);
	expect(withoutLoc(interpolated.sections[1])).toEqual(
		withoutLoc(document.sections[1])
	);
	expect(withoutLoc(interpolated.sections[2])).toEqual(
		withoutLoc(reference.sections[2])
	);
	expect(withoutLoc(interpolated.sections[3])).toEqual(
		withoutLoc(reference.sections[3])
	);
	expect(withoutLoc(interpolated.sections[4])).toEqual(
		withoutLoc(document.sections[4])
	);
	expect(withoutLoc(interpolated.sections[5])).toEqual(
		withoutLoc(document.sections[5])
	);
	expect(withoutLoc(interpolated.sections[6])).toEqual(
		withoutLoc(reference.sections[6])
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

	expect(interpolated.sections[1].loc).toEqual(document.sections[1].loc);
});

function withoutLoc(value: ExtendedASTNode): ExtendedASTNode {
	return { ...value, loc: undefined };
}
