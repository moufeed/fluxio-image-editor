/**
 * Bundle isolation proof:
 * Transform-only consumer should not need crop plugin sources.
 */
import { TransformPlugin } from 'fluxio-image-editor/plugins/transform';
import { EditorSession } from 'fluxio-image-editor/core';

export function createTransformOnlySession(): EditorSession {
  return new EditorSession({
    plugins: [new TransformPlugin({ incrementDegrees: 90 })],
  });
}
