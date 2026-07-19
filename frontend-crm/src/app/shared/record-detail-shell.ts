import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OperationalStore } from '../features/operations/operational-store';

export interface RecordTabItem {
  readonly label: string;
  readonly count?: number;
}

@Component({
  selector: 'app-record-header',
  imports: [RouterLink],
  template: ` 
    <header class="record-header">
      <div class="identity">
        <a class="back" [routerLink]="rootRoute()" aria-label="Volver">←</a>
        <span class="avatar" [style.background]="accent() + '18'" [style.color]="accent()">{{
          initials()
        }}</span>
        <div>
          <div class="title">
            <h1>{{ title() }}</h1>
            @if (statusLabel()) {
              <span class="status status--{{ statusTone() }}"><i></i>{{ statusLabel() }}</span>
            }
          </div>
          <p>{{ subtitle() }}</p>
        </div>
      </div>
      <div class="actions"><ng-content select="[record-actions]" /></div>
    </header>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .breadcrumbs {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--color-text-secondary);
        font-size: 10px;
      }
      .breadcrumbs a {
        color: inherit;
        text-decoration: none;
      }
      .record-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        margin: 14px 0 18px;
      }
      .identity {
        display: flex;
        align-items: center;
        gap: 13px;
      }
      .back {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        color: var(--color-text-secondary);
        display: grid;
        place-items: center;
        text-decoration: none;
      }
      .back:hover {
        background: var(--color-muted);
      }
      .avatar {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-size: 14px;
        font-weight: 800;
      }
      .title {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .title h1 {
        font-size: 24px;
      }
      .identity p {
        margin-top: 4px;
        color: var(--color-text-secondary);
        font-size: 11px;
      }
      .status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 9px;
        border-radius: 999px;
        background: #e2e8f0;
        color: #475569;
        font-size: 9px;
        font-weight: 800;
      }
      .status i {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
      }
      .status--green {
        background: #dcfce7;
        color: #15803d;
      }
      .status--amber {
        background: #fef3c7;
        color: #b45309;
      }
      .status--red {
        background: #fee2e2;
        color: #dc2626;
      }
      .status--blue {
        background: #dbeafe;
        color: #2563eb;
      }
      .actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      :host ::ng-deep [record-actions] {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      @media (max-width: 720px) {
        .record-header {
          align-items: flex-start;
          flex-direction: column;
        }
        .actions {
          width: 100%;
          justify-content: flex-end;
        }
        .title h1 {
          font-size: 20px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordHeader {
  readonly rootLabel = input.required<string>();
  readonly rootRoute = input.required<string | readonly unknown[]>();
  readonly recordId = input.required<string>();
  readonly title = input.required<string>();
  readonly initials = input.required<string>();
  readonly subtitle = input('');
  readonly accent = input('#2563eb');
  readonly statusLabel = input('');
  readonly statusTone = input('blue');
}

@Component({
  selector: 'app-record-summary',
  template: `<section class="summary" [style.--summary-columns]="columns()">
    <ng-content />
  </section>`,
  styles: [
    `
      :host {
        display: block;
      }
      .summary {
        width: 100%;
        margin-bottom: 22px;
        border: 1px solid var(--color-border);
        border-radius: 14px;
        background: var(--color-surface);
        display: grid;
        grid-template-columns: repeat(var(--summary-columns, 4), minmax(0, 1fr));
        overflow: hidden;
      }
      :host ::ng-deep .record-summary-item {
        min-height: 104px;
        padding: 18px 22px;
        border-right: 1px solid var(--color-border);
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      :host ::ng-deep .record-summary-item:last-child {
        border-right: 0;
      }
      :host ::ng-deep .record-summary-item > span:first-child {
        color: var(--color-text-secondary);
        font-size: 10px;
      }
      :host ::ng-deep .record-summary-item > b {
        margin-top: 8px;
        font-size: 18px;
      }
      :host ::ng-deep .record-summary-item > small {
        margin-top: 6px;
        color: var(--color-text-secondary);
        font-size: 10px;
      }
      @media (max-width: 800px) {
        .summary {
          grid-template-columns: repeat(2, 1fr);
        }
        :host ::ng-deep .record-summary-item:nth-child(2) {
          border-right: 0;
        }
      }
      @media (max-width: 520px) {
        .summary {
          grid-template-columns: 1fr;
        }
        :host ::ng-deep .record-summary-item {
          border-right: 0;
          border-bottom: 1px solid var(--color-border);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordSummary {
  readonly columns = input(4);
}

@Component({
  selector: 'app-record-tabs',
  template: `<nav class="tabs" aria-label="Secciones del registro">
    @for (tab of tabs(); track tab.label) {
      <button
        type="button"
        [class.active]="active() === tab.label"
        (click)="activeChange.emit(tab.label)"
      >
        {{ tab.label }}
        @if (tab.count !== undefined && tab.count > 0) {
          <span>{{ tab.count }}</span>
        }
      </button>
    }
  </nav>`,
  styles: [
    `
      :host {
        display: block;
      }
      .tabs {
        margin-bottom: 28px;
        border-bottom: 1px solid var(--color-border);
        display: flex;
        gap: 27px;
        overflow-x: auto;
      }
      .tabs button {
        position: relative;
        min-height: 48px;
        padding: 0;
        border: 0;
        background: transparent;
        color: var(--color-text-secondary);
        font: inherit;
        font-size: 11px;
        font-weight: 750;
        white-space: nowrap;
      }
      .tabs button.active {
        color: var(--color-primary);
      }
      .tabs button.active:after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        bottom: -1px;
        height: 2px;
        border-radius: 2px;
        background: var(--color-primary);
      }
      .tabs span {
        min-width: 20px;
        height: 20px;
        margin-left: 6px;
        padding: 0 6px;
        border-radius: 999px;
        background: var(--color-muted);
        display: inline-grid;
        place-items: center;
        font-size: 9px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordTabs {
  readonly tabs = input.required<ReadonlyArray<RecordTabItem>>();
  readonly active = input.required<string>();
  readonly activeChange = output<string>();
}

@Component({
  selector: 'app-record-detail-layout',
  template: `<section class="layout">
    <main><ng-content select="[record-main]" /></main>
    <aside><ng-content select="[record-aside]" /></aside>
  </section>`,
  styles: [
    `
      :host {
        display: block;
      }
      .layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 290px;
        align-items: start;
        gap: 18px;
      }
      .layout main,
      .layout aside {
        min-width: 0;
        display: grid;
        gap: 16px;
      }
      :host ::ng-deep [record-main],
      :host ::ng-deep [record-aside] {
        display: contents;
      }
      @media (max-width: 980px) {
        .layout {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordDetailLayout {}

@Component({
  selector: 'app-record-information-card',
  template: `<article class="card">
    <header>
      <h2>{{ title() }}</h2>
      <p>{{ description() }}</p>
    </header>
    <div class="fields"><ng-content /></div>
  </article>`,
  styles: [
    `
      :host {
        display: block;
      }
      .card {
        padding: 21px;
        border: 1px solid var(--color-border);
        border-radius: 15px;
        background: var(--color-surface);
      }
      header {
        margin-bottom: 21px;
      }
      h2 {
        font-size: 16px;
      }
      header p {
        margin-top: 5px;
        color: var(--color-text-secondary);
        font-size: 10px;
      }
      .fields {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 25px 30px;
      }
      :host ::ng-deep .record-field-slot {
        min-width: 0;
      }
      :host ::ng-deep .record-info-grid,
      :host ::ng-deep .info-grid {
        width: 100%;
        grid-column: 1/-1;
      }
      :host ::ng-deep .record-info-full {
        width: 100%;
        grid-column: 1/-1;
      }
      @media (max-width: 700px) {
        .fields {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordInformationCard {
  readonly title = input.required<string>();
  readonly description = input('Datos principales y trazabilidad del registro');
}

@Component({
  selector: 'app-record-quick-actions',
  template: `<article class="card">
    <header>
      <h2>{{ title() }}</h2>
      <p>{{ description() }}</p>
    </header>
    <div class="actions"><ng-content /></div>
  </article>`,
  styles: [
    `
      .card {
        padding: 18px;
        border: 1px solid var(--color-border);
        border-radius: 14px;
        background: var(--color-surface);
      }
      h2 {
        font-size: 14px;
      }
      header p {
        margin-top: 4px;
        color: var(--color-text-secondary);
        font-size: 9px;
      }
      .actions {
        margin-top: 14px;
        display: grid;
        gap: 8px;
      }
      :host ::ng-deep button,
      :host ::ng-deep select {
        width: 100%;
        min-height: 37px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-surface);
        color: var(--color-text-primary);
        font: inherit;
        font-size: 10px;
        font-weight: 700;
      }
      :host ::ng-deep button {
        text-align: left;
        padding: 0 11px;
      }
      :host ::ng-deep .danger-action {
        color: #dc2626;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordQuickActions {
  readonly title = input('Acciones rápidas');
  readonly description = input('Operaciones frecuentes');
}

@Component({
  selector: 'app-record-recent-activity',
  imports: [DatePipe],
  template: `<article class="card">
    <header>
      <h2>Actividad reciente</h2>
      <p>Últimos movimientos del registro</p>
    </header>
    <div class="list">
      @for (event of events(); track event.id) {
        <div class="item">
          <i class="{{ event.tone }}"></i
          ><span
            ><b>{{ event.title }}</b
            ><small>{{ event.detail }}</small
            ><time>{{ event.createdAt | date: 'dd MMM y, HH:mm' }}</time></span
          >
        </div>
      } @empty {
        <p class="empty">Sin actividad registrada.</p>
      }
    </div>
  </article>`,
  styles: [
    `
      .card {
        padding: 18px;
        border: 1px solid var(--color-border);
        border-radius: 14px;
        background: var(--color-surface);
      }
      h2 {
        font-size: 14px;
      }
      header p {
        margin-top: 4px;
        color: var(--color-text-secondary);
        font-size: 9px;
      }
      .list {
        margin-top: 14px;
        display: grid;
        gap: 13px;
      }
      .item {
        display: grid;
        grid-template-columns: 9px 1fr;
        gap: 9px;
      }
      .item > i {
        width: 7px;
        height: 7px;
        margin-top: 5px;
        border-radius: 50%;
        background: #2563eb;
      }
      .item > i.green {
        background: #16a34a;
      }
      .item > i.amber {
        background: #d97706;
      }
      .item > i.violet {
        background: #7c3aed;
      }
      .item span {
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .item b {
        font-size: 10px;
      }
      .item small {
        margin-top: 3px;
        overflow: hidden;
        color: var(--color-text-secondary);
        font-size: 9px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .item time {
        margin-top: 3px;
        color: var(--color-text-secondary);
        font-size: 8px;
      }
      .empty {
        color: var(--color-text-secondary);
        font-size: 10px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordRecentActivity {
  readonly recordId = input.required<string>();
  private readonly store = inject(OperationalStore);
  events() {
    return this.store.activityFor(this.recordId()).slice(0, 4);
  }
}
