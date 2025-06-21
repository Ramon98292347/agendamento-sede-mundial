import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePWA } from '../services/pwaService';
import { useToast } from './Toast';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';

// Componente principal do PWA Manager
export const PWAManager: React.FC = () => {
  const pwa = usePWA();
  const { showToast } = useToast();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [storageInfo, setStorageInfo] = useState<any>(null);

  useEffect(() => {
    // Mostrar prompt de instalação se disponível
    if (pwa.canInstall && !pwa.isInstalled) {
      setShowInstallPrompt(true);
    }

    // Mostrar prompt de atualização se disponível
    if (pwa.updateAvailable) {
      setShowUpdatePrompt(true);
    }

    // Obter informações de armazenamento
    pwa.getStorageInfo().then(setStorageInfo);
  }, [pwa.canInstall, pwa.isInstalled, pwa.updateAvailable]);

  const handleInstall = async () => {
    try {
      const installed = await pwa.showInstallPrompt();
      if (installed) {
        setShowInstallPrompt(false);
        showToast('success', 'App instalado com sucesso!');
      }
    } catch (error) {
      showToast('error', 'Erro ao instalar o app');
    }
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await pwa.applyUpdate();
      showToast('success', 'App atualizado! Recarregando...');
      setShowUpdatePrompt(false);
    } catch (error) {
      showToast('error', 'Erro ao atualizar o app');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleShare = async () => {
    try {
      const shared = await pwa.share({
        title: 'Igreja Pentecostal Deus é Amor',
        text: 'Agende sua consulta com nossos pastores',
        url: window.location.origin
      });
      
      if (shared) {
        showToast('success', 'Compartilhado com sucesso!');
      }
    } catch (error) {
      showToast('error', 'Erro ao compartilhar');
    }
  };

  return (
    <>
      {/* Prompt de Instalação */}
      <InstallPrompt 
        show={showInstallPrompt}
        onInstall={handleInstall}
        onDismiss={() => setShowInstallPrompt(false)}
      />

      {/* Prompt de Atualização */}
      <UpdatePrompt 
        show={showUpdatePrompt}
        onUpdate={handleUpdate}
        onDismiss={() => setShowUpdatePrompt(false)}
        isUpdating={isUpdating}
      />

      {/* Status do PWA */}
      <PWAStatus 
        pwa={pwa}
        storageInfo={storageInfo}
        onShare={handleShare}
      />
    </>
  );
};

// Componente de prompt de instalação
interface InstallPromptProps {
  show: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

const InstallPrompt: React.FC<InstallPromptProps> = ({ show, onInstall, onDismiss }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96"
        >
          <Card className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">
                  Instalar App
                </h3>
                <p className="text-sm opacity-90 mb-3">
                  Instale nosso app para uma experiência melhor, notificações e acesso offline.
                </p>
                
                <div className="flex gap-2">
                  <Button
                    onClick={onInstall}
                    size="sm"
                    className="bg-white text-blue-600 hover:bg-gray-100"
                  >
                    Instalar
                  </Button>
                  <Button
                    onClick={onDismiss}
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                  >
                    Agora não
                  </Button>
                </div>
              </div>
              
              <button
                onClick={onDismiss}
                className="flex-shrink-0 p-1 hover:bg-white/20 rounded"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Componente de prompt de atualização
interface UpdatePromptProps {
  show: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
  isUpdating: boolean;
}

const UpdatePrompt: React.FC<UpdatePromptProps> = ({ show, onUpdate, onDismiss, isUpdating }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <Card className="w-full max-w-md p-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              
              <h3 className="text-xl font-semibold mb-2">
                Atualização Disponível
              </h3>
              
              <p className="text-gray-600 mb-6">
                Uma nova versão do aplicativo está disponível com melhorias e correções.
              </p>
              
              {isUpdating && (
                <div className="mb-4">
                  <Progress value={undefined} className="w-full" />
                  <p className="text-sm text-gray-500 mt-2">Atualizando...</p>
                </div>
              )}
              
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={onUpdate}
                  disabled={isUpdating}
                  className="flex-1"
                >
                  {isUpdating ? 'Atualizando...' : 'Atualizar Agora'}
                </Button>
                <Button
                  onClick={onDismiss}
                  variant="outline"
                  disabled={isUpdating}
                >
                  Depois
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Componente de status do PWA
interface PWAStatusProps {
  pwa: any;
  storageInfo: any;
  onShare: () => void;
}

const PWAStatus: React.FC<PWAStatusProps> = ({ pwa, storageInfo, onShare }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!showDetails) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <Button
          onClick={() => setShowDetails(true)}
          size="sm"
          variant="outline"
          className="bg-white/90 backdrop-blur-sm"
        >
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
          PWA
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed bottom-4 right-4 z-40 w-80"
    >
      <Card className="p-4 bg-white/95 backdrop-blur-sm border shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">Status PWA</h3>
          <button
            onClick={() => setShowDetails(false)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        
        <div className="space-y-3">
          {/* Status de Instalação */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Instalado:</span>
            <Badge variant={pwa.isInstalled ? 'success' : 'secondary'}>
              {pwa.isInstalled ? 'Sim' : 'Não'}
            </Badge>
          </div>
          
          {/* Status de Conexão */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Conexão:</span>
            <Badge variant={pwa.isOnline ? 'success' : 'destructive'}>
              {pwa.isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
          
          {/* Capacidades */}
          <div>
            <span className="text-sm font-medium mb-2 block">Capacidades:</span>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {Object.entries(pwa.capabilities).map(([key, value]) => (
                <div key={key} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    value ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  <span className="capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Armazenamento */}
          {storageInfo && (
            <div>
              <span className="text-sm font-medium mb-2 block">Armazenamento:</span>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Usado:</span>
                  <span>{(storageInfo.usage / 1024 / 1024).toFixed(1)} MB</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Disponível:</span>
                  <span>{(storageInfo.available / 1024 / 1024).toFixed(1)} MB</span>
                </div>
                <Progress value={storageInfo.percentage} className="h-2" />
              </div>
            </div>
          )}
          
          {/* Ações */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={onShare}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
              </svg>
              Compartilhar
            </Button>
            
            {pwa.canInstall && (
              <Button
                onClick={() => pwa.showInstallPrompt()}
                size="sm"
                className="flex-1"
              >
                Instalar
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

// Componente de indicador de conexão simples
export const ConnectionIndicator: React.FC = () => {
  const { isOnline } = usePWA();
  
  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-center py-2 text-sm font-medium"
        >
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Você está offline
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Hook para usar PWA em componentes
export const usePWAManager = () => {
  const pwa = usePWA();
  const [installPromptShown, setInstallPromptShown] = useState(false);
  
  const showInstallPrompt = () => {
    if (pwa.canInstall && !installPromptShown) {
      setInstallPromptShown(true);
      return pwa.showInstallPrompt();
    }
    return Promise.resolve(false);
  };
  
  return {
    ...pwa,
    showInstallPrompt,
    installPromptShown
  };
};

export default PWAManager;