# IR — O4O Tablet Canonical Common Core Boundary & PharmacyHub Adoption Gap V1

**WO**: `WO-O4O-TABLET-CANONICAL-PRODUCTION-CLOSURE-AND-COMMON-CORE-BOUNDARY-V1` §5~§9
**작성일**: 2026-09-08
**전제**: `CHECK-O4O-TABLET-CANONICAL-PRODUCTION-CLOSURE-V1` = PRODUCTION E2E PASS
**정본**: `docs/baseline/O4O-STORE-CONTENT-AND-EXECUTION-MODEL-V1.md` §4
**성격**: **조사 전용 — 코드 변경 0.** 공통 Core 를 만들지 않는다.

---

## 0. 이번 조사가 뒤집은 전제

WO 는 「@o4o/store-ui-core 의 StoreTabletDisplaysView 가 구세대 모델일 수 있다」를 전제로 뒀다.
실측 결과 그 전제는 맞았고, **그보다 중요한 사실 하나가 더 있다.**

> **백엔드는 이미 4개 서비스 전부 공통이다.**
> `createStoreTabletRoutes` 를 KPA · PharmacyHub · K-Cosmetics · GlycoPharm 이 **모두** 마운트한다.
> 남은 격차는 **프론트엔드 전용**이며, KCos/GP 는 2세대 백엔드를 **이미 갖고도 1세대 화면만 쓴다.**

따라서 이번 공통화는 "백엔드까지 새로 만드는 일" 이 아니라 **프론트 화면을 canonical 로 맞추는 일**이다.

| 서비스 | 공통 tablet 라우터 | Screen Set 저작 UI | 코너 운영 UI | kiosk runtime route |
|---|:---:|:---:|:---:|---|
| **KPA-Society** | ✅ | ✅ (공유 편집기) | ✅ 2탭 | ✅ `/tablet/:slug` · `/kpa/tablet/:slug` |
| **PharmacyHub** | ✅ | ✅ (**같은** 공유 편집기) | △ 단일 목록 | ❌ **없음** |
| K-Cosmetics | ✅ | ❌ | ❌ (1세대 진열) | ✅ `tablet/:slug` |
| GlycoPharm | ✅ | ❌ | ❌ (1세대 진열) | ✅ `store/:pharmacyId/tablet` |

**PharmacyHub 최대 갭 = 화면 세트를 만들고 적용할 수 있는데 그것을 재생할 URL 이 없다.**

---

## 1. 코드 규모 실측

| 위치 | 규모 |
|---|---|
| KPA tablet 프론트 | **6,522L** (`StoreTabletDisplaysPage` 1,891 · `TabletContentLibraryList` 755 · `HubScreenSetLibraryPage` 519 · `PublicScreenSetViewer` 496 · `api/tabletDisplays` 488 · `TabletCornerContentsPanel` 438 · `TabletRequestsPage` 413 · `TabletScreenSetManager` 286 · 외) |
| PharmacyHub tablet 프론트 | **565L** (`TabletsPage` 400 · `pharmacyHubTablet` 165) |
| `@o4o/store-ui-core` tablet | **855L** (1세대 전용) |
| `@o4o/tablet-screen-set-editor` | **1,639L** (KPA · Neture · PharmacyHub **3서비스 공유 중**) |
| `@o4o/tablet-kiosk-core` | **3,686L** (`TabletKioskPage` 2,385 · `IdlePlaylistEditor` 985) |

---

## 2. §5 4층 분류

### A. COMMON_CORE — 공통 추출 본체 후보

| 항목 | 현재 위치 | 비고 |
|---|---|---|
| Tablet 목록 · 등록 · 수정 · 내림(soft delete) | KPA `StoreTabletDisplaysPage` / PH `TabletsPage` | **양쪽 중복** — 같은 API, 다른 화면 |
| 코너(=태블릿) 카드 · "지금 나오는 화면" 표시 | KPA만 | PH 는 목록 행 형태 |
| Screen Set 적용 / 교체 / 해제 | KPA `TabletCornerSwapModal` / PH select | **양쪽 중복** |
| Screen Set 목록 · lifecycle(보관·복원) | KPA `TabletScreenSetManager` / PH 목록 | **양쪽 중복** |
| Screen Set 편집 셸 | **`@o4o/tablet-screen-set-editor`** | **이미 공통 · 3서비스 소비** |
| `product_list` 편집 · `content_list` 편집 · Content picker | 위 편집기 내부 | 이미 공통 |
| preview 계약 (`POST /screen-sets/preview`) | 공통 라우터 | 이미 공통 (프론트 진입만 서비스별) |
| 상품 Content fallback 계약(1→2→3) | 공통 백엔드 resolver | `7971407f0` 에서 단일화 완료 |
| runtime URL 생성·표시 | KPA만 | PH 미보유 |
| screen_set QR bridge 표시 | KPA만 | PH 미보유 |
| 공통 empty / loading / error / store-connection UX | PH `StoreConnectionNotice` 가 더 정돈됨 | **PH → 공통 승격 후보** |

> **주의**: 「Screen Set editor shell」은 **새로 만들 대상이 아니라 이미 있는 자산**이다.
> 공통 Core 는 그것을 **감싸는 운영(B) 층**을 채우는 일이다.

### B. SERVICE_ADAPTER — 서비스에 남길 것

`serviceKey` · API prefix(`/api/v1/{kpa|pharmacy-hub}/store`) · organization/store resolver ·
store connection 상태 해석(409 `STORE_NOT_CONNECTED` / `AMBIGUOUS_STORE_CONNECTION`) ·
product source adapter · 서비스명·용어(약국/매장) · accent 색 · capability flag ·
kiosk route 경로 shape(서비스마다 이미 다름).

### C. COMPATIBILITY — 지금 제거하면 안 되는 것

| 항목 | 근거(프로덕션 실측) |
|---|---|
| `store_tablet_displays` 역할 A(상품 집합) · C(configured) | 살아 있는 2대가 이 경로로만 상품을 얻는다 — E2E `D` 에서 코너별 3상품 노출 실증 |
| `first_active` fallback | `tabletId` 없는 기존 공개 URL 이 이것으로 동작 — E2E `M` PASS |
| legacy idle fallback (`idle_playlist_items`) | 적용 세트 5개 중 3개가 이 소스를 가리킨다 |
| 기존 public URL shape (`/tablet/:slug`, `/qr/:slug`) | 인쇄된 QR·북마크가 존재 |
| `@o4o/store-ui-core` tablet view | KCos/GP 운영 화면 — §3 참조 |

### D. REMOVE_OR_RETIRE — 확장 금지 / 정리 대상

| 항목 | 상태 |
|---|---|
| `product_content` 블록 | **application 계약에서 제거 완료**(`7971407f0`). DB CHECK residue 만 남음 — 범위 밖 |
| `store_tablet_displays.content_id` 선택 UI·계약 | **DEAD**(0행). `7971407f0` 이 1순위 근거에서 분리. UI 는 아직 남아 있을 수 있음 → 공통화 시 미이식 |
| KPA/PH 가 각자 가진 **같은 업무** 화면 (태블릿 목록·적용·세트 목록·lifecycle) | 공통화 대상 — 둘 중 하나를 복제하지 말고 Core 로 흡수 |
| 1세대 UI 중 consumer 0 인 부분 | 현재 없음 — `store-ui-core` 는 KCos/GP 가 실사용 중 |

---

## 3. §6 `@o4o/store-ui-core` Tablet 재판정

### 3-1. 실측 — API 계약이 1세대로 닫혀 있다

`StoreTabletDisplaysApi` 는 **6개 메서드뿐**이고 전부 1세대다.

```text
fetchTablets · fetchProductPool · fetchTabletDisplays · saveTabletDisplays
fetchTabletIdlePlaylist · saveTabletIdlePlaylist
```

`screenSet` / `current_screen_set_id` / `content_list` / preview / QR **문자열이 0회 등장**한다.
즉 **Screen Set 축이 아예 없는 컴포넌트**다.

### 3-2. 최종 판정: **KEEP_AS_LEGACY_CORE**

| 후보 | 채택 | 사유 |
|---|:---:|---|
| KEEP_AS_LEGACY_CORE | **✅** | KCos/GP 운영 화면이며 그 두 서비스는 프로덕션에 screen set 이 **0건**(전량 KPA + service_key NULL). 지금 끊으면 두 서비스의 매장 화면이 사라진다. |
| REPURPOSE | 부분 | `TabletStateBlocks`(empty/loading/error) · `TabletProductTypeBadge` 정도는 신규 Core 가 재사용 가능. 나머지는 1세대 데이터 모델에 결합. |
| REPLACE_BY_CANONICAL_CORE | 보류 | 방향은 맞으나 **이번 회차 범위 밖**(KCos/GP 강제 변경 금지). 백엔드는 이미 준비돼 있어(§0) 후속에서 가능. |

**결론**: 신규 canonical Core 와 **분리 유지**한다. `store-ui-core` tablet 을 canonical 로 승격하지 않는다.

---

## 4. §7 PharmacyHub Adoption Gap

코드 수정 없이 기능 단위로 대조했다. **차이를 새로운 business difference 로 해석하지 않았다.**

| 기능 | KPA | PH | 판정 |
|---|:---:|:---:|---|
| 태블릿 등록·수정·삭제 | ✅ | ✅ | **ADOPT_AS_IS** (같은 API) |
| 코너/위치 개념 | ✅ 카드 UI | △ 목록 행 | **ADOPT_WITH_ADAPTER** (용어만 서비스별) |
| 현재 화면 표시 | ✅ "지금 나오는 화면" | ✅ 세트명 | **ADOPT_AS_IS** |
| Screen Set 목록 | ✅ | ✅ | **ADOPT_AS_IS** |
| Screen Set 생성·편집 | ✅ 공유 편집기 | ✅ **같은 공유 편집기** | **ADOPT_AS_IS** (이미 동일) |
| preview | ✅ | ✅ (편집기 내장) | **ADOPT_AS_IS** |
| apply / swap | ✅ 전용 모달 | ✅ select | **ADOPT_WITH_ADAPTER** |
| **실제 화면 열기(runtime URL)** | ✅ | **❌** | **MISSING_ADOPTION** |
| **kiosk public route** | ✅ `/tablet/:slug` | **❌ route 자체 없음** | **MISSING_ADOPTION (최우선)** |
| `content_list` | ✅ | ✅ (편집기 경유) | **ADOPT_AS_IS** |
| `product_list` | ✅ | ✅ (편집기 경유) | **ADOPT_AS_IS** |
| 상품 상세 fallback(1→2→3) | ✅ | ✅ (공통 백엔드) | **ADOPT_AS_IS** |
| 내 매장 product-linked content | ✅ 링크 UI | ❌ | **MISSING_ADOPTION** |
| idle 편집 | ✅ | ❌ | **MISSING_ADOPTION** |
| screen_set QR | ✅ 생성·표시 | △ `/qr/:slug` 랜딩만 | **MISSING_ADOPTION** (bridge 표시 부재) |
| archive / restore | ✅ | △ archive 만 | **ADOPT_WITH_ADAPTER** |
| 코너 콘텐츠 패널 · 콘텐츠 라이브러리 · HUB 세트 라이브러리 · 세트 요청 | ✅ | ❌ | **MISSING_ADOPTION** |
| store-connection 상태 UX | ❌ | ✅ **PH 가 우수** | **REVERSE_ADOPTION** (PH → 공통) |
| empty / error 상태 | △ | ✅ | **REVERSE_ADOPTION** |

**집계: ADOPT_AS_IS 7 · ADOPT_WITH_ADAPTER 3 · MISSING_ADOPTION 6 · REVERSE_ADOPTION 2 · NOT_APPLICABLE 0**

> PH 전용 중복 구현(REMOVE_PH_DUPLICATE)은 **0건**이다. PH 는 KPA 를 복제하지 않았고
> 공유 편집기를 그대로 주입해 쓴다 — 공통화 저항이 낮다.

---

## 5. §8 공통 Core 추출 설계 — 권장 구조

### 5-1. 기존 패키지 책임 대조

| 패키지 | 책임 | 상태 |
|---|---|---|
| `@o4o/screen-content-core` | 순수 계약(블록 타입·config·정규화) | 유지 |
| `@o4o/tablet-screen-set-editor` | **저작(A)** 셸 — 3서비스 공유 | 유지 · 확장 대상 |
| `@o4o/tablet-kiosk-core` | **런타임(C)** — kiosk 페이지·idle | 유지 |
| `@o4o/store-ui-core` (tablet) | 1세대 진열 화면 | **legacy 분리** |
| **비어 있는 칸** | **운영(B)** — 태블릿 목록·적용·교체·lifecycle·runtime URL·QR bridge | **없음** |

정본 §4 의 A·B·C 중 **A 와 C 는 이미 공통 패키지가 있고, B 만 각 서비스에 흩어져 있다.**

### 5-2. 권장: 신규 패키지 **만들지 않는다**

> **`@o4o/tablet-screen-set-editor` 를 확장한다.** (새 `@o4o/store-tablet-core` 를 만들지 않는다.)

근거:
1. 그 패키지는 이미 KPA·PH·Neture **3서비스가 소비**한다 — 운영(B) 층을 넣으면 소비처가 그대로 얻는다.
2. 새 패키지를 만들면 A(저작)와 B(운영)가 두 패키지로 갈려 **A↔B 경계를 다시 정의**해야 한다.
   현재 편집기는 이미 세트 목록·상태를 다루고 있어 경계가 자연스럽다.
3. `store-ui-core` 에 넣으면 1세대 tablet view 와 한 패키지에 공존해 **세대 혼동이 굳는다**(§3).
4. 중복 패키지 0 원칙 충족.

**단, 패키지명이 `screen-set-editor` 인데 운영 층을 담게 되므로 rename 이 필요할 수 있다.**
rename 은 소비처 3곳 + import 경로 변경이라 **다음 WO 에서 결정**한다(이번 회차에서 확정하지 않는다).

### 5-3. 추출 순서 (다음 WO 용)

```text
1) 운영(B) 층 컴포넌트를 KPA 에서 추출 — 태블릿 목록·코너 카드·적용/교체·lifecycle·runtime URL·QR bridge
2) adapter 계약 정의 — serviceKey · API prefix · 용어 · accent · capability
3) KPA 를 그 Core 소비로 전환 (회귀 0 확인)
4) PH 를 같은 Core 로 전환 + kiosk route 신설 (MISSING_ADOPTION 6건 해소)
5) store-connection·empty/error 는 PH 것을 Core 로 승격(REVERSE_ADOPTION)
```

---

## 6. 선행 해결 필요 — `product_list` CONTRACT_DRIFT

CHECK §6-1 에서 확인된 3경로 3계약을 **공통 Core 추출 전에** 결론내야 한다.
Core 가 이 드리프트를 그대로 흡수하면 4개 서비스로 복제된다.

| 경로 | 현재 | 문제 |
|---|---|---|
| preview | 상품 섹션 생략 | 저작자가 상품 배치를 확인할 수 없다 |
| tablet | 코너 진열 tier | 1세대 의존 유지 |
| QR | 명시 선택만 → 실무상 0건 | 코너 QR 고객이 그 코너 상품을 못 본다 |

해결 후보(택일은 다음 WO):
- **(a)** screen_set QR 이 그 세트를 적용 중인 태블릿을 역참조해 `tabletContext` 를 세운다
  → QR 이 태블릿과 같은 상품 집합을 본다. `store_tablet_displays` 의존은 유지.
- **(b)** 저작 UX 가 `product_list` 명시 선택을 채우도록 유도 → 3경로가 ①로 수렴, 1세대 의존 자연 소멸.
- **(c)** preview 에 태블릿 문맥 선택기를 두어 "어느 코너 기준으로 볼지" 고르게 한다.

**권장 = (b) 를 주 방향, (c) 를 보조로.** (a)는 1세대 의존을 QR 축까지 확대시킨다.

---

## 7. §9 다음 구현 작업 범위

### 권장: **2개 WO**

| WO | 내용 | 사유 |
|:---:|---|---|
| **다음 1** | `product_list` 계약 수렴(§6) + 운영(B) Core 추출 + **KPA 전환** | 드리프트를 안은 채 추출하면 4서비스로 복제된다. 추출과 같은 회차에 정리해야 한다. KPA 전환까지 묶어야 "추출했는데 아무도 안 쓰는" 상태를 피한다. |
| **다음 2** | **PharmacyHub 전환** + kiosk route 신설 + MISSING_ADOPTION 6건 해소 | PH 는 저작 편집기를 이미 공유해 저항이 낮다. 다만 kiosk route 신설은 **신규 공개 URL** 이라 별도 검증(QR 인쇄물 영향 0 확인)이 필요해 분리한다. |

> WO 는 "가능하면 한 WO" 를 권했으나, **`product_list` 드리프트 결론이 선행 조건**이고
> PH kiosk route 는 신규 공개 URL 이라 검증 축이 다르다. 2개로 나누는 편이 안전하다.
> 하나로 묶어야 한다면 **다음 1 + 다음 2 를 순서 고정된 단일 WO 의 Phase 1/2** 로 두는 형태를 권한다.

**KCos/GP adoption 은 그 다음 단계**로 둔다(백엔드는 이미 준비 — §0).

---

## 8. 문서 정합

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건(§7)

선행 census(`IR-O4O-STORE-CONTENT-TABLET-QR-CURRENT-STATE-AND-LEGACY-CENSUS-V1`) 와의 관계:
- §4-1 「공통화가 잘못된 세대를 가리킨다」 → **본 IR §3 이 KEEP_AS_LEGACY_CORE 로 확정**했다.
- §2-1 `product_content` = DEAD → **production 에서 은퇴 확인**(CHECK §3).
- 정정할 판정 없음. 보완만 했으므로 census 본문은 수정하지 않는다.

---

## 9. 종결 판정

| 축 | 상태 |
|---|:---:|
| PRODUCTION E2E | **PASS** (BLOCKED 2건 명시) |
| COMMON CORE BOUNDARY | **CLOSED** (§2 4층 분류 · §5 패키지 구조 확정) |
| PH ADOPTION GAP | **CLOSED** (§4 18항목 전건 판정) |

→ `WO-O4O-TABLET-CANONICAL-PRODUCTION-CLOSURE-AND-COMMON-CORE-BOUNDARY-V1` = **CLOSED**

단, §6 `product_list` CONTRACT_DRIFT 는 **다음 WO 의 선행 조건**으로 이월한다.
