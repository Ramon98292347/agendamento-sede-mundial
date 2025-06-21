import { z } from 'zod';
import { analyticsService } from '../services/analyticsService';

// Esquemas de validação usando Zod

// Validação de telefone brasileiro
const phoneRegex = /^\(?([1-9]{2})\)?\s?9?\s?[0-9]{4}-?[0-9]{4}$/;

// Validação de email
const emailSchema = z.string().email('Email inválido');

// Validação de telefone
const phoneSchema = z.string()
  .min(10, 'Telefone deve ter pelo menos 10 dígitos')
  .max(15, 'Telefone deve ter no máximo 15 dígitos')
  .regex(phoneRegex, 'Formato de telefone inválido');

// Validação de nome
const nameSchema = z.string()
  .min(2, 'Nome deve ter pelo menos 2 caracteres')
  .max(100, 'Nome deve ter no máximo 100 caracteres')
  .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços');

// Validação de data
const dateSchema = z.string()
  .refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed > new Date();
  }, 'Data deve ser válida e futura');

// Validação de horário
const timeSchema = z.string()
  .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de horário inválido (HH:MM)');

// Schema para agendamento
export const appointmentSchema = z.object({
  name: nameSchema,
  email: emailSchema.optional(),
  phone: phoneSchema,
  date: dateSchema,
  time: timeSchema,
  pastorId: z.string().min(1, 'Pastor é obrigatório'),
  type: z.enum(['consulta', 'aconselhamento', 'oração', 'casamento', 'batismo', 'outro'], {
    errorMap: () => ({ message: 'Tipo de agendamento inválido' })
  }),
  notes: z.string().max(500, 'Observações devem ter no máximo 500 caracteres').optional(),
  priority: z.enum(['baixa', 'normal', 'alta']).default('normal'),
  duration: z.number().min(15).max(180).default(60), // em minutos
  location: z.string().max(100, 'Local deve ter no máximo 100 caracteres').optional(),
  recurring: z.object({
    enabled: z.boolean().default(false),
    frequency: z.enum(['semanal', 'quinzenal', 'mensal']).optional(),
    endDate: z.string().optional()
  }).optional()
});

// Schema para pastor
export const pastorSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  specialties: z.array(z.string()).min(1, 'Pelo menos uma especialidade é obrigatória'),
  availability: z.object({
    monday: z.array(z.object({
      start: timeSchema,
      end: timeSchema
    })).default([]),
    tuesday: z.array(z.object({
      start: timeSchema,
      end: timeSchema
    })).default([]),
    wednesday: z.array(z.object({
      start: timeSchema,
      end: timeSchema
    })).default([]),
    thursday: z.array(z.object({
      start: timeSchema,
      end: timeSchema
    })).default([]),
    friday: z.array(z.object({
      start: timeSchema,
      end: timeSchema
    })).default([]),
    saturday: z.array(z.object({
      start: timeSchema,
      end: timeSchema
    })).default([]),
    sunday: z.array(z.object({
      start: timeSchema,
      end: timeSchema
    })).default([])
  }),
  maxAppointmentsPerDay: z.number().min(1).max(20).default(8),
  bio: z.string().max(1000, 'Biografia deve ter no máximo 1000 caracteres').optional(),
  photo: z.string().url('URL da foto inválida').optional(),
  active: z.boolean().default(true)
});

// Schema para configurações do usuário
export const userSettingsSchema = z.object({
  notifications: z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(false),
    push: z.boolean().default(true),
    reminderTime: z.number().min(15).max(1440).default(60) // em minutos
  }),
  theme: z.enum(['light', 'dark', 'auto']).default('auto'),
  language: z.enum(['pt-BR', 'en-US', 'es-ES']).default('pt-BR'),
  timezone: z.string().default('America/Sao_Paulo'),
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).default('DD/MM/YYYY'),
  timeFormat: z.enum(['12h', '24h']).default('24h'),
  autoBackup: z.boolean().default(true),
  dataRetention: z.number().min(30).max(365).default(90) // em dias
});

// Schema para login
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  rememberMe: z.boolean().default(false)
});

// Schema para registro
export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'),
  confirmPassword: z.string(),
  terms: z.boolean().refine(val => val === true, 'Você deve aceitar os termos de uso')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword']
});

// Schema para redefinição de senha
export const resetPasswordSchema = z.object({
  email: emailSchema
});

// Schema para nova senha
export const newPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'),
  confirmPassword: z.string(),
  token: z.string().min(1, 'Token é obrigatório')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword']
});

// Tipos TypeScript derivados dos schemas
export type Appointment = z.infer<typeof appointmentSchema>;
export type Pastor = z.infer<typeof pastorSchema>;
export type UserSettings = z.infer<typeof userSettingsSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
export type NewPasswordData = z.infer<typeof newPasswordSchema>;

// Classe principal de validação
class ValidationService {
  // Validar dados com schema
  validate<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
    try {
      const result = schema.parse(data);
      return {
        success: true,
        data: result,
        errors: []
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        analyticsService.trackEvent('validation_error', {
          schema: schema.constructor.name,
          errors: errors.length,
          fields: errors.map(e => e.field)
        });

        return {
          success: false,
          data: null,
          errors
        };
      }

      return {
        success: false,
        data: null,
        errors: [{
          field: 'unknown',
          message: 'Erro de validação desconhecido',
          code: 'unknown'
        }]
      };
    }
  }

  // Validar agendamento
  validateAppointment(data: unknown): ValidationResult<Appointment> {
    return this.validate(appointmentSchema, data);
  }

  // Validar pastor
  validatePastor(data: unknown): ValidationResult<Pastor> {
    return this.validate(pastorSchema, data);
  }

  // Validar configurações do usuário
  validateUserSettings(data: unknown): ValidationResult<UserSettings> {
    return this.validate(userSettingsSchema, data);
  }

  // Validar login
  validateLogin(data: unknown): ValidationResult<LoginData> {
    return this.validate(loginSchema, data);
  }

  // Validar registro
  validateRegister(data: unknown): ValidationResult<RegisterData> {
    return this.validate(registerSchema, data);
  }

  // Validar redefinição de senha
  validateResetPassword(data: unknown): ValidationResult<ResetPasswordData> {
    return this.validate(resetPasswordSchema, data);
  }

  // Validar nova senha
  validateNewPassword(data: unknown): ValidationResult<NewPasswordData> {
    return this.validate(newPasswordSchema, data);
  }

  // Validações específicas

  // Validar se data/hora está disponível
  validateAppointmentAvailability(appointment: Appointment, existingAppointments: Appointment[]): ValidationResult<boolean> {
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
    const appointmentEnd = new Date(appointmentDateTime.getTime() + (appointment.duration || 60) * 60000);

    for (const existing of existingAppointments) {
      if (existing.pastorId === appointment.pastorId) {
        const existingDateTime = new Date(`${existing.date}T${existing.time}`);
        const existingEnd = new Date(existingDateTime.getTime() + (existing.duration || 60) * 60000);

        // Verificar sobreposição
        if (
          (appointmentDateTime >= existingDateTime && appointmentDateTime < existingEnd) ||
          (appointmentEnd > existingDateTime && appointmentEnd <= existingEnd) ||
          (appointmentDateTime <= existingDateTime && appointmentEnd >= existingEnd)
        ) {
          return {
            success: false,
            data: null,
            errors: [{
              field: 'time',
              message: 'Horário não disponível para este pastor',
              code: 'time_conflict'
            }]
          };
        }
      }
    }

    return {
      success: true,
      data: true,
      errors: []
    };
  }

  // Validar horário de funcionamento
  validateBusinessHours(date: string, time: string): ValidationResult<boolean> {
    const appointmentDate = new Date(`${date}T${time}`);
    const dayOfWeek = appointmentDate.getDay(); // 0 = domingo, 6 = sábado
    const hour = appointmentDate.getHours();

    // Horário de funcionamento: Segunda a Sexta 8h-18h, Sábado 8h-12h
    if (dayOfWeek === 0) { // Domingo
      return {
        success: false,
        data: null,
        errors: [{
          field: 'date',
          message: 'Agendamentos não são permitidos aos domingos',
          code: 'closed_day'
        }]
      };
    }

    if (dayOfWeek === 6) { // Sábado
      if (hour < 8 || hour >= 12) {
        return {
          success: false,
          data: null,
          errors: [{
            field: 'time',
            message: 'Horário de funcionamento aos sábados: 8h às 12h',
            code: 'outside_business_hours'
          }]
        };
      }
    } else { // Segunda a Sexta
      if (hour < 8 || hour >= 18) {
        return {
          success: false,
          data: null,
          errors: [{
            field: 'time',
            message: 'Horário de funcionamento: 8h às 18h',
            code: 'outside_business_hours'
          }]
        };
      }
    }

    return {
      success: true,
      data: true,
      errors: []
    };
  }

  // Validar antecedência mínima
  validateMinimumAdvance(date: string, time: string, minimumHours: number = 24): ValidationResult<boolean> {
    const appointmentDateTime = new Date(`${date}T${time}`);
    const now = new Date();
    const minimumDateTime = new Date(now.getTime() + minimumHours * 60 * 60 * 1000);

    if (appointmentDateTime < minimumDateTime) {
      return {
        success: false,
        data: null,
        errors: [{
          field: 'date',
          message: `Agendamento deve ser feito com pelo menos ${minimumHours} horas de antecedência`,
          code: 'insufficient_advance'
        }]
      };
    }

    return {
      success: true,
      data: true,
      errors: []
    };
  }

  // Sanitizar dados de entrada
  sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>"'&]/g, '') // Remover caracteres perigosos
      .replace(/\s+/g, ' '); // Normalizar espaços
  }

  // Validar força da senha
  validatePasswordStrength(password: string): {
    score: number;
    feedback: string[];
    isStrong: boolean;
  } {
    let score = 0;
    const feedback: string[] = [];

    // Comprimento
    if (password.length >= 8) score += 1;
    else feedback.push('Use pelo menos 8 caracteres');

    if (password.length >= 12) score += 1;
    else feedback.push('Use pelo menos 12 caracteres para maior segurança');

    // Caracteres
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Inclua letras minúsculas');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Inclua letras maiúsculas');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Inclua números');

    if (/[^\w\s]/.test(password)) score += 1;
    else feedback.push('Inclua símbolos especiais');

    // Padrões comuns
    if (!/(..).*\1/.test(password)) score += 1;
    else feedback.push('Evite repetições de caracteres');

    if (!/123|abc|qwe/i.test(password)) score += 1;
    else feedback.push('Evite sequências comuns');

    const isStrong = score >= 6;

    return {
      score,
      feedback,
      isStrong
    };
  }

  // Validar CPF
  validateCPF(cpf: string): boolean {
    cpf = cpf.replace(/[^\d]/g, '');

    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(10))) return false;

    return true;
  }

  // Validar CNPJ
  validateCNPJ(cnpj: string): boolean {
    cnpj = cnpj.replace(/[^\d]/g, '');

    if (cnpj.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    let length = cnpj.length - 2;
    let numbers = cnpj.substring(0, length);
    const digits = cnpj.substring(length);
    let sum = 0;
    let pos = length - 7;

    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;

    length = length + 1;
    numbers = cnpj.substring(0, length);
    sum = 0;
    pos = length - 7;

    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;

    return true;
  }
}

// Interface para resultado de validação
export interface ValidationResult<T> {
  success: boolean;
  data: T | null;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Instância global
export const validationService = new ValidationService();

// Utilitários de validação
export const ValidationUtils = {
  // Formatar telefone
  formatPhone: (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  },

  // Formatar CPF
  formatCPF: (cpf: string): string => {
    const cleaned = cpf.replace(/\D/g, '');
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  },

  // Formatar CNPJ
  formatCNPJ: (cnpj: string): string => {
    const cleaned = cnpj.replace(/\D/g, '');
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  },

  // Limpar formatação
  cleanFormat: (value: string): string => {
    return value.replace(/\D/g, '');
  },

  // Validar URL
  isValidURL: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  // Validar data
  isValidDate: (date: string): boolean => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  },

  // Validar se é maior de idade
  isAdult: (birthDate: string): boolean => {
    const birth = new Date(birthDate);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1 >= 18;
    }
    
    return age >= 18;
  }
};

export default validationService;