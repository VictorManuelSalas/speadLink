import { Directive, ElementRef, OnDestroy, afterNextRender, effect, inject } from '@angular/core';
import { LanguageService } from './language.service';

@Directive({ selector: '[appDynamicLanguage]' })
export class DynamicLanguageDirective implements OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly i18n = inject(LanguageService);
  private readonly originals = new WeakMap<Text, string>();
  private readonly attributeOriginals = new WeakMap<Element, Map<string, string>>();
  private observer?: MutationObserver;

  constructor() {
    afterNextRender(() => {
      this.translateTree(this.host.nativeElement);
      this.observer = new MutationObserver((mutations) =>
        mutations.forEach((mutation) =>
          this.translateTree(
            mutation.target instanceof Element ? mutation.target : mutation.target.parentElement,
          ),
        ),
      );
      this.observer.observe(this.host.nativeElement, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['placeholder', 'aria-label', 'title'],
      });
    });
    effect(() => {
      this.i18n.language();
      queueMicrotask(() => this.translateTree(this.host.nativeElement));
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private translateTree(root: Element | null): void {
    if (!root) return;
    this.translateAttributes(root);
    root.querySelectorAll('*').forEach((element) => this.translateAttributes(element));
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    while (current) {
      const node = current as Text;
      const previous = this.originals.get(node);
      const previousEnglish = previous ? this.renderText(previous, 'en') : undefined;
      const source =
        previous && (node.data === previous || node.data === previousEnglish)
          ? previous
          : node.data;
      this.originals.set(node, source);
      const trimmed = source.trim();
      if (trimmed) {
        const next = source.replace(trimmed, this.i18n.t(trimmed));
        if (node.data !== next) node.data = next;
      }
      current = walker.nextNode();
    }
  }

  private translateAttributes(element: Element): void {
    let originals = this.attributeOriginals.get(element);
    if (!originals) {
      originals = new Map<string, string>();
      this.attributeOriginals.set(element, originals);
    }
    ['placeholder', 'aria-label', 'title'].forEach((name) => {
      const current = element.getAttribute(name);
      if (!current) return;
      const previous = originals?.get(name);
      const source =
        previous && (current === previous || current === this.i18n.translate(previous, 'en'))
          ? previous
          : current;
      originals?.set(name, source);
      const translated = this.i18n.t(source);
      if (current !== translated) element.setAttribute(name, translated);
    });
  }

  private renderText(source: string, language = this.i18n.language()): string {
    const trimmed = source.trim();
    return trimmed ? source.replace(trimmed, this.i18n.translate(trimmed, language)) : source;
  }
}
