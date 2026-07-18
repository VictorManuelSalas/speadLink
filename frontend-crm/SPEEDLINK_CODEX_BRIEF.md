# SpeedLink CRM — Guía de implementación para Codex

## 1. Objetivo

Construir el frontend web de **SpeedLink CRM**, una plataforma SaaS multi-tenant para proveedores de internet (ISP). El ZIP adjunto contiene un prototipo generado por Figma en React. Debe utilizarse **solo como referencia visual y funcional**.

La aplicación final debe implementarse desde cero con **Angular**, TypeScript y Docker. No debe conservar React, Vite, Radix UI, Recharts ni componentes específicos del prototipo.

El objetivo inicial es reproducir y mejorar el diseño existente, conservar su identidad visual y construir una base escalable para integrar posteriormente el backend NestJS.

---

## 2. Instrucciones críticas

1. Usar Angular con componentes standalone.
2. Usar TypeScript estricto.
3. No migrar el código React línea por línea.
4. Analizar el prototipo y reconstruir sus componentes de forma nativa en Angular.
5. Mantener la apariencia general: dashboard SaaS moderno, limpio, claro y profesional.
6. Separar correctamente layouts, páginas, componentes reutilizables, modelos, servicios y estado.
7. No colocar toda la aplicación en un solo componente.
8. Evitar datos hardcodeados dentro de componentes de presentación.
9. El proyecto debe poder levantarse completamente con Docker.
10. Toda funcionalidad creada debe ser responsive y accesible.
11. No conectar todavía a APIs reales salvo que exista un endpoint documentado. Implementar servicios mock reemplazables.
12. No agregar librerías grandes sin una justificación clara.
13. No cambiar el diseño visual principal sin documentar la razón.
14. Todos los textos visibles deben estar preparados para internacionalización; español será el idioma inicial.
15. Moneda inicial: MXN. Zona horaria configurable por organización.

---

## 3. Stack obligatorio

### Frontend

- Angular, versión estable disponible en el entorno.
- TypeScript con `strict: true`.
- Angular standalone components.
- Angular Router.
- Angular Signals para estado local y estado de UI.
- RxJS para flujos asíncronos, HTTP y WebSockets.
- Angular Reactive Forms.
- Angular HttpClient.
- SCSS o CSS con variables de diseño.
- Tailwind CSS es aceptable y recomendado para acelerar la reproducción del diseño.
- Lucide Angular para iconografía.
- Apache ECharts o Chart.js mediante integración Angular para gráficas.
- Angular CDK para overlays, accesibilidad, focus management, menús y tablas cuando sea útil.

### Calidad

- ESLint.
- Prettier.
- Tests unitarios con la herramienta recomendada por la versión de Angular instalada.
- Playwright para pruebas end-to-end.
- Husky y lint-staged son opcionales.

### Infraestructura local

- Docker.
- Docker Compose.
- Desarrollo con hot reload dentro del contenedor.
- Build de producción multi-stage.
- Nginx para servir el build de Angular en producción.

---

## 4. Contexto del prototipo incluido

El ZIP adjunto contiene un prototipo React generado por Figma con estas características:

- Dashboard SaaS con sidebar fijo y header superior.
- Métricas de MRR, clientes activos, churn y ARPU.
- Gráfica de ingresos y distribución de planes.
- Módulo de clientes.
- Vista detallada del cliente.
- Facturas, pagos, tickets, equipos, timeline y notas simuladas.
- Navegación interna controlada por estado.
- Datos mock en el mismo archivo principal.

Problemas que no deben heredarse:

- Archivo principal excesivamente grande.
- Modelos, datos y vistas mezclados.
- Navegación sin rutas reales.
- Datos estadounidenses y montos que no corresponden al negocio SpeedLink.
- Dependencias React innecesarias para Angular.
- Componentes poco desacoplados.

Usar el prototipo como referencia de:

- Jerarquía visual.
- Espaciado.
- Sidebar.
- Header.
- Cards.
- Tablas.
- Badges.
- Tabs.
- Gráficas.
- Página de detalle de cliente.

---

## 5. Identidad del producto

Nombre visible: **SpeedLink CRM**.

Evitar nombres temporales como `NexusISP`.

### Estilo visual

- SaaS moderno y premium.
- Inspiración: Stripe Dashboard, Linear y HubSpot.
- Interfaz limpia y espaciosa.
- Tarjetas con bordes sutiles.
- Sombras suaves.
- Radio de bordes aproximado de 12 px.
- Sistema de espaciado basado en múltiplos de 4 u 8.
- Animaciones discretas.
- Estados vacíos claros.
- Skeleton loaders.
- Toasts no intrusivos.

### Tokens iniciales

```css
--color-primary: #2563eb;
--color-secondary: #4f46e5;
--color-success: #22c55e;
--color-warning: #f59e0b;
--color-danger: #ef4444;
--color-background: #f8fafc;
--color-surface: #ffffff;
--color-text-primary: #0f172a;
--color-text-secondary: #64748b;
--color-border: #e2e8f0;
--radius-card: 12px;
```

Tipografía recomendada: Inter, con fallback a fuentes del sistema.

No definir colores dispersos en componentes. Centralizar tokens.

---

## 6. Arquitectura funcional del CRM

El sistema es multi-tenant. Cada recurso pertenece a una organización y toda llamada futura a la API deberá operar dentro del contexto de esa organización.

Flujo principal:

```text
Lead → Cliente → Asignación → Servicio → Factura → Pago
```

### Módulos principales

1. Dashboard.
2. Leads.
3. Clientes.
4. Servicios.
5. Asignaciones.
6. Equipos / Red.
7. Facturas.
8. Pagos.
9. Gastos.
10. Calendario.
11. Soporte.
12. Reportes.
13. Automatizaciones.
14. Configuración.

### Configuración organizacional

- Organización.
- Usuarios.
- Roles y permisos.
- SMTP.
- SMS.
- Plantillas.
- Portal de clientes.
- Módulos personalizados.
- Schedules.
- Notificaciones.
- Activity logs.
- Audit trail.
- Restricciones IP.
- 2FA.
- Webhooks.
- API management.
- Integraciones externas, por ejemplo MikroTik.

---

## 7. Módulos que deben implementarse primero

### Fase 1 — Base del frontend

- App shell.
- Sidebar responsive.
- Header.
- Breadcrumbs.
- Global search visual.
- Centro de notificaciones visual.
- Menú de usuario.
- Sistema de rutas.
- Página 404.
- Componentes base.
- Mock API layer.

### Fase 2 — Pantallas existentes del prototipo

- Dashboard.
- Customers list.
- Customer detail.

### Fase 3 — Nuevos diseños

- Services.
- Invoices.
- Network / Equipment.
- Support.

### Fase 4

- Leads.
- Assignments.
- Payments.
- Expenses.
- Calendar.

### Fase 5

- Reports.
- Automation.
- Settings.
- Roles and permissions.
- Notifications.

No intentar completar todas las fases en una sola tarea. Trabajar módulo por módulo y mantener el proyecto compilando después de cada cambio.

---

## 8. Navegación propuesta

```text
Dashboard

CRM
  Leads
  Clientes

Operación
  Servicios
  Asignaciones
  Red y Equipos
  Soporte
  Calendario

Finanzas
  Facturas
  Pagos
  Gastos

Analítica
  Reportes

Automatización
  Workflows
  Tareas programadas

Configuración
```

La sidebar debe poder colapsarse en escritorio y convertirse en drawer en móvil.

---

## 9. Requisitos de cada módulo prioritario

### 9.1 Dashboard

Widgets iniciales:

- Clientes activos.
- Ingresos mensuales recurrentes.
- Facturas pendientes.
- Facturas vencidas.
- Pagos recibidos hoy.
- Instalaciones programadas.
- Equipos disponibles.
- Tickets abiertos.

Gráficas:

- Ingresos de los últimos 12 meses.
- Crecimiento de clientes.
- Distribución de planes.
- Estado de facturas.

Secciones:

- Actividad reciente.
- Próximas instalaciones.
- Facturas recientes.
- Pagos recientes.
- Alertas de red.
- Acciones rápidas.

### 9.2 Clientes

Lista:

- Búsqueda.
- Filtros avanzados.
- Ordenamiento.
- Paginación.
- Selector de columnas.
- Acciones masivas.
- Vista tabla y opcionalmente cards.

Columnas sugeridas:

- Cliente.
- Estado.
- Plan.
- Mensualidad.
- Fecha de facturación.
- Saldo.
- Zona.
- Técnico.
- Última actividad.
- Acciones.

Estados:

- active.
- inactive.
- pending.
- suspended.
- cancelled.

Detalle del cliente:

- Resumen.
- Contacto.
- Ubicación GPS.
- Servicio y plan.
- Equipos asignados.
- Facturas.
- Pagos.
- Tickets.
- Notas.
- Emails.
- Timeline de actividad.
- Acciones rápidas.

Acciones rápidas:

- Registrar pago.
- Crear factura.
- Cambiar plan.
- Programar visita.
- Enviar correo.
- Enviar SMS.
- Suspender o reactivar servicio.

### 9.3 Servicios

Los planes iniciales reales de SpeedLink son:

| Plan | Velocidad | Precio mensual |
|---|---:|---:|
| Básico | 5 Mbps | $300 MXN |
| Intermedio | 10 Mbps | $350 MXN |
| Custom | 15 Mbps | $400 MXN |

La UI debe permitir planes configurables, por lo que esos datos no deben quedar fijos en componentes.

Pantalla de lista/cards:

- Nombre.
- Tipo de servicio.
- Velocidad de descarga.
- Velocidad de subida.
- Precio.
- Clientes activos.
- Estado.
- Fecha de creación.
- Acciones.

Detalle:

- Descripción.
- Características.
- Clientes relacionados.
- Historial de cambios.
- Notas.

### 9.4 Facturas

Estados:

- draft.
- pending.
- paid.
- overdue.
- cancelled.

Pantalla:

- Métricas de facturación.
- Tabla de facturas.
- Filtros por estado, cliente y periodo.
- Número de factura.
- Cliente.
- Fecha de emisión.
- Fecha de vencimiento.
- Total.
- Saldo.
- Estado.
- Acciones.

Detalle:

- Encabezado de factura.
- Datos del cliente.
- Conceptos.
- Subtotal, impuestos, descuentos y total.
- Pagos relacionados.
- Timeline.
- Preview estilo PDF.
- Descargar.
- Enviar por email.
- Registrar pago.
- Cancelar.

### 9.5 Red y Equipos

Este módulo combina inventario y operación de red, pero debe mantenerse modular internamente.

Inventario:

- Antenas Ubiquiti.
- LiteBeam / NanoStation.
- Routers TP-Link.
- MikroTik.
- Cables y accesorios.

Campos:

- Nombre.
- Tipo.
- Marca.
- Modelo.
- Número de serie.
- MAC address.
- Dirección IP.
- Firmware.
- Estado.
- Precio.
- Cliente asignado.
- Fecha de asignación.

Estados sugeridos:

- available.
- assigned.
- online.
- offline.
- warning.
- maintenance.
- retired.

Vistas:

- Resumen de red.
- Inventario.
- Equipos asignados.
- Alertas.
- Detalle del equipo.
- Historial de asignaciones.
- Integraciones futuras con MikroTik y Ubiquiti.

### 9.6 Soporte

Aunque soporte puede implementarse después en backend, el diseño debe quedar preparado.

Lista de tickets:

- ID.
- Asunto.
- Cliente.
- Prioridad.
- Estado.
- Técnico asignado.
- Fecha de creación.
- Última respuesta.
- SLA.

Prioridades:

- low.
- medium.
- high.
- urgent.

Estados:

- open.
- in_progress.
- waiting_customer.
- resolved.
- closed.

Detalle:

- Conversación.
- Notas internas.
- Adjuntos.
- Información del cliente.
- Equipos relacionados.
- Timeline.
- Cambio de estado y prioridad.
- Asignación de técnico.

---

## 10. Related lists

Las related lists no son módulos independientes. Son secciones dentro de la vista de un registro.

Reglas:

- Notes aplica a todos los módulos excepto Calendar.
- Emails solo aplica a Leads y Clients.
- Clients muestra Assignments, Invoices y Payments.
- Invoices muestra Payments.
- Equipments puede mostrar Expenses e historial de asignaciones.

---

## 11. Modelos TypeScript iniciales

Crear interfaces o tipos separados, evitando modelos gigantes.

Ejemplo de base:

```ts
export interface BaseEntity {
  id: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer extends BaseEntity {
  name: string;
  email?: string;
  phone?: string;
  status: CustomerStatus;
  installationDate?: string;
  gpsLocation?: string;
  billingDate?: string;
  currentBalance: number;
  serviceId?: string;
}
```

Crear modelos independientes para:

- Organization.
- User.
- Role.
- Lead.
- Customer.
- Service.
- Equipment.
- Assignment.
- Invoice.
- InvoiceItem.
- Payment.
- Expense.
- CalendarEvent.
- SupportTicket.
- Note.
- EmailLog.
- Notification.

No usar `any` salvo caso excepcional y documentado.

---

## 12. Estado y acceso a datos

Usar esta separación:

```text
Page/Container
  → Facade o Store de feature
  → API service
  → HttpClient
```

- Signals para estado local y derivado.
- RxJS para peticiones HTTP y eventos en tiempo real.
- No llamar HttpClient directamente desde componentes de presentación.
- Los servicios mock deben implementar la misma interfaz que los servicios HTTP futuros.
- Preparar estados de loading, empty, success y error.
- Implementar cancelación o reemplazo de búsquedas cuando sea necesario.

No incorporar NgRx inicialmente salvo que el crecimiento real lo justifique.

---

## 13. Rutas sugeridas

```text
/login
/dashboard
/leads
/leads/:id
/customers
/customers/:id
/services
/services/:id
/assignments
/assignments/:id
/network
/network/equipment/:id
/invoices
/invoices/:id
/payments
/payments/:id
/expenses
/calendar
/support
/support/:id
/reports
/automation
/settings
/settings/organization
/settings/users
/settings/roles
/settings/integrations
```

Usar lazy loading por feature.

---

## 14. Estructura de carpetas sugerida

```text
src/
├── app/
│   ├── app.config.ts
│   ├── app.routes.ts
│   ├── core/
│   │   ├── auth/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── layout/
│   │   ├── services/
│   │   └── models/
│   ├── shared/
│   │   ├── components/
│   │   ├── directives/
│   │   ├── pipes/
│   │   ├── utils/
│   │   └── ui/
│   └── features/
│       ├── dashboard/
│       ├── leads/
│       ├── customers/
│       ├── services/
│       ├── assignments/
│       ├── network/
│       ├── invoices/
│       ├── payments/
│       ├── expenses/
│       ├── calendar/
│       ├── support/
│       ├── reports/
│       ├── automation/
│       └── settings/
├── assets/
├── environments/
└── styles/
```

Cada feature puede contener:

```text
feature/
├── pages/
├── components/
├── data-access/
├── models/
├── utils/
└── feature.routes.ts
```

---

## 15. Componentes compartidos mínimos

Crear componentes reutilizables para:

- Page header.
- Breadcrumbs.
- KPI card.
- Chart card.
- Data table.
- Filter bar.
- Search input.
- Status badge.
- Empty state.
- Skeleton.
- Modal.
- Drawer.
- Confirmation dialog.
- Tabs.
- Pagination.
- Date range picker.
- Money display.
- Avatar.
- Timeline.
- Activity item.
- Notification item.
- Quick action button.

No convertir cada pequeño `<div>` en un componente. Extraer cuando exista reutilización o lógica propia.

---

## 16. Formularios

- Angular Reactive Forms.
- Typed forms.
- Validaciones reutilizables.
- Mensajes claros en español.
- Estados disabled y loading.
- Confirmación antes de acciones destructivas.
- Formularios largos dentro de secciones o steps.
- Evitar modales excesivamente grandes; usar drawer o página cuando corresponda.

---

## 17. Multi-tenancy y seguridad visual

Preparar la interfaz para:

- Selector de organización cuando el usuario tenga acceso a varias.
- `organizationId` en contexto global.
- Ocultar acciones según permisos.
- Guardas de rutas.
- Directiva o helper `hasPermission`.
- No asumir que ocultar botones sustituye validación backend.

Roles iniciales:

- superadmin.
- admin.
- manager.
- employee.

Permisos por módulo:

- create.
- read.
- update.
- delete.

---

## 18. Integración futura con backend

Backend esperado:

- NestJS.
- PostgreSQL + Prisma.
- MongoDB para logs, historial y notificaciones.
- Redis.
- BullMQ.
- JWT y refresh tokens.
- WebSockets con Socket.IO.

Preparar:

- `environment.apiBaseUrl`.
- `environment.wsUrl`.
- Auth interceptor.
- Error interceptor.
- Tenant context interceptor.
- Refresh token flow.
- Socket service reemplazable.

No implementar URLs fijas dentro de componentes.

---

## 19. Notificaciones

Panel en header con:

- Badge de no leídas.
- Marcar individual como leída.
- Marcar todas como leídas.
- Eliminar.
- Navegar al registro origen.

Modelo conceptual:

```ts
interface Notification {
  id: string;
  organizationId: string;
  userId: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string;
  sourceModule?: string;
  sourceRecordId?: string;
  createdAt: string;
}
```

---

## 20. Docker

### Archivos requeridos

- `Dockerfile` multi-stage.
- `Dockerfile.dev` o target de desarrollo.
- `docker-compose.yml`.
- `.dockerignore`.
- Configuración Nginx para producción.

### Requisitos de desarrollo

El comando esperado debe ser:

```bash
docker compose up --build
```

La aplicación debe quedar disponible en:

```text
http://localhost:4200
```

No exigir instalación local de Node ni dependencias fuera de Docker.

Ejemplo conceptual de servicios:

```yaml
services:
  frontend:
    build:
      context: .
      target: development
    ports:
      - "4200:4200"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - CHOKIDAR_USEPOLLING=true
```

Configurar Angular dev server para escuchar en `0.0.0.0`.

### Producción

- Compilar Angular en una etapa Node.
- Copiar archivos estáticos a Nginx.
- Configurar fallback de SPA hacia `index.html`.
- Agregar healthcheck cuando sea razonable.
- Ejecutar como usuario no root cuando la imagen lo permita.

---

## 21. Datos mock

Crear mocks realistas mexicanos, por ejemplo:

- Nombres y teléfonos mexicanos.
- Direcciones de comunidades y ciudades mexicanas.
- MXN.
- Planes de SpeedLink.
- Equipos Ubiquiti, TP-Link y MikroTik.
- Facturación mensual.
- Transferencia, efectivo y tarjeta como métodos de pago.

Separar los mocks de la UI.

Crear una capa que permita cambiar entre:

```ts
provideMockDataAccess()
```

y en el futuro:

```ts
provideHttpDataAccess()
```

---

## 22. Accesibilidad y responsive

- Navegación completa por teclado.
- Focus visible.
- Labels accesibles.
- Contraste suficiente.
- `aria-label` en botones solo con icono.
- Sidebar adaptable.
- Tablas con comportamiento móvil razonable.
- No depender únicamente del color para comunicar estados.
- Respetar `prefers-reduced-motion`.

Breakpoints mínimos:

- Mobile.
- Tablet.
- Desktop.
- Wide desktop.

---

## 23. Rendimiento

- Lazy loading por módulo.
- `OnPush` cuando aplique.
- Signals y computed para valores derivados.
- `trackBy` o tracking adecuado en listas.
- Evitar suscripciones manuales sin cleanup.
- Optimizar gráficas y tablas grandes.
- Preparar paginación del lado servidor.
- No importar librerías completas cuando puedan importarse módulos específicos.

---

## 24. Criterios de aceptación técnicos

Cada entrega debe cumplir:

1. `docker compose up --build` funciona.
2. La aplicación compila sin errores TypeScript.
3. No hay errores relevantes en consola.
4. La ruta implementada funciona al recargar directamente el navegador.
5. La pantalla es responsive.
6. Existen estados loading, empty y error.
7. Los componentes son reutilizables cuando corresponde.
8. No se usan datos embebidos dentro del template.
9. No se usa `any` de forma injustificada.
10. El diseño mantiene consistencia con el prototipo.
11. Se agregan o actualizan pruebas básicas.
12. Se actualiza el README con cambios y comandos.

---

## 25. Primera tarea recomendada para Codex

Realizar primero una auditoría del ZIP y luego crear el proyecto Angular sin destruir la referencia original.

Pasos:

1. Analizar el prototipo React e identificar layouts, páginas, componentes, tokens y datos.
2. Crear una carpeta nueva para la implementación Angular o reemplazar el proyecto únicamente después de conservar la referencia.
3. Inicializar Angular con standalone components, routing, SCSS y strict mode.
4. Configurar Tailwind CSS y Lucide Angular.
5. Crear Dockerfile, Docker Compose y Nginx.
6. Implementar AppShell, sidebar, header y rutas.
7. Reproducir el Dashboard con datos mock separados.
8. Reproducir Customers list.
9. Reproducir Customer detail.
10. Confirmar que todo funciona con Docker antes de continuar.

No implementar todavía Services, Invoices, Network y Support hasta que la base esté aprobada.

---

## 26. Formato esperado de trabajo de Codex

Antes de modificar código:

- Resumir lo encontrado.
- Explicar el plan en pasos.
- Identificar riesgos.

Durante la implementación:

- Hacer cambios pequeños y verificables.
- Ejecutar build, lint y tests.
- No dejar el repositorio roto.

Al finalizar cada tarea:

- Enumerar archivos creados o modificados.
- Explicar decisiones técnicas.
- Indicar comandos para ejecutar.
- Reportar pruebas realizadas.
- Listar pendientes reales, sin afirmar que algo funciona si no fue verificado.

---

## 27. Regla final

El prototipo de Figma es una referencia visual, no la arquitectura final. La implementación Angular debe ser mantenible, modular, preparada para backend real, multi-tenant y ejecutable completamente mediante Docker.

Ademas: 
- Usar Angular con componentes standalone.
- Cargar cada feature mediante lazy loading.
- No crear un AppModule.
- No guardar lógica de negocio en los componentes visuales.
- No hacer llamadas HTTP directamente desde los componentes.
- Mantener modelos, servicios y estado dentro de cada feature.
- Colocar en shared únicamente elementos reutilizados por varios módulos.
- Colocar en core servicios singleton globales.
- Usar Reactive Forms para todos los formularios.
- Usar Signals para estado local y RxJS para flujos asíncronos.
- Todos los registros deben manejar organizationId.
- Toda ruta privada debe validar autenticación y permisos.
- El frontend debe ejecutarse completamente mediante Docker.
- No instalar dependencias globalmente en la computadora.
- Mantener el diseño visual del prototipo entregado.
