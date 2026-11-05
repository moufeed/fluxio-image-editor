/** Fitzpatrick skin-tone modifiers (U+1F3FB–U+1F3FF) for emoji that support them. */
export const EMOJI_SKIN_TONE_MODIFIERS = [
  '', // default / yellow
  '\u{1F3FB}',
  '\u{1F3FC}',
  '\u{1F3FD}',
  '\u{1F3FE}',
  '\u{1F3FF}',
] as const;

export type EmojiSkinToneIndex = 0 | 1 | 2 | 3 | 4 | 5;

/** Max recent emoji glyphs kept in the shell emoji gallery. */
export const RECENT_EMOJIS_LIMIT = 12;

/** Max favorite emoji glyphs. */
export const FAVORITE_EMOJIS_LIMIT = 24;

/** localStorage key for recent emoji history. */
export const RECENT_EMOJIS_STORAGE_KEY = 'fluxio-ie:recent-emojis';

/** localStorage key for favorite emoji glyphs. */
export const FAVORITE_EMOJIS_STORAGE_KEY = 'fluxio-ie:favorite-emojis';

/** localStorage key for preferred Fitzpatrick tone index. */
export const EMOJI_SKIN_TONE_STORAGE_KEY = 'fluxio-ie:emoji-skin-tone';

/** Normalize a glyph string for history / favorites (trim, non-empty). */
export function normalizeEmojiGlyph(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Prepend `glyph` into a recent list (deduped, capped). */
export function pushRecentEmoji(
  current: readonly string[],
  glyph: string,
  limit: number = RECENT_EMOJIS_LIMIT,
): readonly string[] {
  const key = normalizeEmojiGlyph(glyph);
  if (!key) {
    return current;
  }
  const max = Math.max(1, Math.floor(limit));
  return [key, ...current.filter((item) => item !== key)].slice(0, max);
}

/** Toggle `glyph` in a favorites list (add or remove; capped when adding). */
export function toggleFavoriteEmoji(
  current: readonly string[],
  glyph: string,
  limit: number = FAVORITE_EMOJIS_LIMIT,
): readonly string[] {
  const key = normalizeEmojiGlyph(glyph);
  if (!key) {
    return current;
  }
  if (current.includes(key)) {
    return current.filter((item) => item !== key);
  }
  const max = Math.max(1, Math.floor(limit));
  return [key, ...current].slice(0, max);
}

function loadGlyphList(
  storageKey: string,
  limit: number,
  storage: Pick<Storage, 'getItem'> | null | undefined = safeLocalStorage(),
): readonly string[] {
  if (!storage) {
    return [];
  }
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    const out: string[] = [];
    for (const item of parsed) {
      if (typeof item !== 'string') {
        continue;
      }
      const key = normalizeEmojiGlyph(item);
      if (key && !out.includes(key)) {
        out.push(key);
      }
      if (out.length >= limit) {
        break;
      }
    }
    return out;
  } catch {
    return [];
  }
}

function saveGlyphList(
  storageKey: string,
  glyphs: readonly string[],
  limit: number,
  push: (current: readonly string[], glyph: string, limit: number) => readonly string[],
  storage: Pick<Storage, 'setItem'> | null | undefined = safeLocalStorage(),
): void {
  if (!storage) {
    return;
  }
  try {
    let next: readonly string[] = [];
    for (let i = glyphs.length - 1; i >= 0; i -= 1) {
      next = push(next, glyphs[i]!, limit);
    }
    storage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Ignore storage failures — history is progressive UX only.
  }
}

/** Read recent emojis from storage. */
export function loadRecentEmojis(
  storage: Pick<Storage, 'getItem'> | null | undefined = safeLocalStorage(),
): readonly string[] {
  return loadGlyphList(RECENT_EMOJIS_STORAGE_KEY, RECENT_EMOJIS_LIMIT, storage);
}

/** Persist recent emojis. */
export function saveRecentEmojis(
  glyphs: readonly string[],
  storage: Pick<Storage, 'setItem'> | null | undefined = safeLocalStorage(),
): void {
  saveGlyphList(RECENT_EMOJIS_STORAGE_KEY, glyphs, RECENT_EMOJIS_LIMIT, pushRecentEmoji, storage);
}

/** Read favorite emojis from storage. */
export function loadFavoriteEmojis(
  storage: Pick<Storage, 'getItem'> | null | undefined = safeLocalStorage(),
): readonly string[] {
  return loadGlyphList(FAVORITE_EMOJIS_STORAGE_KEY, FAVORITE_EMOJIS_LIMIT, storage);
}

/** Persist favorite emojis. */
export function saveFavoriteEmojis(
  glyphs: readonly string[],
  storage: Pick<Storage, 'setItem'> | null | undefined = safeLocalStorage(),
): void {
  saveGlyphList(
    FAVORITE_EMOJIS_STORAGE_KEY,
    glyphs,
    FAVORITE_EMOJIS_LIMIT,
    (current, glyph, limit) => {
      const key = normalizeEmojiGlyph(glyph);
      if (!key || current.includes(key)) {
        return current;
      }
      return [key, ...current].slice(0, Math.max(1, Math.floor(limit)));
    },
    storage,
  );
}

/** Clamp a tone index to 0–5. */
export function normalizeSkinToneIndex(value: unknown): EmojiSkinToneIndex {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.max(0, Math.min(5, Math.round(n))) as EmojiSkinToneIndex;
}

/** Read preferred skin-tone index (0 = default). */
export function loadEmojiSkinTone(
  storage: Pick<Storage, 'getItem'> | null | undefined = safeLocalStorage(),
): EmojiSkinToneIndex {
  if (!storage) {
    return 0;
  }
  try {
    return normalizeSkinToneIndex(storage.getItem(EMOJI_SKIN_TONE_STORAGE_KEY));
  } catch {
    return 0;
  }
}

/** Persist preferred skin-tone index. */
export function saveEmojiSkinTone(
  index: EmojiSkinToneIndex,
  storage: Pick<Storage, 'setItem'> | null | undefined = safeLocalStorage(),
): void {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(EMOJI_SKIN_TONE_STORAGE_KEY, String(normalizeSkinToneIndex(index)));
  } catch {
    // Ignore storage failures.
  }
}

/**
 * Apply the Fitzpatrick modifier for `toneIndex` onto a base emoji glyph.
 * Non-tone-capable callers should pass the base glyph unchanged via `supportsSkinTone=false`.
 */
export function applyEmojiSkinTone(
  baseEmoji: string,
  toneIndex: EmojiSkinToneIndex | number,
  supportsSkinTone = true,
): string {
  const glyph = normalizeEmojiGlyph(baseEmoji);
  if (!glyph) {
    return '';
  }
  if (!supportsSkinTone) {
    return glyph;
  }
  const index = normalizeSkinToneIndex(toneIndex);
  const modifier = EMOJI_SKIN_TONE_MODIFIERS[index] ?? '';
  // Strip a prior modifier so re-applying is idempotent.
  const stripped = glyph.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '');
  return `${stripped}${modifier}`;
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}
