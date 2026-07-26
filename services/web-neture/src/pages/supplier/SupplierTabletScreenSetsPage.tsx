/**
 * SupplierTabletScreenSetsPage — 공급자 매장용 태블렛 Screen Set 제작·게시
 *
 * WO-O4O-SUPPLIER-SCREEN-SET-UI-STORE-HUB-INTEGRATION-V2C
 *
 * 공급자가 매장 배포용 태블렛 Screen Set 원본(origin='supplier')을 제작·수정·미리보기하고,
 * 대상 매장 유형(약국/비약국/전체)을 지정해 매장 HUB 에 게시한다. 매장은 이를 가져가 **독립 사본**을
 * 만든다(공급자 원본의 수정·게시 해제·보관은 기존 매장 사본에 영향을 주지 않는다).
 *
 * 재사용:
 *   - 제작 셸: @o4o/tablet-screen-set-editor 의 TabletContentStepBuilder (V2a 공유 편집기 — 3번째 소비자).
 *     web-neture 안에 유사 편집기를 새로 만들지 않는다.
 *   - API: supplierScreenSetBuilderApi (V2b /api/v1/kpa/supplier/screen-sets).
 *
 * 차단(WO): 매장·코너 직접 적용 / 공개 URL·QR 생성 / 특정 매장 태블릿 선택·배치 / 매장 제작 콘텐츠 조회.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Loader2, Plus, Layers, Pencil, Trash2, Copy, Send, Archive, ArchiveRestore, RotateCcw, X,
} from 'lucide-react';
import {
  TabletContentStepBuilder, templateLabel,
  type ScreenSetDetail, type Toast, type TabletKioskApi,
} from '@o4o/tablet-screen-set-editor';
import {
  fetchSupplierScreenSets, fetchSupplierScreenSet, removeSupplierScreenSet,
  duplicateSupplierScreenSet, publishSupplierScreenSet, unpublishSupplierScreenSet,
  archiveSupplierScreenSet, unarchiveSupplierScreenSet,
  supplierScreenSetBuilderApi,
  type SupplierScreenSet, type SupplierHubTargetStoreType,
} from '../../lib/api/supplierScreenSets';

// 공급자 원본은 매장 상품·공개 slug 가 없다. 미리보기(previewLayoutOnly)는 sections 만 렌더하고
//   fetchProducts/fetchScreen 을 호출하지 않으므로, 빈 응답 stub + placeholder slug 로 충분하다.
const SUPPLIER_PREVIEW_SLUG = 'supplier-preview';
const supplierPreviewApi: TabletKioskApi = {
  fetchProducts: async () => ({ products: [], storeName: null } as any),
  submitInterest: async () => { throw new Error('공급자 미리보기에서는 상담 요청을 보낼 수 없습니다.'); },
  checkStatus: async () => { throw new Error('not-supported'); },
};

const HUB_TARGET_OPTIONS: { value: SupplierHubTargetStoreType; label: string; hint: string }[] = [
  { value: 'pharmacy', label: '약국', hint: '약국 매장에만 노출' },
  { value: 'non_pharmacy', label: '비약국', hint: '비약국 매장에만 노출' },
  { value: 'all', label: '전체 매장', hint: '약국·비약국 모두 노출' },
];

function statusMeta(status: string): { label: string; cls: string } {
  switch (status) {
    case 'active': return { label: '게시 중', cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' };
    case 'archived': return { label: '보관', cls: 'bg-slate-100 border-slate-200 text-slate-500' };
    default: return { label: '작성 중', cls: 'bg-amber-50 border-amber-200 text-amber-700' };
  }
}

function targetLabel(t: SupplierHubTargetStoreType | null | undefined): string {
  if (t === 'pharmacy') return '약국';
  if (t === 'non_pharmacy') return '비약국';
  if (t === 'all') return '전체 매장';
  return '-';
}

export default function SupplierTabletScreenSetsPage() {
  // WO-O4O-NETURE-SUPPLIER-TABLET-LIST-PERSISTENT-ERROR-STATE-V1:
  //   null = 아직 못 불러옴(로딩/실패). 정상 0건([]) 과 타입 수준에서 구분한다.
  const [sets, setSets] = useState<SupplierScreenSet[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  // builder=null → 리스트. builder.detail=null → 신규. builder.detail=존재 → 수정(hydrate).
  const [builder, setBuilder] = useState<{ detail: ScreenSetDetail | null } | null>(null);
  // 게시 대상 선택 모달.
  const [publishFor, setPublishFor] = useState<SupplierScreenSet | null>(null);
  const [publishTarget, setPublishTarget] = useState<SupplierHubTargetStoreType>('pharmacy');
  const [publishing, setPublishing] = useState(false);

  const previewApi = useMemo(() => supplierPreviewApi, []);

  // WO-O4O-NETURE-SUPPLIER-TABLET-LIST-PERSISTENT-ERROR-STATE-V1:
  //   기존에는 실패를 토스트로만 알리고 setSets([]) 로 남겨, 토스트가 사라지면
  //   "정상 0건" 과 구분되지 않았다. 지속 오류 상태로 분리한다.
  //   토스트는 보조 알림으로 유지하되 서버 원문 대신 고정 문구를 쓴다.
  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setSets(await fetchSupplierScreenSets());
    } catch {
      setSets(null);
      setLoadError(true);
      setToast({ type: 'error', message: '태블렛 화면 목록을 불러오지 못했습니다.' });
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
      const detail = await fetchSupplierScreenSet(id);
      setBuilder({ detail });
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || '원본 상세를 불러오지 못했습니다.' });
    }
  }, []);

  const guard = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  const handleDuplicate = (set: SupplierScreenSet) => guard(async () => {
    try {
      await duplicateSupplierScreenSet(set.id);
      setToast({ type: 'success', message: '복제했습니다.' });
      await reload();
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || '복제하지 못했습니다.' });
    }
  });

  const handleUnpublish = (set: SupplierScreenSet) => guard(async () => {
    try {
      await unpublishSupplierScreenSet(set.id);
      setToast({ type: 'success', message: '게시를 해제했습니다(작성 중).' });
      await reload();
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || '게시 해제하지 못했습니다.' });
    }
  });

  const handleArchive = (set: SupplierScreenSet) => guard(async () => {
    if (!window.confirm(`“${set.name}” 을(를) 보관하시겠습니까?`)) return;
    try {
      await archiveSupplierScreenSet(set.id);
      setToast({ type: 'success', message: '보관했습니다.' });
      await reload();
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || '보관하지 못했습니다.' });
    }
  });

  const handleUnarchive = (set: SupplierScreenSet) => guard(async () => {
    try {
      await unarchiveSupplierScreenSet(set.id);
      setToast({ type: 'success', message: '보관을 해제했습니다(작성 중).' });
      await reload();
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || '보관 해제하지 못했습니다.' });
    }
  });

  const handleRemove = (set: SupplierScreenSet) => guard(async () => {
    if (!window.confirm(`“${set.name}” 을(를) 목록에서 제거하시겠습니까?`)) return;
    try {
      await removeSupplierScreenSet(set.id);
      setToast({ type: 'success', message: '목록에서 제거했습니다.' });
      await reload();
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || '제거하지 못했습니다.' });
    }
  });

  const openPublish = (set: SupplierScreenSet) => {
    setPublishTarget((set.hubTargetStoreType as SupplierHubTargetStoreType) || 'pharmacy');
    setPublishFor(set);
  };

  const confirmPublish = async () => {
    if (!publishFor || publishing) return;
    setPublishing(true);
    try {
      await publishSupplierScreenSet(publishFor.id, publishTarget);
      setToast({ type: 'success', message: '매장 HUB 에 게시했습니다.' });
      setPublishFor(null);
      await reload();
    } catch (e: any) {
      // 의약품/대상/상태 오류를 사용자 문구로 구분(무조건 의약품 문구로 단정하지 않음).
      let msg = e?.message || '게시하지 못했습니다.';
      if (e?.code === 'MEDICATION_PHARMACY_ONLY') {
        msg = '의약품이 포함된 콘텐츠는 약국에만 게시할 수 있습니다. 게시 대상을 약국으로 변경한 후 다시 시도해 주세요.';
      } else if (e?.code === 'HUB_TARGET_REQUIRED') {
        msg = '게시 대상(약국/비약국/전체 매장)을 선택해 주세요.';
      } else if (e?.code === 'EMPTY_SCREEN_SET') {
        msg = '화면 구성(블록)이 비어 있어 게시할 수 없습니다. 먼저 콘텐츠를 추가해 주세요.';
      } else if (e?.code === 'SCREEN_SET_NAME_REQUIRED') {
        msg = '이름이 필요합니다.';
      }
      setToast({ type: 'error', message: msg });
      // 의약품 오류는 대상을 약국으로 바꿔 재시도할 수 있도록 모달 유지.
      if (e?.code !== 'MEDICATION_PHARMACY_ONLY') setPublishFor(null);
    } finally {
      setPublishing(false);
    }
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
          storeSlug={SUPPLIER_PREVIEW_SLUG}
          api={supplierScreenSetBuilderApi}
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
            <Layers className="w-5 h-5 text-indigo-600" /> 매장용 태블렛 콘텐츠
          </h1>
          <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">
            매장에 제공할 태블렛 화면 세트 원본을 제작하고, 대상 매장 유형을 지정해 매장 HUB 에 게시합니다.
            매장이 가져가면 <b>매장 소유의 독립 사본</b>이 만들어지며, 이후 원본을 수정·게시 해제해도 매장 사본은 영향을 받지 않습니다.
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
        ) : loadError ? (
          /* 지속 오류 상태 — 토스트가 사라져도 유지된다. 빈 상태 문구는 노출하지 않는다. */
          <div className="text-center py-12 px-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              태블렛 화면 목록을 불러오지 못했습니다.<br />잠시 후 다시 시도해 주세요.
            </p>
            <button
              type="button"
              onClick={reload}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              다시 시도
            </button>
          </div>
        ) : !sets || sets.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-sm text-slate-500 leading-relaxed">아직 만든 원본이 없습니다.<br />‘원본 만들기’로 매장 배포용 태블렛 화면 세트를 제작해 주세요.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-[12px] text-slate-500 border-b border-slate-100 bg-slate-50/60">
                  <th className="px-4 py-2.5 font-semibold">이름</th>
                  <th className="px-4 py-2.5 font-semibold">상태</th>
                  <th className="px-4 py-2.5 font-semibold">게시 대상</th>
                  <th className="px-4 py-2.5 font-semibold">템플릿</th>
                  <th className="px-4 py-2.5 font-semibold text-center">블록</th>
                  <th className="px-4 py-2.5 font-semibold text-right">작업</th>
                </tr>
              </thead>
              <tbody>
                {sets.map((s) => {
                  const meta = statusMeta(s.status);
                  return (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[11px] rounded-full border ${meta.cls}`}>{meta.label}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{s.status === 'active' ? targetLabel(s.hubTargetStoreType) : '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{templateLabel(s.templateKey)}</td>
                      <td className="px-4 py-3 text-center text-slate-500">{s.blockCount ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {s.status !== 'archived' && (
                            <ActionBtn onClick={() => openEdit(s.id)} icon={<Pencil className="w-3.5 h-3.5" />} label="수정" />
                          )}
                          {s.status !== 'archived' && (
                            <ActionBtn onClick={() => handleDuplicate(s)} disabled={busy} icon={<Copy className="w-3.5 h-3.5" />} label="복제" />
                          )}
                          {s.status === 'draft' && (
                            <ActionBtn onClick={() => openPublish(s)} disabled={busy} tone="primary" icon={<Send className="w-3.5 h-3.5" />} label="게시" />
                          )}
                          {s.status === 'active' && (
                            <ActionBtn onClick={() => handleUnpublish(s)} disabled={busy} icon={<RotateCcw className="w-3.5 h-3.5" />} label="게시 해제" />
                          )}
                          {(s.status === 'draft' || s.status === 'active') && (
                            <ActionBtn onClick={() => handleArchive(s)} disabled={busy} icon={<Archive className="w-3.5 h-3.5" />} label="보관" />
                          )}
                          {s.status === 'archived' && (
                            <ActionBtn onClick={() => handleUnarchive(s)} disabled={busy} icon={<ArchiveRestore className="w-3.5 h-3.5" />} label="보관 해제" />
                          )}
                          <ActionBtn onClick={() => handleRemove(s)} disabled={busy} tone="danger" icon={<Trash2 className="w-3.5 h-3.5" />} label="제거" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 게시 대상 선택 모달 */}
      {publishFor && (
        <div className="fixed inset-0 z-[900] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => !publishing && setPublishFor(null)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-bold text-slate-800 truncate">매장 HUB 게시</div>
                <div className="text-xs text-slate-500 mt-0.5 truncate">“{publishFor.name}”</div>
              </div>
              <button onClick={() => !publishing && setPublishFor(null)} className="p-1.5 rounded hover:bg-slate-100" aria-label="닫기">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-700">게시 대상 매장 유형</div>
              {HUB_TARGET_OPTIONS.map((opt) => (
                <label key={opt.value}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer ${
                    publishTarget === opt.value ? 'border-indigo-400 bg-indigo-50/60' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                  <input type="radio" name="hub-target" value={opt.value}
                    checked={publishTarget === opt.value}
                    onChange={() => setPublishTarget(opt.value)} className="accent-indigo-600" />
                  <span className="text-sm font-medium text-slate-800">{opt.label}</span>
                  <span className="text-[11px] text-slate-400 ml-auto">{opt.hint}</span>
                </label>
              ))}
            </div>

            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">
              의약품이 포함된 콘텐츠는 <b>약국에만</b> 게시할 수 있습니다. 대상 적합성은 게시 시 최종 확인됩니다.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button onClick={() => !publishing && setPublishFor(null)}
                className="min-h-[40px] px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
                취소
              </button>
              <button onClick={() => void confirmPublish()} disabled={publishing}
                className="min-h-[40px] px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-1.5">
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {publishing ? '게시 중…' : '게시'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <ToastView toast={toast} />}
    </div>
  );
}

function ActionBtn({ onClick, icon, label, disabled, tone }: {
  onClick: () => void; icon: ReactNode; label: string; disabled?: boolean;
  tone?: 'primary' | 'danger';
}) {
  const cls = tone === 'primary'
    ? 'text-white bg-indigo-600 border-indigo-600 hover:bg-indigo-700'
    : tone === 'danger'
      ? 'text-red-600 bg-white border-red-200 hover:bg-red-50'
      : 'text-indigo-700 bg-white border-indigo-200 hover:bg-indigo-50';
  return (
    <button onClick={onClick} disabled={disabled}
      className={`min-h-[36px] px-2.5 py-1.5 text-[13px] font-medium border rounded-lg disabled:opacity-40 inline-flex items-center gap-1 ${cls}`}>
      {icon} {label}
    </button>
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
