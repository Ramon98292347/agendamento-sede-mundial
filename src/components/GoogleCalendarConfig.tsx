import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Calendar, CheckCircle, XCircle, Settings } from 'lucide-react';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import { LoadingSpinner } from './LoadingSpinner';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Calendar, CheckCircle, XCircle, Settings } from 'lucide-react';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import { LoadingSpinner } from './LoadingSpinner';

interface GoogleCalendarConfigProps {
  className?: string;
}

export function GoogleCalendarConfig({ className }: GoogleCalendarConfigProps) {
  const {
    isConnected,
    isLoading,
    connect,
    disconnect
  } = useGoogleCalendar();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Integração Google Calendar
        </CardTitle>
        <CardDescription>
          Sincronize automaticamente os agendamentos com seu Google Calendar
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status da Conexão */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            
            <div>
              <p className="font-medium">
                {isConnected ? 'Conectado' : 'Não Conectado'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isConnected 
                  ? 'Os agendamentos serão sincronizados automaticamente'
                  : 'Conecte para sincronizar agendamentos'
                }
              </p>
            </div>
          </div>
          
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {isConnected ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>

        {/* Funcionalidades */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Funcionalidades
          </h4>
          
          <div className="grid gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              Criação automática de eventos
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              Atualização de agendamentos
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              Remoção de eventos cancelados
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              Notificações por email
            </div>
          </div>
        </div>

        {/* Informações Importantes */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            ℹ️ Informações Importantes
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Os eventos são criados no seu calendário principal</li>
            <li>• Duração padrão: 1 hora por agendamento</li>
            <li>• Convites são enviados automaticamente por email</li>
            <li>• Fuso horário: América/São Paulo</li>
          </ul>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-2 pt-4">
          {isConnected ? (
            <Button 
              onClick={disconnect}
              variant="outline"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <LoadingSpinner className="mr-2" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Desconectar
            </Button>
          ) : (
            <Button 
              onClick={connect}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <LoadingSpinner className="mr-2" />
              ) : (
                <Calendar className="mr-2 h-4 w-4" />
              )}
              Conectar Google Calendar
            </Button>
          )}
        </div>

        {/* Ajuda */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p>
            <strong>Problemas de conexão?</strong> Verifique se você tem permissões 
            para acessar o Google Calendar e se as configurações de OAuth estão corretas.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default GoogleCalendarConfig;