import type { HttpClient } from '../core/http.js';
import { paginate, PaginatedResponse } from '../core/pagination.js';
import type {
  Invoice,
  InvoiceCreate,
  InvoiceUpdate,
  InvoiceMessage,
  InvoiceMessageCreate,
} from '../generated/models.js';

export interface ListInvoicesParams {
  page?: number;
  per_page?: number;
  client_id?: string;
  state?: 'draft' | 'open' | 'paid' | 'closed';
  from?: string;
  to?: string;
  updated_since?: string;
}

export interface ListInvoiceMessagesParams {
  page?: number;
  per_page?: number;
}

export class InvoiceMessages {
  constructor(private readonly http: HttpClient) {}

  async list(
    invoiceId: string,
    params: ListInvoiceMessagesParams = {},
  ): Promise<PaginatedResponse<InvoiceMessage>> {
    return paginate<InvoiceMessage>(
      this.http,
      `/api/v2/invoices/${invoiceId}/messages`,
      'invoice_messages',
      params,
    );
  }

  async send(invoiceId: string, body: InvoiceMessageCreate): Promise<InvoiceMessage> {
    return this.http.request<InvoiceMessage>(
      'POST',
      `/api/v2/invoices/${invoiceId}/messages`,
      { body },
    );
  }
}

export class Invoices {
  readonly messages: InvoiceMessages;

  constructor(private readonly http: HttpClient) {
    this.messages = new InvoiceMessages(http);
  }

  async list(params: ListInvoicesParams = {}): Promise<PaginatedResponse<Invoice>> {
    return paginate<Invoice>(this.http, '/api/v2/invoices', 'invoices', params);
  }

  async get(id: string): Promise<Invoice> {
    return this.http.request<Invoice>('GET', `/api/v2/invoices/${id}`);
  }

  async create(body: InvoiceCreate): Promise<Invoice> {
    return this.http.request<Invoice>('POST', '/api/v2/invoices', { body });
  }

  async update(id: string, body: InvoiceUpdate): Promise<Invoice> {
    return this.http.request<Invoice>('PATCH', `/api/v2/invoices/${id}`, { body });
  }

  async delete(id: string): Promise<{ id?: string; deleted?: boolean }> {
    return this.http.request<{ id?: string; deleted?: boolean }>(
      'DELETE',
      `/api/v2/invoices/${id}`,
    );
  }
}
