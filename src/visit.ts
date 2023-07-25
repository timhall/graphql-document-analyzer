import type { ASTNode } from "graphql";
import { BREAK, visit as graphqlVisit } from "graphql";
import {
	ExtendedASTNode,
	ExtendedDocumentNode,
	isExtendedDocumentNode,
	isExtendedNode,
} from "./extended-ast";

/**
 * Visit an Extended Document
 */
export function visit(root: ExtendedASTNode, visitor: ExtendedASTVisitor): any {
	if (!isExtendedNode(root)) {
		return graphqlVisit(root, visitor as ASTVisitor);
	}

	let node = root;

	// 1. Enter
	//
	// BREAK = exit early
	// null = remove node
	// node = replace node
	// undefined = original node

	const enterLeave = getEnterLeaveForKind(visitor, root.kind);
	const entered = enterLeave.enter?.(
		isExtendedDocumentNode(node) ? cloneDocument(node) : node,
		undefined,
		undefined,
		[],
		[]
	);

	if (entered === BREAK) {
		return node;
	}
	if (entered === null) {
		return null;
	}
	if (entered !== undefined) {
		node = entered;
	}

	// 2. Visit sections
	//
	// Pass each section through visit and then update definitions after visiting

	if (isExtendedDocumentNode(node)) {
		const visited: any[] = [];
		let broke = false;

		for (const section of node.sections) {
			const result = visit(section, visitor);
			if (result === BREAK) {
				broke = true;
				break;
			}

			visited.push(result);
		}

		const sections = visited.flat().filter((section) => section !== null);

		node = { kind: "ExtendedDocument", sections };

		if (broke) {
			return node;
		}
	}

	// 3. Leave
	//
	// BREAK = exit early
	// null = remove node
	// node = replace node
	// undefined = original node

	const left = enterLeave.leave?.(
		isExtendedDocumentNode(node) ? cloneDocument(node) : node,
		undefined,
		undefined,
		[],
		[]
	);

	if (left === BREAK) {
		return node;
	}
	if (left === null) {
		return null;
	}
	if (left !== undefined) {
		node = left;
	}

	return node;
}

function cloneDocument(document: ExtendedDocumentNode): ExtendedDocumentNode {
	return {
		kind: "ExtendedDocument",
		sections: [...document.sections],
	} as ExtendedDocumentNode;
}

// The following is from GraphQL 16, copied here as it is not exported
// and not present and GraphQL 15
//
// @license MIT

type ASTVisitor = Parameters<typeof graphqlVisit>[1];

export type ExtendedASTVisitor =
	| EnterLeaveVisitor<ExtendedASTNode>
	| KindVisitor;

type KindVisitor = {
	readonly [TNode in ExtendedASTNode as TNode["kind"]]?:
		| VisitFn<TNode>
		| EnterLeaveVisitor<TNode>;
};

interface EnterLeaveVisitor<TNode extends ExtendedASTNode> {
	readonly enter?: VisitFn<TNode> | undefined;
	readonly leave?: VisitFn<TNode> | undefined;
}

type VisitFn<TVisitedNode extends ExtendedASTNode> = (
	node: TVisitedNode,
	key: string | number | undefined,
	parent: ASTNode | ReadonlyArray<ASTNode> | undefined,
	path: ReadonlyArray<string | number>,
	ancestors: ReadonlyArray<ASTNode | ReadonlyArray<ASTNode>>
) => any;

function getEnterLeaveForKind<TNode extends ExtendedASTNode>(
	visitor: ExtendedASTVisitor,
	kind: string
): EnterLeaveVisitor<TNode> {
	const kindVisitor: VisitFn<TNode> | EnterLeaveVisitor<TNode> | undefined = (
		visitor as any
	)[kind];

	if (typeof kindVisitor === "object") {
		// { Kind: { enter() {}, leave() {} } }
		return kindVisitor;
	} else if (typeof kindVisitor === "function") {
		// { Kind() {} }
		return { enter: kindVisitor, leave: undefined };
	}

	// { enter() {}, leave() {} }
	return { enter: (visitor as any).enter, leave: (visitor as any).leave };
}
