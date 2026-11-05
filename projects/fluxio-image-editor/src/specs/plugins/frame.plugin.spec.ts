import type { ImageEditorPluginContext } from 'fluxio-image-editor/core';
import {
  FRAME_RESET_COMMAND,
  FRAME_SET_COMMAND,
  FramePlugin,
} from 'fluxio-image-editor/plugins/frame';

describe('FramePlugin', () => {
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

    const plugin = new FramePlugin();
    expect(plugin.id).toBe('frame');
    plugin.setup(context);

    expect(tools).toEqual(['frame']);
    expect(commands).toEqual([FRAME_SET_COMMAND, FRAME_RESET_COMMAND]);
    expect(actions).toEqual([{ id: 'frame.tool', icon: 'frame' }]);
    expect(locales).toEqual(['en', 'ar']);
  });
});
