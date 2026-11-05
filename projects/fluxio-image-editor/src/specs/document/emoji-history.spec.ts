import {
  applyEmojiSkinTone,
  pushRecentEmoji,
  toggleFavoriteEmoji,
} from 'fluxio-image-editor/core';

describe('emoji history helpers', () => {
  it('applies Fitzpatrick skin tones and strips prior modifiers', () => {
    expect(applyEmojiSkinTone('👍', 0)).toBe('👍');
    expect(applyEmojiSkinTone('👍', 3)).toBe('👍🏽');
    expect(applyEmojiSkinTone('👍🏽', 5)).toBe('👍🏿');
    expect(applyEmojiSkinTone('🔥', 2, false)).toBe('🔥');
  });

  it('pushes recent emojis newest-first and capped', () => {
    const next = pushRecentEmoji(['😀', '🔥'], '👍', 3);
    expect(next).toEqual(['👍', '😀', '🔥']);
    expect(pushRecentEmoji(next, '😀', 3)).toEqual(['😀', '👍', '🔥']);
    expect(pushRecentEmoji(['a', 'b', 'c'], 'd', 3)).toEqual(['d', 'a', 'b']);
  });

  it('toggles favorites', () => {
    expect(toggleFavoriteEmoji([], '👍')).toEqual(['👍']);
    expect(toggleFavoriteEmoji(['👍', '🔥'], '👍')).toEqual(['🔥']);
  });
});
