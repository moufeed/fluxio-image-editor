import type { ImageEditorPluginContext } from 'fluxio-image-editor/core';
import {
  DEFAULT_OPAQUE_WHITE,
  formatCssColor,
  parseCssColor,
  withRgbHex,
  toColorInputValue,
} from 'fluxio-image-editor/core';
import { ColorPickerPlugin } from 'fluxio-image-editor/plugins/color-picker';

describe('ColorPickerPlugin', () => {
  it('registers the color-picker tool and locales (no toolbar action)', () => {
    const tools: string[] = [];
    const actions: string[] = [];
    const locales: string[] = [];
    const context: ImageEditorPluginContext = {
      registerCommand: () => undefined,
      registerTool: (tool) => {
        tools.push(tool.id);
      },
      registerPanel: () => undefined,
      registerToolbarAction: (action) => {
        actions.push(action.id);
      },
      registerToolbarGroup: () => undefined,
      registerLocale: (bundle) => {
        locales.push(bundle.locale);
      },
    };

    const plugin = new ColorPickerPlugin();
    expect(plugin.id).toBe('color-picker');
    plugin.setup(context);

    expect(tools).toEqual(['color-picker']);
    expect(actions).toEqual([]);
    expect(locales).toEqual(['en', 'ar']);
  });

  it('keeps field alpha when applying a sampled RGB', () => {
    const current = 'rgba(10, 20, 30, 0.4)';
    const sample = { r: 255, g: 0, b: 0, a: 1 };
    const hex = toColorInputValue({ ...sample, a: 1 });
    const next = withRgbHex(current, hex, DEFAULT_OPAQUE_WHITE);
    const parsed = parseCssColor(next, DEFAULT_OPAQUE_WHITE);
    expect(parsed.r).toBe(255);
    expect(parsed.g).toBe(0);
    expect(parsed.b).toBe(0);
    expect(parsed.a).toBeCloseTo(0.4, 5);
  });

  it('formats opaque samples as hex', () => {
    expect(formatCssColor({ r: 255, g: 128, b: 0, a: 1 })).toBe('#ff8000');
  });
});
