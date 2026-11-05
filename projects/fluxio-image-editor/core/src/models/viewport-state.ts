export interface ViewportState {
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
  readonly fitMode: 'contain' | 'manual';
  readonly width: number;
  readonly height: number;
}

export type ReadonlyViewportState = Readonly<ViewportState>;

export function createEmptyViewport(width = 0, height = 0): ViewportState {
  return {
    zoom: 1,
    panX: 0,
    panY: 0,
    fitMode: 'contain',
    width,
    height,
  };
}
