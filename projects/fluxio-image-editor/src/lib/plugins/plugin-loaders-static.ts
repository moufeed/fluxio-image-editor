import type { ImageEditorConfig, ImageEditorPlugin } from 'fluxio-image-editor/core';
import { AdjustmentsPlugin } from 'fluxio-image-editor/plugins/adjustments';
import { createAlwaysOnPlugins } from './plugin-loaders-always-on';
import { EffectsPlugin } from 'fluxio-image-editor/plugins/effects';
import { FiltersPlugin } from 'fluxio-image-editor/plugins/filters';
import { FocusPlugin } from 'fluxio-image-editor/plugins/focus';
import { RedactPlugin } from 'fluxio-image-editor/plugins/redact';
import { CropMaskPlugin } from 'fluxio-image-editor/plugins/crop-mask';
import { ColorOverlayPlugin } from 'fluxio-image-editor/plugins/color-overlay';
import { FramePlugin } from 'fluxio-image-editor/plugins/frame';
import { TextPlugin } from 'fluxio-image-editor/plugins/text';
import { ShapesPlugin } from 'fluxio-image-editor/plugins/shapes';
import { DrawingPlugin } from 'fluxio-image-editor/plugins/drawing';
import { PathPlugin } from 'fluxio-image-editor/plugins/path';
import { ImageOverlayPlugin } from 'fluxio-image-editor/plugins/image-overlay';
import { StickersPlugin } from 'fluxio-image-editor/plugins/stickers';
import { EmojiPlugin } from 'fluxio-image-editor/plugins/emoji';
import { WatermarkPlugin } from 'fluxio-image-editor/plugins/watermark';
import { PersistencePlugin } from 'fluxio-image-editor/plugins/persistence';
import { ComparePlugin } from 'fluxio-image-editor/plugins/compare';
import { HistorySnapshotsPlugin } from 'fluxio-image-editor/plugins/history-snapshots';
import { LayersPlugin } from 'fluxio-image-editor/plugins/layers';
import { TemplatesPlugin } from 'fluxio-image-editor/plugins/templates';
import { ColorPickerPlugin } from 'fluxio-image-editor/plugins/color-picker';
import { BatchExportPlugin } from 'fluxio-image-editor/plugins/batch-export';
import { RulersPlugin } from 'fluxio-image-editor/plugins/rulers';
import { FillPlugin } from 'fluxio-image-editor/plugins/fill';
/** Synchronous default path — keeps backward-compatible eager bundling. */
export function createAllPluginsStatic(
  config: ImageEditorConfig,
  incrementDegrees: number,
): ImageEditorPlugin[] {
  return [
    ...createAlwaysOnPlugins(config, incrementDegrees),
    new AdjustmentsPlugin(),
    new EffectsPlugin(),
    new FiltersPlugin(),
    new FocusPlugin(),
    new RedactPlugin(),
    new CropMaskPlugin(config.cropMask),
    new ColorOverlayPlugin(),
    new FillPlugin(config.fill),
    new FramePlugin(config.frame),
    new TextPlugin(),
    new ShapesPlugin(),
    new DrawingPlugin(),
    new PathPlugin(),
    new ImageOverlayPlugin(config.imageOverlay),
    new StickersPlugin(config.stickers),
    new EmojiPlugin(config.emoji),
    new WatermarkPlugin(config.watermark),
    new PersistencePlugin(),
    new ComparePlugin(),
    new HistorySnapshotsPlugin(),
    new LayersPlugin(),
    new TemplatesPlugin(config.templates),
    new ColorPickerPlugin(config.colorPicker),
    new BatchExportPlugin(config.batchExport),
    new RulersPlugin(config.rulers),
  ];
}
