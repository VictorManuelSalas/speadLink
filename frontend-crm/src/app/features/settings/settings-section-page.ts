import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SETTINGS_SECTIONS, SettingsRow, SettingsSectionKey } from './settings.data';

@Component({
  selector: 'app-settings-section-page',
  imports: [FormsModule, RouterLink],
  template: `
    <header class="settings-header settings-header--section">
      <div>
        <div class="breadcrumbs">
          <a routerLink="/settings">Ajustes</a><b>›</b><span>{{ section().group }}</span
          ><b>›</b><span>{{ section().shortTitle }}</span>
        </div>
        <div class="settings-title">
          <span class="settings-icon settings-icon--large"
            ><img [src]="section().icon" alt=""
          /></span>
          <div>
            <h1>{{ section().title }}</h1>
            <p>{{ section().description }}</p>
          </div>
        </div>
      </div>
      <button class="button button--primary" (click)="openEditor()">
        ＋ {{ section().action }}
      </button>
    </header>

    <section class="settings-metrics">
      @for (metric of section().metrics; track metric.label) {
        <article class="settings-metric settings-metric--{{ metric.tone }}">
          <span>{{ metric.label }}</span
          ><strong>{{ metric.value }}</strong
          ><small>{{ metric.note }}</small>
        </article>
      }
    </section>

    <section class="settings-content-card">
      <header class="settings-content-card__header">
        <div>
          <h2>{{ section().singleton ? 'Configuración actual' : section().shortTitle }}</h2>
          <p>
            {{ filteredRows().length }}
            {{ filteredRows().length === 1 ? 'registro' : 'registros' }} visibles
          </p>
        </div>
        <label class="settings-search"
          ><span>⌕</span
          ><input
            type="search"
            placeholder="Buscar en esta sección…"
            [ngModel]="query()"
            (ngModelChange)="query.set($event)"
        /></label>
      </header>

      <div class="settings-list">
        @for (row of filteredRows(); track row.id) {
          <article class="settings-row">
            <span class="settings-row__avatar">{{ initials(row.title) }}</span>
            <span class="settings-row__main"
              ><b>{{ row.title }}</b
              ><small>{{ row.subtitle }}</small></span
            >
            <span class="settings-row__meta">{{ row.meta }}</span>
            <span class="settings-status settings-status--{{ row.tone }}"
              ><i></i>{{ row.status }}</span
            >
            <button class="icon-button" aria-label="Más opciones" (click)="selectRow(row)">
              •••
            </button>
          </article>
        } @empty {
          <div class="settings-empty">
            <span>⌕</span>
            <h2>Sin resultados</h2>
            <p>Prueba con otro término de búsqueda.</p>
          </div>
        }
      </div>
    </section>

    <section class="settings-schema-note">
      <span>✓</span>
      <div>
        <b>Configuración alineada con el modelo de datos</b>
        <p>
          Los campos obligatorios y relaciones de esta vista corresponden al esquema operativo de
          SpeedLink.
        </p>
      </div>
    </section>

    @if (editorOpen()) {
      <button class="settings-modal-backdrop" aria-label="Cerrar" (click)="closeEditor()"></button>
      <section
        class="settings-modal"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="section().action"
      >
        <header>
          <div>
            <span>{{ section().group }}</span>
            <h2>{{ selectedRow() ? 'Editar ' + section().shortTitle : section().action }}</h2>
            <p>Completa la información requerida para guardar la configuración.</p>
          </div>
          <button class="icon-button" (click)="closeEditor()">×</button>
        </header>
        <form (submit)="save($event)">
          <div class="settings-form-grid">
            @for (field of section().fields; track field.key) {
              <label [class.settings-field--wide]="field.type === 'textarea'"
                ><span
                  >{{ field.label }}
                  @if (field.required) {
                    <b>*</b>
                  }
                </span>
                @if (field.type === 'select') {
                  <span class="settings-select"
                    ><select [required]="field.required">
                      <option value="">Seleccionar</option>
                      @for (option of field.options; track option) {
                        <option [selected]="field.value === option">{{ option }}</option>
                      }</select
                    ><i>⌄</i></span
                  >
                } @else if (field.type === 'textarea') {
                  <textarea
                    rows="4"
                    [required]="field.required"
                    [value]="field.value ?? ''"
                  ></textarea>
                } @else {
                  <input
                    [type]="field.type"
                    [required]="field.required"
                    [value]="field.value ?? ''"
                  />
                }
              </label>
            }
          </div>
          @if (!section().fields.length) {
            <div class="settings-readonly">
              <span>⇩</span>
              <p>Esta vista es de consulta. Usa exportar para descargar los registros visibles.</p>
            </div>
          }
          <footer>
            <button type="button" class="button" (click)="closeEditor()">Cancelar</button
            ><button class="button button--primary" type="submit">
              {{ section().fields.length ? 'Guardar cambios' : 'Exportar' }}
            </button>
          </footer>
        </form>
      </section>
    }

    @if (toast()) {
      <div class="settings-toast"><span>✓</span>{{ toast() }}</div>
    }
  `,
  styleUrl: './settings-pages.scss',
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
