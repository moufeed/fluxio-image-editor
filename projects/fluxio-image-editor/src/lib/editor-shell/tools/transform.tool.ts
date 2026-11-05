import { inject, Injectable } from '@angular/core';

import {
  matchResizeSizePreset,
  normalizeDesignImage,
  resolveDesignImage,
  resolveResizeConfig,
  type DesignImageState,
  type DesignImageTransformEvent,
} from 'fluxio-image-editor/core';
import {
  TRANSFORM_FLIP_H_COMMAND,
  TRANSFORM_FLIP_V_COMMAND,
  TRANSFORM_RESIZE_COMMAND,
  TRANSFORM_ROTATE_COMMAND,
  TRANSFORM_SET_DESIGN_IMAGE_COMMAND,
  TRANSFORM_SET_DESIGN_IMAGE_LOCK_COMMAND,
  TRANSFORM_SET_ROTATION_COMMAND,
} from 'fluxio-image-editor/plugins/transform';

import { EditorModeCoordinator, type EditorModeClosers } from '../editor-mode.coordinator';
import { EditorShellContext } from '../editor-shell.context';
import { EditorUiStore } from '../editor-ui.store';

/**
 * Slider/spinner runs execute repeatedly while the pointer is down; these keys
 * fold the whole run into a single undo step until the interaction ends.
 */
const RESIZE_COALESCE_KEY = 'transform.resize';
const ANGLE_COALESCE_KEY = 'transform.rotation';

@Injectable()
export class TransformTool {
  private readonly ui = inject(EditorUiStore);
  private readonly shell = inject(EditorShellContext);
  private readonly modes = inject(EditorModeCoordinator);
  private closers: EditorModeClosers | null = null;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private angleTimer: ReturnType<typeof setTimeout> | null = null;
  private resizeInFlight = false;
  private angleInFlight = false;
  private resizeSealPending = false;
  private angleSealPending = false;
  private designImageBaseline: DesignImageState | null = null;
  private designImageCommitChain: Promise<void> = Promise.resolve();

  configure(closers: EditorModeClosers): void {
    this.closers = closers;
  }

  destroy(): void {
    this.clearResizeTimer();
    this.clearAngleTimer();
    this.resizeSealPending = false;
    this.angleSealPending = false;
    this.shell.getSession()?.setDesignImageInteractionBridge(null);
  }

  /** Register unlocked base-photo bridge (call when session is ready). */
  bind(session: NonNullable<ReturnType<EditorShellContext['getSession']>>): void {
    session.setDesignImageInteractionBridge({
      isActive: () => {
        const document = session.store.document();
        return !!document && !resolveDesignImage(document).locked;
      },
      getDesignImage: () => {
        const document = session.store.document();
        return document ? resolveDesignImage(document) : null;
      },
      onTransform: (event) => this.onDesignImageTransform(event),
    });
  }

  enterRotate(): void {
    if (!this.closers) {
      return;
    }
    this.modes.closeOthers('rotate', this.closers);
    const session = this.shell.getSession();
    const document = session?.store.document();
    if (document) {
      this.ui.arbitraryAngle.set(document.transform.rotationDegrees);
    }
    this.ui.rotateMode.set(true);
    session?.setActiveTool('rotate');
  }

  closeRotate(): void {
    this.flushAngle();
    this.ui.rotateMode.set(false);
    const session = this.shell.getSession();
    if (session?.store.activeTool() === 'rotate') {
      session.setActiveTool(null);
    }
  }

  enterResize(): void {
    if (!this.closers) {
      return;
    }
    this.modes.closeOthers('resize', this.closers);
    const session = this.shell.getSession();
    const document = session?.store.document();
    if (document) {
      this.ui.resizeWidth.set(document.output.width);
      this.ui.resizeHeight.set(document.output.height);
      this.syncResizePresetId(document.output.width, document.output.height);
    } else {
      this.ui.resizePresetId.set(null);
    }
    this.ui.resizeMode.set(true);
    session?.setActiveTool('resize');
  }

  closeResize(): void {
    this.flushResize();
    this.ui.resizeMode.set(false);
    this.ui.resizePresetId.set(null);
    const session = this.shell.getSession();
    if (session?.store.activeTool() === 'resize') {
      session.setActiveTool(null);
    }
  }

  async rotate(): Promise<void> {
    await this.execute(TRANSFORM_ROTATE_COMMAND, {
      degrees: this.shell.config().rotate?.incrementDegrees ?? 90,
    });
  }

  async flipHorizontal(): Promise<void> {
    await this.execute(TRANSFORM_FLIP_H_COMMAND);
  }

  async flipVertical(): Promise<void> {
    await this.execute(TRANSFORM_FLIP_V_COMMAND);
  }

  setAngle(value: number): void {
    const degrees = Number.isFinite(value) ? ((Math.round(value) % 360) + 360) % 360 : 0;
    this.ui.arbitraryAngle.set(degrees);
    this.scheduleAngle();
  }

  flushAngle(): void {
    this.clearAngleTimer();
    this.angleSealPending = true;
    void this.applyAngle();
  }

  setResizeLock(locked: boolean): void {
    this.ui.resizeLock.set(locked);
    this.scheduleResize();
  }

  setResizeWidth(value: number): void {
    const width = Math.max(1, Math.round(value) || 1);
    this.ui.resizeWidth.set(width);
    const document = this.shell.getSession()?.store.document();
    if (this.ui.resizeLock() && document) {
      const ratio = document.output.width / Math.max(document.output.height, 1);
      this.ui.resizeHeight.set(Math.max(1, Math.round(width / ratio)));
    }
    this.syncResizePresetId(this.ui.resizeWidth(), this.ui.resizeHeight());
    this.scheduleResize();
  }

  setResizeHeight(value: number): void {
    const height = Math.max(1, Math.round(value) || 1);
    this.ui.resizeHeight.set(height);
    const document = this.shell.getSession()?.store.document();
    if (this.ui.resizeLock() && document) {
      const ratio = document.output.width / Math.max(document.output.height, 1);
      this.ui.resizeWidth.set(Math.max(1, Math.round(height * ratio)));
    }
    this.syncResizePresetId(this.ui.resizeWidth(), this.ui.resizeHeight());
    this.scheduleResize();
  }

  /** PV08: apply a named size preset (exact W×H; ignores aspect lock for this commit). */
  applySizePreset(presetId: string): void {
    const presets = resolveResizeConfig(this.shell.config().resize).sizePresets ?? [];
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }
    this.ui.resizeWidth.set(preset.width);
    this.ui.resizeHeight.set(preset.height);
    this.ui.resizePresetId.set(preset.id);
    this.clearResizeTimer();
    this.resizeSealPending = true;
    void this.applyResizeExact(preset.width, preset.height);
  }

  async commitResize(): Promise<void> {
    this.clearResizeTimer();
    this.resizeSealPending = true;
    await this.applyResize();
  }

  flushResize(): void {
    this.clearResizeTimer();
    this.resizeSealPending = true;
    void this.applyResize();
  }

  async setImageLocked(locked: boolean): Promise<void> {
    const session = this.shell.getSession();
    const document = session?.store.document();
    if (!session || !document) {
      return;
    }
    if (resolveDesignImage(document).locked === locked) {
      return;
    }
    try {
      await session.execute(TRANSFORM_SET_DESIGN_IMAGE_LOCK_COMMAND, { locked });
    } catch (error) {
      this.shell.reportError(error);
    }
  }

  async setImageVisible(visible: boolean): Promise<void> {
    const session = this.shell.getSession();
    const document = session?.store.document();
    if (!session || !document) {
      return;
    }
    const current = resolveDesignImage(document);
    if ((current.visible !== false) === visible) {
      return;
    }
    try {
      await session.execute(TRANSFORM_SET_DESIGN_IMAGE_COMMAND, {
        designImage: { ...current, visible },
      });
    } catch (error) {
      this.shell.reportError(error);
    }
  }

  private onDesignImageTransform(event: DesignImageTransformEvent): void {
    const session = this.shell.getSession();
    const document = session?.store.document();
    if (!session || !document) {
      return;
    }

    if (event.phase === 'start') {
      this.designImageBaseline = resolveDesignImage(document);
    }
    if (event.phase === 'cancel') {
      const baseline = this.designImageBaseline;
      this.designImageBaseline = null;
      session.setPreview(null);
      if (baseline) {
        // Restore is handled by clearing preview back to committed document.
      }
      return;
    }

    const next = normalizeDesignImage(event.designImage, document.output);
    session.setPreview({ designImage: next });
    if (event.phase === 'end') {
      this.designImageBaseline = null;
      this.designImageCommitChain = this.designImageCommitChain
        .catch(() => undefined)
        .then(() => session.execute(TRANSFORM_SET_DESIGN_IMAGE_COMMAND, { designImage: next }))
        .then(() => {
          session.setPreview(null);
        })
        .catch((error) => {
          this.shell.reportError(error);
        });
    }
  }

  private scheduleAngle(): void {
    this.clearAngleTimer();
    this.angleTimer = setTimeout(() => {
      this.angleTimer = null;
      void this.applyAngle();
    }, 180);
  }

  private clearAngleTimer(): void {
    if (this.angleTimer !== null) {
      clearTimeout(this.angleTimer);
      this.angleTimer = null;
    }
  }

  private async applyAngle(): Promise<void> {
    const session = this.shell.getSession();
    const document = session?.store.document();
    if (!session || !document) {
      return;
    }
    if (this.angleInFlight) {
      this.scheduleAngle();
      return;
    }
    const degrees = ((Math.round(this.ui.arbitraryAngle()) % 360) + 360) % 360;
    if (document.transform.rotationDegrees === degrees) {
      this.sealAngle();
      return;
    }
    this.angleInFlight = true;
    try {
      await session.execute(
        TRANSFORM_SET_ROTATION_COMMAND,
        { degrees },
        { coalesceKey: ANGLE_COALESCE_KEY },
      );
    } catch (error) {
      this.shell.reportError(error);
    } finally {
      this.angleInFlight = false;
      this.sealAngle();
    }
  }

  /** Close the coalesced rotation run once the interaction has settled. */
  private sealAngle(): void {
    if (!this.angleSealPending || this.angleTimer !== null) {
      return;
    }
    this.angleSealPending = false;
    this.shell.getSession()?.sealHistoryCoalescing();
  }

  private scheduleResize(): void {
    this.clearResizeTimer();
    this.resizeTimer = setTimeout(() => {
      this.resizeTimer = null;
      void this.applyResize();
    }, 180);
  }

  private clearResizeTimer(): void {
    if (this.resizeTimer !== null) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }
  }

  private async applyResize(): Promise<void> {
    const width = Math.max(1, Math.round(this.ui.resizeWidth()) || 1);
    const height = Math.max(1, Math.round(this.ui.resizeHeight()) || 1);
    await this.applyResizeExact(width, height, this.ui.resizeLock());
  }

  private async applyResizeExact(
    width: number,
    height: number,
    lockAspectRatio = false,
  ): Promise<void> {
    const session = this.shell.getSession();
    const document = session?.store.document();
    if (!session || !document) {
      return;
    }
    if (this.resizeInFlight) {
      this.scheduleResize();
      return;
    }
    if (document.output.width === width && document.output.height === height) {
      this.syncResizePresetId(width, height);
      this.sealResize();
      return;
    }
    this.resizeInFlight = true;
    try {
      await session.execute(
        TRANSFORM_RESIZE_COMMAND,
        {
          width,
          height,
          lockAspectRatio,
        },
        { coalesceKey: RESIZE_COALESCE_KEY },
      );
      const next = session.store.document()?.output;
      if (next) {
        this.ui.resizeWidth.set(next.width);
        this.ui.resizeHeight.set(next.height);
        this.syncResizePresetId(next.width, next.height);
      }
    } catch (error) {
      this.shell.reportError(error);
    } finally {
      this.resizeInFlight = false;
      this.sealResize();
    }
  }

  private syncResizePresetId(width: number, height: number): void {
    const presets = resolveResizeConfig(this.shell.config().resize).sizePresets ?? [];
    this.ui.resizePresetId.set(matchResizeSizePreset(presets, width, height)?.id ?? null);
  }

  /** Close the coalesced resize run once the interaction has settled. */
  private sealResize(): void {
    if (!this.resizeSealPending || this.resizeTimer !== null) {
      return;
    }
    this.resizeSealPending = false;
    this.shell.getSession()?.sealHistoryCoalescing();
  }

  private async execute(command: string, payload?: unknown): Promise<void> {
    const session = this.shell.getSession();
    if (!session) {
      return;
    }
    try {
      await session.execute(command, payload);
    } catch (error) {
      this.shell.reportError(error);
    }
  }
}
