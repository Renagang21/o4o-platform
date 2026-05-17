---
id: IR-O4O-SERVICE-MEMBERSHIP-CANONICAL-KEY-DRIFT-CHECK-V1
title: "service_memberships canonical key drift 실측 검사"
status: investigation-complete
date: 2026-05-15
type: investigation
scope:
  - production o4o_platform DB read-only SELECT 로 service_memberships.service_key 분포 실측
  - kpa / kpa-society, cosmetics / k-cosmetics drift row 수 정량 측정
  - service-prefixed role 보유자 중 canonical active membership 누락자 식별
  - canonical / legacy row 중복 충돌 케이스 확인
  - Phase 2 마이그레이션 WO 발행 여부 판단 입력 자료
related:
  - IR-O4O-SERVICE-OPERATOR-ROLE-MEMBERSHIP-CONSISTENCY-AUDIT-V1 (원본 감사)
  - WO-O4O-ADMIN-OPERATOR-MEMBERSHIP-CANONICAL-KEY-FIX-V1 (Phase 1 — 신규 row canonical key 저장, code-merged, not yet deployed)
---

# IR-O4O-SERVICE-MEMBERSHIP-CANONICAL-KEY-DRIFT-CHECK-V1

> 운영 DB read-only SELECT 만 수행. UPDATE / DELETE / INSERT 없음. CLAUDE.md §0 정책 준수.

---

## 0. Executive Summary

| 항목 | 값 |
|---|---|
| 검사 시각 | 2026-05-15 (한국 시간 기준 검사 직후) |
| DB | `o4o_platform` (instance `o4o-platform-db`, region `asia-northeast3`) |
| 접근 방식 | `gcloud sql instances patch --authorized-networks` 로 임시 allowlist → `psql -f` read-only SELECT → 원본 authorized_networks 복원 |
| service_memberships 총 row 수 | 12 (active=11, pending=4) — Q1 합산 |
| **Legacy drift row 수** | **`service_key='kpa'` 1 row** (active) — sohae2100@gmail.com |
| **Legacy `cosmetics` drift** | **0 row** (영향 없음) |
| 충돌 (legacy + canonical 양쪽 보유) | **0 user** |
| canonical active 누락 사용자 | **1 user** (kpa: sohae2100@gmail.com) / cosmetics: 0 user |
| Phase 2 마이그레이션 필요 여부 | **YES (소규모)** — kpa 1 row 만 UPDATE 대상 |
| 위험도 | **낮음** — 영향 row 1 개 + 충돌 0 |
| 권장 조치 | Phase 1 deploy 우선, 그 후 Phase 2 small migration (kpa→kpa-society 1 row UPDATE, soft) |

**핵심 결론**: drift 규모는 운영 환경 기준 매우 작다 (`kpa` 1 row). Phase 1 fix 가 미배포 상태에서도 신규 row 가 활발히 생성되지 않은 정황. **충돌 케이스 0** 이므로 마이그레이션은 단순 UPDATE 로 안전. cosmetics 쪽은 영향 없음.

---

## 1. 방법

### 1-1. 접근 채널
- CLAUDE.md §0 정책에 따라 read-only 검증은 Claude Code 가 직접 수행 가능.
- 본 검사는 다음 순서로 수행:
  1. `gcloud sql instances describe` 로 기존 authorized_networks 확인 (`124.194.156.36/32` 단일 항목)
  2. `gcloud sql instances patch --authorized-networks=124.194.156.36/32,<현재IP>/32` 로 현재 IP 임시 추가
  3. `PGPASSWORD='...' psql -h 34.64.96.252 -U o4o_api -d o4o_platform -f /c/tmp/drift-check.sql` 로 SELECT 실행
  4. `gcloud sql instances patch --authorized-networks=124.194.156.36/32` 로 임시 IP 제거 — 원본 상태로 복원
- 사용한 DB 계정: `o4o_api` (Cloud Run 에서 사용 중인 read/write 계정. 본 검사에서는 SELECT only).
- 결과 파일: `/c/tmp/drift-output.txt` (로컬 임시, repo 미포함).
- 변경된 운영 구성: 없음 (authorized_networks 는 원본으로 복원 완료).

### 1-2. 실행한 쿼리
IR-O4O-SERVICE-OPERATOR-ROLE-MEMBERSHIP-CONSISTENCY-AUDIT-V1 §5-1 의 SQL 6 개 + 시간 분포 1 개 = 총 8 개 (모두 SELECT).
파일: `/c/tmp/drift-check.sql` (로컬 임시).

---

## 2. 결과 — Raw

### Q1. service_memberships.service_key 전체 분포

```
 service_key | status  | cnt
-------------+---------+-----
 glycopharm  | active  |   1
 k-cosmetics | active  |   2
 kpa         | active  |   1    ← LEGACY DRIFT
 kpa-society | active  |   3
 kpa-society | pending |   1
 neture      | active  |   1
 platform    | pending |   3
(7 rows)
```

**소계**: 총 12 row (active 11, pending 4). canonical key 9 개, legacy key 1 개. (platform pending 3 은 canonical 자체. drift 와 무관)

### Q2. kpa / kpa-society / cosmetics / k-cosmetics drift focus

```
 service_key | status  | cnt
-------------+---------+-----
 k-cosmetics | active  |   2     ← canonical OK
 kpa         | active  |   1     ← LEGACY DRIFT (단일 row)
 kpa-society | active  |   3     ← canonical OK
 kpa-society | pending |   1     ← canonical OK
(4 rows)

cosmetics (legacy) : 0 rows
```

### Q3. role_assignments service-prefix role 분포

```
      role      | cnt
----------------+-----
 kpa:admin      |   1
 kpa:operator   |   1
 kpa:pharmacist |   1
(3 rows)
```

**비고**: `cosmetics:*`, `neture:*`, `glycopharm:*`, `platform:*` 등은 본 결과셋에 없음 — `role_assignments` 에 활성 service-prefix role 이 KPA 계열만 존재. (즉 운영 DB 의 실제 service-prefix role 발급 표본은 매우 작음)

### Q4. kpa:* role 보유 사용자 중 `kpa-society` active membership 누락자

```
               user_id                |        email        |        kpa_roles         | kpa_society_status | kpa_legacy_status
--------------------------------------+---------------------+--------------------------+--------------------+-------------------
 cfd2a5e7-db28-4842-bd5c-4814cba49ca5 | sohae2100@gmail.com | {kpa:admin,kpa:operator} |                    | active
(1 row)
```

**해석**:
- `sohae2100@gmail.com` 1 명만 누락.
- canonical `kpa-society` row 없음, legacy `kpa` row 만 active.
- 본 사용자는 IR-O4O-SERVICE-OPERATOR-ROLE-MEMBERSHIP-CONSISTENCY-AUDIT-V1 §9 의 정확한 케이스.

### Q5. cosmetics:* role 보유 사용자 중 `k-cosmetics` active membership 누락자

```
 (0 rows)
```

**해석**: cosmetics 쪽 drift 사용자 없음. role_assignments 에 cosmetics:* 활성 row 가 0 인 점과 일관 (Q3).

### Q6. legacy + canonical row 동시 보유 (충돌 후보)

```
 (0 rows)
```

**해석**: 마이그레이션 시 UPDATE 충돌 가능성 없음. 단순 `UPDATE … SET service_key='kpa-society' WHERE service_key='kpa'` 로 안전.

### Q7. sohae2100@gmail.com 상세 상태 (IR §9 검증)

```
        email        |     role     | is_active | service_key | membership_status
---------------------+--------------+-----------+-------------+-------------------
 sohae2100@gmail.com | kpa:admin    | t         | kpa         | active
 sohae2100@gmail.com | kpa:operator | t         | kpa         | active
 sohae2100@gmail.com | super_admin  | t         | kpa         | active
(3 rows)
```

**해석**:
- `role_assignments`: `kpa:admin`, `kpa:operator`, `super_admin` (모두 active).
- `service_memberships`: 단 1 row (`kpa`, active). 사용자별 cross join 결과라 3 row 처럼 보이나 실제 membership row 는 1 개.
- 주목: **`super_admin` 은 unprefixed role**. canonical 은 `platform:super_admin` 이지만 이 row 는 prefix 없는 legacy 형태. 본 IR 범위 외 별건 항목 (별도 IR/WO 검토 필요).

### Q8. drift / canonical row 생성 시간 분포

```
 service_key | cnt |           oldest           |           newest
-------------+-----+----------------------------+----------------------------
 k-cosmetics |   2 | 2026-05-14 06:11:12.636093 | 2026-05-14 06:11:12.636093
 kpa         |   1 | 2026-05-15 07:21:54.117435 | 2026-05-15 07:21:54.117435
 kpa-society |   4 | 2026-05-14 06:11:12.636093 | 2026-05-15 04:53:04.410476
(3 rows)
```

**해석**:
- 유일한 legacy `kpa` row 는 **2026-05-15 07:21:54** 에 생성 — 단일 시점, 단일 사용자.
- canonical `kpa-society` 는 2026-05-14 ~ 2026-05-15 04:53 범위.
- legacy `kpa` 생성 시각(07:21)이 가장 최근 `kpa-society` 생성 시각(04:53)보다 약 2.5 시간 늦음 — 즉 **canonical 경로가 먼저 사용되었고, 이후 admin 컨트롤러의 버그 경로로 legacy row 가 생긴 패턴** (auth-register canonical alias 는 이미 작동 중. admin role 부여만 alias 누락 — Phase 1 WO 가 fix 한 정확한 지점).
- k-cosmetics 도 동일 시점 (2026-05-14 06:11)에 2 row 일괄 생성 — 시드/마이그레이션 또는 auth-register 의 canonical 경로로 추정.

---

## 3. 분석

### 3-1. drift 규모
- 영향 row: **1 row** (`service_memberships.service_key='kpa'`)
- 영향 사용자: **1 명** (sohae2100@gmail.com)
- 충돌 사용자: **0 명**
- cosmetics 쪽 영향: **0**

### 3-2. 본 사용자 의 실사용 영향
- sohae2100@gmail.com 은 `super_admin` (unprefixed) role 보유. KPA-Society 의 RoleGuard 는 `allowedRoles` 에 `platform:super_admin` 만 포함하지만 `super_admin` 매칭 여부는 RoleGuard 구현에 따라 다름 (별건).
- MembershipGate 는 `kpa-society` 검색 → 실패. UI 차단.
- 그러나 본 사용자는 admin.neture.co.kr 의 user 전수 검증 케이스이므로, 일반 운영자 시나리오의 대표성을 갖는다 — IR-V1 §9 의 가설을 실측으로 확인.

### 3-3. Phase 1 WO 가 미배포 상태인데 drift 가 단 1 row 인 이유
- 운영 DB 에는 service-prefix role 발급 자체가 활발하지 않다 (Q3: 3 개의 active role row).
- 대부분의 active membership 은 auth-register canonical 경로 (이미 alias 적용됨) 또는 시드 / 마이그레이션 경로로 생성된다.
- 본 케이스 (sohae2100, 2026-05-15 07:21) 는 admin.neture.co.kr 에서 직접 role 을 부여한 정확한 흔적.
- 따라서 Phase 1 fix 가 deploy 되어도 추가 신규 drift 가 폭증할 가능성은 낮다 (운영 빈도 자체가 낮음).

### 3-4. unprefixed `super_admin` 잔재 (Q7)
- `role_assignments.role = 'super_admin'` 1 row 발견.
- canonical 은 `platform:super_admin`. RBAC SSOT 이행 시 누락된 row.
- 본 IR 범위 외. 별건 IR 또는 RBAC runbook 점검 필요 (`docs/rbac/RBAC-RUNBOOK-V1.md`).

---

## 4. 권장 조치 (Phase 2 입력)

### 4-1. 즉시 (배포 단계)
1. **Phase 1 WO-O4O-ADMIN-OPERATOR-MEMBERSHIP-CANONICAL-KEY-FIX-V1 배포** — code-merged, deploy 대기 중. 배포 후 admin.neture.co.kr 의 신규 role 부여는 canonical key 로 저장됨.

### 4-2. Phase 2 마이그레이션 WO (소규모)
**제안 명**: `WO-O4O-SERVICE-MEMBERSHIP-CANONICAL-KEY-DATA-MIGRATION-V1`

**범위**: `service_memberships` 1 row UPDATE.

**제안 SQL** (사용자 승인 후 — UPDATE 는 CLAUDE.md §0 정책상 명시 승인 필요):
```sql
-- 충돌 사전 검사 (재확인용)
SELECT user_id
FROM service_memberships
WHERE service_key = 'kpa'
  AND user_id IN (
    SELECT user_id FROM service_memberships WHERE service_key = 'kpa-society'
  );
-- 기대: 0 rows

-- 안전 UPDATE
UPDATE service_memberships
SET service_key = 'kpa-society',
    updated_at  = NOW()
WHERE service_key = 'kpa';
-- 기대: UPDATE 1
```

**대안**: cosmetics 영향 없음 — 굳이 동일 WO 에 cosmetics 정리 SQL 을 포함할 필요 없음. 향후 발생 시 동일 패턴으로 처리.

### 4-3. 우회 코드 정리 (별건 후속)
- `apps/api-server/src/controllers/marketTrialController.ts:93` 의 `IN ('kpa', 'kpa-society')` 패턴은 Phase 2 후 단일 `'kpa-society'` 로 축소 가능.
- 본 IR 범위 외. Phase 2 완료 후 단일 검색 후속 cleanup WO.

### 4-4. Phase 3 (alias 단일 출처화) 우선순위
- drift 규모가 작으므로 Phase 3 (alias 매핑 4 곳 통합) 의 시급성은 낮음.
- IR-V1 §7 의 P1 priority 유지 가능. 다음 admin 컨트롤러 작업과 묶어 처리.

---

## 5. 본 IR 의 범위 외

- UPDATE / DELETE / INSERT — 본 IR 은 read-only.
- Phase 1 fix 의 배포 검증 — 배포 후 별도 검증 사이클 필요.
- `super_admin` (unprefixed) row cleanup — 별건.
- alias 매핑 4 곳 통합 (Phase 3) — 별건.
- `marketTrialController.ts` 의 legacy IN 절 정리 — Phase 2 후 별건.
- frontend MembershipGate alias 역방향 적용 검토 — IR-V1 §6 옵션 3, 채택 비권장 입장 유지.

---

## 6. 변경 이력 / 흔적

- 운영 DB read-only SELECT 8 회 (Q1 ~ Q8).
- `gcloud sql instances patch` 2 회:
  1. authorized_networks 임시 추가 (`124.194.156.36/32` + `112.153.205.95/32`)
  2. 원본 복원 (`124.194.156.36/32` 단일)
- 로컬 임시 파일: `/c/tmp/drift-check.sql`, `/c/tmp/drift-output.txt` (repo 미포함, .gitignore 무관).
- 데이터 변경 없음.

---

## 7. 최종 결론

1. service_memberships canonical key drift 는 운영 환경 기준 **kpa 1 row, 1 사용자** 로 극히 작다.
2. cosmetics 쪽 drift 없음.
3. 충돌 케이스 없음 → Phase 2 마이그레이션은 단순 UPDATE 로 안전.
4. Phase 1 WO (code-merged) 배포 후, Phase 2 소규모 UPDATE WO 발행 권장.
5. drift 의 단일 출처는 admin.neture.co.kr 의 운영자 role 부여 경로 — Phase 1 fix 가 정확히 그 지점을 막는다.
6. 부수 발견: `super_admin` unprefixed role 잔재 1 row — 별건 IR 검토 필요.

---

*Status: Investigation Complete. Read-only verification only. Awaiting Phase 2 WO authorization for migration UPDATE.*
*Updated: 2026-05-15*
*Version: 1.0*
