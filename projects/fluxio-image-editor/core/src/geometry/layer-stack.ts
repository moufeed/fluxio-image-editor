import {
  createAnnotationGroupId,
  isAnnotationLocked,
  normalizeAnnotation,
  type Annotation,
} from '../models/image-document';
import {
  canReorderAnnotationById,
  reorderAnnotationById,
  type AnnotationOrderAction,
} from './annotation-transform';

/** Contiguous index range [start, end] inclusive for a folder block. */
export interface AnnotationGroupRange {
  readonly groupId: string;
  readonly start: number;
  readonly end: number;
}

/**
 * Ensure members of each `groupId` form a single contiguous z-order block.
 * Relative order inside a group and among ungrouped items is preserved.
 */
export function ensureAnnotationGroupsContiguous(
  stack: readonly Annotation[],
): readonly Annotation[] {
  if (stack.length < 2) {
    return stack;
  }
  const seen = new Set<string>();
  const next: Annotation[] = [];
  for (const item of stack) {
    const groupId = item.groupId?.trim();
    if (!groupId || seen.has(groupId)) {
      continue;
    }
    seen.add(groupId);
    for (const member of stack) {
      if (member.groupId === groupId) {
        next.push(member);
      }
    }
  }
  for (const item of stack) {
    const groupId = item.groupId?.trim();
    if (!groupId) {
      next.push(item);
    }
  }
  return next.length === stack.length && next.every((item, index) => item === stack[index])
    ? stack
    : next;
}

export function findAnnotationGroupRange(
  stack: readonly Annotation[],
  groupId: string,
): AnnotationGroupRange | null {
  const id = groupId.trim();
  if (!id) {
    return null;
  }
  let start = -1;
  let end = -1;
  for (let i = 0; i < stack.length; i += 1) {
    if (stack[i]?.groupId === id) {
      if (start < 0) {
        start = i;
      }
      end = i;
    }
  }
  return start < 0 || end < 0 ? null : { groupId: id, start, end };
}

/**
 * Reorder by id, moving a whole folder block when the target belongs to a group.
 * Locked annotations cannot be reordered.
 */
export function reorderAnnotationLayerById(
  stack: readonly Annotation[],
  id: string,
  action: AnnotationOrderAction,
): readonly Annotation[] {
  const index = stack.findIndex((item) => item.id === id);
  if (index < 0) {
    return stack;
  }
  const target = stack[index]!;
  if (isAnnotationLocked(target)) {
    return stack;
  }

  const groupId = target.groupId?.trim();
  if (!groupId) {
    if (!canReorderAnnotationById(stack, id, action)) {
      return stack;
    }
    return reorderAnnotationById(stack, id, action);
  }

  const contiguous = ensureAnnotationGroupsContiguous(stack);
  const range = findAnnotationGroupRange(contiguous, groupId);
  if (!range) {
    return stack;
  }
  const block = contiguous.slice(range.start, range.end + 1);
  if (block.some((item) => isAnnotationLocked(item))) {
    return stack;
  }

  const without = [...contiguous.slice(0, range.start), ...contiguous.slice(range.end + 1)];
  let insertAt = range.start;
  switch (action) {
    case 'forward':
      if (range.end >= contiguous.length - 1) {
        return stack;
      }
      insertAt = Math.min(without.length, range.start + 1);
      break;
    case 'backward':
      if (range.start <= 0) {
        return stack;
      }
      insertAt = Math.max(0, range.start - 1);
      break;
    case 'front':
      if (range.end >= contiguous.length - 1) {
        return stack;
      }
      insertAt = without.length;
      break;
    case 'back':
      if (range.start <= 0) {
        return stack;
      }
      insertAt = 0;
      break;
  }
  return [...without.slice(0, insertAt), ...block, ...without.slice(insertAt)];
}

export function canReorderAnnotationLayerById(
  stack: readonly Annotation[],
  id: string,
  action: AnnotationOrderAction,
): boolean {
  const next = reorderAnnotationLayerById(stack, id, action);
  return next !== stack && next.some((item, index) => item.id !== stack[index]?.id);
}

/** Group two or more unlocked annotations into a flat folder. */
export function groupAnnotationsByIds(
  stack: readonly Annotation[],
  ids: readonly string[],
  groupName = 'Group',
): readonly Annotation[] {
  const idSet = new Set(ids);
  if (idSet.size < 2) {
    return stack;
  }
  const members = stack.filter((item) => idSet.has(item.id));
  if (members.length < 2) {
    return stack;
  }
  if (members.some((item) => isAnnotationLocked(item))) {
    return stack;
  }

  const groupId = createAnnotationGroupId();
  const name = groupName.trim() || 'Group';
  const grouped = new Map(
    members.map((item) => [item.id, normalizeAnnotation({ ...item, groupId, groupName: name })]),
  );

  // Place the new block at the highest (top-most) selected index.
  let insertAfter = -1;
  for (let i = 0; i < stack.length; i += 1) {
    if (idSet.has(stack[i]!.id)) {
      insertAfter = i;
    }
  }
  const without = stack.filter((item) => !idSet.has(item.id));
  const block = stack.filter((item) => idSet.has(item.id)).map((item) => grouped.get(item.id)!);
  let beforeCount = 0;
  for (let i = 0; i < insertAfter; i += 1) {
    if (!idSet.has(stack[i]!.id)) {
      beforeCount += 1;
    }
  }
  return [...without.slice(0, beforeCount), ...block, ...without.slice(beforeCount)];
}

/** Remove folder membership from every annotation in `groupId`. */
export function ungroupAnnotationsByGroupId(
  stack: readonly Annotation[],
  groupId: string,
): readonly Annotation[] {
  const id = groupId.trim();
  if (!id) {
    return stack;
  }
  let changed = false;
  const next = stack.map((item) => {
    if (item.groupId !== id) {
      return item;
    }
    changed = true;
    const { groupId: _g, groupName: _n, ...rest } = item;
    return normalizeAnnotation(rest as Annotation);
  });
  return changed ? next : stack;
}

/** Rename every member of a folder. */
export function renameAnnotationGroup(
  stack: readonly Annotation[],
  groupId: string,
  groupName: string,
): readonly Annotation[] {
  const id = groupId.trim();
  const name = groupName.trim().slice(0, 120) || 'Group';
  if (!id) {
    return stack;
  }
  let changed = false;
  const next = stack.map((item) => {
    if (item.groupId !== id) {
      return item;
    }
    if (item.groupName === name) {
      return item;
    }
    changed = true;
    return normalizeAnnotation({ ...item, groupName: name });
  });
  return changed ? next : stack;
}

/** Patch shared layer props on one annotation (visibility, lock, blend, name, …). */
export function patchAnnotationLayerProps(
  stack: readonly Annotation[],
  id: string,
  patch: Partial<Pick<Annotation, 'visible' | 'locked' | 'blendMode' | 'name' | 'opacity'>>,
): readonly Annotation[] {
  const index = stack.findIndex((item) => item.id === id);
  if (index < 0) {
    return stack;
  }
  const current = stack[index]!;
  const nextItem = normalizeAnnotation({ ...current, ...patch } as Annotation);
  if (JSON.stringify(nextItem) === JSON.stringify(normalizeAnnotation(current))) {
    return stack;
  }
  const next = stack.slice();
  next[index] = nextItem;
  return next;
}
