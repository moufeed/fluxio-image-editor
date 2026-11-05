import { DEFAULT_FILTER_PRESETS, isFilterPresetId, type FilterPresetId } from './image-document';

/**
 * 4×5 color matrix (20 numbers) — Fabric `ColorMatrix` / Pintura `filterFunctions` shape.
 * Row-major: `[rr, rg, rb, ra, ro, gr, gg, gb, ga, go, br, bg, bb, ba, bo, ar, ag, ab, aa, ao]`.
 */
export type FilterColorMatrix = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

/** Static matrix or factory (Pintura-style `() => number[]`). */
export type FilterColorMatrixSource =
  FilterColorMatrix | readonly number[] | (() => FilterColorMatrix | readonly number[]);

/**
 * Host options for the filters plugin (PV19 — Pintura `filterFunctions` / `filterOptions` parity).
 */
export interface FiltersPluginConfig {
  /**
   * Host color-matrix filters keyed by preset id (stored on `FiltersState.preset`).
   * Colliding with a built-in id overrides that preset’s render matrix.
   */
  readonly filterFunctions?: Readonly<Record<string, FilterColorMatrixSource>>;
  /**
   * Ordered preset ids shown in the Filters panel.
   * Omit to show built-ins followed by host `filterFunctions` keys (excluding duplicates).
   */
  readonly presets?: readonly string[];
  /**
   * Display labels for host (and optional built-in override) filter ids.
   * Locale key `filters.preset.<id>` wins when present.
   */
  readonly labels?: Readonly<Record<string, string>>;
}

/** Normalize a 20-number color matrix; returns `null` when invalid. */
export function normalizeColorMatrix(value: unknown): FilterColorMatrix | null {
  const raw =
    typeof value === 'function'
      ? (() => {
          try {
            return (value as () => unknown)();
          } catch {
            return null;
          }
        })()
      : value;
  if (!Array.isArray(raw) || raw.length !== 20) {
    return null;
  }
  const matrix: number[] = [];
  for (let i = 0; i < 20; i++) {
    const n = raw[i];
    if (typeof n !== 'number' || !Number.isFinite(n)) {
      return null;
    }
    matrix.push(n);
  }
  return matrix as unknown as FilterColorMatrix;
}

/** Resolve a host matrix source to a concrete 20-number matrix. */
export function resolveFilterMatrix(
  source: FilterColorMatrixSource | null | undefined,
): FilterColorMatrix | null {
  if (source == null) {
    return null;
  }
  return normalizeColorMatrix(source);
}

/**
 * Ordered preset ids for the Filters UI.
 * Defaults: built-ins, then host `filterFunctions` keys not already listed.
 */
export function resolveFilterPresetIds(
  config?: FiltersPluginConfig | null,
): readonly FilterPresetId[] {
  if (config?.presets) {
    const seen = new Set<string>();
    const out: FilterPresetId[] = [];
    for (const id of config.presets) {
      if (!isFilterPresetId(id) || seen.has(id)) {
        continue;
      }
      seen.add(id);
      out.push(id);
    }
    return out.length > 0 ? out : [...DEFAULT_FILTER_PRESETS];
  }

  const out: FilterPresetId[] = [...DEFAULT_FILTER_PRESETS];
  const seen = new Set<string>(DEFAULT_FILTER_PRESETS);
  const functions = config?.filterFunctions;
  if (functions) {
    for (const id of Object.keys(functions)) {
      if (!isFilterPresetId(id) || seen.has(id)) {
        continue;
      }
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/** Look up a host color matrix for a preset id (including built-in overrides). */
export function resolveHostFilterMatrix(
  preset: string,
  filterFunctions?: Readonly<Record<string, FilterColorMatrixSource>> | null,
): FilterColorMatrix | null {
  if (!filterFunctions || preset === 'none') {
    return null;
  }
  return resolveFilterMatrix(filterFunctions[preset]);
}

/** Resolve a display label from host labels, falling back to the id. */
export function resolveFilterLabel(
  preset: string,
  labels?: Readonly<Record<string, string>> | null,
): string {
  const label = labels?.[preset]?.trim();
  return label && label.length > 0 ? label : preset;
}
