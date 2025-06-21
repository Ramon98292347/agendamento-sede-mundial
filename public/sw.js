// Service Worker para PWA - Igreja Pentecostal Deus é Amor
// Versão: 1.0.0

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { Queue } from 'workbox-background-sync';

// Configurações
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAMES = {
  static: `static-${CACHE_VERSION}`,
  dynamic: `dynamic-${CACHE_VERSION}`,
  api: `api-${CACHE_VERSION}`,
  images: `images-${CACHE_VERSION}`,
  fonts: `fonts-${CACHE_VERSION}`
};

const OFFLINE_PAGE = '/offline.html';
const FALLBACK_IMAGE = '/images/fallback.svg';

// Precache de arquivos estáticos
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Queue para sincronização em background
const bgSyncQueue = new Queue('api-queue', {
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request);
        console.log('Requisição sincronizada:', entry.request.url);
      } catch (error) {
        console.error('Erro na sincronização:', error);
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  }
});

// Plugin de sincronização em background
const bgSyncPlugin = new BackgroundSyncPlugin('api-queue', {
  maxRetentionTime: 24 * 60 // 24 horas
});

// Estratégias de cache

// 1. Cache First para recursos estáticos
registerRoute(
  ({ request }) => 
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'worker',
  new CacheFirst({
    cacheName: CACHE_NAMES.static,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
        purgeOnQuotaError: true
      })
    ]
  })
);

// 2. Stale While Revalidate para páginas HTML
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new StaleWhileRevalidate({
    cacheName: CACHE_NAMES.dynamic,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 dias
        purgeOnQuotaError: true
      })
    ]
  })
);

// 3. Cache First para imagens
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: CACHE_NAMES.images,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
        purgeOnQuotaError: true
      })
    ]
  })
);

// 4. Cache First para fontes
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: CACHE_NAMES.fonts,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 ano
        purgeOnQuotaError: true
      })
    ]
  })
);

// 5. Network First para APIs com fallback para cache
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: CACHE_NAMES.api,
    networkTimeoutSeconds: 10,
    plugins: [
      bgSyncPlugin,
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 24 * 60 * 60, // 24 horas
        purgeOnQuotaError: true
      })
    ]
  })
);

// Fallback para páginas offline
registerRoute(
  ({ request }) => request.mode === 'navigate',
  async ({ event }) => {
    try {
      return await new StaleWhileRevalidate({
        cacheName: CACHE_NAMES.dynamic
      }).handle({ event, request: event.request });
    } catch (error) {
      return caches.match(OFFLINE_PAGE);
    }
  }
);

// Fallback para imagens
registerRoute(
  ({ request }) => request.destination === 'image',
  async ({ event }) => {
    try {
      return await new CacheFirst({
        cacheName: CACHE_NAMES.images
      }).handle({ event, request: event.request });
    } catch (error) {
      return caches.match(FALLBACK_IMAGE);
    }
  }
);

// Event Listeners

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker instalando...');
  
  event.waitUntil(
    (async () => {
      // Cache da página offline
      const cache = await caches.open(CACHE_NAMES.dynamic);
      await cache.add(OFFLINE_PAGE);
      
      // Cache da imagem fallback
      const imageCache = await caches.open(CACHE_NAMES.images);
      await imageCache.add(FALLBACK_IMAGE);
      
      console.log('Service Worker instalado com sucesso!');
    })()
  );
  
  // Força a ativação imediata
  self.skipWaiting();
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker ativando...');
  
  event.waitUntil(
    (async () => {
      // Limpar caches antigos
      const cacheNames = await caches.keys();
      const validCacheNames = Object.values(CACHE_NAMES);
      
      await Promise.all(
        cacheNames.map(cacheName => {
          if (!validCacheNames.includes(cacheName)) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
      
      console.log('Service Worker ativado com sucesso!');
    })()
  );
  
  // Assume controle imediato
  self.clients.claim();
});

// Sincronização em background
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(bgSyncQueue.replayRequests());
  }
  
  if (event.tag === 'appointment-sync') {
    event.waitUntil(syncAppointments());
  }
});

// Sincronização periódica
self.addEventListener('periodicsync', (event) => {
  console.log('Periodic sync:', event.tag);
  
  if (event.tag === 'periodic-sync') {
    event.waitUntil(performPeriodicSync());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('Push recebido:', event);
  
  const options = {
    body: 'Você tem uma nova notificação!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver Detalhes',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/icons/xmark.png'
      }
    ]
  };
  
  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
    options.data = { ...options.data, ...data };
  }
  
  event.waitUntil(
    self.registration.showNotification('Igreja Pentecostal Deus é Amor', options)
  );
});

// Clique em notificação
self.addEventListener('notificationclick', (event) => {
  console.log('Notificação clicada:', event);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/agendamento')
    );
  } else if (event.action === 'close') {
    // Apenas fecha a notificação
  } else {
    // Clique na notificação (não em uma ação)
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Mensagens do cliente
self.addEventListener('message', (event) => {
  console.log('Mensagem recebida:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches());
  }
});

// Funções auxiliares

// Sincronizar agendamentos
async function syncAppointments() {
  try {
    console.log('Sincronizando agendamentos...');
    
    // Obter dados pendentes do IndexedDB ou localStorage
    const pendingData = await getPendingAppointments();
    
    if (pendingData.length > 0) {
      for (const appointment of pendingData) {
        try {
          const response = await fetch('/api/agendamentos', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(appointment)
          });
          
          if (response.ok) {
            await removePendingAppointment(appointment.id);
            console.log('Agendamento sincronizado:', appointment.id);
          }
        } catch (error) {
          console.error('Erro ao sincronizar agendamento:', error);
        }
      }
    }
    
    console.log('Sincronização de agendamentos concluída');
  } catch (error) {
    console.error('Erro na sincronização de agendamentos:', error);
  }
}

// Sincronização periódica
async function performPeriodicSync() {
  try {
    console.log('Executando sincronização periódica...');
    
    // Verificar atualizações
    await checkForUpdates();
    
    // Limpar cache expirado
    await cleanExpiredCache();
    
    // Sincronizar dados pendentes
    await syncAppointments();
    
    console.log('Sincronização periódica concluída');
  } catch (error) {
    console.error('Erro na sincronização periódica:', error);
  }
}

// Verificar atualizações
async function checkForUpdates() {
  try {
    const response = await fetch('/api/version');
    if (response.ok) {
      const { version } = await response.json();
      if (version !== CACHE_VERSION) {
        console.log('Nova versão disponível:', version);
        // Notificar cliente sobre atualização
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'UPDATE_AVAILABLE',
            version
          });
        });
      }
    }
  } catch (error) {
    console.error('Erro ao verificar atualizações:', error);
  }
}

// Limpar cache expirado
async function cleanExpiredCache() {
  try {
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const dateHeader = response.headers.get('date');
          if (dateHeader) {
            const responseDate = new Date(dateHeader);
            const now = new Date();
            const daysDiff = (now.getTime() - responseDate.getTime()) / (1000 * 60 * 60 * 24);
            
            // Remover se mais antigo que 30 dias
            if (daysDiff > 30) {
              await cache.delete(request);
              console.log('Cache expirado removido:', request.url);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Erro ao limpar cache expirado:', error);
  }
}

// Limpar todos os caches
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('Todos os caches foram limpos');
  } catch (error) {
    console.error('Erro ao limpar caches:', error);
  }
}

// Obter agendamentos pendentes (mock - implementar com IndexedDB)
async function getPendingAppointments() {
  // Implementar lógica para obter dados pendentes
  return [];
}

// Remover agendamento pendente (mock - implementar com IndexedDB)
async function removePendingAppointment(id) {
  // Implementar lógica para remover dados pendentes
  console.log('Removendo agendamento pendente:', id);
}

// Log de erros
self.addEventListener('error', (event) => {
  console.error('Erro no Service Worker:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Promise rejeitada no Service Worker:', event.reason);
});

console.log('Service Worker carregado - Versão:', CACHE_VERSION);