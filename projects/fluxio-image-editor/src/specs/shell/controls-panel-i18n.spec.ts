import { LocaleCatalog } from 'fluxio-image-editor/core';

describe('Controls panel localization keys', () => {
  it('provides English and Arabic labels for new control section titles', () => {
    const en = new LocaleCatalog('en');
    const ar = new LocaleCatalog('ar');

    expect(en.t('annotation.objects')).toBe('Objects');
    expect(en.t('controls.appearance')).toBe('Appearance');
    expect(en.t('controls.placement')).toBe('Placement');
    expect(en.t('controls.content')).toBe('Content');
    expect(en.t('controls.typography')).toBe('Typography');

    expect(ar.t('annotation.objects')).toBe('العناصر');
    expect(ar.t('controls.appearance')).toBe('المظهر');
    expect(ar.t('controls.placement')).toBe('الموضع');
    expect(ar.t('controls.content')).toBe('المحتوى');
    expect(ar.t('controls.typography')).toBe('الخط');
  });

  it('keeps existing core action labels for Done and arrange', () => {
    const en = new LocaleCatalog('en');
    const ar = new LocaleCatalog('ar');
    expect(en.t('transform.done')).toBe('Done');
    expect(ar.t('transform.done')).toBe('تم');
    expect(en.t('annotation.bringToFront')).toBe('Bring to front');
    expect(ar.t('annotation.bringToFront')).toBe('إلى المقدمة');
    expect(en.t('annotation.order')).toBe('Order');
    expect(ar.t('annotation.order')).toBe('الترتيب');
    expect(en.t('crop.aspect')).toBe('Aspect');
    expect(ar.t('crop.aspect')).toBe('النسبة');
    expect(en.t('crop.free')).toBe('Free');
    expect(ar.t('crop.free')).toBe('حر');
    expect(en.t('crop.ellipse')).toBe('Ellipse');
    expect(ar.t('crop.ellipse')).toBe('بيضاوي');
    expect(en.t('persistence.export')).toBe('Save design');
    expect(ar.t('persistence.export')).toBe('حفظ التصميم');
    expect(en.t('persistence.load')).toBe('Load design');
    expect(ar.t('persistence.load')).toBe('تحميل التصميم');
  });
});
