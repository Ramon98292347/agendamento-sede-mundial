
-- Criar tabela para pastores
CREATE TABLE public.pastores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para escalas dos pastores
CREATE TABLE public.escalas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pastor_id UUID NOT NULL REFERENCES public.pastores(id) ON DELETE CASCADE,
  data_disponivel DATE NOT NULL,
  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para configurações do sistema
CREATE TABLE public.configuracoes_sistema (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  horarios_funcionamento JSONB DEFAULT '{}',
  contatos JSONB DEFAULT '{}',
  informacoes JSONB DEFAULT '{}',
  senha_admin TEXT DEFAULT 'Ipda43208',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para agendamentos vindos do N8N
CREATE TABLE public.agendamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  tipo_agendamento TEXT,
  pastor_selecionado TEXT,
  data_agendamento DATE,
  horario_agendamento TIME,
  observacoes TEXT,
  audio_url TEXT,
  status TEXT DEFAULT 'pendente',
  origem TEXT DEFAULT 'n8n',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir configurações padrão
INSERT INTO public.configuracoes_sistema (horarios_funcionamento, contatos, informacoes, senha_admin)
VALUES (
  '{"segunda_sexta": "Segunda a Sexta: 9h às 18h", "sabado": "Sábado: 9h às 12h", "domingo": "Domingo: Apenas emergências"}',
  '{"telefone": "(11) 1234-5678", "email": "contato@ipda.org.br", "endereco": "Rua da Igreja, 123"}',
  '{"antecedencia": "Os agendamentos devem ser feitos com pelo menos 24h de antecedência", "confirmacao": "Confirme seu agendamento ligando para a secretaria", "emergencia": "Em caso de emergência, procure a liderança da igreja"}',
  'Ipda43208'
);

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$;

-- Aplicar triggers
CREATE TRIGGER tr_pastores_updated_at
    BEFORE UPDATE ON public.pastores
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER tr_escalas_updated_at
    BEFORE UPDATE ON public.escalas
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER tr_configuracoes_sistema_updated_at
    BEFORE UPDATE ON public.configuracoes_sistema
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER tr_agendamentos_updated_at
    BEFORE UPDATE ON public.agendamentos
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_set_updated_at();

-- Habilitar Row Level Security (RLS) 
ALTER TABLE public.pastores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

-- Criar políticas para acesso público (já que não há autenticação implementada)
CREATE POLICY "Permitir acesso total a pastores" ON public.pastores FOR ALL USING (true);
CREATE POLICY "Permitir acesso total a escalas" ON public.escalas FOR ALL USING (true);
CREATE POLICY "Permitir acesso total a configuracoes_sistema" ON public.configuracoes_sistema FOR ALL USING (true);
CREATE POLICY "Permitir acesso total a agendamentos" ON public.agendamentos FOR ALL USING (true);
