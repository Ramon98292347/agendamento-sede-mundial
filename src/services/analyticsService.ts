import * as Sentry from '@sentry/react';

export interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
  customData?: Record<string, any>;
}

export interface UserProperties {
  userId?: string;
  userType?: 'visitor' | 'member' | 'pastor' | 'admin';
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  browser?: string;
  os?: string;
}

class AnalyticsService {
  private isInitialized = false;
  private userId: string | null = null;

  init(config?: {
    sentryDsn?: string;
    environment?: string;
  }) {
    if (this.isInitialized) return;

    // Inicializar Sentry para monitoramento de erros
    if (config?.sentryDsn) {
      Sentry.init({
        dsn: config.sentryDsn,
        environment: config.environment || 'development',
        integrations: [
          new Sentry.BrowserTracing(),
        ],
        tracesSampleRate: 1.0,
      });
    }

    // Detectar informações do dispositivo
    this.detectDeviceInfo();
    
    this.isInitialized = true;
    console.log('Analytics Service inicializado');
  }

  private detectDeviceInfo() {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?=.*\bMobile\b)(?=.*\bSafari\b)|Android(?=.*\bMobile\b)/i.test(userAgent);
    
    let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    if (isMobile && !isTablet) deviceType = 'mobile';
    else if (isTablet) deviceType = 'tablet';

    this.setUserProperties({
      deviceType,
      browser: this.getBrowserName(),
      os: this.getOSName()
    });
  }

  private getBrowserName(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private getOSName(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  setUserId(userId: string) {
    this.userId = userId;
    Sentry.setUser({ id: userId });
  }

  setUserProperties(properties: UserProperties) {
    Sentry.setContext('user_properties', properties);
  }

  // Rastrear eventos personalizados
  trackEvent(event: AnalyticsEvent) {
    console.log('Analytics Event:', event);
    
    // Enviar para Sentry como breadcrumb
    Sentry.addBreadcrumb({
      category: event.category,
      message: event.action,
      data: {
        label: event.label,
        value: event.value,
        ...event.customData
      },
      level: 'info'
    });

    // Aqui você pode adicionar integração com Google Analytics, Mixpanel, etc.
    // gtag('event', event.action, {
    //   event_category: event.category,
    //   event_label: event.label,
    //   value: event.value
    // });
  }

  // Eventos específicos da aplicação
  trackPageView(pageName: string, additionalData?: Record<string, any>) {
    this.trackEvent({
      action: 'page_view',
      category: 'navigation',
      label: pageName,
      customData: additionalData
    });
  }

  trackAppointmentCreated(appointmentData: {
    pastorId: string;
    appointmentType: string;
    hasAudio: boolean;
  }) {
    this.trackEvent({
      action: 'appointment_created',
      category: 'appointment',
      customData: appointmentData
    });
  }

  trackAppointmentCancelled(reason?: string) {
    this.trackEvent({
      action: 'appointment_cancelled',
      category: 'appointment',
      label: reason
    });
  }

  trackLogin(userType: 'pastor' | 'admin') {
    this.trackEvent({
      action: 'login',
      category: 'authentication',
      label: userType
    });
  }

  trackError(error: Error, context?: Record<string, any>) {
    console.error('Error tracked:', error);
    
    Sentry.captureException(error, {
      contexts: {
        error_context: context
      }
    });

    this.trackEvent({
      action: 'error_occurred',
      category: 'error',
      label: error.message,
      customData: {
        stack: error.stack,
        ...context
      }
    });
  }

  trackPerformance(metricName: string, value: number, unit: string = 'ms') {
    this.trackEvent({
      action: 'performance_metric',
      category: 'performance',
      label: metricName,
      value,
      customData: { unit }
    });
  }

  // Rastrear tempo gasto em páginas
  private pageStartTime: number | null = null;

  startPageTimer() {
    this.pageStartTime = Date.now();
  }

  endPageTimer(pageName: string) {
    if (this.pageStartTime) {
      const timeSpent = Date.now() - this.pageStartTime;
      this.trackPerformance(`page_time_${pageName}`, timeSpent);
      this.pageStartTime = null;
    }
  }
}

export const analyticsService = new AnalyticsService();