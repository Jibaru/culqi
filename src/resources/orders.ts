import type { HttpClient, RequestOptions } from "../http.js";
import type {
  AmountInCents,
  CulqiList,
  CurrencyCode,
  DeletedResource,
  Metadata,
  Order,
  OrderClientDetails,
  PaginationParams,
} from "../types.js";

export interface CreateOrderParams {
  amount: AmountInCents;
  currency_code: CurrencyCode;
  description: string;
  order_number: string;
  client_details: OrderClientDetails;
  /** Unix timestamp (seconds). */
  expiration_date: number;
  confirm?: boolean;
  metadata?: Metadata;
}

export interface ListOrdersParams extends PaginationParams {
  amount?: AmountInCents;
  min_amount?: AmountInCents;
  max_amount?: AmountInCents;
  creation_date_from?: number;
  creation_date_to?: number;
  state?: string;
}

/**
 * Orders power asynchronous payment methods (PagoEfectivo, mobile banking,
 * agents, Cuotealo). The order starts in `created`/`pending` and you learn
 * about payment through the `order.status.changed` webhook or by polling.
 * @see https://docs.culqi.com/es/documentacion/pagos-online/ordenes-de-pago/resumen/
 */
export class Orders {
  readonly #http: HttpClient;

  constructor(http: HttpClient) {
    this.#http = http;
  }

  create(params: CreateOrderParams, options?: RequestOptions): Promise<Order> {
    return this.#http.request("POST", "/orders", params, undefined, options);
  }

  get(id: string, options?: RequestOptions): Promise<Order> {
    return this.#http.request("GET", `/orders/${id}`, undefined, undefined, options);
  }

  list(
    params?: ListOrdersParams,
    options?: RequestOptions
  ): Promise<CulqiList<Order>> {
    return this.#http.request("GET", "/orders", undefined, params, options);
  }

  /** Confirm the order so Culqi generates the payment code (CIP). */
  confirm(id: string, options?: RequestOptions): Promise<Order> {
    return this.#http.request("POST", `/orders/${id}/confirm`, undefined, undefined, options);
  }

  update(
    id: string,
    params: { expiration_date?: number; metadata?: Metadata },
    options?: RequestOptions
  ): Promise<Order> {
    return this.#http.request("PATCH", `/orders/${id}`, params, undefined, options);
  }

  delete(id: string, options?: RequestOptions): Promise<DeletedResource> {
    return this.#http.request("DELETE", `/orders/${id}`, undefined, undefined, options);
  }
}
