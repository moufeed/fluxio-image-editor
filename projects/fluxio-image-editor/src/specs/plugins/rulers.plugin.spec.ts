import type { ImageEditorPluginContext } from 'fluxio-image-editor/core';
import { RulersPlugin, RULERS_TOOL_ACTION } from 'fluxio-image-editor/plugins/rulers';

describe('RulersPlugin', () => {
  it('registers the rulers tool, toolbar action, and locales', () => {
    const tools: string[] = [];
    const actions: { id: string }[] = [];
    const locales: string[] = [];
    const context: ImageEditorPluginContext = {
      registerCommand: () => undefined,
      registerTool: (tool) => {
        tools.push(tool.id);
      },
      registerPanel: () => undefined,
      registerToolbarAction: (action) => {
        actions.push({ id: action.id });
      },
      registerToolbarGroup: () => undefined,
      registerLocale: (bundle) => {
        locales.push(bundle.locale);
      },
    };

    const plugin = new RulersPlugin({ gridSize: 16, snapThreshold: 8 });
    expect(plugin.id).toBe('rulers');
    expect(plugin.initialConfig.gridSize).toBe(16);
    expect(plugin.initialConfig.snapThreshold).toBe(8);
    plugin.setup(context);

    expect(tools).toEqual(['rulers']);
    expect(actions).toEqual([{ id: RULERS_TOOL_ACTION }]);
    expect(locales).toEqual(['en', 'ar']);
  });
});
