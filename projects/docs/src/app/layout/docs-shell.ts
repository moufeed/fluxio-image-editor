import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { DOCS_NAV, DOCS_PAGES } from '../catalog/docs-content';
import { DocsThemeService } from '../shared/docs-theme.service';

@Component({
  selector: 'docs-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './docs-shell.html',
  styleUrl: './docs-shell.scss',
  host: {
    class: 'docs-shell-host',
  },
})
export class DocsShellComponent {
  private readonly router = inject(Router);
  private readonly docsTheme = inject(DocsThemeService);

  protected readonly nav = DOCS_NAV;
  protected readonly theme = this.docsTheme.theme;
  protected readonly navOpen = signal(false);
  protected readonly search = signal('');

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly activeId = computed(() => {
    const match = this.url().match(/\/docs\/([^/?#]+)/);
    return match?.[1] ?? 'getting-started';
  });

  protected readonly filteredNav = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) {
      return this.nav;
    }
    return this.nav
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const page = DOCS_PAGES[item.id];
          const hay =
            `${item.label} ${page?.summary ?? ''} ${(page?.tags ?? []).join(' ')}`.toLowerCase();
          return hay.includes(q);
        }),
      }))
      .filter((group) => group.items.length > 0);
  });

  protected toggleTheme(): void {
    this.docsTheme.toggle();
  }

  protected toggleNav(): void {
    this.navOpen.update((v) => !v);
  }

  protected closeNav(): void {
    this.navOpen.set(false);
  }

  protected onSearch(value: string): void {
    this.search.set(value);
  }
}
