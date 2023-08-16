import { Source, Token, TokenKind } from "graphql";
import { ignored, SectionNode } from "../extended-ast";

export function insertWhitespace(
	source: Source,
	lines: Token[],
	sections: SectionNode[],
): SectionNode[] {
	const lastLine = lines.at(-1);
	if (!lastLine) return sections;

	const SOF = new Token(TokenKind.SOF, 0, 0, 0, 0, null);
	const EOF = new Token(
		TokenKind.EOF,
		lastLine.end,
		lastLine.end,
		lastLine.line + 1,
		lastLine.column + (lastLine.value?.length ?? 0),
		lastLine,
	);

	if (!sections.length) {
		return [ignored(source, SOF, EOF)];
	}

	const lastSection = sections.at(-1);
	const trailingRange = lastSection?.loc
		? linesBetween(lines, lastSection.loc.endToken, EOF)
		: undefined;
	const trailing = trailingRange
		? ignored(source, trailingRange[0], trailingRange[1])
		: undefined;

	const withWhitespace = [
		...sections
			.map((section, index) => {
				const before = sections[index - 1]?.loc?.endToken ?? SOF;
				const leadingRange = section.loc
					? linesBetween(lines, before, section.loc?.startToken)
					: undefined;
				const leading = leadingRange
					? ignored(source, leadingRange[0], leadingRange[1])
					: undefined;

				return [leading, section];
			})
			.flat(),
		trailing,
	].filter(Boolean as unknown as (value: unknown) => value is SectionNode);

	return withWhitespace;
}

function linesBetween(
	lines: Token[],
	before: Token,
	after: Token,
): [Token, Token] | undefined {
	const startIndex = before.line - 1 + 1;
	const endIndex = after.line - 1 - 1;

	if (startIndex < 0 || endIndex < 0) return undefined;
	if (startIndex > endIndex) return undefined;

	const start = lines[startIndex];
	const end = lines[endIndex];

	return start && end ? [start, end] : undefined;
}
