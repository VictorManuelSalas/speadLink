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
  templateUrl: './styled-picklist.html',
  styleUrl: './styled-picklist.scss',
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
  readonly openUpward = signal(false);
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
    this.open() ? this.close() : this.openMenu(event);
  }
  openMenu(event: Event): void {
    event.preventDefault();
    this.updateOpenDirection();
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
  private updateOpenDirection(): void {
    const rect = this.host.nativeElement.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    this.openUpward.set(spaceBelow < 280 && spaceAbove > spaceBelow);
  }
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.close();
  }
}
