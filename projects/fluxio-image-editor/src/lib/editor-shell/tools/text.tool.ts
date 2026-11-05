import { inject, Injectable } from '@angular/core';

import {
  boundsFromText,
  cascadePlaceBounds,
  createAnnotationId,
  createDefaultTextAnnotation,
  isCssColorTransparent,
  isTextAnnotation,
  normalizeTextAnnotation,
  type TextAnnotation,
} from 'fluxio-image-editor/core';
import type { EditingTextOverlay } from '../editor-ui.store';
import { TEXT_SET_COMMAND } from 'fluxio-image-editor/plugins/text';
import { EMOJI_FONT_FAMILY } from 'fluxio-image-editor/plugins/emoji';

import { AnnotationInteractionController } from '../annotation-interaction.controller';
import { EditorModeCoordinator, type EditorModeClosers } from '../editor-mode.coordinator';
import { EditorShellContext } from '../editor-shell.context';
import { EditorUiStore } from '../editor-ui.store';

@Injectable()
export class TextTool {
  private readonly ui = inject(EditorUiStore);
  private readonly shell = inject(EditorShellContext);
  private readonly modes = inject(EditorModeCoordinator);
  private readonly annotations = inject(AnnotationInteractionController);
  private closers: EditorModeClosers | null = null;
  private commitChain: Promise<void> = Promise.resolve();
  private overlayFrame: number | null = null;

  configure(closers: EditorModeClosers): void {
    this.closers = closers;
  }

  private isActive(): boolean {
    return this.ui.textMode() || this.ui.emojiMode();
  }

  enter(): void {
    this.enterMode('text');
  }

  enterEmoji(): void {
    this.enterMode('emoji');
  }

  private enterMode(tool: 'text' | 'emoji'): void {
    if (!this.closers) {
      return;
    }
    this.modes.closeOthers(tool, this.closers);
    const session = this.shell.getSession();
    const document = session?.store.document();
    if (!session || !document) {
      return;
    }
    const texts = document.annotations.filter(isTextAnnotation).map(normalizeTextAnnotation);
    this.ui.draftTexts.set(texts);
    const keep = this.ui.selectedTextIds().filter((id) => texts.some((item) => item.id === id));
    this.ui.selectedTextIds.set(keep.length > 0 ? keep : texts[0]?.id ? [texts[0].id] : []);
    this.ui.textMode.set(tool === 'text');
    this.ui.emojiMode.set(tool === 'emoji');
    this.ui.editingTextId.set(null);
    this.ui.editingTextOverlay.set(null);
    session.setActiveTool(tool);
    this.annotations.bind(session);
    this.annotations.pushPreview();
  }

  cancel(): void {
    const wasOpen = this.isActive();
    this.stopOverlaySync();
    this.ui.editingTextId.set(null);
    this.ui.editingTextOverlay.set(null);
    this.annotations.clearGesture();
    this.ui.textMode.set(false);
    this.ui.emojiMode.set(false);
    this.ui.selectedTextIds.set([]);
    const session = this.shell.getSession();
    if (!session) {
      return;
    }
    const active = session.store.activeTool();
    if (wasOpen || active === 'text' || active === 'emoji') {
      this.annotations.syncAllDraftsFromDocument();
      session.setPreview(null);
      session.setActiveTool(null);
    }
  }

  reset(): void {
    this.ui.draftTexts.set([]);
    this.ui.selectedTextIds.set([]);
    if (this.isActive()) {
      this.annotations.pushPreview();
      void this.commit();
    }
  }

  add(): void {
    const document = this.shell.getSession()?.store.document();
    if (!document) {
      return;
    }
    const candidate = createDefaultTextAnnotation(document.output);
    const placedBounds = cascadePlaceBounds(
      boundsFromText(candidate),
      this.ui.draftTexts().map(boundsFromText),
      document.output,
    );
    const next = normalizeTextAnnotation({
      ...candidate,
      x: placedBounds.x,
      y: placedBounds.y,
    });
    this.ui.draftTexts.update((list) => [...list, next]);
    this.ui.selectedTextIds.set([next.id]);
    this.annotations.pushPreview();
    void this.commit();
    this.beginEdit(next.id);
  }

  /** Place a gallery emoji as a text annotation (emoji mode). */
  addEmoji(glyph: string): void {
    const document = this.shell.getSession()?.store.document();
    if (!document || !glyph.trim()) {
      return;
    }
    if (!this.ui.emojiMode()) {
      this.enterEmoji();
    }
    const minSide = Math.min(document.output.width, document.output.height);
    const fontSize = Math.max(24, Math.round(minSide * 0.08));
    // Approximate glyph box before measure so we can center like Add Text.
    const approxSize = fontSize * 1.2;
    const candidate = normalizeTextAnnotation({
      id: createAnnotationId(),
      text: glyph,
      fontSize,
      fill: '#000000',
      fontFamily: EMOJI_FONT_FAMILY,
      x: Math.max(0, document.output.width / 2 - approxSize / 2),
      y: Math.max(0, document.output.height / 2 - approxSize / 2),
    });
    const placedBounds = cascadePlaceBounds(
      boundsFromText(candidate),
      this.ui.draftTexts().map(boundsFromText),
      document.output,
    );
    const next = normalizeTextAnnotation({
      ...candidate,
      x: placedBounds.x,
      y: placedBounds.y,
    });
    this.ui.draftTexts.update((list) => [...list, next]);
    this.ui.selectedTextIds.set([next.id]);
    this.annotations.pushPreview();
    void this.commit();
  }

  /** Enter in-place canvas editing for a text annotation (double-click / new text). */
  beginEdit(id: string): void {
    if (!this.ui.draftTexts().some((item) => item.id === id) && !this.isActive()) {
      this.annotations.syncAllDraftsFromDocument();
    }
    if (!this.ui.draftTexts().some((item) => item.id === id)) {
      return;
    }
    // In-place editor mounts under textMode; switch out of emojiMode when editing.
    if (!this.ui.textMode()) {
      if (this.ui.emojiMode()) {
        this.ui.emojiMode.set(false);
        this.ui.textMode.set(true);
        this.shell.getSession()?.setActiveTool('text');
      } else {
        this.enter();
      }
    }
    this.annotations.applySelection('text', id, false);
    this.ui.editingTextId.set(id);
    this.annotations.pushPreview();
    this.startOverlaySync();
  }

  isEditing(id?: string): boolean {
    const editing = this.ui.editingTextId();
    return id ? editing === id : editing !== null;
  }

  updateEditingContent(value: string): void {
    if (!this.ui.editingTextId()) {
      return;
    }
    this.updateSelected({ text: value });
  }

  endEdit(): void {
    if (!this.ui.editingTextId()) {
      return;
    }
    this.stopOverlaySync();
    this.ui.editingTextId.set(null);
    this.ui.editingTextOverlay.set(null);
    this.removeEmptyDraftTexts();
    if (this.isActive()) {
      this.annotations.pushPreview();
      void this.commit();
    }
  }

  private removeEmptyDraftTexts(): void {
    const next = this.ui.draftTexts().filter((item) => item.text.trim().length > 0);
    if (next.length === this.ui.draftTexts().length) {
      return;
    }
    this.ui.draftTexts.set(next);
    this.ui.selectedTextIds.set(
      this.ui.selectedTextIds().filter((id) => next.some((item) => item.id === id)),
    );
  }

  private startOverlaySync(): void {
    this.stopOverlaySync();
    const tick = () => {
      if (!this.syncOverlay()) {
        this.overlayFrame = null;
        return;
      }
      this.overlayFrame = requestAnimationFrame(tick);
    };
    this.overlayFrame = requestAnimationFrame(tick);
  }

  private stopOverlaySync(): void {
    if (this.overlayFrame != null) {
      cancelAnimationFrame(this.overlayFrame);
      this.overlayFrame = null;
    }
  }

  /** Recompute the overlay screen box each frame; returns false to stop the loop. */
  private syncOverlay(): boolean {
    const id = this.ui.editingTextId();
    if (!id || !this.isActive()) {
      return false;
    }
    const session = this.shell.getSession();
    const annotation = this.ui.draftTexts().find((item) => item.id === id);
    if (!session || !annotation) {
      return false;
    }
    const topLeft = session.mapScenePointToClient({ x: annotation.x, y: annotation.y });
    if (!topLeft) {
      return false;
    }
    const zoom = session.getViewportZoom();
    const bounds = boundsFromText(annotation);
    const hasBackground = !isCssColorTransparent(annotation.backgroundColor);
    const overlay: EditingTextOverlay = {
      id,
      left: topLeft.x,
      top: topLeft.y,
      width: Math.max(bounds.width, annotation.fontSize) * zoom,
      height: bounds.height * zoom,
      angle: annotation.angle,
      originXPx: (bounds.width * zoom) / 2,
      originYPx: (bounds.height * zoom) / 2,
      fontPx: annotation.fontSize * zoom,
      lineHeight: annotation.lineHeight,
      paddingPx: (hasBackground ? annotation.padding : 0) * zoom,
      fontFamily: annotation.fontFamily,
      fontStyle: annotation.fontStyle,
      fontWeight: annotation.fontWeight,
      textDecoration: textDecorationCss(annotation.underline, annotation.linethrough),
      textAlign: annotation.textAlign,
      // Keep caret visible when fill alpha is 0.
      color: isCssColorTransparent(annotation.fill) ? '#111111' : annotation.fill,
    };
    this.ui.editingTextOverlay.set(overlay);
    return true;
  }

  select(id: string, event?: Event): void {
    const additive =
      event instanceof MouseEvent && (event.shiftKey || event.ctrlKey || event.metaKey);
    this.annotations.applySelection('text', id, additive);
    if (this.isActive()) {
      this.annotations.pushPreview();
    }
  }

  delete(id: string): void {
    const next = this.ui.draftTexts().filter((item) => item.id !== id);
    this.ui.draftTexts.set(next);
    this.annotations.removeIdFromSelection('text', id, next[0]?.id ?? null);
    this.annotations.pushPreview();
    void this.commit();
  }

  updateSelected(patch: Partial<TextAnnotation>): void {
    const id = this.ui.selectedTextId();
    if (!id) {
      return;
    }
    this.ui.draftTexts.update((list) =>
      list.map((item) =>
        item.id === id ? normalizeTextAnnotation({ ...item, ...patch, id }) : item,
      ),
    );
    this.annotations.pushPreview();
  }

  commitSelectedProps(): void {
    if (!this.isActive() || !this.ui.selectedTextId()) {
      return;
    }
    this.removeEmptyDraftTexts();
    void this.commit();
  }

  async done(): Promise<void> {
    const session = this.shell.getSession();
    if (!session || !this.isActive()) {
      return;
    }
    this.stopOverlaySync();
    this.ui.editingTextId.set(null);
    this.ui.editingTextOverlay.set(null);
    this.removeEmptyDraftTexts();
    const keepIds = this.ui.selectedTextIds();
    await this.commit();
    this.annotations.clearGesture();
    this.ui.textMode.set(false);
    this.ui.emojiMode.set(false);
    this.annotations.syncAllDraftsFromDocument();
    this.ui.selectedTextIds.set(
      keepIds.filter((id) => this.ui.draftTexts().some((item) => item.id === id)),
    );
    this.annotations.bind(session);
    session.setPreview(null);
    session.setActiveTool(null);
  }

  commit(): Promise<void> {
    this.commitChain = this.commitChain.catch(() => undefined).then(() => this.commitNow());
    return this.commitChain;
  }

  private async commitNow(): Promise<void> {
    const session = this.shell.getSession();
    if (!session || !this.isActive()) {
      return;
    }
    await session.execute(TEXT_SET_COMMAND, { texts: this.ui.draftTexts() });
    const document = session.store.document();
    if (document) {
      const texts = document.annotations.filter(isTextAnnotation).map(normalizeTextAnnotation);
      this.ui.draftTexts.set(texts);
      const selected = this.ui
        .selectedTextIds()
        .filter((id) => texts.some((item) => item.id === id));
      this.ui.selectedTextIds.set(
        selected.length > 0 ? selected : texts[0]?.id ? [texts[0].id] : [],
      );
    }
    if (this.isActive()) {
      this.annotations.pushPreview();
    }
  }
}

function textDecorationCss(underline: boolean, linethrough: boolean): string {
  const parts: string[] = [];
  if (underline) {
    parts.push('underline');
  }
  if (linethrough) {
    parts.push('line-through');
  }
  return parts.length > 0 ? parts.join(' ') : 'none';
}
