# Integração com N8N - Sistema de Agendamentos

Este documento descreve como configurar e usar a integração entre o Sistema de Agendamentos e o N8N para sincronização automática com o Google Calendar.

## Configuração

### 1. Variáveis de Ambiente

Adicione a seguinte variável ao seu arquivo `.env`:

```env
VITE_N8N_WEBHOOK_URL=https://sua-instancia-n8n.com/webhook/agendamentos
```

### 2. Webhook do N8N

O sistema enviará dados para o webhook do N8N sempre que ocorrerem as seguintes ações:

- **create**: Criação de um novo agendamento
- **update**: Atualização geral de um agendamento
- **status_change**: Mudança de status do agendamento
- **atendimento**: Adição/edição de anotações do pastor
- **delete**: Exclusão de um agendamento

### 3. Estrutura dos Dados Enviados

O webhook recebe um payload JSON com a seguinte estrutura:

```json
{
  "agendamento": {
    "id": "uuid",
    "nome": "Nome do Cliente",
    "telefone": "(11) 99999-9999",
    "email": "cliente@email.com",
    "tipo_agendamento": "Aconselhamento",
    "pastor_selecionado": "Pastor João",
    "data_agendamento": "2024-01-15",
    "horario_agendamento": "14:00",
    "observacoes": "Observações do cliente",
    "status": "confirmado",
    "origem": "manual",
    "anotacoes_pastor": "Anotações do atendimento",
    "created_at": "2024-01-10T10:00:00Z",
    "updated_at": "2024-01-10T10:00:00Z"
  },
  "action": "create",
  "timestamp": "2024-01-10T10:00:00Z"
}
```

## Fluxo de Trabalho no N8N

### Workflow Recomendado

1. **Webhook Trigger**: Recebe os dados do sistema
2. **Switch Node**: Direciona o fluxo baseado na ação (`action`)
3. **Google Calendar Nodes**: Executa as operações no Google Calendar

### Ações por Tipo

#### CREATE
- Cria um novo evento no Google Calendar
- Configura título, data, horário e descrição
- Adiciona participantes (se email fornecido)

#### UPDATE
- Atualiza evento existente no Google Calendar
- Modifica detalhes conforme necessário

#### STATUS_CHANGE
- **confirmado**: Confirma o evento no calendar
- **cancelado**: Cancela o evento no calendar
- **atendido**: Marca como concluído
- **nao_atendido**: Adiciona nota de não comparecimento

#### ATENDIMENTO
- Adiciona anotações do pastor à descrição do evento
- Atualiza status para "atendido" se necessário

#### DELETE
- Remove o evento do Google Calendar

## Configuração do Google Calendar no N8N

### Credenciais Necessárias

1. **Google OAuth2**: Para autenticação
2. **Calendar ID**: ID do calendário onde os eventos serão criados

### Mapeamento de Campos

```javascript
// Exemplo de mapeamento para criação de evento
{
  "summary": `${agendamento.tipo_agendamento} - ${agendamento.nome}`,
  "description": `
    Cliente: ${agendamento.nome}
    Telefone: ${agendamento.telefone}
    Email: ${agendamento.email || 'Não informado'}
    Pastor: ${agendamento.pastor_selecionado}
    Observações: ${agendamento.observacoes || 'Nenhuma'}
    ${agendamento.anotacoes_pastor ? `\nAnotações do Pastor: ${agendamento.anotacoes_pastor}` : ''}
  `,
  "start": {
    "dateTime": `${agendamento.data_agendamento}T${agendamento.horario_agendamento}:00`,
    "timeZone": "America/Sao_Paulo"
  },
  "end": {
    "dateTime": `${agendamento.data_agendamento}T${addHour(agendamento.horario_agendamento)}:00`,
    "timeZone": "America/Sao_Paulo"
  },
  "attendees": agendamento.email ? [{ "email": agendamento.email }] : []
}
```

## Tratamento de Erros

O sistema está configurado para:

- **Não interromper** o fluxo principal em caso de erro no webhook
- **Registrar logs** de erros no console
- **Continuar** com as operações normais do sistema

## Monitoramento

### Logs do Sistema

Todos os envios de webhook são registrados no console com:
- Ação executada
- Dados do agendamento
- Timestamp da operação

### Verificação de Status

Para verificar se a integração está funcionando:

1. Crie um agendamento de teste
2. Verifique os logs do console
3. Confirme a criação do evento no Google Calendar

## Troubleshooting

### Problemas Comuns

1. **Webhook não recebe dados**
   - Verifique a URL do webhook
   - Confirme que o N8N está acessível
   - Verifique as configurações de CORS

2. **Eventos não aparecem no Google Calendar**
   - Verifique as credenciais do Google
   - Confirme o Calendar ID
   - Verifique permissões de escrita

3. **Dados incompletos**
   - Verifique o mapeamento de campos no N8N
   - Confirme que todos os campos obrigatórios estão sendo enviados

### Debug

Para debug, adicione logs no workflow do N8N:

```javascript
// No início do workflow
console.log('Webhook recebido:', JSON.stringify($input.all(), null, 2));

// Antes de cada operação do Google Calendar
console.log('Dados para Google Calendar:', JSON.stringify(data, null, 2));
```

## Exemplo de Workflow N8N

Um exemplo completo de workflow está disponível em: `docs/n8n-workflow-example.json`

## Suporte

Para suporte técnico:
1. Verifique os logs do sistema
2. Teste a conectividade com o webhook
3. Valide as configurações do Google Calendar
4. Consulte a documentação do N8N