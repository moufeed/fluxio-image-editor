import { inject, Injectable } from '@angular/core';

import {
  formatCssColor,
  ImageEditorError,
  isImageEditorError,
  parseCssColor,
  toColorInputValue,
  withRgbHex,
  type RgbaColor,
} from 'fluxio-image-editor/core';

import { EditorShellContext } from '../editor-shell.context';
import { EditorUiStore } from '../editor-ui.store';

export type ColorPickerPickCallback = (cssColor: string) => void;

/** Minimal typing for the optional browser EyeDropper API. */
type EyeDropperConstructor = new () => { open(): Promise<{ sRGBHex: string }> };

/**
 * Transient eyedropper — does not close other tools.
 * Color fields call {@link startSample}.
 * Falls back to the OS `EyeDropper` API when canvas sampling is tainted (CORS).
 */
@Injectable()
export class ColorPickerTool {
  private readonly ui = inject(EditorUiStore);
  private readonly shell = inject(EditorShellContext);
  private onPick: ColorPickerPickCallback | null = null;

  /** True while waiting for a canvas click. */
  isActive(): boolean {
    return this.ui.colorPickerMode();
  }

  /** Start sampling; `onPick` receives a CSS color (field should merge alpha). */
  startSample(onPick: ColorPickerPickCallback): void {
    const session = this.shell.getSession();
    if (!session) {
      return;
    }

    if (this.ui.colorPickerMode()) {
      this.cancel();
    }

    this.onPick = onPick;
    this.ui.colorPickerMode.set(true);
    session.setColorPickerActiveProvider(() => this.ui.colorPickerMode());
    session.setColorSampleHandler((point) => {
      void this.handleSample(point.x, point.y);
    });
  }

  cancel(): void {
    this.onPick = null;
    this.ui.colorPickerMode.set(false);
    const session = this.shell.getSession();
    session?.setColorSampleHandler(null);
    session?.setColorPickerActiveProvider(null);
  }

  /** Apply sampled RGB onto `currentCss`, keeping its alpha. */
  applySampleToField(currentCss: string, sample: RgbaColor, fallback: RgbaColor): string {
    const hex = toColorInputValue({ ...sample, a: 1 });
    return withRgbHex(currentCss, hex, fallback);
  }

  formatSample(sample: RgbaColor): string {
    return formatCssColor(sample);
  }

  isPluginLoaded(): boolean {
    const ids = this.shell.getSession()?.getRegisteredPluginIds() ?? [];
    return ids.includes('color-picker');
  }

  /** True when the browser exposes the EyeDropper constructor. */
  osEyeDropperSupported(): boolean {
    return typeof (globalThis as { EyeDropper?: EyeDropperConstructor }).EyeDropper === 'function';
  }

  /** Sample a screen pixel via the OS EyeDropper; null when unsupported or cancelled. */
  async sampleFromOs(): Promise<string | null> {
    const Ctor = (globalThis as { EyeDropper?: EyeDropperConstructor }).EyeDropper;
    if (!Ctor) {
      return null;
    }
    try {
      const result = await new Ctor().open();
      return typeof result?.sRGBHex === 'string' ? result.sRGBHex : null;
    } catch {
      return null;
    }
  }

  private osFallbackEnabled(): boolean {
    return this.shell.config().colorPicker?.osEyeDropperFallback !== false;
  }

  private async handleSample(x: number, y: number): Promise<void> {
    const session = this.shell.getSession();
    const onPick = this.onPick;
    if (!session || !onPick) {
      return;
    }

    try {
      const sample = await session.samplePixelAtScenePoint(x, y);
      if (!sample) {
        this.cancel();
        return;
      }
      onPick(this.formatSample(sample));
      this.cancel();
    } catch (error: unknown) {
      if (isImageEditorError(error) && error.code === 'TAINTED_CANVAS') {
        if (this.osFallbackEnabled() && this.osEyeDropperSupported()) {
          const hex = await this.sampleFromOs();
          if (hex) {
            onPick(this.formatSample(parseCssColor(hex, { r: 0, g: 0, b: 0, a: 1 })));
            this.cancel();
            return;
          }
        }
        this.cancel();
        this.shell.reportError(
          new ImageEditorError('TAINTED_CANVAS', this.shell.translate('color-picker.tainted'), {
            cause: error,
          }),
        );
        return;
      }
      this.cancel();
      this.shell.reportError(error);
    }
  }
}
