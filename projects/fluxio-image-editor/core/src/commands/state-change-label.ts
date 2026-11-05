/**
 * Name the fields that changed between two flat states, so history entries read
 * as "Brightness" or "Contrast + 2 more" instead of repeating the tool name.
 *
 * `labels` doubles as the field allow-list: only its keys are compared.
 */
export function describeStateChange<T extends object>(
  previous: T,
  next: T,
  labels: Readonly<Partial<Record<keyof T & string, string>>>,
  fallback: string,
): string {
  const changed = [
    ...new Set(
      (Object.keys(labels) as (keyof T & string)[])
        .filter((key) => previous[key] !== next[key])
        .map((key) => labels[key] as string),
    ),
  ];
  if (changed.length === 0) {
    return fallback;
  }
  const [first, ...rest] = changed;
  return rest.length === 0 ? first : `${first} + ${rest.length} more`;
}
