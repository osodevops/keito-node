import type { HttpClient } from '../core/http.js';
import { paginate, PaginatedResponse } from '../core/pagination.js';
import type { Project } from '../generated/models.js';

export interface ListProjectsParams {
  page?: number;
  per_page?: number;
  is_active?: boolean;
  client_id?: string;
  updated_since?: string;
}

export class Projects {
  constructor(private readonly http: HttpClient) {}

  async list(params: ListProjectsParams = {}): Promise<PaginatedResponse<Project>> {
    return paginate<Project>(this.http, '/api/v2/projects', 'projects', params);
  }
}
