
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ConfiguracaoSistema {
  id: string;
  horarios_funcionamento: any;
  contatos: any;
  informacoes: any;
  horarios_atendimento?: any; // Make this optional since it's not in the table
  senha_admin: string;
  created_at: string;
  updated_at: string;
}

export const useConfiguracoesSystem = () => {
  const [config, setConfig] = useState<ConfiguracaoSistema | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      // First get the system configuration
      const { data: configData, error: configError } = await supabase
        .from('configuracoes_sistema')
        .select('*')
        .limit(1)
        .single();

      if (configError) throw configError;

      // Then get the horarios_atendimento from the separate table
      const { data: horariosData, error: horariosError } = await supabase
        .from('horarios_atendimento')
        .select('*')
        .eq('ativo', true);

      if (horariosError) {
        console.error('Erro ao buscar horários de atendimento:', horariosError);
      }

      // Combine the data
      const combinedData = {
        ...configData,
        horarios_atendimento: horariosData || []
      };

      setConfig(combinedData);
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (newConfig: Partial<ConfiguracaoSistema>) => {
    try {
      // Extract horarios_atendimento from newConfig if present
      const { horarios_atendimento, ...configToUpdate } = newConfig;

      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .update(configToUpdate)
        .eq('id', config?.id)
        .select()
        .single();

      if (error) throw error;
      
      // If horarios_atendimento is being updated, handle it separately
      if (horarios_atendimento !== undefined) {
        // Delete existing horarios and insert new ones
        await supabase
          .from('horarios_atendimento')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (horarios_atendimento.length > 0) {
          await supabase
            .from('horarios_atendimento')
            .insert(horarios_atendimento);
        }
      }

      // Fetch updated config with horarios_atendimento
      await fetchConfig();
      toast.success('Configurações salvas com sucesso!');
      return data;
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
      throw error;
    }
  };

  const validateAdminPassword = (password: string): boolean => {
    return password === 'Ipda43208';
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return {
    config,
    loading,
    updateConfig,
    validateAdminPassword,
    refetch: fetchConfig
  };
};
