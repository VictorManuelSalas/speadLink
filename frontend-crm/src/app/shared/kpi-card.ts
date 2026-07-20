import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { LanguageService } from '../core/i18n/language.service';
import { CurrencyPipe, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-kpi-card',
  imports: [CurrencyPipe, DecimalPipe],
  templateUrl: './kpi-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiCard {
  readonly i18n = inject(LanguageService);
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly icon = input('/icons/dashboard/fi-sr-star.svg');
  readonly trend = input('');
  readonly note = input('');
  readonly tone = input<'blue' | 'green' | 'amber' | 'violet'>('blue');
  readonly currency = input(false);
}
