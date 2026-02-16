# IR-O4O-ASSET-COPY-NETURE-VALIDATION-V1

> 목적: WO-O4O-ASSET-COPY-NETURE-PILOT-V1 구현 결과의 구조적 검증
>
> 유형: 코드 구조 검증 (읽기 전용)
> 기준: WO-O4O-ASSET-COPY-NETURE-PILOT-V1
>
> 일시: 2026-02-16

---

## Executive Summary

**Neture 2차 Pilot이 Core 승격 기준을 충족하는지 구조적으로 검증한다.**

| 검증 항목 | 결과 | 비고 |
|-----------|------|------|
| Resolver 패턴 분리 | **PASS** | 인터페이스 + 2개 구현체 |
| SnapshotService 무수정 | **PASS** | 신규 메서드만 추가, 기존 변경 없음 |
| 권한 namespace 분리 | **PASS** | KPA/Neture 독립 role 배열 |
| Snapshot 테이블 변경 없음 | **PASS** | 스키마 동일 |
| FK 추가 없음 | **PASS** | 완전 독립 |
| 서비스 간 의존성 없음 | **PASS** | KPA ↔ Neture 교차 import 0 |

**Core 승격 판정: A) 승격 가능**

---

## Case A — Resolver 인터페이스 분리

### A1. 인터페이스 정의

**파일**: `modules/asset-snapshot/interfaces/asset-resolver.interface.ts`

```typescript
export interface AssetResolver {
  resolve(sourceAssetId: string, assetType: 'cms' | 'signage'): Promise<ResolvedAsset | null>;
}

export interface ResolvedAsset {
  title: string;
  type: 'cms' | 'signage';
  contentJson: Record<string, unknown>;
  sourceService: string;
}
```

**판정: PASS** — 최소한의 인터페이스, 서비스 구조 비노출

### A2. KpaAssetResolver

**파일**: `modules/asset-snapshot/resolvers/kpa-asset.resolver.ts`

- CMS: `CmsContent` entity 조회 → ResolvedAsset 변환
- Signage: raw SQL 조회 (circular import 방지) → ResolvedAsset 변환
- sourceService: `'kpa'` 고정

**판정: PASS** — 기존 fetchSourceContent 로직 그대로 추출

### A3. NetureAssetResolver

**파일**: `modules/asset-snapshot/resolvers/neture-asset.resolver.ts`

- CMS: `NetureSupplierContent` entity 조회 → ResolvedAsset 변환
- Signage: 공유 `signage_media` 테이블 raw SQL 조회
- sourceService: `'neture'` 고정

**판정: PASS** — Neture 고유 필드(availableServices, availableAreas) 포함

---

## Case B — SnapshotService 확장 검증

### B1. 기존 copyAsset() 보존

```typescript
async copyAsset(input: CopyAssetInput): Promise<CopyAssetResult>
```

**변경 없음** — KPA 기존 사용 완전 호환

### B2. 신규 copyWithResolver()

```typescript
async copyWithResolver(input: CopyAssetInput, resolver: AssetResolver): Promise<CopyAssetResult>
```

- Resolver 호출 → copyResolved 위임
- SOURCE_NOT_FOUND 처리 동일

### B3. 신규 copyResolved()

```typescript
async copyResolved(input: CopyResolvedAssetInput): Promise<CopyAssetResult>
```

- 사전 해결된 content를 직접 저장
- 중복 검사 (앱 + DB UNIQUE) 동일
- content_json 유효성 검증 동일
- 23505 에러 핸들링 동일

**판정: PASS** — 기존 메서드 무수정, 추가 메서드만 도입

---

## Case C — Controller 권한 검증

### C1. KPA Controller (기존)

```typescript
const OPERATOR_ROLES: KpaRole[] = ['kpa:admin', 'kpa:operator', 'kpa:branch_admin', 'kpa:branch_operator'];
```

- 조직 해결: `KpaMember.organization_id`
- 변경 없음

### C2. Neture Controller (신규)

```typescript
const NETURE_ASSET_ROLES: NetureRole[] = ['neture:admin', 'neture:supplier'];
```

- 조직 해결: `neture_suppliers.userId → id` (supplierId)
- `hasAnyServiceRole(userRoles, NETURE_ASSET_ROLES)` 사용

### C3. 교차 접근 차단

| 사용자 역할 | KPA 자산 복사 | Neture 자산 복사 |
|-------------|-------------|---------------|
| kpa:operator | ALLOW | DENY |
| neture:supplier | DENY | ALLOW |
| platform:admin | DENY* | DENY* |

*platform:admin은 각 컨트롤러의 role 배열에 미포함 — 의도적

**판정: PASS** — 서비스 독립 namespace 완전 분리

---

## Case D — Snapshot 테이블 독립성

| 검증 항목 | 결과 |
|-----------|------|
| CREATE TABLE 변경 | 없음 |
| ALTER TABLE 추가 | 없음 |
| 새 Migration | 없음 |
| FK 추가 | 0건 |
| source_service 값 | 'kpa' / 'neture' (문자열만) |
| UNIQUE 제약 | 기존 (org_id, source_asset_id, asset_type) 유지 |

**판정: PASS** — 테이블 스키마 완전 동일

---

## Case E — 서비스 간 의존성

| 방향 | import 수 | 내용 |
|------|----------|------|
| KPA Controller → Neture | 0 | 없음 |
| Neture Controller → KPA | 0 | 없음 |
| KpaResolver → Neture | 0 | 없음 |
| NetureResolver → KPA | 0 | 없음 |
| SnapshotService → KPA | 0* | 기존 CmsContent import 유지 (공통 CMS Core) |
| SnapshotService → Neture | 0 | 없음 |

*CmsContent는 `@o4o-apps/cms-core`에서 import — platform core 레벨

**판정: PASS** — 서비스 간 교차 의존성 0

---

## Case F — Store Hub UI 연동

### F1. sourceService 컬럼 추가

| 이전 | 이후 |
|------|------|
| 유형 / 제목 / 복사일 | 유형 / 출처 / 제목 / 복사일 |

- `SERVICE_LABELS` 매핑: `kpa` → 'KPA', `neture` → 'Neture'
- 알 수 없는 서비스 → raw 값 표시

### F2. Pagination 호환

- 기존 pagination 로직 변경 없음
- sourceService 필터는 현재 미구현 (서버 단에서 organizationId 기반으로 자동 분리)

**판정: PASS** — 최소 UI 확장

---

## Case G — 권한 모델 일반화 범위 확인

### 발견 사항

`isServiceOperator(userRoles, serviceKey)` (role.utils.ts:132)는
`${serviceKey}:operator`와 `${serviceKey}:admin`을 검사한다.

| 서비스 | Operator 레벨 역할 | isServiceOperator 호환 |
|--------|-------------------|---------------------|
| KPA | admin, operator, branch_admin, branch_operator | 부분 (branch 미포함) |
| Neture | admin, supplier | 불일치 (supplier ≠ operator) |

### 결론

**서비스별 operator-level role이 다르므로**,
범용 `isServiceOperator()` 하나로는 모든 서비스를 커버할 수 없다.

**권장 패턴**: 각 Controller에서 서비스별 role 배열을 명시적으로 정의하고
`hasAnyServiceRole(userRoles, SERVICE_ROLES)` 사용.

이것이 Core 승격 시의 **권한 설정 주입 패턴**이 된다:

```typescript
createAssetSnapshotController(dataSource, requireAuth, {
  operatorRoles: ['kpa:admin', 'kpa:operator', ...],
  resolveOrganization: async (userId) => { ... },
  resolver: new KpaAssetResolver(dataSource),
});
```

**판정: PASS** — 일반화 범위 확인 완료, 패턴 도출

---

## Core 승격 판정

### 체크리스트

| 조건 | 충족 |
|------|------|
| 2개 서비스 적용 성공 | **YES** (KPA + Neture) |
| Resolver 인터페이스 안정 | **YES** (2개 구현체, 인터페이스 동일) |
| 권한 모델 공통화 가능 | **YES** (hasAnyServiceRole + 주입 패턴) |
| Snapshot 구조 수정 필요 없음 | **YES** (테이블/엔티티 변경 0) |
| 서비스 간 의존성 없음 | **YES** (교차 import 0) |

### 판정: A) Core 승격 가능

**승격 시 구조**:

```
@o4o/asset-copy-core
  ├── interfaces/
  │   └── asset-resolver.interface.ts
  ├── entities/
  │   └── asset-snapshot.entity.ts
  ├── services/
  │   └── asset-snapshot.service.ts
  └── index.ts
```

각 서비스는:
- Resolver 구현체 제공
- Controller에서 role 배열 + org resolver 주입
- 공통 SnapshotService 사용

---

## 산출물 요약

| 파일 | 역할 | 상태 |
|------|------|------|
| `interfaces/asset-resolver.interface.ts` | Resolver 인터페이스 | NEW |
| `resolvers/kpa-asset.resolver.ts` | KPA Resolver | NEW |
| `resolvers/neture-asset.resolver.ts` | Neture Resolver | NEW |
| `asset-snapshot.service.ts` | copyWithResolver/copyResolved 추가 | MODIFIED |
| `neture-asset-snapshot.controller.ts` | Neture 자산 Controller | NEW |
| `neture.routes.ts` | /assets 마운트 | MODIFIED |
| `StoreAssetsPage.tsx` | sourceService 컬럼 추가 | MODIFIED |

---

*Generated: 2026-02-16*
*Status: Validation Complete — Core Promotion Ready*
