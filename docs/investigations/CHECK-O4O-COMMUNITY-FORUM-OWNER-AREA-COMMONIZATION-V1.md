# CHECK-O4O-COMMUNITY-FORUM-OWNER-AREA-COMMONIZATION-V1

**포럼 소유자 영역 공통화 — 내 포럼 대시보드 · 폐쇄형 회원 관리**

- 근거 WO: `WO-O4O-COMMUNITY-FORUM-OWNER-AREA-COMMONIZATION-V1`
- 선행 census: `IR-O4O-COMMUNITY-CROSSSERVICE-FULL-CENSUS-V1` (F31 · F34)
- 브랜치: `work/commonization-community` · 시작 commit `2f7d42943` (main 미병합)
- 성격: **View duplication 제거** (backend 무변경)

---

## 1. 작업 전 기능 × 서비스 재실측표

census 숫자를 그대로 믿지 않고 이 축만 코드에서 다시 실측했다 (`main` 과 브랜치의 owner-area 파일 drift 0 —
차이는 직전 WO 의 GlycoPharm 변경 3파일뿐이라 브랜치 내용으로 실측).

| 기능 | KPA-Society | GlycoPharm | K-Cosmetics | Neture | Pharmacy-Hub |
|---|---|---|---|---|---|
| **내 포럼 대시보드 (F31)** | `/mypage/my-forums` · 285줄 | `/forum/my-dashboard` · 572줄 | `/forum/my-dashboard` · 581줄 | `/supplier/my-forum` · 576줄 | 없음 |
| **폐쇄형 회원 관리 (F34)** | `/mypage/my-forums/:forumId/members` · 381줄 | `/forum/my-dashboard/:forumId/members` · 354줄 | `/forum/my-dashboard/:forumId/members` · 354줄 | **없음** | 없음 |
| 포럼 개설 신청 (F29) | `/forum/request` · 49줄 | `/forum/request-category` · 46줄 | `/forum/request-category` · 48줄 | `/forum/request` 52줄 · `/supplier/forum/request-category` 48줄 | 없음 |
| 내 신청 내역 (F30) | `/mypage/my-requests` · 156줄 | `/mypage/my-requests` 58줄 **+ `/forum/my-requests` 285줄(legacy)** | `/mypage/my-requests` · 63줄 | 없음 | `/join/status` (서비스 가입) |

- **F29 · F30 은 이미 공통 부품 채택 완료** (`ForumRequestForm` · `@o4o/account-ui MyRequestsInbox`) → 본 WO 대상 아님.
- 본 WO 대상 = **F31 + F34 = 7셀 / 3,103줄**.

### 1-1. 상태 모델 · 권한 · action (4서비스 동일 확인)

| 축 | 실측 |
|---|---|
| 소유 포럼 상태 | `isActive` · `postCount` · `forumType('closed')` · `metadata.deleteRequestStatus(pending/approved/rejected)` — 4서비스 동일 |
| 신청 상태 | `pending` / `revision_requested` / `approved` / `rejected` — 4서비스 동일 (KPA 는 화면에서 미사용) |
| 회원 role | `owner` / `member` — 3서비스 동일 |
| owner 판정 | **백엔드** `ForumMembershipService` 소유자 검증. 프런트는 403 을 안내만 함 — 4서비스 동일 |
| action | 정보 수정 / 삭제 요청 / (폐쇄형) 가입 승인 · 거절(+사유) · 회원 삭제 — 동일 |
| 백엔드 계약 | 공통 `ForumDirectoryController` · `ForumMembershipController` 를 각 서비스 prefix 로 mount (census §5) |

즉 **업무 모델이 동일**하다 → WO §10 중지 조건("서로 다른 업무 모델") 미발동.

### 1-2. 실제 차이 (전부 표현·경로·정책 슬롯)

| 차이 | 성격 | 흡수 방법 |
|---|---|---|
| accent (emerald / pink / blue) | 표현 | `theme` (완성 클래스 문자열) |
| basePath (`/forum` vs `/supplier/forum` vs `/mypage/my-forums`) | 경로 | `links` config |
| 레이아웃 (KPA `MyPageLayout`+`MyPageNavigation`, Neture 공급자 셸) | 레이아웃 | 페이지가 감싸기 + `containerClassName` · `navSlot` |
| 이모지 placeholder (💊 / 💄) | 문구 | `emojiPlaceholder` |
| KPA 신청 내역 없음 (통합 신청함 이전) | **정책** | adapter 가 `fetchMyRequests` 미제공 → 섹션 off + `noticeSlot` |
| Neture 회원 관리 없음 | **정책** | `links.memberManageHref` 미주입 → 진입 미노출 |
| API envelope (KPA throw / 나머지 axios `{success,error}`) | 전송 | 공통 adapter factory 가 정규화 |

## 2. 기존 VD 7셀 재검증 결과 — GP ↔ KCos 실제 diff

census 판정("GP↔KCos 회원관리 diff 약 5줄")을 재검증했다.

**`ForumMemberManagementPage` (354줄) — diff 14줄**

| 구분 | 줄 수 | 내용 |
|---|---:|---|
| 직전 WO 로 GP 에만 추가된 주석 | 5 | `WO-...-ISOLATION-FIX-V1` 헤더 (census 시점엔 없었음) |
| 서비스명 주석 | 1 | `(GlycoPharm)` ↔ `(K-Cosmetics)` |
| accent 색 | 8 | `emerald` ↔ `pink` 4곳 (Shield · Loader2 · 배지 · 승인 버튼) |
| **실질 로직 차이** | **0** | — |

→ census 판정 재확인. 직전 WO 주석 5줄을 제외하면 **원래 diff 9줄(주석 1 + 색 8)** 이다.

**`MyForumDashboardPage` (572 / 581줄) — diff 57줄**

| 구분 | 내용 |
|---|---|
| accent 색 | emerald ↔ pink 다수 |
| JSX 섹션 주석 | KCos 에만 `{/* Header */}` 류 7개 |
| **실질 차이** | **1줄** — 이모지 placeholder `예: 💊` ↔ `예: 💄` |

**Neture vs GP 대시보드 — diff 48줄**: basePath 5곳 · 컨테이너 여백 · **회원 관리 링크 블록(8줄) 부재** · 포맷.
→ Neture 는 "폐쇄형 회원 관리 동선 없음" 이 실제 정책 차이임을 확인.

**KPA vs GP 회원관리 — diff 101줄**: 레이아웃 래퍼(`MyPageNavigation`) · API envelope(`{data}` vs `{data.data}`) ·
오류 추출(`err.message` vs `err.response.data.error`) · back link · accent. **업무 로직 차이 0.**

## 3. 추출한 shared View / API adapter

`packages/shared-space-ui/src/forum-owner/` 신설 (barrel 은 `@o4o/shared-space-ui` 로 re-export).

| 파일 | 줄 | 역할 |
|---|---:|---|
| `ForumOwnerDashboard.tsx` | 673 | 내 포럼 대시보드 View (Quick Actions · 통계 · 신청 내역 · 운영 포럼 · 수정/삭제요청 모달) |
| `ForumOwnerMemberManagement.tsx` | 377 | 폐쇄형 회원 관리 View (가입 신청 승인/거절+사유 · 회원 목록 · 회원 삭제) |
| `adapter.ts` | 203 | **adapter factory** — mapper · envelope unwrap · 실패 정규화 |
| `types.ts` | 170 | 도메인 타입 · API 계약 · `links` · `theme` |
| `theme.ts` | 55 | accent 기본값 · 날짜 포맷 · 오류 메시지 추출 |
| `index.ts` | 47 | barrel |
| **합계** | **1,525** | |

### 3-1. adapter factory 를 함께 뽑은 이유

View 만 합치고 adapter 를 서비스마다 두면 **동일 mapper 가 4벌 복제**된다 (WO §6 "API adapter 중복 최소화").
4서비스는 공통 forum controller 를 쓰므로 응답 형태가 같고, 다른 것은 (a) 호출 함수 (b) 실패 전달 방식뿐이다.
따라서 `createForumOwnerApi` / `createForumOwnerMembershipApi` 가 매핑·unwrap·실패 승격을 단독 소유하고,
서비스는 **자기 endpoint 함수만 배선**한다.

정규화 규칙:

- 배열 응답 3형태(`T[]` · `{data:T[]}` · `{data:{data:T[]}}`)를 모두 수용
- `{ success:false, error }` → `throw Error(error)` 승격 — **조회 실패를 "정상 0건" 으로 위장하지 않는다**
  (`WO-O4O-GLYCOPHARM-API-WRAPPER-FAILURE-CONTRACT-CLOSEOUT-BATCH-V1` 계약)
- axios 오류 → `Error(서버 메시지)` (기본 message "Request failed with status code 403" 노출 방지),
  회원 관리의 403 분기를 위해 `status` 보존

## 4. 서비스별 config / slot 차이

| 서비스 | adapter | theme | links | slot / 기타 |
|---|---|---|---|---|
| KPA-Society | `api/forumOwnerAdapter.ts` (56줄) · **`fetchMyRequests` 미주입** | blue | `/forum` · `/mypage/my-forums/:id/members` · 신청 폼 링크 없음 | `MyPageLayout` 래핑 · `MyPageNavigation` navSlot · 통합 신청함 `noticeSlot` · `containerClassName=""` |
| GlycoPharm | `services/forumOwnerAdapter.ts` (58줄) | emerald | `/forum` · `/forum/request-category` · `/forum/my-dashboard/:id/members` | `headerSlot` · `emojiPlaceholder="예: 💊"` |
| K-Cosmetics | `services/forumOwnerAdapter.ts` (53줄) | pink | 동일 구조 | `headerSlot` · `emojiPlaceholder="예: 💄"` |
| Neture | `services/forumOwnerAdapter.ts` (46줄) · membership adapter 없음 | emerald | `/supplier/forum` · `/supplier/forum/request-category` · **`memberManageHref` 없음** | `containerClassName="max-w-4xl"` (공급자 셸이 여백 담당) |

adapter 합계 213줄.

## 5. 유지한 SERVICE_SPECIFIC 정책

공통화를 위해 기능을 없애거나 새로 만들지 않았다.

| 정책 | 처리 |
|---|---|
| **KPA** — 포럼 신청 내역은 통합 신청함(`/mypage/my-requests?entityType=forum_category`) | adapter 가 `fetchMyRequests` 를 넘기지 않아 신청 내역·통계 섹션이 꺼지고, `noticeSlot` 이 기존 안내를 그대로 표시 |
| **KPA** — 소유자 영역은 마이페이지 소속 | `MyPageLayout` + `MyPageNavigation` + `/mypage/my-forums` route 유지 |
| **KPA** — 대시보드에 개설 신청 Quick Action 없음 | `requestFormHref` 미주입 (기존 화면과 동일) |
| **Neture** — 폐쇄형 회원 관리 동선 없음 | `memberManageHref` 미주입 → 링크 미노출. **회원 관리 page/route 신설하지 않음** |
| **Neture** — 공급자 공간 basePath | `/supplier/*` 링크 유지 |
| **GP / KCos** — 폐쇄형 회원 관리 보유 | 링크·route 유지 |
| **Pharmacy-Hub** — 소유자 영역 없음 | 신설하지 않음. `/operator/memberships` 는 **서비스 가입 멤버십**(다른 업무 모델)이라 이 축이 아니다 → census `NOT_IMPLEMENTED` 유지 |
| 서비스별 문구·이모지·accent | config 로 보존 |

## 6. Backend 변경 여부

**없음.** endpoint · 컨트롤러 · 권한 · 상태값 전부 무변경이다.

- 소유자 API 는 이미 공통 컨트롤러(`ForumDirectoryController.listMyForums` / `updateMyForum` /
  `requestDeleteForum`, `ForumMembershipController` 7종)를 서비스 prefix 로 mount 하고 있어
  WO §5 의 "additive adapter" 조차 필요 없었다.
- DB migration · 원장 통합 · 권한 모델 재설계 없음.

## 7. 변경 전/후 중복 LOC

### 7-1. 서비스 화면

| 서비스 | 화면 | 전 | 후 | 감소 |
|---|---|---:|---:|---:|
| KPA-Society | 대시보드 | 285 | 52 | −233 |
| KPA-Society | 회원 관리 | 381 | 31 | −350 |
| GlycoPharm | 대시보드 | 572 | 40 | −532 |
| GlycoPharm | 회원 관리 | 354 | 31 | −323 |
| K-Cosmetics | 대시보드 | 581 | 40 | −541 |
| K-Cosmetics | 회원 관리 | 354 | 29 | −325 |
| Neture | 대시보드 | 576 | 43 | −533 |
| **합계** | | **3,103** | **266** | **−2,837 (−91.4%)** |

### 7-2. 전체 수지

```text
제거된 서비스 화면 코드      3,103 → 266      (−2,837)
신설 공통 View/adapter/타입          +1,525
신설 서비스 adapter                   +213
────────────────────────────────────────────
총 코드                      3,103 → 2,004    (−1,099, −35.4%)
구현체 수                    7벌   → 1벌
```

**핵심은 −1,099줄이 아니라 7벌 → 1벌**이다. 이전에는 회원 관리 버그 1건을 3곳에, 대시보드 변경 1건을 4곳에
반영해야 했다(그리고 실제로 GP↔KCos 는 색만 바꾼 축자 복제였다).

## 8. census 셀 판정 — 변경 전/후

| census # | 기능 | 서비스 | 전 | 후 | 근거 |
|---|---|---|:--:|:--:|---|
| F31 | 내 포럼 대시보드 | KPA-Society | `VIEW_DUPLICATED` | **`FULLY_COMMON`** | 공통 `ForumOwnerDashboard` + config·slot 주입만 (52줄) |
| F31 | | GlycoPharm | `VIEW_DUPLICATED` | **`FULLY_COMMON`** | 동일 (40줄) |
| F31 | | K-Cosmetics | `VIEW_DUPLICATED` | **`FULLY_COMMON`** | 동일 (40줄) |
| F31 | | Neture | `VIEW_DUPLICATED` | **`FULLY_COMMON`** | 동일 (43줄). 회원 관리 미노출은 config 로 표현 |
| F31 | | Pharmacy-Hub | `NOT_IMPLEMENTED` | `NOT_IMPLEMENTED` | 신설하지 않음 |
| F34 | 포럼 회원 관리 | KPA-Society | `VIEW_DUPLICATED` | **`FULLY_COMMON`** | 공통 `ForumOwnerMemberManagement` (31줄) |
| F34 | | GlycoPharm | `VIEW_DUPLICATED` | **`FULLY_COMMON`** | 동일 (31줄) |
| F34 | | K-Cosmetics | `VIEW_DUPLICATED` | **`FULLY_COMMON`** | 동일 (29줄) |
| F34 | | Neture | `NOT_IMPLEMENTED` | `NOT_IMPLEMENTED` | 정책상 동선 없음 — 만들지 않음 |
| F34 | | Pharmacy-Hub | `NOT_IMPLEMENTED` | `NOT_IMPLEMENTED` | 동일 |

```text
VIEW_DUPLICATED 7 → 0
FULLY_COMMON    0 → 7
```

`FULLY_COMMON` 판정 근거 (census §1-3 규칙 6): 공통 패키지 View 를 config/주입만으로 소비하고,
**백엔드도 공통 컨트롤러 계약**이다 (콘텐츠 축처럼 백엔드가 복제된 경우가 아니다).
따라서 `CORE_ONLY` 로 남기지 않았다 — WO §6 의 완료 기준을 충족한다.

## 9. 검증

### 9-1. 신규 회귀 스펙

`apps/api-server/src/__tests__/forum-owner-area-commonization.spec.ts` — **55 tests**

정적 회귀 가드 (이 저장소에서 실행이 검증된 러너가 api-server jest 뿐이라 여기에 둔다 —
`kpa-boundary-regression.spec.ts` · `glycopharm-forum-service-boundary.spec.ts` 와 같은 패턴).

| 축 | 검증 |
|---|---|
| 공통 소비 | 7개 화면이 공통 컴포넌트를 import·렌더 · barrel export 존재 |
| 복제 재발 방지 | 서비스 파일에 복제 지문(모달 셸 · `STATUS_CONFIG` · 목록 문구) 0 · LOC ≤ 80 · 총 LOC < 이전의 1/5 |
| 서비스 분기 금지 | 공통 컴포넌트 6파일 코드 라인에 서비스 식별자(`serviceKey`/`serviceType`/서비스명) 0 · 브랜드 색 하드코딩 0 |
| 정책 보존 | Neture `memberManageHref` 미주입 + 회원관리 파일 부재 · Neture basePath · KPA `fetchMyRequests` 미주입 + noticeSlot · KPA 마이페이지 소속 · GP/KCos 회원관리 유지 · 이모지 유지 · **PH 에 `ForumOwner*` 소비 0** |
| accent / Tailwind | 어댑터 4곳이 토큰 9개 완비 · 동적 클래스 조합 금지 · 소비 서비스 4곳 tailwind content 가 shared-space-ui 스캔 |
| adapter 중복 | mapper 는 공통 factory 단독 소유 · 서비스 adapter 가 mapper 재정의 0 · adapter LOC ≤ 70 |

### 9-2. 실행 결과

| 항목 | 결과 |
|---|---|
| `forum-owner-area-commonization.spec.ts` | **55/55 PASS** |
| 서비스 typecheck / build (`tsc -b`, vite) | **미실측** |
| shared package build | **미실측** |
| 브라우저 회귀 (GP/KCos/KPA/Neture 화면) | **미실측** |

첫 실행에서 1건이 실패했다 — Neture 정책 단언이 파일 **주석**에 있는 `memberManageHref` 문자열까지
잡은 스펙 자체의 오탐이었다. 코드 라인만 보도록 `codeOf()` 로 좁힌 뒤 재실행해 55/55 통과했다
(구현 회귀가 아니라 단언 정밀도 문제였다).

### 9-3. 미실측 사유 — 환경 제약

직전 WO 에서 확인된 8GB RAM OOM 에 더해, 이번에는 **디스크 고갈**이 겹쳤다.

- `C:` 100% 사용 (여유 903MB). 이 저장소 체크아웃만 약 1.55GB → C: 에 워크트리 생성 불가.
  여유 공간 확보는 **다른 세션의 워크트리 6개를 건드려야** 하므로 하지 않았다 (WO §10 중지 조건).
- 대안으로 여유 1.4TB 인 `D:` 에 워크트리를 만들어 작업했다.
- 그러나 pnpm store 가 `C:` 에 있어 **드라이브 간 하드링크가 불가** → 전 패키지 복사가 필요했고
  15분에 약 110/2,400 패키지 속도라 완주가 불가능해 설치를 중단했다.
  따라서 `tsc -b` · vite build · 패키지 build 를 실행하지 못했다. **PASS 로 처리하지 않았다.**
- 스펙은 저장소 모듈을 import 하지 않고 `fs`/`path` 만 쓰므로, **메인 트리(C:)의 jest/ts-jest 로
  D: 워크트리를 대상 삼아 실행**해 결과를 확보했다.

### 9-4. 타입 안전성에 대한 보수적 평가

전체 typecheck 를 돌리지 못했으므로 아래는 **정적 확인**이다 (실측 아님).

- 서비스 adapter 가 배선하는 함수의 실재를 확인: KPA `forumApi.getMyForums/updateMyForum/requestDeleteForum` ·
  `forumMembershipApi` 7종, GP/KCos/Neture `fetchMyCategories/fetchMyForumRequests/updateMyCategory/requestDeleteCategory`
  및 GP/KCos `forumMembershipApi` — 전부 export 확인.
- 경로 alias 확인: Neture·GP `@/*` → `src/*` (tsconfig), KCos·KPA 는 상대 경로 사용.
- KPA `MyPageLayout`(`src/layouts`) · `KPA_MYPAGE_NAV_ITEMS`(`pages/mypage/navItems`) export 확인.
- 구 페이지 내부 심볼을 외부에서 import 하던 곳 0 (App.tsx 는 default import 만 사용 — route 무변경).

## 10. 잔존 duplication / 위험

### R1. GlycoPharm `pages/forum/MyRequestsPage.tsx` (285줄) legacy 잔존

census S4 로 보고된 항목이다. `/forum/my-requests` route 로 살아 있고, canonical 인
`/mypage/my-requests`(58줄, 공통 `MyRequestsInbox`)와 이중이다. **F30 축이라 본 WO 범위 밖**이라 두었다.

### R2. Neture tailwind content 누락은 이번에 함께 메웠다

Neture 는 `ForumHubTemplate` · `ForumListTemplate` · `ForumRequestForm` · `ResourcesHubTemplate` ·
`StandardHomeTemplate` 을 이미 쓰는데 `tailwind.config.js` content 에 `shared-space-ui` 경로가 없어
그 안의 Tailwind 클래스가 purge 되고 있었다(**기존 결함**). 소유자 영역 공통화로 필수가 되어 함께 채웠다.
→ **기존 Neture 화면들의 스타일이 이번 변경으로 달라져 보일 수 있다(누락 해소 방향).** 브라우저 확인 필요.

### R3. 브라우저 회귀 미실행

WO §7 의 회귀 항목(진입 · 목록 · 상태 표시 · 승인/거절/변경 · empty/loading/error · back navigation)을
정적 스펙으로만 고정했다. 특히 다음은 실제 화면 확인이 필요하다.

- accent 주입 후 4서비스 색이 이전과 동일한지 (Tailwind purge 경로 포함)
- KPA `MyPageLayout` 안에서 `containerClassName=""` 여백이 자연스러운지
- Neture 공급자 셸 안에서 `max-w-4xl` 폭이 이전과 같은지

### R4. 오류 표시 동작이 "개선 방향" 으로 바뀐 지점

기존 대시보드는 소유 포럼 조회 실패를 **silent catch** 해 빈 목록으로 보여줬다. 공통 View 는 실패를
오류 상태 + 다시 시도로 표시한다. 의도된 개선이지만 **동작 변화**이므로 기록한다.

### R5. 공통 컴포넌트 크기

`ForumOwnerDashboard` 673줄은 단일 컴포넌트로 크다. 지금은 원본 구조를 그대로 옮겨 회귀 위험을 낮추는
쪽을 택했다. 섹션 분리(신청 내역 / 운영 포럼 / 모달)는 브라우저 회귀 확인 후 별도 판단이 낫다.

## 11. Git

- 브랜치 `work/commonization-community` · main 직접 push/merge 없음
- 커밋 3개: shared 추출 / 서비스 adoption / CHECK · path-specific stage (`git add .` 미사용)
- 작업은 `D:` 워크트리에서 수행 (C: 디스크 고갈) — 메인 트리 무접촉
