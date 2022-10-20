export function trimTrailingWhitespace(value: string): string {
  return value
    .split(/\r?\n/g)
    .map((line) => line.trimEnd())
    .join("\n");
}
