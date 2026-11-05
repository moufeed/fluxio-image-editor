import { inject, Injectable } from '@angular/core';

import {
  createMarkupGuideId,
  markupGridVisible,
  markupSnapConfigEqual,
  normalizeMarkupGuides,
  resolveMarkupSnapConfig,
  type MarkupGuide,
  type MarkupSnapChrome,
  type MarkupSnapConfig,
} from 'fluxio-image-editor/core';

import { EditorModeCoordinator, type EditorModeClosers } from '../editor-mode.coordinator';
import { EditorShellContext } from '../editor-shell.context';
import { EditorUiStore } from '../editor-ui.store';

/**
 * PV49 / NF02: markup grid, snap, guides, and edge rulers.
 * Chrome stays active after leaving the tool so annotation snap keeps working.
 */
@Injectable()
export class RulersTool {
  private readonly ui = inject(EditorUiStore);
  private readonly shell = inject(EditorShellContext);
  private readonly modes = inject(EditorModeCoordinator);
  private closers: EditorModeClosers | null = null;
  private enabled = false;

  configure(closers: EditorModeClosers): void {
    this.closers = closers;
  }

  /** Call when the rulers plugin is present (or removed). */
  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) {
      return;
    }
    this.enabled = enabled;
    if (!enabled) {
      this.cancel();
      this.applySnapConfig(resolveMarkupSnapConfig(null));
      return;
    }
    this.hydrateFromConfig();
  }

  hydrateFromConfig(): void {
    if (!this.enabled) {
      return;
    }
    const host = this.shell.config().rulers;
    const current = this.ui.markupSnap();
    this.applySnapConfig(
      resolveMarkupSnapConfig({
        ...host,
        // Keep runtime guides when re-hydrating unless host supplies guides.
        guides: host?.guides ?? current.guides,
        showGrid: host?.showGrid ?? current.showGrid,
        showRulers: host?.showRulers ?? current.showRulers,
        snapToContext: host?.snapToContext ?? current.snapToContext,
        gridSize: host?.gridSize ?? current.gridSize,
        snapThreshold: host?.snapThreshold ?? current.snapThreshold,
      }),
    );
  }

  private applySnapConfig(next: MarkupSnapConfig): void {
    if (markupSnapConfigEqual(this.ui.markupSnap(), next)) {
      this.pushToSession();
      return;
    }
    this.ui.markupSnap.set(next);
    this.pushToSession();
  }

  enter(): void {
    if (!this.enabled || !this.closers) {
      return;
    }
    this.modes.closeOthers('rulers', this.closers);
    this.ui.rulersMode.set(true);
    this.shell.getSession()?.setActiveTool('rulers');
    this.pushToSession();
  }

  cancel(): void {
    const wasOpen = this.ui.rulersMode();
    this.ui.rulersMode.set(false);
    const session = this.shell.getSession();
    if (!session) {
      return;
    }
    if (wasOpen || session.store.activeTool() === 'rulers') {
      session.setActiveTool(null);
    }
    // Keep chrome / snap settings — only close the controls panel.
    this.pushToSession();
  }

  patch(partial: Partial<MarkupSnapConfig>): void {
    if (!this.enabled) {
      return;
    }
    this.applySnapConfig(resolveMarkupSnapConfig({ ...this.ui.markupSnap(), ...partial }));
  }

  setGridSize(gridSize: number): void {
    this.patch({ gridSize });
  }

  setSnapThreshold(snapThreshold: number): void {
    const current = this.ui.markupSnap();
    // Turning snap distance on with edge-snap already desired keeps context snap active.
    this.patch({
      snapThreshold,
      ...(snapThreshold > 0 && !current.snapToContext && current.gridSize <= 0
        ? { snapToContext: true }
        : {}),
    });
  }

  toggleShowGrid(): void {
    this.patch({ showGrid: !this.ui.markupSnap().showGrid });
  }

  toggleShowRulers(): void {
    this.patch({ showRulers: !this.ui.markupSnap().showRulers });
  }

  toggleSnapToContext(): void {
    const current = this.ui.markupSnap();
    const active = current.snapToContext && current.snapThreshold > 0;
    if (active) {
      this.patch({ snapToContext: false });
      return;
    }
    // Edge snap needs a distance; default 8px when enabling from Off.
    this.patch({
      snapToContext: true,
      ...(current.snapThreshold <= 0 ? { snapThreshold: 8 } : {}),
    });
  }

  addGuide(axis: 'x' | 'y', position?: number): void {
    const session = this.shell.getSession();
    const output = session?.store.document()?.output;
    if (!output) {
      return;
    }
    const fallback = axis === 'x' ? output.width / 2 : output.height / 2;
    const guide: MarkupGuide = {
      id: createMarkupGuideId(),
      axis,
      position: position ?? fallback,
    };
    this.patch({ guides: [...this.ui.markupSnap().guides, guide] });
  }

  removeGuide(id: string): void {
    this.patch({
      guides: this.ui.markupSnap().guides.filter((guide) => guide.id !== id),
    });
  }

  clearGuides(): void {
    this.patch({ guides: [] });
  }

  /** Reset snap / grid / guides to defaults (keeps plugin enabled). */
  reset(): void {
    if (!this.enabled) {
      return;
    }
    this.applySnapConfig(resolveMarkupSnapConfig(null));
  }

  /** Place a guide from an edge-ruler click (document px). */
  addGuideFromRuler(axis: 'x' | 'y', position: number): void {
    this.addGuide(axis, position);
  }

  pushToSession(): void {
    const session = this.shell.getSession();
    if (!session) {
      return;
    }
    if (!this.enabled) {
      session.setMarkupSnapChrome(null);
      session.setMarkupSnapConfig(null);
      return;
    }
    const config = resolveMarkupSnapConfig(this.ui.markupSnap());
    session.setMarkupSnapConfig(config);
    const output = session.store.document()?.output;
    if (!output) {
      session.setMarkupSnapChrome(null);
      return;
    }
    const chrome: MarkupSnapChrome | null =
      markupGridVisible(config) || config.guides.length > 0
        ? {
            gridSize: config.gridSize,
            showGrid: config.showGrid,
            guides: normalizeMarkupGuides(config.guides),
            output: { width: output.width, height: output.height },
          }
        : null;
    session.setMarkupSnapChrome(chrome);
  }
}
