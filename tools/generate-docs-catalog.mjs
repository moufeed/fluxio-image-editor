/**
 * Converts docs/site content.js → Angular TypeScript catalog.
 * Run: node tools/generate-docs-catalog.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentPath = join(root, 'docs/site/assets/content.js');
const outDir = join(root, 'projects/docs/src/app/catalog');
const outPath = join(outDir, 'docs-content.ts');

const sandbox = { window: {} };
vm.runInNewContext(readFileSync(contentPath, 'utf8'), sandbox, { filename: 'content.js' });

const DOCS_NAV = sandbox.window.DOCS_NAV;
const DOCS_PAGES = sandbox.window.DOCS_PAGES;

/** Live preview defaults for Angular docs pages. */
const LIVE = {
  'getting-started': { plugins: undefined, defaultTool: undefined, theme: 'light' },
  configuration: { plugins: ['adjustments', 'filters', 'annotations'], defaultTool: 'crop', theme: 'light' },
  'theming-layout': { plugins: ['adjustments'], defaultTool: undefined, theme: 'dark' },
  'plugins-lazy': { plugins: ['adjustments', 'filters', 'annotations'], defaultTool: undefined, theme: 'light' },
  'events-handle': { plugins: ['adjustments'], defaultTool: undefined, theme: 'light' },
  'i18n-rtl': { plugins: ['crop'], defaultTool: 'crop', theme: 'light', locale: 'ar', dir: 'auto' },
  'csp-security': { plugins: [], defaultTool: undefined, theme: 'light' },
  viewport: { plugins: [], defaultTool: undefined, theme: 'dark' },
  transform: { plugins: [], defaultTool: undefined, theme: 'dark' },
  crop: {
    plugins: [],
    defaultTool: 'crop',
    theme: 'dark',
    crop: { guides: { profileCircle: true, bleed: 0.05 } },
  },
  export: { plugins: [], defaultTool: undefined, theme: 'dark' },
  adjustments: { plugins: ['adjustments'], defaultTool: 'adjustments', theme: 'dark' },
  effects: { plugins: ['effects'], defaultTool: 'effects', theme: 'dark' },
  filters: { plugins: ['filters'], defaultTool: 'filters', theme: 'dark' },
  focus: { plugins: ['focus'], defaultTool: 'focus', theme: 'dark' },
  redact: { plugins: ['redact'], defaultTool: 'redact', theme: 'dark' },
  'crop-mask': {
    plugins: ['crop-mask'],
    defaultTool: 'crop-mask',
    theme: 'dark',
    cropMask: {
      gallery: [
        {
          id: 'docs-shield',
          label: 'Shield',
          path: 'M0.5 0.06 L0.88 0.2 L0.88 0.48 C0.88 0.72 0.7 0.9 0.5 0.96 C0.3 0.9 0.12 0.72 0.12 0.48 L0.12 0.2 Z',
        },
      ],
    },
  },
  'color-overlay': { plugins: ['color-overlay'], defaultTool: 'color-overlay', theme: 'dark' },
  frame: { plugins: ['frame'], defaultTool: 'frame', theme: 'dark' },
  text: { plugins: ['text'], defaultTool: 'text', theme: 'dark' },
  shapes: { plugins: ['shapes'], defaultTool: 'shapes', theme: 'dark' },
  drawing: { plugins: ['drawing'], defaultTool: 'drawing', theme: 'dark' },
  path: { plugins: ['path'], defaultTool: 'path', theme: 'dark' },
  'image-overlay': {
    plugins: ['image-overlay'],
    defaultTool: 'image-overlay',
    theme: 'dark',
    imageOverlay: { gallery: [{ id: 'sample', label: 'Sample', src: 'fixtures/sample.jpg' }] },
  },
  stickers: {
    plugins: ['stickers'],
    defaultTool: 'stickers',
    theme: 'dark',
    stickers: { allowUpload: true },
  },
  emoji: { plugins: ['emoji'], defaultTool: 'emoji', theme: 'dark' },
  watermark: {
    plugins: ['watermark'],
    defaultTool: 'watermark',
    theme: 'dark',
    watermark: { defaultText: '© FLUXIO Docs' },
  },
  templates: { plugins: ['templates'], defaultTool: 'templates', theme: 'dark' },
  persistence: { plugins: ['persistence'], defaultTool: undefined, theme: 'dark' },
  compare: { plugins: ['compare', 'adjustments'], defaultTool: 'adjustments', theme: 'dark' },
  'history-snapshots': { plugins: ['history-snapshots', 'adjustments'], defaultTool: 'adjustments', theme: 'dark' },
  layers: { plugins: ['layers', 'annotations'], defaultTool: 'text', theme: 'dark' },
  'color-picker': { plugins: ['color-picker', 'text', 'frame'], defaultTool: 'text', theme: 'dark' },
  'batch-export': { plugins: ['batch-export'], defaultTool: undefined, theme: 'dark' },
};

for (const [id, page] of Object.entries(DOCS_PAGES)) {
  page.live = LIVE[id] ?? { plugins: [], theme: 'dark' };
  // Drop HTML-only preview payloads; Angular uses live editor + typed helpers
  if (page.preview && typeof page.preview === 'object') {
    page.previewKind = page.preview.type;
  }
  delete page.preview;
}

mkdirSync(outDir, { recursive: true });

const types = `/** Auto-generated from docs/site — do not edit by hand. Re-run tools/generate-docs-catalog.mjs */
import type { EditorPluginRequestId, ImageEditorConfig } from 'fluxio-image-editor';

export interface DocsNavItem {
  readonly id: string;
  readonly label: string;
}

export interface DocsNavGroup {
  readonly title: string;
  readonly items: readonly DocsNavItem[];
}

export interface DocsCodeBlock {
  readonly lang?: string;
  readonly label?: string;
  readonly code?: string;
  readonly note?: string;
}

export interface DocsApiSection {
  readonly id: string;
  readonly title: string;
  readonly body?: string;
  readonly list?: readonly string[];
  readonly callout?: { readonly tone?: string; readonly title: string; readonly body: string };
  readonly table?: { readonly headers: readonly string[]; readonly rows: readonly (readonly string[])[] };
  readonly example?: { readonly lang?: string; readonly label?: string; readonly code: string };
}

export interface DocsLivePreview {
  readonly plugins?: readonly EditorPluginRequestId[] | undefined;
  readonly defaultTool?: string;
  readonly theme?: ImageEditorConfig['theme'];
  readonly locale?: ImageEditorConfig['locale'];
  readonly dir?: ImageEditorConfig['dir'];
  readonly imageOverlay?: ImageEditorConfig['imageOverlay'];
  readonly stickers?: ImageEditorConfig['stickers'];
  readonly watermark?: ImageEditorConfig['watermark'];
  readonly emoji?: ImageEditorConfig['emoji'];
  readonly templates?: ImageEditorConfig['templates'];
  readonly batchExport?: ImageEditorConfig['batchExport'];
  readonly colorPicker?: ImageEditorConfig['colorPicker'];
  readonly crop?: ImageEditorConfig['crop'];
  readonly cropMask?: ImageEditorConfig['cropMask'];
  readonly frame?: ImageEditorConfig['frame'];
  readonly filters?: ImageEditorConfig['filters'];
  readonly viewport?: ImageEditorConfig['viewport'];
  readonly rotate?: ImageEditorConfig['rotate'];
  readonly toolbar?: ImageEditorConfig['toolbar'];
  readonly canvasBackground?: ImageEditorConfig['canvasBackground'];
  readonly historyLimit?: number;
}

export interface DocsPage {
  readonly id: string;
  readonly title: string;
  readonly group: string;
  readonly summary: string;
  readonly badges?: readonly { readonly label: string; readonly accent?: boolean }[];
  readonly tags?: readonly string[];
  readonly related?: readonly string[];
  readonly previewKind?: string;
  readonly live: DocsLivePreview;
  readonly code: readonly DocsCodeBlock[];
  readonly api: readonly DocsApiSection[];
}

`;

const body = `export const DOCS_NAV: readonly DocsNavGroup[] = ${JSON.stringify(DOCS_NAV, null, 2)} as const;

export const DOCS_PAGES: Readonly<Record<string, DocsPage>> = ${JSON.stringify(DOCS_PAGES, null, 2)} as const;

export function getDocsPage(id: string): DocsPage {
  return DOCS_PAGES[id] ?? DOCS_PAGES['getting-started']!;
}

export const DOCS_SAMPLE_IMAGE = 'fixtures/sample.jpg';
`;

writeFileSync(outPath, types + body, 'utf8');
console.log('Wrote', outPath);
