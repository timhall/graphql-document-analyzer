import { ASTNode, print as graphqlPrint } from "graphql";
import type { ExtendedDocumentNode } from "./extended-ast";
import { isExtendedDocumentNode } from "./extended-ast";

export function print(ast: ASTNode | ExtendedDocumentNode): string {
  if (!isExtendedDocumentNode(ast)) {
    return graphqlPrint(ast);
  }

  // TODO
  return "";
}
