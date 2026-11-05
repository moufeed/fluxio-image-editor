/**
 * Testing helpers and architecture assertions for fluxio-image-editor.
 */

export function assertNoFabricImport(sourceText: string, fileLabel: string): void {
  const fabricImport =
    /from\s+['"]fabric['"]|from\s+['"]fabric\/|require\(\s*['"]fabric['"]/;
  if (fabricImport.test(sourceText)) {
    throw new Error(`Fabric import leaked into ${fileLabel}`);
  }
}

export function listForbiddenCoreFabricTokens(): readonly string[] {
  return [
    'fabric.Canvas',
    'fabric.StaticCanvas',
    'FabricObject',
    'FabricImage',
    'IText',
  ];
}
