import type { FetchLike } from "./http.js";
import { HttpClient } from "./http.js";
import { Cards } from "./resources/cards.js";
import { Charges } from "./resources/charges.js";
import { Customers } from "./resources/customers.js";
import { Orders } from "./resources/orders.js";
import { Plans } from "./resources/plans.js";
import { Refunds } from "./resources/refunds.js";
import { Subscriptions } from "./resources/subscriptions.js";
import { Tokens } from "./resources/tokens.js";

export interface CulqiConfig {
  /** `sk_test_...` / `sk_live_...` — server-side only. */
  secretKey?: string;
  /** `pk_test_...` / `pk_live_...` — required only for `tokens.create`. */
  publicKey?: string;
  /** Override for `https://api.culqi.com/v2`. */
  apiBaseUrl?: string;
  /** Override for `https://secure.culqi.com/v2` (tokenization host). */
  secureBaseUrl?: string;
  fetch?: FetchLike;
}

const API_BASE_URL = "https://api.culqi.com/v2";
const SECURE_BASE_URL = "https://secure.culqi.com/v2";
const USER_AGENT = "jibaru-culqi-sdk/0.1.0";

/**
 * Culqi API client.
 * @see https://docs.culqi.com/
 * @see https://apidocs.culqi.com/
 *
 * ```ts
 * const culqi = new Culqi({ secretKey: process.env.CULQI_SECRET_KEY });
 * const charge = await culqi.charges.create({
 *   amount: 8000,
 *   currency_code: "PEN",
 *   email: "user@example.com",
 *   source_id: token.id,
 * });
 * ```
 */
export class Culqi {
  readonly #api: HttpClient | null;
  readonly #secure: HttpClient | null;

  #tokens?: Tokens;
  #charges?: Charges;
  #refunds?: Refunds;
  #customers?: Customers;
  #cards?: Cards;
  #orders?: Orders;
  #plans?: Plans;
  #subscriptions?: Subscriptions;

  constructor(config: CulqiConfig) {
    if (!config.secretKey && !config.publicKey) {
      throw new Error("Culqi requires at least one of `secretKey` or `publicKey`");
    }

    this.#api = config.secretKey
      ? new HttpClient({
          key: config.secretKey,
          baseUrl: config.apiBaseUrl ?? API_BASE_URL,
          userAgent: USER_AGENT,
          ...(config.fetch && { fetch: config.fetch }),
        })
      : null;
    this.#secure = config.publicKey
      ? new HttpClient({
          key: config.publicKey,
          baseUrl: config.secureBaseUrl ?? SECURE_BASE_URL,
          userAgent: USER_AGENT,
          ...(config.fetch && { fetch: config.fetch }),
        })
      : null;
  }

  #requireApi(resource: string): HttpClient {
    if (!this.#api) {
      throw new Error(`culqi.${resource} requires \`secretKey\` in the Culqi config`);
    }
    return this.#api;
  }

  get tokens(): Tokens {
    return (this.#tokens ??= new Tokens(this.#secure, this.#api));
  }

  get charges(): Charges {
    return (this.#charges ??= new Charges(this.#requireApi("charges")));
  }

  get refunds(): Refunds {
    return (this.#refunds ??= new Refunds(this.#requireApi("refunds")));
  }

  get customers(): Customers {
    return (this.#customers ??= new Customers(this.#requireApi("customers")));
  }

  get cards(): Cards {
    return (this.#cards ??= new Cards(this.#requireApi("cards")));
  }

  get orders(): Orders {
    return (this.#orders ??= new Orders(this.#requireApi("orders")));
  }

  get plans(): Plans {
    return (this.#plans ??= new Plans(this.#requireApi("plans")));
  }

  get subscriptions(): Subscriptions {
    return (this.#subscriptions ??= new Subscriptions(this.#requireApi("subscriptions")));
  }
}

export * from "./errors.js";
export * from "./types.js";
export * from "./webhooks.js";
export type { CreateTokenParams } from "./resources/tokens.js";
export type { CreateChargeParams, ListChargesParams } from "./resources/charges.js";
export type { CreateRefundParams } from "./resources/refunds.js";
export type {
  CreateCustomerParams,
  ListCustomersParams,
  UpdateCustomerParams,
} from "./resources/customers.js";
export type { CreateCardParams, ListCardsParams } from "./resources/cards.js";
export type { CreateOrderParams, ListOrdersParams } from "./resources/orders.js";
export type { CreatePlanParams, UpdatePlanParams } from "./resources/plans.js";
export type { CreateSubscriptionParams } from "./resources/subscriptions.js";
export type { FetchLike, RequestOptions, QueryParams } from "./http.js";
