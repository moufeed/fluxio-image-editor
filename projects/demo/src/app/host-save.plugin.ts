import type { ImageEditorPlugin, ImageEditorPluginContext } from 'fluxio-image-editor';

/** Toolbar action id emitted on `(action)` for host-owned PNG save. */
export const HOST_SAVE_ACTION = 'host.save';

/**
 * Demo host plugin: registers a chrome toolbar "Save PNG" button.
 * The shell does not handle this id — it emits `(action)` for the host.
 */
export class HostSavePlugin implements ImageEditorPlugin {
  readonly id = 'host-save';

  setup(context: ImageEditorPluginContext): void {
    context.registerToolbarAction({
      id: HOST_SAVE_ACTION,
      label: 'Save PNG',
      icon: 'export',
      surface: 'toolbar',
      position: 240,
    });
  }
}
