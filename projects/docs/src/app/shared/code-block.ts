import { Component, computed, input, signal } from '@angular/core';

@Component({
  selector: 'docs-code-block',
  template: `
    <div class="docs-code-block">
      <div class="docs-code-block__toolbar">
        <span>{{ label() || lang() || 'code' }}</span>
        <button type="button" class="docs-copy-btn" (click)="copy()" [class.is-copied]="copied()">
          {{ copied() ? 'Copied' : 'Copy Code' }}
        </button>
      </div>
      <pre><code [innerHTML]="highlighted()"></code></pre>
    </div>
  `,
  styles: `
    .docs-code-block {
      position: relative;
      margin: 0.85rem 0 1.15rem;
      border: 1px solid var(--docs-border);
      border-radius: 0.625rem;
      overflow: hidden;
      background: #0f141c;
    }
    .docs-code-block__toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.4rem 0.65rem;
      border-bottom: 1px solid rgb(255 255 255 / 8%);
      color: #9aa6b5;
      font-size: 0.75rem;
    }
    .docs-copy-btn {
      appearance: none;
      border: 1px solid rgb(255 255 255 / 14%);
      background: transparent;
      color: #d7e0ea;
      border-radius: 0.35rem;
      padding: 0.2rem 0.55rem;
      cursor: pointer;
      font-size: 0.75rem;
    }
    .docs-copy-btn.is-copied,
    .docs-copy-btn:hover {
      background: color-mix(in srgb, var(--docs-accent) 25%, transparent);
      border-color: var(--docs-accent);
    }
    pre {
      margin: 0;
      padding: 1rem;
      overflow-x: auto;
      color: #e6edf5;
      font-family: var(--docs-mono);
      font-size: 0.8125rem;
      line-height: 1.55;
    }
    :host ::ng-deep .tok-kw {
      color: #c4b5fd;
    }
    :host ::ng-deep .tok-str {
      color: #86efac;
    }
    :host ::ng-deep .tok-num {
      color: #fcd34d;
    }
    :host ::ng-deep .tok-com {
      color: #94a3b8;
      font-style: italic;
    }
    :host ::ng-deep .tok-tag {
      color: #f9a8d4;
    }
    :host ::ng-deep .tok-attr {
      color: #93c5fd;
    }
  `,
})
export class DocsCodeBlockComponent {
  readonly code = input.required<string>();
  readonly lang = input<string>('ts');
  readonly label = input<string>('');

  protected readonly copied = signal(false);

  protected readonly highlighted = computed(() => highlight(this.code(), this.lang()));

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.code());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1200);
    } catch {
      /* ignore */
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function highlight(code: string, lang: string): string {
  const html = escapeHtml(code);
  if (lang === 'html') {
    return html
      .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="tok-com">$1</span>')
      .replace(/(&lt;\/?)([\w-]+)/g, '$1<span class="tok-tag">$2</span>')
      .replace(/\s([\w-:]+)=/g, ' <span class="tok-attr">$1</span>=')
      .replace(/&quot;([^&]*)&quot;/g, '<span class="tok-str">&quot;$1&quot;</span>');
  }
  return html
    .replace(/(\/\/.*$)/gm, '<span class="tok-com">$1</span>')
    .replace(
      /\b(import|from|export|const|let|readonly|async|await|new|return|true|false|null|undefined|type|interface|class)\b/g,
      '<span class="tok-kw">$1</span>',
    )
    .replace(/('(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/g, '<span class="tok-str">$1</span>')
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>');
}
