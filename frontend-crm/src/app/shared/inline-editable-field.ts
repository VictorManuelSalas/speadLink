import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-inline-editable-field',
  template: `
    <div class="editable-field" [class.is-editing]="editing()">
      <span class="editable-field__label">{{ label() }}</span>
      @if (editing()) {
        <div class="editable-field__editor">
          <input
            #editor
            [type]="type()"
            [value]="draft()"
            (input)="draft.set(editor.value)"
            (keydown.enter)="save()"
            (keydown.escape)="cancel()"
          />
          <button
            type="button"
            class="save"
            aria-label="Guardar"
            [disabled]="!draft().trim()"
            (click)="save()"
          >
            ✓
          </button>
          <button type="button" aria-label="Cancelar" (click)="cancel()">×</button>
        </div>
      } @else {
        <div class="editable-field__value">
          @if (href()) {
            <a [href]="href()"
              ><b>{{ displayValue() || value() }}</b></a
            >
          } @else {
            <b>{{ displayValue() || value() }}</b>
          }
          <button type="button" aria-label="Editar {{ label() }}" (click)="startEditing()">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20ZM14 7l3 3" />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .editable-field {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .editable-field__label {
        color: var(--color-text-secondary);
        font-size: 11px;
      }
      .editable-field__value {
        min-height: 30px;
        display: flex;
        flex-direction: row !important;
        align-items: center;
        justify-content: flex-start;
        gap: 8px;
        text-align: left;
      }
      .editable-field__value b {
        overflow: hidden;
        color: var(--color-text-primary);
        font-size: 12.5px;
        text-overflow: ellipsis;
      }
      .editable-field__value a {
        min-width: 0;
        color: var(--color-primary);
        text-decoration: none;
      }
      .editable-field__value a:hover {
        text-decoration: underline;
      }
      button {
        width: 28px;
        height: 28px;
        flex: 0 0 28px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: var(--color-text-secondary);
        display: grid;
        place-items: center;
        opacity: 0;
      }
      .editable-field:hover .editable-field__value button,
      .editable-field__value button:focus-visible {
        opacity: 1;
      }
      button:hover {
        background: var(--color-muted);
        color: var(--color-primary);
      }
      svg {
        width: 15px;
        height: 15px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .editable-field__editor {
        min-height: 30px;
        display: flex;
        flex-direction: row !important;
        align-items: center;
        gap: 5px;
      }
      input {
        width: 100%;
        min-width: 0;
        height: 32px;
        padding: 0 9px;
        border: 1px solid #93c5fd;
        border-radius: 7px;
        outline: 0;
        background: var(--color-surface);
        color: var(--color-text-primary);
        font: inherit;
        font-size: 12px;
      }
      input:focus {
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
      }
      .editable-field__editor button {
        opacity: 1;
      }
      .editable-field__editor .save {
        background: var(--color-primary);
        color: #fff;
      }
      button:disabled {
        cursor: not-allowed;
        opacity: 0.45;
      }
      @media (hover: none) {
        .editable-field__value button {
          opacity: 1;
        }
      }
    `,
  ],
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
