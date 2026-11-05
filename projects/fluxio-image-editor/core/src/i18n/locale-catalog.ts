import type { EditorLocaleCode } from '../models/config';

export type { EditorLocaleCode };

export type MessageDictionary = Readonly<Record<string, string>>;

/** Built-in RTL language tags (BCP 47 primary subtag). */
const RTL_PRIMARY_TAGS = new Set(['ar', 'fa', 'he', 'ur', 'yi', 'dv', 'ps']);

/**
 * Host locale packs keyed by locale code (e.g. `de`, `fr`, `en`).
 * Used with {@link ImageEditorConfig.locales} / {@link resolveHostLocaleMessages}.
 */
export type HostLocalePacks = Readonly<Record<string, MessageDictionary>>;

export interface HostLocaleMergeInput {
  /** Overrides for the active locale (highest priority). */
  readonly messages?: MessageDictionary | null;
  /** Per-locale host packs. */
  readonly locales?: HostLocalePacks | null;
}

/**
 * Merge host locale packs + active-locale `messages`.
 * Order: pack for `locale` → `messages` (messages win on key collision).
 */
export function resolveHostLocaleMessages(
  input: HostLocaleMergeInput | null | undefined,
  locale: string,
): MessageDictionary | null {
  const pack = input?.locales?.[locale];
  const messages = input?.messages;
  if (!pack && !messages) {
    return null;
  }
  if (!pack) {
    return messages ?? null;
  }
  if (!messages) {
    return pack;
  }
  return { ...pack, ...messages };
}

/** Primary language subtag from a BCP 47 / underscore locale tag. */
export function editorLocalePrimaryTag(locale: string): string {
  const normalized = locale.trim().toLowerCase().replace(/_/g, '-');
  const primary = normalized.split('-')[0] ?? normalized;
  return primary;
}

/** Whether `dir: 'auto'` should resolve to RTL for this locale. */
export function isRtlEditorLocale(locale: string): boolean {
  return RTL_PRIMARY_TAGS.has(editorLocalePrimaryTag(locale));
}

export const CORE_MESSAGES_EN: MessageDictionary = {
  'toolbar.undo': 'Undo',
  'toolbar.redo': 'Redo',
  'toolbar.reset': 'Reset',
  'toolbar.close': 'Close',
  'toolbar.save': 'Save',
  'toolbar.compare': 'Compare',
  'toolbar.compareHint': 'Hold to view original; click to pin',
  'toolbar.aria': 'Image editor toolbar',
  'toolbar.tools': 'Editing tools',
  'toolbar.history': 'History',
  'toolbar.historyPanel': 'History',
  'toolbar.annotations': 'Annotate',
  'status.comparing': 'Original',
  'utilibar.aria': 'Image editor utilities',
  'utilibar.tools': 'Editing utilities',
  'controls.aria': 'Tool controls',
  'status.idle': 'Idle',
  'status.loading': 'Loading…',
  'status.ready': 'Ready',
  'status.busy': 'Working…',
  'status.error': 'Error',
  'status.dirty': 'Unsaved',
  'close.unsaved': 'You have unsaved changes. Close anyway?',
  'export.dialogTitle': 'Export image',
  'export.dialogHint': 'Choose format and file name for the edited image.',
  'export.format': 'Format',
  'export.quality': 'Quality',
  'export.fileName': 'File name',
  'export.confirm': 'Export',
  'export.cancel': 'Cancel',
  'crop.free': 'Free',
  'crop.ellipse': 'Ellipse',
  'crop.tool': 'Crop',
  'crop.aspect': 'Aspect',
  'crop.apply': 'Apply crop',
  'crop.cancel': 'Cancel crop',
  'crop.guides': 'Guides',
  'crop.guide.circle': 'Circle',
  'crop.guide.bleed': 'Bleed',
  'transform.rotate': 'Rotate',
  'transform.flipH': 'Flip H',
  'transform.flipV': 'Flip V',
  'transform.resize': 'Resize',
  'transform.resize.presets': 'Size presets',
  'transform.resize.preset.1920x1080': '1920×1080',
  'transform.resize.preset.1280x720': '1280×720',
  'transform.resize.preset.1080x1080': '1080×1080',
  'transform.resize.preset.800x600': '800×600',
  'transform.resize.preset.640x480': '640×480',
  'transform.applyAngle': 'Apply angle',
  'transform.lockRatio': 'Lock ratio',
  'transform.lockImage': 'Lock image',
  'transform.unlockImage': 'Unlock image',
  'transform.imageLocked': 'Image locked',
  'transform.imageUnlocked': 'Image unlocked',
  'transform.done': 'Done',
  'viewport.fit': 'Fit',
  'viewport.fitSize': 'Fit size',
  'viewport.center': 'Center image',
  'viewport.actualSize': 'Actual size',
  'viewport.zoomIn': 'Zoom in',
  'viewport.zoomOut': 'Zoom out',
  'viewport.zoomPercent': 'Zoom percentage',
  'viewport.canvas': 'Image canvas',
  'viewport.canvasInteractive':
    'Image canvas. Arrow keys nudge; Shift+Arrow larger step; Alt+Arrow resizes crop edges; Delete removes. Enter finishes path or adds a redaction. Shift+click adds to selection.',
  'annotation.geometry': 'Geometry',
  'annotation.x': 'X',
  'annotation.y': 'Y',
  'annotation.width': 'W',
  'annotation.height': 'H',
  'annotation.multiSelected': '{count} selected',
  'annotation.bringForward': 'Bring forward',
  'annotation.bringToFront': 'Bring to front',
  'annotation.sendBackward': 'Send backward',
  'annotation.sendToBack': 'Send to back',
  'annotation.duplicate': 'Duplicate',
  'annotation.delete': 'Delete',
  'annotation.edit': 'Edit',
  'annotation.canvasToolbar': 'Selected object actions',
  'annotation.order': 'Order',
  'annotation.actionsMenu': 'Annotation actions',
  'annotation.rotateHandle': 'Rotate',
  'annotation.keyboardHint':
    'Arrows nudge · Shift+Arrows larger · Delete removes · Shift+click multi-select · Right-click for order · Esc cancels gesture',
  'annotation.objects': 'Objects',
  'controls.appearance': 'Appearance',
  'controls.placement': 'Placement',
  'controls.content': 'Content',
  'controls.typography': 'Typography',
  'color.opacity': 'Opacity',
  'color.recent': 'Recent',
  'color.harmony': 'Harmony',
  'export.dialog': 'Export',
  'export.png': 'PNG',
  'export.jpeg': 'JPEG',
  'export.webp': 'WebP',
  'persistence.export': 'Save design',
  'persistence.load': 'Load design',
};

export const CORE_MESSAGES_AR: MessageDictionary = {
  'toolbar.undo': 'تراجع',
  'toolbar.redo': 'إعادة',
  'toolbar.reset': 'إعادة تعيين',
  'toolbar.close': 'إغلاق',
  'toolbar.save': 'حفظ',
  'toolbar.compare': 'مقارنة',
  'toolbar.compareHint': 'اضغط مع الاستمرار لعرض الأصل؛ انقر للتثبيت',
  'toolbar.aria': 'شريط أدوات محرر الصور',
  'toolbar.tools': 'أدوات التحرير',
  'toolbar.history': 'السجل',
  'toolbar.historyPanel': 'السجل',
  'toolbar.annotations': 'تعليق',
  'status.comparing': 'الأصل',
  'utilibar.aria': 'أدوات مساعدة لمحرر الصور',
  'utilibar.tools': 'أدوات التحرير',
  'controls.aria': 'عناصر التحكم بالأداة',
  'status.idle': 'خامل',
  'status.loading': 'جارٍ التحميل…',
  'status.ready': 'جاهز',
  'status.busy': 'جارٍ العمل…',
  'status.error': 'خطأ',
  'status.dirty': 'غير محفوظ',
  'close.unsaved': 'توجد تغييرات غير محفوظة. هل تريد الإغلاق؟',
  'export.dialogTitle': 'تصدير الصورة',
  'export.dialogHint': 'اختر الصيغة واسم الملف للصورة المعدّلة.',
  'export.format': 'الصيغة',
  'export.quality': 'الجودة',
  'export.fileName': 'اسم الملف',
  'export.confirm': 'تصدير',
  'export.cancel': 'إلغاء',
  'crop.free': 'حر',
  'crop.ellipse': 'بيضاوي',
  'crop.tool': 'قص',
  'crop.aspect': 'النسبة',
  'crop.apply': 'تطبيق القص',
  'crop.cancel': 'إلغاء القص',
  'crop.guides': 'أدلة',
  'crop.guide.circle': 'دائرة',
  'crop.guide.bleed': 'هامش',
  'transform.rotate': 'تدوير',
  'transform.flipH': 'قلب أفقي',
  'transform.flipV': 'قلب عمودي',
  'transform.resize': 'تغيير الحجم',
  'transform.resize.presets': 'أحجام جاهزة',
  'transform.resize.preset.1920x1080': '1920×1080',
  'transform.resize.preset.1280x720': '1280×720',
  'transform.resize.preset.1080x1080': '1080×1080',
  'transform.resize.preset.800x600': '800×600',
  'transform.resize.preset.640x480': '640×480',
  'transform.applyAngle': 'تطبيق الزاوية',
  'transform.lockRatio': 'قفل النسبة',
  'transform.lockImage': 'قفل الصورة',
  'transform.unlockImage': 'فتح قفل الصورة',
  'transform.imageLocked': 'الصورة مقفلة',
  'transform.imageUnlocked': 'الصورة غير مقفلة',
  'transform.done': 'تم',
  'viewport.fit': 'ملاءمة',
  'viewport.fitSize': 'ملاءمة الحجم',
  'viewport.center': 'توسيط الصورة',
  'viewport.actualSize': 'الحجم الفعلي',
  'viewport.zoomIn': 'تكبير',
  'viewport.zoomOut': 'تصغير',
  'viewport.zoomPercent': 'نسبة التكبير',
  'viewport.canvas': 'لوحة الصورة',
  'viewport.canvasInteractive':
    'لوحة الصورة. الأسهم للتحريك؛ Shift+الأسهم خطوة أكبر؛ Alt+الأسهم لتغيير حواف القص؛ Delete للحذف. Enter لإنهاء المسار أو إضافة تنقيح. Shift+نقرة للتحديد المتعدد.',
  'annotation.geometry': 'الأبعاد',
  'annotation.x': 'س',
  'annotation.y': 'ص',
  'annotation.width': 'عرض',
  'annotation.height': 'ارتفاع',
  'annotation.multiSelected': '{count} محدد',
  'annotation.bringForward': 'إلى الأمام',
  'annotation.bringToFront': 'إلى المقدمة',
  'annotation.sendBackward': 'إلى الخلف',
  'annotation.sendToBack': 'إلى المؤخرة',
  'annotation.duplicate': 'تكرار',
  'annotation.delete': 'حذف',
  'annotation.edit': 'تحرير',
  'annotation.canvasToolbar': 'إجراءات العنصر المحدد',
  'annotation.order': 'الترتيب',
  'annotation.actionsMenu': 'إجراءات التعليق',
  'annotation.rotateHandle': 'تدوير',
  'annotation.keyboardHint':
    'الأسهم للتحريك · Shift+الأسهم خطوة أكبر · Delete للحذف · Shift+نقرة لتحديد متعدد · انقر بزر الفأرة الأيمن للترتيب · Esc لإلغاء الإيماءة',
  'annotation.objects': 'العناصر',
  'controls.appearance': 'المظهر',
  'controls.placement': 'الموضع',
  'controls.content': 'المحتوى',
  'controls.typography': 'الخط',
  'color.opacity': 'الشفافية',
  'color.recent': 'الأخيرة',
  'color.harmony': 'تناغم',
  'export.dialog': 'تصدير',
  'export.png': 'PNG',
  'export.jpeg': 'JPEG',
  'export.webp': 'WebP',
  'persistence.export': 'حفظ التصميم',
  'persistence.load': 'تحميل التصميم',
};

/**
 * Runtime message catalog.
 *
 * Lookup order for `t(key)`:
 * 1. Host messages (`setHostMessages` / config merge) — highest priority
 * 2. Plugin overlays for the active locale (latest registration wins)
 * 3. Built-in base for the active locale (`en` / `ar`)
 * 4. Built-in English base
 * 5. `fallback` argument, else the key itself
 */
export class LocaleCatalog {
  private readonly overlays = new Map<string, MessageDictionary[]>();
  private hostMessages: MessageDictionary | null = null;

  constructor(
    private locale: EditorLocaleCode = 'en',
    private readonly base: Readonly<Record<string, MessageDictionary>> = {
      en: CORE_MESSAGES_EN,
      ar: CORE_MESSAGES_AR,
    },
  ) {}

  setLocale(locale: EditorLocaleCode): void {
    this.locale = locale;
  }

  getLocale(): EditorLocaleCode {
    return this.locale;
  }

  /**
   * Replaceable host overlay (PV39). Pass `null` / empty to clear.
   * Unlike {@link registerOverlay}, this does not stack across config updates.
   */
  setHostMessages(messages: MessageDictionary | null | undefined): void {
    if (!messages || Object.keys(messages).length === 0) {
      this.hostMessages = null;
      return;
    }
    this.hostMessages = messages;
  }

  getHostMessages(): MessageDictionary | null {
    return this.hostMessages;
  }

  registerOverlay(locale: string, messages: MessageDictionary): void {
    const list = this.overlays.get(locale) ?? [];
    list.push(messages);
    this.overlays.set(locale, list);
  }

  t(key: string, fallback?: string): string {
    const hostValue = this.hostMessages?.[key];
    if (hostValue) {
      return hostValue;
    }
    const overlays = this.overlays.get(this.locale) ?? [];
    for (let i = overlays.length - 1; i >= 0; i--) {
      const value = overlays[i]?.[key];
      if (value) {
        return value;
      }
    }
    return this.base[this.locale]?.[key] ?? this.base['en']?.[key] ?? fallback ?? key;
  }
}
