# CHECK-O4O-KPA-OPERATOR-DASHBOARD-ACTION-AND-INFORMATION-ALIGNMENT-V1

> WO: `WO-O4O-KPA-OPERATOR-DASHBOARD-ACTION-AND-INFORMATION-ALIGNMENT-V1`  
> Date: 2026-07-25  
> Scope: KPA operator dashboard only

## 1. 결과 요약

KPA 운영자 대시보드의 KPI·Action Queue·Quick Action을 현재 operator route, sidebar, backend count, 권한 경계와 대조했다.

- 잘못 합쳐진 사이니지 대기 지표를 미디어/플레이리스트로 분리하고 각각의 실제 화면으로 연결했다.
- Queue 성격의 승인 화면을 Quick Action에서 제거해 KPI·Queue와의 과도한 중복을 줄였다.
- 같은 `/operator/content`로 연결되던 `콘텐츠 관리`/`공지사항` Quick Action 중복을 제거했다.
- Quick Action은 운영자가 반복적으로 사용하는 실행 화면 6개로 정리했다.
- admin 전용 `역할 관리`·`감사 로그`는 기존 `isAdmin` 조건을 유지해 operator 응답에는 포함되지 않는다.
- 신규 count, 신규 route, API contract, 권한, DB, 공통 dashboard package는 변경하지 않았다.

## 2. KPI 현황표

| KPI | 데이터 | route | 권한 | 판단 |
|---|---|---|---|---|
| 회원 승인 대기 | `kpa_members.status='pending'` | `/operator/members` | operator | 유지 |
| 포럼 요청 대기 | `forum_category_requests.status='pending'` | `/operator/forum-requests` | operator | 유지 |
| 콘텐츠 발행 대기 | `cms_contents.status='draft'` | `/operator/content` | operator | 유지 |
| 사이니지 미디어 대기 | `signage_media.status='pending'` | `/operator/signage/hq-media` | operator | 합산 KPI에서 분리 |
| 사이니지 플레이리스트 대기 | `signage_playlists.status='pending'` | `/operator/signage/hq-playlists` | operator | 합산 KPI에서 분리 |
| 이벤트 오퍼 승인 대기 | `organization_product_listings.approval_status='pending'` | `/operator/event-offers` | operator | 유지 |
| 상품 신청 대기 | 상품 신청 pending count | `/operator/product-applications` | operator | 유지 |
| 판매자 모집 승인 대기 | `neture_partner_recruitments.exposure_status='pending'` + KPA scope | `/operator/recruitment-exposure` | operator | 유지 |
| 전체 회원 | KPA 회원 count | `/operator/members` | admin 응답만 | 유지 |

기존 사이니지 KPI는 미디어와 플레이리스트 count를 합산하면서 `/operator/signage/hq-media`로만 이동했다. 플레이리스트 대기가 존재할 때 처리 화면이 어긋나므로 기존 두 count를 새 backend 없이 각각 표시하도록 수정했다.

## 3. Action Queue 현황표

Action Queue는 count가 0보다 클 때만 노출된다.

| Queue | route | 판단 |
|---|---|---|
| 회원 승인 검토 | `/operator/members` | 유지 |
| 포럼 요청 검토 | `/operator/forum-requests` | 유지 |
| 콘텐츠 발행 대기 | `/operator/content` | 유지 |
| 사이니지 미디어 확인 | `/operator/signage/hq-media` | 분리·문구 수정 |
| 사이니지 플레이리스트 확인 | `/operator/signage/hq-playlists` | 분리·신규 연결 |
| 이벤트 오퍼 승인 검토 | `/operator/event-offers` | 유지 |
| 상품 신청 검토 | `/operator/product-applications` | 유지 |
| 판매자 모집 노출 승인 검토 | `/operator/recruitment-exposure` | 유지 |

## 4. Quick Action 현황표

| 이전 항목 | 이전 route | 결과 | 이유 |
|---|---|---|---|
| 회원 관리 | `/operator/members` | 제거 | 회원 승인 KPI·Queue와 중복 |
| 상품 신청 관리 | `/operator/product-applications` | 제거 | 상품 신청 KPI·Queue와 중복 |
| 콘텐츠 관리 | `/operator/content` | 유지 | 반복 실행 화면 |
| 공지사항 | `/operator/content` | 제거 | 콘텐츠 관리와 동일 route 중복 |
| 포럼 관리 | `/operator/forum-requests` | 제거 | 포럼 요청 KPI·Queue와 중복 |
| 사이니지 | `/operator/signage/hq-media` | 유지 | 반복 실행 화면 |
| 매장 관리 | `/operator/stores` | 유지 | 반복 실행 화면 |
| 이벤트 오퍼 | `/operator/event-offers` | 제거 | 이벤트 오퍼 KPI·Queue와 중복 |
| Home 편집 | `/operator/community` | operator 공통으로 이동 | operator가 실제 편집 가능하며 반복 실행 화면 |
| 역할 관리 | `/operator/roles` | admin만 유지 | route 자체가 admin guard |
| 감사 로그 | `/operator/audit-logs` | admin만 유지 | route 자체가 admin guard |

추가한 operator Quick Action:

| 항목 | route | sidebar 대응 |
|---|---|---|
| 콘텐츠 허브 관리 | `/operator/docs` | 콘텐츠 허브 관리 |
| 강의 관리 | `/operator/lms` | 강의 관리 |

최종 operator Quick Action은 `콘텐츠 관리`, `Home 편집`, `콘텐츠 허브 관리`, `강의 관리`, `사이니지`, `매장 관리` 6개다. Admin 응답에는 여기에 `역할 관리`, `감사 로그`만 추가된다.

## 5. route·권한 대조

대시보드가 반환하는 모든 링크를 `services/web-kpa-society/src/routes/OperatorRoutes.tsx`와 대조했다.

| route | 실제 component/처리 | operator 접근 |
|---|---|---|
| `/operator/members` | `MemberManagementPage` | 가능 |
| `/operator/forum-requests` | `ForumRequestsManagementPage` | 가능 |
| `/operator/content` | `ContentManagementPage` | 가능 |
| `/operator/signage/hq-media` | `HqMediaPage` | 가능 |
| `/operator/signage/hq-playlists` | `HqPlaylistsPage` | 가능 |
| `/operator/event-offers` | `EventOfferManagePage` | 가능 |
| `/operator/product-applications` | `ProductApplicationManagementPage` | 가능 |
| `/operator/recruitment-exposure` | `RecruitmentExposureApprovalPage` | 가능 |
| `/operator/community` | `CommunityManagementPage` | 가능 |
| `/operator/docs` | `OperatorContentHubPage` | 가능 |
| `/operator/lms` | `OperatorLmsCoursesPage` | 가능 |
| `/operator/stores` | `OperatorStoresPage` | 가능 |
| `/operator/roles` | `RoleManagementPage` + admin `RoleGuard` | operator 불가, admin만 반환 |
| `/operator/audit-logs` | `AuditLogPage` + admin `RoleGuard` | operator 불가, admin만 반환 |

Frontend `/operator/*` 전체는 operator role guard 아래에 있고 backend dashboard는 `/api/v1/kpa/operator/dashboard`에서 `requireKpaScope('kpa:operator')`를 적용한다. `kpa:admin`은 기존 role hierarchy에 따라 operator scope를 포함하며, admin 전용 Quick Action은 backend `isAdmin` 분기로만 추가된다.

## 6. 무회귀·제외 범위

- 유지한 핵심 대기 KPI: 회원, 포럼, 콘텐츠, 이벤트 오퍼, 상품 신청, 판매자 모집.
- 기존 count query와 status 조건은 변경하지 않았다.
- AI Summary도 사이니지 미디어/플레이리스트를 실제 route별로 분리했다.
- `OperatorDashboardConfig` shape와 5-Block 순서는 변경하지 않았다.
- GP, K-Cosmetics, Neture, 공통 `operator-ux-core`, sidebar, 권한, API route, DB는 수정하지 않았다.
- 정책 판단이나 신규 backend count가 필요한 항목은 추가하지 않았다.

## 7. 검증

| 검증 | 결과 |
|---|---|
| KPA web `tsc --noEmit` | PASS |
| API production build (`tsc -p tsconfig.build.json`) | PASS |
| KPA web production build | PASS |
| API 전체 `tsc --noEmit` | 기존 OTC/HFF script 오류로 FAIL; 이번 변경 파일 관련 오류 0 |
| 배포 | PASS — GitHub Actions run `30145565555` |
| 운영 smoke | PASS |

전체 API typecheck의 기존 오류는 `drug-otc-*`, `hff-*` script의 중복 선언·타입 불일치이며 이번 WO 파일과 무관하다. 배포 경로와 동일한 API production build는 통과했다.

### 7.1 배포·운영 smoke

- 구현 commit: `cdb09f22c0c1112560bebe3760d45c1111e07fd1`
- API deploy workflow: `Deploy API Server (Cloud Run)` run `30145565555` 성공
- Cloud Run revision: `o4o-core-api-02880-h9t`
- serving image: `api-server:cdb09f22c0c1112560bebe3760d45c1111e07fd1`
- `/health`: `alive`
- KPA 운영 계정 로그인: 성공
- `/api/v1/kpa/operator/dashboard`: HTTP 200, `success=true`
- 운영 응답 KPI: 9개, `signage-media`와 `signage-playlists` 모두 존재
- 운영 응답 Quick Action: admin 겸용 계정 기준 8개(공통 6 + admin 전용 2), 동일 link 중복 0
- 현재 대기 데이터가 0이어서 Action Queue 응답은 0개 — count가 있을 때만 노출하는 기존 조건과 일치
- `https://kpa-society.co.kr/operator`: HTTP 200, 앱 root 정상
- 신규 revision `severity>=ERROR` 로그: 0건

인앱 브라우저는 현재 세션에 연결된 browser instance가 없어 사용할 수 없었다. 대신 운영 계정 인증 dashboard API, 공개 operator entry, Cloud Run serving image/revision과 error log를 직접 검증했다.

## 8. 변경·Git 상태

변경 파일:

- `apps/api-server/src/routes/kpa/services/operator-dashboard.service.ts`
- `docs/investigations/CHECK-O4O-KPA-OPERATOR-DASHBOARD-ACTION-AND-INFORMATION-ALIGNMENT-V1.md`

기존 dirty/untracked 보존:

- `docs/investigations/CHECK-CODEX-ENV-SETUP-V1.md`
- `.codex/`
- `apps/api-server/_msm.mjs`
- `apps/api-server/_msmx.mjs`

위 기존 파일은 수정·stage·commit하지 않는다.

구현 commit은 `cdb09f22c0c1112560bebe3760d45c1111e07fd1`이며, 본 배포·smoke 결과 기록은 후속 docs-only commit으로 반영한다.
