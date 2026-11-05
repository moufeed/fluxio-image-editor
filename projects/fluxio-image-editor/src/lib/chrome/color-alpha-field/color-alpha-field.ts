import { Component, computed, inject, input, output, signal } from '@angular/core';

import {
  allHarmonyColors,
  alphaPercent,
  DEFAULT_OPAQUE_WHITE,
  formatCssColor,
  parseCssColor,
  toColorInputValue,
  withAlpha,
  withRgbHex,
  type RgbaColor,
} from 'fluxio-image-editor/core';

import { EditorPresentationStore } from '../../editor-shell/editor-presentation.store';
import { ColorPickerTool } from '../../editor-shell/tools/color-picker.tool';
import { resolveToolbarIconPath } from '../toolbar-icons';

/**
 * Native color picker + optional opacity — Figma Design-panel fill row:
 * checkerboard swatch · editable hex · (eyedropper) · opacity %.
 */
@Component({
  selector: 'fluxio-color-alpha-field',
  host: {
    '(focusin)': 'onFieldFocusIn()',
  },
  template: `
    <div class="fluxio-color-alpha" role="group" [attr.aria-label]="label()">
      <span class="fluxio-color-alpha__label">{{ label() }}</span>
      <div
        class="fluxio-color-alpha__row"
        [class.fluxio-color-alpha__row--eyedropper]="eyedropperAvailable()"
        [class.fluxio-color-alpha__row--opaque]="!showOpacity()"
      >
        <label class="fluxio-color-alpha__swatch" [style.--fluxio-swatch-color]="swatchColor()">
          <input
            type="color"
            class="fluxio-color-alpha__picker"
            [value]="hexValue()"
            [attr.aria-label]="label()"
            (input)="onRgbInput($any($event.target).value)"
            (change)="onRgbCommit($any($event.target).value)"
          />
        </label>
        <input
          type="text"
          class="fluxio-color-alpha__hex"
          spellcheck="false"
          autocomplete="off"
          maxlength="9"
          [value]="hexDisplay()"
          [attr.aria-label]="label() + ' hex'"
          (focus)="onHexFocus()"
          (blur)="onHexBlur($any($event.target).value)"
          (keydown.enter)="onHexEnter($event)"
          (input)="onHexTyping($any($event.target).value)"
        />
        @if (eyedropperAvailable()) {
          <button
            type="button"
            class="fluxio-color-alpha__eyedropper"
            [class.fluxio-color-alpha__eyedropper--active]="eyedropperActive()"
            [attr.aria-pressed]="eyedropperActive()"
            [attr.aria-label]="eyedropperLabel()"
            [attr.title]="eyedropperLabel()"
            (click)="onEyedropperClick()"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path [attr.d]="eyedropperIconPath" fill="currentColor" />
            </svg>
          </button>
        }
        @if (showOpacity()) {
          <label class="fluxio-color-alpha__opacity">
            <span class="fluxio-color-alpha__sr-only">{{ opacityLabel() }}</span>
            <input
              type="number"
              class="fluxio-color-alpha__opacity-input"
              min="0"
              max="100"
              step="1"
              [value]="opacityPercent()"
              [attr.aria-label]="opacityLabel()"
              (input)="onAlphaInput(+$any($event.target).value)"
              (change)="onAlphaCommit(+$any($event.target).value)"
            />
            <span class="fluxio-color-alpha__opacity-suffix" aria-hidden="true">%</span>
          </label>
        }
      </div>
      @if (showOpacity()) {
        <input
          type="range"
          class="fluxio-color-alpha__slider"
          min="0"
          max="100"
          step="1"
          [value]="opacityPercent()"
          [attr.aria-valuetext]="opacityLabel() + ' ' + opacityPercent() + '%'"
          [attr.aria-label]="opacityLabel()"
          (input)="onAlphaInput(+$any($event.target).value)"
          (change)="onAlphaCommit(+$any($event.target).value)"
        />
      }
      @if (showRecent() && recentColors().length > 0) {
        <div
          class="fluxio-color-alpha__recent"
          role="group"
          [attr.aria-label]="presentation.t('color.recent')"
        >
          <span class="fluxio-color-alpha__recent-label">{{ presentation.t('color.recent') }}</span>
          <div class="fluxio-color-alpha__recent-swatches">
            @for (color of recentColors(); track color) {
              <button
                type="button"
                class="fluxio-color-alpha__recent-swatch"
                [class.fluxio-color-alpha__recent-swatch--active]="isRecentActive(color)"
                [style.--fluxio-swatch-color]="color"
                [attr.aria-label]="color"
                [attr.title]="color"
                (mousedown)="onRecentMouseDown($event, color)"
              ></button>
            }
          </div>
        </div>
      }
      @if (showRecent() && harmonySwatches().length > 0) {
        <div
          class="fluxio-color-alpha__recent fluxio-color-alpha__harmony"
          role="group"
          [attr.aria-label]="presentation.t('color.harmony')"
        >
          <span class="fluxio-color-alpha__recent-label">{{
            presentation.t('color.harmony')
          }}</span>
          <div class="fluxio-color-alpha__recent-swatches">
            @for (color of harmonySwatches(); track color) {
              <button
                type="button"
                class="fluxio-color-alpha__recent-swatch"
                [class.fluxio-color-alpha__recent-swatch--active]="isRecentActive(color)"
                [style.--fluxio-swatch-color]="color"
                [attr.aria-label]="color"
                [attr.title]="color"
                (mousedown)="onRecentMouseDown($event, color)"
              ></button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      min-width: 0;
    }

    .fluxio-color-alpha {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      min-width: 0;
    }

    .fluxio-color-alpha__label {
      color: var(--fluxio-muted, inherit);
      font-size: var(--fluxio-panel-label-size, 0.6875rem);
      font-weight: 550;
      letter-spacing: 0.01em;
      line-height: 1.2;
    }

    .fluxio-color-alpha__row {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) 3.25rem;
      align-items: stretch;
      min-width: 0;
      min-height: var(--fluxio-color-row-h, var(--fluxio-control-h, 1.75rem));
      border: 1px solid
        color-mix(in srgb, var(--fluxio-border, rgb(255 255 255 / 14%)) 70%, transparent);
      border-radius: var(--fluxio-radius-sm, 0.375rem);
      background: var(
        --fluxio-panel-input-bg,
        color-mix(in srgb, var(--fluxio-control-bg, transparent) 88%, black 12%)
      );
      overflow: hidden;
      transition:
        background-color 120ms ease,
        border-color 120ms ease,
        box-shadow 120ms ease;
    }

    .fluxio-color-alpha__row--eyedropper {
      grid-template-columns: auto minmax(0, 1fr) auto 3.25rem;
    }

    .fluxio-color-alpha__row--opaque {
      grid-template-columns: auto minmax(0, 1fr);
    }

    .fluxio-color-alpha__row--opaque.fluxio-color-alpha__row--eyedropper {
      grid-template-columns: auto minmax(0, 1fr) auto;
    }

    .fluxio-color-alpha__row:hover {
      background: var(
        --fluxio-panel-input-hover,
        color-mix(in srgb, var(--fluxio-control-bg, transparent) 72%, white 6%)
      );
      border-color: color-mix(
        in srgb,
        var(--fluxio-border, rgb(255 255 255 / 22%)) 85%,
        transparent
      );
    }

    .fluxio-color-alpha__row:focus-within {
      border-color: color-mix(in srgb, var(--fluxio-accent, #3aa0ff) 65%, transparent);
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--fluxio-accent, #3aa0ff) 45%, transparent);
    }

    .fluxio-color-alpha__swatch {
      position: relative;
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      width: 2rem;
      padding-inline: 0.3rem;
      cursor: pointer;
      isolation: isolate;
    }

    .fluxio-color-alpha__swatch::before {
      content: '';
      position: absolute;
      inset: 50% auto auto 50%;
      width: 1.15rem;
      height: 1.15rem;
      translate: -50% -50%;
      border-radius: 0.25rem;
      background-color: #fff;
      background-image:
        linear-gradient(45deg, #c8c8c8 25%, transparent 25%),
        linear-gradient(-45deg, #c8c8c8 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #c8c8c8 75%),
        linear-gradient(-45deg, transparent 75%, #c8c8c8 75%);
      background-size: 0.4rem 0.4rem;
      background-position:
        0 0,
        0 0.2rem,
        0.2rem -0.2rem,
        -0.2rem 0;
      box-shadow: inset 0 0 0 1px
        color-mix(in srgb, var(--fluxio-border, rgb(0 0 0 / 18%)) 80%, transparent);
      pointer-events: none;
      z-index: 0;
    }

    .fluxio-color-alpha__swatch::after {
      content: '';
      position: absolute;
      inset: 50% auto auto 50%;
      width: 1.15rem;
      height: 1.15rem;
      translate: -50% -50%;
      border-radius: 0.25rem;
      background: var(--fluxio-swatch-color, transparent);
      box-shadow: inset 0 0 0 1px
        color-mix(in srgb, var(--fluxio-border, rgb(0 0 0 / 22%)) 70%, transparent);
      pointer-events: none;
      z-index: 1;
    }

    .fluxio-color-alpha__picker {
      position: relative;
      z-index: 2;
      width: 1.15rem;
      height: 1.15rem;
      padding: 0;
      border: 0;
      border-radius: 0.25rem;
      background: transparent;
      opacity: 0;
      cursor: pointer;
    }

    .fluxio-color-alpha__picker::-webkit-color-swatch-wrapper {
      padding: 0;
    }

    .fluxio-color-alpha__picker::-webkit-color-swatch {
      border: 0;
      border-radius: 0.2rem;
    }

    .fluxio-color-alpha__hex {
      display: flex;
      align-items: center;
      width: 100%;
      min-width: 0;
      margin: 0;
      padding-inline: 0.2rem 0.45rem;
      border: 0;
      background: transparent;
      color: var(--fluxio-text, inherit);
      font-size: var(--fluxio-panel-value-size, 0.75rem);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      font-family:
        ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      outline: none;
    }

    .fluxio-color-alpha__hex::selection {
      background: color-mix(in srgb, var(--fluxio-accent, #3aa0ff) 35%, transparent);
    }

    .fluxio-color-alpha__eyedropper {
      display: grid;
      place-items: center;
      width: 1.75rem;
      margin: 0;
      padding: 0;
      border: 0;
      border-inline-start: 1px solid
        color-mix(in srgb, var(--fluxio-border, rgb(255 255 255 / 16%)) 55%, transparent);
      background: transparent;
      color: var(--fluxio-muted, inherit);
      cursor: pointer;
    }

    .fluxio-color-alpha__eyedropper:hover,
    .fluxio-color-alpha__eyedropper--active {
      color: var(--fluxio-accent, #3aa0ff);
      background: color-mix(in srgb, var(--fluxio-accent, #3aa0ff) 12%, transparent);
    }

    .fluxio-color-alpha__eyedropper svg {
      width: 0.95rem;
      height: 0.95rem;
    }

    .fluxio-color-alpha__opacity {
      display: flex;
      align-items: stretch;
      min-width: 0;
      border-inline-start: 1px solid
        color-mix(in srgb, var(--fluxio-border, rgb(255 255 255 / 16%)) 55%, transparent);
    }

    .fluxio-color-alpha__opacity-input {
      width: 100%;
      min-width: 0;
      margin: 0;
      padding: 0 0.1rem 0 0.35rem;
      border: 0;
      background: transparent;
      color: var(--fluxio-text, inherit);
      font: inherit;
      font-size: var(--fluxio-panel-value-size, 0.6875rem);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      text-align: end;
      outline: none;
    }

    .fluxio-color-alpha__opacity-input::-webkit-outer-spin-button,
    .fluxio-color-alpha__opacity-input::-webkit-inner-spin-button {
      appearance: none;
      margin: 0;
    }

    .fluxio-color-alpha__opacity-input[type='number'] {
      appearance: textfield;
    }

    .fluxio-color-alpha__opacity-suffix {
      display: inline-flex;
      align-items: center;
      padding-inline-end: 0.35rem;
      color: var(--fluxio-muted, inherit);
      font-size: 0.625rem;
      font-weight: 550;
      user-select: none;
    }

    .fluxio-color-alpha__slider {
      width: 100%;
      height: 1.1rem;
      margin: 0;
      accent-color: var(--fluxio-accent, #3aa0ff);
      cursor: pointer;
    }

    .fluxio-color-alpha__recent {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
    }

    .fluxio-color-alpha__recent-label {
      color: var(--fluxio-muted, inherit);
      font-size: 0.625rem;
      font-weight: 550;
      letter-spacing: 0.02em;
      line-height: 1.2;
    }

    .fluxio-color-alpha__recent-swatches {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
    }

    .fluxio-color-alpha__recent-swatch {
      position: relative;
      width: 1.15rem;
      height: 1.15rem;
      margin: 0;
      padding: 0;
      border: 0;
      border-radius: 0.25rem;
      background-color: #fff;
      background-image:
        linear-gradient(45deg, #c8c8c8 25%, transparent 25%),
        linear-gradient(-45deg, #c8c8c8 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #c8c8c8 75%),
        linear-gradient(-45deg, transparent 75%, #c8c8c8 75%);
      background-size: 0.4rem 0.4rem;
      background-position:
        0 0,
        0 0.2rem,
        0.2rem -0.2rem,
        -0.2rem 0;
      box-shadow: inset 0 0 0 1px
        color-mix(in srgb, var(--fluxio-border, rgb(0 0 0 / 22%)) 70%, transparent);
      cursor: pointer;
      isolation: isolate;
    }

    .fluxio-color-alpha__recent-swatch::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: var(--fluxio-swatch-color, transparent);
      box-shadow: inset 0 0 0 1px
        color-mix(in srgb, var(--fluxio-border, rgb(0 0 0 / 22%)) 70%, transparent);
      pointer-events: none;
    }

    .fluxio-color-alpha__recent-swatch--active {
      box-shadow:
        inset 0 0 0 1px color-mix(in srgb, var(--fluxio-border, rgb(0 0 0 / 22%)) 70%, transparent),
        0 0 0 1.5px color-mix(in srgb, var(--fluxio-accent, #3aa0ff) 80%, transparent);
    }

    .fluxio-color-alpha__recent-swatch:focus-visible {
      outline: 2px solid color-mix(in srgb, var(--fluxio-accent, #3aa0ff) 70%, transparent);
      outline-offset: 1px;
    }

    .fluxio-color-alpha__sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `,
})
export class ColorAlphaFieldComponent {
  protected readonly presentation = inject(EditorPresentationStore);
  private readonly colorPicker = inject(ColorPickerTool);

  readonly label = input.required<string>();
  readonly opacityLabel = input('Opacity');
  /** When false, hides opacity controls and always emits opaque `#rrggbb`. */
  readonly showOpacity = input(true);
  /**
   * When false, hides the recent-color strip (use on secondary fields in a multi-color panel
   * so history appears once; clicks still apply to the last-focused field).
   */
  readonly showRecent = input(true);
  /** CSS color string (`#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()`, `transparent`). */
  readonly value = input.required<string>();
  /** Fallback when `value` cannot be parsed. */
  readonly fallback = input<RgbaColor>(DEFAULT_OPAQUE_WHITE);

  /** Live preview while dragging. */
  readonly valueChange = output<string>();
  /** Commit on change/blur semantics (one history entry expected from parent). */
  readonly valueCommit = output<string>();

  private readonly hexFocused = signal(false);
  private readonly hexDraft = signal<string | null>(null);

  protected readonly parsed = computed(() => parseCssColor(this.value(), this.fallback()));

  protected readonly hexValue = computed(() => toColorInputValue(this.parsed()));

  /** Checkerboard overlay fill — includes alpha so translucency is visible. */
  protected readonly swatchColor = computed(() =>
    this.showOpacity() ? formatCssColor(this.parsed()) : this.hexValue(),
  );

  protected readonly hexDisplay = computed(() => {
    if (this.hexFocused() && this.hexDraft() != null) {
      return this.hexDraft()!;
    }
    return this.hexValue().toUpperCase();
  });

  protected readonly opacityPercent = computed(() => alphaPercent(this.value(), this.fallback()));

  protected readonly recentColors = this.presentation.recentColors;

  protected readonly harmonySwatches = computed(() => allHarmonyColors(this.parsed()));

  protected readonly eyedropperAvailable = this.presentation.colorPickerAvailable;

  protected readonly eyedropperActive = computed(
    () => this.presentation.colorPickerMode() && this.colorPicker.isActive(),
  );

  protected readonly eyedropperIconPath =
    resolveToolbarIconPath('color-picker') ??
    'M20.71 5.63l-2.34-2.34a1 1 0 0 0-1.41 0l-3.12 3.12-1.23-1.21-1.42 1.42 1.21 1.23-7.96 7.96A3 3 0 0 0 5 18.59V20h1.41a3 3 0 0 0 2.12-.88l7.96-7.96 1.23 1.21 1.42-1.42-1.21-1.23 3.12-3.12a1 1 0 0 0 0-1.41zM8.41 18H7v-1.41l7.54-7.54 1.41 1.41L8.41 18z';

  protected eyedropperLabel(): string {
    return this.eyedropperActive()
      ? this.presentation.t('color-picker.cancel')
      : this.presentation.t('color-picker.sample');
  }

  protected isRecentActive(color: string): boolean {
    const key = this.presentation.recentColorTargetKey() ?? this.hexValue();
    return key.toLowerCase() === color.toLowerCase();
  }

  protected onFieldFocusIn(): void {
    this.presentation.registerRecentColorTarget(
      (css) => this.applyRecentLocal(css),
      this.hexValue(),
    );
  }

  /** Keep focus on the active color field so recent applies to the right input. */
  protected onRecentMouseDown(event: MouseEvent, color: string): void {
    event.preventDefault();
    this.onRecentSelect(color);
  }

  protected onRecentSelect(color: string): void {
    if (!this.presentation.applyRecentColor(color)) {
      this.applyRecentLocal(color);
    }
  }

  private applyRecentLocal(color: string): void {
    const next = this.showOpacity()
      ? withRgbHex(this.value(), color, this.fallback())
      : this.forceOpaque(color);
    this.emitCommitted(next);
    this.presentation.registerRecentColorTarget(
      (css) => this.applyRecentLocal(css),
      this.showOpacity() ? toColorInputValue(parseCssColor(next, this.fallback())) : next,
    );
  }

  protected onEyedropperClick(): void {
    if (this.eyedropperActive()) {
      this.colorPicker.cancel();
      return;
    }
    this.colorPicker.startSample((sampled) => {
      let next = this.colorPicker.applySampleToField(
        this.value(),
        parseCssColor(sampled, this.fallback()),
        this.fallback(),
      );
      if (!this.showOpacity()) {
        next = this.forceOpaque(next);
      }
      this.emitCommitted(next);
    });
  }

  protected onRgbInput(hex: string): void {
    this.valueChange.emit(this.applyRgb(hex));
  }

  protected onRgbCommit(hex: string): void {
    this.emitCommitted(this.applyRgb(hex));
  }

  protected onHexFocus(): void {
    this.hexFocused.set(true);
    this.hexDraft.set(this.hexValue().toUpperCase());
  }

  protected onHexTyping(raw: string): void {
    this.hexDraft.set(raw);
    const parsed = this.tryParseHex(raw);
    if (!parsed) {
      return;
    }
    this.valueChange.emit(this.applyParsedHex(parsed));
  }

  protected onHexBlur(raw: string): void {
    this.commitHex(raw);
    this.hexFocused.set(false);
    this.hexDraft.set(null);
  }

  protected onHexEnter(event: Event): void {
    event.preventDefault();
    const target = event.target as HTMLInputElement;
    this.commitHex(target.value);
    target.blur();
  }

  protected onAlphaInput(percent: number): void {
    if (!this.showOpacity()) {
      return;
    }
    const clamped = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
    this.valueChange.emit(withAlpha(this.value(), clamped / 100, this.fallback()));
  }

  protected onAlphaCommit(percent: number): void {
    if (!this.showOpacity()) {
      return;
    }
    const clamped = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
    this.emitCommitted(withAlpha(this.value(), clamped / 100, this.fallback()));
  }

  private commitHex(raw: string): void {
    const parsed = this.tryParseHex(raw);
    if (!parsed) {
      this.hexDraft.set(this.hexValue().toUpperCase());
      return;
    }
    this.emitCommitted(this.applyParsedHex(parsed));
  }

  private emitCommitted(next: string): void {
    this.valueChange.emit(next);
    this.valueCommit.emit(next);
    this.presentation.rememberColor(next);
  }

  private applyRgb(hex: string): string {
    const next = withRgbHex(this.value(), hex, this.fallback());
    return this.showOpacity() ? next : this.forceOpaque(next);
  }

  /** Apply typed hex; 4/8-digit forms also set alpha when opacity is enabled. */
  private applyParsedHex(parsed: RgbaColor): string {
    if (!this.showOpacity() || parsed.a >= 0.999) {
      return this.applyRgb(toColorInputValue(parsed));
    }
    return formatCssColor(parsed);
  }

  private forceOpaque(cssColor: string): string {
    const color = parseCssColor(cssColor, this.fallback());
    return formatCssColor({ ...color, a: 1 });
  }

  private tryParseHex(raw: string): RgbaColor | null {
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }
    const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    if (!/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(withHash)) {
      return null;
    }
    return parseCssColor(withHash, this.fallback());
  }
}
