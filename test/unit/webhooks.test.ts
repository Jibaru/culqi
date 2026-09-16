import { describe, expect, it } from "vitest";
import { parseWebhookEvent, WebhookParseError } from "../../src/index.js";

describe("parseWebhookEvent", () => {
  it("parses a raw JSON string body", () => {
    const event = parseWebhookEvent(
      JSON.stringify({
        object: "event",
        type: "charge.creation.succeeded",
        data: { id: "chr_test_1" },
      })
    );
    expect(event.type).toBe("charge.creation.succeeded");
    expect(event.data).toEqual({ id: "chr_test_1" });
  });

  it("parses data sent as a JSON string (historical format)", () => {
    const event = parseWebhookEvent({
      object: "event",
      type: "order.status.changed",
      data: JSON.stringify({ id: "ord_test_1", state: "paid" }),
    });
    expect(event.data).toEqual({ id: "ord_test_1", state: "paid" });
  });

  it("rejects non-event bodies", () => {
    expect(() => parseWebhookEvent({ hello: 1 })).toThrow(WebhookParseError);
  });

  it("rejects invalid JSON strings", () => {
    expect(() => parseWebhookEvent("not-json")).toThrow(WebhookParseError);
  });

  it("rejects events without a type", () => {
    expect(() => parseWebhookEvent({ object: "event", data: {} })).toThrow(
      WebhookParseError
    );
  });
});
