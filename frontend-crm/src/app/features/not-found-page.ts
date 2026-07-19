import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `<section class="not-found">
    <span>404</span>
    <h1>Esta página no está disponible</h1>
    <p>La dirección pudo cambiar o el módulo todavía no está habilitado.</p>
    <a class="button button--primary" routerLink="/dashboard">Volver al dashboard</a>
  </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {}
