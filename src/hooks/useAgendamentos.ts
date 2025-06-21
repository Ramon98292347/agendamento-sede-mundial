import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useGoogleCalendar } from './useGoogleCalendar';
import { AgendamentoData } from '../services/googleCalendarService';

export interface Agendamento {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  tipo_agendamento?: string;
  pastor_selecionado?: string;
  data_agendamento?: string;
  horario_agendamento?: string;
  observacoes?: string;
  audio_url?: string;
  status: string;
  origem: string;
  anotacoes_pastor?: string;
  google_event_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AgendamentoInsert {
  nome: string;
  telefone: string;
  email?: string;
  tipo_agendamento?: string;
  pastor_selecionado?: string;
  data_agendamento?: string;
  horario_agendamento?: string;
  observacoes?: string;
  audio_url?: string;
  status?: string;
  origem?: string;
  anotacoes_pastor?: string;
  google_event_id?: string;
}

export const useAgendamentos = () => {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, isConnected } = useGoogleCalendar();

  // Converter agendamento para formato do Google Calendar
  const convertToGoogleCalendarData = (agendamento: Agendamento | AgendamentoInsert): AgendamentoData => {
    return {
      id: 'id' in agendamento ? agendamento.id : '',
      nome: agendamento.nome,
      telefone: agendamento.telefone,
      email: agendamento.email,
      data_agendamento: agendamento.data_agendamento || '',
      horario: agendamento.horario_agendamento || '',
      assunto: agendamento.observacoes || 'Consulta agendada',
      pastor: agendamento.pastor_selecionado || 'Pastor não definido',
      tipo_agendamento: agendamento.tipo_agendamento || 'Consulta'
    };
  };

  const fetchAgendamentos = async () => {
    try {
      const { data, error } = await supabase
        .from('agendamentos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgendamentos(data || []);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  };

  const addAgendamento = async (agendamentoData: AgendamentoInsert) => {
    try {
      // Criar evento no Google Calendar se conectado
      let googleEventId = null;
      if (isConnected && agendamentoData.data_agendamento && agendamentoData.horario_agendamento) {
        try {
          const calendarData = convertToGoogleCalendarData(agendamentoData);
          googleEventId = await createCalendarEvent(calendarData);
        } catch (calendarError) {
          console.warn('Erro ao criar evento no Google Calendar:', calendarError);
          // Continua mesmo se falhar no Google Calendar
        }
      }

      // Adicionar google_event_id aos dados se foi criado
      const dataToInsert = {
        ...agendamentoData,
        google_event_id: googleEventId
      };

      const { data, error } = await supabase
        .from('agendamentos')
        .insert(dataToInsert)
        .select()
        .single();

      if (error) throw error;
      
      setAgendamentos(prev => [data, ...prev]);
      
      // Alerta maior e mais visível
      const successMessage = googleEventId 
        ? '🎉 Agendamento criado e sincronizado com Google Calendar!'
        : '🎉 Agendamento criado com sucesso!';
      
      toast.success(successMessage, {
        duration: 5000,
        style: {
          backgroundColor: '#10B981',
          color: 'white',
          fontSize: '18px',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
        },
        description: `Agendamento para ${agendamentoData.nome} foi registrado no sistema.`,
      });
      
      return data;
    } catch (error) {
      console.error('Erro ao adicionar agendamento:', error);
      toast.error('Erro ao adicionar agendamento');
      throw error;
    }
  };

  const updateAgendamento = async (id: string, updates: Partial<Agendamento>) => {
    try {
      // Buscar agendamento atual para obter google_event_id
      const currentAgendamento = agendamentos.find(a => a.id === id);
      
      const { data, error } = await supabase
        .from('agendamentos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Atualizar evento no Google Calendar se conectado e existe event_id
      if (isConnected && currentAgendamento?.google_event_id) {
        try {
          const calendarData = convertToGoogleCalendarData(data);
          await updateCalendarEvent(currentAgendamento.google_event_id, calendarData);
        } catch (calendarError) {
          console.warn('Erro ao atualizar evento no Google Calendar:', calendarError);
          // Continua mesmo se falhar no Google Calendar
        }
      }
      
      setAgendamentos(prev => prev.map(a => a.id === id ? data : a));
      return data;
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
      toast.error('Erro ao atualizar agendamento');
      throw error;
    }
  };

  const deleteAgendamento = async (id: string) => {
    try {
      // Buscar agendamento para obter google_event_id antes de deletar
      const agendamentoToDelete = agendamentos.find(a => a.id === id);
      
      const { error } = await supabase
        .from('agendamentos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Deletar evento do Google Calendar se conectado e existe event_id
      if (isConnected && agendamentoToDelete?.google_event_id) {
        try {
          await deleteCalendarEvent(agendamentoToDelete.google_event_id);
        } catch (calendarError) {
          console.warn('Erro ao deletar evento no Google Calendar:', calendarError);
          // Continua mesmo se falhar no Google Calendar
        }
      }
      
      setAgendamentos(prev => prev.filter(a => a.id !== id));
      
      const successMessage = agendamentoToDelete?.google_event_id
        ? 'Agendamento excluído e removido do Google Calendar!'
        : 'Agendamento excluído com sucesso!';
      
      toast.success(successMessage);
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error);
      toast.error('Erro ao excluir agendamento');
      throw error;
    }
  };

  const checkDuplicateAgendamento = async (nome: string, telefone: string) => {
    try {
      console.log('Buscando agendamentos para:', { nome, telefone });
      
      // Buscar por nome ou telefone que contenham os termos digitados
      const { data: existingAgendamentos, error } = await supabase
        .from('agendamentos')
        .select('*')
        .or(`nome.ilike.%${nome}%,telefone.ilike.%${telefone}%`)
        .neq('status', 'cancelado')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('Agendamentos encontrados na busca:', existingAgendamentos);
      return existingAgendamentos || [];
    } catch (error) {
      console.error('Erro ao verificar agendamentos duplicados:', error);
      return [];
    }
  };

  const checkDuplicateAgendamentoSamePastor = async (nome: string, telefone: string, data: string, pastor: string) => {
    try {
      console.log('Verificando duplicatas para:', { nome, telefone, data, pastor });
      
      const { data: existingAgendamentos, error } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('nome', nome)
        .eq('telefone', telefone)
        .eq('data_agendamento', data)
        .eq('pastor_selecionado', pastor)
        .in('status', ['pendente', 'confirmado']);

      if (error) throw error;
      
      console.log('Agendamentos duplicados encontrados:', existingAgendamentos);
      return existingAgendamentos || [];
    } catch (error) {
      console.error('Erro ao verificar agendamentos duplicados com mesmo pastor:', error);
      return [];
    }
  };

  const checkExistingAgendamento = async (nome: string, telefone: string, data: string) => {
    try {
      console.log('Verificando agendamentos existentes para:', { nome, telefone, data });
      
      // Buscar agendamentos por nome na mesma data
      const { data: byName, error: errorByName } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('nome', nome)
        .eq('data_agendamento', data)
        .in('status', ['pendente', 'confirmado']);

      if (errorByName) throw errorByName;
      
      // Buscar agendamentos por telefone na mesma data
      const { data: byPhone, error: errorByPhone } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('telefone', telefone)
        .eq('data_agendamento', data)
        .in('status', ['pendente', 'confirmado']);

      if (errorByPhone) throw errorByPhone;
      
      // Combinar resultados e remover duplicatas
      const allResults = [...(byName || []), ...(byPhone || [])];
      const uniqueResults = allResults.filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id)
      );
      
      console.log('Agendamentos existentes na data:', uniqueResults);
      return uniqueResults;
    } catch (error) {
      console.error('Erro ao verificar agendamentos existentes:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchAgendamentos();
  }, []);

  return {
    agendamentos,
    loading,
    addAgendamento,
    updateAgendamento,
    deleteAgendamento,
    checkDuplicateAgendamento,
    checkDuplicateAgendamentoSamePastor,
    checkExistingAgendamento,
    refetch: fetchAgendamentos
  };
};
