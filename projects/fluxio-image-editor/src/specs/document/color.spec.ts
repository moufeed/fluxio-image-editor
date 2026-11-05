import { describe, expect, it } from 'vitest';

import {
  alphaPercent,
  DEFAULT_OPAQUE_RED,
  DEFAULT_OPAQUE_WHITE,
  formatCssColor,
  isCssColorTransparent,
  loadRecentColors,
  normalizeRecentColorKey,
  parseCssColor,
  pushRecentColor,
  saveRecentColors,
  toColorInputValue,
  withAlpha,
  withRgbHex,
} from 'fluxio-image-editor/core';

describe('css color helpers', () => {
  it('parses hex6 and hex8', () => {
    expect(parseCssColor('#ff3b30', DEFAULT_OPAQUE_WHITE)).toEqual({
      r: 255,
      g: 59,
      b: 48,
      a: 1,
    });
    expect(parseCssColor('#ff3b3080', DEFAULT_OPAQUE_WHITE).a).toBeCloseTo(128 / 255, 3);
  });

  it('parses rgba and transparent', () => {
    expect(parseCssColor('rgba(10, 20, 30, 0.4)', DEFAULT_OPAQUE_WHITE)).toEqual({
      r: 10,
      g: 20,
      b: 30,
      a: 0.4,
    });
    expect(parseCssColor('transparent', DEFAULT_OPAQUE_RED).a).toBe(0);
  });

  it('formats opaque as hex and translucent as rgba (keeps RGB at a=0)', () => {
    expect(formatCssColor({ r: 255, g: 59, b: 48, a: 1 })).toBe('#ff3b30');
    expect(formatCssColor({ r: 255, g: 59, b: 48, a: 0.5 })).toBe('rgba(255, 59, 48, 0.5)');
    expect(formatCssColor({ r: 255, g: 59, b: 48, a: 0 })).toBe('rgba(255, 59, 48, 0)');
  });

  it('keeps alpha when RGB changes and RGB when alpha changes', () => {
    const base = 'rgba(255, 59, 48, 0.4)';
    expect(withRgbHex(base, '#00ff00', DEFAULT_OPAQUE_RED)).toBe('rgba(0, 255, 0, 0.4)');
    expect(withAlpha('#ff3b30', 0.25, DEFAULT_OPAQUE_RED)).toBe('rgba(255, 59, 48, 0.25)');
    expect(withAlpha('#ff3b30', 0, DEFAULT_OPAQUE_RED)).toBe('rgba(255, 59, 48, 0)');
    expect(withAlpha('rgba(255, 59, 48, 0)', 0.5, DEFAULT_OPAQUE_RED)).toBe(
      'rgba(255, 59, 48, 0.5)',
    );
    expect(toColorInputValue(parseCssColor(base, DEFAULT_OPAQUE_RED))).toBe('#ff3b30');
    expect(alphaPercent(base, DEFAULT_OPAQUE_RED)).toBe(40);
  });

  it('detects transparent colors including rgba a=0', () => {
    expect(isCssColorTransparent('transparent')).toBe(true);
    expect(isCssColorTransparent('rgba(255, 59, 48, 0)')).toBe(true);
    expect(isCssColorTransparent('#ff3b30')).toBe(false);
    expect(isCssColorTransparent('rgba(255, 59, 48, 0.01)')).toBe(false);
  });

  it('pushes recent colors with dedupe and cap', () => {
    expect(normalizeRecentColorKey('rgba(255, 59, 48, 0)')).toBeNull();
    expect(normalizeRecentColorKey('#FF3B30')).toBe('#ff3b30');
    const once = pushRecentColor([], '#ff3b30');
    expect(once).toEqual(['#ff3b30']);
    expect(pushRecentColor(once, '#00ff00')).toEqual(['#00ff00', '#ff3b30']);
    expect(pushRecentColor(['#00ff00', '#ff3b30'], '#ff3b30')).toEqual(['#ff3b30', '#00ff00']);
    const full = pushRecentColor(
      ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666', '#777777', '#888888'],
      '#999999',
    );
    expect(full).toHaveLength(8);
    expect(full[0]).toBe('#999999');
    expect(full).not.toContain('#888888');
  });

  it('loads and saves recent colors via storage adapter', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    expect(loadRecentColors(storage)).toEqual([]);
    saveRecentColors(['#ff3b30', 'rgba(0, 255, 0, 1)', 'transparent'], storage);
    expect(loadRecentColors(storage)).toEqual(['#ff3b30', '#00ff00']);
  });
});