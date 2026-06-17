/**
 * ServiceAudiencePolicyPage — 약국 대상 서비스 설정 (admin.neture.co.kr 전용)
 *
 * WO-O4O-SERVICE-PHARMACY-AUDIENCE-POLICY-SETTINGS-V1
 *
 * 서비스별 "약국 대상 서비스 여부"를 관리한다. 이 값은 후속 의약품 서비스 연결 gate
 * (WO-O4O-DRUG-SERVICE-CONNECTION-GATE-V1)의 기준값이다.
 * 본 화면은 정책 저장/조회까지만 — gate 실제 적용은 후속 WO.
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Building2, Loader2, CheckCircle, Info } from 'lucide-react';
import { serviceAudiencePolicyApi, type ServiceAudiencePolicy } from '../../lib/api/admin';

export default function ServiceAudiencePolicyPage() {
  // WO-O4O-PLATFORM-SERVICE-AUDIENCE-POLICY-MIGRATION-V1: legacy 진입(/admin/settings/...) 시 이동 안내.
  const { pathname } = useLocation();
  const isLegacyRoute = pathname.startsWith('/admin/settings/service-audience');
  const [rows, setRows] = useState<ServiceAudiencePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await serviceAudiencePolicyApi.list();
      setRows(data);
      setNotes(Object.fromEntries(data.map((r) => [r.serviceKey, r.note || ''])));
    } catch (e: any) {
      setError(e?.message || '목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (row: ServiceAudiencePolicy, nextValue: boolean) => {
    setSavingKey(row.serviceKey);
    setSavedKey(null);
    setError(null);
    const result = await serviceAudiencePolicyApi.update(row.serviceKey, {
      isPharmacyTargetService: nextValue,
      note: notes[row.serviceKey] ?? '',
    });
    setSavingKey(null);
    if (result.success && result.data) {
      setRows((prev) => prev.map((r) => (r.serviceKey === row.serviceKey ? result.data! : r)));
      setSavedKey(row.serviceKey);
      setTimeout(() => setSavedKey((k) => (k === row.serviceKey ? null : k)), 2500);
    } else {
      setError(result.error || '저장에 실패했습니다.');
    }
  };

  const saveNote = async (row: ServiceAudiencePolicy) => {
    if ((notes[row.serviceKey] ?? '') === (row.note || '')) return;
    await save(row, row.isPharmacyTargetService);
  };

  return (
    <div className="max-w-3xl">
      {isLegacyRoute && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-center justify-between gap-3">
          <span>
            서비스 대상 정책은 <strong>O4O 플랫폼 관리</strong> 영역으로 이동되었습니다.
            앞으로는 <code>/admin/platform/service-audience</code> 에서 관리해 주세요.
          </span>
          <a href="/admin/platform/service-audience" className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 no-underline">
            플랫폼으로 이동
          </a>
        </div>
      )}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">서비스 대상 정책 (플랫폼 관리)</h1>
        <p className="text-sm text-slate-500 mt-1">
          서비스 이용자가 <strong>약국</strong>인 서비스를 관리합니다. 의약품 제품은 약국 대상 서비스에만 연결할 수 있도록
          후속 단계에서 이 설정을 기준으로 검증합니다.
        </p>
      </div>

      {/* WO-O4O-NETURE-PLATFORM-ADMIN-SCOPE-SEPARATION-V1: 플랫폼 관리(cross-service) 성격 명시 */}
      <div className="mb-4 flex items-start gap-2 rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-xs text-indigo-800">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          이 설정은 Neture 자체 서비스 설정이 아니라, <strong>O4O 내 여러 서비스의 대상 정책</strong>을 관리하는
          플랫폼 관리 항목입니다. platform 권한(platform:admin / platform:super_admin)으로 관리합니다.
        </div>
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          이 설정은 O4O 내부 운영 기준이며, 법적 허가나 자격을 인증하지 않습니다.
          현재는 정책 값만 저장하며, 실제 의약품 연결 차단은 후속 단계에서 적용됩니다.
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">불러오는 중...</div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const saving = savingKey === row.serviceKey;
            const saved = savedKey === row.serviceKey;
            return (
              <div key={row.serviceKey} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="font-medium text-slate-800">{row.serviceName}</div>
                      <div className="text-xs text-slate-400">{row.serviceKey}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {saved && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle className="w-3.5 h-3.5" /> 저장됨
                      </span>
                    )}
                    {saving && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={row.isPharmacyTargetService}
                        disabled={saving}
                        onChange={(e) => save(row, e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className={row.isPharmacyTargetService ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                        약국 대상 서비스
                      </span>
                    </label>
                  </div>
                </div>

                <div className="mt-3 pl-7">
                  <input
                    type="text"
                    value={notes[row.serviceKey] ?? ''}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [row.serviceKey]: e.target.value }))}
                    onBlur={() => saveNote(row)}
                    placeholder="메모 (선택) — 입력 후 포커스 이동 시 저장"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
