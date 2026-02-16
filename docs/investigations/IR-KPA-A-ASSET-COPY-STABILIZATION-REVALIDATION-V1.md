# IR-KPA-A-ASSET-COPY-STABILIZATION-REVALIDATION-V1

> 목적: WO-KPA-A-ASSET-COPY-STABILIZATION-V1 이후 Asset Copy Engine이 Production 기준을 충족하는지 재검증
>
> 유형: 읽기 전용 조사 (코드 수정 없음)
> 기준: WO-KPA-A-ASSET-COPY-STABILIZATION-V1 (69eddee95)
>
> 일시: 2026-02-16

---

## Executive Summary

**Stabilization 이후 모든 P0 항목이 해결되었다.**

| 이전 IR 결과 | 이번 재검증 |
|------------|----------|
| 권한 검증 누락 (HIGH) | **PASS** — operator role guard 양쪽 적용 |
| DB UNIQUE 없음 (HIGH) | **PASS** — 3중 방어 (앱 + DB + 에러핸들링) |
| Pagination 없음 (HIGH) | **PASS** — page/limit/total 완전 구현 |

**Core 승격 판정: B) 조건부 가능**
- Entity + Service는 플랫폼 공통 수준 (A+)
- Controller만 KPA 전용 (B) — auth/org resolver 추상화 필요

---

## 결과 요약

| Phase | 항목 | 결과 | 비고 |
|-------|------|------|------|
| A1 | POST /copy role guard | **PASS** | hasAnyServiceRole(OPERATOR_ROLES) |
| A2 | GET / role guard | **PASS** | 동일 guard 적용 |
| A3 | Bypass 경로 | **PASS** | 우회 없음 |
| B1 | UNIQUE 제약 정의 | **PASS** | UQ_asset_snapshot_org_source_type |
| B2 | Race condition 해결 | **PASS** | 3중 방어 구조 |
| C1 | 기본값 (page=1, limit=20) | **PASS** | Math.max/min 적용 |
| C2 | limit 상한 100 | **PASS** | Math.min(100, ...) |
| C3 | 응답 구조 | **PASS** | { items, total, page, limit } |
| D | Snapshot 독립성 | **PASS** | FK 0건, JOIN 0건 |
| E1 | content_json 검증 | **PASS** | typeof + Array.isArray 체크 |
| E2 | asset_type whitelist | **PASS** | cms/signage만 허용 |
| F1 | N+1 쿼리 | **PASS** | findAndCount 단일 쿼리 |
| F2 | 인덱스 | **PASS** | org_id, asset_type, source 인덱스 |
| G | Core 승격 적합성 | **B) 조건부** | Controller 추상화 필요 |

---

## Phase A — 권한 경계: PASS

### POST /copy (controller:53-61)

```typescript
const userRoles = user.roles || [];
if (!hasAnyServiceRole(userRoles, OPERATOR_ROLES)) {
  res.status(403).json({ ... });
  return;
}
```

### GET / (controller:123-131)

동일한 role guard 적용 확인.

### OPERATOR_ROLES (controller:23)

```typescript
const OPERATOR_ROLES: KpaRole[] = ['kpa:admin', 'kpa:operator', 'kpa:branch_admin', 'kpa:branch_operator'];
```

### Bypass 검증

- kpa.routes.ts에서 `/assets` 경로 1건만 등록
- 중복 라우트 없음
- middleware skip 없음

---

## Phase B — 중복 방지: PASS (3중 방어)

### Layer 1: Application Check (service:51-60)

```typescript
const existing = await this.snapshotRepo.findOne({ where: { organizationId, sourceAssetId, assetType } });
if (existing) throw new Error('DUPLICATE_SNAPSHOT');
```

### Layer 2: DB UNIQUE Constraint (migration:20260216100001)

```sql
ALTER TABLE "o4o_asset_snapshots"
ADD CONSTRAINT "UQ_asset_snapshot_org_source_type"
UNIQUE ("organization_id", "source_asset_id", "asset_type")
```

- Idempotent: pg_constraint 사전 체크
- down(): DROP CONSTRAINT IF EXISTS

### Layer 3: Error Code Handling (service:80-84)

```typescript
catch (err: any) {
  if (err.code === '23505') {
    throw new Error('DUPLICATE_SNAPSHOT');
  }
  throw err;
}
```

### Race Condition 시나리오

```
Thread A: findOne → null → save → SUCCESS (201)
Thread B: findOne → null → save → 23505 → DUPLICATE_SNAPSHOT → 409
```

DB 제약이 최종 방어선. Race condition 완전 해결.

---

## Phase C — Pagination: PASS

### 기본값 + 경계값 (controller:152-153)

```typescript
const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
```

| 입력 | 결과 | 판정 |
|------|------|------|
| page 미지정 | 1 | PASS |
| limit 미지정 | 20 | PASS |
| limit=500 | 100 | PASS |
| limit=0 | 1 | PASS |
| limit=-5 | 1 | PASS |
| page=0 | 1 | PASS |
| page=-1 | 1 | PASS |

### Service (service:92-108)

```typescript
const [items, total] = await this.snapshotRepo.findAndCount({
  where,
  order: { createdAt: 'DESC' },
  skip: (page - 1) * limit,
  take: limit,
});
return { items, total, page, limit };
```

- findAndCount: 단일 쿼리로 items + total 반환
- skip/take 정확
- createdAt DESC 정렬

---

## Phase D — Snapshot 독립성: PASS

| 검증 항목 | 결과 |
|-----------|------|
| @ManyToOne 데코레이터 | 0건 |
| @OneToOne 데코레이터 | 0건 |
| @JoinColumn 데코레이터 | 0건 |
| FK REFERENCES | 0건 |
| source 테이블 JOIN | 0건 |
| sourceAssetId 역참조 | 0건 |
| store-hub → snapshot 참조 | 0건 |
| community → snapshot 참조 | 0건 |

CmsContent import는 복사 원본 조회 용도 (의도적, entity에는 없음).

---

## Phase E — 입력 검증: PASS

### content_json (service:62-65)

```typescript
if (!contentJson || typeof contentJson !== 'object' || Array.isArray(contentJson)) {
  throw new Error('INVALID_CONTENT');
}
```

- null 차단, primitive 차단, 배열 차단

### asset_type whitelist (controller:64-70, 143-149)

- POST: `['cms', 'signage'].includes(assetType)` → 400
- GET: `['cms', 'signage'].includes(assetType)` → 400

---

## Phase F — 성능: PASS (1건 WARNING)

### N+1 쿼리: PASS

- listByOrganization: `findAndCount()` 단일 쿼리
- copyAsset: 3개 쿼리 (원본조회 + 중복체크 + 저장) — Pilot 적정

### 인덱스 현황: PASS

| 인덱스 | 용도 | 상태 |
|--------|------|------|
| IDX_asset_snap_org_id | org별 목록 조회 | O |
| IDX_asset_snap_asset_type | 타입 필터 | O |
| IDX_asset_snap_source | 중복 탐지 | O |
| UQ_asset_snapshot_org_source_type | 중복 방지 | O |

### WARNING: createdAt 인덱스 부재

`ORDER BY created_at DESC`에 사용되지만 명시적 인덱스 없음.
대량 데이터(10K+) 시 정렬 성능 저하 가능.
**현재 Pilot 규모에서는 영향 없음.**

---

## Phase G — Core 승격 판정

### 컴포넌트별 평가

| 컴포넌트 | 등급 | 상태 | 비고 |
|----------|------|------|------|
| Entity | A+ | Core 준비 완료 | FK 없음, 독립 스냅샷 |
| Service | A+ | Core 준비 완료 | 범용 copy/list 로직 |
| Migration | A | Core 준비 완료 | 플랫폼 공통 테이블, idempotent |
| Controller | B | 추상화 필요 | KPA 전용 auth/org/roles |

### Core 승격 기준 충족 여부

| 기준 | 충족 여부 | 근거 |
|------|----------|------|
| 권한 분리 명확 | **PASS** | KpaRole[] 타입 가드, OPERATOR_ROLES 상수 |
| 중복 방지 DB 레벨 보장 | **PASS** | UNIQUE + 앱체크 + 23505 3중 방어 |
| Pagination 존재 | **PASS** | findAndCount, skip/take, 상한 100 |
| Source 독립성 유지 | **PASS** | FK 0건, JOIN 0건, 역참조 0건 |
| 서비스 종속성 없음 | **CONDITIONAL** | 스키마 OK, Controller만 KPA 전용 |

### KPA 전용 항목 (Core 승격 시 추상화 필요)

| # | 항목 | 위치 | 수정량 |
|---|------|------|--------|
| 1 | Org resolver (KpaMember) | controller | 인터페이스 추출 |
| 2 | Role guard (KpaRole[]) | controller | 주입 가능화 |
| 3 | API path (/kpa/assets) | kpa.routes.ts | 서비스별 마운트 |

**모든 블로커가 Controller 레이어에만 존재** — Entity/Service는 완전 범용.

---

## 최종 판정

### B) 조건부 Core 승격 가능

**현재 상태로 KPA-a 프로덕션 사용: 가능**
- P0 3건 모두 해결
- 보안·무결성·성능 기준 충족

**Core 승격 경로**:
- Controller에 org resolver + role config 주입 패턴 적용 시 → A등급 승격
- 예상 작업량: ~2시간

### 이전 IR 대비 개선

| 항목 | 이전 | 이후 |
|------|------|------|
| 권한 검증 | FAIL (HIGH) | **PASS** |
| DB UNIQUE | FAIL (HIGH) | **PASS** (3중 방어) |
| Pagination | FAIL (HIGH) | **PASS** |
| content_json 검증 | FAIL (MEDIUM) | **PASS** |
| Race condition | INCOMPLETE | **PASS** |

### 잔여 권장 사항 (P2/P3)

1. **createdAt 인덱스** — 대량 데이터 대비 (P3)
2. **soft delete** — deletedAt 컬럼 (P3, Core 승격 시)
3. **감사 로그** — 복사 이벤트 기록 (P3)

---

*Generated: 2026-02-16*
*Status: Revalidation Complete — Production Ready*
