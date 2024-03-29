import { Location, Source, Token, TokenKind } from "graphql";

export function substring(source: Source, location: Location): string {
	return source.body.substring(location.start, location.end);
}

export function splitLines(source: string | Source): Token[] {
	source = typeof source === "string" ? new Source(source) : source;

	const lines: Token[] = [];

	let lastIndex = 0;
	let line = 0;
	for (const match of source.body.matchAll(/\r?\n/g)) {
		line += 1;

		if (match.index == null) continue;

		const start = lastIndex;
		const end = match.index;
		const value = source.body.substring(start, end);

		lines.push(new Token(TokenKind.STRING, start, end, line, 1, null, value));
		lastIndex = match.index + match[0].length;
	}

	// Add final text section after last linebreak
	const start = lastIndex;
	const end = source.body.length;
	const value = source.body.substring(start, end);

	lines.push(new Token(TokenKind.STRING, start, end, line + 1, 1, null, value));

	return lines;
}
