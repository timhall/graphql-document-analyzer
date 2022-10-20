import type { ASTNode, DefinitionNode, DocumentNode, Location } from "graphql";

export type ExtendedASTNode =
  | Exclude<ASTNode, { kind: "Document" }>
  | ExtendedDocumentNode
  | CommentNode
  | InvalidNode;

export interface ExtendedDocumentNode extends DocumentNode {
  readonly sections: ReadonlyArray<SectionNode>;
}

export function isExtendedDocumentNode(
  node: ASTNode | ExtendedDocumentNode
): node is ExtendedDocumentNode {
  return node.kind === "Document" && "sections" in node;
}

export type SectionNode = DefinitionNode | CommentNode | InvalidNode;

export interface CommentNode {
  readonly kind: "Comment";
  readonly loc?: Location | undefined;
  readonly value: string;
}

export interface InvalidNode {
  readonly kind: "Invalid";
  readonly loc?: Location | undefined;
  readonly value: string;
}
