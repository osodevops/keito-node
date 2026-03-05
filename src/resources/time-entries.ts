import type { HttpClient } from '../core/http.js';
import { paginate, PaginatedResponse } from '../core/pagination.js';
import type { TimeEntry, TimeEntryCreate, TimeEntryUpdate } from '../generated/models.js';

export interface ListTimeEntriesParams {
  page?: number;
  per_page?: number;
  user_id?: string;
  client_id?: string;
  project_id?: string;
  task_id?: string;
  is_billed?: boolean;
  is_running?: boolean;
  from?: string;
  to?: string;
  updated_since?: string;
  source?: 'web' | 'cli' | 'api' | 'agent';
}

export class TimeEntries {
  constructor(private readonly http: HttpClient) {}

  async list(params: ListTimeEntriesParams = {}): Promise<PaginatedResponse<TimeEntry>> {
    return paginate<TimeEntry>(this.http, '/api/v2/time_entries', 'time_entries', params);
  }

  async create(body: TimeEntryCreate): Promise<TimeEntry> {
    return this.http.request<TimeEntry>('POST', '/api/v2/time_entries', { body });
  }

  async update(id: string, body: TimeEntryUpdate): Promise<TimeEntry> {
    return this.http.request<TimeEntry>('PATCH', `/api/v2/time_entries/${id}`, { body });
  }

  async delete(id: string): Promise<void> {
    await this.http.request<void>('DELETE', `/api/v2/time_entries/${id}`);
  }
}
