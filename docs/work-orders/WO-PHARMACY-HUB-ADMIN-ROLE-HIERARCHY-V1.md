# WO-PHARMACY-HUB-ADMIN-ROLE-HIERARCHY-V1

> Pharmacy-Hub Admin 역할을 다른 서비스의 표준 계층에 맞춰 정식 도입한다.
> 일자: 2026-08-10 · 기준: `origin/main`

---

## 1. 목표 · 배경

Pharmacy-Hub 는 현재 운영 역할이 `pharmacy-hub:operator` 하나뿐이다.
KPA · Neture · K-Cosmetics 는 모두 **Admin ⊃ Operator** 계층을 명시적으로 갖는다
(`scopeRoleMapping` 에서 operator 요구 scope 를 admin 도 만족).

Pharmacy-Hub 만 계층이 없어, 서비스 관리 책임자와 일상 운영 담당자를 구분할 수 없다.
새 권한체계를 설계하지 않고 **기존 3서비스 패턴을 그대로 적용**한다.

한 문장 기준:

> `pharmacy-hub:admin` 은 Pharmacy-Hub 서비스 관리 책임자이며 Operator 의 운영 권한을
> 포함하지만, Store Owner 와 Supplier 의 **사업자 신분 권한은 포함하지 않는다.**

## 2. 승인 범위

| 요구 권한 | 허용 역할 |
|---|---|
| `pharmacy-hub:admin` | Admin |
| `pharmacy-hub:operator` | Operator, **Admin** |
| `pharmacy-hub:store_owner` | Store Owner |
| `pharmacy-hub:supplier` | Supplier |

- `platform:super_admin` bypass 는 기존 설정(`platformBypass: true`) 유지.
- 기존 3역할의 허용 범위는 **변경하지 않는다** (회귀 0).

## 3. 실행 순서

1. `PHARMACY_HUB_SCOPE_CONFIG.allowedRoles` 에 `pharmacy-hub:admin` 추가,
   `scopeRoleMapping` 을 §2 표대로 구성한다. (security-core 는 F1 Freeze — 로컬 config 만 수정)
2. `apps/api-server/src/types/roles.ts` — `PharmacyHubRole` union + `ROLE_REGISTRY` 항목 추가.
   "admin 은 정의하지 않는다" 주석을 본 WO 결정으로 교체한다.
3. Foundation guard 검증 route `GET /pharmacy-hub/admin/ping` 을 기존 ping 3종과 동일 형태로 추가한다.
   **새 관리 화면은 만들지 않는다** — 현재 Admin 전용으로 분리할 근거 있는 기능이 없다.
4. `/operators` 등록 화면 — Pharmacy-Hub 에 Admin · Operator 두 선택지 제공.
5. `services/web-pharmacy-hub` — 역할 계층을 프론트 SSOT(`config/service.ts`)에 반영해
   Admin 이 Operator 진입점을 정상 통과하게 한다.
6. `docs/rbac/RBAC-ROLE-CATALOG-V1.md` 에 Pharmacy-Hub 4역할을 정식 등록한다.

## 4. 제외 범위

- **GlycoPharm 의 `scopeRoleMapping` 부재** — admin/operator 계층이 fallback 동작에 의존한다.
  본 WO 에 섞지 않고 별도 정비 대상으로 남긴다.
- Admin 전용 관리 화면 신설, 기존 operator 기능의 admin 이관.
- `packages/security-core` 구조 변경 (F1 Freeze).
- Store Owner · Supplier 권한을 Admin 이 대신하는 구성.

## 5. 중지 조건

- security-core 동결 구조 변경이 필요할 때
- DB migration 이 필요할 때 (schema · 데이터 seed 모두)
- 기존 3역할의 허용 범위가 바뀌어야 할 때
- 다른 서비스의 scope config · 공통 guard 수정이 필요할 때

## 6. 검증 · Git

- 기존 Operator 로그인·권한 회귀 없음
- 신규 Admin 등록 · 로그인 성공
- Admin 의 Operator 보호 route 접근 성공 / Operator 의 Admin 보호 route 접근 거부
- Store Owner · Supplier 의 운영자 route 접근 거부, 타 서비스 역할 접근 거부
- 다른 서비스 Membership · credential 불변
- jest · vitest · typecheck · build · 프로덕션 브라우저 smoke
- path-specific stage → commit → push

## 7. 완료 보고

변경 / 미변경 / 검증 결과 / 중지 조건 해당 여부 / 문서 정합 / Git 상태.
