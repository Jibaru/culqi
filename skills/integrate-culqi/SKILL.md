---
name: integrate-culqi
description: Integrate Culqi (Peruvian payment gateway) into a TypeScript/JavaScript project quickly and correctly, using the @jibaru/culqi SDK. Covers checkout tokenization, immediate charges, pre-authorization + capture, refunds, card-on-file, async orders, subscriptions, and webhooks. Use when the user wants to accept payments with Culqi, add card/Yape payments in Peru, or debug a Culqi integration.
---

# Integrate Culqi in TypeScript

Culqi is a Peruvian payment gateway (cards, Yape, PagoEfectivo, installments).
This skill gets a working integration fast and routes you around the pitfalls
that are not obvious from the docs.

Official sources — always verify current behavior against these:

- Docs: https://docs.culqi.com/
- API reference: https://apidocs.culqi.com/
- Panel (keys, webhooks): https://culqipanel.culqi.com/login
- Merchant signup: https://afiliate.culqi.com/ (requires a Peruvian RUC — there
  is no keyless sandbox; test keys require a merchant account)

## Setup

```bash
npm install @jibaru/culqi
```

Keys live in CulqiPanel → Desarrollo → API Keys. Two pairs: `*_test_*`
(integration environment, no real money) and `*_live_*` (production).

```
CULQI_PUBLIC_KEY=pk_test_...   # browser-safe; can only create tokens
CULQI_SECRET_KEY=sk_test_...   # server-only; full API access
```

Never expose the secret key to the browser. Never send card numbers to your
own server — tokenize in the browser with Culqi Checkout.

## Architecture: every flow is token-first

```
Browser ── card data ──> Culqi (checkout script) ──> token (tkn_...)
Browser ── token id ───> Your server
Server ── token + sk ──> Culqi API ──> charge / saved card / ...
```

## Choosing the flow

| You need | Flow | Sync? |
|---|---|---|
| Charge a card or Yape now | `charges.create` | Yes — response is final |
| Hold now, charge on approval | `charges.create({ capture: false })` → `charges.capture` | Yes |
| Money back / release a hold | `refunds.create` | Yes (bank settlement takes days in prod) |
| One-click repeat payments | `customers` + `cards`, then charge with `crd_...` | Yes |
| Cash / bank-app payments (PagoEfectivo etc.) | `orders.create` + webhook | **No — webhook or polling required** |
| Recurring billing | `plans` + `subscriptions` (under `/v2/recurrent/`) | — |

## Recipes

### 1. Browser: tokenize with Culqi Checkout

```ts
import { loadCheckoutScript, openCheckout } from "@jibaru/culqi/checkout";

await loadCheckoutScript();
openCheckout({
  publicKey: process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY!,
  title: "My Store",
  amount: 8000, // integers, in cents: S/ 80.00
  currency: "PEN",
  mode: "modal", // or "embedded" + containerId: "my-div-id"
  onToken: (token) => sendToBackend(token.id),
  onError: (err) => show(err.user_message),
});
```

Embedded mode gotcha: Culqi injects an iframe with no dimensions — it renders
at the browser default 150px and looks cut off. Force it to fill:

```css
#my-div-id iframe { width: 100%; height: 100%; border: 0; }
#my-div-id { height: 680px; }
```

### 2. Server: charge (the response IS the payment state)

```ts
import { Culqi, CulqiCardError } from "@jibaru/culqi";

const culqi = new Culqi({ secretKey: process.env.CULQI_SECRET_KEY! });

const charge = await culqi.charges.create({
  amount: 8000, // ALWAYS compute server-side; never trust the client
  currency_code: "PEN",
  email,
  source_id: tokenId,
});
// charge.outcome.type === "venta_exitosa" -> paid, right now, done.
// Declines throw CulqiCardError (check .declineCode).
```

For card/Yape charges you do NOT need a webhook to know the payment happened —
the synchronous response is authoritative. Webhooks are the safety net for
"my server crashed between charging and persisting".

### 3. Pre-authorization: hold now, charge on approval

```ts
const hold = await culqi.charges.create({ ...params, capture: false });
// hold.capture === false, hold.capture_date === null

await culqi.charges.capture(hold.id); // approve -> money moves

await culqi.refunds.create({
  // reject -> release the hold
  charge_id: hold.id,
  amount: hold.amount,
  reason: "solicitud_comprador",
});
```

Cards only — Yape does not support pre-authorization. Holds expire (industry
norm ~7 days; confirm the exact window with Culqi for production). The
customer sees the amount held from step 1: say so in your UI.

### 4. One-click payments (card-on-file)

**First purchase** — the user checks out normally and opts in to saving the
card ("remember this card"). Save the token as a card first, then charge the
saved card — one code path for both the first and every later purchase:

```ts
const customer = await culqi.customers.create({
  first_name, last_name, email,
  address, address_city, country_code: "PE", phone_number,
});
const card = await culqi.cards.create({
  customer_id: customer.id,
  token_id: tokenId, // saving does not charge
});
const charge = await culqi.charges.create({ ...params, source_id: card.id });
// persist card.id against your user
```

**Every later purchase** — no card form at all, just a "Pay" button:

```ts
await culqi.charges.create({ ...params, source_id: savedCardId }); // crd_...
```

Notes (verified against the integration environment):

- A token can be used for a charge AND to create a card, in either order —
  tokens are not one-shot across operations. Charge-then-save also works.
- A charge with `source_id: crd_...` can fail at that moment (expired card,
  no funds) — handle `CulqiCardError` on the one-click path too.
- Only save the card with explicit user consent, and store nothing but the
  `crd_...` / `cus_...` ids — the card lives in Culqi's vault.

### 5. Webhooks (Culqi does NOT sign them)

There is no HMAC signature header. Defend in two layers:

```ts
import { parseWebhookEvent } from "@jibaru/culqi";

// URL registered in CulqiPanel -> Eventos -> Webhooks:
//   https://yourapp.com/webhooks/culqi?token=<long random secret>
export async function handler(req: Request) {
  if (new URL(req.url).searchParams.get("token") !== process.env.WEBHOOK_TOKEN)
    return new Response(null, { status: 401 });

  const event = parseWebhookEvent(await req.text());
  // The payload is a hint, not proof — re-fetch before acting:
  if (event.type.startsWith("charge.")) {
    const charge = await culqi.charges.get((event.data as { id: string }).id);
    // act on `charge`, idempotently (events can arrive more than once)
  }
  return Response.json({ received: true }); // 2xx fast, or Culqi retries
}
```

Event types include `charge.creation.succeeded`, `refund.creation.succeeded`,
`order.status.changed`. `data` may arrive as a JSON *string* —
`parseWebhookEvent` handles both. Localhost is unreachable for Culqi: use a
tunnel (ngrok/cloudflared) during development.

### 6. AES/RSA payload encryption (optional hardening)

Culqi supports encrypting request payloads on top of TLS
(https://docs.culqi.com/es/documentacion/pagos-online/llaves_rsa/). Generate
keys in CulqiPanel → Desarrollo → RSA Keys, then:

```ts
const culqi = new Culqi({
  secretKey: process.env.CULQI_SECRET_KEY!,
  encryption: { rsaId: process.env.CULQI_RSA_ID!, rsaPublicKey: process.env.CULQI_RSA_PUBLIC_KEY! },
});
```

The SDK handles the wire format (AES-256-GCM with the GCM tag stripped,
key/IV wrapped with RSA-OAEP-SHA256, `x-culqi-rsa-id` header). Only enable it
if the merchant has RSA keys configured in the panel.

## Pitfalls checklist

- **Two hosts.** Tokens go to `secure.culqi.com/v2`; everything else to
  `api.culqi.com/v2`. Posting tokens to the api host fails with a misleading
  "malformed Authorization header" error. The SDK routes this for you.
- **Amounts are integer cents.** `8000` = S/ 80.00. Floats will corrupt money.
- **Compute the amount server-side.** The browser only sends a token id.
- **The generic auth error lies.** "Olvidaste indicar tu API Key… formato
  Bearer" usually means the key is *invalid/revoked*, not malformed.
- **Legacy plans endpoint is dead.** `/v2/plans` returns an empty body; use
  `/v2/recurrent/plans/*` (the SDK does).
- **Order initial state varies**: `created` (with `confirm: false`) or
  `pending` — treat both as "not yet paid".
- **Idempotency is yours — and tokens are NOT single-use.** Verified: the same
  token can be charged twice, both succeeding. A double submit of the same
  `tokenId` is a double charge. Culqi documents no idempotency-key header;
  dedupe server-side by your own order/booking id before calling
  `charges.create`, and disable the pay button after the first click.
- **3DS**: in production some issuers require it; the charge response asks for
  authentication and you retry with `authentication_3DS` fields. See
  https://docs.culqi.com/ (Culqi 3DS).

## Test cards (integration environment)

| Brand | Number | CVV | Result |
|---|---|---|---|
| Visa | 4111 1111 1111 1111 | 123 | Approved |
| Mastercard | 5111 1111 1111 1118 | 039 | Approved |
| Amex | 3712 121212 12122 | 2841 | Approved |
| Visa | 4000 0200 0000 0000 | 123 | Declined |

Any future expiry date, any email. Full list: https://docs.culqi.com/
