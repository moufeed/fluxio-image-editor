import type { ImageEditorPluginContext } from 'fluxio-image-editor/core';
import {
  LAYERS_PANEL_ACTION,
  LAYERS_PANEL_ID,
  LayersPlugin,
} from 'fluxio-image-editor/plugins/layers';

describe('LayersPlugin', () => {
  it('registers the layers panel, toolbar action, and locales', () => {
    const actions: { id: string; surface?: string }[] = [];
    const panels: string[] = [];
    const locales: string[] = [];
    const context: ImageEditorPluginContext = {
      registerCommand: () => undefined,
      registerTool: () => undefined,
      registerPanel: (panel) => {
        panels.push(panel.id);
      },
      registerToolbarAction: (action) => {
        actions.push({ id: action.id, surface: action.surface });
      },
      registerToolbarGroup: () => undefined,
      registerLocale: (bundle) => {
        locales.push(bundle.locale);
      },
    };

    const plugin = new LayersPlugin();
    expect(plugin.id).toBe('layers');
    plugin.setup(context);

    expect(panels).toEqual([LAYERS_PANEL_ID]);
    expect(actions).toEqual([{ id: LAYERS_PANEL_ACTION, surface: 'toolbar' }]);
    expect(locales).toEqual(['en', 'ar']);
  });
});
