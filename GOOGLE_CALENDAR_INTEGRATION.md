# Integração com Google Calendar

Este documento descreve como configurar e usar a integração com Google Calendar no sistema de agendamentos.

## 📋 Pré-requisitos

1. **Projeto no Google Cloud Console**
   - Acesse [Google Cloud Console](https://console.cloud.google.com/)
   - Crie um novo projeto ou selecione um existente
   - Ative a API do Google Calendar

2. **Credenciais OAuth 2.0**
   - Vá para "APIs & Services" > "Credentials"
   - Clique em "Create Credentials" > "OAuth 2.0 Client IDs"
   - Configure as origens e URIs de redirecionamento

## ⚙️ Configuração

### 1. Google Cloud Console

**Origens JavaScript autorizadas:**
```
https://agendamento-sede-mundial.vercel.app
```

**URIs de redirecionamento autorizados:**
```
https://agendamento-sede-mundial.vercel.app/auth/google/callback
```

### 2. Variáveis de Ambiente

**Arquivo .env local:**
```env
VITE_GOOGLE_CLIENT_ID=seu_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui
VITE_GOOGLE_REDIRECT_URI=https://agendamento-sede-mundial.vercel.app/auth/google/callback
```

**Vercel (Produção):**
```bash
# Via CLI
vercel env add VITE_GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
vercel env add VITE_GOOGLE_REDIRECT_URI

# Ou via Dashboard da Vercel
# Settings > Environment Variables
```

### 3. Banco de Dados

Execute a migração para adicionar a coluna `google_event_id`:

```sql
ALTER TABLE agendamentos 
ADD COLUMN google_event_id TEXT;
```

## 🚀 Funcionalidades

### ✅ Recursos Implementados

- **Autenticação OAuth 2.0** com Google
- **Criação automática** de eventos no Google Calendar
- **Atualização sincronizada** de eventos existentes
- **Exclusão automática** de eventos cancelados
- **Interface de configuração** na página de Configurações
- **Renovação automática** de tokens expirados
- **Tratamento de erros** gracioso

### 📱 Como Usar

1. **Conectar ao Google Calendar:**
   - Vá para Configurações
   - Na seção "Google Calendar", clique em "Conectar"
   - Autorize o acesso na janela do Google
   - Aguarde o redirecionamento e confirmação

2. **Agendamentos Sincronizados:**
   - Todos os novos agendamentos serão automaticamente criados no Google Calendar
   - Atualizações nos agendamentos serão refletidas no calendário
   - Exclusões de agendamentos removerão os eventos do calendário

3. **Desconectar:**
   - Na página de Configurações, clique em "Desconectar"
   - Os agendamentos futuros não serão mais sincronizados
   - Eventos já criados permanecerão no Google Calendar

## 🔧 Arquivos Criados/Modificados

### Novos Arquivos
- `src/services/googleCalendarService.ts` - Serviço principal da API
- `src/hooks/useGoogleCalendar.ts` - Hook React para gerenciar estado
- `src/components/GoogleCalendarConfig.tsx` - Interface de configuração
- `src/pages/GoogleAuthCallback.tsx` - Página de callback OAuth
- `supabase/migrations/20241220000001_add_google_event_id_to_agendamentos.sql` - Migração DB

### Arquivos Modificados
- `src/hooks/useAgendamentos.ts` - Adicionada sincronização
- `src/pages/Configuracoes.tsx` - Adicionado componente de configuração
- `src/App.tsx` - Adicionada rota de callback
- `package.json` - Adicionadas dependências
- `.env` - Adicionadas variáveis de ambiente

## 🔒 Segurança

- **Client Secret** nunca é exposto no frontend
- **Tokens** são armazenados localmente e renovados automaticamente
- **Scopes** limitados apenas ao Google Calendar
- **HTTPS** obrigatório para OAuth em produção

## 🐛 Troubleshooting

### Erro: "Origin not allowed"
- Verifique se a URL está correta nas origens autorizadas
- Certifique-se de usar HTTPS em produção

### Erro: "Redirect URI mismatch"
- Confirme se a URI de redirecionamento está exatamente igual
- Verifique se não há barras extras ou caracteres especiais

### Tokens expirados
- O sistema renova automaticamente os tokens
- Se persistir, desconecte e conecte novamente

### Eventos não sincronizando
- Verifique se está conectado ao Google Calendar
- Confirme se as datas/horários estão válidos
- Verifique o console do navegador para erros

## 📞 Suporte

Para problemas ou dúvidas sobre a integração:
1. Verifique os logs do console do navegador
2. Confirme se todas as variáveis de ambiente estão configuradas
3. Teste a conectividade com a API do Google Calendar