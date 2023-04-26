import { Source, Token, TokenKind } from "graphql";

export function splitLines(source: string | Source): Token[] {
	const body = typeof source === "string" ? source : source.body;
	const lines: Token[] = [];

	let lastIndex = 0;
	let line = 0;
	for (const match of body.matchAll(/\r?\n/g)) {
		line += 1;

		if (match.index == null) continue;

		const start = lastIndex;
		const end = match.index;
		const value = body.substring(start, end);

		lines.push(new Token(TokenKind.STRING, start, end, line, 1, null, value));
		lastIndex = match.index + match[0].length;
	}

	// Add final text section after last linebreak
	const start = lastIndex;
	const end = body.length;
	const value = body.substring(start, end);

	lines.push(new Token(TokenKind.STRING, start, end, line + 1, 1, null, value));

	return lines;
}
