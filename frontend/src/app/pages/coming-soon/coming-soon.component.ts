import { Component, Input } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './coming-soon.component.html',
  styleUrl: './coming-soon.component.scss'
})
export class ComingSoonComponent { @Input() section = 'sección'; }
