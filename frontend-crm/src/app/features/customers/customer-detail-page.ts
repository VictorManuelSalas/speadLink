import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { CRM_DATA } from '../../core/data-access/crm-data';
import { LanguageService } from '../../core/i18n/language.service';
import { TicketStore } from '../../core/data-access/ticket-store';
import {
  CrmAttachment,
  Customer,
  CustomerNote,
  CustomerTicket,
  EntityUser,
  TimelineItem,
} from '../../core/models/customer';
import { AttachmentPicker } from '../../shared/attachment-picker';
import {
  RecordDetailLayout,
  RecordHeader,
  RecordInformationCard,
  RecordQuickActions,
  RecordRecentActivity,
  RecordSummary,
  RecordTabItem,
  RecordTabs,
} from '../../shared/record-detail-shell';
import { CustomerTicketsSection, NewCustomerTicket } from './customer-tickets-section';
import { RecordEventsSection } from '../operations/lead-events-section';
import { RecordField, RecordFieldConfig } from '../../shared/record-field';
import { OperationalStore } from '../operations/operational-store';
import {
  RecordActivitySection,
  RecordAttachmentsSection,
  RecordEmailsSection,
  RecordNotesSection,
} from '../operations/record-sections';

type ActivityFilter = 'all' | 'payment' | 'ticket' | 'call';
type EditableCustomerField =
  'email' | 'phone' | 'address' | 'community' | 'gpsLocation' | 'installDate';

interface SubscribedContractService {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

@Component({
  selector: 'app-customer-detail-page',
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    CustomerTicketsSection,
    AttachmentPicker,
    RecordEventsSection,
    RecordField,
    RecordActivitySection,
    RecordAttachmentsSection,
    RecordEmailsSection,
    RecordNotesSection,
    RecordDetailLayout,
    RecordHeader,
    RecordInformationCard,
    RecordQuickActions,
    RecordRecentActivity,
    RecordSummary,
    RecordTabs,
  ],
  template: ` @if (loading()) {
      <div class="card skeleton detail-skeleton"></div>
    } @else if (!customer()) {
      <section class="state-card">
        <h1>Cliente no encontrado</h1>
        <a class="button button--primary" routerLink="/customers">Volver a clientes</a>
      </section>
    } @else if (customer(); as c) {
      <app-record-header
        rootLabel="Clientes"
        rootRoute="/customers"
        [recordId]="c.id"
        [title]="c.name"
        [initials]="c.initials"
        accent="#2563eb"
        [statusLabel]="customerStatusLabel(c.status)"
        [statusTone]="customerStatusTone(c.status)"
        [subtitle]="customerSubtitle(c)"
      >
        <div record-actions>
          <button class="button" (click)="activeTab.set('Correos')">✉ Enviar mensaje</button
          ><button class="button button--primary">＋ Registrar pago</button>
        </div>
      </app-record-header>
      <app-record-summary>
        <div class="record-summary-item">
          <span>Mensualidad</span
          ><b>{{ c.monthlyFee | currency: 'MXN' : 'symbol-narrow' : '1.0-0' : i18n.locale() }}</b
          ><small>{{ c.plan }} · {{ c.speed }}</small>
        </div>
        <div class="record-summary-item">
          <span>Saldo actual</span
          ><b [class.danger-text]="c.currentBalance > 0">{{
            c.currentBalance | currency: 'MXN' : 'symbol-narrow' : '1.0-0' : i18n.locale()
          }}</b
          ><small>Próximo cobro: día {{ c.billingDay }}</small>
        </div>
        <div class="record-summary-item">
          <span>Estado del servicio</span><b class="success">● En línea</b
          ><small>{{ c.ipAddress }} · 18 ms</small>
        </div>
        <div class="record-summary-item">
          <span>Facturas pagadas</span><b>{{ c.payments.length }}</b
          ><small>Historial reciente</small>
        </div>
      </app-record-summary>
      <app-record-tabs
        [tabs]="customerTabs(c)"
        [active]="activeTab()"
        (activeChange)="activeTab.set($event)"
      />
      @if (activeTab() === 'Notas') {
        <app-record-notes-section [recordId]="c.id" />
      } @else if (activeTab() === 'Correos') {
        <app-record-emails-section [recordId]="c.id" [recipientEmail]="c.email" />
      } @else if (activeTab() === 'Archivos') {
        <app-record-attachments-section [recordId]="c.id" />
      } @else if (activeTab() === 'Actividad') {
        <app-record-activity-section [recordId]="c.id" />
      } @else if (activeTab() === 'Eventos') {
        <app-record-events-section recordType="customer" [recordId]="c.id" [recordName]="c.name" />
      } @else if (activeTab() === 'Contratos') {
        <section class="customer-contracts">
          <header>
            <div>
              <h2>Contratos</h2>
              <p>{{ customerContracts(c).length }} contrato(s) relacionados con este cliente</p>
            </div>
            <a class="button button--primary" routerLink="/contracts">Ver módulo de contratos</a>
          </header>
          <div class="contract-list">
            @for (contract of customerContracts(c); track contract.id) {
              <a class="contract-row" [routerLink]="['/contracts', contract.id]">
                <span class="contract-icon">▤</span>
                <span
                  ><b>{{ contract['contractNumber'] }}</b
                  ><small>{{ contract.id }} · {{ contract['status'] }}</small></span
                >
                <span
                  ><small>Vigencia</small
                  ><b
                    >{{ recordString(contract['startDate']) | date: 'dd MMM y' }} –
                    {{ recordString(contract['endDate']) | date: 'dd MMM y' }}</b
                  ></span
                >
                <span
                  ><small>Mensualidad</small
                  ><b>{{
                    recordNumber(contract['totalMonthly'])
                      | currency: 'MXN' : 'symbol-narrow' : '1.0-0' : i18n.locale()
                  }}</b></span
                >
                <i>↗</i>
              </a>
            } @empty {
              <article class="contracts-empty">
                <span>▤</span>
                <h3>Sin contratos relacionados</h3>
                <p>Los contratos vinculados a este cliente aparecerán aquí.</p>
              </article>
            }
          </div>
        </section>
      } @else {
        @switch (activeTab()) {
          @case ('Resumen') {
            <app-record-detail-layout>
              <div record-main>
                <app-record-information-card title="Información del cliente">
                  <div class="info-grid">
                    <app-record-field
                      [config]="customerField('email', 'Correo electrónico', 'email')"
                      [value]="c.email"
                      (valueSaved)="updateCustomerField(c, 'email', $event)"
                    />
                    <app-record-field
                      [config]="customerField('phone', 'Teléfono', 'phone')"
                      [value]="c.phone"
                      (valueSaved)="updateCustomerField(c, 'phone', $event)"
                    />
                    <app-record-field
                      [config]="customerField('address', 'Dirección de instalación')"
                      [value]="c.address"
                      (valueSaved)="updateCustomerField(c, 'address', $event)"
                    />
                    <app-record-field
                      [config]="customerField('community', 'Comunidad')"
                      [value]="c.community"
                      (valueSaved)="updateCustomerField(c, 'community', $event)"
                    />
                    <app-record-field
                      [config]="customerField('gpsLocation', 'Ubicación GPS', 'gps')"
                      [value]="c.gpsLocation"
                      (valueSaved)="updateCustomerField(c, 'gpsLocation', $event)"
                    />
                    <app-record-field
                      [config]="customerField('installDate', 'Fecha de instalación', 'date')"
                      [value]="c.installDate"
                      (valueSaved)="updateCustomerField(c, 'installDate', $event)"
                    />
                    <app-record-field
                      [config]="auditField('createdAt', 'Creado', c.createdBy)"
                      [value]="c.createdAt"
                    />
                    <app-record-field
                      [config]="auditField('updatedAt', 'Última actualización', c.updatedBy)"
                      [value]="c.updatedAt"
                    />
                  </div>
                </app-record-information-card>
                <article class="card section-card">
                  <div class="card-heading">
                    <div>
                      <h2>Servicio contratado</h2>
                      <p>Plan y configuración activa</p>
                    </div>
                    <button class="link-button" (click)="changePlanConfirmOpen.set(true)">
                      Cambiar plan
                    </button>
                  </div>
                  @if (activeContract(c); as contract) {
                    <div class="contract-service-reference">
                      <span>Contrato activo</span
                      ><a [routerLink]="['/contracts', contract.id]"
                        >{{ contract['contractNumber'] }} ↗</a
                      >
                    </div>
                  }
                  @for (service of subscribedContractServices(c); track service.id) {
                    <div class="service-card contract-service-row">
                      <span class="kpi__icon kpi__icon--blue">⌁</span>
                      <div>
                        <b>{{ service.name }}</b
                        ><small
                          >{{ service.description }}
                          @if (service.quantity > 1) {
                            · {{ service.quantity }} unidades
                          }
                        </small>
                      </div>
                      <strong
                        >{{
                          service.quantity * service.unitPrice
                            | currency: 'MXN' : 'symbol-narrow' : '1.0-0' : i18n.locale()
                        }}<small>/ mes</small></strong
                      >
                    </div>
                  } @empty {
                    <div class="service-empty">
                      <span>⌁</span>
                      <p>El contrato activo no tiene servicios asociados.</p>
                    </div>
                  }
                </article>
                <article class="card section-card">
                  <div class="card-heading">
                    <div>
                      <h2>Equipos asignados</h2>
                      <p>{{ c.equipment.length }} dispositivos en el sitio</p>
                    </div>
                  </div>
                  @for (equipment of c.equipment; track equipment.serial) {
                    <div class="equipment-row">
                      <span class="kpi__icon kpi__icon--violet">▣</span
                      ><span
                        ><b>{{ equipment.name }} · {{ equipment.model }}</b
                        ><small
                          >{{ equipment.serial }} · {{ equipment.mac }} · IP:
                          {{ equipment.ipAddress }}</small
                        ></span
                      ><em class="success"
                        >● {{ equipment.status === 'online' ? 'En línea' : equipment.status }}</em
                      >
                    </div>
                  }
                </article>
                @if (pinnedNotes(c).length > 0) {
                  <article class="card section-card overview-pinned-notes">
                    <div class="card-heading">
                      <div>
                        <h2>Notas fijadas</h2>
                        <p>{{ pinnedNotes(c).length }} de 5 notas en el resumen</p>
                      </div>
                      <button class="link-button" (click)="activeTab.set('Notas')">
                        Ver todas
                      </button>
                    </div>
                    @for (note of pinnedNotes(c); track note.id) {
                      <button
                        class="overview-pinned-note"
                        type="button"
                        (click)="openPinnedNote(note.id)"
                      >
                        <div>
                          <span class="avatar avatar--sm">{{ note.author.initials }}</span
                          ><span
                            ><b>{{ note.author.fullName }}</b
                            ><small>{{
                              note.createdAt | date: 'dd MMM y, HH:mm' : '' : i18n.locale()
                            }}</small></span
                          >
                        </div>
                        <p>{{ note.content }}</p>
                      </button>
                    }
                  </article>
                }
              </div>
              <div record-aside>
                <app-record-quick-actions>
                  <button>＋ Registrar pago</button><button>▤ Crear factura</button
                  ><button (click)="changePlanConfirmOpen.set(true)">⌁ Cambiar plan</button
                  ><button>⌂ Programar visita</button>
                </app-record-quick-actions>
                <app-record-recent-activity [recordId]="c.id" />
              </div>
            </app-record-detail-layout>
          }
          @case ('Facturación y pagos') {
            <section class="billing-section">
              <header class="billing-heading">
                <div>
                  <h2>Facturación y pagos</h2>
                  <p>
                    {{ totalPaid(c) | currency: 'MXN' : 'symbol-narrow' : '1.0-0' : i18n.locale() }}
                    pagados históricamente · {{ c.invoices.length }} facturas
                  </p>
                </div>
                <div>
                  <button class="button">⇩ Exportar</button
                  ><button class="button button--primary">＋ Nueva factura</button>
                </div>
              </header>
              <div class="billing-summary">
                <article class="card">
                  <span>Total pagado (6 meses)</span
                  ><b class="billing-paid">{{
                    totalPaid(c) | currency: 'MXN' : 'symbol-narrow' : '1.0-0' : i18n.locale()
                  }}</b
                  ><small
                    >{{ c.payments.length }} {{ c.payments.length === 1 ? 'pago' : 'pagos' }}</small
                  >
                </article>
                <article class="card">
                  <span>Saldo pendiente</span
                  ><b>{{
                    c.currentBalance | currency: 'MXN' : 'symbol-narrow' : '1.0-0' : i18n.locale()
                  }}</b
                  ><small
                    >{{ outstandingInvoiceCount(c) }}
                    {{ outstandingInvoiceCount(c) === 1 ? 'factura' : 'facturas' }}</small
                  >
                </article>
                <article class="card">
                  <span>Próxima facturación</span
                  ><b>{{ nextBillingDate(c) | date: 'd MMM, y' : '' : i18n.locale() }}</b
                  ><small
                    >{{
                      c.monthlyFee | currency: 'MXN' : 'symbol-narrow' : '1.0-0' : i18n.locale()
                    }}/mes</small
                  >
                </article>
              </div>
              <article class="card billing-table-card">
                <header>
                  <h2>Facturas</h2>
                  <span>{{ c.invoices.length }} en total</span>
                </header>
                <div class="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Factura</th>
                        <th>Descripción</th>
                        <th>Emisión</th>
                        <th>Vencimiento</th>
                        <th>Total</th>
                        <th>Estado</th>
                        <th aria-label="Acciones"></th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (invoice of c.invoices; track invoice.id) {
                        <tr>
                          <td>
                            <b>{{ invoice.id }}</b>
                          </td>
                          <td>
                            <span class="billing-description"
                              >{{ c.plan
                              }}<small
                                >Mensualidad ·
                                {{ invoice.issuedAt | date: 'MMMM y' : '' : i18n.locale() }}</small
                              ></span
                            >
                          </td>
                          <td>{{ invoice.issuedAt | date: 'd MMM, y' : '' : i18n.locale() }}</td>
                          <td>{{ invoice.dueAt | date: 'd MMM, y' : '' : i18n.locale() }}</td>
                          <td>
                            <b>{{
                              invoice.total
                                | currency: 'MXN' : 'symbol-narrow' : '1.0-0' : i18n.locale()
                            }}</b>
                          </td>
                          <td>
                            <span class="status status--{{ invoice.status }}"
                              ><i></i
                              >{{
                                invoice.status === 'paid'
                                  ? 'Pagada'
                                  : invoice.status === 'overdue'
                                    ? 'Vencida'
                                    : 'Pendiente'
                              }}</span
                            >
                          </td>
                          <td><button class="icon-button" aria-label="Ver factura">↗</button></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </article>
              <article class="card billing-table-card">
                <header>
                  <h2>Historial de pagos</h2>
                  <span
                    >{{ c.payments.length }}
                    {{ c.payments.length === 1 ? 'registro' : 'registros' }}</span
                  >
                </header>
                <div class="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Referencia</th>
                        <th>Método</th>
                        <th>Monto</th>
                        <th>Estado</th>
                        <th aria-label="Acciones"></th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (payment of c.payments; track payment.id) {
                        <tr>
                          <td>{{ payment.date | date: 'd MMM, y' : '' : i18n.locale() }}</td>
                          <td>
                            <code>{{ payment.reference }}</code>
                          </td>
                          <td>{{ payment.method }}</td>
                          <td>
                            <b>{{
                              payment.amount
                                | currency: 'MXN' : 'symbol-narrow' : '1.0-0' : i18n.locale()
                            }}</b>
                          </td>
                          <td>
                            <span class="status status--paid"><i></i>Confirmado</span>
                          </td>
                          <td>
                            <button class="icon-button" aria-label="Acciones del pago">•••</button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
          }
          @case ('Tickets') {
            <app-customer-tickets-section
              [tickets]="c.tickets"
              [customerName]="c.name"
              (ticketCreated)="createCustomerTicket(c, $event)"
              (ticketStatusChanged)="changeCustomerTicketStatus(c, $event.ticket, $event.status)"
            />
          }
          @case ('Notas') {
            <section class="notes-section">
              <header class="notes-heading">
                <div>
                  <h2>Notas</h2>
                  <p>{{ c.notes.length }} {{ c.notes.length === 1 ? 'nota' : 'notas' }}</p>
                </div>
              </header>
              <article class="card note-composer">
                <textarea
                  #noteInput
                  [value]="noteDraft()"
                  placeholder="Agrega una nota sobre este cliente…"
                  aria-label="Nueva nota"
                  (input)="noteDraft.set(noteInput.value)"
                ></textarea>
                <div class="note-attachment-picker">
                  <app-attachment-picker
                    [resetKey]="noteAttachmentReset()"
                    (attachmentsChange)="noteAttachments.set($event)"
                  />
                </div>
                <footer>
                  <button
                    class="note-pin-button"
                    type="button"
                    [class.is-active]="pinNewNote()"
                    [disabled]="!pinNewNote() && !canPinNote(c)"
                    [attr.aria-pressed]="pinNewNote()"
                    (click)="toggleDraftPin(c)"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 3h12v18l-6-4-6 4V3Z" /></svg
                    >{{ pinNewNote() ? 'Se fijará al guardar' : 'Fijar en el resumen' }} ({{
                      pinnedNotes(c).length
                    }}/5)
                  </button>
                  <div class="note-form-actions">
                    @if (editingNoteId()) {
                      <button class="button" type="button" (click)="cancelNoteEdit()">
                        Cancelar
                      </button>
                    }
                    <button
                      class="button button--primary"
                      type="button"
                      [disabled]="!noteDraft().trim()"
                      (click)="saveNote(c)"
                    >
                      {{ editingNoteId() ? 'Actualizar nota' : 'Guardar nota' }}
                    </button>
                  </div>
                </footer>
              </article>
              <div class="notes-list">
                @for (note of sortedNotes(c); track note.id) {
                  <article
                    [id]="'customer-note-' + note.id"
                    class="card note-card"
                    [class.note-card--pinned]="note.pinned"
                    [class.note-card--selected]="selectedNoteId() === note.id"
                    [class.note-card--menu-open]="noteMenuId() === note.id"
                  >
                    <header>
                      <div class="note-author">
                        <span class="avatar">{{ note.author.initials }}</span
                        ><b>{{ note.author.fullName }}</b>
                        @if (note.pinned) {
                          <span class="pinned-badge"
                            ><svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M6 3h12v18l-6-4-6 4V3Z" /></svg
                            >Fijada</span
                          >
                        }
                      </div>
                      <div class="note-meta">
                        <time>{{
                          note.createdAt | date: 'dd MMM y, HH:mm' : '' : i18n.locale()
                        }}</time
                        ><button
                          class="icon-button note-menu-trigger"
                          [class.is-active]="noteMenuId() === note.id"
                          aria-label="Acciones de la nota"
                          (click)="toggleNoteMenu($event, note.id)"
                        >
                          •••
                        </button>
                      </div>
                    </header>
                    @if (noteMenuId() === note.id) {
                      <div class="note-action-menu" (click)="$event.stopPropagation()">
                        <button
                          type="button"
                          [disabled]="!canTogglePinned(c, note)"
                          (click)="togglePinnedNote(c, note)"
                        >
                          <span>{{ note.pinned ? '◇' : '◆' }}</span
                          >{{ note.pinned ? 'Desfijar' : 'Fijar en resumen' }}
                        </button>
                        <button type="button" (click)="startNoteEdit(note)">
                          <span>✎</span>Actualizar</button
                        ><button class="danger" type="button" (click)="deleteNote(c, note.id)">
                          <span>⊘</span>Eliminar
                        </button>
                      </div>
                    }
                    <p>{{ note.content }}</p>
                    @if (note.attachments?.length) {
                      <div class="note-attachments">
                        @for (file of note.attachments; track file.id) {
                          <a [href]="file.url" target="_blank" rel="noopener noreferrer"
                            ><span>{{ file.mimeType.startsWith('image/') ? '▧' : '▤' }}</span
                            ><span
                              ><b>{{ file.fileName }}</b
                              ><small>{{ formatAttachmentSize(file.size) }}</small></span
                            ></a
                          >
                        }
                      </div>
                    }
                  </article>
                }
              </div>
            </section>
          }
          @case ('Actividad') {
            <section class="activity-section">
              <header class="activity-heading">
                <div>
                  <h2>Historial de actividad</h2>
                  <p>
                    {{ filteredTimeline(c).length }} eventos · desde
                    {{ activitySince(c) | date: 'MMM y' : '' : i18n.locale() }}
                  </p>
                </div>
                <div class="activity-filters" role="group" aria-label="Filtrar actividad">
                  @for (filter of activityFilters; track filter.value) {
                    <button
                      [class.is-active]="activityFilter() === filter.value"
                      (click)="activityFilter.set(filter.value)"
                    >
                      {{ filter.label }}
                    </button>
                  }
                </div>
              </header>
              <div class="activity-timeline">
                @for (item of filteredTimeline(c); track item.id) {
                  <article class="activity-event activity-event--{{ item.type }}">
                    <div class="activity-marker">{{ activityIcon(item.type) }}</div>
                    <time class="activity-date">{{
                      item.date | date: 'dd MMM, y' : '' : i18n.locale()
                    }}</time>
                    <div class="card activity-event-card">
                      <header>
                        <h3>{{ item.title }}</h3>
                        <time>{{ item.date | date: 'HH:mm' : '' : i18n.locale() }}</time>
                      </header>
                      <p>{{ item.detail }}</p>
                      <small
                        >por <b>{{ item.author }}</b></small
                      >
                    </div>
                  </article>
                } @empty {
                  <div class="state-card">
                    <h2>Sin actividad</h2>
                    <p>No hay eventos para este filtro.</p>
                  </div>
                }
              </div>
            </section>
          }
          @case ('Eventos') {
            <app-record-events-section
              recordType="customer"
              [recordId]="c.id"
              [recordName]="c.name"
            />
          }
          @default {
            <section class="state-card">
              <span>◇</span>
              <h2>{{ activeTab() }}</h2>
              <p>La sección está preparada para conectarse al backend en una fase posterior.</p>
            </section>
          }
        }
      }
      @if (changePlanConfirmOpen()) {
        <button
          class="plan-change-backdrop"
          type="button"
          aria-label="Cancelar cambio de plan"
          (click)="changePlanConfirmOpen.set(false)"
        ></button>
        <section class="plan-change-dialog" role="alertdialog" aria-modal="true">
          <span class="plan-change-dialog__icon">▤</span>
          <div>
            <span class="plan-change-dialog__eyebrow">CAMBIO DE PLAN</span>
            <h2>Es necesario generar un nuevo contrato</h2>
            <p>
              El plan actual pertenece al contrato vigente. Para cambiarlo se creará un contrato
              nuevo para <b>{{ c.name }}</b
              >, donde podrás seleccionar los servicios, cantidades y precios acordados.
            </p>
            <div class="plan-change-warning">
              <span>!</span>
              <p>
                El contrato actual no se modificará hasta que el nuevo contrato sea firmado y
                activado.
              </p>
            </div>
          </div>
          <footer>
            <button class="button" type="button" (click)="changePlanConfirmOpen.set(false)">
              No, cancelar
            </button>
            <button class="button button--primary" type="button" (click)="continuePlanChange(c)">
              Sí, crear contrato →
            </button>
          </footer>
        </section>
      }
    }`,
  styles: [
    `
      .info-grid .audit-line {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 9px;
        min-height: 29px;
      }
      .info-grid .audit-line > b {
        flex: 0 0 auto;
      }
      .audit-separator {
        width: 1px;
        height: 18px;
        background: var(--color-border);
      }
      .info-grid .audit-user {
        position: relative;
        display: inline-flex;
        flex-direction: row;
        align-items: center;
        gap: 7px;
        width: fit-content;
        cursor: default;
        outline: none;
      }
      .info-grid .audit-user > b {
        color: var(--color-text-primary);
        font-size: 12px;
      }
      .info-grid .audit-avatar {
        width: 25px;
        height: 25px;
        color: #1d4ed8;
        font-size: 9px;
      }
      .info-grid .audit-user-card {
        position: absolute;
        left: 0;
        bottom: calc(100% + 10px);
        z-index: 40;
        width: 250px;
        padding: 14px;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 11px;
        border: 1px solid var(--color-border);
        border-radius: 11px;
        background: #fff;
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transform: translateY(5px);
      }
      .info-grid .audit-user:hover .audit-user-card,
      .info-grid .audit-user:focus .audit-user-card,
      .info-grid .audit-user:focus-within .audit-user-card {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }
      .info-grid .audit-user-card > .avatar {
        width: 38px;
        height: 38px;
        color: #1d4ed8;
        font-size: 11px;
      }
      .info-grid .audit-user-card > span:last-child {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .info-grid .audit-user-card b {
        color: var(--color-text-primary);
        font-size: 13px;
      }
      .info-grid .audit-user-card small {
        overflow: hidden;
        color: var(--color-text-secondary);
        font-size: 11px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .tabs button {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .tab-count {
        min-width: 20px;
        height: 20px;
        padding: 0 6px;
        display: inline-grid;
        place-items: center;
        border-radius: 10px;
        background: var(--color-muted);
        color: var(--color-text-secondary);
        font-size: 10px;
      }
      .tabs button.is-active .tab-count {
        background: #dbeafe;
        color: var(--color-primary);
      }
      .customer-contracts {
        padding: 24px 0;
      }
      .customer-contracts > header {
        margin-bottom: 16px;
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 16px;
      }
      .customer-contracts h2 {
        font-size: 20px;
      }
      .customer-contracts header p {
        margin-top: 4px;
        color: var(--color-text-secondary);
        font-size: 10px;
      }
      .contract-list {
        overflow: hidden;
        border: 1px solid var(--color-border);
        border-radius: 14px;
        background: var(--color-surface);
      }
      .contract-row {
        min-height: 74px;
        padding: 14px 17px;
        border-top: 1px solid var(--color-border);
        color: var(--color-text-primary);
        display: grid;
        grid-template-columns: 40px minmax(180px, 1.4fr) 1fr 1fr 24px;
        align-items: center;
        gap: 13px;
        text-decoration: none;
      }
      .contract-row:first-child {
        border-top: 0;
      }
      .contract-row:hover {
        background: color-mix(in srgb, var(--color-primary) 5%, var(--color-surface));
      }
      .contract-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: #e0e7ff;
        color: #4f46e5;
        display: grid;
        place-items: center;
      }
      .contract-row > span:not(.contract-icon) {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .contract-row small {
        color: var(--color-text-secondary);
        font-size: 9px;
      }
      .contract-row b {
        font-size: 11px;
      }
      .contract-row i {
        color: var(--color-primary);
        font-style: normal;
      }
      .contracts-empty {
        min-height: 230px;
        display: grid;
        place-content: center;
        justify-items: center;
        color: var(--color-text-secondary);
        text-align: center;
      }
      .contracts-empty > span {
        font-size: 27px;
      }
      .contracts-empty h3 {
        margin-top: 9px;
        color: var(--color-text-primary);
      }
      .contracts-empty p {
        margin-top: 5px;
        font-size: 10px;
      }
      .contract-service-reference {
        margin-top: 14px;
        padding: 9px 11px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-radius: 8px;
        background: var(--color-muted);
        color: var(--color-text-secondary);
        font-size: 10px;
      }
      .contract-service-reference a {
        color: var(--color-primary);
        font-weight: 700;
      }
      .contract-service-row + .contract-service-row {
        padding-top: 14px;
        border-top: 1px solid var(--color-border);
      }
      .service-empty {
        min-height: 100px;
        display: grid;
        place-content: center;
        justify-items: center;
        color: var(--color-text-secondary);
        text-align: center;
      }
      .service-empty > span {
        font-size: 25px;
      }
      .service-empty p {
        margin-top: 8px;
        font-size: 11px;
      }
      .plan-change-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        width: 100%;
        height: 100%;
        border: 0;
        background: rgba(15, 23, 42, 0.48);
        backdrop-filter: blur(3px);
      }
      .plan-change-dialog {
        position: fixed;
        left: 50%;
        top: 50%;
        z-index: 1001;
        width: min(570px, calc(100vw - 30px));
        padding: 24px;
        display: grid;
        grid-template-columns: 48px 1fr;
        gap: 15px;
        border: 1px solid var(--color-border);
        border-radius: 16px;
        background: var(--color-surface);
        box-shadow: 0 30px 80px rgba(15, 23, 42, 0.3);
        transform: translate(-50%, -50%);
      }
      .plan-change-dialog__icon {
        width: 48px;
        height: 48px;
        display: grid;
        place-items: center;
        border-radius: 13px;
        background: #eff6ff;
        color: var(--color-primary);
        font-size: 21px;
      }
      .plan-change-dialog__eyebrow {
        color: var(--color-primary);
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.1em;
      }
      .plan-change-dialog h2 {
        margin: 6px 0 8px;
        font-size: 19px;
      }
      .plan-change-dialog > div > p {
        color: var(--color-text-secondary);
        font-size: 11.5px;
        line-height: 1.6;
      }
      .plan-change-warning {
        margin-top: 16px;
        padding: 11px;
        display: flex;
        gap: 9px;
        border: 1px solid #fde68a;
        border-radius: 9px;
        background: #fffbeb;
        color: #92400e;
      }
      .plan-change-warning > span {
        width: 20px;
        height: 20px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        border-radius: 50%;
        background: #fef3c7;
        font-weight: 800;
      }
      .plan-change-warning p {
        font-size: 10px;
        line-height: 1.5;
      }
      .plan-change-dialog footer {
        grid-column: 1/-1;
        margin: 5px -24px -24px;
        padding: 15px 24px;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        border-top: 1px solid var(--color-border);
      }
      :host-context(.app-frame--dark) .plan-change-warning {
        border-color: #854d0e;
        background: #422006;
        color: #fde68a;
      }
      @media (max-width: 760px) {
        .customer-contracts > header {
          align-items: flex-start;
          flex-direction: column;
        }
        .contract-row {
          grid-template-columns: 40px 1fr 20px;
        }
        .contract-row > span:nth-child(3),
        .contract-row > span:nth-child(4) {
          display: none;
        }
      }
      .overview-pinned-notes {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .overview-pinned-note {
        width: 100%;
        padding: 14px 16px;
        border: 1px solid #fde68a;
        border-radius: 10px;
        background: #fffbeb;
        text-align: left;
      }
      .overview-pinned-note:hover,
      .overview-pinned-note:focus-visible {
        border-color: #f59e0b;
        box-shadow: 0 6px 18px rgba(180, 83, 9, 0.12);
      }
      .overview-pinned-note > div {
        display: flex;
        align-items: center;
        gap: 9px;
      }
      .overview-pinned-note > div > span:last-child {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .overview-pinned-note b,
      .overview-pinned-note p {
        color: #111827 !important;
      }
      .overview-pinned-note small {
        color: #64748b;
      }
      .overview-pinned-note p {
        margin-top: 10px;
        font-size: 12px;
        line-height: 1.55;
      }
      .notes-section {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .notes-heading {
        padding: 12px 0 4px;
      }
      .notes-heading h2 {
        font-size: 21px;
      }
      .notes-heading p {
        margin-top: 6px;
        color: var(--color-text-secondary);
      }
      .note-composer {
        overflow: hidden;
      }
      .note-composer textarea {
        width: 100%;
        min-height: 145px;
        padding: 24px 28px;
        border: 0;
        outline: 0;
        resize: vertical;
        background: transparent;
        color: var(--color-text-primary);
        font: inherit;
        font-size: 15px;
        line-height: 1.55;
      }
      .note-composer textarea::placeholder {
        color: #94a3b8;
      }
      .note-composer footer {
        min-height: 66px;
        padding: 10px 18px 10px 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        border-top: 1px solid var(--color-border);
      }
      .note-attachment-picker {
        padding: 0 24px 12px;
      }
      .note-attachments {
        padding: 0 30px 22px;
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
      }
      .note-attachments a {
        padding: 7px 9px;
        border: 1px solid var(--color-border);
        border-radius: 7px;
        color: var(--color-text-primary);
        display: flex;
        align-items: center;
        gap: 7px;
        text-decoration: none;
      }
      .note-attachments a > span:last-child {
        display: flex;
        flex-direction: column;
      }
      .note-attachments b {
        max-width: 180px;
        overflow: hidden;
        font-size: 9px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .note-attachments small {
        color: var(--color-text-secondary);
        font-size: 8px;
      }
      .note-pin-button {
        min-height: 36px;
        padding: 0 10px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 0;
        background: transparent;
        color: var(--color-text-secondary);
        font-weight: 600;
        border-radius: 8px;
      }
      .note-pin-button:hover,
      .note-pin-button.is-active {
        color: var(--color-primary);
      }
      .note-pin-button.is-active {
        background: #eff6ff;
      }
      .note-pin-button.is-active svg {
        fill: currentColor;
      }
      .note-pin-button:disabled {
        cursor: not-allowed;
        color: #94a3b8;
        opacity: 0.6;
      }
      .note-pin-button svg,
      .pinned-badge svg {
        width: 17px;
        height: 17px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linejoin: round;
      }
      .notes-list {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .note-card {
        position: relative;
        overflow: visible;
      }
      .note-card--pinned {
        border-color: #fde68a;
        background: #fffbeb;
      }
      .note-card--pinned > p,
      .note-card--pinned .note-author > b,
      .note-card--pinned .note-meta time {
        color: #111827 !important;
      }
      .note-card--selected {
        outline: 3px solid rgba(37, 99, 235, 0.28);
        outline-offset: 3px;
      }
      .note-card > header {
        min-height: 66px;
        padding: 12px 22px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        border-bottom: 1px solid var(--color-border);
      }
      .note-card--pinned > header {
        border-color: #fde68a;
      }
      .note-author,
      .note-meta {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .note-author > b {
        font-size: 13px;
      }
      .note-meta time {
        color: var(--color-text-secondary);
        font-size: 11px;
      }
      .pinned-badge {
        padding: 5px 8px;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        border-radius: 99px;
        background: #fef3c7;
        color: #b45309;
        font-size: 10px;
        font-weight: 700;
      }
      .pinned-badge svg {
        width: 12px;
        height: 12px;
      }
      .note-card > p {
        padding: 22px 30px 26px;
        color: #1e293b;
        font-size: 14px;
        line-height: 1.7;
      }
      .note-form-actions {
        display: flex;
        gap: 8px;
      }
      .note-menu-trigger.is-active {
        background: var(--color-muted);
        color: var(--color-primary);
      }
      .note-action-menu {
        position: absolute;
        right: 18px;
        top: 58px;
        z-index: 30;
        width: 160px;
        padding: 7px;
        border: 1px solid var(--color-border);
        border-radius: 10px;
        background: #fff;
        box-shadow: 0 14px 35px rgba(15, 23, 42, 0.18);
      }
      .note-action-menu button {
        width: 100%;
        min-height: 39px;
        padding: 0 10px;
        display: flex;
        align-items: center;
        gap: 9px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: var(--color-text-primary);
        text-align: left;
        font-weight: 600;
      }
      .note-action-menu button:hover {
        background: var(--color-muted);
      }
      .note-action-menu button:disabled {
        cursor: not-allowed;
        opacity: 0.45;
      }
      .note-action-menu button.danger {
        color: var(--color-danger);
      }
      .note-action-menu button.danger:hover {
        background: #fef2f2;
      }
      .activity-section {
        display: flex;
        flex-direction: column;
        gap: 28px;
      }
      .activity-heading {
        padding: 12px 0 4px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
      }
      .activity-heading h2 {
        font-size: 21px;
      }
      .activity-heading p {
        margin-top: 6px;
        color: var(--color-text-secondary);
      }
      .activity-filters {
        padding: 4px;
        display: flex;
        gap: 3px;
        border-radius: 10px;
        background: var(--color-muted);
      }
      .activity-filters button {
        min-height: 34px;
        padding: 0 14px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: var(--color-text-secondary);
        font-weight: 650;
      }
      .activity-filters button.is-active {
        background: #fff;
        color: var(--color-text-primary);
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.12);
      }
      .activity-timeline {
        position: relative;
        padding-left: 86px;
      }
      .activity-timeline::before {
        content: '';
        position: absolute;
        left: 38px;
        top: 8px;
        bottom: 20px;
        width: 1px;
        background: var(--color-border);
      }
      .activity-event {
        position: relative;
        margin-bottom: 28px;
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
      }
      .activity-marker {
        position: absolute;
        left: -86px;
        top: 38px;
        z-index: 2;
        width: 52px;
        height: 52px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: #e0f2fe;
        color: #0284c7;
        font-size: 16px;
        font-weight: 750;
      }
      .activity-event--payment .activity-marker {
        background: #d1fae5;
        color: #059669;
      }
      .activity-event--ticket .activity-marker {
        background: #ede9fe;
        color: #7c3aed;
      }
      .activity-event--call .activity-marker {
        background: #ffedd5;
        color: #ea580c;
      }
      .activity-event--note .activity-marker {
        background: #fef3c7;
        color: #b45309;
      }
      .activity-date {
        color: var(--color-text-secondary);
        font-size: 11px;
        font-weight: 750;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .activity-event-card {
        padding: 20px 24px;
      }
      .activity-event-card header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }
      .activity-event-card h3 {
        font-size: 15px;
      }
      .activity-event-card header time {
        color: var(--color-text-secondary);
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 11px;
      }
      .activity-event-card p {
        margin: 10px 0 14px;
        color: var(--color-text-secondary);
        line-height: 1.55;
      }
      .activity-event-card small {
        color: var(--color-text-secondary);
      }
      .activity-event-card small b {
        color: var(--color-text-primary);
      }
      @media (max-width: 620px) {
        .note-composer footer,
        .note-card > header,
        .activity-heading {
          align-items: flex-start;
          flex-direction: column;
        }
        .note-form-actions,
        .note-composer footer .button {
          width: 100%;
        }
        .note-form-actions .button {
          flex: 1;
        }
        .note-meta {
          width: 100%;
          justify-content: space-between;
        }
        .activity-filters {
          width: 100%;
          overflow-x: auto;
        }
        .activity-timeline {
          padding-left: 58px;
        }
        .activity-timeline::before {
          left: 23px;
        }
        .activity-marker {
          left: -58px;
          width: 40px;
          height: 40px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerDetailPage {
  readonly i18n = inject(LanguageService);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(CRM_DATA);
  private readonly ticketStore = inject(TicketStore);
  private readonly operationalStore = inject(OperationalStore);
  private readonly router = inject(Router);
  readonly customer = signal<Customer | undefined>(undefined);
  readonly loading = signal(true);
  readonly activeTab = signal('Resumen');
  readonly changePlanConfirmOpen = signal(false);
  readonly noteDraft = signal('');
  readonly noteAttachments = signal<ReadonlyArray<CrmAttachment>>([]);
  readonly noteAttachmentReset = signal(0);
  readonly pinNewNote = signal(false);
  readonly editingNoteId = signal<string | null>(null);
  readonly noteMenuId = signal<string | null>(null);
  readonly selectedNoteId = signal<string | null>(null);
  readonly activityFilter = signal<ActivityFilter>('all');
  readonly activityFilters: ReadonlyArray<{ label: string; value: ActivityFilter }> = [
    { label: 'Todos', value: 'all' },
    { label: 'Pagos', value: 'payment' },
    { label: 'Tickets', value: 'ticket' },
    { label: 'Llamadas', value: 'call' },
  ];
  readonly currentUser = {
    fullName: 'Andrea Torres',
    email: 'andrea.torres@speedlink.mx',
    initials: 'AT',
  };
  readonly tabs = [
    'Resumen',
    'Contratos',
    'Facturación y pagos',
    'Tickets',
    'Correos',
    'Eventos',
    'Notas',
    'Archivos',
    'Actividad',
  ];
  customerContracts(customer: Customer) {
    return this.operationalStore
      .recordsFor('contracts')
      .filter(
        (contract) =>
          String(contract['clientId'] ?? '') === customer.id ||
          String(contract['client'] ?? '') === customer.name,
      );
  }
  activeContract(customer: Customer) {
    return this.customerContracts(customer).find((contract) => contract['status'] === 'ACTIVE');
  }
  subscribedContractServices(customer: Customer): ReadonlyArray<SubscribedContractService> {
    const contract = this.activeContract(customer);
    if (!contract) return [];
    let items: ReadonlyArray<{ serviceId: string; quantity: number; unitPrice: number }> = [];
    try {
      items = JSON.parse(String(contract['items'] ?? '[]')) as typeof items;
    } catch {
      return [];
    }
    return items.map((item) => {
      const service = this.operationalStore.find('services', item.serviceId);
      return {
        id: `${contract.id}-${item.serviceId}`,
        name: String(service?.['name'] ?? item.serviceId),
        description: String(service?.['description'] ?? service?.['type'] ?? 'Servicio contratado'),
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
      };
    });
  }
  continuePlanChange(customer: Customer): void {
    this.changePlanConfirmOpen.set(false);
    void this.router.navigate(['/contracts'], {
      queryParams: { create: 'true', clientId: customer.id, clientName: customer.name },
    });
  }
  recordString(value: string | number | boolean | undefined): string {
    return String(value ?? '');
  }
  recordNumber(value: string | number | boolean | undefined): number {
    return Number(value) || 0;
  }
  customerTabs(customer: Customer): ReadonlyArray<RecordTabItem> {
    return this.tabs.map((label) => ({
      label,
      count:
        label === 'Contratos'
          ? this.customerContracts(customer).length
          : label === 'Tickets'
            ? this.openTicketCount(customer)
            : label === 'Notas'
              ? this.operationalStore.notesFor(customer.id).length
              : label === 'Actividad'
                ? this.operationalStore.activityFor(customer.id).length
                : label === 'Correos'
                  ? this.operationalStore.emailsFor(customer.id).length
                  : label === 'Archivos'
                    ? this.operationalStore.attachmentsFor(customer.id).length
                    : undefined,
    }));
  }
  customerStatusLabel(status: Customer['status']): string {
    return {
      active: 'Activo',
      pending: 'Pendiente',
      suspended: 'Suspendido',
      inactive: 'Inactivo',
      cancelled: 'Cancelado',
    }[status];
  }
  customerStatusTone(status: Customer['status']): string {
    return status === 'active' ? 'green' : status === 'pending' ? 'amber' : 'red';
  }
  customerSubtitle(customer: Customer): string {
    const installed = new Intl.DateTimeFormat(this.i18n.locale(), {
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${customer.installDate.slice(0, 10)}T12:00:00`));
    return `${customer.id} · Cliente desde ${installed}`;
  }
  customerField(
    key: EditableCustomerField,
    label: string,
    kind: RecordFieldConfig['kind'] = 'text',
  ): RecordFieldConfig {
    return { key, label, kind, editable: true };
  }
  auditField(key: string, label: string, user: EntityUser): RecordFieldConfig {
    return {
      key,
      label,
      kind: 'audit',
      auditUser: { id: `usr-${user.fullName.toLowerCase().replaceAll(' ', '-')}`, ...user },
    };
  }
  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      if (tab && this.tabs.includes(tab)) this.activeTab.set(tab);
    });
    this.route.paramMap
      .pipe(switchMap((params) => this.api.getCustomer(params.get('id') ?? '')))
      .subscribe((customer) => {
        this.customer.set(customer);
        if (customer) this.hydrateSharedSections(customer);
        this.loading.set(false);
      });
  }
  private hydrateSharedSections(customer: Customer): void {
    this.operationalStore.hydrateNotes(
      customer.id,
      customer.notes.map((note) => ({
        id: note.id,
        message: note.content,
        author: note.author.fullName,
        initials: note.author.initials,
        createdAt: note.createdAt,
        pinned: note.pinned,
        attachments: note.attachments ?? [],
      })),
    );
    this.operationalStore.hydrateActivity(
      customer.id,
      customer.timeline.map((event) => ({
        id: event.id,
        title: event.title,
        detail: event.detail,
        actor: event.author,
        createdAt: event.date,
        tone: event.type === 'payment' ? 'green' : event.type === 'ticket' ? 'violet' : 'blue',
        module: this.customerActivityModule(event.type),
        actionType: 'CREATE',
      })),
    );
  }
  private customerActivityModule(type: TimelineItem['type']): string {
    return {
      payment: 'Pagos',
      ticket: 'Tickets',
      call: 'Clientes',
      note: 'Notas',
      invoice: 'Facturas',
      service: 'Servicios',
      update: 'Clientes',
    }[type];
  }
  updateCustomerField(customer: Customer, field: EditableCustomerField, newValue: string): void {
    const previousValue = customer[field];
    if (previousValue === newValue) return;
    const changedAt = new Date().toISOString();
    const labels: Record<EditableCustomerField, string> = {
      email: 'Correo electrónico',
      phone: 'Teléfono',
      address: 'Dirección de instalación',
      community: 'Comunidad',
      gpsLocation: 'Ubicación GPS',
      installDate: 'Fecha de instalación',
    };
    const event: TimelineItem = {
      id: `activity-update-${Date.now()}`,
      title: `Campo actualizado — ${labels[field]}`,
      detail: `Valor anterior: ${previousValue} · Valor nuevo: ${newValue}`,
      date: changedAt,
      type: 'update',
      author: this.currentUser.fullName,
    };
    this.customer.update((current) =>
      current?.id === customer.id
        ? {
            ...current,
            [field]: newValue,
            updatedAt: changedAt,
            updatedBy: this.currentUser,
            timeline: [event, ...current.timeline],
          }
        : current,
    );
    this.operationalStore.logActivity(
      customer.id,
      `Campo actualizado — ${labels[field]}`,
      `Valor anterior: ${previousValue} · Valor nuevo: ${newValue}`,
      'blue',
      'Clientes',
      'EDIT',
    );
  }
  totalPaid(customer: Customer): number {
    return customer.payments.reduce((total, payment) => total + payment.amount, 0);
  }
  outstandingInvoiceCount(customer: Customer): number {
    return customer.invoices.filter((invoice) => invoice.status !== 'paid').length;
  }
  openTicketCount(customer: Customer): number {
    return customer.tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status))
      .length;
  }
  createCustomerTicket(customer: Customer, draft: NewCustomerTicket): void {
    const createdAt = new Date().toISOString();
    const slaHours = { low: 48, medium: 24, high: 8, urgent: 4 }[draft.priority];
    const numericIds = this.ticketStore
      .tickets()
      .map((ticket) => Number(ticket.id.replace(/\D/g, '')) || 0);
    const ticket: CustomerTicket = {
      id: `TK-${Math.max(2300, ...numericIds) + 1}`,
      clientId: customer.id,
      ...draft,
      status: 'open',
      createdById: 'usr-andrea-torres',
      createdAt,
      updatedAt: createdAt,
      slaDueAt: new Date(Date.now() + slaHours * 3_600_000).toISOString(),
      requester: customer.name,
      comments: [],
      attachments: [],
    };
    const event: TimelineItem = {
      id: `activity-ticket-${Date.now()}`,
      title: `Ticket abierto — ${ticket.id}`,
      detail: `${ticket.subject} · Prioridad ${this.ticketPriorityLabel(ticket.priority)} · Asignado a ${ticket.assignedTo}`,
      date: createdAt,
      type: 'ticket',
      author: this.currentUser.fullName,
    };
    this.customer.update((current) =>
      current?.id === customer.id
        ? {
            ...current,
            tickets: [ticket, ...current.tickets],
            timeline: [event, ...current.timeline],
            updatedAt: createdAt,
            updatedBy: this.currentUser,
          }
        : current,
    );
    this.ticketStore.add(ticket, {
      clientName: customer.name,
      clientEmail: customer.email,
      clientPhone: customer.phone,
      clientInitials: customer.initials,
    });
    this.operationalStore.logActivity(
      customer.id,
      `Ticket abierto — ${ticket.id}`,
      event.detail,
      'violet',
      'Tickets',
      'CREATE',
    );
  }
  changeCustomerTicketStatus(
    customer: Customer,
    ticket: CustomerTicket,
    status: CustomerTicket['status'],
  ): void {
    const changedAt = new Date().toISOString();
    const event: TimelineItem = {
      id: `activity-ticket-status-${Date.now()}`,
      title: `Ticket actualizado — ${ticket.id}`,
      detail: `Estado anterior: ${this.ticketStatusLabel(ticket.status)} · Nuevo estado: ${this.ticketStatusLabel(status)}`,
      date: changedAt,
      type: 'ticket',
      author: this.currentUser.fullName,
    };
    this.customer.update((current) =>
      current?.id === customer.id
        ? {
            ...current,
            tickets: current.tickets.map((item) =>
              item.id === ticket.id
                ? {
                    ...item,
                    status,
                    updatedAt: changedAt,
                    resolvedAt: ['resolved', 'closed'].includes(status) ? changedAt : undefined,
                  }
                : item,
            ),
            timeline: [event, ...current.timeline],
            updatedAt: changedAt,
            updatedBy: this.currentUser,
          }
        : current,
    );
    this.ticketStore.updateStatus(ticket.id, status, changedAt);
    this.operationalStore.logActivity(
      customer.id,
      `Ticket actualizado — ${ticket.id}`,
      event.detail,
      'blue',
      'Tickets',
      'EDIT',
    );
  }
  private ticketPriorityLabel(priority: CustomerTicket['priority']): string {
    return { low: 'baja', medium: 'media', high: 'alta', urgent: 'urgente' }[priority];
  }
  private ticketStatusLabel(status: CustomerTicket['status']): string {
    return {
      open: 'Abierto',
      in_progress: 'En progreso',
      waiting: 'En espera',
      resolved: 'Resuelto',
      closed: 'Cerrado',
    }[status];
  }
  nextBillingDate(customer: Customer): Date {
    const today = new Date();
    const date = new Date(today.getFullYear(), today.getMonth(), customer.billingDay);
    if (date < today) date.setMonth(date.getMonth() + 1);
    return date;
  }
  pinnedNotes(customer: Customer): ReadonlyArray<CustomerNote> {
    return customer.notes
      .filter((note) => note.pinned)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 5);
  }
  canPinNote(customer: Customer): boolean {
    const editingId = this.editingNoteId();
    return (
      this.pinnedNotes(customer).length < 5 ||
      customer.notes.some((note) => note.id === editingId && note.pinned)
    );
  }
  canTogglePinned(customer: Customer, note: CustomerNote): boolean {
    return note.pinned || this.pinnedNotes(customer).length < 5;
  }
  toggleDraftPin(customer: Customer): void {
    if (this.pinNewNote()) {
      this.pinNewNote.set(false);
      return;
    }
    if (this.canPinNote(customer)) this.pinNewNote.set(true);
  }
  sortedNotes(customer: Customer): Customer['notes'] {
    return [...customer.notes].sort(
      (left, right) =>
        Number(right.pinned) - Number(left.pinned) || right.createdAt.localeCompare(left.createdAt),
    );
  }
  saveNote(customer: Customer): void {
    const content = this.noteDraft().trim();
    if (!content) return;
    const changedAt = new Date().toISOString();
    const editingId = this.editingNoteId();
    const pinned = this.pinNewNote() && this.canPinNote(customer);
    this.customer.update((current) => {
      if (current?.id !== customer.id) return current;
      if (editingId)
        return {
          ...current,
          notes: current.notes.map((note) =>
            note.id === editingId
              ? {
                  ...note,
                  content,
                  pinned,
                  attachments: [...(note.attachments ?? []), ...this.noteAttachments()],
                }
              : note,
          ),
          updatedAt: changedAt,
          updatedBy: this.currentUser,
        };
      const note = {
        id: `note-${Date.now()}`,
        content,
        createdAt: changedAt,
        author: this.currentUser,
        pinned,
        attachments: this.noteAttachments(),
      };
      const event: TimelineItem = {
        id: `activity-${Date.now()}`,
        title: 'Nota agregada',
        detail: content,
        date: changedAt,
        type: 'note',
        author: this.currentUser.fullName,
      };
      return {
        ...current,
        notes: [note, ...current.notes],
        timeline: [event, ...current.timeline],
        updatedAt: changedAt,
        updatedBy: this.currentUser,
      };
    });
    this.cancelNoteEdit();
  }
  toggleNoteMenu(event: MouseEvent, noteId: string): void {
    event.stopPropagation();
    this.noteMenuId.set(this.noteMenuId() === noteId ? null : noteId);
  }
  togglePinnedNote(customer: Customer, note: CustomerNote): void {
    if (!this.canTogglePinned(customer, note)) return;
    const changedAt = new Date().toISOString();
    const pinned = !note.pinned;
    this.customer.update((current) =>
      current?.id === customer.id
        ? {
            ...current,
            notes: current.notes.map((item) => (item.id === note.id ? { ...item, pinned } : item)),
            updatedAt: changedAt,
            updatedBy: this.currentUser,
          }
        : current,
    );
    if (this.editingNoteId() === note.id) this.pinNewNote.set(pinned);
    this.noteMenuId.set(null);
  }
  openPinnedNote(noteId: string): void {
    this.activeTab.set('Notas');
    this.selectedNoteId.set(noteId);
    window.setTimeout(() =>
      document
        .getElementById(`customer-note-${noteId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    );
    window.setTimeout(() => this.selectedNoteId.set(null), 2200);
  }
  startNoteEdit(note: CustomerNote): void {
    this.noteDraft.set(note.content);
    this.pinNewNote.set(note.pinned);
    this.editingNoteId.set(note.id);
    this.noteMenuId.set(null);
  }
  cancelNoteEdit(): void {
    this.noteDraft.set('');
    this.pinNewNote.set(false);
    this.editingNoteId.set(null);
    this.noteAttachments.set([]);
    this.noteAttachmentReset.update((value) => value + 1);
  }
  deleteNote(customer: Customer, noteId: string): void {
    const changedAt = new Date().toISOString();
    this.customer.update((current) =>
      current?.id === customer.id
        ? {
            ...current,
            notes: current.notes.filter((note) => note.id !== noteId),
            updatedAt: changedAt,
            updatedBy: this.currentUser,
          }
        : current,
    );
    if (this.editingNoteId() === noteId) this.cancelNoteEdit();
    this.noteMenuId.set(null);
  }
  filteredTimeline(customer: Customer): ReadonlyArray<TimelineItem> {
    const filter = this.activityFilter();
    return [...customer.timeline]
      .filter((item) => filter === 'all' || item.type === filter)
      .sort((left, right) => right.date.localeCompare(left.date));
  }
  activitySince(customer: Customer): string {
    return customer.timeline.reduce(
      (earliest, item) => (item.date < earliest ? item.date : earliest),
      customer.timeline[0]?.date ?? customer.createdAt,
    );
  }
  activityIcon(type: TimelineItem['type']): string {
    return {
      payment: '$',
      ticket: '□',
      call: '☎',
      invoice: '▤',
      service: '⌁',
      note: '✎',
      update: '↻',
    }[type];
  }
  formatAttachmentSize(size: number): string {
    return size < 1024 * 1024
      ? `${Math.ceil(size / 1024)} KB`
      : `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
  @HostListener('document:click') closeNoteMenu(): void {
    this.noteMenuId.set(null);
  }
}
