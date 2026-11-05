import type { HistoryEntry } from './command';
import type { ReadonlyImageDocument } from '../models/image-document';

export interface HistorySnapshot {
  readonly past: readonly HistoryEntry[];
  readonly future: readonly HistoryEntry[];
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

/**
 * Bounded undo/redo stacks. `past` is a fixed-capacity ring buffer so `push`
 * is O(1) (no full-array copy); `snapshot()` materializes chronological order.
 */
export class BoundedHistory {
  private readonly pastBuf: (HistoryEntry | undefined)[];
  private pastStart = 0;
  private pastCount = 0;
  private future: HistoryEntry[] = [];

  constructor(private readonly limit = 50) {
    this.pastBuf = new Array(Math.max(1, Math.floor(limit) || 1));
  }

  private get capacity(): number {
    return this.pastBuf.length;
  }

  push(entry: HistoryEntry): void {
    this.pushPast(entry);
    this.future.length = 0;
  }

  /** Newest entry on the undo stack, or null when empty. */
  peek(): HistoryEntry | null {
    return this.peekPast();
  }

  /** Overwrite the newest entry (used to merge a coalesced run). */
  replaceTop(entry: HistoryEntry): boolean {
    if (this.pastCount === 0) {
      return false;
    }
    const cap = this.capacity;
    this.pastBuf[(this.pastStart + this.pastCount - 1) % cap] = entry;
    this.future.length = 0;
    return true;
  }

  undo(): HistoryEntry | null {
    const entry = this.popPast();
    if (!entry) {
      return null;
    }
    this.future.push(entry);
    return entry;
  }

  redo(): HistoryEntry | null {
    const entry = this.future.pop();
    if (!entry) {
      return null;
    }
    this.pushPast(entry);
    return entry;
  }

  clear(): void {
    this.pastBuf.fill(undefined);
    this.pastStart = 0;
    this.pastCount = 0;
    this.future.length = 0;
  }

  snapshot(): HistorySnapshot {
    return {
      past: this.pastEntries(),
      future: this.future.slice(),
      canUndo: this.pastCount > 0,
      canRedo: this.future.length > 0,
    };
  }

  currentDocumentFallback(initial: ReadonlyImageDocument): ReadonlyImageDocument {
    const tip = this.peekPast();
    if (!tip) {
      return initial;
    }
    // Compact entries omit snapshots; callers should prefer the live store document.
    return tip.after ?? initial;
  }

  private pushPast(entry: HistoryEntry): void {
    const cap = this.capacity;
    if (this.pastCount < cap) {
      this.pastBuf[(this.pastStart + this.pastCount) % cap] = entry;
      this.pastCount += 1;
      return;
    }
    this.pastBuf[this.pastStart] = entry;
    this.pastStart = (this.pastStart + 1) % cap;
  }

  private popPast(): HistoryEntry | null {
    if (this.pastCount === 0) {
      return null;
    }
    const cap = this.capacity;
    const index = (this.pastStart + this.pastCount - 1) % cap;
    const entry = this.pastBuf[index] ?? null;
    this.pastBuf[index] = undefined;
    this.pastCount -= 1;
    return entry;
  }

  private peekPast(): HistoryEntry | null {
    if (this.pastCount === 0) {
      return null;
    }
    const cap = this.capacity;
    return this.pastBuf[(this.pastStart + this.pastCount - 1) % cap] ?? null;
  }

  private pastEntries(): HistoryEntry[] {
    const cap = this.capacity;
    const out: HistoryEntry[] = new Array(this.pastCount);
    for (let i = 0; i < this.pastCount; i += 1) {
      out[i] = this.pastBuf[(this.pastStart + i) % cap]!;
    }
    return out;
  }
}
