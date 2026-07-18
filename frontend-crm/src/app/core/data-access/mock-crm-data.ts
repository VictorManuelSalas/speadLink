import { Injectable, Provider } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { Customer, DashboardSummary } from '../models/customer';
import { CRM_DATA, CrmDataAccess } from './crm-data';

const ORG_ID = 'speedlink-mx-01';
const now = '2026-07-14T10:00:00-06:00';

const detail = (id: string, offset: number) => ({
  equipment: [
    { name: 'Antena CPE', model: offset % 2 ? 'Ubiquiti LiteBeam 5AC' : 'Ubiquiti NanoStation 5AC', serial: `SL-CPE-${1040 + offset}`, mac: `DC:9F:DB:4A:2B:${(30 + offset).toString(16).toUpperCase()}`, status: 'online' as const },
    { name: 'Router Wi-Fi', model: 'TP-Link Archer C6', serial: `SL-RTR-${2090 + offset}`, mac: `84:D8:1B:92:7C:${(40 + offset).toString(16).toUpperCase()}`, status: offset === 3 ? 'warning' as const : 'online' as const },
  ],
  invoices: [
    { id: `FAC-${id}-07`, issuedAt: '2026-07-01', dueAt: '2026-07-10', total: 350, status: offset === 3 ? 'overdue' as const : 'paid' as const },
    { id: `FAC-${id}-06`, issuedAt: '2026-06-01', dueAt: '2026-06-10', total: 350, status: 'paid' as const },
  ],
  payments: [{ id: `PAG-${6100 + offset}`, date: '2026-07-08', amount: 350, method: offset % 2 ? 'Transferencia' as const : 'Efectivo' as const, reference: `SL${74018 + offset}` }],
  timeline: [
    { id: `t-${offset}-1`, title: 'Pago registrado', detail: 'Mensualidad de julio recibida', date: '8 jul 2026, 12:18', type: 'payment' as const },
    { id: `t-${offset}-2`, title: 'Factura emitida', detail: 'Factura mensual generada automáticamente', date: '1 jul 2026, 08:00', type: 'invoice' as const },
    { id: `t-${offset}-3`, title: 'Servicio instalado', detail: 'Equipo configurado y señal validada', date: '15 ene 2025, 16:40', type: 'service' as const },
  ],
});

const seeds = [
  ['SL-1042', 'María Fernanda López', 'MF', 'maria.lopez@email.mx', '55 1234 8052', 'Av. Hidalgo 28', 'Tepotzotlán, Estado de México', 'active', 'Intermedio', '10 Mbps', 350, 10, 0, 'Carlos Mendoza', 'Hace 18 min'],
  ['SL-1043', 'Abarrotes La Esperanza', 'AE', 'administracion@laesperanza.mx', '55 8120 4431', 'Calle Morelos 114', 'Cuautitlán Izcalli, Estado de México', 'active', 'Custom', '15 Mbps', 400, 5, 0, 'Ana Torres', 'Hace 1 h'],
  ['SL-1044', 'José Luis Hernández', 'JH', 'jose.hernandez@email.mx', '55 4421 7603', 'Priv. Las Flores 7', 'Zumpango, Estado de México', 'pending', 'Básico', '5 Mbps', 300, 15, 300, 'Carlos Mendoza', 'Ayer'],
  ['SL-1045', 'Papelería El Faro', 'PF', 'contacto@papeleriaelfaro.mx', '55 9022 1187', 'Plaza Juárez Local 4', 'Huehuetoca, Estado de México', 'suspended', 'Intermedio', '10 Mbps', 350, 8, 700, 'Diego Ramírez', 'Hace 3 días'],
  ['SL-1046', 'Alejandra Martínez Soto', 'AM', 'ale.martinez@email.mx', '55 6630 2944', 'Paseo de los Pinos 42', 'Tultepec, Estado de México', 'active', 'Custom', '15 Mbps', 400, 12, 0, 'Ana Torres', 'Hace 5 h'],
  ['SL-1047', 'Consultorio Dental Sonríe', 'CS', 'citas@dentalsonrie.mx', '55 3108 7762', 'Av. del Trabajo 205', 'Coacalco, Estado de México', 'active', 'Intermedio', '10 Mbps', 350, 20, 0, 'Diego Ramírez', 'Ayer'],
  ['SL-1048', 'Ricardo Salgado Pérez', 'RS', 'ricardo.salgado@email.mx', '55 7714 0290', 'Cerrada Cedros 16', 'Jaltenco, Estado de México', 'inactive', 'Básico', '5 Mbps', 300, 17, 0, 'Carlos Mendoza', 'Hace 12 días'],
] as const;

const CUSTOMERS: ReadonlyArray<Customer> = seeds.map((seed, index) => ({
  id: seed[0], organizationId: ORG_ID, createdAt: now, updatedAt: now, name: seed[1], initials: seed[2], email: seed[3], phone: seed[4], address: seed[5], community: seed[6], status: seed[7], plan: seed[8], speed: seed[9], monthlyFee: seed[10], billingDay: seed[11], currentBalance: seed[12], technician: seed[13], lastActivity: seed[14], installationDate: '2025-01-15', gpsLocation: '19.7134, -99.2231', ipAddress: `10.20.4.${20 + index}`, ...detail(seed[0], index),
}));

const DASHBOARD: DashboardSummary = {
  activeCustomers: 1248, monthlyRecurringRevenue: 438750, pendingInvoices: 86, overdueInvoices: 23, paymentsToday: 18400, scheduledInstallations: 12, availableEquipment: 74, openTickets: 9,
  revenue: [{ month: 'Ago', value: 351 }, { month: 'Sep', value: 366 }, { month: 'Oct', value: 371 }, { month: 'Nov', value: 389 }, { month: 'Dic', value: 397 }, { month: 'Ene', value: 405 }, { month: 'Feb', value: 414 }, { month: 'Mar', value: 421 }, { month: 'Abr', value: 425 }, { month: 'May', value: 431 }, { month: 'Jun', value: 435 }, { month: 'Jul', value: 439 }],
  planDistribution: [{ name: 'Intermedio · 10 Mbps', customers: 548, color: '#2563eb' }, { name: 'Básico · 5 Mbps', customers: 421, color: '#06b6d4' }, { name: 'Custom · 15 Mbps', customers: 279, color: '#8b5cf6' }],
  recentActivity: [{ title: 'Pago recibido', detail: 'María Fernanda López · $350 MXN', time: 'Hace 18 min', tone: 'green' }, { title: 'Instalación programada', detail: 'Luis Alberto Romero · Tepotzotlán', time: 'Hace 42 min', tone: 'blue' }, { title: 'Factura vencida', detail: 'Papelería El Faro · $700 MXN', time: 'Hace 1 h', tone: 'amber' }, { title: 'Servicio activado', detail: 'Abarrotes La Esperanza · 15 Mbps', time: 'Hace 2 h', tone: 'blue' }],
};

@Injectable() export class MockCrmDataAccess implements CrmDataAccess {
  getDashboard(): Observable<DashboardSummary> { return of(DASHBOARD).pipe(delay(250)); }
  getCustomers(): Observable<ReadonlyArray<Customer>> { return of(CUSTOMERS).pipe(delay(250)); }
  getCustomer(id: string): Observable<Customer | undefined> { return of(CUSTOMERS.find((customer) => customer.id === id)).pipe(delay(200)); }
}

export function provideMockDataAccess(): Provider[] { return [{ provide: CRM_DATA, useClass: MockCrmDataAccess }]; }
