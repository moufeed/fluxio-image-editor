import { Injectable } from '@angular/core';

import type { EditorControlTool } from './editor-ui.store';

export interface EditorModeClosers {
  readonly crop: () => void;
  readonly rotate: () => void;
  readonly resize: () => void;
  readonly adjustments: () => void;
  readonly effects: () => void;
  readonly filters: () => void;
  readonly focus: () => void;
  readonly redact: () => void;
  readonly cropMask: () => void;
  readonly colorOverlay: () => void;
  readonly fill: () => void;
  readonly frame: () => void;
  readonly text: () => void;
  readonly shapes: () => void;
  readonly drawing: () => void;
  readonly path: () => void;
  readonly imageOverlay: () => void;
  readonly watermark: () => void;
  readonly templates: () => void;
  readonly rulers: () => void;
}

/** Enforces the editor's one-active-tool invariant. */
@Injectable()
export class EditorModeCoordinator {
  closeOthers(target: EditorControlTool, closers: EditorModeClosers): void {
    if (target !== 'crop') {
      closers.crop();
    }
    if (target !== 'rotate') {
      closers.rotate();
    }
    if (target !== 'resize') {
      closers.resize();
    }
    if (target !== 'adjustments') {
      closers.adjustments();
    }
    if (target !== 'effects') {
      closers.effects();
    }
    if (target !== 'filters') {
      closers.filters();
    }
    if (target !== 'focus') {
      closers.focus();
    }
    if (target !== 'redact') {
      closers.redact();
    }
    if (target !== 'crop-mask') {
      closers.cropMask();
    }
    if (target !== 'color-overlay') {
      closers.colorOverlay();
    }
    if (target !== 'fill') {
      closers.fill();
    }
    if (target !== 'frame') {
      closers.frame();
    }
    if (target !== 'text' && target !== 'emoji') {
      closers.text();
    }
    if (target !== 'shapes') {
      closers.shapes();
    }
    if (target !== 'drawing') {
      closers.drawing();
    }
    if (target !== 'path') {
      closers.path();
    }
    if (target !== 'image-overlay' && target !== 'stickers') {
      closers.imageOverlay();
    }
    if (target !== 'watermark') {
      closers.watermark();
    }
    if (target !== 'templates') {
      closers.templates();
    }
    if (target !== 'rulers') {
      closers.rulers();
    }
  }

  /** Exit every tool mode (e.g. when expanding a utilibar group like Annotate). */
  closeAll(closers: EditorModeClosers): void {
    closers.crop();
    closers.rotate();
    closers.resize();
    closers.adjustments();
    closers.effects();
    closers.filters();
    closers.focus();
    closers.redact();
    closers.cropMask();
    closers.colorOverlay();
    closers.fill();
    closers.frame();
    closers.text();
    closers.shapes();
    closers.drawing();
    closers.path();
    closers.imageOverlay();
    closers.watermark();
    closers.templates();
    closers.rulers();
  }
}
