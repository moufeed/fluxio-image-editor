import { Injectable, signal } from '@angular/core';

export type DocsTheme = 'light' | 'dark';

function readInitialTheme(): DocsTheme {
  const saved = localStorage.getItem('fluxio-docs-theme');
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: DocsTheme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

@Injectable({ providedIn: 'root' })
export class DocsThemeService {
  readonly theme = signal<DocsTheme>(readInitialTheme());

  constructor() {
    applyTheme(this.theme());
  }

  toggle(): void {
    const next: DocsTheme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    localStorage.setItem('fluxio-docs-theme', next);
    applyTheme(next);
  }
}
