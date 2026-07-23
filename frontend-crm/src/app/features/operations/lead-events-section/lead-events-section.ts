import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { InlineEditableDateField } from '../../../shared/inline-editable-date-field';
import { PicklistOption, StyledPicklist } from '../../../shared/styled-picklist';
import { CalendarEvent, CalendarEventType, CalendarStore } from '../../calendar/calendar-store';

@Component({
  selector: 'app-record-events-section',
  imports: [DatePipe, InlineEditableDateField, RouterLink, StyledPicklist],
  templateUrl: './lead-events-section.html',
  styleUrl: './lead-events-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordEventsSection {
  private readonly store = inject(CalendarStore);
  readonly recordType = input.required<'lead' | 'customer'>();
  readonly recordId = input.required<string>();
  readonly recordName = input.required<string>();
  readonly users = [
    { id: 'usr-andrea-torres', name: 'Andrea Torres', role: 'Ventas' },
    { id: 'usr-carlos-mendoza', name: 'Carlos Mendoza', role: 'Técnico' },
    { id: 'usr-ana-torres', name: 'Ana Torres', role: 'Administración' },
    { id: 'usr-jordan-mills', name: 'Jordan Mills', role: 'Soporte' },
    { id: 'usr-derek-paulsen', name: 'Derek Paulsen', role: 'Operaciones' },
  ] as const;
  readonly eventTypeOptions: ReadonlyArray<PicklistOption> = [
    { value: 'FOLLOW_UP', label: 'Seguimiento' },
    { value: 'INSTALLATION', label: 'Instalación' },
    { value: 'PAYMENT', label: 'Pago' },
    { value: 'MAINTENANCE', label: 'Mantenimiento' },
  ];
  readonly statusOptions: ReadonlyArray<PicklistOption> = [
    { value: 'SCHEDULED', label: 'Programado' },
    { value: 'COMPLETED', label: 'Completado' },
    { value: 'CANCELLED', label: 'Cancelado' },
  ];
  readonly userOptions: ReadonlyArray<PicklistOption> = this.users.map((user) => ({
    value: user.name,
    label: user.name,
    detail: user.role,
  }));
  readonly createOpen = signal(false);
  readonly selected = signal<CalendarEvent | null>(null);
  readonly menuId = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly draft = signal<Record<string, string>>({
    type: 'FOLLOW_UP',
    status: 'SCHEDULED',
    assignedTo: 'Andrea Torres',
    allDay: 'false',
  });
  readonly events = computed(() =>
    this.store
      .events()
      .filter((event) =>
        this.recordType() === 'lead'
          ? event.leadId === this.recordId()
          : event.clientId === this.recordId(),
      )
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
  );
  readonly dateRangeError = computed(() => {
    const start = this.draft()['startsAt'];
    const end = this.draft()['endsAt'];
    return Boolean(start && end && new Date(end).getTime() < new Date(start).getTime());
  });
  openCreate(): void {
    this.draft.set({
      type: 'FOLLOW_UP',
      status: 'SCHEDULED',
      assignedTo: 'Andrea Torres',
      allDay: 'false',
    });
    this.editingId.set(null);
    this.createOpen.set(true);
  }
  openEdit(event: CalendarEvent): void {
    this.draft.set({
      title: event.title,
      description: event.description,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      type: event.type,
      status: event.status,
      assignedTo: event.assignedTo,
      allDay: String(event.allDay),
    });
    this.editingId.set(event.id);
    this.menuId.set(null);
    this.selected.set(null);
    this.createOpen.set(true);
  }
  setDraft(key: string, value: string): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }
  canCreate(): boolean {
    const draft = this.draft();
    return Boolean(
      draft['title']?.trim() && draft['startsAt'] && draft['endsAt'] && !this.dateRangeError(),
    );
  }
  isAllDay(): boolean {
    return this.draft()['allDay'] === 'true';
  }
  setEventDate(key: 'startsAt' | 'endsAt', value: string): void {
    this.setDraft(key, value);
    if (key === 'startsAt' && !this.draft()['endsAt']) this.setDraft('endsAt', value);
  }
  createEvent(): void {
    if (!this.canCreate()) return;
    const draft = this.draft();
    const changes: Omit<CalendarEvent, 'id'> = {
      title: draft['title'],
      description: draft['description'] || 'Sin descripción.',
      startsAt: draft['startsAt'],
      endsAt: draft['endsAt'] || draft['startsAt'],
      type: (draft['type'] || 'FOLLOW_UP') as CalendarEventType,
      status: (draft['status'] || 'SCHEDULED') as CalendarEvent['status'],
      client: this.recordName(),
      assignedTo: draft['assignedTo'] || 'Andrea Torres',
      allDay: this.isAllDay(),
      leadId: this.recordType() === 'lead' ? this.recordId() : undefined,
      clientId: this.recordType() === 'customer' ? this.recordId() : undefined,
    };
    const editingId = this.editingId();
    const event = editingId ? this.store.update(editingId, changes) : this.store.add(changes);
    this.createOpen.set(false);
    this.editingId.set(null);
    this.selected.set(event ?? null);
  }
  viewEvent(event: CalendarEvent): void {
    this.menuId.set(null);
    this.selected.set(event);
  }
  toggleMenu(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.menuId.set(this.menuId() === id ? null : id);
  }
  deleteEvent(id: string): void {
    this.store.delete(id);
    this.menuId.set(null);
    if (this.selected()?.id === id) this.selected.set(null);
  }
  @HostListener('document:click')
  closeMenu(): void {
    this.menuId.set(null);
  }
  complete(id: string): void {
    this.store.complete(id);
    this.selected.set(this.store.events().find((event) => event.id === id) ?? null);
  }
  tone(type: CalendarEventType): string {
    return { INSTALLATION: 'green', FOLLOW_UP: 'violet', PAYMENT: 'amber', MAINTENANCE: 'blue' }[
      type
    ];
  }
  label(type: CalendarEventType): string {
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
  eventSymbol(type: CalendarEventType): string {
    return { INSTALLATION: '⌁', FOLLOW_UP: '◎', PAYMENT: '$', MAINTENANCE: '◇' }[type];
  }
  eventDuration(event: CalendarEvent): string {
    const start = new Date(event.startsAt).getTime();
    const end = new Date(event.endsAt).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 'Sin duración';
    const difference = end - start;
    if (event.allDay) {
      const days = Math.max(1, Math.ceil(difference / 86_400_000));
      return `${days} ${days === 1 ? 'día' : 'días'}`;
    }
    const totalMinutes = Math.floor(difference / 60_000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    const parts = [
      days ? `${days} d` : '',
      hours ? `${hours} h` : '',
      minutes || (!days && !hours) ? `${minutes} min` : '',
    ].filter(Boolean);
    return parts.join(' ');
  }
  userInitials(name?: string): string {
    return (name || 'Andrea Torres')
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }
}
