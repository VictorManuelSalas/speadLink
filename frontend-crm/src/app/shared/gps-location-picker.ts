import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

declare global {
  interface Window {
    __SPEEDLINK_CONFIG__?: { googleMapsApiKey?: string };
  }
}

let googleMapsLoader: Promise<void> | undefined;

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof google !== 'undefined' && google.maps) return Promise.resolve();
  if (googleMapsLoader) return googleMapsLoader;
  googleMapsLoader = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&v=weekly&language=es&region=MX`;
    script.async = true;
    script.onload = () =>
      typeof google !== 'undefined' && google.maps
        ? resolve()
        : reject(new Error('Google Maps no se cargó'));
    script.onerror = () => reject(new Error('No fue posible descargar Google Maps'));
    document.head.appendChild(script);
  });
  return googleMapsLoader;
}

@Component({
  selector: 'app-gps-location-picker',
  template: `
    <div class="gps-field">
      <span class="gps-field__label">Ubicación GPS</span>
      <div class="gps-field__value">
        <a
          [href]="googleMapsUrl()"
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir ubicación en Google Maps"
        >
          {{ value() }}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 5h5v5M19 5l-8 8M17 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5" />
          </svg>
        </a>
        <button
          class="edit-button"
          type="button"
          aria-label="Editar ubicación GPS"
          (click)="openPicker()"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20ZM14 7l3 3" />
          </svg>
        </button>
      </div>
    </div>

    @if (opened()) {
      <button
        class="map-backdrop"
        type="button"
        aria-label="Cerrar mapa"
        (click)="close()"
      ></button>
      <section class="map-dialog" role="dialog" aria-modal="true" aria-labelledby="map-title">
        <header>
          <div>
            <span>UBICACIÓN DEL CLIENTE</span>
            <h2 id="map-title">Seleccionar coordenadas</h2>
            <p>Haz clic en el mapa o arrastra el marcador hasta la instalación.</p>
          </div>
          <button type="button" class="map-close" aria-label="Cerrar" (click)="close()">×</button>
        </header>

        <div class="map-frame">
          @if (interactiveMapReady()) {
            <div
              #mapContainer
              class="map-canvas"
              aria-label="Mapa de Google para seleccionar ubicación"
            ></div>
          } @else {
            <iframe
              class="map-canvas"
              [src]="googleMapsEmbedUrl()"
              title="Ubicación del cliente en Google Maps"
              loading="eager"
              referrerpolicy="no-referrer-when-downgrade"
              allowfullscreen
            ></iframe>
            @if (mapLoading()) {
              <div class="map-loading"><span></span> Cargando Google Maps…</div>
            }
          }
        </div>

        <div class="map-controls">
          <label>
            <span>Latitud</span>
            <input
              #latInput
              type="number"
              step="0.000001"
              [value]="latitude()"
              (change)="setManualCoordinates(latInput.value, lngInput.value)"
            />
          </label>
          <label>
            <span>Longitud</span>
            <input
              #lngInput
              type="number"
              step="0.000001"
              [value]="longitude()"
              (change)="setManualCoordinates(latInput.value, lngInput.value)"
            />
          </label>
          <button
            type="button"
            class="location-button"
            [disabled]="locating()"
            (click)="useDeviceLocation()"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
            {{ locating() ? 'Buscando…' : 'Usar mi ubicación' }}
          </button>
        </div>

        @if (message()) {
          <p class="map-message">{{ message() }}</p>
        }
        <footer>
          <button type="button" class="button" (click)="close()">Cancelar</button>
          <button
            type="button"
            class="button button--primary"
            [disabled]="!validCoordinates()"
            (click)="save()"
          >
            Guardar coordenadas
          </button>
        </footer>
      </section>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .gps-field {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .gps-field__label {
        color: var(--color-text-secondary);
        font-size: 11px;
      }
      .gps-field__value {
        min-height: 30px;
        display: flex;
        flex-direction: row !important;
        align-items: center;
        gap: 8px;
      }
      .gps-field__value a {
        min-width: 0;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        overflow: hidden;
        color: var(--color-text-primary);
        font-size: 12.5px;
        font-weight: 700;
        text-decoration: none;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .gps-field__value a:hover {
        color: var(--color-primary);
        text-decoration: underline;
        text-underline-offset: 3px;
      }
      svg {
        width: 16px;
        height: 16px;
        flex: 0 0 16px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .edit-button {
        width: 28px;
        height: 28px;
        flex: 0 0 28px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: var(--color-text-secondary);
        display: grid;
        place-items: center;
        opacity: 0;
      }
      .gps-field:hover .edit-button,
      .edit-button:focus-visible {
        opacity: 1;
      }
      .edit-button:hover {
        background: var(--color-muted);
        color: var(--color-primary);
      }
      .map-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        border: 0;
        background: rgba(15, 23, 42, 0.52);
        backdrop-filter: blur(3px);
      }
      .map-dialog {
        position: fixed;
        left: 50%;
        top: 50%;
        z-index: 1001;
        width: min(820px, calc(100vw - 30px));
        max-height: calc(100vh - 30px);
        overflow-y: auto;
        border: 1px solid var(--color-border);
        border-radius: 18px;
        background: var(--color-surface);
        color: var(--color-text-primary);
        box-shadow: 0 30px 80px rgba(15, 23, 42, 0.32);
        transform: translate(-50%, -50%);
      }
      .map-dialog > header {
        padding: 22px 24px 18px;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;
      }
      .map-dialog > header span {
        color: var(--color-primary);
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.09em;
      }
      .map-dialog h2 {
        margin: 5px 0 0;
        font-size: 20px;
      }
      .map-dialog header p {
        margin: 4px 0 0;
        color: var(--color-text-secondary);
        font-size: 12px;
      }
      .map-close {
        width: 34px;
        height: 34px;
        border: 0;
        border-radius: 50%;
        background: var(--color-muted);
        color: var(--color-text-primary);
        font-size: 23px;
      }
      .map-canvas {
        display: block;
        width: 100%;
        height: 390px;
        border: 0;
        background: #e5e7eb;
      }
      .map-frame {
        position: relative;
        margin: 0 24px;
        overflow: hidden;
        border: 1px solid var(--color-border);
        border-radius: 14px;
        background: #e5e7eb;
      }
      .map-loading {
        position: absolute;
        left: 50%;
        top: 50%;
        padding: 10px 14px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.94);
        color: #334155;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 8px 25px rgba(15, 23, 42, 0.18);
        transform: translate(-50%, -50%);
        font-size: 11px;
        font-weight: 700;
      }
      .map-loading span {
        width: 14px;
        height: 14px;
        border: 2px solid #bfdbfe;
        border-top-color: #2563eb;
        border-radius: 50%;
        animation: map-spin 0.7s linear infinite;
      }
      .map-controls {
        padding: 16px 24px 10px;
        display: grid;
        grid-template-columns: 1fr 1fr auto;
        align-items: end;
        gap: 12px;
      }
      .map-controls label {
        display: flex;
        flex-direction: column;
        gap: 5px;
        color: var(--color-text-secondary);
        font-size: 10px;
        font-weight: 700;
      }
      .map-controls input {
        width: 100%;
        height: 38px;
        padding: 0 11px;
        border: 1px solid var(--color-border);
        border-radius: 9px;
        outline: 0;
        background: var(--color-background);
        color: var(--color-text-primary);
        font: inherit;
        font-size: 12px;
      }
      .map-controls input:focus {
        border-color: #60a5fa;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
      }
      .location-button {
        min-height: 38px;
        padding: 0 14px;
        border: 1px solid #bfdbfe;
        border-radius: 9px;
        background: #eff6ff;
        color: #1d4ed8;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        font-size: 11px;
        font-weight: 750;
      }
      .location-button:disabled {
        opacity: 0.6;
      }
      .map-message {
        margin: 0 24px;
        color: var(--color-text-secondary);
        font-size: 11px;
      }
      footer {
        padding: 16px 24px 22px;
        display: flex;
        justify-content: flex-end;
        gap: 9px;
      }
      .button {
        min-height: 38px;
        padding: 0 16px;
        border: 1px solid var(--color-border);
        border-radius: 9px;
        background: var(--color-surface);
        color: var(--color-text-primary);
        font-weight: 700;
      }
      .button--primary {
        border-color: var(--color-primary);
        background: var(--color-primary);
        color: #fff;
      }
      .button:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }
      @keyframes map-spin {
        to {
          transform: rotate(360deg);
        }
      }
      @media (max-width: 650px) {
        .map-canvas {
          height: 330px;
        }
        .map-frame {
          margin-inline: 14px;
        }
        .map-dialog > header,
        footer {
          padding-inline: 16px;
        }
        .map-controls {
          padding-inline: 14px;
          grid-template-columns: 1fr 1fr;
        }
        .location-button {
          grid-column: 1 / -1;
        }
      }
      @media (hover: none) {
        .edit-button {
          opacity: 1;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GpsLocationPicker implements OnDestroy {
  @ViewChild('mapContainer') private mapContainer?: ElementRef<HTMLDivElement>;

  private readonly sanitizer = inject(DomSanitizer);

  readonly value = input.required<string>();
  readonly locationSaved = output<string>();
  readonly opened = signal(false);
  readonly latitude = signal(19.432608);
  readonly longitude = signal(-99.133209);
  readonly locating = signal(false);
  readonly mapLoading = signal(false);
  readonly interactiveMapReady = signal(false);
  readonly message = signal('');
  readonly validCoordinates = computed(
    () =>
      Number.isFinite(this.latitude()) &&
      Number.isFinite(this.longitude()) &&
      Math.abs(this.latitude()) <= 90 &&
      Math.abs(this.longitude()) <= 180,
  );
  readonly googleMapsUrl = computed(() => {
    const [latitude, longitude] = this.parseCoordinates(this.value());
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;
  });
  readonly googleMapsEmbedUrl = computed<SafeResourceUrl>(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://maps.google.com/maps?q=${this.latitude()},${this.longitude()}&z=17&output=embed`,
    ),
  );

  private map?: google.maps.Map;
  private marker?: google.maps.Marker;

  openPicker(): void {
    const [latitude, longitude] = this.parseCoordinates(this.value());
    this.latitude.set(latitude);
    this.longitude.set(longitude);
    this.message.set('');
    this.opened.set(true);
    setTimeout(() => this.initializeGoogleMap());
  }

  close(): void {
    this.destroyMap();
    this.opened.set(false);
    this.locating.set(false);
  }

  save(): void {
    if (!this.validCoordinates()) return;
    this.locationSaved.emit(`${this.latitude().toFixed(6)}, ${this.longitude().toFixed(6)}`);
    this.close();
  }

  setManualCoordinates(latitudeValue: string, longitudeValue: string): void {
    const latitude = Number(latitudeValue);
    const longitude = Number(longitudeValue);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    this.setCoordinates(latitude, longitude, true);
  }

  useDeviceLocation(): void {
    if (!navigator.geolocation) {
      this.message.set('Este navegador no permite detectar la ubicación.');
      return;
    }
    this.locating.set(true);
    this.message.set('Solicitando tu ubicación al navegador…');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        this.locating.set(false);
        this.message.set('Ubicación detectada. Puedes ajustarla antes de guardar.');
        this.setCoordinates(coords.latitude, coords.longitude, true);
      },
      () => {
        this.locating.set(false);
        this.message.set(
          'No fue posible obtener tu ubicación. Revisa el permiso del navegador o captura las coordenadas.',
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.opened()) this.close();
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  private initializeGoogleMap(): void {
    const apiKey = window.__SPEEDLINK_CONFIG__?.googleMapsApiKey?.trim();
    if (!apiKey) {
      this.message.set(
        'Google Maps está activo con pin y controles. Configura la API key para seleccionar también con clic o arrastre.',
      );
      return;
    }
    this.mapLoading.set(true);
    loadGoogleMaps(apiKey)
      .then(() => {
        this.interactiveMapReady.set(true);
        setTimeout(() => this.createInteractiveMap());
      })
      .catch(() => {
        this.mapLoading.set(false);
        this.message.set(
          'No se pudo cargar la API interactiva. Se mantiene la vista de Google Maps.',
        );
      });
  }

  private createInteractiveMap(): void {
    const container = this.mapContainer?.nativeElement;
    if (!container || this.map) return;
    const position = { lat: this.latitude(), lng: this.longitude() };
    this.map = new google.maps.Map(container, {
      center: position,
      zoom: 17,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControl: true,
      mapTypeControlOptions: {
        mapTypeIds: [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.SATELLITE],
        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
      },
      zoomControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      clickableIcons: false,
    });
    this.marker = new google.maps.Marker({
      position,
      map: this.map,
      draggable: true,
      title: 'Ubicación del cliente',
      animation: google.maps.Animation.DROP,
    });
    this.map.addListener('click', (event: google.maps.MapMouseEvent) => {
      const location = event.latLng;
      if (location) this.setCoordinates(location.lat(), location.lng());
    });
    this.marker.addListener('dragend', (event: google.maps.MapMouseEvent) => {
      const location = event.latLng;
      if (location) this.setCoordinates(location.lat(), location.lng());
    });
    this.mapLoading.set(false);
    this.message.set('Haz clic en el mapa o arrastra el pin para ajustar la ubicación.');
  }

  private setCoordinates(latitude: number, longitude: number, center = false): void {
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;
    this.latitude.set(Number(latitude.toFixed(6)));
    this.longitude.set(Number(longitude.toFixed(6)));
    const position = { lat: latitude, lng: longitude };
    this.marker?.setPosition(position);
    if (center && this.map) {
      this.map.panTo(position);
      if ((this.map.getZoom() ?? 0) < 17) this.map.setZoom(17);
    }
  }

  private parseCoordinates(value: string): [number, number] {
    const [latitude, longitude] = value.split(',').map((part) => Number(part.trim()));
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) return [latitude, longitude];
    return [19.432608, -99.133209];
  }

  private destroyMap(): void {
    if (this.marker) google.maps.event.clearInstanceListeners(this.marker);
    if (this.map) google.maps.event.clearInstanceListeners(this.map);
    this.marker?.setMap(null);
    this.map = undefined;
    this.marker = undefined;
    this.interactiveMapReady.set(false);
    this.mapLoading.set(false);
  }
}
