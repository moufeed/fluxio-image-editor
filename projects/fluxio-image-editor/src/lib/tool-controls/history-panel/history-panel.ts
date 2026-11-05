import {
  afterNextRender,
  Component,
  computed,
  type ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { EditorShellContext } from '../../editor-shell/editor-shell.context';
import { EditorPresentationStore } from '../../editor-shell/editor-presentation.store';

interface HistoryTimelineEntry {
  readonly index: number;
  readonly label: string;
  readonly timestamp: number | null;
  readonly isCurrent: boolean;
  readonly isFuture: boolean;
}

@Component({
  selector: 'fluxio-history-panel',
  templateUrl: './history-panel.html',
  host: {
    class: 'fluxio-history-panel-content',
  },
})
export class FluxioHistoryPanel {
  private readonly shell = inject(EditorShellContext);
  private readonly presentation = inject(EditorPresentationStore);
  private readonly listRef = viewChild<ElementRef<HTMLElement>>('timeline');
  private readonly now = signal(Date.now());

  protected readonly entries = computed((): readonly HistoryTimelineEntry[] => {
    const history = this.shell.session()?.store.history();
    if (!history) {
      return [
        {
          index: 0,
          label: this.t('history.original'),
          timestamp: null,
          isCurrent: true,
          isFuture: false,
        },
      ];
    }

    const currentIndex = history.past.length;
    const pastEntries = history.past.map((entry, i) => ({
      index: i + 1,
      label: entry.label,
      timestamp: entry.timestamp,
      isCurrent: i + 1 === currentIndex,
      isFuture: false,
    }));
    const futureEntries = [...history.future].reverse().map((entry, i) => ({
      index: currentIndex + 1 + i,
      label: entry.label,
      timestamp: entry.timestamp,
      isCurrent: false,
      isFuture: true,
    }));

    return [
      {
        index: 0,
        label: this.t('history.original'),
        timestamp: null,
        isCurrent: currentIndex === 0,
        isFuture: false,
      },
      ...pastEntries,
      ...futureEntries,
    ];
  });

  constructor() {
    afterNextRender(() => {
      this.scrollCurrentIntoView();
    });
  }

  protected t(key: string): string {
    return this.presentation.t(key);
  }

  protected relativeTime(timestamp: number | null): string {
    if (timestamp == null) {
      return '';
    }
    const locale = this.presentation.locale() === 'ar' ? 'ar' : 'en';
    const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const deltaSec = Math.round((timestamp - this.now()) / 1000);
    const abs = Math.abs(deltaSec);
    if (abs < 60) {
      return formatter.format(deltaSec, 'second');
    }
    if (abs < 3600) {
      return formatter.format(Math.round(deltaSec / 60), 'minute');
    }
    return formatter.format(Math.round(deltaSec / 3600), 'hour');
  }

  protected jumpTo(index: number): void {
    this.now.set(Date.now());
    this.shell.getSession()?.jumpToHistoryIndex(index);
    queueMicrotask(() => this.scrollCurrentIntoView());
  }

  /** Scroll active history entry into view. */
  private scrollCurrentIntoView(): void {
    const list = this.listRef()?.nativeElement;
    if (!list) {
      return;
    }
    const current = list.querySelector<HTMLElement>('.fluxio-history-panel__entry--current');
    current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}
