import { useState, useEffect, useCallback } from 'react';
import { analyticsService } from '../services/analyticsService';

type SerializableValue = string | number | boolean | object | null;

interface CacheItem<T> {
  value: T;
  timestamp: number;
  expiresAt?: number;
}

interface UseLocalStorageOptions {
  defaultValue?: any;
  serialize?: (value: any) => string;
  deserialize?: (value: string) => any;
  ttl?: number; // Time to live em milissegundos
}

export const useLocalStorage = <T extends SerializableValue>(
  key: string,
  options: UseLocalStorageOptions = {}
) => {
  const {
    defaultValue,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    ttl
  } = options;

  // Estado para armazenar o valor
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return defaultValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (!item) {
        return defaultValue;
      }

      const parsed: CacheItem<T> = deserialize(item);
      
      // Verificar se o item expirou
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        window.localStorage.removeItem(key);
        return defaultValue;
      }

      return parsed.value;
    } catch (error) {
      console.error(`Erro ao ler localStorage para chave "${key}":`, error);
      analyticsService.trackError(error as Error, {
        context: 'localStorage_read',
        key
      });
      return defaultValue;
    }
  });

  // Função para definir valor
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        const cacheItem: CacheItem<T> = {
          value: valueToStore,
          timestamp: Date.now(),
          ...(ttl && { expiresAt: Date.now() + ttl })
        };

        window.localStorage.setItem(key, serialize(cacheItem));
      }
    } catch (error) {
      console.error(`Erro ao salvar no localStorage para chave "${key}":`, error);
      analyticsService.trackError(error as Error, {
        context: 'localStorage_write',
        key
      });
    }
  }, [key, serialize, storedValue, ttl]);

  // Função para remover valor
  const removeValue = useCallback(() => {
    try {
      setStoredValue(defaultValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Erro ao remover do localStorage para chave "${key}":`, error);
      analyticsService.trackError(error as Error, {
        context: 'localStorage_remove',
        key
      });
    }
  }, [key, defaultValue]);

  // Função para verificar se o valor existe
  const hasValue = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(key) !== null;
  }, [key]);

  return [storedValue, setValue, removeValue, hasValue] as const;
};

// Hook especializado para cache de dados da API
export const useApiCache = <T extends SerializableValue>(
  key: string,
  ttl: number = 5 * 60 * 1000 // 5 minutos por padrão
) => {
  const [cachedData, setCachedData, removeCachedData, hasCachedData] = useLocalStorage<T>(
    `api_cache_${key}`,
    { ttl }
  );

  const isExpired = useCallback(() => {
    if (typeof window === 'undefined') return true;
    
    try {
      const item = window.localStorage.getItem(`api_cache_${key}`);
      if (!item) return true;

      const parsed: CacheItem<T> = JSON.parse(item);
      return parsed.expiresAt ? Date.now() > parsed.expiresAt : false;
    } catch {
      return true;
    }
  }, [key]);

  const getCacheAge = useCallback(() => {
    if (typeof window === 'undefined') return 0;
    
    try {
      const item = window.localStorage.getItem(`api_cache_${key}`);
      if (!item) return 0;

      const parsed: CacheItem<T> = JSON.parse(item);
      return Date.now() - parsed.timestamp;
    } catch {
      return 0;
    }
  }, [key]);

  return {
    data: cachedData,
    setData: setCachedData,
    removeData: removeCachedData,
    hasData: hasCachedData,
    isExpired,
    cacheAge: getCacheAge()
  };
};

// Hook para gerenciar dados offline
export const useOfflineData = () => {
  const [appointments] = useLocalStorage('offline_appointments', { defaultValue: [] });
  const [pastors] = useLocalStorage('offline_pastors', { defaultValue: [] });
  const [userPreferences] = useLocalStorage('user_preferences', { defaultValue: {} });

  const clearAllOfflineData = useCallback(() => {
    const keysToRemove = [
      'offline_appointments',
      'offline_pastors',
      'pending_sync',
      'api_cache_appointments',
      'api_cache_pastors'
    ];

    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`Erro ao remover ${key}:`, error);
      }
    });

    analyticsService.trackEvent({
      action: 'offline_data_cleared',
      category: 'data_management'
    });
  }, []);

  const getStorageUsage = useCallback(() => {
    if (typeof window === 'undefined') return { used: 0, available: 0, percentage: 0 };

    try {
      let used = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length + key.length;
        }
      }

      // Estimar limite do localStorage (geralmente 5-10MB)
      const estimated = 5 * 1024 * 1024; // 5MB
      const percentage = (used / estimated) * 100;

      return {
        used,
        available: estimated - used,
        percentage: Math.min(percentage, 100)
      };
    } catch (error) {
      return { used: 0, available: 0, percentage: 0 };
    }
  }, []);

  return {
    appointments,
    pastors,
    userPreferences,
    clearAllOfflineData,
    storageUsage: getStorageUsage()
  };
};

// Hook para sincronização de dados
export const useDataSync = () => {
  const [lastSync, setLastSync] = useLocalStorage('last_sync_timestamp', { defaultValue: 0 });
  const [syncErrors, setSyncErrors] = useLocalStorage('sync_errors', { defaultValue: [] });

  const markSyncComplete = useCallback(() => {
    setLastSync(Date.now());
    setSyncErrors([]); // Limpar erros após sincronização bem-sucedida
  }, [setLastSync, setSyncErrors]);

  const addSyncError = useCallback((error: { message: string; timestamp: number; context?: any }) => {
    setSyncErrors((prev: any[]) => {
      const newErrors = [...prev, error];
      // Manter apenas os últimos 10 erros
      return newErrors.slice(-10);
    });
  }, [setSyncErrors]);

  const getTimeSinceLastSync = useCallback(() => {
    if (!lastSync) return null;
    return Date.now() - lastSync;
  }, [lastSync]);

  const shouldSync = useCallback((interval: number = 30 * 60 * 1000) => { // 30 minutos por padrão
    const timeSince = getTimeSinceLastSync();
    return !timeSince || timeSince > interval;
  }, [getTimeSinceLastSync]);

  return {
    lastSync,
    syncErrors,
    markSyncComplete,
    addSyncError,
    getTimeSinceLastSync,
    shouldSync
  };
};