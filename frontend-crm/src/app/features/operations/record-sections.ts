import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  input,
  signal,
} from '@angular/core';
import { CrmAttachment } from '../../core/models/customer';
import { AttachmentPicker } from '../../shared/attachment-picker';
import { FileUploadModal } from '../../shared/file-upload-modal';
import { InlineEditableDateField } from '../../shared/inline-editable-date-field';
import { LeadEmailFormValue, LeadEmailModal, LeadEmailSeed } from './lead-email-modal';
import { OperationalEmail, OperationalStore } from './operational-store';

const SECTION_STYLES = `
  :host{display:block}.section-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:22px}
  .section-head h2{font-size:20px}.section-head p{margin-top:4px;color:var(--color-text-secondary);font-size:12px}
  .button{min-height:38px;padding:0 14px;border:1px solid var(--color-border);border-radius:9px;background:var(--color-surface);color:var(--color-text-primary);font:inherit;font-size:11px;font-weight:750;cursor:pointer}
  .button.primary{border-color:var(--color-primary);background:var(--color-primary);color:#fff}.button:disabled{opacity:.45;cursor:not-allowed}
  .empty{min-height:230px;padding:30px;border:1px solid var(--color-border);border-radius:15px;background:var(--color-surface);display:grid;place-items:center;align-content:center;gap:8px;text-align:center}
  .empty>span{font-size:28px;color:var(--color-text-secondary)}.empty h3{font-size:15px}.empty p{color:var(--color-text-secondary);font-size:11px}
  @media(max-width:680px){.section-head{align-items:stretch;flex-direction:column}}
`;

@Component({
  selector: 'app-record-notes-section',
  imports: [AttachmentPicker, DatePipe],
  template: `
    <section>
      <header class="section-head">
        <div>
          <h2>Notas</h2>
          <p>{{ notes().length }} nota(s) en este registro</p>
        </div>
        <button class="button primary" type="button" (click)="openComposer()">＋ Nueva nota</button>
      </header>
      @if (composing()) {
        <article class="composer">
          <textarea
            #message
            [value]="draft()"
            (input)="draft.set(message.value)"
            placeholder="Agrega una nota sobre este registro…"
          ></textarea>
          <app-attachment-picker
            [resetKey]="attachmentReset()"
            (attachmentsChange)="attachments.set($event)"
          />
          <footer>
            <button
              class="pin"
              type="button"
              [class.active]="pinned()"
              [disabled]="!pinned() && pinnedCount() >= 5"
              (click)="pinned.set(!pinned())"
            >
              ◇ {{ pinned() ? 'Se fijará al guardar' : 'Fijar en el resumen' }} ({{
                pinnedCount()
              }}/5)
            </button>
            <div>
              <button class="button" type="button" (click)="cancel()">Cancelar</button
              ><button
                class="button primary"
                type="button"
                [disabled]="!draft().trim()"
                (click)="save()"
              >
                {{ editingId() ? 'Actualizar nota' : 'Guardar nota' }}
              </button>
            </div>
          </footer>
        </article>
      }
      <div class="note-list">
        @for (note of notes(); track note.id) {
          <article class="note" [class.pinned]="note.pinned">
            <header>
              <div class="author">
                <span>{{ note.initials }}</span
                ><b>{{ note.author }}</b>
                @if (note.pinned) {
                  <em>◇ Fijada</em>
                }
              </div>
              <div class="meta">
                <time>{{ note.createdAt | date: 'dd MMM y, HH:mm' }}</time
                ><button type="button" (click)="toggleMenu($event, note.id)">•••</button>
              </div>
              @if (menuId() === note.id) {
                <div class="menu" (click)="$event.stopPropagation()">
                  <button
                    type="button"
                    [disabled]="!note.pinned && pinnedCount() >= 5"
                    (click)="togglePin(note.id)"
                  >
                    {{ note.pinned ? 'Desfijar' : 'Fijar en resumen' }}</button
                  ><button type="button" (click)="edit(note.id, note.message, note.pinned)">
                    Editar</button
                  ><button class="danger" type="button" (click)="remove(note.id)">Eliminar</button>
                </div>
              }
            </header>
            <p>{{ note.message }}</p>
            @if (note.attachments.length) {
              <div class="attachments">
                @for (file of note.attachments; track file.id) {
                  <a [href]="file.url" target="_blank" rel="noopener"
                    ><b>{{ file.fileName }}</b
                    ><small>{{ size(file.size) }}</small></a
                  >
                }
              </div>
            }
          </article>
        } @empty {
          <article class="empty">
            <span>▤</span>
            <h3>Sin notas todavía</h3>
            <p>La primera nota que agregues aparecerá aquí.</p>
          </article>
        }
      </div>
    </section>
  `,
  styles: [
    SECTION_STYLES,
    `
      .composer,
      .note {
        position: relative;
        border: 1px solid var(--color-border);
        border-radius: 15px;
        background: var(--color-surface);
      }
      .composer {
        margin-bottom: 18px;
        overflow: hidden;
      }
      .composer textarea {
        width: 100%;
        min-height: 130px;
        padding: 18px;
        border: 0;
        outline: 0;
        resize: vertical;
        background: transparent;
        color: var(--color-text-primary);
        font: inherit;
      }
      .composer app-attachment-picker {
        display: block;
        padding: 0 18px 14px;
      }
      .composer footer {
        padding: 13px 18px;
        border-top: 1px solid var(--color-border);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .composer footer > div {
        display: flex;
        gap: 8px;
      }
      .pin {
        border: 0;
        background: transparent;
        color: var(--color-text-secondary);
        font: inherit;
        font-size: 11px;
        font-weight: 750;
      }
      .pin.active {
        color: var(--color-primary);
      }
      .note-list {
        display: grid;
        gap: 13px;
      }
      .note {
        padding: 18px 20px;
      }
      .note.pinned {
        border-color: #f4cf63;
        background: #fffbeb;
        color: #111827;
      }
      .note header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .author,
      .meta {
        display: flex;
        align-items: center;
        gap: 9px;
      }
      .author > span {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: #dbeafe;
        color: #2563eb;
        display: grid;
        place-items: center;
        font-size: 10px;
        font-weight: 800;
      }
      .author em {
        padding: 4px 8px;
        border-radius: 999px;
        background: #fef3c7;
        color: #b45309;
        font-size: 9px;
        font-style: normal;
      }
      .meta time {
        color: var(--color-text-secondary);
        font-size: 10px;
      }
      .meta button {
        border: 0;
        background: transparent;
        color: var(--color-text-secondary);
      }
      .note > p {
        margin-top: 15px;
        white-space: pre-line;
      }
      .menu {
        position: absolute;
        right: 16px;
        top: 54px;
        z-index: 20;
        width: 155px;
        padding: 5px;
        border: 1px solid var(--color-border);
        border-radius: 9px;
        background: var(--color-surface);
        box-shadow: 0 12px 30px #0f172a25;
      }
      .menu button {
        width: 100%;
        padding: 9px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--color-text-primary);
        text-align: left;
        font: inherit;
        font-size: 10px;
      }
      .menu button:hover {
        background: var(--color-muted);
      }
      .menu .danger {
        color: #dc2626;
      }
      .attachments {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        margin-top: 14px;
        width: 100%;
      }
      .attachments a {
        padding: 8px 10px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        color: inherit;
        text-decoration: none;
        display: flex;
        flex-direction: column;
        font-size: 9px;
      }
      .attachments small {
        color: var(--color-text-secondary);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordNotesSection {
  readonly recordId = input.required<string>();
  readonly store = inject(OperationalStore);
  readonly composing = signal(false);
  readonly draft = signal('');
  readonly pinned = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly menuId = signal<string | null>(null);
  readonly attachments = signal<ReadonlyArray<CrmAttachment>>([]);
  readonly attachmentReset = signal(0);
  notes() {
    return [...this.store.notesFor(this.recordId())].sort(
      (a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt),
    );
  }
  pinnedCount() {
    return this.notes().filter((n) => n.pinned).length;
  }
  openComposer() {
    this.composing.set(true);
  }
  save() {
    const value = this.draft().trim();
    if (!value) return;
    const id = this.editingId();
    if (id) this.store.updateNote(this.recordId(), id, value, this.pinned(), this.attachments());
    else
      this.store.addNote(
        this.recordId(),
        value,
        this.attachments(),
        this.pinned() && this.pinnedCount() < 5,
      );
    this.cancel();
  }
  edit(id: string, message: string, pinned: boolean) {
    this.editingId.set(id);
    this.draft.set(message);
    this.pinned.set(pinned);
    this.composing.set(true);
    this.menuId.set(null);
  }
  remove(id: string) {
    this.store.deleteNote(this.recordId(), id);
    this.menuId.set(null);
  }
  togglePin(id: string) {
    this.store.togglePinnedNote(this.recordId(), id);
    this.menuId.set(null);
  }
  toggleMenu(event: MouseEvent, id: string) {
    event.stopPropagation();
    this.menuId.set(this.menuId() === id ? null : id);
  }
  cancel() {
    this.composing.set(false);
    this.draft.set('');
    this.pinned.set(false);
    this.editingId.set(null);
    this.attachments.set([]);
    this.attachmentReset.update((v) => v + 1);
  }
  size(v: number) {
    return v < 1048576 ? `${Math.ceil(v / 1024)} KB` : `${(v / 1048576).toFixed(1)} MB`;
  }
  @HostListener('document:click') closeMenu() {
    this.menuId.set(null);
  }
}

@Component({
  selector: 'app-record-activity-section',
  imports: [DatePipe, InlineEditableDateField],
  template: `<section>
    <header class="section-head">
      <div>
        <h2>Historial de actividad</h2>
        <p>{{ filtered().length }} de {{ events().length }} eventos</p>
      </div>
      <div class="filters">
        <button type="button" [class.active]="!module() && !type() && !date()" (click)="clear()">
          Todos</button
        ><select #moduleSelect [value]="module()" (change)="module.set(moduleSelect.value)">
          <option value="">Módulo</option>
          @for (item of modules; track item) {
            <option [value]="item">{{ item }}</option>
          }</select
        ><select #typeSelect [value]="type()" (change)="setType(typeSelect.value)">
          <option value="">Tipo</option>
          <option value="CREATE">Creación</option>
          <option value="EDIT">Edición</option>
          <option value="DELETE">Eliminación</option>
        </select>
        <div class="date" [class.active]="date()">
          <app-inline-editable-date-field
            label="Fecha"
            [value]="date()"
            placeholder="Fecha"
            [alwaysShowEdit]="true"
            [compact]="true"
            (valueSaved)="date.set($event)"
          />
        </div>
        @if (date()) {
          <button class="clear" type="button" (click)="date.set('')">×</button>
        }
      </div>
    </header>
    <div class="timeline">
      @for (event of filtered(); track event.id) {
        <article>
          <span class="marker {{ event.tone }}">{{ icon(event.tone) }}</span>
          <div class="event">
            <header>
              <div>
                <h3>{{ event.title }}</h3>
                <small
                  >por <b>{{ event.actor }}</b></small
                >
              </div>
              <time>{{ event.createdAt | date: 'dd MMM y, HH:mm' }}</time>
            </header>
            <div class="badges">
              <span>{{ event.module }}</span
              ><span>{{ typeLabel(event.actionType) }}</span>
            </div>
            <p>{{ event.detail }}</p>
          </div>
        </article>
      } @empty {
        <article class="empty">
          <span>⌕</span>
          <h3>Sin resultados</h3>
          <p>No hay actividad que coincida con los filtros.</p>
        </article>
      }
    </div>
  </section>`,
  styles: [
    SECTION_STYLES,
    `
      .filters {
        padding: 3px;
        border-radius: 10px;
        background: var(--color-muted);
        display: flex;
        align-items: center;
        gap: 3px;
      }
      .filters > button,
      .filters select {
        height: 34px;
        padding: 0 11px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: var(--color-text-secondary);
        font: inherit;
        font-size: 10px;
      }
      .filters .active {
        background: var(--color-surface);
        box-shadow: 0 2px 7px #0f172a18;
        color: var(--color-text-primary);
      }
      .date {
        min-width: 112px;
        border-radius: 7px;
      }
      .clear {
        width: 28px !important;
        padding: 0 !important;
        font-size: 16px !important;
      }
      .timeline {
        position: relative;
        padding-left: 58px;
      }
      .timeline:before {
        content: '';
        position: absolute;
        left: 20px;
        inset-block: 0;
        width: 1px;
        background: var(--color-border);
      }
      .timeline > article {
        position: relative;
        margin-bottom: 15px;
      }
      .marker {
        position: absolute;
        left: -58px;
        top: 17px;
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: #dbeafe;
        color: #2563eb;
        display: grid;
        place-items: center;
      }
      .marker.green {
        background: #dcfce7;
        color: #16a34a;
      }
      .marker.amber {
        background: #fef3c7;
        color: #d97706;
      }
      .marker.violet {
        background: #ede9fe;
        color: #7c3aed;
      }
      .event {
        padding: 18px 20px;
        border: 1px solid var(--color-border);
        border-radius: 14px;
        background: var(--color-surface);
      }
      .event header {
        display: flex;
        justify-content: space-between;
      }
      .event h3 {
        font-size: 13px;
      }
      .event small,
      .event time,
      .event p {
        color: var(--color-text-secondary);
        font-size: 10px;
      }
      .event p {
        margin-top: 12px;
        font-size: 11px;
      }
      .badges {
        display: flex;
        gap: 6px;
        margin-top: 9px;
      }
      .badges span {
        padding: 3px 8px;
        border-radius: 999px;
        background: var(--color-muted);
        color: var(--color-text-secondary);
        font-size: 9px;
        font-weight: 750;
      }
      @media (max-width: 800px) {
        .filters {
          width: 100%;
          overflow-x: auto;
        }
        .timeline {
          padding-left: 48px;
        }
        .marker {
          left: -48px;
          width: 34px;
          height: 34px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordActivitySection {
  readonly recordId = input.required<string>();
  readonly store = inject(OperationalStore);
  readonly module = signal('');
  readonly type = signal<'' | 'CREATE' | 'EDIT' | 'DELETE'>('');
  readonly date = signal('');
  readonly modules = [
    'Registro',
    'Leads',
    'Clientes',
    'Tickets',
    'Servicios',
    'Equipamiento',
    'Asignaciones',
    'Contratos',
    'Facturas',
    'Pagos',
    'Gastos',
    'Notas',
    'Archivos',
    'Correos',
    'Calendario',
    'Configuración de organización',
    'Usuarios',
    'Roles y permisos',
    'SMTP',
    'SMS',
    'Portal',
    'Plantillas',
    'Módulos',
    'Automatizaciones',
    'Flujos de trabajo',
    'Programaciones',
    'Registro de actividad',
    'Auditoría',
    'Restricciones IP',
    'Inicio de sesión 2FA',
    'Webhooks',
    'APIs',
    'Integraciones',
  ];
  events() {
    return this.store.activityFor(this.recordId());
  }
  filtered() {
    return this.events().filter(
      (e) =>
        (!this.module() || e.module === this.module()) &&
        (!this.type() || e.actionType === this.type()) &&
        (!this.date() || this.key(e.createdAt) === this.date()),
    );
  }
  setType(v: string) {
    this.type.set(v as '' | 'CREATE' | 'EDIT' | 'DELETE');
  }
  clear() {
    this.module.set('');
    this.type.set('');
    this.date.set('');
  }
  typeLabel(v: 'CREATE' | 'EDIT' | 'DELETE') {
    return { CREATE: 'Creación', EDIT: 'Edición', DELETE: 'Eliminación' }[v];
  }
  icon(t: string) {
    return t === 'green' ? '✓' : t === 'amber' ? '!' : t === 'violet' ? '◆' : '↻';
  }
  private key(v: string) {
    const d = new Date(v);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

@Component({
  selector: 'app-record-emails-section',
  imports: [DatePipe, LeadEmailModal],
  template: `<section>
      <header class="section-head">
        <div>
          <h2>Correos</h2>
          <p>Conversaciones y mensajes de este registro</p>
        </div>
        <button class="button primary" type="button" (click)="compose()">＋ Nuevo correo</button>
      </header>
      <div class="list">
        @for (email of emails(); track email.id) {
          <article class="email" tabindex="0" (click)="open(email)" (keydown.enter)="open(email)">
            <span class="icon">✉</span>
            <div>
              <header>
                <h3>{{ email.subject }}</h3>
                <em [class.draft]="email.status === 'DRAFT'">{{
                  email.status === 'DRAFT' ? 'Borrador' : 'Enviado'
                }}</em>
              </header>
              <p>{{ email.body }}</p>
              <small>Para {{ email.to }} · {{ email.sentAt | date: 'dd MMM y, HH:mm' }}</small>
            </div>
            <button type="button" (click)="menuClick($event, email.id)">•••</button>
            @if (menuId() === email.id) {
              <div class="menu" (click)="$event.stopPropagation()">
                @if (email.status === 'DRAFT') {
                  <button type="button" (click)="edit(email)">Editar borrador</button>
                }
                <button type="button" (click)="preview.set(email)">Ver</button>
                @if (email.status === 'SENT') {
                  <button type="button" (click)="from(email, false)">Reenviar</button>
                }
                <button type="button" (click)="from(email, true)">Reenviar a…</button>
              </div>
            }
          </article>
        } @empty {
          <article class="empty">
            <span>✉</span>
            <h3>No hay correos</h3>
            <p>El primer mensaje aparecerá aquí y en la actividad.</p>
          </article>
        }
      </div>
    </section>
    @if (composer()) {
      <app-lead-email-modal
        [seed]="seed()"
        [composeKey]="composeKey()"
        (closed)="close()"
        (submitted)="save($event.value, $event.draft)"
      />
    }
    @if (preview(); as email) {
      <app-lead-email-modal
        [preview]="email"
        (closed)="preview.set(null)"
        (edit)="edit($event)"
        (resend)="from($event, false)"
        (forward)="from($event, true)"
      />
    }`,
  styles: [
    SECTION_STYLES,
    `
      .list {
        display: grid;
        gap: 12px;
      }
      .email {
        position: relative;
        padding: 17px;
        border: 1px solid var(--color-border);
        border-radius: 14px;
        background: var(--color-surface);
        display: grid;
        grid-template-columns: 38px 1fr 30px;
        gap: 12px;
        cursor: pointer;
      }
      .icon {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        background: #dbeafe;
        color: #2563eb;
        display: grid;
        place-items: center;
      }
      .email header {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .email h3 {
        font-size: 13px;
      }
      .email em {
        padding: 3px 7px;
        border-radius: 999px;
        background: #dcfce7;
        color: #15803d;
        font-size: 8px;
        font-style: normal;
      }
      .email em.draft {
        background: #fef3c7;
        color: #b45309;
      }
      .email p {
        margin: 7px 0;
        color: var(--color-text-secondary);
        font-size: 11px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .email small {
        color: var(--color-text-secondary);
        font-size: 9px;
      }
      .email > button {
        border: 0;
        background: transparent;
        color: var(--color-text-secondary);
      }
      .menu {
        position: absolute;
        right: 12px;
        top: 50px;
        z-index: 20;
        width: 145px;
        padding: 5px;
        border: 1px solid var(--color-border);
        border-radius: 9px;
        background: var(--color-surface);
        box-shadow: 0 12px 30px #0f172a25;
      }
      .menu button {
        width: 100%;
        padding: 9px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--color-text-primary);
        text-align: left;
        font: inherit;
        font-size: 10px;
      }
      .menu button:hover {
        background: var(--color-muted);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordEmailsSection {
  readonly recordId = input.required<string>();
  readonly recipientEmail = input('');
  readonly store = inject(OperationalStore);
  readonly composer = signal(false);
  readonly preview = signal<OperationalEmail | null>(null);
  readonly seed = signal<LeadEmailSeed>({});
  readonly composeKey = signal(0);
  readonly editingId = signal<string | null>(null);
  readonly menuId = signal<string | null>(null);
  emails() {
    return this.store.emailsFor(this.recordId());
  }
  compose() {
    this.seed.set({ to: this.recipientEmail(), from: 'andrea.torres@speedlink.mx' });
    this.editingId.set(null);
    this.composeKey.update((v) => v + 1);
    this.composer.set(true);
  }
  save(v: LeadEmailFormValue, d: boolean) {
    this.store.saveEmail(this.recordId(), v, d, this.editingId() ?? undefined);
    this.close();
  }
  close() {
    this.composer.set(false);
    this.editingId.set(null);
  }
  open(e: OperationalEmail) {
    e.status === 'DRAFT' ? this.edit(e) : this.preview.set(e);
  }
  edit(e: OperationalEmail) {
    this.seed.set({ ...e, title: 'Editar borrador' });
    this.editingId.set(e.id);
    this.preview.set(null);
    this.composeKey.update((v) => v + 1);
    this.composer.set(true);
  }
  from(e: OperationalEmail, forward: boolean) {
    this.seed.set({
      to: forward ? '' : e.to,
      cc: forward ? '' : e.cc,
      from: e.from,
      subject: forward ? `Fwd: ${e.subject}` : e.subject,
      body: forward ? `\n\n---------- Mensaje reenviado ----------\n${e.body}` : e.body,
      attachments: e.attachments,
    });
    this.preview.set(null);
    this.composeKey.update((v) => v + 1);
    this.composer.set(true);
  }
  menuClick(ev: MouseEvent, id: string) {
    ev.stopPropagation();
    this.menuId.set(this.menuId() === id ? null : id);
  }
  @HostListener('document:click') closeMenu() {
    this.menuId.set(null);
  }
}

@Component({
  selector: 'app-record-attachments-section',
  imports: [DatePipe, FileUploadModal],
  template: `<section>
    <header class="section-head">
      <div>
        <h2>Archivos adjuntos</h2>
        <p>{{ files().length }} archivo(s) relacionados con este registro</p>
      </div>
      <button class="button primary" type="button" (click)="upload.set(true)">
        ⇧ Subir archivos
      </button>
    </header>
    @if (upload()) {
      <app-file-upload-modal (closed)="upload.set(false)" (filesUploaded)="add($event)" />
    }
    <div class="grid">
      @for (file of files(); track file.id) {
        <article class="file">
          @if (file.mimeType.startsWith('image/')) {
            <img [src]="file.url" [alt]="file.fileName" />
          } @else {
            <span>{{ extension(file.fileName) }}</span>
          }
          <div>
            <b>{{ file.fileName }}</b
            ><small>{{ size(file.size) }} · {{ file.createdAt | date: 'dd MMM y, HH:mm' }}</small>
          </div>
          <button type="button" (click)="menuClick($event, file.id)">•••</button>
          @if (menuId() === file.id) {
            <div class="menu" (click)="$event.stopPropagation()">
              <a [href]="file.url" target="_blank" rel="noopener">Ver</a
              ><a [href]="file.url" [attr.download]="file.fileName">Descargar</a
              ><button type="button" (click)="remove(file.id)">Eliminar</button>
            </div>
          }
        </article>
      } @empty {
        <article class="empty">
          <span>▤</span>
          <h3>Aún no hay archivos</h3>
          <p>Los documentos cargados aparecerán aquí.</p>
        </article>
      }
    </div>
  </section>`,
  styles: [
    SECTION_STYLES,
    `
      .grid {
        width: 100%;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .grid > .empty {
        width: 100%;
        min-height: 280px;
        box-sizing: border-box;
        grid-column: 1 / -1;
      }
      .file {
        position: relative;
        padding: 12px;
        border: 1px solid var(--color-border);
        border-radius: 13px;
        background: var(--color-surface);
        display: grid;
        grid-template-columns: 48px 1fr 28px;
        align-items: center;
        gap: 11px;
      }
      .file > img,
      .file > span {
        width: 48px;
        height: 48px;
        border-radius: 9px;
        object-fit: cover;
      }
      .file > span {
        background: #dbeafe;
        color: #2563eb;
        display: grid;
        place-items: center;
        font-size: 8px;
        font-weight: 800;
      }
      .file div:not(.menu) {
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .file b {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 11px;
      }
      .file small {
        margin-top: 4px;
        color: var(--color-text-secondary);
        font-size: 9px;
      }
      .file > button {
        border: 0;
        background: transparent;
        color: var(--color-text-secondary);
      }
      .menu {
        position: absolute;
        right: 10px;
        top: 50px;
        z-index: 20;
        width: 130px;
        padding: 5px;
        border: 1px solid var(--color-border);
        border-radius: 9px;
        background: var(--color-surface);
        box-shadow: 0 12px 30px #0f172a25;
        display: grid;
      }
      .menu a,
      .menu button {
        padding: 9px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--color-text-primary);
        text-align: left;
        text-decoration: none;
        font: inherit;
        font-size: 10px;
      }
      .menu button {
        color: #dc2626;
      }
      @media (max-width: 700px) {
        .grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordAttachmentsSection {
  readonly recordId = input.required<string>();
  readonly store = inject(OperationalStore);
  readonly upload = signal(false);
  readonly menuId = signal<string | null>(null);
  files() {
    return this.store.attachmentsFor(this.recordId());
  }
  add(v: ReadonlyArray<CrmAttachment>) {
    this.store.addAttachments(this.recordId(), v);
    this.upload.set(false);
  }
  remove(id: string) {
    this.store.deleteAttachment(this.recordId(), id);
    this.menuId.set(null);
  }
  menuClick(e: MouseEvent, id: string) {
    e.stopPropagation();
    this.menuId.set(this.menuId() === id ? null : id);
  }
  extension(v: string) {
    return v.split('.').pop()?.slice(0, 4).toUpperCase() || 'FILE';
  }
  size(v: number) {
    return v < 1048576 ? `${Math.ceil(v / 1024)} KB` : `${(v / 1048576).toFixed(1)} MB`;
  }
  @HostListener('document:click') close() {
    this.menuId.set(null);
  }
}
