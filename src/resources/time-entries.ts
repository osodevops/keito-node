import type { HttpClient, RequestOptions } from '../core/http.js';
import { paginate, PaginatedResponse } from '../core/pagination.js';
import type { TimeEntry, TimeEntryCreate, TimeEntryUpdate } from '../generated/models.js';
import type { operations } from '../generated/openapi.js';

export type TimeEntrySource = NonNullable<TimeEntryCreate['source']>;
export type TimeEntryStart = Omit<TimeEntryCreate, 'hours' | 'ended_time' | 'is_running'>;

export interface TimeEntryStop {
  notes?: string | null;
}

export interface TimeEntryRestart {
  replace_running?: boolean;
}

export type ListTimeEntriesParams = NonNullable<operations['listTimeEntries']['parameters']['query']>;

export class TimeEntries {
  constructor(private readonly http: HttpClient) {}

  async list(params: ListTimeEntriesParams = {}): Promise<PaginatedResponse<TimeEntry>> {
    return paginate<TimeEntry>(this.http, '/api/v2/time_entries', 'time_entries', params);
  }

  async create(body: TimeEntryCreate, options: RequestOptions = {}): Promise<TimeEntry> {
    return this.http.request<TimeEntry>('POST', '/api/v2/time_entries', { ...options, body });
  }

  async startTimer(body: TimeEntryStart, options: RequestOptions = {}): Promise<TimeEntry> {
    return this.http.request<TimeEntry>('POST', '/api/v2/time_entries', {
      ...options, body: {
        ...body,
        is_running: true,
      },
    });
  }

  async update(id: string, body: TimeEntryUpdate, options: RequestOptions = {}): Promise<TimeEntry> {
    return this.http.request<TimeEntry>('PATCH', `/api/v2/time_entries/${encodeURIComponent(id)}`, { ...options, body });
  }

  async stopTimer(id: string, body: TimeEntryStop = {}, options: RequestOptions = {}): Promise<TimeEntry> {
    return this.http.request<TimeEntry>('PATCH', `/api/v2/time_entries/${encodeURIComponent(id)}/stop`, { ...options, body });
  }

  async restartTimer(id: string, body: TimeEntryRestart = {}, options: RequestOptions = {}): Promise<TimeEntry> {
    return this.http.request<TimeEntry>('PATCH', `/api/v2/time_entries/${encodeURIComponent(id)}/restart`, { ...options, body });
  }

  async delete(id: string, options: RequestOptions = {}): Promise<void> {
    await this.http.request<void>('DELETE', `/api/v2/time_entries/${encodeURIComponent(id)}`, options);
  }
}
