/**
 * OperatorTabletScreenSetsPage — 운영자 Screen Set 원본 제작기
 *
 * WO-O4O-OPERATOR-SCREEN-SET-AUTHORING-FOUNDATION-V1
 *
 * 운영자가 매장 배포용 Screen Set 원본(operator_template)을 제작·수정·미리보기·제거한다.
 * 매장 제작기(StoreTabletDisplaysPage)와 **동일한 단계형 제작 셸**(TabletContentStepBuilder)을 재사용하되,
 * 저장/미리보기/검색은 운영자 API(operatorScreenSetBuilderApi)로 라우팅하고 콘텐츠 출처는 O4O 표준 설명서만 노출한다.
 *
 * 매장/코너 적용·current 지정·공개 타블렛 URL·Screen Set QR·매장 콘텐츠 조회는 제공하지 않는다(WO 차단 조건).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Layers, Pencil, Trash2 } from 'lucide-react';
import type { TabletKioskApi } from '@o4o/tablet-kiosk-core';
import { TabletContentStepBuilder, templateLabel } from '@o4o/tablet-screen-set-editor';
import type { ScreenSet, ScreenSetDetail } from '../../../api/tabletDisplays';
import {
  fetchOperatorScreenSets, fetchOperatorScreenSet, removeOperatorScreenSet,
  operatorScreenSetBuilderApi,
} from '../../../api/operatorTabletScreenSets';

type Toast = { type: 'success' | 'error'; message: string };

// 운영자 원본은 매장 상품·공개 slug 가 없다. 미리보기(previewLayoutOnly)는 previewScreen(sections)만 렌더하고
//   fetchProducts/fetchScreen 을 호출하지 않으므로, 빈 응답 stub + placeholder slug 로 충분하다.
const OPERATOR_PREVIEW_SLUG = 'operator-preview';
const operatorPreviewApi: TabletKioskApi = {
  fetchProducts: async () => ({ products: [], storeName: null } as any),
  submitInterest: async () => { throw new Error('운영자 미리보기에서는 상담 요청을 보낼 수 없습니다.'); },
  checkStatus: async () => { throw new Error('not-supported'); },
  // fetchScreen 미주입 — previewScreen 주입 시 호출되지 않음.
};

export default function OperatorTabletScreenSetsPage() {
  const [sets, setSets] = useState<ScreenSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  // builder=null → 리스트. builder.detail=null → 신규. builder.detail=존재 → 수정(hydrate).
  const [builder, setBuilder] = useState<{ detail: ScreenSetDetail | null } | null>(null);

  const previewApi = useMemo(() => operatorPreviewApi, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setSets(await fetchOperatorScreenSets());
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || '화면 세트를 불러오지 못했습니다.' });
      setSets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const openCreate = useCallback(() => setBuilder({ detail: null }), []);
  const openEdit = useCallback(async (id: string) => {
    try {
      const detail = await fetchOperatorScreenSet(id);
      setBuilder({ detail });
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || '원본 상세를 불러오지 못했습니다.' });
    }
  }, []);

  const handleRemove = async (set: ScreenSet) => {
    if (busy) return;
    if (!window.confirm(`“${set.name}” 을(를) 목록에서 제거하시겠습니까?`)) return;
    setBusy(true);
    try {
      await removeOperatorScreenSet(set.id);
      setToast({ type: 'success', message: '목록에서 제거했습니다.' });
      await reload();
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || '제거하지 못했습니다.' });
    } finally { setBusy(false); }
  };

  if (builder) {
    return (
      <div className="p-4 lg:p-6">
        <TabletContentStepBuilder
          initialDetail={builder.detail}
          onCancel={() => setBuilder(null)}
          onSaved={() => { setBuilder(null); reload(); }}
          onToast={setToast}
          previewApi={previewApi}
          storeSlug={OPERATOR_PREVIEW_SLUG}
          api={operatorScreenSetBuilderApi}
          contentSources={['spd']}
        />
        {toast && <ToastView toast={toast} />}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" /> 태블릿 화면 세트 원본
          </h1>
          <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">
            매장에 배포할 태블릿 화면 세트 원본을 제작합니다. 여기서 만든 원본은 운영자 소유이며, 매장·코너에 직접 적용되지 않습니다.
          </p>
        </div>
        <button onClick={openCreate}
          className="min-h-[44px] px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 inline-flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> 원본 만들기
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-10 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> 불러오는 중…
          </div>
        ) : sets.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-sm text-slate-500 leading-relaxed">아직 만든 원본이 없습니다.<br />‘원본 만들기’로 매장 배포용 화면 세트를 제작해 주세요.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[12px] text-slate-500 border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-2.5 font-semibold">이름</th>
                <th className="px-4 py-2.5 font-semibold">템플릿</th>
                <th className="px-4 py-2.5 font-semibold text-center">블록</th>
                <th className="px-4 py-2.5 font-semibold text-right">작업</th>
              </tr>
            </thead>
            <tbody>
              {sets.map((s) => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                  <td className="px-4 py-3 text-slate-600">{templateLabel(s.templateKey)}</td>
                  <td className="px-4 py-3 text-center text-slate-500">{s.blockCount ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => openEdit(s.id)}
                        className="min-h-[36px] px-2.5 py-1.5 text-[13px] font-medium text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 inline-flex items-center gap-1">
                        <Pencil className="w-3.5 h-3.5" /> 수정
                      </button>
                      <button onClick={() => handleRemove(s)} disabled={busy}
                        className="min-h-[36px] px-2.5 py-1.5 text-[13px] font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-40 inline-flex items-center gap-1">
                        <Trash2 className="w-3.5 h-3.5" /> 제거
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toast && <ToastView toast={toast} />}
    </div>
  );
}

function ToastView({ toast }: { toast: Toast }) {
  return (
    <div className={`fixed bottom-6 right-6 z-[1000] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
      toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
    }`}>
      {toast.message}
    </div>
  );
}
