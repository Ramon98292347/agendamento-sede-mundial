import React, { useState, useEffect } from 'react';
import { useOnlineStatus, useOfflineSync } from '../hooks/useOnlineStatus';
import { motion, AnimatePresence } from 'framer-motion';

interface ConnectionStatusProps {
  className?: string;
  showDetails?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  className = '',
  showDetails = false 
}) => {
  const status = useOnlineStatus();
  const { pendingSync, isSyncing } = useOfflineSync();
  const [showNotification, setShowNotification] = useState(false);
  const [lastStatus, setLastStatus] = useState(status.isOnline);

  useEffect(() => {
    if (lastStatus !== status.isOnline) {
      setShowNotification(true);
      setLastStatus(status.isOnline);
      
      // Esconder notificação após 3 segundos
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [status.isOnline, lastStatus]);

  const getConnectionIcon = () => {
    if (!status.isOnline) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
        </svg>
      );
    }

    if (status.isSlowConnection) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
          <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
        </svg>
      );
    }

    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 112 0 1 1 0 01-2 0z" clipRule="evenodd" />
      </svg>
    );
  };

  const getStatusColor = () => {
    if (!status.isOnline) return 'text-red-500';
    if (status.isSlowConnection) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusText = () => {
    if (!status.isOnline) return 'Offline';
    if (status.isSlowConnection) return 'Conexão Lenta';
    return 'Online';
  };

  const getConnectionQuality = () => {
    if (!status.isOnline) return 'Sem conexão';
    
    switch (status.effectiveType) {
      case 'slow-2g':
        return 'Muito lenta';
      case '2g':
        return 'Lenta';
      case '3g':
        return 'Moderada';
      case '4g':
        return 'Rápida';
      default:
        return 'Desconhecida';
    }
  };

  return (
    <>
      {/* Indicador principal */}
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`${getStatusColor()} flex items-center space-x-1`}>
          {getConnectionIcon()}
          {showDetails && (
            <span className="text-xs font-medium">
              {getStatusText()}
            </span>
          )}
        </div>
        
        {/* Indicador de sincronização */}
        {(isSyncing || pendingSync.length > 0) && (
          <div className="flex items-center space-x-1">
            {isSyncing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="text-blue-500"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              </motion.div>
            ) : (
              <div className="w-2 h-2 bg-orange-500 rounded-full" title={`${pendingSync.length} itens pendentes`} />
            )}
          </div>
        )}
      </div>

      {/* Notificação de mudança de status */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm"
          >
            <div className="flex items-center space-x-3">
              <div className={getStatusColor()}>
                {getConnectionIcon()}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {status.isOnline ? 'Conectado!' : 'Desconectado'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {status.isOnline 
                    ? `Qualidade: ${getConnectionQuality()}`
                    : 'Modo offline ativado'
                  }
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detalhes expandidos */}
      {showDetails && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <div>Qualidade: {getConnectionQuality()}</div>
          {status.isOnline && (
            <>
              <div>Tipo: {status.connectionType}</div>
              {status.downlink > 0 && (
                <div>Velocidade: {status.downlink} Mbps</div>
              )}
              {status.rtt > 0 && (
                <div>Latência: {status.rtt}ms</div>
              )}
            </>
          )}
          {pendingSync.length > 0 && (
            <div className="text-orange-600 dark:text-orange-400">
              {pendingSync.length} item(s) pendente(s)
            </div>
          )}
        </div>
      )}
    </>
  );
};

// Componente simplificado apenas com ícone
export const SimpleConnectionIndicator: React.FC<{ className?: string }> = ({ 
  className = '' 
}) => {
  const { isOnline, isSlowConnection } = useOnlineStatus();

  return (
    <div className={`${className} ${isOnline ? (isSlowConnection ? 'text-yellow-500' : 'text-green-500') : 'text-red-500'}`}>
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        {isOnline ? (
          <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 112 0 1 1 0 01-2 0z" clipRule="evenodd" />
        ) : (
          <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
        )}
      </svg>
    </div>
  );
};