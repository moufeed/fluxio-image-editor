import { DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';

import {
  defaultTextBoxWidth,
  isCssColorTransparent,
  type TextAlign,
  type TextAnnotation,
} from 'fluxio-image-editor/core';

import { resolveToolbarIconPath } from '../../chrome/toolbar-icons';
import { ColorAlphaFieldComponent } from '../../chrome/color-alpha-field/color-alpha-field';
import { OrderActionsComponent } from '../../chrome/order-actions/order-actions';
import { ObjectInspectorActionsComponent } from '../../chrome/tool-actions/object-inspector-actions';
import { EditorShellContext } from '../../editor-shell/editor-shell.context';
import { TextTool } from '../../editor-shell/tools/text.tool';
import { AnnotationControlsBase } from '../annotation-controls-base';

@Component({
  selector: 'fluxio-text-controls',
  imports: [
    DecimalPipe,
    ColorAlphaFieldComponent,
    OrderActionsComponent,
    ObjectInspectorActionsComponent,
  ],
  templateUrl: './text-controls.html',
})
export class FluxioTextControls extends AnnotationControlsBase {
  private readonly textTool = inject(TextTool);
  private readonly shell = inject(EditorShellContext);

  protected readonly draftTexts = this.presentation.draftTexts;
  protected readonly selectedTextIds = this.presentation.selectedTextIds;
  protected readonly selectedText = this.presentation.selectedText;
  protected readonly fontFamilies = this.presentation.fontFamilies;
  protected readonly colorFallbackWhite = this.presentation.colorFallbackWhite;
  protected readonly colorFallbackBlack = this.presentation.colorFallbackBlack;
  protected readonly textAligns: readonly TextAlign[] = ['left', 'center', 'right'];

  protected readonly alignIconPaths: Readonly<Record<TextAlign, string>> = {
    left: resolveToolbarIconPath('align-left') ?? '',
    center: resolveToolbarIconPath('align-center') ?? '',
    right: resolveToolbarIconPath('align-right') ?? '',
  };

  protected addDraftText(): void {
    this.textTool.add();
  }
  protected selectDraftText(id: string, event?: Event): void {
    this.textTool.select(id, event);
  }
  protected deleteDraftText(id: string): void {
    this.textTool.delete(id);
  }
  protected updateSelectedText(patch: Partial<TextAnnotation>): void {
    this.textTool.updateSelected(patch);
  }
  protected commitSelectedTextProps(): void {
    this.textTool.commitSelectedProps();
  }
  protected setTextAlign(align: TextAlign): void {
    const text = this.selectedText();
    if (!text) {
      return;
    }
    let boxWidth = text.boxWidth;
    // Legacy / hug-width texts need a layout box or center/right look identical to left.
    if (!(boxWidth > 0)) {
      const output = this.shell.session()?.store.document()?.output;
      const fallback = output
        ? defaultTextBoxWidth(output, text.fontSize)
        : Math.max(120, Math.round(text.fontSize * 8));
      const lines = text.text.length > 0 ? text.text.split('\n') : [''];
      const longest = lines.reduce((max, line) => Math.max(max, line.length), 0);
      const natural = Math.max(1, longest) * text.fontSize * 0.55;
      boxWidth = Math.max(natural, fallback);
    }
    this.updateSelectedText(
      boxWidth !== text.boxWidth ? { textAlign: align, boxWidth } : { textAlign: align },
    );
    this.commitSelectedTextProps();
  }
  protected onTextBackgroundChange(color: string): void {
    const current = this.selectedText();
    const enabling =
      isCssColorTransparent(current?.backgroundColor) && !isCssColorTransparent(color);
    const padding =
      enabling && current && current.padding <= 0
        ? Math.max(4, Math.round(current.fontSize * 0.25))
        : undefined;
    this.updateSelectedText(
      padding != null ? { backgroundColor: color, padding } : { backgroundColor: color },
    );
  }
  protected isBackgroundTransparent(color: string | null | undefined): boolean {
    return isCssColorTransparent(color);
  }
  protected deleteSelectedText(): void {
    const id = this.selectedText()?.id;
    if (id) {
      this.textTool.delete(id);
    }
  }
  protected doneText(): Promise<void> {
    return this.textTool.done();
  }
}
