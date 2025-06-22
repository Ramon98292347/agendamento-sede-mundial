
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Pastor {
  id: string;
  nome: string;
  senha: string;
  telefone?: string;
  created_at: string;
  updated_at: string;
}

export const usePastores = () => {
  const [pastores, setPastores] = useState<Pastor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPastores = async () => {
    try {
      const { data, error } = await supabase
        .from('pastores')
        .select('*')
        .order('nome');

      if (error) throw error;
      setPastores(data || []);
    } catch (error) {
      console.error('Erro ao buscar pastores:', error);
      toast.error('Erro ao carregar pastores');
    } finally {
      setLoading(false);
    }
  };

  const addPastor = async (nome: string, senha: string, telefone?: string) => {
    try {
      const { data, error } = await supabase
        .from('pastores')
        .insert([{ nome, senha, telefone }])
        .select()
        .single();

      if (error) throw error;
      
      setPastores(prev => [...prev, data]);
      toast.success('Pastor adicionado com sucesso!');
      return data;
    } catch (error) {
      console.error('Erro ao adicionar pastor:', error);
      toast.error('Erro ao adicionar pastor');
      throw error;
    }
  };

  const deletePastor = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pastores')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setPastores(prev => prev.filter(p => p.id !== id));
      toast.success('Pastor removido com sucesso!');
    } catch (error) {
      console.error('Erro ao remover pastor:', error);
      toast.error('Erro ao remover pastor');
      throw error;
    }
  };

  useEffect(() => {
    fetchPastores();
  }, []);

  return {
    pastores,
    loading,
    addPastor,
    deletePastor,
    refetch: fetchPastores
  };
};
