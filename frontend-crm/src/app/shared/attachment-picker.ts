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
  template: `
    <div class="attachment-picker">
      <input
        #fileInput
        hidden
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
        (change)="selectFiles(fileInput.files); fileInput.value = ''"
      />
      <button type="button" class="attach-button" (click)="fileInput.click()">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m12 17 5-5a3 3 0 0 0-4-4l-6 6a5 5 0 0 0 7 7l6-6" />
        </svg>
        {{ label() }}
      </button>
      @if (error()) {
        <small class="error">{{ error() }}</small>
      }
      @if (items().length) {
        <div class="attachment-list">
          @for (item of items(); track item.id) {
            <div class="attachment-item">
              @if (item.mimeType.startsWith('image/')) {
                <img [src]="item.url" [alt]="item.fileName" />
              } @else {
                <span class="file-icon">{{ extension(item.fileName) }}</span>
              }
              <span
                ><b>{{ item.fileName }}</b
                ><small>{{ formatSize(item.size) }}</small></span
              >
              <button type="button" aria-label="Eliminar archivo" (click)="remove(item.id)">
                ×
              </button>
            </div>
          }
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
      .attachment-picker {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
      button {
        font: inherit;
        cursor: pointer;
      }
      .attach-button {
        min-height: 34px;
        padding: 0 10px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-surface);
        color: var(--color-text-secondary);
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-size: 10px;
        font-weight: 700;
      }
      .attach-button:hover {
        border-color: #93c5fd;
        color: var(--color-primary);
      }
      svg {
        width: 15px;
        height: 15px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linecap: round;
      }
      .error {
        color: var(--color-danger);
        font-size: 9px;
      }
      .attachment-list {
        width: 100%;
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
      }
      .attachment-item {
        min-width: 190px;
        max-width: 270px;
        height: 48px;
        padding: 5px 7px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-background);
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .attachment-item img,
      .file-icon {
        width: 36px;
        height: 36px;
        flex: 0 0 36px;
        border-radius: 6px;
        object-fit: cover;
      }
      .file-icon {
        background: #dbeafe;
        color: #1d4ed8;
        display: grid;
        place-items: center;
        font-size: 8px;
        font-weight: 800;
        text-transform: uppercase;
      }
      .attachment-item > span:nth-child(2) {
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .attachment-item b {
        overflow: hidden;
        font-size: 9.5px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .attachment-item small {
        color: var(--color-text-secondary);
        font-size: 8px;
      }
      .attachment-item > button {
        width: 24px;
        height: 24px;
        margin-left: auto;
        flex: 0 0 24px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--color-text-secondary);
      }
      .attachment-item > button:hover {
        background: #fee2e2;
        color: #dc2626;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttachmentPicker implements OnDestroy {
  readonly label = input('Adjuntar fotos o archivos');
  readonly resetKey = input(0);
  readonly preserveUrls = input(true);
  readonly attachmentsChange = output<ReadonlyArray<CrmAttachment>>();
  readonly items = signal<ReadonlyArray<CrmAttachment>>([]);
  readonly error = signal('');

  constructor() {
    effect(() => {
      this.resetKey();
      untracked(() => this.clear(!this.preserveUrls()));
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
