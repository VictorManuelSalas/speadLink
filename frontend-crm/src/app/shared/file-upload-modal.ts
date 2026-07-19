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
  template: `
    <button class="upload-backdrop" type="button" aria-label="Cerrar" (click)="cancel()"></button>
    <section class="upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-title">
      <header>
        <div>
          <span>ARCHIVOS</span>
          <h2 id="upload-title">Subir archivos</h2>
          <p>Agrega documentos o arrástralos a la zona de carga.</p>
        </div>
        <button type="button" aria-label="Cerrar" (click)="cancel()">×</button>
      </header>
      <div class="upload-content">
        <input
          #fileInput
          hidden
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
          (change)="selectFiles(fileInput.files); fileInput.value = ''"
        />
        <button
          class="drop-zone"
          type="button"
          [class.is-dragging]="dragging()"
          (click)="fileInput.click()"
          (dragover)="onDragOver($event)"
          (dragleave)="dragging.set(false)"
          (drop)="onDrop($event)"
        >
          <span>⇧</span><b>Arrastra tus archivos aquí</b>
          <p>o haz clic para seleccionarlos</p>
          <small>PDF, imágenes, Office, CSV, TXT o ZIP · máximo 10 MB</small>
        </button>
        @if (error()) {
          <p class="upload-error">{{ error() }}</p>
        }
        @if (items().length) {
          <div class="upload-previews">
            <header>
              <b>Archivos seleccionados</b><span>{{ items().length }}/8</span>
            </header>
            @for (file of items(); track file.id) {
              <article>
                @if (file.mimeType.startsWith('image/')) {
                  <img [src]="file.url" [alt]="file.fileName" />
                } @else {
                  <span class="document-preview">{{ extension(file.fileName) }}</span>
                }
                <span
                  ><b>{{ file.fileName }}</b
                  ><small>{{ formatSize(file.size) }}</small></span
                ><button type="button" aria-label="Quitar archivo" (click)="remove(file.id)">
                  ×
                </button>
              </article>
            }
          </div>
        }
      </div>
      <footer>
        <button class="button" type="button" (click)="cancel()">Cancelar</button
        ><button
          class="button button--primary"
          type="button"
          [disabled]="!items().length"
          (click)="upload()"
        >
          Subir {{ items().length }} archivo(s)
        </button>
      </footer>
    </section>
  `,
  styles: [
    `
      .upload-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1100;
        border: 0;
        background: rgba(15, 23, 42, 0.55);
        backdrop-filter: blur(3px);
      }
      .upload-modal {
        position: fixed;
        left: 50%;
        top: 50%;
        z-index: 1101;
        width: min(650px, calc(100vw - 28px));
        max-height: calc(100vh - 28px);
        overflow-y: auto;
        border: 1px solid var(--color-border);
        border-radius: 16px;
        background: var(--color-surface);
        box-shadow: 0 30px 80px rgba(15, 23, 42, 0.32);
        transform: translate(-50%, -50%);
      }
      .upload-modal > header {
        padding: 20px 22px 16px;
        border-bottom: 1px solid var(--color-border);
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
      }
      .upload-modal > header span {
        color: var(--color-primary);
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.09em;
      }
      .upload-modal h2 {
        margin-top: 4px;
        font-size: 19px;
      }
      .upload-modal header p {
        margin-top: 4px;
        color: var(--color-text-secondary);
        font-size: 11px;
      }
      .upload-modal > header > button {
        width: 32px;
        height: 32px;
        border: 0;
        border-radius: 50%;
        background: var(--color-muted);
        color: var(--color-text-primary);
        font-size: 20px;
      }
      .upload-content {
        padding: 20px 22px;
      }
      .drop-zone {
        width: 100%;
        min-height: 190px;
        border: 2px dashed #bfdbfe;
        border-radius: 13px;
        background: #f8fbff;
        color: var(--color-text-primary);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      .drop-zone.is-dragging,
      .drop-zone:hover {
        border-color: var(--color-primary);
        background: #eff6ff;
      }
      .drop-zone > span {
        width: 45px;
        height: 45px;
        margin-bottom: 4px;
        border-radius: 12px;
        background: #dbeafe;
        color: #2563eb;
        display: grid;
        place-items: center;
        font-size: 20px;
      }
      .drop-zone b {
        font-size: 13px;
      }
      .drop-zone p,
      .drop-zone small {
        color: var(--color-text-secondary);
        font-size: 10px;
      }
      .upload-error {
        margin-top: 9px;
        color: var(--color-danger);
        font-size: 10px;
      }
      .upload-previews {
        margin-top: 18px;
      }
      .upload-previews > header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 10px;
      }
      .upload-previews > header span {
        color: var(--color-text-secondary);
      }
      .upload-previews article {
        min-height: 61px;
        padding: 7px;
        border-top: 1px solid var(--color-border);
        display: grid;
        grid-template-columns: 45px 1fr 30px;
        align-items: center;
        gap: 10px;
      }
      .upload-previews img,
      .document-preview {
        width: 45px;
        height: 45px;
        border-radius: 8px;
        object-fit: cover;
      }
      .document-preview {
        background: var(--color-muted);
        color: var(--color-primary);
        display: grid;
        place-items: center;
        font-size: 8px;
        font-weight: 800;
      }
      .upload-previews article > span:nth-child(2) {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .upload-previews article b {
        overflow: hidden;
        font-size: 10.5px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .upload-previews article small {
        font-size: 9px;
      }
      .upload-previews article > button {
        width: 28px;
        height: 28px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: var(--color-text-secondary);
      }
      .upload-previews article > button:hover {
        background: #fee2e2;
        color: #dc2626;
      }
      .upload-modal > footer {
        padding: 14px 22px 19px;
        border-top: 1px solid var(--color-border);
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      :host-context(.app-frame--dark) .drop-zone {
        background: var(--color-background);
      }
      :host-context(.app-frame--dark) .drop-zone:hover,
      :host-context(.app-frame--dark) .drop-zone.is-dragging {
        background: #172554;
      }
    `,
  ],
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
