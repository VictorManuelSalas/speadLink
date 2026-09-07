import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { CrmAttachment } from '../core/models/customer';

@Component({
  selector: 'app-attachment-picker',
  templateUrl: './attachment-picker.html',
  styleUrl: './attachment-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttachmentPicker implements OnDestroy {
  readonly label = input('Adjuntar fotos o archivos');
  readonly resetKey = input(0);
  /** Archivos ya adjuntos al abrir (p. ej. un PDF generado por el CRM). */
  readonly initial = input<ReadonlyArray<CrmAttachment>>([]);
  readonly preserveUrls = input(true);
  readonly attachmentsChange = output<ReadonlyArray<CrmAttachment>>();
  readonly items = signal<ReadonlyArray<CrmAttachment>>([]);
  readonly error = signal('');

  constructor() {
    effect(() => {
      this.resetKey();
      const initial = this.initial();
      untracked(() => {
        this.clear(!this.preserveUrls());
        // Se repuebla tras limpiar: si no, el reset dejaría fuera lo precargado.
        if (initial.length) {
          this.items.set([...initial]);
          this.attachmentsChange.emit(this.items());
        }
      });
    });
  }

  selectFiles(files: FileList | null): void {
    if (!files?.length) return;
    const selected: CrmAttachment[] = [];
    this.error.set('');
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        this.error.set(`“${file.name}” supera el límite de 10 MB.`);
        continue;
      }
      selected.push({
        id: `attachment-${Date.now()}-${crypto.randomUUID?.() ?? Math.random()}`,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        url: URL.createObjectURL(file),
        createdAt: new Date().toISOString(),
      });
    }
    this.items.update((items) => [...items, ...selected].slice(0, 8));
    this.attachmentsChange.emit(this.items());
  }

  remove(id: string): void {
    const item = this.items().find((attachment) => attachment.id === id);
    if (item?.url.startsWith('blob:')) URL.revokeObjectURL(item.url);
    this.items.update((items) => items.filter((attachment) => attachment.id !== id));
    this.attachmentsChange.emit(this.items());
  }

  extension(fileName: string): string {
    return fileName.split('.').pop()?.slice(0, 4) || 'FILE';
  }

  formatSize(size: number): string {
    return size < 1024 * 1024
      ? `${Math.ceil(size / 1024)} KB`
      : `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  ngOnDestroy(): void {
    this.clear(!this.preserveUrls());
  }

  private clear(revokeUrls = true): void {
    if (revokeUrls)
      this.items().forEach((item) => item.url.startsWith('blob:') && URL.revokeObjectURL(item.url));
    this.items.set([]);
    this.error.set('');
  }
}
