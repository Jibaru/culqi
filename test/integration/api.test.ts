import { describe, expect, it } from "vitest";
import { Culqi } from "../../src/index.js";

// Runs only when real integration-environment keys are present:
//   CULQI_SECRET_KEY=sk_test_... CULQI_PUBLIC_KEY=pk_test_... npm run test:integration
const secretKey = process.env.CULQI_SECRET_KEY;
const publicKey = process.env.CULQI_PUBLIC_KEY;
const enabled = Boolean(secretKey?.startsWith("sk_test_") && publicKey?.startsWith("pk_test_"));

const TEST_CARD = {
  card_number: "4111111111111111",
  cvv: "123",
  expiration_month: "09",
  expiration_year: "2030",
};

describe.skipIf(!enabled)("Culqi integration environment", () => {
  const culqi = new Culqi({
    secretKey: secretKey ?? "",
    publicKey: publicKey ?? "",
  });
  const email = `sdk-it-${Date.now()}@example.com`;

  it("tokenizes, charges, and refunds", async () => {
    const token = await culqi.tokens.create({ ...TEST_CARD, email });
    expect(token.id).toMatch(/^tkn_test_/);

    const charge = await culqi.charges.create({
      amount: 8000,
      currency_code: "PEN",
      email,
      source_id: token.id,
      description: "sdk integration test",
    });
    expect(charge.outcome?.type).toBe("venta_exitosa");

    const refund = await culqi.refunds.create({
      charge_id: charge.id,
      amount: 8000,
      reason: "solicitud_comprador",
    });
    expect(refund.charge_id).toBe(charge.id);
  });

  it("pre-authorizes, captures, and releases", async () => {
    const t1 = await culqi.tokens.create({ ...TEST_CARD, email });
    const hold = await culqi.charges.create({
      amount: 8000,
      currency_code: "PEN",
      email,
      source_id: t1.id,
      capture: false,
    });
    expect(hold.capture).toBe(false);
    expect(hold.capture_date).toBeNull();

    const captured = await culqi.charges.capture(hold.id);
    expect(captured.id).toBe(hold.id);

    const t2 = await culqi.tokens.create({ ...TEST_CARD, email });
    const hold2 = await culqi.charges.create({
      amount: 8000,
      currency_code: "PEN",
      email,
      source_id: t2.id,
      capture: false,
    });
    const release = await culqi.refunds.create({
      charge_id: hold2.id,
      amount: 8000,
      reason: "solicitud_comprador",
    });
    expect(release.charge_id).toBe(hold2.id);
  });

  it("manages customers and saved cards", async () => {
    const customer = await culqi.customers.create({
      first_name: "Sdk",
      last_name: "Test",
      email,
      address: "Av Lima 123",
      address_city: "Lima",
      country_code: "PE",
      phone_number: "999888777",
    });
    expect(customer.id).toMatch(/^cus_test_/);

    const token = await culqi.tokens.create({ ...TEST_CARD, email });
    const card = await culqi.cards.create({
      customer_id: customer.id,
      token_id: token.id,
    });
    expect(card.id).toMatch(/^crd_test_/);

    const charge = await culqi.charges.create({
      amount: 8000,
      currency_code: "PEN",
      email,
      source_id: card.id,
      description: "card on file",
    });
    expect(charge.outcome?.type).toBe("venta_exitosa");

    await culqi.cards.delete(card.id);
    await culqi.customers.delete(customer.id);
  });

  it("creates and deletes orders", async () => {
    const order = await culqi.orders.create({
      amount: 8000,
      currency_code: "PEN",
      description: "sdk order test",
      order_number: `sdk-${Date.now()}`,
      client_details: {
        first_name: "Sdk",
        last_name: "Test",
        email,
        phone_number: "999888777",
      },
      expiration_date: Math.floor(Date.now() / 1000) + 24 * 3600,
    });
    expect(order.id).toMatch(/^ord_test_/);
    expect(["created", "pending"]).toContain(order.state);
    await culqi.orders.delete(order.id);
  });

  it("creates and deletes recurrent plans", async () => {
    const created = await culqi.plans.create({
      name: `SDK Plan ${Date.now()}`,
      short_name: `sdk-plan-${Date.now()}`,
      description: "sdk plan test",
      amount: 5000,
      currency: "PEN",
      interval_unit_time: 3,
      interval_count: 1,
      initial_cycles: {
        count: 0,
        has_initial_charge: false,
        amount: 0,
        interval_unit_time: 3,
      },
    });
    expect(created.id).toMatch(/^pln_test_/);

    const plan = await culqi.plans.get(created.id);
    expect(plan.amount).toBe(5000);

    const deleted = await culqi.plans.delete(created.id);
    expect(deleted.deleted).toBe(true);
  });
});
