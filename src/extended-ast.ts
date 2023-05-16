import {
	ASTKindToNode,
	ASTNode,
	DefinitionNode,
	FragmentDefinitionNode,
	Location,
	OperationDefinitionNode,
	OperationTypeNode,
	Source,
	Token,
} from "graphql";
import { ErrorWithLoc } from "./lib/error-with-loc";
import { isDefined } from "./lib/is-defined";
import { isRecord } from "./lib/is-record";
import { splitLines } from "./lib/split-lines";
import { substring } from "./lib/substring";

export type ExtendedASTNode = Extended<ASTNode> | CommentNode;

export type Extended<TNode extends ASTNode> = TNode & {
	comments?: Comments;
	errors?: ErrorWithLoc[];
};

export type ExtendedASTKindToNode = {
	[Key in keyof ASTKindToNode]: Extended<ASTKindToNode[Key]>;
} & {
	Comment: CommentNode;
};

export function isExtendedNode(node: unknown): node is CommentNode {
	return isRecord(node) && node.kind === "Comment";
}

export function operationDefinition(
	source: Source,
	operation: OperationTypeNode,
	name: string | undefined,
	start: Token,
	end: Token
): Extended<OperationDefinitionNode> & { loc: Location } {
	const loc = new Location(start, end, source);

	return {
		kind: "OperationDefinition",
		operation,
		name: name ? { kind: "Name", value: name } : undefined,
		selectionSet: {
			kind: "SelectionSet",
			selections: [],
		},
		loc,
	};
}

export function invalidOperationDefinition(
	source: Source,
	operation: OperationTypeNode,
	name: string | undefined,
	start: Token,
	end: Token
): Extended<OperationDefinitionNode> & {
	loc: Location;
} {
	const loc = new Location(start, end, source);
	const error = new ErrorWithLoc("Invalid operation definition", { loc });
	const node = operationDefinition(source, operation, name, start, end);

	return { ...node, errors: [error] };
}

export function invalidShorthandOperationDefinition(
	source: Source,
	start: Token,
	end: Token
): Extended<OperationDefinitionNode> & {
	loc: Location;
} {
	return invalidOperationDefinition(source, "query", undefined, start, end);
}

export function fragment(
	source: Source,
	name: string,
	typeCondition: string,
	start: Token,
	end: Token
): Extended<FragmentDefinitionNode> & {
	loc: Location;
} {
	const loc = new Location(start, end, source);

	return {
		kind: "FragmentDefinition",
		name: { kind: "Name", value: name },
		typeCondition: {
			kind: "NamedType",
			name: { kind: "Name", value: typeCondition },
		},
		selectionSet: {
			kind: "SelectionSet",
			selections: [],
		},
		loc,
	};
}

export function invalidFragment(
	source: Source,
	name: string,
	typeCondition: string,
	start: Token,
	end: Token
): Extended<FragmentDefinitionNode> & {
	loc: Location;
} {
	const loc = new Location(start, end, source);
	const error = new ErrorWithLoc("Invalid fragment definition", { loc });
	const node = fragment(source, name, typeCondition, start, end);

	return { ...node, errors: [error] };
}

export function invalid(
	source: Source,
	start: Token,
	end: Token
): Extended<OperationDefinitionNode> & {
	loc: Location;
} {
	return invalidOperationDefinition(source, "query", undefined, start, end);
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

	const raw = substring(loc);
	const lines = splitLines(raw)
		.map((line) => line.value?.trim())
		.filter(isDefined)
		.map((line) => (line?.startsWith("#") ? line.substring(1) : line));

	const value = lines.join("\n");

	return { kind: "Comment", value, loc };
}
