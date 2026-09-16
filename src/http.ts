import { CulqiConnectionError, culqiErrorFromResponse } from "./errors.js";

export type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  }
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export interface RequestOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

/** Any params object; `undefined` values are dropped, the rest stringified. */
export type QueryParams = object;

export class HttpClient {
  readonly #key: string;
  readonly #baseUrl: string;
  readonly #fetch: FetchLike;
  readonly #userAgent: string;

  constructor(options: {
    key: string;
    baseUrl: string;
    fetch?: FetchLike;
    userAgent: string;
  }) {
    this.#key = options.key;
    this.#baseUrl = options.baseUrl.replace(/\/$/, "");
    this.#fetch = options.fetch ?? (globalThis.fetch as FetchLike);
    this.#userAgent = options.userAgent;
  }

  async request<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    body?: unknown,
    query?: QueryParams,
    options?: RequestOptions
  ): Promise<T> {
    let url = `${this.#baseUrl}${path}`;
    if (query) {
      const search = new URLSearchParams();
      for (const [key, value] of Object.entries(query) as [string, unknown][]) {
        if (value !== undefined) search.set(key, String(value));
      }
      const qs = search.toString();
      if (qs) url += `?${qs}`;
    }

    let response;
    try {
      response = await this.#fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.#key}`,
          "Content-Type": "application/json",
          "User-Agent": this.#userAgent,
          ...options?.headers,
        },
        ...(body !== undefined && { body: JSON.stringify(body) }),
        ...(options?.signal && { signal: options.signal }),
      });
    } catch (cause) {
      throw new CulqiConnectionError(
        `Request to ${url} failed before reaching Culqi`,
        cause
      );
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw culqiErrorFromResponse(
        response.status,
        data as Record<string, never>
      );
    }
    return data as T;
  }
}
