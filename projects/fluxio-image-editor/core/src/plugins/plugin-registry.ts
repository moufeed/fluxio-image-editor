import type { EditorCommandHandler } from '../commands/command';
import type { LocaleCatalog } from '../i18n/locale-catalog';
import type {
  EditorPanelDefinition,
  EditorPluginLocaleResources,
  EditorToolbarAction,
  EditorToolbarGroup,
  EditorToolDefinition,
  ImageEditorPlugin,
  ImageEditorPluginContext,
} from './plugin';
import { sortByToolbarPosition } from './toolbar-position';

export class PluginRegistry {
  private readonly plugins = new Map<string, ImageEditorPlugin>();
  private readonly tools: EditorToolDefinition[] = [];
  private readonly panels: EditorPanelDefinition[] = [];
  private readonly toolbarActions: EditorToolbarAction[] = [];
  private readonly toolbarGroups: EditorToolbarGroup[] = [];
  private readonly locales: EditorPluginLocaleResources[] = [];
  private readonly commands: EditorCommandHandler[] = [];

  register(
    plugin: ImageEditorPlugin,
    onCommand: (command: EditorCommandHandler) => void,
    localeCatalog?: LocaleCatalog,
  ): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin already registered: ${plugin.id}`);
    }

    const context: ImageEditorPluginContext = {
      registerTool: (tool) => {
        this.tools.push(tool);
      },
      registerCommand: (command) => {
        this.commands.push(command);
        onCommand(command);
      },
      registerPanel: (panel) => {
        this.panels.push(panel);
      },
      registerToolbarAction: (action) => {
        this.toolbarActions.push(action);
      },
      registerToolbarGroup: (group) => {
        if (this.toolbarGroups.some((existing) => existing.id === group.id)) {
          return;
        }
        this.toolbarGroups.push(group);
      },
      registerLocale: (resources) => {
        this.locales.push(resources);
        localeCatalog?.registerOverlay(resources.locale, resources.messages);
      },
    };

    plugin.setup(context);
    this.plugins.set(plugin.id, plugin);
  }

  destroy(): void {
    for (const plugin of this.plugins.values()) {
      plugin.destroy?.();
    }
    this.plugins.clear();
    this.tools.length = 0;
    this.panels.length = 0;
    this.toolbarActions.length = 0;
    this.toolbarGroups.length = 0;
    this.locales.length = 0;
    this.commands.length = 0;
  }

  getToolbarActions(): readonly EditorToolbarAction[] {
    return sortByToolbarPosition(this.toolbarActions);
  }

  getToolbarGroups(): readonly EditorToolbarGroup[] {
    return sortByToolbarPosition(this.toolbarGroups);
  }

  getTools(): readonly EditorToolDefinition[] {
    return this.tools;
  }

  getPanels(): readonly EditorPanelDefinition[] {
    return this.panels;
  }

  getLocales(): readonly EditorPluginLocaleResources[] {
    return this.locales;
  }

  getRegisteredPluginIds(): readonly string[] {
    return [...this.plugins.keys()];
  }
}
