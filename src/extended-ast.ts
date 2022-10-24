import type {
  ASTNode,
  DefinitionNode,
  Location,
  NamedTypeNode,
  NameNode,
  OperationTypeNode,
} from "graphql";
import { isRecord } from "./lib/is-record";

export type ExtendedASTNode =
  | ASTNode
  | ExtendedDocumentNode
  | InvalidOperationDefinitionNode
  | InvalidFragmentDefinitionNode
  | IgnoredNode;

export interface ExtendedASTKindToNode {
  ExtendedDocument: ExtendedDocumentNode;
  InvalidOperationDefinition: InvalidOperationDefinitionNode;
  InvalidFragmentDefinition: InvalidFragmentDefinitionNode;
  Ignored: IgnoredNode;
}

export function isExtendedNode(
  node: unknown
): node is
  | ExtendedDocumentNode
  | InvalidOperationDefinitionNode
  | InvalidFragmentDefinitionNode
  | IgnoredNode {
  return (
    isRecord(node) &&
    (node.kind === "ExtendedDocument" ||
      node.kind === "InvalidOperationDefinition" ||
      node.kind === "InvalidFragmentDefinition" ||
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
  node: unknown
): node is ExtendedDocumentNode {
  return isRecord(node) && node.kind === "ExtendedDocument";
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
  readonly typeCondition: NamedTypeNode;
  readonly value: string;
}

export interface IgnoredNode {
  readonly kind: "Ignored";
  readonly loc?: Location | undefined;
  readonly value: string;
}
