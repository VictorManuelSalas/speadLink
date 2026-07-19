import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DynamicLanguageDirective } from './core/i18n/dynamic-language.directive';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DynamicLanguageDirective],
  template: '<div appDynamicLanguage><router-outlet /></div>',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
