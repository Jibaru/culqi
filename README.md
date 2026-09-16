# @jibaru/culqi

Type-safe, zero-dependency TypeScript SDK for the [Culqi](https://culqi.com/) payments API (Peru).

> Unofficial. Culqi does not publish a Node.js SDK; this one is built against the
> official [docs](https://docs.culqi.com/) and [API reference](https://apidocs.culqi.com/),
> and every endpoint is verified with integration tests against Culqi's test environment.

- **Complete**: tokens, charges (incl. pre-authorization + capture), refunds, customers, saved cards, orders, recurrent plans & subscriptions, webhooks, browser checkout.
- **Zero runtime dependencies**, native `fetch`, Node ≥ 18.
- **Dual ESM/CJS**, full TypeScript types, typed error classes.
- **Two entries**: `@jibaru/culqi` (server, secret key) and `@jibaru/culqi/checkout` (browser, public key) — server code never reaches your bundle.

## Install

```bash
npm install @jibaru/culqi
```

## Quickstart

**Browser** — tokenize with Culqi Checkout (card data never touches your server):

```ts
import { loadCheckoutScript, openCheckout } from "@jibaru/culqi/checkout";

await loadCheckoutScript();
openCheckout({
  publicKey: "pk_test_...",
  title: "My Store",
  amount: 8000, // cents: S/ 80.00
  currency: "PEN",
  mode: "modal", // or "embedded" + containerId
  onToken: (token) => fetch("/api/pay", { method: "POST", body: JSON.stringify({ tokenId: token.id }) }),
  onError: (err) => console.error(err.user_message),
});
```

**Server** — charge the token:

```ts
import { Culqi } from "@jibaru/culqi";

const culqi = new Culqi({ secretKey: process.env.CULQI_SECRET_KEY });

const charge = await culqi.charges.create({
  amount: 8000,
  currency_code: "PEN",
  email: "customer@example.com",
  source_id: tokenId,
});
// charge.outcome.type === "venta_exitosa" -> paid. The response is final.
```

## Flows

### Pre-authorization: hold now, capture on approval

```ts
const hold = await culqi.charges.create({ ...params, capture: false });
await culqi.charges.capture(hold.id); // approve
// or release the hold:
await culqi.refunds.create({ charge_id: hold.id, amount: hold.amount, reason: "solicitud_comprador" });
```

Cards only — Yape has no pre-authorization.

### Refunds (partial or total)

```ts
await culqi.refunds.create({ charge_id, amount: 2000, reason: "solicitud_comprador" });
```

### Card-on-file (one-click payments)

```ts
const customer = await culqi.customers.create({ first_name, last_name, email, address, address_city, country_code: "PE", phone_number });
const card = await culqi.cards.create({ customer_id: customer.id, token_id });
await culqi.charges.create({ ...params, source_id: card.id });
```

### Async orders (PagoEfectivo, bank apps, agents)

```ts
const order = await culqi.orders.create({ amount, currency_code: "PEN", description, order_number, client_details, expiration_date });
// payment happens outside your app -> listen for the `order.status.changed` webhook
```

### Subscriptions

```ts
const { id: planId } = await culqi.plans.create({ name, short_name, description, amount, currency: "PEN", interval_unit_time: 3, interval_count: 1, initial_cycles: { count: 0, has_initial_charge: false, amount: 0, interval_unit_time: 3 } });
await culqi.subscriptions.create({ card_id, plan_id: planId, tyc: true });
```

### Webhooks

Culqi does **not** sign webhooks (no HMAC). Put a private token in the webhook URL and re-fetch the resource before trusting the payload:

```ts
import { parseWebhookEvent } from "@jibaru/culqi";

const event = parseWebhookEvent(rawBody);
if (event.type === "charge.creation.succeeded") {
  const charge = await culqi.charges.get((event.data as { id: string }).id);
}
```

## Error handling

```ts
import { CulqiCardError, CulqiAuthenticationError, CulqiError } from "@jibaru/culqi";

try {
  await culqi.charges.create(params);
} catch (err) {
  if (err instanceof CulqiCardError) show(err.userMessage); // declined; see err.declineCode
  else if (err instanceof CulqiAuthenticationError) alertOps("check API keys");
  else if (err instanceof CulqiError) log(err.status, err.type, err.merchantMessage);
}
```

## Agent skill

This repo ships an [Agent Skill](https://github.com/Jibaru/culqi-sdk/tree/main/skills/integrate-culqi) that teaches coding agents (Claude Code, Cursor, etc.) to integrate Culqi correctly — flows, pitfalls, and test cards included:

```bash
npx skills add Jibaru/culqi-sdk --skill=integrate-culqi
```

## Development

```bash
npm install
npm run typecheck && npm run lint && npm test   # unit (mocked fetch)
CULQI_SECRET_KEY=sk_test_... CULQI_PUBLIC_KEY=pk_test_... npm run test:integration
npm run build
```

## Official references

- [Culqi docs](https://docs.culqi.com/) · [API reference](https://apidocs.culqi.com/)
- [Checkout Custom](https://docs.culqi.com/es/documentacion/checkout/checkout-custom)
- [Webhooks](https://docs.culqi.com/es/documentacion/pagos-online/webhooks/)
- [API keys](https://docs.culqi.com/es/documentacion/pagos-online/llaves) · [CulqiPanel](https://culqipanel.culqi.com/login)

## License

MIT
