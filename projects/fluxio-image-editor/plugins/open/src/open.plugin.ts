import type {
  ImageEditorPlugin,
  ImageEditorPluginContext,
  OpenBlankPreset,
  OpenPluginConfig,
} from 'fluxio-image-editor/core';

export const OPEN_FILE_ACTION = 'open.file';
export const OPEN_NEW_ACTION = 'open.new';

export const DEFAULT_OPEN_BLANK: Required<
  Pick<NonNullable<OpenPluginConfig['defaultBlank']>, 'width' | 'height' | 'fill'>
> = {
  width: 1920,
  height: 1080,
  fill: '#ffffff',
};

/** Built-in blank size menu when `blankPresets` is omitted. */
export const DEFAULT_OPEN_BLANK_PRESETS: readonly OpenBlankPreset[] = [
  { id: 'square-1080', label: '1080 × 1080', width: 1080, height: 1080, fill: '#ffffff' },
  { id: 'hd-1920', label: '1920 × 1080', width: 1920, height: 1080, fill: '#ffffff' },
  { id: 'story-1080', label: '1080 × 1920', width: 1080, height: 1920, fill: '#ffffff' },
];

export interface ResolvedOpenConfig {
  readonly allowUpload: boolean;
  readonly allowBlank: boolean;
  readonly confirmReplace: boolean;
  readonly defaultBlank: {
    readonly width: number;
    readonly height: number;
    readonly fill: string;
  };
  readonly blankPresets: readonly OpenBlankPreset[];
}

export function resolveOpenConfig(partial?: Partial<OpenPluginConfig> | null): ResolvedOpenConfig {
  const defaultBlank = {
    width: partial?.defaultBlank?.width ?? DEFAULT_OPEN_BLANK.width,
    height: partial?.defaultBlank?.height ?? DEFAULT_OPEN_BLANK.height,
    fill: partial?.defaultBlank?.fill ?? DEFAULT_OPEN_BLANK.fill,
  };
  const blankPresets =
    partial?.blankPresets !== undefined ? partial.blankPresets : DEFAULT_OPEN_BLANK_PRESETS;
  return {
    allowUpload: partial?.allowUpload !== false,
    allowBlank: partial?.allowBlank !== false,
    confirmReplace: partial?.confirmReplace !== false,
    defaultBlank,
    blankPresets,
  };
}

/**
 * Open plugin registers Upload / New blank toolbar actions + locales.
 * File pick, blank synthesis, dirty confirm, and `session.load` live in the shell OpenController.
 */
export class OpenPlugin implements ImageEditorPlugin {
  readonly id = 'open';

  constructor(private readonly options: Partial<OpenPluginConfig> = {}) {}

  setup(context: ImageEditorPluginContext): void {
    const resolved = resolveOpenConfig(this.options);

    if (resolved.allowUpload) {
      context.registerToolbarAction({
        id: OPEN_FILE_ACTION,
        label: 'Open',
        icon: 'open-file',
        surface: 'toolbar',
        position: 5,
      });
    }

    if (resolved.allowBlank) {
      context.registerToolbarAction({
        id: OPEN_NEW_ACTION,
        label: 'New',
        icon: 'open-new',
        surface: 'toolbar',
        position: 6,
      });
    }

    context.registerLocale({
      locale: 'en',
      messages: {
        'open.file': 'Open',
        'open.new': 'New',
        'open.blankMenu': 'Blank size',
        'open.replaceConfirm': 'Replace the current image? Unsaved changes will be lost.',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'open.file': 'فتح',
        'open.new': 'جديد',
        'open.blankMenu': 'حجم فارغ',
        'open.replaceConfirm': 'استبدال الصورة الحالية؟ ستُفقد التعديلات غير المحفوظة.',
      },
    });
  }
}
