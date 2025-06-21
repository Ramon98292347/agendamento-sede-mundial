import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { webhookService } from '@/services/webhookService';

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
}

export const useAgendamentos = () => {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

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
      const { data, error } = await supabase
        .from('agendamentos')
        .insert(agendamentoData)
        .select()
        .single();

      if (error) throw error;
      
      setAgendamentos(prev => [data, ...prev]);
      
      // Enviar webhook para criação
      await webhookService.sendToWebhook(data, 'create');
      
      // Alerta maior e mais visível
      toast.success('🎉 Agendamento criado com sucesso!', {
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
      const { data, error } = await supabase
        .from('agendamentos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setAgendamentos(prev => prev.map(a => a.id === id ? data : a));
      
      // Determinar o tipo de ação para o webhook
      const action = updates.status ? 'status_change' : 'update';
      
      // Enviar webhook para atualização
      await webhookService.sendToWebhook(data, action);
      
      return data;
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
      toast.error('Erro ao atualizar agendamento');
      throw error;
    }
  };

  const deleteAgendamento = async (id: string) => {
    try {
      // Buscar o agendamento antes de excluir para enviar no webhook
      const agendamentoToDelete = agendamentos.find(a => a.id === id);
      
      const { error } = await supabase
        .from('agendamentos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setAgendamentos(prev => prev.filter(a => a.id !== id));
      
      // Enviar webhook para exclusão
      if (agendamentoToDelete) {
        await webhookService.sendToWebhook(agendamentoToDelete, 'delete');
      }
      
      toast.success('Agendamento excluído com sucesso!');
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
