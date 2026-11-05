import { Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { DOCS_PAGES, getDocsPage, type DocsApiSection, type DocsPage } from '../catalog/docs-content';
import { DocsCodeBlockComponent } from '../shared/code-block';
import { DocsLiveEditorComponent } from '../shared/live-editor';

type DocsTab = 'preview' | 'code' | 'api';

@Component({
  selector: 'docs-page',
  imports: [RouterLink, DocsCodeBlockComponent, DocsLiveEditorComponent],
  templateUrl: './doc-page.html',
  styleUrl: './doc-page.scss',
})
export class DocPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);

  private readonly slug = toSignal(this.route.paramMap.pipe(map((p) => p.get('slug') ?? 'getting-started')), {
    initialValue: 'getting-started',
  });

  protected readonly tab = signal<DocsTab>('preview');

  protected readonly page = computed(() => getDocsPage(this.slug()));

  protected readonly toc = computed(() => {
    const page = this.page();
    return [
      { id: 'preview', title: 'Preview', tab: 'preview' as const },
      { id: 'code', title: 'Code', tab: 'code' as const },
      { id: 'api', title: 'API', tab: 'api' as const },
      ...page.api.map((section) => ({ id: section.id, title: section.title, tab: 'api' as const })),
    ];
  });

  protected readonly relatedPages = computed(() =>
    (this.page().related ?? [])
      .map((id) => DOCS_PAGES[id])
      .filter((p): p is DocsPage => !!p),
  );

  protected readonly homeCards = computed(() => {
    const ids = [
      'configuration',
      'plugins-lazy',
      'events-handle',
      'crop',
      'export',
      'stickers',
      'emoji',
      'frame',
      'color-overlay',
      'i18n-rtl',
    ];
    return ids.map((id) => DOCS_PAGES[id]).filter((p): p is DocsPage => !!p);
  });

  protected setTab(tab: DocsTab, sectionId?: string): void {
    this.tab.set(tab);
    if (tab === 'api' && sectionId && sectionId !== 'api') {
      queueMicrotask(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }

  protected trustHtml(html: string) {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  protected previewHint(page: DocsPage): string {
    const exportTip =
      'After you edit (Apply on a tool), use Export for PNG/JPEG/WebP — the file downloads automatically.';
    if (page.live.defaultTool) {
      return `Opens with tool “${page.live.defaultTool}”. ${exportTip}`;
    }
    if (page.id === 'i18n-rtl') {
      return `Arabic locale with dir:auto. ${exportTip}`;
    }
    return `Interactive editor for this page. ${exportTip}`;
  }

  protected sectionAnchor(section: DocsApiSection): string {
    return section.id;
  }
}
