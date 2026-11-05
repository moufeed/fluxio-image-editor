import { inject, Injectable } from '@angular/core';

import {
  EditorSession,
  usesLazyPluginLoading,
  type EditorProgressListener,
  type ImageEditorConfig,
} from 'fluxio-image-editor/core';
import { FabricRendererAdapter } from 'fluxio-image-editor/renderer-fabric';

import {
  collectHostPlugins,
  getRegisteredPluginRegistrations,
  IMAGE_EDITOR_PLUGINS,
} from '../plugins/host-plugin-registration';
import { resolveEditorPlugins, hostReplacesOptionalPlugins } from '../plugins/plugin-loaders';
import { EditorShellContext } from './editor-shell.context';

@Injectable()
export class BootstrapController {
  private readonly shell = inject(EditorShellContext);
  private readonly providedPluginGroups = inject(IMAGE_EDITOR_PLUGINS, { optional: true });
  private renderer: FabricRendererAdapter | null = null;
  private bootstrapped = false;
  private lastSource = this.shell.source();

  async initialize(options: {
    readonly viewport: HTMLDivElement;
    readonly onChanged: (session: EditorSession) => void;
    readonly onReady: (session: EditorSession) => void;
    readonly onLoadProgress?: EditorProgressListener;
    readonly onExportProgress?: EditorProgressListener;
  }): Promise<void> {
    if (this.bootstrapped) {
      return;
    }
    this.bootstrapped = true;
    const config = this.shell.config();
    const hostPlugins = collectHostPlugins({
      provided: this.providedPluginGroups,
      registered: getRegisteredPluginRegistrations(),
      input: this.shell.plugins(),
    });
    const needsLazyBootstrap =
      usesLazyPluginLoading(config) &&
      (hostPlugins.length === 0 || !hostReplacesOptionalPlugins(hostPlugins));
    this.shell.pluginsBootstrapping.set(needsLazyBootstrap);
    let plugins;
    try {
      plugins = await resolveEditorPlugins(
        config,
        config.rotate?.incrementDegrees ?? 90,
        hostPlugins,
      );
    } catch (error) {
      this.shell.pluginsBootstrapping.set(false);
      this.shell.reportError(error);
      return;
    }
    this.shell.pluginsBootstrapping.set(false);

    const session = new EditorSession({
      historyLimit: config.historyLimit ?? 50,
      locale: config.locale ?? 'en',
      messages: config.messages,
      locales: config.locales,
      viewport: config.viewport,
      filters: config.filters,
      plugins,
      onChanged: () => options.onChanged(session),
      onLoadProgress: options.onLoadProgress,
      onExportProgress: options.onExportProgress,
    });
    const renderer = new FabricRendererAdapter();
    this.shell.session.set(session);
    this.renderer = renderer;
    try {
      await session.attach(options.viewport, renderer);
      const source = this.shell.source();
      this.lastSource = source;
      if (source) {
        await session.load(source);
      }
      options.onReady(session);
    } catch (error) {
      this.shell.reportError(error);
    }
  }

  loadSource(source: ReturnType<EditorShellContext['source']>): void {
    const session = this.shell.getSession();
    if (!this.bootstrapped || !session || source === this.lastSource || source == null) {
      return;
    }
    this.lastSource = source;
    void session.load(source).catch((error) => this.shell.reportError(error));
  }

  applyLocaleConfig(
    locale: ImageEditorConfig['locale'],
    messages: ImageEditorConfig['messages'],
    locales: ImageEditorConfig['locales'],
  ): void {
    this.shell.getSession()?.applyConfig({
      locale: locale ?? 'en',
      messages: messages ?? {},
      locales: locales ?? {},
    });
  }

  applyFiltersConfig(filters: ImageEditorConfig['filters']): void {
    this.shell.getSession()?.applyConfig({ filters: filters ?? {} });
  }

  destroy(): void {
    this.shell.getSession()?.destroy();
    this.shell.session.set(null);
    this.renderer = null;
  }
}
