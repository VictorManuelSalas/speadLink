# SpeedLink CRM

Base frontend del CRM SaaS para proveedores de internet. Reconstruida en Angular standalone a partir de una referencia visual React/Figma, sin reutilizar su arquitectura ni dependencias.

## Alcance implementado

- App shell responsive, sidebar colapsable/drawer, header y notificaciones visuales.
- Routing lazy para Dashboard, Clientes, detalle de cliente y 404.
- Dashboard con KPIs y visualizaciones livianas.
- Listado de clientes con búsqueda, estado, paginación y estados de UI.
- Detalle de cliente con resumen, facturación, pagos y secciones preparadas.
- Data access mock intercambiable, datos mexicanos y moneda MXN.
- Tailwind CSS 4, SCSS y tokens visuales globales.
- Docker para desarrollo con hot reload y producción con Nginx.

## Desarrollo con Docker

```bash
docker compose up --build
```

Abrir `http://localhost:4200`. No requiere Node local.

## Build de producción

```bash
docker compose -f docker-compose.prod.yml up --build
```

Abrir `http://localhost:8080`. Nginx incluye fallback para rutas Angular y healthcheck en `/health`.

## Calidad, siempre dentro de Docker

No instales Node, Angular CLI ni dependencias en la computadora. Ejecuta todos los comandos con contenedores:

```bash
docker compose run --rm frontend npm run build
docker compose run --rm frontend npm test -- --run
```

## Arquitectura

`core/data-access` define el contrato global `CrmDataAccess`; `MockCrmDataAccess` es el singleton de infraestructura actual. Los features mantienen su estado de página y consumen el token `CRM_DATA`, de modo que una futura implementación HTTP puede sustituirlo sin modificar las vistas. Las rutas cargan cada feature bajo demanda, validan sesión/permisos y el estado de UI usa Angular Signals.

Los módulos fuera de Dashboard y Clientes se muestran únicamente como navegación deshabilitada. No forman parte de esta entrega.
