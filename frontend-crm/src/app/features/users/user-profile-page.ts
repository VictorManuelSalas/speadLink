import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LanguageService } from '../../core/i18n/language.service';

@Component({
  selector: 'app-user-profile-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './user-profile-page.html',
  styleUrl: './user-profile-page.scss',
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
