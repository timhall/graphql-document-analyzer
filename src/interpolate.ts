import {
  ASTNode,
  FragmentDefinitionNode,
  isExecutableDefinitionNode,
  Kind,
  OperationDefinitionNode,
} from "graphql";
import {
  ExtendedDocumentNode,
  InvalidFragmentDefinitionNode,
  InvalidOperationDefinitionNode,
  SectionNode,
} from "./extended-ast";

/**
 * For a document with invalid operations or fragments,
 * interpolate valid nodes from a reference document
 *
 * Approach:
 *
 * 1. Conservatively, only interpolate if documents have same "outline"
 *    (same number of operations / fragments)
 * 2. Anonymous operations are interpolated by "outline" index
 * 3. Named operations and fragments are interpolated by name
 */
export function interpolate(
  document: ExtendedDocumentNode,
  reference: ExtendedDocumentNode
): ExtendedDocumentNode {
  const documentOutline = document.sections.filter(isRelevant);
  const referenceOutline = reference.sections.filter(isRelevant);

  if (documentOutline.length !== referenceOutline.length) return document;

  const interpolated = documentOutline.map((definition, index) => {
    if (definition.kind === "InvalidOperationDefinition") {
      const isAnonymous = !definition.name;
      const replacement = isAnonymous
        ? referenceOutline.find(findAnonymousOperation(definition, index))
        : referenceOutline.find(findNamedOperation(definition));

      return replacement ?? definition;
    }
    if (definition.kind === "InvalidFragmentDefinition") {
      const replacement = referenceOutline.find(findFragment(definition));

      return replacement ?? definition;
    }

    return definition;
  });

  const definitions = (interpolated as ASTNode[]).filter(
    isExecutableDefinitionNode
  );

  return {
    kind: Kind.DOCUMENT,
    definitions,
    sections: document.sections,
  };
}

type RelevantNode =
  | OperationDefinitionNode
  | InvalidOperationDefinitionNode
  | FragmentDefinitionNode
  | InvalidFragmentDefinitionNode;

function isRelevant(section: SectionNode): section is RelevantNode {
  return (
    section.kind === "OperationDefinition" ||
    section.kind === "InvalidOperationDefinition" ||
    section.kind === "FragmentDefinition" ||
    section.kind === "InvalidFragmentDefinition"
  );
}

function findAnonymousOperation(
  operation: InvalidOperationDefinitionNode,
  index: number
): (
  relevant: RelevantNode,
  index: number
) => relevant is OperationDefinitionNode {
  return (
    relevant: RelevantNode,
    relevantIndex: number
  ): relevant is OperationDefinitionNode => {
    return (
      index === relevantIndex &&
      relevant.kind === "OperationDefinition" &&
      relevant.operation === operation.operation &&
      !relevant.name
    );
  };
}

function findNamedOperation(
  operation: InvalidOperationDefinitionNode
): (relevant: RelevantNode) => relevant is OperationDefinitionNode {
  return (relevant: RelevantNode): relevant is OperationDefinitionNode => {
    return (
      relevant.kind === "OperationDefinition" &&
      relevant.operation === operation.operation &&
      !!relevant.name &&
      relevant.name.value === operation.name?.value
    );
  };
}

function findFragment(
  fragment: InvalidFragmentDefinitionNode
): (relevant: RelevantNode) => relevant is FragmentDefinitionNode {
  return (relevant: RelevantNode): relevant is FragmentDefinitionNode => {
    return (
      relevant.kind === "FragmentDefinition" &&
      relevant.name.value === fragment.name.value
    );
  };
}
