import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CustomerTicket } from '../../core/models/customer';
import { LanguageService } from '../../core/i18n/language.service';
import { PicklistOption, StyledPicklist } from '../../shared/styled-picklist';

type TicketFilter = 'all' | 'active' | 'waiting' | 'resolved';

export interface NewCustomerTicket {
  subject: string;
  description: string;
  category: CustomerTicket['category'];
  priority: CustomerTicket['priority'];
  channel: CustomerTicket['channel'];
  assignedTo: string;
}

@Component({
  selector: 'app-customer-tickets-section',
  imports: [DatePipe, RouterLink, StyledPicklist],
  template: `
    <section class="tickets-section">
      <header class="tickets-heading">
        <div>
          <h2>Tickets de soporte</h2>
          <p>Solicitudes, incidencias y seguimiento técnico de {{ customerName() }}.</p>
        </div>
        <button class="primary-button" type="button" (click)="openComposer()">
          ＋ Nuevo ticket
        </button>
      </header>

      <div class="ticket-metrics">
        <article>
          <span class="metric-icon metric-icon--blue">◫</span
          ><span
            ><b>{{ activeCount() }}</b
            ><small>Activos</small></span
          >
        </article>
        <article>
          <span class="metric-icon metric-icon--red">!</span
          ><span
            ><b>{{ urgentCount() }}</b
            ><small>Alta prioridad</small></span
          >
        </article>
        <article>
          <span class="metric-icon metric-icon--amber">◷</span
          ><span
            ><b>{{ waitingCount() }}</b
            ><small>En espera</small></span
          >
        </article>
        <article>
          <span class="metric-icon metric-icon--green">✓</span
          ><span
            ><b>{{ resolvedCount() }}</b
            ><small>Resueltos</small></span
          >
        </article>
      </div>

      <article class="card tickets-card">
        <div class="tickets-toolbar">
          <label class="ticket-search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <input
              #searchInput
              type="search"
              placeholder="Buscar por folio, asunto o responsable…"
              [value]="search()"
              (input)="search.set(searchInput.value)"
            />
          </label>
          <div class="ticket-filters" role="group" aria-label="Filtrar tickets">
            @for (filter of filters; track filter.value) {
              <button
                type="button"
                [class.is-active]="selectedFilter() === filter.value"
                (click)="selectedFilter.set(filter.value)"
              >
                {{ filter.label }}
              </button>
            }
          </div>
        </div>

        <div class="ticket-list">
          @for (ticket of filteredTickets(); track ticket.id) {
            <article class="ticket-row" [class.is-expanded]="expandedTicketId() === ticket.id">
              <button class="ticket-main" type="button" (click)="openPreview(ticket)">
                <span
                  class="priority-dot priority-dot--{{ ticket.priority }}"
                  [title]="priorityLabel(ticket.priority)"
                ></span>
                <span class="ticket-copy">
                  <span
                    ><b>{{ ticket.subject }}</b
                    ><code>{{ ticket.id }}</code></span
                  >
                  <small
                    >{{ ticket.category }} · Actualizado
                    {{ ticket.updatedAt | date: 'dd MMM, HH:mm' : '' : i18n.locale() }}</small
                  >
                </span>
                <span class="ticket-assignee"
                  ><span>{{ initials(ticket.assignedTo) }}</span
                  ><small>{{ ticket.assignedTo }}</small></span
                >
                <span class="ticket-sla" [class.is-overdue]="isSlaOverdue(ticket)"
                  ><small>SLA</small><b>{{ slaLabel(ticket) }}</b></span
                >
                <span class="ticket-status ticket-status--{{ ticket.status }}">{{
                  statusLabel(ticket.status)
                }}</span>
                <span class="chevron">›</span>
              </button>
              @if (expandedTicketId() === ticket.id) {
                <div class="ticket-details">
                  <div class="ticket-description">
                    <span>Descripción</span>
                    <p>{{ ticket.description }}</p>
                  </div>
                  <dl>
                    <div>
                      <dt>Creado</dt>
                      <dd>{{ ticket.createdAt | date: 'dd MMM y, HH:mm' : '' : i18n.locale() }}</dd>
                    </div>
                    <div>
                      <dt>Canal</dt>
                      <dd>{{ ticket.channel }}</dd>
                    </div>
                    <div>
                      <dt>Solicitante</dt>
                      <dd>{{ ticket.requester }}</dd>
                    </div>
                    <div>
                      <dt>Prioridad</dt>
                      <dd>{{ priorityLabel(ticket.priority) }}</dd>
                    </div>
                  </dl>
                  <div class="ticket-actions">
                    <label
                      >Actualizar estado
                      <select
                        #statusSelect
                        [value]="ticket.status"
                        (change)="changeStatus(ticket, statusSelect.value)"
                      >
                        <option value="open">Abierto</option>
                        <option value="in_progress">En progreso</option>
                        <option value="waiting">En espera</option>
                        <option value="resolved">Resuelto</option>
                        <option value="closed">Cerrado</option>
                      </select>
                    </label>
                    <button type="button" (click)="copyTicketId(ticket.id)">
                      {{ copiedTicketId() === ticket.id ? '✓ Folio copiado' : 'Copiar folio' }}
                    </button>
                    <button type="button">Enviar mensaje</button>
                  </div>
                </div>
              }
            </article>
          } @empty {
            <div class="ticket-empty">
              <span>⌕</span>
              <h3>No encontramos tickets</h3>
              <p>Prueba con otro filtro o crea una nueva solicitud.</p>
            </div>
          }
        </div>
      </article>
    </section>

    @if (previewTicket(); as ticket) {
      <button
        class="composer-backdrop"
        type="button"
        aria-label="Cerrar"
        (click)="closePreview()"
      ></button>
      <section class="ticket-preview" role="dialog" aria-modal="true">
        <header>
          <div>
            <span>{{ ticket.id }} · {{ ticket.category }}</span>
            <h2>{{ ticket.subject }}</h2>
            <p>{{ ticket.description }}</p>
          </div>
          <button type="button" aria-label="Cerrar" (click)="closePreview()">×</button>
        </header>
        <div class="preview-summary">
          <div>
            <small>Estado</small
            ><span class="ticket-status ticket-status--{{ ticket.status }}">{{
              statusLabel(ticket.status)
            }}</span>
          </div>
          <div>
            <small>Prioridad</small><b>{{ priorityLabel(ticket.priority) }}</b>
          </div>
          <div>
            <small>Responsable</small
            ><span class="ticket-assignee"
              ><span>{{ initials(ticket.assignedTo) }}</span
              ><b>{{ ticket.assignedTo }}</b></span
            >
          </div>
          <div>
            <small>Última actualización</small
            ><b>{{ ticket.updatedAt | date: 'dd MMM y, HH:mm' : '' : i18n.locale() }}</b>
          </div>
        </div>
        <footer>
          <label
            >Actualizar estado
            <select
              #previewStatus
              [value]="ticket.status"
              (change)="changeStatus(ticket, previewStatus.value)"
            >
              <option value="open">Abierto</option>
              <option value="in_progress">En progreso</option>
              <option value="waiting">En espera</option>
              <option value="resolved">Resuelto</option>
              <option value="closed">Cerrado</option>
            </select>
          </label>
          <button type="button" (click)="closePreview()">Cerrar</button>
          <a class="primary-button" [routerLink]="['/tickets', ticket.id]">Ver ticket →</a>
        </footer>
      </section>
    }

    @if (composerOpen()) {
      <button
        class="composer-backdrop"
        type="button"
        aria-label="Cerrar"
        (click)="closeComposer()"
      ></button>
      <section
        class="ticket-composer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-ticket-title"
      >
        <header>
          <div>
            <span>NUEVA SOLICITUD</span>
            <h2 id="new-ticket-title">Crear ticket de soporte</h2>
            <p>Registra la información necesaria para iniciar el seguimiento.</p>
          </div>
          <button type="button" aria-label="Cerrar" (click)="closeComposer()">×</button>
        </header>
        <div class="composer-form">
          <label class="full"
            >Asunto <b class="required-mark">*</b
            ><input
              #subjectInput
              type="text"
              required
              maxlength="100"
              placeholder="Ej. Servicio intermitente"
              [value]="subjectDraft()"
              (input)="subjectDraft.set(subjectInput.value)"
          /></label>
          <label
            >Categoría<app-styled-picklist
              [options]="categoryOptions"
              [value]="categoryDraft()"
              (valueChange)="categoryDraft.set($event)"
          /></label>
          <label
            >Prioridad<app-styled-picklist
              [options]="priorityOptions"
              [value]="priorityDraft()"
              (valueChange)="priorityDraft.set($event)"
          /></label>
          <label
            >Canal<app-styled-picklist
              [options]="channelOptions"
              [value]="channelDraft()"
              (valueChange)="channelDraft.set($event)"
          /></label>
          <label
            >Asignar a<app-styled-picklist
              [options]="assigneeOptions"
              [value]="assigneeDraft()"
              (valueChange)="assigneeDraft.set($event)"
          /></label>
          <label class="full"
            >Descripción <b class="required-mark">*</b
            ><textarea
              #descriptionInput
              rows="5"
              required
              placeholder="Describe el problema, síntomas y pruebas realizadas…"
              [value]="descriptionDraft()"
              (input)="descriptionDraft.set(descriptionInput.value)"
            ></textarea>
          </label>
        </div>
        <footer>
          <button type="button" (click)="closeComposer()">Cancelar</button
          ><button
            class="primary-button"
            type="button"
            [disabled]="!canCreate()"
            (click)="
              createTicket(categoryDraft(), priorityDraft(), channelDraft(), assigneeDraft())
            "
          >
            Crear ticket
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
      .tickets-section {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .tickets-heading {
        padding: 10px 0 2px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
      }
      .tickets-heading h2 {
        font-size: 21px;
      }
      .tickets-heading p {
        margin-top: 5px;
        color: var(--color-text-secondary);
        font-size: 12px;
      }
      button,
      input,
      select,
      textarea {
        font: inherit;
      }
      button {
        cursor: pointer;
      }
      .primary-button {
        min-height: 39px;
        padding: 0 16px;
        border: 1px solid var(--color-primary);
        border-radius: 9px;
        background: var(--color-primary);
        color: #fff;
        font-weight: 750;
      }
      .primary-button:disabled {
        cursor: not-allowed;
        opacity: 0.45;
      }
      .ticket-metrics {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
      }
      .ticket-metrics article {
        min-height: 82px;
        padding: 15px;
        border: 1px solid var(--color-border);
        border-radius: 11px;
        background: var(--color-surface);
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .ticket-metrics article > span:last-child {
        display: flex;
        flex-direction: column;
      }
      .ticket-metrics b {
        font-size: 19px;
      }
      .ticket-metrics small {
        color: var(--color-text-secondary);
        font-size: 10px;
      }
      .metric-icon {
        width: 38px;
        height: 38px;
        display: grid;
        place-items: center;
        border-radius: 10px;
        font-weight: 800;
      }
      .metric-icon--blue {
        background: #dbeafe;
        color: #2563eb;
      }
      .metric-icon--red {
        background: #fee2e2;
        color: #dc2626;
      }
      .metric-icon--amber {
        background: #fef3c7;
        color: #d97706;
      }
      .metric-icon--green {
        background: #d1fae5;
        color: #059669;
      }
      .tickets-card {
        overflow: hidden;
      }
      .tickets-toolbar {
        min-height: 66px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        border-bottom: 1px solid var(--color-border);
      }
      .ticket-search {
        width: min(390px, 100%);
        height: 38px;
        padding: 0 11px;
        border: 1px solid var(--color-border);
        border-radius: 9px;
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--color-background);
      }
      .ticket-search svg {
        width: 15px;
        height: 15px;
        fill: none;
        stroke: var(--color-text-secondary);
        stroke-width: 1.8;
      }
      .ticket-search input {
        width: 100%;
        min-width: 0;
        border: 0;
        outline: 0;
        background: transparent;
        color: var(--color-text-primary);
        font-size: 11px;
      }
      .ticket-filters {
        padding: 3px;
        display: flex;
        gap: 2px;
        border-radius: 9px;
        background: var(--color-muted);
      }
      .ticket-filters button {
        min-height: 31px;
        padding: 0 10px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: var(--color-text-secondary);
        font-size: 10px;
        font-weight: 700;
      }
      .ticket-filters button.is-active {
        background: var(--color-surface);
        color: var(--color-primary);
        box-shadow: 0 1px 4px rgba(15, 23, 42, 0.12);
      }
      .ticket-row + .ticket-row {
        border-top: 1px solid var(--color-border);
      }
      .ticket-main {
        width: 100%;
        min-height: 78px;
        padding: 13px 16px;
        border: 0;
        background: transparent;
        color: var(--color-text-primary);
        display: grid;
        grid-template-columns: 10px minmax(210px, 1fr) 150px 90px 105px 18px;
        align-items: center;
        gap: 12px;
        text-align: left;
      }
      .ticket-main:hover,
      .ticket-row.is-expanded .ticket-main {
        background: color-mix(in srgb, var(--color-primary) 4%, var(--color-surface));
      }
      .priority-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #94a3b8;
      }
      .priority-dot--medium {
        background: #3b82f6;
      }
      .priority-dot--high {
        background: #f97316;
      }
      .priority-dot--urgent {
        background: #ef4444;
        box-shadow: 0 0 0 4px #fee2e2;
      }
      .ticket-copy {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .ticket-copy > span {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .ticket-copy b {
        overflow: hidden;
        font-size: 12px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .ticket-copy code {
        padding: 3px 5px;
        border-radius: 5px;
        background: var(--color-muted);
        color: var(--color-text-secondary);
        font-size: 9px;
      }
      .ticket-copy small,
      .ticket-assignee small,
      .ticket-sla small {
        color: var(--color-text-secondary);
        font-size: 9.5px;
      }
      .ticket-assignee {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 7px;
      }
      .ticket-assignee > span {
        width: 27px;
        height: 27px;
        flex: 0 0 27px;
        border-radius: 50%;
        background: #e0e7ff;
        color: #4338ca;
        display: grid;
        place-items: center;
        font-size: 8px;
        font-weight: 800;
      }
      .ticket-assignee small {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .ticket-sla {
        display: flex;
        flex-direction: column;
      }
      .ticket-sla b {
        font-size: 9.5px;
      }
      .ticket-sla.is-overdue b {
        color: #dc2626;
      }
      .ticket-status {
        padding: 5px 7px;
        border-radius: 99px;
        background: #e2e8f0;
        color: #475569;
        font-size: 9px;
        font-weight: 800;
        text-align: center;
      }
      .ticket-status--open {
        background: #dbeafe;
        color: #1d4ed8;
      }
      .ticket-status--in_progress {
        background: #ede9fe;
        color: #6d28d9;
      }
      .ticket-status--waiting {
        background: #fef3c7;
        color: #b45309;
      }
      .ticket-status--resolved {
        background: #d1fae5;
        color: #047857;
      }
      .chevron {
        color: var(--color-text-secondary);
        transition: transform 0.2s;
      }
      .is-expanded .chevron {
        transform: rotate(180deg);
      }
      .ticket-details {
        padding: 18px 26px 20px 38px;
        border-top: 1px solid var(--color-border);
        background: color-mix(in srgb, var(--color-muted) 55%, var(--color-surface));
      }
      .ticket-description span {
        color: var(--color-text-secondary);
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .ticket-description p {
        margin-top: 6px;
        max-width: 850px;
        font-size: 11.5px;
        line-height: 1.6;
      }
      dl {
        margin: 16px 0;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 14px;
      }
      dl div {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      dt {
        color: var(--color-text-secondary);
        font-size: 9px;
      }
      dd {
        margin: 0;
        font-size: 10.5px;
        font-weight: 700;
      }
      .ticket-actions {
        padding-top: 14px;
        border-top: 1px solid var(--color-border);
        display: flex;
        align-items: end;
        gap: 8px;
      }
      .ticket-actions label {
        margin-right: auto;
        display: flex;
        flex-direction: column;
        gap: 4px;
        color: var(--color-text-secondary);
        font-size: 9px;
      }
      .ticket-actions select,
      .ticket-actions button {
        height: 34px;
        padding: 0 10px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-surface);
        color: var(--color-text-primary);
        font-size: 10px;
        font-weight: 700;
      }
      .ticket-empty {
        padding: 70px 20px;
        text-align: center;
      }
      .ticket-empty > span {
        color: #94a3b8;
        font-size: 32px;
      }
      .ticket-empty h3 {
        margin-top: 8px;
      }
      .ticket-empty p {
        margin-top: 5px;
        color: var(--color-text-secondary);
      }
      .composer-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        border: 0;
        background: rgba(15, 23, 42, 0.52);
        backdrop-filter: blur(3px);
      }
      .ticket-preview {
        position: fixed;
        left: 50%;
        top: 50%;
        z-index: 1001;
        width: min(610px, calc(100vw - 28px));
        overflow: hidden;
        border: 1px solid var(--color-border);
        border-radius: 16px;
        background: var(--color-surface);
        box-shadow: 0 30px 80px rgba(15, 23, 42, 0.3);
        transform: translate(-50%, -50%);
      }
      .ticket-preview > header {
        padding: 22px;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;
        border-bottom: 1px solid var(--color-border);
      }
      .ticket-preview > header span {
        color: var(--color-primary);
        font-size: 9px;
        font-weight: 800;
      }
      .ticket-preview > header h2 {
        margin-top: 5px;
        font-size: 18px;
      }
      .ticket-preview > header p {
        margin-top: 9px;
        color: var(--color-text-secondary);
        font-size: 10.5px;
        line-height: 1.55;
      }
      .ticket-preview > header button {
        width: 32px;
        height: 32px;
        flex: 0 0 32px;
        border: 0;
        border-radius: 50%;
        background: var(--color-muted);
        color: var(--color-text-primary);
        font-size: 20px;
      }
      .preview-summary {
        padding: 18px 22px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .preview-summary > div {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
      }
      .preview-summary small {
        color: var(--color-text-secondary);
        font-size: 8.5px;
      }
      .preview-summary b {
        font-size: 10.5px;
      }
      .ticket-preview > footer {
        padding: 14px 22px 20px;
        border-top: 1px solid var(--color-border);
        display: flex;
        align-items: flex-end;
        justify-content: flex-end;
        gap: 8px;
      }
      .ticket-preview > footer label {
        margin-right: auto;
        display: flex;
        flex-direction: column;
        gap: 4px;
        color: var(--color-text-secondary);
        font-size: 8.5px;
      }
      .ticket-preview > footer select,
      .ticket-preview > footer button,
      .ticket-preview > footer a {
        height: 37px;
        padding: 0 12px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-surface);
        color: var(--color-text-primary);
        display: inline-flex;
        align-items: center;
        font: inherit;
        font-size: 10px;
        font-weight: 700;
        text-decoration: none;
      }
      .ticket-preview > footer .primary-button {
        border-color: var(--color-primary);
        background: var(--color-primary);
        color: #fff;
      }
      .ticket-composer {
        position: fixed;
        left: 50%;
        top: 50%;
        z-index: 1001;
        width: min(650px, calc(100vw - 28px));
        max-height: calc(100vh - 28px);
        overflow-y: auto;
        border: 1px solid var(--color-border);
        border-radius: 16px;
        background: var(--color-surface);
        box-shadow: 0 30px 80px rgba(15, 23, 42, 0.3);
        transform: translate(-50%, -50%);
      }
      .ticket-composer > header {
        padding: 21px 23px 17px;
        display: flex;
        justify-content: space-between;
        gap: 15px;
        border-bottom: 1px solid var(--color-border);
      }
      .ticket-composer header span {
        color: var(--color-primary);
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.08em;
      }
      .ticket-composer h2 {
        margin-top: 4px;
        font-size: 19px;
      }
      .ticket-composer header p {
        margin-top: 3px;
        color: var(--color-text-secondary);
        font-size: 10px;
      }
      .ticket-composer header > button {
        width: 32px;
        height: 32px;
        border: 0;
        border-radius: 50%;
        background: var(--color-muted);
        color: var(--color-text-primary);
        font-size: 21px;
      }
      .composer-form {
        padding: 20px 23px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }
      .composer-form label {
        display: flex;
        flex-direction: column;
        gap: 5px;
        color: var(--color-text-secondary);
        font-size: 10px;
        font-weight: 700;
      }
      .required-mark {
        color: #dc2626;
      }
      .composer-form .full {
        grid-column: 1 / -1;
      }
      .composer-form input,
      .composer-form select,
      .composer-form textarea {
        width: 100%;
        padding: 0 10px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        outline: 0;
        background: var(--color-background);
        color: var(--color-text-primary);
        font-size: 11px;
      }
      .composer-form input,
      .composer-form select {
        height: 38px;
      }
      .composer-form textarea {
        padding-block: 10px;
        resize: vertical;
      }
      .composer-form input:focus,
      .composer-form select:focus,
      .composer-form textarea:focus {
        border-color: #60a5fa;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
      }
      .ticket-composer > footer {
        padding: 14px 23px 20px;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      .ticket-composer > footer > button:not(.primary-button) {
        min-height: 39px;
        padding: 0 15px;
        border: 1px solid var(--color-border);
        border-radius: 9px;
        background: var(--color-surface);
        color: var(--color-text-primary);
        font-weight: 700;
      }
      @media (max-width: 850px) {
        .ticket-metrics {
          grid-template-columns: 1fr 1fr;
        }
        .tickets-toolbar {
          align-items: stretch;
          flex-direction: column;
        }
        .ticket-search {
          width: 100%;
        }
        .ticket-main {
          grid-template-columns: 10px minmax(180px, 1fr) 95px 18px;
        }
        .ticket-assignee,
        .ticket-sla {
          display: none;
        }
        dl {
          grid-template-columns: 1fr 1fr;
        }
      }
      @media (max-width: 560px) {
        .tickets-heading {
          align-items: stretch;
          flex-direction: column;
        }
        .ticket-metrics {
          grid-template-columns: 1fr 1fr;
        }
        .ticket-filters {
          overflow-x: auto;
        }
        .ticket-main {
          grid-template-columns: 10px minmax(0, 1fr) 90px;
        }
        .chevron {
          display: none;
        }
        .ticket-copy > span {
          align-items: flex-start;
          flex-direction: column;
        }
        .ticket-details {
          padding-inline: 18px;
        }
        .ticket-actions {
          align-items: stretch;
          flex-direction: column;
        }
        .ticket-actions label {
          width: 100%;
        }
        .composer-form {
          grid-template-columns: 1fr;
        }
        .composer-form .full {
          grid-column: auto;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerTicketsSection {
  readonly i18n = inject(LanguageService);
  readonly tickets = input.required<ReadonlyArray<CustomerTicket>>();
  readonly customerName = input.required<string>();
  readonly ticketCreated = output<NewCustomerTicket>();
  readonly ticketStatusChanged = output<{
    ticket: CustomerTicket;
    status: CustomerTicket['status'];
  }>();
  readonly search = signal('');
  readonly selectedFilter = signal<TicketFilter>('all');
  readonly expandedTicketId = signal<string | null>(null);
  readonly previewTicket = signal<CustomerTicket | null>(null);
  readonly composerOpen = signal(false);
  readonly subjectDraft = signal('');
  readonly descriptionDraft = signal('');
  readonly categoryDraft = signal('Conectividad');
  readonly priorityDraft = signal('medium');
  readonly channelDraft = signal('Teléfono');
  readonly assigneeDraft = signal('Andrea Torres');
  readonly categoryOptions: ReadonlyArray<PicklistOption> = [
    'Conectividad',
    'Facturación',
    'Equipo',
    'Instalación',
    'Otro',
  ].map((value) => ({ value, label: value }));
  readonly priorityOptions: ReadonlyArray<PicklistOption> = [
    { value: 'low', label: 'Baja' },
    { value: 'medium', label: 'Media' },
    { value: 'high', label: 'Alta' },
    { value: 'urgent', label: 'Urgente' },
  ];
  readonly channelOptions: ReadonlyArray<PicklistOption> = [
    'Teléfono',
    'WhatsApp',
    'Correo',
    'Portal',
  ].map((value) => ({ value, label: value }));
  readonly assigneeOptions: ReadonlyArray<PicklistOption> = [
    'Andrea Torres',
    'Carlos Mendoza',
    'Derek Paulsen',
    'Sin asignar',
  ].map((value) => ({ value, label: value }));
  readonly copiedTicketId = signal<string | null>(null);
  readonly filters: ReadonlyArray<{ label: string; value: TicketFilter }> = [
    { label: 'Todos', value: 'all' },
    { label: 'Activos', value: 'active' },
    { label: 'En espera', value: 'waiting' },
    { label: 'Resueltos', value: 'resolved' },
  ];
  readonly activeCount = computed(
    () => this.tickets().filter((ticket) => ['open', 'in_progress'].includes(ticket.status)).length,
  );
  readonly urgentCount = computed(
    () =>
      this.tickets().filter(
        (ticket) =>
          ['high', 'urgent'].includes(ticket.priority) &&
          !['resolved', 'closed'].includes(ticket.status),
      ).length,
  );
  readonly waitingCount = computed(
    () => this.tickets().filter((ticket) => ticket.status === 'waiting').length,
  );
  readonly resolvedCount = computed(
    () => this.tickets().filter((ticket) => ['resolved', 'closed'].includes(ticket.status)).length,
  );
  readonly canCreate = computed(() =>
    Boolean(this.subjectDraft().trim() && this.descriptionDraft().trim()),
  );
  readonly filteredTickets = computed(() => {
    const query = this.search().trim().toLocaleLowerCase(this.i18n.locale());
    const filter = this.selectedFilter();
    return [...this.tickets()]
      .filter((ticket) => {
        const matchesFilter =
          filter === 'all' ||
          (filter === 'active' && ['open', 'in_progress'].includes(ticket.status)) ||
          ticket.status === filter ||
          (filter === 'resolved' && ticket.status === 'closed');
        const haystack =
          `${ticket.id} ${ticket.subject} ${ticket.category} ${ticket.assignedTo}`.toLocaleLowerCase(
            this.i18n.locale(),
          );
        return matchesFilter && (!query || haystack.includes(query));
      })
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  });

  openComposer(): void {
    this.composerOpen.set(true);
  }
  closeComposer(): void {
    this.composerOpen.set(false);
    this.subjectDraft.set('');
    this.descriptionDraft.set('');
    this.categoryDraft.set('Conectividad');
    this.priorityDraft.set('medium');
    this.channelDraft.set('Teléfono');
    this.assigneeDraft.set('Andrea Torres');
  }
  toggleDetails(ticketId: string): void {
    this.expandedTicketId.set(this.expandedTicketId() === ticketId ? null : ticketId);
  }
  openPreview(ticket: CustomerTicket): void {
    this.previewTicket.set(ticket);
  }
  closePreview(): void {
    this.previewTicket.set(null);
  }
  createTicket(category: string, priority: string, channel: string, assignedTo: string): void {
    if (!this.canCreate()) return;
    this.ticketCreated.emit({
      subject: this.subjectDraft().trim(),
      description: this.descriptionDraft().trim(),
      category: category as CustomerTicket['category'],
      priority: priority as CustomerTicket['priority'],
      channel: channel as CustomerTicket['channel'],
      assignedTo,
    });
    this.closeComposer();
    this.selectedFilter.set('all');
  }
  changeStatus(ticket: CustomerTicket, status: string): void {
    if (ticket.status !== status)
      this.ticketStatusChanged.emit({ ticket, status: status as CustomerTicket['status'] });
    this.previewTicket.update((current) =>
      current?.id === ticket.id
        ? {
            ...current,
            status: status as CustomerTicket['status'],
            updatedAt: new Date().toISOString(),
          }
        : current,
    );
  }
  copyTicketId(ticketId: string): void {
    void navigator.clipboard?.writeText(ticketId);
    this.copiedTicketId.set(ticketId);
    window.setTimeout(() => this.copiedTicketId.set(null), 1600);
  }
  initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }
  priorityLabel(priority: CustomerTicket['priority']): string {
    return { low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente' }[priority];
  }
  statusLabel(status: CustomerTicket['status']): string {
    return {
      open: 'Abierto',
      in_progress: 'En progreso',
      waiting: 'En espera',
      resolved: 'Resuelto',
      closed: 'Cerrado',
    }[status];
  }
  isSlaOverdue(ticket: CustomerTicket): boolean {
    return (
      !['resolved', 'closed'].includes(ticket.status) &&
      new Date(ticket.slaDueAt).getTime() < Date.now()
    );
  }
  slaLabel(ticket: CustomerTicket): string {
    if (['resolved', 'closed'].includes(ticket.status)) return 'Cumplido';
    if (this.isSlaOverdue(ticket)) return 'Vencido';
    return new Intl.RelativeTimeFormat(this.i18n.locale(), { numeric: 'auto' }).format(
      Math.max(1, Math.ceil((new Date(ticket.slaDueAt).getTime() - Date.now()) / 3_600_000)),
      'hour',
    );
  }
}
