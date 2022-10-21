import { Token } from "graphql";

type PlatformToken = Token;

export function createToken(
  kind: unknown,
  start: number,
  end: number,
  line: number,
  column: number,
  value?: string | undefined
): Token {
  if (isGraphQL15Token(Token)) {
    return new Token(kind, start, end, line, column, null, value);
  } else if (isGraphQL16Token(Token)) {
    return new Token(kind, start, end, line, column, value);
  } else {
    throw new Error(
      `Unrecognized version of GraphQL, Token is expecting ${
        (Token as { length: number }).length
      } parameters, but only 6 or 7 are supported`
    );
  }
}

interface GraphQL15Token {
  new (
    kind: unknown,
    start: number,
    end: number,
    line: number,
    column: number,
    prev?: Token | undefined | null,
    value?: string | undefined
  ): PlatformToken;
}

function isGraphQL15Token(Token: { length: number }): Token is GraphQL15Token {
  return Token.length === 7;
}

interface GraphQL16Token {
  new (
    kind: unknown,
    start: number,
    end: number,
    line: number,
    column: number,
    value?: string | undefined
  ): PlatformToken;
}

function isGraphQL16Token(Token: { length: number }): Token is GraphQL16Token {
  return Token.length === 6;
}
