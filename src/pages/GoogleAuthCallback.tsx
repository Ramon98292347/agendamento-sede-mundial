import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

export function GoogleAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleAuthCallback } = useGoogleCalendar();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      console.log('Callback recebido:', { code: !!code, state: !!state, error });

      if (error) {
        const errorMsg = errorDescription || error;
        console.error('Erro OAuth recebido:', errorMsg);
        setStatus('error');
        setErrorMessage(`Erro na autenticação: ${errorMsg}`);
        return;
      }

      if (!code) {
        console.error('Código de autorização não encontrado na URL');
        setStatus('error');
        setErrorMessage('Código de autorização não encontrado');
        return;
      }

      try {
        await handleAuthCallback(code, state || undefined);
        setStatus('success');
        
        // Redirecionar após 2 segundos
        setTimeout(() => {
          navigate('/configuracoes');
        }, 2000);
      } catch (error) {
        console.error('Erro no callback:', error);
        setStatus('error');
        setErrorMessage('Falha na autenticação com Google Calendar');
      }
    };

    processCallback();
  }, [searchParams, handleAuthCallback, navigate]);

  const handleGoBack = () => {
    navigate('/configuracoes');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'loading' && (
              <>
                <LoadingSpinner className="h-5 w-5" />
                Processando...
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Sucesso!
              </>
            )}
            {status === 'error' && (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                Erro
              </>
            )}
          </CardTitle>
          
          <CardDescription>
            {status === 'loading' && 'Configurando integração com Google Calendar...'}
            {status === 'success' && 'Google Calendar conectado com sucesso!'}
            {status === 'error' && 'Falha na conexão com Google Calendar'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="text-center text-sm text-muted-foreground">
              <p>Aguarde enquanto processamos sua autorização...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-3">
              <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✅ Integração configurada com sucesso!
                </p>
                <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                  Os agendamentos agora serão sincronizados automaticamente.
                </p>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Redirecionando para configurações...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                  ❌ Falha na autenticação
                </p>
                <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                  {errorMessage}
                </p>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Possíveis soluções:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Verifique se você autorizou o acesso ao Google Calendar</li>
                  <li>Certifique-se de que está usando a conta correta</li>
                  <li>Tente novamente em alguns minutos</li>
                </ul>
              </div>
            </div>
          )}

          {(status === 'error' || status === 'success') && (
            <Button 
              onClick={handleGoBack}
              className="w-full"
              variant={status === 'error' ? 'outline' : 'default'}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {status === 'error' ? 'Tentar Novamente' : 'Ir para Configurações'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default GoogleAuthCallback;