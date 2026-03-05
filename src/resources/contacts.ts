import type { HttpClient } from '../core/http.js';
import { paginate, PaginatedResponse } from '../core/pagination.js';
import type { Contact, ContactCreate } from '../generated/models.js';

export interface ListContactsParams {
  page?: number;
  per_page?: number;
  client_id?: string;
  updated_since?: string;
}

export class Contacts {
  constructor(private readonly http: HttpClient) {}

  async list(params: ListContactsParams = {}): Promise<PaginatedResponse<Contact>> {
    return paginate<Contact>(this.http, '/api/v2/contacts', 'contacts', params);
  }

  async create(body: ContactCreate): Promise<Contact> {
    return this.http.request<Contact>('POST', '/api/v2/contacts', { body });
  }
}
