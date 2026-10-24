/** Preserve Certificate.renew() local-calendar overflow, including month ends and leap years. */
export function certificateRenewalExpiry(months: number, now = new Date()): Date {
  const expirationDate = new Date(now.getTime());
  expirationDate.setMonth(expirationDate.getMonth() + months);
  return expirationDate;
}
