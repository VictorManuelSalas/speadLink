import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LanguageService } from '../../core/i18n/language.service';
import { CRM_DATA } from '../../core/data-access/crm-data';
import { CrmAttachment, Customer } from '../../core/models/customer';
import { AttachmentPicker } from '../../shared/attachment-picker';
import { FileUploadModal } from '../../shared/file-upload-modal';
import { InlineEditableDateField } from '../../shared/inline-editable-date-field';
import { InlineEditableField } from '../../shared/inline-editable-field';
import { RecordField, RecordFieldConfig } from '../../shared/record-field';
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
import {
  OPERATIONAL_MODULES,
  OperationalModuleKey,
  OperationalRecord,
} from './operational-modules.data';
import { LeadEmailFormValue, LeadEmailModal, LeadEmailSeed } from './lead-email-modal';
import { RecordEventsSection } from './lead-events-section';
import { OperationalEmail, OperationalStore } from './operational-store';
import {
  RecordActivitySection,
  RecordAttachmentsSection,
  RecordEmailsSection,
  RecordNotesSection,
} from './record-sections';

type DetailTab = 'Resumen' | 'Correos' | 'Eventos' | 'Notas' | 'Actividad' | 'Archivos';

interface RelatedItem {
  icon: string;
  title: string;
  detail: string;
  meta: string;
  tone: string;
  route?: ReadonlyArray<string>;
}

interface LookupPreview {
  type: string;
  title: string;
  detail: string;
  initials: string;
}

@Component({
  selector: 'app-operational-record-detail-page',
  imports: [
    AttachmentPicker,
    CurrencyPipe,
    DatePipe,
    FileUploadModal,
    InlineEditableDateField,
    InlineEditableField,
    LeadEmailModal,
    RecordDetailLayout,
    RecordField,
    RecordHeader,
    RecordInformationCard,
    RecordQuickActions,
    RecordRecentActivity,
    RecordSummary,
    RecordTabs,
    RecordActivitySection,
    RecordAttachmentsSection,
    RecordEmailsSection,
    RecordEventsSection,
    RecordNotesSection,
    RouterLink,
  ],
  template: `
    @if (record(); as item) {
      <div class="breadcrumbs">
        <a [routerLink]="['/', moduleKey]">{{ definition.title }}</a
        ><b>›</b><span>{{ item.id }}</span>
      </div>
      @if (isConvertedLead(item)) {
        <section class="card converted-lead">
          <span class="converted-icon">✓</span>
          <div>
            <span>LEAD CONVERTIDO</span>
            <h1>{{ primaryValue(item) }} ya es cliente</h1>
            <p>
              Este lead fue convertido el
              {{ asString(item['convertedAt']) | date: 'dd MMM y, HH:mm' : '' : i18n.locale() }}. Su
              historial comercial permanece disponible como trazabilidad, pero la gestión continúa
              desde el cliente.
            </p>
          </div>
          <article>
            <span
              class="detail-avatar"
              [style.background]="definition.accent + '18'"
              [style.color]="definition.accent"
              >{{ initials(primaryValue(item)) }}</span
            ><span
              ><small>Cliente generado</small><b>{{ primaryValue(item) }}</b
              ><em>{{ item['convertedToClientId'] }}</em></span
            ><a
              class="button button--primary"
              [routerLink]="['/customers', item['convertedToClientId']]"
              >Ver cliente →</a
            >
          </article>
          <a class="button" routerLink="/leads">← Volver a leads</a>
        </section>
      } @else {
        <app-record-header
          [rootLabel]="definition.title"
          [rootRoute]="['/', moduleKey]"
          [recordId]="item.id"
          [title]="primaryValue(item)"
          [initials]="initials(primaryValue(item))"
          [accent]="definition.accent"
          [statusLabel]="item['status'] ? statusLabel(item['status']) : ''"
          [statusTone]="statusTone(item['status'])"
          [subtitle]="item.id + ' · Actualizado ' + formattedUpdatedAt(item)"
        >
          <div record-actions>
            <button class="button" type="button">✉ Compartir</button>
            @if (moduleKey === 'leads') {
              <button
                class="button button--primary convert-button"
                type="button"
                (click)="convertLead(item)"
              >
                ✓ Convertir a cliente
              </button>
            } @else {
              <button class="button button--primary" type="button" (click)="activeTab.set('Notas')">
                ＋ Agregar nota
              </button>
            }
          </div>
        </app-record-header>

        <app-record-summary>
          @for (column of summaryColumns(); track column.key) {
            <div class="record-summary-item">
              <span>{{ column.label }}</span>
              @if (column.type === 'status') {
                <span class="record-status record-status--{{ statusTone(item[column.key]) }}"
                  ><i></i>{{ statusLabel(item[column.key]) }}</span
                >
              } @else if (column.type === 'money') {
                <b>{{
                  asNumber(item[column.key])
                    | currency: 'MXN' : 'symbol-narrow' : '1.0-2' : i18n.locale()
                }}</b>
              } @else if (column.type === 'date') {
                <b>{{ asString(item[column.key]) | date: 'dd MMM y' : '' : i18n.locale() }}</b>
              } @else if (moduleKey === 'leads' && column.key === 'phone') {
                <a
                  class="whatsapp-value"
                  [href]="whatsappUrl(item[column.key])"
                  target="_blank"
                  rel="noopener"
                  aria-label="Abrir conversación en WhatsApp"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20 11.6a8 8 0 0 1-11.8 7l-4.2 1 1.1-4A8 8 0 1 1 20 11.6Z" />
                    <path
                      d="M8.5 7.8c.3-.4.6-.3.9-.1l1.1 2c.1.3 0 .5-.2.7l-.6.6c.7 1.5 1.8 2.6 3.3 3.2l.6-.7c.2-.2.5-.3.7-.2l2 1c.3.2.4.5.3.8-.3 1-1.2 1.7-2.3 1.7-3.5-.3-7.4-4.2-7.7-7.7 0-.5.3-1 .6-1.3Z"
                    />
                  </svg>
                  <b>{{ item[column.key] || '—' }}</b>
                </a>
              } @else {
                <b>{{ item[column.key] || '—' }}</b>
              }
              <small>{{ statHelper(column.key) }}</small>
            </div>
          }
        </app-record-summary>

        <app-record-tabs
          [tabs]="recordTabs(item.id)"
          [active]="activeTab()"
          (activeChange)="setActiveTab($event)"
        />

        @if (activeTab() === 'Notas') {
          <app-record-notes-section [recordId]="item.id" />
        } @else if (activeTab() === 'Correos') {
          <app-record-emails-section
            [recordId]="item.id"
            [recipientEmail]="asString(item['email'] || '')"
          />
        } @else if (activeTab() === 'Actividad') {
          <app-record-activity-section [recordId]="item.id" />
        } @else if (activeTab() === 'Archivos') {
          <app-record-attachments-section [recordId]="item.id" />
        } @else if (activeTab() === 'Eventos') {
          <app-record-events-section
            recordType="lead"
            [recordId]="item.id"
            [recordName]="primaryValue(item)"
          />
        } @else {
          @switch (activeTab()) {
            @case ('Resumen') {
              <app-record-detail-layout>
                <div record-main>
                  <app-record-information-card [title]="'Información de ' + definition.singular">
                    <div class="record-info-grid">
                      @if (moduleKey === 'leads') {
                        <app-record-field
                          [config]="leadGpsField"
                          [value]="leadCoordinates(item)"
                          (valueSaved)="updateLeadCoordinates(item.id, $event)"
                        />
                      }
                      @for (field of displayFields(item); track field.key) {
                        <app-record-field
                          [config]="operationalFieldConfig(field, item)"
                          [value]="asString(item[field.key] || '')"
                          (valueSaved)="saveOperationalField(item, field.key, $event)"
                        />
                      }
                      @if (item && false) {
                        @for (field of displayFields(item); track field.key) {
                          @if (field.type === 'status' && moduleKey === 'leads') {
                            <div
                              class="record-field editable-status-field"
                              [class.is-editing]="editingStatus()"
                            >
                              <span>{{ field.label }}</span>
                              @if (editingStatus()) {
                                <div class="status-editor">
                                  <select #leadStatus [value]="item[field.key]">
                                    @for (option of statusOptions(); track option) {
                                      <option [value]="option">{{ statusLabel(option) }}</option>
                                    }
                                  </select>
                                  <button
                                    class="save"
                                    type="button"
                                    aria-label="Guardar estado"
                                    (click)="saveLeadStatus(item.id, field.key, leadStatus.value)"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="Cancelar"
                                    (click)="editingStatus.set(false)"
                                  >
                                    ×
                                  </button>
                                </div>
                              } @else {
                                <div class="status-value">
                                  <span
                                    class="record-status record-status--{{
                                      statusTone(item[field.key])
                                    }}"
                                    ><i></i>{{ statusLabel(item[field.key]) }}</span
                                  >
                                  <button
                                    type="button"
                                    aria-label="Editar estado"
                                    (click)="editingStatus.set(true)"
                                  >
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                      <path
                                        d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20ZM14 7l3 3"
                                      />
                                    </svg>
                                  </button>
                                </div>
                              }
                            </div>
                          } @else if (field.type === 'status') {
                            <div class="record-field">
                              <span>{{ field.label }}</span>
                              <div>
                                <span
                                  class="record-status record-status--{{
                                    statusTone(item[field.key])
                                  }}"
                                  ><i></i>{{ statusLabel(item[field.key]) }}</span
                                >
                              </div>
                            </div>
                          } @else if (field.inputType === 'select') {
                            <div
                              class="record-field editable-status-field"
                              [class.is-editing]="editingPicklistKey() === field.key"
                            >
                              <span>{{ field.label }}</span>
                              @if (editingPicklistKey() === field.key) {
                                <div class="status-editor">
                                  <select #picklist [value]="item[field.key]">
                                    @for (option of field.options; track option) {
                                      <option [value]="option">{{ option }}</option>
                                    }
                                  </select>
                                  <button
                                    class="save"
                                    type="button"
                                    aria-label="Guardar selección"
                                    (click)="savePicklist(item.id, field.key, picklist.value)"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="Cancelar"
                                    (click)="editingPicklistKey.set(null)"
                                  >
                                    ×
                                  </button>
                                </div>
                              } @else {
                                <div class="status-value picklist-value">
                                  <b>{{ item[field.key] || '—' }}</b>
                                  <button
                                    type="button"
                                    [attr.aria-label]="'Editar ' + field.label"
                                    (click)="editingPicklistKey.set(field.key)"
                                  >
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                      <path
                                        d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20ZM14 7l3 3"
                                      />
                                    </svg>
                                  </button>
                                </div>
                              }
                            </div>
                          } @else if (field.editable && field.type === 'date') {
                            <app-inline-editable-date-field
                              [label]="field.label"
                              [value]="asString(item[field.key] || '')"
                              (valueSaved)="updateField(item.id, field.key, $event)"
                            />
                          } @else if (relatedRoute(field.key, item[field.key]); as route) {
                            <div class="record-field lookup-field">
                              <span>{{ field.label }}</span
                              ><a class="lookup-link" [routerLink]="route"
                                ><b>{{ item[field.key] || '—' }}</b
                                ><span>↗</span>
                                @if (lookupPreview(field.key, item[field.key]); as preview) {
                                  <aside class="lookup-card" role="tooltip">
                                    <span class="lookup-card__avatar">{{ preview.initials }}</span>
                                    <span
                                      ><small>{{ preview.type }}</small
                                      ><b>{{ preview.title }}</b
                                      ><em>{{ preview.detail }}</em></span
                                    >
                                  </aside>
                                }
                              </a>
                            </div>
                          } @else if (field.editable) {
                            <app-inline-editable-field
                              [label]="field.label"
                              [type]="editableInputType(field.key)"
                              [value]="asString(item[field.key] || '')"
                              [displayValue]="fieldDisplayValue(field, item[field.key])"
                              [href]="fieldActionHref(field.key, item[field.key])"
                              (valueSaved)="updateField(item.id, field.key, $event)"
                            />
                          } @else {
                            <div class="record-field">
                              <span>{{ field.label }}</span>
                              <div>
                                @if (field.type === 'money') {
                                  <b>{{
                                    asNumber(item[field.key])
                                      | currency: 'MXN' : 'symbol-narrow' : '1.0-2' : i18n.locale()
                                  }}</b>
                                } @else if (field.type === 'date') {
                                  <b>{{
                                    asString(item[field.key])
                                      | date: 'dd MMM y, HH:mm' : '' : i18n.locale()
                                  }}</b>
                                } @else {
                                  <b>{{ item[field.key] || '—' }}</b>
                                }
                              </div>
                            </div>
                          }
                        }
                      }
                      <app-record-field
                        [config]="operationalAuditField('createdAt', 'Creado')"
                        [value]="createdAt(item)"
                      />
                      <app-record-field
                        [config]="operationalAuditField('updatedAt', 'Última actualización')"
                        [value]="updatedAt(item)"
                      />
                      @if (item && false) {
                        <div class="record-field">
                          <span>Creado</span>
                          <div class="audit-line">
                            <b>{{
                              createdAt(item) | date: 'dd MMM y, HH:mm' : '' : i18n.locale()
                            }}</b>
                            <i class="audit-separator"></i>
                            <a class="audit-user" routerLink="/users/usr-andrea-torres">
                              <span class="avatar audit-avatar">AT</span><b>Andrea Torres</b>
                              <aside class="audit-user-card" role="tooltip">
                                <span class="avatar">AT</span
                                ><span
                                  ><b>Andrea Torres</b
                                  ><small>andrea.torres@speedlink.mx</small></span
                                >
                              </aside>
                            </a>
                          </div>
                        </div>
                        <div class="record-field">
                          <span>Última actualización</span>
                          <div class="audit-line">
                            <b>{{
                              updatedAt(item) | date: 'dd MMM y, HH:mm' : '' : i18n.locale()
                            }}</b>
                            <i class="audit-separator"></i>
                            <a class="audit-user" routerLink="/users/usr-andrea-torres">
                              <span class="avatar audit-avatar">AT</span><b>Andrea Torres</b>
                              <aside class="audit-user-card" role="tooltip">
                                <span class="avatar">AT</span
                                ><span
                                  ><b>Andrea Torres</b
                                  ><small>andrea.torres@speedlink.mx</small></span
                                >
                              </aside>
                            </a>
                          </div>
                        </div>
                      }
                    </div>
                  </app-record-information-card>

                  @if (moduleKey !== 'leads') {
                    <article class="card section-card related-card">
                      <div class="card-heading">
                        <div>
                          <h2>{{ relatedTitle() }}</h2>
                          <p>{{ relatedSubtitle() }}</p>
                        </div>
                        <button class="link-button" type="button">Ver todos</button>
                      </div>
                      @for (related of relatedItems(item); track related.title) {
                        @if (related.route) {
                          <a class="related-row related-row--link" [routerLink]="related.route">
                            <span class="related-icon related-icon--{{ related.tone }}">{{
                              related.icon
                            }}</span
                            ><span
                              ><b>{{ related.title }}</b
                              ><small>{{ related.detail }}</small></span
                            ><em>{{ related.meta }} <i>↗</i></em>
                          </a>
                        } @else {
                          <div class="related-row">
                            <span class="related-icon related-icon--{{ related.tone }}">{{
                              related.icon
                            }}</span
                            ><span
                              ><b>{{ related.title }}</b
                              ><small>{{ related.detail }}</small></span
                            ><em>{{ related.meta }}</em>
                          </div>
                        }
                      }
                    </article>
                  }
                  @if (pinnedNotes(item.id).length) {
                    <article class="card section-card overview-pinned-notes">
                      <div class="card-heading">
                        <div>
                          <h2>Notas fijadas</h2>
                          <p>{{ pinnedNotes(item.id).length }} de 5 notas en el resumen</p>
                        </div>
                        <button class="link-button" type="button" (click)="activeTab.set('Notas')">
                          Ver todas
                        </button>
                      </div>
                      @for (note of pinnedNotes(item.id); track note.id) {
                        <button
                          class="overview-pinned-note"
                          type="button"
                          (click)="openPinnedNote(note.id)"
                        >
                          <div>
                            <span class="avatar avatar--sm">{{ note.initials }}</span
                            ><span
                              ><b>{{ note.author }}</b
                              ><small>{{
                                note.createdAt | date: 'dd MMM y, HH:mm' : '' : i18n.locale()
                              }}</small></span
                            >
                          </div>
                          <p>{{ note.message }}</p>
                        </button>
                      }
                    </article>
                  }
                </div>
                <div record-aside>
                  <app-record-quick-actions>
                    @if (moduleKey === 'leads') {
                      <button type="button" (click)="activeTab.set('Correos')">
                        ✉ Enviar email
                      </button>
                    }
                    <button type="button" (click)="activeTab.set('Notas')">＋ Agregar nota</button>
                    @if (moduleKey !== 'leads') {
                      <button type="button">▤ Generar reporte</button>
                    }
                    <button class="danger-action" type="button" (click)="archive(item.id)">
                      ⊘ Archivar registro
                    </button>
                  </app-record-quick-actions>
                  <app-record-recent-activity [recordId]="item.id" />
                </div>
              </app-record-detail-layout>
            }
            @case ('Notas') {
              <section class="notes-section">
                <header class="notes-heading">
                  <div>
                    <h2>Notas</h2>
                    <p>
                      {{ notes(item.id).length }}
                      {{ notes(item.id).length === 1 ? 'nota' : 'notas' }}
                    </p>
                  </div>
                  <button
                    class="button button--primary"
                    type="button"
                    (click)="noteComposerOpen.set(true)"
                  >
                    ＋ Nueva nota
                  </button>
                </header>
                @if (noteComposerOpen() || editingNoteId()) {
                  <article class="card note-composer">
                    <textarea
                      #note
                      placeholder="Agrega una nota sobre este registro…"
                      aria-label="Nueva nota"
                      [value]="noteDraft()"
                      (input)="noteDraft.set(note.value)"
                    ></textarea>
                    <div class="note-attachment-picker">
                      <app-attachment-picker
                        [resetKey]="attachmentReset()"
                        (attachmentsChange)="attachments.set($event)"
                      />
                    </div>
                    <footer>
                      <button
                        class="note-pin-button"
                        type="button"
                        [class.is-active]="pinNewNote()"
                        [disabled]="!pinNewNote() && !canPinNote(item.id)"
                        [attr.aria-pressed]="pinNewNote()"
                        (click)="toggleDraftPin(item.id)"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M6 3h12v18l-6-4-6 4V3Z" /></svg
                        >{{ pinNewNote() ? 'Se fijará al guardar' : 'Fijar en el resumen' }} ({{
                          pinnedNotes(item.id).length
                        }}/5)
                      </button>
                      <div class="note-form-actions">
                        <button class="button" type="button" (click)="cancelNoteEdit()">
                          Cancelar
                        </button>
                        <button
                          class="button button--primary"
                          type="button"
                          [disabled]="!noteDraft().trim()"
                          (click)="saveNote(item.id)"
                        >
                          {{ editingNoteId() ? 'Actualizar nota' : 'Guardar nota' }}
                        </button>
                      </div>
                    </footer>
                  </article>
                }
                <div class="notes-list">
                  @for (noteItem of sortedNotes(item.id); track noteItem.id) {
                    <article
                      [id]="'operational-note-' + noteItem.id"
                      class="card note-card"
                      [class.note-card--pinned]="noteItem.pinned"
                      [class.note-card--selected]="selectedNoteId() === noteItem.id"
                      [class.note-card--menu-open]="noteMenuId() === noteItem.id"
                    >
                      <header>
                        <div class="note-author">
                          <span class="avatar">{{ noteItem.initials }}</span
                          ><b>{{ noteItem.author }}</b>
                          @if (noteItem.pinned) {
                            <span class="pinned-badge"
                              ><svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M6 3h12v18l-6-4-6 4V3Z" /></svg
                              >Fijada</span
                            >
                          }
                        </div>
                        <div class="note-meta">
                          <time>{{
                            noteItem.createdAt | date: 'dd MMM y, HH:mm' : '' : i18n.locale()
                          }}</time
                          ><button
                            class="icon-button note-menu-trigger"
                            [class.is-active]="noteMenuId() === noteItem.id"
                            aria-label="Acciones de la nota"
                            (click)="toggleNoteMenu($event, noteItem.id)"
                          >
                            •••
                          </button>
                        </div>
                        @if (noteMenuId() === noteItem.id) {
                          <div class="note-action-menu" (click)="$event.stopPropagation()">
                            <button
                              type="button"
                              [disabled]="!canTogglePinned(item.id, noteItem.pinned)"
                              (click)="togglePinnedNote(item.id, noteItem.id)"
                            >
                              <span>{{ noteItem.pinned ? '◇' : '◆' }}</span
                              >{{ noteItem.pinned ? 'Desfijar' : 'Fijar en resumen' }}</button
                            ><button
                              type="button"
                              (click)="
                                startEditingNote(noteItem.id, noteItem.message, noteItem.pinned)
                              "
                            >
                              <span>✎</span>Actualizar</button
                            ><button
                              class="danger"
                              type="button"
                              (click)="deleteNote(item.id, noteItem.id)"
                            >
                              <span>⊘</span>Eliminar
                            </button>
                          </div>
                        }
                      </header>
                      <p>{{ noteItem.message }}</p>
                      @if (noteItem.attachments.length) {
                        <div class="note-attachments">
                          @for (file of noteItem.attachments; track file.id) {
                            <a [href]="file.url" target="_blank" rel="noopener"
                              ><span>{{ file.mimeType.startsWith('image/') ? '▧' : '▤' }}</span
                              ><span
                                ><b>{{ file.fileName }}</b
                                ><small>{{ formatSize(file.size) }}</small></span
                              ></a
                            >
                          }
                        </div>
                      }
                    </article>
                  } @empty {
                    <article class="card section-empty-state">
                      <span>▤</span>
                      <h3>Sin notas todavía</h3>
                      <p>La primera nota que agregues aparecerá aquí.</p>
                    </article>
                  }
                </div>
              </section>
            }
            @case ('Correos') {
              <section class="email-section">
                <header class="email-heading">
                  <div>
                    <h2>Correos</h2>
                    <p>Conversaciones y mensajes enviados a este lead</p>
                  </div>
                  <div class="email-heading__actions">
                    <span>{{ emails(item.id).length }} correo(s)</span>
                    <button
                      class="button button--primary"
                      type="button"
                      (click)="openEmailComposer()"
                    >
                      ＋ Nuevo correo
                    </button>
                  </div>
                </header>
                <div class="email-list">
                  @for (email of emails(item.id); track email.id) {
                    <article
                      class="card email-card"
                      tabindex="0"
                      (click)="openEmail(email)"
                      (keydown.enter)="openEmail(email)"
                    >
                      <span class="email-icon">✉</span>
                      <div>
                        <header>
                          <h3>{{ email.subject }}</h3>
                          <span [class.is-draft]="email.status === 'DRAFT'">{{
                            email.status === 'DRAFT' ? 'Borrador' : 'Enviado'
                          }}</span>
                        </header>
                        <p>{{ email.body }}</p>
                        <small
                          >Para {{ email.to }} · por {{ email.sentBy }} ·
                          {{ email.sentAt | date: 'dd MMM y, HH:mm' : '' : i18n.locale() }}</small
                        >
                      </div>
                      <button
                        class="icon-button email-menu-trigger"
                        type="button"
                        aria-label="Opciones del correo"
                        (click)="toggleEmailMenu($event, email.id)"
                      >
                        •••
                      </button>
                      @if (emailMenuId() === email.id) {
                        <div class="email-action-menu" (click)="$event.stopPropagation()">
                          @if (email.status === 'DRAFT') {
                            <button type="button" (click)="editDraft(email)">
                              <span>✎</span>Editar borrador
                            </button>
                          }
                          <button type="button" (click)="openEmailPreview(email)">
                            <span>↗</span>Ver
                          </button>
                          @if (email.status === 'SENT') {
                            <button type="button" (click)="composeFromEmail(email, 'resend')">
                              <span>↻</span>Reenviar
                            </button>
                          }
                          <button type="button" (click)="composeFromEmail(email, 'forward')">
                            <span>→</span>Reenviar a…
                          </button>
                        </div>
                      }
                    </article>
                  } @empty {
                    <article class="card section-empty-state">
                      <span>✉</span>
                      <h3>No hay correos enviados</h3>
                      <p>El primer mensaje aparecerá aquí y también en la actividad.</p>
                    </article>
                  }
                </div>
              </section>
            }
            @case ('Actividad') {
              <section class="activity-section">
                <header>
                  <div>
                    <h2>Historial de actividad</h2>
                    <p>
                      {{ filteredActivity(item.id).length }} de
                      {{ activity(item.id).length }} eventos
                    </p>
                  </div>
                  <div class="activity-filters">
                    <button
                      type="button"
                      [class.is-active]="!activityModule() && !activityType() && !activityDate()"
                      (click)="clearActivityFilters()"
                    >
                      Todos
                    </button>
                    <label [class.has-value]="activityModule()">
                      <span class="sr-only">Filtrar por módulo</span>
                      <select [value]="activityModule()" (change)="setActivityModule($event)">
                        <option value="">Módulo</option>
                        @for (module of activityModuleOptions; track module) {
                          <option [value]="module">{{ module }}</option>
                        }
                      </select>
                    </label>
                    <label [class.has-value]="activityType()">
                      <span class="sr-only">Filtrar por tipo</span>
                      <select [value]="activityType()" (change)="setActivityType($event)">
                        <option value="">Tipo</option>
                        <option value="CREATE">Creación</option>
                        <option value="EDIT">Edición</option>
                        <option value="DELETE">Eliminación</option>
                      </select>
                    </label>
                    <div class="activity-date-filter" [class.has-value]="activityDate()">
                      <app-inline-editable-date-field
                        label="Fecha"
                        [value]="activityDate()"
                        placeholder="Fecha"
                        [alwaysShowEdit]="true"
                        [compact]="true"
                        (valueSaved)="activityDate.set($event)"
                      />
                    </div>
                    @if (activityDate()) {
                      <button
                        class="activity-date-clear"
                        type="button"
                        aria-label="Quitar filtro de fecha"
                        (click)="activityDate.set('')"
                      >
                        ×
                      </button>
                    }
                  </div>
                </header>
                <div class="activity-timeline">
                  @for (event of filteredActivity(item.id); track event.id) {
                    <article>
                      <span class="timeline-marker timeline-marker--{{ event.tone }}">{{
                        activityIcon(event.tone)
                      }}</span>
                      <div class="card timeline-card">
                        <header>
                          <div>
                            <h3>{{ event.title }}</h3>
                            <p>
                              por <b>{{ event.actor }}</b>
                            </p>
                          </div>
                          <time>{{
                            event.createdAt | date: 'dd MMM y, HH:mm' : '' : i18n.locale()
                          }}</time>
                        </header>
                        <div class="activity-meta">
                          <span>{{ event.module }}</span
                          ><span>{{ actionTypeLabel(event.actionType) }}</span>
                        </div>
                        <p>{{ event.detail }}</p>
                      </div>
                    </article>
                  } @empty {
                    <article class="card section-empty-state activity-empty">
                      <span>⌕</span>
                      <h3>Sin resultados</h3>
                      <p>No hay actividad que coincida con estos filtros.</p>
                      <button type="button" (click)="clearActivityFilters()">
                        Limpiar filtros
                      </button>
                    </article>
                  }
                </div>
              </section>
            }
            @case ('Eventos') {
              <app-record-events-section
                recordType="lead"
                [recordId]="item.id"
                [recordName]="primaryValue(item)"
              />
            }
            @case ('Archivos') {
              <section class="files-section">
                <header class="files-heading">
                  <div>
                    <h2>Archivos adjuntos</h2>
                    <p>
                      {{ recordFiles(item.id).length }}
                      {{ recordFiles(item.id).length === 1 ? 'archivo' : 'archivos' }} relacionados
                      con este lead
                    </p>
                  </div>
                  <button
                    class="button button--primary"
                    type="button"
                    (click)="uploadModalOpen.set(true)"
                  >
                    ⇧ Subir archivos
                  </button>
                </header>
                @if (uploadModalOpen()) {
                  <app-file-upload-modal
                    (closed)="uploadModalOpen.set(false)"
                    (filesUploaded)="handleRecordFilesUploaded(item.id, $event)"
                  />
                }
                <div class="files-grid">
                  @for (file of recordFiles(item.id); track file.id) {
                    <article class="card file-card">
                      @if (file.mimeType.startsWith('image/')) {
                        <img class="file-preview" [src]="file.url" [alt]="file.fileName" />
                      } @else {
                        <span class="file-type">{{ fileExtension(file.fileName) }}</span>
                      }
                      <span class="file-copy"
                        ><b>{{ file.fileName }}</b
                        ><small
                          >{{ formatSize(file.size) }} ·
                          {{ file.createdAt | date: 'dd MMM y, HH:mm' : '' : i18n.locale() }}</small
                        ></span
                      ><button
                        class="icon-button"
                        type="button"
                        aria-label="Opciones del archivo"
                        (click)="toggleFileMenu($event, file.id)"
                      >
                        •••
                      </button>
                      @if (fileMenuId() === file.id) {
                        <div class="file-action-menu" (click)="$event.stopPropagation()">
                          <a [href]="file.url" target="_blank" rel="noopener"><span>↗</span>Ver</a
                          ><a [href]="file.url" [attr.download]="file.fileName"
                            ><span>⇩</span>Descargar</a
                          ><button
                            class="danger"
                            type="button"
                            (click)="deleteRecordFile(item.id, file.id)"
                          >
                            <span>⊘</span>Eliminar
                          </button>
                        </div>
                      }
                    </article>
                  } @empty {
                    <article class="card section-empty-state">
                      <span>▤</span>
                      <h3>Aún no hay archivos</h3>
                      <p>Los archivos cargados para este lead aparecerán aquí.</p>
                    </article>
                  }
                </div>
              </section>
            }
          }
        }
        @if (emailComposerOpen()) {
          <app-lead-email-modal
            [seed]="emailComposeSeed()"
            [composeKey]="emailComposeKey()"
            (closed)="closeEmailComposer()"
            (submitted)="saveLeadEmail(item.id, $event.value, $event.draft)"
          />
        }
        @if (emailPreview(); as selectedEmail) {
          <app-lead-email-modal
            [preview]="selectedEmail"
            (closed)="emailPreview.set(null)"
            (edit)="editDraft($event)"
            (resend)="composeFromEmail($event, 'resend')"
            (forward)="composeFromEmail($event, 'forward')"
          />
        }
      }
    } @else {
      <section class="card state-card">
        <span>404</span>
        <h1>Registro no encontrado</h1>
        <p>Este registro no existe o fue archivado.</p>
        <a class="button button--primary" [routerLink]="['/', moduleKey]"
          >Volver a {{ definition.title.toLowerCase() }}</a
        >
      </section>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .record-hero {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        margin: 14px 0 18px;
      }
      .converted-lead {
        max-width: 720px;
        margin: 70px auto;
        padding: 35px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
      .converted-icon {
        width: 58px;
        height: 58px;
        border-radius: 50%;
        background: #dcfce7;
        color: #15803d;
        display: grid;
        place-items: center;
        font-size: 24px;
        font-weight: 800;
      }
      .converted-lead > div > span {
        display: block;
        margin-top: 18px;
        color: #15803d;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.1em;
      }
      .converted-lead h1 {
        margin-top: 6px;
      }
      .converted-lead > div > p {
        max-width: 570px;
        margin: 9px auto 0;
        color: var(--color-text-secondary);
        line-height: 1.6;
      }
      .converted-lead article {
        width: min(520px, 100%);
        margin: 25px 0 18px;
        padding: 16px;
        border: 1px solid var(--color-border);
        border-radius: 11px;
        background: var(--color-background);
        display: flex;
        align-items: center;
        gap: 11px;
        text-align: left;
      }
      .converted-lead article > span:nth-child(2) {
        min-width: 0;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .converted-lead article small,
      .converted-lead article em {
        color: var(--color-text-secondary);
        font-size: 10px;
        font-style: normal;
      }
      .converted-lead article b {
        font-size: 13px;
      }
      .convert-button {
        background: #059669;
        border-color: #059669;
      }
      .record-hero__identity {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .detail-avatar {
        width: 50px;
        height: 50px;
        border-radius: 13px;
        display: grid;
        place-items: center;
        font-size: 14px;
        font-weight: 800;
      }
      .record-hero p {
        margin-top: 5px;
        color: var(--color-text-secondary);
        font-size: 12px;
      }
      .record-status {
        width: fit-content;
        padding: 5px 9px;
        border-radius: 99px;
        background: #e2e8f0;
        color: #475569;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 10px;
        font-weight: 700;
      }
      .record-status i {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
      }
      .record-status--green {
        background: #dcfce7;
        color: #15803d;
      }
      .record-status--blue {
        background: #dbeafe;
        color: #1d4ed8;
      }
      .record-status--amber {
        background: #fef3c7;
        color: #b45309;
      }
      .record-status--red {
        background: #fee2e2;
        color: #b91c1c;
      }
      .record-status--violet {
        background: #ede9fe;
        color: #6d28d9;
      }
      .operational-detail-stats > div {
        min-width: 0;
      }
      .operational-detail-stats b {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .whatsapp-value {
        width: fit-content;
        color: var(--color-text-primary);
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .whatsapp-value svg {
        width: 23px;
        height: 23px;
        padding: 3px;
        border-radius: 50%;
        background: #22c55e;
        fill: none;
        stroke: #fff;
        stroke-width: 1.7;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .whatsapp-value:hover b {
        color: #16a34a;
      }
      .record-tabs {
        margin-bottom: 18px;
      }
      .tab-count {
        min-width: 20px;
        height: 20px;
        margin-left: 5px;
        padding: 0 6px;
        border-radius: 99px;
        background: var(--color-muted);
        display: inline-grid;
        place-items: center;
        font-size: 9px;
      }
      .tabs button.is-active .tab-count {
        background: #dbeafe;
      }
      .record-info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0 26px;
        margin-top: 16px;
      }
      .record-info-grid app-inline-editable-field,
      .record-info-grid app-inline-editable-date-field {
        min-height: 76px;
        padding: 12px 0;
        border-bottom: 1px solid var(--color-border);
      }
      .record-field {
        min-height: 76px;
        padding: 12px 0;
        border-bottom: 1px solid var(--color-border);
        display: flex;
        flex-direction: column;
        gap: 7px;
      }
      .record-field > span {
        color: var(--color-text-secondary);
        font-size: 10px;
      }
      .record-field b {
        font-size: 12.5px;
      }
      .record-field input {
        width: 100%;
        height: 37px;
        padding: 0 10px;
        border: 1px solid #93c5fd;
        border-radius: 8px;
        outline: 0;
        background: var(--color-background);
        color: var(--color-text-primary);
        box-shadow: 0 0 0 3px #dbeafe;
      }
      .record-info-grid .audit-line {
        display: flex;
        align-items: center;
        gap: 9px;
        min-height: 29px;
      }
      .audit-separator {
        width: 1px;
        height: 18px;
        background: var(--color-border);
      }
      .record-info-grid .audit-user {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        width: fit-content;
        color: var(--color-text-primary);
        outline: none;
      }
      .record-info-grid .audit-avatar {
        width: 25px;
        height: 25px;
        color: #1d4ed8;
        font-size: 9px;
      }
      .audit-user-card,
      .lookup-card {
        position: absolute;
        left: 0;
        bottom: calc(100% + 10px);
        z-index: 40;
        width: 250px;
        padding: 13px;
        border: 1px solid var(--color-border);
        border-radius: 11px;
        background: var(--color-surface);
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transform: translateY(5px);
        transition: 0.15s ease;
      }
      .audit-user-card {
        display: flex;
        align-items: center;
        gap: 11px;
      }
      .audit-user-card > .avatar {
        width: 38px;
        height: 38px;
        color: #1d4ed8;
        font-size: 11px;
      }
      .audit-user-card > span:last-child,
      .lookup-card > span:last-child {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .audit-user-card small,
      .lookup-card em,
      .lookup-card small {
        overflow: hidden;
        color: var(--color-text-secondary);
        font-size: 10px;
        font-style: normal;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .audit-user:hover .audit-user-card,
      .audit-user:focus .audit-user-card,
      .lookup-link:hover .lookup-card,
      .lookup-link:focus .lookup-card {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }
      .lookup-field > .lookup-link {
        position: relative;
        min-height: 30px;
        width: fit-content;
        display: flex;
        align-items: center;
        gap: 7px;
        color: var(--color-primary);
      }
      .lookup-field > .lookup-link:hover {
        text-decoration: underline;
      }
      .lookup-card {
        display: grid;
        grid-template-columns: 38px minmax(0, 1fr);
        align-items: center;
        gap: 10px;
        color: var(--color-text-primary);
        text-decoration: none;
      }
      .lookup-card__avatar {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        background: #dbeafe;
        color: #1d4ed8;
        display: grid;
        place-items: center;
        font-size: 10px;
        font-weight: 800;
      }
      .related-card {
        overflow: hidden;
      }
      .related-row {
        padding: 15px 0;
        border-top: 1px solid var(--color-border);
        display: grid;
        grid-template-columns: 38px 1fr auto;
        align-items: center;
        gap: 11px;
      }
      .related-row--link {
        margin-inline: -10px;
        padding-inline: 10px;
        border-radius: 10px;
        color: var(--color-text-primary);
        text-decoration: none;
      }
      .related-row--link:hover {
        background: color-mix(in srgb, var(--color-primary) 6%, transparent);
      }
      .related-row em i {
        color: var(--color-primary);
        font-style: normal;
      }
      .related-icon {
        width: 38px;
        height: 38px;
        border-radius: 9px;
        background: #dbeafe;
        color: #2563eb;
        display: grid;
        place-items: center;
        font-weight: 800;
      }
      .related-icon--green {
        background: #dcfce7;
        color: #16a34a;
      }
      .related-icon--amber {
        background: #fef3c7;
        color: #d97706;
      }
      .related-icon--violet {
        background: #ede9fe;
        color: #7c3aed;
      }
      .related-row > span:nth-child(2) {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .related-row small {
        font-size: 10px;
      }
      .related-row em {
        color: var(--color-text-secondary);
        font-size: 11px;
        font-style: normal;
      }
      .quick-actions label {
        margin: 14px 0 6px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        color: var(--color-text-secondary);
        font-size: 10px;
      }
      .quick-actions select {
        height: 37px;
        padding: 0 10px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-background);
        color: var(--color-text-primary);
      }
      .quick-actions > button {
        width: 100%;
        height: 39px;
        padding: 0 9px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: var(--color-text-primary);
        font-weight: 600;
        text-align: left;
      }
      .quick-actions > button:hover {
        background: var(--color-muted);
      }
      .quick-actions .danger-action {
        color: var(--color-danger);
      }
      .mini-activity {
        width: 100%;
        padding: 12px 0;
        border: 0;
        border-bottom: 1px solid var(--color-border);
        background: transparent;
        color: var(--color-text-primary);
        display: grid;
        grid-template-columns: 9px 1fr;
        gap: 8px;
        text-align: left;
      }
      .activity-dot {
        width: 8px;
        height: 8px;
        margin-top: 4px;
        border-radius: 50%;
        background: #3b82f6;
      }
      .activity-dot--green {
        background: #10b981;
      }
      .activity-dot--amber {
        background: #f59e0b;
      }
      .activity-dot--violet {
        background: #8b5cf6;
      }
      .mini-activity > span {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .mini-activity small {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .mini-activity time {
        color: var(--color-text-secondary);
        font-size: 9px;
      }
      .overview-pinned-notes {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .overview-pinned-note {
        width: 100%;
        padding: 13px;
        border: 1px solid #fde68a;
        border-radius: 9px;
        background: #fffbeb;
        color: #111827;
        text-align: left;
      }
      .overview-pinned-note:hover {
        border-color: #f59e0b;
      }
      .overview-pinned-note > div {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .overview-pinned-note > div > span:last-child {
        display: flex;
        flex-direction: column;
      }
      .overview-pinned-note p {
        margin-top: 8px;
        color: #111827;
        font-size: 11px;
        line-height: 1.5;
      }
      .overview-pinned-note small {
        color: #64748b;
        font-size: 9px;
      }
      .notes-section {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .notes-heading {
        padding: 12px 0 4px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
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
      .note-attachment-picker {
        padding: 0 24px 12px;
      }
      .note-composer footer {
        min-height: 66px;
        padding: 10px 18px 10px 24px;
        border-top: 1px solid var(--color-border);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
      }
      .note-pin-button {
        min-height: 36px;
        padding: 0 10px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: var(--color-text-secondary);
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
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
      .note-form-actions {
        display: flex;
        gap: 8px;
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
        border-bottom: 1px solid var(--color-border);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
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
        border-radius: 99px;
        background: #fef3c7;
        color: #b45309;
        display: inline-flex;
        align-items: center;
        gap: 5px;
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
        background: var(--color-surface);
        box-shadow: 0 14px 35px rgba(15, 23, 42, 0.18);
      }
      .note-action-menu button {
        width: 100%;
        min-height: 39px;
        padding: 0 10px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: var(--color-text-primary);
        display: flex;
        align-items: center;
        gap: 9px;
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
      :host-context(.app-frame--dark) .note-card--pinned {
        border-color: #fde68a;
        background: #fffbeb;
      }
      .activity-section {
        max-width: 1000px;
        margin: auto;
      }
      .files-section {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .files-heading {
        padding: 12px 0 4px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }
      .files-heading h2 {
        font-size: 21px;
      }
      .files-heading p {
        margin-top: 6px;
        color: var(--color-text-secondary);
      }
      .files-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .file-card {
        position: relative;
        min-height: 78px;
        padding: 14px;
        display: grid;
        grid-template-columns: 40px 1fr 32px;
        align-items: center;
        gap: 11px;
      }
      .file-type {
        width: 40px;
        height: 40px;
        border-radius: 9px;
        background: var(--color-muted);
        color: var(--color-primary);
        display: grid;
        place-items: center;
        font-size: 8px;
        font-weight: 800;
      }
      .file-preview {
        width: 40px;
        height: 40px;
        border-radius: 9px;
        object-fit: cover;
      }
      .file-copy {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .file-copy b {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 11px;
      }
      .file-copy small {
        font-size: 9px;
      }
      .file-action-menu {
        position: absolute;
        right: 12px;
        top: 50px;
        z-index: 20;
        width: 145px;
        padding: 6px;
        border: 1px solid var(--color-border);
        border-radius: 9px;
        background: var(--color-surface);
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.16);
      }
      .file-action-menu a,
      .file-action-menu button {
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
        text-align: left;
      }
      .file-action-menu a:hover,
      .file-action-menu button:hover {
        background: var(--color-muted);
      }
      .file-action-menu .danger {
        color: var(--color-danger);
      }
      .section-empty-state {
        min-height: 285px;
        padding: 40px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
      }
      .files-grid > .section-empty-state {
        grid-column: 1/-1;
      }
      .section-empty-state > span {
        color: #94a3b8;
        font-size: 30px;
      }
      .section-empty-state h3 {
        margin-top: 8px;
      }
      .section-empty-state p {
        max-width: 390px;
        margin-top: 6px;
        color: var(--color-text-secondary);
      }
      .email-section {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .email-heading {
        padding: 12px 0 4px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .email-heading h2 {
        font-size: 21px;
      }
      .email-heading p,
      .email-heading__actions > span {
        margin-top: 5px;
        color: var(--color-text-secondary);
      }
      .email-heading__actions {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .email-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .email-card {
        position: relative;
        min-height: 86px;
        padding: 18px 22px;
        display: grid;
        grid-template-columns: 40px 1fr 32px;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        outline: 0;
      }
      .email-card:hover,
      .email-card:focus {
        border-color: #93c5fd;
      }
      .email-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: #dbeafe;
        color: #2563eb;
        display: grid;
        place-items: center;
      }
      .email-card header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .email-card header span {
        padding: 4px 8px;
        border-radius: 999px;
        background: #dcfce7;
        color: #15803d;
        font-size: 9px;
        font-weight: 700;
      }
      .email-card header span.is-draft {
        background: #fef3c7;
        color: #b45309;
      }
      .email-card p {
        margin: 7px 0;
        color: var(--color-text-secondary);
        white-space: pre-line;
      }
      .email-card small {
        color: var(--color-text-secondary);
      }
      .email-action-menu {
        position: absolute;
        right: 14px;
        top: 52px;
        z-index: 30;
        width: 155px;
        padding: 6px;
        border: 1px solid var(--color-border);
        border-radius: 9px;
        background: var(--color-surface);
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.16);
      }
      .email-action-menu button {
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
      .email-action-menu button:hover {
        background: var(--color-muted);
      }
      @media (max-width: 850px) {
        .files-grid {
          grid-template-columns: 1fr;
        }
      }
      .activity-section > header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 24px;
      }
      .activity-section header p {
        margin-top: 4px;
        color: var(--color-text-secondary);
      }
      .activity-filters {
        padding: 3px;
        border-radius: 9px;
        background: var(--color-muted);
        display: flex;
        align-items: center;
        gap: 3px;
      }
      .activity-filters button,
      .activity-filters select {
        height: 32px;
        padding: 0 11px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: var(--color-text-secondary);
        font-size: 11px;
        font-family: inherit;
      }
      .activity-filters select {
        min-width: 92px;
        outline: none;
        cursor: pointer;
      }
      .activity-filters button.is-active,
      .activity-filters label.has-value,
      .activity-date-filter.has-value {
        background: var(--color-surface);
        color: var(--color-text-primary);
        box-shadow: 0 1px 4px rgba(15, 23, 42, 0.12);
      }
      .activity-date-filter {
        position: relative;
        min-width: 105px;
        height: 32px;
        border-radius: 7px;
      }
      .activity-date-clear {
        width: 28px;
        padding: 0 !important;
        color: var(--color-text-secondary);
        font-size: 16px !important;
      }
      .activity-timeline {
        position: relative;
        padding-left: 58px;
      }
      .activity-timeline:before {
        content: '';
        position: absolute;
        left: 20px;
        top: 0;
        bottom: 0;
        width: 1px;
        background: var(--color-border);
      }
      .activity-timeline > article {
        position: relative;
        margin-bottom: 18px;
      }
      .timeline-marker {
        position: absolute;
        left: -58px;
        top: 18px;
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: #dbeafe;
        color: #2563eb;
        display: grid;
        place-items: center;
        font-weight: 800;
      }
      .timeline-marker--green {
        background: #dcfce7;
        color: #16a34a;
      }
      .timeline-marker--amber {
        background: #fef3c7;
        color: #d97706;
      }
      .timeline-marker--violet {
        background: #ede9fe;
        color: #7c3aed;
      }
      .timeline-card {
        padding: 18px 20px;
      }
      .timeline-card > header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
      }
      .timeline-card h3 {
        font-size: 13px;
      }
      .timeline-card header p {
        margin-top: 4px;
        color: var(--color-text-secondary);
        font-size: 10px;
      }
      .timeline-card > p {
        margin-top: 14px;
        color: var(--color-text-secondary);
        font-size: 12px;
      }
      .activity-meta {
        display: flex;
        gap: 6px;
        margin-top: 10px;
      }
      .activity-meta span {
        padding: 3px 8px;
        border-radius: 999px;
        background: var(--color-muted);
        color: var(--color-text-secondary);
        font-size: 9px;
        font-weight: 750;
      }
      .activity-empty {
        margin-left: -58px;
      }
      .activity-empty button {
        margin-top: 12px;
        padding: 8px 12px;
        border: 0;
        border-radius: 8px;
        background: var(--color-primary);
        color: white;
        font: inherit;
        font-size: 11px;
        font-weight: 700;
      }
      .timeline-card time {
        color: var(--color-text-secondary);
        font-size: 10px;
      }
      @media (max-width: 900px) {
        .record-info-grid {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 680px) {
        .record-hero {
          align-items: flex-start;
          flex-direction: column;
        }
        .record-hero__identity {
          align-items: flex-start;
        }
        .operational-detail-stats {
          grid-template-columns: 1fr;
        }
        .note-composer > footer,
        .activity-section > header {
          align-items: stretch;
          flex-direction: column;
        }
        .activity-filters {
          overflow-x: auto;
          width: 100%;
        }
        .activity-timeline {
          padding-left: 48px;
        }
        .timeline-marker {
          left: -48px;
          width: 34px;
          height: 34px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationalRecordDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly crmData = inject(CRM_DATA);
  readonly store = inject(OperationalStore);
  readonly i18n = inject(LanguageService);
  readonly moduleKey = this.route.snapshot.data['moduleKey'] as OperationalModuleKey;
  readonly definition = OPERATIONAL_MODULES[this.moduleKey];
  readonly leadGpsField: RecordFieldConfig = {
    key: 'coordinates',
    label: 'Ubicación GPS',
    kind: 'gps',
    editable: true,
  };
  readonly recordId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly record = computed(() => this.store.find(this.moduleKey, this.recordId));
  readonly tabs: ReadonlyArray<DetailTab> =
    this.moduleKey === 'leads'
      ? ['Resumen', 'Correos', 'Eventos', 'Notas', 'Archivos', 'Actividad']
      : ['Resumen', 'Notas', 'Archivos', 'Actividad'];
  readonly activeTab = signal<DetailTab>('Resumen');
  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      if (tab && this.tabs.includes(tab as DetailTab)) this.activeTab.set(tab as DetailTab);
    });
  }
  recordTabs(id: string): ReadonlyArray<RecordTabItem> {
    return this.tabs.map((label) => ({
      label,
      count:
        label === 'Notas'
          ? this.notes(id).length
          : label === 'Actividad'
            ? this.activity(id).length
            : label === 'Archivos'
              ? this.recordFiles(id).length
              : label === 'Correos'
                ? this.emails(id).length
                : undefined,
    }));
  }
  setActiveTab(value: string): void {
    if (this.tabs.includes(value as DetailTab)) this.activeTab.set(value as DetailTab);
  }
  readonly editingStatus = signal(false);
  readonly editingPicklistKey = signal<string | null>(null);
  readonly emailComposerOpen = signal(false);
  readonly emailPreview = signal<OperationalEmail | null>(null);
  readonly emailComposeSeed = signal<LeadEmailSeed>({});
  readonly emailComposeKey = signal(0);
  readonly emailMenuId = signal<string | null>(null);
  readonly editingEmailId = signal<string | null>(null);
  readonly noteComposerOpen = signal(false);
  readonly noteDraft = signal('');
  readonly noteMenuId = signal<string | null>(null);
  readonly editingNoteId = signal<string | null>(null);
  readonly pinNewNote = signal(false);
  readonly selectedNoteId = signal<string | null>(null);
  readonly attachments = signal<ReadonlyArray<CrmAttachment>>([]);
  readonly attachmentReset = signal(0);
  readonly uploadModalOpen = signal(false);
  readonly fileMenuId = signal<string | null>(null);
  readonly activityModule = signal('');
  readonly activityType = signal<'' | 'CREATE' | 'EDIT' | 'DELETE'>('');
  readonly activityDate = signal('');
  readonly activityModuleOptions = [
    'Registro',
    'Leads',
    'Clientes',
    'Tickets',
    'Servicios',
    'Equipamiento',
    'Asignaciones',
    'Contratos',
    'Facturas',
    'Pagos',
    'Gastos',
    'Notas',
    'Archivos',
    'Correos',
    'Calendario',
    'Configuración de organización',
    'Usuarios',
    'Roles y permisos',
    'SMTP',
    'SMS',
    'Portal',
    'Plantillas',
    'Módulos',
    'Automatizaciones',
    'Flujos de trabajo',
    'Programaciones',
    'Registro de actividad',
    'Auditoría',
    'Restricciones IP',
    'Inicio de sesión 2FA',
    'Webhooks',
    'APIs',
    'Integraciones',
  ];
  readonly summaryColumns = computed(() =>
    this.moduleKey === 'leads'
      ? [
          { key: 'prospectType', label: 'Tipo de prospecto', type: 'text' as const },
          { key: 'source', label: 'Origen', type: 'text' as const },
          { key: 'status', label: 'Estado', type: 'status' as const },
          { key: 'phone', label: 'WhatsApp', type: 'text' as const },
        ]
      : this.definition.columns.slice(0, 4),
  );
  readonly statusOptions = computed(() =>
    this.definition.fields.find((field) => field.key === 'status')?.options?.length
      ? [...(this.definition.fields.find((field) => field.key === 'status')?.options ?? [])]
      : Array.from(
          new Set(
            this.store
              .recordsFor(this.moduleKey)
              .map((item) => String(item['status'] ?? ''))
              .filter(Boolean),
          ),
        ),
  );
  primaryValue(record: OperationalRecord): string {
    return String(record[this.definition.columns[0].key] ?? record.id);
  }
  initials(value: string): string {
    return value
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }
  asString(value: string | number | boolean): string {
    return String(value);
  }
  asNumber(value: string | number | boolean): number {
    return Number(value) || 0;
  }
  editableInputType(key: string): 'text' | 'email' | 'tel' | 'date' {
    if (key === 'email') return 'email';
    if (key === 'phone' || key === 'cellphone') return 'tel';
    return 'text';
  }
  fieldDisplayValue(field: { type: string }, value: string | number | boolean): string {
    if (field.type !== 'money') return '';
    return new Intl.NumberFormat(this.i18n.locale(), {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 2,
    }).format(this.asNumber(value));
  }
  fieldActionHref(key: string, value: string | number | boolean): string {
    if (!value) return '';
    if (key === 'email') return 'mailto:' + String(value);
    if (key === 'phone' || key === 'cellphone')
      return 'tel:' + String(value).replace(/[^\d+]/g, '');
    return '';
  }
  whatsappUrl(value: string | number | boolean): string {
    return `https://wa.me/${String(value ?? '').replace(/\D/g, '')}`;
  }
  relatedRoute(key: string, value: string | number | boolean): ReadonlyArray<string> | null {
    const text = String(value ?? '');
    if (!text) return null;
    if (key === 'convertedToClientId') return ['/customers', text];
    if (key === 'invoice') return ['/invoices', text];
    if (key === 'client') {
      const customerIds: Readonly<Record<string, string>> = {
        'José Luis Hernández': 'SL-1044',
        'Consultorio Dental Sonríe': 'SL-1047',
      };
      return customerIds[text] ? ['/customers', customerIds[text]] : null;
    }
    if (key === 'equipment') {
      const equipment = this.store
        .recordsFor('equipment')
        .find((record) => text.includes(String(record['name'])));
      return equipment ? ['/equipment', equipment.id] : null;
    }
    if (key === 'service') {
      const service = this.store
        .recordsFor('services')
        .find((record) => text.includes(String(record['name'])));
      return service ? ['/services', service.id] : null;
    }
    return null;
  }
  lookupPreview(key: string, value: string | number | boolean): LookupPreview | null {
    const route = this.relatedRoute(key, value);
    if (!route) return null;
    const text = String(value);
    const relatedModule = route[0].replace('/', '') as OperationalModuleKey;
    const related = OPERATIONAL_MODULES[relatedModule]
      ? this.store.find(relatedModule, route[1])
      : undefined;
    const title = related ? this.primaryValueForModule(relatedModule, related) : text;
    const typeLabels: Readonly<Record<string, string>> = {
      customers: 'Cliente relacionado',
      invoices: 'Factura relacionada',
      equipment: 'Equipo relacionado',
      services: 'Servicio relacionado',
    };
    return {
      type: typeLabels[relatedModule] ?? 'Registro relacionado',
      title,
      detail: related ? `${related.id} · Clic para abrir` : `${route[1]} · Clic para abrir`,
      initials: this.initials(title),
    };
  }
  private primaryValueForModule(module: OperationalModuleKey, record: OperationalRecord): string {
    return String(record[OPERATIONAL_MODULES[module].columns[0].key] ?? record.id);
  }
  createdAt(record: OperationalRecord): string {
    return String(record['createdAt'] ?? '2026-07-12T09:30:00-06:00');
  }
  updatedAt(record: OperationalRecord): string {
    return String(
      record['updatedAt'] ?? record['date'] ?? record['assignedAt'] ?? '2026-07-18T12:00:00-06:00',
    );
  }
  formattedUpdatedAt(record: OperationalRecord): string {
    return new Intl.DateTimeFormat(this.i18n.locale(), {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(this.updatedAt(record)));
  }
  statusLabel(value: string | number | boolean): string {
    return String(value)
      .replaceAll('_', ' ')
      .toLocaleLowerCase()
      .replace(/^./, (letter) => letter.toUpperCase());
  }
  statusTone(value: string | number | boolean): string {
    const status = String(value);
    if (['ACTIVE', 'AVAILABLE', 'PAID', 'QUALIFIED', 'COMPLETED'].includes(status)) return 'green';
    if (['OVERDUE', 'DAMAGED', 'CANCELLED', 'LOST', 'EXPIRED'].includes(status)) return 'red';
    if (['PENDING', 'PENDING_SIGNATURE', 'IN_REPAIR', 'CONTACTED', 'RETURNED'].includes(status))
      return 'amber';
    if (['NEW', 'ASSIGNED', 'DRAFT'].includes(status)) return 'blue';
    return 'violet';
  }
  statHelper(key: string): string {
    return (
      (
        {
          status: 'Estado actual',
          price: 'Precio vigente',
          total: 'Importe registrado',
          amount: 'Importe registrado',
          client: 'Cuenta relacionada',
          updatedAt: 'Último movimiento',
          assignedAt: 'Fecha de entrega',
        } as Record<string, string>
      )[key] ?? 'Información principal'
    );
  }
  displayFields(record: OperationalRecord) {
    return Object.keys(record)
      .filter(
        (key) =>
          key !== 'id' &&
          !(this.moduleKey === 'leads' && (key === 'latitude' || key === 'longitude')),
      )
      .map((key) => {
        const column = this.definition.columns.find((item) => item.key === key);
        const configured = this.definition.fields.find((item) => item.key === key);
        return {
          key,
          label: column?.label ?? configured?.label ?? this.statusLabel(key),
          type: column?.type ?? (configured?.type === 'date' ? 'date' : 'text'),
          editable: Boolean(configured),
          inputType:
            configured?.type === 'number'
              ? 'number'
              : configured?.type === 'date'
                ? 'date'
                : configured?.type === 'select'
                  ? 'select'
                  : 'text',
          options: configured?.options ?? [],
        };
      });
  }
  operationalFieldConfig(
    field: ReturnType<OperationalRecordDetailPage['displayFields']>[number],
    record: OperationalRecord,
  ): RecordFieldConfig {
    const value = record[field.key];
    const route = this.relatedRoute(field.key, value) ?? undefined;
    const preview = route ? (this.lookupPreview(field.key, value) ?? undefined) : undefined;
    const kind: RecordFieldConfig['kind'] = route
      ? 'lookup'
      : field.type === 'status'
        ? 'status'
        : field.inputType === 'select'
          ? 'select'
          : field.type === 'date'
            ? 'date'
            : field.type === 'money'
              ? 'money'
              : this.editableInputType(field.key) === 'email'
                ? 'email'
                : this.editableInputType(field.key) === 'tel'
                  ? 'phone'
                  : 'text';
    return {
      key: field.key,
      label: field.label,
      kind,
      editable: field.editable && !route,
      options: field.type === 'status' ? this.statusOptions() : field.options,
      href: this.fieldActionHref(field.key, value),
      displayValue: this.fieldDisplayValue(field, value),
      route,
      preview,
      statusLabel: this.statusLabel(value),
      statusTone: this.statusTone(value),
    };
  }
  operationalAuditField(key: string, label: string): RecordFieldConfig {
    return {
      key,
      label,
      kind: 'audit',
      auditUser: {
        id: 'usr-andrea-torres',
        fullName: 'Andrea Torres',
        email: 'andrea.torres@speedlink.mx',
        initials: 'AT',
      },
    };
  }
  saveOperationalField(record: OperationalRecord, key: string, value: string): void {
    if (this.moduleKey === 'leads' && key === 'status' && value === 'CONVERTED') {
      this.convertLead(record);
      return;
    }
    this.updateField(record.id, key, value);
  }
  updateField(id: string, key: string, value: string): void {
    this.store.update(this.moduleKey, id, { [key]: value });
  }
  saveLeadStatus(id: string, key: string, value: string): void {
    const lead = this.store.find('leads', id);
    if (value === 'CONVERTED' && lead) this.convertLead(lead);
    else this.updateField(id, key, value);
    this.editingStatus.set(false);
  }
  savePicklist(id: string, key: string, value: string): void {
    this.updateField(id, key, value);
    this.editingPicklistKey.set(null);
  }
  leadCoordinates(record: OperationalRecord): string {
    return `${record['latitude'] ?? 19.432608}, ${record['longitude'] ?? -99.133209}`;
  }
  updateLeadCoordinates(id: string, coordinates: string): void {
    const [latitude, longitude] = coordinates.split(',').map((value) => Number(value.trim()));
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    this.store.update('leads', id, { latitude, longitude });
  }
  openEmailComposer(): void {
    this.activeTab.set('Correos');
    const lead = this.record();
    this.emailComposeSeed.set({
      to: String(lead?.['email'] ?? ''),
      from: 'andrea.torres@speedlink.mx',
      title: 'Redactar mensaje',
    });
    this.emailComposeKey.update((value) => value + 1);
    this.editingEmailId.set(null);
    this.emailPreview.set(null);
    this.emailComposerOpen.set(true);
  }
  emails(id: string) {
    return this.store.emailsFor(id);
  }
  saveLeadEmail(id: string, value: LeadEmailFormValue, draft: boolean): void {
    this.store.saveEmail(id, value, draft, this.editingEmailId() ?? undefined);
    this.closeEmailComposer();
  }
  closeEmailComposer(): void {
    this.emailComposerOpen.set(false);
    this.editingEmailId.set(null);
  }
  openEmail(email: OperationalEmail): void {
    if (email.status === 'DRAFT') this.editDraft(email);
    else this.openEmailPreview(email);
  }
  openEmailPreview(email: OperationalEmail): void {
    this.emailMenuId.set(null);
    this.emailPreview.set(email);
  }
  toggleEmailMenu(event: MouseEvent, emailId: string): void {
    event.stopPropagation();
    this.emailMenuId.set(this.emailMenuId() === emailId ? null : emailId);
  }
  composeFromEmail(email: OperationalEmail, action: 'resend' | 'forward'): void {
    const forwarded = action === 'forward';
    this.emailComposeSeed.set({
      title: forwarded ? 'Reenviar correo' : 'Reenviar mensaje',
      to: forwarded ? '' : email.to,
      cc: forwarded ? '' : email.cc,
      from: email.from,
      subject: forwarded
        ? email.subject.startsWith('Fwd:')
          ? email.subject
          : `Fwd: ${email.subject}`
        : email.subject,
      body: forwarded
        ? `\n\n---------- Mensaje reenviado ----------\nDe: ${email.from}\nPara: ${email.to}\nAsunto: ${email.subject}\n\n${email.body}`
        : email.body,
      attachments: email.attachments,
    });
    this.emailComposeKey.update((value) => value + 1);
    this.editingEmailId.set(null);
    this.emailMenuId.set(null);
    this.emailPreview.set(null);
    this.emailComposerOpen.set(true);
  }
  editDraft(email: OperationalEmail): void {
    this.emailComposeSeed.set({
      title: 'Editar borrador',
      to: email.to,
      cc: email.cc,
      from: email.from,
      subject: email.subject,
      body: email.body,
      attachments: email.attachments,
    });
    this.editingEmailId.set(email.id);
    this.emailComposeKey.update((value) => value + 1);
    this.emailMenuId.set(null);
    this.emailPreview.set(null);
    this.emailComposerOpen.set(true);
  }
  openNoteComposer(): void {
    this.activeTab.set('Notas');
    this.noteComposerOpen.set(true);
  }
  isConvertedLead(record: OperationalRecord): boolean {
    return this.moduleKey === 'leads' && record['status'] === 'CONVERTED';
  }
  convertLead(lead: OperationalRecord): void {
    if (this.moduleKey !== 'leads' || this.isConvertedLead(lead)) return;
    const convertedAt = new Date().toISOString();
    const customerId =
      'SL-' +
      (1100 +
        this.store.recordsFor('leads').filter((item) => item['status'] === 'CONVERTED').length);
    const name = String(lead['name'] ?? 'Cliente convertido');
    const customer: Customer = {
      id: customerId,
      organizationId: 'speedlink-mx-01',
      createdAt: convertedAt,
      createdBy: { fullName: 'Andrea Torres', email: 'andrea.torres@speedlink.mx', initials: 'AT' },
      updatedAt: convertedAt,
      updatedBy: { fullName: 'Andrea Torres', email: 'andrea.torres@speedlink.mx', initials: 'AT' },
      name,
      initials: this.initials(name),
      email: String(lead['email'] ?? ''),
      phone: String(lead['phone'] ?? lead['cellphone'] ?? ''),
      address: String(lead['address'] ?? 'Dirección pendiente'),
      community: 'Comunidad pendiente',
      status: 'pending',
      plan: 'Por asignar',
      speed: 'Pendiente',
      monthlyFee: 0,
      billingDay: 1,
      currentBalance: 0,
      technician: 'Sin asignar',
      lastActivity: 'Convertido ahora',
      installDate: convertedAt,
      gpsLocation:
        String(lead['latitude'] ?? '19.4326') + ', ' + String(lead['longitude'] ?? '-99.1332'),
      ipAddress: 'Pendiente',
      equipment: [],
      invoices: [],
      payments: [],
      tickets: [],
      notes: [],
      timeline: [
        {
          id: 'conversion-' + Date.now(),
          title: 'Cliente convertido desde lead',
          detail: 'Origen: ' + String(lead['source'] ?? 'No especificado') + ' · Lead ' + lead.id,
          date: convertedAt,
          type: 'service',
          author: 'Andrea Torres',
        },
      ],
    };
    this.crmData.createCustomer(customer);
    this.store.update('leads', lead.id, {
      status: 'CONVERTED',
      convertedAt,
      convertedToClientId: customerId,
    });
  }
  notes(id: string) {
    return this.store.notesFor(id);
  }
  activity(id: string) {
    return this.store.activityFor(id);
  }
  filteredActivity(id: string) {
    const module = this.activityModule();
    const type = this.activityType();
    const date = this.activityDate();
    return this.activity(id).filter((event) => {
      const eventDate = this.localDateKey(event.createdAt);
      return (
        (!module || event.module === module) &&
        (!type || event.actionType === type) &&
        (!date || eventDate === date)
      );
    });
  }
  setActivityModule(event: Event): void {
    this.activityModule.set((event.target as HTMLSelectElement).value);
  }
  setActivityType(event: Event): void {
    this.activityType.set(
      (event.target as HTMLSelectElement).value as '' | 'CREATE' | 'EDIT' | 'DELETE',
    );
  }
  clearActivityFilters(): void {
    this.activityModule.set('');
    this.activityType.set('');
    this.activityDate.set('');
  }
  actionTypeLabel(type: 'CREATE' | 'EDIT' | 'DELETE'): string {
    return { CREATE: 'Creación', EDIT: 'Edición', DELETE: 'Eliminación' }[type];
  }
  private localDateKey(value: string): string {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  saveNote(id: string): void {
    const message = this.noteDraft().trim();
    if (!message) return;
    const editingId = this.editingNoteId();
    const pinned = this.pinNewNote() && this.canPinNote(id);
    if (editingId) this.store.updateNote(id, editingId, message, pinned, this.attachments());
    else this.store.addNote(id, message, this.attachments(), pinned);
    this.cancelNoteEdit();
  }
  deleteNote(id: string, noteId: string): void {
    this.store.deleteNote(id, noteId);
    if (this.editingNoteId() === noteId) this.cancelNoteEdit();
    this.noteMenuId.set(null);
  }
  toggleNoteMenu(event: MouseEvent, noteId: string): void {
    event.stopPropagation();
    this.noteMenuId.set(this.noteMenuId() === noteId ? null : noteId);
  }
  @HostListener('document:click') closeNoteMenu(): void {
    this.noteMenuId.set(null);
    this.fileMenuId.set(null);
    this.emailMenuId.set(null);
  }
  recordFiles(recordId: string): ReadonlyArray<CrmAttachment> {
    return this.store.attachmentsFor(recordId);
  }
  handleRecordFilesUploaded(recordId: string, files: ReadonlyArray<CrmAttachment>): void {
    this.store.addAttachments(recordId, files);
    this.uploadModalOpen.set(false);
  }
  toggleFileMenu(event: MouseEvent, fileId: string): void {
    event.stopPropagation();
    this.fileMenuId.set(this.fileMenuId() === fileId ? null : fileId);
  }
  deleteRecordFile(recordId: string, fileId: string): void {
    this.store.deleteAttachment(recordId, fileId);
    this.fileMenuId.set(null);
  }
  startEditingNote(noteId: string, message: string, pinned: boolean): void {
    this.noteComposerOpen.set(true);
    this.editingNoteId.set(noteId);
    this.noteDraft.set(message);
    this.pinNewNote.set(pinned);
    this.noteMenuId.set(null);
  }
  cancelNoteEdit(): void {
    this.noteDraft.set('');
    this.pinNewNote.set(false);
    this.editingNoteId.set(null);
    this.attachments.set([]);
    this.attachmentReset.update((value) => value + 1);
    this.noteComposerOpen.set(false);
  }
  pinnedNotes(recordId: string) {
    return this.notes(recordId)
      .filter((note) => note.pinned)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 5);
  }
  sortedNotes(recordId: string) {
    return [...this.notes(recordId)].sort(
      (left, right) =>
        Number(right.pinned) - Number(left.pinned) || right.createdAt.localeCompare(left.createdAt),
    );
  }
  canPinNote(recordId: string): boolean {
    const editingId = this.editingNoteId();
    return (
      this.pinnedNotes(recordId).length < 5 ||
      this.notes(recordId).some((note) => note.id === editingId && note.pinned)
    );
  }
  canTogglePinned(recordId: string, pinned: boolean): boolean {
    return pinned || this.pinnedNotes(recordId).length < 5;
  }
  toggleDraftPin(recordId: string): void {
    if (this.pinNewNote()) this.pinNewNote.set(false);
    else if (this.canPinNote(recordId)) this.pinNewNote.set(true);
  }
  togglePinnedNote(recordId: string, noteId: string): void {
    const note = this.notes(recordId).find((item) => item.id === noteId);
    if (!note || !this.canTogglePinned(recordId, note.pinned)) return;
    this.store.togglePinnedNote(recordId, noteId);
    if (this.editingNoteId() === noteId) this.pinNewNote.set(!note.pinned);
    this.noteMenuId.set(null);
  }
  openPinnedNote(noteId: string): void {
    this.activeTab.set('Notas');
    this.selectedNoteId.set(noteId);
    window.setTimeout(() =>
      document
        .getElementById(`operational-note-${noteId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    );
    window.setTimeout(() => this.selectedNoteId.set(null), 2200);
  }
  formatSize(size: number): string {
    return size < 1024 * 1024
      ? `${Math.max(1, Math.round(size / 1024))} KB`
      : `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
  fileExtension(fileName: string): string {
    return fileName.split('.').pop()?.slice(0, 4).toUpperCase() || 'FILE';
  }
  relatedTitle(): string {
    return (
      {
        leads: 'Tareas de seguimiento',
        services: 'Contratos con este servicio',
        equipment: 'Asignaciones del equipo',
        assignments: 'Relaciones de la asignación',
        contracts: 'Servicios contratados',
        invoices: 'Conceptos y pagos',
        payments: 'Conciliación del pago',
        expenses: 'Comprobante y clasificación',
      } as Record<OperationalModuleKey, string>
    )[this.moduleKey];
  }
  relatedSubtitle(): string {
    return (
      {
        leads: 'Acciones pendientes y próximos compromisos',
        services: 'Clientes que tienen el plan activo',
        equipment: 'Historial de entrega y ubicación',
        assignments: 'Cliente y dispositivo vinculados',
        contracts: 'Partidas incluidas en el contrato',
        invoices: 'Detalle financiero de la factura',
        payments: 'Factura y referencia relacionadas',
        expenses: 'Evidencia y datos del egreso',
      } as Record<OperationalModuleKey, string>
    )[this.moduleKey];
  }
  relatedItems(record: OperationalRecord): ReadonlyArray<RelatedItem> {
    const clientId = String(
      record['clientId'] ??
        (
          {
            'José Luis Hernández': 'SL-1040',
            'Morgan Díaz': 'SL-1041',
            'Consultorio Dental Sonríe': 'SL-1042',
            'Distribuidora Nova': 'SL-1043',
          } as Record<string, string>
        )[String(record['client'] ?? '')] ??
        '',
    );
    const equipmentId = String(
      record['equipmentId'] ??
        (
          {
            'Antena CPE': 'EQ-4092',
            'Router Wi-Fi': 'EQ-4091',
            'Access Point': 'EQ-4088',
          } as Record<string, string>
        )[String(record['equipment'] ?? '').split(' · ')[0]] ??
        '',
    );
    const map: Record<OperationalModuleKey, ReadonlyArray<RelatedItem>> = {
      leads: [
        {
          icon: '✓',
          title: 'Enviar propuesta comercial',
          detail: 'Asignada a Andrea Torres · Prioridad alta',
          meta: 'Hoy, 16:00',
          tone: 'violet',
        },
        {
          icon: '→',
          title: 'Validar cobertura en la dirección',
          detail: 'Pendiente · Requiere confirmación técnica',
          meta: '22 jul',
          tone: 'blue',
        },
      ],
      services: [
        {
          icon: '▤',
          title: 'SL-CTR-0817 · José Luis Hernández',
          detail: `1 × ${this.primaryValue(record)}`,
          meta: 'Activo',
          tone: 'green',
          route: ['/contracts', 'CTR-2026-817'],
        },
        {
          icon: '▤',
          title: 'SL-CTR-0812 · Morgan Díaz',
          detail: 'Renovación anual automática',
          meta: 'Activo',
          tone: 'green',
          route: ['/contracts', 'CTR-2026-816'],
        },
      ],
      equipment: [
        {
          icon: '⌂',
          title: 'Asignación actual',
          detail: 'José Luis Hernández · Sitio principal',
          meta: 'Desde 18 jul',
          tone: 'green',
          route: ['/assignments', record.id === 'EQ-4091' ? 'ASG-7830' : 'ASG-7831'],
        },
        {
          icon: '⌁',
          title: 'Último diagnóstico',
          detail: 'Señal -58 dBm · latencia 18 ms',
          meta: 'En línea',
          tone: 'violet',
        },
      ],
      assignments: [
        {
          icon: '♙',
          title: String(record['client'] ?? 'Cliente'),
          detail: 'Cuenta relacionada con la instalación',
          meta: 'Ver cliente',
          tone: 'blue',
          route: clientId ? ['/customers', clientId] : undefined,
        },
        {
          icon: '▣',
          title: String(record['equipment'] ?? 'Equipo'),
          detail: String(record['serial'] ?? 'Inventario asociado'),
          meta: 'Asignado',
          tone: 'violet',
          route: equipmentId ? ['/equipment', equipmentId] : undefined,
        },
      ],
      contracts: this.contractRelatedItems(record),
      invoices: [
        {
          icon: '♙',
          title: String(record['client'] ?? 'Cliente relacionado'),
          detail: 'Titular de la factura',
          meta: 'Ver cliente',
          tone: 'violet',
          route: clientId ? ['/customers', clientId] : undefined,
        },
        {
          icon: '▤',
          title: 'Servicio mensual',
          detail: 'Plan de internet correspondiente al periodo',
          meta: String(record['total'] ?? '$0'),
          tone: 'blue',
        },
        {
          icon: '✓',
          title: 'Historial de pago',
          detail: 'Conciliación y referencia bancaria',
          meta: String(record['status'] ?? 'Pendiente'),
          tone: 'green',
          route: ['/payments', record.id === 'INV-4484' ? 'PAY-74020' : 'PAY-74021'],
        },
      ],
      payments: [
        {
          icon: '♙',
          title: String(record['client'] ?? 'Cliente relacionado'),
          detail: 'Cliente que realizó el pago',
          meta: 'Ver cliente',
          tone: 'violet',
          route: clientId ? ['/customers', clientId] : undefined,
        },
        {
          icon: '▤',
          title: String(record['invoice'] ?? 'Sin factura'),
          detail: 'Factura relacionada con el movimiento',
          meta: 'Ver factura',
          tone: 'blue',
          route: record['invoice'] ? ['/invoices', String(record['invoice'])] : undefined,
        },
        {
          icon: '✓',
          title: String(record['reference'] ?? 'Sin referencia'),
          detail: String(record['method'] ?? 'Método no indicado'),
          meta: 'Conciliado',
          tone: 'green',
        },
      ],
      expenses: [
        {
          icon: '▤',
          title: String(record['receiptUrl'] ?? 'Sin comprobante'),
          detail: 'Documento asociado al gasto',
          meta: 'Descargar',
          tone: 'blue',
        },
        {
          icon: '◎',
          title: String(record['category'] ?? 'OTHER'),
          detail: String(record['vendor'] ?? 'Proveedor no indicado'),
          meta: 'Clasificación',
          tone: 'amber',
        },
      ],
    };
    return map[this.moduleKey];
  }
  activityIcon(tone: string): string {
    return tone === 'green' ? '✓' : tone === 'amber' ? '!' : tone === 'violet' ? '▤' : '✎';
  }
  private contractRelatedItems(record: OperationalRecord): ReadonlyArray<RelatedItem> {
    let items: ReadonlyArray<{ serviceId: string; quantity: number; unitPrice: number }> = [];
    try {
      items = JSON.parse(String(record['items'] ?? '[]')) as typeof items;
    } catch {
      return [];
    }
    return items.map((item) => {
      const service = this.store.find('services', item.serviceId);
      const subtotal = (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0);
      return {
        icon: '⌁',
        title: String(service?.['name'] ?? item.serviceId),
        detail: `${String(service?.['type'] ?? 'Servicio')} · Cantidad ${item.quantity}`,
        meta: `${new Intl.NumberFormat(this.i18n.locale(), { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(subtotal)}/mes`,
        tone: String(service?.['type'] ?? '') === 'Internet' ? 'blue' : 'violet',
        route: ['/services', item.serviceId],
      };
    });
  }
  archive(id: string): void {
    this.store.archive(this.moduleKey, id);
    void this.router.navigate(['/', this.moduleKey]);
  }
}
