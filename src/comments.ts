import { Location, Source, Token, TokenKind } from "graphql";
import {
	CommentNode,
	Comments,
	ExtendedASTNode,
	ExtendedDocumentNode,
	SectionNode,
	comment,
} from "./extended-ast";
import { visit } from "./visit";
import { isDefined } from "./lib/is-defined";

export function processComments<TNode extends ExtendedASTNode>(
	source: Source,
	nodes: readonly TNode[],
	lines: readonly Token[]
): TNode[] {
	// 1. Find all comments
	const comments = lines
		.filter((line) => line.value?.trim().startsWith("#"))
		.map((line) => {
			const value = line.value?.trim().substring(1);
			const token = new Token(
				TokenKind.COMMENT,
				line.start,
				line.end,
				line.line,
				line.column,
				line.prev,
				value
			);

			return comment(source, token, token);
		});

	// 2. Merge comments that are adjacent
	const merged = comments.reduce((grouped, comment) => {
		const previous = grouped.at(-1);
		if (previous && adjacent(previous.loc, comment.loc)) {
			return [...grouped.slice(0, -1), merge(previous, comment)];
		}

		return [...grouped, comment];
	}, [] as Array<CommentNode & { loc: Location }>);

	// 3. Group comments by node
	//
	//    a. If a comment is before first node, add to before of first node
	//    b. If a comment is after last node, add to after of last node
	//    c. If a comment is adjacent to previous node, add to after of previous node
	//    d. Otherwise, add to before of next node
	const groupedByNode: Map<ExtendedASTNode, Comments> = new Map();
	const ensureComments = (section: ExtendedASTNode): Comments => {
		const value = groupedByNode.get(section) ?? { before: [], after: [] };
		if (!groupedByNode.has(section)) groupedByNode.set(section, value);

		return value;
	};

	for (const comment of merged) {
		let before: ExtendedASTNode | undefined = undefined;
		let after: ExtendedASTNode | undefined = undefined;
		let insideSection = false;

		for (const section of nodes) {
			if (!section.loc) continue;

			if (overlaps(section.loc, comment.loc)) {
				insideSection = true;
				break;
			} else if (section.loc.end <= comment.loc.start) {
				before = section;
			} else if (section.loc.start >= comment.loc.end) {
				after = section;
				break;
			}
		}
		if (insideSection) continue;

		if (after && !before) {
			// a.
			ensureComments(after).before.push(comment);
		} else if (before && !after) {
			// b.
			ensureComments(before).after.push(comment);
		} else if (before?.loc && adjacent(before.loc, comment.loc)) {
			// c.
			ensureComments(before).after.push(comment);
		} else if (after) {
			// d.
			ensureComments(after).before.push(comment);
		}
	}

	const withComments = nodes.map((section) => {
		return { ...section, comments: groupedByNode.get(section) };
	});

	return withComments;
}

export function processSectionComments(
	source: Source,
	section: SectionNode,
	lines: Token[]
): SectionNode {
	if (
		section.kind !== "OperationDefinition" &&
		section.kind !== "FragmentDefinition"
	) {
		return section;
	}

	if (!section.selectionSet.loc) return section;

	// 1. Select lines for section
	const relevantLines = lines.slice(
		section.selectionSet.loc.startToken.line - 1,
		section.selectionSet.loc.endToken.line - 1
	);
	if (!relevantLines.length) return section;

	// 2. Add comments to selections
	const selections = processComments(
		source,
		section.selectionSet.selections,
		relevantLines
	);

	return {
		...section,
		selectionSet: {
			...section.selectionSet,
			selections,
		},
	};
}

function overlaps(
	a: { start: number; end: number } | undefined,
	b: { start: number; end: number } | undefined
): boolean {
	if (!a || !b) return false;

	// a     |--|
	// b   |--|
	if (a.start >= b.start && a.start <= b.end) return true;

	// a |--|
	// b   |--|
	if (a.end >= b.start && a.end <= b.end) return true;

	// a  |----|
	// b   |--|
	if (a.start < b.start && a.end > b.end) return true;

	return false;
}

function adjacent(a: Location | undefined, b: Location | undefined): boolean {
	if (!a || !b) return false;

	return (
		Math.abs(a.endToken.line - b.startToken.line) <= 1 ||
		Math.abs(a.startToken.line - b.endToken.line) <= 1
	);
}

function merge(
	a: CommentNode & { loc: Location },
	b: CommentNode & { loc: Location }
): CommentNode & { loc: Location } {
	return comment(a.loc.source, a.loc.startToken, b.loc.endToken);
}

//
// ---
//

export function attachComments(
	source: Source,
	document: ExtendedDocumentNode
): ExtendedDocumentNode {
	if (!document.loc) return document;

	// Find all comment nodes in the document
	const commentTokens: Token[] = [];
	const { startToken, endToken } = document.loc;
	for (
		let token: Token | null = startToken;
		token && token !== endToken;
		token = token.next
	) {
		if (token.kind === "Comment") {
			commentTokens.push(token);
		}
	}

	if (!commentTokens.length) return document;

	// Comments that are on adjacent lines are collapsed into a single comment node
	const comments = groupAdjacentTokens(commentTokens)
		.map((group) => {
			const start = group[0];
			const end = group.at(-1);
			if (!start || !end) return;

			return comment(source, start, end);
		})
		.filter(isDefined);

	// Comments outside of definitions and not directly leading or following a definition
	// are added to the top-level document sections
	const topLevelComments = comments.filter(isTopLevel(document));
	const remainingComments = comments.filter(
		(comment) => !topLevelComments.includes(comment)
	);

	// Attach comments to document nodes based on the following heuristics:
	//
	// 1. Top-level comments outside of definitions and not directly leading or following
	//    a definition are added to the top-level document sections
	// 2. Comments that immediately follow a node are attached to that node's after comments
	// 3. Leading comments are attached to the closest following node

	return visit(document, {
		ExtendedDocument(node) {
			if (!topLevelComments.length) return;

			// console.log(
			// 	"SORTED",
			// 	commentTokens,
			// 	[...node.sections, ...topLevelComments].sort(byLocation)
			// );

			return {
				...node,
				sections: node.sections,
			};
		},
	});
}

function isTopLevel(
	document: ExtendedDocumentNode
): (comment: CommentNode) => boolean {
	return (comment: CommentNode) => {
		return document.sections.some((section) => {
			if (!comment.loc || !section.loc) return false;

			const isInside =
				comment.loc.start >= section.loc.start &&
				comment.loc.end <= section.loc.end;
			const isLeading = isAdjacent(
				comment.loc.endToken,
				section.loc.startToken
			);
			const isTrailing = isAdjacent(
				section.loc.endToken,
				comment.loc.startToken
			);

			return !isInside && !isLeading && !isTrailing;
		});
	};
}

function byLocation(a: ExtendedASTNode, b: ExtendedASTNode): number {
	if (!a.loc || !b.loc) return 0;
	return a.loc.start - b.loc.start;
}

function groupAdjacentTokens(tokens: Token[]): Array<Token[]> {
	if (!tokens.length) return [];

	const groups: Array<Token[]> = [];
	let group: Token[] | undefined;
	for (let i = 0; i < tokens.length; i += 1) {
		const previous = tokens[i - 1];
		const token = tokens[i];

		if (group && previous && isAdjacent(previous, token)) {
			group.push(token);
		} else {
			group = [token];
			groups.push(group);
		}
	}

	return groups;
}

function isAdjacent(a: Token, b: Token): boolean {
	return Math.abs(b.line - a.line) <= 1;
}
