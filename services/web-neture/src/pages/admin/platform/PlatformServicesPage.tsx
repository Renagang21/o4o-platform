/**
 * PlatformServicesPage — /admin/platform/services
 *
 * WO-O4O-PLATFORM-ACCOUNTS-SERVICES-UI-V1
 *
 * 기존 backend `/api/v1/admin/platform-services` 재사용. O4O 서비스 카탈로그 **read-only** 조회.
 * 1차는 목록/상태 표시만 — 상태 변경(PATCH /:code)은 후속 WO 로 분리(무리하게 쓰지 않음).
 */

import { useState, useEffect, useCallback } from 'react';
import { platformAdminApi, type PlatformService } from '../../../lib/api/platform';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  active: { label: '활성', cls: 'bg-emerald-50 text-emerald-700' },
  hidden: { label: '숨김', cls: 'bg-slate-100 text-slate-500' },
};

export default function PlatformServicesPage() {
  const [services, setServices] = useState<PlatformService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await platformAdminApi.getServices();
      list.sort((a, b) => (a.featuredOrder ?? 0) - (b.featuredOrder ?? 0) || a.code.localeCompare(b.code));
      setServices(list);
    } catch (err: any) {
      setError(err?.message || '서비스 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">플랫폼 서비스 관리</h1>
      <p className="text-sm text-slate-500 mb-6">
        O4O 서비스 카탈로그를 조회합니다. (1차 read-only — 상태/설정 변경은 후속 작업에서 연결됩니다.)
      </p>

      {error ? (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">{error}</div>
      ) : loading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-14 bg-slate-100 rounded animate-pulse" />)}</div>
      ) : services.length === 0 ? (
        <div className="text-center py-16 text-sm text-slate-400">등록된 서비스가 없습니다.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {services.map((s) => {
            const meta = STATUS_META[s.status] || { label: s.status, cls: 'bg-slate-100 text-slate-500' };
            return (
              <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl shrink-0">{s.iconEmoji || '🔧'}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{s.name}</p>
                      <p className="text-xs text-slate-400 font-mono">{s.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {s.isFeatured && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700">대표</span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta.cls}`}>{meta.label}</span>
                  </div>
                </div>
                {s.shortDescription && (
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-2">{s.shortDescription}</p>
                )}
                <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-400">
                  <span>유형: {s.serviceType}</span>
                  {s.approvalRequired && <span>· 승인 필요</span>}
                  {s.entryUrl && <span className="truncate">· {s.entryUrl}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
