/**
 * TabletCornerContentsPanel — 코너별 운영: 코너 × 콘텐츠 연결 UI
 *
 * WO-O4O-KPA-TABLET-CORNER-CONTENT-LINK-UI-V1
 *   선행: WO-O4O-KPA-TABLET-CORNER-CONTENT-ASSIGNMENT-MODEL-V1 (스키마+API)
 *
 * 모델: store_tablet_corner_contents = 코너↔콘텐츠(Screen Set) 연결 SSOT.
 *   current_screen_set_id = 연결 중 '현재 표시' 1개(∈ 연결). 적용 = 연결 보장 + current 원자적.
 *
 * 이 패널의 범위 = **링크만**:
 *   현재 사용 중 표시 / 빠른 교체(current 전환) / 적용 해제 / 순서 / 연결 추가 / 연결 해제.
 *   콘텐츠 원본 생성·수정·보관은 '태블릿 콘텐츠' 탭 담당(여기서 원본을 바꾸지 않는다).
 *
 * 미제공(사유 명시):
 *   - 표시숨김(is_visible): 서버 토글 엔드포인트 부재(INSERT 시 TRUE 고정) + 공개 런타임이 연결을 미소비.
 *   - 연결 sort_order 역시 현재 공개 런타임 미반영(관리용 정렬).
 */
import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Loader2, Plus, ChevronUp, ChevronDown, X, Layers, AlertTriangle, Tv, Eye, Trash2 } from 'lucide-react';
import { RowActionMenu } from '@o4o/ui';
import { defineActionPolicy, buildRowActions } from '@o4o/operator-ux-core';
import { TabletKioskPage, type TabletKioskApi, type TabletScreenResponse } from '@o4o/tablet-kiosk-core';
// WO-O4O-KPA-TABLET-CORNER-TEMPLATE-LABEL-V1: 현재/연결 콘텐츠의 템플릿을 사용자용 라벨로 표시(같은 소스 재사용).
import { templateLabel } from './TabletScreenSetManager';

// 템플릿 배지(공통) — 내부 template_key 미노출, templateLabel 로 변환.
function TemplateBadge({ templateKey }: { templateKey?: string | null }) {
  return (
    <span className="inline-flex items-center text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
      {templateLabel(templateKey)}
    </span>
  );
}
import {
  fetchCornerContents, addCornerContent, removeCornerContent, reorderCornerContents,
  applyCurrentScreenSet, clearCurrentScreenSet, updateScreenSet, fetchScreenSets,
  fetchScreenSet, previewScreenSet,
  type CornerContent, type ScreenSet, type ScreenSetStatus,
} from '../../api/tabletDisplays';

type Toast = { type: 'success' | 'error'; message: string };

interface Props {
  tabletId: string;
  /** 적용/해제 후 상위(코너 카드·헤더)의 currentScreenSetId 동기화. */
  onCurrentChange: (id: string | null) => void;
  onToast: (t: Toast) => void;
  /** 미리보기(kiosk-core 재사용) — 미주입 시 미리보기 비활성. */
  previewApi?: TabletKioskApi;
  storeSlug?: string | null;
}

// WO-O4O-KPA-TABLET-CORNER-MANAGEMENT-RESPONSIVE-UI-V1: 콘텐츠별 점3개 메뉴.
//   '코너에서 제거'는 연결만 끊는 동작이므로 원본 삭제로 읽히지 않게 문구를 명시한다(실패 기준).
//   현재 사용 중인 콘텐츠는 '이 화면 사용'/'코너에서 제거'를 숨긴다(서버도 409 로 막음).
const cornerContentActionPolicy = defineActionPolicy<CornerContent>('kpa:tablet-corner-content', {
  inlineMax: 0,
  rules: [
    { key: 'preview', label: '미리보기' },
    { key: 'apply', label: '이 화면 사용', variant: 'primary', visible: (c) => !c.isCurrent },
    {
      key: 'remove',
      label: '코너에서 제거',
      variant: 'danger',
      visible: (c) => !c.isCurrent,
      confirm: (c) => ({
        title: '이 코너에서 제거할까요?',
        message: `“${c.name}” 을(를) 이 코너의 목록에서 뺍니다.\n콘텐츠 자체는 삭제되지 않고, 다른 코너의 연결도 그대로 유지됩니다.`,
        confirmText: '코너에서 제거',
        variant: 'danger',
      }),
    },
  ],
});
const ACTION_ICONS: Record<string, ReactNode> = {
  preview: <Eye className="w-4 h-4" />,
  apply: <Tv className="w-4 h-4" />,
  remove: <Trash2 className="w-4 h-4" />,
};

const STATUS_LABEL: Record<ScreenSetStatus, string> = {
  draft: '초안', active: '활성', archived: '보관', operator_template: '운영자 템플릿',
};

const btn = 'min-h-[44px] px-3 py-2 text-sm font-medium rounded-xl inline-flex items-center justify-center gap-1.5';

export default function TabletCornerContentsPanel({ tabletId, onCurrentChange, onToast, previewApi, storeSlug }: Props) {
  const [items, setItems] = useState<CornerContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  // 미리보기 — 저장된 세트를 그대로 확인(원본 수정 아님). 기존 draft preview 경로 재사용.
  const canPreview = !!previewApi && !!storeSlug;
  const [preview, setPreview] = useState<{ name: string; screen: TabletScreenResponse; view: 'tablet' | 'mobile' } | null>(null);
  const [previewBusy, setPreviewBusy] = useState<string | null>(null);

  const handlePreview = async (it: CornerContent) => {
    if (!canPreview) { onToast({ type: 'error', message: '매장 공개 주소를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.' }); return; }
    if (previewBusy) return;
    setPreviewBusy(it.screenSetId);
    try {
      const detail = await fetchScreenSet(it.screenSetId);           // 저장된 원본 읽기(read-only)
      const screen = await previewScreenSet({ templateKey: detail.templateKey, blocks: detail.blocks });
      setPreview({ name: it.name, screen, view: 'tablet' });
    } catch (e: any) {
      onToast({ type: 'error', message: e?.message || '미리보기를 불러오지 못했습니다.' });
    } finally { setPreviewBusy(null); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items: list } = await fetchCornerContents(tabletId);
      setItems(list);
    } catch (e: any) {
      onToast({ type: 'error', message: e?.message || '코너에 연결된 콘텐츠를 불러오지 못했습니다.' });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tabletId, onToast]);

  useEffect(() => { load(); }, [load]);

  const current = items.find((i) => i.isCurrent) ?? null;

  // 교체(현재 전환). 서버는 active 만 적용 허용(409 SCREEN_SET_NOT_ACTIVE) → 초안은 확인 후 활성화.
  const handleApply = async (it: CornerContent) => {
    if (busy) return;
    if (it.status !== 'active') {
      const ok = window.confirm(
        `"${it.name}" 은(는) 아직 초안입니다.\n활성화한 뒤 이 코너의 현재 화면으로 사용할까요?`,
      );
      if (!ok) return;
    }
    setBusy(true);
    try {
      if (it.status !== 'active') await updateScreenSet(it.screenSetId, { status: 'active' });
      await applyCurrentScreenSet(tabletId, it.screenSetId);
      onCurrentChange(it.screenSetId);
      onToast({ type: 'success', message: `"${it.name}" 을(를) 현재 화면으로 사용합니다.` });
      await load();
    } catch (e: any) {
      onToast({ type: 'error', message: e?.message || '교체에 실패했습니다.' });
    } finally { setBusy(false); }
  };

  const handleClear = async () => {
    if (busy) return;
    if (!window.confirm('현재 표시 콘텐츠를 해제하고 기본 화면으로 되돌릴까요?\n연결은 유지됩니다.')) return;
    setBusy(true);
    try {
      await clearCurrentScreenSet(tabletId);
      onCurrentChange(null);
      onToast({ type: 'success', message: '적용을 해제했습니다. (기본 화면)' });
      await load();
    } catch (e: any) {
      onToast({ type: 'error', message: e?.message || '해제에 실패했습니다.' });
    } finally { setBusy(false); }
  };

  // 코너에서 제거 = 연결만 삭제(원본/타 코너/QR 무변경). 현재 표시 콘텐츠면 서버가 409.
  //   확인 다이얼로그는 액션 정책(cornerContentActionPolicy.remove.confirm)이 담당한다.
  const handleRemove = async (it: CornerContent) => {
    if (busy) return;
    setBusy(true);
    try {
      await removeCornerContent(tabletId, it.screenSetId);
      onToast({ type: 'success', message: '코너에서 연결을 해제했습니다.' });
      await load();
    } catch (e: any) {
      const msg = e?.code === 'CURRENT_CONTENT_CANNOT_BE_REMOVED'
        ? '현재 사용 중인 콘텐츠입니다. 다른 콘텐츠로 교체하거나 적용을 해제한 뒤 해제해 주세요.'
        : (e?.message || '연결 해제에 실패했습니다.');
      onToast({ type: 'error', message: msg });
    } finally { setBusy(false); }
  };

  const handleMove = async (index: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? index - 1 : index + 1;
    if (busy || target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next); // 낙관적 반영
    setBusy(true);
    try {
      await reorderCornerContents(tabletId, next.map((i) => i.screenSetId));
    } catch (e: any) {
      onToast({ type: 'error', message: e?.message || '순서 변경에 실패했습니다.' });
      await load(); // 실패 시 서버 기준 복구
    } finally { setBusy(false); }
  };

  // 연결 추가 후 피커는 열어 둔다(연속 연결). 목록만 갱신 → 피커 후보에서 자동 제외.
  const handleAdded = async () => { await load(); };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-indigo-100">
      <div className="px-4 py-3 border-b bg-indigo-50/60 flex items-center justify-between">
        <h3 className="text-sm font-bold text-indigo-800 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" /> 이 코너의 콘텐츠
          {items.length > 0 && <span className="text-xs font-normal text-indigo-400">({items.length})</span>}
        </h3>
        <button onClick={() => setPicking(true)} disabled={busy} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 disabled:opacity-50">
          <Plus className="w-3.5 h-3.5" /> 기존 콘텐츠 추가
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <b>현재 사용 중인 콘텐츠가 공개 태블릿 화면(고객 화면)에 표시됩니다.</b> 바꾼 뒤에는 태블릿에서 새로고침해야 반영될 수 있습니다.
            콘텐츠 내용 수정·생성·보관은 <b>태블릿 콘텐츠</b> 탭에서 합니다.
          </p>
        </div>

        {/* 현재 사용 중 */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">현재 사용 중</span>
              {current ? (
                <>
                  <div className="text-base font-bold text-slate-900 truncate mt-1">{current.name}</div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <TemplateBadge templateKey={current.templateKey} />
                    <span className="text-[11px] text-slate-500">블록 {current.blockCount}개</span>
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-500 mt-1">
                  현재 표시 중인 콘텐츠가 없습니다(기본 화면). 아래에서 <b>이 화면 사용</b>을 눌러 선택해 주세요.
                </div>
              )}
            </div>
            {current && (
              <button onClick={handleClear} disabled={busy} className={`${btn} text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50`}>
                적용 해제
              </button>
            )}
          </div>
        </div>

        {/* 연결 목록 */}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-4"><Loader2 className="w-4 h-4 animate-spin" /> 불러오는 중…</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 text-center py-8 px-4 space-y-3">
            <p className="text-sm text-slate-500 leading-relaxed">
              이 코너에 연결된 콘텐츠가 없습니다.<br />
              <b>태블릿 콘텐츠</b> 탭에서 만든 콘텐츠를 이 코너에 연결해 주세요.
            </p>
            <button onClick={() => setPicking(true)} className={`${btn} text-white bg-indigo-600 hover:bg-indigo-700`}>
              <Plus className="w-4 h-4" /> 기존 콘텐츠 추가
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-600">연결된 콘텐츠</div>
            {items.map((it, i) => (
              <div
                key={it.screenSetId}
                className={`rounded-xl border p-3 space-y-2 ${it.isCurrent ? 'border-indigo-400 bg-indigo-50/60 ring-1 ring-indigo-200' : 'border-slate-200 bg-white'}`}
              >
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 flex-shrink-0">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-800 truncate">{it.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {it.isCurrent
                        ? <span className="text-[10px] font-bold text-white bg-indigo-600 px-2 py-0.5 rounded-full">● 현재 사용 중</span>
                        : <span className="text-[11px] text-slate-400">{STATUS_LABEL[it.status] ?? it.status}</span>}
                      <TemplateBadge templateKey={it.templateKey} />
                      <span className="text-[11px] text-slate-400">블록 {it.blockCount}개</span>
                    </div>
                  </div>
                  {/* 점 3개 메뉴: 미리보기 / 이 화면 사용 / 코너에서 제거 */}
                  <div className="flex-shrink-0">
                    <RowActionMenu
                      actions={buildRowActions(cornerContentActionPolicy, it, {
                        preview: () => handlePreview(it),
                        apply: () => handleApply(it),
                        remove: () => handleRemove(it),
                      }, {
                        icons: ACTION_ICONS,
                        loading: previewBusy === it.screenSetId ? { preview: true } : undefined,
                      })}
                      inlineMax={cornerContentActionPolicy.inlineMax}
                      disabled={busy}
                    />
                  </div>
                </div>
                {/* 주 동작은 큰 버튼으로 — 매장 스마트폰에서 바로 누를 수 있게(min-h 44px). */}
                <div className="flex gap-2 flex-wrap">
                  {!it.isCurrent && (
                    <button onClick={() => handleApply(it)} disabled={busy} className={`${btn} flex-1 min-w-[140px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50`}>
                      <Tv className="w-4 h-4" /> 이 화면 사용
                    </button>
                  )}
                  <button onClick={() => handleMove(i, 'up')} disabled={busy || i === 0} className={`${btn} w-11 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30`} title="위로" aria-label="위로">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleMove(i, 'down')} disabled={busy || i === items.length - 1} className={`${btn} w-11 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30`} title="아래로" aria-label="아래로">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <p className="text-[11px] text-slate-400">
              순서는 코너 관리용 정렬입니다(고객 화면에는 현재 사용 중인 콘텐츠 1개가 표시됩니다).
            </p>
          </div>
        )}
      </div>

      {/* WO-O4O-KPA-TABLET-CORNER-MANAGEMENT-RESPONSIVE-UI-V1: 콘텐츠 미리보기(읽기 전용).
          저장된 세트를 kiosk-core 로 그대로 렌더 — 원본을 수정하지 않는다. */}
      {preview && previewApi && (
        <div className="fixed inset-0 z-[100000] bg-slate-900/70 flex flex-col" onClick={() => setPreview(null)} role="presentation">
          <div className="bg-slate-900/95 text-white px-4 py-2 flex items-center justify-between gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm font-semibold truncate">{preview.name}</span>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => setPreview((p) => (p ? { ...p, view: 'tablet' } : p))}
                  className={`px-3 py-1 text-xs font-medium rounded-full ${preview.view === 'tablet' ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`}>태블릿</button>
                <button onClick={() => setPreview((p) => (p ? { ...p, view: 'mobile' } : p))}
                  className={`px-3 py-1 text-xs font-medium rounded-full ${preview.view === 'mobile' ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`}>QR 모바일</button>
              </div>
            </div>
            <button onClick={() => setPreview(null)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium whitespace-nowrap">
              <X className="w-4 h-4" /> 닫기
            </button>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center p-3 overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div style={preview.view === 'tablet'
              ? { position: 'relative', overflow: 'hidden', width: 'min(100%, 1024px)', aspectRatio: '16 / 10', background: '#000', borderRadius: 12 }
              : { position: 'relative', overflow: 'hidden', width: 390, maxWidth: '100%', height: 'min(86vh, 780px)', background: '#000', borderRadius: 24 }}>
              <TabletKioskPage api={previewApi} slug={storeSlug ?? undefined} previewScreen={preview.screen} embedded showQrBadge={false} />
            </div>
          </div>
          <div className="bg-slate-900/90 text-slate-300 text-[11px] px-4 py-1.5 text-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            저장된 내용을 보여 주는 미리보기입니다. 실제 태블릿에서는 화면 크기·방향에 따라 달라질 수 있습니다.
          </div>
        </div>
      )}

      {picking && (
        <CornerContentPicker
          tabletId={tabletId}
          linkedIds={new Set(items.map((i) => i.screenSetId))}
          onClose={() => setPicking(false)}
          onAdded={handleAdded}
          onToast={onToast}
        />
      )}
    </div>
  );
}

/**
 * 연결 추가 피커 — 매장 전체 콘텐츠(비보관) 중 미연결 항목.
 *   WO-...-CORNER-CONTENT-LINK-UI-V1 ②: 과거 `tabletId===코너 || null` 필터는 백엔드가
 *   SCREEN_SET_NOT_APPLICABLE 제약을 제거(다중 코너 재사용 허용)하면서 폐기됨 → 필터 없이 전체를 보여준다.
 */
function CornerContentPicker({ tabletId, linkedIds, onClose, onAdded, onToast }: {
  tabletId: string;
  linkedIds: Set<string>;
  onClose: () => void;
  onAdded: () => void;
  onToast: (t: Toast) => void;
}) {
  const [sets, setSets] = useState<ScreenSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchScreenSets()
      .then((all) => { if (!cancelled) setSets(all); })
      .catch((e: any) => { if (!cancelled) { onToast({ type: 'error', message: e?.message || '콘텐츠 목록을 불러오지 못했습니다.' }); setSets([]); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [onToast]);

  const candidates = sets.filter((s) => !linkedIds.has(s.id));

  const handleAdd = async (s: ScreenSet) => {
    setBusy(s.id);
    try {
      await addCornerContent(tabletId, s.id);
      setAdded(true);
      onToast({ type: 'success', message: `"${s.name}" 을(를) 이 코너에 연결했습니다.` });
      onAdded();
    } catch (e: any) {
      const msg = e?.code === 'SCREEN_SET_ARCHIVED'
        ? '보관된 콘텐츠는 연결할 수 없습니다.'
        : (e?.message || '연결에 실패했습니다.');
      onToast({ type: 'error', message: msg });
    } finally { setBusy(null); }
  };

  return (
    <div className="fixed inset-0 z-[950] bg-slate-900/50 flex items-stretch sm:items-center justify-center p-0 sm:p-4" onClick={onClose} role="presentation">
      <div className="bg-white w-full h-full sm:h-auto sm:max-w-lg sm:max-h-[86vh] rounded-none sm:rounded-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
          <h4 className="text-base font-bold text-slate-700">기존 콘텐츠 추가</h4>
          <button onClick={onClose} className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-slate-600" aria-label="닫기"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-6"><Loader2 className="w-4 h-4 animate-spin" /> 불러오는 중…</div>
          ) : candidates.length === 0 ? (
            <div className="text-sm text-slate-400 py-6 text-center">
              연결할 수 있는 콘텐츠가 없습니다.<br />
              <span className="text-[11px]">(이미 모두 연결됐거나, 아직 만든 콘텐츠가 없습니다)</span>
            </div>
          ) : (
            candidates.map((s) => (
              <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-3 flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-800 truncate">{s.name}</div>
                  <div className="text-[11px] text-slate-400">{STATUS_LABEL[s.status] ?? s.status} · 블록 {s.blockCount ?? 0}개</div>
                </div>
                <button onClick={() => handleAdd(s)} disabled={busy !== null} className={`${btn} text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 flex-shrink-0`}>
                  {busy === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} 연결
                </button>
              </div>
            ))
          )}
        </div>
        <div className="px-4 py-3 border-t flex justify-end flex-shrink-0">
          <button onClick={onClose} className={`${btn} text-slate-600 bg-white border border-slate-200 hover:bg-slate-50`}>
            {added ? '완료' : '닫기'}
          </button>
        </div>
      </div>
    </div>
  );
}
