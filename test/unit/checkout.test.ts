import { describe, expect, it } from "vitest";
import { loadCheckoutScript, openCheckout } from "../../src/checkout/index.js";

describe("checkout entry (outside a browser)", () => {
  it("loadCheckoutScript rejects in Node", async () => {
    await expect(loadCheckoutScript()).rejects.toThrow(/browser-only/);
  });

  it("openCheckout throws when the script is not loaded", () => {
    expect(() =>
      openCheckout({
        publicKey: "pk_test_x",
        title: "t",
        amount: 100,
        currency: "PEN",
        onToken: () => {},
        onError: () => {},
      })
    ).toThrow(/not loaded/);
  });
});
