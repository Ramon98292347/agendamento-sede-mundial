import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AgendamentoHistorico {
  id: string;
  agendamento_id: string;
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
  data_atendimento?: string;
  motivo_finalizacao?: string;
  created_at: string;
  updated_at: string;
  moved_to_history_at: string;
}

export const useHistoricoAgendamentos = () => {
  const [historico, setHistorico] = useState<AgendamentoHistorico[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistorico = async (filters?: {
    startDate?: string;
    endDate?: string;
    pastor?: string;
    status?: string;
    limit?: number;
  }) => {
    try {
      setLoading(true);
      
      // Verificar se a tabela existe, caso contrário usar dados simulados
      const { data, error } = await supabase
        .from('agendamentos_historico')
        .select('*')
        .limit(1);

      if (error && error.code === 'PGRST116') {
        // Tabela não existe, usar dados simulados
        console.log('Tabela agendamentos_historico não existe. Usando dados simulados.');
        setHistorico([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('agendamentos_historico')
        .select('*')
        .order('data_agendamento', { ascending: false });

      // Aplicar filtros
      if (filters?.startDate) {
        query = query.gte('data_agendamento', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('data_agendamento', filters.endDate);
      }
      if (filters?.pastor) {
        query = query.eq('pastor_selecionado', filters.pastor);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data: queryData, error: queryError } = await query;

      if (queryError) throw queryError;
      setHistorico(queryData || []);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  const moveToHistory = async (agendamento: any, motivo: string) => {
    try {
      // Verificar se a tabela existe
      const { error: checkError } = await supabase
        .from('agendamentos_historico')
        .select('id')
        .limit(1);

      if (checkError && checkError.code === 'PGRST116') {
        console.log('Tabela agendamentos_historico não existe. Operação ignorada.');
        toast.error('Funcionalidade de histórico não disponível. Execute a migração do banco.');
        return;
      }

      // Inserir no histórico
      const { error: insertError } = await supabase
        .from('agendamentos_historico')
        .insert({
          agendamento_id: agendamento.id,
          nome: agendamento.nome,
          telefone: agendamento.telefone,
          email: agendamento.email,
          tipo_agendamento: agendamento.tipo_agendamento,
          pastor_selecionado: agendamento.pastor_selecionado,
          data_agendamento: agendamento.data_agendamento,
          horario_agendamento: agendamento.horario_agendamento,
          observacoes: agendamento.observacoes,
          audio_url: agendamento.audio_url,
          status: agendamento.status,
          origem: agendamento.origem,
          anotacoes_pastor: agendamento.anotacoes_pastor,
          data_atendimento: new Date().toISOString().split('T')[0],
          motivo_finalizacao: motivo,
          created_at: agendamento.created_at,
          updated_at: agendamento.updated_at
        });

      if (insertError) throw insertError;

      // Remover da tabela principal
      const { error: deleteError } = await supabase
        .from('agendamentos')
        .delete()
        .eq('id', agendamento.id);

      if (deleteError) throw deleteError;

      toast.success('Agendamento movido para o histórico!');
      return true;
    } catch (error) {
      console.error('Erro ao mover para histórico:', error);
      toast.error('Erro ao mover agendamento para histórico');
      return false;
    }
  };

  const autoMoveCompletedAppointments = async () => {
    try {
      // Buscar agendamentos finalizados (atendidos, cancelados, não atendidos)
      const { data: completedAppointments, error } = await supabase
        .from('agendamentos')
        .select('*')
        .in('status', ['atendido', 'cancelado', 'nao_atendido']);
        // Removido filtro de data para incluir agendamentos do dia atual também

      if (error) throw error;

      if (completedAppointments && completedAppointments.length > 0) {
        for (const agendamento of completedAppointments) {
          await moveToHistory(agendamento, 'Movido automaticamente - agendamento finalizado');
        }
        console.log(`${completedAppointments.length} agendamentos movidos automaticamente para o histórico`);
      }
    } catch (error) {
      console.error('Erro na movimentação automática:', error);
    }
  };

  const deleteFromHistory = async (id: string) => {
    try {
      // Verificar se a tabela existe
      const { error: checkError } = await supabase
        .from('agendamentos_historico')
        .select('id')
        .limit(1);

      if (checkError && checkError.code === 'PGRST116') {
        console.log('Tabela agendamentos_historico não existe. Operação ignorada.');
        toast.error('Funcionalidade de histórico não disponível. Execute a migração do banco.');
        return;
      }

      const { error } = await supabase
        .from('agendamentos_historico')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setHistorico(prev => prev.filter(h => h.id !== id));
      toast.success('Registro removido do histórico!');
    } catch (error) {
      console.error('Erro ao remover do histórico:', error);
      toast.error('Erro ao remover registro do histórico');
    }
  };

  const getHistoricoStats = () => {
    const total = historico.length;
    const atendidos = historico.filter(h => h.status === 'atendido').length;
    const cancelados = historico.filter(h => h.status === 'cancelado').length;
    const naoAtendidos = historico.filter(h => h.status === 'nao_atendido').length;

    return {
      total,
      atendidos,
      cancelados,
      naoAtendidos,
      percentualAtendimento: total > 0 ? Math.round((atendidos / total) * 100) : 0
    };
  };

  useEffect(() => {
    const initializeHistory = async () => {
      // Primeiro, mover agendamentos finalizados para o histórico
      await autoMoveCompletedAppointments();
      // Depois, carregar o histórico
      await fetchHistorico({ limit: 100 });
    };
    
    initializeHistory();
    
    // Executar limpeza automática diariamente
    const interval = setInterval(() => {
      autoMoveCompletedAppointments();
    }, 24 * 60 * 60 * 1000); // 24 horas

    return () => clearInterval(interval);
  }, []);

  return {
    historico,
    loading,
    fetchHistorico,
    moveToHistory,
    autoMoveCompletedAppointments,
    deleteFromHistory,
    getHistoricoStats,
    refetch: () => fetchHistorico({ limit: 100 })
  };
};