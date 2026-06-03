# IR-O4O-KPA-FORUM-MANAGEMENT-TAB-DECOMPOSITION-V1

> **read-only 조사 (Investigation Report).** 코드/UI/API/DB/route/menu 변경 없음.
> CLAUDE.md 앱 개발 규칙(조사 → 문제확정 → 최소 수정 → 검증 → 종료) 중 **조사 단계만** 수행.

| 항목 | 값 |
|------|------|
| 작성일 | 2026-06-03 |
| 분류 | IR (Investigation, read-only) |
| 대상 서비스 | `web-kpa-society` (operator 포럼 관리) |
| 비교 대상 | GlycoPharm / K-Cosmetics / Neture 공통 콘솔 (`@o4o/operator-core-ui/modules/forum-requests`, `.../forum-delete-requests`) |
| 결론(요약) | **삭제 요청 = A(즉시 수렴 가능)** · **신청 탭 = B/C(분리 가능하나 선행 분해 + 상태머신 차이 해소 필요)** · **포럼 목록 = D(KPA 고유, 별도 유지)** |

---

## 1. 조사 개요

### 1.1 목적

KPA-Society operator 포럼 관리 화면이 현재 **신청 + 카테고리/관리 기능이 결합된 2탭 구조**인지 확인하고,
이 중 "포럼 신청 관리" 기능만 GP/K-Cosmetics/Neture 의 공통 `OperatorForumRequestsConsolePage` 구조로
분리·수렴 가능한지 판정한다.

### 1.2 배경 (공통화 현황)

| 서비스 | 신청 콘솔 | 삭제요청 콘솔 |
|--------|:--------:|:------------:|
| GlycoPharm | ✅ 적용 완료 (wrapper) | ✅ 적용 완료 (wrapper) |
| K-Cosmetics | ✅ 적용 완료 (wrapper) | ✅ 적용 완료 (wrapper) |
| Neture | ✅ 수렴 완료 (batch-client wrapper) | ✅ 수렴 완료 (batch-client wrapper) |
| **KPA** | ❌ **별도 구조 (2탭 결합)** | ⚠️ 별도 구조이나 **공통 콘솔과 거의 동형** |

- 공통 콘솔 모듈은 명시적으로 **"KPA / Neture 는 본 wrapper 범위 외 (도메인 차이 — 별도 IR)"** 로 선언되어 있었고
  ([forum-requests/types.ts:10](../../packages/operator-core-ui/src/modules/forum-requests/types.ts#L10)),
  Neture 는 이후 별도 WO(`WO-O4O-NETURE-FORUM-CONSOLE-CONVERGENCE-APPLY-V1`)로 수렴 완료. **KPA만 미수렴.**

### 1.3 조사 방법

정적 코드 분석 (read-only). 파일/route/menu/API client 직접 열람. 코드 실행·배포·DB 접근 없음.

---

## 2. 사전 git 상태

- 브랜치: `main`
- KPA 관련 modified/staged 파일: **없음** (`git status | grep -i kpa` → 0건)
- working tree 의 변경은 전부 `docs/**` (다른 세션의 IR/CHECK/WO 문서) — 코드 변경 아님.
- 다른 세션 WIP(docs) 와 **충돌 가능성 때문에 `git pull` 은 수행하지 않음** (read-only IR 원칙 + 타 세션 WIP 미접촉).
- 본 IR 은 read-only 이므로 **commit/push 하지 않는다.**

> 결론: KPA 코드 영역 clean. IR 진행에 지장 없음.

---

## 3. 조사 대상 파일 / route / menu / API

### 3.1 KPA operator 포럼 화면 (4종)

| 파일 | 역할 | 규모 |
|------|------|:---:|
| [ForumManagementPage.tsx](../../services/web-kpa-society/src/pages/operator/ForumManagementPage.tsx) | **신청 관리 + 포럼 목록 (2탭 결합)** | **1449 lines** |
| [ForumDeleteRequestsPage.tsx](../../services/web-kpa-society/src/pages/operator/ForumDeleteRequestsPage.tsx) | 포럼 삭제 요청 관리 | 434 lines |
| [ForumAnalyticsDashboard.tsx](../../services/web-kpa-society/src/pages/operator/ForumAnalyticsDashboard.tsx) | 포럼 통계 (조사 범위 외 — 본 IR 무관) | — |
| [OperatorForumPage.tsx](../../services/web-kpa-society/src/pages/operator/OperatorForumPage.tsx) | "포럼 운영" 허브 진입 (조사 범위 외) | — |

### 3.2 API client

- [api/forum.ts](../../services/web-kpa-society/src/api/forum.ts) — `forumOperatorApi` (공통 `/api/v1/forum/operator/*`, `serviceCode=kpa-society`)

### 3.3 route / menu

- route: [routes/OperatorRoutes.tsx](../../services/web-kpa-society/src/routes/OperatorRoutes.tsx)
- menu: [config/operatorMenuGroups.ts](../../services/web-kpa-society/src/config/operatorMenuGroups.ts) (`forum` group)

### 3.4 공통 콘솔 (비교 기준)

- [forum-requests/ForumRequestsConsole.tsx](../../packages/operator-core-ui/src/modules/forum-requests/ForumRequestsConsole.tsx) + [types.ts](../../packages/operator-core-ui/src/modules/forum-requests/types.ts)
- [forum-delete-requests/ForumDeleteRequestsConsole.tsx](../../packages/operator-core-ui/src/modules/forum-delete-requests/ForumDeleteRequestsConsole.tsx) + [types.ts](../../packages/operator-core-ui/src/modules/forum-delete-requests/types.ts)
- 수렴 reference: Neture [ForumManagementPage.tsx](../../services/web-neture/src/pages/operator/ForumManagementPage.tsx), [ForumDeleteRequestsPage.tsx](../../services/web-neture/src/pages/operator/ForumDeleteRequestsPage.tsx)

---

## 4. KPA 포럼 operator route / menu 구조

### 4.1 menu (`forum` group)

```
포럼 운영   → /operator/forum                  (OperatorForumPage)
포럼 관리   → /operator/forum-management        (ForumManagementPage)   ← 신청+목록 2탭
삭제 요청   → /operator/forum-delete-requests   (ForumDeleteRequestsPage)
포럼 분석   → /operator/forum-analytics         (ForumAnalyticsDashboard)
```

(`operatorMenuGroups.ts` 81–89 및 163–169 — 동일 정의 2회. label↔path 매칭 정상.)

### 4.2 route 정합

- 위 4개 menu path 는 모두 `OperatorRoutes.tsx` 에 1:1 라우트 존재 (forum-management:81 / community 우회 없음 / forum-delete-requests:88 / forum-analytics:91 / forum:134).
- **메뉴-route 일치 ✅** (Neture 의 `CHECK ... MENU-ROUTE-MISMATCH PASS` 와 동일 성격, KPA 측도 mismatch 없음).

### 4.3 admin 이중 마운트 여부

- `AdminRoutes.tsx` 에서 `forum` 검색 → **0건.** 포럼 화면은 operator 라우트에만 마운트.
- 과거 `WO-KPA-ADMIN-OPERATOR-MENU-REALIGNMENT-V1` 으로 콘텐츠 CRUD/forum 이 Admin→Operator 이동 완료된 상태와 일치.
- **operator/admin 이중 사용 없음. ✅**

---

## 5. KPA ForumManagementPage 구조 분석

### 5.1 전체 구조: **2탭 단일 파일**

```
ForumManagementPage (1449 lines)
├── activeTab: 'requests' | 'categories'
├── Tab 1 "신청 관리"  (requests)   ← 포럼 생성 요청 심사
└── Tab 2 "포럼 목록"  (categories) ← 활성 포럼(카테고리) 관리   ★ KPA 고유
```

탭 스위처: 833–855. 두 탭의 state·핸들러·컬럼·모달이 **한 파일에 결합**.

### 5.2 사용 컴포넌트 (표준 준수)

`DataTable` · `RowActionMenu` · `ActionBar` · `BaseDetailDrawer` · `BulkResultModal` · `useBatchAction` · `defineActionPolicy`/`buildRowActions`
— 즉, **공통 operator-ux-core 표준은 이미 적용**되어 있음 (raw HTML table 아님).
단, 비활성화/태그수정/하드삭제 **모달은 custom inline 모달** (BaseDetailDrawer 아님, 1193–1446).

### 5.3 탭별 state·API 구분

| 구분 | Tab 1 신청 관리 | Tab 2 포럼 목록 |
|------|----------------|----------------|
| 주 state | `requests`, `selectedRequest`, `selectedRequestIds`, `statusFilter`, `tagFilter` | `categories`, `selectedCatIds`, `selectedCategory`, `deactivateTarget`, `hardDeleteTarget`, `hardDeleteCheck`, `tagEditTarget` |
| API (조회) | `forumOperatorApi.getRequests` | `forumOperatorApi.getCategories` |
| API (액션) | `review` (approve/reject/revision), `createForum`, `recreateForum` | `directDeactivate`, `activate`, `hardDelete`, `getDeleteCheck`, `updateCategory(tags)` |
| 공유 인스턴스 | `useBatchAction()` 1개를 두 탭이 공유 (한 번에 한 bulk) | 동일 |

> **데이터/API 는 신청 탭과 목록 탭이 명확히 분리**되어 있음 (`requests` vs `categories` 엔드포인트가 서로 다름). UI 만 한 파일에 결합.

---

## 6. 신청 탭 기능 분석 (Tab 1)

### 6.1 흐름

- 조회: `getRequests({ status })` → `RequestData[]`
- 단건: row-click / "상세보기" → Drawer → **승인 / 거절 / 보완 요청** (`review`) + **재생성** (`recreateForum`, status=`failed` 한정)
- bulk: ActionBar **승인 / 거절** — `isReviewable` 항목만 대상, **단건 review API fan-out** (`Promise.allSettled` wrap, batch endpoint 미사용)
- 검토 의견 textarea (선택). "승인=즉시 포럼 생성" (`WO-O4O-FORUM-REQUEST-FLOW-SIMPLIFY-V1`).

### 6.2 공통 콘솔과의 동형성 — **부분 동형 (핵심 차이 존재)**

| 항목 | KPA 신청 탭 | 공통 `OperatorForumRequestsConsolePage` | 일치 |
|------|------------|------------------------------------------|:---:|
| 조회 list | `getRequests({status})` | `client.list({status})` | ✅ |
| 단건 review | approve/reject/revision | approve/reject/revision | ✅ |
| **상태 enum** | **7종** `pending·revision_requested·approved·creating·completed·failed·rejected` | **4종** `pending·revision_requested·approved·rejected` | ❌ |
| **recreateForum 액션** | 있음 (`failed` 복구) | **없음** | ❌ |
| 보완 의견 필수 | KPA 신청 탭은 **미강제** (의견 선택) | **강제** (`revision` 시 의견 필수) | ⚠️ |
| bulk approve/reject | fan-out | fan-out (+ optional `batchReview`) | ✅ |
| batch endpoint(requests) | **없음** | optional (없으면 fan-out fallback) | ✅(fallback) |
| 태그·forumType 컬럼 | 표시 (open/closed, tags) | **미표시** | ⚠️ |

**핵심 불일치 2가지:**

1. **상태 머신 차이** — KPA 는 `creating / completed / failed` 를 가진다. 이는
   `WO-FORUM-CREATION-STATE-MACHINE-AND-ORPHAN-ZERO-V1` 의 포럼 생성 상태머신(생성 실패 시 `failed` → `recreate`)을 UI 에 반영한 것.
   공통 콘솔은 4-state 모델로 `failed`/`creating` 및 **재생성 경로를 모른다.**
2. **recreateForum 액션 부재** — 공통 콘솔에 흡수 시 **생성 실패 복구 UX 손실**.

### 6.3 보완 요청 의견 필수 정책

- 공통 콘솔: `action==='revision' && !reviewComment.trim()` → 차단 (canonical 정책, [ForumRequestsConsole.tsx:135](../../packages/operator-core-ui/src/modules/forum-requests/ForumRequestsConsole.tsx#L135)).
- KPA 신청 탭: 보완 시 의견 강제 없음(`handleReview` 가 의견 검증 안 함). **공통 콘솔 적용 시 정책이 오히려 강화됨** → 기능 손실 아님, 오히려 표준 정렬. 적용 가능.

### 6.4 bulk / batch

- KPA 신청 탭은 batch endpoint 가 **없음** → 공통 콘솔의 fan-out fallback 경로로 그대로 동작 가능.
- (참고: 삭제 요청에는 `batchApproveDelete/batchRejectDelete` 가 존재하나, **신청(requests)** 에는 batch 없음.)

---

## 7. 카테고리 / 포럼 관리 기능 분석 (Tab 2 "포럼 목록")

### 7.1 기능

활성 포럼(카테고리) 운영 관리. **KPA 고유 — GP/K-Cosmetics/Neture 어느 서비스에도 대응 화면 없음.**

- 조회: `getCategories()` → `CategoryData[]` (활성/비활성)
- 단건: 태그 수정(`updateCategory`) / 활성화(`activate`) / 비활성화(soft, `directDeactivate`) / **완전 삭제(hard, `hardDelete` + `getDeleteCheck` 가드)**
- bulk: 비활성화 / 활성화 / 완전 삭제 (hard 는 delete-check 통과 항목만 success, 차단 항목 skipped)
- custom 모달 3종: 비활성화 확인 / 태그 수정 / **Hard Delete (delete-check 결과 표시 — postCount·memberCount·ownerCount·blockedReasons·warnings·orphanPostCount)**

### 7.2 신청 관리와의 분리도

- 데이터·API **완전 분리** (`/requests/*` vs `/categories/*`). 공유 자원은 `useBatchAction()` 인스턴스 1개뿐.
- **결합은 "한 파일/한 메뉴" 라는 UI 결합일 뿐, 도메인 결합 아님.**

### 7.3 공통 신청 콘솔 포함 가부

- 공통 `OperatorForumRequestsConsolePage` 는 **신청 리스트 전용** (단일 리스트 + 신청 review).
  카테고리 활성/비활성/하드삭제/태그/`delete-check` 는 **콘솔 책임 범위 밖.**
- **억지 포함 금지.** 포함하면 공통 콘솔이 KPA 전용 카테고리 관리로 오염됨 → `clean-and-simple` 원칙 위배.

---

## 8. 삭제 요청 화면 및 delete-check 흐름 분석

### 8.1 ForumDeleteRequestsPage (삭제 요청)

- `/operator/forum-delete-requests`. **단일 리스트** (탭 없음).
- API: `getDeleteRequests` / `approveDelete` / `rejectDelete` + **`batchApproveDelete` / `batchRejectDelete` (batch endpoint 존재)**.
- DataTable + ActionBar + BulkResultModal + BaseDetailDrawer + **GuideBlock**(`fetchGuidePageContent('kpa-society','forum.request.management')`).
- 데이터 shape `DeleteRequestData` ↔ 공통 `ForumDeleteRequest` **필드 1:1 일치** (name·slug·isActive·postCount·createdBy·creatorName·deleteRequestStatus·deleteRequestedAt·deleteRequestReason·deleteReviewedAt·deleteReviewComment).
- 상태 enum `pending·approved·rejected` — 공통 `ForumDeleteRequestStatus` 와 **완전 동일.**

> **KPA 삭제 요청 화면은 이미 Neture 가 수렴 완료한 wrapper 와 사실상 동형이다.**
> Neture wrapper(batchApprove/batchReject + loadGuideSections 주입)와 동일 패턴으로 **즉시 치환 가능.**

### 8.2 delete-check 흐름

- `getDeleteCheck(id)` 는 **삭제 요청 화면이 아니라 "포럼 목록" 탭의 hard delete 가드**에서만 사용됨
  (ForumManagementPage 의 `openHardDeleteModal` / `handleBulkHardDelete`).
- 즉 **delete-check 는 카테고리 관리(Tab 2) 소속**이며, 공통 삭제요청 콘솔과 **접점 없음 → 충돌 없음.**
- 공통 삭제요청 콘솔로 삭제 **요청** 화면을 수렴해도 delete-check 흐름은 영향받지 않는다 (카테고리 탭에 남음).

---

## 9. API / adapter 차이

### 9.1 신청 (requests)

| 콘솔 호출 | KPA `forumOperatorApi` | adapter 가능 |
|-----------|------------------------|:---:|
| `list({status})` | `getRequests({status})` → `{ data: [] }` | ✅ |
| `review(id,{action,reviewComment})` | `review(id, {...})` → `{ success, error }` | ✅ |
| `batchReview?(ids,action)` | **부재** (fan-out fallback 사용) | ✅(생략) |

응답 shape `{ success, error }` 는 Neture/K-Cos 와 동일 → `res?.success ? {ok:true} : {ok:false,error}` 정규화 그대로 사용 가능.
**단, `recreateForum` / `createForum` / `failed`·`creating`·`completed` 상태는 공통 콘솔 contract 에 없음** (§6.2).

### 9.2 삭제 요청 (delete-requests)

| 콘솔 호출 | KPA `forumOperatorApi` | adapter 가능 |
|-----------|------------------------|:---:|
| `list({status})` | `getDeleteRequests({status})` | ✅ |
| `approve(id,data)` | `approveDelete(id,data)` | ✅ |
| `reject(id,data)` | `rejectDelete(id,data)` | ✅ |
| `batchApprove?(ids,data)` | `batchApproveDelete(ids,reviewComment)` | ✅ |
| `batchReject?(ids,data)` | `batchRejectDelete(ids,reviewComment)` | ✅ |
| `loadGuideSections` | `fetchGuidePageContent` 존재 | ✅ |

→ **삭제 요청은 adapter 차이 0. 누락 메서드 없음.** (Neture wrapper 와 동일 구성.)

---

## 10. GP / K-Cosmetics / Neture 공통 콘솔과의 비교 (총괄표)

| 영역 | KPA 현재 | 공통 콘솔 존재 | 동형성 | 분리 결합도 |
|------|----------|:--------------:|--------|------------|
| **신청 관리** | ForumManagementPage **Tab 1** | ✅ requests 콘솔 | 부분 (상태머신 7 vs 4, recreate) | 2탭 결합 — 분해 필요 |
| **포럼 목록(카테고리)** | ForumManagementPage **Tab 2** | ❌ 대응 없음 | KPA 고유 | 신청과 데이터 분리, UI만 결합 |
| **삭제 요청** | ForumDeleteRequestsPage (단일) | ✅ delete 콘솔 | **거의 완전 동형** | 독립 화면 (분해 불필요) |
| **포럼 분석** | ForumAnalyticsDashboard | ❌ (범위 외) | — | — |

- GP/K-Cos: 신청·삭제 **각각 독립 화면**으로 존재 → wrapper 직접 치환이 쉬웠음.
- Neture: 신청·삭제 각각 독립 화면이었고 batch endpoint 보유 → batch-client wrapper 로 수렴.
- **KPA 차이의 근원**: 신청 화면이 단독이 아니라 **"신청+카테고리 관리"가 한 메뉴(포럼 관리)에 묶여 2탭**으로 구현됨. 이것이 GP/K-Cos/Neture 와 다른 **유일한 구조적 차이**.

---

## 11. 신청 탭 분리 가능성 판정

### 판정: **B (분리 가능하나 선행 분해 필요) + 일부 C (상태머신 차이)**

- **B 근거**: 신청 탭은 데이터/API 가 카테고리 탭과 분리되어 있어 *기술적으로* 별도 화면으로 떼어낼 수 있다.
  단 현재 `/operator/forum-management` 한 화면에 2탭이 묶여 있으므로, 공통 콘솔로 치환하려면
  **route/menu 분해(신청 ↔ 포럼 목록 화면 분리)** 가 선행되어야 한다.
- **C 요소**: 공통 콘솔은 KPA 의 `creating/completed/failed` 상태와 `recreateForum` 복구 액션을 모른다.
  그대로 치환 시 **생성 실패 복구 UX 손실**. 따라서 둘 중 하나가 필요:
  - (C-1) 공통 콘솔에 **선택적 상태/액션 확장**(예: optional `recreate` action + 확장 status map) 추가 후 KPA 수렴, 또는
  - (C-2) KPA 도 "승인=즉시 생성" 단순화가 충분히 안정적이면 `failed/recreate` 경로를 **별도 운영 도구로 분리**하고 신청 콘솔은 4-state 로 수렴.

> 즉 **신청 탭 단독 즉시 수렴(A)은 불가.** 선행 분해(B) + 상태머신 정책 결정(C) 후 가능.

---

## 12. 카테고리 / 관리 기능 분리 필요성

### 판정: **D (KPA 고유 — 별도 화면 유지) + 후속 별도 공통화 후보**

- "포럼 목록"(카테고리 활성/비활성/하드삭제/태그/delete-check)은 **운영 중 기능**이며 mock/TODO 아님(E 아님).
- 공통 신청 콘솔에 **포함 금지** (§7.3).
- 신청 탭을 공통 콘솔로 분리한다면, 카테고리 탭은 **자체 화면(`/operator/forum-categories` 등)으로 떼어내 유지**하는 것이 자연스럽다.
- 향후 다른 서비스에도 동일한 "운영자 활성 포럼 관리" 수요가 생기면, **별도 공통 모듈**(`forum-categories` 콘솔) 후보가 될 수 있으나, **현재는 KPA 단독 → 공통화 대상 아님.**

---

## 13. 공통화 위험 영역

| 위험 | 내용 | 영향도 |
|------|------|:---:|
| 상태머신 손실 | `creating/completed/failed` + `recreateForum` 미반영 → 생성 실패 복구 불가 | **높음** |
| 카테고리 기능 손상 | 신청 콘솔에 카테고리(activate/deactivate/hardDelete/tags) 억지 포함 시 공통 모듈 오염 | 높음 |
| delete-check 흐름 | 카테고리 탭 소속 — 신청/삭제요청 콘솔과 무관 → **손상 위험 없음** | 낮음 |
| route/menu 변경 | 신청↔카테고리 분리 시 `/operator/forum-management` 분해 + 메뉴 항목 조정 필요 | 중 (WO 필수) |
| admin/operator 이중 | 이중 마운트 없음 → 위험 없음 | 없음 |
| live data 영향 | 운영 중 화면(요청/카테고리 모두 실데이터) → 분해 시 회귀 smoke 필수 | 중 |
| 태그/forumType 컬럼 손실 | 공통 콘솔은 태그·공개여부 컬럼 미표시 → 신청 콘솔 컬럼 확장 또는 표시 손실 | 중 |

---

## 14. 후속 WO 후보

> 본 IR 은 조사만. 아래는 **권고**이며 별도 WO 승인 필요.

1. **WO 후보 ①(우선·저위험) — 삭제 요청 콘솔 수렴**
   `KPA ForumDeleteRequestsPage → @o4o/operator-core-ui/modules/forum-delete-requests` thin wrapper 치환.
   Neture wrapper 와 동일 패턴(batchApprove/batchReject + loadGuideSections 주입). 데이터 shape 1:1, 추가 분해 불필요. **A 등급 — 가장 안전한 첫 수렴.**

2. **WO 후보 ②(선행 분해) — ForumManagementPage 2탭 분해**
   `/operator/forum-management`(신청+목록) → **신청 화면 / 포럼 목록 화면**으로 route·menu 분리.
   카테고리 관리는 KPA 자체 화면으로 잔존. (신청 콘솔 수렴의 선행 조건.)

3. **WO 후보 ③(정책 결정 후) — 신청 콘솔 수렴**
   ②완료 후, §11 의 C-1(공통 콘솔에 optional recreate/확장 status 추가) 또는 C-2(상태머신 단순화) 결정에 따라
   신청 화면을 `forum-requests` 콘솔로 수렴. **②·정책결정 전에는 착수 금지.**

4. (참고) 카테고리 콘솔 공통화는 **현 단계 비대상** (KPA 단독 수요).

---

## 15. Current Structure vs O4O Philosophy Conflict Check

> 기준: `CLAUDE.md` §13(O4O 공통 구조 원칙 — forum/lms/signage 는 서비스별이 아니라 플랫폼 공통 구조),
> §13-A(APP 표준화), `O4O-BUSINESS-PHILOSOPHY-V1`(운영 경험 공통화), 그리고 사용자 원칙 `clean-and-simple`.

### 15.1 KPA 구조가 다른 이유 — **도메인 차이 아님, 구현 편차**

- 신청 review / 삭제 요청 흐름 자체는 GP/K-Cos/Neture 와 **동일 도메인**(공통 `/api/v1/forum/operator/*` 사용, KPA 도 동일 엔드포인트).
- 차이의 본질은 **(a) 신청+카테고리를 한 메뉴에 묶은 UI 구현 편차**, **(b) KPA 가 포럼 생성 상태머신(creating/failed/recreate)을 UI 까지 노출**한 점.
- (a)는 순수 **구현 편차** → 공통화 정렬 대상.
- (b)는 **운영 기능 차이**(생성 실패 복구)이나, 이는 *공통 콘솔이 아직 모델링하지 않은* 영역일 뿐 KPA 고유 도메인은 아님 → 공통 콘솔 확장 vs KPA 단순화의 **설계 결정 사항**.

### 15.2 신청 관리만 공통화 — 운영 경험 공통화 원칙 부합 여부

- ✅ 부합. 신청 심사 UX 를 4개 서비스가 동일 콘솔로 통일하면 운영자 경험·유지보수가 일관됨(§13 공통 구조, §13-A APP 표준화 방향).
- 단 **선행 분해(②)와 상태머신 정책(③)** 없이 강행하면 기능 손실 → 원칙(운영 경험 향상)과 **상충**. 순서 준수가 곧 원칙 준수.

### 15.3 카테고리 관리 억지 포함 여부

- ❌ 절대 포함하지 않는다. 카테고리 관리는 신청 콘솔과 **다른 책임**(활성 포럼 운영). 억지 포함은 공통 모듈 오염 = `clean-and-simple` 위배.

### 15.4 KPA 고유 정책과 공통화 경계

| 공통화 가능 (운영 경험 통일) | KPA 고유 유지 |
|------------------------------|----------------|
| 삭제 요청 콘솔 (즉시) | 포럼 목록(카테고리) 관리 — activate/deactivate/hardDelete/tags |
| 신청 심사(approve/reject/revision) — 선행 분해 후 | 포럼 생성 상태머신(creating/failed) + recreate (확장 or 단순화 결정 전까지 KPA 잔존) |
| | delete-check 안전가드 (카테고리 hard delete) |

### 15.5 1인 개발 유지보수성

- ✅ 향상 방향. 4-service 신청/삭제 UX 를 1개 콘솔로 수렴 → 버그 수정·정책 변경 1곳.
- 단 **점진 적용**(①삭제 먼저 → ②분해 → ③신청)이 유지보수성·안전성 모두에 유리. 한 번에 1탭 분해 + 1콘솔 치환 + diff 보고(사용자 `sequential-file-edits` 선호와 일치).

---

## 부록: 최종 보고 요약

- **수정 파일: 없음** (read-only IR)
- **생성 IR 문서**: `docs/investigations/IR-O4O-KPA-FORUM-MANAGEMENT-TAB-DECOMPOSITION-V1.md`
- **조사한 주요 대상**:
  - 화면: KPA `ForumManagementPage`(2탭 1449L), `ForumDeleteRequestsPage`(434L)
  - API: `forumOperatorApi` (requests / categories / delete-requests / delete-check / analytics)
  - route: `OperatorRoutes.tsx` · menu: `operatorMenuGroups.ts`(`forum` group 4항목)
  - 공통 콘솔: `forum-requests`, `forum-delete-requests` 모듈 + Neture/K-Cos wrapper
- **ForumManagementPage 구조 판정**: **신청(Tab1) + 포럼 목록/카테고리(Tab2) 결합 2탭** — 데이터/API 는 분리, UI 만 결합
- **신청 탭 분리 가능성**: **B + 일부 C** — 분리 가능하나 (1) route/menu 선행 분해, (2) 상태머신(creating/failed/recreate) 정책 결정 필요. **즉시 A 불가.**
- **카테고리/관리 기능 분리 필요성**: **D** — KPA 고유, 공통 신청 콘솔 포함 금지, 별도 화면 유지
- **삭제 요청 공통화 가능성**: **A (즉시)** — Neture 수렴 wrapper 와 동형, adapter 차이 0, batch endpoint·guide 보유
- **후속 WO 후보**: ①삭제요청 콘솔 수렴(우선) → ②2탭 분해 → ③신청 콘솔 수렴(정책결정 후)
- **git status**: KPA 코드 변경 없음. working tree 변경은 전부 타 세션 docs. commit/push 미수행.
