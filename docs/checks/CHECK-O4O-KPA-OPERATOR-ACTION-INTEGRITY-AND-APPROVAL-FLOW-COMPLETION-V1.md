# CHECK — 운영자 처리 결과 정합성 + 승인 동선 완결

> WO-O4O-KPA-OPERATOR-ACTION-INTEGRITY-AND-APPROVAL-FLOW-COMPLETION-V1
> 작업일: 2026-07-27
> 상태: **IMPLEMENT(Scope 1·2·3·5·6·7) 완료 + Scope 4 HOLD(근거 보고). 타입체크 4/4 GREEN → 배포 → 실브라우저 smoke.**
> 선행 감사: `docs/investigations/IR-O4O-KPA-OPERATOR-REMAINING-WORKFLOW-AND-SCREEN-GAPS-AUDIT-V1.md` (commit 850768278)

---

## 0. 목표 재확인

운영자가 승인/상태변경/권한변경을 수행했을 때 **실제 백엔드 결과 · 현재 목록 · 대시보드 KPI · 회원/매장/상품 상태 · 콘텐츠 HUB 노출 · 다음 동선**이 서로 어긋나던 구조적 결함군을 제거한다. 공급자 CMS→HUB 승인 화면 완결(백엔드는 있으나 진입 UI 부재), mutation 후 서버 재조회 표준화, 부분 실패의 표면화가 핵심.

각 승인 경로의 실제 controller·service·transaction·데이터 상태를 read-only 로 재확인한 뒤, 의미·경계가 확정된 항목만 구현하고 불명확한 항목은 HOLD 했다.

---

## 1. 공급자 콘텐츠 승인 화면 (Scope 1, P0) — 결과

**결함:** 백엔드 `GET/POST /api/v1/kpa/operator/approvals`(`content-approval.controller.ts`, guard `requireKpaScope('kpa:operator')` = kpa:operator OR kpa:admin, platformBypass:false)는 실재하나, KPA 웹 운영자 콘솔에 **진입 화면·라우트·메뉴가 전혀 없어** 공급자 CMS→HUB 콘텐츠 승인과 사이니지 캠페인 요청 승인 업무가 도달 불가였다. admin-dashboard 에만 참조 UI(react-query 기반)가 존재.

**구현:**
- 신규 화면 [SupplierContentApprovalPage.tsx](services/web-kpa-society/src/pages/operator/SupplierContentApprovalPage.tsx) — admin-dashboard 참조 페이지를 **KPA 네이티브 컨벤션**(`apiClient` + `useState`/`useCallback`/`useEffect` + `DataTable`(@o4o/operator-ux-core) + `RowActionMenu`/`BaseDetailDrawer`(@o4o/ui))으로 재구성. react-query 직접 복사 대신 CollaborationRequestsPage 구조를 미러링(신규 의존성/패턴 도입 0).
- entity_type 탭(전체/공급자 자료 `hub_content_submission`/사이니지 캠페인 `signage_campaign_request`) + 상태 필터(대기중/승인/반려/전체) + 페이지네이션.
- 승인/반려 → `POST .../:id/approve {comment}` · `.../:id/reject {reason}` (백엔드 body 필드명과 정확히 일치). **mutation 성공 후 `await load()` 로 목록·건수 서버 재조회** — 낙관적 위장 없음.
- 라우트 [OperatorRoutes.tsx](services/web-kpa-society/src/routes/OperatorRoutes.tsx) `/operator/approvals` (기존 상위 `RoleGuard` PLATFORM_ROLES 하위) + 메뉴 [operatorMenuGroups.ts](services/web-kpa-society/src/config/operatorMenuGroups.ts) approvals 그룹에 "공급자 콘텐츠 승인" 추가.

**계약 근거:** 목록 응답 `{success, data[], total, page, limit, totalPages}` · 목록은 `SELECT *`(JOIN 없음)이며 `kpa_approval_requests` 실제 컬럼(`requester_name` NOT NULL, `requester_email`, `payload`, `review_comment`, `created_at` 등)만 렌더 — migration `20260403300000` 로 검증.

## 2. mutation 후 재조회 표준화 (Scope 2/7) — 대상·결과

| 대상 | 기존 | 수정 |
|------|------|------|
| [OperatorStoreDetailPage.tsx](services/web-kpa-society/src/pages/operator/OperatorStoreDetailPage.tsx) `handleChannelStatusChange` | 낙관적 `setChannels` 만 | 낙관적 갱신 후 **`await loadChannels()`** 서버 동기화 |
| 동 `handleToggleCapability` | 낙관적 `setCapabilities` 만 | 낙관적 갱신 후 **`await loadCapabilities()`** 서버 동기화 |
| SupplierContentApprovalPage(신규) | — | 승인/반려 후 `await load()` |

낙관적 값이 서버 실제 전이 결과와 어긋날 여지를 제거. 실패 시 toast 로 표면화(기존 계약 유지).

- **협업 문의(CollaborationRequestsPage)·상품 신청 콘솔·ApplicationsTab.executeReview** 는 이미 `await load()`/`loadApplications()` 재조회 표준을 준수 중 → 변경 없음(회귀 방지).

## 3. 상품 승인 / 진열 계약 (Scope 3) — 부분 실패 표면화

**결함:** [product-approval-v2.service.ts](apps/api-server/src/modules/product-policy-v2/product-approval-v2.service.ts) `approveServiceProduct` 는 approval 커밋과 매장 진열(OPL) 활성화를 **SAVEPOINT 로 분리**(bridge 승인 등 organization FK 위반에도 승인 보존). 그런데 UPSERT 실패 시 `catch {}` 가 **조용히 삼켜** 로그도 없고, 프론트 공통 콘솔은 결과와 무관하게 `"승인 완료. 매장 진열 상품이 생성되었습니다."` 를 **무조건 단언**했다.

**계약 정리:** approval 승인과 OPL 활성은 **의도된 분리 트랜잭션**(중지 조건에 해당 — 경계 자체는 유지). 다만 결과를 성공으로 위장하지 않도록 **관측성 + 표면화**만 추가:
- 백엔드 catch 에 `console.error([ProductApprovalV2] listing UPSERT failed after approval commit — approvalId/offerId/org …)` 로깅 추가. best-effort 보존 정책은 유지.
- 컨트롤러 응답 `data.listingActivated`(=`listing?.is_active === true`)는 이미 존재 → 프론트까지 정규화 전달:
  - 공통 타입 [types.ts](packages/operator-core-ui/src/modules/product-applications/types.ts) `approve(id): Promise<ProductApproveResult | void>` (`{listingActivated?}`).
  - 공통 콘솔 [ProductApplicationManagementConsole.tsx](packages/operator-core-ui/src/modules/product-applications/ProductApplicationManagementConsole.tsx) `handleConfirmAction` 이 `listingActivated === false` 면 **error 토스트**("승인은 완료됐지만 매장 진열 활성화에 실패했습니다. 진열 상태를 확인해주세요."), 그 외 성공 토스트로 분기.
  - 3개 어댑터(KPA/GP/KCos `ProductApplicationManagementPage.tsx`) `approve` 를 `{listingActivated}` 로 정규화. **공통 콘솔·타입 변경이므로 3소비처 전수 반영**(Shared Module Change Rule).

## 4. KpaApplication 의미 / 온보딩 경로 (Scope 4) — **HOLD**

**중지 근거(중지 조건 명시 항목):** `kpa_applications`(ApplicationsTab) 도메인은 KPA 회원 온보딩(`kpa_members` + `service_memberships`)과 **분리된 별도 도메인**이다. `PATCH /applications/:id/review` 는 순수 status flip + 이메일 + audit 로 끝나는 **dead-end**(실 provisioning 연결 없음)로 보이나, 이 신청서가 (a) 회원 가입 신청인지 (b) 분회/자격 신청인지 (c) 레거시 데모 잔재인지 **코드+데이터만으로 사업적 의미를 확정할 수 없다**. 온보딩 경로 정합(신청 승인 → 실제 회원 활성/권한 부여)을 임의로 배선하면 잘못된 provisioning 을 유발할 수 있어 **HOLD**. 정책 확정(별도 WO) 후 진행 권장.

- 연관 follow-up(범위 밖, 보고만): 회원 상태 변경(`/members/:id/status`) provisioning 이 **transaction wrapper 없이** 다단계 부수효과를 수행 → 부분 실패 시 정합성 위험. 본 WO 의 승인 화면 범위와 무관하므로 별도 WO 로 분리 권장.

## 5. operator / admin 권한 경계 (Scope 5) — 결과

**결함:** ApplicationsTab(가입 신청서)의 백엔드 3 엔드포인트(`/applications/admin/all`, `/admin/stats`, `/:id/review`)는 전부 **`requireScope('kpa:admin')` admin 전용**(`application.controller.ts`, `WO-KPA-A-GUARD-STANDARDIZATION-FINAL-V1` 에서 operator→admin 정렬). 그런데 [MemberManagementPage.tsx](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx) 가 이 탭을 **모든 운영자(kpa:operator 포함)에게 노출** → 클릭 시 전부 403 이 되는 **죽은 동선**.

**수정(UI-only, 기존 백엔드 계약에 정렬 — 권한 확장 아님):**
- `useAuth()` + `ROLES` 로 `canReviewApplications = roles∋kpa:admin ∨ platform:super_admin ∨ membershipRole==='admin'` 판정.
- 조건 미충족 시 "가입 신청서" **탭 버튼 숨김** + `?tab=applications` 딥링크 무시(members 로 fallback) + `/admin/stats` 호출 생략(콘솔 403 제거).
- 회원 관리(operator 정상 기능)는 그대로 노출 — **기능 은폐 0**. admin 전용 dead 탭만 정리.

## 6. kpa_contents status 어휘 + 호환 (Scope 6) — 결과

**결함:** 저장 표준(`WO-O4O-CONTENT-SAVE-MEANS-READY-GLOBAL-STANDARD-V1`)상 `kpa_contents` 기본 저장 status = **`'ready'`**(저장=즉시 사용 가능, [kpa.routes.ts:1652](apps/api-server/src/routes/kpa/kpa.routes.ts)). 그러나 홈/커뮤니티 피드 리더는 `WHERE c.status = 'published'` 만 읽어 **저장 즉시 노출돼야 할 콘텐츠가 피드에서 사라졌다**.

**수정(read-compat, 쓰기 어휘 불변):** content·resource 피드 쿼리 2곳을 `WHERE c.status IN ('ready','published')` 로 정렬. 쓰기·다른 소비처(관리 목록·HUB·대시보드 KPI는 `cms_contents` 를 읽어 무관)는 미변경.

**read-only census(프로덕션, cloud-sql-proxy:5442 / o4o_api):**
```
status     is_deleted sub_type   count
draft      t          content    2
draft      t          (null)     1
draft      f          resource   1
published  f          content    2
published  f          resource   3
ready      t          (null)     7
```
→ **비삭제(is_deleted=f) `ready` row = 0** (7개 전부 soft-deleted). 즉 본 수정은 **정합성/전방 보정**(향후 save-means-ready 콘텐츠가 피드에서 조용히 사라지는 것을 방지)이며, **현재 라이브 피드 노출은 변하지 않는다**. 0-data 를 "기능 완결"로 과장하지 않음 — 데이터가 쌓이면 자동 정합.

## 7. 대시보드 / HUB / 목록 정합 (Scope 7) — 결과

- Scope 2 재조회로 매장 상세(채널·기능)는 mutation 후 서버 상태와 즉시 일치.
- 공급자 콘텐츠 승인 화면은 승인 시 백엔드 트랜잭션이 대상 콘텐츠 상태 전환(`cms_contents`→published / `signage_media`→active / `kpa_contents`→published) + 사이니지 `signage_forced_content` 생성까지 수행 → 승인 후 `await load()` 로 목록·건수 갱신. HUB/대시보드 KPI 는 `cms_contents` 기준이므로 승인 결과가 즉시 반영.
- 상품 승인은 Scope 3 로 진열 활성 성공/부분실패가 토스트에 정확히 반영.

## 8. HOLD & 정책 항목

| 항목 | 판정 | 근거 |
|------|:----:|------|
| Scope 4 KpaApplication 온보딩 경로 배선 | **HOLD** | 신청서 사업적 의미 코드+데이터로 확정 불가 (중지 조건). 오배선 시 잘못된 provisioning 위험 |
| 회원 상태변경 무-transaction provisioning | **follow-up(범위 밖)** | 본 WO 승인 화면 범위 아님. 별도 WO 권장 |
| 상품 approval↔OPL 분리 트랜잭션 경계 | **유지** | 의도된 SAVEPOINT 분리(중지 조건). 경계 변경 대신 관측성+표면화만 추가 |

## 9. migration / 데이터 보정

- **migration 0건, 데이터 보정 0건.** Scope 6 은 read-compat 코드 수정만(쓰기 어휘·스키마 불변). 나머지 전부 코드 레벨. 프로덕션 데이터 write 없음(read-only census 만 수행).

## 10. 배포 / smoke

- 타입체크: **web-kpa-society / glycopharm-web / k-cosmetics / api-server 4/4 GREEN**(tsc --noEmit).
- 배포: 커밋 `d4278b519` push → CI `Deploy API Server (Cloud Run)` + `Deploy Web Services (Cloud Run)` 둘 다 **completed / success (GREEN)**.
- 실브라우저 smoke(sohae2100 = kpa:admin+operator, kpa-society-web 프로덕션):
  - **Scope 1 GREEN** — `/operator/approvals` 렌더 확인: heading "공급자 콘텐츠 승인", entity_type 탭(전체/공급자 자료/사이니지 캠페인), 상태 필터(대기중/승인됨/반려됨/전체), DataTable 6컬럼(액션/유형/제목·상세/요청자/생성일/상태), 정상 empty state("대기 중인 승인 요청이 없습니다" = 200 빈배열, 에러 아님). 사이드바 `승인` 그룹에 메뉴 항목 `공급자 콘텐츠 승인 → /operator/approvals` 노출. 신규 엔드포인트 401/403/500 없음.
  - **Scope 5 GREEN** — `/operator/members`: 계정 역할 관리자(kpa:admin)/운영자/매장운영 확인, `가입 신청서`(Applications) 탭 **노출**(admin 양성 케이스). 탭 클릭 시 상태 필터+테이블+empty state 정상 로드, 에러 없음. (operator-only 음성 케이스는 전용 계정 부재로 코드 게이팅 정적 검증 — `canReviewApplications` = admin 역할 OR membershipRole==='admin'.)
  - **Scope 2/7** — 편집한 `OperatorStoreDetailPage` 렌더 무회귀 확인(매장 정보 / 채널 상태 / 기능 Capabilities 10 토글 / 매장 상품). refetch-after-mutation(`await loadCapabilities()` / `await loadChannels()`)은 mutation 핸들러 내부 — 실제 토글은 **프로덕션 write**(CLAUDE.md §0 승인 필요)이므로 실행하지 않고 코드 정적 검증. 결정적 변경(optimistic set 직후 서버 재조회)으로 판정.
  - 잔여 콘솔 401은 legal/policy 미게시(`/legal/documents/published/terms|privacy`, `/public/services/.../policies/*`)로 본 WO 범위 밖 기존 상태.

## 11. 커밋 SHA

- 구현 커밋: `d4278b519` (push 완료 `9deddc501..d4278b519`, CI 배포 GREEN). 본 CHECK §10/§11 smoke·SHA 확정은 후속 path-specific 커밋.
- 변경 파일: 신규 1(SupplierContentApprovalPage) + 프론트 8 + 백엔드 2 + 본 CHECK.
