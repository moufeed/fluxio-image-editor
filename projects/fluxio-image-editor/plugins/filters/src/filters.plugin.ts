import type {
  EditorCommandContext,
  EditorCommandResult,
  FilterPresetId,
  FiltersState,
  ImageEditorPlugin,
  ImageEditorPluginContext,
  ReadonlyImageDocument,
} from 'fluxio-image-editor/core';
import {
  DEFAULT_FILTER_PRESETS,
  filtersEqual,
  isIdentityFilters,
  normalizeFilters,
} from 'fluxio-image-editor/core';

export const FILTERS_SET_COMMAND = 'filters.set';
export const FILTERS_RESET_COMMAND = 'filters.reset';

export interface FiltersSetPayload {
  readonly filters?: Partial<FiltersState> | null;
  readonly preset?: FilterPresetId;
}

export { DEFAULT_FILTER_PRESETS };

const FILTER_PRESET_NAMES: Readonly<Record<FilterPresetId, string>> = {
  none: 'None',
  grayscale: 'Grayscale',
  sepia: 'Sepia',
  invert: 'Invert',
  blackWhite: 'B&W',
  brownie: 'Brownie',
  vintage: 'Vintage',
  kodachrome: 'Kodachrome',
  technicolor: 'Technicolor',
  polaroid: 'Polaroid',
};

export class FiltersPlugin implements ImageEditorPlugin {
  readonly id = 'filters';

  setup(context: ImageEditorPluginContext): void {
    context.registerTool({
      id: 'filters',
      label: 'Filters',
    });

    context.registerCommand({
      id: FILTERS_SET_COMMAND,
      execute: (payload: FiltersSetPayload, ctx: EditorCommandContext): EditorCommandResult => {
        const next = applyFilters(ctx.document, filtersFromPayload(payload));
        return {
          document: next,
          label: isIdentityFilters(next.filters)
            ? 'Reset filter'
            : `Filter: ${FILTER_PRESET_NAMES[next.filters.preset as keyof typeof FILTER_PRESET_NAMES] ?? next.filters.preset}`,
        };
      },
    });

    context.registerCommand({
      id: FILTERS_RESET_COMMAND,
      execute: (_payload: unknown, ctx: EditorCommandContext): EditorCommandResult => ({
        document: applyFilters(ctx.document, 'none'),
        label: 'Reset filter',
      }),
    });

    context.registerToolbarAction({
      id: 'filters.tool',
      label: 'Filters',
      icon: 'filters',
      position: 70,
    });

    const enPresetLabels = Object.fromEntries(
      Object.entries(FILTER_PRESET_NAMES).map(([id, name]) => [`filters.preset.${id}`, name]),
    );
    const arPresetLabels: Record<string, string> = {
      'filters.preset.none': 'بدون',
      'filters.preset.grayscale': 'رمادي',
      'filters.preset.sepia': 'سيبيا',
      'filters.preset.invert': 'عكس',
      'filters.preset.blackWhite': 'أبيض وأسود',
      'filters.preset.brownie': 'براوني',
      'filters.preset.vintage': 'عتيق',
      'filters.preset.kodachrome': 'كوداكروم',
      'filters.preset.technicolor': 'تكنيكولور',
      'filters.preset.polaroid': 'بولارويد',
    };

    context.registerLocale({
      locale: 'en',
      messages: {
        'filters.tool': 'Filters',
        'filters.apply': 'Apply',
        'filters.cancel': 'Cancel',
        'filters.reset': 'Reset',
        ...enPresetLabels,
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'filters.tool': 'مرشحات',
        'filters.apply': 'تطبيق',
        'filters.cancel': 'إلغاء',
        'filters.reset': 'إعادة تعيين',
        ...arPresetLabels,
      },
    });
  }
}

/** Unwrap command payload → same shapes {@link normalizeFilters} already accepts. */
export function filtersFromPayload(
  payload: FiltersSetPayload | null | undefined,
): Partial<FiltersState> | FilterPresetId | null {
  if (payload == null) {
    return null;
  }
  if (payload.filters !== undefined) {
    return payload.filters;
  }
  if (payload.preset != null) {
    return payload.preset;
  }
  return null;
}

export function applyFilters(
  document: ReadonlyImageDocument,
  partial: Partial<FiltersState> | FilterPresetId | null | undefined,
): ReadonlyImageDocument {
  const filters = normalizeFilters(partial);
  if (filtersEqual(document.filters, filters)) {
    return document;
  }
  return {
    ...document,
    filters,
  };
}
