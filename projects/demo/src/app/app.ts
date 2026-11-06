import { Component, computed, signal } from '@angular/core';

import {
  FluxioImageEditor,
  expandEditorPluginRequestIds,
  type ConfirmCloseEvent,
  type EditorClosedEvent,
  type EditorControlsPanelPosition,
  type EditorPluginId,
  type EditorPluginRequestId,
  type EditorToolbarActionDisplay,
  type EditorToolbarActionEvent,
  type EditorToolbarBarPosition,
  type EditorToolbarPosition,
  type ImageEditorConfig,
  type ImageEditorExportResult,
  type ImageEditorHandle,
  type ImageEditorPlugin,
  type ImageEditorSource,
  OPTIONAL_EDITOR_PLUGIN_IDS,
} from 'fluxio-image-editor';
import type { EditorTextDirection, EditorThemeMode } from 'fluxio-image-editor/core';
import { AdjustmentsPlugin } from 'fluxio-image-editor/plugins/adjustments';
import { FiltersPlugin } from 'fluxio-image-editor/plugins/filters';
import {
  DEFAULT_ASPECT_RATIOS,
  DEFAULT_ZOOM_PRESETS,
  type EditorSession,
} from 'fluxio-image-editor/core';
import {
  DEMO_ACTION_DISPLAYS,
  DEMO_CHROME_ACTION_OPTIONS,
  DEMO_CONTROLS_POSITIONS,
  DEMO_DEFAULT_TOOL_OPTIONS,
  DEMO_DIR_OPTIONS,
  DEMO_FORMAT_SAMPLES,
  DEMO_HOST_CROP_MASK_GALLERY,
  DEMO_HOST_TEMPLATE_GALLERY,
  DEMO_LOCALE_OPTIONS,
  DEMO_PLUGIN_ALIAS_PRESETS,
  DEMO_PLUGIN_CATALOG,
  DEMO_THEME_OPTIONS,
  DEMO_TOOL_ACTION_OPTIONS,
  DEMO_TOOLBAR_POSITIONS,
  DEMO_UTILIBAR_ACTION_OPTIONS,
  DEMO_UTILS_POSITIONS,
} from './demo-config-meta';
import { HOST_SAVE_ACTION } from './host-save.plugin';

/** Playwright H-G04 bridge — demo host only, not a public library API. */
export interface FluxioDemoE2EBridge {
  getHandle: () => ImageEditorHandle | null;
  getLastError: () => string | null;
  getLastEvent: () => string;
  destroyEditor: () => void;
  reopenEditor: () => void;
  loadBrokenRemote: () => void;
  loadSameOriginFixture: () => void;
  loadWithPlugins: (plugins: readonly EditorPluginRequestId[]) => void;
  loadWithHostPluginInstances: () => void;
  getToolbarActionIds: () => readonly string[];
}

declare global {
  interface Window {
    __FLUXIO_E2E__?: FluxioDemoE2EBridge;
  }
}

const CUSTOM_ASPECT_PRESET = {
  id: 'avatar-180',
  label: 'Avatar 180×180',
  ratio: 1,
  width: 180,
  height: 180,
} as const;

@Component({
  selector: 'app-root',
  imports: [FluxioImageEditor],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = 'fluxio-image-editor demo';
  /** True when served via `npm run start:demo:csp` (meta CSP present). */
  protected readonly strictCspMode =
    typeof document !== 'undefined' &&
    !!document.querySelector('meta[http-equiv="Content-Security-Policy"]');

  protected readonly source = signal<ImageEditorSource>('/fixtures/sample.jpg');
  protected readonly formatSamples = DEMO_FORMAT_SAMPLES;
  protected readonly editorVisible = signal(true);
  protected readonly lastExportSize = signal<number | null>(null);
  protected readonly lastError = signal<string | null>(null);
  protected readonly lastEvent = signal<string>('none');
  protected readonly configPanelOpen = signal(true);

  protected readonly theme = signal<EditorThemeMode>('dark');
  protected readonly locale = signal<'en' | 'ar'>('en');
  protected readonly textDirection = signal<EditorTextDirection>('auto');
  protected readonly utilsPosition = signal<EditorToolbarPosition>('left');
  protected readonly controlsPosition = signal<EditorControlsPanelPosition>('left');
  protected readonly toolbarBarPosition = signal<EditorToolbarBarPosition>('top');
  protected readonly actionDisplay = signal<EditorToolbarActionDisplay>('both');
  protected readonly showSaveButton = signal(true);
  protected readonly historyLimit = signal(50);
  protected readonly warnOnUnsaved = signal(true);
  /** When true, demo owns the unsaved-close dialog via `(confirmClose)`. */
  protected readonly useCustomConfirm = signal(true);
  protected readonly pendingConfirmClose = signal<ConfirmCloseEvent | null>(null);
  protected readonly defaultTool = signal('');
  /** `null` = all actions visible (config omits whitelist); otherwise explicit selection. */
  protected readonly visibleToolbarActions = signal<ReadonlySet<string> | null>(null);

  protected readonly cropAutoResize = signal(true);
  protected readonly cropForcePng = signal(true);
  protected readonly customAspectPresetEnabled = signal(true);

  protected readonly rotateIncrement = signal(90);
  protected readonly rotateArbitrary = signal(true);

  protected readonly viewportWheelZoom = signal(true);
  protected readonly viewportZoomPresetsMenu = signal(true);
  protected readonly viewportMinZoom = signal(0.05);
  protected readonly viewportMaxZoom = signal(10);
  protected readonly viewportZoomStep = signal(1.1);

  protected readonly canvasBackgroundEnabled = signal(true);
  protected readonly canvasBackgroundColor = signal('#12161c');

  protected readonly overlayGalleryEnabled = signal(true);
  protected readonly cropMaskGalleryEnabled = signal(true);
  protected readonly stickersAllowUpload = signal(false);
  protected readonly stickersGalleryEnabled = signal(false);
  protected readonly watermarkDefaultText = signal('fluxio');
  protected readonly watermarkImageEnabled = signal(true);
  /** When true, overrides built-in templates with `DEMO_HOST_TEMPLATE_GALLERY`. */
  protected readonly templatesHostGalleryEnabled = signal(false);
  /** `config.colorPicker.enabled` — hides field eyedroppers when false (plugin still loaded). */
  protected readonly colorPickerEnabled = signal(true);
  /**
   * When false, omits `layers` from `config.plugins` so the panel tab and toolbar
   * action are not registered (unlike chrome `visibleActions`, which only hides the button).
   */
  protected readonly layersPluginEnabled = signal(true);
  /**
   * When false, omits `history-snapshots` from `config.plugins` (History panel + toolbar).
   */
  protected readonly historySnapshotsPluginEnabled = signal(true);

  protected readonly lazyPluginsEnabled = signal(false);
  protected readonly hostPluginInstancesEnabled = signal(false);
  protected readonly hostPluginInstances = [new AdjustmentsPlugin(), new FiltersPlugin()];
  protected readonly selectedOptionalPlugins = signal<ReadonlySet<EditorPluginId>>(
    new Set(OPTIONAL_EDITOR_PLUGIN_IDS),
  );

  protected readonly pluginCatalog = DEMO_PLUGIN_CATALOG;
  protected readonly pluginAliasPresets = DEMO_PLUGIN_ALIAS_PRESETS;
  protected readonly optionalPluginOptions = OPTIONAL_EDITOR_PLUGIN_IDS;
  protected readonly themeOptions = DEMO_THEME_OPTIONS;
  protected readonly localeOptions = DEMO_LOCALE_OPTIONS;
  protected readonly dirOptions = DEMO_DIR_OPTIONS;
  protected readonly utilsPositions = DEMO_UTILS_POSITIONS;
  protected readonly controlsPositions = DEMO_CONTROLS_POSITIONS;
  protected readonly toolbarBarPositions = DEMO_TOOLBAR_POSITIONS;
  protected readonly actionDisplays = DEMO_ACTION_DISPLAYS;
  protected readonly chromeActionOptions = DEMO_CHROME_ACTION_OPTIONS;
  protected readonly utilibarActionOptions = DEMO_UTILIBAR_ACTION_OPTIONS;
  protected readonly defaultToolOptions = DEMO_DEFAULT_TOOL_OPTIONS;

  protected readonly activePluginCount = computed(() => {
    if (this.hostPluginInstancesEnabled()) {
      return `host instances (${this.hostPluginInstances.length}) + DI host-save`;
    }
    if (this.lazyPluginsEnabled()) {
      const count = ALWAYS_ON_COUNT + this.selectedOptionalPlugins().size;
      return `${count} plugins (lazy) + host-save`;
    }
    return 'all plugins (default bundle) + host-save';
  });

  protected readonly editorConfig = signal<ImageEditorConfig>(this.buildEditorConfig());

  private handle: ImageEditorHandle | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.__FLUXIO_E2E__ = {
        getHandle: () => this.handle,
        getLastError: () => this.lastError(),
        getLastEvent: () => this.lastEvent(),
        destroyEditor: () => this.destroyEditor(),
        reopenEditor: () => this.reopenEditor(),
        loadBrokenRemote: () => this.loadBrokenRemote(),
        loadSameOriginFixture: () => this.loadSameOriginFixture(),
        loadWithPlugins: (plugins) => this.loadWithPlugins(plugins),
        loadWithHostPluginInstances: () => this.loadWithHostPluginInstances(),
        getToolbarActionIds: () => this.getToolbarActionIds(),
      };
    }
  }

  protected onReady(handle: ImageEditorHandle): void {
    this.handle = handle;
    this.lastEvent.set('ready');
  }

  /** Sync host `[source]` after toolbar Open/New (avoids double load via rememberSource). */
  protected onSourceChanged(next: ImageEditorSource): void {
    this.source.set(next);
    this.lastEvent.set('sourceChanged');
  }

  protected onChanged(): void {
    this.lastEvent.set(`changed dirty=${this.handle?.isDirty() ?? false}`);
  }

  protected onError(message: string): void {
    this.lastError.set(message);
  }

  protected onSaved(result: ImageEditorExportResult): void {
    this.lastExportSize.set(result.blob.size);
    this.lastEvent.set(`saved ${result.fileName}`);
    const url = URL.createObjectURL(result.blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = result.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  /** Host-owned toolbar action (e.g. Save PNG) — format chosen here, not in the editor dialog. */
  protected async onAction(event: EditorToolbarActionEvent): Promise<void> {
    if (event.id !== HOST_SAVE_ACTION || !this.handle) {
      return;
    }
    this.lastEvent.set(`action ${event.id}`);
    try {
      const result = await this.handle.export({
        format: 'png',
        fileName: 'fluxio-export.png',
        asFile: true,
      });
      this.onSaved(result);
    } catch (error) {
      this.onError(error instanceof Error ? error.message : 'Host save failed');
    }
  }

  protected onClosed(event: EditorClosedEvent): void {
    this.pendingConfirmClose.set(null);
    this.lastEvent.set(`closed dirty=${event.dirty} confirmed=${event.confirmed}`);
  }

  protected onConfirmClose(event: ConfirmCloseEvent): void {
    this.pendingConfirmClose.set(event);
    this.lastEvent.set(`confirmClose dirty=${event.dirty}`);
  }

  protected resolveConfirmClose(confirmed: boolean): void {
    const pending = this.pendingConfirmClose();
    if (!pending) {
      return;
    }
    this.pendingConfirmClose.set(null);
    pending.resolve(confirmed);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.lastError.set(null);
      this.source.set(file);
    }
  }

  protected loadSameOriginFixture(): void {
    this.loadFormatSample('/fixtures/sample.jpg', 'JPEG');
  }

  protected loadFormatSample(src: string, label: string): void {
    this.lastError.set(null);
    this.source.set(src);
    this.lastEvent.set(`loaded ${label} fixture (${src})`);
  }

  protected async loadBlobSample(): Promise<void> {
    this.lastError.set(null);
    const response = await fetch('/fixtures/sample.jpg');
    const blob = await response.blob();
    this.source.set(blob);
    this.lastEvent.set('loaded Blob from fixture');
  }

  protected loadBrokenRemote(): void {
    this.lastError.set(null);
    this.source.set('https://example.invalid/missing-image.png');
    this.lastEvent.set('triggered broken remote source');
  }

  protected downloadDesignState(): void {
    if (!this.handle) {
      this.lastError.set('Editor not ready');
      return;
    }
    try {
      const envelope = this.handle.exportDesignState();
      const json = JSON.stringify(envelope, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'fluxio-design.json';
      anchor.click();
      URL.revokeObjectURL(url);
      this.lastEvent.set('design state downloaded');
    } catch (error) {
      this.onError(error instanceof Error ? error.message : 'Design export failed');
    }
  }

  protected onDesignFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.handle) {
      return;
    }
    void file
      .text()
      .then((text) => this.handle!.loadDesignState(text))
      .then(() => {
        this.lastError.set(null);
        this.lastEvent.set('design state loaded');
      })
      .catch((error: unknown) => {
        this.onError(error instanceof Error ? error.message : 'Design load failed');
      });
  }

  protected destroyEditor(): void {
    this.pendingConfirmClose.set(null);
    this.handle = null;
    this.editorVisible.set(false);
    this.lastEvent.set('editor destroyed');
  }

  protected reopenEditor(): void {
    this.lastError.set(null);
    this.source.set('/fixtures/sample.jpg');
    this.editorVisible.set(true);
    this.lastEvent.set('editor reopening');
  }

  protected toggleConfigPanel(): void {
    this.configPanelOpen.update((open) => !open);
  }

  protected isOptionalPluginSelected(id: EditorPluginId): boolean {
    return this.selectedOptionalPlugins().has(id);
  }

  protected toggleOptionalPlugin(id: EditorPluginId, checked: boolean): void {
    this.selectedOptionalPlugins.update((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
    // Keep dedicated plugin switches aligned with the catalog selection
    // (Apply still required to restart when using lazy plugin loading).
    if (id === 'layers') {
      this.layersPluginEnabled.set(checked);
    }
    if (id === 'history-snapshots') {
      this.historySnapshotsPluginEnabled.set(checked);
    }
  }

  protected isVisibleActionSelected(id: string): boolean {
    const selected = this.visibleToolbarActions();
    return selected === null || selected.has(id);
  }

  protected toggleVisibleAction(id: string, checked: boolean): void {
    this.visibleToolbarActions.update((current) => {
      const allIds = DEMO_TOOL_ACTION_OPTIONS.map((option) => option.id);
      const base = current === null ? new Set(allIds) : new Set(current);
      if (checked) {
        base.add(id);
      } else {
        base.delete(id);
      }
      if (base.size === allIds.length) {
        return null;
      }
      return base;
    });
    this.syncEditorConfig();
  }

  protected setAllVisibleActions(checked: boolean): void {
    if (checked) {
      this.visibleToolbarActions.set(null);
    } else {
      this.visibleToolbarActions.set(new Set());
    }
    this.syncEditorConfig();
  }

  protected setChromeActionsVisible(checked: boolean): void {
    this.visibleToolbarActions.update((current) => {
      const allIds = DEMO_TOOL_ACTION_OPTIONS.map((option) => option.id);
      const base = current === null ? new Set(allIds) : new Set(current);
      for (const option of DEMO_CHROME_ACTION_OPTIONS) {
        if (checked) {
          base.add(option.id);
        } else {
          base.delete(option.id);
        }
      }
      if (base.size === allIds.length) {
        return null;
      }
      return base;
    });
    this.syncEditorConfig();
  }

  protected setUtilibarActionsVisible(checked: boolean): void {
    this.visibleToolbarActions.update((current) => {
      const allIds = DEMO_TOOL_ACTION_OPTIONS.map((option) => option.id);
      const base = current === null ? new Set(allIds) : new Set(current);
      for (const option of DEMO_UTILIBAR_ACTION_OPTIONS) {
        if (checked) {
          base.add(option.id);
        } else {
          base.delete(option.id);
        }
      }
      if (base.size === allIds.length) {
        return null;
      }
      return base;
    });
    this.syncEditorConfig();
  }

  protected applyPluginSelection(): void {
    const lazy = this.lazyPluginsEnabled();
    this.hostPluginInstancesEnabled.set(false);
    const selected = this.selectedOptionalPlugins();
    this.layersPluginEnabled.set(selected.has('layers'));
    this.historySnapshotsPluginEnabled.set(selected.has('history-snapshots'));
    const plugins = lazy ? [...selected] : undefined;
    this.patchConfig({ plugins });
    this.restartEditor(
      lazy ? `lazy plugins: ${plugins?.join(', ') ?? 'none'}` : 'default plugins (all)',
    );
  }

  protected loadWithPlugins(plugins: readonly EditorPluginRequestId[]): void {
    this.hostPluginInstancesEnabled.set(false);
    this.lazyPluginsEnabled.set(true);
    const expanded = expandEditorPluginRequestIds(plugins);
    this.selectedOptionalPlugins.set(new Set(expanded));
    this.layersPluginEnabled.set(expanded.includes('layers'));
    this.historySnapshotsPluginEnabled.set(expanded.includes('history-snapshots'));
    this.patchConfig({ plugins: [...plugins] });
    this.restartEditor(`lazy plugins: ${plugins.join(', ')}`);
  }

  protected loadPluginAlias(alias: EditorPluginRequestId): void {
    this.loadWithPlugins([alias]);
  }

  protected toggleHostPluginInstances(checked: boolean): void {
    if (checked) {
      this.loadWithHostPluginInstances();
      return;
    }
    this.hostPluginInstancesEnabled.set(false);
    this.syncEditorConfig();
    this.restartEditor(this.defaultPluginsEventMessage());
  }

  protected onLazyPluginsToggle(checked: boolean): void {
    this.lazyPluginsEnabled.set(checked);
    if (!checked && !this.hostPluginInstancesEnabled()) {
      this.syncEditorConfig();
      this.restartEditor(this.defaultPluginsEventMessage());
    }
  }

  protected setLayersPluginEnabled(checked: boolean): void {
    this.setOptionalPluginEnabled('layers', checked, this.layersPluginEnabled);
  }

  protected setHistorySnapshotsPluginEnabled(checked: boolean): void {
    this.setOptionalPluginEnabled('history-snapshots', checked, this.historySnapshotsPluginEnabled);
  }

  protected loadWithHostPluginInstances(): void {
    this.hostPluginInstancesEnabled.set(true);
    this.lazyPluginsEnabled.set(false);
    this.patchConfig({ plugins: undefined });
    this.restartEditor('host plugin instances: adjustments, filters');
  }

  protected editorPlugins(): readonly ImageEditorPlugin[] | undefined {
    // HostSavePlugin is registered via provideImageEditorPlugins in app.config.
    if (this.hostPluginInstancesEnabled()) {
      return this.hostPluginInstances;
    }
    return undefined;
  }

  protected getToolbarActionIds(): readonly string[] {
    const session = this.handle as EditorSession | null;
    return session?.getToolbarActions().map((action) => action.id) ?? [];
  }

  protected setTheme(value: EditorThemeMode): void {
    this.theme.set(value);
    this.syncEditorConfig();
  }

  protected setLocale(value: 'en' | 'ar'): void {
    this.locale.set(value);
    this.syncEditorConfig();
  }

  protected setTextDirection(value: EditorTextDirection): void {
    this.textDirection.set(value);
    this.syncEditorConfig();
  }

  protected setUtilsPosition(value: EditorToolbarPosition): void {
    this.utilsPosition.set(value);
    this.syncEditorConfig();
  }

  protected setControlsPosition(value: EditorControlsPanelPosition): void {
    this.controlsPosition.set(value);
    this.syncEditorConfig();
  }

  protected setToolbarBarPosition(value: EditorToolbarBarPosition): void {
    this.toolbarBarPosition.set(value);
    this.syncEditorConfig();
  }

  protected setActionDisplay(value: EditorToolbarActionDisplay): void {
    this.actionDisplay.set(value);
    this.syncEditorConfig();
  }

  protected setShowSaveButton(checked: boolean): void {
    this.showSaveButton.set(checked);
    this.syncEditorConfig();
  }

  protected setHistoryLimit(value: number): void {
    this.historyLimit.set(Math.max(1, Math.round(value)));
    this.syncEditorConfig();
  }

  protected setWarnOnUnsaved(checked: boolean): void {
    this.warnOnUnsaved.set(checked);
    this.syncEditorConfig();
  }

  protected setUseCustomConfirm(checked: boolean): void {
    this.useCustomConfirm.set(checked);
    this.syncEditorConfig();
  }

  protected setDefaultTool(value: string): void {
    this.defaultTool.set(value);
    this.syncEditorConfig();
  }

  protected setCropAutoResize(checked: boolean): void {
    this.cropAutoResize.set(checked);
    this.syncEditorConfig();
  }

  protected setCropForcePng(checked: boolean): void {
    this.cropForcePng.set(checked);
    this.syncEditorConfig();
  }

  protected setCustomAspectPresetEnabled(checked: boolean): void {
    this.customAspectPresetEnabled.set(checked);
    this.syncEditorConfig();
  }

  protected setRotateIncrement(value: number): void {
    this.rotateIncrement.set(Math.max(1, Math.round(value)));
    this.syncEditorConfig();
  }

  protected setRotateArbitrary(checked: boolean): void {
    this.rotateArbitrary.set(checked);
    this.syncEditorConfig();
  }

  protected setViewportWheelZoom(checked: boolean): void {
    this.viewportWheelZoom.set(checked);
    this.syncEditorConfig();
  }

  protected setViewportZoomPresetsMenu(checked: boolean): void {
    this.viewportZoomPresetsMenu.set(checked);
    this.syncEditorConfig();
  }

  protected setViewportMinZoom(value: number): void {
    this.viewportMinZoom.set(Math.max(0.01, value));
    this.syncEditorConfig();
  }

  protected setViewportMaxZoom(value: number): void {
    this.viewportMaxZoom.set(Math.max(0.1, value));
    this.syncEditorConfig();
  }

  protected setViewportZoomStep(value: number): void {
    this.viewportZoomStep.set(Math.max(1.01, value));
    this.syncEditorConfig();
  }

  protected setCanvasBackgroundEnabled(checked: boolean): void {
    this.canvasBackgroundEnabled.set(checked);
    this.syncEditorConfig();
  }

  protected setCanvasBackgroundColor(value: string): void {
    this.canvasBackgroundColor.set(value);
    this.syncEditorConfig();
  }

  protected setOverlayGalleryEnabled(checked: boolean): void {
    this.overlayGalleryEnabled.set(checked);
    this.syncEditorConfig();
  }

  protected setCropMaskGalleryEnabled(checked: boolean): void {
    this.cropMaskGalleryEnabled.set(checked);
    this.syncEditorConfig();
  }

  protected setStickersAllowUpload(checked: boolean): void {
    this.stickersAllowUpload.set(checked);
    this.syncEditorConfig();
  }

  protected setStickersGalleryEnabled(checked: boolean): void {
    this.stickersGalleryEnabled.set(checked);
    this.syncEditorConfig();
  }

  protected setWatermarkDefaultText(value: string): void {
    this.watermarkDefaultText.set(value);
    this.syncEditorConfig();
  }

  protected setWatermarkImageEnabled(checked: boolean): void {
    this.watermarkImageEnabled.set(checked);
    this.syncEditorConfig();
  }

  protected setTemplatesHostGalleryEnabled(checked: boolean): void {
    this.templatesHostGalleryEnabled.set(checked);
    this.syncEditorConfig();
  }

  protected setColorPickerEnabled(checked: boolean): void {
    this.colorPickerEnabled.set(checked);
    this.syncEditorConfig();
  }

  protected applyConfigSnapshot(): void {
    this.syncEditorConfig();
    this.lastEvent.set('config panel applied');
  }

  protected resetConfigDefaults(): void {
    this.theme.set('dark');
    this.locale.set('en');
    this.textDirection.set('auto');
    this.utilsPosition.set('left');
    this.controlsPosition.set('left');
    this.toolbarBarPosition.set('top');
    this.actionDisplay.set('both');
    this.showSaveButton.set(true);
    this.historyLimit.set(50);
    this.warnOnUnsaved.set(true);
    this.useCustomConfirm.set(true);
    this.defaultTool.set('');
    this.visibleToolbarActions.set(null);
    this.cropAutoResize.set(true);
    this.cropForcePng.set(true);
    this.customAspectPresetEnabled.set(true);
    this.rotateIncrement.set(90);
    this.rotateArbitrary.set(true);
    this.viewportWheelZoom.set(true);
    this.viewportZoomPresetsMenu.set(true);
    this.viewportMinZoom.set(0.05);
    this.viewportMaxZoom.set(10);
    this.viewportZoomStep.set(1.1);
    this.canvasBackgroundEnabled.set(true);
    this.canvasBackgroundColor.set('#12161c');
    this.overlayGalleryEnabled.set(true);
    this.cropMaskGalleryEnabled.set(true);
    this.stickersAllowUpload.set(false);
    this.stickersGalleryEnabled.set(false);
    this.watermarkDefaultText.set('fluxio');
    this.watermarkImageEnabled.set(true);
    this.templatesHostGalleryEnabled.set(false);
    this.colorPickerEnabled.set(true);
    this.layersPluginEnabled.set(true);
    this.historySnapshotsPluginEnabled.set(true);
    this.lazyPluginsEnabled.set(false);
    this.hostPluginInstancesEnabled.set(false);
    this.selectedOptionalPlugins.set(new Set(OPTIONAL_EDITOR_PLUGIN_IDS));
    this.syncEditorConfig();
    this.restartEditor('config reset to defaults');
  }

  private setOptionalPluginEnabled(
    id: EditorPluginId,
    checked: boolean,
    flag: { set: (value: boolean) => void },
  ): void {
    flag.set(checked);
    this.hostPluginInstancesEnabled.set(false);
    this.selectedOptionalPlugins.update((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
    this.syncEditorConfig();
    this.restartEditor(checked ? `${id} plugin enabled` : `${id} plugin disabled`);
  }

  private defaultPluginsEventMessage(): string {
    const disabled: string[] = [];
    if (!this.layersPluginEnabled()) {
      disabled.push('layers');
    }
    if (!this.historySnapshotsPluginEnabled()) {
      disabled.push('history-snapshots');
    }
    return disabled.length
      ? `default plugins (${disabled.join(', ')} disabled)`
      : 'default plugins (all)';
  }

  private restartEditor(eventMessage: string): void {
    this.destroyEditor();
    window.setTimeout(() => {
      this.reopenEditor();
      this.lastEvent.set(eventMessage);
    }, 0);
  }

  private syncEditorConfig(): void {
    this.editorConfig.set(this.buildEditorConfig());
  }

  /**
   * Always emit `visibleActions` in `DEMO_TOOL_ACTION_OPTIONS` order.
   * Omitting the whitelist falls back to plugin registration order, which
   * jumps the utilibar the first time any toggle changes.
   */
  private resolveVisibleActionsConfig(): readonly string[] {
    const preferredOrder = DEMO_TOOL_ACTION_OPTIONS.map((option) => option.id);
    const visible = this.visibleToolbarActions();
    if (visible === null) {
      return preferredOrder;
    }
    return preferredOrder.filter((id) => visible.has(id));
  }

  private buildEditorConfig(): ImageEditorConfig {
    const visibleActions = this.resolveVisibleActionsConfig();

    const theme = this.theme();
    return {
      theme,
      // CSS-driven custom palette in demo `styles.scss` (`.demo-theme-aurora`).
      themeClass: theme === 'custom' ? 'demo-theme-aurora' : undefined,
      locale: this.locale(),
      dir: this.textDirection(),
      historyLimit: this.historyLimit(),
      defaultTool: this.defaultTool() || undefined,
      toolbar: {
        position: this.utilsPosition(),
        toolbarPosition: this.toolbarBarPosition(),
        controlsPosition: this.controlsPosition(),
        showSaveButton: this.showSaveButton(),
        actionDisplay: this.actionDisplay(),
        visibleActions,
      },
      crop: {
        autoResize: this.cropAutoResize(),
        forcePngOnEllipticalCrop: this.cropForcePng(),
      },
      aspectRatios: this.customAspectPresetEnabled()
        ? [...DEFAULT_ASPECT_RATIOS, CUSTOM_ASPECT_PRESET]
        : [...DEFAULT_ASPECT_RATIOS],
      rotate: {
        incrementDegrees: this.rotateIncrement(),
        allowArbitraryAngle: this.rotateArbitrary(),
      },
      viewport: {
        wheelZoom: this.viewportWheelZoom(),
        useZoomPresetsMenu: this.viewportZoomPresetsMenu(),
        minZoom: this.viewportMinZoom(),
        maxZoom: this.viewportMaxZoom(),
        zoomStepFactor: this.viewportZoomStep(),
        zoomPresets: DEFAULT_ZOOM_PRESETS,
      },
      canvasBackground: this.canvasBackgroundEnabled()
        ? { backgroundColor: this.canvasBackgroundColor() }
        : undefined,
      imageOverlay: this.overlayGalleryEnabled()
        ? {
            gallery: [{ id: 'sample', label: 'Sample', src: '/fixtures/sample.jpg' }],
          }
        : undefined,
      fill: {
        gallery: [
          { id: 'fill-sample', label: 'Sample', src: '/fixtures/sample.jpg' },
          { id: 'fill-png', label: 'PNG', src: '/fixtures/sample.png' },
        ],
      },
      cropMask: this.cropMaskGalleryEnabled()
        ? { gallery: [...DEMO_HOST_CROP_MASK_GALLERY] }
        : undefined,
      stickers: {
        allowUpload: this.stickersAllowUpload(),
        gallery: this.stickersGalleryEnabled()
          ? [{ id: 'star', label: 'Star', src: '/fixtures/sample.jpg' }]
          : undefined,
      },
      watermark: {
        defaultText: this.watermarkDefaultText(),
        imageSrc: this.watermarkImageEnabled() ? '/fixtures/sample.jpg' : undefined,
      },
      templates: this.templatesHostGalleryEnabled()
        ? { gallery: [...DEMO_HOST_TEMPLATE_GALLERY] }
        : undefined,
      colorPicker: {
        enabled: this.colorPickerEnabled(),
      },
      close: {
        warnOnUnsaved: this.warnOnUnsaved(),
        useCustomConfirm: this.useCustomConfirm(),
      },
      plugins: this.resolvePluginsConfig(),
    };
  }

  private resolvePluginsConfig(): readonly EditorPluginRequestId[] | undefined {
    if (this.hostPluginInstancesEnabled()) {
      return undefined;
    }
    if (this.lazyPluginsEnabled()) {
      return [...this.selectedOptionalPlugins()];
    }
    // Default bundle with dedicated plugin switches off → explicit list without them.
    const excluded = new Set<EditorPluginId>();
    if (!this.layersPluginEnabled()) {
      excluded.add('layers');
    }
    if (!this.historySnapshotsPluginEnabled()) {
      excluded.add('history-snapshots');
    }
    if (excluded.size === 0) {
      return undefined;
    }
    return OPTIONAL_EDITOR_PLUGIN_IDS.filter((id) => !excluded.has(id));
  }

  private patchConfig(patch: Partial<ImageEditorConfig>): void {
    this.editorConfig.update((current) => ({ ...current, ...patch }));
  }
}

const ALWAYS_ON_COUNT = 4;
