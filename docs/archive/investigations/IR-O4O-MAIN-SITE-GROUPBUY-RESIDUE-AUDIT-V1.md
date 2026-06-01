# IR-O4O-MAIN-SITE-GROUPBUY-RESIDUE-AUDIT-V1

> **조사 유형**: Legacy Residue Audit — 삭제 전 판단을 위한 조사
> **대상 앱**: `apps/main-site` (`@o4o/main-site-nextgen`)
> **Cloud Run 서비스**: `o4o-main-site`
> **조사일**: 2026-05-15
> **상태**: 완료 (코드 변경 없음)

---

## 1. 조사 목적 및 전제

`apps/main-site`에 남아 있는 `groupbuy` UI·라우트·네비게이션 잔재를 조사한다.
`groupbuy`는 더 이상 canonical 용어가 아니며 현재 canonical은 **Event Offer** 구조이다.
`main-site`는 서비스 정체성과 노출 범위가 불명확하므로 즉시 삭제하지 않고 운영 영향 여부를 먼저 확인한다.

**KPA Society canonical 코드는 이 조사의 대상이 아니며, 조사 중에도 수정하지 않았다.**

---

## 2. main-site groupbuy UI 현황

### 2.1 존재 파일 목록 (5개 파일, 3개 위치)

| # | 파일 경로 | 종류 | 역할 |
|---|-----------|------|------|
| 1 | `src/pages/groupbuy/GroupbuyListPage.tsx` | 페이지 컴포넌트 | 공동구매 캠페인 목록 |
| 2 | `src/pages/groupbuy/GroupbuyDetailPage.tsx` | 페이지 컴포넌트 | 캠페인 상세 + 수량 선택 + 참여 |
| 3 | `src/pages/groupbuy/index.ts` | 배럴 export | 2개 컴포넌트 re-export |
| 4 | `src/router/index.tsx` | 라우터 | 2개 lazy import + 2개 Route 등록 |
| 5 | `src/layouts/MainLayout.tsx` | 공통 레이아웃 | 상단 nav + 모바일 nav + 푸터 링크 노출 |
| (참조) | `src/pages/dashboard/DashboardPage.tsx` | 대시보드 | `groupbuyParticipations` stat + 퀵링크 |

### 2.2 각 페이지 역할

**GroupbuyListPage.tsx (294줄)**
- 상태: `campaigns[]`, `filter('active'|'ending_soon'|'all')`, `isLoading`, `error`
- 진행 중 / 마감 임박 / 전체 필터 탭 UI
- 캠페인 카드: 썸네일, 할인율 배지, 진행률 바, 마감 시간, 참여 인원
- 실행 불가: `GET /groupbuy/campaigns` → 404 → catch → `setError('캠페인을 불러오는데 실패했습니다.')`
- 에러 상태 렌더링: 빨간 박스에 에러 메시지 표시

**GroupbuyDetailPage.tsx (448줄)**
- 상태: `campaign`, `quantity`, `hasJoined`, `isJoining`, `isLoading`, `error`
- 이미지, 상세 설명(`ContentRenderer`), 배송 정보, 이용약관
- 가격/진행률/마감 카운트다운 + 수량 선택 + 참여 버튼
- 실행 불가: `GET /groupbuy/campaigns/:id` → 404 → `status 404` → `setError('캠페인을 찾을 수 없습니다.')`
- 에러 상태: `EmptyState` 컴포넌트 ("요청한 캠페인이 존재하지 않거나 종료되었습니다.")

### 2.3 호출 API 전체 목록

| 파일 | HTTP 메서드 | 경로 | 서버 등록 여부 |
|------|------------|------|--------------|
| GroupbuyListPage.tsx:63 | GET | `/groupbuy/campaigns?organizationId=...&status=active` | ❌ 미등록 |
| GroupbuyDetailPage.tsx:69 | GET | `/groupbuy/campaigns/:id` | ❌ 미등록 |
| GroupbuyDetailPage.tsx:75-77 | GET | `/groupbuy/campaigns/:id/my-participation` | ❌ 미등록 |
| GroupbuyDetailPage.tsx:120 | POST | `/groupbuy/campaigns/:id/join` | ❌ 미등록 |
| DashboardPage.tsx:61 | GET | `/dashboard` | 불명 (에러 폴백 있음) |

### 2.4 서버 API 등록 여부 확인

`apps/api-server/src/bootstrap/register-routes.ts` 전체 및 api-server 라우트 코드에서
`/groupbuy/campaigns` 경로를 grep → **0건 검색됨**.

**결론: 4개의 groupbuy API 경로 모두 서버에 미등록.** 런타임 호출 시 API 게이트웨이 또는 서버에서 404 반환.

참고: `/api/v1/kpa/groupbuy-admin/*` 및 `/api/v1/kpa/groupbuy/*` 경로는 `kpa.routes.ts`에 등록되어 있는
KPA Event Offer canonical 라우트이며, `main-site`가 호출하는 `/groupbuy/campaigns/*`와 **완전히 다른 경로**이다.

---

## 3. 라우트 조사

### 3.1 등록된 groupbuy 라우트

**`src/router/index.tsx`**

```tsx
// Groupbuy pages (lazy import, lines 22-23)
const GroupbuyListPage = lazy(() => import('@/pages/groupbuy/GroupbuyListPage'));
const GroupbuyDetailPage = lazy(() => import('@/pages/groupbuy/GroupbuyDetailPage'));

// Route elements (lines 123-124)
<Route path="/groupbuy" element={<GroupbuyListPage />} />
<Route path="/groupbuy/:id" element={<GroupbuyDetailPage />} />
```

- `/groupbuy` → `GroupbuyListPage`
- `/groupbuy/:id` → `GroupbuyDetailPage`
- 그 외 groupbuy 관련 라우트 없음
- **RequireAuth 없음** — 비로그인 사용자도 접근 가능

### 3.2 lazy import 방식

두 페이지 모두 `lazy(() => import(...))` — 라우트 진입 시 번들 청크를 동적 로드.
페이지 파일을 삭제하면 빌드 시점에 import 대상이 없어 **TypeScript 오류 발생**.
삭제 전 반드시 라우터에서 lazy import 2개 + Route element 2개를 함께 제거해야 한다.

### 3.3 삭제 시 router 영향

```
삭제 대상:
  line 22: const GroupbuyListPage = lazy(...)
  line 23: const GroupbuyDetailPage = lazy(...)
  line 123: <Route path="/groupbuy" element={<GroupbuyListPage />} />
  line 124: <Route path="/groupbuy/:id" element={<GroupbuyDetailPage />} />

영향 범위: router/index.tsx 1개 파일만 수정 필요
의존하는 다른 파일 없음 (pages/groupbuy/ 를 import하는 파일은 router/index.tsx 단독)
```

---

## 4. 네비게이션 노출 조사

### 4.1 MainLayout.tsx — 공동구매 노출 위치 3곳

**① 상단 데스크톱 네비게이션 (line 32)**
```tsx
const navItems = [
  { label: '홈',     path: '/',        icon: '🏠' },
  { label: '커뮤니티', path: '/forum',   icon: '💬' },
  { label: '공동구매', path: '/groupbuy', icon: '🛒' },  // ← 여기
  { label: '내 학습', path: '/lms',     icon: '📚' },
];
```
`navItems` 배열이 상단 데스크톱 nav와 모바일 bottom nav 두 곳에 `.map()`으로 렌더링됨.

**② 모바일 네비게이션 (동일 navItems 배열 사용)**
```tsx
// line 153-173: 모바일 nav도 동일 navItems를 map으로 렌더링
<nav className="md:hidden border-t border-gray-200">
  {navItems.map((item) => (...))}
</nav>
```
→ 데스크톱 + 모바일 양쪽 모두 자동 노출됨.

**③ 푸터 서비스 링크 (line 196)**
```tsx
<li><Link to="/groupbuy" className="hover:text-white">공동구매</Link></li>
```

### 4.2 사용자 접근 가능 여부

- `main-site`는 CI/CD workflow `deploy-main-site.yml` 존재 → Cloud Run `o4o-main-site` 서비스로 배포됨
- 접근 제한(`RequireAuth`) 없음 — 비로그인 상태에서도 `공동구매` 메뉴 클릭 가능

### 4.3 현재 클릭 시 사용자 경험

| 진입 경로 | 렌더링 | API 호출 결과 | 사용자 화면 |
|-----------|--------|--------------|------------|
| 상단 nav `공동구매` 클릭 → `/groupbuy` | `GroupbuyListPage` 렌더링 | `GET /groupbuy/campaigns` → 404 | "캠페인을 불러오는데 실패했습니다." (빨간 에러 박스) |
| `/groupbuy` 에서 카드 클릭 → `/groupbuy/:id` | 카드 렌더 자체가 불가 (목록 로드 실패) | — | 에러 박스에서 진입 불가 |
| 직접 URL 입력 `/groupbuy/:id` | `GroupbuyDetailPage` 렌더링 | `GET /groupbuy/campaigns/:id` → 404 | `EmptyState`: "요청한 캠페인이 존재하지 않거나 종료되었습니다." |
| 푸터 `공동구매` 클릭 | 동일 | 동일 | 동일 |

**요약**: 메뉴는 사용자에게 노출되나, 진입 후 항상 에러 화면이 표시되어 기능적으로 완전히 불동작 상태다.

---

## 5. 서비스 정체성 판단

### 5.1 코드 기반 증거

| 항목 | 내용 |
|------|------|
| 패키지명 | `@o4o/main-site-nextgen` ("nextgen" — 세대 교체 의도 내포) |
| 로고/브랜딩 | 💊 아이콘, "약사회" 제목 (MainLayout.tsx:52, :186) |
| 푸터 저작권 | "© 2024 약사회. All rights reserved." (MainLayout.tsx:217) |
| 히어로 문구 | "약사회 커뮤니티 — 약사 회원을 위한 포럼, 공동구매, 교육 플랫폼" (DashboardPage.tsx:99-100) |
| yaksa 전용 디렉토리 | `src/pages/yaksa/`, `src/components/yaksa/`, `src/lib/yaksa/` 존재 |
| 회원 LMS | `src/pages/member/lms/` — `LmsMemberDashboard`, `LmsMemberCredits`, `LmsMemberRequiredCourses`, `LmsMemberLicense`, `LmsMemberAssignments` |
| 조직 구조 참조 | `lib/yaksa/forum-data.ts` — 대한약사회, 서울특별시약사회 등 약사회 조직 계층 하드코딩 |

### 5.2 배포 구조

```
apps/web-kpa-society  →  Cloud Run: kpa-society-web  (현재 KPA 운영 중)
apps/main-site        →  Cloud Run: o4o-main-site    (별도 서비스, 약사회 브랜드)
```

`main-site`는 `kpa-society-web`과 **별도의 Cloud Run 서비스**로 배포된다.

### 5.3 판정

| 질문 | 판정 | 근거 |
|------|------|------|
| 플랫폼 공통 사이트인가? | **아니오** | "약사회" 브랜딩, yaksa 전용 디렉토리, 약사회 조직 참조 |
| 과거 Yaksa/KPA 잔재인가? | **일부 그렇다** | `@o4o/main-site-nextgen` 네이밍 + yaksa 계층 구조 → KPA nextgen 버전으로 개발 시작한 앱으로 보임 |
| 현재 실제 운영 대상인가? | **불명** | deploy workflow 존재하나, `kpa-society-web`이 현재 운영 중인 KPA 앱. main-site가 실제로 트래픽을 받는지 확인 필요 |
| Event Offer 진입점으로 유지할 이유가 있는가? | **아니오** | Event Offer는 `web-kpa-society`에 구현됨. `main-site`는 아직 Event Offer 코드 없음 |
| 단순 dead link인가? | **그렇다 (groupbuy 부분만)** | groupbuy API 경로 4개 전부 미등록. 기능적으로 완전 사망 |

---

## 6. 삭제 가능성 분류

| 항목 | 파일/코드 위치 | 분류 | 판단 근거 |
|------|--------------|------|---------|
| `GroupbuyListPage.tsx` | `pages/groupbuy/GroupbuyListPage.tsx` | **즉시 삭제 가능** | API 완전 미등록, 기능 없음 |
| `GroupbuyDetailPage.tsx` | `pages/groupbuy/GroupbuyDetailPage.tsx` | **즉시 삭제 가능** | API 완전 미등록, 기능 없음 |
| `index.ts` (배럴) | `pages/groupbuy/index.ts` | **즉시 삭제 가능** | 삭제된 페이지의 re-export |
| lazy import 2개 | `router/index.tsx:22-23` | **즉시 삭제 가능** | 삭제된 페이지 참조 제거 필수 |
| Route element 2개 | `router/index.tsx:123-124` | **즉시 삭제 가능** | 삭제된 페이지 참조 제거 필수 |
| `navItems` 공동구매 항목 | `layouts/MainLayout.tsx:32` | **메뉴만 제거** | Dead link 노출 차단. 데스크톱+모바일 동시 제거됨 |
| 푸터 공동구매 링크 | `layouts/MainLayout.tsx:196` | **메뉴만 제거** | Dead link 노출 차단 |
| `groupbuyParticipations` stat | `DashboardPage.tsx:38,76,211` | **즉시 삭제 가능** | 항상 0 표시 (폴백 데이터). stat 항목 자체 제거 |
| 대시보드 공동구매 퀵링크 | `DashboardPage.tsx:238-246` | **즉시 삭제 가능** | Dead link |
| 비로그인 히어로 공동구매 소개 카드 | `DashboardPage.tsx:131-137` | **추가 판단 필요** | 서비스 소개 문구 — 기능 삭제 후 소개 카드도 정리할지 별도 결정 필요 |

> **Event Offer로 대체 후 삭제** 항목 없음.
> `main-site`에 Event Offer 연동이 계획되어 있지 않으며, 현재 Event Offer 코드도 없다.
> 단순 dead code 제거가 맞다.

---

## 7. 위험도 조사

### 7.1 TypeScript 영향

```
현재 TypeScript 오류: 없음 (페이지 파일이 존재하므로)
삭제 후 발생할 오류:
  - router/index.tsx:22-23 lazy import → 대상 파일 없음 → TS 오류
  - router/index.tsx:123-124 JSX → 미정의 변수 → TS 오류
  - DashboardPage.tsx:38 인터페이스 필드 → 삭제 시 :211 참조도 함께 제거 필요
  
다른 파일에서 pages/groupbuy/ import 여부: 0건 (router/index.tsx 단독)
```

**결론**: router/index.tsx + DashboardPage.tsx 2개 파일 수정 필수. 나머지는 파일 삭제만으로 처리 가능.

### 7.2 Build 영향

- `noUnusedLocals: true` (tsconfig.json) — lazy 변수를 선언만 하고 Route에서 미사용 시 오류
- 페이지 파일 삭제 + router 수정을 동시에 진행하면 빌드 통과
- partial 삭제(파일만 삭제하고 router 미수정) 시 빌드 실패

### 7.3 Router 영향

- `/groupbuy` → 삭제 후 404 fallback (router의 `path="*"` Route 처리)
- `/groupbuy/:id` → 동일

### 7.4 네비게이션 영향

- `navItems` 배열에서 공동구매 항목 제거 → 데스크톱 nav + 모바일 nav 동시 제거됨
- 남은 항목: 홈, 커뮤니티, 내 학습 (3개)
- 푸터 서비스 항목: 커뮤니티, 교육 (공동구매 제거 후 2개)

### 7.5 운영 사용자 영향

| 상태 | 변경 전 | 변경 후 |
|------|---------|---------|
| 메뉴 노출 | 공동구매 메뉴 있음 (클릭 시 에러 화면) | 메뉴 없음 (혼란 제거) |
| 직접 URL 접근 | 에러 화면 렌더링 | 404 페이지 표시 |
| 기능 손실 | 없음 (이미 작동 안 함) | 없음 |

**실질적 사용자 영향: 없음.** 현재도 에러 화면이 보이므로, 메뉴 제거가 오히려 사용자 경험 개선.

### 7.6 다른 서비스 연결 영향

- `main-site`의 groupbuy 코드는 `web-kpa-society`, `admin-dashboard`, `api-server` 등 다른 앱과 코드 의존성 없음
- Event Offer canonical 코드(`/api/v1/kpa/groupbuy*`, `eventOffer.ts`, `eventOfferAdmin.ts`) 영향 없음
- `SERVICE_KEYS.KPA_GROUPBUY = 'kpa-groupbuy'` DB 데이터 값 — 이번 삭제와 무관

---

## 8. 보존 대상 (절대 변경 금지)

다음은 이번 조사 및 후속 WO 범위와 무관하게 절대 보존:

| 항목 | 위치 |
|------|------|
| `eventOffer.ts` | `apps/web-kpa-society/` |
| `eventOfferAdmin.ts` | `apps/web-kpa-society/` |
| `/api/v1/kpa/groupbuy-admin/*` | `kpa.routes.ts` |
| `/api/v1/kpa/groupbuy/*` | `kpa.routes.ts` |
| `SERVICE_KEYS.KPA_GROUPBUY` | `service-keys.ts` |

---

## 9. 후속 WO 후보

### WO-O4O-GROUPBUY-MAIN-SITE-CLEANUP-V1 (권장)

**우선순위**: HIGH

**작업 범위 (6개 항목)**:

```
[삭제]
1. apps/main-site/src/pages/groupbuy/GroupbuyListPage.tsx
2. apps/main-site/src/pages/groupbuy/GroupbuyDetailPage.tsx
3. apps/main-site/src/pages/groupbuy/index.ts

[수정]
4. apps/main-site/src/router/index.tsx
   - lazy import 2개 (lines 22-23) 제거
   - Route element 2개 (lines 123-124) 제거

5. apps/main-site/src/layouts/MainLayout.tsx
   - navItems 배열 공동구매 항목 (line 32) 제거
   - 푸터 공동구매 <li> 링크 (line 196) 제거

6. apps/main-site/src/pages/dashboard/DashboardPage.tsx
   - DashboardData 인터페이스 groupbuyParticipations 필드 제거
   - 통계 카드 공동구매 참여 div 제거
   - 바로가기 공동구매 Link 제거
```

**별도 판단 사항**: 비로그인 히어로 화면의 공동구매 소개 카드(`DashboardPage.tsx:131-137`)
— 기능 삭제 후 서비스 소개 문구를 유지할지 제거할지는 WO 실행 시 결정.

**검증**: TypeScript 빌드 통과 + 남은 nav 항목(홈/커뮤니티/내학습) 정상 동작 확인.

---

## 10. 조사 결론

`apps/main-site`의 groupbuy 잔류물은 **완전한 Dead Code**이며, 즉시 제거 가능하다.

| 항목 | 결과 |
|------|------|
| groupbuy 관련 파일 | 5개 (2 페이지 + index.ts + router 참조 + layout 참조) |
| groupbuy API 경로 | 4개 전부 서버 미등록 |
| 사용자 노출 여부 | 노출 중 (상단 nav + 모바일 nav + 푸터) — 클릭 시 에러 화면 |
| Event Offer 연관성 | 없음 (main-site에 Event Offer 코드 없음) |
| 삭제 시 기능 손실 | 없음 (이미 불동작 상태) |
| TypeScript 영향 | router + dashboard 2개 파일 동시 수정 필요 |

**권고**: `WO-O4O-GROUPBUY-MAIN-SITE-CLEANUP-V1` 실행.

---

*Auditor: Claude Code*
*Audit Date: 2026-05-15*
*Specification: IR-O4O-MAIN-SITE-GROUPBUY-RESIDUE-AUDIT-V1 v2 (전면 재작성)*
*Status: COMPLETE — WO 실행 대기 중*
