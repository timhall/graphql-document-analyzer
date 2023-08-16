const { readFile, writeFile } = require("fs/promises");
const { resolve } = require("path");
const { ok } = require("assert/strict");

/*
There's an issue with esbuild in the output of CJS
with exports that have been postfixed to avoid conflicting with imports

The output below uses `visit`, but it has been postfixed as `visit2`:

```js
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  analyze,
  interpolate,
  isExtendedDocumentNode,
  print,
  visit
});
// @license MIT
```
*/

// Use very specific search to avoid replacing if esbuild output changes in the future
const SEARCH = `module.exports = {
  analyze,
  interpolate,
  isExtendedDocumentNode,
  print,
  visit
}`;

const FIX = `module.exports = {
  analyze,
  interpolate,
  isExtendedDocumentNode,
  print,
  visit: visit2
}`;

async function main() {
	const file = resolve(__dirname, "../dist/index.js");
	const cjs = await readFile(file, "utf-8");
	const fixed = cjs.replace(SEARCH, FIX);

	await writeFile(resolve(__dirname, "../dist/index.js"), fixed);
}

main().catch((error) => console.error(error));
