---
id: IR-O4O-NETURE-ADMIN-DASHBOARD-KPI-SCOPE-AUDIT-V1
title: Neture 관리자 대시보드 KPI Scope 정렬 점검 (총 사용자 22 vs 회원관리 3 불일치)
status: completed
date: 2026-05-24
domain: neture / operator-admin / dashboard
related:
  - WO-O4O-NETURE-ADMIN-USERS-SCOPE-FIX-V1
  - WO-O4O-NETURE-OPERATOR-DASHBOARD-IMPLEMENTATION-V1
  - WO-O4O-ADMIN-OPERATOR-DASHBOARD-SEPARATION-V1
  - WO-O4O-NETURE-USERS-CANONICAL-APPLY-V1
constitution:
  - CLAUDE.md §1 (조사 → 문제확정 → 최소 수정 → 검증 → 종료)
  - CLAUDE.md §11 (Operator Dashboard 표준 — Neture 서비스 scope 유지)
  - CLAUDE.md §7 (Boundary Policy — serviceKey 기준 분리)
---

# IR-O4O-NETURE-ADMIN-DASHBOARD-KPI-SCOPE-AUDIT-V1

> Neture `/admin` 대시보드의 `총 사용자 22` 와 `/admin/users` 회원관리의 `전체 3` 이 불일치하는 원인을 확정하고, KPI 6개 각각의 데이터 소스를 검증한다.

---

## 1. 배경

- **관측**: Neture 관리자 계정으로 접속한 결과
  - `/admin` (Structure Snapshot) → `총 사용자 22`
  - `/admin/users` (회원관리) → `전체 3` (Neture 회원만)
- **의문**: 두 페이지가 같은 Neture scope 를 봐야 하는데 값이 다르다. Drift 의심.
- **목표**: KPI 별 데이터 소스를 정확히 식별하고, scope 불일치 발생 지점 / 수정 범위 / 라벨 정합성 / 후속 WO 를 정리한다.

---

## 2. 조사 범위

| # | 범위 | 산출물 |
|---|-----|--------|
| 1 | `/admin` 대시보드 KPI API 식별 | 엔드포인트 + 컨트롤러 경로 |
| 2 | 6 개 KPI 각각의 SQL 소스 | 쿼리 + 테이블 + 필터 |
| 3 | `/admin/users` API 식별 | 엔드포인트 + 컨트롤러 경로 |
| 4 | scope 비교 | 어느 KPI 가 Neture 한정 / 어느 것이 platform 전체 |
| 5 | 라벨/위치 적절성 검토 | "Structure Snapshot" 의미 정합성 |
| 6 | 수정 범위 / 후속 WO 제안 | 최소 수정 경계 |

조사 대상 코드:
- [apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts](apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts)
- [services/web-neture/src/pages/operator/UsersManagementPage.tsx](services/web-neture/src/pages/operator/UsersManagementPage.tsx)
- [apps/api-server/src/controllers/operator/MembershipConsoleController.ts](apps/api-server/src/controllers/operator/MembershipConsoleController.ts)

---

## 3. 조사 결과 — 대시보드 KPI 6 개 데이터 소스

엔드포인트: `GET /api/v1/neture/admin/dashboard`
컨트롤러: [apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts:38-186](apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts#L38-L186)

Auth: `requireAuth` + `requireNetureScope('neture:admin')`

### 3.1 Block A — Structure Snapshot (6 KPI)

| # | 라벨 | 라인 | SQL 소스 | Scope 판정 |
|---|------|-----:|---------|----------:|
| 1 | **총 사용자** | [L56](apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts#L56) | `SELECT COUNT(*)::int FROM users` | ❌ **Platform 전체** |
| 2 | 활성 공급사 | [L58](apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts#L58) | `SELECT COUNT(*)::int FROM neture_suppliers WHERE status = 'ACTIVE'` | ✅ Neture 한정 (테이블 자체가 Neture 소유) |
| 3 | 승인 대기 | [L60-63](apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts#L60-L63) | `SELECT COUNT(*)::int FROM offer_service_approvals WHERE service_key = 'neture' AND approval_status = 'pending'` | ✅ Neture 한정 (`service_key='neture'`) |
| 4 | 활성 파트너 | [L65-67](apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts#L65-L67) | `SELECT COUNT(*)::int FROM neture.neture_partners WHERE status = 'active'` | ✅ Neture 한정 |
| 5 | 활성 상품 | [L69-72](apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts#L69-L72) | `SELECT COUNT(*)::int FROM supplier_product_offers WHERE is_active = true AND approval_status = 'APPROVED'` | ⚠️ 부분 (`service_key` 필터 부재 — supplier_product_offers 가 Neture 전용이라면 OK, 공유 테이블이면 추가 확인 필요) |
| 6 | 정산 대기 | [L74-76](apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts#L74-L76) | `SELECT COUNT(*)::int FROM neture_settlements WHERE status = 'pending'` | ✅ Neture 한정 |

### 3.2 Block B — Policy Overview (3 항목, 모두 Neture-scoped)

| # | 라벨 | 라인 | SQL |
|---|------|-----:|-----|
| 1 | 공급사 승인 대기 | [L78](apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts#L78) | `neture_suppliers WHERE status = 'PENDING'` |
| 2 | 가입 승인 대기 | [L80-83](apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts#L80-L83) | `service_memberships WHERE service_key = 'neture' AND status = 'pending'` |
| 3 | 파트너 요청 | [L85-87](apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts#L85-L87) | `neture_partnership_requests WHERE status = 'OPEN'` |

### 3.3 Block C — Governance Alerts (AI insights)

[L144-156](apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts#L144-L156) — `adminMetrics.users.total` 에 위 잘못된 `totalUsers` 가 그대로 전달되어 **CopilotEngine 의 governance alert 생성 입력값까지 platform 전체 user 수가 섞이는 2차 오염**.

---

## 4. 조사 결과 — `/admin/users` 회원관리 데이터 소스

엔드포인트: `GET /api/v1/operator/members?serviceKey=neture&page=1&limit=20`

프론트엔드: [services/web-neture/src/pages/operator/UsersManagementPage.tsx:65-76](services/web-neture/src/pages/operator/UsersManagementPage.tsx#L65-L76)

```typescript
const netureMembersClient: MembersConsoleClient = {
  async list(params: MembersConsoleListParams) {
    const usp = new URLSearchParams();
    usp.set('page', String(params.page));
    usp.set('limit', String(params.limit));
    // WO-O4O-NETURE-ADMIN-USERS-SCOPE-FIX-V1: serviceKey 강제 전달
    usp.set('serviceKey', 'neture');
    ...
    const { data } = await api.get(`/operator/members?${usp}`);
```

백엔드: [apps/api-server/src/controllers/operator/MembershipConsoleController.ts:47-149](apps/api-server/src/controllers/operator/MembershipConsoleController.ts#L47-L149)

- `resolveOperatorScope()` 로 service scope 결정
- `service_memberships.service_key = ANY($serviceKeys)` 필터 적용
- `users` + `service_memberships` + `role_assignments` JOIN 후 통합 응답

**결과**: Neture 에 가입한 user 만 (= service_memberships.service_key='neture') 반환 → **전체 3 명**

---

## 5. 문제 확정 (Root Cause)

### 5.1 단일 원인

**[admin-dashboard.controller.ts:56](apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts#L56)**

```typescript
// 1. 총 사용자
dataSource.query(`SELECT COUNT(*)::int AS cnt FROM users`),
```

- `users` 테이블 전체를 count
- `service_memberships.service_key = 'neture'` 필터 부재
- → Neture 가입자 3 명이 아닌 **플랫폼 전체 사용자 22 명** 을 반환

### 5.2 정합성 판정

| 항목 | 판정 |
|------|------|
| KPI 6 개 중 5 개 (활성 공급사 / 승인 대기 / 활성 파트너 / 활성 상품 / 정산 대기) | ✅ Neture scope 일치 |
| KPI `총 사용자` | ❌ Platform 전체 (Drift) |
| Block B 3 항목 (공급사 승인 대기 / 가입 승인 대기 / 파트너 요청) | ✅ Neture scope 일치 |
| Block C Governance Alerts | ⚠️ `adminMetrics.users.total` 에 잘못된 값 주입 — 간접 오염 |
| `/admin/users` 회원관리 | ✅ `serviceKey=neture` 강제 적용됨 |

### 5.3 라벨/위치 적절성

- "Structure Snapshot" 라벨 자체는 **Neture 구조 한정** 의미가 맞음 (`neture_suppliers`, `neture_partners`, `neture_settlements` 등 Neture 소유 테이블만 사용).
- 라벨/위치는 변경 불필요. **쿼리 1 개만 잘못된 상태**.
- "총 사용자" 의 의미는 "Neture 서비스에 가입한 사용자 수" 로 재정의되어야 함 (platform 전체는 platform admin 영역의 일).

---

## 6. 수정 범위 (최소 수정)

### 6.1 1순위 수정 — 단일 쿼리 교체

**파일**: [apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts:56](apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts#L56)

```typescript
// BEFORE
dataSource.query(`SELECT COUNT(*)::int AS cnt FROM users`),

// AFTER (제안 — service_memberships 기준)
dataSource.query(
  `SELECT COUNT(*)::int AS cnt FROM service_memberships
   WHERE service_key = 'neture' AND status = 'active'`,
),
```

**근거:**
- `service_memberships` 가 Neture 서비스에 가입한 사용자의 SSOT (Boundary Policy §7 + F11 User/Operator Freeze).
- `status = 'active'` 추가는 옵션 — "Neture 가입자 전체 (pending 포함)" vs "활성 Neture 사용자 (active 만)" 중 후자가 운영상 의미가 명확하므로 권장.
- 이 변경은 `/admin/users` 회원관리(`service_memberships.service_key='neture'` 필터) 와 같은 base set 위에서 count → 두 화면이 같은 모집단을 본다.

### 6.2 2순위 — `adminMetrics.users.total` 자동 정합

[L145](apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts#L145) `users: { total: totalUsers }` 는 위 6.1 수정만으로 자동 정합 (재배선 불필요).

### 6.3 수정 외 — 정의 명확화 필요

- `총 사용자` 라벨의 정의 문서화 필요: "Neture 가입 활성 사용자" 인지 "Neture 가입 전체 (pending 포함)" 인지.
- 회원관리 페이지의 "전체 3" 도 어떤 status 를 포함하는지 확인 후 동일 정의로 정렬 권장.

---

## 7. 검증 계획

### 7.1 수정 후 검증 절차

1. **사전 DB 확인** (read-only, `gcloud sql connect` 인터랙티브):
   ```sql
   SELECT COUNT(*) FROM users;
   -- 22 (현재 대시보드 표시값 일치 여부)

   SELECT COUNT(*) FROM service_memberships
   WHERE service_key = 'neture' AND status = 'active';
   -- 예상값 (회원관리 페이지의 전체 3 과 비교)

   SELECT status, COUNT(*) FROM service_memberships
   WHERE service_key = 'neture' GROUP BY status;
   -- status 분포 확인 → "전체 3" 의 정의 검증
   ```

2. **수정 적용 후**:
   - `/admin` 대시보드의 `총 사용자` 값과 `/admin/users` 의 `전체` 값이 동일한지 확인
   - 두 값 모두 위 SQL 결과와 일치하는지 확인

3. **JSON 디버그 페이지 (CLAUDE.md §8 표준 절차)**:
   - 필요 시 `/__debug__/neture-admin-dashboard` 같은 SSR JSON 페이지로 KPI raw 출력
   - 가이드: [docs/platform/debug/DEBUG-SSR-TEST-PAGE-GUIDE-V1.md](docs/platform/debug/DEBUG-SSR-TEST-PAGE-GUIDE-V1.md)

### 7.2 회귀 검사

- KPI 6 개 + Block B 3 항목 + Block C insights 값이 변경 전후 비교 시:
  - `총 사용자` 만 22 → (3 또는 활성 Neture 가입자 수) 로 변동
  - 나머지 모든 값은 불변

---

## 8. 후속 WO 제안

### 8.1 즉시 (V1 — Phase A)

**WO-O4O-NETURE-ADMIN-DASHBOARD-TOTAL-USERS-SCOPE-FIX-V1**

- 범위: [admin-dashboard.controller.ts:56](apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts#L56) 단일 쿼리 교체 + 검증
- 작업 시간: 30 분 이내
- 영향: 백엔드 1 파일, 프론트 변경 없음
- 검증: §7 절차

### 8.2 후속 (V2 — Phase B, 정렬 검토)

**WO-O4O-NETURE-ADMIN-DASHBOARD-KPI-SCOPE-DEFINITION-V1** (옵션)

- 범위:
  - "Neture 가입자" 의 status 정의 명문화 (active / pending / suspended 포함 여부)
  - `supplier_product_offers` 의 service_key 필터 확인 — 공유 테이블이면 명시적 `service_key='neture'` 추가
  - Block B "가입 승인 대기" 와 정의 정합 (active 만 vs all)
- 산출물: Operator OS Baseline (F1) 또는 Neture Domain Architecture Freeze 에 정의 추가

### 8.3 장기 (V3 — 분리 검토)

**Platform Admin 화면 분리 여부**

- 현재 `총 사용자 22` 같은 platform-wide 지표를 Neture 관리자가 봐야 할 운영 요구가 있는지 확인
- 필요 시 platform-admin 전용 화면 (`/platform/admin/dashboard`) 분리 — Neture admin 대시보드는 Neture scope 유지
- 우선순위 낮음 (사업 요구 미확인 상태)

---

## 9. 산출물 요약

| 항목 | 결과 |
|------|------|
| KPI 별 API/SQL 소스 | §3 표 — 6 KPI + Block B 3 항목 + Block C |
| 현재 count 기준 | `총 사용자` 만 `SELECT COUNT(*) FROM users` (platform 전체), 나머지는 Neture 한정 |
| `/admin/users` 불일치 원인 | `users` 전체 count vs `service_memberships.service_key='neture'` 필터 — 두 모집단이 다름 |
| 수정 필요 파일 | [apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts:56](apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts#L56) (1 라인) |
| 라벨/위치 정합성 | "Structure Snapshot" 라벨은 OK, 쿼리 1 개만 잘못됨 |
| 후속 WO | V1 즉시 fix, V2 정의 명문화, V3 platform admin 분리 검토 |

---

## 10. 결론

- **Drift 위치**: 단일 쿼리 ([L56](apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts#L56)) — KPI 1 개 / Block C 의 1 개 입력값
- **Drift 성격**: scope 정렬 실패 (platform 전체 vs Neture 한정) — 구조 문제 아님
- **수정 비용**: 1 라인 SQL 교체 + JSON 디버그 검증
- **권장 진행**: §8.1 의 `WO-O4O-NETURE-ADMIN-DASHBOARD-TOTAL-USERS-SCOPE-FIX-V1` 로 즉시 후속.

---

*Author: Claude (Investigation only — no code change executed)*
*Investigation date: 2026-05-24*
*Status: completed — ready for follow-up WO*
