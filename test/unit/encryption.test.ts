import {
  constants,
  createDecipheriv,
  generateKeyPairSync,
  privateDecrypt,
} from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { Culqi, PayloadEncryptor } from "../../src/index.js";
import type { FetchLike } from "../../src/index.js";

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const rsaPublicKeyPem = publicKey.export({ type: "spki", format: "pem" }) as string;

function unwrap(base64: string): Buffer {
  return privateDecrypt(
    {
      key: privateKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(base64, "base64")
  );
}

describe("PayloadEncryptor", () => {
  it("produces a payload Culqi's server can decrypt (tag-stripped AES-256-GCM)", async () => {
    const encryptor = new PayloadEncryptor({
      rsaId: "rsa-id-1",
      rsaPublicKey: rsaPublicKeyPem,
    });
    const original = JSON.stringify({ amount: 8000, currency_code: "PEN" });
    const payload = await encryptor.encrypt(original);

    const key = unwrap(payload.encrypted_key);
    const iv = unwrap(payload.encrypted_iv);
    expect(key).toHaveLength(32);
    expect(iv).toHaveLength(12);

    // The GCM tag is stripped, so decrypt without calling final().
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    const plaintext = decipher
      .update(Buffer.from(payload.encrypted_data, "base64"))
      .toString("utf8");
    expect(JSON.parse(plaintext)).toEqual({ amount: 8000, currency_code: "PEN" });
  });

  it("uses a fresh key and iv per payload", async () => {
    const encryptor = new PayloadEncryptor({
      rsaId: "rsa-id-1",
      rsaPublicKey: rsaPublicKeyPem,
    });
    const a = await encryptor.encrypt("{}");
    const b = await encryptor.encrypt("{}");
    expect(unwrap(a.encrypted_key)).not.toEqual(unwrap(b.encrypted_key));
    expect(unwrap(a.encrypted_iv)).not.toEqual(unwrap(b.encrypted_iv));
  });

  it("requires rsaId and rsaPublicKey", () => {
    expect(
      () => new PayloadEncryptor({ rsaId: "", rsaPublicKey: rsaPublicKeyPem })
    ).toThrow(/rsaId/);
  });
});

describe("Culqi client with encryption", () => {
  it("encrypts bodies and sends x-culqi-rsa-id", async () => {
    const fetch: FetchLike = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ object: "charge", id: "chr_test_1" }),
    }));
    const culqi = new Culqi({
      secretKey: "sk_test_x",
      encryption: { rsaId: "rsa-id-1", rsaPublicKey: rsaPublicKeyPem },
      fetch,
    });
    await culqi.charges.create({
      amount: 8000,
      currency_code: "PEN",
      email: "a@b.com",
      source_id: "tkn_x",
    });

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { headers: Record<string, string>; body: string },
    ];
    expect(init.headers["x-culqi-rsa-id"]).toBe("rsa-id-1");
    const sent = JSON.parse(init.body) as Record<string, string>;
    expect(Object.keys(sent).sort()).toEqual([
      "encrypted_data",
      "encrypted_iv",
      "encrypted_key",
    ]);
    const decipher = createDecipheriv(
      "aes-256-gcm",
      unwrap(sent.encrypted_key as string),
      unwrap(sent.encrypted_iv as string)
    );
    const plain = JSON.parse(
      decipher.update(Buffer.from(sent.encrypted_data as string, "base64")).toString("utf8")
    );
    expect(plain.amount).toBe(8000);
    expect(plain.source_id).toBe("tkn_x");
  });

  it("does not encrypt GET requests", async () => {
    const fetch: FetchLike = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ object: "charge", id: "chr_test_1" }),
    }));
    const culqi = new Culqi({
      secretKey: "sk_test_x",
      encryption: { rsaId: "rsa-id-1", rsaPublicKey: rsaPublicKeyPem },
      fetch,
    });
    await culqi.charges.get("chr_test_1");
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { headers: Record<string, string>; body?: string },
    ];
    expect(init.body).toBeUndefined();
    expect(init.headers["x-culqi-rsa-id"]).toBeUndefined();
  });
});
