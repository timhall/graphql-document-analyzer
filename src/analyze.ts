import {
  ASTNode,
  DefinitionNode,
  isExecutableDefinitionNode,
  Kind,
  Location,
  NamedTypeNode,
  NameNode,
  OperationTypeNode,
  ParseOptions,
  SelectionSetNode,
  Source,
  Token,
  TokenKind,
} from "graphql";
import { Parser } from "graphql/language/parser";
import {
  ExtendedDocumentNode,
  InvalidFragmentDefinitionNode,
  InvalidOperationDefinitionNode,
  SectionNode,
} from "./extended-ast";
import { splitLines } from "./lib/split-lines";

export function analyze(
  source: string,
  options?: ParseOptions
): ExtendedDocumentNode {
  const sections = parseSections(source, options);
  const definitions = (sections as ASTNode[]).filter(
    isExecutableDefinitionNode
  );

  return { kind: Kind.DOCUMENT, definitions, sections };
}

type SectionNodePart =
  | Omit<InvalidOperationDefinitionNode, "loc" | "value">
  | Omit<InvalidFragmentDefinitionNode, "loc" | "value">;

const TOP_LEVEL_CLOSE = /^}/;
const CLOSE = /}\s*$/;

/**
 * The GraphQL parser isn't resilient to invalid documents,
 * and completely fails to parse documents with any errors.
 *
 * These heuristics attempt to determine sections from a document
 * for more accurate inserting / replacing of sections of the document
 *
 * From a Document, the following top-level definitions are supported:
 *
 * - ExecutableDefinition = Operation or Fragment
 * - TypeSystemDefinition = Schema, Type, or Directive
 * - TypeSystemExtension = SchemaExtension or TypeExtension
 *
 * The last two are most likely dealing with parsing schemas,
 * so they are ignored for now.
 *
 * Example:
 * source = `query {
 *
 * }`
 *
 * result = [{ kind: 'Invalid', value: 'query {\n\n} }]
 *
 * Additionally, the document is split into regions and attempted to be parsed separately
 * with valid parts returning the parsed node
 *
 * Example:
 * source = `query A {
 *
 * }
 *
 * query B {
 *   b
 * }`
 *
 * result = [
 *   { kind: 'Invalid', value: 'query A {\n\n} },
 *   { kind: 'Operation' }
 * ]
 *
 * Heuristics:
 *
 * 1. Operations and fragments are on separate lines
 * 2. Whitespace is significant, so "{" denotes the start of an operation and "}" the close
 */
function parseSections(
  source: string | Source,
  options?: ParseOptions
): SectionNode[] {
  source = typeof source === "string" ? new Source(source) : source;

  const lines = splitLines(source);
  const sections: SectionNode[] = [];

  let open: { token: Token; node: SectionNodePart } | undefined;
  let ignored: Token[] = [];

  const writeIgnored = () => {
    if (!ignored.length) return;

    const startToken = ignored[0];
    const endToken = ignored[ignored.length - 1];
    const loc = new Location(startToken, endToken, source as Source);
    const value = (source as Source).body.substring(loc.start, loc.end);

    sections.push({ kind: "Ignored", value, loc });

    ignored = [];
  };

  const writeSection = (node: SectionNodePart, open: Token, close: Token) => {
    const loc = new Location(open, close, source as Source);
    const value = (source as Source).body.substring(loc.start, loc.end);

    const definition = tryParseDefinition(source, loc, options);
    sections.push(definition ?? { ...node, value, loc });
  };

  for (const line of lines) {
    if (open && TOP_LEVEL_CLOSE.test(line.value)) {
      // Top-level close for open operation or fragment
      writeSection(open.node, open.token, line);

      open = undefined;
      continue;
    }

    let operation = isOperation(line.value);
    if (operation && !open) {
      writeIgnored();

      if (CLOSE.test(line.value)) {
        // Single-line operation
        writeSection(
          { kind: "InvalidOperationDefinition", ...operation },
          line,
          line
        );
      } else {
        // Multi-line operation
        open = {
          token: line,
          node: { kind: "InvalidOperationDefinition", ...operation },
        };
      }

      continue;
    }

    let fragment = isFragment(line.value);
    if (fragment && !open) {
      writeIgnored();

      if (CLOSE.test(line.value)) {
        // Single-line fragment
        writeSection(
          { kind: "InvalidFragmentDefinition", ...fragment },
          line,
          line
        );
      } else {
        // Multi-line fragment
        open = {
          token: line,
          node: { kind: "InvalidFragmentDefinition", ...fragment },
        };
      }

      continue;
    }

    if (!open) {
      ignored.push(line);
    }
  }

  writeIgnored();

  return sections;
}

class ResilientParser extends Parser {
  // Generally, selection set requires non-empty selections
  // relax this requirement to allow for readable documents (even if invalid)
  parseSelectionSet(): SelectionSetNode {
    // This inverts the do-while loop in many() to allow for empty-many
    this.expectToken(TokenKind.BRACE_L);
    const selections = [];
    while (!this.expectOptionalToken(TokenKind.BRACE_R)) {
      selections.push(this.parseSelection());
    }

    return this.node<SelectionSetNode>(this._lexer.token, {
      kind: Kind.SELECTION_SET,
      selections,
    });
  }
}

function tryParseDefinition(
  source: string | Source,
  location: Location,
  options: ParseOptions = {}
): DefinitionNode | undefined {
  source = typeof source === "string" ? new Source(source) : source;

  try {
    // Attempt to parse just the given location,
    // but maintain position in original source to keep locations accurate
    const value = source.body.substring(location.start, location.end);
    const isolated = value
      .padStart(location.end + 1)
      .padEnd(source.body.length);

    const parser = new ResilientParser(isolated, options);
    const document = parser.parseDocument();
    const definition = document.definitions[0];

    // Make sure it's an ExecutableDefinition (OperationNode or FragmentNode)
    if (!isExecutableDefinitionNode(definition)) {
      return undefined;
    }

    return definition;
  } catch (_error) {
    return undefined;
  }
}

const OPEN_OPERATION = /^(query\s*|mutation\s*|subscription\s*)?(\w+\s*)?{/;
const OPEN_FRAGMENT = /^\s*fragment\s+(\w+)\s+on\s+(\w+)\s*/;

function isOperation(
  line: string
): Pick<InvalidOperationDefinitionNode, "operation" | "name"> | false {
  const match = line.match(OPEN_OPERATION);
  if (match == null) return false;

  const operation = (match[1] ? match[1].trim() : "query") as OperationTypeNode;
  const name: NameNode | undefined = match[2]
    ? { kind: Kind.NAME, value: match[2].trim() }
    : undefined;

  return { operation, name };
}

function isFragment(
  line: string
): Pick<InvalidFragmentDefinitionNode, "name" | "typeCondition"> | false {
  const match = line.match(OPEN_FRAGMENT);
  if (match == null) return false;

  const name: NameNode = { kind: Kind.NAME, value: match[1] };
  const typeCondition: NamedTypeNode = {
    kind: Kind.NAMED_TYPE,
    name: { kind: Kind.NAME, value: match[2] },
  };

  return { name, typeCondition };
}
