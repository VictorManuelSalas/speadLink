import { Component, signal } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-organization',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './organization.component.html',
  styleUrl: './organization.component.scss'
})
export class OrganizationComponent {
  protected readonly activeTab = signal('settings.companyDetails');
  protected readonly timezoneOpen = signal(false);
  protected readonly tabs = ['settings.companyDetails', 'settings.businessHours', 'settings.currencies', 'settings.dateFormat'];

  protected toggleTimezone(): void {
    this.timezoneOpen.update((value) => !value);
  }
}
