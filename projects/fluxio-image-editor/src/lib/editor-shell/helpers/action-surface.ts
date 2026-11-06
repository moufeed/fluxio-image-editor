import type {
  EditorActionSurface,
  EditorToolbarAction,
  EditorToolbarActionConfig,
  EditorToolbarGroup,
} from 'fluxio-image-editor/core';
import {
  ANNOTATIONS_TOOLBAR_GROUP_ID,
  ANNOTATIONS_TOOL_ACTION_IDS,
} from 'fluxio-image-editor/core';

/**
 * Action ids historically owned by the chrome toolbar (hardcoded shell UI).
 * Default surface is `'toolbar'` when the plugin does not set one.
 */
export const DEFAULT_TOOLBAR_SURFACE_ACTION_IDS: ReadonlySet<string> = new Set([
  'viewport.zoomIn',
  'viewport.zoomOut',
  'export.dialog',
  'export.png',
  'export.jpeg',
  'export.webp',
  'batch-export.dialog',
  'persistence.export',
  'persistence.load',
  'compare.original',
  'history.panel',
  'layers.panel',
  'open.file',
  'open.new',
]);

/**
 * Toolbar-surface actions that the shell renders with dedicated chrome
 * (not via the generic plugin-action button list).
 */
export const SHELL_OWNED_TOOLBAR_ACTION_IDS: ReadonlySet<string> = new Set([
  'viewport.zoomIn',
  'viewport.zoomOut',
  'export.dialog',
  'export.png',
  'export.jpeg',
  'export.webp',
  'persistence.export',
  'persistence.load',
  'compare.original',
]);

export function resolveActionSurface(
  action: Pick<EditorToolbarAction, 'id' | 'surface'>,
  override?: EditorToolbarActionConfig,
): EditorActionSurface {
  if (override?.surface) {
    return override.surface;
  }
  if (action.surface) {
    return action.surface;
  }
  return DEFAULT_TOOLBAR_SURFACE_ACTION_IDS.has(action.id) ? 'toolbar' : 'utilibar';
}

export function resolveGroupSurface(
  group: Pick<EditorToolbarGroup, 'id' | 'surface'>,
  override?: EditorToolbarActionConfig,
): EditorActionSurface {
  if (override?.surface) {
    return override.surface;
  }
  if (group.surface) {
    return group.surface;
  }
  return 'utilibar';
}

/** Expand group aliases in a host `visibleActions` whitelist. */
export function expandVisibleActionIds(
  ids: readonly string[],
  registeredActionIds: ReadonlySet<string>,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (id === ANNOTATIONS_TOOLBAR_GROUP_ID) {
      for (const childId of ANNOTATIONS_TOOL_ACTION_IDS) {
        if (!registeredActionIds.has(childId) || seen.has(childId)) {
          continue;
        }
        seen.add(childId);
        out.push(childId);
      }
      continue;
    }
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function orderGroupChildren(
  group: EditorToolbarGroup,
  childIds: readonly string[],
): string[] {
  const preferred = group.actionIds ?? [];
  const remaining = new Set(childIds);
  const ordered: string[] = [];
  for (const id of preferred) {
    if (!remaining.has(id)) {
      continue;
    }
    ordered.push(id);
    remaining.delete(id);
  }
  for (const id of childIds) {
    if (!remaining.has(id)) {
      continue;
    }
    ordered.push(id);
    remaining.delete(id);
  }
  return ordered;
}
