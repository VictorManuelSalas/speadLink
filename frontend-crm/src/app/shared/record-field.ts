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
  templateUrl: './record-field.html',
  styleUrl: './record-field.scss',
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
