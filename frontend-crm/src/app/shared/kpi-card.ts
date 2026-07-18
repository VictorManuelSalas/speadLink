import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-kpi-card', imports: [CurrencyPipe, DecimalPipe],
  template: `<article class="card kpi"><div class="kpi__top"><span class="kpi__icon kpi__icon--{{ tone() }}">{{ icon() }}</span><span class="trend">{{ trend() }}</span></div><p>{{ label() }}</p><strong>@if (currency()) { {{ value() | currency:'MXN':'symbol-narrow':'1.0-0':'es-MX' }} } @else { {{ value() | number:'1.0-0':'es-MX' }} }</strong><small>{{ note() }}</small></article>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiCard { readonly label=input.required<string>(); readonly value=input.required<number>(); readonly icon=input('•'); readonly trend=input(''); readonly note=input(''); readonly tone=input<'blue'|'green'|'amber'|'violet'>('blue'); readonly currency=input(false); }
