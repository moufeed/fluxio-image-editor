import { inject, Injectable } from '@angular/core';

import {
  ANNOTATION_NUDGE_STEP,
  ANNOTATION_NUDGE_STEP_LARGE,
  createInitialAdjustments,
  createInitialEffects,
  createInitialFilters,
  createInitialFocus,
  createInitialCropMask,
  createInitialColorOverlay,
  createInitialFill,
  createInitialFrame,
  createInitialRedactions,
  createRedactionId,
  normalizeAdjustments,
  normalizeEffects,
  normalizeFilters,
  normalizeFocus,
  normalizeCropMask,
  normalizeColorOverlay,
  normalizeFill,
  normalizeFrame,
  normalizeRedactions,
  type AdjustmentsState,
  type EffectsState,
  type FilterPresetId,
  type FocusMode,
  type FocusState,
  type CropMaskShapeId,
  type CropMaskState,
  type ColorOverlayMode,
  type ColorOverlayState,
  type FillMode,
  type FillState,
  type FrameStyleId,
  type FrameState,
  type RedactionRegion,
} from 'fluxio-image-editor/core';
import { ADJUSTMENTS_SET_COMMAND } from 'fluxio-image-editor/plugins/adjustments';
import { EFFECTS_SET_COMMAND } from 'fluxio-image-editor/plugins/effects';
import { FILTERS_SET_COMMAND } from 'fluxio-image-editor/plugins/filters';
import { FOCUS_SET_COMMAND } from 'fluxio-image-editor/plugins/focus';
import { REDACTIONS_SET_COMMAND } from 'fluxio-image-editor/plugins/redact';
import { CROP_MASK_SET_COMMAND } from 'fluxio-image-editor/plugins/crop-mask';
import { COLOR_OVERLAY_SET_COMMAND } from 'fluxio-image-editor/plugins/color-overlay';
import { FILL_SET_COMMAND } from 'fluxio-image-editor/plugins/fill';
import { FRAME_SET_COMMAND } from 'fluxio-image-editor/plugins/frame';

import { EditorModeCoordinator, type EditorModeClosers } from '../editor-mode.coordinator';
import { EditorShellContext } from '../editor-shell.context';
import { EditorUiStore } from '../editor-ui.store';
import { clamp01, clampSigned } from '../helpers/number-clamp';
import { readImageFileAsDataUrl } from '../helpers/read-image-file';

@Injectable()
export class RasterPreviewTool {
  private readonly ui = inject(EditorUiStore);
  private readonly shell = inject(EditorShellContext);
  private readonly modes = inject(EditorModeCoordinator);
  private closers: EditorModeClosers | null = null;
  private filterThumbGeneration = 0;
  private filterThumbAbort: AbortController | null = null;

  configure(closers: EditorModeClosers): void {
    this.closers = closers;
  }

  /** Canvas-handle path: keep draft + live preview in sync (Apply still commits). */
  previewFocusFromCanvas(focus: FocusState): void {
    if (!this.ui.focusMode()) {
      return;
    }
    const draft = normalizeFocus(focus);
    this.ui.draftFocus.set(draft);
    this.shell.getSession()?.setPreview({ focus: draft });
  }

  /** Canvas-handle path: keep draft + live preview in sync (Apply still commits). */
  previewCropMaskFromCanvas(cropMask: CropMaskState): void {
    if (!this.ui.cropMaskMode()) {
      return;
    }
    const draft = normalizeCropMask(cropMask);
    this.ui.draftCropMask.set(draft);
    this.pushCropMaskPreview(draft);
  }

  private pushCropMaskPreview(draft: CropMaskState): void {
    this.shell.getSession()?.setPreview({
      cropMask: draft,
      cropMaskOutsideOpacity: this.ui.cropMaskPreviewOpacity() / 100,
    });
  }

  enterAdjustments(): void {
    if (!this.closers) {
      return;
    }
    this.modes.closeOthers('adjustments', this.closers);
    const session = this.shell.getSession();
    const document = session?.store.document();
    if (!session || !document) {
      return;
    }
    const draft = normalizeAdjustments(document.adjustments);
    this.ui.draftAdjustments.set(draft);
    this.ui.adjustmentsMode.set(true);
    session.setActiveTool('adjustments');
    session.setPreview({ adjustments: draft });
  }

  cancelAdjustments(): void {
    this.cancel('adjustments', this.ui.adjustmentsMode);
  }

  resetAdjustments(): void {
    const draft = createInitialAdjustments();
    this.ui.draftAdjustments.set(draft);
    if (this.ui.adjustmentsMode()) {
      this.shell.getSession()?.setPreview({ adjustments: draft });
    }
  }

  updateAdjustment(key: keyof AdjustmentsState, value: number): void {
    const normalized =
      key === 'blur' || key === 'sharpen' || key === 'vignette' || key === 'clarity'
        ? clamp01(value / 100)
        : clampSigned(value / 100);
    const draft = normalizeAdjustments({ ...this.ui.draftAdjustments(), [key]: normalized });
    this.ui.draftAdjustments.set(draft);
    if (this.ui.adjustmentsMode()) {
      this.shell.getSession()?.setPreview({ adjustments: draft });
    }
  }

  async applyAdjustments(): Promise<void> {
    const session = this.shell.getSession();
    if (!session || !this.ui.adjustmentsMode()) {
      return;
    }
    await session.execute(ADJUSTMENTS_SET_COMMAND, {
      adjustments: normalizeAdjustments(this.ui.draftAdjustments()),
    });
    this.finish(this.ui.adjustmentsMode);
  }

  enterEffects(): void {
    if (!this.closers) {
      return;
    }
    this.modes.closeOthers('effects', this.closers);
    const session = this.shell.getSession();
    const document = session?.store.document();
    if (!session || !document) {
      return;
    }
    const draft = normalizeEffects(document.effects);
    this.ui.draftEffects.set(draft);
    this.ui.effectsMode.set(true);
    session.setActiveTool('effects');
    session.setPreview({ effects: draft });
  }

  cancelEffects(): void {
    this.cancel('effects', this.ui.effectsMode);
  }

  resetEffects(): void {
    const draft = createInitialEffects();
    this.ui.draftEffects.set(draft);
    if (this.ui.effectsMode()) {
      this.shell.getSession()?.setPreview({ effects: draft });
    }
  }

  updateEffect(key: keyof EffectsState, value: number): void {
    const draft = normalizeEffects({ ...this.ui.draftEffects(), [key]: clamp01(value / 100) });
    this.ui.draftEffects.set(draft);
    if (this.ui.effectsMode()) {
      this.shell.getSession()?.setPreview({ effects: draft });
    }
  }

  async applyEffects(): Promise<void> {
    const session = this.shell.getSession();
    if (!session || !this.ui.effectsMode()) {
      return;
    }
    await session.execute(EFFECTS_SET_COMMAND, {
      effects: normalizeEffects(this.ui.draftEffects()),
    });
    this.finish(this.ui.effectsMode);
  }

  enterFilters(): void {
    if (!this.closers) {
      return;
    }
    this.modes.closeOthers('filters', this.closers);
    const session = this.shell.getSession();
    const document = session?.store.document();
    if (!session || !document) {
      return;
    }
    const draft = normalizeFilters(document.filters);
    this.ui.draftFilters.set(draft);
    this.ui.filtersMode.set(true);
    session.setActiveTool('filters');
    session.setPreview({ filters: draft });
    void this.refreshFilterThumbnails();
  }

  cancelFilters(): void {
    this.abortFilterThumbnails();
    this.cancel('filters', this.ui.filtersMode);
  }

  resetFilters(): void {
    const draft = createInitialFilters();
    this.ui.draftFilters.set(draft);
    if (this.ui.filtersMode()) {
      this.shell.getSession()?.setPreview({ filters: draft });
    }
  }

  selectFilter(preset: FilterPresetId): void {
    const draft = normalizeFilters({ preset });
    this.ui.draftFilters.set(draft);
    if (this.ui.filtersMode()) {
      this.shell.getSession()?.setPreview({ filters: draft });
    }
  }

  async applyFilters(): Promise<void> {
    const session = this.shell.getSession();
    if (!session || !this.ui.filtersMode()) {
      return;
    }
    await session.execute(FILTERS_SET_COMMAND, {
      filters: normalizeFilters(this.ui.draftFilters()),
    });
    this.abortFilterThumbnails();
    this.finish(this.ui.filtersMode);
  }

  enterFocus(): void {
    if (!this.closers) {
      return;
    }
    this.modes.closeOthers('focus', this.closers);
    const session = this.shell.getSession();
    const document = session?.store.document();
    if (!session || !document) {
      return;
    }
    const draft = normalizeFocus(document.focus);
    this.ui.draftFocus.set(draft);
    this.ui.focusMode.set(true);
    session.setActiveTool('focus');
    session.setFocusChangeHandler((focus) => this.previewFocusFromCanvas(focus));
    session.setPreview({ focus: draft });
  }

  cancelFocus(): void {
    this.shell.getSession()?.setFocusChangeHandler(null);
    this.cancel('focus', this.ui.focusMode);
  }

  resetFocus(): void {
    const draft = createInitialFocus();
    this.ui.draftFocus.set(draft);
    if (this.ui.focusMode()) {
      this.shell.getSession()?.setPreview({ focus: draft });
    }
  }

  setFocusMode(mode: FocusMode): void {
    const draft = normalizeFocus({ ...this.ui.draftFocus(), mode });
    this.ui.draftFocus.set(draft);
    if (this.ui.focusMode()) {
      this.shell.getSession()?.setPreview({ focus: draft });
    }
  }

  updateFocus(key: keyof FocusState, value: number): void {
    const current = this.ui.draftFocus();
    let next: Partial<FocusState>;
    if (key === 'mode') {
      return;
    }
    if (key === 'angle') {
      next = { ...current, angle: value };
    } else {
      next = { ...current, [key]: clamp01(value / 100) };
    }
    // Touching a slider while idle enables radial so preview is visible.
    if (current.mode === 'none') {
      next = { ...next, mode: 'radial' };
    }
    const draft = normalizeFocus(next);
    this.ui.draftFocus.set(draft);
    if (this.ui.focusMode()) {
      this.shell.getSession()?.setPreview({ focus: draft });
    }
  }

  async applyFocus(): Promise<void> {
    const session = this.shell.getSession();
    if (!session || !this.ui.focusMode()) {
      return;
    }
    await session.execute(FOCUS_SET_COMMAND, {
      focus: normalizeFocus(this.ui.draftFocus()),
    });
    session.setFocusChangeHandler(null);
    this.finish(this.ui.focusMode);
  }

  enterRedact(): void {
    if (!this.closers) {
      return;
    }
    this.modes.closeOthers('redact', this.closers);
    const session = this.shell.getSession();
    const document = session?.store.document();
    if (!session || !document) {
      return;
    }
    const draft = normalizeRedactions(document.redactions);
    this.ui.draftRedactions.set(draft);
    this.ui.selectedRedactionId.set(draft.at(-1)?.id ?? null);
    this.ui.redactMode.set(true);
    session.setActiveTool('redact');
    session.setRedactionAddHandler((region) => this.addRedactionRegion(region));
    session.setRedactionChangeHandler((region) => this.updateRedactionRegion(region));
    session.setPreview({ redactions: draft });
  }

  cancelRedact(): void {
    this.detachRedactionHandlers();
    this.ui.selectedRedactionId.set(null);
    this.cancel('redact', this.ui.redactMode);
  }

  resetRedact(): void {
    const draft = createInitialRedactions();
    this.ui.draftRedactions.set(draft);
    this.ui.selectedRedactionId.set(null);
    if (this.ui.redactMode()) {
      this.shell.getSession()?.setPreview({ redactions: draft });
    }
  }

  addRedactionRegion(region: RedactionRegion): void {
    if (!this.ui.redactMode()) {
      return;
    }
    const draft = normalizeRedactions([...this.ui.draftRedactions(), region]);
    this.ui.draftRedactions.set(draft);
    this.ui.selectedRedactionId.set(region.id);
    this.shell.getSession()?.setPreview({ redactions: draft });
  }

  /** Replace one draft region in place (canvas move / resize gesture). */
  updateRedactionRegion(region: RedactionRegion): void {
    if (!this.ui.redactMode()) {
      return;
    }
    const draft = normalizeRedactions(
      this.ui.draftRedactions().map((current) => (current.id === region.id ? region : current)),
    );
    this.ui.draftRedactions.set(draft);
    this.ui.selectedRedactionId.set(region.id);
    this.shell.getSession()?.setPreview({ redactions: draft });
  }

  removeRedactionRegion(id: string): void {
    if (!this.ui.redactMode()) {
      return;
    }
    const draft = normalizeRedactions(this.ui.draftRedactions().filter((r) => r.id !== id));
    this.ui.draftRedactions.set(draft);
    if (this.ui.selectedRedactionId() === id) {
      this.ui.selectedRedactionId.set(draft.at(-1)?.id ?? null);
    }
    this.shell.getSession()?.setPreview({ redactions: draft });
  }

  /** Create a redaction from document-pixel bounds (used by canvas drag). */
  addRedactionFromDocumentRect(rect: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  }): void {
    const session = this.shell.getSession();
    const output = session?.store.document()?.output;
    if (!output || output.width < 1 || output.height < 1) {
      return;
    }
    const x = rect.x / output.width;
    const y = rect.y / output.height;
    const width = rect.width / output.width;
    const height = rect.height / output.height;
    this.addRedactionRegion({
      id: createRedactionId(),
      x,
      y,
      width,
      height,
    });
  }

  /** PV38: Enter adds a centered default region. */
  addDefaultRedactionRegion(): boolean {
    if (!this.ui.redactMode()) {
      return false;
    }
    const size = 0.2;
    const origin = (1 - size) / 2;
    this.addRedactionRegion({
      id: createRedactionId(),
      x: origin,
      y: origin,
      width: size,
      height: size,
    });
    return true;
  }

  /** PV38: Arrow nudges the selected (or last) redaction region. */
  nudgeRedactionFromKeyboard(event: KeyboardEvent): boolean {
    if (!this.ui.redactMode()) {
      return false;
    }
    if (
      event.key !== 'ArrowUp' &&
      event.key !== 'ArrowDown' &&
      event.key !== 'ArrowLeft' &&
      event.key !== 'ArrowRight'
    ) {
      return false;
    }
    const regions = this.ui.draftRedactions();
    if (regions.length === 0) {
      return false;
    }
    const selectedId = this.ui.selectedRedactionId() ?? regions.at(-1)!.id;
    const region = regions.find((item) => item.id === selectedId) ?? regions.at(-1)!;
    const session = this.shell.getSession();
    const output = session?.store.document()?.output;
    if (!output || output.width < 1 || output.height < 1) {
      return false;
    }

    const stepPx = event.shiftKey ? ANNOTATION_NUDGE_STEP_LARGE : ANNOTATION_NUDGE_STEP;
    const dx =
      (event.key === 'ArrowLeft' ? -stepPx : event.key === 'ArrowRight' ? stepPx : 0) /
      output.width;
    const dy =
      (event.key === 'ArrowUp' ? -stepPx : event.key === 'ArrowDown' ? stepPx : 0) / output.height;
    const next: RedactionRegion = {
      ...region,
      x: Math.min(Math.max(region.x + dx, 0), Math.max(0, 1 - region.width)),
      y: Math.min(Math.max(region.y + dy, 0), Math.max(0, 1 - region.height)),
    };
    this.updateRedactionRegion(next);
    return true;
  }

  /** PV38: Delete/Backspace removes the selected redaction region. */
  deleteSelectedRedaction(): boolean {
    if (!this.ui.redactMode()) {
      return false;
    }
    const id = this.ui.selectedRedactionId() ?? this.ui.draftRedactions().at(-1)?.id;
    if (!id) {
      return false;
    }
    this.removeRedactionRegion(id);
    return true;
  }

  /** PV38: Arrow nudges the focus center (radial / linear). */
  nudgeFocusFromKeyboard(event: KeyboardEvent): boolean {
    if (!this.ui.focusMode()) {
      return false;
    }
    if (
      event.key !== 'ArrowUp' &&
      event.key !== 'ArrowDown' &&
      event.key !== 'ArrowLeft' &&
      event.key !== 'ArrowRight'
    ) {
      return false;
    }
    const draft = this.ui.draftFocus();
    if (draft.mode === 'none') {
      return false;
    }
    const output = this.shell.getSession()?.store.document()?.output;
    if (!output || output.width < 1 || output.height < 1) {
      return false;
    }

    const stepPx = event.shiftKey ? ANNOTATION_NUDGE_STEP_LARGE : ANNOTATION_NUDGE_STEP;
    const dx =
      (event.key === 'ArrowLeft' ? -stepPx : event.key === 'ArrowRight' ? stepPx : 0) /
      output.width;
    const dy =
      (event.key === 'ArrowUp' ? -stepPx : event.key === 'ArrowDown' ? stepPx : 0) / output.height;
    const next = normalizeFocus({
      ...draft,
      centerX: Math.min(1, Math.max(0, draft.centerX + dx)),
      centerY: Math.min(1, Math.max(0, draft.centerY + dy)),
    });
    this.ui.draftFocus.set(next);
    this.shell.getSession()?.setPreview({ focus: next });
    return true;
  }

  async applyRedact(): Promise<void> {
    const session = this.shell.getSession();
    if (!session || !this.ui.redactMode()) {
      return;
    }
    await session.execute(REDACTIONS_SET_COMMAND, {
      redactions: normalizeRedactions(this.ui.draftRedactions()),
    });
    this.detachRedactionHandlers();
    this.ui.selectedRedactionId.set(null);
    this.finish(this.ui.redactMode);
  }

  private detachRedactionHandlers(): void {
    const session = this.shell.getSession();
    session?.setRedactionAddHandler(null);
    session?.setRedactionChangeHandler(null);
  }

  enterCropMask(): void {
    if (!this.closers) {
      return;
    }
    this.modes.closeOthers('crop-mask', this.closers);
    const session = this.shell.getSession();
    const document = session?.store.document();
    if (!session || !document) {
      return;
    }
    const draft = normalizeCropMask(document.cropMask);
    this.ui.draftCropMask.set(draft);
    this.ui.cropMaskMode.set(true);
    session.setActiveTool('crop-mask');
    session.setCropMaskChangeHandler((cropMask) => this.previewCropMaskFromCanvas(cropMask));
    this.pushCropMaskPreview(draft);
  }

  cancelCropMask(): void {
    this.shell.getSession()?.setCropMaskChangeHandler(null);
    this.cancel('crop-mask', this.ui.cropMaskMode);
  }

  resetCropMask(): void {
    const draft = createInitialCropMask();
    this.ui.draftCropMask.set(draft);
    if (this.ui.cropMaskMode()) {
      this.pushCropMaskPreview(draft);
    }
  }

  setCropMaskShape(shape: CropMaskShapeId): void {
    const draft = normalizeCropMask({
      ...this.ui.draftCropMask(),
      shape,
      ...(shape !== 'custom' ? { customPath: '' } : {}),
    });
    this.ui.draftCropMask.set(draft);
    if (this.ui.cropMaskMode()) {
      this.pushCropMaskPreview(draft);
    }
  }

  updateCropMaskFields(patch: Partial<CropMaskState>): void {
    const draft = normalizeCropMask({ ...this.ui.draftCropMask(), ...patch });
    this.ui.draftCropMask.set(draft);
    if (this.ui.cropMaskMode()) {
      this.pushCropMaskPreview(draft);
    }
  }

  updateCropMask(key: Exclude<keyof CropMaskState, 'shape' | 'customPath'>, value: number): void {
    const current = this.ui.draftCropMask();
    let next: Partial<CropMaskState>;
    if (key === 'angle') {
      next = { ...current, angle: value };
    } else if (key === 'inset') {
      next = { ...current, inset: clamp01(value / 100) };
    } else {
      next = { ...current, [key]: clamp01(value / 100) };
    }
    // Touching a slider while idle enables circle so preview is visible.
    if (current.shape === 'none') {
      next = { ...next, shape: 'circle' };
    }
    const draft = normalizeCropMask(next);
    this.ui.draftCropMask.set(draft);
    if (this.ui.cropMaskMode()) {
      this.pushCropMaskPreview(draft);
    }
  }

  updateCropMaskPreviewOpacity(uiValue: number): void {
    const next = Math.max(0, Math.min(100, Math.round(uiValue)));
    this.ui.cropMaskPreviewOpacity.set(next);
    if (this.ui.cropMaskMode()) {
      this.pushCropMaskPreview(normalizeCropMask(this.ui.draftCropMask()));
    }
  }

  async applyCropMask(): Promise<void> {
    const session = this.shell.getSession();
    if (!session || !this.ui.cropMaskMode()) {
      return;
    }
    await session.execute(CROP_MASK_SET_COMMAND, {
      cropMask: normalizeCropMask(this.ui.draftCropMask()),
    });
    session.setCropMaskChangeHandler(null);
    this.finish(this.ui.cropMaskMode);
  }

  enterFrame(): void {
    if (!this.closers) {
      return;
    }
    this.modes.closeOthers('frame', this.closers);
    const session = this.shell.getSession();
    const document = session?.store.document();
    if (!session || !document) {
      return;
    }
    const draft = normalizeFrame(document.frame);
    this.ui.draftFrame.set(draft);
    this.ui.frameMode.set(true);
    session.setActiveTool('frame');
    session.setFrameChangeHandler((frame) => this.previewFrameFromCanvas(frame));
    session.setPreview({ frame: draft });
  }

  previewFrameFromCanvas(frame: FrameState): void {
    const draft = normalizeFrame(frame);
    this.ui.draftFrame.set(draft);
    if (this.ui.frameMode()) {
      this.shell.getSession()?.setPreview({ frame: draft });
    }
  }

  cancelFrame(): void {
    this.shell.getSession()?.setFrameChangeHandler(null);
    this.cancel('frame', this.ui.frameMode);
  }

  resetFrame(): void {
    const draft = createInitialFrame();
    this.ui.draftFrame.set(draft);
    if (this.ui.frameMode()) {
      this.shell.getSession()?.setPreview({ frame: draft });
    }
  }

  setFrameStyle(style: FrameStyleId): void {
    const draft = normalizeFrame({
      ...this.ui.draftFrame(),
      style,
      ...(style !== 'image' ? { imageSrc: '' } : {}),
    });
    this.ui.draftFrame.set(draft);
    if (this.ui.frameMode()) {
      this.shell.getSession()?.setPreview({ frame: draft });
    }
  }

  setFrameGalleryItem(src: string): void {
    const draft = normalizeFrame({
      ...this.ui.draftFrame(),
      style: 'image',
      imageSrc: src,
    });
    this.ui.draftFrame.set(draft);
    if (this.ui.frameMode()) {
      this.shell.getSession()?.setPreview({ frame: draft });
    }
  }

  updateFrame(
    key: Exclude<keyof FrameState, 'style' | 'color' | 'color2' | 'imageSrc'>,
    value: number,
  ): void {
    const current = this.ui.draftFrame();
    let next: Partial<FrameState> = {
      ...current,
      [key]: key === 'thickness' ? clamp01(value / 100) : clamp01(value / 100),
    };
    if (current.style === 'none') {
      next = { ...next, style: 'solid' };
    }
    const draft = normalizeFrame(next);
    this.ui.draftFrame.set(draft);
    if (this.ui.frameMode()) {
      this.shell.getSession()?.setPreview({ frame: draft });
    }
  }

  updateFrameColor(key: 'color' | 'color2', color: string): void {
    const current = this.ui.draftFrame();
    let next: Partial<FrameState> = { ...current, [key]: color };
    if (current.style === 'none') {
      next = { ...next, style: 'solid' };
    }
    const draft = normalizeFrame(next);
    this.ui.draftFrame.set(draft);
    if (this.ui.frameMode()) {
      this.shell.getSession()?.setPreview({ frame: draft });
    }
  }

  async applyFrame(): Promise<void> {
    const session = this.shell.getSession();
    if (!session || !this.ui.frameMode()) {
      return;
    }
    await session.execute(FRAME_SET_COMMAND, {
      frame: normalizeFrame(this.ui.draftFrame()),
    });
    session.setFrameChangeHandler(null);
    this.finish(this.ui.frameMode);
  }

  enterColorOverlay(): void {
    if (!this.closers) {
      return;
    }
    this.modes.closeOthers('color-overlay', this.closers);
    const session = this.shell.getSession();
    const document = session?.store.document();
    if (!session || !document) {
      return;
    }
    const draft = normalizeColorOverlay(document.colorOverlay);
    this.ui.draftColorOverlay.set(draft);
    this.ui.colorOverlayMode.set(true);
    session.setActiveTool('color-overlay');
    session.setPreview({ colorOverlay: draft });
  }

  cancelColorOverlay(): void {
    this.cancel('color-overlay', this.ui.colorOverlayMode);
  }

  resetColorOverlay(): void {
    const draft = createInitialColorOverlay();
    this.ui.draftColorOverlay.set(draft);
    if (this.ui.colorOverlayMode()) {
      this.shell.getSession()?.setPreview({ colorOverlay: draft });
    }
  }

  setColorOverlayMode(mode: ColorOverlayMode): void {
    const draft = normalizeColorOverlay({ ...this.ui.draftColorOverlay(), mode });
    this.ui.draftColorOverlay.set(draft);
    if (this.ui.colorOverlayMode()) {
      this.shell.getSession()?.setPreview({ colorOverlay: draft });
    }
  }

  updateColorOverlay(
    key: Exclude<keyof ColorOverlayState, 'mode' | 'color' | 'color2'>,
    value: number,
  ): void {
    const current = this.ui.draftColorOverlay();
    let next: Partial<ColorOverlayState> = {
      ...current,
      [key]: key === 'angle' ? value : clamp01(value / 100),
    };
    if (current.mode === 'none') {
      next = { ...next, mode: 'solid' };
    }
    const draft = normalizeColorOverlay(next);
    this.ui.draftColorOverlay.set(draft);
    if (this.ui.colorOverlayMode()) {
      this.shell.getSession()?.setPreview({ colorOverlay: draft });
    }
  }

  updateColorOverlayColor(key: 'color' | 'color2', color: string): void {
    const current = this.ui.draftColorOverlay();
    let next: Partial<ColorOverlayState> = { ...current, [key]: color };
    if (current.mode === 'none') {
      next = { ...next, mode: key === 'color2' ? 'linear' : 'solid' };
    }
    const draft = normalizeColorOverlay(next);
    this.ui.draftColorOverlay.set(draft);
    if (this.ui.colorOverlayMode()) {
      this.shell.getSession()?.setPreview({ colorOverlay: draft });
    }
  }

  async applyColorOverlay(): Promise<void> {
    const session = this.shell.getSession();
    if (!session || !this.ui.colorOverlayMode()) {
      return;
    }
    await session.execute(COLOR_OVERLAY_SET_COMMAND, {
      colorOverlay: normalizeColorOverlay(this.ui.draftColorOverlay()),
    });
    this.finish(this.ui.colorOverlayMode);
  }

  enterFill(): void {
    if (!this.closers) {
      return;
    }
    this.modes.closeOthers('fill', this.closers);
    const session = this.shell.getSession();
    const document = session?.store.document();
    if (!session || !document) {
      return;
    }
    const draft = normalizeFill(document.fill);
    this.ui.draftFill.set(draft);
    this.ui.fillMode.set(true);
    session.setActiveTool('fill');
    session.setPreview({ fill: draft });
  }

  cancelFill(): void {
    this.cancel('fill', this.ui.fillMode);
  }

  resetFill(): void {
    const draft = createInitialFill();
    this.ui.draftFill.set(draft);
    if (this.ui.fillMode()) {
      this.shell.getSession()?.setPreview({ fill: draft });
    }
  }

  setFillMode(mode: FillMode): void {
    const draft = normalizeFill({ ...this.ui.draftFill(), mode });
    this.ui.draftFill.set(draft);
    if (this.ui.fillMode()) {
      this.shell.getSession()?.setPreview({ fill: draft });
    }
  }

  updateFillOpacity(uiValue: number): void {
    const current = this.ui.draftFill();
    let next: Partial<FillState> = {
      ...current,
      opacity: clamp01(uiValue / 100),
    };
    if (current.mode === 'none') {
      next = { ...next, mode: 'solid' };
    }
    const draft = normalizeFill(next);
    this.ui.draftFill.set(draft);
    if (this.ui.fillMode()) {
      this.shell.getSession()?.setPreview({ fill: draft });
    }
  }

  updateFillColor(color: string): void {
    const current = this.ui.draftFill();
    let next: Partial<FillState> = { ...current, color };
    if (current.mode === 'none') {
      next = { ...next, mode: 'solid' };
    }
    const draft = normalizeFill(next);
    this.ui.draftFill.set(draft);
    if (this.ui.fillMode()) {
      this.shell.getSession()?.setPreview({ fill: draft });
    }
  }

  setFillImage(src: string): void {
    const draft = normalizeFill({
      ...this.ui.draftFill(),
      mode: 'image',
      imageSrc: src,
    });
    this.ui.draftFill.set(draft);
    if (this.ui.fillMode()) {
      this.shell.getSession()?.setPreview({ fill: draft });
    }
  }

  setFillImageFile(file: File): void {
    void readImageFileAsDataUrl(file)
      .then((src) => this.setFillImage(src))
      .catch((error) => this.shell.reportError(error));
  }

  async applyFill(): Promise<void> {
    const session = this.shell.getSession();
    if (!session || !this.ui.fillMode()) {
      return;
    }
    await session.execute(FILL_SET_COMMAND, {
      fill: normalizeFill(this.ui.draftFill()),
    });
    this.finish(this.ui.fillMode);
  }

  private abortFilterThumbnails(): void {
    this.filterThumbGeneration += 1;
    this.filterThumbAbort?.abort();
    this.filterThumbAbort = null;
  }

  private async refreshFilterThumbnails(): Promise<void> {
    const session = this.shell.getSession();
    if (!session) {
      return;
    }
    this.filterThumbAbort?.abort();
    const abort = new AbortController();
    this.filterThumbAbort = abort;
    const generation = ++this.filterThumbGeneration;
    try {
      const thumbs = await session.generateFilterThumbnails({
        size: 72,
        signal: abort.signal,
      });
      if (generation !== this.filterThumbGeneration || !this.ui.filtersMode()) {
        return;
      }
      this.ui.filterThumbUrls.set(thumbs);
    } catch (error) {
      if (abort.signal.aborted || isAbortError(error)) {
        return;
      }
      // Thumbs are progressive UX only — keep chips usable without images.
      if (generation === this.filterThumbGeneration) {
        this.ui.filterThumbUrls.set({});
      }
    }
  }

  private cancel(
    tool:
      | 'adjustments'
      | 'effects'
      | 'filters'
      | 'focus'
      | 'redact'
      | 'crop-mask'
      | 'color-overlay'
      | 'fill'
      | 'frame',
    mode: { (): boolean; set(value: boolean): void },
  ): void {
    const wasOpen = mode();
    mode.set(false);
    const session = this.shell.getSession();
    if (session && (wasOpen || session.store.activeTool() === tool)) {
      session.setPreview(null);
      session.setActiveTool(null);
    }
  }

  private finish(mode: { set(value: boolean): void }): void {
    mode.set(false);
    const session = this.shell.getSession();
    session?.setPreview(null);
    session?.setActiveTool(null);
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
