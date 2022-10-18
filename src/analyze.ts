import { Kind, parse as graphqlParse } from "graphql";
import { ExtendedDocumentNode } from "./extended-ast";

export function analyze(source: string): ExtendedDocumentNode {
  try {
    return { ...graphqlParse(source), sections: [] };
  } catch (_error) {
    return {
      kind: Kind.DOCUMENT,
      definitions: [],
      sections: [],
    };
  }
}
