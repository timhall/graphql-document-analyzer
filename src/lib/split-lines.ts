import { Source, Token, TokenKind } from "graphql";

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

    lines.push(new Token(TokenKind.STRING, start, end, line, 0, value));

    lastIndex = end + match.length;
  }

  // Add final text section after last linebreak
  const start = lastIndex;
  const end = source.body.length;
  const value = source.body.substring(start, end);

  lines.push(new Token(TokenKind.STRING, start, end, line, 0, value));

  return lines;
}
