
-- Adicionar campo para anotações do pastor na tabela agendamentos
ALTER TABLE public.agendamentos 
ADD COLUMN IF NOT EXISTS anotacoes_pastor TEXT;

-- Adicionar comentário para documentar o campo
COMMENT ON COLUMN public.agendamentos.anotacoes_pastor IS 'Anotações feitas pelo pastor durante o atendimento';
