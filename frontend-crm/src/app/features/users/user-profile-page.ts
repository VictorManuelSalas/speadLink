import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LanguageService } from '../../core/i18n/language.service';

@Component({
  selector: 'app-user-profile-page',
  imports: [DatePipe, RouterLink],
  template: `
    <div class="breadcrumbs">
      <a routerLink="/dashboard">CRM</a><b>›</b><span>Usuarios</span><b>›</b
      ><span>{{ user.name }}</span>
    </div>
    <header class="profile-hero">
      <a class="icon-button" routerLink="/dashboard">←</a><span class="profile-avatar">AT</span>
      <div>
        <div>
          <h1>{{ user.name }}</h1>
          <span>● Activa</span>
        </div>
        <p>{{ user.id }} · Administradora</p>
      </div>
    </header>
    <section class="profile-grid">
      <article class="card section-card">
        <div class="card-heading">
          <div>
            <h2>Información del usuario</h2>
            <p>Identidad y datos de contacto</p>
          </div>
        </div>
        <dl>
          <div>
            <dt>Nombre completo</dt>
            <dd>{{ user.name }}</dd>
          </div>
          <div>
            <dt>Correo electrónico</dt>
            <dd>
              <a [href]="'mailto:' + user.email">{{ user.email }}</a>
            </dd>
          </div>
          <div>
            <dt>Rol</dt>
            <dd>Administradora</dd>
          </div>
          <div>
            <dt>Idioma</dt>
            <dd>Español</dd>
          </div>
          <div>
            <dt>Creada</dt>
            <dd>{{ user.createdAt | date: 'dd MMM y, HH:mm' : '' : i18n.locale() }}</dd>
          </div>
          <div>
            <dt>Último acceso</dt>
            <dd>{{ user.lastLoginAt | date: 'dd MMM y, HH:mm' : '' : i18n.locale() }}</dd>
          </div>
        </dl>
      </article>
      <aside class="card section-card">
        <div class="card-heading">
          <div>
            <h2>Acceso</h2>
            <p>Estado de la cuenta</p>
          </div>
        </div>
        <div class="access">
          <span>Estado</span><b class="success">● Activa</b><span>Organización</span
          ><b>SpeedLink México</b><span>Autenticación</span><b>Contraseña</b>
        </div>
      </aside>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .profile-hero {
        margin: 15px 0 20px;
        display: flex;
        align-items: center;
        gap: 13px;
      }
      .profile-avatar {
        width: 58px;
        height: 58px;
        border-radius: 16px;
        background: #dbeafe;
        color: #1d4ed8;
        display: grid;
        place-items: center;
        font-size: 17px;
        font-weight: 800;
      }
      .profile-hero > div > div {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .profile-hero > div > div > span {
        padding: 5px 8px;
        border-radius: 99px;
        background: #dcfce7;
        color: #15803d;
        font-size: 10px;
        font-weight: 700;
      }
      .profile-hero p {
        margin-top: 5px;
        color: var(--color-text-secondary);
      }
      .profile-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 300px;
        gap: 16px;
      }
      .profile-grid dl {
        margin: 18px 0 0;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0 24px;
      }
      .profile-grid dl > div {
        min-height: 70px;
        padding: 11px 0;
        border-bottom: 1px solid var(--color-border);
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .profile-grid dt,
      .access span {
        color: var(--color-text-secondary);
        font-size: 10px;
      }
      .profile-grid dd {
        margin: 0;
        font-weight: 650;
      }
      .profile-grid dd a {
        color: var(--color-primary);
      }
      .access {
        margin-top: 18px;
        display: grid;
        gap: 7px;
      }
      .access b {
        margin-bottom: 12px;
      }
      @media (max-width: 760px) {
        .profile-grid,
        .profile-grid dl {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfilePage {
  readonly i18n = inject(LanguageService);
  private readonly route = inject(ActivatedRoute);
  readonly user = {
    id: this.route.snapshot.paramMap.get('id') ?? 'usr-andrea-torres',
    name: 'Andrea Torres',
    email: 'andrea.torres@speedlink.mx',
    createdAt: '2025-01-12T09:30:00-06:00',
    lastLoginAt: '2026-07-18T15:28:00-06:00',
  };
}
