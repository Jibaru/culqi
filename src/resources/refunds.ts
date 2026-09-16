import type { HttpClient, RequestOptions } from "../http.js";
import type {
  AmountInCents,
  CulqiList,
  Metadata,
  PaginationParams,
  Refund,
  RefundReason,
} from "../types.js";

export interface CreateRefundParams {
  charge_id: string;
  /** Partial refunds are allowed; must not exceed the remaining amount. */
  amount: AmountInCents;
  reason: RefundReason;
  metadata?: Metadata;
}

/**
 * Refunds. A full refund on an uncaptured charge releases the
 * pre-authorization hold (verified against the integration environment).
 * @see https://apidocs.culqi.com/ (Devoluciones)
 */
export class Refunds {
  readonly #http: HttpClient;

  constructor(http: HttpClient) {
    this.#http = http;
  }

  create(params: CreateRefundParams, options?: RequestOptions): Promise<Refund> {
    return this.#http.request("POST", "/refunds", params, undefined, options);
  }

  get(id: string, options?: RequestOptions): Promise<Refund> {
    return this.#http.request("GET", `/refunds/${id}`, undefined, undefined, options);
  }

  list(
    params?: PaginationParams,
    options?: RequestOptions
  ): Promise<CulqiList<Refund>> {
    return this.#http.request("GET", "/refunds", undefined, params, options);
  }

  update(
    id: string,
    params: { metadata: Metadata },
    options?: RequestOptions
  ): Promise<Refund> {
    return this.#http.request("PATCH", `/refunds/${id}`, params, undefined, options);
  }
}
