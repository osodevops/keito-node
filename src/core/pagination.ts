import type { HttpClient } from './http.js';

interface PaginationEnvelope<T> {
  page: number;
  per_page: number;
  total_pages: number;
  total_entries: number;
  [key: string]: unknown;
  // The data array key varies per resource (time_entries, expenses, etc.)
}

export class PaginatedResponse<T> {
  readonly data: T[];
  readonly page: number;
  readonly per_page: number;
  readonly total_pages: number;
  readonly total_entries: number;

  private readonly http: HttpClient;
  private readonly path: string;
  private readonly query: Record<string, unknown>;
  private readonly dataKey: string;

  constructor(
    raw: PaginationEnvelope<T>,
    dataKey: string,
    http: HttpClient,
    path: string,
    query: Record<string, unknown>,
  ) {
    this.data = (raw[dataKey] as T[]) ?? [];
    this.page = raw.page;
    this.per_page = raw.per_page;
    this.total_pages = raw.total_pages;
    this.total_entries = raw.total_entries;
    this.http = http;
    this.path = path;
    this.query = query;
    this.dataKey = dataKey;
  }

  hasNextPage(): boolean {
    return this.page < this.total_pages;
  }

  async nextPage(): Promise<PaginatedResponse<T>> {
    const nextQuery = { ...this.query, page: this.page + 1 };
    const raw = await this.http.request<PaginationEnvelope<T>>('GET', this.path, {
      query: nextQuery,
    });
    return new PaginatedResponse<T>(raw, this.dataKey, this.http, this.path, nextQuery);
  }

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let current: PaginatedResponse<T> = this;
    while (true) {
      for (const item of current.data) {
        yield item;
      }
      if (!current.hasNextPage()) break;
      current = await current.nextPage();
    }
  }
}

export async function paginate<T>(
  http: HttpClient,
  path: string,
  dataKey: string,
  query: object = {},
): Promise<PaginatedResponse<T>> {
  const q = query as Record<string, unknown>;
  const raw = await http.request<PaginationEnvelope<T>>('GET', path, { query: q });
  return new PaginatedResponse<T>(raw, dataKey, http, path, q);
}
