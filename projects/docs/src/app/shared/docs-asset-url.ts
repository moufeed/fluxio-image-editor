import type { ImageEditorConfig } from 'fluxio-image-editor';

/**
 * Resolve a public asset path for the docs app (local dev and GitHub Pages subpath).
 * Paths must be relative to the deploy root (no leading slash), e.g. `fixtures/sample.jpg`.
 */
export function docsAssetUrl(path: string): string {
  if (!path) {
    return path;
  }
  if (/^(https?:|data:|blob:)/i.test(path)) {
    return path;
  }
  const trimmed = path.replace(/^\/+/, '');
  return new URL(trimmed, document.baseURI).href;
}

/** Rewrite known gallery / overlay src fields for live previews. */
export function withDocsAssetUrls(config: ImageEditorConfig): ImageEditorConfig {
  const mapGallery = <T extends { src?: string }>(items: readonly T[] | undefined) =>
    items?.map((item) => (item.src ? { ...item, src: docsAssetUrl(item.src) } : item));

  return {
    ...config,
    imageOverlay: config.imageOverlay
      ? {
          ...config.imageOverlay,
          gallery: mapGallery(config.imageOverlay.gallery),
        }
      : config.imageOverlay,
    stickers: config.stickers
      ? {
          ...config.stickers,
          gallery: mapGallery(config.stickers.gallery),
        }
      : config.stickers,
    frame: config.frame
      ? {
          ...config.frame,
          gallery: mapGallery(config.frame.gallery),
        }
      : config.frame,
    watermark: config.watermark?.imageSrc
      ? {
          ...config.watermark,
          imageSrc: docsAssetUrl(config.watermark.imageSrc),
        }
      : config.watermark,
  };
}
