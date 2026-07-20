import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CalendarEvent, CalendarEventType, CalendarStore } from './calendar-store';
import { InlineEditableDateField } from '../../shared/inline-editable-date-field';
import { PicklistOption, StyledPicklist } from '../../shared/styled-picklist';

@Component({
  selector: 'app-calendar-page',
  imports: [DatePipe, InlineEditableDateField, StyledPicklist],
  templateUrl: './calendar-page.html',
  styleUrl: './calendar-page.scss',
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
