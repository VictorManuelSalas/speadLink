import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FieldValidatorService, ValidationConfig } from '../core/services/field-validator.service';

@Component({
  selector: 'app-inline-editable-field',
  templateUrl: './inline-editable-field.html',
  styleUrl: './inline-editable-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InlineEditableField {
  private readonly validator = inject(FieldValidatorService);

  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly displayValue = input('');
  readonly href = input('');
  readonly type = input<'text' | 'email' | 'tel' | 'date'>('text');
  readonly validationConfig = input<ValidationConfig | null>(null);
  readonly valueSaved = output<string>();
  readonly editing = signal(false);
  readonly draft = signal('');
  readonly validationError = signal('');

  startEditing(): void {
    this.draft.set(this.type() === 'date' ? this.value().slice(0, 10) : this.value());
    this.validationError.set('');
    this.editing.set(true);
  }

  cancel(): void {
    this.editing.set(false);
    this.draft.set('');
    this.validationError.set('');
  }

  onDraftChange(newValue: string): void {
    this.draft.set(newValue);
    this.validateDraft();
  }

  private validateDraft(): void {
    const value = this.draft().trim();
    if (!value && !this.validationConfig()?.required) {
      this.validationError.set('');
      return;
    }

    const config = this.getValidationConfig();
    const result = this.validator.validateField(value, config);

    if (!result.valid) {
      this.validationError.set(result.error || 'Campo inválido');
    } else {
      this.validationError.set('');
    }
  }

  private getValidationConfig(): ValidationConfig {
    const providedConfig = this.validationConfig();
    if (providedConfig) {
      return providedConfig;
    }

    // Infer from type
    return this.validator.getValidationConfig(this.label(), this.mapTypeToFieldType(), {
      required: false,
    });
  }

  private mapTypeToFieldType(): 'text' | 'number' | 'date' | 'select' {
    const type = this.type();
    if (type === 'date') return 'date';
    if (type === 'email') return 'text'; // Will be inferred as email by validator
    if (type === 'tel') return 'text'; // Will be inferred as phone by validator
    return 'text';
  }

  isValidForSave(): boolean {
    return !this.validationError();
  }

  save(): void {
    const value = this.draft().trim();
    if (!value) return;

    this.validateDraft();
    if (!this.isValidForSave()) return;

    if (value !== this.value()) this.valueSaved.emit(value);
    this.cancel();
  }
}
