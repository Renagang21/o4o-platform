import { mailBrowserOrigins, mailReady } from "../config.js";
import { randomBytes } from "node:crypto";
import {
  seal,
  unseal,
  confirmationToken,
  validConfirmation,
} from "../credentials.js";
import {
  mailToolSchemas,
  selectionSchema,
  ruleSchema,
  normalizeSender,
} from "../contracts.js";

const user = "5d35176e-6689-42ea-9332-9fe75207df87",
  account = "7e8c9f74-bc4e-4b3c-8627-5ca12740ee80";
const previous = process.env.ENCRYPTION_KEY;
beforeEach(() => {
  process.env.ENCRYPTION_KEY = randomBytes(48).toString("base64url");
});
afterAll(() => {
  if (previous === undefined) delete process.env.ENCRYPTION_KEY;
  else process.env.ENCRYPTION_KEY = previous;
});
it("binds authenticated credentials to the owner/account and detects corruption", () => {
  const credential = { refreshToken: randomBytes(32).toString("base64url") },
    cipher = seal(credential, `${user}:${account}`);
  expect(cipher).not.toContain(credential.refreshToken);
  expect(unseal(cipher, `${user}:${account}`)).toEqual(credential);
  expect(() => unseal(cipher, `${account}:${user}`)).toThrow(
    "MAIL_CREDENTIAL_UNAVAILABLE",
  );
  const parts = cipher.split(".");
  parts[1] = randomBytes(16).toString("base64url");
  expect(() => unseal(parts.join("."), `${user}:${account}`)).toThrow(
    "MAIL_CREDENTIAL_UNAVAILABLE",
  );
});
it("fails closed without the existing canonical key and signs the exact confirmation meaning", () => {
  const token = confirmationToken("owner:job:count:1");
  expect(validConfirmation("owner:job:count:2", token)).toBe(false);
  expect(validConfirmation("owner:job:count:1", token)).toBe(true);
  delete process.env.ENCRYPTION_KEY;
  expect(() => seal({}, user)).toThrow("ENCRYPTION_KEY_NOT_CONFIGURED");
});
it("rejects permanent deletion, forged approval/ownership, provider hosts and oversized batches", () => {
  const input = {
    accountId: account,
    senders: ["notice@example.invalid"],
    action: "trash",
    requestId: user,
  };
  expect(selectionSchema.safeParse(input).success).toBe(true);
  for (const extra of [
    { action: "delete" },
    { userId: user },
    { confirmed: true },
    { host: "imap.example.invalid" },
    { senders: Array(101).fill("notice@example.invalid") },
  ])
    expect(selectionSchema.safeParse({ ...input, ...extra }).success).toBe(
      false,
    );
  expect(
    ruleSchema.safeParse({ ...input, action: "keep", category: "work" })
      .success,
  ).toBe(true);
  expect(
    Object.keys(mailToolSchemas).some((name) =>
      /confirm|delete|send_mail/.test(name),
    ),
  ).toBe(false);
});
it("separates mailbox identity and message identity and normalizes a sender without copying display text", () => {
  expect(normalizeSender("Display text <Notice@Example.invalid>")).toBe(
    "notice@example.invalid",
  );
  expect(
    mailToolSchemas.get_mail_message.safeParse({
      accountId: "mail:" + account,
      messageId: "opaque",
    }).success,
  ).toBe(false);
  expect(
    mailToolSchemas.get_mail_message.safeParse({
      accountId: account,
      messageId: "opaque",
      content: "instructions",
    }).success,
  ).toBe(false);
});

it("isolates malformed optional mail configuration while preserving canonical disconnect origins", () => {
  const origin = process.env.PERSONAL_MAIL_WEB_ORIGIN;
  process.env.PERSONAL_MAIL_WEB_ORIGIN = "malformed";
  try {
    expect(mailReady()).toBe(false);
    expect(mailBrowserOrigins()).toEqual([
      "https://neture.co.kr",
      "https://www.neture.co.kr",
    ]);
  } finally {
    if (origin === undefined) delete process.env.PERSONAL_MAIL_WEB_ORIGIN;
    else process.env.PERSONAL_MAIL_WEB_ORIGIN = origin;
  }
});
