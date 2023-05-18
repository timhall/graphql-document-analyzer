import {
	Kind,
	Location,
	ParseOptions,
	Source,
	Token,
	TokenKind,
	TokenKindEnum,
} from "graphql";
import { Parser } from "graphql/language/parser";
import { isSource } from "graphql/language/source";
import { processComments, processSectionComments } from "./comments";
import {
	ExtendedASTNode,
	ExtendedArgumentNode,
	ExtendedDefinitionNode,
	ExtendedDocumentNode,
	ExtendedFieldNode,
	ExtendedFragmentDefinitionNode,
	ExtendedFragmentSpreadNode,
	ExtendedInlineFragmentNode,
	ExtendedNameNode,
	ExtendedNamedTypeNode,
	ExtendedOperationDefinitionNode,
	ExtendedSelectionNode,
	ExtendedSelectionSetNode,
	ExtendedValueNode,
	ExtendedVariableDefinitionNode,
	ExtendedVariableNode,
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
	ExtendedLexer,
	restoreLexer,
	safeAdvanceToEOF,
	snapshotLexer,
	strictAdvanceToEOF,
} from "./lexer";
import { ErrorWithLoc } from "./lib/error-with-loc";
import { splitLines } from "./lib/split-lines";

export function analyze(
	source: string,
	options?: ParseOptions
): ExtendedDocumentNode {
	const parser = new ExtendedParser(source, options);
	return parser.parseDocument();
}

export class ExtendedParser extends Parser {
	protected override _lexer: ExtendedLexer;
	protected _lastNode: ExtendedASTNode | null = null;
	protected _lines: Token[];
	protected _landmarks: Landmark[];

	constructor(source: string | Source, options: ParseOptions = {}) {
		source = isSource(source) ? source : new Source(source);

		super(source, options);

		this._lexer = new ExtendedLexer(source);
		this._lines = splitLines(source);
		this._landmarks = findLandmarks(source, this._lines);
	}

	override parseName(): ExtendedNameNode {
		return super.parseName();
	}
	override parseDocument(): ExtendedDocumentNode {
		const definitions: ExtendedDefinitionNode[] = this.zeroToMany(
			TokenKind.SOF,
			this.parseDefinition,
			TokenKind.EOF
		);

		const withDocumentComments = processComments(
			this._lexer.source,
			definitions,
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
	override parseDefinition(): ExtendedDefinitionNode {
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
	override parseOperationDefinition(): ExtendedOperationDefinitionNode {
		return super.parseOperationDefinition();
	}
	// SKIP parseOperationType (only returns string, no token information)
	override parseVariableDefinitions(): ExtendedVariableDefinitionNode[] {
		return super.parseVariableDefinitions();
	}
	override parseVariableDefinition(): ExtendedVariableDefinitionNode {
		return super.parseVariableDefinition();
	}
	override parseVariable(): ExtendedVariableNode {
		return super.parseVariable();
	}
	override parseSelectionSet(): ExtendedSelectionSetNode {
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
	override parseSelection(): ExtendedSelectionNode {
		return super.parseSelection();
	}
	override parseField(): ExtendedFieldNode {
		return super.parseField();
	}
	override parseArguments(): ExtendedArgumentNode[] {
		return super.parseArguments();
	}
	override parseArgument(): ExtendedArgumentNode {
		return super.parseArgument();
	}
	override parseFragment():
		| ExtendedFragmentSpreadNode
		| ExtendedInlineFragmentNode {
		return super.parseFragment();
	}
	override parseFragmentDefinition(): ExtendedFragmentDefinitionNode {
		return super.parseFragmentDefinition();
	}
	override parseFragmentName(): ExtendedNameNode {
		return super.parseFragmentName();
	}
	override parseValueLiteral(): ExtendedValueNode {
		return super.parseValueLiteral();
	}
	// parseStringLiteral
	// parseList
	// parseObject
	// parseObjectField
	// parseDirectives
	// parseDirective
	// parseTypeReference
	override parseNamedType(): ExtendedNamedTypeNode {
		return super.parseNamedType();
	}

	//
	// Custom
	//

	tryParseOperationDefinition(): ExtendedDefinitionNode {
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

	tryParseFragmentDefinition(): ExtendedDefinitionNode {
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

	parseInvalid(): ExtendedDefinitionNode {
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
