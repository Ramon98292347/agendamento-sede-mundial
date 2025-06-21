import { useState, useEffect, useCallback } from 'react';
import googleCalendarService, { AgendamentoData } from '../services/googleCalendarService';
import { useToast } from './use-toast';

interface GoogleCalendarTokens {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date?: number;
}

interface UseGoogleCalendarReturn {
  isConnected: boolean;
  isLoading: boolean;
  connect: () => void;
  disconnect: () => void;
  createCalendarEvent: (agendamento: AgendamentoData) => Promise<string | null>;
  updateCalendarEvent: (eventId: string, agendamento: AgendamentoData) => Promise<void>;
  deleteCalendarEvent: (eventId: string) => Promise<void>;
  handleAuthCallback: (code: string) => Promise<void>;
}

const STORAGE_KEY = 'google_calendar_tokens';

export function useGoogleCalendar(): UseGoogleCalendarReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Verificar se já está conectado ao carregar
  useEffect(() => {
    const checkConnection = () => {
      try {
        // Verificar se está autenticado usando o serviço
        const isAuth = googleCalendarService.isAuthenticated();
        setIsConnected(isAuth);
      } catch (error) {
        console.error('Erro ao verificar conexão:', error);
        disconnect();
      }
    };

    checkConnection();
  }, []);

  // O refreshToken é gerenciado internamente pelo serviço

  // Conectar ao Google Calendar
  const connect = useCallback(() => {
    try {
      const authUrl = googleCalendarService.generateAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Erro ao conectar:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao conectar com Google Calendar',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // Desconectar do Google Calendar
  const disconnect = useCallback(() => {
    try {
      googleCalendarService.clearToken();
      setIsConnected(false);
      toast({
        title: 'Sucesso',
        description: 'Desconectado do Google Calendar',
      });
    } catch (error) {
      console.error('Erro ao desconectar:', error);
    }
  }, [toast]);

  // Lidar com callback de autenticação
  const handleAuthCallback = useCallback(async (code: string) => {
    setIsLoading(true);
    try {
      const tokens = await googleCalendarService.getTokenFromCode(code);
      // O token já é salvo internamente pelo serviço
      setIsConnected(true);
      
      toast({
        title: 'Sucesso',
        description: 'Conectado ao Google Calendar com sucesso!',
      });
    } catch (error) {
      console.error('Erro no callback de autenticação:', error);
      toast({
        title: 'Erro',
        description: 'Falha na autenticação com Google Calendar',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Criar evento no calendário
  const createCalendarEvent = useCallback(async (agendamento: AgendamentoData): Promise<string | null> => {
    if (!isConnected) {
      toast({
        title: 'Aviso',
        description: 'Google Calendar não está conectado',
        variant: 'destructive'
      });
      return null;
    }

    try {
      // Converter para o formato de evento do Calendar
      const calendarEvent = googleCalendarService.convertToCalendarEvent(agendamento);
      
      // Criar o evento
      const eventId = await googleCalendarService.createEvent(calendarEvent);
      
      toast({
        title: 'Sucesso',
        description: 'Evento criado no Google Calendar',
      });
      
      return eventId;
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      
      toast({
        title: 'Erro',
        description: 'Falha ao criar evento no Google Calendar',
        variant: 'destructive'
      });
      
      return null;
    }
  }, [isConnected, toast]);

  // Atualizar evento no calendário
  const updateCalendarEvent = useCallback(async (eventId: string, agendamento: AgendamentoData) => {
    if (!isConnected) {
      toast({
        title: 'Aviso',
        description: 'Google Calendar não está conectado',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Converter para o formato de evento do Calendar
      const calendarEvent = googleCalendarService.convertToCalendarEvent(agendamento);
      
      // Atualizar o evento
      await googleCalendarService.updateEvent(eventId, calendarEvent);
      
      toast({
        title: 'Sucesso',
        description: 'Evento atualizado no Google Calendar',
      });
    } catch (error) {
      console.error('Erro ao atualizar evento:', error);
      
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar evento no Google Calendar',
        variant: 'destructive'
      });
    }
  }, [isConnected, toast]);

  // Deletar evento do calendário
  const deleteCalendarEvent = useCallback(async (eventId: string) => {
    if (!isConnected) {
      return;
    }

    try {
      await googleCalendarService.deleteEvent(eventId);
      
      toast({
        title: 'Sucesso',
        description: 'Evento removido do Google Calendar',
      });
    } catch (error) {
      console.error('Erro ao deletar evento:', error);
      
      toast({
        title: 'Erro',
        description: 'Falha ao remover evento do Google Calendar',
        variant: 'destructive'
      });
    }
  }, [isConnected, toast]);

  return {
    isConnected,
    isLoading,
    connect,
    disconnect,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    handleAuthCallback
  };
}