# IR-O4O-ADMIN-MENU-AND-ROUTE-NEXT-BATCH-SELECTION-V1

> **조사 전용.** 메뉴·route·화면·API·권한·DB·배포 변경 **0건**.
> **목표**: menu-less route 중 "운영자가 메뉴에서 직접 찾아 들어갈 완성된 업무 화면" 만 골라 다음 구현 묶음 3~5개를 확정한다.

---

## 1. 조사 기준

| 항목 | 값 |
|---|---|
| branch | `main` |
| 시작 HEAD | `d5f8bbce0` |
| 조사 일시 | 2026-08-01 |
| 대상 앱 | `apps/admin-dashboard` (`admin.neture.co.kr`) |
| 메뉴 구성 파일 | `apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx` |
| route 구성 파일 | `src/routes/*.routes.tsx` 외 총 **37** 파일 |
| 브라우저 검증 | 프로덕션 read-only (super_admin 1계정) |

### 선행 자료

- `IR-O4O-ADMIN-FRONTEND-IA-WORKFLOW-USABILITY-BASELINE-V1`
- `IR-O4O-ADMIN-ORPHAN-ROUTE-TRIAGE-V1`
- `WO-O4O-ADMIN-MENU-CONNECT-READY-ONLY-V1` (연결 완료 3건)
- `IR-O4O-ADMIN-DEEP-LINK-REFRESH-AUTH-BOOTSTRAP-V1` · `WO-O4O-ADMIN-AUTH-STATUS-ENVELOPE-FIX-V1`

**재선정 제외(이미 연결됨)**: `/admin/platform/hub` · `/admin/store-network` · `/admin/physical-stores`

---

## 2. 현재 현황

| 항목 | 값 |
|---|---:|
| route 선언 파일 | 37 |
| 고유 route path | **347** |
| — 절대경로 route | **232** |
| — 상대(중첩) route | 115 |
| 메뉴 연결 path (leaf) | **44** |
| **menu-less (절대경로)** | **198** |
| — 파라미터 필요 (`:id` 등) | 34 · *메뉴 대상 원천 제외* |
| — 파라미터 없음 | 164 |
| — login·error·test·sample 류 | 6 · *제외* |
| **후보 모집단** | **158** |

> **집계 방식 주의**: 선행 IR 은 좁은 스캔(13 파일 / 223 선언)을 썼고 이번에는 37 파일을 스캔했다.
> 숫자 차이는 **구조 변화가 아니라 스캔 범위 차이**다. 메뉴 44 중 34 만 절대경로 route 집합과 직접 매칭되고
> 나머지 10 은 중첩 라우터의 상대 경로로 선언되어 있다(선행 IR 이 기록한 "route 없는 메뉴 5건" 과 동일한 성질의 오탐).

### 선행 작업 이후 변경 사항

| 항목 | 선행 | 현재 |
|---|---:|---:|
| 메뉴 leaf | 41 | **44** (+3 연결 완료) |
| 중복 route path | 0 | **0** |
| 딥링크·새로고침 | **전부 `/login` 튕김** | **정상** (auth 봉투 수정 반영) |

> 중지 조건 #1(구조 급변) **미해당**. 후보 판정은 **선행 IR 판정을 전제하지 않고** 현재 코드·프로덕션 실측으로 다시 세웠다.

---

## 3. 전체 분류 요약

후보 모집단 158건 중, 선행 triage 가 ACTIVE_ENTRY 로 좁힌 상위 후보 **15건**을 이번에 정밀 검증했다.
나머지는 선행 triage 의 분류를 유지한다(재검증 대상 아님).

| 분류 | 수량 | 의미 |
|---|---:|---|
| **READY** | **4** | 독립 업무 화면 · 파라미터 없음 · API/권한 정상 · 메뉴 연결만으로 사용 가능 |
| **NEEDS_FIX** | **5** | 업무 화면으로 유효하나 API·권한·데이터에 선행 수정 필요 |
| **INTERNAL** | **3** | 상위 허브(`/admin/yaksa`)의 하위 화면 — 메뉴 불필요 |
| **DUPLICATE** | **2** | 기존 메뉴 화면과 역할 중복 |
| **TEST_DEBUG / MOCKUP** | **2** | 목업·진단용 |
| *(미재검증)* | 143 | 선행 triage 분류 유지 (파라미터·상세·비활성 등) |

---

## 4. READY · NEEDS_FIX 후보

| 우선순위 | 화면 | route | 현재 상태 | API·권한 | 권장 메뉴 그룹 | 판정 |
|---:|---|---|---|---|---|---|
| 1 | HUB 콘텐츠 | `/operator/hub-contents` | 실데이터 59건 렌더 · 콘솔 0 | `GET /hub/contents`·`GET /kpa/notices` 200 / `admin·super_admin·operator` | Yaksa (KPA) | **READY** |
| 2 | 콘텐츠 승인 | `/operator/approvals` | 승인 큐 렌더 · 콘솔 0 | `GET /kpa/operator/approvals` 200 / `admin·super_admin·operator` | Yaksa (KPA) | **READY** |
| 3 | 지부/분회 관리자 센터 | `/admin/yaksa` | 카드 6개 허브 렌더 · 콘솔 0 | API 호출 없음(정적 허브) / `yaksa-admin.access` | Yaksa (KPA) | **READY** |
| 4 | 포인트 운영 | `/operator/points` | 지급·차감 폼 + 이력 렌더 · 콘솔 0 | `GET /points/admin/transactions` 200 / `admin·super_admin` | Platform | **READY** (금융 write — §11 확인 필요) |
| 5 | 회원 분류 | `/admin/membership/categories` | 렌더 정상 · 조회/생성 정상 | **수정·토글 경로 double-prefix** / `membership:manage` | Membership | **NEEDS_FIX** |
| 6 | 매장 QR | `/store/qr` | 렌더되나 조회 **404** | 404 · 콘솔 2 | — | NEEDS_FIX |
| 7 | 매장 콘텐츠 | `/store-content` | 렌더되나 조회 **404** | 404 · 콘솔 4 | — | NEEDS_FIX |
| 8 | 주문 관리 | `/admin/orders` | 렌더되나 조회 **403** | 403 · 콘솔 8 | — | NEEDS_FIX |
| 9 | HUB 공지 | `/operator/hub-notices` | **화면 크래시** (`TypeError`) | — · 콘솔 6 | — | NEEDS_FIX |

### 4-1. NEEDS_FIX #5 의 확정 근거 (코드 실측)

`src/pages/membership/categories/CategoryManagement.tsx` — **같은 파일 안에서 접두사가 엇갈린다.**

```
 67:  authClient.api.get('/membership/categories')            ← 정상
141:  authClient.api.post('/membership/categories', payload)   ← 정상
144:  authClient.api.put(`/api/membership/categories/${id}`)   ← ❌ 이중 접두
159:  authClient.api.patch(`/api/membership/categories/${id}`) ← ❌ 이중 접두
```

`authClient.api` 의 baseURL 은 이미 `/api/v1` 이므로 144·159 는 `/api/v1/api/membership/...` 로 나간다.
**조회·생성은 되지만 수정·활성토글은 실패**한다. 프로덕션에 분류 데이터가 0건이라 브라우저 검증만으로는
드러나지 않았고 **코드 대조로 확정**했다.

> 이는 `WO-O4O-ADMIN-API-DOUBLE-PREFIX-FIX-V1` 계열의 **잔여 결함이되 형태가 다르다.**
> 선행 WO 가 처리한 것은 `unifiedApi` 의 선행 `/v1`, 이번 것은 `authClient` 의 선행 `/api` 다.
> 선행 WO 의 점검 대상에 들어가지 않았던 형태이므로 **별도 잔여 건**으로 기록한다.

---

## 5. 다음 구현 묶음 최종 선정 — **4건 + 조건부 1건**

### 선정 ① `/operator/hub-contents` — HUB 콘텐츠

| 항목 | 내용 |
|---|---|
| 컴포넌트 | `src/pages/kpa/HubContentsPage.tsx` (route `platform.routes.tsx:175`) |
| 운영 목적 | KPA Society HUB 에 등록된 공급자·운영자·커뮤니티 자료를 탭별로 통합 조회 |
| 권장 메뉴명 | **HUB 콘텐츠** |
| 권장 그룹·위치 | `Yaksa (KPA)` 그룹, `공급 자산 조회` **바로 위** |
| 직접 진입 | ✅ 진입·새로고침 모두 URL 유지 |
| API·권한 | `GET /hub/contents` · `GET /kpa/notices` **200** / `admin·super_admin·operator` |
| 쓰기 동작 | **없음** (조회 전용) |
| 메뉴 외 필요 변경 | **없음** |
| 선정 이유 | 실데이터 59건이 이미 렌더되는 완성 화면인데 **진입 경로가 URL 뿐**이다. 조회 전용이라 연결 위험이 가장 낮다. |

### 선정 ② `/operator/approvals` — 콘텐츠 승인

| 항목 | 내용 |
|---|---|
| 컴포넌트 | `src/pages/operator/ContentApprovalsPage.tsx` (route `platform.routes.tsx:147`) |
| 운영 목적 | 공급자 자료 제출 · 매장 HUB 공유 요청 · 사이니지 캠페인 요청 승인 |
| 권장 메뉴명 | **콘텐츠 승인** |
| 권장 그룹·위치 | `Yaksa (KPA)` 그룹, `HUB 콘텐츠` 다음 |
| 직접 진입 | ✅ 진입·새로고침 모두 URL 유지 · 콘솔 0 |
| API·권한 | `GET /kpa/operator/approvals` **200** / `admin·super_admin·operator` |
| 쓰기 동작 | 승인·반려 (**정상 업무 동작** · 모달 확인 · `status==='pending'` 행에서만 활성) |
| 메뉴 외 필요 변경 | **없음** |
| 선정 이유 | **업무 흐름의 시작점**(중점 조사 #6). 승인 대기 건은 운영자가 주기적으로 찾아가야 하는데 현재 진입로가 없다. 기존 `Verifications`(회원 신원)·`Submissions`(신상신고)와 **대상 도메인이 다르다.** |

### 선정 ③ `/admin/yaksa` — 지부/분회 관리자 센터

| 항목 | 내용 |
|---|---|
| 컴포넌트 | `src/pages/yaksa-admin/YaksaAdminDashboard.tsx` (route `yaksa.routes.tsx:142`) |
| 운영 목적 | 지부/분회 관리자의 진입 허브 — 회원 승인·신상신고·임원·교육·회비·게시판 6개 카드 |
| 권장 메뉴명 | **지부/분회 관리자 센터** |
| 권장 그룹·위치 | `Yaksa (KPA)` 그룹 **최상단** |
| 직접 진입 | ✅ 진입·새로고침 모두 URL 유지 · 콘솔 0 |
| API·권한 | API 호출 없음(정적 링크 허브) / `yaksa-admin.access` |
| 쓰기 동작 | **없음** (하위 화면이 보유) |
| 메뉴 외 필요 변경 | ⚠️ **기존 `Yaksa (KPA) → /admin/yaksa-hub` 항목 처리 필요** (§5-1) |
| 선정 이유 | 하위 5개 화면의 유일한 정상 진입 허브인데 메뉴에 없다. 허브를 연결하면 하위 화면들이 **자동으로 발견 가능**해져 파급이 가장 크다. |

#### 5-1. ⚠️ 선정 ③ 의 선행 판단 사항 (사용자 결정 필요)

메뉴에 이미 **`Yaksa (KPA) → /admin/yaksa-hub`** 항목이 있으나, 실제 진입하면

```
/admin/yaksa-hub  →  /error/app-disabled?app=yaksa-scheduler
"yaksa-scheduler" 기능은 현재 비활성화되어 있습니다.
```

`/admin/yaksa-hub` 는 `AppRouteGuard appId="yaksa-scheduler"` 로 감싸여 있고(`yaksa.routes.tsx:131-139`)
해당 앱이 비활성 상태다. **기존 메뉴 44건을 전수 확인한 결과 도달 실패는 이 1건뿐**이며 systemic 문제가 아니다.

> **앱 비활성은 데이터·정책 상태이지 코드 결함이 아닐 수 있다.** 따라서 이 조사에서 결론내지 않는다.
> `/admin/yaksa` 를 그대로 추가하면 KPA 성격의 최상위 항목이 2개가 되고 그중 하나는 죽은 링크다.

| 선택지 | 내용 | 비고 |
|---|---|---|
| **A (권장)** | 기존 `Yaksa (KPA)` 항목의 path 를 `/admin/yaksa` 로 **교체** | 죽은 링크 제거 + 신규 연결 동시 해결. 권한 검사 약화 없음 |
| B | `/admin/yaksa` 를 **추가**하고 `/admin/yaksa-hub` 항목은 유지 | 죽은 링크 존치 |
| C | `/admin/yaksa` 추가 + `yaksa-scheduler` 앱 활성화 여부 별도 판단 | 앱 활성화는 운영 정책 결정 |

**A 를 권장하되, 앱 활성화 정책이 걸려 있어 사용자 확인 없이 확정하지 않는다.**

### 선정 ④ `/operator/points` — 포인트 운영

| 항목 | 내용 |
|---|---|
| 컴포넌트 | `src/pages/operator/PointSpendPage.tsx` (route `platform.routes.tsx:157`) |
| 운영 목적 | 사용자 포인트 지급(grant)·차감(spend) 및 거래 이력 조회 |
| 권장 메뉴명 | **포인트 운영** |
| 권장 그룹·위치 | `Platform` 그룹, `Platform Settings` 앞 |
| 직접 진입 | ✅ 진입·새로고침 모두 URL 유지 · 콘솔 0 |
| API·권한 | `GET /points/admin/transactions` **200** / `admin·super_admin` (**operator 의도적 제외** — 백엔드가 `requireAdmin`) |
| 쓰기 동작 | 지급 `POST /points/admin/grant` · 차감 `POST /points/admin/spend` (차감은 확인 모달) |
| 메뉴 외 필요 변경 | **없음** |
| 선정 이유 | 메뉴에 **대응 항목이 전혀 없어**(중점 조사 #2) URL 을 아는 사람만 쓸 수 있다. 구현 완성도는 높다(검증·에러코드 매핑·확인 모달). |

> ⚠️ **사용자 판단 필요**: 금액성 write 화면이다. CLAUDE.md §11 은 **금융을 Admin 영역**으로 규정하므로
> `Platform` 그룹 배치가 맞는지, 별도 그룹이 필요한지는 운영 정책 결정이다. 화면 자체의 준비 상태는 입증되었다.

### 조건부 ⑤ `/admin/membership/categories` — 회원 분류 *(선행 수정 후)*

| 항목 | 내용 |
|---|---|
| 컴포넌트 | `src/pages/membership/categories/CategoryManagement.tsx` (route `yaksa.routes.tsx:78`) |
| 운영 목적 | 회원 분류 및 연회비 설정 관리 (Membership 하위 유일한 미연결 CRUD 화면) |
| 권장 메뉴명 | **회원 분류** |
| 권장 그룹·위치 | `Membership` 그룹, `Verifications` 다음 |
| 직접 진입 | ✅ 진입·새로고침 정상 · 콘솔 0 |
| API·권한 | 조회·생성 정상 / **수정·토글 double-prefix 결함** / `membership:manage` |
| 메뉴 외 필요 변경 | **2줄 수정** (`CategoryManagement.tsx:144`, `:159` 의 `/api` 접두 제거) |
| 선정 이유 | `Membership` 그룹 정합성이 가장 높고 대시보드가 이미 이 화면으로 deep-link(`MembershipDashboard.tsx:483`) 하는데 메뉴만 없다. |

> **연결 전 2줄 수정이 선행되어야 한다.** 수정 없이 연결하면 "메뉴에 보이는데 수정이 안 되는 화면"이 된다.
> 수정을 같은 WO 에 포함할지 분리할지는 §9 참조.

---

## 6. 제외·보류 항목

| 화면·route | 분류 | 제외·보류 이유 | 향후 조건 |
|---|---|---|---|
| `/active-users` | **DUPLICATE + NEEDS_FIX** | 기존 `RBAC Role Assignments → /users` 와 **같은 `GET /v1/users`** 를 호출. "현재 접속자" 라는 이름과 달리 online 필터가 없고 `lastLoginAt` 컬럼만 추가된 사용자 목록이다(**중점 조사 #3 명칭 불일치**). 프로덕션에서 **403 + 콘솔 2**, 총 0명 표시 | 화면 정체성 재정의 후 재검토 |
| `/tools` | **MOCKUP** | 버튼 **18개 중 onClick 은 1개**뿐, API import 0, "시스템 상태" 는 `98.2%`·`2.3GB`·`45ms`·`v1.0.0` **하드코딩**. DB 백업·복원 등 위험해 보이는 버튼이 전부 무동작 | 실기능 구현 후. 현재 연결 시 **허위 기능 노출** |
| `/store/pop` | **HOLD** | 선행 triage 는 READY 였으나 재검증 결과 **목록이 없는 안내 화면**이다. API 호출 0, 3단계 설명 + `/store/pop/create` 이동 버튼뿐 | 목록·조회 구현 후 |
| `/admin/yaksa/members` | **DUPLICATE + INTERNAL** | 기존 `Verifications → /admin/membership/verifications` 와 **동일 백엔드**(`/api/membership/verifications` approve/reject). 또한 "관리자 센터로 돌아가기" 하위 화면 | 상위 허브(선정③)로 진입 |
| `/admin/yaksa/fees` | **INTERNAL** | 하위 화면(back link 존재) · READ ONLY | 상위 허브로 진입 |
| `/admin/yaksa/accounting` | **INTERNAL (구조 결함)** | 하위 화면이나 **상위 허브 카드 6개에 이 링크가 없다**. 현재 URL 로만 도달 가능 | **메뉴가 아니라 허브에 카드 추가**가 옳은 해법 (§9) |
| `/admin/orders` | **NEEDS_FIX** | 조회 **403** · 콘솔 8 | 권한·엔드포인트 정합 후 |
| `/store/qr` · `/store-content` | **NEEDS_FIX** | 조회 **404** | 엔드포인트 정합 후 |
| `/operator/hub-notices` | **NEEDS_FIX(중대)** | 진입 즉시 **`TypeError` 화면 크래시** | 크래시 수정 후 |
| `/admin/services/overview` · 정산 계열 | **HOLD 유지** | 선행 IR 에서 데이터 소스 신뢰성 미확정(거짓 200) | WO 지침대로 HOLD 유지 |
| 파라미터 필요 route 34건 | **INTERNAL** | `:id` 등 필수 파라미터 — 메뉴 대상 원천 제외 | — |

---

## 7. 중복 · legacy · internal 구조

### 7-1. 기존 메뉴와 중복

| 후보 | 기존 메뉴 | 판정 |
|---|---|---|
| `/active-users` | `RBAC Role Assignments → /users` | **진짜 중복** (동일 endpoint) |
| `/admin/yaksa/members` | `Verifications → /admin/membership/verifications` | **진짜 중복** (동일 백엔드 approve/reject) |
| `/operator/hub-contents` | `공급 자산 조회 → /operator/kpa/snapshots` | **중복 아님** — snapshot 강제배포 관리(18건) vs HUB 등록 자료 탭 조회(59건). 실측으로 데이터셋·목적 상이 확인 |
| `/operator/approvals` | `Verifications` · `Submissions` | **중복 아님** — 승인 대상 도메인 상이(콘텐츠/사이니지 vs 회원신원/신상신고) |
| `/admin/membership/categories` | `Membership` · `Members` | **중복 아님** — 형제 화면. Membership 하위 유일한 미연결 CRUD |
| `/operator/points` · `/admin/yaksa/accounting` · `/store/pop` | — | **대응 메뉴 없음** |

### 7-2. legacy · 죽은 링크

- **`Yaksa (KPA) → /admin/yaksa-hub`** — 기존 메뉴 항목이 `/error/app-disabled` 로 귀결(§5-1).
  기존 메뉴 **44건 전수 확인 결과 도달 실패 1건뿐**(43/44 정상) → **고립 사례**.

### 7-3. 상세·등록·편집 route

- 파라미터 필요 34건 + `/admin/yaksa/*` 하위 5건 + `/store/pop/create` 등은 **상위 목록·허브를 통해 진입**해야 한다.
- 메뉴에 넣으면 안 되는 이유: 진입 시 컨텍스트(대상 id/상위 선택)가 없어 **빈 화면 또는 오류**가 되고,
  메뉴가 "업무 단위" 가 아니라 "화면 단위" 로 부풀어 IA 가 무너진다.

---

## 8. read-only 브라우저 검증

15건 전수. **직접 URL 진입 → 새로고침 → 조회 API → 콘솔** 순.

| route | 직접 진입 | 새로고침 | 조회 API | 권한 | 콘솔 | 최종 |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| `/operator/hub-contents` | ✅ | ✅ | 200 | ✅ | 0 | **READY** |
| `/operator/approvals` | ✅ | ✅ | 200 | ✅ | 0 | **READY** |
| `/admin/yaksa` | ✅ | ✅ | (호출없음) | ✅ | 0 | **READY** |
| `/operator/points` | ✅ | ✅ | 200 | ✅ | 0 | **READY** |
| `/admin/membership/categories` | ✅ | ✅ | 200 | ✅ | 0 | NEEDS_FIX *(코드 대조로 확정)* |
| `/admin/yaksa/accounting` | ✅ | ✅ | 200 | ✅ | 0 | INTERNAL |
| `/admin/yaksa/fees` | ✅ | ✅ | 200 | ✅ | 4 | INTERNAL |
| `/admin/yaksa/members` | ✅ | ✅ | 200 | ✅ | 4 | DUPLICATE |
| `/store/pop` | ✅ | ✅ | (호출없음) | ✅ | 0 | HOLD |
| `/tools` | ✅ | ✅ | (호출없음) | ✅ | 0 | MOCKUP |
| `/active-users` | ✅ | ✅ | **403** | ⚠️ | 2 | DUPLICATE |
| `/admin/orders` | ✅ | ✅ | **403** | ⚠️ | 8 | NEEDS_FIX |
| `/store/qr` | ✅ | ✅ | **404** | ✅ | 2 | NEEDS_FIX |
| `/store-content` | ✅ | ✅ | **404** | ✅ | 4 | NEEDS_FIX |
| `/operator/hub-notices` | ✅ | ✅ | — | ✅ | 6 | **크래시** |

**부수 확인**: 15/15 이 새로고침 후 URL 을 유지했다. 선행 IR 시점에는 전부 `/login` 으로 튕겼으므로
`WO-O4O-ADMIN-AUTH-STATUS-ENVELOPE-FIX-V1` 의 효과가 **후보 전 구간에서 재확인**되었다.

> 조회만 수행했다. 생성·수정·삭제·승인·동기화 등 **쓰기 동작은 한 건도 실행하지 않았다.**
> 쓰기 존재 여부는 브라우저가 아니라 **컴포넌트 코드 대조**로 판별했다(중지 조건 #4 회피).

---

## 9. 다음 작업 제안

| 순위 | WO | 범위 | 선행 | 비고 |
|---:|---|---|---|---|
| 1 | **`WO-O4O-ADMIN-MENU-CONNECT-BATCH-2-V1`** | 선정 ①②③④ 메뉴 연결 (파일 1개: `admin-menu.static.tsx`) | §5-1 사용자 결정 | 권한 검사 **불변** |
| 2 | **`WO-O4O-ADMIN-MEMBERSHIP-CATEGORY-API-PREFIX-FIX-V1`** | `CategoryManagement.tsx:144,159` 2줄 + 메뉴 연결 ⑤ | 없음 | 1 과 합쳐도 무방(권장: 분리) |
| 3 | `WO-O4O-ADMIN-YAKSA-ACCOUNTING-HUB-LINK-V1` | 허브에 회계 카드 추가 (메뉴 아님) | 1 | 소규모 |
| 4 | `WO-O4O-ADMIN-HUB-NOTICES-CRASH-FIX-V1` | `/operator/hub-notices` `TypeError` | 없음 | 크래시라 우선순위 높음 |
| 5 | `WO-O4O-ADMIN-ORDERS-STORE-ENDPOINT-FIX-V1` | `/admin/orders` 403 · `/store/qr`·`/store-content` 404 | 없음 | 원인별 분리 가능 |
| 6 | `WO-O4O-ADMIN-DUPLICATE-ROUTE-CLEANUP-V1` | `/active-users`·`/admin/yaksa/members` 정리 | — | **별도 후속** |
| — | `WO-O4O-SERVICE-MONITOR-ERROR-CONTRACT-FIX` | 거짓 200 제거 | — | 기존 미착수 건 |

**의존관계**: 1 ← §5-1 결정. 2·4·5 는 상호 독립. 3 은 1 이후. 6 은 중복 정리라 분리 유지.

---

## 10. 안전성

| 항목 | 값 |
|---|---:|
| 코드 변경 | **0** |
| 메뉴 변경 | **0** |
| route 변경 | **0** |
| DB 변경 | **0** |
| 운영 데이터 변경 | **0** |
| 쓰기 endpoint 실행 | **0** |
| 배포 | **0** |
| 다른 세션 작업물 접촉 | **0** |
| `pnpm-lock.yaml` | 미변경·미포함 |
| 민감정보 기록 | **0** (자격증명은 env 주입, 문서 미기록) |

---

## 11. 최종 판정

### 다음 메뉴 연결 대상 — **4건 확정 + 1건 조건부**

| # | 화면 | route | 권장 메뉴명 | 그룹 | 즉시 구현 |
|---:|---|---|---|---|:--:|
| ① | HUB 콘텐츠 | `/operator/hub-contents` | HUB 콘텐츠 | Yaksa (KPA) | ✅ |
| ② | 콘텐츠 승인 | `/operator/approvals` | 콘텐츠 승인 | Yaksa (KPA) | ✅ |
| ③ | 지부/분회 관리자 센터 | `/admin/yaksa` | 지부/분회 관리자 센터 | Yaksa (KPA) | ⚠️ §5-1 결정 후 |
| ④ | 포인트 운영 | `/operator/points` | 포인트 운영 | Platform | ⚠️ 배치 확인 후 |
| ⑤ | 회원 분류 | `/admin/membership/categories` | 회원 분류 | Membership | ❌ 2줄 수정 선행 |

①②③ 은 모두 KPA 축이라 **한 번에 검증하기 좋은 묶음**이다(선정 원칙 #5).

### 구현 전 사용자 판단이 필요한 항목

1. **§5-1** — 기존 `Yaksa (KPA) → /admin/yaksa-hub` 죽은 링크 처리 (A 교체 / B 존치 / C 앱 활성화). **A 권장.**
2. **선정 ④** — 금액성 write 화면의 메뉴 그룹 배치 (CLAUDE.md §11 금융=Admin).
3. **조건부 ⑤** — 2줄 수정을 배치 WO 에 포함할지 분리할지.

### 후속 WO 권장 명칭

`WO-O4O-ADMIN-MENU-CONNECT-BATCH-2-V1` (주) ·
`WO-O4O-ADMIN-MEMBERSHIP-CATEGORY-API-PREFIX-FIX-V1` (조건부 ⑤)

---

*조사 완료: 2026-08-01 · 코드·DB·배포 변경 0건*
