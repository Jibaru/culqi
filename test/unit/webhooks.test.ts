import { describe, expect, it } from "vitest";
import { parseWebhookEvent, verifyWebhookBasicAuth, WebhookParseError } from "../../src/index.js";

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

describe("verifyWebhookBasicAuth", () => {
  const credentials = { username: "culqi-hook", password: "s3cr3t" };
  const header = (user: string, pass: string) =>
    `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;

  it("accepts the credentials Culqi was configured with", () => {
    expect(verifyWebhookBasicAuth(header("culqi-hook", "s3cr3t"), credentials)).toBe(true);
  });

  it("rejects a wrong password, a wrong user and a missing header", () => {
    expect(verifyWebhookBasicAuth(header("culqi-hook", "nope"), credentials)).toBe(false);
    expect(verifyWebhookBasicAuth(header("someone", "s3cr3t"), credentials)).toBe(false);
    expect(verifyWebhookBasicAuth(null, credentials)).toBe(false);
    expect(verifyWebhookBasicAuth("", credentials)).toBe(false);
  });

  it("rejects other schemes and malformed values", () => {
    expect(verifyWebhookBasicAuth("Bearer abc", credentials)).toBe(false);
    expect(verifyWebhookBasicAuth("Basic not-base64!!", credentials)).toBe(false);
    expect(
      verifyWebhookBasicAuth(`Basic ${Buffer.from("no-colon").toString("base64")}`, credentials)
    ).toBe(false);
  });

  it("keeps colons and accents inside the password", () => {
    const tricky = { username: "hook", password: "a:b:ñ" };
    expect(verifyWebhookBasicAuth(header("hook", "a:b:ñ"), tricky)).toBe(true);
    expect(verifyWebhookBasicAuth(header("hook", "a:b"), tricky)).toBe(false);
  });

  it("reads the header off a Request-like object", () => {
    const req = { headers: { get: (name: string) => (name === "authorization" ? header("culqi-hook", "s3cr3t") : null) } };
    expect(verifyWebhookBasicAuth(req, credentials)).toBe(true);
  });

  it("refuses to pass when no credentials are configured", () => {
    expect(verifyWebhookBasicAuth(header("", ""), { username: "", password: "" })).toBe(false);
  });
});
