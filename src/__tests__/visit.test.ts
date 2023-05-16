import { FragmentDefinitionNode, OperationDefinitionNode } from "graphql";
import { expect, test } from "vitest";
import { analyze } from "../analyze";
import { Extended } from "../extended-ast";
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
		Document: record("Document"),
		OperationDefinition: record("OperationDefinition"),
		FragmentDefinition: record("FragmentDefinition"),
	});

	expect(entered).toEqual([
		"Document",
		"OperationDefinition",
		"OperationDefinition",
		"FragmentDefinition",
		"FragmentDefinition",
	]);
	expect(left).toEqual([
		"OperationDefinition",
		"OperationDefinition",
		"FragmentDefinition",
		"FragmentDefinition",
		"Document",
	]);
});

test("should edit sections on enter", () => {
	const { entered, record } = recorder();

	const added = {
		kind: "OperationDefinition",
		operation: "query",
	};
	const fnResult = visit(document, {
		Document(node) {
			return {
				...node,
				definitions: [...node.definitions, added],
			};
		},
		OperationDefinition: record("OperationDefinition"),
	});

	expect(fnResult.definitions.length).toBe(5);
	expect(fnResult.definitions[4]).toBe(added);
	expect(entered.length).toBe(3);

	const enterResult = visit(document, {
		Document: {
			enter(node) {
				return {
					...node,
					definitions: [...node.definitions, added],
				};
			},
		},
		OperationDefinition: record("OperationDefinition"),
	});

	expect(enterResult.definitions.length).toBe(5);
	expect(enterResult.definitions[4]).toBe(added);
	expect(entered.length).toBe(6);
});

test("should edit sections on leave", () => {
	const { entered, record } = recorder();

	const added = {
		kind: "OperationDefinition",
		operation: "query",
		value: "{ todo }",
	};
	const leaveResult = visit(document, {
		Document: {
			leave(node) {
				return {
					...node,
					definitions: [...node.definitions, added],
				};
			},
		},
		OperationDefinition: record("OperationDefinition"),
	});

	expect(leaveResult.definitions.length).toBe(5);
	expect(leaveResult.definitions[4]).toBe(added);
	expect(entered.length).toBe(2);
});

test("should map sections", () => {
	const result = visit(document, {
		OperationDefinition: {
			enter(node) {
				if (!node.errors?.length) return node;

				return {
					...node,
					name: {
						kind: "Name",
						value: `${node.name?.value ?? "(anonymous)"} (entered)`,
					},
				};
			},
			leave(node) {
				return {
					...node,
					name: {
						kind: "Name",
						value: `${node.name?.value ?? "(anonymous)"} (left)`,
					},
				};
			},
		},
		FragmentDefinition(node) {
			return {
				...node,
				name: {
					kind: "Name",
					value: `${node.name.value} (mapped)`,
				},
			};
		},
	});

	expect(
		(document.definitions[0] as Extended<OperationDefinitionNode>).name?.value
	).toBe("B");
	expect(
		(result.definitions[0] as Extended<OperationDefinitionNode>).name?.value
	).toBe("B (entered) (left)");
	expect((document.definitions[2] as FragmentDefinitionNode).name.value).toBe(
		"F"
	);
	expect(result.definitions[2].name.value).toBe("F (mapped)");
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

	expect(result.kind).toBe("Document");
	expect(result.definitions[1]).toBe(replacement);
});
