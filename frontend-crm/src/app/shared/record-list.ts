import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { InlineEditableDateField } from './inline-editable-date-field';
import { LanguageService } from '../core/i18n/language.service';

export type RecordListValue = string | number | boolean | null | undefined;
export type RecordListRow = Readonly<Record<string, RecordListValue>>;
export type RecordListFieldType =
  | 'text'
  | 'number'
  | 'money'
  | 'date'
  | 'select'
  | 'status'
  | 'email'
  | 'phone'
  | 'boolean'
  | 'lookup';
export interface RecordListColumn {
  readonly key: string;
  readonly label: string;
  readonly type: RecordListFieldType | 'identity';
  readonly secondaryKey?: string;
}
export interface RecordListField {
  readonly key: string;
  readonly label: string;
  readonly type: RecordListFieldType;
  readonly options?: ReadonlyArray<string>;
}
export interface RecordListWidget {
  readonly label: string;
  readonly value: string | number;
  readonly detail: string;
  readonly tone?: string;
  readonly icon?: string;
}
export interface RecordListAction {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly danger?: boolean;
}
interface ActiveFilter {
  readonly id: string;
  field: string;
  operator: string;
  value: string;
  secondValue: string;
}

@Component({
  selector: 'app-record-list',
  imports: [CurrencyPipe, DatePipe, InlineEditableDateField, RouterLink],
  template: `
    <header class="heading">
      <div>
        <div class="breadcrumbs">
          <span>CRM</span><b>›</b><span>{{ title() }}</span>
        </div>
        <h1>{{ title() }}</h1>
        <p>{{ description() }}</p>
      </div>
      <div class="heading-actions">
        <input
          #importInput
          hidden
          type="file"
          accept=".csv,text/csv"
          (change)="importCsv(importInput.files); importInput.value = ''"
        /><button class="button" type="button" (click)="importInput.click()">⇧ Importar</button
        ><button class="button" type="button" (click)="exportRows(filtered(), '')">
          ⇩ Exportar</button
        ><button class="button primary" type="button" (click)="newRequested.emit()">
          ＋ {{ newLabel() }}
        </button>
      </div>
    </header>
    <section class="widgets" [style.--widget-count]="widgets().length">
      @for (widget of widgets(); track widget.label) {
        <article>
          <span class="widget-icon {{ widget.tone || 'blue' }}">{{
            widget.icon || widgetIcon(widget.tone || 'blue')
          }}</span>
          <div>
            <small>{{ widget.label }}</small
            ><b>{{ widget.value }}</b
            ><em>{{ widget.detail }}</em>
          </div>
        </article>
      }
    </section>
    <section class="table-card">
      <div class="toolbar">
        <label class="search"
          ><span>⌕</span
          ><input
            #searchInput
            type="search"
            [placeholder]="'Buscar en ' + title().toLowerCase()"
            [value]="query()"
            (input)="query.set(searchInput.value); page.set(1)" /></label
        ><button
          class="button"
          type="button"
          [class.active]="filterPanel() || filters().length"
          (click)="filterPanel.set(!filterPanel())"
        >
          ☷ Filtros
          @if (filters().length) {
            <span>{{ filters().length }}</span>
          }</button
        ><button
          class="button"
          type="button"
          [class.active]="dense()"
          (click)="dense.set(!dense())"
        >
          ≡ Compacta</button
        ><span class="result-count">{{ filtered().length }} resultados</span>
      </div>
      @if (filterPanel()) {
        <div class="filter-panel">
          <header>
            <div>
              <b>Filtros avanzados</b
              ><small>Combina varios criterios; todos deben coincidir.</small>
            </div>
            <button type="button" (click)="addFilter()">＋ Agregar filtro</button>
          </header>
          @for (filter of filters(); track filter.id) {
            <div class="filter-row">
              <select
                #fieldSelect
                [value]="filter.field"
                (change)="changeFilterField(filter.id, fieldSelect.value)"
              >
                <option value="">Seleccionar campo</option>
                @for (field of fields(); track field.key) {
                  <option [value]="field.key">{{ field.label }}</option>
                }</select
              ><select
                #operatorSelect
                [value]="filter.operator"
                (change)="updateFilter(filter.id, 'operator', operatorSelect.value)"
              >
                @for (operator of operatorsFor(filter.field); track operator.id) {
                  <option [value]="operator.id">{{ operator.label }}</option>
                }
              </select>
              @if (fieldFor(filter.field); as field) {
                @if (
                  field.type === 'select' || field.type === 'status' || field.type === 'boolean'
                ) {
                  <select
                    #filterValue
                    [value]="filter.value"
                    (change)="updateFilter(filter.id, 'value', filterValue.value)"
                  >
                    <option value="">Seleccionar…</option>
                    @for (option of filterOptions(field); track option.value) {
                      <option [value]="option.value">{{ option.label }}</option>
                    }
                  </select>
                } @else if (field.type === 'date') {
                  <div class="date-filter">
                    <app-inline-editable-date-field
                      label="Fecha"
                      [value]="filter.value"
                      placeholder="Seleccionar fecha"
                      [alwaysShowEdit]="true"
                      [compact]="true"
                      (valueSaved)="updateFilter(filter.id, 'value', $event)"
                    />
                  </div>
                } @else {
                  <input
                    #filterValue
                    [type]="field.type === 'number' || field.type === 'money' ? 'number' : 'text'"
                    [value]="filter.value"
                    (input)="updateFilter(filter.id, 'value', filterValue.value)"
                    placeholder="Valor"
                  />
                }
                @if (filter.operator === 'between') {
                  @if (field.type === 'date') {
                    <div class="date-filter">
                      <app-inline-editable-date-field
                        label="Hasta"
                        [value]="filter.secondValue"
                        placeholder="Fecha final"
                        [alwaysShowEdit]="true"
                        [compact]="true"
                        (valueSaved)="updateFilter(filter.id, 'secondValue', $event)"
                      />
                    </div>
                  } @else {
                    <input
                      #secondValue
                      type="number"
                      [value]="filter.secondValue"
                      (input)="updateFilter(filter.id, 'secondValue', secondValue.value)"
                      placeholder="Hasta"
                    />
                  }
                }
              }
              <button
                class="remove-filter"
                type="button"
                aria-label="Eliminar filtro"
                (click)="removeFilter(filter.id)"
              >
                ×
              </button>
            </div>
          } @empty {
            <div class="no-filters">Agrega un filtro para comenzar.</div>
          }
          <footer>
            <button type="button" (click)="clearFilters()">Limpiar todos</button
            ><span>{{ filtered().length }} registros coinciden</span>
          </footer>
        </div>
      }
      @if (selectedCount()) {
        <div class="bulk">
          <span
            ><b>{{ selectedCount() }}</b> seleccionados</span
          >
          @for (action of bulkActions(); track action.id) {
            <button type="button" [class.danger]="action.danger" (click)="runBulkAction(action.id)">
              {{ action.icon || actionIcon(action.id) }} {{ action.label }}
            </button>
          }
          <button type="button" class="close" (click)="clearSelection()">×</button>
        </div>
      }
      <div class="table-scroll">
        <table [class.dense]="dense()">
          <thead>
            <tr>
              <th class="check">
                <input
                  type="checkbox"
                  [checked]="allPageSelected()"
                  (change)="togglePageSelection()"
                />
              </th>
              @for (column of columns(); track column.key) {
                <th>{{ column.label }}</th>
              }
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (record of paginated(); track rowId(record)) {
              <tr (dblclick)="rowAction.emit({ actionId: 'view', record })">
                <td class="check">
                  <input
                    type="checkbox"
                    [checked]="isSelected(rowId(record))"
                    (change)="toggleSelection(rowId(record))"
                  />
                </td>
                @for (column of columns(); track column.key) {
                  <td>
                    @switch (column.type) {
                      @case ('identity') {
                        <a class="identity" [routerLink]="[baseRoute(), rowId(record)]"
                          ><span [style.background]="accent() + '18'" [style.color]="accent()">{{
                            initials(record[column.key])
                          }}</span
                          ><span
                            ><b>{{ display(record[column.key]) }}</b
                            ><small
                              >{{ rowId(record) }}
                              @if (column.secondaryKey) {
                                · {{ display(record[column.secondaryKey]) }}
                              }
                            </small></span
                          ></a
                        >
                      }
                      @case ('status') {
                        <em class="status {{ statusTone(record[column.key]) }}"
                          ><i></i>{{ statusLabel(record[column.key]) }}</em
                        >
                      }
                      @case ('money') {
                        <b>{{
                          number(record[column.key])
                            | currency: 'MXN' : 'symbol-narrow' : '1.0-2' : i18n.locale()
                        }}</b>
                      }
                      @case ('date') {
                        <time>{{
                          dateValue(record[column.key]) | date: 'dd MMM y' : '' : i18n.locale()
                        }}</time>
                      }
                      @case ('email') {
                        <a class="link" [href]="'mailto:' + display(record[column.key])">{{
                          display(record[column.key])
                        }}</a>
                      }
                      @case ('phone') {
                        <a class="link" [href]="'tel:' + display(record[column.key])">{{
                          display(record[column.key])
                        }}</a>
                      }
                      @default {
                        <span>{{ display(record[column.key]) || '—' }}</span>
                      }
                    }
                  </td>
                }
                <td class="menu-cell">
                  <button type="button" (click)="toggleMenu($event, rowId(record))">•••</button>
                  @if (menuId() === rowId(record)) {
                    <div class="row-menu" (click)="$event.stopPropagation()">
                      @for (action of rowActions(); track action.id) {
                        @if (action.id === 'view') {
                          <a [routerLink]="[baseRoute(), rowId(record)]"
                            ><span>{{ action.icon || '↗' }}</span
                            >{{ action.label }}</a
                          >
                        } @else {
                          <button
                            type="button"
                            [class.danger]="action.danger"
                            (click)="runRowAction(action.id, record)"
                          >
                            <span>{{ action.icon || actionIcon(action.id) }}</span
                            >{{ action.label }}
                          </button>
                        }
                      }
                    </div>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td class="empty" [attr.colspan]="columns().length + 2">
                  <span>⌕</span>
                  <h3>Sin resultados</h3>
                  <p>Cambia la búsqueda o los filtros aplicados.</p>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <footer class="pagination">
        <span>Mostrando {{ pageStart() }}–{{ pageEnd() }} de {{ filtered().length }}</span>
        <div>
          <button type="button" [disabled]="page() === 1" (click)="page.set(page() - 1)">‹</button
          ><b>{{ page() }}</b
          ><button
            type="button"
            [disabled]="pageEnd() === filtered().length"
            (click)="page.set(page() + 1)"
          >
            ›
          </button>
        </div>
      </footer>
    </section>
    @if (bulkEditor()) {
      <button
        class="modal-backdrop"
        type="button"
        aria-label="Cerrar"
        (click)="bulkEditor.set(false)"
      ></button>
      <section class="bulk-modal" role="dialog" aria-modal="true">
        <header>
          <div>
            <span>EDICIÓN MASIVA</span>
            <h2>Editar {{ selectedCount() }} registros</h2>
            <p>El valor se aplicará a todos los registros seleccionados.</p>
          </div>
          <button type="button" (click)="bulkEditor.set(false)">×</button>
        </header>
        <div>
          <label
            >Campo<select
              #bulkFieldSelect
              [value]="bulkField()"
              (change)="bulkField.set(bulkFieldSelect.value); bulkValue.set('')"
            >
              @for (field of editableFields(); track field.key) {
                <option [value]="field.key">{{ field.label }}</option>
              }
            </select></label
          >
          @if (fieldFor(bulkField()); as field) {
            <label
              >Nuevo valor
              @if (field.type === 'select' || field.type === 'status' || field.type === 'boolean') {
                <select #bulkChoice (change)="bulkValue.set(bulkChoice.value)">
                  <option value="">Seleccionar…</option>
                  @for (option of filterOptions(field); track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              } @else {
                <input
                  #bulkInput
                  [type]="
                    field.type === 'date'
                      ? 'date'
                      : field.type === 'number' || field.type === 'money'
                        ? 'number'
                        : 'text'
                  "
                  (input)="bulkValue.set(bulkInput.value)"
                />
              }
            </label>
          }
        </div>
        <footer>
          <button type="button" (click)="bulkEditor.set(false)">Cancelar</button>
          <button
            class="primary"
            type="button"
            [disabled]="!bulkField() || !bulkValue()"
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
        display: block;
      }
      .heading {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 20px;
      }
      .breadcrumbs {
        display: flex;
        gap: 7px;
        color: var(--color-text-secondary);
        font-size: 9px;
      }
      .heading h1 {
        margin-top: 7px;
        font-size: 25px;
      }
      .heading p {
        margin-top: 4px;
        color: var(--color-text-secondary);
        font-size: 11px;
      }
      .heading-actions {
        display: flex;
        gap: 8px;
      }
      .button {
        min-height: 38px;
        padding: 0 13px;
        border: 1px solid var(--color-border);
        border-radius: 9px;
        background: var(--color-surface);
        color: var(--color-text-primary);
        font: inherit;
        font-size: 10px;
        font-weight: 750;
      }
      .button.primary {
        border-color: var(--color-primary);
        background: var(--color-primary);
        color: #fff;
      }
      .button.active {
        border-color: #93c5fd;
        color: var(--color-primary);
      }
      .button span {
        min-width: 18px;
        height: 18px;
        margin-left: 4px;
        border-radius: 999px;
        background: #dbeafe;
        display: inline-grid;
        place-items: center;
      }
      .widgets {
        margin-bottom: 18px;
        display: grid;
        grid-template-columns: repeat(var(--widget-count, 4), minmax(0, 1fr));
        gap: 12px;
      }
      .widgets article {
        min-height: 98px;
        padding: 15px;
        border: 1px solid var(--color-border);
        border-radius: 13px;
        background: var(--color-surface);
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .widget-icon {
        width: 40px;
        height: 40px;
        flex: 0 0 40px;
        border-radius: 10px;
        background: #dbeafe;
        color: #2563eb;
        display: grid;
        place-items: center;
      }
      .widget-icon.green {
        background: #dcfce7;
        color: #15803d;
      }
      .widget-icon.amber {
        background: #fef3c7;
        color: #b45309;
      }
      .widget-icon.red {
        background: #fee2e2;
        color: #dc2626;
      }
      .widget-icon.violet {
        background: #ede9fe;
        color: #7c3aed;
      }
      .widgets article div {
        display: flex;
        flex-direction: column;
      }
      .widgets small {
        color: var(--color-text-secondary);
        font-size: 9px;
      }
      .widgets b {
        margin-top: 3px;
        font-size: 18px;
      }
      .widgets em {
        margin-top: 3px;
        color: var(--color-text-secondary);
        font-size: 8px;
        font-style: normal;
      }
      .table-card {
        height: calc(100vh - 305px);
        min-height: 460px;
        border: 1px solid var(--color-border);
        border-radius: 14px;
        background: var(--color-surface);
        display: flex;
        flex-direction: column;
        overflow: visible;
      }
      .toolbar {
        padding: 13px 15px;
        border-bottom: 1px solid var(--color-border);
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .search {
        width: min(390px, 42vw);
        height: 38px;
        padding: 0 11px;
        border: 1px solid var(--color-border);
        border-radius: 9px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .search input {
        width: 100%;
        border: 0;
        outline: 0;
        background: transparent;
        color: var(--color-text-primary);
        font: inherit;
        font-size: 10px;
      }
      .result-count {
        margin-left: auto;
        color: var(--color-text-secondary);
        font-size: 9px;
      }
      .filter-panel {
        position: relative;
        z-index: 15;
        margin: 0 15px;
        padding: 14px;
        border: 1px solid #bfdbfe;
        border-radius: 0 0 12px 12px;
        background: var(--color-background);
        box-shadow: 0 15px 35px #0f172a18;
      }
      .filter-panel > header,
      .filter-panel > footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .filter-panel header div {
        display: flex;
        flex-direction: column;
      }
      .filter-panel header b {
        font-size: 12px;
      }
      .filter-panel header small,
      .filter-panel footer {
        color: var(--color-text-secondary);
        font-size: 9px;
      }
      .filter-panel button {
        border: 0;
        background: transparent;
        color: var(--color-primary);
        font: inherit;
        font-size: 10px;
        font-weight: 750;
      }
      .filter-row {
        margin-top: 10px;
        display: grid;
        grid-template-columns: 1.1fr 1fr 1.5fr auto auto;
        gap: 7px;
      }
      .filter-row select,
      .filter-row input {
        min-width: 0;
        height: 35px;
        padding: 0 9px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-surface);
        color: var(--color-text-primary);
        font: inherit;
        font-size: 9px;
      }
      .date-filter {
        min-width: 160px;
        padding: 0 4px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-surface);
      }
      .remove-filter {
        width: 34px !important;
        color: #dc2626 !important;
      }
      .no-filters {
        padding: 25px;
        text-align: center;
        color: var(--color-text-secondary);
        font-size: 10px;
      }
      .filter-panel > footer {
        margin-top: 12px;
        padding-top: 10px;
        border-top: 1px solid var(--color-border);
      }
      .bulk {
        min-height: 48px;
        padding: 0 15px;
        border-bottom: 1px solid #bfdbfe;
        background: #eff6ff;
        color: #1e3a8a;
        display: flex;
        align-items: center;
        gap: 7px;
      }
      .bulk > span {
        margin-right: 10px;
        font-size: 10px;
      }
      .bulk button {
        height: 31px;
        padding: 0 9px;
        border: 0;
        border-radius: 7px;
        background: #fff;
        color: #1e40af;
        font: inherit;
        font-size: 9px;
        font-weight: 750;
      }
      .bulk button.danger {
        color: #dc2626;
      }
      .bulk .close {
        margin-left: auto;
        font-size: 15px;
      }
      .table-scroll {
        min-height: 0;
        flex: 1;
        overflow: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        white-space: nowrap;
      }
      th {
        position: sticky;
        top: 0;
        z-index: 2;
        height: 42px;
        padding: 0 14px;
        border-bottom: 1px solid var(--color-border);
        background: var(--color-background);
        color: var(--color-text-secondary);
        font-size: 9px;
        text-align: left;
      }
      td {
        height: 62px;
        padding: 0 14px;
        border-bottom: 1px solid var(--color-border);
        font-size: 10px;
      }
      table.dense td {
        height: 48px;
      }
      .check {
        width: 40px;
        padding-inline: 12px;
      }
      .identity {
        color: inherit;
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 9px;
      }
      .identity > span:first-child {
        width: 34px;
        height: 34px;
        border-radius: 9px;
        display: grid;
        place-items: center;
        font-size: 9px;
        font-weight: 800;
      }
      .identity > span:last-child {
        display: flex;
        flex-direction: column;
      }
      .identity small {
        margin-top: 3px;
        color: var(--color-text-secondary);
        font-size: 8px;
      }
      .status {
        padding: 4px 8px;
        border-radius: 999px;
        background: #dbeafe;
        color: #2563eb;
        font-size: 8px;
        font-style: normal;
        font-weight: 800;
      }
      .status i {
        display: inline-block;
        width: 5px;
        height: 5px;
        margin-right: 5px;
        border-radius: 50%;
        background: currentColor;
      }
      .status.green {
        background: #dcfce7;
        color: #15803d;
      }
      .status.amber {
        background: #fef3c7;
        color: #b45309;
      }
      .status.red {
        background: #fee2e2;
        color: #dc2626;
      }
      .status.violet {
        background: #ede9fe;
        color: #7c3aed;
      }
      .link {
        color: var(--color-primary);
        text-decoration: none;
      }
      .menu-cell {
        position: relative;
        width: 50px;
      }
      .menu-cell > button {
        border: 0;
        background: transparent;
        color: var(--color-text-secondary);
      }
      .row-menu {
        position: absolute;
        right: 12px;
        top: 45px;
        z-index: 30;
        width: 160px;
        padding: 5px;
        border: 1px solid var(--color-border);
        border-radius: 9px;
        background: var(--color-surface);
        box-shadow: 0 14px 35px #0f172a28;
      }
      .row-menu a,
      .row-menu button {
        width: 100%;
        padding: 9px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--color-text-primary);
        display: flex;
        gap: 8px;
        text-decoration: none;
        font: inherit;
        font-size: 9px;
      }
      .row-menu a:hover,
      .row-menu button:hover {
        background: var(--color-muted);
      }
      .row-menu .danger {
        color: #dc2626;
      }
      .empty {
        height: 250px;
        text-align: center;
        color: var(--color-text-secondary);
      }
      .empty span {
        font-size: 25px;
      }
      .empty h3 {
        margin-top: 7px;
        color: var(--color-text-primary);
      }
      .empty p {
        margin-top: 4px;
      }
      .pagination {
        min-height: 48px;
        padding: 0 15px;
        border-top: 1px solid var(--color-border);
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: var(--color-text-secondary);
        font-size: 9px;
      }
      .pagination div {
        display: flex;
        align-items: center;
        gap: 7px;
      }
      .pagination button {
        width: 30px;
        height: 30px;
        border: 1px solid var(--color-border);
        border-radius: 7px;
        background: var(--color-surface);
        color: var(--color-text-primary);
      }
      .pagination b {
        width: 30px;
        height: 30px;
        border-radius: 7px;
        background: var(--color-primary);
        color: #fff;
        display: grid;
        place-items: center;
      }
      .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1200;
        border: 0;
        background: rgba(15, 23, 42, 0.55);
        backdrop-filter: blur(3px);
      }
      .bulk-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        z-index: 1201;
        width: min(520px, calc(100vw - 28px));
        overflow: hidden;
        border: 1px solid var(--color-border);
        border-radius: 16px;
        background: var(--color-surface);
        box-shadow: 0 28px 80px rgba(15, 23, 42, 0.3);
        transform: translate(-50%, -50%);
      }
      .bulk-modal > header {
        padding: 20px 22px 16px;
        border-bottom: 1px solid var(--color-border);
        display: flex;
        justify-content: space-between;
        gap: 16px;
      }
      .bulk-modal header span {
        color: var(--color-primary);
        font-size: 8px;
        font-weight: 800;
        letter-spacing: 0.09em;
      }
      .bulk-modal h2 {
        margin-top: 5px;
        font-size: 19px;
      }
      .bulk-modal header p {
        margin-top: 4px;
        color: var(--color-text-secondary);
        font-size: 10px;
      }
      .bulk-modal header button {
        width: 32px;
        height: 32px;
        border: 0;
        border-radius: 50%;
        background: var(--color-muted);
        color: var(--color-text-primary);
        font-size: 19px;
      }
      .bulk-modal > div {
        padding: 20px 22px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 13px;
      }
      .bulk-modal label {
        display: flex;
        flex-direction: column;
        gap: 6px;
        color: var(--color-text-secondary);
        font-size: 9px;
        font-weight: 750;
      }
      .bulk-modal select,
      .bulk-modal input {
        width: 100%;
        height: 40px;
        padding: 0 11px;
        border: 1px solid var(--color-border);
        border-radius: 9px;
        outline: 0;
        background: var(--color-background);
        color: var(--color-text-primary);
        font: inherit;
      }
      .bulk-modal > footer {
        padding: 14px 22px 20px;
        border-top: 1px solid var(--color-border);
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      .bulk-modal footer button {
        min-height: 39px;
        padding: 0 14px;
        border: 1px solid var(--color-border);
        border-radius: 9px;
        background: var(--color-surface);
        color: var(--color-text-primary);
        font-weight: 750;
      }
      .bulk-modal footer .primary {
        border-color: var(--color-primary);
        background: var(--color-primary);
        color: #fff;
      }
      .bulk-modal footer .primary:disabled {
        opacity: 0.45;
      }
      @media (max-width: 900px) {
        .widgets {
          grid-template-columns: repeat(2, 1fr);
        }
        .heading {
          align-items: flex-start;
          flex-direction: column;
        }
        .table-card {
          height: auto;
        }
        .filter-row {
          grid-template-columns: 1fr;
        }
        .toolbar {
          flex-wrap: wrap;
        }
        .result-count {
          margin-left: 0;
        }
        .search {
          width: 100%;
        }
      }
      @media (max-width: 520px) {
        .widgets {
          grid-template-columns: 1fr;
        }
        .heading-actions {
          width: 100%;
          overflow-x: auto;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordList {
  readonly i18n = inject(LanguageService);
  readonly title = input.required<string>();
  readonly description = input('');
  readonly newLabel = input('Nuevo registro');
  readonly baseRoute = input.required<string>();
  readonly accent = input('#2563eb');
  readonly records = input.required<ReadonlyArray<RecordListRow>>();
  readonly columns = input.required<ReadonlyArray<RecordListColumn>>();
  readonly fields = input.required<ReadonlyArray<RecordListField>>();
  readonly widgets = input<ReadonlyArray<RecordListWidget>>([]);
  readonly rowActions = input<ReadonlyArray<RecordListAction>>([
    { id: 'view', label: 'Ver', icon: '↗' },
    { id: 'delete', label: 'Eliminar', icon: '⊘', danger: true },
  ]);
  readonly bulkActions = input<ReadonlyArray<RecordListAction>>([
    { id: 'edit', label: 'Editar', icon: '✎' },
    { id: 'export', label: 'Exportar', icon: '⇩' },
    { id: 'delete', label: 'Eliminar', icon: '⊘', danger: true },
  ]);
  readonly newRequested = output<void>();
  readonly rowAction = output<{ actionId: string; record: RecordListRow }>();
  readonly bulkAction = output<{
    actionId: string;
    records: ReadonlyArray<RecordListRow>;
    field?: string;
    value?: string;
  }>();
  readonly recordsImported = output<ReadonlyArray<RecordListRow>>();
  readonly query = signal('');
  readonly dense = signal(false);
  readonly filterPanel = signal(false);
  readonly filters = signal<ReadonlyArray<ActiveFilter>>([]);
  readonly selected = signal<ReadonlySet<string>>(new Set());
  readonly menuId = signal<string | null>(null);
  readonly bulkEditor = signal(false);
  readonly bulkField = signal('');
  readonly bulkValue = signal('');
  readonly page = signal(1);
  readonly pageSize = 8;
  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.records().filter(
      (row) =>
        (!q ||
          Object.values(row).some((v) =>
            String(v ?? '')
              .toLowerCase()
              .includes(q),
          )) &&
        this.filters().every((f) => this.matches(row, f)),
    );
  });
  readonly paginated = computed(() =>
    this.filtered().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize),
  );
  readonly pageStart = computed(() =>
    this.filtered().length ? (this.page() - 1) * this.pageSize + 1 : 0,
  );
  readonly pageEnd = computed(() => Math.min(this.page() * this.pageSize, this.filtered().length));
  readonly selectedCount = computed(() => this.selected().size);
  readonly allPageSelected = computed(
    () =>
      this.paginated().length > 0 && this.paginated().every((r) => this.isSelected(this.rowId(r))),
  );
  rowId(row: RecordListRow) {
    return String(row['id'] ?? '');
  }
  display(v: RecordListValue) {
    return String(v ?? '');
  }
  number(v: RecordListValue) {
    return Number(v) || 0;
  }
  dateValue(v: RecordListValue) {
    return String(v ?? '');
  }
  initials(v: RecordListValue) {
    return this.display(v)
      .split(/\s+/)
      .slice(0, 2)
      .map((x) => x[0])
      .join('')
      .toUpperCase();
  }
  statusLabel(v: RecordListValue) {
    return this.display(v)
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/^./, (x) => x.toUpperCase());
  }
  statusTone(v: RecordListValue) {
    const s = this.display(v).toUpperCase();
    if (/ACTIVE|PAID|RESOLVED|COMPLETED|QUALIFIED/.test(s)) return 'green';
    if (/OVERDUE|CANCEL|DAMAGED|SUSPEND|URGENT/.test(s)) return 'red';
    if (/PENDING|WAITING|MEDIUM|CONTACTED/.test(s)) return 'amber';
    return 'blue';
  }
  widgetIcon(t: string) {
    return (
      ({ green: '✓', amber: '!', red: '↑', violet: '◎', blue: '▦' } as Record<string, string>)[t] ||
      '▦'
    );
  }
  actionIcon(id: string) {
    return (
      (
        { edit: '✎', export: '⇩', delete: '⊘', convert: '✓', message: '✉', view: '↗' } as Record<
          string,
          string
        >
      )[id] || '•'
    );
  }
  fieldFor(key: string) {
    return this.fields().find((f) => f.key === key);
  }
  operatorsFor(key: string) {
    const type = this.fieldFor(key)?.type ?? 'text';
    if (type === 'number' || type === 'money')
      return [
        { id: 'eq', label: 'Igual a' },
        { id: 'gt', label: 'Mayor que' },
        { id: 'lt', label: 'Menor que' },
        { id: 'between', label: 'Entre' },
      ];
    if (type === 'date')
      return [
        { id: 'eq', label: 'En la fecha' },
        { id: 'before', label: 'Antes de' },
        { id: 'after', label: 'Después de' },
        { id: 'between', label: 'Entre' },
      ];
    if (type === 'select' || type === 'status' || type === 'boolean')
      return [
        { id: 'eq', label: 'Es' },
        { id: 'neq', label: 'No es' },
      ];
    return [
      { id: 'contains', label: 'Contiene' },
      { id: 'eq', label: 'Es igual a' },
      { id: 'starts', label: 'Comienza con' },
      { id: 'empty', label: 'Está vacío' },
    ];
  }
  filterOptions(field: RecordListField) {
    return field.type === 'boolean'
      ? [
          { value: 'true', label: 'Sí' },
          { value: 'false', label: 'No' },
        ]
      : (field.options ?? []).map((v) => ({ value: v, label: this.statusLabel(v) }));
  }
  addFilter() {
    const first = this.fields()[0];
    this.filters.update((v) => [
      ...v,
      {
        id: `filter-${Date.now()}-${v.length}`,
        field: first?.key ?? '',
        operator: this.operatorsFor(first?.key ?? '')[0].id,
        value: '',
        secondValue: '',
      },
    ]);
  }
  removeFilter(id: string) {
    this.filters.update((v) => v.filter((f) => f.id !== id));
    this.page.set(1);
  }
  clearFilters() {
    this.filters.set([]);
    this.query.set('');
    this.page.set(1);
  }
  changeFilterField(id: string, field: string) {
    this.filters.update((v) =>
      v.map((f) =>
        f.id === id
          ? { ...f, field, operator: this.operatorsFor(field)[0].id, value: '', secondValue: '' }
          : f,
      ),
    );
  }
  updateFilter(id: string, key: 'operator' | 'value' | 'secondValue', value: string) {
    this.filters.update((v) => v.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
    this.page.set(1);
  }
  private matches(row: RecordListRow, f: ActiveFilter) {
    const field = this.fieldFor(f.field);
    if (!field) return true;
    const raw = row[f.field];
    const actual = String(raw ?? '').toLowerCase();
    const expected = f.value.toLowerCase();
    if (f.operator === 'empty') return !actual;
    if (!expected) return true;
    if (field.type === 'number' || field.type === 'money') {
      const a = Number(raw),
        b = Number(f.value),
        c = Number(f.secondValue);
      return f.operator === 'gt'
        ? a > b
        : f.operator === 'lt'
          ? a < b
          : f.operator === 'between'
            ? a >= b && a <= c
            : a === b;
    }
    if (field.type === 'date') {
      const a = new Date(String(raw)).getTime(),
        b = new Date(f.value).getTime(),
        c = new Date(f.secondValue).getTime();
      return f.operator === 'before'
        ? a < b
        : f.operator === 'after'
          ? a > b
          : f.operator === 'between'
            ? a >= b && a <= c
            : a === b;
    }
    return f.operator === 'neq'
      ? actual !== expected
      : f.operator === 'eq'
        ? actual === expected
        : f.operator === 'starts'
          ? actual.startsWith(expected)
          : actual.includes(expected);
  }
  isSelected(id: string) {
    return this.selected().has(id);
  }
  toggleSelection(id: string) {
    this.selected.update((v) => {
      const n = new Set(v);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  togglePageSelection() {
    const add = !this.allPageSelected();
    this.selected.update((v) => {
      const n = new Set(v);
      this.paginated().forEach((r) => (add ? n.add(this.rowId(r)) : n.delete(this.rowId(r))));
      return n;
    });
  }
  clearSelection() {
    this.selected.set(new Set());
  }
  selectedRows() {
    return this.records().filter((r) => this.selected().has(this.rowId(r)));
  }
  editableFields() {
    return this.fields().filter((field) => field.type !== 'lookup');
  }
  runBulkAction(id: string) {
    const rows = this.selectedRows();
    if (id === 'export') this.exportRows(rows, 'seleccionados');
    else if (id === 'edit') {
      this.bulkField.set(this.editableFields()[0]?.key ?? '');
      this.bulkValue.set('');
      this.bulkEditor.set(true);
      return;
    } else this.bulkAction.emit({ actionId: id, records: rows });
    if (id !== 'edit') this.clearSelection();
  }
  applyBulkEdit() {
    const field = this.bulkField();
    const value = this.bulkValue();
    if (!field || !value) return;
    this.bulkAction.emit({ actionId: 'edit', records: this.selectedRows(), field, value });
    this.bulkEditor.set(false);
    this.clearSelection();
  }
  toggleMenu(e: MouseEvent, id: string) {
    e.stopPropagation();
    this.menuId.set(this.menuId() === id ? null : id);
  }
  runRowAction(id: string, record: RecordListRow) {
    this.rowAction.emit({ actionId: id, record });
    this.menuId.set(null);
  }
  @HostListener('document:click') closeMenu() {
    this.menuId.set(null);
  }
  exportRows(rows: ReadonlyArray<RecordListRow>, suffix: string) {
    const cols = this.columns();
    const csv = [
      cols.map((c) => this.csv(c.label)).join(','),
      ...rows.map((r) => cols.map((c) => this.csv(String(r[c.key] ?? ''))).join(',')),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.title().toLowerCase().replaceAll(' ', '-')}${suffix ? '-' + suffix : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  private csv(v: string) {
    return `"${v.replaceAll('"', '""')}"`;
  }
  async importCsv(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const lines = (await file.text()).split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return;
    const headers = this.parseLine(lines[0]);
    const rows = lines.slice(1).map((line) => {
      const values = this.parseLine(line);
      return Object.fromEntries(
        headers.map((h, i) => {
          const field = this.fields().find((f) => f.key === h || f.label === h);
          return [field?.key ?? h, values[i] ?? ''];
        }),
      ) as RecordListRow;
    });
    this.recordsImported.emit(rows);
  }
  private parseLine(line: string) {
    const result: string[] = [];
    let current = '',
      quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') quoted = !quoted;
      else if (ch === ',' && !quoted) {
        result.push(current);
        current = '';
      } else current += ch;
    }
    result.push(current);
    return result;
  }
}
