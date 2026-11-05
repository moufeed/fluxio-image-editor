import { inject, Injectable } from '@angular/core';

import {
  ANNOTATION_NUDGE_STEP,
  ANNOTATION_NUDGE_STEP_LARGE,
  createDefaultCrop,
  DEFAULT_CROP_BLEED_INSET,
  normalizeCrop,
  nudgeCrop,
  presetHasAutoResizeTarget,
  resolveCropConfig,
  resolveCropGuides,
  resolvePresetAspectRatio,
  resizeCropEdge,
  type AspectRatioPreset,
  type CropGuidesConfig,
  type CropState,
  type ReadonlyEditorPreview,
} from 'fluxio-image-editor/core';
import { beginCropPreview, CROP_SET_COMMAND } from 'fluxio-image-editor/plugins/crop';

import { EditorModeCoordinator, type EditorModeClosers } from '../editor-mode.coordinator';
import { EditorShellContext } from '../editor-shell.context';
import { EditorUiStore } from '../editor-ui.store';

@Injectable()
export class CropTool {
  private readonly ui = inject(EditorUiStore);
  private readonly shell = inject(EditorShellContext);
  private readonly modes = inject(EditorModeCoordinator);
  private closers: EditorModeClosers | null = null;
  private aspectRatios: () => readonly AspectRatioPreset[] = () => [];

  configure(options: {
    readonly closers: EditorModeClosers;
    readonly aspectRatios: () => readonly AspectRatioPreset[];
  }): void {
    this.closers = options.closers;
    this.aspectRatios = options.aspectRatios;
  }

  enter(): void {
    if (!this.closers) {
      return;
    }
    this.modes.closeOthers('crop', this.closers);
    const session = this.shell.getSession();
    const document = session?.store.document();
    if (!session || !document) {
      return;
    }
    this.syncGuidesFromConfig();
    const preset = this.aspectRatios().find((item) => item.id === this.ui.cropAspectId());
    const crop = beginCropPreview(
      document,
      preset ? resolvePresetAspectRatio(preset) : null,
      preset?.shape ?? 'rect',
    );
    this.ui.cropMode.set(true);
    session.setActiveTool('crop');
    session.setPreview(this.buildPreview(crop));
  }

  changeAspect(id: string): void {
    this.ui.cropAspectId.set(id);
    if (!this.ui.cropMode()) {
      return;
    }
    const session = this.shell.getSession();
    const document = session?.store.document();
    if (!session || !document) {
      return;
    }
    const preset = this.aspectRatios().find((item) => item.id === id);
    const ratio = preset ? resolvePresetAspectRatio(preset) : null;
    const shape = preset?.shape ?? 'rect';
    const existing = session.store.preview()?.crop;
    const crop = existing
      ? normalizeCrop({ ...existing, aspectRatio: ratio, shape }, document.sourceSize)
      : createDefaultCrop(document.sourceSize, ratio, shape);
    session.setPreview(this.buildPreview(crop));
  }

  setGuideCircle(enabled: boolean): void {
    this.ui.cropGuideCircle.set(enabled);
    this.refreshPreviewGuides();
  }

  setGuideBleed(enabled: boolean): void {
    this.ui.cropGuideBleed.set(enabled);
    this.refreshPreviewGuides();
  }

  /**
   * PV38: Arrow moves the crop; Alt+Arrow resizes from the matching edge.
   * Shift multiplies the step (same as annotation nudge).
   */
  nudgeFromKeyboard(event: KeyboardEvent): boolean {
    if (!this.ui.cropMode()) {
      return false;
    }
    if (!isArrowKey(event.key)) {
      return false;
    }
    const session = this.shell.getSession();
    const document = session?.store.document();
    const crop = session?.store.preview()?.crop;
    if (!session || !document || !crop) {
      return false;
    }

    const step = event.shiftKey ? ANNOTATION_NUDGE_STEP_LARGE : ANNOTATION_NUDGE_STEP;
    let next: CropState;
    if (event.altKey) {
      const edge = arrowToCropEdge(event.key);
      if (!edge) {
        return false;
      }
      next = resizeCropEdge(crop, edge, step, document.sourceSize);
    } else {
      const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
      const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
      if (dx === 0 && dy === 0) {
        return false;
      }
      next = nudgeCrop(crop, dx, dy, document.sourceSize);
    }
    session.setPreview(this.buildPreview(next));
    return true;
  }

  async apply(): Promise<void> {
    const session = this.shell.getSession();
    const crop = session?.store.preview()?.crop;
    if (!session || !crop) {
      return;
    }
    const cropConfig = resolveCropConfig(this.shell.config().crop);
    const preset = this.aspectRatios().find((item) => item.id === this.ui.cropAspectId());
    const resizeTo =
      cropConfig.autoResize && preset && presetHasAutoResizeTarget(preset)
        ? { width: preset.width!, height: preset.height! }
        : undefined;
    await session.execute(CROP_SET_COMMAND, { crop, resizeTo });
    this.ui.cropMode.set(false);
    session.setActiveTool(null);
  }

  cancel(): void {
    this.ui.cropMode.set(false);
    const session = this.shell.getSession();
    session?.setPreview(null);
    session?.setActiveTool(null);
  }

  private syncGuidesFromConfig(): void {
    const guides = resolveCropGuides(resolveCropConfig(this.shell.config().crop).guides);
    this.ui.cropGuideCircle.set(guides.profileCircle);
    this.ui.cropGuideBleed.set(guides.bleed > 0);
  }

  private refreshPreviewGuides(): void {
    if (!this.ui.cropMode()) {
      return;
    }
    const session = this.shell.getSession();
    const crop = session?.store.preview()?.crop;
    if (!session || !crop) {
      return;
    }
    session.setPreview(this.buildPreview(crop));
  }

  private buildPreview(crop: CropState): ReadonlyEditorPreview {
    return {
      crop,
      cropGuides: this.activeGuides(),
    };
  }

  private activeGuides(): CropGuidesConfig {
    const configured = resolveCropGuides(resolveCropConfig(this.shell.config().crop).guides);
    return {
      profileCircle: this.ui.cropGuideCircle(),
      bleed: this.ui.cropGuideBleed()
        ? configured.bleed > 0
          ? configured.bleed
          : DEFAULT_CROP_BLEED_INSET
        : 0,
    };
  }
}

function isArrowKey(key: string): boolean {
  return key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight';
}

function arrowToCropEdge(key: string): 'n' | 's' | 'e' | 'w' | null {
  switch (key) {
    case 'ArrowUp':
      return 'n';
    case 'ArrowDown':
      return 's';
    case 'ArrowLeft':
      return 'w';
    case 'ArrowRight':
      return 'e';
    default:
      return null;
  }
}
