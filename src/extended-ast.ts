import {
	ASTNode,
	DefinitionNode,
	Location,
	NamedTypeNode,
	NameNode,
	OperationTypeNode,
	Source,
	Token,
} from "graphql";
import { isRecord } from "./lib/is-record";
import { substring } from "./lib/source";

export type ExtendedASTNode =
	| ASTNode
	| ExtendedDocumentNode
	| InvalidOperationDefinitionNode
	| InvalidFragmentDefinitionNode
	| InvalidNode
	| IgnoredNode;

export interface ExtendedASTKindToNode {
	ExtendedDocument: ExtendedDocumentNode;
	InvalidOperationDefinition: InvalidOperationDefinitionNode;
	InvalidFragmentDefinition: InvalidFragmentDefinitionNode;
	Ignored: IgnoredNode;
}

export function isExtendedNode(
	node: unknown,
): node is
	| ExtendedDocumentNode
	| InvalidOperationDefinitionNode
	| InvalidFragmentDefinitionNode
	| InvalidNode
	| IgnoredNode {
	return (
		isRecord(node) &&
		(node.kind === "ExtendedDocument" ||
			node.kind === "InvalidOperationDefinition" ||
			node.kind === "InvalidFragmentDefinition" ||
			node.kind === "Invalid" ||
			node.kind === "Ignored")
	);
}

/**
 * Store definitions with Invalid and Ignored nodes in `sections` array
 */
export interface ExtendedDocumentNode {
	readonly kind: "ExtendedDocument";
	readonly loc?: Location | undefined;
	readonly sections: ReadonlyArray<SectionNode>;
}

export function isExtendedDocumentNode(
	node: unknown,
): node is ExtendedDocumentNode {
	return isRecord(node) && node.kind === "ExtendedDocument";
}

export type SectionNode =
	| DefinitionNode
	| InvalidDefinitionNode
	| InvalidNode
	| IgnoredNode;

export type InvalidDefinitionNode =
	| InvalidOperationDefinitionNode
	| InvalidFragmentDefinitionNode;

export interface InvalidOperationDefinitionNode {
	readonly kind: "InvalidOperationDefinition";
	readonly loc?: Location | undefined;
	readonly operation: OperationTypeNode;
	readonly name?: NameNode | undefined;
	readonly value: string;
}

export function invalidOperationDefinition(
	source: Source,
	operation: OperationTypeNode,
	name: string | undefined,
	start: Token,
	end: Token,
): InvalidOperationDefinitionNode {
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
	end: Token,
): InvalidOperationDefinitionNode {
	const loc = new Location(start, end, source);

	return {
		kind: "InvalidOperationDefinition",
		operation: "query",
		value: substring(source, loc),
		loc,
	};
}

export interface InvalidFragmentDefinitionNode {
	readonly kind: "InvalidFragmentDefinition";
	readonly loc?: Location | undefined;
	readonly name: NameNode;
	readonly typeCondition: NamedTypeNode;
	readonly value: string;
}

export function invalidFragment(
	source: Source,
	name: string,
	typeCondition: string,
	start: Token,
	end: Token,
): InvalidFragmentDefinitionNode {
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
	readonly loc?: Location | undefined;
	readonly value: string;
}

export function invalid(source: Source, start: Token, end: Token): InvalidNode {
	const loc = new Location(start, end, source);
	return { kind: "Invalid", value: substring(source, loc), loc };
}

export interface IgnoredNode {
	readonly kind: "Ignored";
	readonly loc?: Location | undefined;
	readonly value: string;
}

export function ignored(source: Source, start: Token, end: Token): IgnoredNode {
	const loc = new Location(start, end, source);
	return { kind: "Ignored", value: substring(source, loc), loc };
}
