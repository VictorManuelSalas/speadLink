# SpeadLink CRM – Sistema Administrativo y Portal de Clientes

SpeadLink CRM es un sistema integral diseñado para automatizar y centralizar la operación del negocio: gestión de clientes, pagos, instalaciones, tickets, workflows, comunicación por correo y WhatsApp, panel administrativo, portal de clientes y más.

Este repositorio contiene el código fuente del proyecto, organizado en **backend**, **frontend**, y servicios auxiliares.

---

## 🚀 Características Principales

### 🔐 Autenticación y Roles

* Login con JWT + Refresh Tokens
* Roles: Admin, Técnico, Soporte, Cliente
* Permisos granularizados
* Preferencias por usuario: tema oscuro, idioma y colores

### 👨‍💼 Panel Administrativo

* Gestión completa de clientes
* Fotos, documentos, notas y timeline
* Instalaciones con fotos y asignación de técnicos
* Pagos, recordatorios y reportes
* Tickets con chat interno y archivos adjuntos
* Envío de correos (Nodemailer)
* Envío de WhatsApps (API Business)
* Almacén de comunicaciones

### 🧩 Templates Dinámicos

* Emails, WhatsApp, tickets y documentos
* Variables dinámicas tipo `{{cliente.nombre}}`

### 🔄 Workflows Automatizados

* Triggers por eventos o tiempo
* Acciones: enviar mensaje, crear ticket, cambiar estado, etc.

### 🔔 Webhooks

* Eventos configurables para integraciones externas
* Logs y estado de entrega

### ⏱ Schedules / Cron Jobs

* Recordatorios automáticos
* Tareas recurrentes configurables

### 📤 Importación / Exportación

* CSV / Excel
* Mapeo de columnas
* Exportación con filtros avanzados

### 🧑‍💻 Portal de Clientes

* Historial de pagos
* Estado del servicio
* Tickets
* Descarga de documentos
* Fotos de instalación
* Configuración de tema e idioma

---

## 🧱 Tecnologías Utilizadas

### **Backend**

* Node.js (NestJS o Express)
* MongoDB
* Mongoose
* Nodemailer
* WhatsApp Business API

### **Frontend**

* Angular
* TailwindCSS
* Zustand o Redux

### **Infraestructura**

* Docker (opcional)
* Nginx

---

## 📂 Estructura del Repositorio (propuesta)

```
root/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   ├── common/
│   │   ├── config/
│   │   └── main.ts
│   ├── package.json
│   └── README.md
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── README.md
│
├── docs/
│   ├── arquitectura.md
│   ├── api_reference.md
│   └── requerimientos.md
│
└── README.md (este archivo)
```

---

## 🔧 Configuración del Proyecto

### 1️⃣ Clonar el repositorio

```
git clone https://github.com/tu_usuario/speadlink-crm.git
cd speadlink-crm
```

### 2️⃣ Instalar dependencias

Backend:

```
cd backend
npm install
```

Frontend:

```
cd frontend
npm install
```

### 3️⃣ Configurar variables de entorno

Crear `.env` en backend:

```
MONGO_URI=mongodb://localhost:27017/speadlink
JWT_SECRET=tu_secreto
WHATSAPP_API_KEY=xxxx
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=tu_correo
EMAIL_PASS=tu_password
```

---

## ▶️ Ejecutar el Proyecto

Backend:

```
npm run start:dev
```

Frontend:

```
npm run dev
```

---

## 📘 Documentación

Toda la documentación técnica se encuentra en `/docs`.
Incluye:

* Requerimientos del sistema
* Diagramas UML
* Arquitectura
* Endpoints (Swagger/Postman)

---

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas!
Puedes abrir un **issue**, enviar **pull requests** o proponer mejoras.

---

## 📄 Licencia

Este proyecto se distribuye bajo licencia MIT.

---

## ✨ Autor

**SpeadLink** – Sistema desarrollado para la gestión profesional del negocio 📜.
---------------------------------------------------------------------------------------------
