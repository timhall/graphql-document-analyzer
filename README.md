# graphql-document-analyzer

The GraphQL document analyzer is a resilient parser that intelligently handles
a variety of issues when working with GraphQL documents, including:

1. Validation issues don't throw errors and are stored as `InvalidOperationDefinition` and `InvalidFragmentDefinition` nodes
2. Top-level comments and other ignored values are stored as `Ignored` nodes and maintained through to the printed output
3. Previous revisions can be used to interpolate valid nodes

## `analyze`

`analyze` is very similar to GraphQL's built-in `parse` method, with a field `sections` that contains
all valid and invalid sections of the document and parses relevant comments into a `comments` field on each node.

```ts
import { analyze } from "graphql-document-analyzer";

const source = `# Notes about A
query A {
  b {
}`;

const document = analyze(source);

expect(document).toEqual({
  kind: "ExtendedDocument",
  sections: [
    {
      kind: "InvalidOperationDefinition",
      value: "query A {\n  b {\n}",
      comments: {
        before: [
          {
            kind: "Comment",
            value: " Notes about A",
          },
        ],
      },
    },
  ],
});
```

## `interpolate`

In some situations, it is helpful to estimate what the document represents based on a previous version of the document.
For example, if someone is actively editing a document, maintaining the most-recently valid operation may be helpful.
Interpolation occurs at the operation level and is matched by operation `name`.

```ts
// (result of previous analyze / interpolate)
const reference = analyze(`query A {
  b
}`);

const document = analyze(`# Notes about A
query A {
  b {
}`);

const approximate = interpolate(document, reference);

expect(approximate).toEqual({
  kind: 'ExtendedDocument',
  sections: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: {
        kind: 'Name',
        value: 'A'
      },
      selectionSet: {
        kind: 'SelectionSet'
        selections: [
          {
            kind: 'Field',
            name: {
              kind: 'Name',
              value: 'b'
            }
          }
        ]
      }
    }
  ],
});
```

## `visit`

Visit is a section-aware visitor for extended documents, that aims to keep the document outline
consistent with changes from the visitor.

```ts
import { analyze, visit } from "graphql-document-analyzer";

const source = `# Notes about A
query A {
  b {
}`;

const document = analyze(source);
const stillHasComments = visit(document, {
  OperationDefinition(node) {
    // ...
  },
});
```

## `print`

To include top-level comments and invalid sections in the printed output, use `print`.

```ts
import { analyze, print } from "graphql-document-analyzer";

const source = `# Notes about A
query A {
  b {
}`;

const document = analyze(source);
const text = print(document);

expect(text).toEqual(source);
```
