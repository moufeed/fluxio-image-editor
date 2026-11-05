import {
  ALWAYS_ON_EDITOR_PLUGIN_IDS,
  OPTIONAL_EDITOR_PLUGIN_IDS,
  usesLazyPluginLoading,
  type EditorPluginId,
  type ImageEditorConfig,
  type ImageEditorPlugin,
} from 'fluxio-image-editor/core';
import { createAlwaysOnPlugins } from './plugin-loaders-always-on';
import { createAllPluginsStatic } from './plugin-loaders-static';

function assertHostOptionalPlugins(hostPlugins: readonly ImageEditorPlugin[]): void {
  for (const plugin of hostPlugins) {
    if (ALWAYS_ON_EDITOR_PLUGIN_IDS.includes(plugin.id as EditorPluginId)) {
      throw new Error(
        `Plugin "${plugin.id}" is always-on and must not be passed via [plugins] — omit it from the host list`,
      );
    }
  }
  const seen = new Set<string>();
  for (const plugin of hostPlugins) {
    if (seen.has(plugin.id)) {
      throw new Error(`Duplicate host plugin id: ${plugin.id}`);
    }
    seen.add(plugin.id);
  }
}

/** True when host `[plugins]` replaces built-in optional loading (includes a known optional id). */
export function hostReplacesOptionalPlugins(
  hostPlugins: readonly ImageEditorPlugin[],
): boolean {
  const optionalIds = new Set<string>(OPTIONAL_EDITOR_PLUGIN_IDS);
  return hostPlugins.some((plugin) => optionalIds.has(plugin.id));
}

/**
 * Resolves the plugin list for a session.
 * - Host list = DI `provideImageEditorPlugins` + global `registerPlugin` + `[plugins]`
 *   (merged upstream via `collectHostPlugins`).
 * - When that list includes any built-in optional plugin id, it replaces built-in
 *   optional loading (`config.plugins` ids are ignored; host owns the optional set).
 * - Host-only extras (custom ids such as a Save action plugin) are appended onto
 *   the normal built-in / lazy resolution so optional tools stay available.
 * - When the host list is empty, falls back to Phase A built-in resolution.
 */
export async function resolveEditorPlugins(
  config: ImageEditorConfig,
  incrementDegrees: number,
  hostPlugins: readonly ImageEditorPlugin[] = [],
): Promise<ImageEditorPlugin[]> {
  if (hostPlugins.length > 0) {
    assertHostOptionalPlugins(hostPlugins);
    if (hostReplacesOptionalPlugins(hostPlugins)) {
      return [...createAlwaysOnPlugins(config, incrementDegrees), ...hostPlugins];
    }
    const base = usesLazyPluginLoading(config)
      ? await (await import('./plugin-loaders-lazy')).resolveLazyPlugins(config, incrementDegrees)
      : createAllPluginsStatic(config, incrementDegrees);
    return [...base, ...hostPlugins];
  }

  if (!usesLazyPluginLoading(config)) {
    return createAllPluginsStatic(config, incrementDegrees);
  }
  const { resolveLazyPlugins } = await import('./plugin-loaders-lazy');
  return resolveLazyPlugins(config, incrementDegrees);
}

export { createAllPluginsStatic } from './plugin-loaders-static';
export { createAlwaysOnPlugins } from './plugin-loaders-always-on';
