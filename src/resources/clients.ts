import type { HttpClient } from '../core/http.js';
import { paginate, PaginatedResponse } from '../core/pagination.js';
import type { Client, ClientCreate } from '../generated/models.js';

export interface ListClientsParams {
  page?: number;
  per_page?: number;
  is_active?: boolean;
  updated_since?: string;
}

export class Clients {
  constructor(private readonly http: HttpClient) {}

  async list(params: ListClientsParams = {}): Promise<PaginatedResponse<Client>> {
    return paginate<Client>(this.http, '/api/v2/clients', 'clients', params);
  }

  async get(id: string): Promise<Client> {
    return this.http.request<Client>('GET', `/api/v2/clients/${id}`);
  }

  async create(body: ClientCreate): Promise<Client> {
    return this.http.request<Client>('POST', '/api/v2/clients', { body });
  }

  async update(id: string, body: ClientCreate): Promise<Client> {
    return this.http.request<Client>('PATCH', `/api/v2/clients/${id}`, { body });
  }
}
