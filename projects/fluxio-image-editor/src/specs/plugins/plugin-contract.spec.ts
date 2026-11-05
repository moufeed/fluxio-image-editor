import { PluginRegistry } from 'fluxio-image-editor/core';
import type { ImageEditorPlugin, ImageEditorPluginContext } from 'fluxio-image-editor/core';

describe('ImageEditorPlugin contract (host / external plugins)', () => {
  it('provides renderer-neutral registration hooks only', () => {
    let capturedContext: ImageEditorPluginContext | null = null;
    const plugin: ImageEditorPlugin = {
      id: 'test-host-plugin',
      setup(context) {
        capturedContext = context;
      },
    };

    const registry = new PluginRegistry();
    registry.register(plugin, () => undefined);

    expect(capturedContext).not.toBeNull();
    expect(Object.keys(capturedContext!).sort()).toEqual([
      'registerCommand',
      'registerLocale',
      'registerPanel',
      'registerTool',
      'registerToolbarAction',
      'registerToolbarGroup',
    ]);
  });
});
