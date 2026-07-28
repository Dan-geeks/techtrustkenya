import { describe, expect, test } from "bun:test";
import {
  app,
  darajaTimestamp,
  formatPhone,
  normalizeCallback,
  resolveChargeAmount,
  resolveProvider,
} from "./index.ts";

describe("formatPhone", () => {
  test("accepts the formats customers actually type", () => {
    expect(formatPhone("0712345678")).toBe("254712345678");
    expect(formatPhone("254712345678")).toBe("254712345678");
    expect(formatPhone("+254712345678")).toBe("254712345678");
    expect(formatPhone("712345678")).toBe("254712345678");
    expect(formatPhone("0110000000")).toBe("254110000000");
    expect(formatPhone(" 0712 345 678 ")).toBe("254712345678");
  });

  test("rejects anything that cannot be a Kenyan mobile number", () => {
    expect(formatPhone("")).toBeNull();
    expect(formatPhone("0812345678")).toBeNull(); // 8 is not a mobile prefix
    expect(formatPhone("071234567")).toBeNull(); // too short
    expect(formatPhone("07123456789")).toBeNull(); // too long
    expect(formatPhone("254812345678")).toBeNull();
    expect(formatPhone("not a phone")).toBeNull();
  });
});

describe("resolveChargeAmount", () => {
  test("charges the real amount when sandbox mode is off", () => {
    delete process.env.PAYMENT_SANDBOX_MODE;
    process.env.PAYMENT_TEST_AMOUNT_KSH = "1";
    // A stray test amount must never under-charge a live customer.
    expect(resolveChargeAmount(24999)).toBe(24999);
    delete process.env.PAYMENT_TEST_AMOUNT_KSH;
  });

  test("honours the test amount only in sandbox mode", () => {
    process.env.PAYMENT_SANDBOX_MODE = "true";
    process.env.PAYMENT_TEST_AMOUNT_KSH = "1";
    expect(resolveChargeAmount(24999)).toBe(1);
    delete process.env.PAYMENT_SANDBOX_MODE;
    delete process.env.PAYMENT_TEST_AMOUNT_KSH;
  });

  test("rounds up and never charges below one shilling", () => {
    expect(resolveChargeAmount(10.2)).toBe(11);
    expect(resolveChargeAmount(0)).toBe(1);
    expect(resolveChargeAmount(-5)).toBe(1);
  });
});

describe("resolveProvider", () => {
  const clear = () => {
    for (const key of [
      "PAYMENT_PROVIDER",
      "MPESA_CONSUMER_KEY",
      "MPESA_CONSUMER_SECRET",
      "KCB_BUNI_CONSUMER_KEY",
      "KCB_BUNI_CONSUMER_SECRET",
      "PAYMENT_SIMULATION_ENABLED",
    ]) {
      delete process.env[key];
    }
  };

  test("an explicit setting always wins", () => {
    clear();
    process.env.PAYMENT_PROVIDER = "simulation";
    process.env.MPESA_CONSUMER_KEY = "k";
    process.env.MPESA_CONSUMER_SECRET = "s";
    expect(resolveProvider()).toBe("simulation");
    clear();
  });

  test("falls back to whichever gateway has credentials", () => {
    clear();
    process.env.MPESA_CONSUMER_KEY = "k";
    process.env.MPESA_CONSUMER_SECRET = "s";
    expect(resolveProvider()).toBe("safaricom_daraja");

    clear();
    process.env.KCB_BUNI_CONSUMER_KEY = "k";
    process.env.KCB_BUNI_CONSUMER_SECRET = "s";
    expect(resolveProvider()).toBe("kcb_buni");
    clear();
  });

  test("simulation is opt-in, never a silent default", () => {
    clear();
    // No credentials and no simulation flag: must NOT quietly simulate payments.
    expect(resolveProvider()).toBe("safaricom_daraja");
    process.env.PAYMENT_SIMULATION_ENABLED = "true";
    expect(resolveProvider()).toBe("simulation");
    clear();
  });
});

describe("darajaTimestamp", () => {
  test("is 14 digits of Nairobi local time", () => {
    const ts = darajaTimestamp();
    expect(ts).toMatch(/^\d{14}$/);
    const nairobiHour = new Date(Date.now() + 3 * 60 * 60 * 1000).getUTCHours();
    expect(Number(ts.slice(8, 10))).toBe(nairobiHour);
  });
});

describe("normalizeCallback", () => {
  test("reads a successful Daraja STK callback", () => {
    const info = normalizeCallback({
      Body: {
        stkCallback: {
          MerchantRequestID: "29115-34620561-1",
          CheckoutRequestID: "ws_CO_191220191020363925",
          ResultCode: 0,
          ResultDesc: "The service request is processed successfully.",
          CallbackMetadata: {
            Item: [
              { Name: "Amount", Value: 1 },
              { Name: "MpesaReceiptNumber", Value: "NLJ7RT61SV" },
              { Name: "PhoneNumber", Value: 254712345678 },
            ],
          },
        },
      },
    });
    expect(info.kind).toBe("payment");
    expect(info.resultCode).toBe("0");
    expect(info.transactionId).toBe("ws_CO_191220191020363925");
    expect(info.receipt).toBe("NLJ7RT61SV");
    expect(info.amountKsh).toBe(1);
  });

  test("reads a cancelled Daraja STK callback (no metadata)", () => {
    const info = normalizeCallback({
      Body: {
        stkCallback: {
          CheckoutRequestID: "ws_CO_cancel",
          ResultCode: 1032,
          ResultDesc: "Request cancelled by user",
        },
      },
    });
    expect(info.kind).toBe("payment");
    expect(info.resultCode).toBe("1032");
    expect(info.receipt).toBeUndefined();
  });

  test("reads a Daraja B2C result as a payout", () => {
    const info = normalizeCallback({
      Result: {
        ResultCode: 0,
        ResultDesc: "The service request is processed successfully.",
        OriginatorConversationID: "16740-34861180-1",
        ConversationID: "AG_20191219_00005797af5d7d75f652",
        TransactionID: "NLJ41HAY6Q",
        ResultParameters: {
          ResultParameter: [{ Key: "TransactionAmount", Value: 500 }],
        },
      },
    });
    expect(info.kind).toBe("payout");
    expect(info.transactionId).toBe("16740-34861180-1");
    expect(info.receipt).toBe("NLJ41HAY6Q");
    expect(info.amountKsh).toBe(500);
  });

  test("reads the nested KCB Buni shape", () => {
    const info = normalizeCallback({
      header: { statusCode: "0", statusDescription: "Success" },
      response: { CheckoutRequestID: "KCB-123", MerchantRequestID: "M-1" },
      MpesaReceiptNumber: "KCB7RT61SV",
      Amount: 250,
    });
    expect(info.kind).toBe("payment");
    expect(info.provider).toBe("kcb_buni");
    expect(info.transactionId).toBe("KCB-123");
    expect(info.receipt).toBe("KCB7RT61SV");
  });

  test("reads the flat KCB Buni shape and maps 'success' to code 0", () => {
    const info = normalizeCallback({
      status: "success",
      transactionId: "KCB-flat-9",
      receiptNumber: "R99",
      amount: 75,
    });
    expect(info.kind).toBe("payment");
    expect(info.resultCode).toBe("0");
    expect(info.transactionId).toBe("KCB-flat-9");
  });

  test("does not guess at an unrecognised payload", () => {
    expect(normalizeCallback({}).kind).toBe("unknown");
    expect(normalizeCallback({ hello: "world" }).kind).toBe("unknown");
  });
});

describe("routes", () => {
  test("health and root respond", async () => {
    expect((await app.request("/health")).status).toBe(200);
    expect((await app.request("/")).status).toBe(200);
  });

  test("payment endpoints reject unauthenticated callers", async () => {
    const push = await app.request("/mpesa-stkpush", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order_id: "x", phone: "0712345678" }),
    });
    expect(push.status).toBe(401);

    const status = await app.request("/payment-status?order_id=x");
    expect(status.status).toBe(401);

    const release = await app.request("/release-float-payment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId: "x" }),
    });
    expect(release.status).toBe(401);
  });

  test("config-check never exposes the callback secret", async () => {
    process.env.MPESA_CALLBACK_SECRET = "topsecret";
    process.env.PUBLIC_BASE_URL = "https://example.up.railway.app";

    const res = await app.request("/config-check");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.callbackSecretSet).toBe(true);
    expect(body.callbackUrl).toBe("https://example.up.railway.app/mpesa-callback/<secret>");
    expect(JSON.stringify(body)).not.toContain("topsecret");

    delete process.env.MPESA_CALLBACK_SECRET;
    delete process.env.PUBLIC_BASE_URL;
  });

  test("callbacks require the shared secret once one is configured", async () => {
    process.env.MPESA_CALLBACK_SECRET = "topsecret";

    const bare = await app.request("/mpesa-callback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(bare.status).toBe(403);

    const wrong = await app.request("/mpesa-callback/guess", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(wrong.status).toBe(403);

    // Right secret, unrecognised payload: still ACKs so the gateway stops retrying.
    const right = await app.request("/mpesa-callback/topsecret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(right.status).toBe(200);
    expect(await right.json()).toEqual({ ResultCode: 0, ResultDesc: "Accepted" });

    delete process.env.MPESA_CALLBACK_SECRET;
  });
});
