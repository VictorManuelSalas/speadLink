# SpeedLink frontend

Cascarón Angular basado en los mockups de ISP Hub.

## Desarrollo con Docker

```bash
docker compose up --build
```

Abre `http://localhost:4200`. Los cambios dentro de `src/` se recargan automáticamente.

## Producción local

```bash
docker compose --profile production up frontend-production --build
```

La versión optimizada queda disponible en `http://localhost:8080` y se sirve con Nginx.

Para detener los contenedores:

```bash
docker compose down
```

La aplicación incluye dashboard, configuración de organización, modo oscuro, menú colapsable, notificaciones, perfil y páginas provisionales para las rutas pendientes.

## Idioma y preferencias regionales

La aplicación carga traducciones en tiempo de ejecución desde `public/i18n`. Actualmente incluye `es-MX` y `en-US`.

Cuando el backend entregue las preferencias del usuario, el servicio de autenticación debe aplicarlas así:

```ts
await i18n.applyUserPreferences({
  language: user.preferences.language,
  timezone: user.preferences.timezone,
  currency: user.preferences.currency
});
```

Si todavía no hay una preferencia del backend, el orden de selección es: idioma guardado localmente, idioma del navegador y finalmente `es-MX`.
