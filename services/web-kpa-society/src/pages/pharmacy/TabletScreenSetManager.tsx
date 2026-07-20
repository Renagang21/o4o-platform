/**
 * TabletScreenSetManager — 태블릿 Screen Set / Block 1차 Editor UX
 *
 * WO-O4O-KPA-TABLET-SCREEN-SET-BLOCK-EDITOR-UX-V1
 *   선택된 코너/태블릿의 Screen Set 목록·생성·수정·archive·적용/해제 + Screen Block 편집.
 *   선행 구현 관리 API(/store/screen-sets, /store/tablets/:id/current-screen-set)만 사용.
 *   적용된 Screen Set 은 공개 GET /:slug/tablet/screen → kiosk-core 뷰어에 반영됨(PUBLIC-RUNTIME-READ 완료).
 *   기존 legacy 진열/대기화면 편집 영역은 그대로 유지(이 컴포넌트는 additive).
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Loader2, Plus, ChevronUp, ChevronDown, X, Save, Layers, Copy, Check, Sparkles } from 'lucide-react';
import {
  fetchScreenSets, fetchScreenSet, createScreenSet, updateScreenSet,
  archiveScreenSet, saveScreenSetBlocks,
  // WO-O4O-KPA-TABLET-CONTENT-LIST-PICKER-UI-V1
  searchTabletStoreContents, searchTabletO4oDescriptions,
  // WO-O4O-KPA-TABLET-CONTENT-DRAFT-PREVIEW-V1: 저장 전 draft → sections resolve(read-only)
  previewScreenSet,
  type ScreenSet, type ScreenSetDetail, type ScreenBlock, type ScreenBlockType, type ScreenSetStatus,
  type ContentListItem, type StoreContentSearchResult, type O4oDescriptionSearchResult,
} from '../../api/tabletDisplays';
// WO-O4O-SCREEN-CONTENT-CORE-PURE-CONTRACT-EXTRACTION-V1: 검증된 순수 콘텐츠 로직을 Core 에서 소비(로컬 중복 제거).
//   타입은 tabletDisplays(API DTO) 를 그대로 쓰고, 순수 함수만 Core 로 대체(구조적 호환).
import {
  normalizeCornerBody, normalizeBlocks, ensureAutoBlocks, seedInitialBlocks,
  contentItemKey, moveContentItem, removeContentItem, addContentItems, updateContentItem, isValidScreenSetName,
} from '@o4o/screen-content-core';
// WO-O4O-KPA-TABLET-CONTENT-STANDARD-LIST-V1: library 목록을 O4O 표준 테이블로 정비(추출).
import TabletContentLibraryList from './TabletContentLibraryList';
// WO-O4O-KPA-TABLET-CONTENT-DRAFT-PREVIEW-V1: 제작 셸 미리보기 = kiosk-core 뷰어 재사용(sections 주입 + embedded).
import { TabletKioskPage, detectIdleMediaType, type TabletKioskApi, type TabletScreenResponse } from '@o4o/tablet-kiosk-core';
// WO-O4O-KPA-TABLET-STANDARD-EDITOR-UNIFY-V1: 코너 설명 본문 = O4O 표준 편집기(별도 HTML 입력창 없음)
import { RichTextEditor } from '@o4o/content-editor';
// WO-O4O-TABLET-ADDITIONAL-CONTENT-SKU-DISTINGUISHABILITY-V1: 동일 상품명 SKU 구분정보(handled-products 와 공통 함수 재사용).
import { buildProductVariantLabel } from '../../utils/productVariantLabel';

type Toast = { type: 'success' | 'error'; message: string };

// WO-O4O-KPA-TABLET-CONTENT-LIBRARY-TAB-SPLIT-V1:
//   같은 컴포넌트를 두 맥락에서 재사용한다.
//   - 'corner'  : 코너별 운영 탭 — 이 코너에 '현재 사용 중' 세트 + 다른 세트로 교체(적용/해제)만. 원본 편집/생성/보관 없음.
//   - 'library' : 태블릿 콘텐츠 탭 — 매장 전체 화면 세트 목록(콘텐츠 원본) 수정/보관/생성. 코너 적용(교체) 없음.
// WO-O4O-KPA-TABLET-CORNER-CONTENT-LINK-UI-V1:
//   코너별 운영은 연결(store_tablet_corner_contents) 기반 TabletCornerContentsPanel 로 분리됨.
//   → 이 컴포넌트는 '태블릿 콘텐츠'(콘텐츠 원본 라이브러리) 전용. corner 모드/적용(교체)은 여기서 다루지 않는다.

// '사용 중인 코너' 계산용 최소 태블릿 정보(페이지의 TabletType 하위집합).
export interface ScreenSetUsageTablet {
  id: string;
  name: string;
  location?: string | null;
  currentScreenSetId?: string | null;
}

interface Props {
  onToast: (t: Toast) => void;
  // 각 세트가 어느 코너에서 현재 사용 중인지 표시.
  tablets?: ScreenSetUsageTablet[];
  // WO-O4O-KPA-TABLET-CONTENT-DRAFT-PREVIEW-V1: 제작 셸 미리보기용(opt-in).
  //   kiosk-core 재사용 미리보기 = previewApi(상품 조회) + storeSlug(공개 slug). 미주입 시 미리보기 비활성.
  previewApi?: TabletKioskApi;
  storeSlug?: string | null;
  // WO-O4O-KPA-TABLET-PREVIEW-CORNER-CONTEXT-AND-LABEL-FIX-V1: 리스트 미리보기 코너 문맥(단독=코너 없음) 전달.
  onPreviewContext?: (tabletId: string | null) => void;
}

// WO-O4O-KPA-TABLET-BUILDER-BUSINESS-FIELDS-V1: 블록 유형 목록/라벨(BLOCK_TYPES·BLOCK_LABEL) 제거 —
//   사용자에게 블록 유형을 고르게 하지 않으므로 내부 용어 테이블이 필요 없다.

// WO-O4O-KPA-TABLET-TEMPLATE-SELECTION-EDITOR-V1:
//   Phase 1 선택지는 corner_information_basic_v1 하나뿐이지만, 후속 TEMPLATE-APPLY 에서
//   product_focus / idle_video_first / comparison 을 추가할 때 편집기 구조를 다시 만들지 않도록
//   선택형 UI 를 미리 둔다. whitelist 확장/렌더러 구현은 이번 WO 범위 아님(서버 화이트리스트가 정본).
const DEFAULT_TEMPLATE_KEY = 'corner_information_basic_v1';

// WO-O4O-KPA-TABLET-TEMPLATE-DRIVEN-BUILDER-STEPS-V1:
//   템플릿 = 기능 종류가 아니라 UI 배치 유형.
// WO-O4O-KPA-TABLET-BUILDER-BUSINESS-FIELDS-V1:
//   제작 화면에서 **블록 개념을 제거**한다. 단계는 템플릿별 블록 묶음이 아니라
//   사용자가 실제로 하는 업무 3항목(대기 화면 / 코너 설명 / 추가 정보)으로 고정한다.
//   내부 블록(idle_media/corner_description/content_list/product_list/qr_guide)은
//   템플릿 선택 시 자동 준비되고 사용자에게 용어가 노출되지 않는다.
type BuilderStepKind = 'idle' | 'corner' | 'extra' | 'save';
interface BuilderStepMeta {
  title: string;
  kind: BuilderStepKind;
  /** 단계 상단 안내(선택). */
  note?: string;
}
interface TemplateMeta {
  key: string;
  label: string;
  description: string;
  /** 이 템플릿이 화면에 쓰는 블록(자동 준비 대상). 사용자에게 노출하지 않는다. */
  requiredBlocks: ScreenBlockType[];
}
// WO-O4O-KPA-TABLET-BUILDER-REMOVE-STATUS-SELECT-V1: '기본 정보' 단계 제거.
//   상태 선택 제거 후 기본 정보엔 콘텐츠 이름만 남는데, 그 관리 이름은 코너 제목에서 자동 파생 →
//   독립 단계 불필요. 관리 이름은 마지막 '미리보기·저장' 단계에서 선택적으로만 수정.
const BUILDER_STEPS: BuilderStepMeta[] = [
  { title: '대기 화면', kind: 'idle', note: '손님이 화면을 만지지 않을 때 자동으로 재생할 영상입니다(YouTube·Vimeo URL). “화면을 터치하세요” 안내는 자동으로 표시됩니다.' },
  { title: '코너 설명', kind: 'corner', note: '이 코너가 어떤 곳인지 손님에게 보여줄 제목과 짧은 소개입니다.' },
  { title: '추가 정보', kind: 'extra', note: '손님에게 함께 보여줄 설명서·안내 콘텐츠를 골라 목록으로 구성합니다.' },
  { title: '미리보기·저장', kind: 'save' },
];

// 업무 3항목이 사용하는 내부 블록 — 템플릿 선택 시 자동 확보(추가만. 기존 블록 삭제·재정렬 없음).
//   product_list = 코너 진열 제품(코너별 운영에서 관리) · qr_guide = 모든 템플릿 메인 QR 원칙.
// AUTO_BLOCK_TYPES: @o4o/screen-content-core 에서 소비(로컬 정의 제거).

// 코너 설명 예제 요청문.
//   WO-O4O-KPA-TABLET-STANDARD-EDITOR-UNIFY-V1: 코너 설명이 표준 편집기(HTML) + ContentRenderer 렌더로
//   바뀌었으므로, 평문만 요구하던 이전 요청문을 HTML 산출용으로 교체한다.
//   ContentRenderer 는 sanitizeRichHtml(DOMPurify)로 script/위험 속성을 제거하고
//   iframe 은 youtube/vimeo 만 허용하므로, 요청문에서도 그 범위를 벗어나지 않게 지시한다.
const CORNER_DESC_PROMPT = `약국 매장 태블릿의 코너 안내 화면에 넣을 "짧은 소개"를 HTML로 만들어 주세요.

[코너 이름]
예: 구강관리 코너

[이 코너에서 다루는 것]
예: 치약, 칫솔, 치간칫솔, 구강청결제

조건:
- 손님이 태블릿 화면에서 읽는 글입니다. 3~5문장, 한 문장은 짧게.
- O4O 편집기의 HTML 탭에 그대로 붙여 넣을 수 있는 형태로 만들어 주세요.
- 사용할 태그: p, h2, h3, strong, em, ul, ol, li, br, a 정도면 충분합니다.
- 강조·여백 같은 꾸미기는 태그 안 style 속성(인라인 CSS)으로만 해 주세요.
- script, iframe, 외부 CSS 파일, 외부 폰트, 외부 스크립트는 사용하지 마세요(자동 제거됩니다).
- 제품을 파는 광고 문구가 아니라, 이 코너에서 무엇을 확인할 수 있는지 안내하는 톤으로.
- 질병을 치료·예방한다고 단정하지 마세요. 증상이 있으면 약사와 상담하라고 안내해 주세요.
- 과장된 표현, 최상급 표현(최고·완벽 등)은 쓰지 마세요.`;

const TEMPLATE_OPTIONS: TemplateMeta[] = [
  {
    key: 'corner_information_basic_v1',
    label: '기본 코너 안내형',
    description: '코너 설명, 제품 목록, QR 안내를 기본 구조로 보여주는 범용 템플릿입니다.',
    requiredBlocks: ['corner_description', 'content_list', 'product_list', 'qr_guide'],
  },
  // WO-O4O-KPA-TABLET-SCREEN-SET-TEMPLATE-APPLY-V1: 상품 집중형.
  {
    key: 'product_focus',
    label: '상품 집중형',
    description: '중심 제품과 핵심 설명을 크게 보여주고 관련 콘텐츠·QR을 보조로 배치합니다.',
    requiredBlocks: ['product_list', 'content_list', 'qr_guide'],
  },
  // WO-O4O-KPA-TABLET-TEMPLATE-THREE-PATTERNS-V1: 대기 영상형 / 코너 소개형 / 제품 진열형.
  {
    key: 'idle_touch_video',
    label: '대기 영상형',
    description: '대기 영상 위에 터치 안내와 QR을 보여줍니다. 손님의 첫 시선을 끄는 코너에 적합합니다.',
    requiredBlocks: ['idle_media', 'corner_description', 'qr_guide'],
  },
  {
    key: 'corner_overview_qr',
    label: '코너 소개형',
    description: '영상 없이 코너 설명과 콘텐츠, QR을 중심으로 보여줍니다. 코너 안내가 중요한 화면에 적합합니다.',
    requiredBlocks: ['corner_description', 'content_list', 'qr_guide'],
  },
  {
    key: 'product_grid_qr',
    label: '제품 진열형',
    description: '여러 제품(5~10개 수준)을 한 화면에 진열해 보여줍니다. 제품이 많은 코너에 적합합니다.',
    requiredBlocks: ['product_list', 'corner_description', 'qr_guide'],
  },
];
const templateMeta = (key: string | null | undefined): TemplateMeta =>
  TEMPLATE_OPTIONS.find((t) => t.key === key) ?? TEMPLATE_OPTIONS[0];
// WO-O4O-KPA-TABLET-CORNER-TEMPLATE-LABEL-V1: 코너 관리 화면(TabletCornerContentsPanel)도 같은 사용자용 라벨을
//   쓰도록 export(라벨 드리프트 방지). 내부 template_key 는 노출하지 않는다.
export const templateLabel = (key: string | null | undefined) => templateMeta(key).label;

// WO-O4O-KPA-TABLET-SCREEN-SET-DIRTY-GUARD-V1: 미저장 변경 경고 문구 + 블록 비교 정규화
const DISCARD_MSG = '저장되지 않은 변경이 있습니다.\n저장하지 않고 이동하면 변경사항이 사라질 수 있습니다.\n계속하시겠습니까?';
// normalizeBlocks / defaultConfig: @o4o/screen-content-core 에서 소비(로컬 정의 제거).

// WO-O4O-KPA-TABLET-IDLE-VIDEO-URL-ONLY-V1: 대기 화면 소스 선택 UI 제거 → IDLE_SOURCES 불필요.
//   (콘텐츠마다 YouTube/Vimeo URL 1개만 사용. 저장은 custom_media.items[] 계약 그대로.)

export default function TabletScreenSetManager({ onToast, tablets, previewApi, storeSlug, onPreviewContext }: Props) {
  const [sets, setSets] = useState<ScreenSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // WO-O4O-KPA-TABLET-CONTENT-STEP-BUILDER-SHELL-V1: 인라인 생성/편집 UI → 단계형 제작 셸.
  //   builder=null → 리스트. builder.detail=null → 신규 제작. builder.detail=존재 → 기존 수정(hydrate).
  const [builder, setBuilder] = useState<{ detail: ScreenSetDetail | null } | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      // WO-O4O-KPA-TABLET-CONTENT-STANDARD-LIST-V1: 상태 필터(보관 포함)를 위해 archived 도 조회.
      // 매장 전체 화면 세트 = 콘텐츠 원본 목록. (코너 적용 가능 여부로 거르지 않는다 —
      //  WO-...-CORNER-CONTENT-ASSIGNMENT-MODEL-V1 에서 tablet_id 전용 제약이 제거되어 모든 코너에 재사용 가능.)
      setSets(await fetchScreenSets({ includeArchived: true }));
    } catch (e: any) {
      onToast({ type: 'error', message: e?.message || '화면 세트를 불러오지 못했습니다.' });
      setSets([]);
    } finally {
      setLoading(false);
    }
  }, [onToast]);

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

  // 적용(교체)/적용 해제는 코너별 운영 탭(TabletCornerContentsPanel)이 연결 모델 기준으로 담당한다.

  // WO-O4O-KPA-TABLET-CONTENT-LIST-REMOVE-LABEL-V1: 사용자 문구 '보관' → '리스트에서 제거'(내부는 archived/soft-delete 그대로).
  const handleArchive = async (set: ScreenSet) => {
    if (busy) return;
    if (!window.confirm(`“${set.name}” 을(를) 리스트에서 제거하시겠습니까?\n콘텐츠는 삭제되지 않으며, ‘리스트에서 제거됨’ 필터에서 다시 확인할 수 있습니다.`)) return;
    setBusy(true);
    try {
      await archiveScreenSet(set.id);
      onToast({ type: 'success', message: '리스트에서 제거했습니다.' });
      await reload();
    } catch (e: any) {
      const msg = (e?.code === 'SCREEN_SET_IN_USE' || e?.code === 'ARCHIVE_BLOCKED_CONNECTED')
        ? '이 콘텐츠는 현재 코너에 연결되어 있어 제거할 수 없습니다. 먼저 코너 연결을 해제해 주세요.'
        : (e?.message || '리스트에서 제거하지 못했습니다.');
      onToast({ type: 'error', message: msg });
    } finally { setBusy(false); }
  };

  // WO-O4O-KPA-TABLET-CONTENT-STEP-BUILDER-SHELL-V1: 제작/수정은 단계형 제작 셸이 화면을 전환(takeover).
  // WO-O4O-KPA-TABLET-TEMPLATE-PREVIEW-LAYOUT-FIX-V1: 셸은 카드 래퍼 '밖'에서 렌더한다.
  //   ① 카드의 overflow-hidden 이 조상 스크롤포트가 되어 오른쪽 sticky 미리보기를 무력화한다(실측: 스크롤 시 패널이 밀려남).
  //   ② 카드 헤더('태블릿 콘텐츠')가 셸 헤더('태블릿 화면 만들기')와 중복된다.
  if (builder) {
    return (
      <TabletContentStepBuilder
        initialDetail={builder.detail}
        onCancel={() => setBuilder(null)}
        onSaved={() => { setBuilder(null); reload(); }}
        onToast={onToast}
        previewApi={previewApi}
        storeSlug={storeSlug ?? null}
      />
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-indigo-100">
      <div className="px-4 py-3 border-b bg-indigo-50/60 flex items-center justify-between">
        <h3 className="text-sm font-bold text-indigo-800 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" /> 태블릿 콘텐츠 (화면 세트)
        </h3>
        {/* WO-O4O-KPA-TABLET-CONTENT-STANDARD-LIST-V1: 생성 진입('태블릿 화면 만들기')은 표준 리스트 도구막대로 이전. */}
      </div>

      <div className="p-4 space-y-4">
        {/* WO-O4O-KPA-TABLET-SCREEN-SET-OPERATION-USABILITY-PASS-V1: 저장/템플릿/블록 개념 안내 */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-600 leading-relaxed space-y-1">
          <p><b className="text-slate-700">화면 세트</b>는 태블릿 코너에 표시할 화면 구성 묶음(콘텐츠 원본)입니다. 여기서 만들고 수정하며, 실제 코너 연결·교체는 <b className="text-slate-700">코너별 운영</b> 탭에서 합니다.</p>
          <p><b className="text-slate-700">템플릿</b>은 같은 내용을 어떤 <b>배치</b>로 보여줄지 정하고, <b className="text-slate-700">블록</b>은 화면에 들어가는 <b>내용</b>(코너 설명·제품 목록·QR 안내·대기화면)입니다.</p>
          <p><b className="text-slate-700">저장</b>은 세트 내용만 저장합니다(코너에 자동 적용되지 않음). <b className="text-slate-700">보관</b>은 목록에서 숨깁니다(코너에서 사용/연결 중이면 먼저 해제해야 합니다).</p>
        </div>

        {/* WO-O4O-KPA-TABLET-CONTENT-STANDARD-LIST-V1: O4O 표준 테이블
            (검색 + 상태 필터 + 페이지네이션 + 체크 일괄 보관 + kebab 개별 작업(수정/보관)).
            생성/수정 진입은 단계형 제작 셸(builder)로 전환. */}
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
          previewApi={previewApi}
          storeSlug={storeSlug ?? null}
          onPreviewContext={onPreviewContext}
        />
      </div>
    </div>
  );
}

// ── 템플릿 축소 미리보기(와이어프레임) — WO-O4O-KPA-TABLET-TEMPLATE-PREVIEW-LAYOUT-FIX-V1 ──
//   카드 5장에 kiosk 인스턴스를 띄우면 preview POST 5회 + 렌더 비용이 커지므로, 카드는 '배치 스케치'만 보여준다.
//   실제 결과 화면은 오른쪽 고정 미리보기(TabletKioskPage embedded)가 담당한다.
//   (WO-O4O-KPA-TABLET-TEMPLATE-SELECTION-EDITOR-V1 의 드롭다운 TemplateSelectField 를 대체)
function TemplateThumb({ templateKey }: { templateKey: string }) {
  const frame = 'w-full aspect-[16/10] rounded-md border border-slate-200 bg-white p-1.5 overflow-hidden';
  const block = 'rounded-[2px] bg-slate-200';
  const line = 'rounded-full bg-slate-200';
  const qr = 'rounded-[2px] bg-slate-700';

  switch (templateKey) {
    // 대기 영상형: 전면 영상 + 중앙 터치 안내 + 우하단 QR
    case 'idle_touch_video':
      return (
        <div className={frame} aria-hidden>
          <div className="w-full h-full rounded-[3px] bg-slate-600 relative flex items-center justify-center">
            <div className="h-1 w-1/3 rounded-full bg-white/70" />
            <div className="absolute bottom-1 right-1 w-3 h-3 rounded-[2px] bg-white" />
          </div>
        </div>
      );
    // 상품 집중형: 큰 제품 + 우측 설명/QR
    case 'product_focus':
      return (
        <div className={`${frame} flex gap-1`} aria-hidden>
          <div className={`${block} flex-[2]`} />
          <div className="flex-1 flex flex-col gap-1">
            <div className={`${line} h-1 w-full`} />
            <div className={`${line} h-1 w-4/5`} />
            <div className={`${line} h-1 w-3/5`} />
            <div className={`${qr} mt-auto w-3 h-3`} />
          </div>
        </div>
      );
    // 코너 소개형: 제목 + 설명 텍스트 중심 + QR
    case 'corner_overview_qr':
      return (
        <div className={`${frame} flex flex-col gap-1`} aria-hidden>
          <div className={`${line} h-1.5 w-1/2`} />
          <div className="flex gap-1 flex-1 min-h-0">
            <div className="flex-1 flex flex-col gap-1">
              <div className={`${line} h-1 w-full`} />
              <div className={`${line} h-1 w-5/6`} />
              <div className={`${block} flex-1 mt-0.5`} />
            </div>
            <div className={`${qr} w-4 h-4 self-start`} />
          </div>
        </div>
      );
    // 제품 진열형: 제품 그리드 + QR
    case 'product_grid_qr':
      return (
        <div className={`${frame} flex gap-1`} aria-hidden>
          <div className="flex-1 grid grid-cols-3 grid-rows-2 gap-1">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className={block} />)}
          </div>
          <div className={`${qr} w-3 h-3 self-end`} />
        </div>
      );
    // 기본 코너 안내형: 제목 + 목록 + QR
    case 'corner_information_basic_v1':
    default:
      return (
        <div className={`${frame} flex flex-col gap-1`} aria-hidden>
          <div className={`${line} h-1.5 w-2/5`} />
          <div className="flex gap-1 flex-1 min-h-0">
            <div className="flex-1 flex flex-col gap-1">
              <div className={`${block} flex-1`} />
              <div className={`${block} flex-1`} />
            </div>
            <div className={`${qr} w-4 h-4 self-end`} />
          </div>
        </div>
      );
  }
}

// WO-...-BUSINESS-FIELDS-V1: block_type 별 config 폼(BlockConfigForm) 제거 — 업무 단계 렌더러가 대체.

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
  // WO-O4O-KPA-TABLET-BUILDER-BUSINESS-FIELDS-V1: 피커 출처 명칭과 목록 라벨을 일치시킨다.
  //   저장 계약은 sourceType 2종뿐이라, store_content 가 'O4O 제공'인지 '매장 제작'인지는 저장값만으로 구분되지 않는다
  //   (구분은 kpa_store_contents.source_type — 목록은 그 값을 갖지 않는다). → 출처 중립 라벨을 쓴다.
  const sourceLabel = (t: string) => (t === 'o4o_product_description' ? '상품 매장용 상세설명서' : '가져온 콘텐츠');
  // WO-O4O-SCREEN-CONTENT-CORE-PURE-CONTRACT-EXTRACTION-V1: content_list 순수 연산은 Core 소비(UI 부수효과만 로컬).
  const upd = (i: number, patch: Partial<ContentListItem>) => onChange(updateContentItem(items, i, patch));
  const move = (i: number, dir: 'up' | 'down') => onChange(moveContentItem(items, i, dir));
  const remove = (i: number) => {
    if (!window.confirm('이 추가 정보를 현재 태블릿 콘텐츠에서 삭제하시겠습니까?\n원본 콘텐츠는 삭제되지 않습니다.')) return;
    // 현재 Screen Set 의 content_list 에서만 제거(원본 설명서·콘텐츠·Resource 불변).
    onChange(removeContentItem(items, i));
  };
  const add = (added: ContentListItem[], titles: Record<string, string>) => {
    setTitleHints((h) => ({ ...h, ...titles }));
    onChange(addContentItems(items, added));
    setPicking(false);
  };
  const cardTitle = (it: ContentListItem) => it.displayTitle || titleHints[contentItemKey(it)] || sourceLabel(it.sourceType);
  const btn = 'min-h-[44px] px-3 py-2 text-sm font-medium rounded-xl inline-flex items-center justify-center gap-1';

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-800">추가 정보 <span className="text-xs font-normal text-slate-400">{items.length}개</span></div>
          <p className="text-[11px] text-slate-500 leading-relaxed">고객에게 보여줄 제품 설명·매장 안내 콘텐츠입니다. 여기서 바꾼 제목·설명은 현재 화면 세트에만 적용되며, 원본 콘텐츠는 변경되지 않습니다.</p>
        </div>
        <button onClick={() => setPicking(true)} className={`${btn} text-white bg-indigo-600 hover:bg-indigo-700 flex-shrink-0`}>
          <Plus className="w-4 h-4" /> 추가 정보
        </button>
      </div>

      {items.length === 0 ? (
        /* WO-O4O-KPA-TABLET-EXTRA-INFO-BUTTON-DEDUP-V1: 빈 상태 안내만 표시(중복 버튼 제거 — 추가는 상단 '추가 정보' 하나로). */
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 text-center py-6 px-4">
          <p className="text-sm text-slate-500 leading-relaxed">아직 추가한 정보가 없습니다.<br />손님에게 함께 보여줄 상세설명서·안내 콘텐츠를 추가해 주세요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it, i) => {
            const k = contentItemKey(it);
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
                  {/* WO-...-EDIT-REMOVE-REORDER-USABILITY-V1: '내용 설정'→'수정'(제목·설명 표시값 편집, 원본 불변), 삭제는 최상위로 노출. */}
                  <button onClick={() => setExpanded(open ? null : k)} className={`${btn} border ${open ? 'text-indigo-800 bg-indigo-50 border-indigo-400' : 'text-indigo-700 bg-white border-indigo-200 hover:bg-indigo-50'}`}>수정</button>
                  <button onClick={() => remove(i)} className={`${btn} text-red-600 bg-white border border-red-200 hover:bg-red-50`}><X className="w-4 h-4" /> 삭제</button>
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
                    <p className="text-[11px] text-slate-400">여기서 바꾼 제목·짧은 설명은 이 화면 세트에만 적용되며, 원본 콘텐츠는 변경되지 않습니다.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {picking && (
        <ContentPickerModal
          existingKeys={new Set(items.map(contentItemKey))}
          onClose={() => setPicking(false)}
          onAdd={add}
          baseSort={items.length * 10}
        />
      )}
    </div>
  );
}
// key2: @o4o/screen-content-core 의 contentItemKey 로 대체(로컬 정의 제거).

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
  // WO-O4O-KPA-TABLET-BUILDER-BUSINESS-FIELDS-V1: 출처 3분류.
  //   spd   = 상품 매장용 상세설명서 (o4o_product_description)
  //   o4o   = O4O 제공 콘텐츠  (store_content 중 source_type='snapshot_edit' — 운영자/HUB 원본을 매장이 가져온 것)
  //   store = 매장 제작 콘텐츠 (store_content 중 source_type='direct')
  //   저장 계약(ContentListItem.sourceType)은 2종 그대로 — 분류는 표시/필터 기준이며 API·DB 변경 없음.
  const [tab, setTab] = useState<'spd' | 'o4o' | 'store'>('spd');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [o4o, setO4o] = useState<O4oDescriptionSearchResult[]>([]);
  const [store, setStore] = useState<StoreContentSearchResult[]>([]);
  const [selO4o, setSelO4o] = useState<Record<string, boolean>>({});
  const [selStore, setSelStore] = useState<Record<string, boolean>>({});

  const run = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'spd') setO4o(await searchTabletO4oDescriptions(q));
      else setStore(await searchTabletStoreContents(q));
    } catch { /* 검색 실패는 빈 목록으로 */ if (tab === 'spd') setO4o([]); else setStore([]); }
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
      titles[key] = r.title || '코너 콘텐츠';
    });
    onAdd(out, titles);
  };
  const selectedCount = Object.values(selO4o).filter(Boolean).length + Object.values(selStore).filter(Boolean).length;
  // 3-컬럼 등폭 탭: 한글 단어가 중간에서 깨지지 않도록 break-keep, 좁은 폭 대응 leading-tight + px 축소.
  const tabBtn = (active: boolean) => `flex-1 min-h-[44px] px-2 py-2 text-sm font-medium rounded-xl leading-tight break-keep ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`;

  return (
    <div className="fixed inset-0 z-[950] bg-slate-900/50 flex items-stretch sm:items-center justify-center p-0 sm:p-4" onClick={onClose} role="presentation">
      <div className="bg-white w-full h-full sm:h-auto sm:max-w-lg sm:max-h-[86vh] rounded-none sm:rounded-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
          <h4 className="text-base font-bold text-slate-700">추가 정보 고르기</h4>
          <button onClick={onClose} className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-slate-600" aria-label="닫기"><X className="w-5 h-5" /></button>
        </div>
        {/* 출처 기준 3분류(성격 기준 아님) — WO-...-BUSINESS-FIELDS-V1 */}
        <div className="px-4 pt-3 grid grid-cols-3 gap-1.5 flex-shrink-0">
          <button onClick={() => setTab('spd')} className={tabBtn(tab === 'spd')}>매장용 상세설명서</button>
          <button onClick={() => setTab('o4o')} className={tabBtn(tab === 'o4o')}>O4O 제공<br className="sm:hidden" /> 콘텐츠</button>
          <button onClick={() => setTab('store')} className={tabBtn(tab === 'store')}>매장 제작<br className="sm:hidden" /> 콘텐츠</button>
        </div>
        <div className="px-4 py-2 flex gap-2 flex-shrink-0">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()}
            placeholder={tab === 'spd' ? '상품명 · 바코드로 검색 (2자 이상)' : '콘텐츠 제목으로 검색 (비우면 최근순)'}
            className="flex-1 min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 text-sm" autoFocus />
          <button onClick={run} className="min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700">검색</button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-6"><Loader2 className="w-4 h-4 animate-spin" /> 검색 중…</div>
          ) : tab === 'spd' ? (
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
                      {/* WO-O4O-TABLET-ADDITIONAL-CONTENT-SKU-DISTINGUISHABILITY-V1: 동일 상품명 구분정보(규격·제형·포장). 있을 때만. */}
                      {(() => {
                        const variant = buildProductVariantLabel(r);
                        return variant ? <div className="text-[11px] text-slate-600 break-keep leading-tight" title={r.specification ?? undefined}>{variant}</div> : null;
                      })()}
                      <div className="text-[11px] text-slate-400 truncate">O4O 표준 설명서{r.barcode ? ` · ${r.barcode}` : ''}{r.summary ? ` · ${r.summary.slice(0, 30)}` : ''}</div>
                    </div>
                    {added && <span className="text-[10px] font-semibold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded flex-shrink-0">이미 추가됨</span>}
                  </div>
                </button>
              );
            })
          ) : (() => {
            // store_content 를 출처(source_type)로 나눠 표시: snapshot_edit = O4O 제공 / direct = 매장 제작.
            const wanted = tab === 'o4o' ? 'snapshot_edit' : 'direct';
            const rows = store.filter((r) => (r.sourceType || 'snapshot_edit') === wanted);
            const emptyMsg = tab === 'o4o' ? 'O4O에서 제공한 콘텐츠가 없습니다.' : '매장에서 직접 만든 콘텐츠가 없습니다.';
            return rows.length === 0 ? <div className="text-sm text-slate-400 py-6 text-center">{emptyMsg}</div> :
            rows.map((r) => {
              const added = existingKeys.has(`store:${r.contentId}`);
              const sel = !!selStore[r.contentId];
              return (
                <button key={r.contentId} disabled={added} onClick={() => setSelStore((s) => ({ ...s, [r.contentId]: !s[r.contentId] }))}
                  className={`w-full text-left rounded-xl border p-3 transition ${added ? 'border-slate-100 bg-slate-50 opacity-70 cursor-default' : sel ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-200'}`}>
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${sel ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>{sel ? '✓' : ''}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-800 truncate">{r.title || '(제목 없음)'}</div>
                      <div className="text-[11px] text-slate-400 truncate">{tab === 'o4o' ? 'O4O 제공 콘텐츠' : '매장 제작 콘텐츠'} · {r.hasProductLink ? '상품 연결' : '일반 콘텐츠'}{r.summary ? ` · ${r.summary.slice(0, 30)}` : ''}</div>
                    </div>
                    {added && <span className="text-[10px] font-semibold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded flex-shrink-0">이미 추가됨</span>}
                  </div>
                </button>
              );
            });
          })()}
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

// WO-...-IDLE-VIDEO-URL-ONLY-V1: 다중 미디어 입력(CustomMediaItems) 제거 — URL 1개 입력으로 대체.

// ── 단계형 제작 셸 (WO-O4O-KPA-TABLET-CONTENT-STEP-BUILDER-SHELL-V1) ──
//   신규/수정 공통. 인라인 폼/패널을 단계 화면으로 분리. 기존 하위 편집기·저장 API·dirty guard 재사용.
//   저장 = createScreenSet|updateScreenSet + saveScreenSetBlocks(전체 교체). 저장 성공 후 리스트 복귀.
//   코너 적용/해제는 노출하지 않음(코너별 운영 탭 전용). draft 실미리보기는 후속 WO(placeholder).
// WO-O4O-KPA-TABLET-BUILDER-BUSINESS-FIELDS-V1: 단계 = 업무 3항목 고정(BUILDER_STEPS). 블록은 자동 준비.
// WO-O4O-KPA-TABLET-CORNER-EDITOR-AND-DRAFT-PREVIEW-RUNTIME-FIX-V1 §4.2:
//   RichTextEditor.onChange 는 { html, json } 객체를 준다. corner_description.config.body 는 항상 HTML 문자열이어야
//   한다(공개 렌더 str()·태블릿 ContentRenderer 계약). 과거 잘못된 연결로 body 에 { html, json } 객체가 들어왔을
//   가능성을 읽기 경계에서 방어. 정규화는 여기(hydrate) 한 곳 + onChange(쓰기) 한 곳으로 끝낸다.
// normalizeCornerBody: @o4o/screen-content-core 에서 소비(로컬 정의 제거, 외부 소비처 없음).

// WO-O4O-KPA-TABLET-CORNER-EDITOR-AND-DRAFT-PREVIEW-RUNTIME-FIX-V1 §4.6:
//   실제 공개 QR(PublicScreenSetViewer)은 대기 영상(idle_media)을 제외한다. draft 미리보기 endpoint 는
//   idle_media 를 포함하므로, QR 모바일 미리보기만 idle_media 섹션을 걷어내 공개 QR 과 핵심 구성을 맞춘다.
//   (태블릿 미리보기는 그대로 — 대기 영상은 태블릿 개념.) kiosk-core·resolver·공개 viewer 무변경.
function stripIdleForMobilePreview(screen: TabletScreenResponse | null): TabletScreenResponse | null {
  const secs = (screen as unknown as { sections?: Array<{ blockType?: string }> })?.sections;
  if (!screen || !Array.isArray(secs)) return screen;
  return { ...screen, sections: secs.filter((s) => s?.blockType !== 'idle_media') } as TabletScreenResponse;
}

// seedInitialBlocks / ensureAutoBlocks: @o4o/screen-content-core 에서 소비(로컬 정의 제거).

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
  // WO-O4O-KPA-TABLET-BUILDER-REMOVE-STATUS-SELECT-V1: 관리 이름(name)은 코너 제목에서 자동 파생.
  //   nameEdited=true 면 사용자가 저장 단계에서 직접 수정한 것 → 더 이상 코너 제목을 따라가지 않는다.
  //   신규=자동 파생(false), 수정=기존 관리 이름 보존(true).
  const [nameEdited, setNameEdited] = useState(!!initialDetail);
  // WO-O4O-KPA-TABLET-BUILDER-REMOVE-STATUS-SELECT-V1: status 는 사용자 선택 항목이 아니다(저장 시 서버로 파생 처리).
  const [templateKey, setTemplateKey] = useState(initialDetail?.templateKey ?? DEFAULT_TEMPLATE_KEY);
  // WO-...-BUSINESS-FIELDS-V1: 진입 즉시 업무 항목이 쓰는 내부 블록을 자동 확보(추가만).
  const [blocks, setBlocks] = useState<ScreenBlock[]>(() => ensureAutoBlocks(seedInitialBlocks(initialDetail)));
  const [saving, setSaving] = useState(false);
  // 템플릿을 바꾸면 그 템플릿이 쓰는 블록을 자동 준비한다(사용자는 블록을 의식하지 않는다).
  const selectTemplate = (key: string) => {
    setTemplateKey(key);
    setBlocks((prev) => ensureAutoBlocks(prev));
  };

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

  // ── WO-O4O-KPA-TABLET-TEMPLATE-PREVIEW-LAYOUT-FIX-V1: 오른쪽 고정 미리보기 ──
  //   모든 단계에서 항상 표시(마지막 단계 모달 전용 아님). 템플릿/블록이 바뀌면 즉시 반영.
  //   기존 draft preview 경로(previewScreenSet) + TabletKioskPage embedded 재사용 — kiosk-core 무변경.
  const [liveView, setLiveView] = useState<'tablet' | 'mobile'>('tablet');
  const [liveScreen, setLiveScreen] = useState<TabletScreenResponse | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  // 입력마다 POST 하지 않도록 디바운스. templateKey + 블록 내용(정규화)이 바뀔 때만 재조회.
  const liveKey = `${templateKey}|${normalizeBlocks(blocks)}`;
  useEffect(() => {
    if (!canPreview) return;
    let cancelled = false;
    setLiveLoading(true);
    const timer = setTimeout(() => {
      previewScreenSet({ templateKey, blocks })
        .then((s) => { if (!cancelled) { setLiveScreen(s); setLiveError(null); } })
        .catch((e: any) => {
          // WO-...-CORNER-EDITOR-AND-DRAFT-PREVIEW-RUNTIME-FIX-V1 §4.5:
          //   내부 API 오류 메시지를 그대로 노출하지 않는다(진단용 콘솔만). 사용자에겐 표준 문구.
          if (!cancelled) { console.warn('[TabletPreview] previewScreenSet failed:', e?.message ?? e); setLiveError('입력 내용을 미리보기에 반영하지 못했습니다.'); }
        })
        .finally(() => { if (!cancelled) setLiveLoading(false); });
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
    // liveKey 가 templateKey/blocks 를 인코딩한다(내용 기준 재조회).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveKey, canPreview]);
  // §4.6: QR 모바일 미리보기는 대기 영상을 제외(공개 QR 정합). identity 안정화 위해 memo.
  const liveScreenMobile = useMemo(() => stripIdleForMobilePreview(liveScreen), [liveScreen]);

  // ── dirty guard (baseline = 초기값) ──
  const baseline = useRef({
    name: initialDetail?.name ?? '',
    templateKey: initialDetail?.templateKey ?? DEFAULT_TEMPLATE_KEY,
    // WO-...-BUSINESS-FIELDS-V1: 자동 준비된 블록은 '사용자 변경'이 아니다.
    //   baseline 을 초기 state 와 동일하게(ensureAutoBlocks 적용) 잡아야 열자마자 '변경됨'/이탈 경고가 뜨지 않는다.
    //   자동 추가분은 다음 저장 때 함께 영속된다.
    blocks: normalizeBlocks(ensureAutoBlocks(seedInitialBlocks(initialDetail))),
  });
  const isDirty =
    name.trim() !== baseline.current.name ||
    templateKey !== baseline.current.templateKey ||
    normalizeBlocks(blocks) !== baseline.current.blocks;
  useEffect(() => {
    if (!isDirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [isDirty]);
  const guardedCancel = () => { if (!isDirty || window.confirm(DISCARD_MSG)) onCancel(); };

  // ── 업무 항목 ↔ 내부 블록 접근자 (WO-...-BUSINESS-FIELDS-V1) ──
  //   사용자는 블록을 추가/삭제/정렬하지 않는다. 각 업무 단계가 자기 블록의 config 만 수정한다.
  const blockIndex = (t: ScreenBlockType) => blocks.findIndex((b) => b.blockType === t);
  const patchConfigOf = (t: ScreenBlockType, patch: Record<string, unknown>) =>
    setBlocks((prev) => prev.map((b) => (b.blockType === t ? { ...b, config: { ...b.config, ...patch } } : b)));
  const replaceConfigOf = (t: ScreenBlockType, cfg: Record<string, unknown>) =>
    setBlocks((prev) => prev.map((b) => (b.blockType === t ? { ...b, config: cfg } : b)));
  const configOf = (t: ScreenBlockType): any => (blocks[blockIndex(t)]?.config ?? {});

  const nameValid = isValidScreenSetName(name);

  // ── 코너 설명 작성 보조 (WO-...-BUSINESS-FIELDS-V1) ──
  //   공개 뷰어가 본문을 평문 렌더 → HTML 생성 프롬프트(ContentCreationGuideModal 의 store/operator 모드)는 부적합.
  //   태블릿 코너 설명 전용 평문 요청문 + 사용 방법 모달을 둔다.
  const [promptCopied, setPromptCopied] = useState(false);
  const [showAiGuide, setShowAiGuide] = useState(false);
  const copyCornerPrompt = async () => {
    try {
      await navigator.clipboard.writeText(CORNER_DESC_PROMPT);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch {
      onToast({ type: 'error', message: '복사하지 못했습니다. 요청문을 직접 선택해 복사해 주세요.' });
    }
  };

  // 저장 단계 요약 — 업무 항목 기준(블록 수 미노출).
  const idleCfg = configOf('idle_media');
  const idleUrl: string = idleCfg.source === 'custom_media' && Array.isArray(idleCfg.items) ? (idleCfg.items[0]?.url ?? '') : '';
  const idleSummary = idleUrl ? `동영상 1개 (${detectIdleMediaType(idleUrl) === 'vimeo' ? 'Vimeo' : 'YouTube'})` : '지정 안 함 (기본 화면)';
  const cornerDescCfg = configOf('corner_description');
  const cornerSummary = (cornerDescCfg.title || cornerDescCfg.body) ? (cornerDescCfg.title || '(제목 없음)') : '작성 안 함';
  const extraCount = (Array.isArray(configOf('content_list').items) ? configOf('content_list').items : []).length;

  // ── 업무 3항목 고정 단계 (WO-O4O-KPA-TABLET-BUILDER-BUSINESS-FIELDS-V1) ──
  //   템플릿(step 0) + 기본 정보 · 대기 화면 · 코너 설명 · 추가 정보 · 미리보기·저장.
  //   템플릿을 바꿔도 단계 구성은 그대로다(배치만 달라짐) → step 클램프 불필요.
  const tSteps = BUILDER_STEPS;
  const totalSteps = 1 + tSteps.length;

  const handleSave = async () => {
    if (!nameValid) { onToast({ type: 'error', message: '코너 제목 또는 콘텐츠 관리 이름을 입력해 주세요.' }); setStep(totalSteps - 1); return; }
    setSaving(true);
    try {
      let id = initialDetail?.id;
      if (isEdit && id) {
        // WO-O4O-KPA-TABLET-BUILDER-REMOVE-STATUS-SELECT-V1: 상태는 사용자가 선택하지 않는다.
        //   '저장 = 사용할 수 있는 화면 세트'. 코너 적용 게이트(POST current-screen-set)가 active 를 요구하므로
        //   draft 는 active 로 승격(선택 UI 제거 후 draft 를 적용 가능하게 만들 다른 경로가 없음).
        //   active/archived/operator_template 등은 그대로 유지(보관·특수 상태는 별도 흐름에서 관리).
        const nextStatus: ScreenSetStatus = initialDetail!.status === 'draft' ? 'active' : initialDetail!.status;
        await updateScreenSet(id, { name: name.trim(), status: nextStatus, templateKey });
      } else {
        // library 재사용 세트(tabletId=null). 신규 저장은 기본 active(코너별 운영에서 바로 적용 가능). draft 는 UI 에서 만들지 않는다.
        const created = await createScreenSet({ name: name.trim(), tabletId: null, status: 'active', templateKey });
        id = created.id;
      }
      await saveScreenSetBlocks(id!, blocks);
      onToast({ type: 'success', message: isEdit ? '태블릿 콘텐츠가 저장되었습니다.' : `태블릿 콘텐츠 "${name.trim()}" 생성됨` });
      onSaved();
    } catch (e: any) {
      onToast({ type: 'error', message: e?.message || '저장에 실패했습니다.' });
    } finally { setSaving(false); }
  };

  // ── 업무 단계 렌더러 (WO-O4O-KPA-TABLET-BUILDER-BUSINESS-FIELDS-V1) ──
  //   블록 유형 선택/블록 추가/블록 행(순서·표시·삭제) UI 없음. 각 단계는 자기 업무 필드만 다룬다.

  // 1) 대기 화면 — WO-O4O-KPA-TABLET-IDLE-VIDEO-URL-ONLY-V1:
  //    콘텐츠마다 YouTube/Vimeo URL **하나만** 받는다. 소스 선택·미디어 유형 선택·다중 항목 UI 없음.
  //    저장은 기존 계약 그대로: { source:'custom_media', items:[{ mediaType, url }] }.
  //    URL 을 비우면 custom_media 는 items ≥ 1 을 요구해 저장이 400 → 유효한 'legacy_idle_playlist'
  //    (= 영상 지정 없음)으로 되돌린다. 이때 대기 화면은 기본 대체 화면이 된다.
  const renderIdleStep = () => {
    const c = configOf('idle_media');
    const url: string = c.source === 'custom_media' && Array.isArray(c.items) ? (c.items[0]?.url ?? '') : '';
    const trimmed = url.trim();
    const detected = trimmed ? detectIdleMediaType(trimmed) : null;
    const invalid = !!trimmed && detected !== 'youtube' && detected !== 'vimeo';
    const setUrl = (next: string) => {
      const v = next.trim();
      if (!v) { replaceConfigOf('idle_media', { source: 'legacy_idle_playlist' }); return; }
      const t = detectIdleMediaType(v);
      // 판별 실패(youtube/vimeo 아님)여도 입력값은 유지 — 저장 전 안내로 교정하게 한다.
      replaceConfigOf('idle_media', { source: 'custom_media', items: [{ mediaType: t, url: v }] });
    };
    return (
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-600">대기 동영상 URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="YouTube 또는 Vimeo 주소를 붙여 넣으세요"
            className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
              invalid ? 'border-amber-400 focus:ring-amber-400' : 'border-slate-200 focus:ring-indigo-400'
            }`}
          />
          {invalid ? (
            <p className="text-[11px] text-amber-600 mt-1">
              YouTube 또는 Vimeo 주소만 사용할 수 있습니다. 주소를 다시 확인해 주세요.
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 mt-1">
              소리 없이 자동 재생되고, 끝나면 다시 처음부터 반복됩니다. 손님이 화면을 터치하면 안내 화면으로 넘어갑니다.
              비워 두면 대기 화면에 기본 안내가 표시됩니다.
            </p>
          )}
        </div>
      </div>
    );
  };

  // 2) 코너 설명 — 제목 + 짧은 소개(평문).
  //   공개 뷰어가 본문을 평문으로 렌더(<p>{body}</p>)하므로 HTML 편집기/HTML 입력창을 두지 않는다.
  const renderCornerStep = () => {
    const c = configOf('corner_description');
    return (
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-600">코너 제목</label>
          <input
            value={c.title ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              patchConfigOf('corner_description', { title: v });
              // WO-O4O-KPA-TABLET-BUILDER-REMOVE-STATUS-SELECT-V1: 관리 이름 미수정 시 코너 제목을 그대로 따라감.
              if (!nameEdited) setName(v);
            }}
            placeholder="예: 구강관리 코너"
            className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <p className="text-[11px] text-slate-400 mt-1">고객 태블릿·QR 화면에 표시되는 제목입니다.</p>
        </div>
        <div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="text-xs font-semibold text-slate-600">짧은 소개</label>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={copyCornerPrompt}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50"
              >
                {promptCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {promptCopied ? '복사됨' : '예제 요청문 복사'}
              </button>
              <button
                type="button"
                onClick={() => setShowAiGuide(true)}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                <Sparkles className="w-3 h-3 text-indigo-500" /> ChatGPT 사용 방법
              </button>
            </div>
          </div>
          {/* WO-O4O-KPA-TABLET-STANDARD-EDITOR-UNIFY-V1: 평문 textarea → O4O 표준 편집기.
              저장 HTML 은 태블릿/QR 모바일 모두 ContentRenderer 로 렌더된다(동일 계약).
              별도 HTML 입력창은 만들지 않는다 — 표준 편집기의 기존 HTML 탭/붙여넣기를 쓴다. */}
          <div className="mt-1">
            {/* WO-O4O-KPA-TABLET-CORNER-EDITOR-AND-DRAFT-PREVIEW-RUNTIME-FIX-V1 §4.1:
                onChange 반환은 { html, json } 객체 → html 만 추출해 body(문자열) 저장.
                value 도 방어적으로 정규화(과거 객체형 body 를 문자열로 표시). */}
            <RichTextEditor
              value={normalizeCornerBody(c.body)}
              onChange={({ html }) => patchConfigOf('corner_description', { body: html })}
              placeholder="이 코너가 어떤 곳인지, 손님이 무엇을 확인할 수 있는지 3~5줄로 적어 주세요."
              minHeight="220px"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            굵게·문단·목록·링크 같은 서식을 쓸 수 있습니다. ChatGPT로 만든 HTML은 편집기의 HTML 탭에 붙여 넣으세요.
            오른쪽 미리보기에서 실제 태블릿에 보이는 모습을 확인할 수 있습니다.
          </p>
        </div>
      </div>
    );
  };

  // 3) 추가 정보 — content_list 용어 미노출. 출처 3종 피커 + 단일 목록(순서·표시·제거·화면용 제목/요약).
  const renderExtraStep = () => (
    <ContentListEditor
      items={Array.isArray(configOf('content_list').items) ? (configOf('content_list').items as ContentListItem[]) : []}
      onChange={(items) => replaceConfigOf('content_list', { items })}
    />
  );

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

      {/* ── WO-O4O-KPA-TABLET-TEMPLATE-PREVIEW-LAYOUT-FIX-V1: 2단 — 왼쪽 단계 입력(≈58%) / 오른쪽 실제 결과 화면(≈42%).
             PC 웹 기준. lg 미만에서는 미리보기가 아래로 내려간다. ── */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-4 lg:items-start">
      <div className="space-y-4 min-w-0">
      {/* ── 단계 본문 ── */}
      <div className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/20 min-h-[220px]">
        {/* WO-O4O-KPA-TABLET-TEMPLATE-PREVIEW-LAYOUT-FIX-V1: 드롭다운 → 카드 선택(5종). 클릭 즉시 선택 + 오른쪽 미리보기 반영. */}
        {step === 0 && (
          <div className="space-y-3">
            <div>
              <div className="text-sm font-bold text-slate-800">화면 템플릿 선택</div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                같은 내용을 어떤 <b>배치</b>로 보여줄지 정합니다(표시할 내용은 다음 단계의 블록에서 관리).
                카드를 누르면 오른쪽 미리보기에 바로 반영됩니다.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEMPLATE_OPTIONS.map((t) => {
                const selected = t.key === templateKey;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => selectTemplate(t.key)}
                    aria-pressed={selected}
                    className={`text-left rounded-xl border p-3 transition ${
                      selected
                        ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-300'
                        : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm'
                    }`}
                  >
                    <TemplateThumb templateKey={t.key} />
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-slate-800">{t.label}</span>
                      {selected && <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">선택됨</span>}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{t.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step >= 1 && (() => {
          const sm = tSteps[step - 1];
          if (!sm) return null;
          if (sm.kind === 'idle' || sm.kind === 'corner' || sm.kind === 'extra') {
            return (
              <div className="space-y-3">
                {sm.note && <p className="text-[11px] text-slate-500 leading-relaxed">{sm.note}</p>}
                {sm.kind === 'idle' ? renderIdleStep() : sm.kind === 'corner' ? renderCornerStep() : renderExtraStep()}
              </div>
            );
          }
          if (sm.kind === 'save') {
            return (
              <div className="space-y-3">
                {/* WO-O4O-KPA-TABLET-BUILDER-REMOVE-STATUS-SELECT-V1: 관리 이름은 마지막 단계에서 선택적으로만 수정.
                    기본값 = 코너 제목 자동 파생. 고객 화면에는 코너 제목이 표시되고, 이 이름은 목록 구분용. */}
                <div>
                  <label className="text-xs font-semibold text-slate-600">콘텐츠 관리 이름</label>
                  <input value={name}
                    onChange={(e) => { setName(e.target.value); setNameEdited(true); }}
                    placeholder="예: 구강관리 코너 - 겨울철 안내형"
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <p className="text-[11px] text-slate-400 mt-1">콘텐츠 목록에서 구분하기 위한 이름입니다. 고객 화면에는 코너 제목이 표시됩니다.</p>
                  {!nameValid && <p className="text-[11px] text-amber-600 mt-1">저장하려면 이름이 필요합니다. 코너 제목을 입력하면 자동으로 채워집니다.</p>}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  저장한 콘텐츠는 코너에 자동 적용되지 않습니다. 실제 태블릿 화면은 ‘코너별 운영’에서 선택합니다.
                </p>
                <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1.5">
                  <div className="text-sm font-bold text-slate-800">{name.trim() || '(이름 없음)'}</div>
                  {/* WO-...-BUSINESS-FIELDS-V1: 블록 수 대신 업무 항목 기준 요약(내부 용어 미노출). */}
                  <div className="text-[11px] text-slate-500">
                    템플릿 <b>{templateLabel(templateKey)}</b>
                  </div>
                  <ul className="text-[11px] text-slate-600 space-y-0.5 pt-0.5">
                    <li>대기 화면: <b>{idleSummary}</b></li>
                    <li>코너 설명: <b>{cornerSummary}</b></li>
                    <li>추가 정보: <b>{extraCount > 0 ? `${extraCount}개` : '없음'}</b></li>
                  </ul>
                </div>
                {/* WO-O4O-KPA-TABLET-CONTENT-DRAFT-PREVIEW-V1: 저장 전 미리보기(태블릿 / QR 모바일).
                    WO-...-TEMPLATE-PREVIEW-LAYOUT-FIX-V1: 상시 미리보기는 오른쪽 패널이 담당 → 여기는 전체화면 '크게 보기'. */}
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => openPreview('tablet')} disabled={!canPreview || previewLoading}
                    className="min-h-[44px] px-4 py-2 text-sm font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-xl hover:bg-indigo-50 disabled:opacity-50 inline-flex items-center gap-1.5"
                    title={canPreview ? undefined : '매장 공개 주소를 불러오는 중이거나 미리보기를 사용할 수 없습니다.'}>
                    {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />} 태블릿 크게 보기
                  </button>
                  <button onClick={() => openPreview('mobile')} disabled={!canPreview || previewLoading}
                    className="min-h-[44px] px-4 py-2 text-sm font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-xl hover:bg-indigo-50 disabled:opacity-50 inline-flex items-center gap-1.5"
                    title={canPreview ? undefined : '매장 공개 주소를 불러오는 중이거나 미리보기를 사용할 수 없습니다.'}>
                    {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />} QR 모바일 크게 보기
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  오른쪽 미리보기와 같은 내용을 전체 화면으로 크게 봅니다. 상품 목록·코너 콘텐츠는 매장 데이터로 조회되며, 저장 전에는 DB에 반영되지 않습니다.
                  {!canPreview && ' (매장 공개 주소를 불러오는 중이면 잠시 후 다시 시도해 주세요.)'}
                </p>
                <button onClick={handleSave} disabled={saving || !nameValid}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 태블릿 콘텐츠 저장
                </button>
              </div>
            );
          }
          return null;
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
      </div>{/* /왼쪽: 단계 입력 */}

      {/* ── 오른쪽: 실제 결과 화면(모든 단계에서 유지) ── */}
      {/* sticky 오프셋 = 전역 헤더(sticky top-0 · 실측 높이 65px) 아래로 내려 가리지 않게 한다. */}
      <aside className="mt-4 lg:mt-0 lg:sticky lg:top-[73px] min-w-0">
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-3 py-2 border-b bg-slate-50 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700">실제 화면 미리보기</span>
            <div className="flex gap-1">
              {([
                { key: 'tablet', label: '태블릿 화면' },
                { key: 'mobile', label: 'QR 모바일 화면' },
              ] as const).map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setLiveView(v.key)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${
                    liveView === v.key ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative bg-slate-100 p-3 flex items-center justify-center min-h-[220px]">
            {!canPreview ? (
              <p className="text-[11px] text-slate-500 text-center leading-relaxed py-8">
                매장 공개 주소를 불러오는 중입니다.<br />잠시 후 미리보기가 표시됩니다.
              </p>
            ) : !liveScreen ? (
              /* 아직 성공한 미리보기가 없음: 오류면 표준 문구, 아니면 로딩 (§4.5 로딩/오류 구분) */
              liveError ? (
                <p className="text-[11px] text-red-600 text-center leading-relaxed py-8">{liveError}</p>
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-400 py-8">
                  <Loader2 className="w-4 h-4 animate-spin" /> 미리보기 준비 중…
                </div>
              )
            ) : liveView === 'tablet' ? (
              <div style={{ position: 'relative', overflow: 'hidden', width: '100%', aspectRatio: '16 / 10', background: '#000', borderRadius: 10 }}>
                <TabletKioskPage api={previewApi} slug={storeSlug ?? undefined} previewScreen={liveScreen} embedded showQrBadge={false} previewLayoutOnly />
              </div>
            ) : (
              <div style={{ position: 'relative', overflow: 'hidden', width: 'min(100%, 240px)', aspectRatio: '9 / 19', background: '#000', borderRadius: 18 }}>
                <TabletKioskPage api={previewApi} slug={storeSlug ?? undefined} previewScreen={liveScreenMobile} embedded showQrBadge={false} previewLayoutOnly />
              </div>
            )}
            {/* 재조회 중에도 이전 화면을 유지(깜빡임 방지) — 오류 상태에선 오류 배지가 우선 */}
            {liveLoading && liveScreen && !liveError && (
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/70 text-white text-[10px]">
                <Loader2 className="w-3 h-3 animate-spin" /> 갱신 중
              </span>
            )}
            {/* WO-...-CORNER-EDITOR-AND-DRAFT-PREVIEW-RUNTIME-FIX-V1 §4.5:
                이전 미리보기는 유지하되 최신 입력이 반영 안 됐음을 명확히 표시(저장 성공과 혼동 방지). */}
            {liveError && liveScreen && (
              <div className="absolute top-2 left-2 right-2 flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-600/90 text-white text-[11px] font-medium leading-snug">
                <span>⚠️ {liveError} 아래는 직전에 성공한 화면입니다.</span>
              </div>
            )}
          </div>

          {/* WO-O4O-KPA-TABLET-NEW-SCREEN-INITIAL-PREVIEW-CONTEXT-FIX-V1 §9: 상품 출처·미리보기 문맥 안내.
              Screen Set 은 코너와 독립된 원본(§3.1) — 빌더 미리보기는 코너 문맥이 없어 배치 골격만 보여준다.
              실제 상품은 이 콘텐츠를 코너에 적용했을 때 그 코너의 진열 상품으로 공개 화면에 표시된다. */}
          <div className="px-3 py-1.5 border-t bg-white text-[10px] text-slate-400 leading-relaxed">
            템플릿의 화면 배치를 미리 보여드립니다. 상품은 이 콘텐츠를 적용한 코너의 진열 상품으로 표시됩니다. 저장 전 미리보기이며, 실제 태블릿에서는 화면 크기·방향에 따라 달라질 수 있습니다.
          </div>
        </div>
      </aside>
      </div>{/* /2단 그리드 */}

      {/* WO-O4O-KPA-TABLET-BUILDER-BUSINESS-FIELDS-V1: 코너 설명용 ChatGPT 사용 방법 모달(평문 기준). */}
      {showAiGuide && (
        <div className="fixed inset-0 z-[100000] bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setShowAiGuide(false)} role="presentation">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[86vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" /> ChatGPT로 코너 설명 쓰기
              </h4>
              <button onClick={() => setShowAiGuide(false)} className="text-slate-400 hover:text-slate-600" aria-label="닫기"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-5 py-4 overflow-y-auto space-y-3">
              <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-700 leading-relaxed">
                <li><b>예제 요청문 복사</b>를 누릅니다.</li>
                <li>ChatGPT(또는 Gemini) 대화창에 붙여 넣습니다.</li>
                <li>대괄호 부분(코너 이름 / 이 코너에서 다루는 것)을 우리 매장에 맞게 고칩니다.</li>
                <li>나온 HTML을 복사해 <b>짧은 소개</b> 편집기의 <b>HTML 탭</b>에 붙여 넣습니다.</li>
                <li>편집기로 문구를 다듬고, 오른쪽 미리보기에서 실제 태블릿 화면을 확인한 뒤 저장합니다.</li>
              </ol>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-800 leading-relaxed">
                <b>확인해 주세요.</b> AI가 쓴 글은 사실과 다를 수 있습니다. 붙여 넣기 전에 약사가 내용을 검토해 주세요.
                질병을 치료·예방한다고 단정하는 표현은 사용하지 않습니다.
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-600 leading-relaxed">
                굵게·문단·목록·링크 같은 서식은 그대로 표시됩니다. 다만 <b>script·외부 스크립트·외부 CSS</b>는 안전을 위해 자동으로 제거됩니다.
                영상은 YouTube·Vimeo만 넣을 수 있습니다.
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1">예제 요청문</div>
                <pre className="text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 whitespace-pre-wrap break-words max-h-56 overflow-y-auto">{CORNER_DESC_PROMPT}</pre>
              </div>
            </div>
            <div className="px-5 py-3 border-t flex justify-end gap-2">
              <button onClick={copyCornerPrompt} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 inline-flex items-center gap-1.5">
                {promptCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {promptCopied ? '복사됨' : '예제 요청문 복사'}
              </button>
              <button onClick={() => setShowAiGuide(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">닫기</button>
            </div>
          </div>
        </div>
      )}

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
                <TabletKioskPage api={previewApi} slug={storeSlug ?? undefined} previewScreen={preview.screen} embedded showQrBadge={false} previewLayoutOnly />
              </div>
            ) : (
              <div style={{ position: 'relative', overflow: 'hidden', width: 390, maxWidth: '100%', height: 'min(86vh, 780px)', background: '#000', borderRadius: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                <TabletKioskPage api={previewApi} slug={storeSlug ?? undefined} previewScreen={stripIdleForMobilePreview(preview.screen)} embedded showQrBadge={false} previewLayoutOnly />
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
