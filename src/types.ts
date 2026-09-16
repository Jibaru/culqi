/**
 * Object types for the Culqi API v2, based on the official docs and verified
 * against the integration environment (September 2026).
 * @see https://apidocs.culqi.com/
 * @see https://docs.culqi.com/
 */

/** Amounts are always integers in cents (S/ 80.00 = 8000). */
export type AmountInCents = number;

export type CurrencyCode = "PEN" | "USD";

export interface CulqiList<T> {
  data: T[];
  paging?: {
    previous?: string | null;
    next?: string | null;
    cursors?: { before?: string; after?: string };
  };
  cursors?: { before?: string; after?: string };
  remaining_items?: number | null;
}

export interface PaginationParams {
  limit?: number;
  before?: string;
  after?: string;
}

export type Metadata = Record<string, string | number>;

export interface Iin {
  object: "iin";
  bin?: string;
  card_brand?: string;
  card_type?: string;
  card_category?: string;
  issuer?: {
    name?: string;
    country?: string;
    country_code?: string;
    website?: string;
    phone_number?: string;
  };
  installments_allowed?: number[];
}

export interface Token {
  object: "token";
  id: string;
  type: string;
  creation_date: number;
  email: string;
  card_number: string;
  last_four: string;
  active: boolean;
  iin?: Iin;
  client?: {
    ip?: string;
    ip_country?: string;
    ip_country_code?: string;
    browser?: string | null;
    device_fingerprint?: string | null;
    device_type?: string | null;
  };
  metadata?: Metadata;
}

export interface Outcome {
  type: string;
  code: string;
  decline_code?: string;
  merchant_message?: string;
  user_message?: string;
}

export interface Charge {
  object: "charge";
  id: string;
  creation_date: number;
  amount: AmountInCents;
  amount_refunded: AmountInCents;
  current_amount: AmountInCents;
  installments: number;
  installments_amount: AmountInCents | null;
  currency_code: CurrencyCode;
  email: string;
  description: string | null;
  /** `false` while a pre-authorization is held but not yet captured. */
  capture: boolean;
  capture_date: number | null;
  reference_code: string | null;
  authorization_code: string | null;
  duplicated: boolean | null;
  paid: boolean | null;
  statement_descriptor: string | null;
  transfer_id: string | null;
  outcome: Outcome | null;
  fraud_score: number | null;
  dispute: boolean | null;
  fee_details: unknown;
  total_fee: AmountInCents | null;
  net_amount: AmountInCents | null;
  source: Token | SavedCard | null;
  metadata?: Metadata;
  antifraud_details?: unknown;
  operations?: unknown[];
}

export interface Refund {
  object: "refund";
  id: string;
  charge_id: string;
  creation_date: number;
  amount: AmountInCents;
  reason: string;
  status: string;
  last_modified?: number;
  metadata?: Metadata;
}

export type RefundReason = "duplicado" | "fraudulento" | "solicitud_comprador";

export interface Customer {
  object: "customer";
  id: string;
  creation_date: number;
  email: string;
  antifraud_details?: {
    object?: "client";
    first_name?: string;
    last_name?: string;
    address?: string;
    address_city?: string;
    country_code?: string;
    phone?: string;
  };
  cards?: SavedCard[];
  metadata?: Metadata;
}

export interface SavedCard {
  object: "card";
  id: string;
  active: boolean;
  creation_date: number;
  customer_id: string;
  source: Token;
  metadata?: Metadata;
}

export type OrderState =
  | "created"
  | "pending"
  | "paid"
  | "expired"
  | "deleted";

export interface Order {
  object: "order";
  id: string;
  amount: AmountInCents;
  currency_code: CurrencyCode;
  description: string;
  order_number: string;
  state: OrderState | string;
  payment_code: string | null;
  cip_url?: string | null;
  creation_date: number;
  expiration_date: number;
  updated_at: number | null;
  paid_at: number | null;
  available_on?: number | null;
  total_fee?: AmountInCents | null;
  net_amount?: AmountInCents | null;
  fee_details?: unknown;
  qr?: string | null;
  client_details?: OrderClientDetails;
  metadata?: Metadata;
}

export interface OrderClientDetails {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
}

/**
 * Billing interval unit for recurrent plans:
 * 1 = daily, 2 = weekly, 3 = monthly, 4 = yearly (per Culqi's recurrent API).
 * @see https://apidocs.culqi.com/ (Planes)
 */
export type IntervalUnitTime = 1 | 2 | 3 | 4;

export interface InitialCycles {
  count: number;
  has_initial_charge: boolean;
  amount: AmountInCents;
  interval_unit_time: IntervalUnitTime;
}

export interface Plan {
  object?: "plan";
  id: string;
  creation_date: number;
  name: string;
  description: string;
  short_name: string;
  amount: AmountInCents;
  currency: CurrencyCode;
  interval_unit_time: IntervalUnitTime;
  interval_count: number;
  initial_cycles: InitialCycles;
  image: string | null;
  total_subscriptions: number;
  status: number;
  slug: string;
  metadata?: Metadata;
}

export interface Subscription {
  id: string;
  creation_date?: number;
  created_at?: number;
  status: number;
  customer_id?: string;
  plan_id?: string;
  next_billing_date?: number;
  current_period?: number;
  trial_start?: number | null;
  trial_end?: number | null;
  active_card?: string;
  plan?: {
    plan_id: string;
    name: string;
    amount: AmountInCents;
    currency: CurrencyCode;
    interval_unit_time: IntervalUnitTime;
  };
  periods?: unknown[];
  metadata?: Metadata;
}

export interface DeletedResource {
  id: string;
  deleted: boolean;
  merchant_message?: string;
}
