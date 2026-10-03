# CHECK-O4O-ADMIN-PENDING-WORK-COUNTER-AND-HEADER-ENTRY-V1

> WO: WO-O4O-ADMIN-PENDING-WORK-COUNTER-AND-HEADER-ENTRY-V1 · 작성일: 2026-10-03
> 선행: `38aaa4100` — admin 헤더 placeholder 알림 벨(하드코딩 배지 "3") 제거 · 배포 후 라이브 번들에서 배지 마크업 0건 확인

## 1. 판단

admin-dashboard 헤더에 필요한 것은 "알림"이 아니라 **관리자가 판단해야 할 업무가 지금 몇 건 남아 있는가**다.

- platform admin 대상 `notifications` 생성처는 0 (기존 writer 수신자는 서비스 역할 · 공급자 · 매장 · 신청자뿐).
- admin-dashboard 의 결정 대기 큐는 `O4O 상품 DB` 4곳. 그중 관리자 판단 업무 2곳만 채택.

| 큐 | 기준 | 채택 |
|---|---|---|
| 상품 등록 요청 | `product_candidates` store_web · `candidate_status IN (pending, reviewing)` | ✅ |
| 설명서 검수 | 공급자 STORE 설명서 `status = needs_review` | ✅ |
| 공공데이터 후보 | 등록 전 backlog | ❌ 작업량 지표 |
| 이미지 상태 | missing_image | ❌ 품질 지표 |

## 2. 구현

| 구분 | 파일 | 내용 |
|---|---|---|
| API | `apps/api-server/src/routes/admin/pending-tasks.routes.ts` (신규) | `GET /api/v1/admin/pending-tasks/summary` → `{ productRegistrationRequests, manualReviews, total }`. `authenticate` + `requireAdmin`(platform:super_admin) + `apiLimiter`. read-only COUNT, parameter binding |
| 마운트 | `apps/api-server/src/bootstrap/register-routes.ts` | `/api/v1/admin/pending-tasks` (catch-all `/api/v1/admin` 보다 먼저) |
| FE API | `apps/admin-dashboard/src/api/admin-pending-tasks.api.ts` (신규) | `authClient.api.get` |
| FE UI | `apps/admin-dashboard/src/components/layout/PendingTasksMenu.tsx` (신규) · `AdminHeader.tsx` | 헤더 `[검토 대기 N]` → 드롭다운 2항목 → 기존 화면(기본 필터 = 대기 상태). 60초 polling. 실패 시 숨김 |

집계 기준 정합:
- 상품 등록 요청 = `store-product-request-admin.controller.ts` 의 `displayStatus=reviewing` 조건과 동일 (platform admin = 서비스 범위 무제한).
- 설명서 검수 = 원본 큐가 쓰는 `SharedProductDescriptionService.listSupplierStoreReview({ status: 'needs_review' })` 의 `total` 을 그대로 사용.

하지 않은 것: notification 적재 · 읽음 처리 · 이력 · 공통 notification package · WebSocket/SSE · 새 RBAC · DB/migration · package.json.

## 3. 검증

| 항목 | 결과 |
|---|---|
| `apps/admin-dashboard` `tsc --noEmit` | PASS (error 0) |
| `apps/api-server` `tsc --noEmit` | PASS (error 0) |
| 배포 후 API live smoke | 배포 후 기록 |
| 배포 후 헤더 browser smoke | 배포 후 기록 |
