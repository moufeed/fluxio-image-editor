import type { ImageEditorPluginContext } from 'fluxio-image-editor/core';
import {
  FOCUS_RESET_COMMAND,
  FOCUS_SET_COMMAND,
  FocusPlugin,
} from 'fluxio-image-editor/plugins/focus';

describe('FocusPlugin', () => {
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

    const plugin = new FocusPlugin();
    expect(plugin.id).toBe('focus');
    plugin.setup(context);

    expect(tools).toEqual(['focus']);
    expect(commands).toEqual([FOCUS_SET_COMMAND, FOCUS_RESET_COMMAND]);
    expect(actions).toEqual([{ id: 'focus.tool', icon: 'focus' }]);
    expect(locales).toEqual(['en', 'ar']);
  });
});
