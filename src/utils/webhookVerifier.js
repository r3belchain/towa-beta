import crypto from "crypto";

/**
 * Verifikasi HMAC SHA-256 Signature untuk Top.gg Webhook
 */
export function verifyTopGGWebhook(rawBody, signature, secret) {
  if (!signature || !secret || !rawBody) return false;

  try {
    const [tPart, v1Part] = signature.split(",");
    if (!tPart || !v1Part) return false;

    const timestamp = tPart.split("=")[1];
    const receivedSig = v1Part.split("=")[1];

    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");

    const bufExpected = Buffer.from(expected, "utf8");
    const bufReceived = Buffer.from(receivedSig, "utf8");

    if (bufExpected.length !== bufReceived.length) return false;
    return crypto.timingSafeEqual(bufExpected, bufReceived);
  } catch (err) {
    return false;
  }
}
