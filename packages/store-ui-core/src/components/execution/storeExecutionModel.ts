/**
 * 매장 실행(Store Execution) 홈 — 순수 모델
 * WO-O4O-STORE-EXECUTION-HOME-TABLET-QR-V1
 *
 * 이 모듈이 답하는 질문은 하나다: **"어디에서 무엇이 지금 사용 중인가"**.
 * 제작(저작) 화면이 아니다. 새 자산을 만들거나 편집하는 개념은 여기 없다.
 *
 * 설계 정본: docs/design/DESIGN-O4O-STORE-EXECUTION-MANAGEMENT-CANONICAL-V1.md
 * 조사 정본: docs/investigations/IR-O4O-STORE-EXECUTION-ASSET-LOCATION-AND-UI-CENSUS-V1.md
 *
 * v1 범위 계약 (변경하려면 별도 WO 가 필요하다)
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. 표면은 **Tablet · QR 두 개뿐**이다.
 *    POP · Signage · ESL 은 실제 배치(placement) 축이 없어 "지금 어디에 있는지" 를
 *    말할 수 없다. 값이 `—` 인 placeholder 행조차 만들지 않는다.
 *    (`store_execution_assets` 에는 위치 컬럼이 없다)
 * 2. **실측 가능한 수치만 노출한다.** 유일한 실측치는 QR scan(`store_qr_scan_events`) 이다.
 *    태블릿 노출수 · POP/Signage 재생수 같은 지표는 만들지 않는다.
 * 3. **fuzzy matching 금지.** 위치 묶음은 trim 후 완전 일치 문자열,
 *    또는 명시적 `cornerRef` 두 가지 경로로만 성립한다.
 *    "카운터" 와 "계산대" 를 같은 코너로 추측하지 않는다.
 * 4. **serviceKey 분기 0.** KPA · Pharmacy-Hub 는 같은 Core 를 쓰고 데이터만 주입한다.
 *
 * 경계 — StoreChannelsView 와 겹치지 않는다
 * ─────────────────────────────────────────────────────────────────────────────
 * StoreChannelsView(`components/channels`) 는 **외부/플랫폼 채널 계약**(채널 유형 ·
 * 연동 상태 · 채널 코드)을 다룬다. 매장 실행 홈은 **매장 내부 물리 배치**를 다룬다.
 * 같은 데이터를 두 화면에서 다르게 세지 않도록, 이 모듈은 채널 개념을 입력으로도
 * 출력으로도 갖지 않는다.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 상태 4종 — 표시 전용 어휘 (DB enum 아님)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 실행 상태 4종. DB 에 저장되는 값이 아니라 **화면 표시용 파생 값**이다.
 * 새 컬럼 · 새 enum · migration 을 만들지 않는다.
 */
export type StoreExecutionStatus = 'ok' | 'unset' | 'stopped' | 'attention';

export const STORE_EXECUTION_STATUS_LABELS: Record<StoreExecutionStatus, string> = {
  ok: '정상',
  unset: '미설정',
  stopped: '중지',
  attention: '확인 필요',
};

/**
 * roll-up 시 사용하는 심각도. 값이 클수록 먼저 드러낸다.
 *
 * `unset` 이 `stopped` 보다 높은 이유: 중지는 경영자가 **의도한** 상태이고,
 * 미설정은 아직 아무도 손대지 않아 매장에서 아무 일도 일어나지 않는 상태다.
 */
export const STORE_EXECUTION_STATUS_SEVERITY: Record<StoreExecutionStatus, number> = {
  ok: 0,
  stopped: 1,
  unset: 2,
  attention: 3,
};

/** 왜 그 상태가 되었는지 — 화면에서 한 줄 사유로 보여준다. */
export type StoreExecutionReason =
  | 'TABLET_INACTIVE'
  | 'TABLET_NO_SCREEN_SET'
  | 'TABLET_NO_LOCATION'
  | 'QR_INACTIVE'
  | 'QR_NO_PLACEMENT'
  | 'QR_MULTIPLE_PLACEMENT'
  | 'QR_NOT_LANDABLE';

export const STORE_EXECUTION_REASON_LABELS: Record<StoreExecutionReason, string> = {
  TABLET_INACTIVE: '태블릿이 중지 상태입니다',
  TABLET_NO_SCREEN_SET: '표시할 화면 세트가 지정되지 않았습니다',
  TABLET_NO_LOCATION: '설치 위치가 입력되지 않았습니다',
  QR_INACTIVE: 'QR 이 비활성 상태입니다',
  QR_NO_PLACEMENT: '사용 중인 배치가 없습니다',
  QR_MULTIPLE_PLACEMENT: '여러 곳에 동시에 배치되어 있습니다',
  QR_NOT_LANDABLE: '연결 대상이 열리지 않는 상태입니다',
};

// ─────────────────────────────────────────────────────────────────────────────
// 입력 계약 — 서비스가 정규화해서 주입한다
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 태블릿 입력.
 *
 * 필드 이름은 `@o4o/tablet-screen-set-editor` 의 `TabletCornerItem` 과 같은 축이다.
 * 다만 `@o4o/store-ui-core` 는 그 패키지에 의존하지 않으므로(계층 계약) 타입을
 * import 하지 않고 서비스가 값을 넘긴다. 서비스 쪽에서는 그대로 넘기면 된다.
 *
 * 코너 ≡ 태블릿 1대 라는 기존 계약을 그대로 따른다.
 */
export interface StoreExecutionTabletInput {
  id: string;
  name: string;
  /** 자유 문자열. 프로덕션에는 한글 코너명 · 격자코드(A-2) · 의미 없는 값이 섞여 있다. */
  location?: string | null;
  /** `undefined` 는 "모름" 이 아니라 활성으로 본다(기존 `isTabletActive` 계약과 동일). */
  isActive?: boolean;
  currentScreenSetId?: string | null;
}

/**
 * QR 입력. `StoreQrOperationItem`(canonical QR 어휘)의 부분집합이라
 * 서비스는 목록 응답을 그대로 넘겨도 된다.
 */
export interface StoreExecutionQrInput {
  id: string;
  title: string;
  slug?: string | null;
  isActive?: boolean;
  scanCount?: number;
  landable?: boolean;
  screenSetStatus?: string | null;
  /** `null` = 활성 배치 0, `'MULTIPLE'` = 2곳 이상. */
  primaryPlacement?: string | null;
  activePlacementCount?: number;
  /**
   * 명시적 코너 참조(`store_qr_placements.corner_ref`).
   * 값이 있으면 태블릿 id 와 **완전 일치**할 때만 그 코너에 묶는다.
   */
  cornerRef?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 정규화된 행
// ─────────────────────────────────────────────────────────────────────────────

export interface StoreExecutionTablet extends StoreExecutionTabletInput {
  status: StoreExecutionStatus;
  reasons: StoreExecutionReason[];
  /** trim 된 위치. 빈 문자열이면 `null`. 묶음 키로 쓰는 값이다. */
  locationKey: string | null;
}

export interface StoreExecutionQr extends StoreExecutionQrInput {
  status: StoreExecutionStatus;
  reasons: StoreExecutionReason[];
  /** 활성 배치 수. 입력이 없으면 primaryPlacement 로부터 보수적으로 추정한다. */
  placementCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 상태 판정
// ─────────────────────────────────────────────────────────────────────────────

function trimOrNull(v?: string | null): string | null {
  const t = (v ?? '').trim();
  return t.length > 0 ? t : null;
}

/**
 * 태블릿 상태.
 *
 * 중지(비활성)가 최우선이다 — 꺼진 태블릿에 화면 세트가 없다고 "미설정" 이라 부르면
 * 경영자가 할 일을 잘못 안내하게 된다.
 */
export function resolveTabletExecutionStatus(t: StoreExecutionTabletInput): {
  status: StoreExecutionStatus;
  reasons: StoreExecutionReason[];
} {
  const reasons: StoreExecutionReason[] = [];
  if (!trimOrNull(t.location)) reasons.push('TABLET_NO_LOCATION');

  if (t.isActive === false) {
    reasons.unshift('TABLET_INACTIVE');
    return { status: 'stopped', reasons };
  }
  if (!trimOrNull(t.currentScreenSetId)) {
    reasons.unshift('TABLET_NO_SCREEN_SET');
    return { status: 'unset', reasons };
  }
  if (reasons.includes('TABLET_NO_LOCATION')) {
    return { status: 'unset', reasons };
  }
  return { status: 'ok', reasons };
}

/**
 * QR 상태.
 *
 * 판정 순서에 의미가 있다.
 *  1. **확인 필요** — 배치가 2곳 이상(`MULTIPLE`)이거나, 활성인데 연결 대상이 열리지 않는다.
 *     둘 다 사람이 보고 결정해야 하는 **모순** 이므로 절대 '정상' 으로 접지 않는다.
 *  2. **중지** — 경영자가 끈 상태.
 *  3. **미설정** — 만들어졌지만 아직 어디에도 배치되지 않았다("만들었다" ≠ "쓰고 있다").
 *  4. **정상**
 */
export function resolveQrExecutionStatus(q: StoreExecutionQrInput): {
  status: StoreExecutionStatus;
  reasons: StoreExecutionReason[];
  placementCount: number;
} {
  const primary = trimOrNull(q.primaryPlacement);
  const explicitCount = typeof q.activePlacementCount === 'number' ? q.activePlacementCount : null;
  const placementCount =
    explicitCount !== null ? explicitCount : primary === null ? 0 : primary === 'MULTIPLE' ? 2 : 1;

  const reasons: StoreExecutionReason[] = [];
  const ambiguous = primary === 'MULTIPLE' || placementCount > 1;
  const active = q.isActive !== false;
  const landable = q.landable ?? (active && q.screenSetStatus !== 'archived');

  if (ambiguous) reasons.push('QR_MULTIPLE_PLACEMENT');
  if (active && !landable) reasons.push('QR_NOT_LANDABLE');
  if (reasons.length > 0) return { status: 'attention', reasons, placementCount };

  if (!active) return { status: 'stopped', reasons: ['QR_INACTIVE'], placementCount };
  if (placementCount === 0) return { status: 'unset', reasons: ['QR_NO_PLACEMENT'], placementCount };
  return { status: 'ok', reasons, placementCount };
}

export function normalizeExecutionTablet(t: StoreExecutionTabletInput): StoreExecutionTablet {
  const { status, reasons } = resolveTabletExecutionStatus(t);
  return { ...t, status, reasons, locationKey: trimOrNull(t.location) };
}

export function normalizeExecutionQr(q: StoreExecutionQrInput): StoreExecutionQr {
  const { status, reasons, placementCount } = resolveQrExecutionStatus(q);
  return { ...q, status, reasons, placementCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// 위치 묶음
// ─────────────────────────────────────────────────────────────────────────────

export type StoreExecutionGroupKind =
  /** 위치 문자열이 있는 실제 매장 코너. */
  | 'corner'
  /** 위치가 비어 있는 태블릿 모음 — 정상 코너로 섞지 않는다. */
  | 'tablet-unlocated'
  /** 활성 배치가 없거나 위치를 단정할 수 없는 QR 모음 — 정상 코너로 섞지 않는다. */
  | 'qr-unplaced';

export const STORE_EXECUTION_GROUP_LABELS: Record<
  Exclude<StoreExecutionGroupKind, 'corner'>,
  string
> = {
  'tablet-unlocated': '위치 미설정',
  'qr-unplaced': '미배치 QR',
};

export interface StoreExecutionGroup {
  key: string;
  label: string;
  kind: StoreExecutionGroupKind;
  tablets: StoreExecutionTablet[];
  qrs: StoreExecutionQr[];
  /** 이 묶음에서 유일하게 실측된 수치 — QR scan 합계. 태블릿 노출수는 존재하지 않는다. */
  scanCount: number;
  /** 구성원 중 가장 심각한 상태. `statusCounts` 를 함께 보여주는 것을 전제로 한다. */
  status: StoreExecutionStatus;
  statusCounts: Record<StoreExecutionStatus, number>;
}

const emptyStatusCounts = (): Record<StoreExecutionStatus, number> => ({
  ok: 0,
  unset: 0,
  stopped: 0,
  attention: 0,
});

/**
 * 태블릿 · QR 을 매장 위치로 묶는다.
 *
 * **묶이는 경로는 둘뿐이다.**
 *  - `qr.cornerRef` 가 태블릿 id 와 완전 일치
 *  - `qr.primaryPlacement` trim 값이 태블릿 `location` trim 값과 완전 일치
 *
 * 대소문자 접기 · 공백 제거 · 유사어 사전 · 부분 일치는 쓰지 않는다.
 * 프로덕션 위치 값은 한글 코너명 · 격자코드 · 의미 없는 값이 섞여 있어서,
 * 추측으로 묶으면 "저 코너에 저게 있다" 는 **틀린 사실**을 화면이 단언하게 된다.
 */
export function groupStoreExecution(
  tabletsInput: StoreExecutionTabletInput[],
  qrsInput: StoreExecutionQrInput[],
): StoreExecutionGroup[] {
  const tablets = tabletsInput.map(normalizeExecutionTablet);
  const qrs = qrsInput.map(normalizeExecutionQr);

  const corners = new Map<string, StoreExecutionGroup>();
  const ensureCorner = (label: string): StoreExecutionGroup => {
    const existing = corners.get(label);
    if (existing) return existing;
    const created: StoreExecutionGroup = {
      key: `corner:${label}`,
      label,
      kind: 'corner',
      tablets: [],
      qrs: [],
      scanCount: 0,
      status: 'ok',
      statusCounts: emptyStatusCounts(),
    };
    corners.set(label, created);
    return created;
  };

  const unlocatedTablets: StoreExecutionTablet[] = [];
  const tabletById = new Map<string, StoreExecutionTablet>();

  for (const t of tablets) {
    tabletById.set(t.id, t);
    if (t.locationKey) ensureCorner(t.locationKey).tablets.push(t);
    else unlocatedTablets.push(t);
  }

  const unplacedQrs: StoreExecutionQr[] = [];

  for (const q of qrs) {
    if (q.placementCount === 0) {
      unplacedQrs.push(q);
      continue;
    }
    // 경로 1 — 명시적 코너 참조
    const ref = trimOrNull(q.cornerRef);
    const refTablet = ref ? tabletById.get(ref) : undefined;
    if (refTablet?.locationKey) {
      ensureCorner(refTablet.locationKey).qrs.push(q);
      continue;
    }
    // 경로 2 — 위치 문자열 완전 일치
    const placement = trimOrNull(q.primaryPlacement);
    const matched = placement && placement !== 'MULTIPLE' ? corners.get(placement) : undefined;
    if (matched) {
      matched.qrs.push(q);
      continue;
    }
    // 배치는 있으나 어느 코너인지 단정할 수 없다 → 추측하지 않고 미배치 묶음으로 보낸다.
    unplacedQrs.push(q);
  }

  const groups: StoreExecutionGroup[] = [...corners.values()];
  groups.sort((a, b) => a.label.localeCompare(b.label, 'ko'));

  if (unlocatedTablets.length > 0) {
    groups.push({
      key: 'tablet-unlocated',
      label: STORE_EXECUTION_GROUP_LABELS['tablet-unlocated'],
      kind: 'tablet-unlocated',
      tablets: unlocatedTablets,
      qrs: [],
      scanCount: 0,
      status: 'ok',
      statusCounts: emptyStatusCounts(),
    });
  }
  if (unplacedQrs.length > 0) {
    groups.push({
      key: 'qr-unplaced',
      label: STORE_EXECUTION_GROUP_LABELS['qr-unplaced'],
      kind: 'qr-unplaced',
      tablets: [],
      qrs: unplacedQrs,
      scanCount: 0,
      status: 'ok',
      statusCounts: emptyStatusCounts(),
    });
  }

  for (const g of groups) {
    let scanCount = 0;
    let worst: StoreExecutionStatus = 'ok';
    const counts = emptyStatusCounts();
    const bump = (s: StoreExecutionStatus) => {
      counts[s] += 1;
      if (STORE_EXECUTION_STATUS_SEVERITY[s] > STORE_EXECUTION_STATUS_SEVERITY[worst]) worst = s;
    };
    for (const t of g.tablets) bump(t.status);
    for (const q of g.qrs) {
      bump(q.status);
      scanCount += q.scanCount ?? 0;
    }
    g.scanCount = scanCount;
    g.status = worst;
    g.statusCounts = counts;
  }

  return groups;
}

// ─────────────────────────────────────────────────────────────────────────────
// 요약
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 실행 홈 상단 요약.
 *
 * 노출 지표는 **셀 수 있는 것 + QR scan** 뿐이다. 태블릿 노출수 · 도달률 ·
 * 재생수처럼 측정 수단이 없는 값은 만들지 않는다(설계 불변식 3).
 */
export interface StoreExecutionSummary {
  cornerCount: number;
  tabletTotal: number;
  /** 활성 + 화면 세트 지정 + 위치 입력 = 지금 실제로 어딘가에서 무언가를 보여주는 태블릿. */
  tabletInUse: number;
  tabletUnlocated: number;
  qrTotal: number;
  /** 활성 배치가 1곳 이상인 QR. */
  qrPlaced: number;
  qrUnplaced: number;
  /** 배치가 2곳 이상이라 위치를 단정할 수 없는 QR. */
  qrAmbiguous: number;
  /** 실측 스캔 합계 — 유일한 실측 지표. */
  scanTotal: number;
  statusCounts: Record<StoreExecutionStatus, number>;
}

export function summarizeStoreExecution(groups: StoreExecutionGroup[]): StoreExecutionSummary {
  const statusCounts = emptyStatusCounts();
  let tabletTotal = 0;
  let tabletInUse = 0;
  let tabletUnlocated = 0;
  let qrTotal = 0;
  let qrPlaced = 0;
  let qrUnplaced = 0;
  let qrAmbiguous = 0;
  let scanTotal = 0;

  for (const g of groups) {
    for (const t of g.tablets) {
      tabletTotal += 1;
      statusCounts[t.status] += 1;
      if (t.status === 'ok') tabletInUse += 1;
      if (!t.locationKey) tabletUnlocated += 1;
    }
    for (const q of g.qrs) {
      qrTotal += 1;
      statusCounts[q.status] += 1;
      if (q.placementCount > 0) qrPlaced += 1;
      else qrUnplaced += 1;
      if (q.placementCount > 1 || q.primaryPlacement === 'MULTIPLE') qrAmbiguous += 1;
      scanTotal += q.scanCount ?? 0;
    }
  }

  return {
    cornerCount: groups.filter((g) => g.kind === 'corner').length,
    tabletTotal,
    tabletInUse,
    tabletUnlocated,
    qrTotal,
    qrPlaced,
    qrUnplaced,
    qrAmbiguous,
    scanTotal,
    statusCounts,
  };
}
