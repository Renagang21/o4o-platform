# CHECK — WO-O4O-NETURE-FORUM-CREATION-REQUEST-ENTRY-ALIGN-KPA-V1

Neture `/forum` 에 **포럼 개설 신청 진입점**을 추가하여 KPA 흐름(신청 → 운영자 검토 → 승인 → 포럼 생성)에 정렬한다.

## 1. 원인

Neture 포럼 홈(`/forum` = `ForumHubPage` + 공통 `ForumHubTemplate`)에는 개설 신청 CTA가 없었다.
기존 신청 화면(`/supplier/forum/request-category` = `RequestCategoryPage`)과 신청 상태 대시보드(`/supplier/my-forum` = `MyForumDashboardPage`)는 **모두 `<SupplierRoute>` 가드 하위**에 있어, 공급자만 접근 가능했다. 즉 일반 로그인 회원은 포럼 개설을 신청할 진입로가 없었다.

## 2. 조사 — 중지 조건 5개 검증 (전부 미해당)

| # | 중지 조건 | 결과 | 근거 |
|---|----------|------|------|
| 1 | 신청 API 가 공급자 계정에 강결합 | **미해당** | `POST /api/v1/forum/category-requests` 는 `authenticate` 만 요구. 멤버십 바인딩은 명시적으로 범위 밖(주석). 일반 로그인 회원 신청 가능 |
| 2 | serviceCode/소유권 오저장 | **미해당** | body `serviceCode:'neture'` + 카탈로그 fail-closed 검증. requesterId = 로그인 user.id |
| 3 | 다른 서비스 포럼으로 생성 | **미해당** | serviceCode='neture' → Neture 포럼으로 생성 |
| 4 | 운영자 승인 상태머신 변경 필요 | **미해당** | `forumRequestService` (pending→approve/revision/reject→포럼 생성) 무변경 |
| 5 | 신규 DB 스키마/migration 필요 | **미해당** | 스키마 변경 없음. 라우트·버튼·공통 폼 연결만 |

→ WO §6 "단순 라우트·버튼·공통 폼 연결로 해결 가능하면 완료" 조건 충족.

## 3. 변경

| 파일 | 변경 |
|------|------|
| `services/web-neture/src/pages/forum/ForumRequestPage.tsx` (신규) | 일반 회원용 `/forum/request` 페이지. 공통 `ForumRequestForm` + `createForumCategoryRequest(serviceCode='neture')` 재사용. back/success = `/forum` |
| `services/web-neture/src/pages/forum/ForumHubPage.tsx` | `headerAction` 슬롯에 `ForumRequestButton` (auth-aware) 주입 + infoLinks 에 '포럼 개설 신청' |
| `services/web-neture/src/App.tsx` | `/forum/request` 라우트 추가 (NetureLayout, 일반 영역) |

- **재사용**: 공통 `ForumRequestForm(@o4o/shared-space-ui)`, 기존 `createForumCategoryRequest`, `ForumHubConfig.headerAction`(KPA `ForumHomePage` 와 동일 패턴). 중복 구현 없음.
- **기존 공급자 경로 처리**: `/supplier/forum/request-category` 는 **삭제하지 않고 그대로 유지**(호환). 공급자 흐름(success → `/supplier/my-forum`)은 무변경.

## 4. 권한 / 흐름

- **신청 가능 사용자**: 로그인한 모든 회원(공급자 제한 아님). API = `authenticate`.
- **비로그인**: 버튼 클릭 → `navigate('/login', { state: { from: '/forum/request' } })`. Neture 로그인은 모달 방식이며 `LoginRedirect` 가 `location.state.from` 을 returnUrl 로 읽어 로그인 후 `/forum/request` 로 복귀.
- **운영자 승인**: 기존 `/operator/forum-*` 및 forum operator API 무변경.

## 5. 보존

- 운영자 승인 상태머신: 무변경
- 기존 API: 무변경 (신규 직접 생성 API 없음)
- 기존 공급자 경로 `/supplier/forum/request-category`: 유지
- DB / migration: 변경 없음

## 6. 알려진 한계 (후속 권고 — WO §5 보고)

Neture 에는 **일반 회원용 신청 상태 페이지가 없다**. 유일한 상태 대시보드 `MyForumDashboardPage` 는 (a) `<SupplierRoute>` 가드 하위이고 (b) 내부 링크가 `/supplier/forum/*` 로 하드코딩되어 있어 일반 회원에게 데드엔드가 된다. 따라서 본 WO 에서는 신청 성공 후 `/forum`(포럼 홈)으로 이동시킨다(폼이 3초간 성공 메시지 노출 후 이동). 일반 회원용 신청 상태 페이지(`/forum/my-requests` 등) 신설 또는 `MyForumDashboardPage` 일반화는 후속 WO 로 분리 권고.

## 7. 검증

- typecheck: 변경 3파일 에러 0 (web-neture tsc). 잔여 에러는 무관한 `@o4o/tablet-screen-set-editor` 미빌드(타 세션 작업물).
- 배포: 제 forum 커밋 직후 타 세션의 `@o4o/tablet-screen-set-editor`(SupplierTabletScreenSetsPage) 중간 커밋이 web-neture 빌드를 일시 파손 → 제 커밋의 "Deploy Web Services" 실패. 후속 V2C 커밋(5678fa9e3)이 패키지를 완성해 web 배포 성공, **제 forum 변경도 해당 배포에 포함되어 LIVE 반영** 확인.

### 운영 브라우저 스모크 (2026-07-22, https://neture.co.kr)

| # | 항목 | 결과 |
|---|------|------|
| 1 | `/forum` 에 `+ 포럼 개설신청` 버튼 노출 | PASS |
| 2 | 비로그인 상태 버튼 클릭 | PASS |
| 3 | Neture 로그인 모달 이동 (state.from=/forum/request) | PASS |
| 4 | 로그인 후 `/forum/request` 복귀 | PARTIAL — 아래 주석 |
| 5 | 폼 이름·설명·사유·태그 입력 | PASS |
| 6 | 신청 제출 `POST /forum/category-requests → 201` | PASS |
| 7 | 성공 메시지 → `/forum` 자동 이동 | PASS |
| 8 | 운영자 신청 관리(`/operator/community`) `대기 중` 표시 · `GET /forum/operator/requests?serviceCode=neture` | PASS (serviceCode=neture 확정) |
| 9 | 테스트 신청 안전 정리 = **거절**(포럼 미생성) `PATCH …/review → 200` | PASS |
| 10 | 콘솔 오류 0 / API 4xx·5xx 0 | PASS |

**#4 주석**: 로그인 인프라 `PostLoginRedirect` 가 권한 계정(admin/operator/supplier)을 역할 대시보드로 자동 유도하여 returnUrl 이 덮인다(관찰: operator 로그인 → `/admin`). 일반 회원은 `getNetureDashboardRoute→'/'` 이므로 `PostLoginRedirect` 가 개입하지 않아 로그인 모달 returnUrl(`/forum/request`)이 유지된다 → **WO 대상인 일반 로그인 회원 경로는 정상**. 보유 테스트 계정이 전부 권한 계정이라 일반회원 복귀는 코드경로로 확인(브라우저 직접 재현 미수행). 하드 중지 조건 미해당. 필요 시 권한 계정에서도 returnUrl 우선하도록 `PostLoginRedirect` 보정은 별도 WO 후보.

**후속 WO 후보(이번 범위 제외)**: ① 일반 회원용 신청 상태 페이지(`/forum/my-requests` 등) 또는 `MyForumDashboardPage` 일반화 ② 권한 계정 returnUrl 우선 보정.
