export function replaceInArray<TValue>(
  array: TValue[],
  existing: TValue,
  replacement: TValue
) {
  const index = array.indexOf(existing);
  if (index < 0) {
    throw new Error(`Unable to replace item in array, existing item not found`);
  }

  array.splice(index, 1, replacement);
}
