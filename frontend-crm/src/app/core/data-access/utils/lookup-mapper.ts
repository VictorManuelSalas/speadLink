/**
 * Lookup Mapper
 * Maps IDs to names/values for easy access without additional queries
 */

import { CUSTOMERS } from '../mock-crm-data';

export class LookupMapper {
  /**
   * Nombres tomados del catálogo real de clientes. Antes era una lista fija
   * SL-1040..SL-1044 que ya no coincidía con `CUSTOMERS`, así que los registros
   * generados referenciaban clientes inexistentes.
   */
  private static readonly customerNames: Record<string, string> = Object.fromEntries(
    CUSTOMERS.map((customer) => [customer.id, customer.name]),
  );

  private static readonly equipmentNames: Record<string, string> = {
    'EQ-1000': 'CPE 5GHz Ubiquiti',
    'EQ-1001': 'Router TP-Link AC1200',
    'EQ-1002': 'Switch Cisco 24 puertos',
    'EQ-1003': 'Fuente PoE 48V 10A',
    'EQ-1004': 'Antena sectorial 5.8GHz',
    'EQ-1005': 'CPE 5GHz Ubiquiti (backup)',
    'EQ-1006': 'Router Mikrotik hAP',
    'EQ-1007': 'Switch TP-Link 16 puertos',
    'EQ-1008': 'Fuente alimentación redundante',
    'EQ-1009': 'Amplificador de señal',
    'EQ-1010': 'Modem DOCSIS 3.0',
    'EQ-1011': 'Router 4G LTE',
    'EQ-1012': 'UPS 1000VA',
    'EQ-1013': 'Servidor local NAS',
    'EQ-1014': 'Firewall Mikrotik',
    'EQ-1015': 'CPE 2.4GHz TP-Link',
    'EQ-1016': 'Antena omnidireccional',
    'EQ-1017': 'Repetidor Wi-Fi',
    'EQ-1018': 'Controlador de acceso',
    'EQ-1019': 'Cámara IP PoE',
  };

  /**
   * Get customer name by ID
   */
  static getCustomerName(customerId: string): string {
    return this.customerNames[customerId] || customerId;
  }

  /**
   * Get equipment name by ID
   */
  static getEquipmentName(equipmentId: string): string {
    return this.equipmentNames[equipmentId] || equipmentId;
  }

  /**
   * Get invoice folio/reference
   */
  static getInvoiceFolio(invoiceId: string, folio?: string): string {
    return folio || invoiceId;
  }

  /**
   * All customer IDs available
   */
  static getAllCustomerIds(): string[] {
    return Object.keys(this.customerNames);
  }

  /**
   * All equipment IDs available
   */
  static getAllEquipmentIds(): string[] {
    return Object.keys(this.equipmentNames);
  }
}
