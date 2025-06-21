-- Adicionar coluna intervalo_almoco à tabela escalas
ALTER TABLE public.escalas 
ADD COLUMN intervalo_almoco TEXT;

-- Comentário explicativo
COMMENT ON COLUMN public.escalas.intervalo_almoco IS 'Intervalo de almoço em formato JSON com inicio e fim (ex: {"inicio": "12:00", "fim": "13:00"})';