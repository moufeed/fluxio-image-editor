import { type Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/docs-shell').then((m) => m.DocsShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'docs/getting-started' },
      {
        path: 'docs/:slug',
        loadComponent: () => import('./pages/doc-page').then((m) => m.DocPageComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'docs/getting-started' },
];
