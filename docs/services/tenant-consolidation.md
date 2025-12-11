# Tenant Consolidation Guide

> Phase 11 - Tenant Merge & Split Pipeline

이 문서는 O4O Platform의 Tenant 통합(Merge) 및 분리(Split) 시스템을 설명합니다.

---

## 1. 개요

Tenant Consolidation은 다음 두 가지 작업을 지원합니다:

- **Merge**: 여러 Tenant를 하나로 통합 (A + B → C)
- **Split**: 하나의 Tenant를 여러 개로 분리 (A → A1 + A2)

### 사용 사례

| 작업 | 사례 |
|------|------|
| Merge | 인수합병, 지점 통합, 서비스 통합 |
| Split | 사업부 분리, 지역별 분리, 서비스 분리 |

---

## 2. Tenant Merge

### 2.1 Merge 요청

```typescript
interface TenantMergeRequest {
  sourceTenantIds: string[];    // 병합할 테넌트들
  targetTenantId: string;       // 결과 테넌트

  // 중복 처리 전략
  duplicateStrategy: DuplicateStrategy;

  // 엔티티별 설정
  entityConfig?: Record<string, EntityMergeConfig>;

  // 옵션
  preserveSourceTenants?: boolean;  // 원본 유지 여부
  dryRun?: boolean;
}
```

### 2.2 중복 처리 전략

| Strategy | 설명 |
|----------|------|
| `prefer_source` | 소스 데이터 우선 |
| `prefer_target` | 타겟 데이터 우선 |
| `newest_wins` | 최신 데이터 우선 |
| `manual` | 수동 결정 (충돌 기록) |
| `merge_fields` | 필드 단위 병합 |

### 2.3 Merge 예시

```typescript
// 두 약국 서비스 통합
const mergeJob = await tenantConsolidationService.startMerge({
  sourceTenantIds: ['pharmacy-branch-a', 'pharmacy-branch-b'],
  targetTenantId: 'pharmacy-merged',

  duplicateStrategy: 'newest_wins',

  entityConfig: {
    'Member': {
      mergeKey: 'email',          // 이메일 기준 중복 판단
      strategy: 'merge_fields',   // 필드 단위 병합
      fieldPreferences: {
        'name': 'prefer_source',
        'phone': 'newest_wins',
        'address': 'prefer_target'
      }
    },
    'Order': {
      mergeKey: 'orderNumber',
      strategy: 'prefer_source'   // 주문은 소스 우선
    }
  },

  preserveSourceTenants: false  // 원본 삭제
});
```

### 2.4 Merge 단계

1. **분석 (Analyzing)**
   - 소스 테넌트 데이터 분석
   - 중복 데이터 탐지
   - 충돌 예측

2. **병합 (Merging)**
   - 엔티티별 순차 병합
   - 중복 처리
   - 관계 데이터 업데이트

3. **검증 (Validating)**
   - 데이터 무결성 검증
   - 참조 무결성 확인

4. **정리 (Cleanup)**
   - 원본 테넌트 처리
   - 임시 데이터 정리

---

## 3. Tenant Split

### 3.1 Split 요청

```typescript
interface TenantSplitRequest {
  sourceTenantId: string;     // 분리할 테넌트
  targetTenants: Array<{
    tenantId: string;
    name: string;
    criteria: SplitCriteria;  // 분리 기준
  }>;

  // 공통 데이터 처리
  sharedDataStrategy: 'copy_to_all' | 'copy_to_first' | 'keep_in_source';

  // 옵션
  preserveSourceTenant?: boolean;
  dryRun?: boolean;
}
```

### 3.2 분리 기준 (SplitCriteria)

```typescript
interface SplitCriteria {
  type: 'field_value' | 'date_range' | 'custom';

  // field_value 타입
  field?: string;
  values?: any[];

  // date_range 타입
  dateField?: string;
  startDate?: Date;
  endDate?: Date;

  // custom 타입
  filterExpression?: string;
}
```

### 3.3 Split 예시

```typescript
// 지역별 테넌트 분리
const splitJob = await tenantConsolidationService.startSplit({
  sourceTenantId: 'pharmacy-national',

  targetTenants: [
    {
      tenantId: 'pharmacy-seoul',
      name: '서울 약국',
      criteria: {
        type: 'field_value',
        field: 'region',
        values: ['서울', '경기']
      }
    },
    {
      tenantId: 'pharmacy-busan',
      name: '부산 약국',
      criteria: {
        type: 'field_value',
        field: 'region',
        values: ['부산', '경남']
      }
    }
  ],

  sharedDataStrategy: 'copy_to_all',  // 공통 데이터는 모두에 복사
  preserveSourceTenant: true          // 원본 유지
});
```

### 3.4 Split 단계

1. **분석 (Analyzing)**
   - 분리 기준별 데이터 분류
   - 데이터 분포 분석

2. **분리 (Splitting)**
   - 타겟 테넌트 생성
   - 데이터 분배
   - 관계 데이터 처리

3. **검증 (Validating)**
   - 데이터 누락 검증
   - 참조 무결성 확인

4. **정리 (Cleanup)**
   - 원본 처리
   - 임시 데이터 정리

---

## 4. Job 상태 추적

### 4.1 상태

| Status | 설명 |
|--------|------|
| `pending` | 대기 중 |
| `analyzing` | 분석 중 |
| `merging` / `splitting` | 실행 중 |
| `validating` | 검증 중 |
| `completed` | 완료 |
| `failed` | 실패 |
| `rolled_back` | 롤백됨 |

### 4.2 진행 상태 조회

```typescript
const job = tenantConsolidationService.getJob(jobId);

console.log(job);
// {
//   id: 'merge-1234567890',
//   type: 'merge',
//   status: 'merging',
//   progress: 65,
//   currentStep: 'processing_entity_Order',
//   steps: [
//     { name: 'analyze', status: 'completed' },
//     { name: 'process_Member', status: 'completed', recordsProcessed: 500 },
//     { name: 'process_Order', status: 'in_progress', recordsProcessed: 3200, totalRecords: 5000 },
//     { name: 'validate', status: 'pending' }
//   ],
//   stats: {
//     totalRecords: 15000,
//     processedRecords: 8700,
//     duplicatesFound: 120,
//     conflictsResolved: 118
//   }
// }
```

---

## 5. Health Check

### 5.1 작업 후 상태 검증

```typescript
const healthResult = await tenantConsolidationService.runHealthCheck(jobId);

console.log(healthResult);
// {
//   isHealthy: true,
//   checks: [
//     { name: 'record_count', passed: true, details: '15000 records verified' },
//     { name: 'referential_integrity', passed: true },
//     { name: 'data_consistency', passed: true }
//   ],
//   warnings: [],
//   errors: []
// }
```

### 5.2 검증 항목

| 검증 | 설명 |
|------|------|
| Record Count | 예상 레코드 수 일치 |
| Referential Integrity | 외래 키 참조 무결성 |
| Data Consistency | 데이터 일관성 |
| No Orphans | 고아 레코드 없음 |

---

## 6. Rollback

### 6.1 자동 롤백

실패 시 자동으로 롤백됩니다:

```typescript
if (job.status === 'failed' && job.rollbackAvailable) {
  // 자동 롤백 실행
}
```

### 6.2 수동 롤백

```typescript
// 완료된 작업 롤백
const rollbackResult = await tenantConsolidationService.rollback(jobId);
```

### 6.3 롤백 제한

- Split 후 타겟 테넌트에 새 데이터가 추가된 경우 롤백 불가
- 원본 테넌트가 삭제된 경우 롤백 불가
- 30일 이상 경과한 작업은 롤백 불가

---

## 7. API Reference

```typescript
// Merge 시작
POST /api/v1/tenant/merge
Body: TenantMergeRequest

// Split 시작
POST /api/v1/tenant/split
Body: TenantSplitRequest

// 작업 상태 조회
GET /api/v1/tenant/consolidation/:jobId

// 작업 이력
GET /api/v1/tenant/consolidation/history/:tenantId

// Health Check
POST /api/v1/tenant/consolidation/:jobId/health-check

// 롤백
POST /api/v1/tenant/consolidation/:jobId/rollback
```

---

## 8. Best Practices

### Merge 시 권장사항

1. **먼저 Dry Run 실행**
   ```typescript
   { dryRun: true }
   ```

2. **중복 전략 신중히 선택**
   - 데이터 특성에 맞는 전략 선택
   - `manual` 전략으로 먼저 충돌 파악

3. **엔티티별 설정 활용**
   - 중요 엔티티는 개별 설정
   - mergeKey 명확히 지정

4. **원본 보존**
   ```typescript
   { preserveSourceTenants: true }  // 검증 후 삭제
   ```

### Split 시 권장사항

1. **분리 기준 명확히**
   - 겹치지 않는 기준 사용
   - 모든 데이터가 분류되는지 확인

2. **공유 데이터 전략**
   - 마스터 데이터는 `copy_to_all`
   - 트랜잭션 데이터는 기준에 따라 분리

3. **테스트 환경에서 먼저 실행**

---

*최종 업데이트: 2025-12-11*
