import { computed, signal } from '@angular/core';

import type { HistorySnapshot } from '../commands/history';
import type { ReadonlyImageDocument } from '../models/image-document';
import type { NormalizedImageAsset } from '../models/source';
import {
  createEmptyViewport,
  type ReadonlyViewportState,
  type ViewportState,
} from '../models/viewport-state';
import type { ReadonlyEditorPreview } from '../ports/rendering-engine.port';

export type EditorStatus = 'idle' | 'loading' | 'ready' | 'busy' | 'error';

export interface EditorStoreSnapshot {
  readonly document: ReadonlyImageDocument | null;
  readonly viewport: ReadonlyViewportState;
  readonly status: EditorStatus;
  readonly errorMessage: string | null;
  readonly history: HistorySnapshot;
  readonly asset: NormalizedImageAsset | null;
  readonly dirty: boolean;
  readonly preview: ReadonlyEditorPreview | null;
  readonly activeTool: string | null;
}

export class EditorStore {
  private readonly documentSignal = signal<ReadonlyImageDocument | null>(null);
  /** Original document after load — used by reset(). */
  private readonly loadedBaselineSignal = signal<ReadonlyImageDocument | null>(null);
  /** Monotonic counter incremented on every setDocument() call. */
  private readonly generationSignal = signal(0);
  /** Generation snapshot captured on load/save — compared for isDirty. */
  private readonly cleanGenerationSignal = signal(0);
  private readonly viewportSignal = signal<ViewportState>(createEmptyViewport());
  private readonly statusSignal = signal<EditorStatus>('idle');
  private readonly errorSignal = signal<string | null>(null);
  private readonly assetSignal = signal<NormalizedImageAsset | null>(null);
  private readonly previewSignal = signal<ReadonlyEditorPreview | null>(null);
  private readonly activeToolSignal = signal<string | null>(null);
  private readonly historySignal = signal<HistorySnapshot>({
    past: [],
    future: [],
    canUndo: false,
    canRedo: false,
  });

  readonly document = this.documentSignal.asReadonly();
  readonly baseline = this.loadedBaselineSignal.asReadonly();
  readonly viewport = this.viewportSignal.asReadonly();
  readonly status = this.statusSignal.asReadonly();
  readonly errorMessage = this.errorSignal.asReadonly();
  readonly asset = this.assetSignal.asReadonly();
  readonly preview = this.previewSignal.asReadonly();
  readonly activeTool = this.activeToolSignal.asReadonly();
  readonly history = this.historySignal.asReadonly();
  readonly canUndo = computed(() => this.historySignal().canUndo);
  readonly canRedo = computed(() => this.historySignal().canRedo);
  readonly isReady = computed(() => this.statusSignal() === 'ready' && this.documentSignal() !== null);
  readonly isDirty = computed(() => {
    if (this.documentSignal() === null) {
      return false;
    }
    return this.generationSignal() !== this.cleanGenerationSignal();
  });

  setStatus(status: EditorStatus, errorMessage: string | null = null): void {
    this.statusSignal.set(status);
    this.errorSignal.set(errorMessage);
  }

  setDocument(
    document: ReadonlyImageDocument | null,
    options?: { readonly generation?: number },
  ): void {
    this.documentSignal.set(document);
    if (options?.generation !== undefined) {
      this.generationSignal.set(options.generation);
    } else {
      this.generationSignal.update((g) => g + 1);
    }
  }

  /** Current document generation — used when recording history entries. */
  documentGeneration(): number {
    return this.generationSignal();
  }

  setBaseline(document: ReadonlyImageDocument | null): void {
    this.loadedBaselineSignal.set(document);
    this.cleanGenerationSignal.set(this.generationSignal());
  }

  setViewport(viewport: ViewportState): void {
    this.viewportSignal.set(viewport);
  }

  patchViewport(patch: Partial<ViewportState>): void {
    this.viewportSignal.update((current) => ({ ...current, ...patch }));
  }

  setAsset(asset: NormalizedImageAsset | null): void {
    this.assetSignal.set(asset);
  }

  setHistory(history: HistorySnapshot): void {
    this.historySignal.set(history);
  }

  setPreview(preview: ReadonlyEditorPreview | null): void {
    this.previewSignal.set(preview);
  }

  setActiveTool(toolId: string | null): void {
    this.activeToolSignal.set(toolId);
  }

  markClean(): void {
    this.cleanGenerationSignal.set(this.generationSignal());
  }

  snapshot(): EditorStoreSnapshot {
    return {
      document: this.documentSignal(),
      viewport: this.viewportSignal(),
      status: this.statusSignal(),
      errorMessage: this.errorSignal(),
      history: this.historySignal(),
      asset: this.assetSignal(),
      dirty: this.isDirty(),
      preview: this.previewSignal(),
      activeTool: this.activeToolSignal(),
    };
  }

  reset(): void {
    this.documentSignal.set(null);
    this.loadedBaselineSignal.set(null);
    this.generationSignal.set(0);
    this.cleanGenerationSignal.set(0);
    this.viewportSignal.set(createEmptyViewport());
    this.statusSignal.set('idle');
    this.errorSignal.set(null);
    this.assetSignal.set(null);
    this.previewSignal.set(null);
    this.activeToolSignal.set(null);
    this.historySignal.set({
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
    });
  }
}
