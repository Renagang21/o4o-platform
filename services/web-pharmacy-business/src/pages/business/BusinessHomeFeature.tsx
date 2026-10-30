import { useEffect, useState, type ReactNode } from 'react';
import { HomeHeroView, HomePromotionView, homePresentationPath } from '@o4o/shared-space-ui';
import { parseHomePresentation, visibleHomePresentation, type HomePresentation } from '@o4o/types';
import { authClient, useAuth } from '../../contexts/AuthContext';

/** Existing business publications only; no generic service introduction fallback. */
export default function BusinessHomeFeature({ businessKey, mode = "all", fallback = null }: Readonly<{ businessKey: string; mode?: "all" | "hero" | "promotions"; fallback?: ReactNode }>) {
  const { user } = useAuth();
  const scope = `${user?.id}:${businessKey}`;
  const [result, setResult] = useState<{ scope: string; document: HomePresentation | null; error: boolean } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    let pending = false;
    const refresh = async () => {
      if (pending) return;
      pending = true;
      try {
        const response = await authClient.api.get(homePresentationPath(businessKey === 'carepharm' ? 'carepharm' : 'pharmacy', undefined, businessKey));
        if (response.data.success !== true) throw new Error('Invalid publication');
        const publication = response.data.data === null ? null : parseHomePresentation(response.data.data);
        if (alive) setResult({ scope, document: publication, error: false });
      } catch {
        if (alive) setResult({ scope, document: null, error: true });
      } finally { pending = false; }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    document.addEventListener('visibilitychange', onVisible);
    return () => { alive = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [scope, businessKey, retry]);
  const current = result?.scope === scope ? result : null;
  if (mode === "hero" && (!current || current.error || !current.document || !visibleHomePresentation(current.document).slides.length)) return <>{fallback}</>;
  if (!current) return <output className="block py-2 text-sm text-slate-500">사업 소식을 확인하고 있습니다…</output>;
  if (current.error) return <div className="rounded-lg border p-4 text-sm"><p role="alert">본부 전시 소식을 불러오지 못했습니다.</p><button type="button" className="mt-2 min-h-11 text-blue-700" onClick={() => setRetry(n => n + 1)}>전시 소식 다시 확인</button></div>;
  if (!current.document) return null;
  const visible = visibleHomePresentation(current.document);
  if (!visible.slides.length && !visible.promotions.length) return null;
  return <div className="space-y-4">
    {mode !== "promotions" && !!visible.slides.length && <HomeHeroView surface={businessKey === 'carepharm' ? 'carepharm' : 'pharmacy'} businessKey={businessKey} config={current.document} heading={mode === "hero" ? "h1" : "h2"} titleId={mode === "hero" ? "member-home-title" : "business-feature-title"} fallbackTitle="본부 소식" />}
    {mode !== "hero" && <HomePromotionView surface={businessKey === 'carepharm' ? 'carepharm' : 'pharmacy'} config={current.document} />}
  </div>;
}
