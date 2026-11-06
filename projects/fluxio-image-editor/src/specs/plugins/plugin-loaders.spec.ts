import {
  ALL_EDITOR_PLUGIN_IDS,
  ALWAYS_ON_EDITOR_PLUGIN_IDS,
  ANNOTATION_EDITOR_PLUGIN_IDS,
  OPTIONAL_EDITOR_PLUGIN_IDS,
  expandEditorPluginRequestIds,
  resolveRequestedPluginIds,
  usesLazyPluginLoading,
  type ImageEditorConfig,
} from 'fluxio-image-editor/core';

describe('resolveRequestedPluginIds', () => {
  it('returns all plugins when config.plugins is omitted', () => {
    expect(resolveRequestedPluginIds({})).toEqual(ALL_EDITOR_PLUGIN_IDS);
  });

  it('merges always-on plugins with an explicit host list', () => {
    const ids = resolveRequestedPluginIds({ plugins: ['crop', 'transform'] });
    expect(ids).toContain('viewport');
    expect(ids).toContain('transform');
    expect(ids).toContain('export');
    expect(ids).toContain('crop');
    expect(ids).not.toContain('text');
    expect(ids).not.toContain('watermark');
  });

  it('includes optional plugins listed by the host', () => {
    const ids = resolveRequestedPluginIds({ plugins: ['text', 'watermark'] });
    expect(ids).toContain('text');
    expect(ids).toContain('watermark');
    for (const id of ALWAYS_ON_EDITOR_PLUGIN_IDS) {
      expect(ids).toContain(id);
    }
  });

  it('expands the annotations group alias to concrete plugins', () => {
    const ids = resolveRequestedPluginIds({ plugins: ['annotations'] });
    for (const id of ANNOTATION_EDITOR_PLUGIN_IDS) {
      expect(ids).toContain(id);
    }
    expect(ids).not.toContain('annotations' as never);
    expect(ids).not.toContain('watermark');
    expect(ids).not.toContain('filters');
  });

  it('includes the path plugin as a concrete id', () => {
    const ids = resolveRequestedPluginIds({ plugins: ['path'] });
    expect(ids).toContain('path');
    expect(ids).not.toContain('drawing');
    expect(ids).not.toContain('text');
  });

  it('auto-includes text when emoji is requested', () => {
    const ids = resolveRequestedPluginIds({ plugins: ['emoji'] });
    expect(ids).toContain('emoji');
    expect(ids).toContain('text');
  });

  it('dedupes annotations with individually listed members', () => {
    const ids = resolveRequestedPluginIds({
      plugins: ['path', 'drawing', 'annotations', 'text'],
    });
    expect(ids.filter((id) => id === 'drawing')).toEqual(['drawing']);
    expect(ids.filter((id) => id === 'path')).toEqual(['path']);
    expect(
      new Set(ids.filter((id) => (ANNOTATION_EDITOR_PLUGIN_IDS as readonly string[]).includes(id))),
    ).toEqual(new Set(ANNOTATION_EDITOR_PLUGIN_IDS));
  });

  it('rejects unknown plugin ids', () => {
    expect(() => resolveRequestedPluginIds({ plugins: ['not-a-plugin' as 'crop'] })).toThrow(
      /Unknown editor plugin id/,
    );
  });
});

describe('expandEditorPluginRequestIds', () => {
  it('leaves concrete ids unchanged', () => {
    expect(expandEditorPluginRequestIds(['text', 'crop'])).toEqual(['text', 'crop']);
  });

  it('expands annotations to the annotation plugin set', () => {
    expect(expandEditorPluginRequestIds(['annotations'])).toEqual([
      ...ANNOTATION_EDITOR_PLUGIN_IDS,
    ]);
  });

  it('leaves path as a concrete plugin id', () => {
    expect(expandEditorPluginRequestIds(['path'])).toEqual(['path']);
  });
});

describe('usesLazyPluginLoading', () => {
  it('is false when plugins config is omitted', () => {
    expect(usesLazyPluginLoading({})).toBe(false);
  });

  it('is true when plugins config is provided', () => {
    expect(usesLazyPluginLoading({ plugins: ['text'] })).toBe(true);
  });

  it('is true when a host alias is provided', () => {
    expect(usesLazyPluginLoading({ plugins: ['annotations'] })).toBe(true);
  });
});

describe('plugin id catalogs', () => {
  it('covers every first-party plugin exactly once', () => {
    const merged = [...ALWAYS_ON_EDITOR_PLUGIN_IDS, ...OPTIONAL_EDITOR_PLUGIN_IDS];
    expect(new Set(merged).size).toBe(merged.length);
    expect(merged.length).toBe(ALL_EDITOR_PLUGIN_IDS.length);
    expect(new Set(ALL_EDITOR_PLUGIN_IDS)).toEqual(new Set(merged));
  });

  it('lists annotation plugins as optional members', () => {
    for (const id of ANNOTATION_EDITOR_PLUGIN_IDS) {
      expect(OPTIONAL_EDITOR_PLUGIN_IDS).toContain(id);
    }
  });
});

describe('resolveEditorPlugins', () => {
  it('loads the default static plugin set when plugins config is omitted', async () => {
    const { resolveEditorPlugins } = await import('../../lib/plugins/plugin-loaders');
    const plugins = await resolveEditorPlugins({}, 90);
    const ids = plugins.map((plugin) => plugin.id).sort();
    expect(ids).toEqual([...ALL_EDITOR_PLUGIN_IDS].sort());
  });

  it('loads only requested optional plugins on the lazy path', async () => {
    const config: ImageEditorConfig = { plugins: ['crop', 'transform'] };
    const { resolveLazyPlugins } = await import('../../lib/plugins/plugin-loaders-lazy');
    const plugins = await resolveLazyPlugins(config, 90);
    const ids = new Set(plugins.map((plugin) => plugin.id));
    for (const id of ALWAYS_ON_EDITOR_PLUGIN_IDS) {
      expect(ids.has(id)).toBe(true);
    }
    for (const id of OPTIONAL_EDITOR_PLUGIN_IDS) {
      expect(ids.has(id)).toBe(false);
    }
  });

  it('loads the path plugin when requested', async () => {
    const config: ImageEditorConfig = { plugins: ['path'] };
    const { resolveLazyPlugins } = await import('../../lib/plugins/plugin-loaders-lazy');
    const plugins = await resolveLazyPlugins(config, 90);
    const ids = new Set(plugins.map((plugin) => plugin.id));
    expect(ids.has('path')).toBe(true);
    expect(ids.has('drawing')).toBe(false);
    expect(ids.has('text')).toBe(false);
  });

  it('loads the open plugin when requested', async () => {
    const config: ImageEditorConfig = { plugins: ['open'] };
    const { resolveLazyPlugins } = await import('../../lib/plugins/plugin-loaders-lazy');
    const plugins = await resolveLazyPlugins(config, 90);
    const ids = new Set(plugins.map((plugin) => plugin.id));
    expect(ids.has('open')).toBe(true);
  });

  it('loads all annotation plugins when the group alias is requested', async () => {
    const config: ImageEditorConfig = { plugins: ['annotations'] };
    const { resolveLazyPlugins } = await import('../../lib/plugins/plugin-loaders-lazy');
    const plugins = await resolveLazyPlugins(config, 90);
    const ids = new Set(plugins.map((plugin) => plugin.id));
    for (const id of ANNOTATION_EDITOR_PLUGIN_IDS) {
      expect(ids.has(id)).toBe(true);
    }
    expect(ids.has('watermark')).toBe(false);
    expect(ids.has('filters')).toBe(false);
  });

  it('uses host plugin instances when provided', async () => {
    const { AdjustmentsPlugin } = await import('fluxio-image-editor/plugins/adjustments');
    const { FiltersPlugin } = await import('fluxio-image-editor/plugins/filters');
    const { resolveEditorPlugins } = await import('../../lib/plugins/plugin-loaders');
    const hostPlugins = [new AdjustmentsPlugin(), new FiltersPlugin()];
    const plugins = await resolveEditorPlugins({}, 90, hostPlugins);
    const ids = new Set(plugins.map((plugin) => plugin.id));
    expect(ids.has('adjustments')).toBe(true);
    expect(ids.has('filters')).toBe(true);
    expect(ids.has('text')).toBe(false);
    for (const id of ALWAYS_ON_EDITOR_PLUGIN_IDS) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it('appends host-only custom plugins onto the full built-in set', async () => {
    const { resolveEditorPlugins } = await import('../../lib/plugins/plugin-loaders');
    const hostPlugins = [
      {
        id: 'host-save',
        setup: () => undefined,
      },
    ];
    const plugins = await resolveEditorPlugins({}, 90, hostPlugins);
    const ids = plugins.map((plugin) => plugin.id);
    expect(ids).toContain('host-save');
    expect(ids).toContain('text');
    expect(ids.filter((id) => id === 'host-save')).toEqual(['host-save']);
    expect(new Set(ids)).toEqual(new Set([...ALL_EDITOR_PLUGIN_IDS, 'host-save']));
  });

  it('rejects always-on plugins passed via host instances', async () => {
    const { CropPlugin } = await import('fluxio-image-editor/plugins/crop');
    const { resolveEditorPlugins } = await import('../../lib/plugins/plugin-loaders');
    await expect(resolveEditorPlugins({}, 90, [new CropPlugin()])).rejects.toThrow(/always-on/);
  });
});
