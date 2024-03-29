import {
	ASTNode,
	DefinitionNode,
	DocumentNode,
	FieldNode,
	Kind,
	visit,
} from "graphql";
import type { ExtendedDocumentNode } from "./extended-ast";
import { isExtendedDocumentNode } from "./extended-ast";
import { print as graphqlPrint } from "./graphql-js/language/printer";
import {
	ensureTrailingNewline,
	trimTrailingNewlines,
} from "./lib/trailing-newline";
import { trimTrailingWhitespace } from "./lib/trim-trailing-whitespace";

export function print(ast: ASTNode | ExtendedDocumentNode): string {
	if (!isExtendedDocumentNode(ast)) {
		return ensureTrailingNewline(
			ast.kind === Kind.DOCUMENT ? resilientPrint(ast) : graphqlPrint(ast),
		);
	}

	const output = [];
	for (const section of ast.sections) {
		if (
			section.kind === "Ignored" ||
			section.kind === "Invalid" ||
			section.kind === "InvalidOperationDefinition" ||
			section.kind === "InvalidFragmentDefinition"
		) {
			output.push(section.value);
			continue;
		}

		output.push(resilientPrint(section));
	}

	return ensureTrailingNewline(output.join("\n"));
}

const TEMPORARY_FIELD: FieldNode = {
	kind: Kind.FIELD,
	name: { kind: Kind.NAME, value: "TEMPORARY_FIELD" },
};

/**
 * GraphQL's `print` method with some heuristics for dealing with invalid nodes
 *
 * 1. For empty inline fragments, add a temporary node so that the document is valid
 *    (and then remove that node from the output)
 * 2. For empty operation selections, add a temporary node so that the braces are retained
 *    (and then remove that node from the output)
 */
function resilientPrint(document: DocumentNode): string;
function resilientPrint(definition: DefinitionNode): string;
function resilientPrint(node: DocumentNode | DefinitionNode): string {
	const document: DocumentNode =
		node.kind === Kind.DOCUMENT
			? node
			: {
					kind: Kind.DOCUMENT,
					definitions: [node],
			  };
	const temporaryDocument = visit(document, {
		OperationDefinition(node) {
			if (node.selectionSet.selections.length > 0) return;

			return {
				...node,
				selectionSet: {
					kind: Kind.SELECTION_SET,
					selections: [TEMPORARY_FIELD],
				},
			};
		},
		Field(node) {
			if (node.selectionSet?.selections.length !== 0) return;

			return {
				...node,
				selectionSet: {
					kind: Kind.SELECTION_SET,
					selections: [TEMPORARY_FIELD],
				},
			};
		},
		InlineFragment(node) {
			if (node.selectionSet.selections.length > 0) return;

			return {
				...node,
				selectionSet: {
					kind: Kind.SELECTION_SET,
					selections: [TEMPORARY_FIELD],
				},
			};
		},
	});

	const valid = graphqlPrint(temporaryDocument);
	const value = trimTrailingNewlines(
		trimTrailingWhitespace(valid.replace(/TEMPORARY_FIELD/g, "")),
	);

	return value;
}
