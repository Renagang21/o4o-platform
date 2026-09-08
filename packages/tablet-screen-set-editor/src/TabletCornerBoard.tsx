/**
 * TabletCornerBoard — 매장 태블릿 **운영(B)** 공통 Core
 *
 * WO-O4O-TABLET-PRODUCT-LIST-CONTRACT-AND-OPERATION-CORE-KPA-ADOPTION-V1 §5·§6
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 여기(편집기 패키지)인가
 *
 *   정본(`O4O-STORE-CONTENT-AND-EXECUTION-MODEL-V1` §4)의 3단계 중
 *     A 저작(Content authoring) = 이 패키지의 `TabletContentStepBuilder` — 이미 공통(KPA·PH·Neture)
 *     C 런타임(Runtime)         = `@o4o/tablet-kiosk-core` — 이미 공통
 *     B 운영(Tablet operation)  = **각 서비스에 흩어져 있던 빈 칸**  ← 이 파일
 *
 *   신규 패키지를 만들지 않는다(중복 패키지 0). `@o4o/store-ui-core` 의 tablet 화면은
 *   1세대(진열) 모델이라 같은 패키지에 두면 세대 혼동이 굳는다 —
 *   `IR-O4O-TABLET-CANONICAL-COMMON-CORE-BOUNDARY-AND-PH-ADOPTION-GAP-V1` §3·§5 참조.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Core / Adapter 경계 (§6)
 *
 *   이 컴포넌트에는 **서비스 조건문이 없다.** serviceKey·API prefix·라우터·fetch 를 모른다.
 *   `'kpa-society'` 같은 리터럴 분기가 생기면 설계 실패로 본다.
 *
 *   Core 가 갖는 것 : 코너 카드 배치 · "지금 나오는 화면" 표시 · 액션 배치 · empty/loading/error 표면
 *   서비스가 주는 것 : 데이터(tablets·세트 정보 조회 함수) · 콜백(상세/교체/미리보기/추가) · 문구 · accent
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 표시 규칙(KPA canonical 계승 — `WO-O4O-KPA-TABLET-STORE-UX-AND-SAMPLE-GUIDE-FIX-V1` §1)
 *   - 카드 1장 = 태블릿 1대. 카드 제목 = **설치 코너(위치)**, 없으면 태블릿 이름.
 *   - 내부 용어(화면 세트 / 블록 수 / current / 연결)를 매장 화면에 노출하지 않는다.
 *   - 카드 본문 클릭 = 상세, 하단 버튼 = 화면 바꾸기 / 미리보기.
 */

import type { CSSProperties, ReactNode } from 'react';

// ── 표시 모델 (서비스 타입에 의존하지 않는 최소 형태) ──

export interface TabletCornerItem {
  id: string;
  /** 태블릿 이름. */
  name: string;
  /** 설치 코너(위치). 있으면 카드 제목이 된다. */
  location?: string | null;
  /** 현재 적용된 화면 세트 id. 없으면 '기본 화면'. */
  currentScreenSetId?: string | null;
}

/** 적용된 세트의 표시 정보. 서비스가 자기 인덱스에서 찾아 준다. */
export interface TabletCornerScreenSetInfo {
  name: string;
  /** 화면 유형 라벨(이미 사람이 읽는 문자열). 없으면 미표시. */
  templateLabel?: string | null;
}

export interface TabletCornerBoardLabels {
  sectionTitle: string;
  addTablet: string;
  hint: string;
  nowShowing: string;
  defaultScreenName: string;
  swap: string;
  preview: string;
  emptyTitle: string;
  emptyHint: string;
  detailTitle: string;
}

export const DEFAULT_TABLET_CORNER_BOARD_LABELS: TabletCornerBoardLabels = {
  sectionTitle: '태블릿',
  addTablet: '태블릿 추가',
  hint: '카드 하나가 태블릿 1대이며, 카드 제목은 그 태블릿의 설치 코너(위치)입니다. 지금 나오는 화면을 보고 바로 바꿀 수 있고, 카드를 누르면 상세 설정으로 들어갑니다.',
  nowShowing: '지금 나오는 화면',
  defaultScreenName: '기본 화면',
  swap: '화면 바꾸기',
  preview: '미리보기',
  emptyTitle: '아직 등록된 태블릿이 없습니다',
  emptyHint: '태블릿을 추가하면 설치 코너별로 화면을 준비하고 적용할 수 있습니다.',
  detailTitle: '상세 설정 열기',
};

/** Tailwind class 주입 — Core 가 서비스 색을 알지 않는다. */
export interface TabletCornerBoardAccent {
  icon: string;
  addButton: string;
  cardHover: string;
  swapButton: string;
  templateText: string;
  emptyButton: string;
}

export const TABLET_CORNER_BOARD_TEAL: TabletCornerBoardAccent = {
  icon: 'text-teal-600',
  addButton: 'text-teal-700 border-teal-200 hover:bg-teal-50',
  cardHover: 'hover:border-teal-200',
  swapButton: 'bg-teal-600 hover:bg-teal-700',
  templateText: 'text-teal-600',
  emptyButton: 'bg-teal-600 hover:bg-teal-700',
};

export interface TabletCornerBoardProps {
  tablets: TabletCornerItem[];
  /** 적용된 세트의 표시 정보 조회(서비스 인덱스). 모르면 null. */
  screenSetInfo: (screenSetId: string) => TabletCornerScreenSetInfo | null;
  onOpenDetail: (tabletId: string) => void;
  onSwap: (tablet: TabletCornerItem) => void;
  onPreview: (tabletId: string) => void;
  onAddTablet: () => void;
  /** 미리보기 진행 중 등으로 잠글 때. */
  previewDisabled?: boolean;
  loading?: boolean;
  /** 조회 실패 문구. 있으면 목록 위에 표시한다. */
  error?: string | null;
  labels?: Partial<TabletCornerBoardLabels>;
  accent?: Partial<TabletCornerBoardAccent>;
  /** 아이콘 주입(서비스가 쓰는 아이콘 세트를 Core 가 의존하지 않는다). */
  icons?: { tablet?: ReactNode; add?: ReactNode };
  /** 목록 위에 붙일 서비스 전용 슬롯(예: 안내 배너). */
  headerSlot?: ReactNode;
}

/** 코너 제목 = 위치 우선, 없으면 이름. 부제 = 위치가 있을 때만 이름. */
export function cornerPrimaryLabel(t: TabletCornerItem): string {
  return t.location?.trim() || t.name;
}
export function cornerSecondaryLabel(t: TabletCornerItem): string | null {
  return t.location?.trim() ? t.name : null;
}

/** 위치 → 이름 순 정렬(한국어). 위치 없는 코너는 뒤로. */
export function sortTabletCorners<T extends TabletCornerItem>(tablets: T[]): T[] {
  return [...tablets].sort(
    (a, b) =>
      (a.location?.trim() || '￿').localeCompare(b.location?.trim() || '￿', 'ko') ||
      a.name.localeCompare(b.name, 'ko'),
  );
}

const cardStyle: CSSProperties = { minHeight: 76 };

export function TabletCornerBoard({
  tablets,
  screenSetInfo,
  onOpenDetail,
  onSwap,
  onPreview,
  onAddTablet,
  previewDisabled,
  loading,
  error,
  labels,
  accent,
  icons,
  headerSlot,
}: TabletCornerBoardProps) {
  const L = { ...DEFAULT_TABLET_CORNER_BOARD_LABELS, ...labels };
  const A = { ...TABLET_CORNER_BOARD_TEAL, ...accent };
  const sorted = sortTabletCorners(tablets);

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-slate-400" role="status">
        불러오는 중…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}
      {headerSlot}

      {sorted.length === 0 ? (
        <div className="rounded-2xl bg-white py-16 text-center shadow-sm">
          {icons?.tablet && <div className="mx-auto mb-4 flex justify-center">{icons.tablet}</div>}
          <h3 className="mb-2 text-lg font-medium text-slate-800">{L.emptyTitle}</h3>
          <p className="mb-4 text-slate-500">{L.emptyHint}</p>
          <button
            type="button"
            onClick={onAddTablet}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors ${A.emptyButton}`}
          >
            {icons?.add}
            {L.addTablet}
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
              {icons?.tablet && <span className={A.icon}>{icons.tablet}</span>}
              {L.sectionTitle}
              <span className="text-sm font-normal text-slate-400">({tablets.length})</span>
            </h2>
            <button
              type="button"
              onClick={onAddTablet}
              className={`inline-flex items-center gap-1.5 rounded-xl border bg-white px-3 py-2 text-sm font-medium ${A.addButton}`}
            >
              {icons?.add}
              {L.addTablet}
            </button>
          </div>
          <p className="text-xs text-slate-400">{L.hint}</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.map((t) => {
              const set = t.currentScreenSetId ? screenSetInfo(t.currentScreenSetId) : null;
              const nowName = set ? set.name : L.defaultScreenName;
              const secondary = cornerSecondaryLabel(t);
              return (
                <div
                  key={t.id}
                  className={`flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md ${A.cardHover}`}
                >
                  <div
                    onClick={() => onOpenDetail(t.id)}
                    className="min-w-0 cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpenDetail(t.id); }}
                    title={L.detailTitle}
                  >
                    <div className="truncate text-base font-bold text-slate-900">{cornerPrimaryLabel(t)}</div>
                    {secondary && <div className="mt-0.5 truncate text-xs text-slate-400">{secondary}</div>}
                  </div>

                  <div
                    onClick={() => onOpenDetail(t.id)}
                    className="cursor-pointer rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-teal-50/40 px-3 py-4"
                    style={cardStyle}
                    title={L.detailTitle}
                  >
                    <div className="text-[11px] text-slate-400">{L.nowShowing}</div>
                    <div className="mt-0.5 truncate text-sm font-bold text-slate-800">{nowName}</div>
                    {set?.templateLabel && (
                      <div className={`mt-0.5 text-[11px] ${A.templateText}`}>{set.templateLabel}</div>
                    )}
                  </div>

                  <div className="mt-auto flex gap-2">
                    <button
                      type="button"
                      onClick={() => onSwap(t)}
                      className={`min-h-[44px] flex-1 rounded-xl px-3 py-2 text-sm font-semibold text-white ${A.swapButton}`}
                    >
                      {L.swap}
                    </button>
                    <button
                      type="button"
                      onClick={() => onPreview(t.id)}
                      disabled={previewDisabled}
                      className="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {L.preview}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
