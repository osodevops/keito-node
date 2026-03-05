import { VERSION } from '../version.js';
import {
  KeitoApiError,
  KeitoAuthError,
  KeitoConnectionError,
  KeitoConflictError,
  KeitoForbiddenError,
  KeitoNotFoundError,
  KeitoRateLimitError,
  KeitoTimeoutError,
} from './errors.js';

export interface KeitoClientOptions {
  apiKey: string;
  accountId: string;
  baseUrl?: string;
  maxRetries?: number;
  timeout?: number;
}

const DEFAULT_BASE_URL = 'https://app.keito.io';
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 30_000;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

export class HttpClient {
  readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly accountId: string;
  private readonly maxRetries: number;
  private readonly timeout: number;

  constructor(options: KeitoClientOptions) {
    this.apiKey = options.apiKey;
    this.accountId = options.accountId;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
  }

  async request<T>(
    method: string,
    path: string,
    options?: { body?: unknown; query?: Record<string, unknown> },
  ): Promise<T> {
    const url = this.buildUrl(path, options?.query);
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Keito-Account-Id': this.accountId,
      'User-Agent': `keito-node-sdk/${VERSION}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        await this.sleep(this.backoff(attempt, lastError));
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          method,
          headers,
          body: options?.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (response.ok) {
          if (response.status === 204) return undefined as T;
          return (await response.json()) as T;
        }

        const error = await this.parseError(response);

        if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < this.maxRetries) {
          lastError = error;
          continue;
        }

        throw error;
      } catch (err) {
        clearTimeout(timer);

        if (err instanceof KeitoApiError) throw err;

        if (err instanceof DOMException && err.name === 'AbortError') {
          if (attempt < this.maxRetries) {
            lastError = new KeitoTimeoutError();
            continue;
          }
          throw new KeitoTimeoutError();
        }

        if (attempt < this.maxRetries) {
          lastError = err instanceof Error ? err : new Error(String(err));
          continue;
        }

        throw new KeitoConnectionError(
          err instanceof Error ? err : undefined,
        );
      }
    }

    throw lastError ?? new KeitoConnectionError();
  }

  private buildUrl(path: string, query?: Record<string, unknown>): string {
    const url = new URL(path, this.baseUrl);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private async parseError(response: Response): Promise<KeitoApiError> {
    let error = 'unknown_error';
    let error_description = '';

    try {
      const body = await response.json();
      error = body.error ?? error;
      error_description = body.error_description ?? '';
    } catch {
      // response body not JSON
    }

    const headers = response.headers;
    const status = response.status;

    switch (status) {
      case 401:
        return new KeitoAuthError(error, error_description, headers);
      case 403:
        return new KeitoForbiddenError(error, error_description, headers);
      case 404:
        return new KeitoNotFoundError(error, error_description, headers);
      case 409:
        return new KeitoConflictError(error, error_description, headers);
      case 429:
        return new KeitoRateLimitError(error, error_description, headers);
      default:
        return new KeitoApiError(status, error, error_description, headers);
    }
  }

  private backoff(attempt: number, lastError?: Error): number {
    if (lastError instanceof KeitoRateLimitError && lastError.retryAfter) {
      return lastError.retryAfter * 1000;
    }
    const base = Math.min(2 ** (attempt - 1) * 500, 8000);
    const jitter = Math.random() * base * 0.5;
    return base + jitter;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
