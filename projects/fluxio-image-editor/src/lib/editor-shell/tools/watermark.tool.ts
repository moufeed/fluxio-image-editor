import { inject, Injectable } from '@angular/core';

import {
  createInitialWatermark,
  normalizeWatermark,
  watermarkWithPresetPosition,
  watermarksEqual,
  type WatermarkMode,
  type WatermarkPosition,
  type WatermarkState,
  type WatermarkTransformEvent,
} from 'fluxio-image-editor/core';
import { WATERMARK_SET_COMMAND } from 'fluxio-image-editor/plugins/watermark';

import { EditorModeCoordinator, type EditorModeClosers } from '../editor-mode.coordinator';
import { EditorShellContext } from '../editor-shell.context';
import { EditorUiStore } from '../editor-ui.store';

@Injectable()
export class WatermarkTool {
  private readonly ui = inject(EditorUiStore);
  private readonly shell = inject(EditorShellContext);
  private readonly modes = inject(EditorModeCoordinator);
  private closers: EditorModeClosers | null = null;
  private baseline: WatermarkState | null = null;
  private commitChain: Promise<void> = Promise.resolve();

  configure(closers: EditorModeClosers): void {
    this.closers = closers;
  }

  hasActiveGesture(): boolean {
    return this.baseline !== null;
  }

  enter(): void {
    if (!this.closers) {
      return;
    }
    this.modes.closeOthers('watermark', this.closers);
    const session = this.shell.getSession();
    const document = session?.store.document();
    if (!session || !document) {
      return;
    }
    const config = this.shell.config().watermark;
    let draft = normalizeWatermark(document.watermark);
    if (draft.mode === 'none') {
      draft = normalizeWatermark({
        ...draft,
        mode: 'text',
        text: config?.defaultText?.trim() || draft.text,
        imageSrc: config?.imageSrc?.trim() || draft.imageSrc,
      });
    }
    this.ui.draftWatermark.set(draft);
    this.baseline = null;
    this.ui.watermarkMode.set(true);
    session.setActiveTool('watermark');
    this.bind(session);
    session.setPreview({ watermark: draft });
  }

  cancel(): void {
    const wasOpen = this.ui.watermarkMode();
    this.baseline = null;
    this.ui.watermarkMode.set(false);
    const session = this.shell.getSession();
    if (!session) {
      return;
    }
    session.setWatermarkInteractionBridge(null);
    if (wasOpen || session.store.activeTool() === 'watermark') {
      session.setPreview(null);
      session.setActiveTool(null);
    }
  }

  async reset(): Promise<void> {
    const draft = createInitialWatermark();
    this.ui.draftWatermark.set(draft);
    if (this.ui.watermarkMode()) {
      this.shell.getSession()?.setPreview({ watermark: draft });
      await this.commit();
    }
  }

  patch(patch: Partial<WatermarkState>): void {
    const draft = normalizeWatermark({ ...this.ui.draftWatermark(), ...patch });
    this.ui.draftWatermark.set(draft);
    if (this.ui.watermarkMode()) {
      this.shell.getSession()?.setPreview({ watermark: draft });
    }
  }

  setPosition(position: WatermarkPosition): void {
    const draft = watermarkWithPresetPosition(this.ui.draftWatermark(), position);
    this.ui.draftWatermark.set(draft);
    if (this.ui.watermarkMode()) {
      this.shell.getSession()?.setPreview({ watermark: draft });
      void this.commit();
    }
  }

  setMode(mode: WatermarkMode): void {
    const config = this.shell.config().watermark;
    const current = this.ui.draftWatermark();
    this.patch({
      mode,
      text: current.text || config?.defaultText || 'Watermark',
      imageSrc: current.imageSrc || config?.imageSrc || '',
    });
    void this.commit();
  }

  setImage(src: string): void {
    this.patch({ mode: 'image', imageSrc: src });
    void this.commit();
  }

  remove(): void {
    if (!this.ui.watermarkMode()) {
      return;
    }
    const draft = createInitialWatermark();
    this.ui.draftWatermark.set(draft);
    this.shell.getSession()?.setPreview({ watermark: draft });
    void this.commit();
  }

  async done(): Promise<void> {
    const session = this.shell.getSession();
    if (!session || !this.ui.watermarkMode()) {
      return;
    }
    const document = session.store.document();
    const draft = normalizeWatermark(this.ui.draftWatermark());
    if (document && !watermarksEqual(document.watermark, draft)) {
      await this.commit();
    }
    this.baseline = null;
    this.ui.watermarkMode.set(false);
    session.setWatermarkInteractionBridge(null);
    session.setPreview(null);
    session.setActiveTool(null);
  }

  commit(): Promise<void> {
    const session = this.shell.getSession();
    if (!session || !this.ui.watermarkMode()) {
      return Promise.resolve();
    }
    const watermark = normalizeWatermark(this.ui.draftWatermark());
    this.commitChain = this.commitChain
      .catch(() => undefined)
      .then(() => session.execute(WATERMARK_SET_COMMAND, { watermark }));
    return this.commitChain;
  }

  /** Keep draft watermark aligned with document when history/session changes. */
  syncFromDocument(): void {
    if (!this.ui.watermarkMode() || this.baseline) {
      return;
    }
    const session = this.shell.getSession();
    const document = session?.store.document();
    if (!session || !document) {
      return;
    }
    const watermark = normalizeWatermark(document.watermark);
    this.ui.draftWatermark.set(
      watermark.mode === 'none' ? normalizeWatermark({ ...watermark, mode: 'text' }) : watermark,
    );
    session.setPreview({ watermark: this.ui.draftWatermark() });
  }

  private bind(session: NonNullable<ReturnType<EditorShellContext['getSession']>>): void {
    session.setWatermarkInteractionBridge({
      getWatermark: () => (this.ui.watermarkMode() ? this.ui.draftWatermark() : null),
      onTransform: (event) => this.onTransform(event),
    });
  }

  private onTransform(event: WatermarkTransformEvent): void {
    if (event.phase === 'start') {
      this.baseline = this.ui.draftWatermark();
    }
    if (event.phase === 'cancel') {
      const baseline = this.baseline;
      this.baseline = null;
      if (baseline) {
        this.ui.draftWatermark.set(baseline);
        this.shell.getSession()?.setPreview({ watermark: baseline });
      }
      return;
    }
    this.ui.draftWatermark.set(normalizeWatermark(event.watermark));
    this.shell.getSession()?.setPreview({ watermark: event.watermark });
    if (event.phase === 'end') {
      this.baseline = null;
      void this.commit();
    }
  }
}
