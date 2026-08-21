# CHECK-O4O-PHARMACYHUB-COMMUNITY-CAPABILITY-FULL-ADOPTION-V1

- **WO**: `WO-O4O-PHARMACYHUB-COMMUNITY-CAPABILITY-FULL-ADOPTION-V1`
- **선행 CHECK**: [CHECK-O4O-KPA-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-CAPABILITY-PARITY-AUDIT-V1](./CHECK-O4O-KPA-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-CAPABILITY-PARITY-AUDIT-V1.md)
- **시작 commit**: `2ee6c8113`
- **작성일**: 2026-08-21
- **판정**: `PH_COMMUNITY_CAPABILITY_ADOPTION = NOT_COMPLETE`
  - 포럼 축(§5~§9, §14~§16) = **COMPLETE**
  - Content / Resources 축(§10~§13) = **중지 조건(§20) 해당 — 신규 table + migration 필요**

---

## 1. 재확인 census (§3)

과거 수치를 그대로 구현 목록으로 쓰지 않고 현재 main 기준으로 재조사했다. 미조사 0.

| capability | KPA route/page | PH 조사 전 상태 | 공통 모듈 | backend route | adoption action |
|---|---|---|---|---|---|
| 포럼 목록/상세/작성 | `/forum/*` | 존재 | `ForumHubTemplate` / `ForumListTemplate` | `/api/v1/pharmacy-hub/forum/*` (공통 factory) | 변경 없음 |
| 포럼 개설 신청 | `/forum/request` | **없음 (P0)** | `ForumRequestForm` | `/api/v1/forum/category-requests` (`serviceCode`) | PH wrapper 신설 |
| 내 신청 현황 | 소유자 대시보드 내 | **없음** | `ForumOwnerDashboard` requests 섹션 | `/forum/category-requests/my?serviceCode=` | adapter 주입 |
| 운영자 심사 큐 | 운영자 콘솔 | 이미 존재 | 공통 operator 콘솔 | `/api/v1/forum/operator/*` | 변경 없음 |
| 비공개 포럼 가입 | `ClosedForumAccessBlocker` (KPA 로컬) | **없음** | (없었음) → `ClosedForumJoinPanel` 신설 | `/pharmacy-hub/forum/categories/:id/{membership-status,join-requests}` | 공통 컴포넌트 추출 후 채택 |
| 내 포럼 대시보드 | 존재 | **없음** | `ForumOwnerDashboard` | `/categories/mine`, `/categories/:id/owner` | PH wrapper 신설 |
| 포럼 회원 관리 | 존재 | **없음** | `ForumOwnerMemberManagement` | `/categories/:id/{members,join-requests}` | PH wrapper 신설 |
| 포럼 삭제 요청 | 존재 | **없음** | `ForumOwnerDashboard` 삭제 요청 | `/categories/:id/delete-request` | adapter 주입 |
| Community Content | `/content/*` | **없음** | `CommunityContentListView` 등 | `createContentResourceCore` + `kpa_contents` | **중지 — §20** |
| Community Resources | `/resources` | **없음** | `ResourcesHubTemplate` | 동상 | **중지 — §20** |
| 운영자 Content/Resources 관리 | 존재 | **없음** | 공통 operator 콘솔 | 동상 | **중지 — §20** |

> 참조 구현은 KPA 가 아니라 **K-Cosmetics(`services/web-k-cosmetics`)** 를 썼다. KPA 포럼은 `/api/v1/kpa/forum` 전용 변형이고, K-Cosmetics 가 공통 service forum router 계약을 그대로 쓰는 최신 채택 사례이기 때문이다.

---

## 2. 포럼 개설 신청 (§5, P0)

- **backend 변경 0**. `apps/api-server/src/config/service-catalog.ts` 에 `key: 'pharmacy-hub'` 가 이미 있어 공통 `/api/v1/forum/category-requests` 의 `serviceCode` 검증을 통과한다. PH 전용 endpoint 신설하지 않았다.
- client: `services/web-pharmacy-hub/src/services/forumApi.ts` 에 `createPharmacyHubForumCategoryRequest` / `fetchMyPharmacyHubForumRequests` 추가.
- 화면: `pages/forum/RequestForumPage.tsx` = 공통 `ForumRequestForm`(theme `emerald`) 얇은 wrapper. 자체 폼 JSX 0.
- 운영자 심사 큐: 기존 `forumOperatorApi`(`/forum/operator/*` + `serviceCode=pharmacy-hub`) 그대로. 유입 경로 확인.

완료 기준 4개(진입점 / 제출 / 내 현황 / 운영자 큐 유입) 모두 충족.

## 3. 비공개(closed) 포럼 가입 (§6)

- backend 는 이미 403 `CLOSED_FORUM_ACCESS_DENIED` + `data.forumId` 를 준다(`ForumPostController` 4개 지점).
- 공통 컴포넌트가 없어 KPA 로컬 `ClosedForumAccessBlocker` 만 있었다. §4 "KPA 코드 복붙 금지" 에 따라 **`packages/shared-space-ui/src/ClosedForumJoinPanel.tsx` 로 공통 추출**했다. API·팔레트·로그인 여부만 주입받고, membership 정책은 공통 forum membership 계약 그대로다(PH 전용 정책 신설 0).
- PH `ForumListPage`(variant `cell`) / `ForumDetailPage`(variant `page`) 가 403 을 가입 동선으로 전환한다. `closedForumIdFromError()` 가 axios 응답 형태(`err.response.data.code`)를 해석한다.
- 상태: 미로그인 / 미가입 / 신청중(pending) / 승인완료(member) 4상태.

## 4. 내 포럼 대시보드 · 회원 관리 · 삭제 요청 (§7·§8·§9)

- `pages/forum/MyForumDashboardPage.tsx` = 공통 `ForumOwnerDashboard`, `pages/forum/ForumMemberManagementPage.tsx` = 공통 `ForumOwnerMemberManagement`.
- `services/forumOwnerAdapter.ts` 는 `createForumOwnerApi` / `createForumOwnerMembershipApi` 에 PH 호출 함수만 주입한다(대형 JSX 복제 0, §16 준수). teal 팔레트는 Tailwind JIT 때문에 클래스 문자열 전체를 명시했다.
- 삭제는 **요청(`/delete-request`) → 운영자 심사** 만 있다. 소유자 직접 hard delete 신설 0 (§9).
- 회원 관리는 KPA/K-Cosmetics 에 실제 존재하는 capability(가입 요청 승인·반려, 회원 목록, 회원 제거)만 채택. 신규 moderation 기능 0 (§8).

## 5. Community Content / Resources (§10·§11) — **중지 조건(§20)**

**판정: 이번 WO 범위에서 진행 불가.**

근거:

1. 공통 `createContentResourceCore(dataSource, config)` 는 **물리 테이블 주입으로 서비스를 격리**한다. `config.tableName` 은 기본값이 없고(`assertSafeTableName`), 서비스가 반드시 명시한다.
   - `kpa_contents` (`routes/kpa/controllers/kpa-content-resource.config.ts:96`)
   - `cosmetics_contents` (`routes/cosmetics/controllers/resources.controller.ts:40`)
   - `glycopharm_contents` (`routes/glycopharm/controllers/resources.controller.ts:40`)
2. PharmacyHub 용 content 테이블은 존재하지 않는다. `grep -rhoE "pharmacy_hub[a-z_]*" apps/api-server/src/migrations/*.ts` → 0건.
3. 따라서 §10~§13 채택은 **신규 테이블 + migration** 이 전제다. 이는 WO §12("새 테이블 필요 / schema migration 필요 이면 중지 조건") · §20 · CLAUDE.md 중지 조건에 정면으로 해당한다.
4. 기존 서비스 테이블(`kpa_contents` 등)을 PH 가 공유하는 우회는 **cross-service mixing** 이라 §15 위반이다. 채택하지 않았다.

부수 확인: PH 커뮤니티 `/home/latest` 는 이미 소스 주석에서 "Content/Resources 가 아직 없으므로 forum / course 두 축만 반환한다" 고 계약을 명시하고 있어, 현재 상태는 은폐가 아니라 명시된 미구현이다.

§10 의 "매장 실행자산을 community content 의 대체로 보지 않는다" 원칙에 따라, PH 매장 실행자산으로 Content/Resources 를 대체 표시하는 우회도 하지 않았다.

**후속 WO 필요**: `WO-O4O-PHARMACYHUB-COMMUNITY-CONTENT-RESOURCE-TABLE-AND-ADOPTION-V1` (테이블 설계 + migration + 공통 Core 채택 + operator 콘솔 채택 일괄).

## 6. PH 운영자 Content/Resources 관리 (§13)

위 §5 와 동일 사유로 **중지**. 관리 대상 저장소가 없는 상태에서 운영자 콘솔만 붙이면 dead navigation 이 되어 §14 를 위반한다.

## 7. Navigation parity (§14)

"기능 존재 + 진입점 없음 = PARTIAL" 를 남기지 않기 위해 3개 진입점을 모두 노출했다.

| 진입점 | 위치 |
|---|---|
| 포럼 개설 신청 `/forum/request` | `config/navigation.ts` 커뮤니티 children + `ForumHubPage` infoLinks |
| 내 포럼 `/forum/my-dashboard` | 동상 |
| 포럼 회원 관리 `/forum/my-dashboard/:forumId/members` | 대시보드 카드 내 링크 |

역방향(진입점만 있고 route 없음 = dead link)도 0 — 3 route 전부 `App.tsx` 에 등재돼 있고 테스트로 고정했다.

## 8. 권한 · service scope (§15·§16)

- 새 route 3개는 전부 기존 `<MembershipGate>` 안에 배치. **새 권한 체계 0**.
- 쓰기는 backend 공통 가드 `requireActiveServiceMembership(SERVICE_KEY)` 가 이미 담당한다.
- PH client 는 서비스 스코프 base `'/pharmacy-hub/forum'` 로만 호출한다. 공통 base(`/forum/category-requests`, `/forum/operator`)를 쓰는 호출은 전부 `serviceCode=pharmacy-hub` 를 query 또는 body 로 동반한다. **generic unscoped API 신설 0** — backend 변경 자체가 0이다.
- 타 서비스 base(`/kpa/forum`, `/cosmetics/forum`, `/glycopharm/forum`, `/neture/forum`) 호출 0 — 테스트로 고정.

## 9. 공통 View / Core 채택 목록 (§4·§16)

| PH 파일 | 채택한 공통 자산 |
|---|---|
| `pages/forum/RequestForumPage.tsx` | `ForumRequestForm` |
| `pages/forum/MyForumDashboardPage.tsx` | `ForumOwnerDashboard` |
| `pages/forum/ForumMemberManagementPage.tsx` | `ForumOwnerMemberManagement` |
| `services/forumOwnerAdapter.ts` | `createForumOwnerApi` / `createForumOwnerMembershipApi` |
| `pages/forum/ForumListPage.tsx` · `ForumDetailPage.tsx` | `ClosedForumJoinPanel` (신규 공통 추출) |
| backend | `createServiceForumRouter` / `/forum/category-requests` / `/forum/operator/*` — **무변경** |

PharmacyHub 전용 복제 View 0 / PH 전용 backend controller 0 / DB schema 변경 0.

## 10. 테스트 (§17)

`services/*` 에는 frontend 테스트 인프라가 없다. 저장소 관례(정적 source-contract spec)에 따라 백엔드 테스트 디렉터리에 고정했다.

- 신규: `apps/api-server/src/__tests__/pharmacy-hub-community-capability-adoption.spec.ts` — **23 passed**
  - §5 포럼 개설 신청 6 / §6 비공개 포럼 가입 4 / §7·§8·§9 소유자 영역 4 / §14 navigation 6 / §15 cross-service isolation 3
- 회귀: `pharmacy-hub-community-baseline.spec.ts` — **6 passed**
- typecheck: `services/web-pharmacy-hub` `tsc -b` EXIT 0, `services/web-k-cosmetics` `tsc -b` EXIT 0
- build: `services/web-pharmacy-hub` `vite build` 성공

### 범위 밖에서 발견한 선행 결함 (수정함 — 빌드 차단이라 불가피)

`services/web-pharmacy-hub/src/App.tsx` 에 미사용 import 2건(`RoleEntryPage`, `ROLES`)이 남아 `tsc -b` 가 **main 에서 이미 실패**하고 있었다(`769f562d5` supplier role 제거의 잔재, TS6133). §24 의 build/deploy 를 수행할 수 없어 해당 2줄만 제거했다. 그 외 범위 밖 수정 0.

## 11. Production smoke (§18)

배포: `Deploy Web Services (Cloud Run)` run `32445144265` — `deploy-pharmacy-hub` ✓ (2m23s). 대상 `https://pharmacyhub.co.kr`.

### 화면 smoke (desktop 1440×900 / mobile 390×844)

| route | desktop | mobile |
|---|---|---|
| `/forum` | 렌더 OK | 렌더 OK |
| `/forum/request` | 신청 폼 렌더 OK | 렌더 OK |
| `/forum/my-dashboard` | 신청 내역·운영 포럼 섹션 렌더 OK | 렌더 OK |

white screen 0 / JS exception 0 / unexpected 4xx·5xx 0 / dead navigation 0 / cross-service mixing 0.

### P0 동선 end-to-end (test fixture 생성 → 반려로 종료)

`pharmacy-hub:store_owner` 계정으로 진행했다.

1. `/forum/request` 제출 → 성공 후 `/forum/my-dashboard` 로 이동
2. 내 신청 내역에 `ZZ-테스트-포럼-WO-ADOPTION-V1` **검토 중** 표시 (`1 전체 신청 / 1 진행 중 / 0 승인됨`)
3. `pharmacy-hub:operator` 로 `/operator/forum` → "포럼 개설 요청 1건" 유입 확인
4. `/operator/forum-requests` 큐에 신청 레코드(포럼명·설명·신청자·신청일·상태) 표시 확인
5. 상세에서 **거절** 처리 → 재조회 시 `거절됨`, 대기 건수 0

승인은 실제 포럼을 생성하므로 수행하지 않았다. 운영 데이터 훼손 0 — 테스트 신청 1건이 `거절됨` 상태로 남고 포럼은 생성되지 않았다.

## 12. 잔존 gap

| # | 항목 | 상태 | 후속 |
|---|---|---|---|
| G1 | PH Community Content 채택 | **MISSING_ADOPTION** | 신규 WO (테이블+migration 필요) |
| G2 | PH Community Resources 채택 | **MISSING_ADOPTION** | 동상 |
| G3 | PH 운영자 Content/Resources 관리 | **MISSING_ADOPTION** | 동상 |
| G4 | KPA `ClosedForumAccessBlocker` → 공통 `ClosedForumJoinPanel` 재지정 | 미수행(범위 밖) | 공통화 재정렬 트랙에 편입 |
| G5 | PH LMS learner full adoption | §19 명시 제외 | 다음 큰 축 |
| G6 | PH My Store 잔여 adoption | §19 명시 제외 | — |

§21 완료 판정: `P0 = 0` ✅ / `P1 = 0` ❌(G1·G2·G3) / `PARTIAL_ADOPTION = 0` ✅ / `MISSING_ADOPTION = 0` ❌
→ **`PH_COMMUNITY_CAPABILITY_ADOPTION = NOT_COMPLETE`**
