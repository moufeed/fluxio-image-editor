import type { ImageEditorPluginContext } from 'fluxio-image-editor/core';
import {
  CROP_MASK_RESET_COMMAND,
  CROP_MASK_SET_COMMAND,
  CropMaskPlugin,
} from 'fluxio-image-editor/plugins/crop-mask';

describe('CropMaskPlugin', () => {
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

    const plugin = new CropMaskPlugin();
    expect(plugin.id).toBe('crop-mask');
    plugin.setup(context);

    expect(tools).toEqual(['crop-mask']);
    expect(commands).toEqual([CROP_MASK_SET_COMMAND, CROP_MASK_RESET_COMMAND]);
    expect(actions).toEqual([{ id: 'crop-mask.tool', icon: 'crop-mask' }]);
    expect(locales).toEqual(['en', 'ar']);
  });
});
