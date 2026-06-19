import type { HttpClient } from '../core/http.js';
import { paginate, PaginatedResponse } from '../core/pagination.js';
import type { TimeEntry, TimeEntryCreate, TimeEntryUpdate } from '../generated/models.js';

export type TimeEntrySource = 'web' | 'cli' | 'api' | 'agent' | 'calendar' | 'desktop';
export type TimeEntryStart = Omit<TimeEntryCreate, 'hours' | 'ended_time' | 'is_running'>;

export interface TimeEntryStop {
  notes?: string | null;
}

export interface TimeEntryRestart {
  replace_running?: boolean;
}

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
  source?: TimeEntrySource;
}

export class TimeEntries {
  constructor(private readonly http: HttpClient) {}

  async list(params: ListTimeEntriesParams = {}): Promise<PaginatedResponse<TimeEntry>> {
    return paginate<TimeEntry>(this.http, '/api/v2/time_entries', 'time_entries', params);
  }

  async create(body: TimeEntryCreate): Promise<TimeEntry> {
    return this.http.request<TimeEntry>('POST', '/api/v2/time_entries', { body });
  }

  async startTimer(body: TimeEntryStart): Promise<TimeEntry> {
    return this.http.request<TimeEntry>('POST', '/api/v2/time_entries', {
      body: {
        ...body,
        is_running: true,
      },
    });
  }

  async update(id: string, body: TimeEntryUpdate): Promise<TimeEntry> {
    return this.http.request<TimeEntry>('PATCH', `/api/v2/time_entries/${id}`, { body });
  }

  async stopTimer(id: string, body: TimeEntryStop = {}): Promise<TimeEntry> {
    return this.http.request<TimeEntry>('PATCH', `/api/v2/time_entries/${id}/stop`, { body });
  }

  async restartTimer(id: string, body: TimeEntryRestart = {}): Promise<TimeEntry> {
    return this.http.request<TimeEntry>('PATCH', `/api/v2/time_entries/${id}/restart`, { body });
  }

  async delete(id: string): Promise<void> {
    await this.http.request<void>('DELETE', `/api/v2/time_entries/${id}`);
  }
}
