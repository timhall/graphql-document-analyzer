# graphql-document-analyzer

The GraphQL document analyzer is a resilient parser that intelligently handles
a variety of issues when working with GraphQL documents, including:

1. Validation issues don't throw errors and are stored as `InvalidOperationDefinition` and `InvalidFragmentDefinition` nodes
2. Top-level comments and other ignored values are stored as `Ignored` nodes and maintained through to the printed output
3. Previous revisions can be used to interpolate valid nodes

## `analyze`

`analyze` is very similar to GraphQL's built-in `parse` method, with a field `sections` that contains
all valid, invalid, and comment sections of the document. Additionally, `definitions` will be empty
if the document has no valid definitions (instead of throwing an error).

```ts
import { analyze } from "graphql-document-analyzer";

const source = `# Notes about A
query A {
  b {
}`;

const document = analyze(source);

expect(document).toEqual({
  kind: "Document",
  definitions: [],

  // Extension of DocumentNode with sections
  sections: [
    {
      kind: "Ignored",
      value: "# Notes about A",
    },
    {
      kind: "InvalidOperationDefinition",
      value: "query A {\n  b {\n}",
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
  kind: 'Document',
  definitions: [
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
  sections: [
    {
      kind: 'Ignored',
      value: '# Notes about A'
    },
    {
      kind: 'OperationDefinition',
      // same as above...
    }
  ]
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
