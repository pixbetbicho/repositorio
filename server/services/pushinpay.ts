/**
 * PushinPay API Integration Service
 * Based on official documentation: https://app.theneo.io/pushinpay/pix/consultar-pix
 */

interface PushinPayConfig {
  token: string;
  baseUrl: string;
  webhookUrl: string;
}

interface PushinPayPixRequest {
  amount: number;
  description: string;
  external_id: string;
  webhook_url?: string;
  expiration_minutes?: number;
}

interface PushinPayPixResponse {
  id: string;
  qr_code: string;
  qr_code_text: string;
  amount: number;
  status: string;
  external_id: string;
  created_at: string;
  expires_at: string;
}

interface PushinPayPixStatus {
  id: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  amount: number;
  paid_amount?: number;
  external_id: string;
  created_at: string;
  paid_at?: string;
  expires_at: string;
  qr_code: string;
  qr_code_text: string;
}

export class PushinPayService {
  private config: PushinPayConfig;

  constructor() {
    const token = process.env.PUSHIN_PAY_TOKEN;
    if (!token) {
      throw new Error('PUSHIN_PAY_TOKEN não configurado');
    }

    // Determinar ambiente baseado em NODE_ENV
    const isProduction = process.env.NODE_ENV === 'production';
    
    this.config = {
      token,
      baseUrl: isProduction 
        ? 'https://api.pushinpay.com.br' 
        : 'https://api-sandbox.pushinpay.com.br',
      webhookUrl: process.env.PUSHIN_PAY_WEBHOOK_URL || ''
    };

    console.log(`[PushinPay] Configurado para ambiente: ${isProduction ? 'PRODUÇÃO' : 'SANDBOX'}`);
    console.log(`[PushinPay] Base URL: ${this.config.baseUrl}`);
  }

  /**
   * Criar um PIX usando a API v1 (endpoint mais estável)
   */
  async createPix(request: PushinPayPixRequest): Promise<PushinPayPixResponse> {
    const url = `${this.config.baseUrl}/api/pix/v1/transactions`;
    
    const payload = {
      amount: request.amount,
      description: request.description,
      external_id: request.external_id,
      webhook_url: request.webhook_url || this.config.webhookUrl,
      expiration_minutes: request.expiration_minutes || 30
    };

    console.log(`[PushinPay] Criando PIX:`, payload);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[PushinPay] Erro ao criar PIX:`, response.status, errorData);
      throw new Error(`Erro PushinPay (${response.status}): ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log(`[PushinPay] PIX criado com sucesso:`, data);
    
    return data;
  }

  /**
   * Consultar status de um PIX usando múltiplos endpoints para máxima compatibilidade
   */
  async getPixStatus(pixId: string): Promise<PushinPayPixStatus> {
    // Tentar primeiro a API v1 (mais estável)
    try {
      return await this.getPixStatusV1(pixId);
    } catch (error) {
      console.warn(`[PushinPay] Falha na API v1, tentando v2:`, error);
      return await this.getPixStatusV2(pixId);
    }
  }

  /**
   * Consultar status usando API v1
   */
  private async getPixStatusV1(pixId: string): Promise<PushinPayPixStatus> {
    const url = `${this.config.baseUrl}/api/pix/v1/transactions/${pixId}`;
    
    console.log(`[PushinPay] Consultando status v1: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[PushinPay] Erro na consulta v1:`, response.status, errorData);
      throw new Error(`Erro PushinPay v1 (${response.status}): ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log(`[PushinPay] Status v1 obtido:`, data);
    
    return data;
  }

  /**
   * Consultar status usando API v2 (fallback)
   */
  private async getPixStatusV2(pixId: string): Promise<PushinPayPixStatus> {
    const url = `${this.config.baseUrl}/api/v2/transactions/${pixId}`;
    
    console.log(`[PushinPay] Consultando status v2: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[PushinPay] Erro na consulta v2:`, response.status, errorData);
      throw new Error(`Erro PushinPay v2 (${response.status}): ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log(`[PushinPay] Status v2 obtido:`, data);
    
    return data;
  }

  /**
   * Verificar se um PIX foi pago
   */
  async isPixPaid(pixId: string): Promise<boolean> {
    try {
      const status = await this.getPixStatus(pixId);
      return status.status === 'paid';
    } catch (error) {
      console.error(`[PushinPay] Erro ao verificar pagamento:`, error);
      return false;
    }
  }

  /**
   * Listar todas as transações (para debug/admin)
   */
  async listTransactions(page: number = 1, limit: number = 50): Promise<any> {
    const url = `${this.config.baseUrl}/api/pix/v1/transactions?page=${page}&limit=${limit}`;
    
    console.log(`[PushinPay] Listando transações: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[PushinPay] Erro ao listar transações:`, response.status, errorData);
      throw new Error(`Erro PushinPay (${response.status}): ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log(`[PushinPay] Transações listadas:`, data);
    
    return data;
  }

  /**
   * Converter string base64 do QR code para URL de dados
   */
  formatQrCodeBase64(qrCodeBase64: string): string {
    if (!qrCodeBase64) return '';
    
    // Se já contém o prefixo data:image, retorna como está
    if (qrCodeBase64.startsWith('data:image/')) {
      return qrCodeBase64;
    }
    
    // Adiciona o prefixo data:image/png;base64, se necessário
    return `data:image/png;base64,${qrCodeBase64}`;
  }

  /**
   * Validar configuração do serviço
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.token) {
      errors.push('Token de autenticação não configurado');
    }

    if (!this.config.baseUrl) {
      errors.push('URL base não configurada');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const pushinPayService = new PushinPayService();