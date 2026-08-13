# CHECK — WO-O4O-MY-STORE-TABLET-DISPLAYS-KCOS-GP-COMMONIZATION-V1

- 작업일: 2026-08-13
- 브랜치: `work/commonization-my-store` → remote `work/commonization-my-store-shell-parts` (main 병합 없음)
- 범위: K-Cosmetics / GlycoPharm `StoreTabletDisplaysPage` + 태블릿 진열 관리 흐름

---

## 1. 조사 — 업무 규칙 차이 vs config 차이

`diff -u` 로 두 서비스 페이지·API client 를 직접 대조했다.

### 페이지 (KCos 536L vs GP 600L)

차이는 **단 2가지**였다.

| 차이 | 내용 | 판정 |
|---|---|---|
| import 경로 | `@/services/tabletDisplayApi` vs `@/api/tabletDisplays` | config |
| GP 전용 Idle 미디어 라이브러리 | `fetchIdleLibraryAssets` (store_library_items + o4o_asset_snapshots 병합) → `IdlePlaylistEditor fetchLibraryAssets` | **업무 기능 차이 → 서비스에 유지** |

그 외 마크업·상태·정렬 로직·문구·accent(teal)·뒤로가기 목적지(`/store/commerce/local-products`)는 **문자 단위로 동일**했다.

### API client (KCos 115L vs GP 99L)

- endpoint 가 둘 다 **service prefix 없는 platform-level `/store/tablets/*`** 로 동일하다.
- 타입(`Tablet`, `DisplayItem`, `ProductPool`)·요청·응답 모두 동일하고, 차이는 제네릭 타입 인자를 쓰느냐(`api.get<T>`) 와 `res.data.data` vs `res.data?.data` 표기뿐이다.
- **API client 는 병합하지 않았다** — 각 서비스의 `apiClient`(baseURL·인증)가 다르고 다른 소비처가 있다. Core 는 함수 6개를 adapter 로 주입받는다.

### 원본에 없던 것 (추가하지 않음)

- **검색 · 필터 · 정렬 · pagination: 해당 없음.** 태블릿 목록은 `is_active` 필터 + 첫 항목 자동 선택, 상품 풀은 공급/자체 탭 + 이미 진열된 항목 제외가 전부다.
- **생성 / 삭제 / 복제 / 미리보기: 해당 없음.** 두 서비스 화면에는 태블릿 CRUD 도 preview 도 없다(= KPA 전용 기능).
- **screen-set / tablet-screen-set-editor: 해당 없음.** 두 서비스는 이 화면에서 screen-set 을 다루지 않는다. `@o4o/tablet-kiosk-core` 는 `IdlePlaylistEditor` 하나만 사용한다.
- route/query/router state: 사용처는 `useNavigate` 뒤로가기 1건뿐이다.

---

## 2. 공통 Core 구조 — `@o4o/store-ui-core/components/tablet` (997L, 11 파일)

거대한 단일 컴포넌트가 아니라 재사용 단위로 분리했다.

| 파일 | L | 역할 |
|---|--:|---|
| `types.ts` | 115 | 도메인 타입 + `StoreTabletDisplaysApi` adapter 계약 + labels/accent 기본값 |
| `tabletHelpers.ts` | 101 | `buildDisplayEntries`(상품명 fallback) · `moveEntry` · `removeEntryAt` · `resequenceEntries` · `buildPoolCandidates` · `toDisplaySavePayload` · `hasIdleChanges` · `tabletOptionLabel` |
| `useStoreTabletDisplays.ts` | 194 | tablet 선택 · pool/display/idle 동시 로드 · 선택 · 정렬 · 저장 · toast(3초 자동 해제) · error |
| `TabletStateBlocks.tsx` | 74 | loading(lg/sm) · 태블릿 없음 · error · toast · 변경사항 배지 |
| `TabletProductTypeBadge.tsx` | 21 | 공급/자체 tone — 풀·진열 양쪽 재사용 |
| `TabletSelectorBar.tsx` | 42 | 태블릿 select + 변경사항 배지 |
| `TabletIdlePlaylistSection.tsx` | 54 | Idle 섹션 껍데기 + **편집기 slot** |
| `TabletProductPoolPanel.tsx` | 105 | 좌측 풀(탭·카운트·체크박스·N개 추가) |
| `TabletDisplayListPanel.tsx` | 72 | 우측 진열(순서 이동·제거) |
| `StoreTabletDisplaysView.tsx` | 161 | 화면 본체 조립 |
| `index.ts` | 58 | barrel |

설계 결정 2가지:

1. **Core 는 `@o4o/tablet-kiosk-core` 를 의존하지 않는다.** `IdlePlaylistEditor` 는 `renderIdleEditor` slot 으로 서비스가 주입한다. 덕분에 tablet-kiosk-core 계약 무변경 + `package.json`/lockfile 무변경이 동시에 성립한다.
2. **idle 항목 타입은 제네릭(`TIdleItem`)** 이다. 서비스가 kiosk-core 의 `IdlePlaylistItem` 을 그대로 넘긴다 — Core 가 타입을 재정의해 계약을 흔들지 않는다.

error 블록과 "등록된 태블릿이 없습니다" 블록은 원본대로 **독립 렌더**다(조회 실패를 empty 로 위장하지 않음).

---

## 3. 서비스 adapter 차이 (유지한 것)

| 항목 | K-Cosmetics | GlycoPharm |
|---|---|---|
| API client | `@/services/tabletDisplayApi` | `@/api/tabletDisplays` |
| Idle 편집기 | `IdlePlaylistEditor` 기본 | + `fetchLibraryAssets`(자료함 미디어 병합, GP 전용) |
| accent | teal (기본값) | teal (기본값) |
| 문구 · backTo | 동일(기본값) | 동일(기본값) |

`labels` · `accent` · `headerActions` slot 은 열어 두었으나 두 서비스 모두 기존값이 같아 주입하지 않았다 — 문구·테마를 하나로 **강제**하지 않되 없는 차이를 만들지도 않았다.

---

## 4. KPA / PharmacyHub — 적용하지 않음

| 서비스 | 현재 구조 | 판정 |
|---|---|---|
| **KPA-Society** | `StoreTabletDisplaysPage` 1,877L. 태블릿 CRUD(`createTablet`/`deleteTablet`), `TabletKioskPage` 기반 미리보기 + 매장 slug, `TabletScreenSetManager` + `@o4o/tablet-screen-set-editor`, 코너/화면세트 적용·해제, 운영자 공통 idle 후보 선택, display settings, `handledProductContentApi`, `useLocation` 컨텍스트 | **제외** — screen-set·미리보기·코너 축이 화면의 절반 이상이다. Core 를 강제하면 KPA screen-set 모델이 축소된다(WO 금지 항목) |
| **PharmacyHub** | `TabletsPage` 400L. 모델이 "태블릿 → 화면 세트 저장 → 하나를 적용"이며 상품 풀/진열 항목 개념 자체가 없다. `StoreConnectionNotice`(매장 미연결 409) 전제 | **제외** — 태블릿 모델이 다르다. 흡수하면 signage/screen-set 모델을 왜곡한다 |

두 서비스는 **공통 package 변경에 대한 회귀(typecheck + build) 확인만** 수행했다.

---

## 5. 검증

| 항목 | 결과 |
|---|---|
| `store-ui-core` `tsc --build` | PASS |
| web-k-cosmetics typecheck / vite build | PASS / PASS (24.22s) |
| web-glycopharm typecheck / vite build | PASS / PASS (22.28s) |
| web-kpa-society 회귀 typecheck / build | PASS / PASS (21.36s) |
| web-pharmacy-hub 회귀 typecheck / build | PASS / PASS (14.07s) |
| loading / 태블릿 없음 / error / toast | 원본 마크업 그대로 이관, 정적 등가 확인(`git show HEAD:<file>` 대조) |
| display 목록 · 순서 이동 · 제거 | `moveEntry`/`removeEntryAt` 가 원본과 동일하게 index 재부여 |
| 상태/tone (공급 blue / 자체 amber) | 동일 |
| 액션 목적지 | 뒤로가기 `/store/commerce/local-products` 2서비스 동일 유지 |
| editor 진입 | `IdlePlaylistEditor` 를 서비스가 주입 — props(`items`/`onChange`/`disabled`/GP `fetchLibraryAssets`) 동일 |
| preview 진입 / screen-set 전달값 | **해당 없음** — 두 서비스 화면에 존재하지 않는 기능 |
| API endpoint · payload · response | 동일 (`/store/tablets/*`, 저장 payload `{productType, productId, sortOrder, isVisible}`) |
| 검색·필터·pagination | **해당 없음** — 원본에 없었고 추가하지 않음 |
| desktop/mobile wrapping | `grid-cols-1 lg:grid-cols-2` · `max-h-[400px] overflow-y-auto` 등 반응형 class 원본 동일. 빌드 CSS 에서 teal accent(`bg-teal-600` / `bg-teal-700` / `shadow-teal-600` / `ring-teal-500` / `text-teal-600`) 두 서비스 모두 생성 확인 — 패키지 이동 후에도 Tailwind content 스캔이 유지됨 |
| 브라우저 smoke | **미수행** — 이 브랜치는 main 병합·배포 대상이 아니어서 확인할 배포 화면이 없다. 허위 PASS 를 적지 않는다 |
| 단위 테스트 | 미수행 — 해당 패키지·서비스에 test runner 부재. 도입은 lockfile 변경 = 중지 조건 |

---

## 6. 변경하지 않은 것

`tablet-kiosk-core` · `tablet-screen-set-editor` 계약 · backend · DB · migration · route · permission · API 계약 · `package.json` · lockfile · dependency — **전부 무변경.** frontend 전용 변경이다.

---

## 7. 규모

| | before | after |
|---|--:|--:|
| KCos `StoreTabletDisplaysPage` | 536L | 43L |
| GP `StoreTabletDisplaysPage` | 600L | 110L (GP 전용 idle 미디어 로직 64L 포함) |
| 합계 | **1,136L** | **153L (−983L)** |
| 신규 Core | — | 997L (11 파일) |

---

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
