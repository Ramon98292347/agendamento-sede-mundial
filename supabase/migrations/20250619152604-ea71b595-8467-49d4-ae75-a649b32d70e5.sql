
-- Adicionar campo senha na tabela pastores
ALTER TABLE public.pastores 
ADD COLUMN senha TEXT;

-- Atualizar pastores existentes com uma senha padrão (eles podem alterar depois)
UPDATE public.pastores 
SET senha = 'pastor123' 
WHERE senha IS NULL;

-- Tornar o campo senha obrigatório
ALTER TABLE public.pastores 
ALTER COLUMN senha SET NOT NULL;
