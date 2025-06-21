# Configuração da Integração com Google Calendar

Este documento fornece instruções detalhadas para configurar a integração com o Google Calendar no sistema de agendamento.

## Pré-requisitos

1. Conta do Google
2. Acesso ao Google Cloud Console
3. Projeto no Google Cloud Platform

## Passo 1: Configurar o Google Cloud Console

### 1.1 Criar/Selecionar Projeto

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Anote o ID do projeto

### 1.2 Habilitar APIs

1. No menu lateral, vá para "APIs e Serviços" > "Biblioteca"
2. Procure e habilite as seguintes APIs:
   - **Google Calendar API**
   - **Google+ API** (opcional, para informações do perfil)

### 1.3 Configurar Tela de Consentimento OAuth

1. Vá para "APIs e Serviços" > "Tela de consentimento OAuth"
2. Escolha "Externo" como tipo de usuário
3. Preencha as informações obrigatórias:
   - **Nome do aplicativo**: Sistema de Agendamento - Sede Mundial
   - **Email de suporte do usuário**: seu-email@exemplo.com
   - **Domínios autorizados**: seu-dominio.com (se aplicável)
   - **Email de contato do desenvolvedor**: seu-email@exemplo.com

### 1.4 Criar Credenciais OAuth 2.0

1. Vá para "APIs e Serviços" > "Credenciais"
2. Clique em "+ CRIAR CREDENCIAIS" > "ID do cliente OAuth 2.0"
3. Selecione "Aplicativo da Web" como tipo
4. Configure:
   - **Nome**: Sistema de Agendamento Web Client
   - **Origens JavaScript autorizadas**:
     - `http://localhost:5173` (desenvolvimento)
     - `https://seu-dominio.vercel.app` (produção)
   - **URIs de redirecionamento autorizados**:
     - `http://localhost:5173/auth/google/callback` (desenvolvimento)
     - `https://seu-dominio.vercel.app/auth/google/callback` (produção)

5. Clique em "CRIAR"
6. **IMPORTANTE**: Anote o **Client ID** e **Client Secret**

## Passo 2: Configurar Variáveis de Ambiente

### 2.1 Arquivo .env (Desenvolvimento)

Crie ou atualize o arquivo `.env` na raiz do projeto:

```env
# Google OAuth Configuration
VITE_GOOGLE_CLIENT_ID=seu-client-id-aqui.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret-aqui
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback
```

### 2.2 Vercel (Produção)

1. Acesse o dashboard do Vercel
2. Selecione seu projeto
3. Vá para "Settings" > "Environment Variables"
4. Adicione as seguintes variáveis:

| Nome | Valor | Ambiente |
|------|-------|----------|
| `VITE_GOOGLE_CLIENT_ID` | seu-client-id-aqui.apps.googleusercontent.com | Production, Preview |
| `GOOGLE_CLIENT_SECRET` | seu-client-secret-aqui | Production, Preview |
| `VITE_GOOGLE_REDIRECT_URI` | https://seu-dominio.vercel.app/auth/google/callback | Production, Preview |

## Passo 3: Verificar Configuração

### 3.1 Validação Automática

O sistema possui validação automática das configurações. Se algo estiver incorreto, você verá erros no console do navegador.

### 3.2 Teste de Conexão

1. Inicie o servidor de desenvolvimento: `npm run dev`
2. Acesse a página de configurações
3. Clique em "Conectar Google Calendar"
4. Você deve ser redirecionado para a tela de autorização do Google
5. Após autorizar, deve retornar para a aplicação com sucesso

## Passo 4: Solução de Problemas

### Erro: "redirect_uri_mismatch"

**Causa**: A URI de redirecionamento não está configurada corretamente no Google Cloud Console.

**Solução**:
1. Verifique se a URI no `.env` corresponde exatamente à configurada no Google Cloud Console
2. Certifique-se de incluir o protocolo (http/https)
3. Verifique se não há barras extras no final da URL

### Erro: "invalid_client"

**Causa**: Client ID ou Client Secret incorretos.

**Solução**:
1. Verifique se o Client ID está correto no arquivo `.env`
2. Certifique-se de que não há espaços extras
3. Regenere as credenciais se necessário

### Erro: "access_denied"

**Causa**: Usuário negou permissões ou aplicativo não está aprovado.

**Solução**:
1. Certifique-se de que o usuário está autorizando as permissões
2. Verifique se o aplicativo está em modo de teste e o usuário está na lista de testadores

### Erro: "Token expired"

**Causa**: Token de acesso expirou e não foi possível renovar.

**Solução**:
1. O sistema deve renovar automaticamente usando o refresh token
2. Se persistir, desconecte e reconecte a conta

## Passo 5: Publicação (Opcional)

### Para uso em produção com usuários externos:

1. No Google Cloud Console, vá para "Tela de consentimento OAuth"
2. Clique em "PUBLICAR APLICATIVO"
3. O Google pode solicitar verificação se você solicitar escopos sensíveis

### Para uso interno/teste:

1. Mantenha o aplicativo em modo de teste
2. Adicione usuários de teste em "Usuários de teste"
3. Limite de 100 usuários de teste

## Escopos Utilizados

O sistema solicita os seguintes escopos do Google:

- `https://www.googleapis.com/auth/calendar` - Acesso completo ao calendário
- `https://www.googleapis.com/auth/calendar.events` - Gerenciar eventos do calendário

## Segurança

### Boas Práticas:

1. **Nunca** commite o Client Secret no repositório
2. Use variáveis de ambiente para todas as credenciais
3. Mantenha as URIs de redirecionamento específicas
4. Monitore o uso da API no Google Cloud Console
5. Implemente rate limiting se necessário

### Validação de State:

O sistema implementa validação de state OAuth para prevenir ataques CSRF. Não desabilite esta funcionalidade.

## Monitoramento

### Logs Importantes:

- Conexões bem-sucedidas
- Falhas de autenticação
- Renovações de token
- Erros da API

### Métricas no Google Cloud:

1. Acesse "APIs e Serviços" > "Painel"
2. Monitore:
   - Número de requisições
   - Latência
   - Erros
   - Quotas utilizadas

## Suporte

Para problemas específicos:

1. Verifique os logs do console do navegador
2. Consulte a documentação da [Google Calendar API](https://developers.google.com/calendar/api)
3. Verifique o status das APIs do Google em [status.cloud.google.com](https://status.cloud.google.com)

---

**Última atualização**: Dezembro 2024
**Versão da API**: Google Calendar API v3