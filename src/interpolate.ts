import type {
	DefinitionNode,
	DocumentNode,
	FragmentDefinitionNode,
	OperationDefinitionNode,
} from "graphql";
import type { Extended } from "./extended-ast";

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
	document: Extended<DocumentNode>,
	reference: Extended<DocumentNode>
): Extended<DocumentNode> {
	const documentOutline = document.definitions.filter(isRelevant);
	const referenceOutline = reference.definitions.filter(isRelevant);

	if (documentOutline.length !== referenceOutline.length) return document;

	const definitions = document.definitions.map(
		(definition: Extended<DefinitionNode>) => {
			if (
				definition.kind === "OperationDefinition" &&
				definition.errors?.length
			) {
				const index = documentOutline.indexOf(definition);
				const isAnonymous = !definition.name;
				const replacement = isAnonymous
					? referenceOutline.find(findAnonymousOperation(definition, index))
					: referenceOutline.find(findNamedOperation(definition));

				if (replacement) {
					return { ...replacement, loc: definition.loc };
				}
			}
			if (
				definition.kind === "FragmentDefinition" &&
				definition.errors?.length
			) {
				const replacement = referenceOutline.find(findFragment(definition));

				if (replacement) {
					return { ...replacement, loc: definition.loc };
				}
			}

			return definition;
		}
	);

	return { kind: "Document", definitions: definitions };
}

type RelevantNode = OperationDefinitionNode | FragmentDefinitionNode;

function isRelevant(definition: DefinitionNode): definition is RelevantNode {
	return (
		definition.kind === "OperationDefinition" ||
		definition.kind === "FragmentDefinition"
	);
}

function findAnonymousOperation(
	operation: OperationDefinitionNode,
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
	operation: OperationDefinitionNode
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
	fragment: FragmentDefinitionNode
): (relevant: RelevantNode) => relevant is FragmentDefinitionNode {
	return (relevant: RelevantNode): relevant is FragmentDefinitionNode => {
		return (
			relevant.kind === "FragmentDefinition" &&
			relevant.name.value === fragment.name.value
		);
	};
}
