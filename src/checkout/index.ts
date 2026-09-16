/**
 * Browser helpers for Culqi Checkout Custom (`https://js.culqi.com/checkout-js`).
 * Uses only the PUBLIC key; card data goes straight from the browser to Culqi.
 * @see https://docs.culqi.com/es/documentacion/checkout/checkout-custom
 */

const CHECKOUT_SCRIPT_URL = "https://js.culqi.com/checkout-js";

export interface CheckoutToken {
  id: string;
  email: string;
}

export interface CheckoutError {
  user_message?: string;
  merchant_message?: string;
}

export interface CulqiCheckoutInstance {
  open: () => void;
  close: () => void;
  culqi: () => void;
  token: CheckoutToken | null;
  order: { id: string } | null;
  error: CheckoutError | null;
}

declare global {
  interface Window {
    CulqiCheckout: new (
      publicKey: string,
      config: Record<string, unknown>
    ) => CulqiCheckoutInstance;
  }
}

let scriptPromise: Promise<void> | null = null;

/** Inject the checkout script once; resolves when `window.CulqiCheckout` exists. */
export function loadCheckoutScript(): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("loadCheckoutScript is browser-only"));
  }
  if (window.CulqiCheckout) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = CHECKOUT_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("Failed to load the Culqi checkout script"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export interface PaymentMethods {
  tarjeta?: boolean;
  yape?: boolean;
  billetera?: boolean;
  bancaMovil?: boolean;
  agente?: boolean;
  cuotealo?: boolean;
}

export interface OpenCheckoutOptions {
  publicKey: string;
  title: string;
  /** Integer amount in cents. */
  amount: number;
  currency: string;
  email?: string;
  /** `modal` opens a popup; `embedded` renders inside `containerId`. */
  mode?: "modal" | "embedded";
  /** Required for embedded mode: id (without `#`) of the container element. */
  containerId?: string;
  /** For non-card methods that require a pre-created order (`ord_...`). */
  orderId?: string;
  installments?: boolean;
  paymentMethods?: PaymentMethods;
  appearance?: Record<string, unknown>;
  onToken: (token: CheckoutToken) => void;
  onOrder?: (order: { id: string }) => void;
  onError: (error: CheckoutError) => void;
}

/** Create and open the checkout; returns the instance for manual control. */
export function openCheckout(options: OpenCheckoutOptions): CulqiCheckoutInstance {
  if (typeof window === "undefined" || !window.CulqiCheckout) {
    throw new Error("Culqi checkout script not loaded; call loadCheckoutScript() first");
  }
  const mode = options.mode ?? "modal";
  if (mode === "embedded" && !options.containerId) {
    throw new Error("Embedded mode requires `containerId`");
  }

  const culqi = new window.CulqiCheckout(options.publicKey, {
    settings: {
      title: options.title,
      currency: options.currency,
      amount: options.amount,
      ...(options.orderId && { order: options.orderId }),
    },
    client: { email: options.email },
    options: {
      lang: "auto",
      installments: options.installments ?? false,
      modal: mode === "modal",
      ...(mode === "embedded" && { container: `#${options.containerId}` }),
      paymentMethods: options.paymentMethods ?? { tarjeta: true, yape: true },
    },
    appearance: options.appearance ?? { theme: "default" },
  });

  culqi.culqi = () => {
    if (mode === "modal") culqi.close();
    if (culqi.token) {
      options.onToken(culqi.token);
    } else if (culqi.order) {
      options.onOrder?.(culqi.order);
    } else if (culqi.error) {
      options.onError(culqi.error);
    }
  };

  culqi.open();
  return culqi;
}
