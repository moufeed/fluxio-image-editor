/**
 * WordPress-style toolbar action ordering.
 * Lower `position` sorts first; omitted positions sort after all numbered ones.
 */

export function resolveToolbarPosition(position: number | undefined): number {
  return position ?? Number.POSITIVE_INFINITY;
}

/** Compare two optional positions (stable when equal — callers should use a tiebreaker). */
export function compareToolbarPosition(a: number | undefined, b: number | undefined): number {
  const pa = resolveToolbarPosition(a);
  const pb = resolveToolbarPosition(b);
  if (pa === pb) {
    return 0;
  }
  return pa < pb ? -1 : 1;
}

/**
 * Stable sort by `position` ascending. Items without `position` keep relative
 * registration order after all positioned items.
 */
export function sortByToolbarPosition<T extends { readonly position?: number }>(
  items: readonly T[],
): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const byPosition = compareToolbarPosition(a.item.position, b.item.position);
      return byPosition !== 0 ? byPosition : a.index - b.index;
    })
    .map(({ item }) => item);
}
