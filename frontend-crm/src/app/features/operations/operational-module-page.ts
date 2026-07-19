import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CRM_DATA } from '../../core/data-access/crm-data';
import { LanguageService } from '../../core/i18n/language.service';
import { Customer } from '../../core/models/customer';
import {
  RecordList,
  RecordListAction,
  RecordListField,
  RecordListRow,
  RecordListWidget,
} from '../../shared/record-list';
import { InlineEditableDateField } from '../../shared/inline-editable-date-field';
import { PicklistOption, StyledPicklist } from '../../shared/styled-picklist';
import {
  ModuleField,
  OPERATIONAL_MODULES,
  OperationalModuleKey,
  OperationalRecord,
} from './operational-modules.data';
import { OperationalStore } from './operational-store';

interface ContractItemDraft {
  id: string;
  serviceId: string;
  quantity: number;
  unitPrice: number;
}

@Component({
  selector: 'app-operational-module-page',
  imports: [
    CurrencyPipe,
    DatePipe,
    InlineEditableDateField,
    RecordList,
    RouterLink,
    StyledPicklist,
  ],
  template: `
    <app-record-list
      [title]="definition.title"
      [description]="definition.description"
      [newLabel]="'Nuevo ' + definition.singular"
      [baseRoute]="'/' + moduleKey"
      [accent]="definition.accent"
      [records]="records()"
      [columns]="definition.columns"
      [fields]="listFields()"
      [widgets]="listWidgets()"
      [rowActions]="listRowActions()"
      [bulkActions]="listBulkActions()"
      (newRequested)="openCreate()"
      (rowAction)="handleListRowAction($event.actionId, $event.record)"
      (bulkAction)="
        handleListBulkAction($event.actionId, $event.records, $event.field, $event.value)
      "
      (recordsImported)="importRecords($event)"
    />
    <header class="page-header">
      <div>
        <div class="breadcrumbs">
          <span>CRM</span><b>›</b><span>{{ definition.title }}</span>
        </div>
        <h1>{{ definition.title }}</h1>
        <p>{{ definition.description }}</p>
      </div>
      <div class="page-header__actions">
        <button class="button" type="button" (click)="exportCsv()">⇩ Exportar</button>
        <button class="button button--primary" type="button" (click)="openCreate()">
          ＋ Nuevo {{ definition.singular }}
        </button>
      </div>
    </header>

    <section class="module-stats">
      @for (metric of definition.metrics; track metric.label) {
        <article class="card">
          <span class="stat-icon stat-icon--{{ metric.tone }}">{{ metricIcon(metric.tone) }}</span>
          <div>
            <small>{{ metric.label }}</small
            ><b>{{ metric.value }}</b
            ><em>{{ metric.detail }}</em>
          </div>
        </article>
      }
    </section>

    <section class="card customer-table-card">
      <div class="filterbar">
        <label class="table-search"
          ><span>⌕</span
          ><input
            #search
            type="search"
            [placeholder]="'Buscar en ' + definition.title.toLowerCase()"
            (input)="query.set(search.value)"
        /></label>
        @if (statusOptions().length) {
          <select #status aria-label="Filtrar por estado" (change)="statusFilter.set(status.value)">
            <option value="all">Todos los estados</option>
            @for (option of statusOptions(); track option) {
              <option [value]="option">{{ statusLabel(option) }}</option>
            }
          </select>
        }
        <button
          class="button"
          type="button"
          [class.is-active]="dense()"
          (click)="dense.set(!dense())"
        >
          ☷ Vista compacta
        </button>
        <span class="filterbar__count">{{ filtered().length }} resultados</span>
      </div>
      @if (moduleKey === 'leads' && selectedCount()) {
        <div class="bulk-toolbar">
          <span
            ><b>{{ selectedCount() }}</b> seleccionados</span
          >
          <button type="button" (click)="openBulkEdit()">✎ Editar</button>
          <button type="button" (click)="exportSelected()">⇩ Exportar</button>
          <button type="button" (click)="convertSelected()">✓ Convertir</button>
          <button class="danger" type="button" (click)="deleteSelected()">⊘ Eliminar</button>
          <button
            class="bulk-close"
            type="button"
            aria-label="Limpiar selección"
            (click)="clearSelection()"
          >
            ×
          </button>
        </div>
      }
      <div class="table-scroll">
        <table [class.is-dense]="dense()">
          <thead>
            <tr>
              @if (moduleKey === 'leads') {
                <th class="selection-cell">
                  <input
                    type="checkbox"
                    [checked]="allPageSelected()"
                    (change)="togglePageSelection()"
                    aria-label="Seleccionar página"
                  />
                </th>
              }
              @for (column of definition.columns; track column.key) {
                <th>{{ column.label }}</th>
              }
              <th aria-label="Acciones"></th>
            </tr>
          </thead>
          <tbody>
            @for (record of paginated(); track record.id) {
              <tr>
                @if (moduleKey === 'leads') {
                  <td class="selection-cell">
                    <input
                      type="checkbox"
                      [checked]="isSelected(record.id)"
                      (click)="$event.stopPropagation()"
                      (change)="toggleSelection(record.id)"
                      [attr.aria-label]="'Seleccionar ' + record.id"
                    />
                  </td>
                }
                @for (column of definition.columns; track column.key) {
                  <td>
                    @switch (column.type) {
                      @case ('identity') {
                        <a class="record-identity" [routerLink]="['/', moduleKey, record.id]"
                          ><span
                            class="record-avatar"
                            [style.background]="definition.accent + '18'"
                            [style.color]="definition.accent"
                            >{{ initials(record[column.key]) }}</span
                          ><span
                            ><b>{{ record[column.key] }}</b
                            ><small>{{ record.id }}</small></span
                          ></a
                        >
                      }
                      @case ('status') {
                        <span
                          class="record-status record-status--{{ statusTone(record[column.key]) }}"
                          ><i></i>{{ statusLabel(record[column.key]) }}</span
                        >
                      }
                      @case ('money') {
                        <b>{{
                          asNumber(record[column.key])
                            | currency: 'MXN' : 'symbol-narrow' : '1.0-2' : i18n.locale()
                        }}</b>
                      }
                      @case ('date') {
                        <time>{{
                          asString(record[column.key]) | date: 'dd MMM y' : '' : i18n.locale()
                        }}</time>
                      }
                      @default {
                        <span class="cell-value">{{ record[column.key] || '—' }}</span>
                      }
                    }
                  </td>
                }
                <td class="row-menu-cell">
                  <button
                    class="row-action"
                    type="button"
                    aria-label="Opciones"
                    (click)="toggleRowMenu($event, record.id)"
                  >
                    •••
                  </button>
                  @if (rowMenuId() === record.id) {
                    <div class="row-action-menu" (click)="$event.stopPropagation()">
                      <a [routerLink]="['/', moduleKey, record.id]"><span>↗</span>Ver</a>
                      @if (moduleKey === 'leads') {
                        @if (record['status'] !== 'CONVERTED') {
                          <button type="button" (click)="convertLead(record)">
                            <span>✓</span>Convertir
                          </button>
                        }
                        @if (record['phone']) {
                          <a [href]="whatsappUrl(record['phone'])" target="_blank" rel="noopener"
                            ><span class="wa-mark">◉</span>WhatsApp</a
                          >
                        }
                        @if (record['email']) {
                          <a [href]="'mailto:' + record['email']"><span>✉</span>Enviar email</a>
                        }
                      }
                      <button class="danger" type="button" (click)="deleteRecord(record.id)">
                        <span>⊘</span>Eliminar
                      </button>
                    </div>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td
                  class="empty-state"
                  [attr.colspan]="definition.columns.length + (moduleKey === 'leads' ? 2 : 1)"
                >
                  <span>⌕</span>
                  <h2>Sin resultados</h2>
                  <p>Prueba con otra búsqueda o cambia los filtros.</p>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <footer class="pagination">
        <span>Mostrando {{ pageStart() }}–{{ pageEnd() }} de {{ filtered().length }}</span>
        <div>
          <button class="icon-button" [disabled]="page() === 1" (click)="page.set(page() - 1)">
            ‹</button
          ><button class="page-number is-active">{{ page() }}</button
          ><button
            class="icon-button"
            [disabled]="pageEnd() === filtered().length"
            (click)="page.set(page() + 1)"
          >
            ›
          </button>
        </div>
      </footer>
    </section>

    @if (createOpen()) {
      <button
        class="module-backdrop"
        type="button"
        aria-label="Cerrar"
        (click)="closeCreate()"
      ></button>
      <section
        class="create-dialog"
        [class.create-dialog--wide]="moduleKey === 'contracts'"
        role="dialog"
        aria-modal="true"
      >
        <header>
          <div>
            <span>{{ definition.eyebrow }}</span>
            <h2>Nuevo {{ definition.singular }}</h2>
            <p>Completa la información principal del registro.</p>
          </div>
          <button type="button" (click)="closeCreate()">×</button>
        </header>
        <div class="record-form">
          @for (field of definition.fields; track field.key) {
            @if (!(moduleKey === 'contracts' && field.key === 'totalMonthly')) {
              <label [class.full]="field.key === 'description' || field.key === 'notes'"
                ><span class="field-label"
                  >{{ field.label }}
                  @if (field.required) {
                    <b aria-label="Obligatorio">*</b>
                  }
                </span>
                @if (field.type === 'select') {
                  <app-styled-picklist
                    [options]="fieldPicklistOptions(field)"
                    [value]="draft()[field.key] || ''"
                    (valueChange)="setDraft(field.key, $event)"
                  />
                } @else if (field.type === 'date') {
                  <div class="form-date">
                    <app-inline-editable-date-field
                      [label]="field.label"
                      [value]="draft()[field.key] || ''"
                      placeholder="Seleccionar fecha"
                      [alwaysShowEdit]="true"
                      [compact]="true"
                      (valueSaved)="setDraft(field.key, $event)"
                    />
                  </div>
                } @else if (field.key === 'description' || field.key === 'notes') {
                  <textarea
                    #textarea
                    rows="4"
                    [required]="field.required"
                    [value]="draft()[field.key] || ''"
                    [placeholder]="field.placeholder || ''"
                    (input)="setDraft(field.key, textarea.value)"
                  ></textarea>
                } @else {
                  <input
                    #input
                    [type]="inputType(field.key, field.type)"
                    [required]="field.required"
                    [min]="field.min ?? null"
                    [max]="field.max ?? null"
                    [value]="draft()[field.key] || ''"
                    [placeholder]="field.placeholder || ''"
                    (input)="setDraft(field.key, input.value)"
                  />
                }
              </label>
            }
          }
          @if (moduleKey === 'contracts') {
            <section class="contract-items-builder">
              <header>
                <div>
                  <span>ÍTEMS DEL CONTRATO <b>*</b></span>
                  <p>Servicios incluidos y precio acordado con el cliente.</p>
                </div>
                <button class="button" type="button" (click)="addContractItem()">
                  ＋ Agregar servicio
                </button>
              </header>
              <div class="contract-items-head">
                <span>Servicio</span><span>Cantidad</span><span>Precio unitario</span
                ><span>Subtotal</span><span></span>
              </div>
              @for (item of contractItems(); track item.id) {
                <div class="contract-item-row">
                  <app-styled-picklist
                    [options]="contractServiceOptions()"
                    [value]="item.serviceId"
                    placeholder="Seleccionar servicio"
                    (valueChange)="updateContractItem(item.id, 'serviceId', $event)"
                  />
                  <input
                    #quantity
                    type="number"
                    min="1"
                    step="1"
                    [value]="item.quantity"
                    (input)="updateContractItem(item.id, 'quantity', quantity.value)"
                  />
                  <input
                    #unitPrice
                    type="number"
                    min="0"
                    step="0.01"
                    [value]="item.unitPrice"
                    (input)="updateContractItem(item.id, 'unitPrice', unitPrice.value)"
                  />
                  <strong>{{
                    item.quantity * item.unitPrice
                      | currency: 'MXN' : 'symbol-narrow' : '1.2-2' : i18n.locale()
                  }}</strong>
                  <button
                    class="remove-contract-item"
                    type="button"
                    aria-label="Eliminar ítem"
                    [disabled]="contractItems().length === 1"
                    (click)="removeContractItem(item.id)"
                  >
                    ×
                  </button>
                </div>
              }
              <footer>
                <span>{{ contractItems().length }} servicio(s)</span>
                <div>
                  <small>Mensualidad total</small
                  ><b>{{
                    contractTotal() | currency: 'MXN' : 'symbol-narrow' : '1.2-2' : i18n.locale()
                  }}</b>
                </div>
              </footer>
            </section>
          }
        </div>
        <footer>
          <small><b>*</b> Campos obligatorios según el modelo de datos.</small>
          <button class="button" type="button" (click)="closeCreate()">Cancelar</button
          ><button
            class="button button--primary"
            type="button"
            [disabled]="!canCreate()"
            (click)="createRecord()"
          >
            Crear {{ definition.singular }}
          </button>
        </footer>
      </section>
    }
    @if (bulkEditOpen()) {
      <button
        class="module-backdrop"
        type="button"
        aria-label="Cerrar"
        (click)="bulkEditOpen.set(false)"
      ></button>
      <section class="bulk-dialog" role="dialog" aria-modal="true">
        <header>
          <div>
            <span>EDICIÓN MASIVA</span>
            <h2>Editar {{ selectedCount() }} leads</h2>
            <p>El cambio se aplicará a todos los registros seleccionados.</p>
          </div>
          <button type="button" (click)="bulkEditOpen.set(false)">×</button>
        </header>
        <div>
          <label
            >Campo<select
              #bulkFieldSelect
              [value]="bulkField()"
              (change)="setBulkField(bulkFieldSelect.value)"
            >
              <option value="status">Estado</option>
              <option value="source">Origen</option>
              <option value="prospectType">Tipo de prospecto</option>
            </select></label
          ><label
            >Nuevo valor<select
              #bulkValueSelect
              [value]="bulkValue()"
              (change)="bulkValue.set(bulkValueSelect.value)"
            >
              <option value="">Seleccionar…</option>
              @for (option of bulkOptions(); track option) {
                <option [value]="option">{{ statusLabel(option) }}</option>
              }
            </select></label
          >
        </div>
        <footer>
          <button class="button" type="button" (click)="bulkEditOpen.set(false)">Cancelar</button
          ><button
            class="button button--primary"
            type="button"
            [disabled]="!bulkValue()"
            (click)="applyBulkEdit()"
          >
            Aplicar cambios
          </button>
        </footer>
      </section>
    }
  `,
  styles: [
    `
      :host {
        min-height: calc(100vh - 134px);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .page-header,
      .module-stats,
      .customer-table-card {
        display: none;
      }
      .customer-table-card {
        min-height: 360px;
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .customer-table-card > .filterbar,
      .customer-table-card > .pagination {
        flex: 0 0 auto;
      }
      .customer-table-card > .table-scroll {
        min-height: 0;
        flex: 1;
        overflow: auto;
      }
      .customer-table-card thead {
        position: sticky;
        top: 0;
        z-index: 2;
      }
      .customer-table-card tbody tr:last-child td {
        border-bottom: 1px solid var(--color-border);
      }
      .module-stats {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
        margin-bottom: 16px;
      }
      .module-stats article {
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .stat-icon {
        width: 38px;
        height: 38px;
        flex: 0 0 38px;
        border-radius: 9px;
        display: grid;
        place-items: center;
        background: #dbeafe;
        color: #2563eb;
        font-weight: 800;
      }
      .stat-icon--green {
        background: #dcfce7;
        color: #16a34a;
      }
      .stat-icon--amber {
        background: #fef3c7;
        color: #d97706;
      }
      .stat-icon--red {
        background: #fee2e2;
        color: #dc2626;
      }
      .stat-icon--violet {
        background: #ede9fe;
        color: #7c3aed;
      }
      .module-stats article > div {
        min-width: 0;
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        flex: 1;
      }
      .module-stats small,
      .module-stats em {
        color: var(--color-text-secondary);
        font-size: 10px;
        font-style: normal;
      }
      .module-stats b {
        grid-column: 2;
        grid-row: 1/3;
        font-size: 20px;
      }
      .record-identity {
        min-width: 190px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .record-avatar {
        width: 34px;
        height: 34px;
        flex: 0 0 34px;
        border-radius: 9px;
        display: grid;
        place-items: center;
        font-size: 9px;
        font-weight: 800;
      }
      .record-identity > span:last-child {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .record-identity b {
        color: var(--color-text-primary);
      }
      .record-identity:hover b {
        color: var(--color-primary);
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
      .cell-value {
        display: block;
        max-width: 210px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .row-action {
        width: 31px;
        height: 31px;
        border-radius: 7px;
        display: grid;
        place-items: center;
        color: var(--color-text-secondary);
        font-weight: 800;
        letter-spacing: 1px;
        border: 0;
        background: transparent;
      }
      .row-action:hover {
        background: var(--color-muted);
        color: var(--color-primary);
      }
      .selection-cell {
        width: 46px;
        padding-inline: 14px !important;
        text-align: center;
      }
      .selection-cell input {
        width: 16px;
        height: 16px;
        accent-color: var(--color-primary);
      }
      .row-menu-cell {
        position: relative;
        width: 52px;
      }
      .row-action-menu {
        position: absolute;
        right: 14px;
        top: 47px;
        z-index: 20;
        width: 175px;
        padding: 6px;
        border: 1px solid var(--color-border);
        border-radius: 10px;
        background: var(--color-surface);
        box-shadow: 0 14px 35px rgba(15, 23, 42, 0.2);
      }
      .row-action-menu a,
      .row-action-menu button {
        width: 100%;
        height: 36px;
        padding: 0 9px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: var(--color-text-primary);
        display: flex;
        align-items: center;
        gap: 8px;
        font: inherit;
        font-size: 10px;
        font-weight: 650;
      }
      .row-action-menu a:hover,
      .row-action-menu button:hover {
        background: var(--color-muted);
      }
      .row-action-menu .danger {
        color: var(--color-danger);
      }
      .wa-mark {
        color: #16a34a;
      }
      .bulk-toolbar {
        min-height: 52px;
        padding: 8px 14px;
        border-top: 1px solid #bfdbfe;
        border-bottom: 1px solid #bfdbfe;
        background: #eff6ff;
        color: #1e3a8a;
        display: flex;
        align-items: center;
        gap: 7px;
      }
      :host-context(.app-frame--dark) .bulk-toolbar {
        background: #172554;
        color: #dbeafe;
      }
      .bulk-toolbar > span {
        margin-right: auto;
        font-size: 10px;
      }
      .bulk-toolbar button {
        min-height: 34px;
        padding: 0 10px;
        border: 1px solid #bfdbfe;
        border-radius: 8px;
        background: var(--color-surface);
        color: var(--color-text-primary);
        font: inherit;
        font-size: 9.5px;
        font-weight: 700;
      }
      .bulk-toolbar button:hover {
        border-color: #60a5fa;
        color: var(--color-primary);
      }
      .bulk-toolbar .danger {
        color: var(--color-danger);
      }
      .bulk-toolbar .bulk-close {
        width: 32px;
        padding: 0;
        border: 0;
        background: transparent;
        font-size: 18px;
      }
      table.is-dense td {
        padding-block: 8px;
      }
      .empty-state {
        height: 210px;
        text-align: center;
        color: var(--color-text-secondary);
      }
      .empty-state > span {
        font-size: 28px;
      }
      .empty-state h2 {
        margin: 8px 0;
      }
      .module-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        border: 0;
        background: rgba(15, 23, 42, 0.5);
        backdrop-filter: blur(3px);
      }
      .create-dialog,
      .bulk-dialog {
        position: fixed;
        left: 50%;
        top: 50%;
        z-index: 1001;
        width: min(650px, calc(100vw - 28px));
        max-height: calc(100vh - 28px);
        overflow-y: auto;
        border: 1px solid var(--color-border);
        border-radius: 15px;
        background: var(--color-surface);
        box-shadow: 0 30px 80px rgba(15, 23, 42, 0.3);
        transform: translate(-50%, -50%);
      }
      .create-dialog--wide {
        width: min(900px, calc(100vw - 28px));
      }
      .create-dialog > header,
      .bulk-dialog > header {
        padding: 20px 22px 16px;
        border-bottom: 1px solid var(--color-border);
        display: flex;
        justify-content: space-between;
      }
      .create-dialog > header span,
      .bulk-dialog > header span {
        color: var(--color-primary);
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.08em;
      }
      .create-dialog h2,
      .bulk-dialog h2 {
        margin-top: 4px;
        font-size: 19px;
      }
      .create-dialog header p,
      .bulk-dialog header p {
        margin-top: 4px;
        color: var(--color-text-secondary);
        font-size: 11px;
      }
      .create-dialog header > button,
      .bulk-dialog header > button {
        width: 32px;
        height: 32px;
        border: 0;
        border-radius: 50%;
        background: var(--color-muted);
        color: var(--color-text-primary);
        font-size: 20px;
      }
      .record-form {
        padding: 20px 22px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }
      .record-form label {
        display: flex;
        flex-direction: column;
        gap: 6px;
        color: var(--color-text-secondary);
        font-size: 11px;
        font-weight: 650;
      }
      .field-label {
        display: inline-flex;
        align-items: center;
        gap: 3px;
      }
      .field-label b,
      .create-dialog > footer small b {
        color: #dc2626;
      }
      .record-form label.full {
        grid-column: 1/-1;
      }
      .contract-items-builder {
        grid-column: 1/-1;
        margin-top: 5px;
        border: 1px solid var(--color-border);
        border-radius: 11px;
        overflow: hidden;
      }
      .contract-items-builder > header {
        padding: 14px 15px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        background: var(--color-muted);
      }
      .contract-items-builder > header span {
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.07em;
      }
      .contract-items-builder > header span b {
        color: var(--color-danger);
      }
      .contract-items-builder > header p {
        margin-top: 3px;
        color: var(--color-text-secondary);
        font-size: 10px;
      }
      .contract-items-head,
      .contract-item-row {
        padding: 9px 13px;
        display: grid;
        grid-template-columns: minmax(210px, 1.5fr) 90px 130px 120px 32px;
        align-items: center;
        gap: 9px;
      }
      .contract-items-head {
        color: var(--color-text-secondary);
        background: var(--color-background);
        font-size: 8px;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .contract-item-row {
        border-top: 1px solid var(--color-border);
      }
      .contract-item-row input {
        width: 100%;
        height: 38px;
        padding: 0 9px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-background);
        color: var(--color-text-primary);
      }
      .contract-item-row strong {
        font-size: 11px;
        text-align: right;
      }
      .remove-contract-item {
        width: 30px;
        height: 30px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: var(--color-danger);
        font-size: 18px;
      }
      .remove-contract-item:hover:not(:disabled) {
        background: #fef2f2;
      }
      .contract-items-builder > footer {
        min-height: 59px;
        padding: 10px 15px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-top: 1px solid var(--color-border);
        background: var(--color-background);
      }
      .contract-items-builder > footer > span {
        color: var(--color-text-secondary);
        font-size: 9px;
      }
      .contract-items-builder > footer > div {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .contract-items-builder > footer small {
        font-size: 9px;
      }
      .contract-items-builder > footer b {
        font-size: 17px;
      }
      .record-form input,
      .record-form select,
      .record-form textarea {
        height: 40px;
        padding: 0 11px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        outline: 0;
        background: var(--color-background);
        color: var(--color-text-primary);
        font: inherit;
      }
      .record-form textarea {
        min-height: 88px;
        padding-block: 10px;
        resize: vertical;
      }
      .form-date {
        min-height: 40px;
        padding: 4px;
        border: 1px solid var(--color-border);
        border-radius: 9px;
        background: var(--color-background);
      }
      .record-form input:focus,
      .record-form select:focus,
      .record-form textarea:focus {
        border-color: #93c5fd;
        box-shadow: 0 0 0 3px #dbeafe;
      }
      .create-dialog > footer,
      .bulk-dialog > footer {
        padding: 14px 22px 19px;
        border-top: 1px solid var(--color-border);
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      .create-dialog > footer small {
        margin-right: auto;
        align-self: center;
        color: var(--color-text-secondary);
        font-size: 9px;
      }
      .bulk-dialog > div {
        padding: 20px 22px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }
      .bulk-dialog label {
        display: flex;
        flex-direction: column;
        gap: 6px;
        color: var(--color-text-secondary);
        font-size: 10px;
        font-weight: 650;
      }
      .bulk-dialog select {
        height: 42px;
        padding: 0 10px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-background);
        color: var(--color-text-primary);
      }
      @media (max-width: 1000px) {
        .module-stats {
          grid-template-columns: 1fr 1fr;
        }
      }
      @media (max-width: 600px) {
        :host {
          min-height: auto;
          overflow: visible;
        }
        .customer-table-card {
          min-height: 520px;
        }
        .module-stats,
        .record-form {
          grid-template-columns: 1fr;
        }
        .record-form label.full {
          grid-column: auto;
        }
        .contract-items-builder {
          grid-column: auto;
          overflow-x: auto;
        }
        .contract-items-head,
        .contract-item-row {
          min-width: 700px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationalModulePage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(OperationalStore);
  private readonly crmData = inject(CRM_DATA);
  readonly i18n = inject(LanguageService);
  readonly moduleKey = this.route.snapshot.data['moduleKey'] as OperationalModuleKey;
  readonly definition = OPERATIONAL_MODULES[this.moduleKey];
  readonly query = signal('');
  readonly statusFilter = signal('all');
  readonly dense = signal(false);
  readonly page = signal(1);
  readonly pageSize = 7;
  readonly createOpen = signal(false);
  readonly rowMenuId = signal<string | null>(null);
  readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  readonly bulkEditOpen = signal(false);
  readonly bulkField = signal('status');
  readonly bulkValue = signal('');
  readonly draft = signal<Record<string, string>>({});
  readonly contractItems = signal<ReadonlyArray<ContractItemDraft>>([]);
  readonly contractTotal = computed(() =>
    this.contractItems().reduce((total, item) => total + item.quantity * item.unitPrice, 0),
  );
  readonly records = computed(() => this.store.records()[this.moduleKey]);
  readonly statusOptions = computed(() =>
    this.definition.fields.find((field) => field.key === 'status')?.options?.length
      ? [...(this.definition.fields.find((field) => field.key === 'status')?.options ?? [])]
      : Array.from(
          new Set(
            this.records()
              .map((record) => String(record['status'] ?? ''))
              .filter(Boolean),
          ),
        ),
  );
  readonly filtered = computed(() => {
    const query = this.query().trim().toLocaleLowerCase(this.i18n.locale());
    return this.records().filter(
      (record) =>
        (this.statusFilter() === 'all'
          ? this.moduleKey !== 'leads' || record['status'] !== 'CONVERTED'
          : record['status'] === this.statusFilter()) &&
        (!query ||
          Object.values(record).some((value) =>
            String(value).toLocaleLowerCase(this.i18n.locale()).includes(query),
          )),
    );
  });
  readonly paginated = computed(() =>
    this.filtered().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize),
  );
  readonly pageStart = computed(() =>
    this.filtered().length ? (this.page() - 1) * this.pageSize + 1 : 0,
  );
  readonly pageEnd = computed(() => Math.min(this.page() * this.pageSize, this.filtered().length));
  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly allPageSelected = computed(
    () => this.paginated().length > 0 && this.paginated().every((item) => this.isSelected(item.id)),
  );
  readonly bulkOptions = computed(() => {
    const field = this.definition.fields.find((item) => item.key === this.bulkField());
    return field?.options ?? [];
  });
  readonly canCreate = computed(() => {
    const fieldsReady = this.definition.fields
      .filter((field) => field.required)
      .every((field) => this.draft()[field.key]?.trim());
    return (
      fieldsReady &&
      (this.moduleKey !== 'contracts' ||
        (this.contractItems().length > 0 &&
          this.contractItems().every((item) => item.serviceId && item.quantity > 0)))
    );
  });

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      if (this.moduleKey !== 'contracts' || params.get('create') !== 'true') return;
      const clientId = params.get('clientId') ?? '';
      this.openCreate({
        client: clientId,
        contractNumber: `SL-CTR-${new Date().getFullYear()}-${String(this.records().length + 818).padStart(4, '0')}`,
        startDate: new Date().toISOString().slice(0, 10),
        status: 'PENDING_SIGNATURE',
        notes: 'Nuevo contrato generado por solicitud de cambio de plan.',
      });
    });
  }
  listFields(): ReadonlyArray<RecordListField> {
    return this.definition.fields.map((field) => ({
      key: field.key,
      label: field.label,
      type:
        field.key === 'status'
          ? 'status'
          : field.type === 'number'
            ? 'number'
            : field.type === 'date'
              ? 'date'
              : field.type === 'select'
                ? 'select'
                : field.key.toLowerCase().includes('email')
                  ? 'email'
                  : field.key.toLowerCase().includes('phone')
                    ? 'phone'
                    : 'text',
      options: field.options,
    }));
  }
  listWidgets(): ReadonlyArray<RecordListWidget> {
    return this.definition.metrics.map((metric) => ({
      ...metric,
      icon: this.metricIcon(metric.tone),
    }));
  }
  listRowActions(): ReadonlyArray<RecordListAction> {
    return this.moduleKey === 'leads'
      ? [
          { id: 'view', label: 'Ver', icon: '↗' },
          { id: 'convert', label: 'Convertir', icon: '✓' },
          { id: 'message', label: 'Enviar mensaje', icon: '✉' },
          { id: 'delete', label: 'Eliminar', icon: '⊘', danger: true },
        ]
      : [
          { id: 'view', label: 'Ver', icon: '↗' },
          { id: 'delete', label: 'Eliminar', icon: '⊘', danger: true },
        ];
  }
  listBulkActions(): ReadonlyArray<RecordListAction> {
    const common: RecordListAction[] = [
      { id: 'edit', label: 'Editar', icon: '✎' },
      { id: 'export', label: 'Exportar', icon: '⇩' },
    ];
    if (this.moduleKey === 'leads') common.push({ id: 'convert', label: 'Convertir', icon: '✓' });
    common.push({ id: 'delete', label: 'Eliminar', icon: '⊘', danger: true });
    return common;
  }
  handleListRowAction(actionId: string, row: RecordListRow): void {
    const record = this.records().find((item) => item.id === String(row['id']));
    if (!record) return;
    if (actionId === 'convert') this.convertLead(record);
    else if (actionId === 'message' && record['email'])
      window.location.href = `mailto:${String(record['email'])}`;
    else if (actionId === 'delete') this.deleteRecord(record.id);
  }
  handleListBulkAction(
    actionId: string,
    rows: ReadonlyArray<RecordListRow>,
    field?: string,
    value?: string,
  ): void {
    this.selectedIds.set(new Set(rows.map((row) => String(row['id']))));
    if (actionId === 'edit' && field && value !== undefined) {
      const definition = this.definition.fields.find((item) => item.key === field);
      const normalized = definition?.type === 'number' ? Number(value) : value;
      rows.forEach((row) =>
        this.store.update(this.moduleKey, String(row['id']), { [field]: normalized }),
      );
      this.clearSelection();
    } else if (actionId === 'convert') this.convertSelected();
    else if (actionId === 'delete') this.deleteSelected();
  }
  importRecords(rows: ReadonlyArray<RecordListRow>): void {
    rows.forEach((row, index) => {
      const record = {
        ...row,
        id: String(row['id'] || `${this.definition.idPrefix}-${Date.now() + index}`),
        createdAt: String(row['createdAt'] || new Date().toISOString()),
        updatedAt: new Date().toISOString(),
      } as OperationalRecord;
      this.store.add(this.moduleKey, record);
    });
  }
  asString(value: string | number | boolean): string {
    return String(value);
  }
  asNumber(value: string | number | boolean): number {
    return Number(value) || 0;
  }
  initials(value: string | number | boolean): string {
    return String(value)
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
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
  metricIcon(tone: string): string {
    return (
      ({ green: '✓', amber: '!', red: '↑', violet: '◎', blue: '▦' } as Record<string, string>)[
        tone
      ] ?? '▦'
    );
  }
  openCreate(seed: Record<string, string> = {}): void {
    this.draft.set(seed);
    this.contractItems.set(
      this.moduleKey === 'contracts'
        ? [{ id: `contract-item-${Date.now()}`, serviceId: '', quantity: 1, unitPrice: 0 }]
        : [],
    );
    this.createOpen.set(true);
  }
  closeCreate(): void {
    this.createOpen.set(false);
    this.draft.set({});
    this.contractItems.set([]);
  }
  setDraft(key: string, value: string): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }
  fieldPicklistOptions(field: ModuleField): ReadonlyArray<PicklistOption> {
    return (field.options ?? []).map((option) => ({
      value: option,
      label: field.optionLabels?.[option] || this.statusLabel(option),
    }));
  }
  contractServiceOptions(): ReadonlyArray<PicklistOption> {
    return this.store.recordsFor('services').map((service) => ({
      value: service.id,
      label: String(service['name']),
      detail: `${String(service['type'])} · ${this.asNumber(service['price']) ? '$' + this.asNumber(service['price']) : 'Sin costo'}`,
    }));
  }
  addContractItem(): void {
    this.contractItems.update((items) => [
      ...items,
      { id: `contract-item-${Date.now()}`, serviceId: '', quantity: 1, unitPrice: 0 },
    ]);
  }
  removeContractItem(id: string): void {
    if (this.contractItems().length === 1) return;
    this.contractItems.update((items) => items.filter((item) => item.id !== id));
    this.syncContractTotal();
  }
  updateContractItem(
    id: string,
    field: 'serviceId' | 'quantity' | 'unitPrice',
    value: string,
  ): void {
    this.contractItems.update((items) =>
      items.map((item) => {
        if (item.id !== id) return item;
        if (field === 'serviceId') {
          const service = this.store.find('services', value);
          return { ...item, serviceId: value, unitPrice: this.asNumber(service?.['price'] ?? 0) };
        }
        return {
          ...item,
          [field]:
            field === 'quantity'
              ? Math.max(1, Number(value) || 1)
              : Math.max(0, Number(value) || 0),
        };
      }),
    );
    this.syncContractTotal();
  }
  private syncContractTotal(): void {
    this.setDraft('totalMonthly', String(this.contractTotal()));
  }
  inputType(key: string, type: 'text' | 'number' | 'date' | 'select'): string {
    if (type !== 'text') return type;
    if (key.toLowerCase().includes('email')) return 'email';
    if (key.toLowerCase().includes('phone') || key === 'cellphone') return 'tel';
    if (key.toLowerCase().includes('url')) return 'url';
    return 'text';
  }
  createRecord(): void {
    if (!this.canCreate()) return;
    const now = new Date().toISOString();
    const record: OperationalRecord = {
      id: `${this.definition.idPrefix}-${this.records().length + 1001}`,
      ...this.draft(),
      createdAt: now,
      updatedAt: now,
    };
    this.definition.fields.forEach((field) => {
      const rawValue = record[field.key];
      if (field.schemaKey && rawValue !== undefined && rawValue !== '') {
        record[field.schemaKey] = rawValue;
        if (field.optionLabels)
          record[field.key] = field.optionLabels[String(rawValue)] ?? rawValue;
      }
      if (field.type === 'number') record[field.key] = Number(record[field.key]) || 0;
    });
    const dateDefault = (
      {
        assignments: 'assignedAt',
        invoices: 'issueDate',
        payments: 'paidAt',
      } as Partial<Record<OperationalModuleKey, string>>
    )[this.moduleKey];
    if (dateDefault && !record[dateDefault]) record[dateDefault] = now;
    if (this.moduleKey === 'invoices' && !record['taxAmount']) record['taxAmount'] = 0;
    if (this.moduleKey === 'payments' && !record['method']) record['method'] = 'CASH';
    if (this.moduleKey === 'contracts') {
      record['totalMonthly'] = this.contractTotal();
      record['items'] = JSON.stringify(
        this.contractItems().map(({ serviceId, quantity, unitPrice }) => ({
          serviceId,
          quantity,
          unitPrice,
        })),
      );
    }
    if (this.moduleKey === 'services')
      record['status'] = record['isActive'] === 'false' ? 'INACTIVE' : 'ACTIVE';
    if (this.moduleKey === 'assignments')
      record['status'] = record['returnedAt'] ? 'RETURNED' : 'ACTIVE';
    if (!record['status'] && this.statusOptions().length)
      record['status'] = this.statusOptions()[0];
    this.store.add(this.moduleKey, record);
    this.closeCreate();
  }
  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }
  toggleSelection(id: string): void {
    this.selectedIds.update((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  togglePageSelection(): void {
    const shouldSelect = !this.allPageSelected();
    this.selectedIds.update((current) => {
      const next = new Set(current);
      this.paginated().forEach((record) =>
        shouldSelect ? next.add(record.id) : next.delete(record.id),
      );
      return next;
    });
  }
  clearSelection(): void {
    this.selectedIds.set(new Set());
  }
  toggleRowMenu(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.rowMenuId.set(this.rowMenuId() === id ? null : id);
  }
  @HostListener('document:click')
  closeRowMenu(): void {
    this.rowMenuId.set(null);
  }
  whatsappUrl(value: string | number | boolean): string {
    return `https://wa.me/${String(value ?? '').replace(/\D/g, '')}`;
  }
  deleteRecord(id: string): void {
    this.store.archive(this.moduleKey, id);
    this.selectedIds.update((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    this.rowMenuId.set(null);
  }
  deleteSelected(): void {
    [...this.selectedIds()].forEach((id) => this.store.archive(this.moduleKey, id));
    this.clearSelection();
  }
  openBulkEdit(): void {
    this.bulkField.set('status');
    this.bulkValue.set('');
    this.bulkEditOpen.set(true);
  }
  setBulkField(field: string): void {
    this.bulkField.set(field);
    this.bulkValue.set('');
  }
  applyBulkEdit(): void {
    const value = this.bulkValue();
    if (!value) return;
    const records = this.records().filter((item) => this.selectedIds().has(item.id));
    records.forEach((record) => {
      if (this.bulkField() === 'status' && value === 'CONVERTED') this.convertLead(record);
      else this.store.update(this.moduleKey, record.id, { [this.bulkField()]: value });
    });
    this.bulkEditOpen.set(false);
    this.clearSelection();
  }
  convertSelected(): void {
    this.records()
      .filter((item) => this.selectedIds().has(item.id))
      .forEach((record) => this.convertLead(record));
    this.clearSelection();
  }
  convertLead(lead: OperationalRecord): void {
    if (this.moduleKey !== 'leads' || lead['status'] === 'CONVERTED') return;
    const convertedAt = new Date().toISOString();
    const customerId = `SL-${1100 + this.records().filter((item) => item['status'] === 'CONVERTED').length}`;
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
      phone: String(lead['phone'] ?? ''),
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
      gpsLocation: `${lead['latitude'] ?? '19.4326'}, ${lead['longitude'] ?? '-99.1332'}`,
      ipAddress: 'Pendiente',
      equipment: [],
      invoices: [],
      payments: [],
      tickets: [],
      notes: [],
      timeline: [
        {
          id: `conversion-${Date.now()}`,
          title: 'Cliente convertido desde lead',
          detail: `Origen: ${lead['source'] ?? 'No especificado'} · Lead ${lead.id}`,
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
    this.rowMenuId.set(null);
  }
  exportSelected(): void {
    this.downloadCsv(
      this.records().filter((item) => this.selectedIds().has(item.id)),
      `${this.moduleKey}-seleccionados.csv`,
    );
  }
  exportCsv(): void {
    this.downloadCsv(this.filtered(), `${this.moduleKey}.csv`);
  }
  private downloadCsv(records: ReadonlyArray<OperationalRecord>, fileName: string): void {
    const columns = this.definition.columns;
    const lines = [
      columns.map((column) => column.label).join(','),
      ...records.map((record) =>
        columns
          .map((column) => `"${String(record[column.key] ?? '').replaceAll('"', '""')}"`)
          .join(','),
      ),
    ];
    const url = URL.createObjectURL(
      new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }
}
