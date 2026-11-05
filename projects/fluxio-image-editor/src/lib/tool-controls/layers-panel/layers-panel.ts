import { Component, computed, inject, signal } from '@angular/core';

import {
  ANNOTATION_BLEND_MODES,
  adjustmentsEqual,
  annotationDisplayName,
  createInitialAdjustments,
  createInitialFilters,
  filtersEqual,
  isAnnotationLocked,
  isAnnotationVisible,
  normalizeAnnotationBlendMode,
  resolveDesignImage,
  type Annotation,
  type AnnotationBlendMode,
  type AnnotationOrderAction,
} from 'fluxio-image-editor/core';
import { ADJUSTMENTS_SET_COMMAND } from 'fluxio-image-editor/plugins/adjustments';
import { FILTERS_SET_COMMAND } from 'fluxio-image-editor/plugins/filters';

import { AnnotationInteractionController } from '../../editor-shell/annotation-interaction.controller';
import { EditorPresentationStore } from '../../editor-shell/editor-presentation.store';
import { EditorShellContext } from '../../editor-shell/editor-shell.context';
import { EditorUiStore } from '../../editor-shell/editor-ui.store';
import { RasterPreviewTool } from '../../editor-shell/tools/raster-preview.tool';
import { TransformTool } from '../../editor-shell/tools/transform.tool';
import { OrderActionsComponent } from '../../chrome/order-actions/order-actions';

type LayerRowKind = 'annotation' | 'group' | 'base' | 'adjustments' | 'filters';

interface LayerRow {
  readonly id: string;
  readonly rowKind: LayerRowKind;
  readonly annotationKind?: Annotation['kind'];
  readonly label: string;
  readonly preview: 'text' | 'swatch' | 'thumb' | 'icon' | 'folder';
  readonly color: string | null;
  readonly thumbSrc: string | null;
  readonly selected: boolean;
  readonly visible: boolean;
  readonly locked: boolean;
  readonly depth: number;
  readonly groupId?: string;
  readonly collapsed?: boolean;
  readonly memberCount?: number;
}

@Component({
  selector: 'fluxio-layers-panel',
  imports: [OrderActionsComponent],
  templateUrl: './layers-panel.html',
  host: {
    class: 'fluxio-layers-panel-content',
  },
})
export class FluxioLayersPanel {
  private readonly shell = inject(EditorShellContext);
  private readonly presentation = inject(EditorPresentationStore);
  private readonly ui = inject(EditorUiStore);
  private readonly annotations = inject(AnnotationInteractionController);
  private readonly transform = inject(TransformTool);
  private readonly raster = inject(RasterPreviewTool);

  protected readonly blendModes = ANNOTATION_BLEND_MODES;
  protected readonly renamingId = signal<string | null>(null);
  protected readonly renameDraft = signal('');

  /** Document/draft stack plus synthetic fixed rows (top = front for annotations). */
  protected readonly layers = computed((): readonly LayerRow[] => {
    this.shell.session()?.store.document();
    this.ui.draftTexts();
    this.ui.draftShapes();
    this.ui.draftImages();
    this.ui.draftPaths();
    this.ui.collapsedLayerGroupIds();
    this.ui.layersSyntheticSelection();

    const selected = this.selectedIdSet();
    const synthetic = this.ui.layersSyntheticSelection();
    const collapsed = new Set(this.ui.collapsedLayerGroupIds());
    const stack = this.annotations.layerStack();
    const rows: LayerRow[] = [];
    const seenGroups = new Set<string>();

    for (let i = stack.length - 1; i >= 0; i--) {
      const item = stack[i]!;
      const groupId = item.groupId?.trim();
      if (groupId && !seenGroups.has(groupId)) {
        seenGroups.add(groupId);
        const members = stack.filter((annotation) => annotation.groupId === groupId);
        const isCollapsed = collapsed.has(groupId);
        rows.push({
          id: `group:${groupId}`,
          rowKind: 'group',
          label: members[0]?.groupName?.trim() || this.t('layers.groupDefault'),
          preview: 'folder',
          color: null,
          thumbSrc: null,
          selected: members.some((member) => selected.has(member.id)),
          visible: members.some((member) => isAnnotationVisible(member)),
          locked: members.every((member) => isAnnotationLocked(member)),
          depth: 0,
          groupId,
          collapsed: isCollapsed,
          memberCount: members.length,
        });
        if (isCollapsed) {
          // Skip member rows while collapsed (still counted above).
          continue;
        }
      }
      if (groupId && collapsed.has(groupId)) {
        continue;
      }
      rows.push(this.toAnnotationRow(item, selected.has(item.id), groupId ? 1 : 0));
    }

    const document = this.shell.session()?.store.document();
    if (document) {
      const designImage = resolveDesignImage(document);
      rows.push({
        id: 'synthetic:base',
        rowKind: 'base',
        label: this.t('layers.baseImage'),
        preview: 'icon',
        color: null,
        thumbSrc: null,
        selected: synthetic === 'base',
        visible: designImage.visible !== false,
        locked: designImage.locked,
        depth: 0,
      });
      rows.push({
        id: 'synthetic:adjustments',
        rowKind: 'adjustments',
        label: this.t('layers.adjustments'),
        preview: 'icon',
        color: null,
        thumbSrc: null,
        selected: synthetic === 'adjustments',
        visible: !adjustmentsEqual(document.adjustments, createInitialAdjustments()),
        locked: false,
        depth: 0,
      });
      rows.push({
        id: 'synthetic:filters',
        rowKind: 'filters',
        label: this.t('layers.filters'),
        preview: 'icon',
        color: null,
        thumbSrc: null,
        selected: synthetic === 'filters',
        visible: !filtersEqual(document.filters, createInitialFilters()),
        locked: false,
        depth: 0,
      });
    }

    return rows;
  });

  protected readonly annotationCount = computed(() => this.annotations.layerStack().length);

  protected readonly hasSelection = computed(() => this.annotations.primaryId() != null);

  protected readonly selectedOpacityPercent = computed(() => {
    this.shell.session()?.store.document();
    this.ui.draftTexts();
    this.ui.draftShapes();
    this.ui.draftImages();
    this.ui.draftPaths();
    return this.annotations.selectedOpacityPercent();
  });

  protected readonly selectedBlendMode = computed(() => {
    this.shell.session()?.store.document();
    this.ui.draftTexts();
    this.ui.draftShapes();
    this.ui.draftImages();
    this.ui.draftPaths();
    return this.annotations.selectedBlendMode();
  });

  protected readonly selectedLocked = computed(() => this.annotations.isSelectedLocked());

  protected readonly canGroup = computed(() => this.annotations.canGroupSelected());
  protected readonly canUngroup = computed(() => this.annotations.canUngroupSelected());

  protected t(key: string): string {
    return this.presentation.t(key);
  }

  protected canReorder(action: AnnotationOrderAction): boolean {
    return this.annotations.canReorder(action);
  }

  protected onRowClick(row: LayerRow, event: MouseEvent): void {
    if (row.rowKind === 'group' && row.groupId) {
      // Select all members (additive when modifier held).
      const members = this.annotations.layerStack().filter((item) => item.groupId === row.groupId);
      members.forEach((member, index) => {
        this.annotations.selectById(member.id, {
          additive: index > 0 || event.ctrlKey || event.metaKey,
        });
      });
      return;
    }
    if (row.rowKind === 'base' || row.rowKind === 'adjustments' || row.rowKind === 'filters') {
      this.annotations.selectSynthetic(row.rowKind);
      return;
    }
    const additive = event.ctrlKey || event.metaKey;
    this.annotations.selectById(row.id, { additive });
  }

  protected onReorder(action: AnnotationOrderAction): void {
    this.annotations.reorder(action);
  }

  protected onOpacityInput(value: number): void {
    this.annotations.updateSelectedOpacity(value);
  }

  protected onOpacityCommit(): void {
    this.annotations.commitSelectedOpacity();
  }

  protected onBlendChange(value: string): void {
    this.annotations.updateSelectedBlendMode(normalizeAnnotationBlendMode(value));
  }

  protected duplicateSelected(): void {
    this.annotations.duplicate();
  }

  protected deleteSelected(): void {
    this.annotations.deleteSelected();
  }

  protected groupSelected(): void {
    this.annotations.groupSelected();
  }

  protected ungroupSelected(): void {
    this.annotations.ungroupSelected();
  }

  protected toggleVisibility(row: LayerRow, event: Event): void {
    event.stopPropagation();
    if (row.rowKind === 'annotation') {
      this.annotations.setVisibility(row.id, !row.visible);
      return;
    }
    if (row.rowKind === 'group' && row.groupId) {
      const members = this.annotations
        .layerStack()
        .filter((item) => item.groupId === row.groupId)
        .map((item) => item.id);
      this.annotations.setVisibilityMany(members, !row.visible);
      return;
    }
    if (row.rowKind === 'base') {
      void this.transform.setImageVisible(!row.visible);
      return;
    }
    if (row.rowKind === 'adjustments') {
      if (row.visible) {
        void this.resetAdjustments();
      } else {
        this.raster.enterAdjustments();
      }
      return;
    }
    if (row.rowKind === 'filters') {
      if (row.visible) {
        void this.resetFilters();
      } else {
        this.raster.enterFilters();
      }
    }
  }

  protected toggleLock(row: LayerRow, event: Event): void {
    event.stopPropagation();
    if (row.rowKind === 'annotation') {
      this.annotations.setLocked(row.id, !row.locked);
      return;
    }
    if (row.rowKind === 'group' && row.groupId) {
      const members = this.annotations
        .layerStack()
        .filter((item) => item.groupId === row.groupId)
        .map((item) => item.id);
      this.annotations.setLockedMany(members, !row.locked);
      return;
    }
    if (row.rowKind === 'base') {
      void this.transform.setImageLocked(!row.locked);
    }
  }

  protected openSynthetic(row: LayerRow, event: Event): void {
    event.stopPropagation();
    if (row.rowKind === 'adjustments') {
      this.raster.enterAdjustments();
    } else if (row.rowKind === 'filters') {
      this.raster.enterFilters();
    } else if (row.rowKind === 'base') {
      this.annotations.selectSynthetic('base');
    }
  }

  protected async resetSynthetic(row: LayerRow, event: Event): Promise<void> {
    event.stopPropagation();
    const session = this.shell.getSession();
    if (!session) {
      return;
    }
    if (row.rowKind === 'adjustments') {
      await this.resetAdjustments();
      return;
    }
    if (row.rowKind === 'filters') {
      await this.resetFilters();
    }
  }

  protected startRename(row: LayerRow, event: Event): void {
    event.stopPropagation();
    if (row.rowKind !== 'annotation' && row.rowKind !== 'group') {
      return;
    }
    if (row.locked && row.rowKind === 'annotation') {
      return;
    }
    this.renamingId.set(row.id);
    this.renameDraft.set(row.label);
  }

  protected onRenameInput(value: string): void {
    this.renameDraft.set(value);
  }

  protected commitRename(): void {
    const id = this.renamingId();
    if (!id) {
      return;
    }
    const name = this.renameDraft().trim();
    if (id.startsWith('group:')) {
      this.annotations.renameGroup(id.slice('group:'.length), name);
    } else {
      this.annotations.selectById(id);
      this.annotations.renameSelected(name);
    }
    this.renamingId.set(null);
  }

  protected cancelRename(): void {
    this.renamingId.set(null);
  }

  protected toggleGroupCollapsed(groupId: string): void {
    const current = this.ui.collapsedLayerGroupIds();
    this.ui.collapsedLayerGroupIds.set(
      current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId],
    );
  }

  protected blendLabel(mode: AnnotationBlendMode): string {
    return this.t(`layers.blend.${mode}`);
  }

  private async resetAdjustments(): Promise<void> {
    const session = this.shell.getSession();
    if (!session) {
      return;
    }
    if (this.ui.adjustmentsMode()) {
      this.raster.resetAdjustments();
      await this.raster.applyAdjustments();
      return;
    }
    await session.execute(ADJUSTMENTS_SET_COMMAND, {
      adjustments: createInitialAdjustments(),
    });
  }

  private async resetFilters(): Promise<void> {
    const session = this.shell.getSession();
    if (!session) {
      return;
    }
    if (this.ui.filtersMode()) {
      this.raster.resetFilters();
      await this.raster.applyFilters();
      return;
    }
    await session.execute(FILTERS_SET_COMMAND, {
      filters: createInitialFilters(),
    });
  }

  private selectedIdSet(): ReadonlySet<string> {
    const ids = new Set<string>([
      ...this.ui.selectedTextIds(),
      ...this.ui.selectedShapeIds(),
      ...this.ui.selectedImageIds(),
    ]);
    const pathId = this.ui.selectedPathId();
    if (pathId) {
      ids.add(pathId);
    }
    return ids;
  }

  private toAnnotationRow(item: Annotation, selected: boolean, depth: number): LayerRow {
    const label = annotationDisplayName(item, this.t(`layers.kind.${item.kind}`));
    const base = {
      id: item.id,
      rowKind: 'annotation' as const,
      annotationKind: item.kind,
      label,
      selected,
      visible: isAnnotationVisible(item),
      locked: isAnnotationLocked(item),
      depth,
      groupId: item.groupId,
    };
    switch (item.kind) {
      case 'text':
        return {
          ...base,
          preview: 'text',
          color: item.fill,
          thumbSrc: null,
        };
      case 'rect':
      case 'ellipse':
      case 'polygon':
        return {
          ...base,
          preview: 'swatch',
          color: item.fill || item.stroke,
          thumbSrc: null,
        };
      case 'line':
      case 'arrow':
      case 'path':
        return {
          ...base,
          preview: 'swatch',
          color: item.stroke,
          thumbSrc: null,
        };
      case 'image':
        return {
          ...base,
          preview: 'thumb',
          color: null,
          thumbSrc: item.src || null,
        };
    }
  }
}
