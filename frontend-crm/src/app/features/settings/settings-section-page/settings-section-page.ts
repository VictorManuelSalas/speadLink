import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SETTINGS_SECTIONS, SettingsRow, SettingsSectionKey } from '../settings.data';

@Component({
  selector: 'app-settings-section-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './settings-section-page.html',
  styleUrl: '../settings-pages.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsSectionPage {
  private readonly route = inject(ActivatedRoute);
  readonly section = signal(SETTINGS_SECTIONS.organization);
  readonly rows = signal<readonly SettingsRow[]>([]);
  readonly query = signal('');
  readonly editorOpen = signal(false);
  readonly selectedRow = signal<SettingsRow | null>(null);
  readonly toast = signal('');
  readonly filteredRows = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();
    return query
      ? this.rows().filter((row) =>
          `${row.title} ${row.subtitle} ${row.meta}`.toLocaleLowerCase().includes(query),
        )
      : this.rows();
  });

  constructor() {
    this.route.data.subscribe((data) => {
      const section =
        SETTINGS_SECTIONS[data['section'] as SettingsSectionKey] ?? SETTINGS_SECTIONS.organization;
      this.section.set(section);
      this.rows.set(section.rows);
      this.query.set('');
      this.closeEditor();
    });
  }

  initials(value: string): string {
    return value
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toLocaleUpperCase();
  }
  openEditor(): void {
    this.selectedRow.set(null);
    this.editorOpen.set(true);
  }
  selectRow(row: SettingsRow): void {
    this.selectedRow.set(row);
    this.editorOpen.set(true);
  }
  closeEditor(): void {
    this.editorOpen.set(false);
    this.selectedRow.set(null);
  }
  save(event: Event): void {
    event.preventDefault();
    const selected = this.selectedRow();
    if (!selected && !this.section().singleton && this.section().fields.length) {
      const id = `${this.section().key}-${Date.now()}`;
      this.rows.update((rows) => [
        {
          id,
          title: `Nuevo ${this.section().shortTitle}`,
          subtitle: 'Configuración creada localmente',
          meta: 'Ahora mismo',
          status: 'Activo',
          tone: 'active',
        },
        ...rows,
      ]);
    }
    this.closeEditor();
    this.toast.set(
      this.section().fields.length
        ? 'Configuración guardada correctamente'
        : 'Exportación preparada',
    );
    window.setTimeout(() => this.toast.set(''), 2600);
  }
}
