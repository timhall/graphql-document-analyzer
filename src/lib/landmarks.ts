import { Lexer, OperationTypeNode, Source, Token, TokenKind } from "graphql";
import {
	invalidFragment,
	InvalidFragmentDefinitionNode,
	invalidOperationDefinition,
	InvalidOperationDefinitionNode,
} from "../extended-ast";
import { safeAdvance } from "./lexer";

export type Landmark =
	| InvalidFragmentDefinitionNode
	| InvalidOperationDefinitionNode;

/**
 * Heuristic-based search for next "landmark", which is either
 * a possible operation or fragment
 *
 * Heuristics:
 *
 * 1. Operations / fragments are on separate line
 */
export function findLandmarks(source: Source, lines: Token[]): Landmark[] {
	const landmarks: Landmark[] = [];
	for (const line of lines) {
		const operation = tryParseOperation(source, line);
		if (operation) landmarks.push(operation);

		const fragment = tryParseFragment(source, line);
		if (fragment) landmarks.push(fragment);
	}

	return landmarks;
}

/**
 * @param landmarks
 * @param lineNumber 1-based line number to start search at
 */
export function findNextLandmark(
	landmarks: Landmark[],
	lineNumber: number = 1,
): Landmark | undefined {
	return landmarks.find(
		(landmark) => landmark.loc && landmark.loc?.startToken.line >= lineNumber,
	);
}

/**
 * Advance lexer state to location of next landmark
 */
export function safeAdvanceToLandmark(lexer: Lexer, landmark: Landmark): void {
	while (
		landmark.loc
			? lexer.token.kind !== TokenKind.EOF &&
			  lexer.token.line < landmark.loc.startToken.line
			: lexer.token.kind !== TokenKind.EOF
	) {
		safeAdvance(lexer);
	}
}

/**
 * Advance lexer state to next landmark, throwing if non-whitespace/comments are encountered
 */
export function strictAdvanceToLandmark(
	lexer: Lexer,
	landmark: Landmark,
): void {
	while (
		landmark?.loc
			? lexer.token.kind !== TokenKind.EOF &&
			  lexer.token.line < landmark.loc.startToken.line
			: lexer.token.kind !== TokenKind.EOF
	) {
		if (lexer.token.kind !== TokenKind.COMMENT) {
			throw new Error(`Unexpected token kind "${lexer.token.kind}"`);
		}

		lexer.advance();
	}
}

const OPERATION = /^\s*(query\s*|mutation\s*|subscription\s*)(\w+)?.*{/;

export function tryParseOperation(
	source: Source,
	line: Token,
): InvalidOperationDefinitionNode | false {
	if (!line.value) return false;

	const match = line.value.match(OPERATION);
	if (match == null) return false;

	const operation = (match[1]?.trim() ?? "query") as OperationTypeNode;
	const name = match[2]?.trim();

	return invalidOperationDefinition(source, operation, name, line, line);
}

const FRAGMENT = /^\s*fragment\s+(\w+)\s+on\s+(\w+)\s*/;

export function tryParseFragment(
	source: Source,
	line: Token,
): InvalidFragmentDefinitionNode | false {
	if (!line.value) return false;

	const match = line.value.match(FRAGMENT);
	if (match == null) return false;

	const name = match[1];
	const typeCondition = match[2];

	return invalidFragment(source, name, typeCondition, line, line);
}
