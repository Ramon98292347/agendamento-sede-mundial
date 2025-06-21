-- Criar tabela para histórico de agendamentos
CREATE TABLE public.agendamentos_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agendamento_id UUID NOT NULL, -- ID original do agendamento
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  tipo_agendamento TEXT,
  pastor_selecionado TEXT,
  data_agendamento DATE,
  horario_agendamento TIME,
  observacoes TEXT,
  audio_url TEXT,
  status TEXT NOT NULL,
  origem TEXT DEFAULT 'n8n',
  anotacoes_pastor TEXT,
  data_atendimento DATE, -- Nova: quando foi atendido
  motivo_finalizacao TEXT, -- Nova: motivo da finalização
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  moved_to_history_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.agendamentos_historico ENABLE ROW LEVEL SECURITY;

-- Criar política de acesso
CREATE POLICY "Permitir acesso total ao histórico" 
ON public.agendamentos_historico FOR ALL USING (true);

-- Criar índices para performance
CREATE INDEX idx_agendamentos_historico_data_agendamento 
ON public.agendamentos_historico(data_agendamento);

CREATE INDEX idx_agendamentos_historico_pastor 
ON public.agendamentos_historico(pastor_selecionado);

CREATE INDEX idx_agendamentos_historico_status 
ON public.agendamentos_historico(status);

CREATE INDEX idx_agendamentos_historico_moved_at 
ON public.agendamentos_historico(moved_to_history_at);

-- Trigger para atualizar updated_at
CREATE TRIGGER tr_agendamentos_historico_updated_at
    BEFORE UPDATE ON public.agendamentos_historico
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_set_updated_at();

-- Comentários para documentação
COMMENT ON TABLE public.agendamentos_historico IS 'Histórico de agendamentos finalizados para otimização de performance';
COMMENT ON COLUMN public.agendamentos_historico.agendamento_id IS 'ID original do agendamento na tabela principal';
COMMENT ON COLUMN public.agendamentos_historico.data_atendimento IS 'Data em que o agendamento foi efetivamente atendido';
COMMENT ON COLUMN public.agendamentos_historico.motivo_finalizacao IS 'Motivo pelo qual o agendamento foi finalizado e movido para o histórico';
COMMENT ON COLUMN public.agendamentos_historico.moved_to_history_at IS 'Data e hora em que o registro foi movido para o histórico';