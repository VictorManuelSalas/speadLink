import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CalendarEvent, CalendarEventType, CalendarStore } from './calendar-store';
import { InlineEditableDateField } from '../../shared/inline-editable-date-field';
import { PicklistOption, StyledPicklist } from '../../shared/styled-picklist';

@Component({
  selector: 'app-calendar-page',
  imports: [DatePipe, InlineEditableDateField, StyledPicklist],
  template: `
    <header class="calendar-heading">
      <div>
        <span>OPERACIÓN</span>
        <h1>Calendario</h1>
        <p>Instalaciones, seguimientos, cobros y mantenimiento en una sola agenda.</p>
      </div>
      <button class="primary" type="button" (click)="createOpen.set(true)">＋ Nuevo evento</button>
    </header>

    <section class="calendar-metrics">
      <article>
        <span class="metric-icon metric-icon--blue">▣</span
        ><span
          ><small>Eventos del mes</small><b>{{ monthEvents().length }}</b
          ><em>Julio 2026</em></span
        >
      </article>
      <article>
        <span class="metric-icon metric-icon--green">✓</span
        ><span
          ><small>Completados</small><b>{{ completedCount() }}</b
          ><em>Operación al día</em></span
        >
      </article>
      <article>
        <span class="metric-icon metric-icon--amber">⌁</span
        ><span
          ><small>Próximas instalaciones</small><b>{{ installationCount() }}</b
          ><em>Por coordinar</em></span
        >
      </article>
      <article>
        <span class="metric-icon metric-icon--violet">◎</span
        ><span
          ><small>Seguimientos</small><b>{{ followUpCount() }}</b
          ><em>Equipo comercial</em></span
        >
      </article>
    </section>

    <section class="calendar-layout">
      <article class="card calendar-card">
        <header class="calendar-toolbar">
          <div class="month-navigation">
            <button type="button" aria-label="Mes anterior">‹</button
            ><button type="button">Hoy</button
            ><button type="button" aria-label="Mes siguiente">›</button>
            <h2>Julio 2026</h2>
          </div>
          <div class="filters">
            @for (filter of filters; track filter.value) {
              <button
                type="button"
                [class.is-active]="activeFilter() === filter.value"
                (click)="activeFilter.set(filter.value)"
              >
                <i class="dot dot--{{ filter.tone }}"></i>{{ filter.label }}
              </button>
            }
          </div>
        </header>
        <div class="weekdays">
          @for (day of weekdays; track day) {
            <span>{{ day }}</span>
          }
        </div>
        <div class="month-grid">
          @for (day of days; track day.iso) {
            <div
              class="day"
              [class.outside]="!day.current"
              [class.today]="day.iso === '2026-07-18'"
            >
              <span class="day-number">{{ day.day }}</span>
              <div class="day-events">
                @for (event of eventsFor(day.iso); track event.id) {
                  <button
                    type="button"
                    class="event event--{{ toneFor(event.type) }}"
                    (click)="selectedEvent.set(event)"
                  >
                    <time>{{
                      event.allDay ? 'Todo el día' : (event.startsAt | date: 'HH:mm')
                    }}</time
                    ><span>{{ event.title }}</span>
                  </button>
                }
              </div>
            </div>
          }
        </div>
      </article>

      <aside class="card agenda">
        <header>
          <div>
            <span>PRÓXIMOS</span>
            <h2>Agenda</h2>
          </div>
          <b>{{ upcomingEvents().length }}</b>
        </header>
        <div class="agenda-list">
          @for (event of upcomingEvents(); track event.id) {
            <button type="button" (click)="selectedEvent.set(event)">
              <span class="agenda-date"
                ><b>{{ event.startsAt | date: 'dd' }}</b
                ><small>{{ event.startsAt | date: 'MMM' }}</small></span
              >
              <span class="agenda-copy"
                ><i class="dot dot--{{ toneFor(event.type) }}"></i><b>{{ event.title }}</b
                ><small>{{ event.startsAt | date: 'HH:mm' }} · {{ event.client }}</small
                ><em>{{ event.assignedTo }}</em></span
              >
            </button>
          } @empty {
            <p>No hay eventos con este filtro.</p>
          }
        </div>
      </aside>
    </section>

    @if (selectedEvent(); as event) {
      <button
        class="backdrop"
        type="button"
        aria-label="Cerrar"
        (click)="selectedEvent.set(null)"
      ></button>
      <section class="event-modal" role="dialog" aria-modal="true">
        <header>
          <span class="event-symbol event-symbol--{{ toneFor(event.type) }}">{{
            symbolFor(event.type)
          }}</span>
          <div>
            <small>{{ labelFor(event.type) }}</small>
            <h2>{{ event.title }}</h2>
            <p>{{ event.id }}</p>
          </div>
          <button type="button" (click)="selectedEvent.set(null)">×</button>
        </header>
        <div class="event-detail">
          <p>{{ event.description }}</p>
          <dl>
            <div>
              <dt>Fecha y hora</dt>
              <dd>
                {{ event.startsAt | date: 'EEEE, dd MMM y · HH:mm' }}–{{
                  event.endsAt | date: 'HH:mm'
                }}
              </dd>
            </div>
            <div>
              <dt>Cliente</dt>
              <dd>{{ event.client }}</dd>
            </div>
            <div>
              <dt>Responsable</dt>
              <dd>
                <span class="avatar">{{ initials(event.assignedTo) }}</span
                >{{ event.assignedTo }}
              </dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>
                <span class="status status--{{ event.status.toLowerCase() }}">{{
                  statusLabel(event.status)
                }}</span>
              </dd>
            </div>
          </dl>
        </div>
        <footer>
          <button type="button" (click)="selectedEvent.set(null)">Cerrar</button
          ><button class="primary" type="button" (click)="completeEvent(event.id)">
            Marcar completado
          </button>
        </footer>
      </section>
    }

    @if (createOpen()) {
      <button
        class="backdrop"
        type="button"
        aria-label="Cerrar"
        (click)="createOpen.set(false)"
      ></button>
      <section class="event-modal create-modal" role="dialog" aria-modal="true">
        <header>
          <span class="event-symbol event-symbol--blue">＋</span>
          <div>
            <small>CALENDARIO</small>
            <h2>Nuevo evento</h2>
            <p>Programa una actividad para el equipo.</p>
          </div>
          <button type="button" (click)="createOpen.set(false)">×</button>
        </header>
        <div class="event-form">
          <label class="full"
            >Asunto *<input
              #titleInput
              type="text"
              required
              (input)="setDraft('title', titleInput.value)"
          /></label>
          <label
            >Tipo<app-styled-picklist
              [options]="eventTypeOptions"
              [value]="draft()['type'] || 'INSTALLATION'"
              (valueChange)="setDraft('type', $event)"
          /></label>
          <label
            >Cliente<input #clientInput type="text" (input)="setDraft('client', clientInput.value)"
          /></label>
          <div class="form-date">
            <app-inline-editable-date-field
              label="Inicio *"
              [value]="draft()['startsAt'] || ''"
              [includeTime]="true"
              [alwaysShowEdit]="true"
              [compact]="true"
              placeholder="Seleccionar inicio"
              (valueSaved)="setDraft('startsAt', $event)"
            />
          </div>
          <div class="form-date">
            <app-inline-editable-date-field
              label="Fin *"
              [value]="draft()['endsAt'] || ''"
              [includeTime]="true"
              [alwaysShowEdit]="true"
              [compact]="true"
              placeholder="Seleccionar fin"
              (valueSaved)="setDraft('endsAt', $event)"
            />
          </div>
          <label class="full"
            >Descripción<textarea
              #descriptionInput
              rows="3"
              (input)="setDraft('description', descriptionInput.value)"
            ></textarea>
          </label>
        </div>
        <footer>
          <button type="button" (click)="createOpen.set(false)">Cancelar</button
          ><button class="primary" type="button" [disabled]="!canCreate()" (click)="createEvent()">
            Crear evento
          </button>
        </footer>
      </section>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .calendar-heading {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 20px;
      }
      .calendar-heading > div > span,
      .agenda header span,
      .event-modal header small {
        color: var(--color-primary);
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.09em;
      }
      .calendar-heading h1 {
        margin-top: 4px;
        font-size: 25px;
      }
      .calendar-heading p {
        margin-top: 5px;
        color: var(--color-text-secondary);
        font-size: 11px;
      }
      .primary {
        min-height: 39px;
        padding: 0 15px;
        border: 1px solid var(--color-primary);
        border-radius: 9px;
        background: var(--color-primary);
        color: #fff;
        font: inherit;
        font-weight: 750;
      }
      .calendar-metrics {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        margin-bottom: 16px;
      }
      .calendar-metrics article {
        padding: 14px;
        border: 1px solid var(--color-border);
        border-radius: 11px;
        background: var(--color-surface);
        display: flex;
        align-items: center;
        gap: 11px;
      }
      .metric-icon {
        width: 36px;
        height: 36px;
        border-radius: 9px;
        display: grid;
        place-items: center;
        background: #dbeafe;
        color: #2563eb;
      }
      .metric-icon--green {
        background: #d1fae5;
        color: #059669;
      }
      .metric-icon--amber {
        background: #fef3c7;
        color: #d97706;
      }
      .metric-icon--violet {
        background: #ede9fe;
        color: #7c3aed;
      }
      .calendar-metrics article > span:last-child {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        flex: 1;
      }
      .calendar-metrics small,
      .calendar-metrics em {
        color: var(--color-text-secondary);
        font-size: 8px;
        font-style: normal;
      }
      .calendar-metrics b {
        grid-column: 2;
        grid-row: 1/3;
        font-size: 18px;
      }
      .calendar-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 285px;
        gap: 14px;
      }
      .calendar-card {
        overflow: hidden;
      }
      .calendar-toolbar {
        min-height: 65px;
        padding: 12px 15px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        border-bottom: 1px solid var(--color-border);
      }
      .month-navigation {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .month-navigation button,
      .filters button {
        height: 31px;
        padding: 0 9px;
        border: 1px solid var(--color-border);
        border-radius: 7px;
        background: var(--color-surface);
        color: var(--color-text-secondary);
        font: inherit;
        font-size: 8.5px;
      }
      .month-navigation h2 {
        margin-left: 8px;
        font-size: 13px;
      }
      .filters {
        display: flex;
        gap: 4px;
      }
      .filters button {
        display: flex;
        align-items: center;
        gap: 5px;
        border-color: transparent;
      }
      .filters button.is-active {
        border-color: var(--color-border);
        background: var(--color-muted);
        color: var(--color-text-primary);
      }
      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #3b82f6;
      }
      .dot--green {
        background: #10b981;
      }
      .dot--amber {
        background: #f59e0b;
      }
      .dot--violet {
        background: #8b5cf6;
      }
      .weekdays,
      .month-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
      }
      .weekdays {
        border-bottom: 1px solid var(--color-border);
      }
      .weekdays span {
        padding: 9px 8px;
        color: var(--color-text-secondary);
        font-size: 7.5px;
        font-weight: 800;
        text-align: right;
        text-transform: uppercase;
      }
      .day {
        min-width: 0;
        min-height: 112px;
        padding: 7px;
        border-right: 1px solid var(--color-border);
        border-bottom: 1px solid var(--color-border);
        background: var(--color-surface);
      }
      .day:nth-child(7n) {
        border-right: 0;
      }
      .day.outside {
        background: color-mix(in srgb, var(--color-muted) 65%, var(--color-surface));
        opacity: 0.6;
      }
      .day-number {
        width: 22px;
        height: 22px;
        margin-left: auto;
        display: grid;
        place-items: center;
        border-radius: 50%;
        font-size: 8.5px;
      }
      .day.today .day-number {
        background: var(--color-primary);
        color: #fff;
        font-weight: 800;
      }
      .day-events {
        margin-top: 5px;
        display: grid;
        gap: 3px;
      }
      .event {
        min-width: 0;
        padding: 4px 5px;
        border: 0;
        border-left: 2px solid #3b82f6;
        border-radius: 4px;
        background: #eff6ff;
        color: #1e40af;
        display: flex;
        gap: 4px;
        text-align: left;
        font: inherit;
        font-size: 7px;
      }
      .event time {
        color: inherit;
        font-size: 6.5px;
      }
      .event span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .event--green {
        border-color: #10b981;
        background: #ecfdf5;
        color: #047857;
      }
      .event--amber {
        border-color: #f59e0b;
        background: #fffbeb;
        color: #b45309;
      }
      .event--violet {
        border-color: #8b5cf6;
        background: #f5f3ff;
        color: #6d28d9;
      }
      .agenda {
        overflow: hidden;
      }
      .agenda > header {
        height: 65px;
        padding: 12px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid var(--color-border);
      }
      .agenda h2 {
        margin-top: 3px;
        font-size: 14px;
      }
      .agenda > header > b {
        width: 25px;
        height: 25px;
        border-radius: 50%;
        background: var(--color-muted);
        display: grid;
        place-items: center;
        font-size: 8px;
      }
      .agenda-list {
        padding: 6px 12px;
      }
      .agenda-list > button {
        width: 100%;
        padding: 11px 2px;
        border: 0;
        border-bottom: 1px solid var(--color-border);
        background: transparent;
        color: var(--color-text-primary);
        display: grid;
        grid-template-columns: 36px 1fr;
        gap: 10px;
        text-align: left;
      }
      .agenda-date {
        height: 43px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
      .agenda-date b {
        font-size: 12px;
      }
      .agenda-date small {
        font-size: 7px;
        text-transform: uppercase;
      }
      .agenda-copy {
        min-width: 0;
        position: relative;
        padding-left: 11px;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .agenda-copy > .dot {
        position: absolute;
        left: 0;
        top: 4px;
      }
      .agenda-copy b {
        overflow: hidden;
        font-size: 9.5px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .agenda-copy small,
      .agenda-copy em {
        color: var(--color-text-secondary);
        font-size: 7.5px;
        font-style: normal;
      }
      .agenda-list > p {
        padding: 40px 5px;
        color: var(--color-text-secondary);
        font-size: 9px;
        text-align: center;
      }
      .backdrop {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 1000;
        border: 0;
        background: rgba(15, 23, 42, 0.52);
        backdrop-filter: blur(3px);
      }
      .event-modal {
        position: fixed;
        left: 50%;
        top: 50%;
        z-index: 1001;
        width: min(560px, calc(100vw - 28px));
        max-height: calc(100vh - 28px);
        overflow-y: auto;
        border: 1px solid var(--color-border);
        border-radius: 15px;
        background: var(--color-surface);
        box-shadow: 0 30px 80px rgba(15, 23, 42, 0.3);
        transform: translate(-50%, -50%);
      }
      .event-modal > header {
        padding: 18px 20px;
        display: flex;
        align-items: center;
        gap: 11px;
        border-bottom: 1px solid var(--color-border);
      }
      .event-modal header h2 {
        margin-top: 3px;
        font-size: 17px;
      }
      .event-modal header p {
        margin-top: 3px;
        color: var(--color-text-secondary);
        font-size: 8px;
      }
      .event-modal header > button {
        width: 31px;
        height: 31px;
        margin-left: auto;
        border: 0;
        border-radius: 50%;
        background: var(--color-muted);
        color: var(--color-text-primary);
        font-size: 20px;
      }
      .event-symbol {
        width: 39px;
        height: 39px;
        border-radius: 10px;
        background: #dbeafe;
        color: #2563eb;
        display: grid;
        place-items: center;
      }
      .event-symbol--green {
        background: #d1fae5;
        color: #059669;
      }
      .event-symbol--amber {
        background: #fef3c7;
        color: #d97706;
      }
      .event-symbol--violet {
        background: #ede9fe;
        color: #7c3aed;
      }
      .event-detail {
        padding: 20px;
      }
      .event-detail > p {
        padding: 12px;
        border-radius: 8px;
        background: var(--color-muted);
        font-size: 9.5px;
        line-height: 1.5;
      }
      .event-detail dl {
        margin: 17px 0 0;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
      }
      .event-detail dl > div {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .event-detail dt {
        color: var(--color-text-secondary);
        font-size: 8px;
      }
      .event-detail dd {
        margin: 0;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 9.5px;
        font-weight: 700;
      }
      .avatar {
        width: 25px;
        height: 25px;
        border-radius: 50%;
        background: #dbeafe;
        color: #1d4ed8;
        display: grid;
        place-items: center;
        font-size: 7px;
      }
      .status {
        padding: 5px 7px;
        border-radius: 99px;
        background: #dbeafe;
        color: #1d4ed8;
        font-size: 7.5px;
      }
      .status--completed {
        background: #d1fae5;
        color: #047857;
      }
      .status--cancelled {
        background: #fee2e2;
        color: #b91c1c;
      }
      .event-modal > footer {
        padding: 13px 20px 18px;
        border-top: 1px solid var(--color-border);
        display: flex;
        justify-content: flex-end;
        gap: 7px;
      }
      .event-modal > footer button {
        height: 35px;
        padding: 0 11px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-surface);
        color: var(--color-text-primary);
        font: inherit;
        font-size: 9px;
        font-weight: 700;
      }
      .event-modal > footer .primary {
        border-color: var(--color-primary);
        background: var(--color-primary);
        color: #fff;
      }
      .event-form {
        padding: 20px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .event-form label {
        display: flex;
        flex-direction: column;
        gap: 5px;
        color: var(--color-text-secondary);
        font-size: 9px;
        font-weight: 700;
      }
      .event-form label.full {
        grid-column: 1/-1;
      }
      .event-form input,
      .event-form select,
      .event-form textarea {
        padding: 0 10px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        outline: 0;
        background: var(--color-background);
        color: var(--color-text-primary);
        font: inherit;
        font-size: 9.5px;
      }
      .event-form input,
      .event-form select {
        height: 38px;
      }
      .event-form textarea {
        padding-block: 9px;
        resize: vertical;
      }
      .form-date {
        min-height: 40px;
        padding: 4px;
        border: 1px solid var(--color-border);
        border-radius: 9px;
        background: var(--color-background);
      }
      @media (max-width: 1050px) {
        .calendar-layout {
          grid-template-columns: 1fr;
        }
        .agenda-list {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0 15px;
        }
      }
      @media (max-width: 760px) {
        .calendar-heading {
          align-items: stretch;
          flex-direction: column;
        }
        .calendar-metrics {
          grid-template-columns: 1fr 1fr;
        }
        .calendar-card {
          overflow-x: auto;
        }
        .calendar-toolbar,
        .weekdays,
        .month-grid {
          min-width: 760px;
        }
        .filters {
          display: none;
        }
        .agenda-list {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 480px) {
        .calendar-metrics,
        .event-form,
        .event-detail dl {
          grid-template-columns: 1fr;
        }
        .event-form label.full {
          grid-column: auto;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarPage {
  private readonly calendarStore = inject(CalendarStore);
  readonly weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  readonly filters = [
    { label: 'Todos', value: 'ALL', tone: 'blue' },
    { label: 'Instalaciones', value: 'INSTALLATION', tone: 'green' },
    { label: 'Seguimientos', value: 'FOLLOW_UP', tone: 'violet' },
    { label: 'Pagos', value: 'PAYMENT', tone: 'amber' },
  ] as const;
  readonly eventTypeOptions: ReadonlyArray<PicklistOption> = [
    { value: 'INSTALLATION', label: 'Instalación' },
    { value: 'FOLLOW_UP', label: 'Seguimiento' },
    { value: 'PAYMENT', label: 'Pago' },
    { value: 'MAINTENANCE', label: 'Mantenimiento' },
  ];
  readonly days = Array.from({ length: 35 }, (_, index) => {
    const date = new Date(2026, 5, 29 + index);
    return {
      day: date.getDate(),
      current: date.getMonth() === 6,
      iso: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    };
  });
  readonly events = this.calendarStore.events;
  readonly activeFilter = signal<string>('ALL');
  readonly selectedEvent = signal<CalendarEvent | null>(null);
  readonly createOpen = signal(false);
  readonly draft = signal<Record<string, string>>({ type: 'INSTALLATION' });
  readonly monthEvents = computed(() =>
    this.events().filter((event) => event.startsAt.startsWith('2026-07')),
  );
  readonly completedCount = computed(
    () => this.events().filter((event) => event.status === 'COMPLETED').length,
  );
  readonly installationCount = computed(
    () =>
      this.events().filter((event) => event.type === 'INSTALLATION' && event.status === 'SCHEDULED')
        .length,
  );
  readonly followUpCount = computed(
    () => this.events().filter((event) => event.type === 'FOLLOW_UP').length,
  );
  readonly upcomingEvents = computed(() =>
    this.events()
      .filter(
        (event) =>
          event.status === 'SCHEDULED' &&
          (this.activeFilter() === 'ALL' || event.type === this.activeFilter()),
      )
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
  );
  eventsFor(day: string): ReadonlyArray<CalendarEvent> {
    return this.events().filter(
      (event) =>
        event.startsAt.startsWith(day) &&
        (this.activeFilter() === 'ALL' || event.type === this.activeFilter()),
    );
  }
  toneFor(type: CalendarEventType): string {
    return { INSTALLATION: 'green', FOLLOW_UP: 'violet', PAYMENT: 'amber', MAINTENANCE: 'blue' }[
      type
    ];
  }
  symbolFor(type: CalendarEventType): string {
    return { INSTALLATION: '⌁', FOLLOW_UP: '◎', PAYMENT: '$', MAINTENANCE: '◇' }[type];
  }
  labelFor(type: CalendarEventType): string {
    return {
      INSTALLATION: 'INSTALACIÓN',
      FOLLOW_UP: 'SEGUIMIENTO',
      PAYMENT: 'PAGO',
      MAINTENANCE: 'MANTENIMIENTO',
    }[type];
  }
  statusLabel(status: CalendarEvent['status']): string {
    return { SCHEDULED: 'Programado', COMPLETED: 'Completado', CANCELLED: 'Cancelado' }[status];
  }
  initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }
  setDraft(key: string, value: string): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }
  canCreate(): boolean {
    const draft = this.draft();
    return Boolean(
      draft['title']?.trim() &&
      draft['startsAt'] &&
      draft['endsAt'] &&
      new Date(draft['endsAt']).getTime() >= new Date(draft['startsAt']).getTime(),
    );
  }
  createEvent(): void {
    if (!this.canCreate()) return;
    const draft = this.draft();
    const event = this.calendarStore.add({
      title: draft['title'],
      description: draft['description'] || 'Sin descripción.',
      startsAt: draft['startsAt'],
      endsAt: draft['endsAt'],
      type: (draft['type'] || 'INSTALLATION') as CalendarEventType,
      status: 'SCHEDULED',
      client: draft['client']?.trim() || 'Sin registro relacionado',
      assignedTo: 'Andrea Torres',
      allDay: false,
    });
    this.draft.set({ type: 'INSTALLATION' });
    this.createOpen.set(false);
    this.selectedEvent.set(event);
  }
  completeEvent(id: string): void {
    this.calendarStore.complete(id);
    this.selectedEvent.update((event) =>
      event?.id === id ? { ...event, status: 'COMPLETED' } : event,
    );
  }
}
