import { Component, computed, inject, input, signal } from '@angular/core';
import {
  FluxioImageEditor,
  type ImageEditorConfig,
  type ImageEditorExportResult,
  type ImageEditorHandle,
} from 'fluxio-image-editor';

import { DOCS_SAMPLE_IMAGE, type DocsLivePreview } from '../catalog/docs-content';
import { docsAssetUrl, withDocsAssetUrls } from './docs-asset-url';
import { DocsThemeService } from './docs-theme.service';

@Component({
  selector: 'docs-live-editor',
  imports: [FluxioImageEditor],
  template: `
    <div class="docs-live">
      <div class="docs-live__chrome">
        <span class="docs-live__badge">Live preview</span>
        <span class="docs-live__hint">{{ hint() }}</span>
      </div>
      <div class="docs-live__stage">
        @for (_ of [editorKey()]; track _) {
          <fluxio-image-editor
            [source]="source"
            [config]="config()"
            (ready)="onReady($event)"
            (saved)="onSaved($event)"
            (error)="onError($event)"
          />
        }
      </div>
      @if (status()) {
        <p class="docs-live__status" role="status">{{ status() }}</p>
      }
    </div>
  `,
  styles: `
    .docs-live {
      border: 1px solid var(--docs-border);
      border-radius: 0.75rem;
      overflow: hidden;
      background: var(--docs-elevated);
      box-shadow: var(--docs-shadow);
    }
    .docs-live__chrome {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.65rem;
      padding: 0.65rem 0.85rem;
      border-bottom: 1px solid var(--docs-border);
      background: var(--docs-muted-bg);
    }
    .docs-live__badge {
      display: inline-flex;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      background: var(--docs-accent-soft);
      color: var(--docs-accent);
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .docs-live__hint {
      color: var(--docs-muted);
      font-size: 0.8125rem;
    }
    .docs-live__stage {
      height: min(70vh, 36rem);
      min-height: 22rem;
    }
    .docs-live__stage ::ng-deep .fluxio-image-editor {
      height: 100%;
    }
    .docs-live__status {
      margin: 0;
      padding: 0.65rem 0.85rem;
      border-top: 1px solid var(--docs-border);
      color: var(--docs-muted);
      font-size: 0.8125rem;
    }
  `,
})
export class DocsLiveEditorComponent {
  private readonly docsTheme = inject(DocsThemeService);

  readonly live = input.required<DocsLivePreview>();
  readonly hint = input('Fully interactive editor instance for this feature.');

  protected readonly source = docsAssetUrl(DOCS_SAMPLE_IMAGE);
  protected readonly status = signal('');

  /**
   * Identity of the page-scoped live preview. Plugins / defaultTool are applied
   * only at editor bootstrap, so the host must remount when this changes.
   */
  protected readonly editorKey = computed(() => JSON.stringify(this.live()));

  protected readonly config = computed((): ImageEditorConfig => {
    const live = this.live();
    const pageTheme = live.theme;
    const theme = pageTheme === 'custom' ? 'custom' : this.docsTheme.theme();
    return withDocsAssetUrls({
      theme,
      locale: live.locale ?? 'en',
      dir: live.dir ?? 'auto',
      defaultTool: live.defaultTool,
      plugins: live.plugins,
      toolbar: {
        position: 'left',
        toolbarPosition: 'top',
        showSaveButton: true,
        actionDisplay: 'both',
        ...live.toolbar,
      },
      viewport: { wheelZoom: true, ...live.viewport },
      crop: live.crop,
      cropMask: live.cropMask,
      frame: live.frame,
      filters: live.filters,
      rotate: live.rotate,
      imageOverlay: live.imageOverlay,
      stickers: live.stickers,
      watermark: live.watermark,
      emoji: live.emoji,
      templates: live.templates,
      batchExport: live.batchExport,
      colorPicker: live.colorPicker,
      canvasBackground: live.canvasBackground,
      historyLimit: live.historyLimit,
      close: { warnOnUnsaved: false },
    });
  });

  protected onReady(_handle: ImageEditorHandle): void {
    this.status.set('Ready — edit the image, then Export (PNG/JPEG/WebP) to download.');
  }

  protected onSaved(result: ImageEditorExportResult): void {
    this.downloadBlob(result.blob, result.fileName);
    this.status.set(
      `Downloaded ${result.fileName} (${result.format}, ${result.width}×${result.height}).`,
    );
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  protected onError(message: string): void {
    this.status.set(`Error: ${message}`);
  }
}
