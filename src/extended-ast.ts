import type {
  ASTNode,
  DefinitionNode,
  DocumentNode,
  Location,
  NameNode,
  OperationTypeNode,
} from "graphql";

export type ExtendedASTNode =
  | Exclude<ASTNode, { kind: "Document" }>
  | ExtendedDocumentNode
  | InvalidOperationDefinitionNode
  | InvalidFragmentDefinitionNode
  | IgnoredNode;

export interface ExtendedDocumentNode extends DocumentNode {
  readonly sections: ReadonlyArray<SectionNode>;
}

export function isExtendedDocumentNode(
  node: ASTNode | ExtendedDocumentNode
): node is ExtendedDocumentNode {
  return node.kind === "Document" && "sections" in node;
}

export type SectionNode = DefinitionNode | InvalidDefinitionNode | IgnoredNode;

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

export interface InvalidFragmentDefinitionNode {
  readonly kind: "InvalidFragmentDefinition";
  readonly loc?: Location | undefined;
  readonly name: NameNode;
  readonly value: string;
}

export interface IgnoredNode {
  readonly kind: "Ignored";
  readonly loc?: Location | undefined;
  readonly value: string;
}
