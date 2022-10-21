export function ensureTrailingNewline(value: string): string {
  return value.endsWith("\n") ? value : `${value}\n`;
}

export function trimTrailingNewlines(value: string): string {
  const match = value.match(/\n+$/);
  if (match == null) return value;

  const trimmed = value.substring(0, match.index);
  return trimmed;
}
