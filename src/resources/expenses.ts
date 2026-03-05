import type { HttpClient } from '../core/http.js';
import { paginate, PaginatedResponse } from '../core/pagination.js';
import type { Expense, ExpenseCreate } from '../generated/models.js';

export interface ListExpensesParams {
  page?: number;
  per_page?: number;
  user_id?: string;
  client_id?: string;
  project_id?: string;
  is_billed?: boolean;
  from?: string;
  to?: string;
  updated_since?: string;
  source?: 'web' | 'cli' | 'api' | 'agent';
}

export class Expenses {
  constructor(private readonly http: HttpClient) {}

  async list(params: ListExpensesParams = {}): Promise<PaginatedResponse<Expense>> {
    return paginate<Expense>(this.http, '/api/v2/expenses', 'expenses', params);
  }

  async create(body: ExpenseCreate): Promise<Expense> {
    return this.http.request<Expense>('POST', '/api/v2/expenses', { body });
  }
}
