import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';

import {
  applyEmojiSkinTone,
  EMOJI_SKIN_TONE_MODIFIERS,
  type EmojiGalleryItem,
  type TextAnnotation,
} from 'fluxio-image-editor/core';
import { EMOJI_CATEGORY_IDS } from 'fluxio-image-editor/plugins/emoji';

import { TextTool } from '../../editor-shell/tools/text.tool';
import { OrderActionsComponent } from '../../chrome/order-actions/order-actions';
import { ObjectInspectorActionsComponent } from '../../chrome/tool-actions/object-inspector-actions';
import { AnnotationControlsBase } from '../annotation-controls-base';

@Component({
  selector: 'fluxio-emoji-controls',
  imports: [DecimalPipe, OrderActionsComponent, ObjectInspectorActionsComponent],
  templateUrl: './emoji-controls.html',
})
export class FluxioEmojiControls extends AnnotationControlsBase {
  private readonly textTool = inject(TextTool);

  protected readonly draftTexts = this.presentation.draftTexts;
  protected readonly selectedTextIds = this.presentation.selectedTextIds;
  protected readonly selectedText = this.presentation.selectedText;
  protected readonly searchQuery = signal('');
  /** `recent` | `` (all) | gallery category id. */
  protected readonly activeCategory = signal('recent');
  protected readonly skinToneModifiers = EMOJI_SKIN_TONE_MODIFIERS;
  protected readonly skinTonePreviewBase = '👍';

  protected readonly showCategoryTabs = computed(
    () =>
      this.presentation.emojiGallery().length > 0 || this.presentation.recentEmojis().length > 0,
  );

  protected readonly categoryTabs = computed((): readonly string[] => {
    const present = new Set<string>();
    for (const item of this.presentation.emojiGallery()) {
      const key = item.category?.trim();
      if (key) {
        present.add(key);
      }
    }
    if (present.size === 0) {
      return [];
    }
    const ordered = EMOJI_CATEGORY_IDS.filter((id) => present.has(id));
    const extras = [...present].filter((id) => !EMOJI_CATEGORY_IDS.includes(id as never)).sort();
    return [...ordered, ...extras];
  });

  protected readonly filteredGallery = computed((): readonly EmojiGalleryItem[] => {
    const query = this.searchQuery().trim().toLowerCase();
    const category = this.activeCategory();

    if (category === 'recent') {
      const items = this.presentation.recentEmojis().map((glyph): EmojiGalleryItem => ({
        id: `recent:${glyph}`,
        emoji: glyph,
        label: glyph,
      }));
      if (!query) {
        return items;
      }
      return items.filter((item) => this.matchesQuery(item, query));
    }

    let gallery = this.presentation.emojiGallery();
    if (category) {
      gallery = gallery.filter((item) => (item.category?.trim() || '') === category);
    }
    if (!query) {
      return gallery;
    }
    return gallery.filter((item) => this.matchesQuery(item, query));
  });

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.searchQuery.set(value);
  }

  protected setCategory(category: string): void {
    this.activeCategory.set(category);
  }

  protected categoryCaption(): string {
    const category = this.activeCategory();
    if (category === 'recent') {
      return this.t('emoji.recent');
    }
    if (!category) {
      return this.t('emoji.category.all');
    }
    return this.categoryLabel(category);
  }

  protected categoryLabel(category: string): string {
    if (category === 'recent') {
      return this.t('emoji.recent');
    }
    const key = `emoji.category.${category}`;
    const translated = this.t(key);
    return translated === key ? category : translated;
  }

  /** Representative glyph for category tabs (emoji-picker style). */
  protected categoryGlyph(category: string): string {
    switch (category) {
      case 'recent':
        return '🕒';
      case '':
        return '✨';
      case 'smileys':
        return '😀';
      case 'people':
        return '👋';
      case 'animals':
        return '🐻';
      case 'food':
        return '🍔';
      case 'travel':
        return '✈️';
      case 'activities':
        return '⚽';
      case 'objects':
        return '💡';
      case 'symbols':
        return '💜';
      default:
        return '📁';
    }
  }

  protected skinTonePreview(index: number): string {
    return applyEmojiSkinTone(this.skinTonePreviewBase, index, true);
  }

  protected applyTonePreview(item: EmojiGalleryItem): string {
    return applyEmojiSkinTone(
      item.emoji,
      this.presentation.emojiSkinTone(),
      !!item.supportsSkinTone,
    );
  }

  protected setSkinTone(index: number): void {
    this.presentation.setEmojiSkinTone(index);
  }

  protected addEmoji(item: EmojiGalleryItem): void {
    const glyph = applyEmojiSkinTone(
      item.emoji,
      this.presentation.emojiSkinTone(),
      !!item.supportsSkinTone,
    );
    this.textTool.addEmoji(glyph);
    this.presentation.rememberEmoji(glyph);
  }

  protected addGlyph(glyph: string): void {
    this.textTool.addEmoji(glyph);
    this.presentation.rememberEmoji(glyph);
  }

  protected toggleFavorite(glyph: string, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.presentation.toggleFavoriteEmoji(glyph);
  }

  protected selectDraftText(id: string, event?: Event): void {
    this.textTool.select(id, event);
  }

  protected deleteDraftText(id: string): void {
    this.textTool.delete(id);
  }

  protected updateSelectedText(patch: Partial<TextAnnotation>): void {
    this.textTool.updateSelected(patch);
  }

  protected commitSelectedTextProps(): void {
    this.textTool.commitSelectedProps();
  }

  protected done(): Promise<void> {
    return this.textTool.done();
  }

  private matchesQuery(item: EmojiGalleryItem, query: string): boolean {
    if (item.label.toLowerCase().includes(query)) {
      return true;
    }
    if (item.emoji.includes(query)) {
      return true;
    }
    if (item.category?.toLowerCase().includes(query)) {
      return true;
    }
    return (item.keywords ?? []).some((keyword) => keyword.toLowerCase().includes(query));
  }
}
