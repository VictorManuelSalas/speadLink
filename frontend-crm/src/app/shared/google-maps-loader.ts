/**
 * Carga única de la API de Google Maps.
 *
 * Vive aparte porque más de una pantalla la necesita (el selector de GPS del
 * cliente y el mapa del dashboard) y el `<script>` sólo debe inyectarse una vez:
 * cargarlo dos veces tira la API con un error de "included multiple times".
 */

let loader: Promise<void> | undefined;

/** Nombre del callback global que invoca la API cuando ya está lista. */
const READY_CALLBACK = '__speedlinkGoogleMapsReady';

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof google !== 'undefined' && google.maps?.Map) return Promise.resolve();
  if (loader) return loader;
  const bootstrapped = new Promise<void>((resolve, reject) => {
    // Con `loading=async` el `onload` del script se dispara antes de que
    // `google.maps` exista: hay que esperar el callback que la propia API llama.
    (window as unknown as Record<string, unknown>)[READY_CALLBACK] = () => resolve();
    const script = document.createElement('script');
    script.src =
      'https://maps.googleapis.com/maps/api/js' +
      `?key=${encodeURIComponent(apiKey)}` +
      `&loading=async&v=weekly&language=es&region=MX&callback=${READY_CALLBACK}`;
    script.async = true;
    script.onerror = () => reject(new Error('No fue posible descargar Google Maps'));
    document.head.appendChild(script);
  });
  // El callback sólo garantiza el bootstrap. La clase `Map` vive en la librería
  // `maps`, que se descarga aparte: construir un mapa antes de tenerla deja el
  // contenedor en blanco para siempre (ni tiles ni `bounds`).
  loader = bootstrapped.then(async () => {
    await google.maps.importLibrary('maps');
  });
  // Un fallo no debe dejar la promesa cacheada: si no, un corte de red temporal
  // impediría reintentar durante toda la sesión.
  loader.catch(() => (loader = undefined));
  return loader;
}
