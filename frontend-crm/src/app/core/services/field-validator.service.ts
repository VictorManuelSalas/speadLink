import { Injectable } from '@angular/core';

export interface ValidationResult {
  readonly valid: boolean;
  readonly error?: string;
}

export interface ValidationConfig {
  readonly required?: boolean;
  readonly validateAs?: 'email' | 'phone' | 'number' | 'date' | 'text' | 'url';
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly min?: number;
  readonly max?: number;
  readonly pattern?: RegExp;
}

@Injectable({
  providedIn: 'root',
})
export class FieldValidatorService {
  private readonly emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private readonly phonePattern = /^[\d\s\-\+\(\)]+$/;
  private readonly urlPattern = /^https?:\/\/.+/;
  private readonly datePattern = /^\d{4}-\d{2}-\d{2}$/;

  /**
   * Validates a field value based on provided configuration
   */
  validateField(value: string, config: ValidationConfig): ValidationResult {
    // Check required first
    if (config.required && !value?.trim()) {
      return {
        valid: false,
        error: 'Este campo es obligatorio',
      };
    }

    // If not required and empty, it's valid
    if (!value?.trim()) {
      return { valid: true };
    }

    // Route to specific validators based on type
    switch (config.validateAs) {
      case 'email':
        return this.validateEmail(value);
      case 'phone':
        return this.validatePhone(value);
      case 'number':
        return this.validateNumber(value, config);
      case 'date':
        return this.validateDate(value);
      case 'url':
        return this.validateUrl(value);
      case 'text':
      default:
        return this.validateText(value, config);
    }
  }

  /**
   * Validates email format
   */
  validateEmail(value: string): ValidationResult {
    const trimmed = value.trim();
    if (!trimmed) {
      return { valid: false, error: 'El correo es obligatorio' };
    }
    if (!this.emailPattern.test(trimmed)) {
      return { valid: false, error: 'El correo no es válido' };
    }
    return { valid: true };
  }

  /**
   * Validates phone number format
   */
  validatePhone(value: string): ValidationResult {
    const trimmed = value.trim();
    if (!trimmed) {
      return { valid: false, error: 'El teléfono es obligatorio' };
    }
    // Extract only digits
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length < 7) {
      return { valid: false, error: 'El teléfono debe tener al menos 7 dígitos' };
    }
    if (digitsOnly.length > 15) {
      return { valid: false, error: 'El teléfono no puede tener más de 15 dígitos' };
    }
    if (!this.phonePattern.test(trimmed)) {
      return { valid: false, error: 'El teléfono contiene caracteres no válidos' };
    }
    return { valid: true };
  }

  /**
   * Validates numeric value with optional min/max constraints
   */
  validateNumber(value: string, config: ValidationConfig = {}): ValidationResult {
    const trimmed = value.trim();
    if (!trimmed) {
      return { valid: false, error: 'El número es obligatorio' };
    }

    const num = Number(trimmed);
    if (Number.isNaN(num)) {
      return { valid: false, error: 'Debe ser un número válido' };
    }

    if (config.min !== undefined && num < config.min) {
      return { valid: false, error: `El valor mínimo es ${config.min}` };
    }

    if (config.max !== undefined && num > config.max) {
      return { valid: false, error: `El valor máximo es ${config.max}` };
    }

    return { valid: true };
  }

  /**
   * Validates date format (YYYY-MM-DD)
   */
  validateDate(value: string): ValidationResult {
    const trimmed = value.trim();
    if (!trimmed) {
      return { valid: false, error: 'La fecha es obligatoria' };
    }

    if (!this.datePattern.test(trimmed)) {
      return { valid: false, error: 'La fecha debe estar en formato YYYY-MM-DD' };
    }

    const date = new Date(`${trimmed}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) {
      return { valid: false, error: 'La fecha no es válida' };
    }

    return { valid: true };
  }

  /**
   * Validates URL format
   */
  validateUrl(value: string): ValidationResult {
    const trimmed = value.trim();
    if (!trimmed) {
      return { valid: false, error: 'La URL es obligatoria' };
    }

    if (!this.urlPattern.test(trimmed)) {
      return { valid: false, error: 'La URL debe comenzar con http:// o https://' };
    }

    try {
      new URL(trimmed);
      return { valid: true };
    } catch {
      return { valid: false, error: 'La URL no es válida' };
    }
  }

  /**
   * Validates text with optional length constraints
   */
  validateText(value: string, config: ValidationConfig = {}): ValidationResult {
    const trimmed = value.trim();

    if (config.minLength !== undefined && trimmed.length < config.minLength) {
      return {
        valid: false,
        error: `El texto debe tener al menos ${config.minLength} caracteres`,
      };
    }

    if (config.maxLength !== undefined && trimmed.length > config.maxLength) {
      return {
        valid: false,
        error: `El texto no puede exceder ${config.maxLength} caracteres`,
      };
    }

    if (config.pattern && !config.pattern.test(value)) {
      return { valid: false, error: 'El formato no es válido' };
    }

    return { valid: true };
  }

  /**
   * Helper to infer validation config from field type
   */
  getValidationConfig(
    fieldKey: string,
    fieldType: 'text' | 'number' | 'date' | 'select',
    options?: {
      required?: boolean;
      min?: number;
      max?: number;
      minLength?: number;
      maxLength?: number;
    },
  ): ValidationConfig {
    const validateAs = this.inferValidationType(fieldKey, fieldType);
    return {
      validateAs,
      required: options?.required,
      min: options?.min,
      max: options?.max,
      minLength: options?.minLength,
      maxLength: options?.maxLength,
    };
  }

  /**
   * Infers the validation type based on field key and type
   */
  private inferValidationType(
    fieldKey: string,
    fieldType: 'text' | 'number' | 'date' | 'select',
  ): 'email' | 'phone' | 'number' | 'date' | 'text' | 'url' {
    const lowerKey = fieldKey.toLowerCase();

    if (fieldType === 'number') return 'number';
    if (fieldType === 'date') return 'date';
    if (fieldType === 'select') return 'text';

    // For text fields, infer based on key
    if (lowerKey.includes('email') || lowerKey.includes('correo')) return 'email';
    if (lowerKey.includes('phone') || lowerKey.includes('tel') || lowerKey.includes('celular'))
      return 'phone';
    if (lowerKey.includes('url') || lowerKey.includes('link')) return 'url';

    return 'text';
  }
}
