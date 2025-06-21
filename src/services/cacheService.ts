import { analyticsService } from './analyticsService';

// Tipos para o sistema de cache
interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live em milissegundos
  version: string;
  tags: string[];
  accessCount: number;
  lastAccessed: number;
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  cleanupInterval: number;
  compressionThreshold: number;
  enableAnalytics: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  size: number;
  memoryUsage: number;
}

class CacheService {
  private cache = new Map<string, CacheItem>();
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private compressionWorker: Worker | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 100,
      defaultTTL: 5 * 60 * 1000, // 5 minutos
      cleanupInterval: 60 * 1000, // 1 minuto
      compressionThreshold: 1024 * 10, // 10KB
      enableAnalytics: true,
      ...config
    };

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      size: 0,
      memoryUsage: 0
    };

    this.startCleanupTimer();
    this.initializeCompression();
  }

  // Configurar cache
  configure(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.startCleanupTimer();
    }
  }

  // Obter item do cache
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      this.trackAnalytics('cache_miss', { key });
      return null;
    }

    // Verificar se expirou
    if (this.isExpired(item)) {
      this.delete(key);
      this.stats.misses++;
      this.trackAnalytics('cache_expired', { key });
      return null;
    }

    // Atualizar estatísticas de acesso
    item.accessCount++;
    item.lastAccessed = Date.now();
    this.stats.hits++;
    
    this.trackAnalytics('cache_hit', { key, accessCount: item.accessCount });
    
    return this.deserializeData(item.data);
  }

  // Definir item no cache
  set<T>(key: string, data: T, options: {
    ttl?: number;
    tags?: string[];
    version?: string;
    compress?: boolean;
  } = {}): void {
    const {
      ttl = this.config.defaultTTL,
      tags = [],
      version = '1.0.0',
      compress = false
    } = options;

    // Verificar limite de tamanho
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    const serializedData = this.serializeData(data, compress);
    
    const item: CacheItem<T> = {
      data: serializedData,
      timestamp: Date.now(),
      ttl,
      version,
      tags,
      accessCount: 0,
      lastAccessed: Date.now()
    };

    this.cache.set(key, item);
    this.stats.sets++;
    this.updateMemoryUsage();
    
    this.trackAnalytics('cache_set', { 
      key, 
      ttl, 
      tags, 
      version,
      dataSize: this.getDataSize(serializedData)
    });
  }

  // Deletar item do cache
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      this.updateMemoryUsage();
      this.trackAnalytics('cache_delete', { key });
    }
    return deleted;
  }

  // Limpar cache por tags
  deleteByTags(tags: string[]): number {
    let deletedCount = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (tags.some(tag => item.tags.includes(tag))) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    this.stats.deletes += deletedCount;
    this.updateMemoryUsage();
    
    this.trackAnalytics('cache_delete_by_tags', { tags, deletedCount });
    
    return deletedCount;
  }

  // Limpar todo o cache
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.deletes += size;
    this.updateMemoryUsage();
    
    this.trackAnalytics('cache_clear', { deletedCount: size });
  }

  // Verificar se uma chave existe
  has(key: string): boolean {
    const item = this.cache.get(key);
    return item ? !this.isExpired(item) : false;
  }

  // Obter todas as chaves
  keys(): string[] {
    const validKeys: string[] = [];
    
    for (const [key, item] of this.cache.entries()) {
      if (!this.isExpired(item)) {
        validKeys.push(key);
      }
    }
    
    return validKeys;
  }

  // Obter estatísticas do cache
  getStats(): CacheStats & { hitRate: number; efficiency: number } {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    const efficiency = this.cache.size > 0 ? (this.stats.hits / this.cache.size) : 0;
    
    return {
      ...this.stats,
      hitRate,
      efficiency
    };
  }

  // Obter informações detalhadas do cache
  getInfo(): {
    config: CacheConfig;
    stats: ReturnType<typeof this.getStats>;
    items: Array<{
      key: string;
      size: number;
      ttl: number;
      age: number;
      accessCount: number;
      tags: string[];
    }>;
  } {
    const items = Array.from(this.cache.entries()).map(([key, item]) => ({
      key,
      size: this.getDataSize(item.data),
      ttl: item.ttl,
      age: Date.now() - item.timestamp,
      accessCount: item.accessCount,
      tags: item.tags
    }));

    return {
      config: this.config,
      stats: this.getStats(),
      items
    };
  }

  // Métodos de cache específicos para a aplicação
  
  // Cache de agendamentos
  async cacheAppointments(appointments: any[], ttl = 10 * 60 * 1000): Promise<void> {
    this.set('appointments', appointments, {
      ttl,
      tags: ['appointments', 'data'],
      version: '1.0.0'
    });
  }

  getCachedAppointments(): any[] | null {
    return this.get('appointments');
  }

  // Cache de pastores
  async cachePastors(pastors: any[], ttl = 30 * 60 * 1000): Promise<void> {
    this.set('pastors', pastors, {
      ttl,
      tags: ['pastors', 'data'],
      version: '1.0.0'
    });
  }

  getCachedPastors(): any[] | null {
    return this.get('pastors');
  }

  // Cache de configurações do usuário
  cacheUserSettings(userId: string, settings: any, ttl = 60 * 60 * 1000): void {
    this.set(`user_settings_${userId}`, settings, {
      ttl,
      tags: ['user_settings', `user_${userId}`],
      version: '1.0.0'
    });
  }

  getCachedUserSettings(userId: string): any | null {
    return this.get(`user_settings_${userId}`);
  }

  // Cache de resultados de API
  cacheApiResponse(endpoint: string, params: any, response: any, ttl = 5 * 60 * 1000): void {
    const key = this.generateApiCacheKey(endpoint, params);
    this.set(key, response, {
      ttl,
      tags: ['api', endpoint],
      version: '1.0.0'
    });
  }

  getCachedApiResponse(endpoint: string, params: any): any | null {
    const key = this.generateApiCacheKey(endpoint, params);
    return this.get(key);
  }

  // Invalidar cache relacionado a agendamentos
  invalidateAppointmentCache(): void {
    this.deleteByTags(['appointments']);
  }

  // Invalidar cache de um usuário específico
  invalidateUserCache(userId: string): void {
    this.deleteByTags([`user_${userId}`]);
  }

  // Métodos privados
  
  private isExpired(item: CacheItem): boolean {
    return Date.now() - item.timestamp > item.ttl;
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      this.trackAnalytics('cache_eviction', { key: oldestKey, reason: 'lru' });
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const expiredKeys: string[] = [];
    
    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => {
      this.cache.delete(key);
      this.stats.deletes++;
    });
    
    if (expiredKeys.length > 0) {
      this.updateMemoryUsage();
      this.trackAnalytics('cache_cleanup', { expiredCount: expiredKeys.length });
    }
  }

  private serializeData(data: any, compress: boolean): any {
    if (!compress) return data;
    
    try {
      const serialized = JSON.stringify(data);
      if (serialized.length > this.config.compressionThreshold) {
        // Implementar compressão se necessário
        return this.compressData(serialized);
      }
      return data;
    } catch (error) {
      console.warn('Erro ao serializar dados para cache:', error);
      return data;
    }
  }

  private deserializeData(data: any): any {
    if (typeof data === 'string' && data.startsWith('compressed:')) {
      return this.decompressData(data);
    }
    return data;
  }

  private compressData(data: string): string {
    // Implementação simples de compressão (pode ser melhorada)
    try {
      return 'compressed:' + btoa(data);
    } catch (error) {
      console.warn('Erro ao comprimir dados:', error);
      return data;
    }
  }

  private decompressData(compressedData: string): any {
    try {
      const data = atob(compressedData.replace('compressed:', ''));
      return JSON.parse(data);
    } catch (error) {
      console.warn('Erro ao descomprimir dados:', error);
      return null;
    }
  }

  private generateApiCacheKey(endpoint: string, params: any): string {
    const paramString = JSON.stringify(params, Object.keys(params).sort());
    return `api_${endpoint}_${btoa(paramString)}`;
  }

  private getDataSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }

  private updateMemoryUsage(): void {
    let totalSize = 0;
    for (const item of this.cache.values()) {
      totalSize += this.getDataSize(item);
    }
    this.stats.memoryUsage = totalSize;
    this.stats.size = this.cache.size;
  }

  private initializeCompression(): void {
    // Inicializar Web Worker para compressão se disponível
    if (typeof Worker !== 'undefined') {
      try {
        // Implementar Web Worker para compressão assíncrona se necessário
      } catch (error) {
        console.warn('Web Worker não disponível para compressão:', error);
      }
    }
  }

  private trackAnalytics(event: string, data: any): void {
    if (this.config.enableAnalytics) {
      analyticsService.trackEvent('cache', {
        action: event,
        ...data
      });
    }
  }

  // Cleanup ao destruir a instância
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
      this.compressionWorker = null;
    }
    
    this.clear();
  }
}

// Instância global do cache
export const cacheService = new CacheService({
  maxSize: 200,
  defaultTTL: 10 * 60 * 1000, // 10 minutos
  cleanupInterval: 2 * 60 * 1000, // 2 minutos
  compressionThreshold: 1024 * 5, // 5KB
  enableAnalytics: true
});

// Hook para React
export const useCache = () => {
  return {
    get: cacheService.get.bind(cacheService),
    set: cacheService.set.bind(cacheService),
    delete: cacheService.delete.bind(cacheService),
    clear: cacheService.clear.bind(cacheService),
    has: cacheService.has.bind(cacheService),
    getStats: cacheService.getStats.bind(cacheService),
    invalidateAppointmentCache: cacheService.invalidateAppointmentCache.bind(cacheService),
    invalidateUserCache: cacheService.invalidateUserCache.bind(cacheService)
  };
};

// Utilitários para cache específico
export const CacheUtils = {
  // Gerar chave de cache baseada em parâmetros
  generateKey: (prefix: string, params: Record<string, any>): string => {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);
    
    return `${prefix}_${btoa(JSON.stringify(sortedParams))}`;
  },

  // Verificar se o cache está saudável
  isHealthy: (): boolean => {
    const stats = cacheService.getStats();
    return stats.hitRate > 50 && stats.memoryUsage < 1024 * 1024 * 10; // 10MB
  },

  // Otimizar cache removendo itens menos usados
  optimize: (): void => {
    const info = cacheService.getInfo();
    const itemsToRemove = info.items
      .filter(item => item.accessCount < 2 && item.age > 30 * 60 * 1000) // Menos de 2 acessos e mais de 30 min
      .map(item => item.key);
    
    itemsToRemove.forEach(key => cacheService.delete(key));
  }
};

export default cacheService;