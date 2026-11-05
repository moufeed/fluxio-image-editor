/**
 * Minimal JPEG EXIF Orientation reader (APP1 / TIFF IFD0).
 * Returns 1–8 per EXIF spec, or 1 when orientation is absent/unsupported.
 */
export async function readJpegExifOrientation(source: Blob | ArrayBuffer): Promise<number> {
  const buffer = source instanceof ArrayBuffer ? source : await source.arrayBuffer();
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) {
    return 1;
  }

  let offset = 2;
  while (offset + 4 < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) {
      break;
    }
    const marker = view.getUint8(offset + 1);
    const size = view.getUint16(offset + 2);
    if (marker === 0xe1) {
      return parseExifOrientation(view, offset + 4, size - 2);
    }
    offset += 2 + size;
  }
  return 1;
}

function parseExifOrientation(view: DataView, start: number, length: number): number {
  if (start + 6 > view.byteLength) {
    return 1;
  }
  const header = String.fromCharCode(
    view.getUint8(start),
    view.getUint8(start + 1),
    view.getUint8(start + 2),
    view.getUint8(start + 3),
  );
  if (header !== 'Exif') {
    return 1;
  }

  const tiffStart = start + 6;
  if (tiffStart + 8 > view.byteLength || tiffStart + length > view.byteLength + 4) {
    return 1;
  }

  const endian = view.getUint16(tiffStart);
  const little = endian === 0x4949;
  if (!little && endian !== 0x4d4d) {
    return 1;
  }

  const getUint16 = (pos: number) => view.getUint16(pos, little);
  const getUint32 = (pos: number) => view.getUint32(pos, little);

  if (getUint16(tiffStart + 2) !== 0x002a) {
    return 1;
  }

  const ifdOffset = getUint32(tiffStart + 4);
  const ifdStart = tiffStart + ifdOffset;
  if (ifdStart + 2 > view.byteLength) {
    return 1;
  }

  const entryCount = getUint16(ifdStart);
  for (let i = 0; i < entryCount; i++) {
    const entry = ifdStart + 2 + i * 12;
    if (entry + 12 > view.byteLength) {
      break;
    }
    const tag = getUint16(entry);
    if (tag === 0x0112) {
      const value = getUint16(entry + 8);
      return value >= 1 && value <= 8 ? value : 1;
    }
  }
  return 1;
}

export interface OrientedSize {
  readonly width: number;
  readonly height: number;
  readonly orientation: number;
  readonly swapped: boolean;
}

/**
 * Map EXIF orientation to display size. Pixels are not rewritten here;
 * the renderer applies orientation when loading.
 */
export function applyOrientationToSize(
  width: number,
  height: number,
  orientation: number,
): OrientedSize {
  const swapped = orientation >= 5 && orientation <= 8;
  return {
    width: swapped ? height : width,
    height: swapped ? width : height,
    orientation: orientation >= 1 && orientation <= 8 ? orientation : 1,
    swapped,
  };
}
