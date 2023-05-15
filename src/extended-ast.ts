import {
	ASTKindToNode,
	ASTNode,
	DefinitionNode,
	Location,
	NamedTypeNode,
	NameNode,
	OperationTypeNode,
	Source,
	Token,
} from "graphql";
import { isDefined } from "./lib/is-defined";
import { isRecord } from "./lib/is-record";
import { splitLines } from "./lib/split-lines";
import { substring } from "./lib/substring";
import { ErrorWithLoc } from "./lib/error-with-loc";

export type ExtendedASTNode =
	| (ASTNode & { comments?: Comments; errors?: ErrorWithLoc[] })
	| ExtendedDocumentNode
	| InvalidOperationDefinitionNode
	| InvalidFragmentDefinitionNode
	| InvalidNode
	| CommentNode;

export type ExtendedASTKindToNode = {
	[Key in keyof ASTKindToNode]: ASTKindToNode[Key] & {
		comments?: Comments;
		errors?: ErrorWithLoc[];
	};
} & {
	ExtendedDocument: ExtendedDocumentNode;
	InvalidOperationDefinition: InvalidOperationDefinitionNode;
	InvalidFragmentDefinition: InvalidFragmentDefinitionNode;
	Invalid: InvalidNode;
	Comment: CommentNode;
};

export function isExtendedNode(
	node: unknown
): node is
	| ExtendedDocumentNode
	| InvalidOperationDefinitionNode
	| InvalidFragmentDefinitionNode
	| InvalidNode
	| CommentNode {
	return (
		isRecord(node) &&
		(node.kind === "ExtendedDocument" ||
			node.kind === "InvalidOperationDefinition" ||
			node.kind === "InvalidFragmentDefinition" ||
			node.kind === "Invalid" ||
			node.kind === "Comment")
	);
}

/**
 * Store definitions with Invalid and Ignored nodes in `sections` array
 */
export interface ExtendedDocumentNode {
	readonly kind: "ExtendedDocument";
	readonly loc?: Location;
	readonly definitions: ReadonlyArray<SectionNode>;
}

export function isExtendedDocumentNode(
	node: unknown
): node is ExtendedDocumentNode {
	return isRecord(node) && node.kind === "ExtendedDocument";
}

export type SectionNode =
	| (DefinitionNode & { comments?: Comments })
	| InvalidDefinitionNode
	| InvalidNode;

export type InvalidDefinitionNode =
	| InvalidOperationDefinitionNode
	| InvalidFragmentDefinitionNode;

export interface InvalidOperationDefinitionNode {
	readonly kind: "InvalidOperationDefinition";
	readonly loc?: Location;
	readonly comments?: Comments;
	readonly operation: OperationTypeNode;
	readonly name?: NameNode;
	readonly value: string;
}

export function invalidOperationDefinition(
	source: Source,
	operation: OperationTypeNode,
	name: string | undefined,
	start: Token,
	end: Token
): InvalidOperationDefinitionNode & { loc: Location } {
	const loc = new Location(start, end, source);

	return {
		kind: "InvalidOperationDefinition",
		operation,
		name: name ? { kind: "Name", value: name } : undefined,
		value: substring(source, loc),
		loc,
	};
}

export function invalidShorthandOperationDefinition(
	source: Source,
	start: Token,
	end: Token
): InvalidOperationDefinitionNode & { loc: Location } {
	return invalidOperationDefinition(source, "query", undefined, start, end);
}

export interface InvalidFragmentDefinitionNode {
	readonly kind: "InvalidFragmentDefinition";
	readonly loc?: Location;
	readonly comments?: Comments;
	readonly name: NameNode;
	readonly typeCondition: NamedTypeNode;
	readonly value: string;
}

export function invalidFragment(
	source: Source,
	name: string,
	typeCondition: string,
	start: Token,
	end: Token
): InvalidFragmentDefinitionNode & { loc: Location } {
	const loc = new Location(start, end, source);

	return {
		kind: "InvalidFragmentDefinition",
		name: { kind: "Name", value: name },
		typeCondition: {
			kind: "NamedType",
			name: { kind: "Name", value: typeCondition },
		},
		value: substring(source, loc),
		loc,
	};
}

export interface InvalidNode {
	readonly kind: "Invalid";
	readonly loc?: Location;
	readonly comments?: Comments;
	readonly value: string;
}

export function invalid(
	source: Source,
	start: Token,
	end: Token
): InvalidNode & { loc: Location } {
	const loc = new Location(start, end, source);
	return { kind: "Invalid", value: substring(source, loc), loc };
}

//
// Comments
//

/**
 * Semantic positions of comments relative to a Node
 *
 * @example
 * ```graphql
 * # [preceding]
 *
 * # leading
 * a {
 *   # [inside]
 * } # inline
 * # trailing
 *
 * # [following]
 * ```
 */
export interface Comments {
	preceding?: CommentNode[];
	leading?: CommentNode;
	inside?: CommentNode[];
	inline?: CommentNode;
	trailing?: CommentNode;
	following?: CommentNode[];
}

export interface CommentNode {
	readonly kind: "Comment";
	readonly loc?: Location;
	readonly value: string;
}

export function comment(
	source: Source,
	start: Token,
	end: Token
): CommentNode & { loc: Location } {
	const loc = new Location(start, end, source);

	const raw = substring(source, loc);
	const lines = splitLines(raw)
		.map((line) => line.value?.trim())
		.filter(isDefined)
		.map((line) => (line?.startsWith("#") ? line.substring(1) : line));

	const value = lines.join("\n");

	return { kind: "Comment", value, loc };
}
