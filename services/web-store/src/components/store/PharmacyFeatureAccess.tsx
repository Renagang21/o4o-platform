import { useEffect, useState } from "react";
import type { StoreDashboardConfig } from "@o4o/store-ui-core";
import { coreApiClient } from "../../api/client";

export type PharmacyFeature =
  | "tablet"
  | "multilingual-content"
  | "store-staff-support"
  | "multilingual-consultation"
  | "multilingual-staff-response"
  | "multilingual-pharmacist-consultation";
export type FeatureAccess = {
  organizationId: string;
  features: Array<{ key: PharmacyFeature; allowed: boolean | null }>;
};
export function pharmacyFeatureForPath(path: string): PharmacyFeature | null {
  if (/\/staff-support(?:\/|$)/.test(path)) return "store-staff-support";
  if (
    /\/(commerce\/tablet-displays|requests|channels\/tablet)(\/|$)/.test(path)
  )
    return "tablet";
  if (
    /\/products\/multilingual\//.test(path) ||
    /\/library\/multilingual-product-contents\/?$/.test(path)
  )
    return "multilingual-content";
  return null;
}
export function filterPharmacyFeatureMenu(
  config: StoreDashboardConfig,
  access: FeatureAccess | null,
): StoreDashboardConfig {
  return {
    ...config,
    menuSections: config.menuSections?.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const features = pharmacyFeaturesForPath(item.subPath);
        return (
          !features.length ||
          access?.features.some((f) => features.includes(f.key) && f.allowed === true)
        );
      }),
    })),
  };
}

export function pharmacyFeaturesForPath(path: string): PharmacyFeature[] {
  if (/\/multilingual-consultation(?:\/|$)/.test(path)) return ['multilingual-consultation', 'multilingual-staff-response', 'multilingual-pharmacist-consultation'];
  const feature = pharmacyFeatureForPath(path);
  return feature ? [feature] : [];
}

function validFeatureResponse(
  response: { success: boolean; data: FeatureAccess },
  organizationId: string,
) {
  return (
    response.success &&
    response.data.organizationId === organizationId &&
    Array.isArray(response.data.features) &&
    ["tablet", "multilingual-content"].every((key) =>
      response.data.features.some(
        (feature) =>
          feature.key === key &&
          (typeof feature.allowed === "boolean" || feature.allowed === null),
      ),
    )
  );
}

/** Never reuse an earlier organization's or earlier navigation's result. APIs remain authoritative. */
export function usePharmacyFeatureAccess(
  organizationId: string | null,
  enabled: boolean,
  path: string,
  accountId = '',
) {
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    scope: string;
    data?: FeatureAccess;
    error?: boolean;
  } | null>(null);
  const scope = `${accountId}:${organizationId}:${path}:${retry}`;
  useEffect(() => {
    if (!enabled || !organizationId) return;
    let cancelled = false;
    let requestId = 0;
    const load = () => {
      const currentRequest = ++requestId;
      setResult(null);
      coreApiClient
        .get<{ success: boolean; data: FeatureAccess }>(
          "/neture/pharmacy/service-features",
        )
        .then((response) => {
          if (cancelled || currentRequest !== requestId) return;
          if (!validFeatureResponse(response, organizationId))
            throw new Error("Invalid feature response");
          setResult({ scope, data: response.data });
        })
        .catch(() => {
          if (!cancelled && currentRequest === requestId)
            setResult({ scope, error: true });
        });
    };
    load();
    window.addEventListener("focus", load);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", load);
    };
  }, [enabled, organizationId, scope]);
  return {
    data: result?.scope === scope ? (result.data ?? null) : null,
    error: result?.scope === scope && result.error === true,
    reload: () => setRetry((value) => value + 1),
  };
}

export function PharmacyFeatureNotice({
  error,
  denied,
  reload,
}: Readonly<{ error: boolean; denied: boolean; reload: () => void }>) {
  let title = "서비스 이용 자격 확인 중";
  if (denied) title = "서비스 이용 자격이 필요합니다";
  if (error) title = "서비스 이용 자격을 확인하지 못했습니다";
  return (
    <section aria-live="polite" className="m-4 rounded-lg border bg-white p-5">
      <h2 className="font-semibold">{title}</h2>
      {denied && (
        <p className="mt-2">
          약국의 기본·유료·협력사업 제공 기능과 My Home에서 경영자가 허용한
          근무자 이용 범위를 확인해 주세요.
        </p>
      )}
      {(error || denied) && (
        <button
          type="button"
          className="mt-3 rounded border px-3 py-2"
          onClick={reload}
        >
          다시 확인
        </button>
      )}
    </section>
  );
}
