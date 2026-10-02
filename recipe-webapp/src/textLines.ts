/** Splits a textarea's "one per line" (or comma-separated) value into a clean array. */
export function linesOf(value: string, separator: "\n" | "," = "\n"): string[] {
  return value
    .split(separator === "\n" ? /\r?\n/ : ",")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** The inverse — for prefilling a textarea/input from an array the API returned. */
export function joinLines(values: readonly string[] | undefined, separator: "\n" | ", " = "\n"): string {
  return (values ?? []).join(separator);
}
