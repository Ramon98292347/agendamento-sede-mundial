import { Agendamento } from '../integrations/supabase/types';

type WebhookAction = 'create' | 'update' | 'delete' | 'status_change' | 'atendimento';

interface WebhookPayload {
  agendamento: Agendamento;
  action: WebhookAction;
  timestamp: string;
}

class WebhookService {
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://webhookn8n.rfautomatic.click/webhook/agendamento';
  }

  async sendToWebhook(agendamento: Agendamento, action: WebhookAction): Promise<void> {
    try {
      const payload: WebhookPayload = {
        agendamento,
        action,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
      }

      console.log(`Webhook enviado com sucesso para ação: ${action}`, payload);
    } catch (error) {
      console.error('Erro ao enviar webhook:', error);
      // Não interrompe o fluxo principal em caso de erro no webhook
    }
  }

  updateWebhookUrl(newUrl: string): void {
    this.webhookUrl = newUrl;
  }

  getWebhookUrl(): string {
    return this.webhookUrl;
  }
}

export const webhookService = new WebhookService();
export type { WebhookAction, WebhookPayload };