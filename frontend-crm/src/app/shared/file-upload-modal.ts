import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  output,
  signal,
} from '@angular/core';
import { CrmAttachment } from '../core/models/customer';

@Component({
  selector: 'app-file-upload-modal',
  templateUrl: './file-upload-modal.html',
  styleUrl: './file-upload-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileUploadModal implements OnDestroy {
  readonly closed = output<void>();
  readonly filesUploaded = output<ReadonlyArray<CrmAttachment>>();
  readonly items = signal<ReadonlyArray<CrmAttachment>>([]);
  readonly dragging = signal(false);
  readonly error = signal('');

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.selectFiles(event.dataTransfer?.files ?? null);
  }
  selectFiles(files: FileList | null): void {
    if (!files?.length) return;
    const selected: CrmAttachment[] = [];
    const availableSlots = 8 - this.items().length;
    this.error.set('');
    if (!availableSlots) {
      this.error.set('Puedes cargar un máximo de 8 archivos a la vez.');
      return;
    }
    for (const file of Array.from(files).slice(0, availableSlots)) {
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
    if (files.length > availableSlots)
      this.error.set(`Solo se agregaron ${availableSlots} archivo(s); el límite es 8.`);
    this.items.update((items) => [...items, ...selected]);
  }
  remove(id: string): void {
    const file = this.items().find((item) => item.id === id);
    if (file?.url.startsWith('blob:')) URL.revokeObjectURL(file.url);
    this.items.update((items) => items.filter((item) => item.id !== id));
  }
  upload(): void {
    if (!this.items().length) return;
    this.filesUploaded.emit(this.items());
    this.items.set([]);
    this.closed.emit();
  }
  cancel(): void {
    this.revokePending();
    this.closed.emit();
  }
  extension(name: string): string {
    return name.split('.').pop()?.slice(0, 4).toUpperCase() || 'FILE';
  }
  formatSize(size: number): string {
    return size < 1024 * 1024
      ? `${Math.ceil(size / 1024)} KB`
      : `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
  @HostListener('document:keydown.escape')
  closeWithKeyboard(): void {
    this.cancel();
  }
  ngOnDestroy(): void {
    this.revokePending();
  }
  private revokePending(): void {
    this.items().forEach((file) => file.url.startsWith('blob:') && URL.revokeObjectURL(file.url));
    this.items.set([]);
  }
}
