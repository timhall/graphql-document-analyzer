import {
  DefinitionNode,
  FragmentDefinitionNode,
  Kind,
  Location,
  OperationDefinitionNode,
  parse as graphqlParse,
  Source,
  Token,
  TokenKind,
} from "graphql";
import { ExtendedDocumentNode, InvalidNode, SectionNode } from "./extended-ast";
import { replaceInArray } from "./lib/replace-in-array";
import { splitLines } from "./lib/split-lines";

export function analyze(source: string): ExtendedDocumentNode {
  const sections = parseSections(source);
  const definitions = sections.filter(isExecutableDefinition);

  return { kind: Kind.DOCUMENT, definitions, sections };
}

const OPEN = /^(query\s*|mutation\s*|subscription\s*|fragment\s*)?(\w+\s*)?{/;
const CLOSE = /^}/;
const COMMENT = /^\s*#/;

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
function parseSections(source: string | Source): SectionNode[] {
  source = typeof source === "string" ? new Source(source) : source;

  const lines = splitLines(source).filter((line) => line.value !== "");

  const sections: SectionNode[] = [];
  let open: Token | undefined;
  for (const line of lines) {
    if (open && CLOSE.test(line.value)) {
      const loc = new Location(open, line, source);
      const value = source.body.substring(loc.start, loc.end);

      const definition = tryParseDefinition(source, loc);
      sections.push(definition ?? { kind: "Invalid", value, loc });

      open = undefined;
      continue;
    }

    if (OPEN.test(line.value) && !open) {
      open = line;
      continue;
    }

    if (COMMENT.test(line.value) && !open) {
      const endToken = new Token(
        TokenKind.EOF,
        line.end,
        line.end,
        line.line,
        line.column
      );
      const loc = new Location(line, endToken, source);

      // Combine "multi-line" comments together
      // with assumption that printing combines sections with blank line separating
      const previousSection = sections[sections.length - 1];
      const isMultiline =
        previousSection?.kind === "Comment" &&
        previousSection?.loc?.end === line.start - 1;

      if (isMultiline) {
        replaceInArray(sections, previousSection, {
          kind: "Comment",
          value: `${previousSection.value}\n${line.value}`,
          loc: new Location(
            previousSection.loc?.startToken,
            loc.endToken,
            source
          ),
        });
      } else {
        sections.push({ kind: "Comment", value: line.value, loc });
      }
    }
  }

  return sections;
}

function tryParseDefinition(
  source: string | Source,
  location: Location
): DefinitionNode | undefined {
  source = typeof source === "string" ? new Source(source) : source;

  try {
    // Attempt to parse just the given location,
    // but maintain position in original source to keep locations accurate
    const value = source.body.substring(location.start, location.end);
    const isolated = value
      .padStart(location.end + 1)
      .padEnd(source.body.length);

    const document = graphqlParse(isolated);
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
