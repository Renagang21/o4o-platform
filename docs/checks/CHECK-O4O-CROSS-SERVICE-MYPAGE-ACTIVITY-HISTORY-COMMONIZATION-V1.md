# CHECK — My Page Activity/이력 5서비스 census·공통화

> **WO 정본**: [`docs/work-orders/WO-O4O-CROSS-SERVICE-MYPAGE-ACTIVITY-HISTORY-COMMONIZATION-V1.md`](../work-orders/WO-O4O-CROSS-SERVICE-MYPAGE-ACTIVITY-HISTORY-COMMONIZATION-V1.md)
> **작성일**: 2026-08-20 · **상태**: ACTIVE
> **결론 요약**: **코드 변경 0건.** 5서비스 어디에도 Activity/History 전용 화면·route 가 없고, Activity feed 를 렌더하는 2서비스(KPA·Neture)는 **이미 공통 `MyPageActivityFeed` 를 소비**한다. 따라서 `VIEW_DUPLICATED = 0` · `CORE_ONLY = 0` 은 **착수 시점에 이미 충족**되어 있었고, 수렴할 중복이 존재하지 않는다. §24(없는 기능 신설 금지)·§16(신규 Activity backend 계약 금지)에 따라 **census 와 `NOT_IMPLEMENTED` 판정이 본 WO 의 산출물**이다.

---

## 1. 기준 commit / deployed revision

| 항목 | 값 |
|---|---|
| WO 등록 commit | `d5dd2d3be` |
| 조사 기준 (rebase 후 base) | `7494f295c` (origin/main tip, 2026-08-20) |
| API deployed revision | `o4o-core-api-03398-749` |
| 본 WO 로 인한 배포 | **없음** (코드 변경 0건) |

프로덕션 실측 도메인: `kpa-society.co.kr` · `glycopharm.co.kr` · `k-cosmetics.site` · `neture.co.kr` · `pharmacyhub.co.kr`
(§28 canonical URL 은 `CHECK-O4O-CROSS-SERVICE-MYPAGE-HOME-HUB-COMMONIZATION-V1.md:171-175` 기준)

---

## 2. 5서비스 Activity 모집단 (§4 재산출)

`git grep` 을 §6 의미 기준으로 필터링해 현재 main 에서 재산출했다. 부기 A~L 의 경로/숫자는 출발점으로만 사용했고 결론은 전부 재확인했다.

### 2-1. Activity 전용 route — **0건**

| 서비스 | `/mypage/activity` | `/mypage/history` | 비고 |
|---|:---:|:---:|---|
| KPA-Society | 없음 | 없음 | `https://kpa-society.co.kr/mypage/activity` → 정상 404 페이지 (백지 아님) |
| GlycoPharm | 없음 | 없음 | |
| K-Cosmetics | 없음 | 없음 | |
| Neture | 없음 | 없음 | |
| Pharmacy-Hub | 없음 | 없음 | PH 는 `/mypage` 가 아니라 `/account` 축 |

→ 부기 C 사실 확인됨.

### 2-2. Activity UI 를 렌더하는 지점 — **2건, 둘 다 공통 컴포넌트**

| 서비스 | 파일 | 렌더 | 데이터 |
|---|---|---|---|
| KPA | `services/web-kpa-society/src/pages/mypage/MyDashboardPage.tsx` | `<MyPageActivityFeed items={activities.map(...)} />` | `GET /api/v1/kpa/mypage/activities` (stub) |
| Neture | `services/web-neture/src/pages/mypage/MyPageHub.tsx:103-108` | `<MyPageActivityFeed items={[]} />` | **하드코딩 빈 배열** (API 호출 없음) |

GlycoPharm · K-Cosmetics · Pharmacy-Hub 는 Activity UI 자체가 **없다**.

### 2-3. navItems — dead entry 0

`services/*/src/pages/mypage/navItems.ts` 전수 확인. 5서비스 어디에도 활동/이력 메뉴 항목이 없다 → §24 dead entry = 0.

- KPA: 홈 / 프로필 / 내 포럼 / 내 수강 / 내 신청 / 학습 결과 / 내 자격 / 크레딧 / 설정
- GlycoPharm: 홈 / 프로필 / 내 수강 / 내 신청 / 학습 결과 / 크레딧 / 설정
- K-Cosmetics: 홈 / 프로필 / 내 신청 / 내 수강 / 학습 결과 / 크레딧 / 설정
- Neture: 홈 / 프로필 / 사업자 정보(supplier only) / 설정
- Pharmacy-Hub(`/account`): 내 프로필 / 가입 상태

### 2-4. §6 동음이의 제외 (부기 E 함정)

| 후보 | 판정 | 근거 |
|---|---|---|
| `kpa_members.activity_type` | **제외** | 근무형태(`pharmacy_owner`/`pharmacy_employee`/`hospital`). 활동 이력과 무관 |
| `/api/v1/kpa/home/latest`, `/home/forum-activity` (`kpa.routes.ts:998,1005`) | **OUT_OF_SCOPE** | 사이트 전역 Home 피드. 개인 My Page 활동 원장 아님 |
| `web-kpa-branch` `/me` 전입·전출 이력 (`BranchMemberController.myHistory` → `GET /me/branch/history`) | **OUT_OF_SCOPE** | 실제 개인 이력이지만 §2 대상 5서비스가 아닌 분회 서비스 |
| `MyPostsPage` (5서비스 `/forum/*`) | **OUT_OF_SCOPE** | Forum 축. My Page 축이 아니다 |
| audit log | **OUT_OF_SCOPE** | §18. 사용자 대면 소비 경로 0 |
| 주문/거래 원장 | **OUT_OF_SCOPE** | §19 |

---

## 3. 16기능 census (§5)

판정 어휘: `FULLY_COMMON` / `CORE_ONLY` / `VIEW_DUPLICATED` / `SERVICE_SPECIFIC` / `NOT_IMPLEMENTED` / `OUT_OF_SCOPE`
**미조사 0.**

| # | 기능 | KPA | GP | KCos | Neture | PH |
|---:|---|---|---|---|---|---|
| 1 | Activity/History 기능 존재 | NOT_IMPLEMENTED¹ | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED¹ | NOT_IMPLEMENTED |
| 2 | 최근 활동 목록 | NOT_IMPLEMENTED¹ | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED¹ | NOT_IMPLEMENTED |
| 3 | 전체 이력 목록 | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| 4 | 활동 유형 표시 | NOT_IMPLEMENTED² | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| 5 | 발생 시각 | NOT_IMPLEMENTED² | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| 6 | 행위 주체/대상 표시 | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| 7 | 상태/결과 표시 | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| 8 | 상세/대상 deep link | NOT_IMPLEMENTED³ | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| 9 | 필터/탭 | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| 10 | pagination/load more | NOT_IMPLEMENTED⁴ | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| 11 | empty/loading/error | FULLY_COMMON⁵ | NOT_IMPLEMENTED | NOT_IMPLEMENTED | FULLY_COMMON⁵ | NOT_IMPLEMENTED |
| 12 | Home/Navigation 진입 | NOT_IMPLEMENTED⁶ | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED⁶ | NOT_IMPLEMENTED |
| 13 | 날짜/상대시간 표시 | SERVICE_SPECIFIC⁷ | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| 14 | mobile UX | FULLY_COMMON⁵ | NOT_IMPLEMENTED | NOT_IMPLEMENTED | FULLY_COMMON⁵ | NOT_IMPLEMENTED |
| 15 | 감사/평가/보상성 활동 | OUT_OF_SCOPE⁸ | OUT_OF_SCOPE⁸ | OUT_OF_SCOPE⁸ | OUT_OF_SCOPE⁸ | OUT_OF_SCOPE |
| 16 | 서비스별 Activity Extension | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |

**주석**

1. **UI 컨테이너는 존재하나 데이터 계약이 없다.** KPA 는 상수 stub, Neture 는 하드코딩 `[]`. §17 함정에 따라 "B. backend만 존재" 가 아니라 `NOT_IMPLEMENTED` 다 (근거는 §4).
2. KPA 프론트에 `ACTIVITY_ICONS`(`course_progress`/`forum_post`/`groupbuy`/`certificate`)와 `toLocaleDateString()` 매핑 코드는 있으나 **한 번도 실행되지 않는다** (data 항상 0건). 실행 불가능한 코드는 기능 존재로 보지 않는다.
3. KPA `UserActivity.link` 는 존재하나 `MyPageActivityFeed` 의 `href` 로 **매핑되지 않는다**. 실데이터가 없어 dead link 도 발생하지 않는다 → **dead activity link = 0**.
4. KPA API 는 `pagination` 객체를 반환하지만 상수다. 프론트는 pagination UI 를 렌더하지 않는다.
5. `MyPageActivityFeed` 의 empty state(`MyPageEmptyState`) 와 반응형 레이아웃은 공통 패키지 소유 → `FULLY_COMMON`.
6. Activity 전용 route 가 없으므로 진입 메뉴도 없다. 카드는 My Page 홈에 인라인으로만 존재.
7. KPA 만 `new Date(...).toLocaleDateString()` 을 **직접** 호출. 다만 호출 지점이 1곳뿐이라 중복이 아니고, 데이터가 0건이라 실행되지 않는다. §13 의 "3벌째 금지"에 따라 새 포매터를 만들지 않았다.
8. 감사/Appreciation 은 `MyPageAppreciationCard` 라는 **별도 공통 컴포넌트**로 이미 분리되어 있고 `hideWhenEmpty` 로 독립 동작한다 (§15 경계 유지).

### 판정 분포 (80칸 = 16기능 × 5서비스)

| 판정 | 건수 |
|---|---:|
| `NOT_IMPLEMENTED` | 70 |
| `OUT_OF_SCOPE` | 5 |
| `FULLY_COMMON` | 4 |
| `SERVICE_SPECIFIC` | 1 |
| `VIEW_DUPLICATED` | **0** |
| `CORE_ONLY` | **0** |
| 미조사 | **0** |

→ §26 완료 기준 (미조사 0 / VIEW_DUPLICATED 0 / CORE_ONLY 0) **충족**.

---

## 4. backend / API / data source (§17)

### 4-1. KPA `/mypage/activities` = placeholder stub (부기 D 확인)

`apps/api-server/src/routes/kpa/services/mypage.service.ts:230-238`

```ts
/** GET /activities — User activities (placeholder) */
getActivities(): { data: any[]; pagination: any } {
  return { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
}
```

컨트롤러(`mypage.controller.ts:88-98`)는 이를 그대로 통과시킨다. DB 접근 0, 엔티티 0, 쿼리 0.

### 4-2. 프로덕션 실측 증거 — 200 ≠ 구현됨

인증된 브라우저 세션에서 `localStorage.o4o_accessToken` 을 읽어 `Authorization: Bearer` 로 재호출한 결과:

```
GET https://api.neture.co.kr/api/v1/kpa/mypage/activities?limit=5
→ 200 {"success":true,"data":[],
       "pagination":{"page":1,"limit":10,"total":0,"totalPages":0}}
```

**`limit=5` 를 요청했는데 응답이 `limit:10`.** 쿼리 파라미터를 전혀 읽지 않는 상수 응답이라는 직접 증거다.
동일 stub family: `GET /api/v1/kpa/mypage/summary` → `200 {...enrolledCourses:0, completedCourses:0, certificates:0, forumPosts:0}`.

→ §17 분류: **`NOT_IMPLEMENTED`** (200 응답을 근거로 "B. backend만 존재" 로 적지 않았다).

### 4-3. Neture

프로덕션 `/mypage` 네트워크 로그 전수 확인: activity 계열 요청 **0건** (footer-legal, login, notifications/unread-count ×2 만 관측). 소스의 하드코딩 `items={[]}` 와 일치.

### 4-4. GP / KCos / PH

Activity API 자체가 없다. PH 는 `/account` 에서 프로필·보안·가입상태만 조회한다.

### 4-5. 신규 backend 계약

**추가하지 않았다** (§16·§31). Activity entity·table·migration·endpoint 신설 0건.

---

## 5. Before / After

| 항목 | Before | After |
|---|---|---|
| Activity 전용 route | 0 | 0 (변경 없음) |
| Activity feed 렌더 서비스 | 2 (KPA·Neture) | 2 (변경 없음) |
| 공통 컴포넌트 사용률 | 2/2 (100%) | 2/2 (100%) |
| 서비스 로컬 Activity feed 구현 | 0 | 0 |
| Activity backend 실계약 | 0 | 0 |
| 코드 변경 | — | **0 파일** |

**수렴할 중복이 존재하지 않아 코드 변경이 발생하지 않았다.** §24 에 따라 없는 기능을 채워 넣지 않았고, §9 의 6컴포넌트 트리(`ActivityHeader`/`ActivityFilter`/`ActivityItem`/`ActivityTime`/`ActivityTarget` 등)도 **신설하지 않았다** — §10 의 기존 자산 우선 원칙상 소비처가 0인 컴포넌트를 만드는 것은 부채 신설이다.

---

## 6. 기존 공통 자산 (§10)

`packages/account-ui/src/components/MyPageActivityFeed.tsx` (110줄), `packages/account-ui/src/index.ts:36-40` 에서 export.

```ts
export interface MyPageActivityItem {
  key?: string; icon?: ReactNode; title: ReactNode;
  description?: ReactNode; meta?: ReactNode; href?: string;
}
```

- 데이터를 fetch 하지 않고 표시 모델만 정의한다 (서비스가 자기 응답을 item 으로 변환).
- 소비처 **정확히 2곳**: KPA `MyDashboardPage`, Neture `MyPageHub`.
- **§1 Shared Module Change Rule 적용**: 소비처 2곳을 먼저 전수 식별했고, 컴포넌트를 수정하지 않았으므로 회귀 영향 0.
- 판단: 현재 요구를 이미 충족한다. **같은 feed 를 새로 만들지 않았다.**

---

## 7. 공통 Activity Core/View

**신설하지 않았다.** 사유:

1. 수렴 대상 중복 UI 가 0 (§26 목표 이미 충족).
2. 데이터 계약이 5서비스 전부 부재 → view model 을 규정할 근거 데이터가 없다.
3. §24: "기능 없는 서비스에 빈 Activity 페이지를 만들지 않는다".
4. §16: "신규 Activity backend endpoint 를 만들지 않는다".

→ 계약 없이 Core 를 먼저 만들면 실제 계약이 생길 때 재작성이 확정된다. 만들지 않는 것이 올바른 결론이다.

---

## 8. View model / adapter

현행 `MyPageActivityItem` 이 사실상의 최소 공통 view model 이며(§11 요구와 형태 일치), 어댑터는 KPA 1곳뿐이다. 어댑터가 1개인 상태에서 어댑터 계층을 추출하는 것은 과설계 → **변경 없음.**

---

## 9. activity type mapping (§12)

- 정본 타입 목록이 backend 에 **없다**. KPA 프론트 로컬 상수 `ACTIVITY_ICONS` 4종(`course_progress`/`forum_post`/`groupbuy`/`certificate`)이 유일한 표기이며, 서버가 이 값을 낸 적이 없다.
- 서버 계약이 없는 상태에서 공통 type enum 을 확정하면 **추측을 계약으로 굳히는 행위**다 → 확정하지 않았다.
- 판정: `NOT_IMPLEMENTED`. followup 으로 이관.

---

## 10. time formatting (§13)

착수 전 기준(부기 F)은 2벌이었으나 실측 결과 **7곳**이다.

| 위치 | 성격 |
|---|---|
| `packages/account-ui/src/notifications/formatRelative.ts` | 공통 (Notifications 축) |
| `packages/utils/src/format.ts:175` | 공통 |
| `packages/shortcodes/src/dynamic/components.tsx:241` | 로컬 |
| `packages/forum-core/.../CommentSection.tsx:51` · `ForumHome.tsx:205` · `PostList.tsx:63` · `PostSingle.tsx:113` | 로컬 4벌 (Forum 축) |

- **3벌째를 만들지 않았다.**
- Activity 축에서 상대시간이 필요한 지점은 KPA 1곳뿐이고 그마저 실행되지 않으므로 교체 이득이 0 → 변경 없음.
- 기존 중복 통합은 §13 상 본 WO 범위 밖 → followup(F-3).

---

## 11. deep link (§14)

- 공통 컴포넌트는 `href` 를 지원한다.
- KPA 어댑터가 `activity.link` → `href` 를 매핑하지 않는 **잠재 갭**이 있으나, 서버가 `link` 를 낸 적이 없어 현재 결함으로 발현하지 않는다.
- **dead activity link = 0** (실측: KPA·Neture My Page 에서 활동 항목 렌더 0건).
- 판단: 상수 stub 위에서 링크 매핑을 추가하는 것은 검증 불가능한 투기적 수정 → 하지 않고 followup(F-2)으로 남긴다.

---

## 12. appreciation 경계 (§15)

`MyPageAppreciationCard` 는 `MyPageActivityFeed` 와 **별개 컴포넌트**로 이미 분리되어 있고 `hideWhenEmpty` 로 독립 제어된다. 감사/평가/보상성 활동을 Activity feed 로 흡수하지 않았다 → 경계 유지.

---

## 13. Requests / Notifications 경계 (§7·§8·§18·§19)

| 축 | 자산 | 처리 |
|---|---|---|
| Notifications (FINAL CLOSED) | `@o4o/account-ui/notifications` | **재사용하지 않았다.** Notification feed 를 Activity feed 로 돌려쓰는 억지 통합 금지 준수 |
| Requests | `MyRequestsInbox` | 별도 축 유지, 재분류 안 함 |
| 교육 이력 | `MyEnrollmentsView` / `MyCertificatesView` / `MyCreditsView` | §23 Extension 축의 독립 화면. Activity 로 합치지 않음 |
| Audit Log | — | §18 OUT_OF_SCOPE (사용자 대면 소비 0) |
| 주문/거래 원장 | — | §19 OUT_OF_SCOPE |

---

## 14. Service Extension (§23)

서비스별 Activity Extension **0건**. Core 가 없으므로 Extension 지점도 정의하지 않았다. 계층(`Core → Extension → Feature → Service`) 역방향 의존 신설 0.

---

## 15. empty / loading / error (§22)

- **empty**: `MyPageActivityFeed` 가 `MyPageEmptyState` 로 공통 처리. KPA·Neture 모두 "최근 활동이 없습니다." 실측 확인.
- **loading**: KPA 는 `MyDashboardPage` 의 단일 로딩 상태에 포함.
- **error 삼킴 여부 (§22 핵심 점검)**: KPA `loadData()` 는
  `Promise.all([getDashboardSummary(), getActivities({limit:5})])` 를 **하나의 try/catch** 로 감싸고 실패 시 에러 상태를 렌더한다. 조용한 빈 목록으로 떨어지지 않는다 → **조회 실패 삼킴 결함 0건.**
- Neture 는 호출 자체가 없어 삼킴이 성립하지 않는다.

---

## 16. 5서비스 adoption (§25)

공통 Activity Core/View 를 신설하지 않았으므로 adoption 은 **기존 `MyPageActivityFeed` 기준**으로 판정한다.

| 서비스 | Activity UI | 공통 컴포넌트 | adoption 판정 |
|---|---|---|---|
| KPA-Society | 있음 (항상 빈 상태) | `MyPageActivityFeed` | **ADOPTED** — 서비스 로컬 구현 0 |
| GlycoPharm | 없음 | — | **N/A (NOT_IMPLEMENTED)** — 신설 금지(§24) |
| K-Cosmetics | 없음 | — | **N/A (NOT_IMPLEMENTED)** — 신설 금지(§24) |
| Neture | 있음 (하드코딩 `[]`) | `MyPageActivityFeed` | **ADOPTED** — 서비스 로컬 구현 0 |
| Pharmacy-Hub | 없음 | — | **N/A (NOT_IMPLEMENTED)** — `/account` 축, 신설 금지(§24) |

한 서비스만 보고 완료 선언하지 않았고 5서비스 전부 판정했다.

---

## 17. desktop / mobile (§27)

| 서비스 | URL | desktop 1440×900 | mobile 390×844 | 가로 overflow |
|---|---|:---:|:---:|---|
| KPA-Society | `/mypage` | PASS | PASS | 없음 (375/375) |
| GlycoPharm | `/mypage` | PASS | PASS | 없음 (382/382) |
| K-Cosmetics | `/mypage` | PASS | PASS | 없음 (375/375) |
| Neture | `/mypage` | PASS | PASS | 없음 (375/375) |
| Pharmacy-Hub | `/account` | PASS | PASS | 없음 (375/375) |

---

## 18. production browser (§28·§30)

Playwright MCP · 프로덕션 실계정(`docs/local/TEST-ACCOUNTS.local.md` SSOT).

| 항목 | 결과 |
|---|---|
| 5서비스 My Page 진입 | 5/5 PASS |
| JS 예외 | **0** (PH `/account` 콘솔 error 0 실측) |
| 백지 화면 | 0 |
| dead activity 메뉴 항목 | **0** |
| dead activity link | **0** |
| 존재하지 않는 route 접근 | `kpa-society.co.kr/mypage/activity` → 정상 404 페이지 (백지 아님) |
| 새로고침 지속성 | KPA `/mypage` 새로고침 후 세션 유지·활동 카드 빈 상태 동일 → PASS |
| PH 로그인 후 `/account` | 로딩 후 정상 렌더 (내 프로필/가입 상태/기본 정보/보안 설정). 활동 UI 0 |

**건너뛴 항목 (숨기지 않고 기록)**

- §28 의 "뒤로가기" 시나리오는 Activity 전용 route 가 어느 서비스에도 없어 **수행 대상 자체가 없다** → 미수행(대상 부재). 새로고침 지속성만 KPA 에서 실측했다.
- Neture supplier 전용 뷰, GP/KCos store_owner 스코프에서의 Activity 재확인은 **미수행** — 세 서비스 모두 소스 레벨에서 Activity UI 가 0이므로 role 별 분기 자체가 없다.

**신규 발견 (부기에 없던 항목)**

- **GlycoPharm 비로그인 `/mypage` SoftGuard 프리뷰에 "활동 내역" 칩이 노출된다** ("프로필 관리"·"알림 설정" 옆). 로그인 후에는 존재하지 않는 기능이다.
  링크가 아니라 클릭 불가 칩이므로 §24/§30 의 dead entry(=클릭 시 깨지는 진입점)에 해당하지 않는다 → **MUST_FIX 아님**, copy drift followup(F-1).

---

## 19. production write (§29)

**production write = 0.**

- SELECT/GET 조회와 화면 관측만 수행했다.
- 활동 샘플을 만들기 위한 게시글 작성·수강 신청·요청 제출 등 **실제 사용자 흐름을 실행하지 않았다.**
- 활동 샘플이 0건인 사유: KPA 는 서버가 상수 빈 배열을 반환하고 Neture 는 호출조차 없다. **어떤 사용자 행위를 해도 이 두 화면의 목록은 채워지지 않는다** (코드 경로상 데이터 소스가 존재하지 않음). 따라서 write 로 샘플을 만드는 시도는 §29 위반이자 무의미하다.
- 대체 증거: ① 소스 코드 정적 경로(§4-1) ② 프로덕션 인증 API 실응답 + `limit` 무시 증거(§4-2) ③ 네트워크 로그 요청 0건(§4-3) ④ 5서비스 브라우저 실측(§18).

---

## 20. backend / DB / schema

| 항목 | 결과 |
|---|---|
| 신규 endpoint | 0 |
| 기존 endpoint 수정 | 0 |
| entity 추가/변경 | 0 |
| migration | 0 |
| DB write | 0 |
| Frozen Baseline(§14) 접촉 | 0 |

---

## 21. 잔존 followup

본 WO 에서 처리하지 않고 남긴 항목. 전부 근거 있는 잔존이며 별도 WO 대상이다.

| ID | 내용 | 사유 |
|---|---|---|
| F-1 | GlycoPharm 비로그인 `/mypage` SoftGuard 프리뷰의 "활동 내역" 칩 — 실제 없는 기능 광고 | copy drift. 링크 아님 → dead entry 아님 |
| F-2 | KPA `MyDashboardPage` 어댑터가 `UserActivity.link` → `href` 미매핑 | 상수 stub 위 투기적 수정 금지. 실계약 생길 때 함께 |
| F-3 | `formatRelativeTime` 7벌 중복 (공통 2 + 로컬 5) | §13 상 통합은 본 WO 범위 밖 |
| F-4 | KPA `/mypage/activities`·`/mypage/summary` placeholder stub 처리 방침 (실구현 vs 은퇴) | §16·§31 — 신규 backend 계약은 별도 WO |
| F-5 | Neture 개인 활동 원장 backend 부재 | §35 에서 이미 별도 유지 항목으로 명시 |
| F-6 | Activity type enum 정본 부재 (프론트 로컬 상수만 존재) | 서버 계약 확정 후 |

---

## 22. MUST_FIX_BEFORE_CLOSE

**0건.**

- dead activity 메뉴 항목 0 / dead activity link 0 / 백지 0 / JS 예외 0 / 조회 실패 삼킴 0.
- F-1~F-6 은 전부 근거 있는 잔존이며 close 차단 조건이 아니다.

---

## 23. CHECK / commit / push

| 항목 | 값 |
|---|---|
| CHECK 문서 | 본 파일 |
| 코드 변경 | 0 파일 |
| 커밋 대상 | 본 CHECK 문서 1건 (path-specific stage) |
| `git add .` | 사용 안 함 |
| 다른 세션 파일 접촉 | 0 |

---

## §34 FINAL CLOSE 판정

| 조건 | 결과 |
|---|:---:|
| 미조사 = 0 | ✅ |
| VIEW_DUPLICATED = 0 | ✅ |
| CORE_ONLY = 0 | ✅ |
| 존재하는 중복 Activity UI 수렴 완료 | ✅ (중복 0 — 수렴 대상 부재) |
| 기능 없는 서비스 dead entry = 0 | ✅ |
| 5서비스 adoption 판정 완료 | ✅ |
| dead activity link = 0 | ✅ |
| desktop/mobile PASS | ✅ (5/5) |
| production browser PASS | ✅ |
| MUST_FIX_BEFORE_CLOSE = 0 | ✅ |

```text
MYPAGE ACTIVITY/HISTORY TRACK = FINAL CLOSED
```

**단, 이 CLOSED 의 의미를 오해하지 않도록 명시한다.**
"Activity 기능이 5서비스에 공통 구현되었다"는 뜻이 **아니다.**
"**My Page Activity 축에는 현재 공통화할 중복이 존재하지 않으며, 5서비스 전부 `NOT_IMPLEMENTED` 임이 근거와 함께 확정되었다**"는 뜻이다.
실제 Activity 기능이 필요해지는 시점에는 **backend 데이터 계약 정의부터 시작하는 신규 WO** 가 필요하다 (F-4·F-5·F-6).

---

*작성: Agent D · 2026-08-20*
