import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { LanguageService } from '../core/i18n/language.service';

export interface PicklistOption {
  readonly value: string;
  readonly label: string;
  readonly detail?: string;
}

@Component({
  selector: 'app-styled-picklist',
  template: `
    <div class="picklist" [class.open]="open()" [class.disabled]="disabled()">
      <button
        class="trigger"
        type="button"
        [disabled]="disabled()"
        [attr.aria-expanded]="open()"
        aria-haspopup="listbox"
        (click)="toggle($event)"
        (keydown.arrowDown)="openMenu($event)"
        (keydown.escape)="close()"
      >
        <span [class.placeholder]="!selected()">{{ selected()?.label || placeholder() }}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
      </button>
      @if (open()) {
        <div class="menu" role="listbox" (click)="$event.stopPropagation()">
          @if (options().length > 6) {
            <label class="search"
              ><svg viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" /></svg
              ><input
                #searchInput
                type="search"
                placeholder="Buscar…"
                (input)="query.set(searchInput.value)"
            /></label>
          }
          <div class="options">
            @for (option of filtered(); track option.value) {
              <button
                type="button"
                role="option"
                [class.selected]="option.value === value()"
                [attr.aria-selected]="option.value === value()"
                (click)="choose(option.value)"
              >
                <span
                  ><b>{{ option.label }}</b>
                  @if (option.detail) {
                    <small>{{ option.detail }}</small>
                  }
                </span>
                @if (option.value === value()) {
                  <i>✓</i>
                }
              </button>
            } @empty {
              <p>Sin resultados</p>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .picklist {
        position: relative;
      }
      button,
      input {
        font: inherit;
      }
      .trigger {
        width: 100%;
        min-height: 40px;
        padding: 0 11px;
        border: 1px solid var(--color-border);
        border-radius: 9px;
        outline: 0;
        background: var(--color-background);
        color: var(--color-text-primary);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        text-align: left;
        cursor: pointer;
      }
      .trigger:hover {
        border-color: color-mix(in srgb, var(--color-primary) 45%, var(--color-border));
      }
      .open .trigger,
      .trigger:focus-visible {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent);
      }
      .trigger span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 650;
      }
      .trigger .placeholder {
        color: var(--color-text-secondary);
        font-weight: 500;
      }
      .trigger svg {
        width: 17px;
        height: 17px;
        flex: 0 0 17px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        transition: transform 0.16s ease;
      }
      .open .trigger svg {
        transform: rotate(180deg);
      }
      .disabled {
        opacity: 0.55;
      }
      .menu {
        position: absolute;
        left: 0;
        top: calc(100% + 6px);
        z-index: 1300;
        width: 100%;
        min-width: 220px;
        padding: 7px;
        border: 1px solid var(--color-border);
        border-radius: 11px;
        background: var(--color-surface);
        box-shadow: 0 18px 45px rgba(15, 23, 42, 0.2);
      }
      .search {
        height: 35px;
        padding: 0 9px;
        margin-bottom: 6px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-background);
        display: flex;
        align-items: center;
        gap: 7px;
      }
      .search svg {
        width: 14px;
        height: 14px;
        fill: none;
        stroke: var(--color-text-secondary);
        stroke-width: 1.8;
      }
      .search input {
        width: 100%;
        border: 0;
        outline: 0;
        background: transparent;
        color: var(--color-text-primary);
        font-size: 10px;
      }
      .options {
        max-height: 240px;
        overflow: auto;
      }
      .options button {
        width: 100%;
        min-height: 38px;
        padding: 7px 9px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: var(--color-text-primary);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        text-align: left;
        cursor: pointer;
      }
      .options button:hover,
      .options button.selected {
        background: color-mix(in srgb, var(--color-primary) 9%, var(--color-surface));
      }
      .options button > span {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .options b {
        font-size: 10px;
      }
      .options small {
        color: var(--color-text-secondary);
        font-size: 8.5px;
      }
      .options i {
        color: var(--color-primary);
        font-style: normal;
        font-weight: 900;
      }
      .options p {
        padding: 16px;
        color: var(--color-text-secondary);
        font-size: 10px;
        text-align: center;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StyledPicklist {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly i18n = inject(LanguageService);
  readonly options = input.required<ReadonlyArray<PicklistOption>>();
  readonly value = input('');
  readonly placeholder = input('Seleccionar…');
  readonly disabled = input(false);
  readonly valueChange = output<string>();
  readonly open = signal(false);
  readonly query = signal('');
  readonly selected = computed(() =>
    this.options().find((option) => option.value === this.value()),
  );
  readonly filtered = computed(() => {
    const query = this.query().trim().toLocaleLowerCase(this.i18n.locale());
    return query
      ? this.options().filter((option) =>
          `${option.label} ${option.detail || ''}`
            .toLocaleLowerCase(this.i18n.locale())
            .includes(query),
        )
      : this.options();
  });
  toggle(event: Event): void {
    event.stopPropagation();
    this.open() ? this.close() : this.open.set(true);
  }
  openMenu(event: Event): void {
    event.preventDefault();
    this.open.set(true);
  }
  choose(value: string): void {
    this.valueChange.emit(value);
    this.close();
  }
  close(): void {
    this.open.set(false);
    this.query.set('');
  }
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.close();
  }
}
