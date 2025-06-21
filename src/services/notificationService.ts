import { toast } from 'react-hot-toast';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
}

class NotificationService {
  private registration: ServiceWorkerRegistration | null = null;

  async init() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        this.registration = await navigator.serviceWorker.ready;
        console.log('Service Worker registrado para notificações');
      } catch (error) {
        console.error('Erro ao registrar Service Worker:', error);
      }
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      toast.error('Este navegador não suporta notificações');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      toast.error('Notificações foram negadas pelo usuário');
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      toast.success('Notificações ativadas! 🔔');
    } else {
      toast.error('Notificações foram negadas');
    }

    return permission;
  }

  async showNotification(options: NotificationOptions) {
    const permission = await this.requestPermission();
    
    if (permission !== 'granted') {
      return;
    }

    const notificationOptions: NotificationOptions = {
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      ...options,
    };

    if (this.registration) {
      // Usar Service Worker para notificações
      await this.registration.showNotification(options.title, notificationOptions);
    } else {
      // Fallback para notificações diretas
      new Notification(options.title, notificationOptions);
    }
  }

  // Notificações específicas do sistema
  async notifyAppointmentReminder(appointmentData: {
    pastorName: string;
    date: string;
    time: string;
  }) {
    await this.showNotification({
      title: '📅 Lembrete de Consulta',
      body: `Sua consulta com ${appointmentData.pastorName} é hoje às ${appointmentData.time}`,
      tag: 'appointment-reminder',
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'Ver Detalhes',
          icon: '/icon-192.svg'
        },
        {
          action: 'dismiss',
          title: 'Dispensar',
          icon: '/icon-192.svg'
        }
      ]
    });
  }

  async notifyAppointmentConfirmed(appointmentData: {
    pastorName: string;
    date: string;
    time: string;
  }) {
    await this.showNotification({
      title: '✅ Consulta Confirmada',
      body: `Sua consulta com ${appointmentData.pastorName} foi confirmada para ${appointmentData.date} às ${appointmentData.time}`,
      tag: 'appointment-confirmed'
    });
  }

  async notifyAppointmentCancelled(reason?: string) {
    await this.showNotification({
      title: '❌ Consulta Cancelada',
      body: reason || 'Sua consulta foi cancelada. Entre em contato para reagendar.',
      tag: 'appointment-cancelled'
    });
  }

  // Agendar notificação para lembrete
  scheduleReminder(appointmentDate: Date, appointmentData: {
    pastorName: string;
    date: string;
    time: string;
  }) {
    const reminderTime = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000); // 24h antes
    const now = new Date();
    
    if (reminderTime > now) {
      const timeUntilReminder = reminderTime.getTime() - now.getTime();
      
      setTimeout(() => {
        this.notifyAppointmentReminder(appointmentData);
      }, timeUntilReminder);
    }
  }
}

export const notificationService = new NotificationService();