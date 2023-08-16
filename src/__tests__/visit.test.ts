import { expect, test } from "vitest";
import { analyze } from "../analyze";
import {
	IgnoredNode,
	InvalidFragmentDefinitionNode,
	isExtendedDocumentNode,
} from "../extended-ast";
import { visit } from "../visit";

const document = analyze(`# A
query B {
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

	const ignored = { kind: "Ignored", value: "# New Value" };
	const fnResult = visit(document, {
		ExtendedDocument(node) {
			return {
				...node,
				sections: [...node.sections, ignored],
			};
		},
		Ignored: record("Ignored"),
	});

	expect(isExtendedDocumentNode(fnResult)).toBe(true);
	expect(fnResult.sections.length).toBe(6);
	expect(fnResult.sections[5]).toBe(ignored);
	expect(entered.length).toBe(2);

	const enterResult = visit(document, {
		ExtendedDocument: {
			enter(node) {
				return {
					...node,
					sections: [...node.sections, ignored],
				};
			},
		},
		Ignored: record("Ignored"),
	});

	expect(isExtendedDocumentNode(enterResult)).toBe(true);
	expect(enterResult.sections.length).toBe(6);
	expect(enterResult.sections[5]).toBe(ignored);
	expect(entered.length).toBe(4);
});

test("should edit sections on leave", () => {
	const { entered, record } = recorder();

	const ignored = { kind: "Ignored", value: "# New Value" };
	const leaveResult = visit(document, {
		ExtendedDocument: {
			leave(node) {
				return {
					...node,
					sections: [...node.sections, ignored],
				};
			},
		},
		Ignored: record("Ignored"),
	});

	expect(isExtendedDocumentNode(leaveResult)).toBe(true);
	expect(leaveResult.sections.length).toBe(6);
	expect(leaveResult.sections[5]).toBe(ignored);
	expect(entered.length).toBe(1);
});

test("should map sections", () => {
	const result = visit(document, {
		Ignored: {
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
	expect((document.sections[0] as IgnoredNode).value).toBe("# A");
	expect(result.sections[0].value).toBe("# A (entered) (left)");
	expect(
		(document.sections[3] as InvalidFragmentDefinitionNode).name.value,
	).toBe("F");
	expect(result.sections[3].name.value).toBe("InvalidF");
});

test("should remove sections", () => {
	const result = visit(document, {
		Ignored() {
			return null;
		},
	});

	expect(isExtendedDocumentNode(result)).toBe(true);
	expect(result.sections.length).toBe(4);
});

test("should passthrough sections", () => {
	const result = visit(document, {
		Ignored() {
			return undefined;
		},
	});

	expect(isExtendedDocumentNode(result)).toBe(true);
	expect(result.sections.length).toBe(5);
	expect(result.sections[0].value).toBe("# A");
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
	expect(result.sections[2]).toBe(replacement);
});
