import type { HttpClient, RequestOptions } from "../http.js";
import type {
  CulqiList,
  Customer,
  DeletedResource,
  Metadata,
  PaginationParams,
} from "../types.js";

export interface CreateCustomerParams {
  first_name: string;
  last_name: string;
  email: string;
  address: string;
  address_city: string;
  country_code: string;
  phone_number: string;
  metadata?: Metadata;
}

export interface UpdateCustomerParams {
  first_name?: string;
  last_name?: string;
  address?: string;
  address_city?: string;
  country_code?: string;
  phone_number?: string;
  metadata?: Metadata;
}

export interface ListCustomersParams extends PaginationParams {
  first_name?: string;
  last_name?: string;
  email?: string;
  address?: string;
  address_city?: string;
  phone_number?: string;
  country_code?: string;
}

/**
 * Customers, required for saving cards (card-on-file) and subscriptions.
 * @see https://apidocs.culqi.com/ (Clientes)
 */
export class Customers {
  readonly #http: HttpClient;

  constructor(http: HttpClient) {
    this.#http = http;
  }

  create(params: CreateCustomerParams, options?: RequestOptions): Promise<Customer> {
    return this.#http.request("POST", "/customers", params, undefined, options);
  }

  get(id: string, options?: RequestOptions): Promise<Customer> {
    return this.#http.request("GET", `/customers/${id}`, undefined, undefined, options);
  }

  list(
    params?: ListCustomersParams,
    options?: RequestOptions
  ): Promise<CulqiList<Customer>> {
    return this.#http.request("GET", "/customers", undefined, params, options);
  }

  update(
    id: string,
    params: UpdateCustomerParams,
    options?: RequestOptions
  ): Promise<Customer> {
    return this.#http.request("PATCH", `/customers/${id}`, params, undefined, options);
  }

  delete(id: string, options?: RequestOptions): Promise<DeletedResource> {
    return this.#http.request("DELETE", `/customers/${id}`, undefined, undefined, options);
  }
}
