# CHECK-O4O-MY-STORE-HOME-SHORTCUT-GRID-CROSSSERVICE-COMMONIZATION-V1

- **WO**: WO-O4O-MY-STORE-HOME-SHORTCUT-GRID-CROSSSERVICE-COMMONIZATION-V1 — 내 매장 홈 바로가기 그리드 공통화
- **브랜치**: `work/commonization-my-store-shell-parts` (main 병합 없음)
- **작성일**: 2026-08-13
- **상태**: 구현 완료 · 4 서비스 typecheck/build PASS

---

## 1. 조사 — 기존 차이

| 서비스 | 홈 화면 | 바로가기 영역 형태 | 항목 |
|---|---|---|---|
| **PharmacyHub** | `pages/store-owner/HomePage.tsx` | 카드 그리드 (`SHORTCUTS` 상수 + `sm:grid-cols-2 lg:grid-cols-3`) — 아이콘/제목/설명/route | 3 (공급 상품 · 장바구니 · 주문 내역) |
| **KPA** | `pages/pharmacy/StoreHomePage.tsx` | "실행 흐름" 3단계 안에 인라인 `<Link>` **칩** (아이콘+라벨, 설명은 단계 단위) | 7 (1단계 2 · 2단계 1 · 3단계 4) |
| **GlycoPharm** | `pages/store/StoreOverviewPage.tsx` | `@o4o/hub-core` `HubLayout` + `HubSectionDefinition` 카드 (roles·signalKey·QuickAction 포함) | 6 (2 섹션) |
| **K-Cosmetics** | `pages/operator/StoreCockpitPage.tsx` | **바로가기 영역 없음.** 헤더 pill 링크 2개(상품/주문 관리) + 블록별 "전체 보기 →" 문맥 링크 | – |

즉 "아이콘·제목·설명·route 를 가진 바로가기 목록"이라는 동일 구조는 **PharmacyHub(카드)** 와 **KPA(칩)** 두 곳에만 존재했다.

---

## 2. 공통 Core

`packages/store-ui-core/src/components/home/StoreHomeShortcutGrid.tsx` (신규)

- 공통화 대상 = **구조·동작**: 아이콘 / 제목 / 설명 / `to` 또는 `onClick` / `hidden`(미노출) / `disabled`(+`disabledReason` tooltip) / 반응형 wrapping.
- `variant`:
  - `'card'` — 아이콘 박스 + 제목 + 설명 카드 그리드 (PharmacyHub 기존 마크업 그대로)
  - `'chip'` — 아이콘 + 라벨 한 줄 칩, `flex-wrap` (KPA 실행 흐름 기존 마크업 그대로)
- class 문자열은 종전 마크업을 그대로 옮겼고, `className` / `itemClassName` / `iconWrapClassName` / `labelClassName` 로 서비스가 override 할 수 있다.
- 항목이 전부 `hidden` 이면 `null` 을 반환한다(빈 섹션 미노출).
- **의존성 변경 없음** (`react-router-dom` 만 사용). package.json / lockfile 미변경.

`packages/store-ui-core/src/index.ts` — `StoreHomeShortcutGrid` + 타입 3종 export.

---

## 3. 서비스별 config / 유지

| 서비스 | 이번 변경 | 유지 |
|---|---|---|
| **PharmacyHub** | `SHORTCUTS` 를 `StoreHomeShortcutItem[]` 로 타입 정렬(`desc`→`description`, `Icon`→`icon` 엘리먼트), 렌더를 `<StoreHomeShortcutGrid items={SHORTCUTS} />` 로 위임 | 항목 3개·문구·경로·teal accent·2/3열 그리드 |
| **KPA** | 3개 단계의 칩 묶음을 각각 `variant="chip"` + `className="flex flex-wrap gap-2 pl-[30px]"` 로 위임. 미사용이 된 `Link` import 제거 | 실행 흐름 3단계 구조·단계 헤딩/번호/설명·항목 7개·순서·아이콘 색·경로 |
| **GlycoPharm** | **코드 변경 0** | `hub-core` `HubLayout` 카드(roles·signals·QuickAction)는 별도 공통 계층이며 구조가 더 넓다. 본 그리드로 옮기면 레이아웃·기능 손실 → 대상 제외, 회귀만 확인 |
| **K-Cosmetics** | **코드 변경 0** | 바로가기 영역 자체가 없다. 새로 만들면 "신규 메뉴/기능 추가" 금지에 저촉 → 미적용 |

서비스별 바로가기 **개수·형태를 동일화하지 않았다** (카드 3 / 칩 7 / hub 카드 6 / 없음 그대로).

---

## 4. 변경 금지 준수

- 신규 메뉴·기능 추가 없음. 노출 항목·순서·목적지 전부 종전과 동일.
- route · 권한 · API 계약 변경 없음. backend 변경 없음.
- 미구현 route 신규 노출 없음(기존 링크만 이동).
- **DB / migration 변경 없음.**

---

## 5. 검증

| 대상 | typecheck | vite build |
|---|:---:|:---:|
| web-kpa-society | PASS | PASS |
| web-pharmacy-hub | PASS | PASS |
| web-k-cosmetics (회귀) | PASS | PASS |
| web-glycopharm (회귀) | PASS | PASS |

코드 경로 등가성 확인(작업 브랜치 미배포 — 브라우저 smoke 미실행):

| 항목 | 확인 |
|---|---|
| 항목 보존 | PH 3건 · KPA 7건 — 링크 목적지 전수 대조 일치 (`/store-owner/{products,cart,orders}`, `/store/commerce/products`, `/store/handled-products`, `/store/library/contents`, `/store/marketing/signage/playlist`, `/store/commerce/tablet-displays`, `/store/marketing/qr`, `/store/online-sales/settings`) |
| hidden / disabled | 현재 두 서비스 모두 조건부 항목 없음 → 전부 표시. 공통 컴포넌트가 조건을 지원하되 이번에 새 조건을 도입하지 않았다 |
| wrapping | card = `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`(종전 동일) · chip = `flex flex-wrap gap-2 pl-[30px]`(종전 동일) |
| 마크업 | 카드/칩 class 문자열 종전 그대로. 컨테이너 태그만 `div`/`section` → `section`(block 레벨 동일, 시각 변화 없음) |

---

## 6. 변경 파일

```
packages/store-ui-core/src/components/home/StoreHomeShortcutGrid.tsx   (신규)
packages/store-ui-core/src/index.ts                                    (export 추가)
services/web-pharmacy-hub/src/pages/store-owner/HomePage.tsx           (카드 그리드 위임)
services/web-kpa-society/src/pages/pharmacy/StoreHomePage.tsx          (실행 흐름 칩 3묶음 위임)
docs/checks/CHECK-O4O-MY-STORE-HOME-SHORTCUT-GRID-CROSSSERVICE-COMMONIZATION-V1.md (본 문서)
```

K-Cosmetics / GlycoPharm 소스 변경 0건.

## 7. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건.
