import { Injectable, signal } from '@angular/core';
import { CUSTOMERS } from '../../core/data-access/mock-crm-data';
import { CrmAttachment } from '../../core/models/customer';
import {
  OPERATIONAL_MODULES,
  OperationalModuleKey,
  OperationalRecord,
} from './operational-modules.data';

const CUSTOMER_EQUIPMENT_RECORDS: ReadonlyArray<OperationalRecord> = CUSTOMERS.flatMap(
  (customer) =>
    customer.equipment.map((item) => ({
      id: item.id,
      name: item.name,
      brand: item.model,
      serialNumber: item.serial,
      macAddress: item.mac,
      status: 'ASSIGNED',
      purchaseCost: 0,
      assignedTo: customer.name,
    })),
);

export interface OperationalNote {
  id: string;
  message: string;
  author: string;
  initials: string;
  createdAt: string;
  pinned: boolean;
  attachments: ReadonlyArray<CrmAttachment>;
}

export interface OperationalActivity {
  id: string;
  title: string;
  detail: string;
  actor: string;
  createdAt: string;
  tone: 'blue' | 'green' | 'amber' | 'violet';
  module: string;
  actionType: 'CREATE' | 'EDIT' | 'DELETE';
}

export interface OperationalEmail {
  id: string;
  to: string;
  cc: string;
  from: string;
  subject: string;
  body: string;
  attachments: ReadonlyArray<CrmAttachment>;
  sentBy: string;
  sentAt: string;
  status: 'SENT' | 'DRAFT';
}

@Injectable({ providedIn: 'root' })
export class OperationalStore {
  readonly records = signal<
    Readonly<Record<OperationalModuleKey, ReadonlyArray<OperationalRecord>>>
  >(
    Object.fromEntries(
      Object.entries(OPERATIONAL_MODULES).map(([key, definition]) => [
        key,
        key === 'equipment'
          ? [...definition.records, ...CUSTOMER_EQUIPMENT_RECORDS]
          : [...definition.records],
      ]),
    ) as unknown as Record<OperationalModuleKey, ReadonlyArray<OperationalRecord>>,
  );
  readonly notes = signal<Readonly<Record<string, ReadonlyArray<OperationalNote>>>>({});
  readonly activity = signal<Readonly<Record<string, ReadonlyArray<OperationalActivity>>>>({});
  readonly recordAttachments = signal<Readonly<Record<string, ReadonlyArray<CrmAttachment>>>>({});
  readonly emails = signal<Readonly<Record<string, ReadonlyArray<OperationalEmail>>>>({});

  recordsFor(module: OperationalModuleKey): ReadonlyArray<OperationalRecord> {
    return this.records()[module];
  }

  find(module: OperationalModuleKey, id: string): OperationalRecord | undefined {
    return this.records()[module].find((record) => record.id === id);
  }

  add(module: OperationalModuleKey, record: OperationalRecord): void {
    this.records.update((state) => ({ ...state, [module]: [record, ...state[module]] }));
    this.addActivity(
      record.id,
      'Registro creado',
      `Se creó ${record.id}.`,
      'green',
      this.moduleLabel(module),
      'CREATE',
    );
  }

  update(module: OperationalModuleKey, id: string, changes: Partial<OperationalRecord>): void {
    const previous = this.find(module, id);
    this.records.update((state) => ({
      ...state,
      [module]: state[module].map((record) =>
        record.id === id ? { ...record, ...changes, updatedAt: new Date().toISOString() } : record,
      ),
    }));
    const changed = Object.entries(changes)
      .map(([key, value]) => {
        const definition = OPERATIONAL_MODULES[module];
        const label =
          definition.columns.find((field) => field.key === key)?.label ??
          definition.fields.find((field) => field.key === key)?.label ??
          key;
        return `${label}: ${String(previous?.[key] ?? '—')} → ${String(value)}`;
      })
      .join(' · ');
    this.addActivity(id, 'Registro actualizado', changed, 'blue', this.moduleLabel(module), 'EDIT');
  }

  archive(module: OperationalModuleKey, id: string): void {
    this.records.update((state) => ({
      ...state,
      [module]: state[module].filter((record) => record.id !== id),
    }));
  }

  notesFor(id: string): ReadonlyArray<OperationalNote> {
    return this.notes()[id] ?? [];
  }

  hydrateNotes(id: string, notes: ReadonlyArray<OperationalNote>): void {
    if (!notes.length || (this.notes()[id]?.length ?? 0) > 0) return;
    this.notes.update((current) => ({ ...current, [id]: [...notes] }));
  }

  hydrateActivity(id: string, events: ReadonlyArray<OperationalActivity>): void {
    if (!events.length || (this.activity()[id]?.length ?? 0) > 0) return;
    this.activity.update((current) => ({ ...current, [id]: [...events] }));
  }

  addNote(
    id: string,
    message: string,
    attachments: ReadonlyArray<CrmAttachment>,
    pinned = false,
  ): void {
    const note: OperationalNote = {
      id: `note-${Date.now()}`,
      message,
      author: 'Andrea Torres',
      initials: 'AT',
      createdAt: new Date().toISOString(),
      pinned,
      attachments,
    };
    this.notes.update((notes) => ({ ...notes, [id]: [note, ...(notes[id] ?? [])] }));
    this.addActivity(id, 'Nota agregada', message, 'violet', 'Notas', 'CREATE');
  }

  deleteNote(recordId: string, noteId: string): void {
    this.notes.update((notes) => ({
      ...notes,
      [recordId]: (notes[recordId] ?? []).filter((note) => note.id !== noteId),
    }));
    this.addActivity(
      recordId,
      'Nota eliminada',
      `Se eliminó la nota ${noteId}.`,
      'amber',
      'Notas',
      'DELETE',
    );
  }

  updateNote(
    recordId: string,
    noteId: string,
    message: string,
    pinned: boolean,
    attachments: ReadonlyArray<CrmAttachment>,
  ): void {
    this.notes.update((notes) => ({
      ...notes,
      [recordId]: (notes[recordId] ?? []).map((note) =>
        note.id === noteId
          ? { ...note, message, pinned, attachments: [...note.attachments, ...attachments] }
          : note,
      ),
    }));
    this.addActivity(recordId, 'Nota actualizada', message, 'blue', 'Notas', 'EDIT');
  }

  togglePinnedNote(recordId: string, noteId: string): void {
    this.notes.update((notes) => ({
      ...notes,
      [recordId]: (notes[recordId] ?? []).map((note) =>
        note.id === noteId ? { ...note, pinned: !note.pinned } : note,
      ),
    }));
    this.addActivity(
      recordId,
      'Nota fijada actualizada',
      'Cambió su visibilidad en el resumen.',
      'violet',
      'Notas',
      'EDIT',
    );
  }

  attachmentsFor(recordId: string): ReadonlyArray<CrmAttachment> {
    return this.recordAttachments()[recordId] ?? [];
  }

  addAttachments(recordId: string, attachments: ReadonlyArray<CrmAttachment>): void {
    if (!attachments.length) return;
    this.recordAttachments.update((current) => ({
      ...current,
      [recordId]: [...attachments, ...(current[recordId] ?? [])],
    }));
    this.addActivity(
      recordId,
      'Archivos agregados',
      `${attachments.length} archivo(s) se adjuntaron al registro.`,
      'blue',
      'Archivos',
      'CREATE',
    );
  }

  deleteAttachment(recordId: string, attachmentId: string): void {
    const attachment = this.attachmentsFor(recordId).find((file) => file.id === attachmentId);
    if (attachment?.url.startsWith('blob:')) URL.revokeObjectURL(attachment.url);
    this.recordAttachments.update((current) => ({
      ...current,
      [recordId]: (current[recordId] ?? []).filter((file) => file.id !== attachmentId),
    }));
    this.addActivity(
      recordId,
      'Archivo eliminado',
      'Se eliminó un archivo adjunto.',
      'amber',
      'Archivos',
      'DELETE',
    );
  }

  activityFor(id: string): ReadonlyArray<OperationalActivity> {
    const stored = this.activity()[id] ?? [];
    return [
      ...stored,
      {
        id: `created-${id}`,
        title: 'Registro creado',
        detail: 'El registro fue incorporado al CRM y quedó disponible para el equipo.',
        actor: 'Andrea Torres',
        createdAt: '2026-07-12T09:30:00-06:00',
        tone: 'green',
        module: 'Registro',
        actionType: 'CREATE',
      },
    ];
  }

  emailsFor(id: string): ReadonlyArray<OperationalEmail> {
    return this.emails()[id] ?? [];
  }

  saveEmail(
    id: string,
    value: {
      to: string;
      cc: string;
      from: string;
      subject: string;
      body: string;
      attachments: ReadonlyArray<CrmAttachment>;
    },
    draft: boolean,
    existingId?: string,
  ): void {
    const email: OperationalEmail = {
      id: existingId ?? `email-${Date.now()}`,
      ...value,
      sentBy: 'Andrea Torres',
      sentAt: new Date().toISOString(),
      status: draft ? 'DRAFT' : 'SENT',
    };
    this.emails.update((emails) => ({
      ...emails,
      [id]: existingId
        ? (emails[id] ?? []).map((item) => (item.id === existingId ? email : item))
        : [email, ...(emails[id] ?? [])],
    }));
    this.addActivity(
      id,
      draft ? 'Borrador de correo guardado' : 'Correo enviado',
      `${value.subject} · Para ${value.to || 'sin destinatario'}`,
      'blue',
      'Correos',
      draft && existingId ? 'EDIT' : 'CREATE',
    );
  }

  deleteEmail(id: string, emailId: string): void {
    const email = (this.emails()[id] ?? []).find((item) => item.id === emailId);
    if (!email) return;
    this.emails.update((emails) => ({
      ...emails,
      [id]: (emails[id] ?? []).filter((item) => item.id !== emailId),
    }));
    this.addActivity(
      id,
      'Borrador de correo eliminado',
      email.subject || 'Sin asunto',
      'amber',
      'Correos',
      'DELETE',
    );
  }

  logActivity(
    id: string,
    title: string,
    detail: string,
    tone: OperationalActivity['tone'],
    module: string,
    actionType: OperationalActivity['actionType'],
  ): void {
    const item: OperationalActivity = {
      id: `activity-${Date.now()}`,
      title,
      detail,
      actor: 'Andrea Torres',
      createdAt: new Date().toISOString(),
      tone,
      module,
      actionType,
    };
    this.activity.update((activity) => ({
      ...activity,
      [id]: [item, ...(activity[id] ?? [])],
    }));
  }

  private addActivity(
    id: string,
    title: string,
    detail: string,
    tone: OperationalActivity['tone'],
    module: string,
    actionType: OperationalActivity['actionType'],
  ): void {
    this.logActivity(id, title, detail, tone, module, actionType);
  }

  private moduleLabel(module: OperationalModuleKey): string {
    return OPERATIONAL_MODULES[module].title;
  }
}
