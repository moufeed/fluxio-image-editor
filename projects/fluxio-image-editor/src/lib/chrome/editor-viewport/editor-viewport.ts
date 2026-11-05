import { Component, type ElementRef, inject, viewChild } from '@angular/core';

import { CanvasSelectionToolbarComponent } from '../canvas-selection-toolbar/canvas-selection-toolbar';
import { resolveToolbarIconPath } from '../toolbar-icons';
import { AnnotationInteractionController } from '../../editor-shell/annotation-interaction.controller';
import { EditorPresentationStore } from '../../editor-shell/editor-presentation.store';
import { EditorShellContext } from '../../editor-shell/editor-shell.context';
import { ModeLifecycleController } from '../../editor-shell/mode-lifecycle.controller';
import { ToolbarController } from '../../editor-shell/toolbar.controller';
import { RulersTool } from '../../editor-shell/tools/rulers.tool';

/**
 * Canvas viewport host: stage element, loading overlay, inplace text edit,
 * floating selection / path-vertex toolbars, and viewport recenter control.
 */
@Component({
  selector: 'fluxio-editor-viewport',
  imports: [CanvasSelectionToolbarComponent],
  templateUrl: './editor-viewport.html',
  host: {
    class: 'fluxio-editor-viewport-host fluxio-image-editor__viewport-host',
  },
})
export class EditorViewportComponent {
  readonly viewportRef = viewChild.required<ElementRef<HTMLDivElement>>('viewport');
  readonly inplaceEditorRef = viewChild<ElementRef<HTMLTextAreaElement>>('inplaceEditor');

  protected readonly presentation = inject(EditorPresentationStore);
  protected readonly annotations = inject(AnnotationInteractionController);
  protected readonly lifecycle = inject(ModeLifecycleController);
  protected readonly toolbar = inject(ToolbarController);
  private readonly rulersTool = inject(RulersTool);
  private readonly shell = inject(EditorShellContext);

  protected readonly recenterIconPath = resolveToolbarIconPath('fit');

  protected onRulerPointer(axis: 'x' | 'y', event: MouseEvent): void {
    if (!this.presentation.markupSnap().showRulers) {
      return;
    }
    const session = this.shell.getSession();
    const viewport = this.viewportRef().nativeElement;
    const output = session?.store.document()?.output;
    const vp = session?.store.viewport();
    if (!session || !output || !vp) {
      return;
    }
    const rect = viewport.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const sceneX = (localX - vp.panX) / Math.max(vp.zoom, 0.001);
    const sceneY = (localY - vp.panY) / Math.max(vp.zoom, 0.001);
    if (axis === 'x') {
      this.rulersTool.addGuideFromRuler('x', Math.min(Math.max(0, sceneX), output.width));
    } else {
      this.rulersTool.addGuideFromRuler('y', Math.min(Math.max(0, sceneY), output.height));
    }
  }
}
