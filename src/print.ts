import { ASTNode, FieldNode, Kind, print as graphqlPrint } from "graphql";
import type {
	CommentNode,
	Comments,
	ExtendedDocumentNode,
	SectionNode,
} from "./extended-ast";
import { isExtendedDocumentNode } from "./extended-ast";
import {
	ensureTrailingNewline,
	trimTrailingNewlines,
} from "./lib/trailing-newline";
import { trimTrailingWhitespace } from "./lib/trim-trailing-whitespace";
import { visit } from "./visit";

export function print(ast: ASTNode | ExtendedDocumentNode): string {
	if (!isExtendedDocumentNode(ast)) {
		return ensureTrailingNewline(resilientPrint(ast));
	}

	const output = [];
	for (const section of ast.sections) {
		const value =
			section.kind === "Invalid" ||
			section.kind === "InvalidOperationDefinition" ||
			section.kind === "InvalidFragmentDefinition"
				? section.value
				: printSectionWithComments(section);

		output.push(printWithComments(value, section.comments));
	}

	return ensureTrailingNewline(output.join("\n\n"));
}

function printSectionWithComments(section: SectionNode): string {
	const output = visit(section, {
		OperationDefinition: {
			leave(node) {
				const variables = node.variableDefinitions
					?.map((definition) => graphqlPrint(definition))
					.join(", ");
				const directives = node.directives
					?.map((directive) => graphqlPrint(directive))
					.join(" ");

				return node.name
					? `${node.operation} ${node.name.value}${
							variables ? `(${variables})` : ""
					  }${directives ? ` ${directives}` : ""} ${node.selectionSet}`
					: `${node.selectionSet}`;
			},
		},
		SelectionSet: {
			leave(node) {
				const selections = node.selections.length
					? indent(joinCommented(node.selections as unknown as string[]))
					: "\n";
				return `{\n${selections}\n}\n`;
			},
		},
		Field(node) {
			return printWithComments(
				trimTrailingNewlines(resilientPrint(node)),
				node.comments
			);
		},
	});

	return trimTrailingNewlines(trimTrailingWhitespace(output));
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
function resilientPrint(node: ASTNode): string {
	const temporaryDocument = visit(node, {
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
		trimTrailingWhitespace(valid.replace(/TEMPORARY_FIELD/g, ""))
	);

	return value;
}

function printWithComments(
	value: string,
	comments: Comments | undefined
): string {
	const before = comments?.before.map(printComment).join("\n\n");
	const after = comments?.after.map(printComment).join("\n\n");

	return [before, value, after].filter(Boolean).join("\n");
}

function printComment(comment: CommentNode): string {
	return comment.value
		.split("\n")
		.map((line) => `#${line}`)
		.join("\n");
}

/**
 * Join potentially commented lines, adding a blank line around comments
 */
function joinCommented(parts: string[]): string {
	return parts
		.reduce((lines, part) => {
			const additional = part.split("\n");
			const spacing =
				(lines.length || lines.at(-1)?.startsWith("#")) &&
				additional[0]?.startsWith("#");

			return spacing
				? [...lines, "", ...additional]
				: [...lines, ...additional];
		}, [] as string[])
		.join("\n");
}

function indent(value: string, spaces = 2): string {
	const indentation = " ".repeat(spaces);
	return value
		.split("\n")
		.map((line) => `${indentation}${line}`)
		.join("\n");
}
