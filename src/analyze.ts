import {
  DefinitionNode,
  FragmentDefinitionNode,
  NameNode,
  OperationDefinitionNode,
  OperationTypeNode,
  ParseOptions,
  SelectionSetNode,
} from "graphql";
import { Kind, Location, Source, Token, TokenKind } from "graphql";
import { Parser } from "graphql/language/parser";
import {
  ExtendedDocumentNode,
  IgnoredNode,
  InvalidFragmentDefinitionNode,
  InvalidOperationDefinitionNode,
  SectionNode,
} from "./extended-ast";
import { replaceInArray } from "./lib/replace-in-array";
import { splitLines } from "./lib/split-lines";

export function analyze(
  source: string,
  options?: ParseOptions
): ExtendedDocumentNode {
  const sections = parseSections(source, options);
  const definitions = sections.filter(isExecutableDefinition);

  return { kind: Kind.DOCUMENT, definitions, sections };
}

const OPEN_OPERATION = /^(query\s*|mutation\s*|subscription\s*)?(\w+\s*)?{/;
const OPEN_FRAGMENT = /^(fragment\s+)(\w+\s*){/;
const CLOSE = /^}/;

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
): Pick<InvalidFragmentDefinitionNode, "name"> | false {
  const match = line.match(OPEN_FRAGMENT);
  if (match == null) return false;

  const name: NameNode = { kind: Kind.NAME, value: match[2].trim() };

  return { name };
}

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

  let open: Token | undefined;
  let openNode:
    | Omit<InvalidOperationDefinitionNode, "loc" | "value">
    | Omit<InvalidFragmentDefinitionNode, "loc" | "value">
    | undefined;
  let ignored: Token[] = [];

  const writeIgnored = () => {
    if (!ignored.length) return;

    const startToken = ignored[0];
    const endToken = ignored[ignored.length - 1];
    const loc = new Location(startToken, endToken, source as Source);

    const section: IgnoredNode = {
      kind: "Ignored",
      value: (source as Source).body.substring(loc.start, loc.end),
      loc,
    };
    sections.push(section);

    ignored = [];
  };

  for (const line of lines) {
    if (open && openNode && CLOSE.test(line.value)) {
      const loc = new Location(open, line, source);
      const value = source.body.substring(loc.start, loc.end);

      const definition = tryParseDefinition(source, loc, options);
      sections.push(definition ?? { ...openNode, value, loc });

      open = undefined;
      openNode = undefined;
      continue;
    }

    let operation = isOperation(line.value);
    if (operation && !open) {
      writeIgnored();

      open = line;
      openNode = { kind: "InvalidOperationDefinition", ...operation };

      continue;
    }

    let fragment = isFragment(line.value);
    if (fragment && !open) {
      writeIgnored();

      open = line;
      openNode = { kind: "InvalidFragmentDefinition", ...fragment };

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
    if (!isExecutableDefinition(definition)) {
      return undefined;
    }

    return definition;
  } catch (_error) {
    return undefined;
  }
}

function isExecutableDefinition(
  section: SectionNode
): section is OperationDefinitionNode | FragmentDefinitionNode {
  return (
    section.kind === Kind.OPERATION_DEFINITION ||
    section.kind === Kind.FRAGMENT_DEFINITION
  );
}
