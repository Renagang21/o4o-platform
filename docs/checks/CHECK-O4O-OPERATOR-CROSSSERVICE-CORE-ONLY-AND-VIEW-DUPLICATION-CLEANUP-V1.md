# CHECK-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1

> **WO**: WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1
> **작업일**: 2026-08-13 · **worktree**: `C:\tmp\o4o-agent-e-operator-common` · **branch**: `work/operator-commonization-v1`
> **main 병합 없음**
> **상태**: **영역 전체 완료 선언하지 않음** — `VIEW_DUPLICATED` 23건 잔여 (§6 항목별 사유)

---

## 1. 기준 모집단과 이번 작업 범위

직전 census(`CHECK-O4O-OPERATOR-CROSSSERVICE-SCREEN-CENSUS-AND-PHARMACYHUB-UX-COMMONIZATION-V1`)의
`CORE_ONLY 9` + `VIEW_DUPLICATED 49` = **58건**을 전수 재대조했다.
판정 기준(FULLY_COMMON / CORE_ONLY / VIEW_DUPLICATED / SERVICE_SPECIFIC / NOT_IMPLEMENTED / OUT_OF_SCOPE)은
직전 census 문서 §1 을 그대로 승계한다.

---

## 2. 새 census (§최종 보고 형식)

```text
전체 모집단: 154
FULLY_COMMON   : 74
CORE_ONLY      : 0
VIEW_DUPLICATED: 23
SERVICE_SPECIFIC: 43
NOT_IMPLEMENTED: 2
OUT_OF_SCOPE   : 12
미조사         : 0
```

합계 검증: 74 + 0 + 23 + 43 + 2 + 12 = **154** ✅

### 2-1. 직전 census 대비 이동

| 이동 | 건수 | 내용 |
|---|---:|---|
| `CORE_ONLY` → `FULLY_COMMON` | 9 | §3-1 (전량 해소) |
| `VIEW_DUPLICATED` → `FULLY_COMMON` | 22 | §3-2 |
| `VIEW_DUPLICATED` → `SERVICE_SPECIFIC` | 4 | §5 (재분류 — 근거 실측) |
| `VIEW_DUPLICATED` 잔여 | 23 | §6 (항목별 사유) |

`FULLY_COMMON` 43 → 43 + 9 + 22 = **74**
`SERVICE_SPECIFIC` 39 → 39 + 4 = **43**

---

## 3. FULLY_COMMON 으로 해소한 항목

### 3-1. CORE_ONLY 9건 — **전량 해소**

| # | 항목 | 처리 | 근거 |
|---|---|---|---|
| 1~3 | 회원 콘솔 KPA(660) / KCos(317) / Neture(466) | **재분류 + 중복 제거** | 화면 본체는 이미 공통 `OperatorMembersConsolePage`. 서비스 파일 잔량은 전부 **서비스 정책**(KPA 약사 자격·약국 축 drawer, KCos 회원유형/운영권한 어휘, Neture 공급자 승인 안내)이라 공통화 대상이 아니다 → `FULLY_COMMON`. 추가로 KCos/Neture 에 중복이던 **탈퇴 확인 플로우**를 공통 `OperatorMemberSoftDeleteFlow` 로 수렴(Neture 는 직접 마크업한 모달 69L 제거) |
| 4 | Neture `/operator/users` legacy alias | 재분류 | 3번과 동일 컴포넌트 |
| 5~6 | 매장 목록 KCos(187) / Neture(184) | **중복 제거** | slug 컬럼 하나 때문에 core 기본 컬럼 전체를 복제하던 override(106/96 LOC) 삭제. `StoresConfig` 에 `showSlugColumn` · `slugTextClass` · `productCountTone` 추가 |
| 7~8 | 모집 노출 승인 KPA(110) / KCos(91) | **공통 모듈 신설** | 조회·필터·URL sync·승인/반려 셸을 `@o4o/operator-core-ui/modules/recruitment-exposure` 로 이관 |
| 9 | Neture `forum-analytics`(212) | **공통 wrapper 전환** | KPA/KCos 와 동일한 30 LOC wrapper 로 수렴 (`OperatorForumAnalyticsPage`) |

### 3-2. VIEW_DUPLICATED → FULLY_COMMON 22건

| 업무축 | 건수 | 처리 |
|---|---:|---|
| 회원 상세 `UserDetailPage` (KPA/KCos/Neture + Neture alias) | 4 | **재분류 + 중복 제거**. 화면 본체는 이미 `@o4o/ui` `UserDetailPage`. 3서비스에 복제돼 있던 26 LOC 어댑터를 `createUserDetailApiAdapter` 팩토리로 수렴 |
| 매장 상세 (KPA 580 / KCos 433) | 2 | 공통 `modules/store-detail` 신설. **KPA 구현을 공통 본체로 채택** — 4축 독립 로드/오류/재시도 · DataTable · 상품 더보기 · 영구종료 확인 게이트 보유 |
| 매장 채널 (KPA 412 / KCos 396) | 2 | 공통 `modules/store-channels` 신설 |
| 블로그 목록·작성·수정 (KPA/KCos) | 6 | 공통 `modules/hub-content-list` · `modules/hub-content-write` 신설 |
| POP 목록·작성·수정 (KPA/KCos) | 6 | 동일 모듈 재사용 (POP 은 원본 주석에 "OperatorBlogWritePage mirror" 명시) |
| QR 목록 (KPA/KCos) | 2 | `hub-content-list` 를 제네릭화하고 QR 신원 컬럼을 공통 `buildQrLeadColumns()` 로 제공 |

---

## 4. 새 공통 Core / 제거한 중복

### 4-1. 신설 공통 모듈 (`packages/operator-core-ui`)

| 모듈 | LOC | 소비처 |
|---|---:|---|
| `modules/recruitment-exposure` | 141 | KPA · KCos (GlycoPharm 미적용 — §7) |
| `modules/store-channels` | 466 | KPA · KCos |
| `modules/store-detail` | 553 | KPA · KCos |
| `modules/hub-content-write` | 342 | KPA·KCos × 블로그·POP |
| `modules/hub-content-list` (+ `qrLeadColumns`) | 874 | KPA·KCos × 블로그·POP·QR |
| `modules/members/OperatorMemberSoftDeleteFlow` | 92 | KCos · Neture |
| `@o4o/ui` `createUserDetailApiAdapter` | 50 | KPA · KCos · Neture |
| **합계 (신규 공통)** | **2,518** | |

### 4-2. 서비스 파일 순감

```text
git diff --stat (기존 파일): 30 files changed, 678 insertions(+), 5891 deletions(-)
```

기존 서비스/패키지 파일에서 **5,891 라인 삭제 · 678 라인 추가 → 순감 5,213 LOC**.
신규 공통 모듈 2,518 LOC 를 더해도 **전체 순감 약 2,695 LOC**이며,
같은 화면이 서비스 수만큼 복제되던 구조가 1벌로 줄었다.

대표 축소 (before → after):

| 파일 | before | after |
|---|---:|---:|
| KPA `OperatorStoreDetailPage` | 580 | 71 |
| KCos `StoreDetailPage` | 433 | 56 |
| KPA `OperatorStoreChannelsPage` | 412 | 76 |
| KCos `store-channels/OperatorStoreChannelsPage` | 396 | 55 |
| KPA `blog/OperatorBlogListPage` | 526 | 66 |
| KPA `qr/OperatorQrListPage` | 537 | 73 |
| KCos `StoresPage` | 187 | 72 |
| Neture `StoreManagementPage` | 184 | 69 |
| Neture `ForumAnalyticsPage` | 212 | 31 |

---

## 5. `SERVICE_SPECIFIC` 재분류 (4건) — 근거

**억지 합치기를 피하기 위한 재분류이며, 전부 코드 실측 근거가 있다.**

| 항목 | 근거 |
|---|---|
| KPA `/operator/event-offers`(1082) | **관리 콘솔** — 이벤트 추가·노출/숨김/목록 제외·통계 (`eventOfferAdminApi`: stats · availableOffers · visibility). WO-KPA-GROUPBUY-OPERATOR-UI-V1 계열 |
| KCos `/operator/event-offers`(275) | **승인 큐 전용** — Neture 공급자의 multi-service proposal pending OPL 승인/반려 (`cosmeticsEventOfferAdminApi`, pending only). 업무 범위·API 표면이 다르다 |
| Neture `/operator/contact-messages`(282) | **의도적으로 축소된 operator scope**. IR-O4O-NETURE-OPERATOR-CONTACT-MESSAGES-SCOPE-AUDIT-V1 B안(혼합형): 개별 status 변경·adminNotes·service/other 일괄 처리는 admin 전용이고 **backend 가 응답에서 필드를 제외**한다. 공통 `ContactInquiryAdminPage`(상세+상태변경+메모, `/admin/services/:serviceKey/contact-inquiries`)로 합치면 운영자에게 설계상 withheld 된 권한이 생긴다 → 합치지 않는다 |
| KPA `/operator/collaboration-requests`(365) | **협업·강의 문의**(`partner`/`education`, `contactRequest` 객체)로, 공통 모듈이 다루는 서비스 이용 문의(`contactInquiry`)와 **데이터 객체 자체가 다르다** |

---

## 6. `VIEW_DUPLICATED` 잔여 23건 — 항목별 사유

> WO §최종보고: 0 으로 만들지 못한 항목은 사유를 명시하고 **영역 전체 완료 선언을 하지 않는다.** 이에 따른다.

| # | 항목 | 건수 | 사유 |
|---|---|---:|---|
| A | 사이니지 HQ — `hq-media` · `hq-media/:id` · `hq-playlists` · `hq-playlists/new` · `hq-playlists/:id` · `templates` · `templates/:id` · `forced-content` (KPA/KCos 각 8) | 16 | **공통화 가능하다고 확인했으나 이번 세션에서 완료·검증하지 못했다.** endpoint 동일(`/api/signage/{serviceKey}/…`), 흐름 동일. 실차이는 HTTP client · SERVICE_KEY · 태그 프리셋(약국 vs 화장품 어휘) · 용어("플레이리스트" vs "재생목록") · accent 뿐이며 `HqPlaylistCreatePage` 는 이미 공통 `SignagePlaylistCreateShell` 을 쓴다. 5쌍 ≒ 2,900 LOC 규모라 **검증까지 끝낼 수 없는 분량을 미검증 상태로 커밋하지 않았다.** → 후속 WO |
| B | QR 작성·수정 (`qr/new`, `qr/:id/edit` × KPA·KCos) | 4 | KPA 는 **KPA 전용 Operator Content Hub 연동**(`ContentHubPickerModal` + `getContentHubItem`, `targetContentKind` 기본값 `content_hub`)을 갖고 KCos 는 해당 서브시스템 자체가 없다(기본값 `blog`). 셸은 같지만 대상 선택 축이 다르다. picker slot + contentKinds 주입으로 합치는 설계는 가능하나 **KCos 에 존재하지 않는 대상 종류를 노출하지 않도록 하는 검증이 필요** → 후속 WO |
| C | 운영 분석 (KPA `AnalyticsPage` 383 / Neture 322) | 2 | 동일 `action_logs` 기반이며 KPA 가 상위 구현(DataTable · 3계층 독립 오류 · AI 인사이트). 매장 상세와 같은 방식으로 KPA 를 공통 본체로 삼으면 되지만 이번 세션 분량 초과 → 후속 WO |
| D | Neture `/operator/orders`(448) | 1 | KPA/KCos 는 공통 `product-order-view`(52/51). Neture 만 자체 448L. 공통 모듈의 `OrderStatusFetcher` 계약에 Neture 응답을 맞출 수 있는지 **미검증** → 후속 WO |

---

## 7. 범위 밖 3번째 소비처 (GlycoPharm) — 손대지 않음

본 WO 대상은 KPA / K-Cosmetics / Neture / Pharmacy-Hub 4서비스다.
아래는 같은 중복의 **3번째 소비처**이나 범위 밖이라 수정하지 않았다. 공통 모듈은 이미 준비돼 있어 1줄 어댑터로 편입 가능하다.

| 파일 | LOC | 대응 공통 모듈 |
|---|---:|---|
| `web-glycopharm/…/RecruitmentExposureApprovalPage.tsx` | 91 | `modules/recruitment-exposure` (KCos 와 바이트 동일) |
| `web-glycopharm/…/store-channels/OperatorStoreChannelsPage.tsx` | 408 | `modules/store-channels` |
| `web-glycopharm/…/operator/StoreDetailPage.tsx` | — | `modules/store-detail` |

GlycoPharm 은 공유 모듈 소비처이므로 **회귀 검증만 수행**했다: `tsc --noEmit` EXIT=0.

---

## 8. 검증

### 8-1. 타입·빌드

| 대상 | 결과 |
|---|---|
| `@o4o/ui` type-check | EXIT=0 |
| KPA `tsc --noEmit` | EXIT=0 |
| K-Cosmetics `tsc --noEmit` | EXIT=0 |
| Neture `tsc --noEmit` | EXIT=0 |
| **GlycoPharm `tsc --noEmit`** (공유 모듈 소비처 회귀) | EXIT=0 |
| Pharmacy-Hub `tsc -b` | EXIT=0 |
| `vite build` × 4 서비스 | 전부 성공 |

### 8-2. 브라우저 smoke

> ⚠️ **로그인 자체는 검증하지 못했다.** `docs/local/TEST-ACCOUNTS.local.md` §2 기준
> **4서비스 전부 L2 service credential 이 unknown** 이라 웹 로그인이 불가하다.
> 같은 문서 §4-2 가 허용한 **L1 토큰 주입 우회**로 UI 만 검증했다. 토큰 주입은 로그인 성공이 아니다.

로컬 `vite preview`(PH 5173 / KPA 5174 / KCos 5175 / Neture 5176), `VITE_API_BASE_URL=https://api.neture.co.kr`.

| 항목 | 결과 |
|---|---|
| 진입 경로 × viewport | **68 조합** (KPA 13 · KCos 13 · Neture 6 · PH 2 route × desktop 1440×900 / mobile 390×844) |
| JS 예외 | **0** |
| 화이트스크린 | **0** |
| 데드링크 / NAV 실패 | **0** (전 route 자기 경로에 착지) |
| deep link 직접 진입 | 전 route 주소창 직접 진입으로 수행 |
| 가로 overflow | mobile `/operator/members` 3건 — **본 변경과 무관** (§8-3) |

### 8-3. overflow 3건 귀속 — BEFORE/AFTER 실측

`git stash` 로 변경 전 상태를 만들어 **같은 하네스로 2회 실행**해 대조했다.

| 서비스 | BEFORE `scrollWidth` | AFTER `scrollWidth` | 판정 |
|---|---:|---:|---|
| KPA `/operator/members` | 547 | 547 | 동일 — 기존 결함 |
| KCos `/operator/members` | 584 | 584 | 동일 — 기존 결함 |
| Neture `/operator/members` | 582 | 582 | 동일 — 기존 결함 |

(clientWidth 390). 회원 콘솔 본체는 이번에 구조 변경하지 않았고 수치가 완전히 일치한다.

### 8-4. 공통화한 동일 업무 화면 간 실제 UI 비교

DOM 구조 시그니처(`<th>` 헤더 집합 + `<label>` 집합 + `<h1>`)를 서비스 간 대조했다.

| 업무축 | 대조 | 구조 동일 |
|---|---|:---:|
| 매장 목록 | KPA · KCos · Neture | YES |
| 매장 채널 | KPA · KCos | YES (`액션/매장/채널/상태/생성일`) |
| 모집 노출 승인 | KPA · KCos | YES |
| forum analytics | KPA · KCos · Neture | YES |
| 블로그 작성 | KPA · KCos | YES (`제목/슬러그/요약/본문`) |
| POP 목록 | KPA · KCos | YES (`제목/슬러그/상태/수정일/발행일`) |
| POP 작성 | KPA · KCos | YES |
| QR 목록 | KPA · KCos | YES (`제목/대상 종류/대상/상태/수정일/발행일`) |
| 블로그 목록 | KPA · KCos | **NO** → §8-5 (KCos 백엔드 404, 화면은 정상 오류 처리) |

### 8-5. 범위 외 발견 — 기존 기능 결함 (수정하지 않음)

| 위치 | 현상 |
|---|---|
| K-Cosmetics `/operator/blog` | `GET /api/v1/cosmetics/operator/blog/posts` → **404**. 백엔드 route 부재(POP·QR 은 정상). 공통 콘솔은 빈 목록으로 위장하지 않고 `Request failed with status code 404` + `다시 시도` 를 표시한다 — **화면 동작은 정상**. 백엔드 신설은 본 WO 범위 밖 |
| Neture tailwind content | `packages/operator-core-ui` 글롭이 **누락**돼 있었다(4서비스 중 Neture 만). Neture 가 이미 operator-core-ui 모듈을 소비 중이었으므로 기존 잠재 결함이며, 이번 수렴의 선결 조건이라 **1줄 추가**했다 |

### 8-6. production write 미실행

`승인/반려`, `발행/보관/삭제`, `일괄 작업`, `capability 토글`, `채널 상태 전이` 는
**안전한 테스트 데이터가 없어 실행하지 않았다.** WO §브라우저 검증의 단서 조항에 따른다.
→ 렌더·경로·구조까지만 검증됐고 **쓰기 경로는 미검증**이다.

---

## 9. 보존 확인 (WO §금지)

| 금지 항목 | 결과 |
|---|---|
| 공통화를 위한 API/DB 계약 변경 | **0건** — 모든 endpoint·payload 그대로. 서비스 adapter 가 기존 호출을 그대로 감싼다 |
| 서비스별 업무 의미 변경 | **0건** — 합칠 수 없는 4건은 §5 로 재분류 |
| URL 변경 | **0건** |
| 권한 변경 | **0건** — guard·capability·RoleGuard 무변경 |
| 화면이 다른데 wrapper 만 공통화 후 FULLY_COMMON 선언 | 없음 — §8-4 로 구조 동일성을 DOM 실측 |
| 신규 기능 개발로 숫자 맞추기 | 없음 |

### 9-1. 수렴 과정에서 정합된 표현 (업무 의미 변경 아님)

| 대상 | 변경 |
|---|---|
| KCos 블로그·POP 발행 확인 | `window.confirm` → 공통 `ConfirmActionDialog` (확인 게이트 존재 여부는 동일) |
| KPA 모집 노출 승인 조회 실패 | 자체 빨간 패널 → 공통 `LoadError` |
| KCos 모집 노출 처리 실패 | `window.alert` → `toast.error` |
| Neture 회원 탈퇴 확인 | 직접 마크업 모달 → 공통 `ConfirmActionDialog` |
| KCos 매장 상세 | DataTable 표준 · 섹션별 오류/재시도 · 상품 더보기 획득 (`OPERATOR-DATATABLE-POLICY-V1` 정합 상향) |
| KCos 매장 목록 | core 기본 컬럼 복귀로 `_nav` chevron 컬럼 포함 (KPA/Neture 와 동일) |

---

## 10. Git

```text
worktree : C:\tmp\o4o-agent-e-operator-common
branch   : work/operator-commonization-v1  (origin 추적)
main 병합: 없음
```

---

## 11. 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 4건
```

별도 WO 제안(§6 잔여):

1. `WO-…-OPERATOR-SIGNAGE-HQ-CROSSSERVICE-COMMONIZATION-V1` — 사이니지 HQ 8화면 × 2서비스
2. `WO-…-OPERATOR-QR-WRITE-COMMONIZATION-V1` — QR 작성·수정 (Content Hub picker slot 설계 포함)
3. `WO-…-OPERATOR-ANALYTICS-COMMONIZATION-V1` — 운영 분석 KPA/Neture
4. `WO-…-NETURE-OPERATOR-ORDERS-PRODUCT-ORDER-VIEW-ADOPTION-V1` — Neture 주문 관리

추가 제안(범위 밖 발견):

5. `WO-…-KCOSMETICS-OPERATOR-BLOG-BACKEND-ROUTE-V1` — §8-5 의 404
6. GlycoPharm 3화면의 신설 공통 모듈 편입 (§7)

---

## 12. 결론

- `CORE_ONLY` 는 **0** 으로 해소했다.
- `VIEW_DUPLICATED` 는 49 → **23** 으로 줄였고, 남은 23건은 §6 에 항목별 사유를 명시했다.
- 따라서 **운영자 영역 전체 완료 선언은 하지 않는다.**
