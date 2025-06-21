/**
 * Configurações do Google OAuth para integração com Google Calendar
 */

export const GOOGLE_OAUTH_CONFIG = {
  // URLs da API do Google
  OAUTH_URL: 'https://accounts.google.com/o/oauth2/v2/auth',
  TOKEN_URL: 'https://oauth2.googleapis.com/token',
  CALENDAR_API_URL: 'https://www.googleapis.com/calendar/v3',
  
  // Escopos necessários para o Google Calendar
  SCOPES: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ],
  
  // Configurações de segurança
  RESPONSE_TYPE: 'code',
  ACCESS_TYPE: 'offline',
  PROMPT: 'consent',
  INCLUDE_GRANTED_SCOPES: 'true',
  
  // Configurações de token
  TOKEN_STORAGE_KEY: 'google_calendar_token',
  STATE_STORAGE_KEY: 'google_auth_state',
  
  // Tempo de expiração (5 minutos antes do vencimento)
  TOKEN_REFRESH_MARGIN: 5 * 60 * 1000,
  
  // Configurações de retry
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
} as const;

/**
 * Valida se as variáveis de ambiente necessárias estão configuradas
 */
export function validateGoogleOAuthConfig(): {
  isValid: boolean;
  errors: string[];
  config?: {
    clientId: string;
    clientSecret?: string;
    redirectUri: string;
  };
} {
  const errors: string[] = [];
  
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = import.meta.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI;
  
  if (!clientId) {
    errors.push('VITE_GOOGLE_CLIENT_ID não está configurado');
  }
  
  if (!redirectUri) {
    errors.push('VITE_GOOGLE_REDIRECT_URI não está configurado');
  }
  
  // Validar formato da redirect URI
  if (redirectUri) {
    try {
      const url = new URL(redirectUri);
      if (!url.protocol.startsWith('http')) {
        errors.push('VITE_GOOGLE_REDIRECT_URI deve usar protocolo HTTP ou HTTPS');
      }
    } catch {
      errors.push('VITE_GOOGLE_REDIRECT_URI não é uma URL válida');
    }
  }
  
  const isValid = errors.length === 0;
  
  return {
    isValid,
    errors,
    config: isValid ? {
      clientId: clientId!,
      clientSecret,
      redirectUri: redirectUri!
    } : undefined
  };
}

/**
 * Gera uma string aleatória para o state do OAuth
 */
export function generateOAuthState(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Formata erros da API do Google para exibição ao usuário
 */
export function formatGoogleApiError(error: any): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.error_description) {
    return error.error_description;
  }
  
  if (error?.error) {
    return error.error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return 'Erro desconhecido na API do Google';
}