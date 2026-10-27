import { isEncryptionKeyConfigured } from "../../utils/crypto.js";
import { MailError } from "./contracts.js";

export function mailEnabled() {
  return process.env.PERSONAL_MAIL_ENABLED === "true";
}
export function requireMailEnabled() {
  if (!mailEnabled()) throw new MailError("PERSONAL_MAIL_DISABLED", 503);
  if (!isEncryptionKeyConfigured())
    throw new MailError("PERSONAL_MAIL_NOT_CONFIGURED", 503);
}
export function mailReady() {
  try {
    requireMailEnabled();
    mailWebOrigin();
    return true;
  } catch {
    return false;
  }
}
export function mailBrowserOrigins() {
  const origins = ["https://neture.co.kr", "https://www.neture.co.kr"];
  try {
    origins.push(mailWebOrigin());
  } catch {
    /* Canonical account origins must still allow credential destruction. */
  }
  return [...new Set(origins)];
}
export function mailWebOrigin() {
  const url = new URL(
    process.env.PERSONAL_MAIL_WEB_ORIGIN || "https://neture.co.kr",
  );
  const local =
    process.env.NODE_ENV !== "production" &&
    ["127.0.0.1", "localhost"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new MailError("PERSONAL_MAIL_NOT_CONFIGURED", 503);
  return url.origin;
}
export function gmailConfig() {
  const clientId = process.env.PERSONAL_MAIL_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.PERSONAL_MAIL_GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret)
    throw new MailError("GMAIL_NOT_CONFIGURED", 503);
  return {
    clientId,
    clientSecret,
    redirectUri: `${mailWebOrigin()}/mypage/mail/callback`,
  };
}
