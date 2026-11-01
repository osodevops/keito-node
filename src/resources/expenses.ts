import type { HttpClient, RequestOptions } from '../core/http.js';
import { paginate, PaginatedResponse } from '../core/pagination.js';
import type { Expense, ExpenseCreate, ExpenseUpdate, ExpenseReceipt } from '../generated/models.js';
import type { operations } from '../generated/openapi.js';

export type ListExpensesParams = NonNullable<operations['listExpenses']['parameters']['query']>;

export class Expenses {
  constructor(private readonly http: HttpClient) {}

  async list(params: ListExpensesParams = {}): Promise<PaginatedResponse<Expense>> {
    return paginate<Expense>(this.http, '/api/v2/expenses', 'expenses', params);
  }

  async get(id: string): Promise<Expense> {
    return this.http.request<Expense>('GET', `/api/v2/expenses/${encodeURIComponent(id)}`);
  }

  async create(body: ExpenseCreate, options: RequestOptions = {}): Promise<Expense> {
    return this.http.request<Expense>('POST', '/api/v2/expenses', { ...options, body });
  }

  async update(id: string, body: ExpenseUpdate, options: RequestOptions = {}): Promise<Expense> {
    return this.http.request<Expense>('PATCH', `/api/v2/expenses/${encodeURIComponent(id)}`, { ...options, body });
  }

  async delete(id: string, options: RequestOptions = {}): Promise<void> {
    await this.http.request('DELETE', `/api/v2/expenses/${encodeURIComponent(id)}`, options);
  }

  async downloadReceipt(id: string): Promise<Blob> {
    return this.http.request<Blob>('GET', `/api/v2/expenses/${encodeURIComponent(id)}/receipt`, { responseType: 'blob' });
  }

  async uploadReceipt(id: string, file: Blob, fileName: string): Promise<ExpenseReceipt> {
    const formData = new FormData();
    formData.set('file', file, fileName);
    return this.http.request<ExpenseReceipt>('POST', `/api/v2/expenses/${encodeURIComponent(id)}/receipt`, { formData, retry: false });
  }

  async deleteReceipt(id: string): Promise<void> {
    await this.http.request('DELETE', `/api/v2/expenses/${encodeURIComponent(id)}/receipt`, { retry: false });
  }
}
