import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { LanguageService } from '../core/i18n/language.service';

interface CalendarDay {
  readonly key: string;
  readonly day: number;
  readonly inCurrentMonth: boolean;
  readonly selected: boolean;
  readonly today: boolean;
}

let activeDateField: InlineEditableDateField | null = null;

@Component({
  selector: 'app-inline-editable-date-field',
  template: `
    <div class="date-field" [class.date-field--compact]="compact()">
      <span class="date-field__label">{{ label() }}</span>
      <div class="date-field__value">
        <b [class.is-placeholder]="!formattedValue()">{{ formattedValue() || placeholder() }}</b>
        <button
          type="button"
          class="edit"
          [class.is-visible]="alwaysShowEdit()"
          aria-label="Editar {{ label() }}"
          (click)="openCalendar()"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20ZM14 7l3 3" />
          </svg>
        </button>
      </div>

      @if (editing()) {
        <div class="calendar" role="dialog" aria-label="Seleccionar fecha">
          <header>
            <button type="button" aria-label="Mes anterior" (click)="changeMonth(-1)">‹</button>
            <strong>{{ monthTitle() }}</strong>
            <button type="button" aria-label="Mes siguiente" (click)="changeMonth(1)">›</button>
          </header>
          <div class="weekdays" aria-hidden="true">
            @for (weekday of weekdays(); track weekday) {
              <span>{{ weekday }}</span>
            }
          </div>
          <div class="days">
            @for (item of calendarDays(); track item.key) {
              <button
                type="button"
                [class.outside]="!item.inCurrentMonth"
                [class.selected]="item.selected"
                [class.today]="item.today"
                [attr.aria-label]="item.key"
                (click)="selectDate(item.key)"
              >
                {{ item.day }}
              </button>
            }
          </div>
          @if (includeTime()) {
            <label class="time-field"
              ><span>Hora</span
              ><input
                #timeInput
                type="time"
                [value]="selectedTime()"
                (input)="selectedTime.set(timeInput.value)"
            /></label>
          }
          <footer>
            <button type="button" class="today-button" (click)="selectToday()">Hoy</button>
            <div>
              <button type="button" class="cancel" (click)="cancel()">Cancelar</button>
              <button type="button" class="save" (click)="save()">Guardar</button>
            </div>
          </footer>
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
      .date-field {
        position: relative;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .date-field__label {
        color: var(--color-text-secondary);
        font-size: 11px;
      }
      .date-field__value {
        min-height: 30px;
        display: flex;
        flex-direction: row !important;
        align-items: center;
        gap: 8px;
      }
      .date-field__value b {
        color: var(--color-text-primary);
        font-size: 12.5px;
      }
      .date-field__value b.is-placeholder {
        color: var(--color-text-secondary);
        font-weight: 600;
      }
      .date-field--compact {
        gap: 0;
      }
      .date-field--compact .date-field__label {
        display: none;
      }
      .date-field--compact .date-field__value {
        min-height: 32px;
        padding: 0 5px 0 11px;
        border-radius: 7px;
        cursor: pointer;
      }
      .date-field--compact .date-field__value b {
        max-width: 92px;
        overflow: hidden;
        font-size: 11px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .date-field--compact .edit {
        width: 24px;
        height: 24px;
        flex-basis: 24px;
      }
      .date-field--compact .calendar {
        right: 0;
        left: auto;
        top: 40px;
      }
      button {
        border: 0;
        font: inherit;
        cursor: pointer;
      }
      .edit {
        width: 28px;
        height: 28px;
        flex: 0 0 28px;
        border-radius: 7px;
        background: transparent;
        color: var(--color-text-secondary);
        display: grid;
        place-items: center;
        opacity: 0;
      }
      .date-field:hover .edit,
      .edit.is-visible,
      .edit:focus-visible {
        opacity: 1;
      }
      .edit:hover {
        background: var(--color-muted);
        color: var(--color-primary);
      }
      svg {
        width: 15px;
        height: 15px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .calendar {
        position: absolute;
        left: 0;
        top: 54px;
        z-index: 30;
        width: 292px;
        padding: 14px;
        border: 1px solid var(--color-border);
        border-radius: 14px;
        background: var(--color-surface);
        box-shadow: 0 18px 45px rgba(15, 23, 42, 0.2);
      }
      .calendar header {
        display: flex;
        flex-direction: row !important;
        align-items: center;
        justify-content: space-between;
      }
      .calendar header strong {
        color: var(--color-text-primary);
        font-size: 13px;
        text-transform: capitalize;
      }
      .calendar header button {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        background: var(--color-muted);
        color: var(--color-text-primary);
        font-size: 22px;
        line-height: 1;
      }
      .calendar header button:hover {
        background: #dbeafe;
        color: #2563eb;
      }
      .weekdays,
      .days {
        display: grid !important;
        grid-template-columns: repeat(7, 1fr);
      }
      .weekdays {
        margin-top: 12px;
        color: var(--color-text-secondary);
        font-size: 9px;
        font-weight: 800;
        text-align: center;
      }
      .weekdays span {
        padding: 5px 0;
      }
      .days {
        gap: 3px;
      }
      .days button {
        position: relative;
        width: 33px;
        height: 33px;
        border-radius: 9px;
        background: transparent;
        color: var(--color-text-primary);
        font-size: 11px;
      }
      .days button:hover {
        background: var(--color-muted);
      }
      .days button.outside {
        color: var(--color-text-secondary);
        opacity: 0.42;
      }
      .days button.today::after {
        content: '';
        position: absolute;
        left: 50%;
        bottom: 3px;
        width: 3px;
        height: 3px;
        border-radius: 50%;
        background: #2563eb;
        transform: translateX(-50%);
      }
      .days button.selected {
        background: #2563eb;
        color: #fff;
        font-weight: 800;
        box-shadow: 0 5px 12px rgba(37, 99, 235, 0.28);
      }
      .days button.selected::after {
        background: #fff;
      }
      .calendar footer {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--color-border);
        display: flex;
        flex-direction: row !important;
        align-items: center;
        justify-content: space-between;
      }
      .time-field {
        margin-top: 12px;
        padding: 10px;
        border-radius: 9px;
        background: var(--color-muted);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .time-field span {
        color: var(--color-text-secondary);
        font-size: 10px;
        font-weight: 750;
      }
      .time-field input {
        width: 110px;
        padding: 6px 8px;
        border: 1px solid var(--color-border);
        border-radius: 7px;
        outline: 0;
        background: var(--color-surface);
        color: var(--color-text-primary);
        font: inherit;
        font-size: 11px;
      }
      .calendar footer > div {
        display: flex;
        flex-direction: row !important;
        gap: 5px;
      }
      .calendar footer button {
        min-height: 31px;
        padding: 0 10px;
        border-radius: 8px;
        background: transparent;
        color: var(--color-text-secondary);
        font-size: 10px;
        font-weight: 750;
      }
      .calendar footer .today-button {
        color: #2563eb;
      }
      .calendar footer .cancel:hover {
        background: var(--color-muted);
      }
      .calendar footer .save {
        background: #2563eb;
        color: #fff;
      }
      @media (max-width: 520px) {
        .calendar {
          position: fixed;
          left: 50%;
          top: 50%;
          width: min(292px, calc(100vw - 28px));
          transform: translate(-50%, -50%);
        }
      }
      @media (hover: none) {
        .edit {
          opacity: 1;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InlineEditableDateField {
  private readonly i18n = inject(LanguageService);
  readonly label = input('Fecha de instalación');
  readonly value = input.required<string>();
  readonly includeTime = input(false);
  readonly placeholder = input('Seleccionar fecha');
  readonly alwaysShowEdit = input(false);
  readonly compact = input(false);
  readonly valueSaved = output<string>();
  readonly editing = signal(false);
  readonly selected = signal('');
  readonly selectedTime = signal('09:00');
  readonly visibleMonth = signal(this.firstDayOfMonth(new Date()));
  readonly weekdays = computed(() =>
    this.i18n.language() === 'en'
      ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
      : ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'],
  );

  readonly formattedValue = computed(() => this.formatDate(this.value()));
  readonly monthTitle = computed(() =>
    new Intl.DateTimeFormat(this.i18n.locale(), { month: 'long', year: 'numeric' }).format(
      this.visibleMonth(),
    ),
  );
  readonly calendarDays = computed<CalendarDay[]>(() => {
    const month = this.visibleMonth();
    const firstWeekday = (month.getDay() + 6) % 7;
    const firstCell = new Date(month.getFullYear(), month.getMonth(), 1 - firstWeekday);
    const today = this.toKey(new Date());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(
        firstCell.getFullYear(),
        firstCell.getMonth(),
        firstCell.getDate() + index,
      );
      const key = this.toKey(date);
      return {
        key,
        day: date.getDate(),
        inCurrentMonth: date.getMonth() === month.getMonth(),
        selected: key === this.selected(),
        today: key === today,
      };
    });
  });

  openCalendar(): void {
    if (activeDateField && activeDateField !== this) activeDateField.cancel();
    activeDateField = this;
    const date = this.parseDate(this.value()) ?? new Date();
    this.selected.set(this.toKey(date));
    this.visibleMonth.set(this.firstDayOfMonth(date));
    this.selectedTime.set(this.value().slice(11, 16) || '09:00');
    this.editing.set(true);
  }

  changeMonth(change: number): void {
    const current = this.visibleMonth();
    this.visibleMonth.set(new Date(current.getFullYear(), current.getMonth() + change, 1));
  }

  selectDate(key: string): void {
    this.selected.set(key);
    const date = this.parseDate(key);
    if (date) this.visibleMonth.set(this.firstDayOfMonth(date));
  }

  selectToday(): void {
    const today = new Date();
    this.selected.set(this.toKey(today));
    this.visibleMonth.set(this.firstDayOfMonth(today));
  }

  cancel(): void {
    this.editing.set(false);
    if (activeDateField === this) activeDateField = null;
  }

  save(): void {
    const nextValue = this.includeTime()
      ? `${this.selected()}T${this.selectedTime() || '09:00'}`
      : this.selected();
    if (this.selected() && nextValue !== this.value().slice(0, this.includeTime() ? 16 : 10))
      this.valueSaved.emit(nextValue);
    this.cancel();
  }

  private parseDate(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private formatDate(value: string): string {
    const date = this.parseDate(value);
    if (!date) return value;
    const formatted = new Intl.DateTimeFormat(this.i18n.locale(), {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
    return this.includeTime() && value.slice(11, 16)
      ? `${formatted}, ${value.slice(11, 16)}`
      : formatted;
  }

  private firstDayOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private toKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
