import type { HttpClient } from '../core/http.js';
import type { TimeEntry } from '../generated/models.js';

export interface OutcomeLogParams {
  project_id: string;
  task_id: string;
  spent_date: string;
  source?: 'agent';
  outcome: {
    type: string;
    description: string;
    unit_price: number;
    quantity: number;
    success: boolean;
    evidence?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
}

export class Outcomes {
  constructor(private readonly http: HttpClient) {}

  async log(params: OutcomeLogParams): Promise<TimeEntry> {
    const metadata: Record<string, unknown> = {
      ...params.metadata,
      outcome_type: params.outcome.type,
      outcome_unit_price: params.outcome.unit_price,
      outcome_quantity: params.outcome.quantity,
      outcome_success: params.outcome.success,
    };

    if (params.outcome.evidence) {
      metadata.outcome_evidence = params.outcome.evidence;
    }

    return this.http.request<TimeEntry>('POST', '/api/v2/time_entries', {
      body: {
        project_id: params.project_id,
        task_id: params.task_id,
        spent_date: params.spent_date,
        hours: 0,
        billable: true,
        source: params.source ?? 'agent',
        notes: params.outcome.description,
        metadata,
      },
    });
  }
}
