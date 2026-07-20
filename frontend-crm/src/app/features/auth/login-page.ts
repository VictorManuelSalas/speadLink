import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionContext } from '../../core/auth/session-context';
import { LanguageService } from '../../core/i18n/language.service';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly session = inject(SessionContext);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly i18n = inject(LanguageService);
  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly error = signal('');
  email = '';
  password = '';
  remember = true;

  useDemoCredentials(): void {
    this.email = 'andrea.torres@speedlink.mx';
    this.password = 'SpeedLink2026!';
    this.error.set('');
  }

  clearError(): void {
    this.error.set('');
  }

  submit(): void {
    if (this.loading() || !this.email || this.password.length < 8) return;
    this.loading.set(true);
    this.error.set('');
    window.setTimeout(() => {
      const result = this.session.login(this.email, this.password, this.remember);
      this.loading.set(false);
      if (!result.success) {
        this.error.set(result.message ?? 'No se pudo iniciar sesión. Inténtalo de nuevo.');
        return;
      }
      const requested = this.route.snapshot.queryParamMap.get('returnUrl');
      const returnUrl =
        requested?.startsWith('/') && !requested.startsWith('//') ? requested : '/dashboard';
      void this.router.navigateByUrl(returnUrl, { replaceUrl: true });
    }, 450);
  }
}
