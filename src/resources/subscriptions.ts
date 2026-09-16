import type { HttpClient, RequestOptions } from "../http.js";
import type {
  CulqiList,
  DeletedResource,
  Metadata,
  PaginationParams,
  Subscription,
} from "../types.js";

export interface CreateSubscriptionParams {
  card_id: string;
  plan_id: string;
  /** Terms and conditions acceptance; required by the API. */
  tyc: boolean;
  metadata?: Metadata;
}

/**
 * Recurrent subscriptions: a saved card subscribed to a plan.
 * Lives under `/v2/recurrent/subscriptions` (verified September 2026).
 * @see https://apidocs.culqi.com/ (Suscripciones)
 */
export class Subscriptions {
  readonly #http: HttpClient;

  constructor(http: HttpClient) {
    this.#http = http;
  }

  create(
    params: CreateSubscriptionParams,
    options?: RequestOptions
  ): Promise<Subscription> {
    return this.#http.request("POST", "/recurrent/subscriptions/create", params, undefined, options);
  }

  get(id: string, options?: RequestOptions): Promise<Subscription> {
    return this.#http.request("GET", `/recurrent/subscriptions/${id}`, undefined, undefined, options);
  }

  list(
    params?: PaginationParams,
    options?: RequestOptions
  ): Promise<CulqiList<Subscription>> {
    return this.#http.request("GET", "/recurrent/subscriptions", undefined, params, options);
  }

  update(
    id: string,
    params: { card_id?: string; metadata?: Metadata },
    options?: RequestOptions
  ): Promise<Subscription> {
    return this.#http.request("PATCH", `/recurrent/subscriptions/${id}`, params, undefined, options);
  }

  delete(id: string, options?: RequestOptions): Promise<DeletedResource> {
    return this.#http.request("DELETE", `/recurrent/subscriptions/${id}`, undefined, undefined, options);
  }
}
