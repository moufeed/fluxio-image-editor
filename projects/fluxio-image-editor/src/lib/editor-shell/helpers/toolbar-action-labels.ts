const ACTION_TRANSLATION_KEYS: Readonly<Record<string, string>> = {
  'transform.rotate-cw': 'transform.rotate',
  'transform.rotate-tool': 'transform.rotate',
  'transform.resize-tool': 'transform.resize',
  'transform.flip-h': 'transform.flipH',
  'transform.flip-v': 'transform.flipV',
  'viewport.fit': 'viewport.fit',
  'viewport.zoomIn': 'viewport.zoomIn',
  'viewport.zoomOut': 'viewport.zoomOut',
  'crop.tool': 'crop.tool',
  'adjustments.tool': 'adjustments.tool',
  'export.dialog': 'export.dialog',
  'batch-export.dialog': 'batch-export.dialog',
  'export.png': 'export.png',
  'export.jpeg': 'export.jpeg',
  'export.webp': 'export.webp',
  'compare.original': 'toolbar.compare',
  'history.panel': 'toolbar.historyPanel',
  'layers.panel': 'toolbar.layersPanel',
  'rulers.tool': 'toolbar.rulers',
  annotations: 'toolbar.annotations',
};

export function toolbarActionTranslationKey(actionId: string): string {
  return ACTION_TRANSLATION_KEYS[actionId] ?? actionId;
}
