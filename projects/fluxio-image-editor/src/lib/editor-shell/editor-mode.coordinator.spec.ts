import { EditorModeCoordinator, type EditorModeClosers } from './editor-mode.coordinator';

function createClosers(calls: string[]): EditorModeClosers {
  const track =
    (name: string) =>
    (): void => {
      calls.push(name);
    };
  return {
    crop: track('crop'),
    rotate: track('rotate'),
    resize: track('resize'),
    adjustments: track('adjustments'),
    effects: track('effects'),
    filters: track('filters'),
    focus: track('focus'),
    redact: track('redact'),
    cropMask: track('cropMask'),
    colorOverlay: track('colorOverlay'),
    fill: track('fill'),
    frame: track('frame'),
    text: track('text'),
    shapes: track('shapes'),
    drawing: track('drawing'),
    path: track('path'),
    imageOverlay: track('imageOverlay'),
    watermark: track('watermark'),
    templates: track('templates'),
    rulers: track('rulers'),
  };
}

describe('EditorModeCoordinator', () => {
  const modes = new EditorModeCoordinator();

  it('closeOthers keeps the target tool open', () => {
    const calls: string[] = [];
    modes.closeOthers('crop', createClosers(calls));
    expect(calls).not.toContain('crop');
    expect(calls).toContain('text');
    expect(calls).toContain('adjustments');
  });

  it('closeAll exits every tool mode', () => {
    const calls: string[] = [];
    modes.closeAll(createClosers(calls));
    expect(calls).toEqual([
      'crop',
      'rotate',
      'resize',
      'adjustments',
      'effects',
      'filters',
      'focus',
      'redact',
      'cropMask',
      'colorOverlay',
      'fill',
      'frame',
      'text',
      'shapes',
      'drawing',
      'path',
      'imageOverlay',
      'watermark',
      'templates',
      'rulers',
    ]);
  });
});
