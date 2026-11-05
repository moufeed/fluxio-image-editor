import { DEFAULT_EMOJI_GALLERY, EMOJI_CATEGORY_IDS } from 'fluxio-image-editor/plugins/emoji';

describe('DEFAULT_EMOJI_GALLERY (EM03)', () => {
  it('assigns every item a known category and unique id', () => {
    const ids = new Set<string>();
    for (const item of DEFAULT_EMOJI_GALLERY) {
      expect(item.category).toBeTruthy();
      expect(EMOJI_CATEGORY_IDS).toContain(item.category);
      expect(ids.has(item.id)).toBe(false);
      ids.add(item.id);
    }
    expect(ids.size).toBeGreaterThan(200);
  });

  it('covers all built-in category tabs', () => {
    const present = new Set(DEFAULT_EMOJI_GALLERY.map((item) => item.category));
    for (const id of EMOJI_CATEGORY_IDS) {
      expect(present.has(id)).toBe(true);
    }
  });
});
