import { InjectionToken, type Provider } from '@angular/core';

import type { ImageEditorPlugin } from 'fluxio-image-editor/core';

/**
 * Host plugin registration: a live instance, a zero-arg factory, or a zero-arg
 * class constructor (FilePond-style `registerPlugin(PluginClass)`).
 */
export type ImageEditorPluginRegistration =
  ImageEditorPlugin | (() => ImageEditorPlugin) | (new () => ImageEditorPlugin);

/**
 * Multi provider token for host plugins supplied via
 * {@link provideImageEditorPlugins}. Each provider value is one registration
 * batch (array). Injected groups are concatenated in provider order.
 */
export const IMAGE_EDITOR_PLUGINS = new InjectionToken<
  readonly (readonly ImageEditorPluginRegistration[])[]
>('IMAGE_EDITOR_PLUGINS');

const globalRegistrations: ImageEditorPluginRegistration[] = [];

function isImageEditorPlugin(value: unknown): value is ImageEditorPlugin {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ImageEditorPlugin).id === 'string' &&
    typeof (value as ImageEditorPlugin).setup === 'function'
  );
}

function isConstructablePlugin(
  registration: ImageEditorPluginRegistration,
): registration is new () => ImageEditorPlugin {
  if (typeof registration !== 'function') {
    return false;
  }
  const proto = registration.prototype as { setup?: unknown } | undefined;
  return typeof proto?.setup === 'function';
}

/** Materialize a registration into a plugin instance. */
export function materializeImageEditorPlugin(
  registration: ImageEditorPluginRegistration,
): ImageEditorPlugin {
  if (typeof registration !== 'function') {
    return registration;
  }
  if (isConstructablePlugin(registration)) {
    return new registration();
  }
  const produced = (registration as () => ImageEditorPlugin)();
  if (!isImageEditorPlugin(produced)) {
    throw new Error(
      'Image editor plugin factory must return an ImageEditorPlugin with id and setup()',
    );
  }
  return produced;
}

/**
 * FilePond-style global registration. Merged into every editor session after
 * DI-provided plugins and before the component `[plugins]` input.
 *
 * Prefer {@link provideImageEditorPlugins} in Angular apps for testability and
 * hierarchical scoping; use this for module-level / non-DI hosts.
 */
export function registerPlugin(...plugins: readonly ImageEditorPluginRegistration[]): void {
  globalRegistrations.push(...plugins);
}

/** Remove all globally registered plugins (useful in tests). */
export function clearRegisteredPlugins(): void {
  globalRegistrations.length = 0;
}

/** Snapshot of current global registrations (not yet materialized). */
export function getRegisteredPluginRegistrations(): readonly ImageEditorPluginRegistration[] {
  return globalRegistrations.slice();
}

/**
 * Provide host plugins via Angular DI (app or component `providers`).
 *
 * @example
 * ```ts
 * providers: [
 *   provideImageEditorPlugins(HostSavePlugin, () => new AdjustmentsPlugin()),
 * ]
 * ```
 */
export function provideImageEditorPlugins(
  ...plugins: readonly ImageEditorPluginRegistration[]
): Provider {
  return {
    provide: IMAGE_EDITOR_PLUGINS,
    multi: true,
    useValue: plugins,
  };
}

/**
 * Merge DI batches, global `registerPlugin` entries, and the `[plugins]` input
 * into one host list (DI → global → input). Materializes factories/constructors.
 */
export function collectHostPlugins(options: {
  readonly provided?: readonly (readonly ImageEditorPluginRegistration[])[] | null;
  readonly registered?: readonly ImageEditorPluginRegistration[] | null;
  readonly input?: readonly ImageEditorPlugin[] | null;
}): ImageEditorPlugin[] {
  const out: ImageEditorPlugin[] = [];
  for (const batch of options.provided ?? []) {
    for (const registration of batch) {
      out.push(materializeImageEditorPlugin(registration));
    }
  }
  for (const registration of options.registered ?? []) {
    out.push(materializeImageEditorPlugin(registration));
  }
  for (const plugin of options.input ?? []) {
    out.push(plugin);
  }
  return out;
}
