import { Lexer, Token, TokenKind } from "graphql";
import { splitLines } from "./lib/split-lines";

type LexerState = {
	lastToken: Token;
	token: Token;
	line: number;
	lineStart: number;
};

export class ExtendedLexer extends Lexer {
	/**
	 * Comments found from lastToken to token
	 */
	comments: Token[] = [];

	override advance(): Token {
		let prev = (this.lastToken = this.token);
		const token = this.lookahead();

		// Find comments from lastToken to next
		const comments = [];
		const source = this.source;
		const body = source.body;

		let pos = this.lastToken.end;
		while (pos < token.start) {
			let code = body.charCodeAt(pos);

			const line = this.line;
			const col = 1 + pos - this.lineStart;

			if (code === 35) {
				const start = pos;
				do {
					code = body.charCodeAt(++pos);
				} while (!isNaN(code) && (code > 0x001f || code === 0x0009));

				const comment = new Token(
					TokenKind.COMMENT,
					start,
					pos,
					line,
					col,
					prev,
					body.slice(start + 1, pos)
				);

				comments.push(comment);
				prev = comment;
			} else {
				++pos;
			}
		}

		this.comments = comments;
		this.token = token;

		return token;
	}
}

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
export function safeAdvanceToEOF(lexer: Lexer): void {
	while (lexer.token.kind !== TokenKind.EOF) {
		safeAdvance(lexer);
	}
}

/**
 * Advance lexer state to end-of-file, throwing if non-whitespace/comment tokens are encountered
 */
export function strictAdvanceToEOF(lexer: Lexer): void {
	while (lexer.token.kind !== TokenKind.EOF) {
		if (lexer.token.kind !== TokenKind.COMMENT) {
			throw new Error(`Unexpected token kind "${lexer.token.kind}"`);
		}

		lexer.advance();
	}
}

/**
 * Safely advance the lexer, parsing invalid sections as BlockString and EOF
 */
export function safeAdvance(lexer: Lexer): void {
	try {
		lexer.advance();
	} catch {
		const lines = splitLines(lexer.source);
		const EOF = new Token(
			TokenKind.EOF,
			lexer.source.body.length,
			lexer.source.body.length,
			lines.length + 1,
			1,
			lexer.token
		);

		lexer.lastToken = EOF;
		lexer.token = EOF;
	}
}
