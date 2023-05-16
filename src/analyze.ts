import {
	DefinitionNode,
	DocumentNode,
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
import { isSource } from "graphql/language/source";
import { processComments, processSectionComments } from "./comments";
import {
	Extended,
	invalid,
	invalidShorthandOperationDefinition,
} from "./extended-ast";
import {
	Landmark,
	findLandmarks,
	findNextLandmark,
	safeAdvanceToLandmark,
	strictAdvanceToLandmark,
	tryParseFragment,
	tryParseOperation,
} from "./landmarks";
import {
	restoreLexer,
	safeAdvanceToEOF,
	snapshotLexer,
	strictAdvanceToEOF,
} from "./lexer";
import { splitLines } from "./lib/split-lines";
import { substring } from "./lib/substring";
import { ErrorWithLoc } from "./lib/error-with-loc";

export function analyze(
	source: string,
	options?: ParseOptions
): Extended<DocumentNode> {
	const parser = new ExtendedParser(source, options);
	return parser.parseExtendedDocument();
}

export class ExtendedParser extends Parser {
	protected _lines: Token[];
	protected _landmarks: Landmark[];

	constructor(source: string | Source, options: ParseOptions = {}) {
		source = isSource(source) ? source : new Source(source);

		super(source, options);

		this._lines = splitLines(source);
		this._landmarks = findLandmarks(source, this._lines);
	}

	parseExtendedDocument(): Extended<DocumentNode> {
		const sections: DefinitionNode[] = this.zeroToMany(
			TokenKind.SOF,
			this.parseSection,
			TokenKind.EOF
		);

		const withDocumentComments = processComments(
			this._lexer.source,
			sections,
			this._lines
		);
		const withSectionComments = withDocumentComments.map((section) =>
			processSectionComments(this._lexer.source, section, this._lines)
		);

		return {
			kind: "Document",
			definitions: withSectionComments,
		};
	}

	parseSection(): DefinitionNode {
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

	tryParseOperationDefinition(): Extended<OperationDefinitionNode> {
		const snapshot = snapshotLexer(this._lexer);
		try {
			const definition = this.parseOperationDefinition();

			// For valid operation definition, check for trailing invalid tokens
			const next = findNextLandmark(this._landmarks, this._lexer.token.line);
			if (next) {
				strictAdvanceToLandmark(this._lexer, next);
			} else {
				strictAdvanceToEOF(this._lexer);
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
				safeAdvanceToLandmark(this._lexer, next);
			} else {
				safeAdvanceToEOF(this._lexer);
			}

			const end = this._lexer.lastToken;
			const loc = new Location(start, end, this._lexer.source);

			return {
				...invalidOperation,
				errors: [new ErrorWithLoc("Invalid operation definition", { loc })],
				loc,
			};
		}
	}

	tryParseFragmentDefinition():
		| Extended<FragmentDefinitionNode>
		| Extended<OperationDefinitionNode> {
		const snapshot = snapshotLexer(this._lexer);
		try {
			const fragment = this.parseFragmentDefinition();

			// For valid operation definition, check for trailing invalid tokens
			const next = findNextLandmark(this._landmarks, this._lexer.token.line);
			if (next) {
				strictAdvanceToLandmark(this._lexer, next);
			} else {
				strictAdvanceToEOF(this._lexer);
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
				safeAdvanceToLandmark(this._lexer, next);
			} else {
				safeAdvanceToEOF(this._lexer);
			}

			const end = this._lexer.lastToken;
			const loc = new Location(start, end, this._lexer.source);

			return {
				...invalidFragment,
				errors: [new ErrorWithLoc("Invalid fragment definition", { loc })],
				loc,
			};
		}
	}

	parseInvalid(): Extended<OperationDefinitionNode> {
		const start = this._lexer.token;
		const next = findNextLandmark(this._landmarks, this._lexer.token.line + 1);

		if (next) {
			safeAdvanceToLandmark(this._lexer, next);
		} else {
			safeAdvanceToEOF(this._lexer);
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
