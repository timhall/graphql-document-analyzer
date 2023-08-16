import type { ASTNode } from "graphql";

/**
 * A visitor is provided to visit, it contains the collection of
 * relevant functions to be called during the visitor's traversal.
 */
export type ASTVisitor = EnterLeaveVisitor<ASTNode> | KindVisitor;

type KindVisitor = {
	readonly [NodeT in ASTNode as NodeT["kind"]]?:
		| ASTVisitFn<NodeT>
		| EnterLeaveVisitor<NodeT>;
};

interface EnterLeaveVisitor<TVisitedNode extends ASTNode> {
	readonly enter?: ASTVisitFn<TVisitedNode> | undefined;
	readonly leave?: ASTVisitFn<TVisitedNode> | undefined;
}

/**
 * A visitor is comprised of visit functions, which are called on each node
 * during the visitor's traversal.
 */
export type ASTVisitFn<TVisitedNode extends ASTNode> = (
	/** The current node being visiting. */
	node: TVisitedNode,
	/** The index or key to this node from the parent node or Array. */
	key: string | number | undefined,
	/** The parent immediately above this node, which may be an Array. */
	parent: ASTNode | ReadonlyArray<ASTNode> | undefined,
	/** The key path to get to this node from the root node. */
	path: ReadonlyArray<string | number>,
	/**
	 * All nodes and Arrays visited before reaching parent of this node.
	 * These correspond to array indices in `path`.
	 * Note: ancestors includes arrays which contain the parent of visited node.
	 */
	ancestors: ReadonlyArray<ASTNode | ReadonlyArray<ASTNode>>,
) => any;

/**
 * A reducer is comprised of reducer functions which convert AST nodes into
 * another form.
 */
export type ASTReducer<R> = {
	readonly [NodeT in ASTNode as NodeT["kind"]]?: {
		readonly enter?: ASTVisitFn<NodeT>;
		readonly leave: ASTReducerFn<NodeT, R>;
	};
};

type ASTReducerFn<TReducedNode extends ASTNode, R> = (
	/** The current node being visiting. */
	node: { [K in keyof TReducedNode]: ReducedField<TReducedNode[K], R> },
	/** The index or key to this node from the parent node or Array. */
	key: string | number | undefined,
	/** The parent immediately above this node, which may be an Array. */
	parent: ASTNode | ReadonlyArray<ASTNode> | undefined,
	/** The key path to get to this node from the root node. */
	path: ReadonlyArray<string | number>,
	/**
	 * All nodes and Arrays visited before reaching parent of this node.
	 * These correspond to array indices in `path`.
	 * Note: ancestors includes arrays which contain the parent of visited node.
	 */
	ancestors: ReadonlyArray<ASTNode | ReadonlyArray<ASTNode>>,
) => R;

type ReducedField<T, R> = T extends ASTNode
	? R
	: T extends ReadonlyArray<ASTNode>
	? ReadonlyArray<R>
	: T;
