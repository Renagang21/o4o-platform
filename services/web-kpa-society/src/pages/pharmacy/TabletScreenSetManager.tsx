/**
 * TabletScreenSetManager — 태블릿 Screen Set / Block 1차 Editor UX
 *
 * WO-O4O-KPA-TABLET-SCREEN-SET-BLOCK-EDITOR-UX-V1
 *   선택된 코너/태블릿의 Screen Set 목록·생성·수정·archive·적용/해제 + Screen Block 편집.
 *   선행 구현 관리 API(/store/screen-sets, /store/tablets/:id/current-screen-set)만 사용.
 *   적용된 Screen Set 은 공개 GET /:slug/tablet/screen → kiosk-core 뷰어에 반영됨(PUBLIC-RUNTIME-READ 완료).
 *   기존 legacy 진열/대기화면 편집 영역은 그대로 유지(이 컴포넌트는 additive).
 */
import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, ChevronUp, ChevronDown, X, Save, Layers, AlertTriangle, LayoutTemplate } from 'lucide-react';
import {
  fetchScreenSets, fetchScreenSet, createScreenSet, updateScreenSet,
  archiveScreenSet, saveScreenSetBlocks, applyCurrentScreenSet, clearCurrentScreenSet,
  type ScreenSet, type ScreenSetDetail, type ScreenBlock, type ScreenBlockType, type ScreenSetStatus,
} from '../../api/tabletDisplays';

type Toast = { type: 'success' | 'error'; message: string };

interface Props {
  tabletId: string;
  currentScreenSetId: string | null;
  onCurrentChange: (id: string | null) => void;
  onToast: (t: Toast) => void;
}

const BLOCK_TYPES: { value: ScreenBlockType; label: string }[] = [
  { value: 'idle_media', label: '대기화면(Idle)' },
  { value: 'corner_description', label: '코너 설명' },
  { value: 'health_info', label: '건강정보' },
  { value: 'product_list', label: '제품 목록' },
  { value: 'product_content', label: '제품 콘텐츠' },
  { value: 'staff_inquiry', label: '직원 문의' },
  { value: 'qr_guide', label: 'QR 안내' },
];
const BLOCK_LABEL: Record<string, string> = Object.fromEntries(BLOCK_TYPES.map((b) => [b.value, b.label]));
const STATUS_LABEL: Record<ScreenSetStatus, string> = { draft: '초안', active: '활성', archived: '보관', operator_template: '운영자 템플릿' };

// WO-O4O-KPA-TABLET-TEMPLATE-SELECTION-EDITOR-V1:
//   Phase 1 선택지는 corner_information_basic_v1 하나뿐이지만, 후속 TEMPLATE-APPLY 에서
//   product_focus / idle_video_first / comparison 을 추가할 때 편집기 구조를 다시 만들지 않도록
//   선택형 UI 를 미리 둔다. whitelist 확장/렌더러 구현은 이번 WO 범위 아님(서버 화이트리스트가 정본).
const DEFAULT_TEMPLATE_KEY = 'corner_information_basic_v1';
const TEMPLATE_OPTIONS: { key: string; label: string; description: string }[] = [
  {
    key: 'corner_information_basic_v1',
    label: '기본 코너 안내형',
    description: '코너 설명, 제품 목록, QR 안내를 기본 구조로 보여주는 템플릿입니다.',
  },
  // WO-O4O-KPA-TABLET-SCREEN-SET-TEMPLATE-APPLY-V1: 두 번째 템플릿(상품 집중형).
  {
    key: 'product_focus',
    label: '상품 집중형',
    description: '상품 목록과 제품 안내를 더 크게 보여주는 템플릿입니다.',
  },
];
const templateLabel = (key: string | null | undefined) =>
  TEMPLATE_OPTIONS.find((t) => t.key === key)?.label ?? TEMPLATE_OPTIONS[0].label;

const IDLE_SOURCES = [
  { value: 'legacy_idle_playlist', label: '기존 대기 재생목록 사용' },
  { value: 'operator_common', label: '운영자 공통 대기영상 사용' },
  { value: 'custom_media', label: '직접 미디어 입력' },
];

function defaultConfig(type: ScreenBlockType): Record<string, unknown> {
  switch (type) {
    case 'idle_media': return { source: 'legacy_idle_playlist' };
    case 'corner_description': return { title: '', body: '' };
    case 'health_info': return { title: '', body: '' };
    case 'staff_inquiry': return { message: '' };
    case 'qr_guide': return { label: '', url: '' };
    case 'product_list': return { source: 'legacy_tablet_displays' };
    default: return {};
  }
}

export default function TabletScreenSetManager({ tabletId, currentScreenSetId, onCurrentChange, onToast }: Props) {
  const [sets, setSets] = useState<ScreenSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  // WO-O4O-KPA-TABLET-TEMPLATE-SELECTION-EDITOR-V1: 생성 폼 템플릿 선택(기본값 = corner_information_basic_v1).
  const [newTemplateKey, setNewTemplateKey] = useState(DEFAULT_TEMPLATE_KEY);

  const [editDetail, setEditDetail] = useState<ScreenSetDetail | null>(null);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<ScreenSetStatus>('draft');
  // WO-O4O-KPA-TABLET-TEMPLATE-SELECTION-EDITOR-V1: 편집 폼 템플릿 선택(GET 값으로 초기화).
  const [editTemplateKey, setEditTemplateKey] = useState(DEFAULT_TEMPLATE_KEY);
  const [blocks, setBlocks] = useState<ScreenBlock[]>([]);
  const [savingSet, setSavingSet] = useState(false);
  const [savingBlocks, setSavingBlocks] = useState(false);
  const [addType, setAddType] = useState<ScreenBlockType>('idle_media');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const all = await fetchScreenSets();
      // 이 코너에 적용 가능한 세트 = 이 태블릿 전용 + 매장 재사용(tabletId null)
      setSets(all.filter((s) => s.tabletId === tabletId || s.tabletId === null));
    } catch (e: any) {
      onToast({ type: 'error', message: e?.message || '화면 세트를 불러오지 못했습니다.' });
      setSets([]);
    } finally {
      setLoading(false);
    }
  }, [tabletId, onToast]);

  useEffect(() => { reload(); }, [reload]);

  const openEdit = useCallback(async (id: string) => {
    try {
      const detail = await fetchScreenSet(id);
      setEditDetail(detail);
      setEditName(detail.name);
      setEditStatus(detail.status);
      // templateKey 미지정/null 이면 기본 템플릿으로 표시(WO §5).
      setEditTemplateKey(detail.templateKey ?? DEFAULT_TEMPLATE_KEY);
      setBlocks(detail.blocks.map((b) => ({ ...b, config: b.config ?? {} })));
    } catch (e: any) {
      onToast({ type: 'error', message: e?.message || '세트 상세를 불러오지 못했습니다.' });
    }
  }, [onToast]);

  const closeEdit = () => { setEditDetail(null); setBlocks([]); };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      // WO-O4O-KPA-TABLET-TEMPLATE-SELECTION-EDITOR-V1: 선택한 templateKey 를 명시 전송(Phase 1 = 기본형).
      const created = await createScreenSet({ name, tabletId, templateKey: newTemplateKey });
      setNewName(''); setNewTemplateKey(DEFAULT_TEMPLATE_KEY); setCreating(false);
      onToast({ type: 'success', message: `화면 세트 "${created.name}" 생성됨` });
      await reload();
      openEdit(created.id);
    } catch (e: any) {
      onToast({ type: 'error', message: e?.message || '생성에 실패했습니다.' });
    } finally { setBusy(false); }
  };

  const handleSaveSet = async () => {
    if (!editDetail) return;
    const nm = editName.trim();
    if (!nm) return;
    setSavingSet(true);
    try {
      // WO-O4O-KPA-TABLET-TEMPLATE-SELECTION-EDITOR-V1: templateKey 를 함께 저장(명시 전송).
      await updateScreenSet(editDetail.id, { name: nm, status: editStatus, templateKey: editTemplateKey });
      onToast({ type: 'success', message: '세트 정보가 저장되었습니다.' });
      await reload();
    } catch (e: any) {
      onToast({ type: 'error', message: e?.message || '저장에 실패했습니다.' });
    } finally { setSavingSet(false); }
  };

  const handleSaveBlocks = async () => {
    if (!editDetail) return;
    setSavingBlocks(true);
    try {
      const saved = await saveScreenSetBlocks(editDetail.id, blocks);
      setBlocks(saved.map((b) => ({ ...b, config: b.config ?? {} })));
      onToast({ type: 'success', message: '블록이 저장되었습니다.' });
      await reload();
    } catch (e: any) {
      onToast({ type: 'error', message: e?.message || '블록 저장에 실패했습니다. (config 형식 확인)' });
    } finally { setSavingBlocks(false); }
  };

  const handleApply = async (set: ScreenSet) => {
    if (busy) return;
    setBusy(true);
    try {
      if (set.status !== 'active') {
        await updateScreenSet(set.id, { status: 'active' }); // 적용은 active 필요 → 자동 활성화
      }
      await applyCurrentScreenSet(tabletId, set.id);
      onCurrentChange(set.id);
      onToast({ type: 'success', message: `"${set.name}" 적용됨 — 공개 태블릿 화면에 반영됩니다.` });
      await reload();
    } catch (e: any) {
      onToast({ type: 'error', message: e?.message || '적용에 실패했습니다.' });
    } finally { setBusy(false); }
  };

  const handleClear = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await clearCurrentScreenSet(tabletId);
      onCurrentChange(null);
      onToast({ type: 'success', message: '적용 해제됨 (기본 화면으로 복귀)' });
      await reload();
    } catch (e: any) {
      onToast({ type: 'error', message: e?.message || '해제에 실패했습니다.' });
    } finally { setBusy(false); }
  };

  const handleArchive = async (set: ScreenSet) => {
    if (busy) return;
    if (!window.confirm(`"${set.name}" 세트를 보관하시겠습니까? 목록에서 숨겨지며, 적용 중인 세트는 먼저 적용 해제해야 합니다.`)) return;
    setBusy(true);
    try {
      await archiveScreenSet(set.id);
      if (editDetail?.id === set.id) closeEdit();
      onToast({ type: 'success', message: '세트를 보관했습니다.' });
      await reload();
    } catch (e: any) {
      const msg = e?.code === 'SCREEN_SET_IN_USE'
        ? '적용 중인 세트는 보관할 수 없습니다. 먼저 적용 해제하세요.'
        : (e?.message || '보관에 실패했습니다.');
      onToast({ type: 'error', message: msg });
    } finally { setBusy(false); }
  };

  // ── block 편집 helpers ──
  const addBlock = () => setBlocks((prev) => [...prev, { blockType: addType, sortOrder: prev.length, isEnabled: true, config: defaultConfig(addType) }]);
  const removeBlock = (i: number) => setBlocks((prev) => prev.filter((_, idx) => idx !== i));
  const toggleBlock = (i: number) => setBlocks((prev) => prev.map((b, idx) => (idx === i ? { ...b, isEnabled: !b.isEnabled } : b)));
  const moveBlock = (i: number, dir: 'up' | 'down') => setBlocks((prev) => {
    const t = dir === 'up' ? i - 1 : i + 1;
    if (t < 0 || t >= prev.length) return prev;
    const next = [...prev];
    [next[i], next[t]] = [next[t], next[i]];
    return next;
  });
  const patchConfig = (i: number, patch: Record<string, unknown>) =>
    setBlocks((prev) => prev.map((b, idx) => (idx === i ? { ...b, config: { ...b.config, ...patch } } : b)));

  const currentSet = sets.find((s) => s.id === currentScreenSetId) || null;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-indigo-100">
      <div className="px-4 py-3 border-b bg-indigo-50/60 flex items-center justify-between">
        <h3 className="text-sm font-bold text-indigo-800 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" /> 화면 세트 (Screen Set)
        </h3>
        <button
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50"
        >
          <Plus className="w-3.5 h-3.5" /> 새 세트
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* 필수 경고 */}
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <b>적용한 화면 세트는 공개 태블릿 뷰어(고객 화면)에 반영됩니다.</b>
            운영 환경에서는 브라우저 캐시·네트워크 상태에 따라 태블릿 새로고침이 필요할 수 있습니다.
          </p>
        </div>

        {/* WO-O4O-KPA-TABLET-SCREEN-SET-OPERATION-USABILITY-PASS-V1: 저장/적용/해제·템플릿/블록 개념 안내 */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-600 leading-relaxed space-y-1">
          <p><b className="text-slate-700">화면 세트</b>는 태블릿에 표시할 화면 구성 묶음입니다.</p>
          <p><b className="text-slate-700">템플릿</b>은 같은 내용을 어떤 <b>배치</b>로 보여줄지 정하고, <b className="text-slate-700">블록</b>은 화면에 들어가는 <b>내용</b>(코너 설명·제품 목록·QR 안내·대기화면)입니다.</p>
          <p><b className="text-slate-700">저장</b>은 세트 내용만 저장하며 태블릿에 자동 적용되지 않습니다. <b className="text-slate-700">적용</b>은 이 세트를 이 코너 태블릿의 현재 화면으로 사용하고, <b className="text-slate-700">적용 해제</b>는 기본 화면으로 되돌립니다.</p>
        </div>

        {/* 현재 적용 */}
        <div className="flex items-center justify-between gap-3 flex-wrap text-sm">
          <div>
            <span className="text-slate-400 text-xs">이 코너에 적용 중: </span>
            {currentSet
              ? <span className="font-semibold text-indigo-700">{currentSet.name}</span>
              : <span className="text-slate-400">없음 (기본 화면 사용 중)</span>}
          </div>
          {currentScreenSetId && (
            <button onClick={handleClear} disabled={busy} className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">
              적용 해제
            </button>
          )}
        </div>

        {/* 새 세트 생성 폼 */}
        {creating && (
          <div className="space-y-2 border border-slate-100 rounded-lg p-3 bg-slate-50/60">
            <div className="flex gap-2 items-center">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="세트 이름 (예: 입마름·구취 관리 세트)"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                autoFocus
              />
              <button onClick={handleCreate} disabled={busy || !newName.trim()} className="px-3 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap">
                만들기
              </button>
            </div>
            {/* WO-O4O-KPA-TABLET-TEMPLATE-SELECTION-EDITOR-V1: 생성 시 템플릿 선택 */}
            <TemplateSelectField value={newTemplateKey} onChange={setNewTemplateKey} />
          </div>
        )}

        {/* 세트 목록 */}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-4"><Loader2 className="w-4 h-4 animate-spin" /> 불러오는 중…</div>
        ) : sets.length === 0 ? (
          <div className="text-sm text-slate-400 py-4">이 코너에 적용 가능한 화면 세트가 없습니다. ‘새 세트’로 만들어 보세요.</div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
            {sets.map((s) => {
              const isCurrent = s.id === currentScreenSetId;
              return (
                <div key={s.id} className="flex items-center gap-2 px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate flex items-center gap-2">
                      {s.name}
                      {isCurrent && <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">적용중</span>}
                      {s.tabletId === null && <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">재사용</span>}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {STATUS_LABEL[s.status]} · {templateLabel(s.templateKey)} · 블록 {s.blockCount ?? 0}개
                    </div>
                  </div>
                  {!isCurrent && (
                    <button onClick={() => handleApply(s)} disabled={busy} className="px-2.5 py-1 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">적용</button>
                  )}
                  <button onClick={() => openEdit(s.id)} className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">편집</button>
                  <button onClick={() => handleArchive(s)} disabled={busy} className="px-2 py-1 text-xs text-slate-400 hover:text-red-600 disabled:opacity-50" title="보관">보관</button>
                </div>
              );
            })}
          </div>
        )}

        {/* 편집 패널 */}
        {editDetail && (
          <div className="border border-indigo-100 rounded-lg p-3 space-y-3 bg-indigo-50/30">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-slate-700">세트 편집</h4>
              <button onClick={closeEdit} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 min-w-[160px] px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="세트 이름" />
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as ScreenSetStatus)} className="px-2 py-2 rounded-lg border border-slate-200 text-sm">
                <option value="draft">초안</option>
                <option value="active">활성</option>
                <option value="archived">보관</option>
              </select>
              <button onClick={handleSaveSet} disabled={savingSet} className="px-3 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
                {savingSet ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} 세트 정보 저장
              </button>
            </div>

            {/* WO-O4O-KPA-TABLET-TEMPLATE-SELECTION-EDITOR-V1: 템플릿 선택('정보 저장'으로 함께 반영) */}
            <div className="rounded-lg border border-slate-200 bg-white p-2.5">
              <TemplateSelectField value={editTemplateKey} onChange={setEditTemplateKey} />
            </div>

            {/* 블록 목록 */}
            {/* WO-O4O-KPA-TABLET-SCREEN-SET-OPERATION-USABILITY-PASS-V1: 블록=화면 표시 내용 안내 */}
            <div>
              <div className="text-xs font-semibold text-slate-700">화면에 표시할 블록</div>
              <p className="text-[11px] text-slate-400 mt-0.5">화면에 들어가는 내용입니다. 순서 이동·표시 여부를 조정할 수 있고, 변경 후 아래 ‘블록 저장’을 눌러야 저장됩니다.</p>
            </div>
            <div className="space-y-2">
              {blocks.length === 0 && <div className="text-xs text-slate-400">블록이 없습니다. 아래에서 추가하세요.</div>}
              {blocks.map((b, i) => (
                <div key={i} className="border border-slate-200 rounded-lg p-2.5 bg-white">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-slate-700 flex-1">{i + 1}. {BLOCK_LABEL[b.blockType] ?? b.blockType}</span>
                    <label className="text-[11px] text-slate-500 flex items-center gap-1">
                      <input type="checkbox" checked={b.isEnabled} onChange={() => toggleBlock(i)} className="rounded border-slate-300 text-indigo-600" /> 화면에 표시
                    </label>
                    <button onClick={() => moveBlock(i, 'up')} disabled={i === 0} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                    <button onClick={() => moveBlock(i, 'down')} disabled={i === blocks.length - 1} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                    <button onClick={() => removeBlock(i)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  <BlockConfigForm block={b} onPatch={(patch) => patchConfig(i, patch)} onReplaceConfig={(cfg) => setBlocks((prev) => prev.map((x, idx) => (idx === i ? { ...x, config: cfg } : x)))} />
                </div>
              ))}
            </div>

            {/* 블록 추가 + 저장 */}
            <div className="flex items-center gap-2 flex-wrap">
              <select value={addType} onChange={(e) => setAddType(e.target.value as ScreenBlockType)} className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs">
                {BLOCK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <button onClick={addBlock} className="px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> 블록 추가
              </button>
              <button onClick={handleSaveBlocks} disabled={savingBlocks} className="ml-auto px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
                {savingBlocks ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} 블록 저장
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 템플릿 선택 필드 (WO-O4O-KPA-TABLET-TEMPLATE-SELECTION-EDITOR-V1) ──
//   Phase 1 은 선택지가 하나(corner_information_basic_v1)뿐이나, 후속 확장을 위해 선택형 구조를 유지.
function TemplateSelectField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const current = TEMPLATE_OPTIONS.find((t) => t.key === value) ?? TEMPLATE_OPTIONS[0];
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
        <LayoutTemplate className="w-3.5 h-3.5 text-indigo-500" /> 화면 템플릿
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        {TEMPLATE_OPTIONS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
      </select>
      <p className="text-[11px] text-slate-500 leading-relaxed">{current.description}</p>
      <p className="text-[11px] text-slate-400 leading-relaxed">
        템플릿은 같은 내용을 어떤 배치로 보여줄지만 정합니다(표시할 내용은 아래 블록에서 관리). 추가 템플릿은 후속 단계에서 제공됩니다.
      </p>
    </div>
  );
}

// ── block_type별 config 폼 (1차) ──
function BlockConfigForm({ block, onPatch, onReplaceConfig }: {
  block: ScreenBlock;
  onPatch: (patch: Record<string, unknown>) => void;
  onReplaceConfig: (cfg: Record<string, unknown>) => void;
}) {
  const c = block.config as any;
  const input = 'w-full px-2 py-1.5 rounded border border-slate-200 text-xs';
  switch (block.blockType) {
    case 'idle_media':
      return (
        <div className="space-y-1.5">
          <select value={c.source ?? 'legacy_idle_playlist'} onChange={(e) => onReplaceConfig(e.target.value === 'custom_media' ? { source: 'custom_media', items: c.items ?? [] } : { source: e.target.value })} className={input}>
            {IDLE_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {c.source === 'custom_media' && <CustomMediaItems items={Array.isArray(c.items) ? c.items : []} onChange={(items) => onPatch({ items })} />}
          {c.source !== 'custom_media' && <p className="text-[10px] text-slate-400">선택한 소스의 기존 대기화면을 대기 블록으로 사용합니다.</p>}
        </div>
      );
    case 'corner_description':
    case 'health_info':
      return (
        <div className="space-y-1.5">
          <input value={c.title ?? ''} onChange={(e) => onPatch({ title: e.target.value })} placeholder="제목" className={input} />
          <textarea value={c.body ?? ''} onChange={(e) => onPatch({ body: e.target.value })} placeholder="내용" rows={2} className={input} />
        </div>
      );
    case 'staff_inquiry':
      return <textarea value={c.message ?? ''} onChange={(e) => onPatch({ message: e.target.value })} placeholder="직원 안내 문구" rows={2} className={input} />;
    case 'qr_guide':
      return (
        <div className="space-y-1.5">
          <input value={c.label ?? ''} onChange={(e) => onPatch({ label: e.target.value })} placeholder="라벨" className={input} />
          <input value={c.url ?? ''} onChange={(e) => onPatch({ url: e.target.value })} placeholder="URL (선택)" className={input} />
        </div>
      );
    case 'product_list':
      return <p className="text-[11px] text-slate-500">이 코너에 진열된 제품 목록을 그대로 사용합니다. 별도 설정은 없으며, 진열된 제품이 없으면 목록이 비어 보입니다.</p>;
    case 'product_content':
    default:
      return <JsonConfig config={block.config} onReplaceConfig={onReplaceConfig} />;
  }
}

function CustomMediaItems({ items, onChange }: { items: any[]; onChange: (items: any[]) => void }) {
  const MEDIA = ['image', 'video', 'youtube', 'vimeo'];
  const upd = (i: number, patch: any) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  return (
    <div className="space-y-1.5">
      {items.map((it, i) => (
        <div key={i} className="flex gap-1.5 items-center">
          <select value={it.mediaType ?? 'image'} onChange={(e) => upd(i, { mediaType: e.target.value })} className="px-1.5 py-1 rounded border border-slate-200 text-[11px]">
            {MEDIA.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input value={it.url ?? ''} onChange={(e) => upd(i, { url: e.target.value })} placeholder="url" className="flex-1 px-2 py-1 rounded border border-slate-200 text-[11px]" />
          <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
        </div>
      ))}
      <button onClick={() => onChange([...items, { mediaType: 'image', url: '' }])} className="text-[11px] text-indigo-600 hover:underline">+ 미디어 추가</button>
    </div>
  );
}

function JsonConfig({ config, onReplaceConfig }: { config: Record<string, unknown>; onReplaceConfig: (cfg: Record<string, unknown>) => void }) {
  const [text, setText] = useState(() => JSON.stringify(config ?? {}, null, 2));
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="space-y-1">
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          try { const p = JSON.parse(e.target.value); if (p && typeof p === 'object' && !Array.isArray(p)) { setErr(null); onReplaceConfig(p); } else setErr('object 형식이어야 합니다'); }
          catch { setErr('JSON 형식 오류'); }
        }}
        rows={3}
        className="w-full px-2 py-1.5 rounded border border-slate-200 text-[11px] font-mono"
        placeholder='{ "key": "value" }'
      />
      {err && <p className="text-[10px] text-red-500">{err}</p>}
    </div>
  );
}
