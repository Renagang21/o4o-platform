import { useEffect, useState } from "react";
type Client = { get(path: string): Promise<unknown> };
/** Server-confirmed inbox access: null is unconfirmed/denied; zero is allowed.
 * Scoped to the current account/service, refreshed on focus and every 30 seconds. */
export function useServiceContactCount({
  client,
  serviceKey,
  accountId,
  enabled,
}: {
  client: Client;
  serviceKey: string;
  accountId?: string;
  enabled: boolean;
}) {
  const scope = `${accountId}:${serviceKey}`;
  const [value, setValue] = useState<{ scope: string; count: number } | null>(
    null,
  );
  useEffect(() => {
    setValue(null);
    if (!enabled || !accountId) return;
    let active = true;
    let sequence = 0;
    const read = async () => {
      const request = ++sequence;
      try {
        const response = (await client.get(
          `/admin/services/${encodeURIComponent(serviceKey)}/contact-inquiries/summary`,
        )) as { data?: { data?: { newCount?: number } } };
        const count = response.data?.data?.newCount;
        if (!active || request !== sequence) return;
        if (typeof count === "number" && Number.isInteger(count) && count >= 0)
          setValue({ scope, count });
        else setValue(null);
      } catch {
        if (active && request === sequence) setValue(null);
      }
    };
    void read();
    const timer = setInterval(() => {
      if (document.visibilityState !== "hidden") void read();
    }, 30000);
    window.addEventListener("focus", read);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", read);
    };
  }, [client, serviceKey, accountId, enabled, scope]);
  return enabled && value?.scope === scope ? value.count : null;
}
export function ServiceContactInboxLink({
  client,
  serviceKey,
  accountId,
  enabled,
  href,
  label = "문의 관리",
}: {
  client: Client;
  serviceKey: string;
  accountId?: string;
  enabled: boolean;
  href?: string;
  label?: string;
}) {
  const count = useServiceContactCount({
    client,
    serviceKey,
    accountId,
    enabled,
  });
  if (count === null) return null;
  return (
    <a
      href={
        href ||
        `https://neture.co.kr/operator/service-contact/${encodeURIComponent(serviceKey)}`
      }
    >
      {label}
      {count ? ` · 새 문의 ${count}` : ""}
    </a>
  );
}
