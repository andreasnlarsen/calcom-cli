import { API_VERSIONS, type EndpointKey } from '../constants.js';
import { CliError } from '../errors.js';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  endpoint: EndpointKey;
  body?: unknown;
  query?: Record<string, string | undefined>;
}

export class CalApiClient {
  constructor(private readonly apiKey: string, private readonly baseUrl: string) {}

  async request<T>(path: string, options: RequestOptions): Promise<T> {
    const method = options.method ?? 'GET';
    const url = new URL(path, this.baseUrl);

    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined && value !== '') {
          url.searchParams.set(key, value);
        }
      }
    }

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'cal-api-version': API_VERSIONS[options.endpoint],
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text();
    const parsed = text ? safeParseJson(text) : undefined;

    if (!response.ok) {
      const message =
        extractApiErrorMessage(parsed) ??
        `Cal.com API request failed (${response.status} ${response.statusText})`;
      throw new CliError(message, 'API_ERROR', {
        status: response.status,
        statusText: response.statusText,
        body: parsed ?? text,
      });
    }

    return (parsed as T) ?? ({} as T);
  }
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function extractApiErrorMessage(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const record = value as Record<string, unknown>;

  const direct = record.message;
  if (typeof direct === 'string' && direct.trim()) {
    return direct;
  }

  const error = record.error;
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error && typeof error === 'object') {
    const nested = (error as Record<string, unknown>).message;
    if (typeof nested === 'string' && nested.trim()) {
      return nested;
    }
  }

  return undefined;
}
