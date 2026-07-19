import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { LanguageService } from '../core/i18n/language.service';
import { CurrencyPipe, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-kpi-card',
  imports: [CurrencyPipe, DecimalPipe],
  template: `<article class="card kpi">
    <div class="kpi__top">
      <span class="kpi__icon kpi__icon--{{ tone() }}"><img [src]="icon()" alt="" /></span
      ><span class="trend">{{ trend() }}</span>
    </div>
    <p>{{ label() }}</p>
    <strong>
      @if (currency()) {
        {{ value() | currency: 'MXN' : 'symbol-narrow' : '1.0-0' : i18n.locale() }}
      } @else {
        {{ value() | number: '1.0-0' : i18n.locale() }}
      }</strong
    ><small>{{ note() }}</small>
  </article>`,
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
