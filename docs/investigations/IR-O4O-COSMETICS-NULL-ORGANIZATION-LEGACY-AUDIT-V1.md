---
id: IR-O4O-COSMETICS-NULL-ORGANIZATION-LEGACY-AUDIT-V1
title: K-Cosmetics legacy 데이터 — cosmetics_stores.organization_id NULL row 원인·분류·복구 가능성 조사
status: completed
date: 2026-05-24
domain: cosmetics / organization / legacy-data / canonical-alignment
related:
  - WO-O4O-COSMETICS-ORG-REUSE-AND-ENROLLMENT-V1
  - WO-O4O-COSMETICS-ORG-ENROLLMENT-BACKFILL-V1
  - WO-O4O-COSMETICS-STORE-HUB-ADOPTION-V1
  - WO-O4O-NORMALIZE-COSMETICS-SERVICE-MEMBERSHIP-KEY-V1
constitution:
  - CLAUDE.md §1 (조사 → 문제확정 → 최소 수정 → 검증 → 종료)
  - CLAUDE.md §7 (Boundary Policy — serviceKey 기반 분리)
  - CLAUDE.md §9 (Cosmetics Domain Rules — 독립 스키마 cosmetics_*)
---

# IR-O4O-COSMETICS-NULL-ORGANIZATION-LEGACY-AUDIT-V1

> 직전 [WO-O4O-COSMETICS-ORG-ENROLLMENT-BACKFILL-V1](../../apps/api-server/src/database/migrations/20260930000000-BackfillCosmeticsServiceEnrollments.ts) 백필 마이그레이션이 처리하지 못한 **`organization_id IS NULL` cosmetics_stores row** 의 원인·분류·복구 가능성을 read-only 로 추적한다. 코드/DB/migration 변경 없음.

---

## 0. 조사 원칙

```
코드 수정 금지
DB 수정 금지
migration 생성 금지
read-only 조사만 수행
```

직접 DB 접속이 막혀 있어(`o4o-platform-db` instance authorized networks 에 조사자 IP 미등록) 실제 row 수를 직접 조회하지 못함. 대신 다음 채널로 분석:

- 소스 코드 정적 분석 (cosmetics_stores INSERT/UPDATE 경로 전수)
- 마이그레이션 history (organization_id 컬럼 추가 + 백필 조건 추적)
- Cloud Run production log (cosmetics_store 생성 흔적)
- git history (commit 흐름)

진단 SQL 셋은 §9 에 명시 (Cloud SQL Studio 또는 임시 whitelist 후 사용자 직접 실행).

---

## 1. cosmetics_stores 생성 경로 전수 (코드 정적 분석)

### 1.1 경로 1 — `reviewApplication` (정상 승인 흐름)

**파일**: [apps/api-server/src/routes/cosmetics/services/cosmetics-store.service.ts:91-225](../../apps/api-server/src/routes/cosmetics/services/cosmetics-store.service.ts#L91-L225)

**organization_id 설정**: ✅ **YES** (commit `f5a5d63c2` 이후 강제)

- application.businessNumber (이미 normalize) 기준 organizations SELECT
- 매칭 있으면 reuse, 없으면 신규 INSERT
- 최종 orgId 를 cosmetics_stores INSERT 시 explicit 설정

→ **이 경로로 만들어지는 신규 row는 organization_id NULL 불가능**.

### 1.2 경로 2 — `CreateCosmeticsStoreTables` 초기 마이그레이션

**파일**: [apps/api-server/src/database/migrations/20260212000001-CreateCosmeticsStoreTables.ts](../../apps/api-server/src/database/migrations/20260212000001-CreateCosmeticsStoreTables.ts)

**organization_id 설정**: ❌ **NO** (컬럼 자체 미존재)

→ 이 마이그레이션 시점에는 organization_id 컬럼이 없었음. 이후 추가됨.

### 1.3 경로 3 — `CosmeticsStoreOrgBridge` 백필 마이그레이션

**파일**: [apps/api-server/src/database/migrations/20260311200000-CosmeticsStoreOrgBridge.ts:95-142](../../apps/api-server/src/database/migrations/20260311200000-CosmeticsStoreOrgBridge.ts#L95-L142)

**organization_id 설정**: ⚠️ **부분적 (조건부)**

백필 조건 (line 113-117, line 137-142):

```sql
-- Step 1: organization INSERT (approved only + code 미충돌)
INSERT INTO organizations (...)
SELECT gen_random_uuid(), cs.name, cs.code, 'store', 0, '/' || cs.code, ...
FROM cosmetics.cosmetics_stores cs
WHERE cs.status = 'approved'
  AND NOT EXISTS (SELECT 1 FROM organizations o WHERE o.code = cs.code)

-- Step 3: code 기준 link
UPDATE cosmetics.cosmetics_stores cs
SET organization_id = o.id
FROM organizations o
WHERE o.code = cs.code AND cs.organization_id IS NULL
```

→ 백필 제외되는 경우:
- `status != 'approved'` row (DRAFT / PENDING / REJECTED / SUSPENDED) — Step 1 의 WHERE 절에서 제외
- `code` 충돌 row (같은 code organization 이미 존재 + INSERT skip) — 단, Step 3 UPDATE 는 code match 이므로 충돌 row 도 link 됨. 실질 누락은 거의 없음.

### 1.4 경로 4 — `updateStoreStatus` (admin 직접 status 전환)

**파일**: [apps/api-server/src/routes/cosmetics/services/cosmetics-store.service.ts:315-328](../../apps/api-server/src/routes/cosmetics/services/cosmetics-store.service.ts#L315-L328)

```typescript
async updateStoreStatus(storeId: string, status: string) {
  // ...
  await this.repository.updateStoreStatus(storeId, status);  // organization_id 미설정
  return { data: { id: storeId, status } };
}
```

**organization_id 설정**: ❌ **NO**

→ 이미 존재하는 cosmetics_stores row 의 status 만 변경. organization_id 가 NULL 인 상태에서 APPROVED 로 전환되어도 NULL 유지.

### 1.5 경로 5 — 다른 도메인 / seed / bootstrap

- `apps/api-server/src/database/seeds/` — **폴더 부재** (cosmetics seed 미존재)
- cosmetics 외 도메인에서 cosmetics_stores 직접 생성 — **부재**
- 서버 부팅 시 자동 cosmetics_store 생성 — **부재**

→ 코드 경로로는 §1.1 / §1.3 두 경로만 신뢰 가능.

---

## 2. NULL 발생 시나리오 매트릭스

| # | 시나리오 | 원인 | 가능성 | 영향 범위 |
|---|---------|------|:------:|----------|
| A | 정상 승인 (`reviewApplication`) | organization_id 강제 설정 | ❌ 불가능 | - |
| B1 | 백필 마이그레이션 WHERE 절 제외 | `cs.status != 'approved'` 제외 | ✅ **확실** | DRAFT / PENDING / REJECTED / SUSPENDED 기존 row |
| B2 | 백필 code 충돌 잔재 | 매우 드문 case (Step 3 UPDATE 가 보완) | ⚠️ 매우 드물음 | code 중복 + approved row |
| C | `updateStoreStatus` admin 직접 전환 | status 만 UPDATE, organization_id 보존 | ✅ 가능 | NULL 상태 row 의 status 전환 |
| D | 직접 SQL/seed (수동 조작) | dev/test 환경 잔재 | ✅ 가능 | dev/staging DB 한정 (prod 가능성 낮음) |
| E | 마이그레이션 순서 이슈 | 구조상 보호됨 | ❌ 불가능 | - |

### 2.1 가장 가능성 높은 시나리오

**시나리오 B1 (확실)**: 마이그레이션 20260311200000 적용 시점에 이미 DRAFT/PENDING/REJECTED/SUSPENDED 상태였던 cosmetics_stores row 들. 이들은 백필에서 제외됨.

→ 정상 운영 흐름이라면 cosmetics_stores 자체가 APPROVED 시점에만 생성되어야 함 (`reviewApplication` 의 approve branch 에서만 INSERT). 즉 NON-APPROVED 상태로 cosmetics_stores row 가 존재한다면 **코드 정상 경로 외 흔적** (수동 조작 / 과거 코드 / DRAFT 단계용 임시 row 등).

---

## 3. business_number 매칭 가능성 (Repair 분석)

### 3.1 cosmetics_stores.business_number

**파일**: [apps/api-server/src/routes/cosmetics/entities/cosmetics-store.entity.ts:43-45](../../apps/api-server/src/routes/cosmetics/entities/cosmetics-store.entity.ts#L43-L45)

```typescript
@Column({ name: 'business_number', type: 'varchar', length: 100, unique: true })
@Index()
businessNumber!: string;
```

- **NOT NULL** + **UNIQUE** — 모든 row 에 business_number 보유 보장
- 정규화: `submitApplication` 단계에서 `normalizeBusinessNumber()` 후 저장

### 3.2 organizations.business_number

**마이그레이션**: [20260221000000-OrgServiceModelNormalizationPhaseA.ts:58-74](../../apps/api-server/src/database/migrations/20260221000000-OrgServiceModelNormalizationPhaseA.ts#L58-L74)

```sql
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS business_number VARCHAR(20)
CREATE INDEX IDX_organizations_business_number
  ON organizations(business_number) WHERE business_number IS NOT NULL
```

- **NULLABLE** (UNIQUE 제약 없음)
- Partial index 존재 (NOT NULL 조건)
- 채우는 경로: GlycoPharm / Neture / Cosmetics 도메인 모두 자기 매장의 business_number 를 organization 에 복사

### 3.3 정규화 일관성

**파일**: [apps/api-server/src/utils/business-number.ts](../../apps/api-server/src/utils/business-number.ts)

```typescript
export function normalizeBusinessNumber(raw: string): string {
  return raw.replace(/\D/g, '');  // 비숫자 제거
}
```

→ K-Cosmetics 는 application 단계에서 normalize 후 저장. GlycoPharm도 동일 함수 사용. **정규화 일관성 확보**.

### 3.4 Repair 매핑 분류

| 케이스 | 의미 | 처리 |
|--------|------|------|
| **A** business_number 일치 organization 1건 | 같은 사업자가 다른 서비스 가입 (GlycoPharm 등) — bridge 가능 | ✅ 자동 repair 후보 |
| **B** business_number 일치 organization 0건 | 같은 사업자번호 organization 없음 — 새 organization 생성 필요 | ⚠️ 수동 결정 (orphan) |
| **C** business_number NULL | cosmetics_stores 는 NOT NULL 제약이라 발생 불가 | ❌ N/A |
| **D** business_number 일치 organization 복수 | 다른 흐름으로 중복 생성된 drift | ⚠️ canonical organization 선택 필요 |

---

## 4. 생성 경로 역추적 (timestamp 단서)

### 4.1 시간 순 cosmetics 마이그레이션 catalog

| Timestamp | 마이그레이션 | cosmetics_stores 영향 |
|-----------|--------------|----------------------|
| `20260212000001` | CreateCosmeticsStoreTables | 테이블 초기 생성 (organization_id 없음) |
| `20260311200000` | **CosmeticsStoreOrgBridge** | organization_id 컬럼 ADD + approved row 백필 |
| `20260524083827` | CreateCosmeticsMembersTable | 간접 (FK) |
| `20260906000000` | AddRequestedSlugToCosmeticsApplications | 간접 (application) |
| `20260929000000` | NormalizeServiceMembershipsCosmeticsKey | 영향 없음 |
| `20260930000000` | **BackfillCosmeticsServiceEnrollments** | organization_id 있는 row 만 enrollment 백필 |

→ NULL row 의 timestamp 단서:
- `created_at < 2026-03-11` 인 row = bridge 마이그레이션 이전 row (B1 시나리오 — status≠approved 였으면 NULL 잔존)
- `created_at >= 2026-03-11` 인 row = bridge 이후 — reviewApplication 만 가능 → NULL 발생 불가능 (단, updateStoreStatus 로 NULL row status 변경한 경우 잔존)

---

## 5. Canonical 구조 충돌 평가

### 5.1 정상 구조

```
organizations (SSOT)
  ↓
organization_service_enrollments (service_code='k-cosmetics')
  ↓
cosmetics_stores (organization_id NOT NULL, 서비스 확장 엔티티)
```

### 5.2 NULL row 의 구조적 위치

```
cosmetics_stores (organization_id NULL)
  ↑ organizations 없음
  ↑ organization_service_enrollments 없음 (직전 backfill 마이그레이션 §1.3 WHERE organization_id IS NOT NULL 조건에 제외됨)
```

→ NULL row 는 **canonical SSOT 외부**에 존재. O4O Business Philosophy §3 ("하나의 사업자 → 하나의 organization → 여러 service enrollment") 와 직접 충돌.

### 5.3 충돌 심각도

| 항목 | 판정 |
|------|------|
| organization SSOT 위반 | ✅ **위반** (organization 없음) |
| 다중 서비스 구조 충돌 | ⚠️ 잠재 — 같은 사업자가 GlycoPharm 등 다른 서비스 가입 시 K-Cosmetics 만 어디에도 묶이지 않음 |
| business_number canonical 유지 | ✅ 유지 (cosmetics_stores.business_number NOT NULL 보장) |
| 현재 철학과의 충돌 | ⚠️ status=approved 인 NULL row 는 사용자 노출 가능 운영 데이터 → 즉시 정렬 필요 |

---

## 6. Repair 가능성 평가

### 6.1 Option A — business_number 매핑 가능 (자동 repair)

**조건**: 진단 SQL §9.3 결과 — `matching_org_count >= 1`

**처리**:
1. organizations 에서 `business_number = normalize(cs.business_number)` 매칭 organization 찾기
2. 매칭 1건 → `cosmetics_stores.organization_id` UPDATE
3. organization_service_enrollments 백필 (직전 마이그레이션 재실행 또는 별도 INSERT)

**위험도**: 낮음 (existing organization reuse 만 수행)

### 6.2 Option B — orphan (organization 신규 생성 필요)

**조건**: §9.3 결과 — `matching_org_count = 0`

**처리**:
1. status='approved' 인 경우: 새 organization 생성 (`reviewApplication` 의 신규 INSERT 분기와 동일 로직)
2. status≠'approved' 인 경우: 사용자 노출 데이터 아님 → 운영 검토 후 결정

**위험도**: 중간 (organization 신규 생성 — 운영 정책 결정 필요)

### 6.3 Option C — legacy dead data (cleanup)

**조건**: §9.3 결과 — `status IN ('draft', 'pending', 'rejected', 'suspended')` 이면서 운영상 의미 없는 row

**처리**:
1. 사용자/스토어 조회 결과로 실제 사용 여부 확인
2. 사용 흔적 없으면 별도 cleanup WO 로 DELETE

**위험도**: 낮음 (사용 데이터 확인 후 DELETE)

### 6.4 Option D — multi-organization drift

**조건**: §9.3 결과 — `matching_org_count >= 2`

**처리**:
1. 매칭 organization 들 중 canonical 선택 (예: 가장 오래된 것, GlycoPharm enrollment 보유 등 기준)
2. 다른 organization 들의 처리 결정 (merge 또는 archive)

**위험도**: 높음 (data merge / canonical 결정 필요) — 별도 IR 필요

---

## 7. Current Structure vs O4O Philosophy Conflict Check

| 기준 | 판정 |
|------|------|
| **organization SSOT 위반** | ✅ NULL row 는 organization 없이 존재 → SSOT 위반 |
| **다중 서비스 구조 충돌** | ⚠️ NULL row 가 GlycoPharm 등 다른 서비스 organization 과 분리됨 → 다중 서비스 통합 시 불일치 |
| **business_number canonical 유지** | ✅ cosmetics_stores 자체는 canonical 보장 (NOT NULL + UNIQUE) |
| **legacy row의 현재 철학 충돌** | ⚠️ **이중 분류**: <br>- `status='approved'` NULL → 사용자 노출 가능 + canonical 위반 → 즉시 정렬<br>- `status≠'approved'` NULL → 사용자 미노출 + 정상 코드 경로 외 흔적 → 운영 검토 후 cleanup 또는 reset |

---

## 8. 최종 산출물

| 항목 | 결과 |
|------|------|
| **NULL organization row 수** | 직접 DB 조회 불가 — §9.1 진단 SQL 로 사용자 확인 필요 |
| **원인 분류** | B1 (백필 WHERE 제외) **확실** + C (updateStoreStatus) 가능 + D (수동) 가능 |
| **business_number bridge 가능 수** | §9.3 진단 SQL 결과로 도출 |
| **orphan 수** | §9.3 진단 SQL 결과로 도출 |
| **자동 repair 가능 여부** | ⚠️ **조건부 YES** — `matching_org_count = 1` 인 row 한정 자동 가능. orphan/multi-match 는 수동 결정 |
| **권장 후속 WO** | (1) 진단 SQL 실행 후 분포 확인 → (2) 분류별 처리 방향 결정 → (3) 마이그레이션 또는 cleanup WO |

### 8.1 핵심 질문 → 답

```
organization_id NULL row 는

  살려야 하는 데이터인가          ← status='approved' 인 row (사용자/스토어 실존 가능)
    AND
  정리해야 하는 잔재인가          ← status≠'approved' 인 row (코드 경로 외 흔적)

→ 이중 분류 — 진단 SQL 결과의 status 분포가 답을 결정
```

---

## 9. 진단 SQL 셋 (사용자 직접 실행)

> 모두 read-only (SELECT). Cloud SQL Studio (Console > SQL > o4o-platform-db) 또는 임시 IP whitelist 후 `gcloud sql connect` / `psql` 로 실행.

### 9.1 status 별 NULL row 분포

```sql
SELECT
  cs.status,
  COUNT(*) AS null_org_count,
  MIN(cs.created_at) AS earliest_row,
  MAX(cs.created_at) AS latest_row
FROM cosmetics.cosmetics_stores cs
WHERE cs.organization_id IS NULL
GROUP BY cs.status
ORDER BY cs.status;
```

**판독**: status 별 분포로 시나리오 분류. `approved` 가 많으면 Option A/B, `draft`/`pending` 많으면 Option C (legacy cleanup).

### 9.2 approved + NULL row 상세

```sql
SELECT
  cs.id,
  cs.code,
  cs.business_number,
  cs.name,
  cs.status,
  cs.created_at,
  cs.updated_at
FROM cosmetics.cosmetics_stores cs
WHERE cs.organization_id IS NULL
  AND cs.status = 'approved'
ORDER BY cs.created_at;
```

**판독**: 살려야 할 row 의 raw 데이터. business_number 정규화 상태 / 생성 시점 확인.

### 9.3 business_number 기반 매칭 분석 (Repair 가능성)

```sql
SELECT
  cs.id AS store_id,
  cs.code AS cs_code,
  cs.business_number AS cs_bn,
  cs.status,
  COUNT(DISTINCT o.id) AS matching_org_count,
  STRING_AGG(DISTINCT o.id::text, ',') AS matching_org_ids,
  STRING_AGG(DISTINCT o.code, ',') AS matching_org_codes,
  STRING_AGG(DISTINCT o.metadata->>'serviceKey', ',') AS matching_service_keys
FROM cosmetics.cosmetics_stores cs
LEFT JOIN organizations o
  ON o.business_number = cs.business_number
WHERE cs.organization_id IS NULL
GROUP BY cs.id, cs.code, cs.business_number, cs.status
ORDER BY cs.created_at;
```

**판독**:
- `matching_org_count = 1` → Option A (자동 repair)
- `matching_org_count = 0` → Option B (orphan, 신규 생성 필요)
- `matching_org_count >= 2` → Option D (drift, canonical 선택)
- `matching_service_keys` 에 `glycopharm` 보이면 → 같은 사업자가 GlycoPharm 가입한 상태

### 9.4 code 기반 매칭 (마이그레이션 백필과 동일 로직)

```sql
SELECT
  cs.id AS store_id,
  cs.code AS cs_code,
  cs.business_number,
  cs.status,
  o.id AS potential_org_id,
  o.code AS org_code,
  o.metadata->>'serviceKey' AS org_service_key,
  cs.created_at,
  o."createdAt" AS org_created_at
FROM cosmetics.cosmetics_stores cs
LEFT JOIN organizations o ON o.code = cs.code
WHERE cs.organization_id IS NULL
ORDER BY cs.created_at DESC;
```

**판독**: `CosmeticsStoreOrgBridge` Step 3 UPDATE 가 처리했어야 할 잔재 식별. potential_org_id NOT NULL 이면 단순 UPDATE 로 repair 가능.

### 9.5 timestamp 기반 분포 (마이그레이션 전/후)

```sql
SELECT
  CASE
    WHEN cs.created_at < '2026-03-11 00:00:00'::TIMESTAMP THEN 'PRE_BRIDGE_MIGRATION'
    ELSE 'POST_BRIDGE_MIGRATION'
  END AS period,
  cs.status,
  COUNT(*) AS null_org_count
FROM cosmetics.cosmetics_stores cs
WHERE cs.organization_id IS NULL
GROUP BY period, cs.status
ORDER BY period DESC, cs.status;
```

**판독**: bridge 마이그레이션 후 row 에 NULL 이 있다면 시나리오 C/D (updateStoreStatus / 수동) 흔적.

### 9.6 business_number 정규화 검증

```sql
SELECT
  COUNT(*) FILTER (WHERE business_number ~ '[^0-9]') AS non_normalized_count,
  COUNT(*) FILTER (WHERE business_number ~ '^[0-9]+$') AS normalized_count,
  COUNT(*) AS total
FROM cosmetics.cosmetics_stores
WHERE organization_id IS NULL;
```

**판독**: 정규화 불일치 가능성 확인. 정규화 되지 않은 business_number 가 있으면 §9.3 매칭이 누락될 수 있음.

---

## 10. 결론

### 10.1 NULL row 의 의미

NULL row 는 다음 두 가지로 분류된다:

1. **status='approved' + NULL** — 사용자/스토어 실존 가능. **canonical SSOT 외부 운영 데이터** → 정렬 필요 (살려야 함).
2. **status≠'approved' + NULL** — 정상 코드 경로 외 흔적. **legacy dead data 가능성 높음** → 운영 검토 후 cleanup.

진단 SQL §9.1 결과의 status 분포가 본 IR 의 핵심 입력.

### 10.2 다음 단계

```
1단계: 사용자가 §9.1 ~ §9.6 진단 SQL 실행
2단계: status 분포 + matching_org_count 분포 확인
3단계: 결과 기반 후속 WO 결정
  - approved + 1 match → WO-O4O-COSMETICS-NULL-ORG-AUTO-REPAIR-V1 (자동 UPDATE 마이그레이션)
  - approved + 0 match → WO-O4O-COSMETICS-ORPHAN-RESOLUTION-V1 (운영 정책 결정)
  - non-approved → WO-O4O-COSMETICS-LEGACY-DEAD-DATA-CLEANUP-V1 (cleanup 마이그레이션)
  - multi-match → 별도 IR (canonical 선택 기준 설계)
```

### 10.3 본 IR 의 한계

- 직접 DB 조회 불가 → 실제 row 수와 분포는 사용자 검증 후 확정
- updateStoreStatus 호출 production log 추적은 별도 후속 가능 (현재 IR 범위 외)
- multi-organization drift (§6.4) 의 canonical 선택 기준은 별도 IR 필요

---

## 11. 산출물 요약

| 항목 | 결과 |
|------|------|
| cosmetics_stores 생성 경로 | 5 경로 식별 — §1 |
| NULL 발생 시나리오 | 6 시나리오 매트릭스 — §2 (B1 확실 + C/D 가능) |
| business_number 매칭 가능성 | NOT NULL + 정규화 일관성 + index 존재 → 코드상 가능 — §3 |
| 시간 순 마이그레이션 catalog | 6 마이그레이션 — §4 |
| Canonical 구조 충돌 | SSOT 위반 — §5 |
| Repair Option 분류 | A (auto) / B (orphan) / C (cleanup) / D (drift) — §6 |
| 진단 SQL | 6 쿼리 — §9 |
| 핵심 질문 답 | **이중 분류 — status 분포가 결정** — §8.1 |
| 코드 변경 | **없음** (read-only 조사 전용) |
| 후속 WO | §10.2 의 분기 흐름 — 진단 SQL 결과 후 결정 |

---

*Author: Claude (Investigation only — no code/DB/migration change executed)*
*Investigation date: 2026-05-24*
*Status: completed — ready for §9 diagnostic SQL execution*
