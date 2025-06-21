
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EscalaPastor {
  id: string;
  data_disponivel: string;
  horario_inicio: string;
  horario_fim: string;
  pastor_id: string;
  intervalo_minutos?: number;
}

export interface AgendamentoExistente {
  data_agendamento: string;
  horario_agendamento: string;
}

export const useEscalasPastor = (pastorNome: string) => {
  const [escalas, setEscalas] = useState<EscalaPastor[]>([]);
  const [agendamentosExistentes, setAgendamentosExistentes] = useState<AgendamentoExistente[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEscalasPastor = async () => {
    if (!pastorNome) {
      setEscalas([]);
      setAgendamentosExistentes([]);
      return;
    }

    setLoading(true);
    try {
      // Primeiro buscar o ID do pastor pelo nome
      const { data: pastorData, error: pastorError } = await supabase
        .from('pastores')
        .select('id')
        .eq('nome', pastorNome)
        .single();

      if (pastorError) throw pastorError;

      if (pastorData) {
        // Buscar as escalas do pastor
        const { data: escalasData, error: escalasError } = await supabase
          .from('escalas')
          .select('*')
          .eq('pastor_id', pastorData.id)
          .gte('data_disponivel', new Date().toISOString().split('T')[0]) // Apenas datas futuras
          .order('data_disponivel');

        if (escalasError) throw escalasError;
        
        // Buscar agendamentos existentes do pastor
        const { data: agendamentosData, error: agendamentosError } = await supabase
          .from('agendamentos')
          .select('data_agendamento, horario_agendamento')
          .eq('pastor_selecionado', pastorNome)
          .neq('status', 'cancelado')
          .gte('data_agendamento', new Date().toISOString().split('T')[0]); // Apenas datas futuras

        if (agendamentosError) throw agendamentosError;

        console.log('Agendamentos existentes para', pastorNome, ':', agendamentosData);
        
        setEscalas(escalasData || []);
        setAgendamentosExistentes(agendamentosData || []);
      }
    } catch (error) {
      console.error('Erro ao buscar escalas do pastor:', error);
      toast.error('Erro ao carregar escalas do pastor');
      setEscalas([]);
      setAgendamentosExistentes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEscalasPastor();
  }, [pastorNome]);

  return {
    escalas,
    agendamentosExistentes,
    loading
  };
};
