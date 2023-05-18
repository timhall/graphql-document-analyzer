import type { ASTKindToNode, ASTNode, Visitor, VisitorKeyMap } from "graphql";
import { visit as graphqlVisit } from "graphql";
import { QueryDocumentKeys } from "graphql/language/visitor";
import { ExtendedASTNode, ExtendedASTKindToNode } from "./extended-ast";

export const ExtendedQueryDocumentKeys: VisitorKeyMap<ExtendedASTKindToNode> = {
	...QueryDocumentKeys,
	Comment: [],
};

export type ExtendedASTVisitor = Visitor<ExtendedASTKindToNode>;

/**
 * Visit an Extended Document
 */
export function visit(root: ExtendedASTNode, visitor: ExtendedASTVisitor): any {
	return graphqlVisit(
		root as ASTNode,
		visitor as Visitor<ASTKindToNode>,
		ExtendedQueryDocumentKeys as VisitorKeyMap<ASTKindToNode>
	);
}
