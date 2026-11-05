import type { Annotation } from '../models/image-document';

/** Nouns used to phrase an annotation change in the history timeline. */
export interface AnnotationChangeLabels {
  /** Tool noun used for whole-stack phrasing, e.g. `Drawing` → "Clear drawing". */
  readonly kind?: string;
  /** Singular item noun, e.g. `stroke` → "Add stroke". Falls back to the annotation kind. */
  readonly item?: string;
}

const KIND_NOUNS: Readonly<Record<Annotation['kind'], string>> = {
  text: 'text',
  rect: 'rectangle',
  ellipse: 'ellipse',
  polygon: 'polygon',
  line: 'line',
  arrow: 'arrow',
  path: 'stroke',
  image: 'image',
};

/**
 * Ordered so that when a gesture touches several fields at once the most
 * specific one names the entry (a resize also moves the origin, a rotation
 * also shifts x/y).
 */
const VERBS_BY_KEY: readonly (readonly [verb: string, keys: readonly string[]])[] = [
  ['Edit', ['text', 'src']],
  ['Rotate', ['angle']],
  ['Resize', ['width', 'height', 'fontSize', 'boxWidth', 'radius']],
  ['Move', ['x', 'y']],
  ['Restyle', ['fill', 'stroke', 'strokeWidth', 'opacity', 'blendMode', 'backgroundColor']],
];

/**
 * Name what an edit did to an annotation stack, so history reads as actions
 * ("Add text", "Move stroke") instead of repeating the tool that produced them.
 */
export function describeAnnotationChange(
  previous: readonly Annotation[],
  next: readonly Annotation[],
  labels: AnnotationChangeLabels = {},
): string {
  const kindLabel = labels.kind ?? 'Annotations';
  if (next.length === 0) {
    return previous.length === 0 ? kindLabel : `Clear ${kindLabel.toLowerCase()}`;
  }

  const beforeById = new Map(previous.map((entry) => [entry.id, entry]));
  const afterIds = new Set(next.map((entry) => entry.id));
  const added = next.filter((entry) => !beforeById.has(entry.id));
  const removed = previous.filter((entry) => !afterIds.has(entry.id));

  if (added.length > 0 && removed.length === 0) {
    return phrase('Add', noun(labels, added[0]), added.length);
  }
  if (removed.length > 0 && added.length === 0) {
    return phrase('Delete', noun(labels, removed[0]), removed.length);
  }
  if (added.length > 0) {
    return phrase('Replace', noun(labels, added[0]), added.length);
  }

  const edited = next
    .map((entry) => ({ before: beforeById.get(entry.id)!, after: entry }))
    .filter((pair) => changedKeys(pair.before, pair.after).length > 0);
  if (edited.length === 0) {
    const reordered = next.some((entry, index) => entry.id !== previous[index]?.id);
    return reordered ? phrase('Reorder', noun(labels, next[0]), 1) : kindLabel;
  }

  const [{ before, after }] = edited;
  return phrase(verbFor(before, after), noun(labels, after), edited.length);
}

function noun(labels: AnnotationChangeLabels, annotation: Annotation): string {
  return labels.item ?? KIND_NOUNS[annotation.kind] ?? 'layer';
}

function phrase(verb: string, item: string, count: number): string {
  return count > 1 ? `${verb} ${count} ${item}s` : `${verb} ${item}`;
}

function verbFor(before: Annotation, after: Annotation): string {
  const changed = new Set(changedKeys(before, after));

  if (changed.has('visible')) {
    return after.visible === false ? 'Hide' : 'Show';
  }
  if (changed.has('locked')) {
    return after.locked ? 'Lock' : 'Unlock';
  }
  if (changed.has('name') || changed.has('groupName')) {
    return 'Rename';
  }
  if (changed.has('groupId')) {
    return after.groupId ? 'Group' : 'Ungroup';
  }
  if (changed.has('points')) {
    return isTranslation(before, after) ? 'Move' : 'Reshape';
  }

  for (const [verb, keys] of VERBS_BY_KEY) {
    if (keys.some((key) => changed.has(key))) {
      return verb;
    }
  }
  return 'Edit';
}

/** Point lists shift uniformly when a path is dragged, but not when reshaped. */
function isTranslation(before: Annotation, after: Annotation): boolean {
  const from = 'points' in before ? before.points : null;
  const to = 'points' in after ? after.points : null;
  if (!from || !to || from.length !== to.length || from.length === 0) {
    return false;
  }
  const dx = to[0].x - from[0].x;
  const dy = to[0].y - from[0].y;
  return to.every(
    (point, index) =>
      Math.abs(point.x - from[index].x - dx) < 0.01 &&
      Math.abs(point.y - from[index].y - dy) < 0.01,
  );
}

function changedKeys(before: Annotation, after: Annotation): readonly string[] {
  const left = before as unknown as Record<string, unknown>;
  const right = after as unknown as Record<string, unknown>;
  const changed: string[] = [];
  for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
    const a = left[key];
    const b = right[key];
    if (a === b) {
      continue;
    }
    if (Array.isArray(a) && Array.isArray(b) && JSON.stringify(a) === JSON.stringify(b)) {
      continue;
    }
    changed.push(key);
  }
  return changed;
}
