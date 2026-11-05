import type { ImageEditorConfig, ImageEditorPlugin } from 'fluxio-image-editor/core';
import { CropPlugin } from 'fluxio-image-editor/plugins/crop';
import { ExportPlugin } from 'fluxio-image-editor/plugins/export';
import { TransformPlugin } from 'fluxio-image-editor/plugins/transform';
import { ViewportPlugin } from 'fluxio-image-editor/plugins/viewport';

/** Essential plugins registered on every session regardless of host plugin selection. */
export function createAlwaysOnPlugins(
  config: ImageEditorConfig,
  incrementDegrees: number,
): ImageEditorPlugin[] {
  return [
    new ViewportPlugin(),
    new TransformPlugin({
      incrementDegrees,
      allowArbitraryAngle: config.rotate?.allowArbitraryAngle,
    }),
    new CropPlugin({ aspectRatios: config.aspectRatios }),
    new ExportPlugin(),
  ];
}
