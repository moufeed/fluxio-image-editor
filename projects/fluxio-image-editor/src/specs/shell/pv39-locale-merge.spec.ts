import { describe, expect, it } from 'vitest';

import {
  LocaleCatalog,
  editorLocalePrimaryTag,
  isRtlEditorLocale,
  resolveHostLocaleMessages,
} from 'fluxio-image-editor/core';

describe('PV39 host locale merge', () => {
  it('merges pack then messages with messages winning', () => {
    const merged = resolveHostLocaleMessages(
      {
        locales: {
          de: {
            'crop.tool': 'Zuschneiden',
            'toolbar.save': 'Speichern',
          },
        },
        messages: {
          'toolbar.save': 'Sichern',
        },
      },
      'de',
    );
    expect(merged).toEqual({
      'crop.tool': 'Zuschneiden',
      'toolbar.save': 'Sichern',
    });
  });

  it('returns null when no host packs or messages', () => {
    expect(resolveHostLocaleMessages(null, 'en')).toBeNull();
    expect(resolveHostLocaleMessages({}, 'en')).toBeNull();
  });

  it('detects RTL locale tags', () => {
    expect(editorLocalePrimaryTag('ar-EG')).toBe('ar');
    expect(isRtlEditorLocale('ar')).toBe(true);
    expect(isRtlEditorLocale('he-IL')).toBe(true);
    expect(isRtlEditorLocale('de')).toBe(false);
  });

  it('applies host messages over built-in and plugin overlays', () => {
    const catalog = new LocaleCatalog('en');
    catalog.registerOverlay('en', { 'toolbar.save': 'Plugin Save' });
    catalog.setHostMessages({ 'toolbar.save': 'Host Save', 'crop.tool': 'Host Crop' });

    expect(catalog.t('toolbar.save')).toBe('Host Save');
    expect(catalog.t('crop.tool')).toBe('Host Crop');
    expect(catalog.t('toolbar.undo')).toBe('Undo');
  });

  it('supports custom locale codes with English fallback', () => {
    const catalog = new LocaleCatalog('de');
    catalog.setHostMessages({ 'crop.tool': 'Zuschneiden' });
    expect(catalog.t('crop.tool')).toBe('Zuschneiden');
    expect(catalog.t('toolbar.undo')).toBe('Undo');
  });

  it('replaces host messages without stacking', () => {
    const catalog = new LocaleCatalog('en');
    catalog.setHostMessages({ 'toolbar.save': 'A' });
    catalog.setHostMessages({ 'toolbar.save': 'B' });
    expect(catalog.t('toolbar.save')).toBe('B');
    catalog.setHostMessages(null);
    expect(catalog.t('toolbar.save')).toBe('Save');
  });
});
