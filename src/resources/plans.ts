import type { HttpClient, RequestOptions } from "../http.js";
import type {
  AmountInCents,
  CulqiList,
  CurrencyCode,
  DeletedResource,
  InitialCycles,
  IntervalUnitTime,
  Metadata,
  PaginationParams,
  Plan,
} from "../types.js";

export interface CreatePlanParams {
  name: string;
  short_name: string;
  description: string;
  amount: AmountInCents;
  currency: CurrencyCode;
  interval_unit_time: IntervalUnitTime;
  interval_count: number;
  initial_cycles: InitialCycles;
  image?: string;
  metadata?: Metadata;
}

export interface UpdatePlanParams {
  name?: string;
  short_name?: string;
  description?: string;
  status?: number;
  image?: string;
  metadata?: Metadata;
}

/**
 * Recurrent plans. Note: the legacy `/v2/plans` endpoint is dead — the
 * current API lives under `/v2/recurrent/plans` (verified September 2026).
 * @see https://apidocs.culqi.com/ (Planes)
 */
export class Plans {
  readonly #http: HttpClient;

  constructor(http: HttpClient) {
    this.#http = http;
  }

  create(
    params: CreatePlanParams,
    options?: RequestOptions
  ): Promise<{ id: string; slug: string }> {
    return this.#http.request("POST", "/recurrent/plans/create", params, undefined, options);
  }

  get(id: string, options?: RequestOptions): Promise<Plan> {
    return this.#http.request("GET", `/recurrent/plans/${id}`, undefined, undefined, options);
  }

  list(
    params?: PaginationParams,
    options?: RequestOptions
  ): Promise<CulqiList<Plan>> {
    return this.#http.request("GET", "/recurrent/plans", undefined, params, options);
  }

  update(
    id: string,
    params: UpdatePlanParams,
    options?: RequestOptions
  ): Promise<Plan> {
    return this.#http.request("PATCH", `/recurrent/plans/${id}`, params, undefined, options);
  }

  delete(id: string, options?: RequestOptions): Promise<DeletedResource> {
    return this.#http.request("DELETE", `/recurrent/plans/${id}`, undefined, undefined, options);
  }
}
