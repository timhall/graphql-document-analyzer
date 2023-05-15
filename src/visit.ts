import type { ASTKindToNode, ASTNode, Visitor, VisitorKeyMap } from "graphql";
import { visit as graphqlVisit } from "graphql";
import { QueryDocumentKeys } from "graphql/language/visitor";
import { ExtendedASTNode, ExtendedASTKindToNode } from "./extended-ast";

export const ExtendedQueryDocumentKeys: VisitorKeyMap<ExtendedASTKindToNode> = {
	...QueryDocumentKeys,
	Comment: [],
	ExtendedDocument: ["definitions"],
	Invalid: [],
	InvalidOperationDefinition: [],
	InvalidFragmentDefinition: [],
};

export type ExtendedASTVisitor = Visitor<ExtendedASTKindToNode>;

/**
 * Visit an Extended Document
 */
export function visit(root: ExtendedASTNode, visitor: ExtendedASTVisitor): any {
	return graphqlVisit(
		root as ASTNode,
		visitor,
		ExtendedQueryDocumentKeys as VisitorKeyMap<ASTKindToNode>
	);
}
