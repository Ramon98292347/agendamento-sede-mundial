import { useState, useEffect } from 'react';
import { analyticsService } from '../services/analyticsService';

export interface OnlineStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
}

export const useOnlineStatus = () => {
  const [status, setStatus] = useState<OnlineStatus>(() => {
    if (typeof window === 'undefined') {
      return {
        isOnline: true,
        isSlowConnection: false,
        connectionType: 'unknown',
        effectiveType: 'unknown',
        downlink: 0,
        rtt: 0
      };
    }

    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    return {
      isOnline: navigator.onLine,
      isSlowConnection: connection ? connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g' : false,
      connectionType: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0
    };
  });

  useEffect(() => {
    const updateOnlineStatus = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;

      const newStatus: OnlineStatus = {
        isOnline: navigator.onLine,
        isSlowConnection: connection ? connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g' : false,
        connectionType: connection?.type || 'unknown',
        effectiveType: connection?.effectiveType || 'unknown',
        downlink: connection?.downlink || 0,
        rtt: connection?.rtt || 0
      };

      setStatus(prevStatus => {
        // Só atualizar se houver mudança significativa
        if (prevStatus.isOnline !== newStatus.isOnline) {
          analyticsService.trackEvent({
            action: newStatus.isOnline ? 'came_online' : 'went_offline',
            category: 'connectivity',
            customData: {
              connectionType: newStatus.connectionType,
              effectiveType: newStatus.effectiveType
            }
          });
        }

        return newStatus;
      });
    };

    const updateConnectionInfo = () => {
      updateOnlineStatus();
    };

    // Escutar mudanças no status online/offline
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Escutar mudanças na conexão (se suportado)
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener('change', updateConnectionInfo);
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      
      if (connection) {
        connection.removeEventListener('change', updateConnectionInfo);
      }
    };
  }, []);

  return status;
};

// Hook para detectar se a aplicação está sendo usada offline
export const useOfflineCapability = () => {
  const { isOnline } = useOnlineStatus();
  const [hasOfflineData, setHasOfflineData] = useState(false);

  useEffect(() => {
    // Verificar se há dados em cache/localStorage
    const checkOfflineData = () => {
      try {
        const cachedAppointments = localStorage.getItem('cached_appointments');
        const cachedPastors = localStorage.getItem('cached_pastors');
        setHasOfflineData(!!(cachedAppointments || cachedPastors));
      } catch (error) {
        setHasOfflineData(false);
      }
    };

    checkOfflineData();
  }, []);

  return {
    isOnline,
    hasOfflineData,
    canUseOffline: hasOfflineData || isOnline
  };
};

// Hook para sincronização quando voltar online
export const useOfflineSync = () => {
  const { isOnline } = useOnlineStatus();
  const [pendingSync, setPendingSync] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (isOnline && pendingSync.length > 0) {
      syncPendingData();
    }
  }, [isOnline, pendingSync]);

  const addToPendingSync = (data: any) => {
    setPendingSync(prev => [...prev, { ...data, timestamp: Date.now() }]);
    
    // Salvar no localStorage para persistir entre sessões
    try {
      const existing = JSON.parse(localStorage.getItem('pending_sync') || '[]');
      existing.push({ ...data, timestamp: Date.now() });
      localStorage.setItem('pending_sync', JSON.stringify(existing));
    } catch (error) {
      console.error('Erro ao salvar dados pendentes:', error);
    }
  };

  const syncPendingData = async () => {
    if (isSyncing || pendingSync.length === 0) return;

    setIsSyncing(true);
    
    try {
      for (const item of pendingSync) {
        // Aqui você implementaria a lógica de sincronização
        // Por exemplo, enviar agendamentos criados offline
        console.log('Sincronizando:', item);
        
        // Simular sincronização
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Limpar dados sincronizados
      setPendingSync([]);
      localStorage.removeItem('pending_sync');
      
      analyticsService.trackEvent({
        action: 'offline_sync_completed',
        category: 'connectivity',
        customData: {
          itemsSynced: pendingSync.length
        }
      });
    } catch (error) {
      console.error('Erro na sincronização:', error);
      analyticsService.trackError(error as Error, {
        context: 'offline_sync',
        pendingItems: pendingSync.length
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Carregar dados pendentes do localStorage na inicialização
  useEffect(() => {
    try {
      const pending = JSON.parse(localStorage.getItem('pending_sync') || '[]');
      setPendingSync(pending);
    } catch (error) {
      console.error('Erro ao carregar dados pendentes:', error);
    }
  }, []);

  return {
    pendingSync,
    isSyncing,
    addToPendingSync,
    syncPendingData
  };
};