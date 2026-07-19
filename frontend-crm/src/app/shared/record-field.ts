import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { LanguageService } from '../core/i18n/language.service';
import { RouterLink } from '@angular/router';
import { GpsLocationPicker } from './gps-location-picker';
import { InlineEditableDateField } from './inline-editable-date-field';
import { InlineEditableField } from './inline-editable-field';

export interface RecordLookupPreview {
  readonly type: string;
  readonly title: string;
  readonly detail: string;
  readonly initials: string;
}
export interface RecordAuditUser {
  readonly id?: string;
  readonly fullName: string;
  readonly email: string;
  readonly initials: string;
}
export interface RecordFieldConfig {
  readonly key: string;
  readonly label: string;
  readonly kind:
    | 'text'
    | 'email'
    | 'phone'
    | 'date'
    | 'money'
    | 'select'
    | 'status'
    | 'lookup'
    | 'gps'
    | 'audit';
  readonly editable?: boolean;
  readonly options?: ReadonlyArray<string>;
  readonly href?: string;
  readonly displayValue?: string;
  readonly route?: string | readonly unknown[];
  readonly preview?: RecordLookupPreview;
  readonly auditUser?: RecordAuditUser;
  readonly statusLabel?: string;
  readonly statusTone?: string;
}

@Component({
  selector: 'app-record-field',
  imports: [
    CurrencyPipe,
    DatePipe,
    GpsLocationPicker,
    InlineEditableDateField,
    InlineEditableField,
    RouterLink,
  ],
  template: `
    @switch (config().kind) {
      @case ('gps') {
        <app-gps-location-picker [value]="value()" (locationSaved)="valueSaved.emit($event)" />
      }
      @case ('date') {
        @if (config().editable) {
          <app-inline-editable-date-field
            [label]="config().label"
            [value]="value()"
            (valueSaved)="valueSaved.emit($event)"
          />
        } @else {
          <div class="field">
            <span>{{ config().label }}</span
            ><b>{{ value() | date: 'dd MMM y, HH:mm' }}</b>
          </div>
        }
      }
      @case ('select') {
        @if (editing()) {
          <div class="field">
            <span>{{ config().label }}</span>
            <div class="editor">
              <select #choice [value]="value()">
                @for (option of config().options ?? []; track option) {
                  <option [value]="option">{{ option }}</option>
                }</select
              ><button class="save" type="button" (click)="save(choice.value)">✓</button
              ><button type="button" (click)="editing.set(false)">×</button>
            </div>
          </div>
        } @else {
          <div class="field">
            <span>{{ config().label }}</span>
            <div class="value">
              <b>{{ config().displayValue || value() || '—' }}</b>
              @if (config().editable) {
                <button class="edit" type="button" (click)="editing.set(true)">
                  {{ editIcon }}
                </button>
              }
            </div>
          </div>
        }
      }
      @case ('status') {
        @if (editing()) {
          <div class="field">
            <span>{{ config().label }}</span>
            <div class="editor">
              <select #status [value]="value()">
                @for (option of config().options ?? []; track option) {
                  <option [value]="option">{{ option }}</option>
                }</select
              ><button class="save" type="button" (click)="save(status.value)">✓</button
              ><button type="button" (click)="editing.set(false)">×</button>
            </div>
          </div>
        } @else {
          <div class="field">
            <span>{{ config().label }}</span>
            <div class="value">
              <em class="status {{ config().statusTone }}"
                ><i></i>{{ config().statusLabel || value() }}</em
              >
              @if (config().editable) {
                <button class="edit" type="button" (click)="editing.set(true)">
                  {{ editIcon }}
                </button>
              }
            </div>
          </div>
        }
      }
      @case ('lookup') {
        <div class="field lookup">
          <span>{{ config().label }}</span
          ><a [routerLink]="config().route"
            ><b>{{ config().displayValue || value() || '—' }}</b
            ><i>↗</i>
            @if (config().preview; as preview) {
              <aside>
                <span>{{ preview.initials }}</span>
                <div>
                  <small>{{ preview.type }}</small
                  ><b>{{ preview.title }}</b
                  ><em>{{ preview.detail }}</em>
                </div>
              </aside>
            }
          </a>
        </div>
      }
      @case ('audit') {
        <div class="field">
          <span>{{ config().label }}</span>
          <div class="audit">
            <b>{{ value() | date: 'dd MMM y, HH:mm' }}</b
            ><i></i>
            @if (config().auditUser; as user) {
              <a [routerLink]="user.id ? ['/users', user.id] : null"
                ><span>{{ user.initials }}</span
                ><b>{{ user.fullName }}</b>
                <aside>
                  <span>{{ user.initials }}</span>
                  <div>
                    <b>{{ user.fullName }}</b
                    ><small>{{ user.email }}</small>
                  </div>
                </aside></a
              >
            }
          </div>
        </div>
      }
      @case ('money') {
        <div class="field">
          <span>{{ config().label }}</span
          ><b>{{ numberValue() | currency: 'MXN' : 'symbol-narrow' : '1.0-2' : i18n.locale() }}</b>
        </div>
      }
      @default {
        @if (config().editable) {
          <app-inline-editable-field
            [label]="config().label"
            [type]="inputType()"
            [value]="value()"
            [displayValue]="config().displayValue || ''"
            [href]="config().href || automaticHref()"
            (valueSaved)="valueSaved.emit($event)"
          />
        } @else {
          <div class="field">
            <span>{{ config().label }}</span>
            @if (config().href || automaticHref()) {
              <a class="direct" [href]="config().href || automaticHref()"
                ><b>{{ config().displayValue || value() || '—' }}</b></a
              >
            } @else {
              <b>{{ config().displayValue || value() || '—' }}</b>
            }
          </div>
        }
      }
    }
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .field {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 7px;
      }
      .field > span {
        color: var(--color-text-secondary);
        font-size: 11px;
      }
      .field > b,
      .value > b {
        overflow: hidden;
        color: var(--color-text-primary);
        font-size: 12.5px;
        text-overflow: ellipsis;
      }
      .value {
        min-height: 30px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .edit,
      .editor button {
        width: 28px;
        height: 28px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: var(--color-text-secondary);
        opacity: 0;
      }
      .field:hover .edit {
        opacity: 1;
      }
      .edit:hover,
      .editor button:hover {
        background: var(--color-muted);
        color: var(--color-primary);
      }
      .editor {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .editor select {
        width: 100%;
        height: 32px;
        padding: 0 9px;
        border: 1px solid #93c5fd;
        border-radius: 7px;
        background: var(--color-surface);
        color: var(--color-text-primary);
        font: inherit;
        font-size: 11px;
      }
      .editor button {
        opacity: 1;
      }
      .editor .save {
        background: var(--color-primary);
        color: #fff;
      }
      .status {
        padding: 5px 9px;
        border-radius: 999px;
        background: #dbeafe;
        color: #2563eb;
        font-size: 9px;
        font-style: normal;
        font-weight: 800;
      }
      .status i {
        display: inline-block;
        width: 6px;
        height: 6px;
        margin-right: 6px;
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
      .lookup > a,
      .direct {
        position: relative;
        width: max-content;
        max-width: 100%;
        color: var(--color-primary);
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 7px;
      }
      .lookup > a aside,
      .audit a aside {
        position: absolute;
        left: 0;
        bottom: calc(100% + 8px);
        z-index: 30;
        width: 245px;
        padding: 12px;
        border: 1px solid var(--color-border);
        border-radius: 11px;
        background: var(--color-surface);
        box-shadow: 0 15px 35px #0f172a2c;
        display: none;
        align-items: center;
        gap: 10px;
      }
      .lookup > a:hover aside,
      .audit a:hover aside {
        display: flex;
      }
      .lookup aside > span,
      .audit a > span,
      .audit aside > span {
        width: 34px;
        height: 34px;
        flex: 0 0 34px;
        border-radius: 50%;
        background: #dbeafe;
        color: #2563eb;
        display: grid;
        place-items: center;
        font-size: 9px;
        font-weight: 800;
      }
      .lookup aside div,
      .audit aside div {
        display: flex;
        flex-direction: column;
      }
      .lookup aside small,
      .lookup aside em,
      .audit aside small {
        color: var(--color-text-secondary);
        font-size: 9px;
        font-style: normal;
      }
      .audit {
        display: flex;
        align-items: center;
        gap: 9px;
      }
      .audit > i {
        width: 1px;
        height: 24px;
        background: var(--color-border);
      }
      .audit > a {
        position: relative;
        color: var(--color-text-primary);
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 7px;
      }
      .audit a > span {
        width: 30px;
        height: 30px;
        flex-basis: 30px;
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
export class RecordField {
  readonly i18n = inject(LanguageService);
  readonly config = input.required<RecordFieldConfig>();
  readonly value = input.required<string>();
  readonly valueSaved = output<string>();
  readonly editing = signal(false);
  readonly editIcon = '✎';
  save(value: string) {
    this.valueSaved.emit(value);
    this.editing.set(false);
  }
  numberValue() {
    return Number(this.value()) || 0;
  }
  inputType() {
    return this.config().kind === 'email'
      ? 'email'
      : this.config().kind === 'phone'
        ? 'tel'
        : 'text';
  }
  automaticHref() {
    return this.config().kind === 'email'
      ? `mailto:${this.value()}`
      : this.config().kind === 'phone'
        ? `tel:${this.value()}`
        : '';
  }
}
