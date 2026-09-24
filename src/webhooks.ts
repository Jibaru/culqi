/**
 * Webhook helpers. Configure endpoints in CulqiPanel → Eventos → Webhooks.
 *
 * Culqi does NOT sign its webhooks (no HMAC header). Recommended defense:
 * 1. Turn on "Activar autenticación" when creating the webhook and check the
 *    credentials with `verifyWebhookBasicAuth`. Culqi sends them as HTTP Basic
 *    auth; the username is capped at 20 characters. If the panel you are on has
 *    no such toggle, fall back to a private token in the URL (`?token=...`).
 * 2. Treat the payload as a hint: re-fetch the resource with your secret key
 *    (e.g. `culqi.charges.get(id)`) before acting on it.
 * @see https://docs.culqi.com/es/documentacion/pagos-online/webhooks/
 */

export type KnownWebhookEventType =
  | "token.creation.succeeded"
  | "charge.creation.succeeded"
  | "charge.creation.failed"
  | "refund.creation.succeeded"
  | "order.status.changed"
  | (string & {});

export interface WebhookEvent<T = unknown> {
  object: "event";
  type: KnownWebhookEventType;
  data: T;
  id?: string;
  creation_date?: number;
}

export class WebhookParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookParseError";
  }
}

/** Constant-time string compare, so a wrong password leaks nothing through timing. */
function safeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  // Comparing lengths early would leak them; mix the difference into the result.
  let diff = left.length ^ right.length;
  const max = Math.max(left.length, right.length);
  for (let i = 0; i < max; i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

function decodeBase64(value: string): string | null {
  try {
    if (typeof atob === "function") {
      const binary = atob(value);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }
    return Buffer.from(value, "base64").toString("utf8");
  } catch {
    return null;
  }
}

export interface WebhookBasicAuth {
  username: string;
  password: string;
}

/**
 * Check the `Authorization` header Culqi sends when the webhook has
 * "Activar autenticación" on. Pass the raw header value (or the `Request`).
 *
 * ```ts
 * if (!verifyWebhookBasicAuth(req, { username: process.env.CULQI_WEBHOOK_USER!, password: process.env.CULQI_WEBHOOK_PASSWORD! }))
 *   return new Response(null, { status: 401 });
 * ```
 */
export function verifyWebhookBasicAuth(
  source: string | null | undefined | { headers: { get(name: string): string | null } },
  credentials: WebhookBasicAuth
): boolean {
  if (!credentials.username || !credentials.password) return false;
  const header =
    typeof source === "string" || source == null ? source : source.headers.get("authorization");
  if (!header) return false;

  const [scheme, encoded] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "basic" || !encoded) return false;

  const decoded = decodeBase64(encoded.trim());
  if (decoded === null) return false;

  const separator = decoded.indexOf(":");
  if (separator < 0) return false;

  const username = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);
  // Both compares always run: no early exit on the username.
  const okUser = safeEqual(username, credentials.username);
  const okPassword = safeEqual(password, credentials.password);
  return okUser && okPassword;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Validate and normalize a webhook body. Accepts the raw string or a parsed
 * object; `data` sent as a JSON string (Culqi's historical format) is parsed.
 */
export function parseWebhookEvent(payload: unknown): WebhookEvent {
  let value = payload;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      throw new WebhookParseError("Webhook body is not valid JSON");
    }
  }
  if (!isRecord(value) || value.object !== "event") {
    throw new WebhookParseError('Webhook body is not an event (object !== "event")');
  }
  if (typeof value.type !== "string" || value.type.length === 0) {
    throw new WebhookParseError("Webhook event has no type");
  }

  let data = value.data;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      // keep as string when data is not JSON
    }
  }

  return {
    object: "event",
    type: value.type,
    data,
    ...(typeof value.id === "string" && { id: value.id }),
    ...(typeof value.creation_date === "number" && {
      creation_date: value.creation_date,
    }),
  };
}
