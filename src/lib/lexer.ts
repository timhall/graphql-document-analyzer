import { Lexer, Token, TokenKind } from "graphql";

type LexerState = {
	lastToken: Token;
	token: Token;
	line: number;
	lineStart: number;
};

/**
 * Restore lexer's internal state to given snapshot
 */
export function restoreLexer(lexer: Lexer, snapshot: LexerState): void {
	lexer.lastToken = snapshot.lastToken;
	lexer.token = snapshot.token;
	lexer.line = snapshot.line;
	lexer.lineStart = snapshot.lineStart;
}

/**
 * Create a snapshot of lexer's current state for later restoration
 */
export function snapshotLexer(lexer: Lexer): LexerState {
	const { lastToken, token, line, lineStart } = lexer;
	return {
		lastToken: new Token(
			lastToken.kind,
			lastToken.start,
			lastToken.end,
			lastToken.line,
			lastToken.column,
			lastToken.prev,
			lastToken.value
		),
		token: new Token(
			token.kind,
			token.start,
			token.end,
			token.line,
			token.column,
			token.prev,
			token.value
		),
		line,
		lineStart,
	};
}

/**
 * Advance lexer state to end-of-file
 */
export function advanceToEOF(lexer: Lexer): void {
	while (lexer.token.kind !== TokenKind.EOF) {
		lexer.advance();
	}
}

/**
 * Advance lexer state to end-of-file, throwing if non-whitespace/comment tokens are encountered
 */
export function safeAdvanceToEOF(lexer: Lexer): void {
	while (lexer.token.kind !== TokenKind.EOF) {
		if (lexer.token.kind !== TokenKind.COMMENT) {
			throw new Error(`Unexpected token kind "${lexer.token.kind}"`);
		}

		lexer.advance();
	}
}
