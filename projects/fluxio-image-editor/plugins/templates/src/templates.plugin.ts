import type {
  CropState,
  EditorCommandContext,
  EditorCommandResult,
  ImageEditorPlugin,
  ImageEditorPluginContext,
  ImageSize,
  TemplateImageSlot,
  TemplatePlaceholder,
  TemplatePreset,
  TemplatesPluginConfig,
} from 'fluxio-image-editor/core';
import {
  presetHasAutoResizeTarget,
  resolvePresetAspectRatio,
  validateCrop,
  withAnnotations,
} from 'fluxio-image-editor/core';
import { applyCrop } from 'fluxio-image-editor/plugins/crop';

import { materializeTemplatePlaceholders } from './template-placeholders';
import {
  designImageForPrimarySlot,
  materializeTemplateSlots,
  resolvePrimarySlotAspectRatio,
  templateHasSlots,
} from './template-slots';

export const TEMPLATES_TOOL_ACTION = 'templates.tool';
export const TEMPLATES_APPLY_COMMAND = 'templates.apply';

export interface TemplatesApplyPayload {
  readonly crop: CropState;
  /** When set, output is resized after crop (same as `crop.set`). */
  readonly resizeTo?: ImageSize;
  /** Normalized placeholders materialized into annotations after crop/resize. */
  readonly placeholders?: readonly TemplatePlaceholder[];
  /** Collage slots (first → designImage; rest → annotations). */
  readonly slots?: readonly TemplateImageSlot[];
}

/** Built-in common / social / collage output size templates. Category order follows first occurrence. */
export const DEFAULT_TEMPLATE_GALLERY: readonly TemplatePreset[] = [
  // Basic (first)
  {
    id: 'square',
    label: 'Square 1:1',
    category: 'Basic',
    ratio: 1,
  },
  {
    id: 'story-9x16',
    label: 'Story 9:16',
    category: 'Basic',
    ratio: 9 / 16,
  },
  {
    id: 'widescreen',
    label: 'Widescreen 16:9',
    category: 'Basic',
    ratio: 16 / 9,
  },
  {
    id: 'landscape-4x3',
    label: 'Landscape 4:3',
    category: 'Basic',
    ratio: 4 / 3,
  },
  {
    id: 'portrait-3x4',
    label: 'Portrait 3:4',
    category: 'Basic',
    ratio: 3 / 4,
  },
  {
    id: 'portrait-2x3',
    label: 'Portrait 2:3',
    category: 'Basic',
    ratio: 2 / 3,
  },
  {
    id: 'thumb-1280x720',
    label: 'Thumbnail',
    category: 'Basic',
    ratio: 16 / 9,
    width: 1280,
    height: 720,
  },
  {
    id: 'thumb-1920x1080',
    label: 'HD Thumbnail',
    category: 'Basic',
    ratio: 16 / 9,
    width: 1920,
    height: 1080,
  },
  {
    id: 'banner-3x1',
    label: 'Banner 3:1',
    category: 'Basic',
    ratio: 3,
    width: 1500,
    height: 500,
  },
  // Profile
  {
    id: 'avatar-180',
    label: 'Avatar 180×180',
    category: 'Profile',
    ratio: 1,
    width: 180,
    height: 180,
  },
  // Collage
  {
    id: 'collage-2-h',
    label: '2-up Horizontal',
    category: 'Collage',
    ratio: 1,
    width: 1080,
    height: 1080,
    slots: [
      { id: 'left', x: 0.02, y: 0.02, width: 0.47, height: 0.96 },
      { id: 'right', x: 0.51, y: 0.02, width: 0.47, height: 0.96 },
    ],
  },
  {
    id: 'collage-2-v',
    label: '2-up Vertical',
    category: 'Collage',
    ratio: 1,
    width: 1080,
    height: 1080,
    slots: [
      { id: 'top', x: 0.02, y: 0.02, width: 0.96, height: 0.47 },
      { id: 'bottom', x: 0.02, y: 0.51, width: 0.96, height: 0.47 },
    ],
  },
  {
    id: 'collage-3-left',
    label: '3-up Featured Left',
    category: 'Collage',
    ratio: 1,
    width: 1080,
    height: 1080,
    slots: [
      { id: 'main', x: 0.02, y: 0.02, width: 0.62, height: 0.96 },
      { id: 'top-right', x: 0.66, y: 0.02, width: 0.32, height: 0.47 },
      { id: 'bottom-right', x: 0.66, y: 0.51, width: 0.32, height: 0.47 },
    ],
  },
  {
    id: 'collage-4-grid',
    label: '4-up Grid',
    category: 'Collage',
    ratio: 1,
    width: 1080,
    height: 1080,
    slots: [
      { id: 'tl', x: 0.02, y: 0.02, width: 0.47, height: 0.47 },
      { id: 'tr', x: 0.51, y: 0.02, width: 0.47, height: 0.47 },
      { id: 'bl', x: 0.02, y: 0.51, width: 0.47, height: 0.47 },
      { id: 'br', x: 0.51, y: 0.51, width: 0.47, height: 0.47 },
    ],
  },
  // Social (last)
  {
    id: 'ig-post',
    label: 'Instagram Post',
    category: 'Social',
    ratio: 1,
    width: 1080,
    height: 1080,
  },
  {
    id: 'ig-story',
    label: 'Instagram Story',
    category: 'Social',
    ratio: 9 / 16,
    width: 1080,
    height: 1920,
    placeholders: [
      {
        kind: 'text',
        x: 0.08,
        y: 0.08,
        text: 'Your story',
        fontSize: 0.07,
        fontWeight: 'bold',
        fill: '#ffffff',
        textAlign: 'left',
        boxWidth: 0.84,
      },
      {
        kind: 'rect',
        x: 0.08,
        y: 0.16,
        width: 0.28,
        height: 0.008,
        fill: '#ffffff',
        stroke: 'transparent',
        strokeWidth: 0,
      },
    ],
  },
  {
    id: 'ig-landscape',
    label: 'Instagram Landscape',
    category: 'Social',
    ratio: 1.91,
    width: 1080,
    height: 566,
  },
  {
    id: 'fb-post',
    label: 'Facebook Post',
    category: 'Social',
    ratio: 1200 / 630,
    width: 1200,
    height: 630,
  },
  {
    id: 'fb-cover',
    label: 'Facebook Cover',
    category: 'Social',
    ratio: 820 / 312,
    width: 820,
    height: 312,
  },
  {
    id: 'x-post',
    label: 'X / Twitter Post',
    category: 'Social',
    ratio: 16 / 9,
    width: 1200,
    height: 675,
  },
  {
    id: 'x-header',
    label: 'X / Twitter Header',
    category: 'Social',
    ratio: 3,
    width: 1500,
    height: 500,
  },
  {
    id: 'yt-thumb',
    label: 'YouTube Thumbnail',
    category: 'Social',
    ratio: 16 / 9,
    width: 1280,
    height: 720,
    placeholders: [
      {
        kind: 'rect',
        x: 0.04,
        y: 0.72,
        width: 0.92,
        height: 0.22,
        fill: 'rgba(0,0,0,0.55)',
        stroke: 'transparent',
        strokeWidth: 0,
      },
      {
        kind: 'text',
        x: 0.06,
        y: 0.76,
        text: 'Video title',
        fontSize: 0.08,
        fontWeight: 'bold',
        fill: '#ffffff',
        textAlign: 'left',
        boxWidth: 0.88,
      },
    ],
  },
  {
    id: 'li-post',
    label: 'LinkedIn Post',
    category: 'Social',
    ratio: 1200 / 627,
    width: 1200,
    height: 627,
  },
  {
    id: 'pin',
    label: 'Pinterest Pin',
    category: 'Social',
    ratio: 2 / 3,
    width: 1000,
    height: 1500,
  },
];

export type TemplatesPluginOptions = Partial<TemplatesPluginConfig>;

/**
 * Output size / crop templates (social presets, print sizes, collages, host galleries).
 * Orchestrates existing crop + optional resize — no new document fields.
 */
export class TemplatesPlugin implements ImageEditorPlugin {
  readonly id = 'templates';
  private readonly gallery: readonly TemplatePreset[];

  constructor(options: TemplatesPluginOptions = {}) {
    this.gallery =
      options.gallery && options.gallery.length > 0
        ? options.gallery
        : DEFAULT_TEMPLATE_GALLERY;
  }

  getGallery(): readonly TemplatePreset[] {
    return this.gallery;
  }

  setup(context: ImageEditorPluginContext): void {
    context.registerTool({
      id: 'templates',
      label: 'Templates',
    });

    context.registerCommand({
      id: TEMPLATES_APPLY_COMMAND,
      execute: (payload: TemplatesApplyPayload, ctx: EditorCommandContext): EditorCommandResult => {
        const result = validateCrop(payload.crop, ctx.document.sourceSize);
        if (!result.valid || !result.crop) {
          throw new Error(result.reason ?? 'Invalid crop');
        }
        const resized = payload.resizeTo
          ? {
              width: Math.max(1, Math.round(payload.resizeTo.width)),
              height: Math.max(1, Math.round(payload.resizeTo.height)),
            }
          : undefined;
        let document = applyCrop(ctx.document, result.crop, { resizeTo: resized });

        const slots = payload.slots;
        const isCollage = Array.isArray(slots) && slots.length >= 2;
        if (isCollage) {
          const primary = designImageForPrimarySlot(slots, document.output);
          if (primary) {
            document = { ...document, designImage: primary };
          }
        }

        const slotAnnotations = isCollage
          ? materializeTemplateSlots(slots, document.output)
          : [];
        const placeholders = materializeTemplatePlaceholders(
          payload.placeholders,
          document.output,
        );
        const appended = [...slotAnnotations, ...placeholders];
        if (appended.length > 0) {
          document = withAnnotations(document, [...document.annotations, ...appended]);
        }

        return {
          document,
          label: isCollage
            ? 'Apply collage'
            : placeholders.length > 0
              ? 'Apply template'
              : resized
                ? 'Crop and resize'
                : 'Crop',
        };
      },
    });

    context.registerToolbarAction({
      id: TEMPLATES_TOOL_ACTION,
      label: 'Templates',
      icon: 'templates',
      position: 110,
    });

    context.registerLocale({
      locale: 'en',
      messages: {
        'templates.tool': 'Templates',
        'templates.done': 'Done',
        'templates.apply': 'Apply template',
        'templates.cancel': 'Cancel',
        'templates.gallery': 'Sizes',
        'templates.empty': 'Pick a size template',
        'templates.adjust': 'Drag or resize the crop frame (like Crop), then Apply',
        'templates.adjustCollage':
          'Frame the photo for the first collage slot, then Apply. Other slots stay empty until you add images.',
        'templates.noGallery': 'No templates configured',
        'templates.applied': 'Template applied',
        'templates.hasPlaceholders': 'Includes text / shapes',
        'templates.hasSlots': 'Collage',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'templates.tool': 'قوالب',
        'templates.done': 'تم',
        'templates.apply': 'تطبيق القالب',
        'templates.cancel': 'إلغاء',
        'templates.gallery': 'الأحجام',
        'templates.empty': 'اختر قالباً للحجم',
        'templates.adjust': 'اسحب أو غيّر حجم إطار القص ثم طبّق',
        'templates.adjustCollage':
          'حدّد إطار الصورة للخانة الأولى ثم طبّق. باقي الخانات تبقى فارغة حتى تضيف صوراً.',
        'templates.noGallery': 'لا توجد قوالب مُعدّة',
        'templates.applied': 'تم تطبيق القالب',
        'templates.hasPlaceholders': 'يتضمن نصاً / أشكالاً',
        'templates.hasSlots': 'كولاج',
      },
    });
  }
}

/** Resolve aspect lock for a template (mirrors crop presets). */
export function resolveTemplateAspectRatio(preset: TemplatePreset): number | null {
  return resolvePresetAspectRatio(preset);
}

/** True when the template defines an explicit output size. */
export function templateHasResizeTarget(preset: TemplatePreset): boolean {
  return presetHasAutoResizeTarget(preset);
}

/** True when the template will append placeholder annotations on apply. */
export function templateHasPlaceholders(preset: TemplatePreset): boolean {
  return Array.isArray(preset.placeholders) && preset.placeholders.length > 0;
}

export { materializeTemplatePlaceholders } from './template-placeholders';
export {
  designImageForPrimarySlot,
  materializeTemplateSlots,
  resolvePrimarySlotAspectRatio,
  templateHasSlots,
} from './template-slots';
