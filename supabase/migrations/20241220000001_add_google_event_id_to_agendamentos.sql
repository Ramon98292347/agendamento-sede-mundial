-- Adicionar coluna google_event_id à tabela agendamentos
ALTER TABLE agendamentos 
ADD COLUMN google_event_id TEXT;

-- Adicionar comentário para documentar a coluna
COMMENT ON COLUMN agendamentos.google_event_id IS 'ID do evento correspondente no Google Calendar';