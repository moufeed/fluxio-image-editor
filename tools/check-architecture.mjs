import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const fabricImport = /from\s+['"]fabric['"]|from\s+['"]fabric\/|require\(\s*['"]fabric['"]/;
const forbiddenTokens = [
  'fabric.Canvas',
  'fabric.StaticCanvas',
  'FabricObject',
  'FabricImage',
  'IText',
];

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      return walk(full);
    }
    if (full.endsWith('.ts') && !full.endsWith('.spec.ts')) {
      return [full];
    }
    return [];
  });
}

function assertNoFabric(files, label) {
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    if (fabricImport.test(text)) {
      throw new Error(`Fabric import leaked into ${label}: ${file}`);
    }
    for (const token of forbiddenTokens) {
      if (text.includes(token)) {
        throw new Error(`Forbidden token ${token} in ${label}: ${file}`);
      }
    }
  }
}

const root = process.cwd();
assertNoFabric(walk(join(root, 'projects/fluxio-image-editor/core')), 'core');
assertNoFabric(walk(join(root, 'projects/fluxio-image-editor/plugins')), 'plugins');

// Public shell API surface must not re-export Fabric runtime types.
const publicApiFiles = [
  join(root, 'projects/fluxio-image-editor/src/public-api.ts'),
  join(root, 'projects/fluxio-image-editor/src/lib/image-editor.public.ts'),
  join(root, 'projects/fluxio-image-editor/core/src/public-api.ts'),
];
assertNoFabric(publicApiFiles, 'public-api');

console.log('Architecture boundaries OK (Fabric isolated to FabricRendererAdapter)');
