import type { HttpClient, RequestOptions } from "../http.js";
import type {
  AmountInCents,
  Charge,
  CulqiList,
  CurrencyCode,
  Metadata,
  PaginationParams,
} from "../types.js";

export interface CreateChargeParams {
  amount: AmountInCents;
  currency_code: CurrencyCode;
  email: string;
  /** A token (`tkn_...`) or a saved card (`crd_...`). */
  source_id: string;
  description?: string;
  /** `false` holds the amount without charging; capture later with `capture()`. */
  capture?: boolean;
  installments?: number;
  antifraud_details?: {
    first_name?: string;
    last_name?: string;
    address?: string;
    address_city?: string;
    country_code?: string;
    phone_number?: string;
  };
  /** 3DS authentication fields, when the issuer requires them. */
  authentication_3DS?: Record<string, string>;
  metadata?: Metadata;
}

export interface ListChargesParams extends PaginationParams {
  amount?: AmountInCents;
  min_amount?: AmountInCents;
  max_amount?: AmountInCents;
  email?: string;
  currency_code?: CurrencyCode;
  code?: string;
  decline_code?: string;
  fraud_score?: number;
  first_brand?: string;
  installments?: number;
  paid?: boolean;
  disputed?: boolean;
  captured?: boolean;
  duplicated?: boolean;
  country_code?: string;
  creation_date_from?: number;
  creation_date_to?: number;
}

/**
 * Charges: immediate payments and pre-authorizations.
 * The create response is synchronous and final for card/Yape sources —
 * `outcome.type === "venta_exitosa"` means the payment went through.
 * @see https://apidocs.culqi.com/ (Cargos)
 */
export class Charges {
  readonly #http: HttpClient;

  constructor(http: HttpClient) {
    this.#http = http;
  }

  create(params: CreateChargeParams, options?: RequestOptions): Promise<Charge> {
    return this.#http.request("POST", "/charges", params, undefined, options);
  }

  get(id: string, options?: RequestOptions): Promise<Charge> {
    return this.#http.request("GET", `/charges/${id}`, undefined, undefined, options);
  }

  list(
    params?: ListChargesParams,
    options?: RequestOptions
  ): Promise<CulqiList<Charge>> {
    return this.#http.request("GET", "/charges", undefined, params, options);
  }

  /** Charge a pre-authorization created with `capture: false`. */
  capture(id: string, options?: RequestOptions): Promise<Charge> {
    return this.#http.request("POST", `/charges/${id}/capture`, undefined, undefined, options);
  }

  update(
    id: string,
    params: { metadata: Metadata },
    options?: RequestOptions
  ): Promise<Charge> {
    return this.#http.request("PATCH", `/charges/${id}`, params, undefined, options);
  }
}
