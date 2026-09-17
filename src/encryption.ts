/**
 * Optional AES/RSA payload encryption, a second protection layer on top of
 * TLS. Enable it by generating keys in CulqiPanel → Desarrollo → RSA Keys and
 * passing `encryption: { rsaId, rsaPublicKey }` to the client.
 *
 * Wire format (matches the official Culqi SDKs): the JSON body is encrypted
 * with AES-256-GCM using a random key and IV, the GCM auth tag is stripped,
 * and key and IV are each wrapped with RSA-OAEP-SHA256. The request body
 * becomes `{ encrypted_data, encrypted_key, encrypted_iv }` plus the
 * `x-culqi-rsa-id` header.
 * @see https://docs.culqi.com/es/documentacion/pagos-online/llaves_rsa/
 */

export interface EncryptionConfig {
  /** RSA key id from CulqiPanel → Desarrollo → RSA Keys. */
  rsaId: string;
  /** PEM-encoded RSA public key (SPKI) from the same panel section. */
  rsaPublicKey: string;
}

export interface EncryptedPayload {
  encrypted_data: string;
  encrypted_key: string;
  encrypted_iv: string;
}

const GCM_TAG_LENGTH = 16;

function pemToDer(pem: string): Uint8Array<ArrayBuffer> {
  const base64 = pem
    .replace(/-----(BEGIN|END)[^-]+-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export class PayloadEncryptor {
  readonly #config: EncryptionConfig;
  #rsaKey: Promise<CryptoKey> | null = null;

  constructor(config: EncryptionConfig) {
    if (!config.rsaId || !config.rsaPublicKey) {
      throw new Error("encryption requires both `rsaId` and `rsaPublicKey`");
    }
    this.#config = config;
  }

  get rsaId(): string {
    return this.#config.rsaId;
  }

  #importRsaKey(): Promise<CryptoKey> {
    return (this.#rsaKey ??= crypto.subtle.importKey(
      "spki",
      pemToDer(this.#config.rsaPublicKey),
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"]
    ));
  }

  async encrypt(json: string): Promise<EncryptedPayload> {
    if (!globalThis.crypto?.subtle) {
      throw new Error(
        "Payload encryption requires the WebCrypto API (Node >= 18 or a modern edge runtime)"
      );
    }
    const rsaKey = await this.#importRsaKey();
    const key = crypto.getRandomValues(new Uint8Array(32));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const aesKey = await crypto.subtle.importKey("raw", key, "AES-GCM", false, [
      "encrypt",
    ]);
    const sealed = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        aesKey,
        new TextEncoder().encode(json)
      )
    );
    // Culqi's servers expect the ciphertext without the trailing GCM tag.
    const ciphertext = sealed.slice(0, sealed.length - GCM_TAG_LENGTH);

    const [encryptedKey, encryptedIv] = await Promise.all([
      crypto.subtle.encrypt({ name: "RSA-OAEP" }, rsaKey, key),
      crypto.subtle.encrypt({ name: "RSA-OAEP" }, rsaKey, iv),
    ]);

    return {
      encrypted_data: toBase64(ciphertext),
      encrypted_key: toBase64(new Uint8Array(encryptedKey)),
      encrypted_iv: toBase64(new Uint8Array(encryptedIv)),
    };
  }
}
