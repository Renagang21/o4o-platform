/** Individual delivery failure must never be recorded as success. No recipient truncation. */
export async function deliverOperatorNotifications<T>(
  recipients: readonly T[],
  send: (recipient: T) => Promise<unknown>,
) {
  if (!recipients.length) return "none";
  // Bounded concurrency without silently dropping recipients.
  let fulfilled = 0;
  for (let i = 0; i < recipients.length; i += 20) {
    const results = await Promise.allSettled(
      recipients.slice(i, i + 20).map(send),
    );
    fulfilled += results.filter((r) => r.status === "fulfilled").length;
  }
  return fulfilled === recipients.length
    ? "sent"
    : fulfilled
      ? "partial"
      : "fail";
}
