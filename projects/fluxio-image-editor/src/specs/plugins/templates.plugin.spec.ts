import {
  applyCropDrag,
  createDefaultCrop,
  createImageDocument,
  type EditorCommandHandler,
  type ImageEditorPluginContext,
} from 'fluxio-image-editor/core';
import {
  DEFAULT_TEMPLATE_GALLERY,
  TEMPLATES_APPLY_COMMAND,
  TEMPLATES_TOOL_ACTION,
  TemplatesPlugin,
  designImageForPrimarySlot,
  materializeTemplatePlaceholders,
  materializeTemplateSlots,
  resolvePrimarySlotAspectRatio,
  resolveTemplateAspectRatio,
  templateHasPlaceholders,
  templateHasResizeTarget,
  templateHasSlots,
} from 'fluxio-image-editor/plugins/templates';

describe('TemplatesPlugin', () => {
  it('registers the templates tool action, apply command, and locales', () => {
    const actions: { id: string; icon?: string }[] = [];
    const locales: string[] = [];
    const commands: string[] = [];
    const context: ImageEditorPluginContext = {
      registerCommand: (command: EditorCommandHandler) => {
        commands.push(command.id);
      },
      registerTool: () => undefined,
      registerPanel: () => undefined,
      registerToolbarAction: (action) => {
        actions.push({ id: action.id, icon: action.icon });
      },
      registerToolbarGroup: () => undefined,
      registerLocale: (bundle) => {
        locales.push(bundle.locale);
      },
    };

    const plugin = new TemplatesPlugin();
    expect(plugin.id).toBe('templates');
    plugin.setup(context);

    expect(actions).toEqual([{ id: TEMPLATES_TOOL_ACTION, icon: 'templates' }]);
    expect(commands).toContain(TEMPLATES_APPLY_COMMAND);
    expect(locales).toEqual(['en', 'ar']);
    expect(plugin.getGallery().length).toBeGreaterThan(0);
  });

  it('uses host gallery when provided', () => {
    const gallery = [{ id: 'custom', label: 'Custom', ratio: 1, width: 100, height: 100 }];
    const plugin = new TemplatesPlugin({ gallery });
    expect(plugin.getGallery()).toEqual(gallery);
  });

  it('detects resize targets on default social presets', () => {
    const ig = DEFAULT_TEMPLATE_GALLERY.find((item) => item.id === 'ig-post');
    expect(ig).toBeTruthy();
    expect(templateHasResizeTarget(ig!)).toBe(true);
    const square = DEFAULT_TEMPLATE_GALLERY.find((item) => item.id === 'square');
    expect(square).toBeTruthy();
    expect(templateHasResizeTarget(square!)).toBe(false);
  });

  it('lists Basic before Profile, Collage, and Social last', () => {
    const categories = [...new Set(DEFAULT_TEMPLATE_GALLERY.map((item) => item.category ?? ''))];
    expect(categories[0]).toBe('Basic');
    expect(categories).toContain('Collage');
    expect(categories.at(-1)).toBe('Social');
    expect(DEFAULT_TEMPLATE_GALLERY.some((item) => item.id === 'thumb-1280x720')).toBe(true);
    expect(DEFAULT_TEMPLATE_GALLERY.some((item) => item.id === 'collage-4-grid')).toBe(true);
  });

  it('locks aspect on every default gallery preset', () => {
    const sourceSize = { width: 1200, height: 800 };

    for (const preset of DEFAULT_TEMPLATE_GALLERY) {
      const ratio = resolveTemplateAspectRatio(preset);
      expect(ratio, preset.id).not.toBeNull();
      expect(ratio!, preset.id).toBeGreaterThan(0);

      const crop = createDefaultCrop(sourceSize, ratio, preset.shape ?? 'rect');
      expect(crop.aspectRatio, preset.id).toBeCloseTo(ratio!, 10);
      expect(crop.width / crop.height, `${preset.id} initial`).toBeCloseTo(ratio!, 5);

      const grown = applyCropDrag(
        crop,
        'se',
        { x: crop.x + crop.width, y: crop.y + crop.height },
        { x: crop.x + crop.width + 80, y: crop.y + crop.height + 40 },
        sourceSize,
      );
      expect(grown.aspectRatio, `${preset.id} after drag`).toBeCloseTo(ratio!, 10);
      expect(grown.width / grown.height, `${preset.id} after drag`).toBeCloseTo(ratio!, 5);

      const fromEdge = applyCropDrag(
        crop,
        'e',
        { x: crop.x + crop.width, y: crop.y + crop.height / 2 },
        { x: crop.x + crop.width + 60, y: crop.y + crop.height / 2 + 50 },
        sourceSize,
      );
      expect(fromEdge.width / fromEdge.height, `${preset.id} edge drag`).toBeCloseTo(ratio!, 5);
    }
  });

  it('derives lock from width/height when ratio is omitted', () => {
    const ratio = resolveTemplateAspectRatio({
      id: 'wh-only',
      label: 'WH',
      ratio: null,
      width: 1080,
      height: 1920,
    });
    expect(ratio).toBeCloseTo(1080 / 1920, 10);
  });

  it('flags default presets that ship placeholders', () => {
    const yt = DEFAULT_TEMPLATE_GALLERY.find((item) => item.id === 'yt-thumb');
    const square = DEFAULT_TEMPLATE_GALLERY.find((item) => item.id === 'square');
    expect(templateHasPlaceholders(yt!)).toBe(true);
    expect(templateHasPlaceholders(square!)).toBe(false);
  });

  it('materializes normalized placeholders into output-space annotations', () => {
    const anns = materializeTemplatePlaceholders(
      [
        {
          kind: 'text',
          x: 0.1,
          y: 0.2,
          text: 'Hello',
          fontSize: 0.1,
          boxWidth: 0.5,
          fontWeight: 'bold',
        },
        {
          kind: 'rect',
          x: 0,
          y: 0.8,
          width: 1,
          height: 0.1,
          fill: '#000000',
          stroke: 'transparent',
        },
        {
          kind: 'arrow',
          x1: 0.1,
          y1: 0.5,
          x2: 0.9,
          y2: 0.5,
          stroke: '#ff0000',
          strokeWidth: 4,
        },
      ],
      { width: 1000, height: 500 },
    );
    expect(anns).toHaveLength(3);
    expect(anns[0]).toMatchObject({
      kind: 'text',
      text: 'Hello',
      x: 100,
      y: 100,
      fontSize: 50,
      boxWidth: 500,
      fontWeight: 'bold',
    });
    expect(anns[1]).toMatchObject({
      kind: 'rect',
      x: 0,
      y: 400,
      width: 1000,
      height: 50,
      fill: '#000000',
    });
    expect(anns[2]).toMatchObject({
      kind: 'arrow',
      x1: 100,
      y1: 250,
      x2: 900,
      y2: 250,
      strokeWidth: 4,
      lineEnd: 'arrowSolid',
    });
  });

  it('applies crop, resize, and placeholders in one templates.apply command', () => {
    let applyHandler: EditorCommandHandler | undefined;
    const context: ImageEditorPluginContext = {
      registerCommand: (command) => {
        if (command.id === TEMPLATES_APPLY_COMMAND) {
          applyHandler = command;
        }
      },
      registerTool: () => undefined,
      registerPanel: () => undefined,
      registerLocale: () => undefined,
      registerToolbarAction: () => undefined,
      registerToolbarGroup: () => undefined,
    };
    new TemplatesPlugin().setup(context);
    expect(applyHandler).toBeTruthy();

    const document = createImageDocument({
      source: { kind: 'url', id: 'src', url: 'https://example.com/a.png' },
      sourceSize: { width: 2000, height: 1000 },
    });
    const crop = createDefaultCrop(document.sourceSize, 16 / 9, 'rect');
    const result = applyHandler!.execute(
      {
        crop,
        resizeTo: { width: 1280, height: 720 },
        placeholders: [
          { kind: 'text', x: 0.05, y: 0.8, text: 'Title', fontSize: 0.08, boxWidth: 0.9 },
        ],
      },
      { document },
    );

    expect(result.label).toBe('Apply template');
    expect(result.document.output).toEqual({ width: 1280, height: 720 });
    expect(result.document.annotations).toHaveLength(1);
    expect(result.document.annotations[0]).toMatchObject({
      kind: 'text',
      text: 'Title',
      x: Math.round(1280 * 0.05),
      y: Math.round(720 * 0.8),
    });
  });

  it('detects collage slots on default presets', () => {
    const collage = DEFAULT_TEMPLATE_GALLERY.find((item) => item.id === 'collage-2-h');
    const square = DEFAULT_TEMPLATE_GALLERY.find((item) => item.id === 'square');
    expect(templateHasSlots(collage)).toBe(true);
    expect(templateHasSlots(square)).toBe(false);
    expect(resolvePrimarySlotAspectRatio(collage!)).toBeCloseTo(0.47 / 0.96, 5);
  });

  it('places primary slot via designImage and secondary as placeholders', () => {
    const slots = [
      { id: 'a', x: 0.1, y: 0.1, width: 0.4, height: 0.8 },
      { id: 'b', x: 0.55, y: 0.1, width: 0.35, height: 0.8 },
    ];
    const output = { width: 1000, height: 500 };
    const design = designImageForPrimarySlot(slots, output);
    expect(design).toMatchObject({
      x: 100,
      y: 50,
      width: 400,
      height: 400,
      locked: false,
    });
    const secondary = materializeTemplateSlots(slots, output);
    expect(secondary).toHaveLength(1);
    expect(secondary[0]).toMatchObject({
      kind: 'rect',
      x: 550,
      y: 50,
      width: 350,
      height: 400,
    });
  });

  it('materializes secondary slot images when src is set', () => {
    const anns = materializeTemplateSlots(
      [
        { x: 0, y: 0, width: 0.5, height: 1 },
        { x: 0.5, y: 0, width: 0.5, height: 1, src: 'https://example.com/b.png' },
      ],
      { width: 800, height: 400 },
    );
    expect(anns).toHaveLength(1);
    expect(anns[0]).toMatchObject({
      kind: 'image',
      src: 'https://example.com/b.png',
      x: 400,
      y: 0,
      width: 400,
      height: 400,
    });
  });

  it('applies collage slots in one templates.apply command', () => {
    let applyHandler: EditorCommandHandler | undefined;
    const context: ImageEditorPluginContext = {
      registerCommand: (command) => {
        if (command.id === TEMPLATES_APPLY_COMMAND) {
          applyHandler = command;
        }
      },
      registerTool: () => undefined,
      registerPanel: () => undefined,
      registerLocale: () => undefined,
      registerToolbarAction: () => undefined,
      registerToolbarGroup: () => undefined,
    };
    new TemplatesPlugin().setup(context);

    const document = createImageDocument({
      source: { kind: 'url', id: 'src', url: 'https://example.com/a.png' },
      sourceSize: { width: 2000, height: 1000 },
    });
    const crop = createDefaultCrop(document.sourceSize, 0.47 / 0.96, 'rect');
    const result = applyHandler!.execute(
      {
        crop,
        resizeTo: { width: 1080, height: 1080 },
        slots: [
          { x: 0.02, y: 0.02, width: 0.47, height: 0.96 },
          { x: 0.51, y: 0.02, width: 0.47, height: 0.96 },
        ],
      },
      { document },
    );

    expect(result.label).toBe('Apply collage');
    expect(result.document.output).toEqual({ width: 1080, height: 1080 });
    expect(result.document.designImage).toMatchObject({
      x: Math.round(1080 * 0.02),
      y: Math.round(1080 * 0.02),
      width: Math.round(1080 * 0.47),
      height: Math.round(1080 * 0.96),
      locked: false,
    });
    expect(result.document.annotations).toHaveLength(1);
    expect(result.document.annotations[0].kind).toBe('rect');
  });
});
