import { Source } from "graphql";
import { expect, test } from "vitest";
import { IgnoredNode, invalidOperationDefinition } from "../../extended-ast";
import { insertWhitespace } from "../insert-whitespace";
import { splitLines } from "../source";

test("should not add whitespace for no blank lines", () => {
	const source = new Source(`query {
query {`);

	const lines = splitLines(source);
	const sections = [
		invalidOperationDefinition(source, "query", undefined, lines[0], lines[0]),
		invalidOperationDefinition(source, "query", undefined, lines[1], lines[1]),
	];

	const whitespace = insertWhitespace(source, lines, sections);
	expect(whitespace.length).toBe(2);
});

test("should add whitespace between sections (with new-lines as-needed)", () => {
	const source = new Source(`query {



query {`);

	const lines = splitLines(source);
	const sections = [
		invalidOperationDefinition(source, "query", undefined, lines[0], lines[0]),
		invalidOperationDefinition(source, "query", undefined, lines[4], lines[4]),
	];

	const whitespace = insertWhitespace(source, lines, sections);
	expect(whitespace[1].kind).toBe("Ignored");
	expect((whitespace[1] as IgnoredNode).value).toBe("\n\n");
});

test("should add whitespace before sections (with new-lines as-needed)", () => {
	const source = new Source(`

query {
query {`);

	const lines = splitLines(source);
	const sections = [
		invalidOperationDefinition(source, "query", undefined, lines[2], lines[2]),
		invalidOperationDefinition(source, "query", undefined, lines[3], lines[3]),
	];

	const whitespace = insertWhitespace(source, lines, sections);
	expect(whitespace[0].kind).toBe("Ignored");
	expect((whitespace[0] as IgnoredNode).value).toBe("\n");
});

test("should add whitespace after sections (with new-lines as-needed)", () => {
	const source = new Source(`query {
query {

`);

	const lines = splitLines(source);
	const sections = [
		invalidOperationDefinition(source, "query", undefined, lines[0], lines[0]),
		invalidOperationDefinition(source, "query", undefined, lines[1], lines[1]),
	];

	const whitespace = insertWhitespace(source, lines, sections);
	expect(whitespace[2].kind).toBe("Ignored");
	expect((whitespace[2] as IgnoredNode).value).toBe("\n");
});

test("should add comments with sections", () => {
	const source = new Source(`# A
query {
# B
query {
# C`);

	const lines = splitLines(source);
	const sections = [
		invalidOperationDefinition(source, "query", undefined, lines[1], lines[1]),
		invalidOperationDefinition(source, "query", undefined, lines[3], lines[3]),
	];

	const whitespace = insertWhitespace(source, lines, sections);
	expect(whitespace[0].kind).toBe("Ignored");
	expect((whitespace[0] as IgnoredNode).value).toBe("# A");
	expect(whitespace[2].kind).toBe("Ignored");
	expect((whitespace[2] as IgnoredNode).value).toBe("# B");
	expect(whitespace[4].kind).toBe("Ignored");
	expect((whitespace[4] as IgnoredNode).value).toBe("# C");
});
