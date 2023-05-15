import { expect, test } from "vitest";
import { analyze } from "../analyze";
import {
	InvalidFragmentDefinitionNode,
	InvalidOperationDefinitionNode,
	isExtendedDocumentNode,
} from "../extended-ast";
import { visit } from "../visit";

const document = analyze(`query B {
  c {
}
query D {
  e
}
fragment F on G {
  h {
}
fragment J on K {
  l
}`);

function recorder() {
	const entered: string[] = [];
	const left: string[] = [];

	const record = (kind: string) => ({
		enter: () => {
			entered.push(kind);
		},
		leave: () => {
			left.push(kind);
		},
	});

	return { entered, left, record };
}

test("should visit document and sections", () => {
	const { entered, left, record } = recorder();

	visit(document, {
		ExtendedDocument: record("ExtendedDocument"),
		OperationDefinition: record("OperationDefinition"),
		FragmentDefinition: record("FragmentDefinition"),
		InvalidOperationDefinition: record("InvalidOperationDefinition"),
		InvalidFragmentDefinition: record("InvalidFragmentDefinition"),
	});

	expect(entered).toEqual([
		"ExtendedDocument",
		"InvalidOperationDefinition",
		"OperationDefinition",
		"InvalidFragmentDefinition",
		"FragmentDefinition",
	]);
	expect(left).toEqual([
		"InvalidOperationDefinition",
		"OperationDefinition",
		"InvalidFragmentDefinition",
		"FragmentDefinition",
		"ExtendedDocument",
	]);
});

test("should edit sections on enter", () => {
	const { entered, record } = recorder();

	const added = {
		kind: "InvalidOperationDefinition",
		operation: "query",
		value: "{ todo }",
	};
	const fnResult = visit(document, {
		ExtendedDocument(node) {
			return {
				...node,
				definitions: [...node.definitions, added],
			};
		},
		InvalidOperationDefinition: record("InvalidOperationDefinition"),
	});

	expect(isExtendedDocumentNode(fnResult)).toBe(true);
	expect(fnResult.definitions.length).toBe(5);
	expect(fnResult.definitions[4]).toBe(added);
	expect(entered.length).toBe(2);

	const enterResult = visit(document, {
		ExtendedDocument: {
			enter(node) {
				return {
					...node,
					definitions: [...node.definitions, added],
				};
			},
		},
		InvalidOperationDefinition: record("InvalidOperationDefinition"),
	});

	expect(isExtendedDocumentNode(enterResult)).toBe(true);
	expect(enterResult.definitions.length).toBe(5);
	expect(enterResult.definitions[4]).toBe(added);
	expect(entered.length).toBe(4);
});

test("should edit sections on leave", () => {
	const { entered, record } = recorder();

	const added = {
		kind: "InvalidOperationDefinition",
		operation: "query",
		value: "{ todo }",
	};
	const leaveResult = visit(document, {
		ExtendedDocument: {
			leave(node) {
				return {
					...node,
					definitions: [...node.definitions, added],
				};
			},
		},
		InvalidOperationDefinition: record("InvalidOperationDefinition"),
	});

	expect(isExtendedDocumentNode(leaveResult)).toBe(true);
	expect(leaveResult.definitions.length).toBe(5);
	expect(leaveResult.definitions[4]).toBe(added);
	expect(entered.length).toBe(1);
});

test("should map sections", () => {
	const result = visit(document, {
		InvalidOperationDefinition: {
			enter(node) {
				return {
					...node,
					value: `${node.value} (entered)`,
				};
			},
			leave(node) {
				return {
					...node,
					value: `${node.value} (left)`,
				};
			},
		},
		InvalidFragmentDefinition(node) {
			return {
				...node,
				name: { kind: "Name", value: `Invalid${node.name.value}` },
			};
		},
	});

	expect(isExtendedDocumentNode(result)).toBe(true);
	expect(
		(document.definitions[0] as InvalidOperationDefinitionNode).value
	).toBe("query B {\n  c {\n}");
	expect(result.definitions[0].value).toBe(
		"query B {\n  c {\n} (entered) (left)"
	);
	expect(
		(document.definitions[2] as InvalidFragmentDefinitionNode).name.value
	).toBe("F");
	expect(result.definitions[2].name.value).toBe("InvalidF");
});

test("should replace operations", () => {
	const replacement = {
		kind: "OperationDefinition",
		operation: "query",
		selectionSet: { kind: "SelectionSet", selections: [] },
	};
	const result = visit(document, {
		OperationDefinition(node) {
			return replacement;
		},
	});

	expect(isExtendedDocumentNode(result)).toBe(true);
	expect(result.definitions[1]).toBe(replacement);
});
