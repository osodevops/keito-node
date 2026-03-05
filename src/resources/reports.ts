import type { HttpClient } from '../core/http.js';
import { paginate, PaginatedResponse } from '../core/pagination.js';
import type { TeamTimeResult, TimeEntry } from '../generated/models.js';

export interface TeamTimeReportParams {
  page?: number;
  per_page?: number;
  from: string;
  to: string;
}

export interface AgentSummaryParams {
  user_id: string;
  from: string;
  to: string;
}

export interface AgentSummary {
  time: {
    total_hours: number;
    billable_hours: number;
    revenue: number;
  };
  outcomes: {
    total: number;
    successful: number;
    revenue: number;
  };
  combined: {
    total_revenue: number;
  };
}

export class Reports {
  constructor(private readonly http: HttpClient) {}

  async teamTime(params: TeamTimeReportParams): Promise<PaginatedResponse<TeamTimeResult>> {
    return paginate<TeamTimeResult>(
      this.http,
      '/api/v2/reports/time/team',
      'results',
      params,
    );
  }

  async agentSummary(params: AgentSummaryParams): Promise<AgentSummary> {
    const allEntries: TimeEntry[] = [];
    const page = await paginate<TimeEntry>(
      this.http,
      '/api/v2/time_entries',
      'time_entries',
      { user_id: params.user_id, from: params.from, to: params.to },
    );
    for await (const entry of page) {
      allEntries.push(entry);
    }

    let totalHours = 0;
    let billableHours = 0;
    let timeRevenue = 0;
    let outcomeTotal = 0;
    let outcomeSuccessful = 0;
    let outcomeRevenue = 0;

    for (const entry of allEntries) {
      const hours = entry.hours ?? 0;
      const meta = entry.metadata as Record<string, unknown> | null | undefined;
      const isOutcome = hours === 0 && meta && 'outcome_type' in meta;

      if (isOutcome) {
        outcomeTotal++;
        if (meta.outcome_success) outcomeSuccessful++;
        const unitPrice = (meta.outcome_unit_price as number) ?? 0;
        const quantity = (meta.outcome_quantity as number) ?? 1;
        outcomeRevenue += unitPrice * quantity;
      } else {
        totalHours += hours;
        if (entry.billable) {
          billableHours += hours;
          timeRevenue += hours * (entry.billable_rate ?? 0);
        }
      }
    }

    return {
      time: {
        total_hours: totalHours,
        billable_hours: billableHours,
        revenue: timeRevenue,
      },
      outcomes: {
        total: outcomeTotal,
        successful: outcomeSuccessful,
        revenue: outcomeRevenue,
      },
      combined: {
        total_revenue: timeRevenue + outcomeRevenue,
      },
    };
  }
}
