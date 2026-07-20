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
  templateUrl: './record-header.html',
  styleUrl: './record-header.scss',
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
  templateUrl: './record-summary.html',
  styleUrl: './record-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordSummary {
  readonly columns = input(4);
}

@Component({
  selector: 'app-record-tabs',
  templateUrl: './record-tabs.html',
  styleUrl: './record-tabs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordTabs {
  readonly tabs = input.required<ReadonlyArray<RecordTabItem>>();
  readonly active = input.required<string>();
  readonly activeChange = output<string>();
}

@Component({
  selector: 'app-record-detail-layout',
  templateUrl: './record-detail-layout.html',
  styleUrl: './record-detail-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordDetailLayout {}

@Component({
  selector: 'app-record-information-card',
  templateUrl: './record-information-card.html',
  styleUrl: './record-information-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordInformationCard {
  readonly title = input.required<string>();
  readonly description = input('Datos principales y trazabilidad del registro');
}

@Component({
  selector: 'app-record-quick-actions',
  templateUrl: './record-quick-actions.html',
  styleUrl: './record-quick-actions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordQuickActions {
  readonly title = input('Acciones rápidas');
  readonly description = input('Operaciones frecuentes');
}

@Component({
  selector: 'app-record-recent-activity',
  imports: [DatePipe],
  templateUrl: './record-recent-activity.html',
  styleUrl: './record-recent-activity.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordRecentActivity {
  readonly recordId = input.required<string>();
  private readonly store = inject(OperationalStore);
  events() {
    return this.store.activityFor(this.recordId()).slice(0, 4);
  }
}
