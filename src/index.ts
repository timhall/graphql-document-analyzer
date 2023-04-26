export { analyze } from "./analyze";
export { isExtendedDocumentNode } from "./extended-ast";
export { interpolate } from "./interpolate";
export { print } from "./print";
export { visit, ExtendedQueryDocumentKeys } from "./visit";

export type {
	ExtendedASTNode,
	ExtendedASTKindToNode,
	ExtendedDocumentNode,
	SectionNode,
	InvalidDefinitionNode,
	InvalidOperationDefinitionNode,
	InvalidFragmentDefinitionNode,
	InvalidNode,
	CommentNode,
} from "./extended-ast";
export type { ExtendedASTVisitor } from "./visit";
