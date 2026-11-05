import type { ImageEditorPluginContext } from 'fluxio-image-editor/core';
import {
  HISTORY_PANEL_ACTION,
  HISTORY_PANEL_ID,
  HistorySnapshotsPlugin,
} from 'fluxio-image-editor/plugins/history-snapshots';

describe('HistorySnapshotsPlugin', () => {
  it('registers the history panel, toolbar action, and locales', () => {
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

    const plugin = new HistorySnapshotsPlugin();
    expect(plugin.id).toBe('history-snapshots');
    plugin.setup(context);

    expect(panels).toEqual([HISTORY_PANEL_ID]);
    expect(actions).toEqual([{ id: HISTORY_PANEL_ACTION, surface: 'toolbar' }]);
    expect(locales).toEqual(['en', 'ar']);
  });
});
