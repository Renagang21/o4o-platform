/**
 * TabletScreenSetManager — 태블릿 Screen Set / Block 1차 Editor UX
 *
 * WO-O4O-KPA-TABLET-SCREEN-SET-BLOCK-EDITOR-UX-V1
 *   선택된 코너/태블릿의 Screen Set 목록·생성·수정·archive·적용/해제 + Screen Block 편집.
 *   선행 구현 관리 API(/store/screen-sets, /store/tablets/:id/current-screen-set)만 사용.
 *   적용된 Screen Set 은 공개 GET /:slug/tablet/screen → kiosk-core 뷰어에 반영됨(PUBLIC-RUNTIME-READ 완료).
 *   기존 legacy 진열/대기화면 편집 영역은 그대로 유지(이 컴포넌트는 additive).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Plus, ChevronUp, ChevronDown, X, Save, Layers, AlertTriangle, LayoutTemplate } from 'lucide-react';
import {
  fetchScreenSets, fetchScreenSet, createScreenSet, updateScreenSet,
  archiveScreenSet, saveScreenSetBlocks, applyCurrentScreenSet, clearCurrentScreenSet,
  // WO-O4O-KPA-TABLET-CONTENT-LIST-PICKER-UI-V1
  searchTabletStoreContents, searchTabletO4oDescriptions,
  // WO-O4O-KPA-TABLET-CONTENT-DRAFT-PREVIEW-V1: 저장 전 draft → sections resolve(read-only)
  previewScreenSet,
  type ScreenSet, type ScreenSetDetail, type ScreenBlock, type ScreenBlockType, type ScreenSetStatus,
  type ContentListItem, type StoreContentSearchResult, type O4oDescriptionSearchResult,
} from '../../api/tabletDisplays';
// WO-O4O-KPA-TABLET-CONTENT-STANDARD-LIST-V1: library 목록을 O4O 표준 테이블로 정비(추출).
import TabletContentLibraryList from './TabletContentLibraryList';
// WO-O4O-KPA-TABLET-CONTENT-DRAFT-PREVIEW-V1: 제작 셸 미리보기 = kiosk-core 뷰어 재사용(sections 주입 + embedded).
import { TabletKioskPage, type TabletKioskApi, type TabletScreenResponse } from '@o4o/tablet-kiosk-core';

type Toast = { type: 'success' | 'error'; message: string };

// WO-O4O-KPA-TABLET-CONTENT-LIBRARY-TAB-SPLIT-V1:
//   같은 컴포넌트를 두 맥락에서 재사용한다.
//   - 'corner'  : 코너별 운영 탭 — 이 코너에 '현재 사용 중' 세트 + 다른 세트로 교체(적용/해제)만. 원본 편집/생성/보관 없음.
//   - 'library' : 태블릿 콘텐츠 탭 — 매장 전체 화면 세트 목록(콘텐츠 원본) 수정/보관/생성. 코너 적용(교체) 없음.
export type ScreenSetManagerMode = 'corner' | 'library';

// library 모드에서 '사용 중인 코너' 계산용 최소 태블릿 정보(페이지의 TabletType 하위집합).
export interface ScreenSetUsageTablet {
  id: string;
  name: string;
  location?: string | null;
  currentScreenSetId?: string | null;
}

interface Props {
  // 코너 모드에서는 대상 태블릿 id, 라이브러리 모드에서는 null(매장 전체).
  mode: ScreenSetManagerMode;
  tabletId: string | null;
  currentScreenSetId: string | null;
  onCurrentChange?: (id: string | null) => void;
  onToast: (t: Toast) => void;
  // library 모드 전용: 각 세트가 어느 코너에 적용됐는지 표시.
  tablets?: ScreenSetUsageTablet[];
  // WO-O4O-KPA-TABLET-CONTENT-DRAFT-PREVIEW-V1: 제작 셸 미리보기용(library 전용, opt-in).
  //   kiosk-core 재사용 미리보기 = previewApi(상품 조회) + storeSlug(공개 slug). 미주입 시 미리보기 비활성.
  previewApi?: TabletKioskApi;
  storeSlug?: string | null;
}

const BLOCK_TYPES: { value: ScreenBlockType; label: string }[] = [
  { value: 'idle_media', label: '대기화면(Idle)' },
  { value: 'corner_description', label: '코너 설명' },
  { value: 'health_info', label: '건강정보' },
  { value: 'product_list', label: '제품 목록' },
  // WO-O4O-KPA-TABLET-CONTENT-LIST-PICKER-UI-V1: 신규 콘텐츠 카드 목록(product_content 는 deprecated).
  { value: 'content_list', label: '코너 콘텐츠 목록' },
  { value: 'product_content', label: '제품 콘텐츠 (구)' },
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

// WO-O4O-KPA-TABLET-TEMPLATE-DRIVEN-BUILDER-STEPS-V1:
//   템플릿 = 기능 종류가 아니라 UI 배치 유형. 각 템플릿에 필요한 입력 순서/블록만 단계별로 노출.
//   메타(requiredBlocks/steps)로 제작 흐름을 구동한다. 템플릿 추가·중단은 코드에서만(사용자 등록 없음).
type BuilderStepKind = 'basic' | 'blocks' | 'save';
interface BuilderStepMeta {
  title: string;
  kind: BuilderStepKind;
  /** kind='blocks' 단계가 다루는 블록 타입(추가/설정 대상). */
  blockTypes?: ScreenBlockType[];
  /** 단계 상단 안내(선택). */
  note?: string;
}
interface TemplateMeta {
  key: string;
  label: string;
  description: string;
  /** 메인 화면에 있어야 하는 블록(없으면 해당 단계에서 경고). QR 은 모든 템플릿 필수. */
  requiredBlocks: ScreenBlockType[];
  /** 템플릿 선택 이후의 제작 단계(마지막은 항상 kind='save'). */
  steps: BuilderStepMeta[];
}
const BASIC_STEP: BuilderStepMeta = { title: '기본 정보', kind: 'basic' };
const SAVE_STEP: BuilderStepMeta = { title: '미리보기·저장', kind: 'save' };

const TEMPLATE_OPTIONS: TemplateMeta[] = [
  {
    key: 'corner_information_basic_v1',
    label: '기본 코너 안내형',
    description: '코너 설명, 제품 목록, QR 안내를 기본 구조로 보여주는 범용 템플릿입니다.',
    requiredBlocks: ['qr_guide'],
    steps: [
      BASIC_STEP,
      { title: '화면 구성', kind: 'blocks', blockTypes: ['idle_media', 'corner_description', 'health_info', 'staff_inquiry', 'qr_guide'], note: '화면에 들어갈 구조 블록(대기화면·코너 설명·건강정보·QR·직원 문의)을 추가·설정합니다.' },
      { title: '콘텐츠·제품', kind: 'blocks', blockTypes: ['content_list', 'product_list', 'product_content'], note: '고객에게 보여줄 코너 콘텐츠·제품 블록을 설정합니다.' },
      SAVE_STEP,
    ],
  },
  // WO-O4O-KPA-TABLET-SCREEN-SET-TEMPLATE-APPLY-V1: 상품 집중형.
  {
    key: 'product_focus',
    label: '상품 집중형',
    description: '중심 제품과 핵심 설명을 크게 보여주고 관련 콘텐츠·QR을 보조로 배치합니다.',
    requiredBlocks: ['product_list', 'qr_guide'],
    steps: [
      BASIC_STEP,
      { title: '중심 제품', kind: 'blocks', blockTypes: ['product_list', 'product_content'], note: '전면에 보여줄 제품을 구성합니다. 실제 진열 제품 선택은 코너별 진열 설정에서 관리됩니다.' },
      { title: '핵심 설명', kind: 'blocks', blockTypes: ['corner_description', 'health_info'] },
      { title: '관련 콘텐츠·제품·QR', kind: 'blocks', blockTypes: ['content_list', 'qr_guide', 'product_content'] },
      SAVE_STEP,
    ],
  },
  // WO-O4O-KPA-TABLET-TEMPLATE-THREE-PATTERNS-V1: 대기 영상형 / 코너 소개형 / 제품 진열형.
  {
    key: 'idle_touch_video',
    label: '대기 영상형',
    description: '대기 영상 위에 터치 안내와 QR을 보여줍니다. 손님의 첫 시선을 끄는 코너에 적합합니다.',
    requiredBlocks: ['idle_media', 'qr_guide'],
    steps: [
      BASIC_STEP,
      { title: '대기 영상·터치 안내', kind: 'blocks', blockTypes: ['idle_media', 'qr_guide'], note: '대기 영상(idle) 위에 “화면을 터치하세요 / Touch to start” 안내가 자동 표시됩니다. 대기 영상과 QR 안내를 구성하세요.' },
      { title: '코너 설명', kind: 'blocks', blockTypes: ['corner_description', 'health_info'] },
      { title: '콘텐츠·제품', kind: 'blocks', blockTypes: ['content_list', 'product_list', 'product_content'] },
      SAVE_STEP,
    ],
  },
  {
    key: 'corner_overview_qr',
    label: '코너 소개형',
    description: '영상 없이 코너 설명과 콘텐츠, QR을 중심으로 보여줍니다. 코너 안내가 중요한 화면에 적합합니다.',
    requiredBlocks: ['corner_description', 'qr_guide'],
    steps: [
      BASIC_STEP,
      { title: '코너 제목·설명', kind: 'blocks', blockTypes: ['corner_description'] },
      { title: '안내 콘텐츠', kind: 'blocks', blockTypes: ['content_list', 'health_info'] },
      { title: '제품·QR 구성', kind: 'blocks', blockTypes: ['product_list', 'qr_guide'] },
      SAVE_STEP,
    ],
  },
  {
    key: 'product_grid_qr',
    label: '제품 진열형',
    description: '여러 제품(5~10개 수준)을 한 화면에 진열해 보여줍니다. 제품이 많은 코너에 적합합니다.',
    requiredBlocks: ['product_list', 'qr_guide'],
    steps: [
      BASIC_STEP,
      { title: '코너 제목·짧은 설명', kind: 'blocks', blockTypes: ['corner_description'] },
      { title: '제품 선택·순서', kind: 'blocks', blockTypes: ['product_list'], note: '제품 진열은 코너별 진열 설정에서 관리됩니다. 여기서는 제품 목록 블록의 표시 여부를 구성합니다.' },
      { title: '보조 콘텐츠·QR', kind: 'blocks', blockTypes: ['content_list', 'qr_guide'] },
      SAVE_STEP,
    ],
  },
];
const templateMeta = (key: string | null | undefined): TemplateMeta =>
  TEMPLATE_OPTIONS.find((t) => t.key === key) ?? TEMPLATE_OPTIONS[0];
const templateLabel = (key: string | null | undefined) => templateMeta(key).label;

// WO-O4O-KPA-TABLET-SCREEN-SET-DIRTY-GUARD-V1: 미저장 변경 경고 문구 + 블록 비교 정규화
const DISCARD_MSG = '저장되지 않은 변경이 있습니다.\n저장하지 않고 이동하면 변경사항이 사라질 수 있습니다.\n계속하시겠습니까?';
// 블록 dirty 비교: 타입/표시여부/config + 순서만(서버 sort_order 는 위치 기반 재정규화 → 값 무시).
const normalizeBlocks = (bs: ScreenBlock[]) =>
  JSON.stringify(bs.map((b) => ({ t: b.blockType, e: b.isEnabled, c: b.config ?? {} })));

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
    case 'content_list': return { items: [] };
    default: return {};
  }
}

export default function TabletScreenSetManager({ mode, tabletId, currentScreenSetId, onCurrentChange, onToast, tablets, previewApi, storeSlug }: Props) {
  const isLibrary = mode === 'library';
  const [sets, setSets] = useState<ScreenSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // WO-O4O-KPA-TABLET-CONTENT-STEP-BUILDER-SHELL-V1: 인라인 생성/편집 UI → 단계형 제작 셸.
  //   builder=null → 리스트. builder.detail=null → 신규 제작. builder.detail=존재 → 기존 수정(hydrate).
  const [builder, setBuilder] = useState<{ detail: ScreenSetDetail | null } | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      // WO-O4O-KPA-TABLET-CONTENT-STANDARD-LIST-V1: library 는 상태 필터(보관 포함)를 위해 archived 도 조회.
      //   corner 는 적용 후보만 필요 → 기존대로 비보관.
      const all = await fetchScreenSets(isLibrary ? { includeArchived: true } : undefined);
      // library: 매장 전체 화면 세트. corner: 이 태블릿 전용 + 매장 재사용(tabletId null).
      setSets(isLibrary ? all : all.filter((s) => s.tabletId === tabletId || s.tabletId === null));
    } catch (e: any) {
      onToast({ type: 'error', message: e?.message || '화면 세트를 불러오지 못했습니다.' });
      setSets([]);
    } finally {
      setLoading(false);
    }
  }, [tabletId, isLibrary, onToast]);

  // WO-...-CONTENT-LIBRARY-TAB-SPLIT-V1: library 모드 — 세트 id → 적용 중인 코너 이름 목록.
  const usageBySet = (() => {
    const m: Record<string, string[]> = {};
    (tablets ?? []).forEach((t) => {
      if (t.currentScreenSetId) (m[t.currentScreenSetId] ??= []).push(t.location?.trim() || t.name);
    });
    return m;
  })();

  useEffect(() => { reload(); }, [reload]);

  // WO-O4O-KPA-TABLET-CONTENT-STEP-BUILDER-SHELL-V1: 수정 진입 = 상세 hydrate 후 제작 셸.
  const openEdit = useCallback(async (id: string) => {
    try {
      const detail = await fetchScreenSet(id);
      setBuilder({ detail });
    } catch (e: any) {
      onToast({ type: 'error', message: e?.message || '세트 상세를 불러오지 못했습니다.' });
    }
  }, [onToast]);

  // 신규 제작 진입(빈 셸).
  const openCreate = useCallback(() => setBuilder({ detail: null }), []);

  const handleApply = async (set: ScreenSet) => {
    if (busy || !tabletId) return; // 교체(적용)는 corner 모드 전용 — tabletId 필수
    setBusy(true);
    try {
      if (set.status !== 'active') {
        await updateScreenSet(set.id, { status: 'active' }); // 적용은 active 필요 → 자동 활성화
      }
      await applyCurrentScreenSet(tabletId, set.id);
      onCurrentChange?.(set.id);
      onToast({ type: 'success', message: `"${set.name}" 적용됨 — 공개 태블릿 화면에 반영됩니다.` });
      await reload();
    } catch (e: any) {
      onToast({ type: 'error', message: e?.message || '적용에 실패했습니다.' });
    } finally { setBusy(false); }
  };

  const handleClear = async () => {
    if (busy || !tabletId) return;
    setBusy(true);
    try {
      await clearCurrentScreenSet(tabletId);
      onCurrentChange?.(null);
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
      onToast({ type: 'success', message: '세트를 보관했습니다.' });
      await reload();
    } catch (e: any) {
      const msg = e?.code === 'SCREEN_SET_IN_USE'
        ? '적용 중인 세트는 보관할 수 없습니다. 먼저 적용 해제하세요.'
        : (e?.message || '보관에 실패했습니다.');
      onToast({ type: 'error', message: msg });
    } finally { setBusy(false); }
  };

  const currentSet = sets.find((s) => s.id === currentScreenSetId) || null;
  // WO-O4O-KPA-TABLET-TOUCH-FIRST-SCREEN-SET-CARDS-V1: 현재 적용 세트를 제외한 나머지(카드 그리드).
  const otherSets = sets.filter((s) => s.id !== currentScreenSetId);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-indigo-100">
      <div className="px-4 py-3 border-b bg-indigo-50/60 flex items-center justify-between">
        <h3 className="text-sm font-bold text-indigo-800 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" /> {isLibrary ? '태블릿 콘텐츠 (화면 세트)' : '이 코너에 적용할 화면 세트'}
        </h3>
        {/* WO-O4O-KPA-TABLET-CONTENT-STANDARD-LIST-V1: 생성 진입('태블릿 화면 만들기')은 표준 리스트 도구막대로 이전. */}
      </div>

      <div className="p-4 space-y-4">
        {/* WO-O4O-KPA-TABLET-CONTENT-STEP-BUILDER-SHELL-V1: library 제작/수정은 단계형 제작 셸이 화면을 전환(takeover). */}
        {isLibrary && builder ? (
          <TabletContentStepBuilder
            initialDetail={builder.detail}
            onCancel={() => setBuilder(null)}
            onSaved={() => { setBuilder(null); reload(); }}
            onToast={onToast}
            previewApi={previewApi}
            storeSlug={storeSlug ?? null}
          />
        ) : (
        <>
        {/* 필수 경고 — 코너 모드(교체=공개 반영)에서만 */}
        {!isLibrary && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <b>적용한 화면 세트는 공개 태블릿 뷰어(고객 화면)에 반영됩니다.</b>
              운영 환경에서는 브라우저 캐시·네트워크 상태에 따라 태블릿 새로고침이 필요할 수 있습니다.
            </p>
          </div>
        )}

        {/* WO-O4O-KPA-TABLET-SCREEN-SET-OPERATION-USABILITY-PASS-V1: 저장/템플릿/블록 개념 안내 — 콘텐츠(편집) 모드에서만 */}
        {isLibrary ? (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-600 leading-relaxed space-y-1">
            <p><b className="text-slate-700">화면 세트</b>는 태블릿 코너에 표시할 화면 구성 묶음(콘텐츠 원본)입니다. 여기서 만들고 수정하며, 실제 코너 적용은 <b className="text-slate-700">코너별 운영</b> 탭에서 합니다.</p>
            <p><b className="text-slate-700">템플릿</b>은 같은 내용을 어떤 <b>배치</b>로 보여줄지 정하고, <b className="text-slate-700">블록</b>은 화면에 들어가는 <b>내용</b>(코너 설명·제품 목록·QR 안내·대기화면)입니다.</p>
            <p><b className="text-slate-700">저장</b>은 세트 내용만 저장합니다(코너에 자동 적용되지 않음). <b className="text-slate-700">보관</b>은 목록에서 숨깁니다(적용 중인 세트는 먼저 적용 해제 필요).</p>
          </div>
        ) : (
          <p className="text-[11px] text-slate-500 leading-relaxed">
            이 코너에 사용할 화면 세트를 골라 <b>이 화면 사용</b>으로 교체하세요. 세트 내용 수정·생성은 <b>태블릿 콘텐츠</b> 탭에서 합니다.
          </p>
        )}

        {/* WO-O4O-KPA-TABLET-TOUCH-FIRST-SCREEN-SET-CARDS-V1: 현재 사용 중 카드(적용 상태 우선) — 코너 모드 전용. */}
        {!isLibrary && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">현재 사용 중</span>
              {currentSet ? (
                <>
                  <div className="text-base font-bold text-slate-900 truncate mt-1">{currentSet.name}</div>
                  <div className="text-[11px] text-slate-500">{templateLabel(currentSet.templateKey)} · 블록 {currentSet.blockCount ?? 0}개</div>
                </>
              ) : currentScreenSetId ? (
                <div className="text-sm text-slate-500 mt-1">현재 화면 세트 정보를 불러오지 못했습니다. 아래에서 다른 화면 세트를 선택해 적용해 주세요.</div>
              ) : (
                <div className="text-sm text-slate-500 mt-1">현재 적용된 화면 세트가 없습니다. 아래 저장된 화면 세트를 선택해 적용해 주세요.</div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {/* 코너 모드: 세트 원본 편집은 콘텐츠 탭으로 이동 → 여기서는 적용 해제(교체)만. */}
              {currentScreenSetId && (
                <button onClick={handleClear} disabled={busy} className="min-h-[44px] px-3 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50">적용 해제</button>
              )}
            </div>
          </div>
        </div>
        )}

        {/* WO-O4O-KPA-TABLET-CONTENT-STANDARD-LIST-V1: library = O4O 표준 테이블
            (검색 + 상태 필터 + 페이지네이션 + 체크 일괄 보관 + kebab 개별 작업(수정/보관)).
            생성/수정 진입은 단계형 제작 셸(builder)로 전환. */}
        {isLibrary && (
          <TabletContentLibraryList
            sets={sets}
            loading={loading}
            busy={busy}
            usageBySet={usageBySet}
            templateLabel={templateLabel}
            onCreate={openCreate}
            onEdit={openEdit}
            onArchive={handleArchive}
            onRefresh={reload}
          />
        )}

        {/* WO-O4O-KPA-TABLET-TOUCH-FIRST-SCREEN-SET-CARDS-V1: 코너 모드 = 현재 사용 중 제외 나머지 카드 그리드(비교·선택·적용). */}
        {!isLibrary && (loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-4"><Loader2 className="w-4 h-4 animate-spin" /> 불러오는 중…</div>
        ) : otherSets.length === 0 ? (
          <div className="text-center py-6 text-sm text-slate-500">
            이 코너에 적용할 수 있는 화면 세트가 없습니다.<br />
            <b>태블릿 콘텐츠</b> 탭에서 화면 세트를 먼저 만들어 주세요.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-600">다른 화면 세트</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {otherSets.map((s) => (
                <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-3 flex flex-col gap-2 transition">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-800 truncate flex items-center gap-1.5">
                      {s.name}
                      {s.tabletId === null && <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">재사용</span>}
                    </div>
                    <div className="text-[11px] text-slate-400">{STATUS_LABEL[s.status]} · {templateLabel(s.templateKey)} · 블록 {s.blockCount ?? 0}개</div>
                  </div>
                  <div className="flex gap-2 mt-auto items-center">
                    <button onClick={() => handleApply(s)} disabled={busy} className="flex-1 min-h-[44px] px-3 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50">이 화면 사용</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        </>
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
    case 'content_list':
      // WO-O4O-KPA-TABLET-CONTENT-LIST-PICKER-UI-V1: raw JSON 대신 picker 기반 편집.
      return (
        <ContentListEditor
          items={Array.isArray(c.items) ? (c.items as ContentListItem[]) : []}
          onChange={(items) => onReplaceConfig({ items })}
        />
      );
    case 'product_content':
    default:
      return <JsonConfig config={block.config} onReplaceConfig={onReplaceConfig} />;
  }
}

// ── content_list 편집기 (WO-O4O-KPA-TABLET-CONTENT-LIST-PICKER-UI-V1) ──
//   raw JSON 없이 O4O 표준 설명서 / 매장 제작 콘텐츠를 골라 카드 목록을 구성.
//   저장 config shape 는 서버 계약(parseContentListConfig)과 동일.
// WO-O4O-KPA-TABLET-TOUCH-FIRST-CONTENT-LIST-EDITOR-V1: content_list 편집을 터치 카드로 정비.
//   config 계약(sourceType/masterId+language/contentId/visible/sortOrder/override) 불변 — UI/UX 만.
//   제목은 config 에 없으므로: override → 추가 시 캡처한 힌트(세션) → 출처 중립 라벨. (원본 resolve 는 API 확장 필요 → 안 함)
function ContentListEditor({ items, onChange }: { items: ContentListItem[]; onChange: (items: ContentListItem[]) => void }) {
  const [picking, setPicking] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [titleHints, setTitleHints] = useState<Record<string, string>>({});
  const sourceLabel = (t: string) => (t === 'o4o_product_description' ? 'O4O 표준 설명서' : '매장 제작 콘텐츠');
  const reindex = (arr: ContentListItem[]) => arr.map((it, idx) => ({ ...it, sortOrder: idx * 10 } as ContentListItem));
  const upd = (i: number, patch: Partial<ContentListItem>) =>
    onChange(items.map((it, idx) => (idx === i ? ({ ...it, ...patch } as ContentListItem) : it)));
  const move = (i: number, dir: 'up' | 'down') => {
    const t = dir === 'up' ? i - 1 : i + 1;
    if (t < 0 || t >= items.length) return;
    const next = [...items];
    [next[i], next[t]] = [next[t], next[i]];
    onChange(reindex(next));
  };
  const remove = (i: number) => {
    if (!window.confirm('이 콘텐츠를 현재 화면 세트에서 제거하시겠습니까?\n원본 콘텐츠는 삭제되지 않습니다.')) return;
    onChange(reindex(items.filter((_, idx) => idx !== i)));
  };
  const add = (added: ContentListItem[], titles: Record<string, string>) => {
    const seen = new Set(items.map(key2));
    const fresh = added.filter((it) => !seen.has(key2(it)));
    setTitleHints((h) => ({ ...h, ...titles }));
    onChange(reindex([...items, ...fresh]));
    setPicking(false);
  };
  const cardTitle = (it: ContentListItem) => it.displayTitle || titleHints[key2(it)] || sourceLabel(it.sourceType);
  const btn = 'min-h-[44px] px-3 py-2 text-sm font-medium rounded-xl inline-flex items-center justify-center gap-1';

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-800">코너 콘텐츠 <span className="text-xs font-normal text-slate-400">{items.length}개</span></div>
          <p className="text-[11px] text-slate-500 leading-relaxed">고객에게 보여줄 제품 설명·매장 안내 콘텐츠입니다. 여기서 바꾼 제목·설명은 현재 화면 세트에만 적용되며, 원본 콘텐츠는 변경되지 않습니다.</p>
        </div>
        <button onClick={() => setPicking(true)} className={`${btn} text-white bg-indigo-600 hover:bg-indigo-700 flex-shrink-0`}>
          <Plus className="w-4 h-4" /> 코너 콘텐츠 추가
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 text-center py-8 px-4 space-y-3">
          <p className="text-sm text-slate-500 leading-relaxed">아직 코너 콘텐츠가 없습니다.<br />이 코너에서 고객에게 보여줄 제품 설명이나 매장 안내 콘텐츠를 추가해 주세요.</p>
          <button onClick={() => setPicking(true)} className={`${btn} text-white bg-indigo-600 hover:bg-indigo-700`}>
            <Plus className="w-4 h-4" /> 코너 콘텐츠 추가
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it, i) => {
            const k = key2(it);
            const open = expanded === k;
            return (
              <div key={k} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 flex-shrink-0">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-800 truncate">{cardTitle(it)}</div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${it.sourceType === 'o4o_product_description' ? 'text-blue-700 bg-blue-50' : 'text-emerald-700 bg-emerald-50'}`}>{sourceLabel(it.sourceType)}</span>
                      <span className={`text-[11px] ${it.visible ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>{it.visible ? '● 고객 화면에 표시' : '○ 현재 숨김'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => move(i, 'up')} disabled={i === 0} className={`${btn} text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30`}><ChevronUp className="w-4 h-4" /> 위로</button>
                  <button onClick={() => move(i, 'down')} disabled={i === items.length - 1} className={`${btn} text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30`}><ChevronDown className="w-4 h-4" /> 아래로</button>
                  <button onClick={() => upd(i, { visible: !it.visible })} className={`${btn} ${it.visible ? 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50' : 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'}`}>{it.visible ? '숨기기' : '표시하기'}</button>
                  <button onClick={() => setExpanded(open ? null : k)} className={`${btn} text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50`}>내용 설정</button>
                </div>
                {open && (
                  <div className="border-t border-slate-100 pt-2 space-y-2">
                    <div>
                      <label className="text-[11px] font-medium text-slate-600">화면에 표시할 제목</label>
                      <input value={it.displayTitle ?? ''} onChange={(e) => upd(i, { displayTitle: e.target.value.trim() ? e.target.value : null })} placeholder="비워두면 원래 콘텐츠 제목을 사용합니다" className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-600">화면에 표시할 짧은 설명</label>
                      <input value={it.displaySummary ?? ''} onChange={(e) => upd(i, { displaySummary: e.target.value.trim() ? e.target.value : null })} placeholder="비워두면 원래 콘텐츠의 요약을 사용합니다" className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                    </div>
                    <div className="pt-1">
                      <button onClick={() => remove(i)} className="min-h-[44px] px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-xl hover:bg-red-50 inline-flex items-center gap-1">
                        <X className="w-4 h-4" /> 이 화면 세트에서 제거
                      </button>
                      <p className="text-[11px] text-slate-400 mt-1">이 화면 세트의 목록에서만 빠집니다. 원본 콘텐츠는 삭제되지 않습니다.</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {picking && (
        <ContentPickerModal
          existingKeys={new Set(items.map(key2))}
          onClose={() => setPicking(false)}
          onAdd={add}
          baseSort={items.length * 10}
        />
      )}
    </div>
  );
}
const key2 = (it: ContentListItem) => (it.sourceType === 'o4o_product_description' ? `o4o:${it.masterId}:${it.language}` : `store:${it.contentId}`);

// content 선택 모달 — 출처 탭(O4O 표준 / 매장 제작) + 검색 + 결과 추가.
// WO-O4O-KPA-TABLET-TOUCH-FIRST-CONTENT-LIST-EDITOR-V1: 콘텐츠 선택 모달 터치 정비.
//   출처 탭/검색/dedup 유지. 결과=터치 카드(카드 전체 토글), 이미 추가된 항목 표시, 모바일 풀스크린.
//   onAdd 는 선택 item + 제목 힌트(세션 표시용)를 함께 전달(config 미변경).
function ContentPickerModal({ existingKeys, onClose, onAdd, baseSort }: {
  existingKeys: Set<string>;
  onClose: () => void;
  onAdd: (items: ContentListItem[], titles: Record<string, string>) => void;
  baseSort: number;
}) {
  const [tab, setTab] = useState<'o4o' | 'store'>('o4o');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [o4o, setO4o] = useState<O4oDescriptionSearchResult[]>([]);
  const [store, setStore] = useState<StoreContentSearchResult[]>([]);
  const [selO4o, setSelO4o] = useState<Record<string, boolean>>({});
  const [selStore, setSelStore] = useState<Record<string, boolean>>({});

  const run = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'o4o') setO4o(await searchTabletO4oDescriptions(q));
      else setStore(await searchTabletStoreContents(q));
    } catch { /* 검색 실패는 빈 목록으로 */ if (tab === 'o4o') setO4o([]); else setStore([]); }
    finally { setLoading(false); }
  }, [tab, q]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, [tab]); // 탭 전환 시 자동 검색(매장 제작은 q 없이 최근순)

  const confirm = () => {
    const out: ContentListItem[] = [];
    const titles: Record<string, string> = {};
    let n = baseSort;
    o4o.filter((r) => selO4o[r.masterId]).forEach((r) => {
      const key = `o4o:${r.masterId}:ko`;
      out.push({ sourceType: 'o4o_product_description', masterId: r.masterId, language: 'ko', displayTitle: null, displaySummary: null, visible: true, sortOrder: (n += 10) });
      titles[key] = r.name;
    });
    store.filter((r) => selStore[r.contentId]).forEach((r) => {
      const key = `store:${r.contentId}`;
      out.push({ sourceType: 'store_content', contentId: r.contentId, displayTitle: null, displaySummary: null, visible: true, sortOrder: (n += 10) });
      titles[key] = r.title || '매장 제작 콘텐츠';
    });
    onAdd(out, titles);
  };
  const selectedCount = Object.values(selO4o).filter(Boolean).length + Object.values(selStore).filter(Boolean).length;
  const tabBtn = (active: boolean) => `flex-1 min-h-[44px] px-3 py-2 text-sm font-medium rounded-xl ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`;

  return (
    <div className="fixed inset-0 z-[950] bg-slate-900/50 flex items-stretch sm:items-center justify-center p-0 sm:p-4" onClick={onClose} role="presentation">
      <div className="bg-white w-full h-full sm:h-auto sm:max-w-lg sm:max-h-[86vh] rounded-none sm:rounded-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
          <h4 className="text-base font-bold text-slate-700">코너 콘텐츠 추가</h4>
          <button onClick={onClose} className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-slate-600" aria-label="닫기"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-4 pt-3 flex gap-2 flex-shrink-0">
          <button onClick={() => setTab('o4o')} className={tabBtn(tab === 'o4o')}>O4O 표준 설명서</button>
          <button onClick={() => setTab('store')} className={tabBtn(tab === 'store')}>매장 제작 콘텐츠</button>
        </div>
        <div className="px-4 py-2 flex gap-2 flex-shrink-0">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()}
            placeholder={tab === 'o4o' ? '상품명 · 바코드로 검색 (2자 이상)' : '콘텐츠 제목으로 검색 (비우면 최근순)'}
            className="flex-1 min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 text-sm" autoFocus />
          <button onClick={run} className="min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700">검색</button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-6"><Loader2 className="w-4 h-4 animate-spin" /> 검색 중…</div>
          ) : tab === 'o4o' ? (
            o4o.length === 0 ? <div className="text-sm text-slate-400 py-6 text-center">검색 결과가 없습니다. 다른 검색어를 입력해 보세요.<br /><span className="text-[11px]">(매장용 표준 설명서가 있는 상품만 표시됩니다)</span></div> :
            o4o.map((r) => {
              const added = existingKeys.has(`o4o:${r.masterId}:ko`);
              const sel = !!selO4o[r.masterId];
              return (
                <button key={r.masterId} disabled={added} onClick={() => setSelO4o((s) => ({ ...s, [r.masterId]: !s[r.masterId] }))}
                  className={`w-full text-left rounded-xl border p-3 transition ${added ? 'border-slate-100 bg-slate-50 opacity-70 cursor-default' : sel ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-200'}`}>
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${sel ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>{sel ? '✓' : ''}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-800 truncate">{r.name}</div>
                      <div className="text-[11px] text-slate-400 truncate">O4O 표준 설명서{r.barcode ? ` · ${r.barcode}` : ''}{r.summary ? ` · ${r.summary.slice(0, 30)}` : ''}</div>
                    </div>
                    {added && <span className="text-[10px] font-semibold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded flex-shrink-0">이미 추가됨</span>}
                  </div>
                </button>
              );
            })
          ) : (
            store.length === 0 ? <div className="text-sm text-slate-400 py-6 text-center">매장 제작 콘텐츠가 없습니다.</div> :
            store.map((r) => {
              const added = existingKeys.has(`store:${r.contentId}`);
              const sel = !!selStore[r.contentId];
              return (
                <button key={r.contentId} disabled={added} onClick={() => setSelStore((s) => ({ ...s, [r.contentId]: !s[r.contentId] }))}
                  className={`w-full text-left rounded-xl border p-3 transition ${added ? 'border-slate-100 bg-slate-50 opacity-70 cursor-default' : sel ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-200'}`}>
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${sel ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>{sel ? '✓' : ''}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-800 truncate">{r.title || '(제목 없음)'}</div>
                      <div className="text-[11px] text-slate-400 truncate">매장 제작 콘텐츠 · {r.hasProductLink ? '상품 연결' : '일반 콘텐츠'}{r.summary ? ` · ${r.summary.slice(0, 30)}` : ''}</div>
                    </div>
                    {added && <span className="text-[10px] font-semibold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded flex-shrink-0">이미 추가됨</span>}
                  </div>
                </button>
              );
            })
          )}
        </div>
        <div className="px-4 py-3 border-t flex items-center justify-between gap-2 flex-shrink-0">
          <span className="text-xs text-slate-500">{selectedCount}개 선택됨</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="min-h-[44px] px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">취소</button>
            <button onClick={confirm} disabled={selectedCount === 0} className="min-h-[44px] px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50">선택한 콘텐츠 추가</button>
          </div>
        </div>
      </div>
    </div>
  );
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

// ── 단계형 제작 셸 (WO-O4O-KPA-TABLET-CONTENT-STEP-BUILDER-SHELL-V1) ──
//   신규/수정 공통. 인라인 폼/패널을 단계 화면으로 분리. 기존 하위 편집기·저장 API·dirty guard 재사용.
//   저장 = createScreenSet|updateScreenSet + saveScreenSetBlocks(전체 교체). 저장 성공 후 리스트 복귀.
//   코너 적용/해제는 노출하지 않음(코너별 운영 탭 전용). draft 실미리보기는 후속 WO(placeholder).
// WO-O4O-KPA-TABLET-TEMPLATE-DRIVEN-BUILDER-STEPS-V1: 단계 = 선택 템플릿의 steps 메타로 구동.
//   신규 draft 는 QR 안내 블록을 기본 포함(모든 템플릿 메인 QR 원칙). 기존 수정은 블록을 강제 변경하지 않는다.
const seedInitialBlocks = (detail: ScreenSetDetail | null): ScreenBlock[] =>
  detail
    ? detail.blocks.map((b) => ({ ...b, config: b.config ?? {} }))
    : [{ blockType: 'qr_guide', sortOrder: 0, isEnabled: true, config: defaultConfig('qr_guide') }];

function TabletContentStepBuilder({ initialDetail, onCancel, onSaved, onToast, previewApi, storeSlug }: {
  initialDetail: ScreenSetDetail | null;
  onCancel: () => void;
  onSaved: () => void;
  onToast: (t: Toast) => void;
  previewApi?: TabletKioskApi;
  storeSlug?: string | null;
}) {
  const isEdit = !!initialDetail;
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialDetail?.name ?? '');
  const [status, setStatus] = useState<ScreenSetStatus>(initialDetail?.status ?? 'draft');
  const [templateKey, setTemplateKey] = useState(initialDetail?.templateKey ?? DEFAULT_TEMPLATE_KEY);
  const [blocks, setBlocks] = useState<ScreenBlock[]>(() => seedInitialBlocks(initialDetail));
  const [stepAddType, setStepAddType] = useState<ScreenBlockType>('corner_description');
  const [saving, setSaving] = useState(false);

  // WO-O4O-KPA-TABLET-CONTENT-DRAFT-PREVIEW-V1: 저장 전 미리보기(태블릿 / QR 모바일). 모달은 편집 상태를 잃지 않는다.
  const canPreview = !!previewApi && !!storeSlug;
  const [preview, setPreview] = useState<{ screen: TabletScreenResponse; view: 'tablet' | 'mobile' } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const openPreview = async (view: 'tablet' | 'mobile') => {
    if (!canPreview || previewLoading) return;
    setPreviewLoading(true);
    try {
      const screen = await previewScreenSet({ templateKey, blocks });
      setPreview({ screen, view });
    } catch (e: any) {
      onToast({ type: 'error', message: e?.message || '미리보기를 불러오지 못했습니다.' });
    } finally { setPreviewLoading(false); }
  };

  // ── dirty guard (baseline = 초기값) ──
  const baseline = useRef({
    name: initialDetail?.name ?? '',
    status: (initialDetail?.status ?? 'draft') as ScreenSetStatus,
    templateKey: initialDetail?.templateKey ?? DEFAULT_TEMPLATE_KEY,
    blocks: normalizeBlocks(seedInitialBlocks(initialDetail)),
  });
  const isDirty =
    name.trim() !== baseline.current.name ||
    status !== baseline.current.status ||
    templateKey !== baseline.current.templateKey ||
    normalizeBlocks(blocks) !== baseline.current.blocks;
  useEffect(() => {
    if (!isDirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [isDirty]);
  const guardedCancel = () => { if (!isDirty || window.confirm(DISCARD_MSG)) onCancel(); };

  // ── block helpers ──
  const addBlock = (t: ScreenBlockType) =>
    setBlocks((prev) => [...prev, { blockType: t, sortOrder: prev.length, isEnabled: true, config: defaultConfig(t) }]);
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
  const replaceConfig = (i: number, cfg: Record<string, unknown>) =>
    setBlocks((prev) => prev.map((b, idx) => (idx === i ? { ...b, config: cfg } : b)));

  const nameValid = name.trim().length > 0;

  // ── 템플릿 메타 구동 단계(WO-O4O-KPA-TABLET-TEMPLATE-DRIVEN-BUILDER-STEPS-V1) ──
  const tmpl = templateMeta(templateKey);
  const tSteps = tmpl.steps;              // 템플릿 선택 이후 단계(basic..save)
  const totalSteps = 1 + tSteps.length;   // + 템플릿 선택(step 0)
  // 템플릿 변경으로 단계 수가 줄면 현재 step 을 클램프(자동 삭제/덮어쓰기 아님).
  useEffect(() => { setStep((s) => Math.min(s, totalSteps - 1)); }, [totalSteps]);
  // 현재 템플릿 필수 블록 중 없는 것(경고용 — 자동 추가/삭제하지 않음).
  const missingRequired = tmpl.requiredBlocks.filter((rt) => !blocks.some((b) => b.blockType === rt));

  const handleSave = async () => {
    if (!nameValid) { onToast({ type: 'error', message: '콘텐츠 이름을 입력해 주세요.' }); setStep(1); return; }
    setSaving(true);
    try {
      let id = initialDetail?.id;
      if (isEdit && id) {
        await updateScreenSet(id, { name: name.trim(), status, templateKey });
      } else {
        // library 재사용 세트(tabletId=null). create 계약은 draft|active 만 허용 → archived 는 draft 로.
        const created = await createScreenSet({ name: name.trim(), tabletId: null, status: status === 'active' ? 'active' : 'draft', templateKey });
        id = created.id;
      }
      await saveScreenSetBlocks(id!, blocks);
      onToast({ type: 'success', message: isEdit ? '태블릿 콘텐츠가 저장되었습니다.' : `태블릿 콘텐츠 "${name.trim()}" 생성됨` });
      onSaved();
    } catch (e: any) {
      onToast({ type: 'error', message: e?.message || '저장에 실패했습니다.' });
    } finally { setSaving(false); }
  };

  // ── 블록 행(순서/표시/삭제 + config) ──
  const BlockRow = ({ i }: { i: number }) => {
    const b = blocks[i];
    return (
      <div className="border border-slate-200 rounded-lg p-2.5 bg-white">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-slate-700 flex-1">{BLOCK_LABEL[b.blockType] ?? b.blockType}</span>
          <label className="text-[11px] text-slate-500 flex items-center gap-1">
            <input type="checkbox" checked={b.isEnabled} onChange={() => toggleBlock(i)} className="rounded border-slate-300 text-indigo-600" /> 화면에 표시
          </label>
          <button onClick={() => moveBlock(i, 'up')} disabled={i === 0} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
          <button onClick={() => moveBlock(i, 'down')} disabled={i === blocks.length - 1} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
          <button onClick={() => removeBlock(i)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"><X className="w-3.5 h-3.5" /></button>
        </div>
        <BlockConfigForm block={b} onPatch={(patch) => patchConfig(i, patch)} onReplaceConfig={(cfg) => replaceConfig(i, cfg)} />
      </div>
    );
  };

  // ── blocks 단계 렌더(단계별 blockTypes 필터 — 기존 하위 편집기 재사용) ──
  //   필수 블록이 없어도 자동 추가/삭제하지 않고 경고 + 빠른 추가 버튼만 제공(예외 처리).
  const renderBlocksStep = (sm: BuilderStepMeta) => {
    const types = sm.blockTypes ?? [];
    const idxs = blocks.map((_, i) => i).filter((i) => types.includes(blocks[i].blockType));
    const addable = BLOCK_TYPES.filter((b) => types.includes(b.value) && b.value !== 'product_content');
    const missingHere = tmpl.requiredBlocks.filter((rt) => types.includes(rt) && !blocks.some((b) => b.blockType === rt));
    const addType = types.includes(stepAddType) ? stepAddType : (addable[0]?.value ?? types[0]);
    return (
      <div className="space-y-3">
        {sm.note && <p className="text-[11px] text-slate-500">{sm.note}</p>}
        {missingHere.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[11px] text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>필수 구성이 없습니다. 해당 단계를 확인해 주세요.</span>
            {missingHere.map((t) => (
              <button key={t} onClick={() => addBlock(t)} className="px-2 py-0.5 text-[11px] font-medium text-amber-800 bg-white border border-amber-300 rounded hover:bg-amber-100">+ {BLOCK_LABEL[t] ?? t}</button>
            ))}
          </div>
        )}
        {idxs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white/60 text-center py-6 px-4 text-sm text-slate-500">이 단계의 블록이 없습니다. 아래에서 추가하세요.</div>
        ) : (
          <div className="space-y-2">{idxs.map((i) => <BlockRow key={i} i={i} />)}</div>
        )}
        {addable.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <select value={addType} onChange={(e) => setStepAddType(e.target.value as ScreenBlockType)} className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs">
              {addable.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <button onClick={() => addBlock(addType)} className="px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> 블록 추가
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* ── 헤더 + 스텝 인디케이터 ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" /> {isEdit ? '태블릿 화면 수정' : '태블릿 화면 만들기'}
          {isDirty && <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">변경됨</span>}
        </h3>
        <button onClick={guardedCancel} className="text-xs text-slate-500 hover:text-slate-700 inline-flex items-center gap-1">
          <X className="w-3.5 h-3.5" /> 목록으로
        </button>
      </div>
      <ol className="flex items-center gap-1 flex-wrap text-[11px]">
        {['템플릿', ...tSteps.map((s) => s.title)].map((label, idx) => (
          <li key={`${idx}-${label}`} className="flex items-center gap-1">
            <button
              onClick={() => setStep(idx)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium transition-colors ${
                idx === step ? 'bg-indigo-600 text-white' : idx < step ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${idx === step ? 'bg-white/25' : 'bg-white/70 text-slate-500'}`}>{idx + 1}</span>
              {label}
            </button>
            {idx < totalSteps - 1 && <span className="text-slate-300">›</span>}
          </li>
        ))}
      </ol>

      {/* ── 단계 본문 ── */}
      <div className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/20 min-h-[220px]">
        {step === 0 && (
          <div className="space-y-2">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <TemplateSelectField value={templateKey} onChange={setTemplateKey} />
            </div>
          </div>
        )}

        {step >= 1 && (() => {
          const sm = tSteps[step - 1];
          if (!sm) return null;
          if (sm.kind === 'basic') {
            return (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">콘텐츠 이름</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 입마름·구취 관리 세트"
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" autoFocus />
                  {!nameValid && <p className="text-[11px] text-amber-600 mt-1">저장하려면 이름이 필요합니다.</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">상태</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as ScreenSetStatus)}
                    className="mt-1 px-2 py-2 rounded-lg border border-slate-200 text-sm">
                    <option value="draft">초안</option>
                    <option value="active">활성</option>
                    {isEdit && <option value="archived">보관</option>}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">저장은 세트 내용만 저장합니다(코너에 자동 적용되지 않음). 코너 적용은 ‘코너별 운영’ 탭에서 합니다.</p>
                </div>
              </div>
            );
          }
          if (sm.kind === 'save') {
            return (
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1.5">
                  <div className="text-sm font-bold text-slate-800">{name.trim() || '(이름 없음)'}</div>
                  <div className="text-[11px] text-slate-500">
                    템플릿 <b>{templateLabel(templateKey)}</b> · 상태 <b>{STATUS_LABEL[status]}</b> · 블록 <b>{blocks.length}</b>개
                    {' '}(표시 {blocks.filter((b) => b.isEnabled).length}개)
                  </div>
                  {missingRequired.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-amber-700 pt-1">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> 필수 구성이 없습니다. 해당 단계를 확인해 주세요. (없는 항목: {missingRequired.map((t) => BLOCK_LABEL[t] ?? t).join(', ')})
                    </div>
                  )}
                </div>
                {/* WO-O4O-KPA-TABLET-CONTENT-DRAFT-PREVIEW-V1: 저장 전 미리보기(태블릿 / QR 모바일). */}
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => openPreview('tablet')} disabled={!canPreview || previewLoading}
                    className="min-h-[44px] px-4 py-2 text-sm font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-xl hover:bg-indigo-50 disabled:opacity-50 inline-flex items-center gap-1.5"
                    title={canPreview ? undefined : '매장 공개 주소를 불러오는 중이거나 미리보기를 사용할 수 없습니다.'}>
                    {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />} 태블릿 미리보기
                  </button>
                  <button onClick={() => openPreview('mobile')} disabled={!canPreview || previewLoading}
                    className="min-h-[44px] px-4 py-2 text-sm font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-xl hover:bg-indigo-50 disabled:opacity-50 inline-flex items-center gap-1.5"
                    title={canPreview ? undefined : '매장 공개 주소를 불러오는 중이거나 미리보기를 사용할 수 없습니다.'}>
                    {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />} QR 모바일 미리보기
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  미리보기는 현재 편집 중인 내용(저장 전)을 실제 화면으로 보여줍니다. 상품 목록·코너 콘텐츠는 매장 데이터로 조회되며, 저장 전에는 DB에 반영되지 않습니다.
                  {!canPreview && ' (매장 공개 주소를 불러오는 중이면 잠시 후 다시 시도해 주세요.)'}
                </p>
                <button onClick={handleSave} disabled={saving || !nameValid}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 태블릿 콘텐츠 저장
                </button>
              </div>
            );
          }
          return renderBlocksStep(sm);
        })()}
      </div>

      {/* ── 이전/다음 ── */}
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
          className="min-h-[44px] px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40">
          이전
        </button>
        {step < totalSteps - 1 ? (
          <button onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
            className="min-h-[44px] px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700">
            다음
          </button>
        ) : (
          <button onClick={handleSave} disabled={saving || !nameValid}
            className="min-h-[44px] px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 저장
          </button>
        )}
      </div>

      {/* WO-O4O-KPA-TABLET-CONTENT-DRAFT-PREVIEW-V1: 저장 전 미리보기 모달. 닫아도 편집 상태(name/blocks 등) 유지. */}
      {preview && previewApi && (
        <div className="fixed inset-0 z-[100000] bg-slate-900/70 flex flex-col" onClick={() => setPreview(null)} role="presentation">
          <div className="bg-slate-900/95 text-white px-4 py-2 flex items-center justify-between gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm font-semibold whitespace-nowrap">저장 전 미리보기</span>
              <div className="flex gap-1">
                <button onClick={() => setPreview((p) => (p ? { ...p, view: 'tablet' } : p))}
                  className={`px-3 py-1 text-xs font-medium rounded-full ${preview.view === 'tablet' ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                  태블릿
                </button>
                <button onClick={() => setPreview((p) => (p ? { ...p, view: 'mobile' } : p))}
                  className={`px-3 py-1 text-xs font-medium rounded-full ${preview.view === 'mobile' ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                  QR 모바일
                </button>
              </div>
            </div>
            <button onClick={() => setPreview(null)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium whitespace-nowrap">
              <X className="w-4 h-4" /> 닫기
            </button>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center p-3 overflow-auto" onClick={(e) => e.stopPropagation()}>
            {preview.view === 'tablet' ? (
              <div style={{ position: 'relative', overflow: 'hidden', width: 'min(100%, 1024px)', aspectRatio: '16 / 10', background: '#000', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                <TabletKioskPage api={previewApi} slug={storeSlug ?? undefined} previewScreen={preview.screen} embedded showQrBadge={false} />
              </div>
            ) : (
              <div style={{ position: 'relative', overflow: 'hidden', width: 390, maxWidth: '100%', height: 'min(86vh, 780px)', background: '#000', borderRadius: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                <TabletKioskPage api={previewApi} slug={storeSlug ?? undefined} previewScreen={preview.screen} embedded showQrBadge={false} />
              </div>
            )}
          </div>
          <div className="bg-slate-900/90 text-slate-300 text-[11px] px-4 py-1.5 text-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            저장 전 미리보기입니다. 실제 태블릿에서는 화면 크기·방향에 따라 표시가 달라질 수 있습니다. 상담 요청은 전송되지 않습니다.
          </div>
        </div>
      )}
    </div>
  );
}
