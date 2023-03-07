export function isRecord<
	TRecord extends Record<PropertyKey, unknown> = Record<PropertyKey, unknown>
>(value: unknown | TRecord): value is TRecord {
	return value != null && typeof value === "object";
}
