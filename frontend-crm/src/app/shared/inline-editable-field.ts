import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-inline-editable-field',
  templateUrl: './inline-editable-field.html',
  styleUrl: './inline-editable-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InlineEditableField {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly displayValue = input('');
  readonly href = input('');
  readonly type = input<'text' | 'email' | 'tel' | 'date'>('text');
  readonly valueSaved = output<string>();
  readonly editing = signal(false);
  readonly draft = signal('');

  startEditing(): void {
    this.draft.set(this.type() === 'date' ? this.value().slice(0, 10) : this.value());
    this.editing.set(true);
  }
  cancel(): void {
    this.editing.set(false);
    this.draft.set('');
  }
  save(): void {
    const value = this.draft().trim();
    if (!value) return;
    if (value !== this.value()) this.valueSaved.emit(value);
    this.cancel();
  }
}
