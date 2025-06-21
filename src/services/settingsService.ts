import { analyticsService } from './analyticsService';
import { notificationService } from './notificationService';
import { cacheService } from './cacheService';
import { backupService } from './backupService';

// Interfaces para configurações
interface AppSettings {
  general: {
    language: 'pt-BR' | 'en-US' | 'es-ES';
    timezone: string;
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    timeFormat: '12h' | '24h';
    currency: 'BRL' | 'USD' | 'EUR';
    firstDayOfWeek: 0 | 1; // 0 = domingo, 1 = segunda
  };
  appearance: {
    theme: 'light' | 'dark' | 'auto';
    primaryColor: string;
    accentColor: string;
    fontSize: 'small' | 'medium' | 'large';
    compactMode: boolean;
    animations: boolean;
    highContrast: boolean;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    desktop: boolean;
    sound: boolean;
    vibration: boolean;
    reminderTime: number; // em minutos
    quietHours: {
      enabled: boolean;
      start: string; // HH:MM
      end: string; // HH:MM
    };
    types: {
      appointments: boolean;
      reminders: boolean;
      cancellations: boolean;
      confirmations: boolean;
      updates: boolean;
      marketing: boolean;
    };
  };
  appointments: {
    defaultDuration: number; // em minutos
    bufferTime: number; // tempo entre agendamentos em minutos
    maxAdvanceBooking: number; // dias
    minAdvanceBooking: number; // horas
    allowWeekends: boolean;
    workingHours: {
      monday: { start: string; end: string; enabled: boolean };
      tuesday: { start: string; end: string; enabled: boolean };
      wednesday: { start: string; end: string; enabled: boolean };
      thursday: { start: string; end: string; enabled: boolean };
      friday: { start: string; end: string; enabled: boolean };
      saturday: { start: string; end: string; enabled: boolean };
      sunday: { start: string; end: string; enabled: boolean };
    };
    autoConfirm: boolean;
    requireApproval: boolean;
    allowRescheduling: boolean;
    rescheduleDeadline: number; // horas antes do agendamento
  };
  privacy: {
    dataRetention: number; // dias
    anonymizeData: boolean;
    shareAnalytics: boolean;
    cookieConsent: boolean;
    trackingEnabled: boolean;
    dataExportEnabled: boolean;
  };
  backup: {
    autoBackup: boolean;
    backupInterval: number; // em horas
    maxBackups: number;
    cloudSync: boolean;
    encryptBackups: boolean;
  };
  advanced: {
    debugMode: boolean;
    betaFeatures: boolean;
    performanceMode: boolean;
    offlineMode: boolean;
    cacheSize: number; // em MB
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };
}

interface SettingsValidation {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
}

interface SettingsExport {
  settings: AppSettings;
  metadata: {
    version: string;
    exportDate: string;
    deviceId: string;
    userId?: string;
  };
}

class SettingsService {
  private settings: AppSettings;
  private defaultSettings: AppSettings;
  private listeners: Array<(settings: AppSettings) => void> = [];
  private storageKey = 'church-app-settings';
  private version = '1.0.0';

  constructor() {
    this.defaultSettings = this.getDefaultSettings();
    this.settings = this.loadSettings();
    this.initializeSettings();
  }

  // Configurações padrão
  private getDefaultSettings(): AppSettings {
    return {
      general: {
        language: 'pt-BR',
        timezone: 'America/Sao_Paulo',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        currency: 'BRL',
        firstDayOfWeek: 1
      },
      appearance: {
        theme: 'auto',
        primaryColor: '#3b82f6',
        accentColor: '#10b981',
        fontSize: 'medium',
        compactMode: false,
        animations: true,
        highContrast: false
      },
      notifications: {
        email: true,
        sms: false,
        push: true,
        desktop: true,
        sound: true,
        vibration: true,
        reminderTime: 60,
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00'
        },
        types: {
          appointments: true,
          reminders: true,
          cancellations: true,
          confirmations: true,
          updates: true,
          marketing: false
        }
      },
      appointments: {
        defaultDuration: 60,
        bufferTime: 15,
        maxAdvanceBooking: 90,
        minAdvanceBooking: 24,
        allowWeekends: false,
        workingHours: {
          monday: { start: '08:00', end: '18:00', enabled: true },
          tuesday: { start: '08:00', end: '18:00', enabled: true },
          wednesday: { start: '08:00', end: '18:00', enabled: true },
          thursday: { start: '08:00', end: '18:00', enabled: true },
          friday: { start: '08:00', end: '18:00', enabled: true },
          saturday: { start: '08:00', end: '12:00', enabled: false },
          sunday: { start: '08:00', end: '12:00', enabled: false }
        },
        autoConfirm: false,
        requireApproval: true,
        allowRescheduling: true,
        rescheduleDeadline: 24
      },
      privacy: {
        dataRetention: 365,
        anonymizeData: false,
        shareAnalytics: true,
        cookieConsent: false,
        trackingEnabled: true,
        dataExportEnabled: true
      },
      backup: {
        autoBackup: true,
        backupInterval: 24,
        maxBackups: 10,
        cloudSync: false,
        encryptBackups: false
      },
      advanced: {
        debugMode: false,
        betaFeatures: false,
        performanceMode: false,
        offlineMode: true,
        cacheSize: 50,
        logLevel: 'warn'
      }
    };
  }

  // Carregar configurações
  private loadSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Mesclar com configurações padrão para garantir que todas as propriedades existam
        return this.mergeSettings(this.defaultSettings, parsed);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      analyticsService.trackError(error as Error, {
        context: 'settings_load'
      });
    }
    return { ...this.defaultSettings };
  }

  // Mesclar configurações
  private mergeSettings(defaults: any, stored: any): any {
    const result = { ...defaults };
    
    for (const key in stored) {
      if (stored.hasOwnProperty(key)) {
        if (typeof stored[key] === 'object' && stored[key] !== null && !Array.isArray(stored[key])) {
          result[key] = this.mergeSettings(defaults[key] || {}, stored[key]);
        } else {
          result[key] = stored[key];
        }
      }
    }
    
    return result;
  }

  // Salvar configurações
  private saveSettings(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
      
      // Notificar listeners
      this.listeners.forEach(listener => {
        try {
          listener(this.settings);
        } catch (error) {
          console.error('Erro ao notificar listener de configurações:', error);
        }
      });

      analyticsService.trackEvent('settings_saved', {
        hasCustomizations: this.hasCustomizations()
      });

    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      analyticsService.trackError(error as Error, {
        context: 'settings_save'
      });
    }
  }

  // Inicializar configurações
  private initializeSettings(): void {
    // Aplicar configurações de tema
    this.applyThemeSettings();
    
    // Configurar notificações
    this.configureNotifications();
    
    // Configurar backup
    this.configureBackup();
    
    // Configurar cache
    this.configureCache();

    analyticsService.trackEvent('settings_initialized', {
      theme: this.settings.appearance.theme,
      language: this.settings.general.language,
      notifications: this.settings.notifications.push
    });
  }

  // Aplicar configurações de tema
  private applyThemeSettings(): void {
    const { theme, primaryColor, accentColor, fontSize, highContrast } = this.settings.appearance;
    
    // Aplicar tema
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    } else {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
    
    // Aplicar cores personalizadas
    document.documentElement.style.setProperty('--primary-color', primaryColor);
    document.documentElement.style.setProperty('--accent-color', accentColor);
    
    // Aplicar tamanho da fonte
    const fontSizes = {
      small: '14px',
      medium: '16px',
      large: '18px'
    };
    document.documentElement.style.setProperty('--base-font-size', fontSizes[fontSize]);
    
    // Aplicar alto contraste
    document.documentElement.classList.toggle('high-contrast', highContrast);
  }

  // Configurar notificações
  private configureNotifications(): void {
    if (this.settings.notifications.push && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }

  // Configurar backup
  private configureBackup(): void {
    backupService.configure({
      autoBackup: this.settings.backup.autoBackup,
      backupInterval: this.settings.backup.backupInterval * 60 * 60 * 1000, // converter para ms
      maxBackups: this.settings.backup.maxBackups,
      cloudSync: this.settings.backup.cloudSync,
      encryptionEnabled: this.settings.backup.encryptBackups
    });
  }

  // Configurar cache
  private configureCache(): void {
    // Configurar tamanho do cache baseado nas configurações
    const maxSize = this.settings.advanced.cacheSize * 1024 * 1024; // converter MB para bytes
    // Implementar configuração do cache
  }

  // Obter todas as configurações
  getSettings(): AppSettings {
    return { ...this.settings };
  }

  // Obter configuração específica
  getSetting<K extends keyof AppSettings>(category: K): AppSettings[K] {
    return { ...this.settings[category] };
  }

  // Atualizar configurações
  updateSettings(updates: Partial<AppSettings>): void {
    const oldSettings = { ...this.settings };
    
    // Validar configurações
    const validation = this.validateSettings(updates);
    if (!validation.isValid) {
      throw new Error(`Configurações inválidas: ${validation.errors.map(e => e.message).join(', ')}`);
    }
    
    // Aplicar atualizações
    this.settings = this.mergeSettings(this.settings, updates);
    
    // Salvar
    this.saveSettings();
    
    // Aplicar mudanças que requerem ação imediata
    this.applySettingsChanges(oldSettings, this.settings);

    analyticsService.trackEvent('settings_updated', {
      categories: Object.keys(updates),
      hasThemeChange: updates.appearance?.theme !== oldSettings.appearance.theme
    });
  }

  // Aplicar mudanças de configuração
  private applySettingsChanges(oldSettings: AppSettings, newSettings: AppSettings): void {
    // Mudanças de aparência
    if (JSON.stringify(oldSettings.appearance) !== JSON.stringify(newSettings.appearance)) {
      this.applyThemeSettings();
    }
    
    // Mudanças de notificação
    if (JSON.stringify(oldSettings.notifications) !== JSON.stringify(newSettings.notifications)) {
      this.configureNotifications();
    }
    
    // Mudanças de backup
    if (JSON.stringify(oldSettings.backup) !== JSON.stringify(newSettings.backup)) {
      this.configureBackup();
    }
    
    // Mudanças de idioma
    if (oldSettings.general.language !== newSettings.general.language) {
      // Recarregar página para aplicar novo idioma
      window.location.reload();
    }
  }

  // Validar configurações
  private validateSettings(settings: Partial<AppSettings>): SettingsValidation {
    const errors: Array<{ field: string; message: string }> = [];
    
    // Validar configurações gerais
    if (settings.general) {
      if (settings.general.language && !['pt-BR', 'en-US', 'es-ES'].includes(settings.general.language)) {
        errors.push({ field: 'general.language', message: 'Idioma inválido' });
      }
      
      if (settings.general.dateFormat && !['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].includes(settings.general.dateFormat)) {
        errors.push({ field: 'general.dateFormat', message: 'Formato de data inválido' });
      }
    }
    
    // Validar configurações de agendamento
    if (settings.appointments) {
      if (settings.appointments.defaultDuration && (settings.appointments.defaultDuration < 15 || settings.appointments.defaultDuration > 480)) {
        errors.push({ field: 'appointments.defaultDuration', message: 'Duração padrão deve estar entre 15 e 480 minutos' });
      }
      
      if (settings.appointments.maxAdvanceBooking && (settings.appointments.maxAdvanceBooking < 1 || settings.appointments.maxAdvanceBooking > 365)) {
        errors.push({ field: 'appointments.maxAdvanceBooking', message: 'Antecedência máxima deve estar entre 1 e 365 dias' });
      }
    }
    
    // Validar configurações de backup
    if (settings.backup) {
      if (settings.backup.backupInterval && (settings.backup.backupInterval < 1 || settings.backup.backupInterval > 168)) {
        errors.push({ field: 'backup.backupInterval', message: 'Intervalo de backup deve estar entre 1 e 168 horas' });
      }
      
      if (settings.backup.maxBackups && (settings.backup.maxBackups < 1 || settings.backup.maxBackups > 100)) {
        errors.push({ field: 'backup.maxBackups', message: 'Número máximo de backups deve estar entre 1 e 100' });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Resetar configurações
  resetSettings(category?: keyof AppSettings): void {
    if (category) {
      this.settings[category] = { ...this.defaultSettings[category] };
    } else {
      this.settings = { ...this.defaultSettings };
    }
    
    this.saveSettings();
    this.initializeSettings();

    analyticsService.trackEvent('settings_reset', {
      category: category || 'all'
    });
  }

  // Verificar se há customizações
  private hasCustomizations(): boolean {
    return JSON.stringify(this.settings) !== JSON.stringify(this.defaultSettings);
  }

  // Exportar configurações
  exportSettings(): SettingsExport {
    const exportData: SettingsExport = {
      settings: this.settings,
      metadata: {
        version: this.version,
        exportDate: new Date().toISOString(),
        deviceId: localStorage.getItem('church-app-device-id') || 'unknown'
      }
    };

    analyticsService.trackEvent('settings_exported');
    
    return exportData;
  }

  // Importar configurações
  importSettings(exportData: SettingsExport): void {
    try {
      // Validar estrutura
      if (!exportData.settings || !exportData.metadata) {
        throw new Error('Arquivo de configurações inválido');
      }
      
      // Validar versão
      if (exportData.metadata.version !== this.version) {
        console.warn('Versão das configurações diferente, tentando migrar...');
      }
      
      // Validar configurações
      const validation = this.validateSettings(exportData.settings);
      if (!validation.isValid) {
        throw new Error(`Configurações inválidas: ${validation.errors.map(e => e.message).join(', ')}`);
      }
      
      // Aplicar configurações
      this.updateSettings(exportData.settings);
      
      notificationService.showNotification(
        'Configurações Importadas',
        'Suas configurações foram importadas com sucesso.',
        { duration: 5000 }
      );

      analyticsService.trackEvent('settings_imported', {
        sourceVersion: exportData.metadata.version,
        sourceDeviceId: exportData.metadata.deviceId
      });
      
    } catch (error) {
      console.error('Erro ao importar configurações:', error);
      analyticsService.trackError(error as Error, {
        context: 'settings_import'
      });
      throw error;
    }
  }

  // Adicionar listener para mudanças
  addListener(listener: (settings: AppSettings) => void): () => void {
    this.listeners.push(listener);
    
    // Retornar função para remover listener
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Obter configurações de tema para CSS
  getThemeVariables(): Record<string, string> {
    const { primaryColor, accentColor, fontSize } = this.settings.appearance;
    
    return {
      '--primary-color': primaryColor,
      '--accent-color': accentColor,
      '--base-font-size': fontSize === 'small' ? '14px' : fontSize === 'large' ? '18px' : '16px'
    };
  }

  // Verificar se recurso está habilitado
  isFeatureEnabled(feature: string): boolean {
    switch (feature) {
      case 'beta':
        return this.settings.advanced.betaFeatures;
      case 'debug':
        return this.settings.advanced.debugMode;
      case 'offline':
        return this.settings.advanced.offlineMode;
      case 'analytics':
        return this.settings.privacy.shareAnalytics;
      case 'tracking':
        return this.settings.privacy.trackingEnabled;
      default:
        return false;
    }
  }

  // Obter configurações de horário de trabalho para um dia
  getWorkingHours(dayOfWeek: number): { start: string; end: string; enabled: boolean } | null {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = days[dayOfWeek] as keyof AppSettings['appointments']['workingHours'];
    
    return this.settings.appointments.workingHours[dayName] || null;
  }

  // Verificar se notificações estão em horário silencioso
  isQuietHours(): boolean {
    if (!this.settings.notifications.quietHours.enabled) {
      return false;
    }
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = this.settings.notifications.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = this.settings.notifications.quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Horário atravessa meia-noite
      return currentTime >= startTime || currentTime <= endTime;
    }
  }
}

// Instância global
export const settingsService = new SettingsService();

// Hook para React
export const useSettings = () => {
  const [settings, setSettings] = React.useState(settingsService.getSettings());
  
  React.useEffect(() => {
    const unsubscribe = settingsService.addListener(setSettings);
    return unsubscribe;
  }, []);
  
  const updateSettings = React.useCallback((updates: Partial<AppSettings>) => {
    settingsService.updateSettings(updates);
  }, []);
  
  const resetSettings = React.useCallback((category?: keyof AppSettings) => {
    settingsService.resetSettings(category);
  }, []);
  
  const exportSettings = React.useCallback(() => {
    return settingsService.exportSettings();
  }, []);
  
  const importSettings = React.useCallback((data: SettingsExport) => {
    settingsService.importSettings(data);
  }, []);
  
  return {
    settings,
    updateSettings,
    resetSettings,
    exportSettings,
    importSettings,
    isFeatureEnabled: settingsService.isFeatureEnabled.bind(settingsService),
    getWorkingHours: settingsService.getWorkingHours.bind(settingsService),
    isQuietHours: settingsService.isQuietHours.bind(settingsService)
  };
};

export default settingsService;