import {
	ASTNode,
	ArgumentNode,
	BooleanValueNode,
	DirectiveDefinitionNode,
	DirectiveNode,
	DocumentNode,
	EnumTypeDefinitionNode,
	EnumTypeExtensionNode,
	EnumValueDefinitionNode,
	EnumValueNode,
	FieldDefinitionNode,
	FieldNode,
	FloatValueNode,
	FragmentDefinitionNode,
	FragmentSpreadNode,
	InlineFragmentNode,
	InputObjectTypeDefinitionNode,
	InputObjectTypeExtensionNode,
	InputValueDefinitionNode,
	IntValueNode,
	InterfaceTypeDefinitionNode,
	InterfaceTypeExtensionNode,
	ListTypeNode,
	ListValueNode,
	Location,
	NameNode,
	NamedTypeNode,
	NonNullTypeNode,
	NullValueNode,
	ObjectFieldNode,
	ObjectTypeDefinitionNode,
	ObjectTypeExtensionNode,
	ObjectValueNode,
	OperationDefinitionNode,
	OperationTypeDefinitionNode,
	OperationTypeNode,
	ScalarTypeDefinitionNode,
	ScalarTypeExtensionNode,
	SchemaDefinitionNode,
	SchemaExtensionNode,
	SelectionSetNode,
	Source,
	StringValueNode,
	Token,
	TypeSystemDefinitionNode,
	TypeSystemExtensionNode,
	UnionTypeDefinitionNode,
	UnionTypeExtensionNode,
	VariableDefinitionNode,
	VariableNode,
} from "graphql";
import { ErrorWithLoc } from "./lib/error-with-loc";
import { isDefined } from "./lib/is-defined";
import { isRecord } from "./lib/is-record";
import { Merge } from "./lib/merge";
import { Prettify } from "./lib/prettify";
import { splitLines } from "./lib/split-lines";
import { substring } from "./lib/substring";

export type ExtendedASTNode =
	| ExtendedNameNode
	| ExtendedDocumentNode
	| ExtendedDefinitionNode
	| ExtendedOperationDefinitionNode
	| ExtendedVariableDefinitionNode
	| ExtendedVariableNode
	| ExtendedSelectionSetNode
	| ExtendedFieldNode
	| ExtendedArgumentNode
	| ExtendedFragmentSpreadNode
	| ExtendedInlineFragmentNode
	| ExtendedFragmentDefinitionNode
	| ExtendedIntValueNode
	| ExtendedFloatValueNode
	| ExtendedStringValueNode
	| ExtendedBooleanValueNode
	| ExtendedNullValueNode
	| ExtendedEnumValueNode
	| ExtendedListValueNode
	| ExtendedObjectValueNode
	| ExtendedObjectFieldNode
	| ExtendedDirectiveNode
	| ExtendedNamedTypeNode
	| ExtendedListTypeNode
	| ExtendedNonNullTypeNode
	| SchemaDefinitionNode
	| OperationTypeDefinitionNode
	| ScalarTypeDefinitionNode
	| ObjectTypeDefinitionNode
	| FieldDefinitionNode
	| InputValueDefinitionNode
	| InterfaceTypeDefinitionNode
	| UnionTypeDefinitionNode
	| EnumTypeDefinitionNode
	| EnumValueDefinitionNode
	| InputObjectTypeDefinitionNode
	| DirectiveDefinitionNode
	| SchemaExtensionNode
	| ScalarTypeExtensionNode
	| ObjectTypeExtensionNode
	| InterfaceTypeExtensionNode
	| UnionTypeExtensionNode
	| EnumTypeExtensionNode
	| InputObjectTypeExtensionNode
	| CommentNode;

export type ExtendedASTKindToNode = {
	Name: ExtendedNameNode;
	Document: ExtendedDocumentNode;
	OperationDefinition: ExtendedOperationDefinitionNode;
	VariableDefinition: ExtendedVariableDefinitionNode;
	Variable: ExtendedVariableNode;
	SelectionSet: ExtendedSelectionSetNode;
	Field: ExtendedFieldNode;
	Argument: ExtendedArgumentNode;
	FragmentSpread: ExtendedFragmentSpreadNode;
	InlineFragment: ExtendedInlineFragmentNode;
	FragmentDefinition: ExtendedFragmentDefinitionNode;
	IntValue: ExtendedIntValueNode;
	FloatValue: ExtendedFloatValueNode;
	StringValue: ExtendedStringValueNode;
	BooleanValue: ExtendedBooleanValueNode;
	NullValue: ExtendedNullValueNode;
	EnumValue: ExtendedEnumValueNode;
	ListValue: ExtendedListValueNode;
	ObjectValue: ExtendedObjectValueNode;
	ObjectField: ExtendedObjectFieldNode;
	Directive: ExtendedDirectiveNode;
	NamedType: ExtendedNamedTypeNode;
	ListType: ExtendedListTypeNode;
	NonNullType: ExtendedNonNullTypeNode;
	SchemaDefinition: SchemaDefinitionNode;
	OperationTypeDefinition: OperationTypeDefinitionNode;
	ScalarTypeDefinition: ScalarTypeDefinitionNode;
	ObjectTypeDefinition: ObjectTypeDefinitionNode;
	FieldDefinition: FieldDefinitionNode;
	InputValueDefinition: InputValueDefinitionNode;
	InterfaceTypeDefinition: InterfaceTypeDefinitionNode;
	UnionTypeDefinition: UnionTypeDefinitionNode;
	EnumTypeDefinition: EnumTypeDefinitionNode;
	EnumValueDefinition: EnumValueDefinitionNode;
	InputObjectTypeDefinition: InputObjectTypeDefinitionNode;
	DirectiveDefinition: DirectiveDefinitionNode;
	SchemaExtension: SchemaExtensionNode;
	ScalarTypeExtension: ScalarTypeExtensionNode;
	ObjectTypeExtension: ObjectTypeExtensionNode;
	InterfaceTypeExtension: InterfaceTypeExtensionNode;
	UnionTypeExtension: UnionTypeExtensionNode;
	EnumTypeExtension: EnumTypeExtensionNode;
	InputObjectTypeExtension: InputObjectTypeExtensionNode;
	Comment: CommentNode;
};

export type ExtendedNameNode = Extended<NameNode>;
export type ExtendedDocumentNode = Extended<
	DocumentNode,
	{
		readonly definitions: ReadonlyArray<ExtendedDefinitionNode>;
	}
>;
export type ExtendedOperationDefinitionNode = Extended<
	OperationDefinitionNode,
	{
		readonly name?: ExtendedNameNode;
		readonly variableDefinitions?: ReadonlyArray<ExtendedVariableDefinitionNode>;
		readonly directives?: ReadonlyArray<ExtendedDirectiveNode>;
		readonly selectionSet: ExtendedSelectionSetNode;
	}
>;
export type ExtendedVariableDefinitionNode = Extended<
	VariableDefinitionNode,
	{
		readonly variable: ExtendedVariableNode;
		readonly type: ExtendedTypeNode;
		readonly defaultValue?: ExtendedValueNode;
		readonly directives?: ReadonlyArray<ExtendedDirectiveNode>;
	}
>;
export type ExtendedVariableNode = Extended<
	VariableNode,
	{
		readonly name: ExtendedNameNode;
	}
>;
export type ExtendedSelectionSetNode = Extended<
	SelectionSetNode,
	{
		selections: ReadonlyArray<ExtendedSelectionNode>;
	}
>;
export type ExtendedFieldNode = Extended<
	FieldNode,
	{
		readonly alias?: ExtendedNameNode;
		readonly name: ExtendedNameNode;
		readonly arguments?: ReadonlyArray<ExtendedArgumentNode>;
		readonly directives?: ReadonlyArray<ExtendedDirectiveNode>;
		readonly selectionSet?: ExtendedSelectionSetNode;
	}
>;
export type ExtendedArgumentNode = Extended<
	ArgumentNode,
	{
		readonly name: ExtendedNameNode;
		readonly value: ExtendedValueNode;
	}
>;
export type ExtendedFragmentSpreadNode = Extended<
	FragmentSpreadNode,
	{
		readonly name: ExtendedNameNode;
		readonly directives?: ReadonlyArray<ExtendedDirectiveNode>;
	}
>;
export type ExtendedInlineFragmentNode = Extended<
	InlineFragmentNode,
	{
		readonly typeCondition?: ExtendedNamedTypeNode;
		readonly directives?: ReadonlyArray<ExtendedDirectiveNode>;
		readonly selectionSet: ExtendedSelectionSetNode;
	}
>;
export type ExtendedFragmentDefinitionNode = Extended<
	FragmentDefinitionNode,
	{
		readonly name: ExtendedNameNode;
		readonly variableDefinitions?: ReadonlyArray<ExtendedVariableDefinitionNode>;
		readonly typeCondition: ExtendedNamedTypeNode;
		readonly directives?: ReadonlyArray<ExtendedDirectiveNode>;
		readonly selectionSet: ExtendedSelectionSetNode;
	}
>;
export type ExtendedIntValueNode = Extended<IntValueNode>;
export type ExtendedFloatValueNode = Extended<FloatValueNode>;
export type ExtendedStringValueNode = Extended<StringValueNode>;
export type ExtendedBooleanValueNode = Extended<BooleanValueNode>;
export type ExtendedNullValueNode = Extended<NullValueNode>;
export type ExtendedEnumValueNode = Extended<EnumValueNode>;
export type ExtendedListValueNode = Extended<
	ListValueNode,
	{
		readonly values: ReadonlyArray<ExtendedValueNode>;
	}
>;
export type ExtendedObjectValueNode = Extended<
	ObjectValueNode,
	{
		readonly fields: ReadonlyArray<ExtendedObjectFieldNode>;
	}
>;
export type ExtendedObjectFieldNode = Extended<
	ObjectFieldNode,
	{
		readonly name: ExtendedNameNode;
		readonly value: ExtendedValueNode;
	}
>;
export type ExtendedDirectiveNode = Extended<
	DirectiveNode,
	{
		readonly name: ExtendedNameNode;
	}
>;
export type ExtendedNamedTypeNode = Extended<
	NamedTypeNode,
	{
		readonly name: ExtendedNameNode;
	}
>;
export type ExtendedListTypeNode = Extended<
	ListTypeNode,
	{
		readonly type: ExtendedTypeNode;
	}
>;
export type ExtendedNonNullTypeNode = Extended<
	NonNullTypeNode,
	{
		readonly type: ExtendedNamedTypeNode | ExtendedListTypeNode;
	}
>;

export type ExtendedDefinitionNode =
	| ExtendedExecutableDefinitionNode
	| TypeSystemDefinitionNode
	| TypeSystemExtensionNode;

export type ExtendedExecutableDefinitionNode =
	| ExtendedOperationDefinitionNode
	| ExtendedFragmentDefinitionNode;

export type ExtendedSelectionNode =
	| ExtendedFieldNode
	| ExtendedFragmentSpreadNode
	| ExtendedInlineFragmentNode;

export type ExtendedValueNode =
	| ExtendedVariableNode
	| ExtendedIntValueNode
	| ExtendedFloatValueNode
	| ExtendedStringValueNode
	| ExtendedBooleanValueNode
	| ExtendedNullValueNode
	| ExtendedEnumValueNode
	| ExtendedListValueNode
	| ExtendedObjectValueNode;

export type ExtendedTypeNode =
	| ExtendedNamedTypeNode
	| ExtendedListTypeNode
	| ExtendedNonNullTypeNode;

export type Extended<TNode extends ASTNode, TOverrides = {}> = Prettify<
	Merge<TNode, TOverrides> & {
		readonly comments?: Comments;
		readonly errors?: ErrorWithLoc[];
	}
>;

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
