import { analyticsService } from './analyticsService';
import { cacheService } from './cacheService';
import { notificationService } from './notificationService';

interface BackupData {
  appointments: any[];
  userSettings: any;
  pastors: any[];
  metadata: {
    version: string;
    timestamp: number;
    deviceId: string;
    userId?: string;
  };
}

interface BackupConfig {
  autoBackup: boolean;
  backupInterval: number; // em milissegundos
  maxBackups: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  cloudSync: boolean;
}

interface SyncStatus {
  lastSync: number;
  pendingChanges: number;
  syncInProgress: boolean;
  lastError?: string;
}

class BackupService {
  private config: BackupConfig;
  private syncStatus: SyncStatus;
  private backupTimer: NodeJS.Timeout | null = null;
  private deviceId: string;
  private dbName = 'church-app-backup';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor(config: Partial<BackupConfig> = {}) {
    this.config = {
      autoBackup: true,
      backupInterval: 30 * 60 * 1000, // 30 minutos
      maxBackups: 10,
      compressionEnabled: true,
      encryptionEnabled: false,
      cloudSync: false,
      ...config
    };

    this.syncStatus = {
      lastSync: 0,
      pendingChanges: 0,
      syncInProgress: false
    };

    this.deviceId = this.generateDeviceId();
    this.init();
  }

  // Inicializar o serviço
  private async init(): Promise<void> {
    try {
      await this.initDatabase();
      await this.loadSyncStatus();
      
      if (this.config.autoBackup) {
        this.startAutoBackup();
      }

      // Verificar se há backups pendentes para sincronizar
      await this.checkPendingSync();

      analyticsService.trackEvent('backup_service_initialized', {
        config: this.config,
        deviceId: this.deviceId
      });

    } catch (error) {
      console.error('Erro ao inicializar serviço de backup:', error);
      analyticsService.trackError(error as Error, {
        context: 'backup_service_init'
      });
    }
  }

  // Inicializar IndexedDB
  private initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Store para backups
        if (!db.objectStoreNames.contains('backups')) {
          const backupStore = db.createObjectStore('backups', { keyPath: 'id', autoIncrement: true });
          backupStore.createIndex('timestamp', 'timestamp', { unique: false });
          backupStore.createIndex('deviceId', 'deviceId', { unique: false });
        }

        // Store para dados pendentes de sincronização
        if (!db.objectStoreNames.contains('pending_sync')) {
          const syncStore = db.createObjectStore('pending_sync', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('type', 'type', { unique: false });
        }

        // Store para configurações
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  // Gerar ID único do dispositivo
  private generateDeviceId(): string {
    let deviceId = localStorage.getItem('church-app-device-id');
    
    if (!deviceId) {
      deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('church-app-device-id', deviceId);
    }
    
    return deviceId;
  }

  // Carregar status de sincronização
  private async loadSyncStatus(): Promise<void> {
    try {
      const stored = localStorage.getItem('church-app-sync-status');
      if (stored) {
        this.syncStatus = { ...this.syncStatus, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Erro ao carregar status de sincronização:', error);
    }
  }

  // Salvar status de sincronização
  private saveSyncStatus(): void {
    try {
      localStorage.setItem('church-app-sync-status', JSON.stringify(this.syncStatus));
    } catch (error) {
      console.error('Erro ao salvar status de sincronização:', error);
    }
  }

  // Iniciar backup automático
  private startAutoBackup(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
    }

    this.backupTimer = setInterval(() => {
      this.createBackup().catch(error => {
        console.error('Erro no backup automático:', error);
      });
    }, this.config.backupInterval);
  }

  // Parar backup automático
  private stopAutoBackup(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }
  }

  // Criar backup
  async createBackup(userId?: string): Promise<string> {
    try {
      analyticsService.trackEvent('backup_started', { userId, deviceId: this.deviceId });

      // Coletar dados para backup
      const backupData: BackupData = {
        appointments: await this.getAppointmentsData(),
        userSettings: await this.getUserSettingsData(userId),
        pastors: await this.getPastorsData(),
        metadata: {
          version: '1.0.0',
          timestamp: Date.now(),
          deviceId: this.deviceId,
          userId
        }
      };

      // Comprimir dados se habilitado
      let processedData = backupData;
      if (this.config.compressionEnabled) {
        processedData = await this.compressData(backupData);
      }

      // Criptografar dados se habilitado
      if (this.config.encryptionEnabled) {
        processedData = await this.encryptData(processedData);
      }

      // Salvar no IndexedDB
      const backupId = await this.saveBackupToDatabase(processedData);

      // Limpar backups antigos
      await this.cleanupOldBackups();

      // Atualizar status
      this.syncStatus.lastSync = Date.now();
      this.saveSyncStatus();

      analyticsService.trackEvent('backup_completed', {
        backupId,
        dataSize: JSON.stringify(backupData).length,
        compressed: this.config.compressionEnabled,
        encrypted: this.config.encryptionEnabled
      });

      return backupId;

    } catch (error) {
      console.error('Erro ao criar backup:', error);
      analyticsService.trackError(error as Error, {
        context: 'create_backup',
        userId,
        deviceId: this.deviceId
      });
      throw error;
    }
  }

  // Restaurar backup
  async restoreBackup(backupId: string): Promise<void> {
    try {
      analyticsService.trackEvent('restore_started', { backupId });

      const backupData = await this.getBackupFromDatabase(backupId);
      if (!backupData) {
        throw new Error('Backup não encontrado');
      }

      // Descriptografar se necessário
      let processedData = backupData;
      if (this.config.encryptionEnabled) {
        processedData = await this.decryptData(processedData);
      }

      // Descomprimir se necessário
      if (this.config.compressionEnabled) {
        processedData = await this.decompressData(processedData);
      }

      // Restaurar dados
      await this.restoreAppointmentsData(processedData.appointments);
      await this.restoreUserSettingsData(processedData.userSettings);
      await this.restorePastorsData(processedData.pastors);

      // Limpar cache para forçar recarregamento
      cacheService.clear();

      analyticsService.trackEvent('restore_completed', {
        backupId,
        timestamp: processedData.metadata.timestamp
      });

      notificationService.showNotification(
        'Backup Restaurado',
        'Seus dados foram restaurados com sucesso.',
        { duration: 5000 }
      );

    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
      analyticsService.trackError(error as Error, {
        context: 'restore_backup',
        backupId
      });
      throw error;
    }
  }

  // Listar backups disponíveis
  async listBackups(): Promise<Array<{
    id: string;
    timestamp: number;
    deviceId: string;
    userId?: string;
    size: number;
  }>> {
    try {
      if (!this.db) throw new Error('Database não inicializada');

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['backups'], 'readonly');
        const store = transaction.objectStore('backups');
        const request = store.getAll();

        request.onsuccess = () => {
          const backups = request.result.map((backup: any) => ({
            id: backup.id,
            timestamp: backup.metadata.timestamp,
            deviceId: backup.metadata.deviceId,
            userId: backup.metadata.userId,
            size: JSON.stringify(backup).length
          }));

          // Ordenar por timestamp (mais recente primeiro)
          backups.sort((a, b) => b.timestamp - a.timestamp);
          resolve(backups);
        };

        request.onerror = () => reject(request.error);
      });

    } catch (error) {
      console.error('Erro ao listar backups:', error);
      return [];
    }
  }

  // Deletar backup
  async deleteBackup(backupId: string): Promise<void> {
    try {
      if (!this.db) throw new Error('Database não inicializada');

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['backups'], 'readwrite');
        const store = transaction.objectStore('backups');
        const request = store.delete(parseInt(backupId));

        request.onsuccess = () => {
          analyticsService.trackEvent('backup_deleted', { backupId });
          resolve();
        };

        request.onerror = () => reject(request.error);
      });

    } catch (error) {
      console.error('Erro ao deletar backup:', error);
      throw error;
    }
  }

  // Exportar backup para arquivo
  async exportBackup(backupId: string): Promise<void> {
    try {
      const backupData = await this.getBackupFromDatabase(backupId);
      if (!backupData) {
        throw new Error('Backup não encontrado');
      }

      const dataStr = JSON.stringify(backupData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `church-app-backup-${backupId}-${new Date().toISOString().split('T')[0]}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);

      analyticsService.trackEvent('backup_exported', { backupId });

    } catch (error) {
      console.error('Erro ao exportar backup:', error);
      throw error;
    }
  }

  // Importar backup de arquivo
  async importBackup(file: File): Promise<string> {
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      // Validar estrutura do backup
      if (!this.validateBackupData(backupData)) {
        throw new Error('Arquivo de backup inválido');
      }

      // Salvar no database
      const backupId = await this.saveBackupToDatabase(backupData);

      analyticsService.trackEvent('backup_imported', {
        backupId,
        fileSize: file.size,
        originalTimestamp: backupData.metadata.timestamp
      });

      return backupId;

    } catch (error) {
      console.error('Erro ao importar backup:', error);
      throw error;
    }
  }

  // Sincronizar com a nuvem (placeholder)
  async syncToCloud(): Promise<void> {
    if (!this.config.cloudSync) {
      throw new Error('Sincronização com nuvem não habilitada');
    }

    try {
      this.syncStatus.syncInProgress = true;
      this.saveSyncStatus();

      // Implementar lógica de sincronização com API
      // Por enquanto, apenas simular
      await new Promise(resolve => setTimeout(resolve, 2000));

      this.syncStatus.syncInProgress = false;
      this.syncStatus.lastSync = Date.now();
      this.syncStatus.pendingChanges = 0;
      this.saveSyncStatus();

      analyticsService.trackEvent('cloud_sync_completed');

    } catch (error) {
      this.syncStatus.syncInProgress = false;
      this.syncStatus.lastError = (error as Error).message;
      this.saveSyncStatus();
      
      console.error('Erro na sincronização com nuvem:', error);
      throw error;
    }
  }

  // Obter status de sincronização
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  // Configurar serviço
  configure(config: Partial<BackupConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...config };

    // Reiniciar timer se intervalo mudou
    if (oldConfig.backupInterval !== this.config.backupInterval) {
      if (this.config.autoBackup) {
        this.startAutoBackup();
      }
    }

    // Iniciar/parar backup automático
    if (oldConfig.autoBackup !== this.config.autoBackup) {
      if (this.config.autoBackup) {
        this.startAutoBackup();
      } else {
        this.stopAutoBackup();
      }
    }
  }

  // Métodos privados auxiliares

  private async getAppointmentsData(): Promise<any[]> {
    // Obter dados de agendamentos do cache ou localStorage
    const cached = cacheService.getCachedAppointments();
    if (cached) return cached;

    const stored = localStorage.getItem('appointments');
    return stored ? JSON.parse(stored) : [];
  }

  private async getUserSettingsData(userId?: string): Promise<any> {
    if (userId) {
      return cacheService.getCachedUserSettings(userId) || {};
    }
    
    const stored = localStorage.getItem('userSettings');
    return stored ? JSON.parse(stored) : {};
  }

  private async getPastorsData(): Promise<any[]> {
    const cached = cacheService.getCachedPastors();
    if (cached) return cached;

    const stored = localStorage.getItem('pastors');
    return stored ? JSON.parse(stored) : [];
  }

  private async restoreAppointmentsData(data: any[]): Promise<void> {
    localStorage.setItem('appointments', JSON.stringify(data));
    cacheService.cacheAppointments(data);
  }

  private async restoreUserSettingsData(data: any): Promise<void> {
    localStorage.setItem('userSettings', JSON.stringify(data));
  }

  private async restorePastorsData(data: any[]): Promise<void> {
    localStorage.setItem('pastors', JSON.stringify(data));
    cacheService.cachePastors(data);
  }

  private async compressData(data: any): Promise<any> {
    // Implementação simples de compressão
    // Em produção, usar uma biblioteca como pako
    return data;
  }

  private async decompressData(data: any): Promise<any> {
    return data;
  }

  private async encryptData(data: any): Promise<any> {
    // Implementação de criptografia
    // Em produção, usar Web Crypto API
    return data;
  }

  private async decryptData(data: any): Promise<any> {
    return data;
  }

  private async saveBackupToDatabase(data: BackupData): Promise<string> {
    if (!this.db) throw new Error('Database não inicializada');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['backups'], 'readwrite');
      const store = transaction.objectStore('backups');
      const request = store.add(data);

      request.onsuccess = () => resolve(request.result.toString());
      request.onerror = () => reject(request.error);
    });
  }

  private async getBackupFromDatabase(backupId: string): Promise<BackupData | null> {
    if (!this.db) throw new Error('Database não inicializada');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['backups'], 'readonly');
      const store = transaction.objectStore('backups');
      const request = store.get(parseInt(backupId));

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.listBackups();
      
      if (backups.length > this.config.maxBackups) {
        const toDelete = backups.slice(this.config.maxBackups);
        
        for (const backup of toDelete) {
          await this.deleteBackup(backup.id);
        }
      }
    } catch (error) {
      console.error('Erro ao limpar backups antigos:', error);
    }
  }

  private validateBackupData(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      Array.isArray(data.appointments) &&
      typeof data.userSettings === 'object' &&
      Array.isArray(data.pastors) &&
      data.metadata &&
      typeof data.metadata.timestamp === 'number' &&
      typeof data.metadata.deviceId === 'string'
    );
  }

  private async checkPendingSync(): Promise<void> {
    // Verificar se há dados pendentes para sincronizar
    const pendingCount = 0; // Implementar lógica
    this.syncStatus.pendingChanges = pendingCount;
    this.saveSyncStatus();
  }

  // Cleanup
  destroy(): void {
    this.stopAutoBackup();
    
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Instância global
export const backupService = new BackupService();

// Hook para React
export const useBackup = () => {
  const [syncStatus, setSyncStatus] = React.useState(backupService.getSyncStatus());
  const [backups, setBackups] = React.useState<any[]>([]);

  React.useEffect(() => {
    const updateStatus = () => setSyncStatus(backupService.getSyncStatus());
    const updateBackups = () => {
      backupService.listBackups().then(setBackups);
    };

    updateStatus();
    updateBackups();

    // Atualizar periodicamente
    const interval = setInterval(() => {
      updateStatus();
      updateBackups();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, []);

  return {
    syncStatus,
    backups,
    createBackup: backupService.createBackup.bind(backupService),
    restoreBackup: backupService.restoreBackup.bind(backupService),
    deleteBackup: backupService.deleteBackup.bind(backupService),
    exportBackup: backupService.exportBackup.bind(backupService),
    importBackup: backupService.importBackup.bind(backupService),
    syncToCloud: backupService.syncToCloud.bind(backupService)
  };
};

export default backupService;