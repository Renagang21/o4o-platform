/**
 * @o4o/tablet-screen-set-editor — 공유 태블렛 Screen Set authoring 편집기
 *
 * WO-O4O-TABLET-SCREEN-SET-EDITOR-SHARED-EXTRACTION-V2A
 *   web-kpa-society 의 TabletScreenSetManager 에서 **단계형 제작 편집기**(TabletContentStepBuilder)와
 *   그 내부(TemplateThumb / ContentListEditor / ContentPickerModal / kiosk 미리보기 배선 / 템플릿 메타)를
 *   공유 패키지로 추출한다. 기능·저장 payload·5섹션 계약·UI 동작 불변(값 이동, byte-equivalent).
 *
 *   역할별 API·권한은 이 패키지가 직접 알지 않는다 — **주입**받는다:
 *     - api: ScreenSetBuilderApi   (create/update/saveBlocks/preview/search*)
 *     - contentSources: ContentSourceKind[]  (선택 가능한 콘텐츠 출처 capability)
 *     - previewApi/storeSlug/onToast/onCancel/onSaved  (props)
 *   → store/operator 는 자기 API 인스턴스를 주입하고, 후속 supplier consumer 도 동일 계약으로 연결한다.
 *   앱 전역(auth/router/toast singleton/store slug 해석)에 대한 의존 없음.
 *
 *   타입: ScreenBlock/ScreenBlockType/ContentListItem 은 @o4o/screen-content-core(단일 소스),
 *   API-DTO 타입(ScreenSet/ScreenSetDetail/ScreenSetStatus/*SearchResult)은 이 패키지가 정의
 *   (소비처 tabletDisplays 와 구조적 동일 — 계약 변경 0).
 */
import { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { Loader2, Plus, ChevronUp, ChevronDown, X, Save, Layers, Search } from 'lucide-react';
import {
  normalizeCornerBody, normalizeBlocks, ensureAutoBlocks, seedInitialBlocks,
  contentItemKey, moveContentItem, removeContentItem, addContentItems, updateContentItem, isValidScreenSetName,
  selectedProductsOf, withSelectedProducts,
  type ScreenBlock, type ScreenBlockType, type ContentListItem, type SelectedProductRef,
} from '@o4o/screen-content-core';
import { TabletKioskPage, detectIdleMediaType, type TabletKioskApi, type TabletScreenResponse } from '@o4o/tablet-kiosk-core';
import { RichTextEditor, LlmAssistPanel, type MediaInsert } from '@o4o/content-editor';

// ── API-DTO 타입(소비처 tabletDisplays 와 구조적 동일 — 계약 변경 없음) ──
export type ScreenSetStatus = 'draft' | 'active' | 'archived' | 'operator_template';
export interface ScreenSet {
  id: string;
  organizationId: string | null;
  serviceKey: string | null;
  supplierId: string | null;
  tabletId: string | null;
  name: string;
  origin: 'store' | 'operator' | 'supplier';
  status: ScreenSetStatus;
  templateKey: string;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  blockCount?: number;
  isApplied?: boolean;
}
export interface ScreenSetDetail extends ScreenSet {
  blocks: ScreenBlock[];
}
export interface StoreContentSearchResult {
  contentId: string;
  title: string;
  sourceType: string;
  workspaceStatus: string;
  summary: string | null;
  hasProductLink: boolean;
}
export interface O4oDescriptionSearchResult {
  masterId: string;
  name: string;
  barcode: string | null;
  specification: string | null;
  summary: string | null;
  languages: string[];
}
export type { ScreenBlock, ScreenBlockType, ContentListItem, TabletKioskApi, TabletScreenResponse };

// WO-O4O-TABLET-ADDITIONAL-CONTENT-SKU-DISTINGUISHABILITY-V1: 동일 상품명 SKU 구분 라벨(picker 재사용). 순수 함수 — 편집기와 함께 공유.
function buildProductVariantLabel(product: { specification?: string | null }): string {
  const spec = product?.specification;
  if (!spec || typeof spec !== 'string') return '';
  const DROP = new Set(['', '없음', '0', '-', '미상', 'undefined', 'null', 'n/a', 'na']);
  const seen = new Set<string>();
  return spec
    .split(/[/·]/)
    .map((s) => s.trim())
    .filter((s) => s && !DROP.has(s.toLowerCase()))
    .filter((s) => (seen.has(s) ? false : (seen.add(s), true)))
    .join(' · ');
}

export type Toast = { type: 'success' | 'error'; message: string };

// WO-O4O-SCREEN-SET-CORNER-CONTENT-FREE-AUTHORING-AND-LLM-ASSIST-V1 §4.5:
//   언어 코드 표시 라벨(모르는 코드는 코드 그대로 노출). 새 언어 목록을 정의하지 않는다 —
//   선택지는 검색 결과가 알려주는 기존 지원 언어만 사용한다.
const LANGUAGE_LABEL: Record<string, string> = {
  ko: '한국어', en: 'English', zh: '中文', 'zh-CN': '中文(간체)', 'zh-TW': '中文(번체)',
  ja: '日本語', vi: 'Tiếng Việt', th: 'ไทย', ru: 'Русский', id: 'Bahasa Indonesia', mn: 'Монгол',
};

// ── WO-O4O-OPERATOR-SCREEN-SET-AUTHORING-FOUNDATION-V1: 제작 흐름 재사용을 위한 API 주입 경계 ──
//   매장(store) 제작기와 운영자(operator) 제작기가 **동일한 단계형 제작 셸**을 공유하되, 저장/미리보기/검색은
//   각자의 스코프 API 로 라우팅한다. 미주입 시 기본값 = 매장 API(store 동작 완전 불변, additive).
//   운영자는 매장 콘텐츠 조회 불가 → contentSources 에서 store 출처를 제외한다.
export type ContentSourceKind = 'spd' | 'o4o' | 'store';
export const DEFAULT_CONTENT_SOURCES: ContentSourceKind[] = ['spd', 'o4o', 'store'];

export interface ScreenSetBuilderApi {
  create: (input: { name: string; status?: 'draft' | 'active'; templateKey?: string | null }) => Promise<ScreenSet>;
  update: (id: string, input: { name?: string; status?: ScreenSetStatus; templateKey?: string | null }) => Promise<ScreenSet>;
  saveBlocks: (id: string, blocks: ScreenBlock[]) => Promise<ScreenBlock[]>;
  preview: (input: { templateKey?: string | null; blocks: ScreenBlock[] }) => Promise<TabletScreenResponse>;
  searchO4oDescriptions: (q: string) => Promise<O4oDescriptionSearchResult[]>;
  searchStoreContents: (q: string) => Promise<StoreContentSearchResult[]>;
}

// 기본(매장) API 인스턴스는 이 패키지에 두지 않는다 — store/operator/supplier consumer 가
//   각자의 ScreenSetBuilderApi 를 **명시적으로 주입**한다(api prop 필수). 앱 런타임 함수 의존 제거.

// (RESIDUAL) 리스트 페이지(TabletScreenSetManager)·ScreenSetUsageTablet·Props 는 소비 앱(web-kpa-society)에 잔류.
//   이 패키지는 authoring 편집기(TabletContentStepBuilder)와 그 내부만 제공한다.

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
// WO-O4O-SCREEN-SET-CORNER-CONTENT-FREE-AUTHORING-AND-LLM-ASSIST-V1 §4.1:
//   **단계형 제작 흐름을 제거**한다. 대기 화면 / 코너 설명 / 상품 / 추가 정보 / 저장은 서로 독립적인
//   편집 영역이며, 어느 것을 먼저 해도 되고 비워 둔 채 저장해도 된다.
//   (BuilderStepMeta·BUILDER_STEPS·step state·이전/다음·단계 인디케이터 삭제 — 순차 진행 표현 없음)
interface TemplateMeta {
  key: string;
  label: string;
  description: string;
  /** 이 템플릿이 화면에 쓰는 블록(자동 준비 대상). 사용자에게 노출하지 않는다. */
  requiredBlocks: ScreenBlockType[];
}
// 업무 3항목이 사용하는 내부 블록 — 템플릿 선택 시 자동 확보(추가만. 기존 블록 삭제·재정렬 없음).
//   product_list = 코너 진열 제품(코너별 운영에서 관리) · qr_guide = 모든 템플릿 메인 QR 원칙.
// AUTO_BLOCK_TYPES: @o4o/screen-content-core 에서 소비(로컬 정의 제거).

// 코너 설명 예제 요청문.
//   WO-O4O-KPA-TABLET-STANDARD-EDITOR-UNIFY-V1: 코너 설명이 표준 편집기(HTML) + ContentRenderer 렌더로
//   바뀌었으므로, 평문만 요구하던 이전 요청문을 HTML 산출용으로 교체한다.
//   ContentRenderer 는 sanitizeRichHtml(DOMPurify)로 script/위험 속성을 제거하고
//   iframe 은 youtube/vimeo 만 허용하므로, 요청문에서도 그 범위를 벗어나지 않게 지시한다.
const CORNER_DESC_PROMPT = `약국 매장 태블렛의 코너 화면에 넣을 내용을 HTML로 만들어 주세요.

[코너 이름]
예: 구강관리 코너

[이 코너에서 다루는 것]
예: 치약, 칫솔, 치간칫솔, 구강청결제

[이번에 넣고 싶은 내용]
예: 코너 소개 + 제품 고르는 기준 + 사용 순서 안내
(짧은 소개 한 단락만 원할 수도 있고, 소제목이 여러 개인 긴 안내여도 됩니다 — 원하는 구성을 여기에 적어 주세요.)

조건:
- 손님이 태블렛 화면에서 읽는 글입니다. 문장은 짧고 읽기 쉽게.
- O4O 편집기의 HTML 탭에 그대로 붙여 넣을 수 있는 형태로 만들어 주세요.
- 사용할 태그: p, h2, h3, strong, em, ul, ol, li, br, a, table, img 정도면 충분합니다.
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

// WO-O4O-KPA-TABLET-REMOVE-IDLE-VIDEO-TEMPLATE-V1: '대기 영상형'(idle_touch_video) 을 신규 제작 선택지에서 제거.
//   이유: 모든 템플릿이 '대기 화면'(대기 영상) 단계를 갖게 되어 전용 템플릿이 중복 선택지가 됨.
//   ── 신규 선택 가능 목록 / legacy 호환 metadata 분리 ──
//   · TEMPLATE_OPTIONS(위, 5종) = legacy 포함 metadata → templateMeta/templateLabel/TemplateThumb 가
//     기존 idle_touch_video 콘텐츠의 라벨·썸네일을 계속 해석(기존 콘텐츠 표시/편집 진입 유지).
//   · SELECTABLE_TEMPLATE_OPTIONS(4종) = 신규 제작 카드 + 필터가 노출하는 목록(idle_touch_video 제외).
//   기존 idle_touch_video 화면 세트는 자동 변환하지 않으며(template_key 유지), 편집 진입 시 다른 4종으로 변경 가능.
export const LEGACY_ONLY_TEMPLATE_KEYS: string[] = ['idle_touch_video'];
const isLegacyOnlyTemplate = (key: string | null | undefined): boolean =>
  !!key && LEGACY_ONLY_TEMPLATE_KEYS.includes(key);
const SELECTABLE_TEMPLATE_OPTIONS: TemplateMeta[] = TEMPLATE_OPTIONS.filter(
  (t) => !LEGACY_ONLY_TEMPLATE_KEYS.includes(t.key),
);

// WO-O4O-KPA-TABLET-SCREEN-SET-DIRTY-GUARD-V1: 미저장 변경 경고 문구 + 블록 비교 정규화
const DISCARD_MSG = '저장되지 않은 변경이 있습니다.\n저장하지 않고 이동하면 변경사항이 사라질 수 있습니다.\n계속하시겠습니까?';
// normalizeBlocks / defaultConfig: @o4o/screen-content-core 에서 소비(로컬 정의 제거).

// WO-O4O-KPA-TABLET-IDLE-VIDEO-URL-ONLY-V1: 대기 화면 소스 선택 UI 제거 → IDLE_SOURCES 불필요.
//   (콘텐츠마다 YouTube/Vimeo URL 1개만 사용. 저장은 custom_media.items[] 계약 그대로.)

// ── 템플릿 축소 미리보기(와이어프레임) — WO-O4O-KPA-TABLET-TEMPLATE-PREVIEW-LAYOUT-FIX-V1 ──
//   각 카드에 kiosk 인스턴스를 띄우면 preview POST 다회 + 렌더 비용이 커지므로, 카드는 '배치 스케치'만 보여준다.
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
function ContentListEditor({ items, onChange, api, contentSources = DEFAULT_CONTENT_SOURCES }: {
  items: ContentListItem[];
  onChange: (items: ContentListItem[]) => void;
  // WO-O4O-OPERATOR-SCREEN-SET-AUTHORING-FOUNDATION-V1: picker 검색 API·노출 출처 주입(미주입=매장 기본).
  api: Pick<ScreenSetBuilderApi, 'searchO4oDescriptions' | 'searchStoreContents'>;
  contentSources?: ContentSourceKind[];
}) {
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
    if (!window.confirm('이 추가 정보를 현재 태블렛 콘텐츠에서 삭제하시겠습니까?\n원본 콘텐츠는 삭제되지 않습니다.')) return;
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
          api={api}
          contentSources={contentSources}
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
function ContentPickerModal({ existingKeys, onClose, onAdd, baseSort, api, contentSources = DEFAULT_CONTENT_SOURCES }: {
  existingKeys: Set<string>;
  onClose: () => void;
  onAdd: (items: ContentListItem[], titles: Record<string, string>) => void;
  baseSort: number;
  // WO-O4O-OPERATOR-SCREEN-SET-AUTHORING-FOUNDATION-V1: 검색 API·노출 출처 주입(미주입=매장 기본).
  api: Pick<ScreenSetBuilderApi, 'searchO4oDescriptions' | 'searchStoreContents'>;
  contentSources?: ContentSourceKind[];
}) {
  // WO-O4O-KPA-TABLET-BUILDER-BUSINESS-FIELDS-V1: 출처 3분류.
  //   spd   = 상품 매장용 상세설명서 (o4o_product_description)
  //   o4o   = O4O 제공 콘텐츠  (store_content 중 source_type='snapshot_edit' — 운영자/HUB 원본을 매장이 가져온 것)
  //   store = 매장 제작 콘텐츠 (store_content 중 source_type='direct')
  //   저장 계약(ContentListItem.sourceType)은 2종 그대로 — 분류는 표시/필터 기준이며 API·DB 변경 없음.
  // WO-O4O-OPERATOR-SCREEN-SET-AUTHORING-FOUNDATION-V1: 운영자는 spd(o4o 표준 설명서)만 노출(매장 콘텐츠 조회 차단).
  const sources = contentSources.length ? contentSources : DEFAULT_CONTENT_SOURCES;
  const [tab, setTab] = useState<ContentSourceKind>(sources[0]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [o4o, setO4o] = useState<O4oDescriptionSearchResult[]>([]);
  const [store, setStore] = useState<StoreContentSearchResult[]>([]);
  const [selO4o, setSelO4o] = useState<Record<string, boolean>>({});
  const [selStore, setSelStore] = useState<Record<string, boolean>>({});
  // WO-O4O-SCREEN-SET-CORNER-CONTENT-FREE-AUTHORING-AND-LLM-ASSIST-V1 §4.5:
  //   설명서 언어를 'ko' 로 하드코딩하지 않는다. 기본값은 ko 이며, 선택지는 검색 결과가 알려주는
  //   기존 지원 언어 목록(O4oDescriptionSearchResult.languages)을 그대로 쓴다.
  //   자동 번역·다국어 자동 생성은 하지 않는다(이미 있는 언어를 고르는 것뿐).
  const [lang, setLang] = useState('ko');
  const langOptions = useMemo(() => {
    const set = new Set<string>(['ko']);
    for (const r of o4o) for (const l of (r.languages ?? [])) if (typeof l === 'string' && l.trim()) set.add(l.trim());
    return Array.from(set);
  }, [o4o]);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'spd') setO4o(await api.searchO4oDescriptions(q));
      else setStore(await api.searchStoreContents(q));
    } catch { /* 검색 실패는 빈 목록으로 */ if (tab === 'spd') setO4o([]); else setStore([]); }
    finally { setLoading(false); }
  }, [tab, q, api]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, [tab]); // 탭 전환 시 자동 검색(매장 제작은 q 없이 최근순)

  const confirm = () => {
    const out: ContentListItem[] = [];
    const titles: Record<string, string> = {};
    let n = baseSort;
    o4o.filter((r) => selO4o[r.masterId]).forEach((r) => {
      // §4.5: 선택한 언어로 저장(기본 ko). 계약(ContentListItem.language) 불변.
      const key = `o4o:${r.masterId}:${lang}`;
      out.push({ sourceType: 'o4o_product_description', masterId: r.masterId, language: lang, displayTitle: null, displaySummary: null, visible: true, sortOrder: (n += 10) });
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
        {/* 출처 기준 분류(성격 기준 아님) — WO-...-BUSINESS-FIELDS-V1.
            WO-O4O-OPERATOR-SCREEN-SET-AUTHORING-FOUNDATION-V1: 노출 출처는 contentSources 로 제어(운영자=spd 만). */}
        {sources.length > 1 && (
          <div className={`px-4 pt-3 grid gap-1.5 flex-shrink-0 ${sources.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {sources.includes('spd') && <button onClick={() => setTab('spd')} className={tabBtn(tab === 'spd')}>매장용 상세설명서</button>}
            {sources.includes('o4o') && <button onClick={() => setTab('o4o')} className={tabBtn(tab === 'o4o')}>O4O 제공<br className="sm:hidden" /> 콘텐츠</button>}
            {sources.includes('store') && <button onClick={() => setTab('store')} className={tabBtn(tab === 'store')}>매장 제작<br className="sm:hidden" /> 콘텐츠</button>}
          </div>
        )}
        <div className="px-4 py-2 flex gap-2 flex-shrink-0">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()}
            placeholder={tab === 'spd' ? '상품명 · 바코드로 검색 (2자 이상)' : '콘텐츠 제목으로 검색 (비우면 최근순)'}
            className="flex-1 min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 text-sm" autoFocus />
          <button onClick={run} className="min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700">검색</button>
        </div>
        {/* WO-O4O-SCREEN-SET-CORNER-CONTENT-FREE-AUTHORING-AND-LLM-ASSIST-V1 §4.5: 설명서 언어 선택(기본 한국어). */}
        {tab === 'spd' && langOptions.length > 1 && (
          <div className="px-4 pb-2 flex items-center gap-2 flex-wrap flex-shrink-0">
            <span className="text-[11px] font-medium text-slate-500">설명서 언어</span>
            {langOptions.map((code) => (
              <button key={code} type="button" onClick={() => setLang(code)}
                className={`min-h-[32px] px-2.5 py-1 text-[11px] font-medium rounded-full ${lang === code ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {LANGUAGE_LABEL[code] ?? code}
              </button>
            ))}
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-6"><Loader2 className="w-4 h-4 animate-spin" /> 검색 중…</div>
          ) : tab === 'spd' ? (
            o4o.length === 0 ? <div className="text-sm text-slate-400 py-6 text-center">검색 결과가 없습니다. 다른 검색어를 입력해 보세요.<br /><span className="text-[11px]">(매장용 표준 설명서가 있는 상품만 표시됩니다)</span></div> :
            o4o.map((r) => {
              const added = existingKeys.has(`o4o:${r.masterId}:${lang}`);
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

// ── 상품 선택 편집기 (WO-O4O-SCREEN-SET-CORNER-CONTENT-FREE-AUTHORING-AND-LLM-ASSIST-V1 §4.2 / §5-B) ──
//   기존 product_list block 을 그대로 쓴다(새 블록·새 테이블 없음). 저장 config 는
//   `{ source:'selected_products', products:[{productType, productId}] }` (screen-content-core 계약).
//   상품을 하나도 고르지 않으면 `{ source:'legacy_tablet_displays' }` 로 되돌아가 기존 동작(코너 진열 기준)이 유지된다.
//   상품 선택은 필수가 아니며, 작업 도중 언제든 추가·제거할 수 있다.

/** 상품 선택 목록의 원천(매장 취급 상품 + 매장 자체 상품). 소비처가 자기 API 로 주입한다. */
export interface ScreenSetProductPool {
  supplierProducts: Array<{ id: string; product_name: string; retail_price?: string | null; is_active?: boolean }>;
  localProducts: Array<{ id: string; name: string; price_display?: string | null; is_active?: boolean }>;
}

type PoolEntry = { productType: 'supplier' | 'local'; productId: string; name: string; price: string };

function poolEntries(pool: ScreenSetProductPool | null): PoolEntry[] {
  if (!pool) return [];
  return [
    ...(pool.supplierProducts ?? []).map((p) => ({
      productType: 'supplier' as const, productId: String(p.id), name: p.product_name || '(이름 없음)',
      price: p.retail_price ? `${Number(p.retail_price).toLocaleString()}원` : '',
    })),
    ...(pool.localProducts ?? []).map((p) => ({
      productType: 'local' as const, productId: String(p.id), name: p.name || '(이름 없음)',
      price: p.price_display || '',
    })),
  ];
}

function ProductSelectEditor({ selected, onChange, fetchProductPool, onToast }: {
  selected: SelectedProductRef[];
  onChange: (next: SelectedProductRef[]) => void;
  fetchProductPool: () => Promise<ScreenSetProductPool>;
  onToast: (t: Toast) => void;
}) {
  const [pool, setPool] = useState<ScreenSetProductPool | null>(null);
  const [loading, setLoading] = useState(false);
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'supplier' | 'local'>('supplier');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProductPool()
      .then((p) => { if (!cancelled) setPool(p); })
      .catch((e: any) => { if (!cancelled) onToast({ type: 'error', message: e?.message || '상품 목록을 불러오지 못했습니다.' }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // 마운트 1회(주입 API 동일 인스턴스 기준). 선택 이름 표시를 위해 미리 받아 둔다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entries = useMemo(() => poolEntries(pool), [pool]);
  const byKey = useMemo(() => new Map(entries.map((e) => [`${e.productType}:${e.productId}`, e])), [entries]);
  const selectedKeys = useMemo(() => new Set(selected.map((s) => `${s.productType}:${s.productId}`)), [selected]);

  const move = (i: number, dir: 'up' | 'down') => {
    const j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= selected.length) return;
    const next = selected.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const remove = (i: number) => onChange(selected.filter((_, k) => k !== i));
  const toggle = (e: PoolEntry) => {
    const key = `${e.productType}:${e.productId}`;
    if (selectedKeys.has(key)) onChange(selected.filter((s) => `${s.productType}:${s.productId}` !== key));
    else onChange([...selected, { productType: e.productType, productId: e.productId }]);
  };

  const btn = 'min-h-[44px] px-3 py-2 text-sm font-medium rounded-xl inline-flex items-center justify-center gap-1';
  const rows = entries.filter((e) => e.productType === tab).filter((e) => !q.trim() || e.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-800">상품 <span className="text-xs font-normal text-slate-400">{selected.length}개 선택</span></div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            이 화면에 보여줄 상품을 직접 고릅니다. 고르지 않으면 이 콘텐츠를 적용한 코너의 진열 상품이 그대로 표시됩니다.
            상품은 지금 고르지 않아도 되고, 작업 도중 언제든 추가·제거할 수 있습니다.
          </p>
        </div>
        <button onClick={() => setPicking(true)} disabled={loading} className={`${btn} text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 flex-shrink-0`}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} 상품 고르기
        </button>
      </div>

      {selected.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 text-center py-5 px-4">
          <p className="text-sm text-slate-500 leading-relaxed">선택한 상품이 없습니다.<br />코너 진열 상품이 자동으로 표시됩니다.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {selected.map((s, i) => {
            const e = byKey.get(`${s.productType}:${s.productId}`);
            return (
              <div key={`${s.productType}:${s.productId}`} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 flex-shrink-0">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-800 truncate">{e?.name ?? (loading ? '불러오는 중…' : '(현재 목록에 없는 상품)')}</div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${s.productType === 'supplier' ? 'text-blue-700 bg-blue-50' : 'text-emerald-700 bg-emerald-50'}`}>
                        {s.productType === 'supplier' ? '취급 상품' : '매장 상품'}
                      </span>
                      {e?.price && <span className="text-[11px] text-slate-500">{e.price}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => move(i, 'up')} disabled={i === 0} className={`${btn} text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30`}><ChevronUp className="w-4 h-4" /> 위로</button>
                  <button onClick={() => move(i, 'down')} disabled={i === selected.length - 1} className={`${btn} text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30`}><ChevronDown className="w-4 h-4" /> 아래로</button>
                  <button onClick={() => remove(i)} className={`${btn} text-red-600 bg-white border border-red-200 hover:bg-red-50`}><X className="w-4 h-4" /> 제외</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {picking && (
        <div className="fixed inset-0 z-[950] bg-slate-900/50 flex items-stretch sm:items-center justify-center p-0 sm:p-4" onClick={() => setPicking(false)} role="presentation">
          <div className="bg-white w-full h-full sm:h-auto sm:max-w-lg sm:max-h-[86vh] rounded-none sm:rounded-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
              <h4 className="text-base font-bold text-slate-700">상품 고르기</h4>
              <button onClick={() => setPicking(false)} className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-slate-600" aria-label="닫기"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-4 pt-3 grid grid-cols-2 gap-1.5 flex-shrink-0">
              <button onClick={() => setTab('supplier')} className={`flex-1 min-h-[44px] px-2 py-2 text-sm font-medium rounded-xl ${tab === 'supplier' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>취급 상품</button>
              <button onClick={() => setTab('local')} className={`flex-1 min-h-[44px] px-2 py-2 text-sm font-medium rounded-xl ${tab === 'local' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>매장 상품</button>
            </div>
            <div className="px-4 py-2 flex gap-2 flex-shrink-0">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="상품명으로 찾기"
                  className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm" autoFocus />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-slate-400 py-6"><Loader2 className="w-4 h-4 animate-spin" /> 불러오는 중…</div>
              ) : rows.length === 0 ? (
                <div className="text-sm text-slate-400 py-6 text-center">{tab === 'supplier' ? '취급 상품이 없습니다.' : '매장에서 등록한 상품이 없습니다.'}</div>
              ) : rows.map((e) => {
                const sel = selectedKeys.has(`${e.productType}:${e.productId}`);
                return (
                  <button key={`${e.productType}:${e.productId}`} onClick={() => toggle(e)}
                    className={`w-full text-left rounded-xl border p-3 transition ${sel ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-200'}`}>
                    <div className="flex items-start gap-2">
                      <span className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${sel ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>{sel ? '✓' : ''}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-800 truncate">{e.name}</div>
                        <div className="text-[11px] text-slate-400 truncate">{e.productType === 'supplier' ? '취급 상품' : '매장 상품'}{e.price ? ` · ${e.price}` : ''}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t flex items-center justify-between gap-2 flex-shrink-0">
              <span className="text-xs text-slate-500">{selected.length}개 선택됨</span>
              <button onClick={() => setPicking(false)} className="min-h-[44px] px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700">완료</button>
            </div>
          </div>
        </div>
      )}
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
//   한다(공개 렌더 str()·태블렛 ContentRenderer 계약). 과거 잘못된 연결로 body 에 { html, json } 객체가 들어왔을
//   가능성을 읽기 경계에서 방어. 정규화는 여기(hydrate) 한 곳 + onChange(쓰기) 한 곳으로 끝낸다.
// normalizeCornerBody: @o4o/screen-content-core 에서 소비(로컬 정의 제거, 외부 소비처 없음).

// WO-O4O-KPA-TABLET-CORNER-EDITOR-AND-DRAFT-PREVIEW-RUNTIME-FIX-V1 §4.6:
//   실제 공개 QR(PublicScreenSetViewer)은 대기 영상(idle_media)을 제외한다. draft 미리보기 endpoint 는
//   idle_media 를 포함하므로, QR 모바일 미리보기만 idle_media 섹션을 걷어내 공개 QR 과 핵심 구성을 맞춘다.
//   (태블렛 미리보기는 그대로 — 대기 영상은 태블렛 개념.) kiosk-core·resolver·공개 viewer 무변경.
function stripIdleForMobilePreview(screen: TabletScreenResponse | null): TabletScreenResponse | null {
  const secs = (screen as unknown as { sections?: Array<{ blockType?: string }> })?.sections;
  if (!screen || !Array.isArray(secs)) return screen;
  return { ...screen, sections: secs.filter((s) => s?.blockType !== 'idle_media') } as TabletScreenResponse;
}

// seedInitialBlocks / ensureAutoBlocks: @o4o/screen-content-core 에서 소비(로컬 정의 제거).

/**
 * WO-O4O-SCREEN-SET-CORNER-CONTENT-FREE-AUTHORING-AND-LLM-ASSIST-V1 §4.1:
 *   편집 영역 하나(제목 + 안내 + 내용). 단계 번호·진행 상태를 표시하지 않으며, 영역 간 잠금도 없다.
 */
function EditorSection({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
      <div>
        <h4 className="text-sm font-bold text-slate-800">{title}</h4>
        {note && <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{note}</p>}
      </div>
      {children}
    </section>
  );
}

// WO-O4O-OPERATOR-SCREEN-SET-AUTHORING-FOUNDATION-V1: 제작 셸을 export 하여 운영자 제작기에서 재사용한다.
//   api/contentSources 미주입 시 매장 기본값(회귀 0). 운영자는 operator API + spd 출처만 주입.
export function TabletContentStepBuilder({
  initialDetail, onCancel, onSaved, onToast, previewApi, storeSlug, api,
  contentSources = DEFAULT_CONTENT_SOURCES, fetchProductPool, onImageUpload, onMediaLibraryPick,
}: {
  initialDetail: ScreenSetDetail | null;
  onCancel: () => void;
  onSaved: () => void;
  onToast: (t: Toast) => void;
  previewApi?: TabletKioskApi;
  storeSlug?: string | null;
  api: ScreenSetBuilderApi;
  contentSources?: ContentSourceKind[];
  /**
   * WO-O4O-SCREEN-SET-CORNER-CONTENT-FREE-AUTHORING-AND-LLM-ASSIST-V1 §4.2:
   *   상품 선택 목록 원천(매장 취급 상품 + 매장 자체 상품). 미주입이면 상품 영역을 노출하지 않는다
   *   (운영자·공급자 제작기처럼 매장 상품 문맥이 없는 소비처 — 기존 동작 그대로).
   */
  fetchProductPool?: () => Promise<ScreenSetProductPool>;
  /** §4.3: 코너 설명 편집기 이미지 업로드(표준 편집기 props 를 그대로 전달). 미주입이면 업로드 버튼 미노출. */
  onImageUpload?: (file: File) => Promise<string>;
  /** §4.3: 코너 설명 편집기 미디어 라이브러리 선택(표준 편집기 props 를 그대로 전달). */
  onMediaLibraryPick?: (insertMedia: (media: MediaInsert) => void) => void;
}) {
  const isEdit = !!initialDetail;
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

  // WO-O4O-KPA-TABLET-CONTENT-DRAFT-PREVIEW-V1: 저장 전 미리보기(태블렛 / QR 모바일). 모달은 편집 상태를 잃지 않는다.
  const canPreview = !!previewApi && !!storeSlug;
  const [preview, setPreview] = useState<{ screen: TabletScreenResponse; view: 'tablet' | 'mobile' } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const openPreview = async (view: 'tablet' | 'mobile') => {
    if (!canPreview || previewLoading) return;
    setPreviewLoading(true);
    try {
      const screen = await api.preview({ templateKey, blocks });
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
      api.preview({ templateKey, blocks })
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

  // ── 코너 설명 작성 보조 ──
  //   WO-O4O-SCREEN-SET-CORNER-CONTENT-FREE-AUTHORING-AND-LLM-ASSIST-V1 §4.4:
  //   전용 'ChatGPT 사용 방법' 모달을 공용 LlmAssistPanel(@o4o/content-editor)로 교체한다.
  //   복사/붙여넣기 전용 — LLM API 호출·계정 연동·대화 저장 없음. 모델·서비스는 사용자가 고른다.

  // 저장 요약 — 업무 항목 기준(블록 수 미노출).
  const idleCfg = configOf('idle_media');
  const idleUrl: string = idleCfg.source === 'custom_media' && Array.isArray(idleCfg.items) ? (idleCfg.items[0]?.url ?? '') : '';
  const idleSummary = idleUrl ? `동영상 1개 (${detectIdleMediaType(idleUrl) === 'vimeo' ? 'Vimeo' : 'YouTube'})` : '지정 안 함 (기본 화면)';
  const cornerDescCfg = configOf('corner_description');
  const cornerSummary = (cornerDescCfg.title || cornerDescCfg.body) ? (cornerDescCfg.title || '(제목 없음)') : '작성 안 함';
  const extraCount = (Array.isArray(configOf('content_list').items) ? configOf('content_list').items : []).length;
  // §4.2: product_list 의 명시 선택(없으면 빈 배열 = 코너 진열 기준).
  const selectedProducts = selectedProductsOf(configOf('product_list'));
  const productSummary = selectedProducts.length > 0 ? `${selectedProducts.length}개 직접 선택` : '코너 진열 상품 사용';

  const handleSave = async () => {
    if (!nameValid) { onToast({ type: 'error', message: '코너 제목 또는 콘텐츠 관리 이름을 입력해 주세요.' }); return; }
    setSaving(true);
    try {
      let id = initialDetail?.id;
      if (isEdit && id) {
        // WO-O4O-KPA-TABLET-BUILDER-REMOVE-STATUS-SELECT-V1: 상태는 사용자가 선택하지 않는다.
        //   '저장 = 사용할 수 있는 화면 세트'. 코너 적용 게이트(POST current-screen-set)가 active 를 요구하므로
        //   draft 는 active 로 승격(선택 UI 제거 후 draft 를 적용 가능하게 만들 다른 경로가 없음).
        //   active/archived/operator_template 등은 그대로 유지(보관·특수 상태는 별도 흐름에서 관리).
        const nextStatus: ScreenSetStatus = initialDetail!.status === 'draft' ? 'active' : initialDetail!.status;
        await api.update(id, { name: name.trim(), status: nextStatus, templateKey });
      } else {
        // library 재사용 세트(tabletId=null). 신규 저장은 기본 active(코너별 운영에서 바로 적용 가능). draft 는 UI 에서 만들지 않는다.
        //   운영자 API 는 status/tabletId 를 무시하고 operator_template 로 강제한다(계약 고정).
        const created = await api.create({ name: name.trim(), status: 'active', templateKey });
        id = created.id;
      }
      await api.saveBlocks(id!, blocks);
      onToast({ type: 'success', message: isEdit ? '태블렛 콘텐츠가 저장되었습니다.' : `태블렛 콘텐츠 "${name.trim()}" 생성됨` });
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
          <p className="text-[11px] text-slate-400 mt-1">고객 태블렛·QR 화면에 표시되는 제목입니다.</p>
        </div>
        <div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="text-xs font-semibold text-slate-600">코너 내용</label>
            {/* WO-O4O-SCREEN-SET-CORNER-CONTENT-FREE-AUTHORING-AND-LLM-ASSIST-V1 §4.4:
                공용 LLM 작업 보조(현재 내용 복사 / 요청문 복사 / 결과 HTML 붙여넣기 / 오류 수정 요청문).
                어떤 LLM 을 쓸지는 사용자가 정한다 — 특정 서비스에 한정하지 않는다. */}
            <LlmAssistPanel
              contextLabel="코너 내용"
              guideText={CORNER_DESC_PROMPT}
              currentHtml={normalizeCornerBody(c.body)}
              onApplyHtml={(html) => patchConfigOf('corner_description', { body: html })}
              onNotify={(message, kind) => onToast({ type: kind, message })}
            />
          </div>
          {/* WO-O4O-KPA-TABLET-STANDARD-EDITOR-UNIFY-V1: 평문 textarea → O4O 표준 편집기.
              저장 HTML 은 태블렛/QR 모바일 모두 ContentRenderer 로 렌더된다(동일 계약).
              별도 HTML 입력창은 만들지 않는다 — 표준 편집기의 기존 HTML 탭/붙여넣기를 쓴다. */}
          <div className="mt-1">
            {/* WO-O4O-KPA-TABLET-CORNER-EDITOR-AND-DRAFT-PREVIEW-RUNTIME-FIX-V1 §4.1:
                onChange 반환은 { html, json } 객체 → html 만 추출해 body(문자열) 저장.
                value 도 방어적으로 정규화(과거 객체형 body 를 문자열로 표시). */}
            {/* §4.3: 이미지 업로드·미디어 라이브러리는 표준 편집기 props 를 그대로 연결한다.
                새 HTML 저장소나 별도 '완성 HTML' 타입을 만들지 않는다(저장 위치는 corner_description.config.body 그대로). */}
            <RichTextEditor
              value={normalizeCornerBody(c.body)}
              onChange={({ html }) => patchConfigOf('corner_description', { body: html })}
              placeholder="이 코너에서 손님에게 보여줄 내용을 자유롭게 작성하세요. 글·이미지·표를 원하는 구성으로 넣을 수 있습니다."
              minHeight="320px"
              onImageUpload={onImageUpload}
              onMediaLibraryPick={onMediaLibraryPick}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            글·이미지·표·목록을 자유롭게 구성할 수 있습니다. 하나의 긴 내용으로 만들지, 여러 콘텐츠로 나눌지는 직접 정하시면 됩니다.
            LLM으로 만든 HTML은 위 <b>LLM으로 작업하기</b> 또는 편집기의 HTML 탭에 붙여 넣으세요.
            오른쪽 미리보기에서 실제 태블렛에 보이는 모습을 확인할 수 있습니다.
          </p>
        </div>
      </div>
    );
  };

  // 3) 상품 — WO-O4O-SCREEN-SET-CORNER-CONTENT-FREE-AUTHORING-AND-LLM-ASSIST-V1 §4.2.
  //    선택은 선택 사항이며 저장 조건이 아니다. 비우면 기존 config(legacy_tablet_displays)로 되돌아간다.
  const renderProductSection = () => (
    <ProductSelectEditor
      selected={selectedProducts}
      onChange={(next) => replaceConfigOf('product_list', withSelectedProducts(configOf('product_list'), next))}
      fetchProductPool={fetchProductPool!}
      onToast={onToast}
    />
  );

  // 4) 추가 정보 — content_list 용어 미노출. 출처 3종 피커 + 단일 목록(순서·표시·제거·화면용 제목/요약).
  const renderExtraStep = () => (
    <ContentListEditor
      items={Array.isArray(configOf('content_list').items) ? (configOf('content_list').items as ContentListItem[]) : []}
      onChange={(items) => replaceConfigOf('content_list', { items })}
      api={api}
      contentSources={contentSources}
    />
  );

  return (
    <div className="space-y-4">
      {/* ── 헤더 (WO-O4O-SCREEN-SET-CORNER-CONTENT-FREE-AUTHORING-AND-LLM-ASSIST-V1 §4.1)
             단계 인디케이터·순차 진행 표현 없음. 저장은 어느 시점에서든 가능하다. ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" /> {isEdit ? '태블렛 화면 수정' : '태블렛 화면 만들기'}
          {isDirty && <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">변경됨</span>}
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={saving || !nameValid}
            className="min-h-[40px] px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-2"
            title={nameValid ? undefined : '코너 제목 또는 콘텐츠 관리 이름을 입력하면 저장할 수 있습니다.'}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 저장
          </button>
          <button onClick={guardedCancel} className="text-xs text-slate-500 hover:text-slate-700 inline-flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> 목록으로
          </button>
        </div>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed">
        아래 항목은 <b>순서 없이</b> 원하는 대로 작성하시면 됩니다. 비워 둔 항목이 있어도 저장할 수 있고, 저장 후 언제든 다시 열어 추가·수정할 수 있습니다.
      </p>

      {/* ── WO-O4O-KPA-TABLET-TEMPLATE-PREVIEW-LAYOUT-FIX-V1: 2단 — 왼쪽 편집(≈58%) / 오른쪽 실제 결과 화면(≈42%).
             PC 웹 기준. lg 미만에서는 미리보기가 아래로 내려간다. ── */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-4 lg:items-start">
      <div className="space-y-3 min-w-0">

      {/* 코너 내용 */}
      <EditorSection title="코너 내용" note="이 코너가 어떤 곳인지, 손님에게 무엇을 보여줄지 자유롭게 작성합니다. 제목만 먼저 정해 두고 내용은 나중에 채워도 됩니다.">
        {renderCornerStep()}
      </EditorSection>

      {/* 상품 — 주입된 소비처(매장 제작기)에서만 노출 */}
      {fetchProductPool && (
        <EditorSection title="상품">
          {renderProductSection()}
        </EditorSection>
      )}

      {/* 추가 정보 */}
      <EditorSection title="추가 정보" note="손님에게 함께 보여줄 설명서·안내 콘텐츠를 골라 목록으로 구성합니다.">
        {renderExtraStep()}
      </EditorSection>

      {/* 대기 화면 */}
      <EditorSection title="대기 화면" note="손님이 화면을 만지지 않을 때 자동으로 재생할 영상입니다(YouTube·Vimeo URL). “화면을 터치하세요” 안내는 자동으로 표시됩니다.">
        {renderIdleStep()}
      </EditorSection>

      {/* 화면 배치 — WO-O4O-KPA-TABLET-TEMPLATE-PREVIEW-LAYOUT-FIX-V1: 카드 선택. 클릭 즉시 오른쪽 미리보기 반영.
          WO-O4O-KPA-TABLET-REMOVE-IDLE-VIDEO-TEMPLATE-V1: 신규 선택 카드는 SELECTABLE_TEMPLATE_OPTIONS(4종). */}
      <EditorSection title="화면 배치" note="같은 내용을 어떤 배치로 보여줄지 정합니다. 카드를 누르면 오른쪽 미리보기에 바로 반영됩니다.">
        {/* 기존 idle_touch_video 콘텐츠 편집 진입 시 안내만 표시. 자동 변환하지 않는다. */}
        {isLegacyOnlyTemplate(templateKey) && (
          <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">
            이 콘텐츠는 기존 배치 <b>{templateLabel(templateKey)}</b>(으)로 만들어졌습니다.
            그대로 저장하면 유지되며, 아래에서 다른 배치를 고르면 변경됩니다.
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SELECTABLE_TEMPLATE_OPTIONS.map((t) => {
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
      </EditorSection>

      {/* 저장 */}
      <EditorSection title="저장">
        {/* WO-O4O-KPA-TABLET-BUILDER-REMOVE-STATUS-SELECT-V1: 관리 이름 기본값 = 코너 제목 자동 파생. */}
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
          저장한 콘텐츠는 코너에 자동 적용되지 않습니다. 실제 태블렛 화면은 ‘코너별 운영’에서 선택합니다.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1.5">
          <div className="text-sm font-bold text-slate-800">{name.trim() || '(이름 없음)'}</div>
          <div className="text-[11px] text-slate-500">배치 <b>{templateLabel(templateKey)}</b></div>
          <ul className="text-[11px] text-slate-600 space-y-0.5 pt-0.5">
            <li>코너 내용: <b>{cornerSummary}</b></li>
            {fetchProductPool && <li>상품: <b>{productSummary}</b></li>}
            <li>추가 정보: <b>{extraCount > 0 ? `${extraCount}개` : '없음'}</b></li>
            <li>대기 화면: <b>{idleSummary}</b></li>
          </ul>
        </div>
        {/* WO-O4O-KPA-TABLET-CONTENT-DRAFT-PREVIEW-V1: 저장 전 전체화면 미리보기(태블렛 / QR 모바일). */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => openPreview('tablet')} disabled={!canPreview || previewLoading}
            className="min-h-[44px] px-4 py-2 text-sm font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-xl hover:bg-indigo-50 disabled:opacity-50 inline-flex items-center gap-1.5"
            title={canPreview ? undefined : '매장 공개 주소를 불러오는 중이거나 미리보기를 사용할 수 없습니다.'}>
            {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />} 태블렛 크게 보기
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
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 태블렛 콘텐츠 저장
        </button>
      </EditorSection>
      </div>{/* /왼쪽: 편집 영역 */}

      {/* ── 오른쪽: 실제 결과 화면(모든 단계에서 유지) ── */}
      {/* sticky 오프셋 = 전역 헤더(sticky top-0 · 실측 높이 65px) 아래로 내려 가리지 않게 한다. */}
      <aside className="mt-4 lg:mt-0 lg:sticky lg:top-[73px] min-w-0">
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-3 py-2 border-b bg-slate-50 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700">실제 화면 미리보기</span>
            <div className="flex gap-1">
              {([
                { key: 'tablet', label: '태블렛 화면' },
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
            템플릿의 화면 배치를 미리 보여드립니다. 상품은 이 콘텐츠를 적용한 코너의 진열 상품으로 표시됩니다. 저장 전 미리보기이며, 실제 태블렛에서는 화면 크기·방향에 따라 달라질 수 있습니다.
          </div>
        </div>
      </aside>
      </div>{/* /2단 그리드 */}

      {/* WO-O4O-SCREEN-SET-CORNER-CONTENT-FREE-AUTHORING-AND-LLM-ASSIST-V1 §4.4:
          전용 ChatGPT 안내 모달 제거 → 공용 LlmAssistPanel(코너 내용 영역)로 통합. */}

      {/* WO-O4O-KPA-TABLET-CONTENT-DRAFT-PREVIEW-V1: 저장 전 미리보기 모달. 닫아도 편집 상태(name/blocks 등) 유지. */}
      {preview && previewApi && (
        <div className="fixed inset-0 z-[100000] bg-slate-900/70 flex flex-col" onClick={() => setPreview(null)} role="presentation">
          <div className="bg-slate-900/95 text-white px-4 py-2 flex items-center justify-between gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm font-semibold whitespace-nowrap">저장 전 미리보기</span>
              <div className="flex gap-1">
                <button onClick={() => setPreview((p) => (p ? { ...p, view: 'tablet' } : p))}
                  className={`px-3 py-1 text-xs font-medium rounded-full ${preview.view === 'tablet' ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                  태블렛
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
            저장 전 미리보기입니다. 실제 태블렛에서는 화면 크기·방향에 따라 표시가 달라질 수 있습니다. 상담 요청은 전송되지 않습니다.
          </div>
        </div>
      )}
    </div>
  );
}
