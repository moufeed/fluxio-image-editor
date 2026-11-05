import type { EditorCommandHandler } from '../commands/command';
import type { EditorActionSurface } from '../models/config';

export type { EditorActionSurface };

export interface EditorToolDefinition {
  readonly id: string;
  readonly label: string;
}

export interface EditorPanelDefinition {
  readonly id: string;
  readonly label: string;
}

export interface EditorToolbarAction {
  readonly id: string;
  readonly label: string;
  /** Built-in icon key or SVG path `d` for a 24×24 viewBox. */
  readonly icon?: string;
  readonly commandId?: string;
  /**
   * Chrome surface for this action.
   * Default: `'utilibar'` (except known chrome-owned ids such as zoom/export/compare).
   */
  readonly surface?: EditorActionSurface;
  /**
   * When set, the action is nested under a registered toolbar group of this id
   * (e.g. annotation tools under `'annotations'`).
   */
  readonly groupId?: string;
  /**
   * Sort order for utilibar / toolbar plugin actions (WordPress-style).
   * Lower values appear first. When omitted, the action sorts after all
   * positioned actions (stable registration order among ties / unpositioned).
   * Host `toolbar.visibleActions` array order overrides this when set.
   */
  readonly position?: number;
}

/**
 * Collapsible utilibar/toolbar group that nests member actions.
 * Register once per group id (idempotent in the plugin registry).
 */
export interface EditorToolbarGroup {
  readonly id: string;
  readonly label: string;
  /** Built-in icon key or SVG path `d` for a 24×24 viewBox. */
  readonly icon?: string;
  /** Default: `'utilibar'`. */
  readonly surface?: EditorActionSurface;
  /**
   * Preferred child order. Members not listed still appear (registration order)
   * after the listed ids.
   */
  readonly actionIds?: readonly string[];
  /**
   * Sort order for the group button itself (WordPress-style).
   * When omitted, the group appears at the earliest eligible child position.
   */
  readonly position?: number;
}

/** Group id for annotation tools (text, shapes, drawing, …). */
export const ANNOTATIONS_TOOLBAR_GROUP_ID = 'annotations';

/** Utilibar action ids that belong to the annotations group. */
export const ANNOTATIONS_TOOL_ACTION_IDS = [
  'text.tool',
  'shapes.tool',
  'drawing.tool',
  'path.tool',
  'image-overlay.tool',
  'stickers.tool',
  'emoji.tool',
] as const;

export const ANNOTATIONS_TOOLBAR_GROUP: EditorToolbarGroup = {
  id: ANNOTATIONS_TOOLBAR_GROUP_ID,
  label: 'Annotate',
  icon: 'annotations',
  surface: 'utilibar',
  position: 120,
  actionIds: ANNOTATIONS_TOOL_ACTION_IDS,
};

/**
 * Register the shared annotations utilibar group (idempotent) and a member action.
 */
export function registerAnnotationsToolbarAction(
  context: ImageEditorPluginContext,
  action: Omit<EditorToolbarAction, 'groupId'>,
): void {
  context.registerToolbarGroup(ANNOTATIONS_TOOLBAR_GROUP);
  context.registerToolbarAction({
    ...action,
    surface: action.surface ?? 'utilibar',
    groupId: ANNOTATIONS_TOOLBAR_GROUP_ID,
  });
}

export interface EditorPluginLocaleResources {
  readonly locale: string;
  readonly messages: Readonly<Record<string, string>>;
}

export interface ImageEditorPluginContext {
  registerTool(tool: EditorToolDefinition): void;
  registerCommand(command: EditorCommandHandler): void;
  registerPanel(panel: EditorPanelDefinition): void;
  registerToolbarAction(action: EditorToolbarAction): void;
  registerToolbarGroup(group: EditorToolbarGroup): void;
  registerLocale(resources: EditorPluginLocaleResources): void;
}

export interface ImageEditorPlugin {
  readonly id: string;
  setup(context: ImageEditorPluginContext): void;
  destroy?(): void;
}
