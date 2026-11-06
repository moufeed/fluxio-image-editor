import {
  OpenPlugin,
  OPEN_FILE_ACTION,
  OPEN_NEW_ACTION,
  resolveOpenConfig,
} from 'fluxio-image-editor/plugins/open';
import type { EditorToolbarAction, ImageEditorPluginContext } from 'fluxio-image-editor/core';

describe('resolveOpenConfig', () => {
  it('applies built-in blank presets when omitted', () => {
    const resolved = resolveOpenConfig();
    expect(resolved.allowUpload).toBe(true);
    expect(resolved.allowBlank).toBe(true);
    expect(resolved.confirmReplace).toBe(true);
    expect(resolved.defaultBlank).toEqual({ width: 1920, height: 1080, fill: '#ffffff' });
    expect(resolved.blankPresets.length).toBe(3);
  });

  it('keeps an explicit empty blankPresets array', () => {
    expect(resolveOpenConfig({ blankPresets: [] }).blankPresets).toEqual([]);
  });
});

describe('OpenPlugin', () => {
  function collectActions(
    options: ConstructorParameters<typeof OpenPlugin>[0] = {},
  ): EditorToolbarAction[] {
    const actions: EditorToolbarAction[] = [];
    const context: ImageEditorPluginContext = {
      registerTool: () => undefined,
      registerCommand: () => undefined,
      registerPanel: () => undefined,
      registerToolbarAction: (action) => {
        actions.push(action);
      },
      registerToolbarGroup: () => undefined,
      registerLocale: () => undefined,
    };
    new OpenPlugin(options).setup(context);
    return actions;
  }

  it('registers open.file and open.new by default', () => {
    const ids = collectActions().map((action) => action.id);
    expect(ids).toEqual([OPEN_FILE_ACTION, OPEN_NEW_ACTION]);
  });

  it('skips Upload when allowUpload is false', () => {
    const ids = collectActions({ allowUpload: false }).map((action) => action.id);
    expect(ids).toEqual([OPEN_NEW_ACTION]);
  });

  it('skips New when allowBlank is false', () => {
    const ids = collectActions({ allowBlank: false }).map((action) => action.id);
    expect(ids).toEqual([OPEN_FILE_ACTION]);
  });
});
