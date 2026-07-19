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
import { InlineEditableDateField } from '../../shared/inline-editable-date-field';
import { PicklistOption, StyledPicklist } from '../../shared/styled-picklist';
import { CalendarEvent, CalendarEventType, CalendarStore } from '../calendar/calendar-store';

@Component({
  selector: 'app-record-events-section',
  imports: [DatePipe, InlineEditableDateField, RouterLink, StyledPicklist],
  template: `
    <section class="events-section">
      <header>
        <div>
          <h2>Eventos</h2>
          <p>{{ events().length }} evento(s) conectados con este registro</p>
        </div>
        <div>
          <a class="button" routerLink="/calendar">Ver calendario</a
          ><button class="button button--primary" type="button" (click)="openCreate()">
            ＋ Nuevo evento
          </button>
        </div>
      </header>
      <div class="event-list">
        @for (event of events(); track event.id) {
          <article
            class="card event-card"
            tabindex="0"
            (click)="viewEvent(event)"
            (keydown.enter)="viewEvent(event)"
          >
            <span class="event-date"
              ><b>{{ event.startsAt | date: 'dd' }}</b
              ><small>{{ event.startsAt | date: 'MMM' }}</small></span
            ><span class="event-copy"
              ><span><i class="dot dot--{{ tone(event.type) }}"></i>{{ label(event.type) }}</span
              ><b>{{ event.title }}</b
              ><small
                >{{
                  event.allDay
                    ? 'Todo el día'
                    : (event.startsAt | date: 'HH:mm') + '–' + (event.endsAt | date: 'HH:mm')
                }}
                · {{ event.assignedTo }}</small
              ></span
            ><span class="event-status event-status--{{ event.status.toLowerCase() }}">{{
              statusLabel(event.status)
            }}</span
            ><button
              class="event-menu-trigger"
              type="button"
              aria-label="Opciones del evento"
              (click)="toggleMenu($event, event.id)"
            >
              •••
            </button>
            @if (menuId() === event.id) {
              <div class="event-action-menu" (click)="$event.stopPropagation()">
                <button type="button" (click)="viewEvent(event)"><span>↗</span>Ver</button>
                <button type="button" (click)="openEdit(event)"><span>✎</span>Editar</button>
                <button class="danger" type="button" (click)="deleteEvent(event.id)">
                  <span>⊘</span>Eliminar
                </button>
              </div>
            }
          </article>
        } @empty {
          <article class="card section-empty">
            <span>◇</span>
            <h3>Sin eventos todavía</h3>
            <p>Los eventos creados para este registro aparecerán aquí y en el calendario.</p>
            <button class="button button--primary" type="button" (click)="openCreate()">
              ＋ Crear evento
            </button>
          </article>
        }
      </div>
    </section>

    @if (createOpen()) {
      <button
        class="backdrop"
        type="button"
        aria-label="Cerrar"
        (click)="createOpen.set(false)"
      ></button>
      <section class="event-modal" role="dialog" aria-modal="true">
        <header>
          <div>
            <span>CALENDARIO</span>
            <h2>{{ editingId() ? 'Editar evento' : 'Nuevo evento' }}</h2>
            <p>Se relacionará automáticamente con {{ recordName() }}.</p>
          </div>
          <button type="button" (click)="createOpen.set(false)">×</button>
        </header>
        <div class="event-form">
          <label class="full"
            ><span>Asunto <i class="required">*</i></span
            ><input
              #title
              required
              [value]="draft()['title'] || ''"
              (input)="setDraft('title', title.value)" /></label
          ><label
            ><span>Tipo</span>
            <app-styled-picklist
              [options]="eventTypeOptions"
              [value]="draft()['type'] || 'FOLLOW_UP'"
              (valueChange)="setDraft('type', $event)" /></label
          ><label
            ><span>Responsable</span>
            <app-styled-picklist
              [options]="userOptions"
              [value]="draft()['assignedTo'] || 'Andrea Torres'"
              (valueChange)="setDraft('assignedTo', $event)" /></label
          ><label
            ><span>Estado</span>
            <app-styled-picklist
              [options]="statusOptions"
              [value]="draft()['status'] || 'SCHEDULED'"
              (valueChange)="setDraft('status', $event)"
          /></label>
          <div class="field-group">
            <span>Registro relacionado</span>
            <div class="related-record">
              <span class="related-record__icon">{{ recordType() === 'lead' ? 'LD' : 'CL' }}</span>
              <span class="related-record__copy"
                ><b>{{ recordName() }}</b
                ><small
                  >{{ recordType() === 'lead' ? 'Lead' : 'Cliente' }} · {{ recordId() }}</small
                ></span
              ><span class="related-record__check">✓</span>
            </div>
          </div>
          <div class="date-control">
            <app-inline-editable-date-field
              label="Inicio *"
              [includeTime]="!isAllDay()"
              [alwaysShowEdit]="true"
              placeholder="Seleccionar inicio"
              [value]="draft()['startsAt'] || ''"
              (valueSaved)="setEventDate('startsAt', $event)"
            />
          </div>
          <div class="date-control">
            <app-inline-editable-date-field
              label="Fin *"
              [includeTime]="!isAllDay()"
              [alwaysShowEdit]="true"
              placeholder="Seleccionar fin"
              [value]="draft()['endsAt'] || ''"
              (valueSaved)="setEventDate('endsAt', $event)"
            />
          </div>
          <label class="all-day full"
            ><input
              #allDay
              type="checkbox"
              [checked]="isAllDay()"
              (change)="setDraft('allDay', allDay.checked ? 'true' : 'false')"
            /><span
              ><b>Todo el día</b><small>Oculta la hora y reserva el día completo.</small></span
            ></label
          >
          @if (dateRangeError()) {
            <p class="form-error full">
              La fecha de fin no puede ser menor que la fecha de inicio.
            </p>
          }
          <p class="required-help full"><i>*</i> Asunto, inicio y fin son obligatorios.</p>
          <label class="full"
            >Descripción<textarea
              #description
              rows="3"
              [value]="draft()['description'] || ''"
              (input)="setDraft('description', description.value)"
            ></textarea>
          </label>
        </div>
        <footer>
          <button class="button" type="button" (click)="createOpen.set(false)">Cancelar</button
          ><button
            class="button button--primary"
            type="button"
            [disabled]="!canCreate()"
            (click)="createEvent()"
          >
            {{ editingId() ? 'Guardar cambios' : 'Crear evento' }}
          </button>
        </footer>
      </section>
    }
    @if (selected(); as event) {
      <button
        class="backdrop"
        type="button"
        aria-label="Cerrar"
        (click)="selected.set(null)"
      ></button>
      <section class="event-modal event-preview" role="dialog" aria-modal="true">
        <header class="event-preview__header">
          <span class="preview-symbol preview-symbol--{{ tone(event.type) }}">{{
            eventSymbol(event.type)
          }}</span>
          <div class="preview-title">
            <span>{{ label(event.type) }}</span>
            <h2>{{ event.title }}</h2>
            <p>{{ event.id }} · {{ event.client }}</p>
          </div>
          <span class="preview-status preview-status--{{ event.status.toLowerCase() }}">{{
            statusLabel(event.status)
          }}</span>
          <button type="button" (click)="selected.set(null)">×</button>
        </header>
        <article class="event-preview__content">
          <section class="preview-description">
            <span>DESCRIPCIÓN</span>
            <p>{{ event.description }}</p>
          </section>
          <div class="preview-details">
            <section class="preview-detail preview-detail--wide">
              <span class="preview-detail__icon">▣</span>
              <div>
                <small>Fecha y hora</small><b>{{ event.startsAt | date: 'EEEE, dd MMM y' }}</b>
                <p>
                  {{
                    event.allDay
                      ? 'Todo el día'
                      : (event.startsAt | date: 'HH:mm') + ' – ' + (event.endsAt | date: 'HH:mm')
                  }}
                </p>
              </div>
            </section>
            <section class="preview-detail">
              <span class="preview-detail__icon">◷</span>
              <div>
                <small>Duración</small><b>{{ eventDuration(event) }}</b>
                <p>{{ event.allDay ? 'Evento de día completo' : 'Tiempo programado' }}</p>
              </div>
            </section>
            <section class="preview-detail">
              <span class="avatar preview-avatar">{{ userInitials(event.assignedTo) }}</span>
              <div>
                <small>Responsable</small><b>{{ event.assignedTo }}</b>
                <p>Usuario asignado</p>
              </div>
            </section>
            <section class="preview-detail preview-detail--wide">
              <span class="preview-detail__icon">↗</span>
              <div>
                <small>Registro relacionado</small><b>{{ event.client }}</b>
                <p>
                  {{
                    event.leadId
                      ? 'Lead · ' + event.leadId
                      : event.clientId
                        ? 'Cliente · ' + event.clientId
                        : 'Sin relación'
                  }}
                </p>
              </div>
            </section>
          </div>
        </article>
        <footer>
          <button class="button" type="button" (click)="selected.set(null)">Cerrar</button>
          <button class="button" type="button" (click)="openEdit(event)">✎ Editar</button>
          @if (event.status === 'SCHEDULED') {
            <button class="button button--primary" type="button" (click)="complete(event.id)">
              Marcar completado
            </button>
          }
        </footer>
      </section>
    }
  `,
  styles: [
    `
      .events-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .events-section > header {
        padding: 12px 0 4px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
      }
      .events-section h2 {
        font-size: 21px;
      }
      .events-section header p {
        margin-top: 5px;
        color: var(--color-text-secondary);
      }
      .events-section header > div:last-child {
        display: flex;
        gap: 8px;
      }
      .event-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .event-card {
        position: relative;
        width: 100%;
        padding: 15px;
        text-align: left;
        display: grid;
        grid-template-columns: 50px 1fr auto 32px;
        align-items: center;
        gap: 13px;
        color: var(--color-text-primary);
        cursor: pointer;
        outline: 0;
      }
      .event-card:hover {
        border-color: #93c5fd;
      }
      .event-date {
        width: 50px;
        height: 54px;
        border-radius: 10px;
        background: var(--color-muted);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
      .event-date b {
        font-size: 17px;
      }
      .event-date small {
        color: var(--color-text-secondary);
        font-size: 9px;
        text-transform: uppercase;
      }
      .event-copy {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .event-copy > span {
        color: var(--color-text-secondary);
        font-size: 8px;
        font-weight: 800;
        letter-spacing: 0.06em;
      }
      .event-copy small {
        color: var(--color-text-secondary);
        font-size: 9px;
      }
      .dot {
        width: 7px;
        height: 7px;
        margin-right: 6px;
        border-radius: 50%;
        display: inline-block;
      }
      .dot--violet {
        background: #8b5cf6;
      }
      .dot--green {
        background: #16a34a;
      }
      .dot--amber {
        background: #d97706;
      }
      .dot--blue {
        background: #2563eb;
      }
      .event-status {
        padding: 5px 9px;
        border-radius: 999px;
        background: #dbeafe;
        color: #1d4ed8;
        font-size: 9px;
        font-weight: 700;
      }
      .event-status--completed {
        background: #dcfce7;
        color: #15803d;
      }
      .event-status--cancelled {
        background: #fee2e2;
        color: #b91c1c;
      }
      .event-menu-trigger {
        width: 32px;
        height: 32px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: var(--color-text-secondary);
      }
      .event-menu-trigger:hover {
        background: var(--color-muted);
      }
      .event-action-menu {
        position: absolute;
        right: 14px;
        top: 54px;
        z-index: 30;
        width: 145px;
        padding: 6px;
        border: 1px solid var(--color-border);
        border-radius: 9px;
        background: var(--color-surface);
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.16);
      }
      .event-action-menu button {
        width: 100%;
        height: 36px;
        padding: 0 9px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--color-text-primary);
        display: flex;
        align-items: center;
        gap: 8px;
        font: inherit;
        font-size: 10px;
        font-weight: 650;
      }
      .event-action-menu button:hover {
        background: var(--color-muted);
      }
      .event-action-menu .danger {
        color: var(--color-danger);
      }
      .section-empty {
        min-height: 285px;
        padding: 40px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
      }
      .section-empty > span {
        color: #94a3b8;
        font-size: 30px;
      }
      .section-empty h3 {
        margin-top: 8px;
      }
      .section-empty p {
        max-width: 390px;
        margin: 6px 0 16px;
        color: var(--color-text-secondary);
      }
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 1080;
        border: 0;
        background: rgba(15, 23, 42, 0.52);
        backdrop-filter: blur(2px);
      }
      .event-modal {
        position: fixed;
        left: 50%;
        top: 50%;
        z-index: 1081;
        width: min(760px, calc(100vw - 28px));
        max-height: calc(100vh - 28px);
        overflow: auto;
        border: 1px solid var(--color-border);
        border-radius: 15px;
        background: var(--color-surface);
        box-shadow: 0 30px 80px rgba(15, 23, 42, 0.3);
        transform: translate(-50%, -50%);
      }
      .event-modal > header {
        padding: 17px 20px;
        border-bottom: 1px solid var(--color-border);
        display: flex;
        justify-content: space-between;
      }
      .event-modal header span {
        color: var(--color-primary);
        font-size: 8px;
        font-weight: 800;
        letter-spacing: 0.08em;
      }
      .event-modal header h2 {
        margin-top: 3px;
        font-size: 18px;
      }
      .event-modal header p {
        margin-top: 3px;
        color: var(--color-text-secondary);
        font-size: 10px;
      }
      .event-modal header button {
        width: 30px;
        height: 30px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: var(--color-text-secondary);
        font-size: 19px;
      }
      .event-form {
        padding: 22px 24px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        align-items: start;
        gap: 16px 18px;
      }
      .event-form label {
        display: flex;
        flex-direction: column;
        gap: 6px;
        color: var(--color-text-secondary);
        font-size: 9px;
        font-weight: 700;
      }
      .field-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
        color: var(--color-text-secondary);
        font-size: 9px;
        font-weight: 700;
      }
      .event-form .full {
        grid-column: 1/-1;
      }
      .event-form input:not([type='checkbox']),
      .event-form select,
      .event-form textarea {
        width: 100%;
        min-height: 42px;
        padding: 9px 11px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-background);
        color: var(--color-text-primary);
        font: inherit;
      }
      .event-form select:disabled {
        opacity: 1;
        color: var(--color-text-secondary);
        cursor: not-allowed;
      }
      .select-shell {
        position: relative;
        width: 100%;
        min-height: 48px;
        padding: 0 38px 0 44px;
        border: 1px solid var(--color-border);
        border-radius: 10px;
        background: var(--color-background);
        display: flex;
        align-items: center;
        transition:
          border-color 0.15s ease,
          box-shadow 0.15s ease;
      }
      .select-shell:focus-within {
        border-color: #60a5fa;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
      }
      .select-shell::after {
        content: '⌄';
        position: absolute;
        right: 13px;
        top: 50%;
        color: var(--color-text-secondary);
        font-size: 16px;
        pointer-events: none;
        transform: translateY(-58%);
      }
      .select-shell select {
        min-height: 46px;
        padding: 0 !important;
        border: 0 !important;
        outline: 0;
        appearance: none;
        background: transparent !important;
        color: var(--color-text-primary);
        font-size: 11px;
        font-weight: 700;
        box-shadow: none !important;
        cursor: pointer;
      }
      .select-icon,
      .select-avatar,
      .status-dot {
        position: absolute;
        left: 11px;
        top: 50%;
        transform: translateY(-50%);
      }
      .select-icon,
      .select-avatar {
        width: 26px;
        height: 26px;
        border-radius: 7px;
        background: #dbeafe;
        color: #1d4ed8;
        display: grid;
        place-items: center;
        font-size: 8px;
        font-weight: 800;
      }
      .select-avatar {
        border-radius: 50%;
      }
      .status-dot {
        left: 17px;
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: #3b82f6;
      }
      .status-dot--completed {
        background: #16a34a;
      }
      .status-dot--cancelled {
        background: #dc2626;
      }
      .related-record {
        min-height: 48px;
        padding: 6px 11px;
        border: 1px solid #bfdbfe;
        border-radius: 10px;
        background: color-mix(in srgb, var(--color-primary) 5%, var(--color-background));
        display: grid;
        grid-template-columns: 30px 1fr 22px;
        align-items: center;
        gap: 9px;
      }
      .related-record__icon {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        background: #2563eb;
        color: #fff;
        display: grid;
        place-items: center;
        font-size: 8px;
        font-weight: 800;
      }
      .related-record__copy {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .related-record__copy b {
        overflow: hidden;
        color: var(--color-text-primary);
        font-size: 10.5px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .related-record__copy small {
        color: var(--color-text-secondary);
        font-size: 8px;
        font-weight: 600;
      }
      .related-record__check {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: #dcfce7;
        color: #15803d;
        display: grid;
        place-items: center;
        font-size: 9px;
      }
      .date-control {
        min-height: 70px;
        padding: 9px 11px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-background);
      }
      .all-day {
        min-height: 52px;
        padding: 9px 11px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-background);
        display: flex !important;
        flex-direction: row !important;
        align-items: center;
        gap: 10px !important;
      }
      .all-day input {
        width: 18px;
        height: 18px;
        accent-color: var(--color-primary);
      }
      .all-day > span {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .all-day b {
        color: var(--color-text-primary);
        font-size: 10px;
      }
      .all-day small {
        font-size: 8px;
        font-weight: 500;
      }
      .form-error {
        margin: -7px 0 0;
        color: var(--color-danger);
        font-size: 9px;
        font-weight: 700;
      }
      .required,
      .required-help i {
        color: var(--color-danger);
        font-style: normal;
      }
      .required-help {
        margin-top: -8px;
        color: var(--color-text-secondary);
        font-size: 8.5px;
      }
      .event-modal > footer {
        padding: 13px 20px;
        border-top: 1px solid var(--color-border);
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      .event-preview__header {
        display: grid;
        grid-template-columns: 46px minmax(0, 1fr) auto 30px;
        align-items: center;
        gap: 13px;
      }
      .preview-symbol {
        width: 46px;
        height: 46px;
        border-radius: 12px;
        background: #ede9fe;
        color: #7c3aed !important;
        display: grid;
        place-items: center;
        font-size: 18px !important;
      }
      .preview-symbol--green {
        background: #dcfce7;
        color: #15803d !important;
      }
      .preview-symbol--amber {
        background: #fef3c7;
        color: #b45309 !important;
      }
      .preview-symbol--blue {
        background: #dbeafe;
        color: #1d4ed8 !important;
      }
      .preview-title {
        min-width: 0;
      }
      .preview-title h2 {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .preview-status {
        padding: 5px 9px;
        border-radius: 999px;
        background: #dbeafe;
        color: #1d4ed8 !important;
        font-size: 9px !important;
        font-weight: 750;
        letter-spacing: 0 !important;
      }
      .preview-status--completed {
        background: #dcfce7;
        color: #15803d !important;
      }
      .preview-status--cancelled {
        background: #fee2e2;
        color: #b91c1c !important;
      }
      .event-preview__content {
        padding: 22px 24px;
      }
      .preview-description {
        padding: 16px;
        border: 1px solid var(--color-border);
        border-radius: 11px;
        background: var(--color-background);
      }
      .preview-description span {
        color: var(--color-primary);
        font-size: 8px;
        font-weight: 800;
        letter-spacing: 0.08em;
      }
      .preview-description p {
        margin-top: 7px;
        line-height: 1.6;
      }
      .preview-details {
        margin-top: 14px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .preview-detail {
        min-height: 82px;
        padding: 13px;
        border: 1px solid var(--color-border);
        border-radius: 11px;
        background: var(--color-muted);
        display: grid;
        grid-template-columns: 36px 1fr;
        align-items: center;
        gap: 10px;
      }
      .preview-detail--wide {
        grid-column: 1/-1;
      }
      .preview-detail__icon,
      .preview-avatar {
        width: 36px;
        height: 36px;
        border-radius: 9px;
        background: var(--color-surface);
        color: var(--color-primary);
        display: grid;
        place-items: center;
      }
      .preview-avatar {
        border-radius: 50%;
        background: #dbeafe;
        color: #1d4ed8;
        font-size: 9px;
      }
      .preview-detail > div {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .preview-detail small {
        color: var(--color-text-secondary);
        font-size: 8px;
      }
      .preview-detail b {
        overflow: hidden;
        color: var(--color-text-primary);
        font-size: 11px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .preview-detail p {
        color: var(--color-text-secondary);
        font-size: 8.5px;
      }
      @media (max-width: 650px) {
        .events-section > header {
          align-items: flex-start;
          flex-direction: column;
        }
        .event-card {
          grid-template-columns: 50px 1fr 32px;
        }
        .event-status {
          grid-column: 2;
          width: fit-content;
        }
        .event-form,
        .preview-details {
          grid-template-columns: 1fr;
        }
        .event-preview__header {
          grid-template-columns: 42px 1fr 30px;
        }
        .preview-status {
          grid-column: 2;
          width: fit-content;
        }
        .event-form .full {
          grid-column: auto;
        }
      }
    `,
  ],
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
