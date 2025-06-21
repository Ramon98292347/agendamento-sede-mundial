import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Escala {
  id: string;
  pastor_id: string;
  data_disponivel: string;
  horario_inicio: string;
  horario_fim: string;
  created_at: string;
  updated_at: string;
  intervalo_minutos?: number;
  intervalo_almoco?: string | { inicio: string; fim: string };
  pastores?: {
    nome: string;
  };
}

export const useEscalas = () => {
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [loading, setLoading] = useState(true);

  const removeExpiredScales = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('escalas')
        .delete()
        .lt('data_disponivel', today);

      if (error) {
        console.error('Erro ao remover escalas expiradas:', error);
      } else {
        console.log('Escalas expiradas removidas automaticamente');
      }
    } catch (error) {
      console.error('Erro ao remover escalas expiradas:', error);
    }
  };

  const fetchEscalas = async () => {
    try {
      // Remove escalas expiradas antes de buscar
      await removeExpiredScales();
      
      const { data, error } = await supabase
        .from('escalas')
        .select(`
          *,
          pastores (
            nome
          )
        `)
        .order('data_disponivel');

      if (error) throw error;
      setEscalas(data || []);
    } catch (error) {
      console.error('Erro ao buscar escalas:', error);
      toast.error('Erro ao carregar escalas');
    } finally {
      setLoading(false);
    }
  };

  const addEscala = async (escalaData: {
    pastor_id: string;
    data_disponivel: string;
    horario_inicio: string;
    horario_fim: string;
    intervalo_minutos?: number;
  }) => {
    try {
      const { data, error } = await supabase
        .from('escalas')
        .insert([escalaData])
        .select(`
          *,
          pastores (
            nome
          )
        `)
        .single();

      if (error) throw error;
      
      setEscalas(prev => [...prev, data]);
      toast.success('Escala adicionada com sucesso!');
      return data;
    } catch (error) {
      console.error('Erro ao adicionar escala:', error);
      toast.error('Erro ao adicionar escala');
      throw error;
    }
  };

  const checkDuplicateEscala = async (pastor_id: string, data_disponivel: string) => {
    try {
      const { data, error } = await supabase
        .from('escalas')
        .select('id')
        .eq('pastor_id', pastor_id)
        .eq('data_disponivel', data_disponivel);

      if (error) throw error;
      
      return data && data.length > 0;
    } catch (error) {
      console.error('Erro ao verificar escala duplicada:', error);
      throw error;
    }
  };

  const addMultipleEscalas = async (escalasData: {
    pastor_id: string;
    datas_disponiveis: string[];
    horario_inicio: string;
    horario_fim: string;
    intervalo_minutos?: number;
    intervalo_almoco?: { inicio: string; fim: string };
  }) => {
    try {
      // Verificar duplicatas antes de inserir
      const duplicateChecks = await Promise.all(
        escalasData.datas_disponiveis.map(data => 
          checkDuplicateEscala(escalasData.pastor_id, data)
        )
      );
      
      const duplicateDates = escalasData.datas_disponiveis.filter((_, index) => duplicateChecks[index]);
      
      if (duplicateDates.length > 0) {
        const formattedDates = duplicateDates.map(date => {
          const dateObj = new Date(date + 'T00:00:00');
          return dateObj.toLocaleDateString('pt-BR');
        }).join(', ');
        
        toast.error(`Já existe escala para este pastor nas datas: ${formattedDates}`);
        throw new Error('Escalas duplicadas detectadas');
      }
      
      const escalasToInsert = escalasData.datas_disponiveis.map(data => ({
        pastor_id: escalasData.pastor_id,
        data_disponivel: data,
        horario_inicio: escalasData.horario_inicio,
        horario_fim: escalasData.horario_fim,
        intervalo_minutos: escalasData.intervalo_minutos || 30,
        intervalo_almoco: escalasData.intervalo_almoco ? JSON.stringify(escalasData.intervalo_almoco) : null
      }));

      const { data, error } = await supabase
        .from('escalas')
        .insert(escalasToInsert)
        .select(`
          *,
          pastores (
            nome
          )
        `);

      if (error) throw error;
      
      setEscalas(prev => [...prev, ...data]);
      toast.success(`${data.length} escala(s) adicionada(s) com sucesso!`);
      return data;
    } catch (error) {
      console.error('Erro ao adicionar escalas:', error);
      if (error.message !== 'Escalas duplicadas detectadas') {
        toast.error('Erro ao adicionar escalas');
      }
      throw error;
    }
  };

  const deleteEscala = async (id: string) => {
    try {
      const { error } = await supabase
        .from('escalas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setEscalas(prev => prev.filter(e => e.id !== id));
      toast.success('Escala removida com sucesso!');
    } catch (error) {
      console.error('Erro ao remover escala:', error);
      toast.error('Erro ao remover escala');
      throw error;
    }
  };

  useEffect(() => {
    fetchEscalas();
    
    // Configurar limpeza automática diária
    const interval = setInterval(() => {
      removeExpiredScales();
    }, 24 * 60 * 60 * 1000); // 24 horas

    return () => clearInterval(interval);
  }, []);

  return {
    escalas,
    loading,
    addEscala,
    addMultipleEscalas,
    deleteEscala,
    refetch: fetchEscalas
  };
};
