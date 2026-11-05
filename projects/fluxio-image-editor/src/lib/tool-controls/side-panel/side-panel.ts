import { Component, computed, effect, inject } from '@angular/core';

import { AnnotationInteractionController } from '../../editor-shell/annotation-interaction.controller';
import type { SidePanelTab } from '../../editor-shell/editor-ui.store';
import { EditorPresentationStore } from '../../editor-shell/editor-presentation.store';
import { EditorShellContext } from '../../editor-shell/editor-shell.context';
import { EditorUiStore } from '../../editor-shell/editor-ui.store';
import { FluxioHistoryPanel } from '../history-panel/history-panel';
import { FluxioLayersPanel } from '../layers-panel/layers-panel';

interface SidePanelTabView {
  readonly id: SidePanelTab;
  readonly labelKey: string;
  readonly closeKey: string;
  readonly ariaKey: string;
}

const KNOWN_TABS: readonly SidePanelTabView[] = [
  {
    id: 'layers',
    labelKey: 'layers.panel',
    closeKey: 'layers.close',
    ariaKey: 'layers.aria',
  },
  {
    id: 'history',
    labelKey: 'history.panel',
    closeKey: 'history.close',
    ariaKey: 'history.aria',
  },
];

@Component({
  selector: 'fluxio-side-panel',
  // Imported for @defer chunking — not eagerly rendered until the matching tab is active.
  imports: [FluxioLayersPanel, FluxioHistoryPanel],
  templateUrl: './side-panel.html',
  host: {
    class: 'fluxio-side-panel-host',
    role: 'region',
    '[attr.aria-label]': 'ariaLabel()',
  },
})
export class FluxioSidePanel {
  private readonly presentation = inject(EditorPresentationStore);
  private readonly ui = inject(EditorUiStore);
  private readonly shell = inject(EditorShellContext);
  private readonly annotations = inject(AnnotationInteractionController);

  protected readonly tab = this.ui.sidePanelTab;

  /** Registered chrome panels the shell knows how to render. */
  protected readonly tabs = computed((): readonly SidePanelTabView[] => {
    const session = this.shell.session();
    session?.store.document();
    const registered = new Set((session?.getPanels() ?? []).map((panel) => panel.id));
    const actions = new Set((session?.getToolbarActions() ?? []).map((action) => action.id));
    return KNOWN_TABS.filter((tab) => registered.has(tab.id) || actions.has(`${tab.id}.panel`));
  });

  protected readonly ariaLabel = computed(() => {
    const active = this.tabs().find((tab) => tab.id === this.tab()) ?? this.tabs()[0];
    return active ? this.t(active.ariaKey) : this.t('layers.aria');
  });

  protected readonly closeLabel = computed(() => {
    const active = this.tabs().find((tab) => tab.id === this.tab()) ?? this.tabs()[0];
    return active ? this.t(active.closeKey) : this.t('layers.close');
  });

  constructor() {
    effect(() => {
      const available = this.tabs();
      if (available.length === 0) {
        if (this.ui.sidePanelOpen()) {
          this.ui.sidePanelOpen.set(false);
        }
        return;
      }
      if (!available.some((tab) => tab.id === this.ui.sidePanelTab())) {
        this.ui.sidePanelTab.set(available[0]!.id);
      }
    });
  }

  protected t(key: string): string {
    return this.presentation.t(key);
  }

  protected selectTab(tab: SidePanelTab): void {
    this.ui.sidePanelTab.set(tab);
    if (tab === 'layers') {
      this.annotations.syncAllDraftsFromDocument();
    }
  }

  protected close(): void {
    this.ui.sidePanelOpen.set(false);
  }
}
