import { useEffect, useState } from 'react';
import type { StoreDashboardConfig } from '@o4o/store-ui-core';
import { coreApiClient } from '../../api/client';

export type PharmacyFeature = 'tablet' | 'multilingual-content' | 'store-staff-support';
export type FeatureAccess = { organizationId: string; features: Array<{ key: PharmacyFeature; allowed: boolean | null }> };
export function pharmacyFeatureForPath(path: string): PharmacyFeature | null {
  if (/\/staff-support(?:\/|$)/.test(path)) return 'store-staff-support';
  if (/\/(commerce\/tablet-displays|requests|channels\/tablet)(\/|$)/.test(path)) return 'tablet';
  if (/\/products\/multilingual\//.test(path) || /\/library\/multilingual-product-contents\/?$/.test(path)) return 'multilingual-content';
  return null;
}
export function filterPharmacyFeatureMenu(config: StoreDashboardConfig, access: FeatureAccess | null): StoreDashboardConfig {
  return { ...config, menuSections: config.menuSections?.map(section => ({ ...section,
    items: section.items.filter(item => {
      const feature = pharmacyFeatureForPath(item.subPath);
      return !feature || access?.features.some(f => f.key === feature && f.allowed === true);
    }),
  })) };
}

/** Never reuse an earlier organization's or earlier navigation's result. APIs remain authoritative. */
export function usePharmacyFeatureAccess(organizationId: string | null, enabled: boolean, path: string) {
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ scope: string; data?: FeatureAccess; error?: boolean } | null>(null);
  const scope = `${organizationId}:${path}:${retry}`;
  useEffect(() => {
    if (!enabled || !organizationId) return;
    let cancelled = false;
    let requestId = 0;
    const load = () => {
      const currentRequest = ++requestId;
      setResult(null);
      coreApiClient.get<{ success: boolean; data: FeatureAccess }>('/neture/pharmacy/service-features')
        .then(response => {
          if (cancelled || currentRequest !== requestId) return;
          if (!response.success || response.data.organizationId !== organizationId ||
            !Array.isArray(response.data.features) || !['tablet', 'multilingual-content'].every(key =>
              response.data.features.some(f => f.key === key && (typeof f.allowed === 'boolean' || f.allowed === null)))) throw new Error('Invalid feature response');
          setResult({ scope, data: response.data });
        }).catch(() => { if (!cancelled && currentRequest === requestId) setResult({ scope, error: true }); });
    };
    load();
    window.addEventListener('focus', load);
    return () => { cancelled = true; window.removeEventListener('focus', load); };
  }, [enabled, organizationId, scope]);
  return { data: result?.scope === scope ? result.data ?? null : null,
    error: result?.scope === scope && result.error === true,
    reload: () => setRetry(value => value + 1) };
}

export function PharmacyFeatureNotice({ error, denied, reload }: { error: boolean; denied: boolean; reload: () => void }) {
  return <section aria-live="polite" className="m-4 rounded-lg border bg-white p-5">
    <h2 className="font-semibold">{error ? '서비스 이용 자격을 확인하지 못했습니다' : denied ? '서비스 이용 자격이 필요합니다' : '서비스 이용 자격 확인 중'}</h2>
    {denied && <p className="mt-2">경영자 유료회원 자격 또는 가입한 약국 협력사업의 제공 기능을 확인해 주세요.</p>}
    {(error || denied) && <button className="mt-3 rounded border px-3 py-2" onClick={reload}>다시 확인</button>}
  </section>;
}
