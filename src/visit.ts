import { visit as graphqlVisit } from "graphql";
import type { ASTNode, ASTVisitor, ASTVisitFn } from "graphql";
import {
  ExtendedASTNode,
  ExtendedDocumentNode,
  isExtendedDocumentNode,
} from "./extended-ast";

export function visit(
  root: ExtendedDocumentNode,
  visitor: ExtendedASTVisitor
): ExtendedDocumentNode;
export function visit<TNode extends ASTNode>(
  root: TNode,
  visitor: ASTVisitor
): TNode;
export function visit(
  root: ExtendedDocumentNode | ASTNode,
  visitor: ExtendedASTVisitor | ASTVisitor
): unknown {
  if (!isExtendedDocumentNode(root)) {
    return graphqlVisit(root, visitor as ASTVisitor);
  }

  // TODO
  return root;
}

export type ExtendedASTVisitor = ASTVisitor;

// Following is extended from graphql-js@16.6.0
// @license MIT

// TODO
// type KindVisitor = {
//   readonly [TNode in ExtendedASTNode as TNode["kind"]]?:
//     | ASTVisitFn<TNode>
//     | EnterLeaveVisitor<TNode>;
// };
//
// interface EnterLeaveVisitor<TVisitedNode extends ExtendedASTNode> {
//   readonly enter?: ASTVisitFn<TVisitedNode>;
//   readonly leave?: ASTVisitFn<TVisitedNode>;
// }
