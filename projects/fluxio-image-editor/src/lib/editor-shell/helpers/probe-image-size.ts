export function probeImageSize(
  src: string,
): Promise<{ readonly width: number; readonly height: number } | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      resolve(width > 0 && height > 0 ? { width, height } : null);
    };
    image.onerror = () => resolve(null);
    image.crossOrigin = 'anonymous';
    image.src = src;
  });
}
