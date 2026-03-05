import type { HttpClient } from '../core/http.js';
import { paginate, PaginatedResponse } from '../core/pagination.js';
import type { Task } from '../generated/models.js';

export interface ListTasksParams {
  page?: number;
  per_page?: number;
  is_active?: boolean;
  updated_since?: string;
}

export class Tasks {
  constructor(private readonly http: HttpClient) {}

  async list(params: ListTasksParams = {}): Promise<PaginatedResponse<Task>> {
    return paginate<Task>(this.http, '/api/v2/tasks', 'tasks', params);
  }
}
