import { useEffect, useRef, useState, useCallback } from 'react';
import { analyticsService } from '../services/analyticsService';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  interactionTime: number;
  memoryUsage?: number;
  connectionSpeed?: string;
}

interface PagePerformance {
  startTime: number;
  endTime?: number;
  duration?: number;
  pageName: string;
}

export const usePerformance = (pageName?: string) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const startTimeRef = useRef<number>(Date.now());
  const renderStartRef = useRef<number>(performance.now());

  // Medir tempo de carregamento da página
  useEffect(() => {
    const measurePageLoad = () => {
      if (typeof window !== 'undefined' && 'performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          const loadTime = navigation.loadEventEnd - navigation.fetchStart;
          const renderTime = performance.now() - renderStartRef.current;
          
          const newMetrics: PerformanceMetrics = {
            loadTime,
            renderTime,
            interactionTime: 0
          };

          // Adicionar informações de memória se disponível
          if ('memory' in performance) {
            const memory = (performance as any).memory;
            newMetrics.memoryUsage = memory.usedJSHeapSize;
          }

          // Adicionar informações de conexão se disponível
          const connection = (navigator as any).connection;
          if (connection) {
            newMetrics.connectionSpeed = connection.effectiveType;
          }

          setMetrics(newMetrics);
          setIsLoading(false);

          // Enviar métricas para analytics
          if (pageName) {
            analyticsService.trackPerformance(`page_load_${pageName}`, loadTime);
            analyticsService.trackPerformance(`render_time_${pageName}`, renderTime);
          }
        }
      }
    };

    // Aguardar o carregamento completo
    if (document.readyState === 'complete') {
      measurePageLoad();
    } else {
      window.addEventListener('load', measurePageLoad);
      return () => window.removeEventListener('load', measurePageLoad);
    }
  }, [pageName]);

  // Medir tempo de interação
  const measureInteraction = useCallback((actionName: string) => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      setMetrics(prev => prev ? {
        ...prev,
        interactionTime: duration
      } : null);

      if (pageName) {
        analyticsService.trackPerformance(`interaction_${actionName}_${pageName}`, duration);
      }
    };
  }, [pageName]);

  return {
    metrics,
    isLoading,
    measureInteraction
  };
};

// Hook para medir performance de componentes específicos
export const useComponentPerformance = (componentName: string) => {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef<number>(0);
  const [averageRenderTime, setAverageRenderTime] = useState<number>(0);

  useEffect(() => {
    const startTime = performance.now();
    renderCountRef.current += 1;

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Calcular média de tempo de renderização
      const currentAverage = lastRenderTimeRef.current;
      const newAverage = (currentAverage * (renderCountRef.current - 1) + renderTime) / renderCountRef.current;
      
      lastRenderTimeRef.current = newAverage;
      setAverageRenderTime(newAverage);

      // Reportar se o tempo de renderização for muito alto
      if (renderTime > 16) { // Mais de 16ms pode causar jank
        analyticsService.trackPerformance(`slow_render_${componentName}`, renderTime);
      }
    };
  });

  return {
    renderCount: renderCountRef.current,
    averageRenderTime
  };
};

// Hook para monitorar Web Vitals
export const useWebVitals = () => {
  const [vitals, setVitals] = useState<{
    CLS?: number;
    FID?: number;
    FCP?: number;
    LCP?: number;
    TTFB?: number;
  }>({});

  useEffect(() => {
    // Função para capturar métricas Web Vitals
    const captureVitals = () => {
      if (typeof window !== 'undefined' && 'performance' in window) {
        // First Contentful Paint (FCP)
        const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
        if (fcpEntry) {
          setVitals(prev => ({ ...prev, FCP: fcpEntry.startTime }));
          analyticsService.trackPerformance('FCP', fcpEntry.startTime);
        }

        // Largest Contentful Paint (LCP)
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            setVitals(prev => ({ ...prev, LCP: lastEntry.startTime }));
            analyticsService.trackPerformance('LCP', lastEntry.startTime);
          }
        });
        
        try {
          observer.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {
          // Navegador não suporta LCP
        }

        // Time to First Byte (TTFB)
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          const ttfb = navigation.responseStart - navigation.requestStart;
          setVitals(prev => ({ ...prev, TTFB: ttfb }));
          analyticsService.trackPerformance('TTFB', ttfb);
        }

        return () => {
          observer.disconnect();
        };
      }
    };

    captureVitals();
  }, []);

  return vitals;
};

// Hook para monitorar uso de memória
export const useMemoryMonitor = () => {
  const [memoryInfo, setMemoryInfo] = useState<{
    used: number;
    total: number;
    percentage: number;
  } | null>(null);

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const used = memory.usedJSHeapSize;
        const total = memory.totalJSHeapSize;
        const percentage = (used / total) * 100;

        setMemoryInfo({ used, total, percentage });

        // Alertar se o uso de memória estiver muito alto
        if (percentage > 80) {
          analyticsService.trackEvent({
            action: 'high_memory_usage',
            category: 'performance',
            value: percentage,
            customData: { used, total }
          });
        }
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 30000); // A cada 30 segundos

    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
};

// Hook para medir performance de API calls
export const useApiPerformance = () => {
  const measureApiCall = useCallback((url: string, method: string = 'GET') => {
    const startTime = performance.now();
    
    return {
      end: (success: boolean, statusCode?: number) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        analyticsService.trackEvent({
          action: 'api_call',
          category: 'performance',
          label: `${method} ${url}`,
          value: duration,
          customData: {
            success,
            statusCode,
            method,
            url: url.replace(/\/\d+/g, '/:id') // Remover IDs específicos da URL
          }
        });

        // Alertar para chamadas muito lentas
        if (duration > 5000) { // Mais de 5 segundos
          analyticsService.trackEvent({
            action: 'slow_api_call',
            category: 'performance',
            label: `${method} ${url}`,
            value: duration
          });
        }
      }
    };
  }, []);

  return { measureApiCall };
};

// Hook para detectar dispositivos com performance limitada
export const useDevicePerformance = () => {
  const [deviceInfo, setDeviceInfo] = useState<{
    isLowEnd: boolean;
    cores: number;
    memory: number;
    connection: string;
  } | null>(null);

  useEffect(() => {
    const detectDevicePerformance = () => {
      let isLowEnd = false;
      let cores = navigator.hardwareConcurrency || 1;
      let memory = 0;
      let connection = 'unknown';

      // Verificar memória do dispositivo
      if ('deviceMemory' in navigator) {
        memory = (navigator as any).deviceMemory;
        if (memory <= 2) isLowEnd = true;
      }

      // Verificar número de cores
      if (cores <= 2) isLowEnd = true;

      // Verificar tipo de conexão
      const conn = (navigator as any).connection;
      if (conn) {
        connection = conn.effectiveType;
        if (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g') {
          isLowEnd = true;
        }
      }

      setDeviceInfo({ isLowEnd, cores, memory, connection });

      // Reportar informações do dispositivo
      analyticsService.trackEvent({
        action: 'device_performance_detected',
        category: 'device',
        customData: { isLowEnd, cores, memory, connection }
      });
    };

    detectDevicePerformance();
  }, []);

  return deviceInfo;
};