interface GoogleCalendarConfig {
  clientId: string;
  redirectUri: string;
}

interface TokenData {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
}

interface AgendamentoData {
  nome: string;
  telefone: string;
  data_agendamento: string;
  horario_agendamento: string;
  pastor: string;
  observacoes?: string;
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
  private readonly SCOPES = ['https://www.googleapis.com/auth/calendar'];
  private readonly TOKEN_STORAGE_KEY = 'google_calendar_token';
  private readonly TIMEZONE = 'America/Sao_Paulo';

  constructor() {
    this.config = {
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      redirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI
    };
    
    // Tentar carregar token do localStorage
    const savedToken = localStorage.getItem(this.TOKEN_STORAGE_KEY);
    if (savedToken) {
      try {
        this.tokenData = JSON.parse(savedToken);
      } catch (error) {
        console.error('Erro ao carregar token do localStorage:', error);
        localStorage.removeItem(this.TOKEN_STORAGE_KEY);
      }
    }
  }

  /**
   * Gera a URL de autorização para o Google OAuth
   */
  public generateAuthUrl(): string {
    const state = this.generateRandomString(16);
    localStorage.setItem('google_auth_state', state);

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.SCOPES.join(' '),
      access_type: 'offline',
      state,
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Troca o código de autorização por tokens de acesso e atualização
   */
  public async getTokenFromCode(code: string): Promise<TokenData> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      code,
      grant_type: 'authorization_code'
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao obter token: ${errorData.error_description || errorData.error || 'Erro desconhecido'}`);
    }

    const tokenData = await response.json();
    
    // Adicionar expires_at baseado no expires_in
    tokenData.expires_at = Date.now() + (tokenData.expires_in * 1000);
    
    // Salvar token
    this.setToken(tokenData);
    
    return tokenData;
  }

  /**
   * Define o token e salva no localStorage
   */
  public setToken(tokenData: TokenData): void {
    this.tokenData = tokenData;
    localStorage.setItem(this.TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
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
   * Gera uma string aleatória para o state do OAuth
   */
  private generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const values = new Uint8Array(length);
    window.crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      result += charset[values[i] % charset.length];
    }
    return result;
  }

  /**
   * Renova o token de acesso usando o refresh token
   */
  public async refreshToken(): Promise<TokenData> {
    if (!this.tokenData || !this.tokenData.refresh_token) {
      throw new Error('Refresh token não disponível');
    }

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      refresh_token: this.tokenData.refresh_token,
      grant_type: 'refresh_token'
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao renovar token: ${errorData.error_description || errorData.error || 'Erro desconhecido'}`);
    }

    const newTokenData = await response.json();
    
    // Manter o refresh_token, pois a resposta pode não incluí-lo
    newTokenData.refresh_token = this.tokenData.refresh_token;
    
    // Adicionar expires_at baseado no expires_in
    newTokenData.expires_at = Date.now() + (newTokenData.expires_in * 1000);
    
    // Salvar novo token
    this.setToken(newTokenData);
    
    return newTokenData;
  }

  /**
   * Garante que temos um token válido antes de fazer chamadas à API
   */
  private async ensureValidToken(): Promise<string> {
    if (!this.isAuthenticated()) {
      if (this.tokenData && this.tokenData.refresh_token) {
        await this.refreshToken();
      } else {
        throw new Error('Não autenticado no Google Calendar');
      }
    }
    
    return this.tokenData!.access_token;
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
    
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
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
    
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
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
    
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
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