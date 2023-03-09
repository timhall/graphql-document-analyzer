import {
	FragmentDefinitionNode,
	Kind,
	Location,
	OperationDefinitionNode,
	ParseOptions,
	SelectionSetNode,
	Source,
	Token,
	TokenKind,
	TokenKindEnum,
} from "graphql";
import { Parser } from "graphql/language/parser";
import {
	ExtendedDocumentNode,
	invalid,
	InvalidFragmentDefinitionNode,
	InvalidNode,
	InvalidOperationDefinitionNode,
	invalidShorthandOperationDefinition,
	SectionNode,
} from "./extended-ast";
import { insertWhitespace } from "./lib/insert-whitespace";
import {
	advanceToLandmark,
	findLandmarks,
	findNextLandmark,
	Landmark,
	safeAdvanceToLandmark,
	tryParseFragment,
	tryParseOperation,
} from "./lib/landmarks";
import {
	advanceToEOF,
	restoreLexer,
	safeAdvanceToEOF,
	snapshotLexer,
} from "./lib/lexer";
import { splitLines, substring } from "./lib/source";

export class ResilientParser extends Parser {
	_lines: Token[];
	_landmarks: Landmark[];

	constructor(source: string | Source, options: ParseOptions = {}) {
		source = typeof source === "string" ? new Source(source) : source;

		super(source, options);

		this._lines = splitLines(source);
		this._landmarks = findLandmarks(source, this._lines);
	}

	parseExtendedDocument(): ExtendedDocumentNode {
		const definitions: SectionNode[] = this.zeroToMany(
			TokenKind.SOF,
			this.parseSection,
			TokenKind.EOF
		);
		const sections = insertWhitespace(
			this._lexer.source,
			this._lines,
			definitions
		);

		return {
			kind: "ExtendedDocument",
			sections,
		};
	}

	parseSection(): SectionNode {
		if (this.peek(TokenKind.NAME)) {
			switch (this._lexer.token.value) {
				case "query":
				case "mutation":
				case "subscription":
					return this.tryParseOperationDefinition();
				case "fragment":
					return this.tryParseFragmentDefinition();
			}
		} else if (this.peek(TokenKind.BRACE_L)) {
			return this.tryParseOperationDefinition();
		}

		return this.parseInvalid();
	}

	tryParseOperationDefinition():
		| OperationDefinitionNode
		| InvalidOperationDefinitionNode
		| InvalidNode {
		const snapshot = snapshotLexer(this._lexer);
		try {
			const definition = this.parseOperationDefinition();

			// For valid operation definition, check for trailing invalid tokens
			const next = findNextLandmark(this._landmarks, this._lexer.token.line);
			if (next) {
				safeAdvanceToLandmark(this._lexer, next);
			} else {
				safeAdvanceToEOF(this._lexer);
			}

			return definition;
		} catch (error) {
			restoreLexer(this._lexer, snapshot);

			const start = this._lexer.token;
			const invalidOperation =
				start.kind === TokenKind.BRACE_L
					? invalidShorthandOperationDefinition(
							this._lexer.source,
							start,
							start
					  )
					: tryParseOperation(this._lexer.source, this._lines[start.line - 1]);
			if (!invalidOperation) return this.parseInvalid();

			// For invalid operation definition, search for next definition on next line
			const next = findNextLandmark(
				this._landmarks,
				this._lexer.token.line + 1
			);

			if (next) {
				advanceToLandmark(this._lexer, next);
			} else {
				advanceToEOF(this._lexer);
			}

			const end = this._lexer.lastToken;
			const loc = new Location(start, end, this._lexer.source);

			return {
				...invalidOperation,
				value: substring(this._lexer.source, loc),
				loc,
			};
		}
	}

	tryParseFragmentDefinition():
		| FragmentDefinitionNode
		| InvalidFragmentDefinitionNode
		| InvalidNode {
		const snapshot = snapshotLexer(this._lexer);
		try {
			const fragment = this.parseFragmentDefinition();

			// For valid operation definition, check for trailing invalid tokens
			const next = findNextLandmark(this._landmarks, this._lexer.token.line);
			if (next) {
				safeAdvanceToLandmark(this._lexer, next);
			} else {
				safeAdvanceToEOF(this._lexer);
			}

			return fragment;
		} catch (error) {
			restoreLexer(this._lexer, snapshot);

			const start = this._lexer.token;
			const invalidFragment = tryParseFragment(
				this._lexer.source,
				this._lines[start.line - 1]
			);
			if (!invalidFragment) return this.parseInvalid();

			// For invalid fragment definition, search for next definition on next line
			const next = findNextLandmark(
				this._landmarks,
				this._lexer.token.line + 1
			);

			if (next) {
				advanceToLandmark(this._lexer, next);
			} else {
				advanceToEOF(this._lexer);
			}

			const end = this._lexer.lastToken;
			const loc = new Location(start, end, this._lexer.source);

			return {
				...invalidFragment,
				value: substring(this._lexer.source, loc),
				loc,
			};
		}
	}

	parseInvalid(): InvalidNode {
		const start = this._lexer.token;
		const next = findNextLandmark(this._landmarks, this._lexer.token.line + 1);

		if (next) {
			advanceToLandmark(this._lexer, next);
		} else {
			advanceToEOF(this._lexer);
		}
		const end = this._lexer.lastToken;

		return invalid(this._lexer.source, start, end);
	}

	// @override
	parseSelectionSet(): SelectionSetNode {
		// Generally, selection set requires non-empty selections,
		// relax this requirement to allow for readable documents (even if invalid)
		const start = this._lexer.token;
		return {
			kind: Kind.SELECTION_SET,
			selections: this.zeroToMany(
				TokenKind.BRACE_L,
				this.parseSelection,
				TokenKind.BRACE_R
			),
			loc: this.loc(start),
		};
	}

	/**
	 * Returns a list of parse nodes that may be empty, determined by the parseFn.
	 * This list begins with a lex token of openKind and ends with a lex token of closeKind.
	 * Advances the parser to the next lex token after the closing token.
	 */
	zeroToMany<T>(
		openKind: TokenKindEnum,
		parseFn: () => T,
		closeKind: TokenKindEnum
	): Array<T> {
		this.expectToken(openKind);

		// This inverts the do-while loop in many() to allow for empty-many
		const nodes: T[] = [];
		while (!this.expectOptionalToken(closeKind)) {
			nodes.push(parseFn.call(this));
		}

		return nodes;
	}
}
