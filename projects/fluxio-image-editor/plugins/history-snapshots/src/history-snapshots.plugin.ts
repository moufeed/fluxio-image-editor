import type {
  ImageEditorPlugin,
  ImageEditorPluginContext,
} from 'fluxio-image-editor/core';

export const HISTORY_PANEL_ACTION = 'history.panel';
export const HISTORY_PANEL_ID = 'history';

/**
 * Visual undo history panel (Phase: history-snapshots).
 * Registers chrome action id + panel id + locales; timeline UI lives in the host shell.
 */
export class HistorySnapshotsPlugin implements ImageEditorPlugin {
  readonly id = 'history-snapshots';

  setup(context: ImageEditorPluginContext): void {
    context.registerPanel({
      id: HISTORY_PANEL_ID,
      label: 'History',
    });

    context.registerToolbarAction({
      id: HISTORY_PANEL_ACTION,
      label: 'History',
      icon: 'history',
      surface: 'toolbar',
      position: 210,
    });

    context.registerLocale({
      locale: 'en',
      messages: {
        'history.panel': 'History',
        'toolbar.historyPanel': 'History',
        'history.original': 'Original',
        'history.aria': 'Edit history',
        'history.close': 'Close history',
        'history.empty': 'No edits yet',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'history.panel': 'السجل',
        'toolbar.historyPanel': 'السجل',
        'history.original': 'الأصل',
        'history.aria': 'سجل التعديلات',
        'history.close': 'إغلاق السجل',
        'history.empty': 'لا توجد تعديلات بعد',
      },
    });
  }
}
