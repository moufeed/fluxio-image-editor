import {
  createImageDocument,
  createInitialFill,
  fillEqual,
  isIdentityFill,
  normalizeFill,
  type ImageEditorPluginContext,
} from 'fluxio-image-editor/core';
import {
  applyFill,
  FillPlugin,
  FILL_RESET_COMMAND,
  FILL_SET_COMMAND,
} from 'fluxio-image-editor/plugins/fill';

describe('fill model (PV25)', () => {
  it('creates identity fill by default', () => {
    const fill = createInitialFill();
    expect(fill.mode).toBe('none');
    expect(isIdentityFill(fill)).toBe(true);
  });

  it('normalizes and clamps fill values', () => {
    expect(
      normalizeFill({
        mode: 'solid',
        color: '#ff0000',
        opacity: 2,
        imageSrc: '  ',
      }),
    ).toEqual({
      mode: 'solid',
      color: '#ff0000',
      opacity: 1,
      imageSrc: '',
    });
    // Draft UI may select Image before a src is chosen.
    expect(normalizeFill({ mode: 'image', imageSrc: '' }).mode).toBe('image');
    expect(isIdentityFill({ mode: 'image', imageSrc: '', color: '#fff', opacity: 1 })).toBe(true);
    expect(normalizeFill({ mode: 'nope' as 'solid' }).mode).toBe('none');
  });

  it('applyFill coerces empty image mode to none', () => {
    const base = createImageDocument({
      source: { kind: 'url', id: 'src', url: 'https://example.com/a.png' },
      sourceSize: { width: 100, height: 80 },
    });
    const next = applyFill(base, { mode: 'image', imageSrc: '' });
    expect(next.fill.mode).toBe('none');
    expect(next).toBe(base);
  });

  it('compares fill states and applies document updates', () => {
    const base = createImageDocument({
      source: { kind: 'url', id: 'src', url: 'https://example.com/a.png' },
      sourceSize: { width: 100, height: 80 },
    });
    expect(isIdentityFill(base.fill)).toBe(true);

    const next = applyFill(base, { mode: 'solid', color: '#00ff00', opacity: 0.5 });
    expect(next.fill.mode).toBe('solid');
    expect(next.fill.color).toBe('#00ff00');
    expect(next.fill.opacity).toBe(0.5);
    expect(fillEqual(next.fill, next.fill)).toBe(true);
    expect(applyFill(next, next.fill)).toBe(next);
    expect(applyFill(next, null).fill.mode).toBe('none');
  });
});

describe('FillPlugin', () => {
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

    const plugin = new FillPlugin({ colors: ['#111111'] });
    expect(plugin.id).toBe('fill');
    plugin.setup(context);

    expect(tools).toEqual(['fill']);
    expect(commands).toEqual([FILL_SET_COMMAND, FILL_RESET_COMMAND]);
    expect(actions).toEqual([{ id: 'fill.tool', icon: 'fill' }]);
    expect(locales).toEqual(['en', 'ar']);
    expect(plugin.resolveColors()).toEqual(['#111111']);
  });
});
