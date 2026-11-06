import { Injectable, signal } from '@angular/core';

import {
  type EditorSession,
  type ImageEditorConfig,
  type ImageEditorPlugin,
  type ImageEditorSource,
} from 'fluxio-image-editor/core';

import type { ConfirmCloseEvent, EditorToolbarActionEvent } from './editor-events';

/**
 * Component-scoped bridge between Angular inputs/outputs and internal controllers.
 * It deliberately exposes accessors instead of copying input values.
 */
@Injectable()
export class EditorShellContext {
  readonly session = signal<EditorSession | null>(null);
  readonly pluginsBootstrapping = signal(false);

  config: () => ImageEditorConfig = () => ({});
  source: () => ImageEditorSource | null = () => null;
  plugins: () => readonly ImageEditorPlugin[] = () => [];
  viewportElement: () => HTMLDivElement | null = () => null;
  translate: (key: string) => string = (key) => key;
  reportError: (error: unknown) => void = () => undefined;
  /** Forwards unhandled registered toolbar/utilibar actions to the host `(action)` output. */
  emitAction: (event: EditorToolbarActionEvent) => void = () => undefined;
  /** Dirty discard confirm for close and Open replace when `useCustomConfirm` is set. */
  emitConfirmClose: (event: ConfirmCloseEvent) => void = () => undefined;
  /** After Open/New (or shell-owned replace) so the host can sync `[source]`. */
  emitSourceChanged: (source: ImageEditorSource) => void = () => undefined;

  getSession(): EditorSession | null {
    return this.session();
  }
}
