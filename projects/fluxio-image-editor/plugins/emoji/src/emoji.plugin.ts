import type {
  EmojiGalleryItem,
  EmojiPluginConfig,
  ImageEditorPlugin,
  ImageEditorPluginContext,
} from 'fluxio-image-editor/core';
import { registerAnnotationsToolbarAction } from 'fluxio-image-editor/core';

import { DEFAULT_EMOJI_GALLERY } from './default-emoji-gallery';

export { DEFAULT_EMOJI_GALLERY, EMOJI_CATEGORY_IDS } from './default-emoji-gallery';
export type { EmojiCategoryId } from './default-emoji-gallery';

export const EMOJI_TOOL_ACTION = 'emoji.tool';

/** Stack that prefers color-emoji fonts across platforms. */
export const EMOJI_FONT_FAMILY =
  '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif';

export type EmojiPluginOptions = Partial<EmojiPluginConfig>;

/**
 * Emoji annotations (Tier 3 polish).
 * Places curated emoji glyphs as text annotations; commits go through `text.set`.
 */
export class EmojiPlugin implements ImageEditorPlugin {
  readonly id = 'emoji';
  private readonly gallery: readonly EmojiGalleryItem[];

  constructor(options: EmojiPluginOptions = {}) {
    this.gallery =
      options.gallery && options.gallery.length > 0 ? options.gallery : DEFAULT_EMOJI_GALLERY;
  }

  getGallery(): readonly EmojiGalleryItem[] {
    return this.gallery;
  }

  setup(context: ImageEditorPluginContext): void {
    context.registerTool({
      id: 'emoji',
      label: 'Emoji',
    });

    registerAnnotationsToolbarAction(context, {
      id: EMOJI_TOOL_ACTION,
      label: 'Emoji',
      icon: 'emoji',
      position: 126,
    });

    const categoryAr: Record<string, string> = {
      'emoji.category.smileys': 'وجوه',
      'emoji.category.people': 'أشخاص',
      'emoji.category.animals': 'حيوانات وطبيعة',
      'emoji.category.food': 'طعام وشراب',
      'emoji.category.travel': 'سفر وأماكن',
      'emoji.category.activities': 'أنشطة',
      'emoji.category.objects': 'أشياء',
      'emoji.category.symbols': 'رموز',
    };

    context.registerLocale({
      locale: 'en',
      messages: {
        'emoji.tool': 'Emoji',
        'emoji.done': 'Done',
        'emoji.cancel': 'Cancel',
        'emoji.reset': 'Clear',
        'emoji.gallery': 'Emoji',
        'emoji.search': 'Search',
        'emoji.searchPlaceholder': 'Filter emoji…',
        'emoji.empty': 'Pick an emoji to place on the image',
        'emoji.noGallery': 'No emoji configured',
        'emoji.noResults': 'No matching emoji',
        'emoji.delete': 'Delete',
        'emoji.fontSize': 'Size',
        'emoji.recent': 'Recent',
        'emoji.favorites': 'Favorites',
        'emoji.skinTone': 'Skin tone',
        'emoji.favoriteAdd': 'Add to favorites',
        'emoji.favoriteRemove': 'Remove from favorites',
        'emoji.category.all': 'All',
        'emoji.category.smileys': 'Smileys',
        'emoji.category.people': 'People',
        'emoji.category.animals': 'Animals & nature',
        'emoji.category.food': 'Food & drink',
        'emoji.category.travel': 'Travel & places',
        'emoji.category.activities': 'Activities',
        'emoji.category.objects': 'Objects',
        'emoji.category.symbols': 'Symbols',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'emoji.tool': 'إيموجي',
        'emoji.done': 'تم',
        'emoji.cancel': 'إلغاء',
        'emoji.reset': 'مسح',
        'emoji.gallery': 'إيموجي',
        'emoji.search': 'بحث',
        'emoji.searchPlaceholder': 'تصفية الإيموجي…',
        'emoji.empty': 'اختر إيموجي لوضعه على الصورة',
        'emoji.noGallery': 'لا يوجد إيموجي مُعدّ',
        'emoji.noResults': 'لا يوجد إيموجي مطابق',
        'emoji.delete': 'حذف',
        'emoji.fontSize': 'الحجم',
        'emoji.recent': 'الأخيرة',
        'emoji.favorites': 'المفضلة',
        'emoji.skinTone': 'لون البشرة',
        'emoji.favoriteAdd': 'إضافة إلى المفضلة',
        'emoji.favoriteRemove': 'إزالة من المفضلة',
        'emoji.category.all': 'الكل',
        ...categoryAr,
      },
    });
  }
}
