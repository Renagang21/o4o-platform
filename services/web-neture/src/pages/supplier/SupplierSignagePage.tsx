/**
 * SupplierSignagePage — 공급자 디지털 사이니지 제작·게시·보관
 *
 * WO-O4O-NETURE-SUPPLIER-DIGITAL-SIGNAGE-AUTHORING-HUB-IMPORT-V1
 *
 * 흐름: 제작(draft) → 미리보기(YouTube embed) → 게시(active, KPA 매장 HUB 노출)
 *       → 매장이 HUB 에서 가져가 독립 사본(Full Copy)으로 사용.
 * 보관(archived)은 HUB 목록·가져오기·캠페인 대상에서 제외되며, 이미 가져간 매장 사본은 영향 없다.
 *
 * 정책: 연결 상품은 참고 정보(metadata)일 뿐 — 상품 분류로 콘텐츠 조회·가져오기를 제한하지 않는다.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { extractYouTubeVideoId } from '@o4o/types/signage';
import {
  fetchSupplierSignageList,
  createSupplierSignage,
  updateSupplierSignage,
  publishSupplierSignage,
  archiveSupplierSignage,
  unarchiveSupplierSignage,
  removeSupplierSignage,
  type SupplierSignageMedia,
} from '../../lib/api/supplierSignage';
import { supplierApi, type SupplierProduct } from '../../lib/api';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  active: { label: '게시 중', cls: 'bg-emerald-50 text-emerald-700' },
  archived: { label: '보관', cls: 'bg-slate-100 text-slate-500' },
  draft: { label: '작성 중', cls: 'bg-amber-50 text-amber-700' },
};

interface FormState {
  name: string;
  description: string;
  sourceUrl: string;
  linkedProductId: string; // '' = 없음
}
const EMPTY_FORM: FormState = { name: '', description: '', sourceUrl: '', linkedProductId: '' };

function linkedProductName(m: SupplierSignageMedia): string | null {
  const lp = (m.metadata as any)?.linkedProduct;
  return typeof lp?.name === 'string' ? lp.name : null;
}

export default function SupplierSignagePage() {
  const [items, setItems] = useState<SupplierSignageMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierSignageMedia | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<SupplierSignageMedia | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // WO-O4O-NETURE-SUPPLIER-REMAINING-LOAD-ERROR-CONTRACT-V1:
  //   목록 조회 실패를 "정상 0건"(빈 상태) 과 구분되는 지속 오류 상태로 분리한다.
  //   기존 목록은 비우지 않고(재조회 실패 시), 오류 패널 + 재시도로 표면화한다.
  const [loadError, setLoadError] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    fetchSupplierSignageList()
      .then((rows) => setItems(rows))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
    supplierApi.getProducts().then(setProducts).catch(() => {});
  }, [reload]);

  const formVideoId = useMemo(() => extractYouTubeVideoId(form.sourceUrl), [form.sourceUrl]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setEditorOpen(true);
  };
  const openEdit = (m: SupplierSignageMedia) => {
    const lp = (m.metadata as any)?.linkedProduct;
    setEditing(m);
    setForm({
      name: m.name,
      description: m.description ?? '',
      sourceUrl: m.sourceUrl,
      linkedProductId: typeof lp?.productId === 'string' ? lp.productId : '',
    });
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setMessage({ type: 'error', text: '제목을 입력해 주세요.' }); return; }
    if (!form.sourceUrl.trim()) { setMessage({ type: 'error', text: 'YouTube URL 을 입력해 주세요.' }); return; }
    setSaving(true);
    try {
      const product = products.find((p) => p.id === form.linkedProductId) || null;
      const metadata = product
        ? { linkedProduct: { productId: product.id, masterId: product.masterId ?? null, name: product.name || product.masterName || '' } }
        : {};
      const input = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        sourceUrl: form.sourceUrl.trim(),
        metadata,
      };
      if (editing) {
        await updateSupplierSignage(editing.id, input);
        setMessage({ type: 'success', text: '사이니지를 수정했습니다.' });
      } else {
        await createSupplierSignage(input);
        setMessage({ type: 'success', text: '사이니지를 만들었습니다. 게시하면 매장 HUB에 노출됩니다.' });
      }
      setEditorOpen(false);
      reload();
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || '저장에 실패했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  const doAction = async (m: SupplierSignageMedia, action: 'publish' | 'archive' | 'unarchive' | 'remove') => {
    if (action === 'remove' && !window.confirm(`"${m.name}" 을(를) 삭제할까요? 이미 매장이 가져간 사본은 영향받지 않습니다.`)) return;
    setBusyId(m.id);
    try {
      if (action === 'publish') { await publishSupplierSignage(m.id); setMessage({ type: 'success', text: '게시했습니다. 매장 HUB에 노출됩니다.' }); }
      if (action === 'archive') { await archiveSupplierSignage(m.id); setMessage({ type: 'success', text: '보관했습니다. HUB 목록·가져오기에서 제외됩니다.' }); }
      if (action === 'unarchive') { await unarchiveSupplierSignage(m.id); setMessage({ type: 'success', text: '보관을 해제했습니다(작성 중 상태).' }); }
      if (action === 'remove') { await removeSupplierSignage(m.id); setMessage({ type: 'success', text: '삭제했습니다.' }); }
      reload();
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || '처리에 실패했습니다.' });
    } finally {
      setBusyId(null);
    }
  };

  const previewVideoId = preview ? extractYouTubeVideoId(preview.sourceUrl) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">디지털 사이니지</h1>
          <p className="mt-1 text-sm text-slate-500">
            YouTube 동영상을 연결한 사이니지를 만들어 게시하면 매장 HUB에 제공됩니다. 매장은 독립 사본으로
            가져가 자기 사이니지에 활용합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          새 사이니지
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 flex items-start justify-between gap-3 rounded-lg border p-3 text-sm ${
            message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} className="shrink-0 text-slate-400 hover:text-slate-600" aria-label="닫기">✕</button>
        </div>
      )}

      {/* 재조회 실패 — 기존 목록은 유지하고 상단 스트립으로 알린다 (WO 묶음 4 §7) */}
      {loadError && items.length > 0 && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <span>목록을 새로 고치지 못했습니다. 이전 목록을 표시합니다.</span>
          <button type="button" onClick={reload} className="shrink-0 rounded-md bg-amber-100 px-3 py-1 font-medium text-amber-800 hover:bg-amber-200">다시 시도</button>
        </div>
      )}

      {/* 목록 */}
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">불러오는 중…</div>
        ) : loadError && items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-500">사이니지 목록을 불러오지 못했습니다.</p>
            <button
              type="button"
              onClick={reload}
              className="mt-3 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
            >
              다시 시도
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            아직 만든 사이니지가 없습니다. [새 사이니지]로 시작하세요.
          </div>
        ) : (
          items.map((m) => {
            const badge = STATUS_META[m.status] ?? STATUS_META.draft;
            const lp = linkedProductName(m);
            return (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-12 w-20 shrink-0 overflow-hidden rounded bg-slate-100">
                  {m.thumbnailUrl ? (
                    <img src={m.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">동영상</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-800">{m.name}</p>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {m.sourceType === 'youtube' ? 'YouTube' : 'Vimeo'}
                    {lp ? ` · 연결 상품: ${lp}` : ''}
                    {m.description ? ` · ${m.description}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 text-sm">
                  <button type="button" onClick={() => setPreview(m)} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-600 hover:bg-slate-200">미리보기</button>
                  {m.status !== 'archived' && (
                    <button type="button" onClick={() => openEdit(m)} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-600 hover:bg-slate-200">수정</button>
                  )}
                  {m.status === 'draft' && (
                    <button type="button" disabled={busyId === m.id} onClick={() => doAction(m, 'publish')} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50">게시</button>
                  )}
                  {m.status === 'active' && (
                    <button type="button" disabled={busyId === m.id} onClick={() => doAction(m, 'archive')} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-600 hover:bg-slate-200 disabled:opacity-50">보관</button>
                  )}
                  {m.status === 'archived' && (
                    <>
                      <button type="button" disabled={busyId === m.id} onClick={() => doAction(m, 'unarchive')} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-600 hover:bg-slate-200 disabled:opacity-50">보관 해제</button>
                      <button type="button" disabled={busyId === m.id} onClick={() => doAction(m, 'remove')} className="rounded-lg bg-red-50 px-2.5 py-1.5 text-red-600 hover:bg-red-100 disabled:opacity-50">삭제</button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        게시 중인 사이니지는 매장 HUB에서 가져갈 수 있습니다. 보관하면 HUB 목록·가져오기에서 제외되지만,
        이미 매장이 가져간 사본은 독립 사본이라 영향받지 않습니다.
      </p>

      {/* 제작/수정 폼 */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">{editing ? '사이니지 수정' : '새 사이니지'}</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500">제목 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  maxLength={200}
                  placeholder="예: 오메가3 신제품 소개 영상"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">YouTube URL *</label>
                <input
                  type="text"
                  value={form.sourceUrl}
                  onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {form.sourceUrl.trim() && !formVideoId && !form.sourceUrl.includes('vimeo.com/') && (
                  <p className="mt-1 text-xs text-red-600">유효한 YouTube URL 이 아닙니다.</p>
                )}
              </div>
              {/* 입력 즉시 미리보기 */}
              {formVideoId && (
                <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
                  <iframe
                    title="미리보기"
                    src={`https://www.youtube.com/embed/${formVideoId}`}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-500">문구 (선택)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="매장 화면에 함께 안내할 문구"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">연결 상품 (선택 — 참고 정보)</label>
                <select
                  value={form.linkedProductId}
                  onChange={(e) => setForm((f) => ({ ...f, linkedProductId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">연결 안 함</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name || p.masterName || p.id.slice(0, 8)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditorOpen(false)} disabled={saving} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50">취소</button>
              <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {saving ? '저장 중…' : editing ? '저장' : '만들기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 미리보기 모달 */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" onClick={() => setPreview(null)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="truncate text-base font-bold text-slate-900">{preview.name}</h3>
              <button type="button" onClick={() => setPreview(null)} className="shrink-0 text-slate-400 hover:text-slate-600" aria-label="닫기">✕</button>
            </div>
            {previewVideoId ? (
              <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
                <iframe
                  title={preview.name}
                  src={`https://www.youtube.com/embed/${previewVideoId}?autoplay=1&mute=1`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <a href={preview.sourceUrl} target="_blank" rel="noreferrer" className="text-sm text-emerald-700 underline">
                동영상 열기
              </a>
            )}
            {preview.description && <p className="mt-2 text-sm text-slate-600">{preview.description}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
