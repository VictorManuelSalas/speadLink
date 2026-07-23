import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SETTINGS_GROUPS, SETTINGS_SECTIONS, SettingsSectionKey } from '../settings.data';

@Component({
  selector: 'app-settings-overview-page',
  imports: [RouterLink],
  templateUrl: './settings-overview-page.html',
  styleUrl: '../settings-pages.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsOverviewPage {
  readonly groups = SETTINGS_GROUPS;

  section(key: string) {
    return SETTINGS_SECTIONS[key as SettingsSectionKey];
  }
}
