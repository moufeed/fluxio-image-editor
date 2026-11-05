export type ImageEditorSource =
  | string
  | File
  | Blob
  | HTMLImageElement
  | { url: string; name?: string };

export interface NormalizedImageAsset {
  readonly id: string;
  readonly objectUrl: string;
  readonly naturalWidth: number;
  readonly naturalHeight: number;
  readonly mimeType?: string;
  readonly name?: string;
  readonly revokeOnDestroy: boolean;
  /** EXIF orientation 1–8; 1 means upright / unknown. */
  readonly exifOrientation: number;
  readonly sourceKind: 'url' | 'blob-url' | 'file' | 'element';
}
