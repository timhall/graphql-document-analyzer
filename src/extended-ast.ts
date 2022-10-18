import type { ASTNode, DefinitionNode, DocumentNode, Location } from "graphql";

export type ExtendedASTNode =
  | Exclude<ASTNode, { kind: "Document" }>
  | ExtendedDocumentNode
  | CommentNode
  | InvalidNode;

export interface ExtendedDocumentNode extends DocumentNode {
  readonly sections: ReadonlyArray<DefinitionNode | CommentNode | InvalidNode>;
}

export function isExtendedDocumentNode(
  node: ASTNode | ExtendedDocumentNode
): node is ExtendedDocumentNode {
  return node.kind === "Document" && "sections" in node;
}

export interface CommentNode {
  readonly kind: "Comment";
  readonly loc?: Location | undefined;
  readonly value: string;
}

export interface InvalidNode {
  readonly kind: "Unknown";
  readonly loc?: Location | undefined;
  readonly value: string;
}
