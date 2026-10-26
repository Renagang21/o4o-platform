import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { getCanonicalKey } from "../../utils/crypto.js";
import { MailError } from "./contracts.js";

const key = () =>
  Buffer.from(
    hkdfSync(
      "sha256",
      getCanonicalKey(),
      "o4o-personal-mail-v1",
      "credential",
      32,
    ),
  );
export function seal(value: unknown, binding: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(binding));
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((v) => v.toString("base64url"))
    .join(".");
}
export function unseal<T>(value: string, binding: string): T {
  try {
    const parts = value.split(".").map((v) => Buffer.from(v, "base64url"));
    if (parts.length !== 3 || parts[0].length !== 12 || parts[1].length !== 16)
      throw new Error("format");
    const decipher = createDecipheriv("aes-256-gcm", key(), parts[0]);
    decipher.setAAD(Buffer.from(binding));
    decipher.setAuthTag(parts[1]);
    return JSON.parse(
      Buffer.concat([decipher.update(parts[2]), decipher.final()]).toString(
        "utf8",
      ),
    ) as T;
  } catch {
    throw new MailError("MAIL_CREDENTIAL_UNAVAILABLE", 503);
  }
}
export function confirmationToken(value: string) {
  return createHmac("sha256", key())
    .update(`confirm:${value}`)
    .digest("base64url");
}
export function validConfirmation(value: string, token: string) {
  const expected = Buffer.from(confirmationToken(value)),
    supplied = Buffer.from(token);
  return (
    expected.length === supplied.length && timingSafeEqual(expected, supplied)
  );
}
