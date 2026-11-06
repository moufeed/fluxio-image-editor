import {
  ALWAYS_ON_EDITOR_PLUGIN_IDS,
  resolveRequestedPluginIds,
  type ImageEditorConfig,
  type ImageEditorPlugin,
} from 'fluxio-image-editor/core';
import { createAlwaysOnPlugins } from './plugin-loaders-always-on';

type OptionalPluginLoader = (config: ImageEditorConfig) => Promise<ImageEditorPlugin>;

const OPTIONAL_PLUGIN_LOADERS: Record<string, OptionalPluginLoader> = {
  adjustments: async () => {
    const { AdjustmentsPlugin: Plugin } = await import('fluxio-image-editor/plugins/adjustments');
    return new Plugin();
  },
  effects: async () => {
    const { EffectsPlugin: Plugin } = await import('fluxio-image-editor/plugins/effects');
    return new Plugin();
  },
  filters: async () => {
    const { FiltersPlugin: Plugin } = await import('fluxio-image-editor/plugins/filters');
    return new Plugin();
  },
  focus: async () => {
    const { FocusPlugin: Plugin } = await import('fluxio-image-editor/plugins/focus');
    return new Plugin();
  },
  redact: async () => {
    const { RedactPlugin: Plugin } = await import('fluxio-image-editor/plugins/redact');
    return new Plugin();
  },
  'crop-mask': async (config) => {
    const { CropMaskPlugin: Plugin } = await import('fluxio-image-editor/plugins/crop-mask');
    return new Plugin(config.cropMask);
  },
  'color-overlay': async () => {
    const { ColorOverlayPlugin: Plugin } =
      await import('fluxio-image-editor/plugins/color-overlay');
    return new Plugin();
  },
  fill: async (config) => {
    const { FillPlugin: Plugin } = await import('fluxio-image-editor/plugins/fill');
    return new Plugin(config.fill);
  },
  frame: async (config) => {
    const { FramePlugin: Plugin } = await import('fluxio-image-editor/plugins/frame');
    return new Plugin(config.frame);
  },
  text: async () => {
    const { TextPlugin: Plugin } = await import('fluxio-image-editor/plugins/text');
    return new Plugin();
  },
  shapes: async () => {
    const { ShapesPlugin: Plugin } = await import('fluxio-image-editor/plugins/shapes');
    return new Plugin();
  },
  drawing: async () => {
    const { DrawingPlugin: Plugin } = await import('fluxio-image-editor/plugins/drawing');
    return new Plugin();
  },
  path: async () => {
    const { PathPlugin: Plugin } = await import('fluxio-image-editor/plugins/path');
    return new Plugin();
  },
  'image-overlay': async (config) => {
    const { ImageOverlayPlugin: Plugin } =
      await import('fluxio-image-editor/plugins/image-overlay');
    return new Plugin(config.imageOverlay);
  },
  stickers: async (config) => {
    const { StickersPlugin: Plugin } = await import('fluxio-image-editor/plugins/stickers');
    return new Plugin(config.stickers);
  },
  emoji: async (config) => {
    const { EmojiPlugin: Plugin } = await import('fluxio-image-editor/plugins/emoji');
    return new Plugin(config.emoji);
  },
  watermark: async (config) => {
    const { WatermarkPlugin: Plugin } = await import('fluxio-image-editor/plugins/watermark');
    return new Plugin(config.watermark);
  },
  persistence: async () => {
    const { PersistencePlugin: Plugin } = await import('fluxio-image-editor/plugins/persistence');
    return new Plugin();
  },
  compare: async () => {
    const { ComparePlugin: Plugin } = await import('fluxio-image-editor/plugins/compare');
    return new Plugin();
  },
  'history-snapshots': async () => {
    const { HistorySnapshotsPlugin: Plugin } =
      await import('fluxio-image-editor/plugins/history-snapshots');
    return new Plugin();
  },
  layers: async () => {
    const { LayersPlugin: Plugin } = await import('fluxio-image-editor/plugins/layers');
    return new Plugin();
  },
  templates: async (config) => {
    const { TemplatesPlugin: Plugin } = await import('fluxio-image-editor/plugins/templates');
    return new Plugin(config.templates);
  },
  'color-picker': async (config) => {
    const { ColorPickerPlugin: Plugin } = await import('fluxio-image-editor/plugins/color-picker');
    return new Plugin(config.colorPicker);
  },
  'batch-export': async (config) => {
    const { BatchExportPlugin: Plugin } = await import('fluxio-image-editor/plugins/batch-export');
    return new Plugin(config.batchExport);
  },
  rulers: async (config) => {
    const { RulersPlugin: Plugin } = await import('fluxio-image-editor/plugins/rulers');
    return new Plugin(config.rulers);
  },
  open: async (config) => {
    const { OpenPlugin: Plugin } = await import('fluxio-image-editor/plugins/open');
    return new Plugin(config.open);
  },
};

/** Lazy path — loaded only via dynamic import from the shell when `config.plugins` is set. */
export async function resolveLazyPlugins(
  config: ImageEditorConfig,
  incrementDegrees: number,
): Promise<ImageEditorPlugin[]> {
  const alwaysOn = createAlwaysOnPlugins(config, incrementDegrees);
  const requestedIds = resolveRequestedPluginIds(config);
  const optionalIds = requestedIds.filter((id) => !ALWAYS_ON_EDITOR_PLUGIN_IDS.includes(id));
  const optionalPlugins = await Promise.all(
    optionalIds.map(async (id) => {
      const loader = OPTIONAL_PLUGIN_LOADERS[id];
      if (!loader) {
        throw new Error(`No lazy loader registered for plugin: ${id}`);
      }
      return loader(config);
    }),
  );
  return [...alwaysOn, ...optionalPlugins];
}
