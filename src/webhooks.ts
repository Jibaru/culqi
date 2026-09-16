/**
 * Webhook helpers. Configure endpoints in CulqiPanel → Eventos → Webhooks.
 *
 * Culqi does NOT sign its webhooks (no HMAC header). Recommended defense:
 * 1. Put a private token in the webhook URL (`?token=...`) and reject
 *    requests that don't carry it.
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
