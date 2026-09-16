import type { HttpClient, RequestOptions } from "../http.js";
import type {
  CulqiList,
  DeletedResource,
  Metadata,
  PaginationParams,
  SavedCard,
} from "../types.js";

export interface CreateCardParams {
  customer_id: string;
  token_id: string;
  validate?: boolean;
  metadata?: Metadata;
}

export interface ListCardsParams extends PaginationParams {
  card_brand?: string;
  card_type?: string;
  country_code?: string;
  creation_date_from?: number;
  creation_date_to?: number;
}

/**
 * Saved cards (card-on-file). Use the resulting `crd_...` id as
 * `source_id` in `charges.create` for one-click payments.
 * @see https://apidocs.culqi.com/ (Tarjetas)
 */
export class Cards {
  readonly #http: HttpClient;

  constructor(http: HttpClient) {
    this.#http = http;
  }

  create(params: CreateCardParams, options?: RequestOptions): Promise<SavedCard> {
    return this.#http.request("POST", "/cards", params, undefined, options);
  }

  get(id: string, options?: RequestOptions): Promise<SavedCard> {
    return this.#http.request("GET", `/cards/${id}`, undefined, undefined, options);
  }

  list(
    params?: ListCardsParams,
    options?: RequestOptions
  ): Promise<CulqiList<SavedCard>> {
    return this.#http.request("GET", "/cards", undefined, params, options);
  }

  update(
    id: string,
    params: { token_id?: string; metadata?: Metadata },
    options?: RequestOptions
  ): Promise<SavedCard> {
    return this.#http.request("PATCH", `/cards/${id}`, params, undefined, options);
  }

  delete(id: string, options?: RequestOptions): Promise<DeletedResource> {
    return this.#http.request("DELETE", `/cards/${id}`, undefined, undefined, options);
  }
}
