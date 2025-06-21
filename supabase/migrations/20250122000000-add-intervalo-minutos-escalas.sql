-- Adicionar campo intervalo_minutos na tabela escalas
ALTER TABLE public.escalas 
ADD COLUMN intervalo_minutos INTEGER DEFAULT 30 CHECK (intervalo_minutos > 0 AND intervalo_minutos <= 60);

-- Comentário explicativo
COMMENT ON COLUMN public.escalas.intervalo_minutos IS 'Intervalo em minutos entre os horários de atendimento (ex: 10, 20, 30, 40, 50, 60)';