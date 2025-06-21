import { Workbox } from 'workbox-window';
import { notificationService } from './notificationService';
import { analyticsService } from './analyticsService';
import { cacheService } from './cacheService';

interface PWAConfig {
  enableServiceWorker: boolean;
  enableNotifications: boolean;
  enableBackgroundSync: boolean;
  enablePeriodicSync: boolean;
  cacheStrategy: 'cacheFirst' | 'networkFirst' | 'staleWhileRevalidate';
  offlinePageUrl: string;
  updateCheckInterval: number;
}

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWACapabilities {
  serviceWorker: boolean;
  notifications: boolean;
  backgroundSync: boolean;
  periodicSync: boolean;
  installPrompt: boolean;
  standalone: boolean;
  fullscreen: boolean;
  webShare: boolean;
  geolocation: boolean;
  camera: boolean;
  storage: boolean;
}

class PWAService {
  private workbox: Workbox | null = null;
  private config: PWAConfig;
  private installPrompt: InstallPromptEvent | null = null;
  private isInstalled = false;
  private isOnline = navigator.onLine;
  private updateAvailable = false;
  private capabilities: PWACapabilities;

  constructor(config: Partial<PWAConfig> = {}) {
    this.config = {
      enableServiceWorker: true,
      enableNotifications: true,
      enableBackgroundSync: true,
      enablePeriodicSync: false,
      cacheStrategy: 'staleWhileRevalidate',
      offlinePageUrl: '/offline',
      updateCheckInterval: 60000, // 1 minuto
      ...config
    };

    this.capabilities = this.detectCapabilities();
    this.init();
  }

  // Inicializar PWA
  private async init(): Promise<void> {
    try {
      // Detectar se está instalado
      this.detectInstallation();

      // Configurar listeners
      this.setupEventListeners();

      // Inicializar Service Worker
      if (this.config.enableServiceWorker && this.capabilities.serviceWorker) {
        await this.initServiceWorker();
      }

      // Configurar notificações
      if (this.config.enableNotifications && this.capabilities.notifications) {
        await this.setupNotifications();
      }

      // Configurar sincronização em background
      if (this.config.enableBackgroundSync && this.capabilities.backgroundSync) {
        this.setupBackgroundSync();
      }

      // Configurar sincronização periódica
      if (this.config.enablePeriodicSync && this.capabilities.periodicSync) {
        this.setupPeriodicSync();
      }

      analyticsService.trackEvent('pwa_initialized', {
        capabilities: this.capabilities,
        config: this.config
      });

    } catch (error) {
      console.error('Erro ao inicializar PWA:', error);
      analyticsService.trackError(error as Error, {
        context: 'pwa_initialization'
      });
    }
  }

  // Detectar capacidades do dispositivo/navegador
  private detectCapabilities(): PWACapabilities {
    return {
      serviceWorker: 'serviceWorker' in navigator,
      notifications: 'Notification' in window,
      backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      periodicSync: 'serviceWorker' in navigator && 'periodicSync' in window.ServiceWorkerRegistration.prototype,
      installPrompt: true, // Será detectado dinamicamente
      standalone: window.matchMedia('(display-mode: standalone)').matches,
      fullscreen: 'requestFullscreen' in document.documentElement,
      webShare: 'share' in navigator,
      geolocation: 'geolocation' in navigator,
      camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      storage: 'storage' in navigator && 'estimate' in navigator.storage
    };
  }

  // Detectar se o app está instalado
  private detectInstallation(): void {
    // Verificar se está rodando como PWA
    this.isInstalled = this.capabilities.standalone || 
                      window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone === true;

    if (this.isInstalled) {
      analyticsService.trackEvent('pwa_running_installed');
    }
  }

  // Configurar event listeners
  private setupEventListeners(): void {
    // Listener para prompt de instalação
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e as InstallPromptEvent;
      this.capabilities.installPrompt = true;
      
      analyticsService.trackEvent('pwa_install_prompt_available');
      
      // Disparar evento customizado
      window.dispatchEvent(new CustomEvent('pwa-install-available'));
    });

    // Listener para instalação concluída
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.installPrompt = null;
      
      analyticsService.trackEvent('pwa_installed');
      notificationService.showNotification(
        'App Instalado!',
        'O aplicativo foi instalado com sucesso em seu dispositivo.',
        { icon: '/icons/icon-192x192.png' }
      );
      
      window.dispatchEvent(new CustomEvent('pwa-installed'));
    });

    // Listeners para status de conexão
    window.addEventListener('online', () => {
      this.isOnline = true;
      analyticsService.trackEvent('pwa_online');
      window.dispatchEvent(new CustomEvent('pwa-online'));
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      analyticsService.trackEvent('pwa_offline');
      window.dispatchEvent(new CustomEvent('pwa-offline'));
    });

    // Listener para mudanças no display mode
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
      this.capabilities.standalone = e.matches;
      analyticsService.trackEvent('pwa_display_mode_changed', { standalone: e.matches });
    });
  }

  // Inicializar Service Worker
  private async initServiceWorker(): Promise<void> {
    try {
      this.workbox = new Workbox('/sw.js');

      // Listener para atualizações
      this.workbox.addEventListener('waiting', () => {
        this.updateAvailable = true;
        window.dispatchEvent(new CustomEvent('pwa-update-available'));
        
        analyticsService.trackEvent('pwa_update_available');
      });

      // Listener para controle
      this.workbox.addEventListener('controlling', () => {
        window.location.reload();
      });

      // Registrar Service Worker
      await this.workbox.register();
      
      analyticsService.trackEvent('pwa_service_worker_registered');

      // Verificar atualizações periodicamente
      setInterval(() => {
        this.checkForUpdates();
      }, this.config.updateCheckInterval);

    } catch (error) {
      console.error('Erro ao registrar Service Worker:', error);
      analyticsService.trackError(error as Error, {
        context: 'service_worker_registration'
      });
    }
  }

  // Configurar notificações
  private async setupNotifications(): Promise<void> {
    try {
      const permission = await notificationService.requestPermission();
      
      if (permission === 'granted') {
        analyticsService.trackEvent('pwa_notifications_enabled');
      }
    } catch (error) {
      console.error('Erro ao configurar notificações:', error);
    }
  }

  // Configurar sincronização em background
  private setupBackgroundSync(): void {
    // Registrar para sincronização quando voltar online
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        return registration.sync.register('background-sync');
      }).catch((error) => {
        console.error('Erro ao registrar background sync:', error);
      });
    }
  }

  // Configurar sincronização periódica
  private setupPeriodicSync(): void {
    if ('serviceWorker' in navigator && 'periodicSync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        return (registration as any).periodicSync.register('periodic-sync', {
          minInterval: 24 * 60 * 60 * 1000 // 24 horas
        });
      }).catch((error) => {
        console.error('Erro ao registrar periodic sync:', error);
      });
    }
  }

  // Métodos públicos

  // Verificar se pode ser instalado
  canInstall(): boolean {
    return !this.isInstalled && this.installPrompt !== null;
  }

  // Mostrar prompt de instalação
  async showInstallPrompt(): Promise<boolean> {
    if (!this.canInstall() || !this.installPrompt) {
      return false;
    }

    try {
      await this.installPrompt.prompt();
      const result = await this.installPrompt.userChoice;
      
      analyticsService.trackEvent('pwa_install_prompt_result', {
        outcome: result.outcome
      });

      if (result.outcome === 'accepted') {
        this.installPrompt = null;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao mostrar prompt de instalação:', error);
      return false;
    }
  }

  // Verificar atualizações
  async checkForUpdates(): Promise<boolean> {
    if (!this.workbox) return false;

    try {
      const registration = await this.workbox.update();
      return !!registration;
    } catch (error) {
      console.error('Erro ao verificar atualizações:', error);
      return false;
    }
  }

  // Aplicar atualização
  async applyUpdate(): Promise<void> {
    if (!this.workbox || !this.updateAvailable) return;

    try {
      await this.workbox.messageSkipWaiting();
      this.updateAvailable = false;
    } catch (error) {
      console.error('Erro ao aplicar atualização:', error);
    }
  }

  // Compartilhar conteúdo
  async share(data: {
    title?: string;
    text?: string;
    url?: string;
  }): Promise<boolean> {
    if (!this.capabilities.webShare) {
      // Fallback para clipboard ou outras opções
      return this.fallbackShare(data);
    }

    try {
      await navigator.share(data);
      analyticsService.trackEvent('pwa_content_shared', data);
      return true;
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      return this.fallbackShare(data);
    }
  }

  // Fallback para compartilhamento
  private async fallbackShare(data: { title?: string; text?: string; url?: string }): Promise<boolean> {
    try {
      const shareText = `${data.title || ''} ${data.text || ''} ${data.url || ''}`.trim();
      
      if ('clipboard' in navigator) {
        await navigator.clipboard.writeText(shareText);
        notificationService.showNotification(
          'Copiado!',
          'Link copiado para a área de transferência.',
          { duration: 3000 }
        );
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro no fallback de compartilhamento:', error);
      return false;
    }
  }

  // Obter informações de armazenamento
  async getStorageInfo(): Promise<{
    quota: number;
    usage: number;
    available: number;
    percentage: number;
  } | null> {
    if (!this.capabilities.storage) return null;

    try {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota || 0;
      const usage = estimate.usage || 0;
      const available = quota - usage;
      const percentage = quota > 0 ? (usage / quota) * 100 : 0;

      return { quota, usage, available, percentage };
    } catch (error) {
      console.error('Erro ao obter informações de armazenamento:', error);
      return null;
    }
  }

  // Limpar dados do app
  async clearAppData(): Promise<void> {
    try {
      // Limpar cache
      cacheService.clear();

      // Limpar localStorage
      localStorage.clear();

      // Limpar sessionStorage
      sessionStorage.clear();

      // Limpar IndexedDB se disponível
      if ('indexedDB' in window) {
        // Implementar limpeza do IndexedDB se necessário
      }

      // Limpar cache do Service Worker
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      analyticsService.trackEvent('pwa_data_cleared');
      
      notificationService.showNotification(
        'Dados Limpos',
        'Todos os dados do aplicativo foram removidos.',
        { duration: 5000 }
      );

    } catch (error) {
      console.error('Erro ao limpar dados do app:', error);
      analyticsService.trackError(error as Error, {
        context: 'clear_app_data'
      });
    }
  }

  // Entrar em modo fullscreen
  async enterFullscreen(): Promise<boolean> {
    if (!this.capabilities.fullscreen) return false;

    try {
      await document.documentElement.requestFullscreen();
      analyticsService.trackEvent('pwa_fullscreen_entered');
      return true;
    } catch (error) {
      console.error('Erro ao entrar em fullscreen:', error);
      return false;
    }
  }

  // Sair do modo fullscreen
  async exitFullscreen(): Promise<boolean> {
    if (!document.fullscreenElement) return false;

    try {
      await document.exitFullscreen();
      analyticsService.trackEvent('pwa_fullscreen_exited');
      return true;
    } catch (error) {
      console.error('Erro ao sair do fullscreen:', error);
      return false;
    }
  }

  // Obter status do PWA
  getStatus(): {
    isInstalled: boolean;
    isOnline: boolean;
    updateAvailable: boolean;
    capabilities: PWACapabilities;
    canInstall: boolean;
  } {
    return {
      isInstalled: this.isInstalled,
      isOnline: this.isOnline,
      updateAvailable: this.updateAvailable,
      capabilities: this.capabilities,
      canInstall: this.canInstall()
    };
  }

  // Configurar PWA
  configure(config: Partial<PWAConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Destruir instância
  destroy(): void {
    // Cleanup se necessário
  }
}

// Instância global do PWA
export const pwaService = new PWAService();

// Hook para React
export const usePWA = () => {
  const [status, setStatus] = React.useState(pwaService.getStatus());

  React.useEffect(() => {
    const updateStatus = () => setStatus(pwaService.getStatus());

    // Listeners para eventos PWA
    window.addEventListener('pwa-install-available', updateStatus);
    window.addEventListener('pwa-installed', updateStatus);
    window.addEventListener('pwa-update-available', updateStatus);
    window.addEventListener('pwa-online', updateStatus);
    window.addEventListener('pwa-offline', updateStatus);

    return () => {
      window.removeEventListener('pwa-install-available', updateStatus);
      window.removeEventListener('pwa-installed', updateStatus);
      window.removeEventListener('pwa-update-available', updateStatus);
      window.removeEventListener('pwa-online', updateStatus);
      window.removeEventListener('pwa-offline', updateStatus);
    };
  }, []);

  return {
    ...status,
    showInstallPrompt: pwaService.showInstallPrompt.bind(pwaService),
    checkForUpdates: pwaService.checkForUpdates.bind(pwaService),
    applyUpdate: pwaService.applyUpdate.bind(pwaService),
    share: pwaService.share.bind(pwaService),
    getStorageInfo: pwaService.getStorageInfo.bind(pwaService),
    clearAppData: pwaService.clearAppData.bind(pwaService),
    enterFullscreen: pwaService.enterFullscreen.bind(pwaService),
    exitFullscreen: pwaService.exitFullscreen.bind(pwaService)
  };
};

export default pwaService;