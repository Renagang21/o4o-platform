# KPA-BRANCH-ROLE-MATRIX-V1 — 약사 분회 서비스 역할 · 접근 행렬

> **상태**: ACTIVE · **작성일**: 2026-10-06 · `WO-O4O-CANONICAL-INDEX-S9-POLICY-DECISION-ALIGNMENT-V1`
> **범위**: serviceKey `kpa-branch`(약사 분회 서비스)의 role · 분회 소속 · 접근 판정. KPA Society(`kpa:*`) 역할은 [`KPA-ROLE-MATRIX-V1`](KPA-ROLE-MATRIX-V1.md) 이 다룬다.
> **성격**: 현행 코드를 정본화한 문서다. 권한 · role · route 를 새로 정하지 않는다 — 코드와 다르면 코드를 기준으로 이 문서를 정정한다.
> **판정 SSOT(코드)**: `apps/api-server/src/middleware/kpa-branch-scope.middleware.ts` · `apps/api-server/src/routes/kpa-branch/kpa-branch.routes.ts`

---

## 1. 경계 결정 (2026-10-06 확정)

```text
KPA Society  → kpa:*          (serviceKey kpa-society)
KPA Branch   → kpa-branch:*   (serviceKey kpa-branch)
```

- 두 서비스는 **독립된 권한 경계**다. `kpa:*` role 은 분회 서비스에 접근하지 못한다 — `KPA_BRANCH_SCOPE_CONFIG.blockedServicePrefixes = ['kpa', 'neture', 'cosmetics', 'pharmacy-hub']`.
- 옛 문서의 "`kpa:admin` · `kpa:operator` 의 전체 branch 접근 허용" 은 **폐기**한다. 되돌리지 않는다.
- 옛 `kpa:branch_admin` · `kpa:branch_operator` 는 비활성화 완료(`20260415000000-ArchiveBranchAndChapterData`). 새로 부여하지 않는다.

## 2. 접근 판정은 두 축이다

| 축 | 무엇을 말하나 | 저장 위치 | guard |
|---|---|---|---|
| **서비스 축** | 분회 서비스의 회원 · 운영자 · 관리자인가 | `service_memberships('kpa-branch').status='active'` + `role_assignments('kpa-branch:*')` | `requireKpaBranchScope(role)` |
| **분회 축** | 어느 분회 소속인가 | `branch_memberships`(append-only 원장, 회원당 active 1행) | `resolveBranch` → `requireBranchScope` |

- **role 에 분회 식별자를 넣지 않는다**(`kpa-branch:operator:{branchId}` 금지). role 은 "운영자인가"만, 소속 분회는 `branch_memberships` 가 단독으로 말한다.
- `branch_memberships` 에는 role 컬럼이 없다.
- 본회 → 지부 → 분회 계층(`parent_id`)은 권한 계산에 쓰지 않는다. 지부 운영자가 하위 분회를 자동으로 관리하지 않는다.
- 분회 tenant 는 `kpa_organizations.type='group'` · `is_active=true` 만 인정한다. 해석은 URL `:branchSlug` > Host(`branch_domains.status='active'`) 순서이고, 결국 `kpa_organizations.id` 하나로 수렴한다.

## 3. Role 행렬

| Role | 서비스 축 통과 범위(`scopeRoleMapping`) | 분회 축 | 설명 |
|---|---|---|---|
| `kpa-branch:member` | member | active 소속 분회만 | 분회 회원 — 본인 분회의 회원용 화면 · 보고 |
| `kpa-branch:operator` | member · operator | active 소속 분회만 | 개별 분회 운영자 — 본인 분회의 회원 · 사이트 · 게시 · 행사 · 임원 · 도메인 운영 |
| `kpa-branch:admin` | member · operator · admin | **모든 분회**(분회 축 우회) | 분회 서비스 전체 관리자 — 연보 양식 · 도메인 승인 · 서비스 회원 · 분회 개설 심사 · 분회 운영자 지정/해제 |
| `platform:super_admin` | 전부(`platformBypass: true`, membership 없이 통과) | **모든 분회** | 플랫폼 관리자 — 분회 생성 · 수정 · 삭제(`/admin/branches`)는 이 role 전용 |

- 분회 경계를 넘을 수 있는 것은 `kpa-branch:admin` 과 `platform:super_admin` 둘뿐이다(`isBranchServiceAdmin`).
- `kpa-branch:operator` 는 role 자체는 서비스 전역이지만, 런타임에 `requireBranchScope` 가 "요청 분회 == 내 active 분회" 를 강제한다. 그래서 A 분회 운영자는 B 분회를 관리할 수 없다.
- role 은 가입 신청 시점에 저장될 수 있다. `service_memberships` 가 active 가 아니면 guard 가 `MEMBERSHIP_NOT_ACTIVE` 로 거부한다.

## 4. Route 그룹별 guard

| 그룹 | guard | 비고 |
|---|---|---|
| 공개(분회 목록 · 분회 사이트 · 게시 · 임원 · 행사) | 없음 또는 `resolveBranch` | 읽기 전용 |
| 가입 · 내 소속(`/join` · `/me/branch*`) · 분회 개설 신청(`/branch-requests*`) | `requireAuth` | 개설 신청은 rate limit 포함 |
| 회원 화면 · 보고(`memberReportGuards`) | `requireAuth` → `requireKpaBranchScope('kpa-branch:member')` → `resolveBranch` → `requireBranchScope` | |
| 분회 운영(`/branches/:branchSlug/operator/*`, `operatorGuards`) | `requireAuth` → `requireKpaBranchScope('kpa-branch:operator')` → `resolveBranch` → `requireBranchScope` | |
| 서비스 관리(`/admin/*` 연보 · 도메인 · 서비스 회원 · 개설 심사 · 운영자 지정) | `requireAuth` → `requireKpaBranchScope('kpa-branch:admin')` | 개별 분회 한정 guard 를 붙이지 않는다(서비스 전체 관리) |
| 분회 생성 · 수정 · 삭제(`/admin/branches`, `/admin/branches/:id`) | `requireAuth` → `requireRole('platform:super_admin')` | |

- 분회 운영자 지정은 서비스 관리자(`kpa-branch:admin`)가 **대상 분회 active 소속자에 한정해** 한다.
- 분회 개설 심사를 `kpa-branch:operator` 로 열지 않는다. 그 role 은 개별 분회 운영자도 갖고 있으므로, 그렇게 열면 다른 분회의 개설을 승인할 수 있게 된다.

## 5. 유지되는 공통 원칙

- `platform:*` 은 서비스 scope 를 대신하지 않는다. 예외는 이 서비스의 `platformBypass: true` 이며, 이 문서 §3 에 명시된 범위에 한한다.
- serviceKey 격리 · 서버 측 tenant 해석(클라이언트가 보낸 분회 ID 를 믿지 않음) · Hard delete 금지(소속 이력 = append-only).
- 새 분회 role 이나 분회 축 우회 주체를 추가하려면 권한 변경 WO 가 필요하다. 이 문서를 고쳐서 추가하지 않는다.

## 6. 관련 문서

- [`KPA-ROLE-MATRIX-V1`](KPA-ROLE-MATRIX-V1.md) — KPA Society(`kpa:*`) 범위로 축소(2026-10-06)
- [`KPA-SOCIETY-SERVICE-STRUCTURE`](KPA-SOCIETY-SERVICE-STRUCTURE.md) — KPA 화면 영역 공존 구조
- [`O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1`](O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md) — 원칙 5(`kpa:*` 와 분회 분리)

---

*Created: 2026-10-06 · Version 1.0 · Status: ACTIVE*
