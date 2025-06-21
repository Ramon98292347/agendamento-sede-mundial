import {
  GOOGLE_OAUTH_CONFIG,
  validateGoogleOAuthConfig,
  generateOAuthState,
  formatGoogleApiError
} from '../config/googleOAuth';

interface GoogleCalendarConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
}

interface TokenData {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  scope?: string;
}

interface AgendamentoData {
  id?: string;
  titulo: string;
  descricao?: string;
  dataInicio: Date;
  dataFim: Date;
  local?: string;
  participantes?: string[];
}

interface CalendarEvent {
  summary: string;
  description: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
}

class GoogleCalendarService {
  private config: GoogleCalendarConfig;
  private tokenData: TokenData | null = null;
  private readonly TOKEN_STORAGE_KEY = GOOGLE_OAUTH_CONFIG.TOKEN_STORAGE_KEY;
  private readonly SCOPES = GOOGLE_OAUTH_CONFIG.SCOPES;
  private readonly TIMEZONE = 'America/Sao_Paulo';

  constructor() {
    // Validar configurações usando a função centralizada
    const validation = validateGoogleOAuthConfig();
    
    if (!validation.isValid) {
      const errorMessage = `Configuração do Google OAuth inválida:\n${validation.errors.join('\n')}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    this.config = validation.config!;
    
    console.log('Google Calendar Service configurado:', {
      clientId: this.config.clientId.substring(0, 20) + '...',
      redirectUri: this.config.redirectUri,
      hasClientSecret: !!this.config.clientSecret
    });
    
    // Tentar carregar token do localStorage
    this.loadTokenFromStorage();
  }
  
  /**
   * Carrega token do localStorage com validação
   */
  private loadTokenFromStorage(): void {
    try {
      const savedToken = localStorage.getItem(this.TOKEN_STORAGE_KEY);
      if (savedToken) {
        const tokenData = JSON.parse(savedToken);
        
        // Validar estrutura do token
        if (tokenData.access_token && tokenData.expires_at) {
          this.tokenData = tokenData;
          console.log('Token carregado do localStorage');
        } else {
          console.warn('Token inválido encontrado, removendo...');
          localStorage.removeItem(this.TOKEN_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar token do localStorage:', error);
      localStorage.removeItem(this.TOKEN_STORAGE_KEY);
    }
  }

  /**
   * Gera a URL de autorização para o Google OAuth
   */
  public generateAuthUrl(): string {
    const state = generateOAuthState(16);
    localStorage.setItem(GOOGLE_OAUTH_CONFIG.STATE_STORAGE_KEY, state);

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: GOOGLE_OAUTH_CONFIG.RESPONSE_TYPE,
      scope: this.SCOPES.join(' '),
      access_type: GOOGLE_OAUTH_CONFIG.ACCESS_TYPE,
      state,
      prompt: GOOGLE_OAUTH_CONFIG.PROMPT,
      include_granted_scopes: GOOGLE_OAUTH_CONFIG.INCLUDE_GRANTED_SCOPES
    });

    const authUrl = `${GOOGLE_OAUTH_CONFIG.OAUTH_URL}?${params.toString()}`;
    
    console.log('URL de autorização gerada:', {
      clientId: this.config.clientId.substring(0, 20) + '...',
      redirectUri: this.config.redirectUri,
      scopes: this.SCOPES,
      state
    });
    
    return authUrl;
  }

  /**
   * Valida o state do OAuth para prevenir ataques CSRF
   */
  public validateState(receivedState: string): boolean {
    const savedState = localStorage.getItem(GOOGLE_OAUTH_CONFIG.STATE_STORAGE_KEY);
    localStorage.removeItem(GOOGLE_OAUTH_CONFIG.STATE_STORAGE_KEY); // Limpar após uso
    
    if (!savedState || savedState !== receivedState) {
      console.error('State mismatch - possível ataque CSRF');
      return false;
    }
    
    return true;
  }
  
  /**
   * Troca o código de autorização por tokens de acesso e atualização
   */
  public async getTokenFromCode(code: string, state?: string): Promise<TokenData> {
    // Validar state se fornecido
    if (state && !this.validateState(state)) {
      throw new Error('State inválido - possível ataque CSRF');
    }
    
    console.log('Trocando código por token...');
    
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      code,
      grant_type: 'authorization_code'
    });
    
    // Adicionar client_secret se disponível (para aplicações server-side)
    if (this.config.clientSecret) {
      params.append('client_secret', this.config.clientSecret);
    }

    const response = await fetch(GOOGLE_OAUTH_CONFIG.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }
      
      console.error('Erro na resposta do token:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      const errorMessage = formatGoogleApiError(errorData);
      throw new Error(`Erro ao obter token: ${errorMessage}`);
    }

    const data = await response.json();
    
    console.log('Token recebido com sucesso:', {
      hasAccessToken: !!data.access_token,
      hasRefreshToken: !!data.refresh_token,
      expiresIn: data.expires_in,
      scope: data.scope
    });
    
    if (!data.access_token) {
      throw new Error('Token de acesso não recebido');
    }
    
    const tokenData: TokenData = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      expires_at: Date.now() + (data.expires_in * 1000),
      token_type: data.token_type || 'Bearer',
      scope: data.scope
    };

    this.setToken(tokenData);
    return tokenData;
  }

  /**
   * Salva o token no localStorage
   */
  public saveToken(tokenData: TokenData): void {
    this.tokenData = tokenData;
    localStorage.setItem(this.TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
    console.log('Token salvo no localStorage');
  }
  
  /**
   * Define o token (alias para saveToken)
   */
  public setToken(tokenData: TokenData): void {
    this.saveToken(tokenData);
  }

  /**
   * Remove o token do localStorage
   */
  public clearToken(): void {
    this.tokenData = null;
    localStorage.removeItem(this.TOKEN_STORAGE_KEY);
  }

  /**
   * Verifica se o usuário está autenticado
   */
  public isAuthenticated(): boolean {
    return !!this.tokenData && this.tokenData.access_token && !this.isTokenExpired();
  }

  /**
   * Verifica se o token está expirado
   */
  private isTokenExpired(): boolean {
    if (!this.tokenData || !this.tokenData.expires_at) return true;
    
    // Considerar expirado 5 minutos antes para evitar problemas
    const expiryWithBuffer = this.tokenData.expires_at - (5 * 60 * 1000);
    return Date.now() > expiryWithBuffer;
  }



  /**
   * Renova o token de acesso usando o refresh token
   */
  private async refreshToken(): Promise<void> {
    if (!this.tokenData?.refresh_token) {
      console.error('Tentativa de renovar token sem refresh_token');
      throw new Error('Refresh token não disponível - reautenticação necessária');
    }
    
    console.log('Renovando token de acesso...');

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      refresh_token: this.tokenData.refresh_token,
      grant_type: 'refresh_token'
    });
    
    // Adicionar client_secret se disponível
    if (this.config.clientSecret) {
      params.append('client_secret', this.config.clientSecret);
    }

    const response = await fetch(GOOGLE_OAUTH_CONFIG.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }
      
      console.error('Erro ao renovar token:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      // Se o refresh token for inválido, limpar dados
      if (response.status === 400) {
        this.removeToken();
        throw new Error('Refresh token inválido - reautenticação necessária');
      }
      
      const errorMessage = formatGoogleApiError(errorData);
      throw new Error(`Erro ao renovar token: ${errorMessage}`);
    }

    const data = await response.json();
    
    console.log('Token renovado com sucesso');
    
    // Atualizar token mantendo o refresh_token se não for fornecido um novo
    const updatedToken: TokenData = {
      ...this.tokenData,
      access_token: data.access_token,
      expires_in: data.expires_in,
      expires_at: Date.now() + (data.expires_in * 1000),
      token_type: data.token_type || this.tokenData.token_type,
      refresh_token: data.refresh_token || this.tokenData.refresh_token
    };

    this.saveToken(updatedToken);
  }

  /**
   * Garante que temos um token válido, renovando se necessário
   */
  private async ensureValidToken(): Promise<string> {
    if (!this.tokenData) {
      throw new Error('Usuário não autenticado - faça login primeiro');
    }
    
    if (!this.tokenData.access_token) {
      throw new Error('Token de acesso não encontrado');
    }

    // Verificar se o token está próximo do vencimento
    const refreshMargin = Date.now() + GOOGLE_OAUTH_CONFIG.TOKEN_REFRESH_MARGIN;
    if (this.tokenData.expires_at && this.tokenData.expires_at < refreshMargin) {
      console.log('Token próximo do vencimento, renovando...');
      try {
        await this.refreshToken();
      } catch (error) {
        console.error('Erro ao renovar token:', error);
        throw new Error('Falha na renovação do token - reautenticação necessária');
      }
    }

    return this.tokenData.access_token;
  }

  /**
   * Converte dados de agendamento para o formato de evento do Google Calendar
   */
  public convertToCalendarEvent(agendamento: AgendamentoData): CalendarEvent {
    // Extrair data e horário
    const [ano, mes, dia] = agendamento.data_agendamento.split('-').map(Number);
    const [hora, minuto] = agendamento.horario_agendamento.split(':').map(Number);
    
    // Criar data de início
    const startDate = new Date(ano, mes - 1, dia, hora, minuto);
    
    // Criar data de fim (30 minutos após o início por padrão)
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
    
    // Formatar datas no formato ISO
    const startDateTime = startDate.toISOString();
    const endDateTime = endDate.toISOString();
    
    // Criar descrição com detalhes do agendamento
    const description = `Nome: ${agendamento.nome}\nTelefone: ${agendamento.telefone}\nPastor: ${agendamento.pastor}${agendamento.observacoes ? `\nObservações: ${agendamento.observacoes}` : ''}`;
    
    return {
      summary: `Agendamento: ${agendamento.nome}`,
      description,
      start: {
        dateTime: startDateTime,
        timeZone: this.TIMEZONE
      },
      end: {
        dateTime: endDateTime,
        timeZone: this.TIMEZONE
      }
    };
  }

  /**
   * Cria um evento no Google Calendar
   */
  public async createEvent(event: CalendarEvent): Promise<string> {
    const accessToken = await this.ensureValidToken();
    
    const response = await fetch(`${GOOGLE_OAUTH_CONFIG.CALENDAR_API_URL}/calendars/primary/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao criar evento: ${errorData.error?.message || 'Erro desconhecido'}`);
    }

    const data = await response.json();
    return data.id;
  }

  /**
   * Atualiza um evento existente no Google Calendar
   */
  public async updateEvent(eventId: string, event: CalendarEvent): Promise<void> {
    const accessToken = await this.ensureValidToken();
    
    const response = await fetch(`${GOOGLE_OAUTH_CONFIG.CALENDAR_API_URL}/calendars/primary/events/${eventId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao atualizar evento: ${errorData.error?.message || 'Erro desconhecido'}`);
    }
  }

  /**
   * Exclui um evento do Google Calendar
   */
  public async deleteEvent(eventId: string): Promise<void> {
    const accessToken = await this.ensureValidToken();
    
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok && response.status !== 410) { // 410 Gone significa que o evento já foi excluído
      try {
        const errorData = await response.json();
        throw new Error(`Erro ao excluir evento: ${errorData.error?.message || 'Erro desconhecido'}`);
      } catch (e) {
        if (response.status === 404) {
          console.warn('Evento não encontrado no Google Calendar, possivelmente já foi excluído');
          return; // Não é um erro se o evento já não existe
        }
        throw new Error(`Erro ao excluir evento: Status ${response.status}`);
      }
    }
  }

  /**
   * Lista eventos do Google Calendar
   */
  public async listEvents(timeMin?: Date, timeMax?: Date): Promise<any[]> {
    const accessToken = await this.ensureValidToken();
    
    const params = new URLSearchParams({
      timeZone: this.TIMEZONE,
      maxResults: '100'
    });
    
    if (timeMin) {
      params.append('timeMin', timeMin.toISOString());
    }
    
    if (timeMax) {
      params.append('timeMax', timeMax.toISOString());
    }
    
    const response = await fetch(`${GOOGLE_OAUTH_CONFIG.CALENDAR_API_URL}/calendars/primary/events?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao listar eventos: ${errorData.error?.message || 'Erro desconhecido'}`);
    }

    const data = await response.json();
    return data.items || [];
  }
}

// Exportar uma instância única do serviço
const googleCalendarService = new GoogleCalendarService();
export default googleCalendarService;

// Exportar tipos para uso em outros arquivos
export type { AgendamentoData, CalendarEvent, TokenData };