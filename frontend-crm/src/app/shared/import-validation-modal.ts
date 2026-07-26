import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { read, utils } from 'xlsx';
import { RecordListField, RecordListValue } from './record-list';

export type ImportMode = 'insert' | 'update' | 'upsert';

export interface ImportRowError {
  readonly row: number;
  readonly field: string;
  readonly message: string;
}

export interface ImportValidationResult {
  readonly mode: ImportMode;
  readonly identifierKey: string;
  readonly rows: ReadonlyArray<Readonly<Record<string, RecordListValue>>>;
}

type Step = 'upload' | 'configure' | 'result';

const MAX_PREVIEW_ERRORS = 30;

@Component({
  selector: 'app-import-validation-modal',
  templateUrl: './import-validation-modal.html',
  styleUrl: './import-validation-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportValidationModal {
  readonly fields = input.required<ReadonlyArray<RecordListField>>();
  readonly closed = output<void>();
  readonly imported = output<ImportValidationResult>();

  readonly step = signal<Step>('upload');
  readonly dragging = signal(false);
  readonly fileName = signal('');
  readonly fileError = signal('');
  readonly headers = signal<ReadonlyArray<string>>([]);
  readonly dataRows = signal<ReadonlyArray<ReadonlyArray<string>>>([]);
  readonly mode = signal<ImportMode>('insert');
  readonly identifierKey = signal('');
  readonly columnMap = signal<Readonly<Record<string, string>>>({});
  readonly validating = signal(false);
  readonly validated = signal(false);
  readonly errors = signal<ReadonlyArray<ImportRowError>>([]);
  readonly validRowCount = signal(0);
  private validatedRows: ReadonlyArray<Readonly<Record<string, RecordListValue>>> = [];

  readonly needsIdentifier = computed(() => this.mode() !== 'insert');
  readonly mappedFieldKeys = computed(() => new Set(Object.values(this.columnMap()).filter(Boolean)));
  readonly canValidate = computed(() => {
    if (!this.headers().length || !this.dataRows().length) return false;
    if (this.needsIdentifier() && !this.identifierKey()) return false;
    return this.fields()
      .filter((field) => field.required)
      .every((field) => this.mappedFieldKeys().has(field.key));
  });
  readonly errorPreview = computed(() => this.errors().slice(0, MAX_PREVIEW_ERRORS));
  readonly hiddenErrorCount = computed(() => Math.max(0, this.errors().length - MAX_PREVIEW_ERRORS));

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }
  onDragLeave(): void {
    this.dragging.set(false);
  }
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.handleFiles(event.dataTransfer?.files ?? null);
  }
  async handleFiles(files: FileList | null): Promise<void> {
    const file = files?.[0];
    if (!file) return;
    this.fileError.set('');
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['csv', 'xlsx'].includes(extension)) {
      this.fileError.set('Solo se aceptan archivos .csv o .xlsx.');
      return;
    }
    try {
      const { headers, rows } =
        extension === 'csv' ? await this.parseCsv(file) : await this.parseXlsx(file);
      if (!headers.length || !rows.length) {
        this.fileError.set('El archivo no contiene datos para importar.');
        return;
      }
      this.fileName.set(file.name);
      this.headers.set(headers);
      this.dataRows.set(rows);
      this.columnMap.set(this.autoMapColumns(headers));
      this.mode.set('insert');
      this.identifierKey.set('');
      this.validated.set(false);
      this.errors.set([]);
      this.validRowCount.set(0);
      this.step.set('configure');
    } catch {
      this.fileError.set('No se pudo leer el archivo. Verifica que no esté dañado.');
    }
  }
  private async parseCsv(
    file: File,
  ): Promise<{ headers: ReadonlyArray<string>; rows: ReadonlyArray<ReadonlyArray<string>> }> {
    const lines = (await file.text()).split(/\r?\n/).filter((line) => line.length > 0);
    if (lines.length < 2) return { headers: [], rows: [] };
    const headers = this.parseCsvLine(lines[0]);
    const rows = lines.slice(1).map((line) => this.parseCsvLine(line));
    return { headers, rows };
  }
  private parseCsvLine(line: string): ReadonlyArray<string> {
    const result: string[] = [];
    let current = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') quoted = !quoted;
      else if (ch === ',' && !quoted) {
        result.push(current.trim());
        current = '';
      } else current += ch;
    }
    result.push(current.trim());
    return result;
  }
  private async parseXlsx(
    file: File,
  ): Promise<{ headers: ReadonlyArray<string>; rows: ReadonlyArray<ReadonlyArray<string>> }> {
    const buffer = await file.arrayBuffer();
    const workbook = read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const matrix = utils.sheet_to_json<string[]>(sheet, { header: 1, blankrows: false });
    if (matrix.length < 2) return { headers: [], rows: [] };
    const headers = matrix[0].map((value) => String(value ?? '').trim());
    const rows = matrix
      .slice(1)
      .map((row) => headers.map((_, index) => String(row[index] ?? '').trim()));
    return { headers, rows };
  }
  private autoMapColumns(headers: ReadonlyArray<string>): Record<string, string> {
    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
    const map: Record<string, string> = {};
    for (const header of headers) {
      const normalized = normalize(header);
      const match = this.fields().find(
        (field) => normalize(field.key) === normalized || normalize(field.label) === normalized,
      );
      map[header] = match?.key ?? '';
    }
    return map;
  }
  setMode(mode: ImportMode): void {
    this.mode.set(mode);
    if (mode === 'insert') this.identifierKey.set('');
    this.validated.set(false);
  }
  setIdentifierKey(key: string): void {
    this.identifierKey.set(key);
    this.validated.set(false);
  }
  setColumnMapping(header: string, fieldKey: string): void {
    this.columnMap.update((map) => ({ ...map, [header]: fieldKey }));
    this.validated.set(false);
  }
  backToUpload(): void {
    this.step.set('upload');
    this.fileName.set('');
    this.headers.set([]);
    this.dataRows.set([]);
    this.validated.set(false);
    this.errors.set([]);
  }
  validate(): void {
    if (!this.canValidate()) return;
    this.validating.set(true);
    this.validated.set(false);
    window.setTimeout(() => {
      const { errors, rows } = this.runValidation();
      this.errors.set(errors);
      this.validatedRows = rows;
      this.validRowCount.set(rows.length);
      this.validating.set(false);
      this.validated.set(true);
      this.step.set('result');
    }, 700);
  }
  private runValidation(): {
    errors: ReadonlyArray<ImportRowError>;
    rows: ReadonlyArray<Readonly<Record<string, RecordListValue>>>;
  } {
    const headers = this.headers();
    const map = this.columnMap();
    const mode = this.mode();
    const identifierKey = this.identifierKey();
    const fieldsByKey = new Map(this.fields().map((field) => [field.key, field]));
    const errors: ImportRowError[] = [];
    const rows: Record<string, RecordListValue>[] = [];
    const seenIdentifiers = new Set<string>();

    this.dataRows().forEach((values, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const record: Record<string, RecordListValue> = {};
      headers.forEach((header, columnIndex) => {
        const fieldKey = map[header];
        if (fieldKey) record[fieldKey] = values[columnIndex] ?? '';
      });

      for (const field of this.fields()) {
        if (!field.required) continue;
        const value = record[field.key];
        if (value === undefined || value === null || String(value).trim() === '') {
          errors.push({ row: rowNumber, field: field.label, message: 'Es un campo obligatorio.' });
        }
      }
      for (const [key, value] of Object.entries(record)) {
        const field = fieldsByKey.get(key);
        if (!field || value === '') continue;
        if (field.type === 'number' || field.type === 'money') {
          if (Number.isNaN(Number(value)))
            errors.push({ row: rowNumber, field: field.label, message: `"${value}" no es un número válido.` });
        } else if (field.type === 'date') {
          if (Number.isNaN(new Date(String(value)).getTime()))
            errors.push({ row: rowNumber, field: field.label, message: `"${value}" no es una fecha válida.` });
        } else if ((field.type === 'select' || field.type === 'status') && field.options?.length) {
          if (!field.options.includes(String(value)))
            errors.push({
              row: rowNumber,
              field: field.label,
              message: `"${value}" no es una opción válida (${field.options.join(', ')}).`,
            });
        }
      }
      if (mode !== 'insert') {
        const identifierValue = String(record[identifierKey] ?? '').trim();
        const identifierLabel = fieldsByKey.get(identifierKey)?.label ?? identifierKey;
        if (!identifierValue) {
          errors.push({
            row: rowNumber,
            field: identifierLabel,
            message: 'Se requiere para actualizar o hacer upsert.',
          });
        } else if (seenIdentifiers.has(identifierValue)) {
          errors.push({
            row: rowNumber,
            field: identifierLabel,
            message: `El valor "${identifierValue}" está repetido en el archivo.`,
          });
        } else {
          seenIdentifiers.add(identifierValue);
        }
      }
      rows.push(record);
    });
    return { errors, rows };
  }
  confirmImport(): void {
    if (!this.validated() || this.errors().length) return;
    this.imported.emit({
      mode: this.mode(),
      identifierKey: this.identifierKey(),
      rows: this.validatedRows,
    });
    this.close();
  }
  cancel(): void {
    this.close();
  }
  private close(): void {
    this.step.set('upload');
    this.fileName.set('');
    this.fileError.set('');
    this.headers.set([]);
    this.dataRows.set([]);
    this.mode.set('insert');
    this.identifierKey.set('');
    this.columnMap.set({});
    this.validating.set(false);
    this.validated.set(false);
    this.errors.set([]);
    this.validRowCount.set(0);
    this.validatedRows = [];
    this.closed.emit();
  }
  @HostListener('document:keydown.escape')
  closeWithKeyboard(): void {
    this.cancel();
  }
}
