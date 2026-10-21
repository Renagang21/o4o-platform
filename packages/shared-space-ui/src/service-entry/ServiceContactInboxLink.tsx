import { useEffect, useState } from "react";
type Client = { get(path: string): Promise<unknown> };
/** A count of received inquiries, scoped to both service and signed-in account. */
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
    if (!enabled || !accountId) return;
    let active = true;
    const read = async () => {
      try {
        const response = (await client.get(
          `/admin/services/${encodeURIComponent(serviceKey)}/contact-inquiries/summary`,
        )) as { data?: { data?: { newCount?: number } } };
        const count = response.data?.data?.newCount;
        if (
          active &&
          typeof count === "number" &&
          Number.isInteger(count) &&
          count >= 0
        )
          setValue({ scope, count });
      } catch {
        /* The protected inbox retains its own explicit loading/error state. */
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
  if (!enabled) return null;
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
