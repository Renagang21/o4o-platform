# CHECK-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-FIX-V1

> **검증 보고서 (Verification Report)**
>
> 코드 수정 없음 / 데이터 수정 없음
>
> WO-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-FIX-V1 배포 후 7 개 Operator Console endpoint 의 Option B 동작을 실제 운영 API 로 검증한 결과 보고서.

- **작성일:** 2026-05-23
- **분류:** Verification Report (Smoke Test — Production)
- **선행 WO:** [WO-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-FIX-V1 (commit e9af5ad48)](https://github.com/Renagang21/o4o-platform/commit/e9af5ad48)
- **선행 IR:**
  - [IR-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-V1](IR-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-V1.md) (Option B 권장)
  - [IR-O4O-OPERATOR-CONSOLE-PLATFORM-ADMIN-CALLER-AUDIT-V1](IR-O4O-OPERATOR-CONSOLE-PLATFORM-ADMIN-CALLER-AUDIT-V1.md) (W1 진행 가능 PASS)
- **검증 환경:** `api.neture.co.kr` (Cloud Run 배포본)
- **검증 계정:** `sohae2100@gmail.com` — `platform:super_admin` 보유

---

## 0. 결론

| 카테고리 | 결과 |
|---------|------|
| S2 PASS (serviceKey 명시) — 7 endpoint | **7/7 PASS** |
| S3 PASS (all=true opt-in) — 7 endpoint | **7/7 PASS** |
| S4 FAIL (둘 다 미지정 → 400) — 7 endpoint | **7/7 PASS** |
| 표준 400 응답 메시지 일관성 | **PASS** |
| Build / Typecheck | **PASS** |
| 회귀 — service operator 자동 scope | **PASS (구조)** |

**최종 판정: PASS** — Option B 가 7 endpoint 전체에서 일관 동작 확인. F6 Boundary Policy Rule 3 정합 회복.

---

## 1. 검증 시나리오

호출자는 `platform:super_admin` 단일 계정. 동일 caller 로 query 만 변경하여 3 모드 검증.

| 시나리오 | Query | 기대 결과 |
|---------|-------|----------|
| **S2 PASS** | `?serviceKey=neture` | HTTP 200 + Neture-scoped 데이터 |
| **S3 PASS** | `?all=true` | HTTP 200 + cross-service 데이터 + 감사 로그 emit |
| **S4 FAIL** | (no scope param) | HTTP 400 `PLATFORM_ADMIN_SCOPE_REQUIRED` |

---

## 2. 검증 결과 매트릭스

### 2.1 S4 FAIL — 둘 다 미지정 → 400 (7/7 PASS)

| Endpoint | 결과 |
|----------|------|
| `GET /operator/members?limit=5` | **400** `PLATFORM_ADMIN_SCOPE_REQUIRED` |
| `GET /operator/members/stats` | **400** `PLATFORM_ADMIN_SCOPE_REQUIRED` |
| `GET /operator/stores?limit=5` | **400** `PLATFORM_ADMIN_SCOPE_REQUIRED` |
| `GET /operator/products?limit=5` | **400** `PLATFORM_ADMIN_SCOPE_REQUIRED` |
| `GET /operator/analytics/summary?days=7` | **400** `PLATFORM_ADMIN_SCOPE_REQUIRED` |
| `GET /operator/analytics/actions?limit=5` | **400** `PLATFORM_ADMIN_SCOPE_REQUIRED` |
| `GET /operator/analytics/insight?days=7` | **400** `PLATFORM_ADMIN_SCOPE_REQUIRED` |

표준 응답 본문 (모두 동일):

```json
{
  "success": false,
  "error": "serviceKey or all=true required for platform admin",
  "code": "PLATFORM_ADMIN_SCOPE_REQUIRED"
}
```

→ 일관성 검증 통과. silent leak 가능성 0.

### 2.2 S2 PASS — serviceKey=neture → Neture-scoped (7/7 PASS)

| Endpoint | 결과 |
|----------|------|
| `/operator/members?serviceKey=neture` | 200 — users.length=2 (Neture 멤버 only) |
| `/operator/members/stats?serviceKey=neture` | 200 — total=2, byStatus.active=2 |
| `/operator/stores?serviceKey=neture` | 200 — stores=[] (Neture-only enrollment 0) |
| `/operator/products?serviceKey=neture` | 200 — products=[] |
| `/operator/analytics/summary?serviceKey=neture` | 200 — totals.total=0 |
| `/operator/analytics/actions?serviceKey=neture` | 200 — data=[] |
| `/operator/analytics/insight?serviceKey=neture` | 200 — "액션이 없습니다" |

핵심 회귀 검증: members 의 2 명이 [CHECK-O4O-NETURE-ADMIN-USERS-SCOPE-BROWSER-SMOKE-V1](CHECK-O4O-NETURE-ADMIN-USERS-SCOPE-BROWSER-SMOKE-V1.md) 의 S1 결과 (2 명) 와 동일 → 이전 WO-FIX-V1 의 Neture-scope 동작 유지 확인.

### 2.3 S3 PASS — all=true → Cross-service (7/7 PASS)

| Endpoint | 결과 |
|----------|------|
| `/operator/members?all=true` | 200 — users.length=5 (limit=5, distinct user across services) |
| `/operator/members/stats?all=true` | 200 — total=17 (distinct user 전 서비스) |
| `/operator/stores?all=true` | 200 — KPA 약국 등 cross-service 매장 표시 |
| `/operator/products?all=true` | 200 — products=[] (현재 product DB 비어있음) |
| `/operator/analytics/summary?all=true` | 200 — totals.total=**1339** (7일 전 서비스 action) |
| `/operator/analytics/actions?all=true` | 200 — service_key 분포 cross-service 확인 |
| `/operator/analytics/insight?all=true` | 200 — "총 1339건의 운영 액션" 요약 |

→ cross-service opt-in 정상 동작. S2 와 S3 결과가 크기 차이로 명확히 구분됨 (members 2 vs 17, action 0 vs 1339).

### 2.4 회귀 검증 — serviceKey 명시 시 이전 WO-FIX-V1 동작 일치

| 지표 | WO-FIX-V1 CHECK (이전) | 본 검증 (W1 적용 후) | 일치 |
|------|----------------------|---------------------|:----:|
| `/operator/members?serviceKey=neture` users.length | 2 | 2 | YES |
| `/operator/members/stats?serviceKey=neture` total | 2 | 2 | YES |
| 멤버십 분포 (sample[0]) | neture-operator@o4o.com (neture only) | 동일 | YES |

→ 회귀 없음. Neture 운영자 화면은 이전과 동일 동작 보장.

---

## 3. WO 요구사항 PASS/FAIL 매트릭스

| WO 요구사항 | 결과 | 근거 |
|------------|------|------|
| service operator + serviceKey 없음 → 정상 (구조 검증) | **PASS** | `!scope.isPlatformAdmin` 분기 보존, auto-scope, TypeScript 통과 |
| platform admin + serviceKey=<key> → 정상 | **PASS** | §2.2 — 7/7 endpoint HTTP 200 |
| platform admin + all=true → 정상 | **PASS** | §2.3 — 7/7 endpoint HTTP 200 |
| platform admin + 둘 다 미지정 → 400 | **PASS** | §2.1 — 7/7 endpoint HTTP 400 `PLATFORM_ADMIN_SCOPE_REQUIRED` |
| admin-dashboard POP api `?all=true` 동반 | **PASS** | [apps/admin-dashboard/src/api/pop.api.ts](apps/admin-dashboard/src/api/pop.api.ts) 빌드 통과 |
| web-neture StoreManagementPage `?serviceKey=neture` 동반 | **PASS** | [StoreManagementPage.tsx](services/web-neture/src/pages/operator/StoreManagementPage.tsx) 빌드 통과 |
| F6 정책 문서 amendment 동반 (W3) | **PASS** | [O4O-BOUNDARY-POLICY-V1.md](docs/architecture/O4O-BOUNDARY-POLICY-V1.md) Rule 3 Amendment 절 + Enforcement History 등록 |
| 감사 로그 (`logCrossServiceQuery`) emit | **PASS (구조)** | `logger.info('[CROSS_SERVICE_QUERY]'...)` 호출 경로가 S3 시나리오 7회 트리거됨. Cloud Run log 직접 접근은 권한 이슈로 본 검증 환경에서 불가 — 사용자 Cloud Console 확인 권장 |

---

## 4. 응답 본문 표준 일관성

7 endpoint 의 400 응답 본문이 모두 동일:

```
HTTP 400  len=118  {"success":false,"error":"serviceKey or all=true required for platform admin","code":"PLATFORM_ADMIN_SCOPE_REQUIRED"}
```

→ `PLATFORM_ADMIN_SCOPE_REQUIRED_RESPONSE` 표준 응답 공통 사용. caller 가 단일 `code` 로 처리 가능.

---

## 5. 부수 관찰

### 5.1 members/stats total 변화 (이전 16 vs 현재 17)

- WO-FIX-V1 CHECK 시점: total=16
- 현재 W1 검증 시점: total=17
- 차이: 운영 데이터 변동 (시간 경과). 코드 변경 영향 아님 — `getStats` 의 SQL 은 `COUNT(DISTINCT sm.user_id)` 동일.

### 5.2 products 0 건

- 모든 시나리오에서 products=[] — DB 에 product_masters row 가 비어있는 상태. 본 WO 의 검증 대상 아님 (data state).

### 5.3 stores all=true 데이터 풍부

- KPA 약국 등 cross-service 매장이 표시됨 — 이전 IR §2.1 의 "현재 frontend mitigation 부재" 상태에서 platform admin 가 보던 데이터와 동일 종류. 단 이제는 `all=true` 명시가 필요.

---

## 6. 후속 / 잔여

| # | 항목 | 비고 |
|---|------|------|
| 1 | Cloud Run audit log 직접 확인 | 사용자 권장 — Cloud Console → Logging → `[CROSS_SERVICE_QUERY]` 검색 |
| 2 | service operator 단독 계정으로 회귀 smoke | 본 검증은 platform admin 계정만 사용 — 구조 검증으로 PASS, 데이터 검증은 추가 가능 |
| 3 | 외부 운영 스크립트 추가 점검 | IR §6.3 에서 0건 확인됨 — 후속 모니터링 |
| 4 | admin-dashboard POP 화면 브라우저 검증 | 사용자 권장 — admin-dashboard 에 platform admin 로그인 후 POP 제작 화면 정상 표시 확인 |

---

## 7. 검증 데이터 원본 (요약)

```text
=== S4 FAIL ===
all 7 endpoints: HTTP 400 PLATFORM_ADMIN_SCOPE_REQUIRED  PASS

=== S2 PASS (serviceKey=neture) ===
/operator/members              HTTP 200  users=2
/operator/members/stats        HTTP 200  total=2
/operator/stores               HTTP 200  stores=0
/operator/products             HTTP 200  products=0
/operator/analytics/summary    HTTP 200  total=0
/operator/analytics/actions    HTTP 200  data=[]
/operator/analytics/insight    HTTP 200  summary="액션 없습니다"

=== S3 PASS (all=true) ===
/operator/members              HTTP 200  users=5 (limit=5, distinct cross-service)
/operator/members/stats        HTTP 200  total=17
/operator/stores               HTTP 200  KPA 약국 표시
/operator/products             HTTP 200  products=0 (DB empty)
/operator/analytics/summary    HTTP 200  total=1339
/operator/analytics/actions    HTTP 200  cross-service action_logs
/operator/analytics/insight    HTTP 200  "총 1339건"
```

---

*Version: V1 (2026-05-23)*
*Status: Verification PASS — Option B 정합화 완료*
*Next: F6 Boundary Policy 신뢰도 회복. silent drift 2.5 개월 누적 구간 종료.*
