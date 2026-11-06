import {
  afterNextRender,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';

import {
  type EditorSession,
  isImageEditorError,
  type ImageEditorConfig,
  type ImageEditorExportResult,
  type ImageEditorHandle,
  type ImageEditorPlugin,
  type ImageEditorSource,
} from 'fluxio-image-editor/core';
import { ControlsPanelComponent } from './chrome/controls-panel/controls-panel';
import { EditorDialogsComponent } from './chrome/editor-dialogs/editor-dialogs';
import { EditorToolbarComponent } from './chrome/editor-toolbar/editor-toolbar';
import { EditorViewportComponent } from './chrome/editor-viewport/editor-viewport';
import { ToolControlsHostComponent } from './chrome/tool-controls-host/tool-controls-host';
import { UtilibarComponent } from './chrome/utilibar/utilibar';
import { FluxioSidePanel } from './tool-controls/side-panel/side-panel';
import { AnnotationInteractionController } from './editor-shell/annotation-interaction.controller';
import { BootstrapController } from './editor-shell/bootstrap.controller';
import { CloseController } from './editor-shell/close.controller';
import { EditorShellContext } from './editor-shell/editor-shell.context';
import { EditorPresentationStore } from './editor-shell/editor-presentation.store';
import { EditorUiStore } from './editor-shell/editor-ui.store';
import { KeyboardController } from './editor-shell/keyboard.controller';
import { ModeLifecycleController } from './editor-shell/mode-lifecycle.controller';
import { provideEditorShell } from './editor-shell/provide-editor-shell';
import { ToolbarController } from './editor-shell/toolbar.controller';
import { TransformTool } from './editor-shell/tools/transform.tool';
import { DrawingTool } from './editor-shell/tools/drawing.tool';
import { WatermarkTool } from './editor-shell/tools/watermark.tool';
import { RulersTool } from './editor-shell/tools/rulers.tool';

export type {
  ConfirmCloseEvent,
  EditorClosedEvent,
  EditorProgressEvent,
  EditorToolbarActionEvent,
} from './editor-shell/editor-events';
import type {
  ConfirmCloseEvent,
  EditorClosedEvent,
  EditorProgressEvent,
  EditorToolbarActionEvent,
} from './editor-shell/editor-events';

@Component({
  selector: 'fluxio-image-editor',
  providers: [...provideEditorShell()],
  imports: [
    ControlsPanelComponent,
    EditorDialogsComponent,
    EditorToolbarComponent,
    EditorViewportComponent,
    ToolControlsHostComponent,
    UtilibarComponent,
    FluxioSidePanel,
  ],
  templateUrl: './image-editor.html',
  styleUrl: './image-editor.scss',
  // Shell chrome styles are namespaced under `.fluxio-image-editor` (global).
  // Inspector / tool-panel chrome lives on ControlsPanelComponent.
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'presentation.themeHostClass()',
    '[attr.data-theme]': 'presentation.themeMode()',
    '[attr.dir]': 'presentation.textDirection()',
    '[style]': 'presentation.customThemeStyle()',
    '(document:click)': 'toolbar.onDocumentClick()',
    '(document:keydown)': 'keyboard.onDocumentKeydown($event)',
  },
})
export class FluxioImageEditor {
  readonly source = input<ImageEditorSource | null>(null);
  readonly config = input<ImageEditorConfig>({});
  /**
   * Host-provided optional / custom plugin instances for this editor.
   * Merged after DI (`provideImageEditorPlugins`) and global `registerPlugin`.
   * - When the merged host list includes any built-in optional plugin id, it
   *   replaces built-in optional loading (`config.plugins` ids are ignored).
   * - Host-only extras (custom plugin ids) are appended onto the normal resolution.
   * Always-on plugins are still registered by the shell. Host owns `import()` for
   * bundle/CSP control of optional plugins.
   */
  readonly plugins = input<readonly ImageEditorPlugin[]>([]);

  readonly ready = output<ImageEditorHandle>();
  readonly changed = output<ReturnType<EditorSession['getSnapshot']>>();
  readonly saved = output<ImageEditorExportResult>();
  /** Emitted after a successful batch export with every file result (order matches selection). */
  readonly batchSaved = output<readonly ImageEditorExportResult[]>();
  readonly closed = output<EditorClosedEvent>();
  /**
   * Emitted when closing with unsaved changes and `config.close.useCustomConfirm`
   * is true. Host must call `event.resolve(confirmed)`. When the flag is unset,
   * falls back to `globalThis.confirm`.
   */
  readonly confirmClose = output<ConfirmCloseEvent>();
  /**
   * Emitted for registered plugin toolbar/utilibar actions the shell does not
   * handle. Use with a host plugin `registerToolbarAction` (e.g. one-click Save).
   */
  readonly action = output<EditorToolbarActionEvent>();
  readonly error = output<string>();
  /** PV41: staged load progress (0→1). Failures do not emit progress `1`. */
  readonly loadProgress = output<EditorProgressEvent>();
  /** PV41: staged export progress (0→1). Failures do not emit progress `1`. */
  readonly exportProgress = output<EditorProgressEvent>();

  private readonly viewportChrome = viewChild.required(EditorViewportComponent);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ui = inject(EditorUiStore);
  private readonly shell = inject(EditorShellContext);
  protected readonly presentation = inject(EditorPresentationStore);
  protected readonly annotations = inject(AnnotationInteractionController);
  protected readonly toolbar = inject(ToolbarController);
  protected readonly keyboard = inject(KeyboardController);
  private readonly lifecycle = inject(ModeLifecycleController);
  private readonly transformTool = inject(TransformTool);
  private readonly drawingTool = inject(DrawingTool);
  private readonly watermarkTool = inject(WatermarkTool);
  private readonly rulersTool = inject(RulersTool);
  private readonly bootstrapController = inject(BootstrapController);
  private readonly closeController = inject(CloseController);

  constructor() {
    this.shell.config = () => this.config();
    this.shell.source = () => this.source();
    this.shell.plugins = () => this.plugins();
    this.shell.viewportElement = () => this.viewportChrome()?.viewportRef()?.nativeElement ?? null;
    this.shell.translate = (key) => this.presentation.t(key);
    this.shell.reportError = (error) => this.emitError(error);
    this.shell.emitAction = (event) => this.action.emit(event);
    this.lifecycle.bind();

    afterNextRender(() => {
      void this.bootstrap();
    });

    effect(() => {
      this.bootstrapController.loadSource(this.source());
    });

    effect(() => {
      this.bootstrapController.applyLocaleConfig(
        this.presentation.locale(),
        this.config().messages,
        this.config().locales,
      );
    });

    effect(() => {
      this.bootstrapController.applyFiltersConfig(this.config().filters);
    });

    effect(() => {
      // Re-read config.rulers when hosts patch snap defaults.
      void this.config().rulers;
      const session = this.shell.getSession();
      if (!session) {
        return;
      }
      const enabled = session.getRegisteredPluginIds().includes('rulers');
      // hydrateFromConfig reads/writes markupSnap — keep that untracked or the
      // effect re-fires forever and Angular never finishes initializing.
      untracked(() => {
        this.rulersTool.setEnabled(enabled);
        if (enabled) {
          this.rulersTool.hydrateFromConfig();
        }
      });
    });

    effect(() => {
      const editingId = this.presentation.editingTextId();
      const el = this.viewportChrome()?.inplaceEditorRef()?.nativeElement;
      if (editingId && el && el !== (globalThis.document?.activeElement ?? null)) {
        el.value = this.presentation.selectedText()?.text ?? '';
        el.focus();
        const end = el.value.length;
        el.setSelectionRange(end, end);
      }
    });

    this.destroyRef.onDestroy(() => {
      this.transformTool.destroy();
      this.bootstrapController.destroy();
    });
  }

  protected onClose(): void {
    this.closeController.requestClose({
      emitConfirmClose: (event) => this.confirmClose.emit(event),
      emitClosed: (event) => this.closed.emit(event),
    });
  }

  protected onExportSaved(result: ImageEditorExportResult): void {
    this.saved.emit(result);
  }

  protected onBatchExportSaved(results: readonly ImageEditorExportResult[]): void {
    this.batchSaved.emit(results);
  }

  private async bootstrap(): Promise<void> {
    await this.bootstrapController.initialize({
      viewport: this.viewportChrome().viewportRef().nativeElement,
      onChanged: (session) => this.onSessionChanged(session),
      onLoadProgress: (event) => this.loadProgress.emit(event),
      onExportProgress: (event) => this.exportProgress.emit(event),
      onReady: (session) => {
        this.annotations.syncAllDraftsFromDocument();
        this.annotations.bind(session);
        this.transformTool.bind(session);
        this.rulersTool.setEnabled(session.getRegisteredPluginIds().includes('rulers'));
        this.applyDefaultTool();
        this.ready.emit(session);
      },
    });
  }

  private onSessionChanged(session: EditorSession): void {
    this.changed.emit(session.getSnapshot());
    const document = session.store.document();
    if (!document) {
      this.annotations.clearSelection();
      return;
    }
    this.ui.resizeWidth.set(document.output.width);
    this.ui.resizeHeight.set(document.output.height);
    this.ui.arbitraryAngle.set(document.transform.rotationDegrees);
    this.drawingTool.syncFromDocument();
    this.watermarkTool.syncFromDocument();
    this.rulersTool.pushToSession();
    this.annotations.syncAfterDocumentChange();
  }

  private applyDefaultTool(): void {
    const tool = this.config().defaultTool?.trim();
    if (!tool) {
      return;
    }
    const actionId =
      tool === 'rotate'
        ? 'transform.rotate-tool'
        : tool === 'resize'
          ? 'transform.resize-tool'
          : `${tool}.tool`;
    void this.toolbar.onToolbarAction(actionId);
  }

  private emitError(error: unknown): void {
    if (isImageEditorError(error)) {
      this.error.emit(`[${error.code}] ${error.message}`);
      return;
    }
    const message = error instanceof Error ? error.message : 'Editor error';
    this.error.emit(message);
  }
}
