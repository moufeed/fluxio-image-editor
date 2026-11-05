import type { ImageEditorPluginContext } from 'fluxio-image-editor/core';
import {
  COLOR_OVERLAY_RESET_COMMAND,
  COLOR_OVERLAY_SET_COMMAND,
  ColorOverlayPlugin,
} from 'fluxio-image-editor/plugins/color-overlay';

describe('ColorOverlayPlugin', () => {
  it('registers tool, commands, toolbar action, and locales', () => {
    const tools: string[] = [];
    const commands: string[] = [];
    const actions: { id: string; icon?: string }[] = [];
    const locales: string[] = [];
    const context: ImageEditorPluginContext = {
      registerCommand: (command) => {
        commands.push(command.id);
      },
      registerTool: (tool) => {
        tools.push(tool.id);
      },
      registerPanel: () => undefined,
      registerToolbarAction: (action) => {
        actions.push({ id: action.id, icon: action.icon });
      },
      registerToolbarGroup: () => undefined,
      registerLocale: (bundle) => {
        locales.push(bundle.locale);
      },
    };

    const plugin = new ColorOverlayPlugin();
    expect(plugin.id).toBe('color-overlay');
    plugin.setup(context);

    expect(tools).toEqual(['color-overlay']);
    expect(commands).toEqual([COLOR_OVERLAY_SET_COMMAND, COLOR_OVERLAY_RESET_COMMAND]);
    expect(actions).toEqual([{ id: 'color-overlay.tool', icon: 'color-overlay' }]);
    expect(locales).toEqual(['en', 'ar']);
  });
});
