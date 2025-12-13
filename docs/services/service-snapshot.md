# Service Snapshot & Restore Guide

> Phase 11 - Service Snapshot & Restore System

이 문서는 O4O Platform의 Service Snapshot 및 Restore 시스템을 설명합니다.

---

## 1. 개요

Service Snapshot은 서비스의 완전한 상태를 백업하고 복원하는 시스템입니다.

### 주요 기능

- **Full Snapshot**: 전체 데이터 + 설정 백업
- **Incremental Snapshot**: 변경분만 백업
- **Point-in-time Restore**: 특정 시점으로 복원
- **Partial Restore**: 선택적 데이터 복원
- **Snapshot Policy**: 자동화된 스냅샷 정책

---

## 2. Snapshot Types

### 2.1 스냅샷 유형

| Type | 설명 | 용도 |
|------|------|------|
| `full` | 전체 백업 | 완전 복구, 마이그레이션 |
| `incremental` | 이전 스냅샷 이후 변경분 | 일일 백업 |
| `differential` | 마지막 full 이후 변경분 | 주간 백업 |
| `config_only` | 설정만 백업 | 설정 변경 전 |

### 2.2 스냅샷 컴포넌트

| Component | 내용 |
|-----------|------|
| `database` | 모든 엔티티 데이터 |
| `config` | 테넌트 설정, 앱 설정 |
| `files` | 업로드된 파일, 미디어 |
| `metadata` | 테넌트 메타데이터 |

---

## 3. Snapshot Creation

### 3.1 스냅샷 생성 요청

```typescript
interface CreateSnapshotRequest {
  tenantId: string;
  name: string;
  description?: string;
  type: SnapshotType;

  // 포함할 컴포넌트
  includeComponents?: {
    database?: boolean;
    config?: boolean;
    files?: boolean;
    metadata?: boolean;
  };

  // 특정 엔티티만 포함
  includeEntities?: string[];
  excludeEntities?: string[];

  // 만료 설정
  retentionDays?: number;

  // 압축 및 암호화
  compress?: boolean;
  encrypt?: boolean;

  // 태그
  tags?: string[];
}
```

### 3.2 스냅샷 생성 예시

```typescript
// 전체 스냅샷 생성
const snapshot = await serviceSnapshotService.createSnapshot({
  tenantId: 'tenant-yaksa-001',
  name: 'yaksa-pre-upgrade-backup',
  description: '버전 2.0 업그레이드 전 백업',
  type: 'full',
  compress: true,
  encrypt: true,
  retentionDays: 90,
  tags: ['pre-upgrade', 'important']
});

console.log(snapshot);
// {
//   id: 'snap-1234567890',
//   status: 'creating',
//   progress: 0,
//   ...
// }
```

### 3.3 선택적 스냅샷

```typescript
// 특정 엔티티만 백업
const partialSnapshot = await serviceSnapshotService.createSnapshot({
  tenantId: 'tenant-yaksa-001',
  name: 'member-data-backup',
  type: 'full',
  includeEntities: ['Member', 'MemberProfile', 'MembershipTier'],
  compress: true
});
```

---

## 4. Snapshot Restore

### 4.1 복원 요청

```typescript
interface RestoreRequest {
  snapshotId: string;
  targetTenantId: string;

  // 복원 유형
  restoreType: 'full' | 'partial' | 'config_only';

  // 부분 복원 설정
  partialRestore?: {
    components?: string[];
    entities?: string[];
  };

  // 충돌 처리
  conflictStrategy: 'overwrite' | 'skip' | 'merge' | 'fail';

  // 검증
  validateBeforeRestore?: boolean;
  dryRun?: boolean;
}
```

### 4.2 전체 복원

```typescript
// 전체 복원
const restoreJob = await serviceSnapshotService.startRestore({
  snapshotId: 'snap-1234567890',
  targetTenantId: 'tenant-yaksa-001',
  restoreType: 'full',
  conflictStrategy: 'overwrite',
  validateBeforeRestore: true
});
```

### 4.3 부분 복원

```typescript
// 특정 엔티티만 복원
const partialRestore = await serviceSnapshotService.startRestore({
  snapshotId: 'snap-1234567890',
  targetTenantId: 'tenant-yaksa-001',
  restoreType: 'partial',
  partialRestore: {
    entities: ['Member', 'MemberProfile']
  },
  conflictStrategy: 'merge'
});
```

### 4.4 다른 테넌트로 복원

```typescript
// 새 테넌트로 복원 (클론)
const cloneJob = await serviceSnapshotService.startRestore({
  snapshotId: 'snap-1234567890',
  targetTenantId: 'tenant-yaksa-clone',  // 다른 테넌트
  restoreType: 'full',
  conflictStrategy: 'fail'  // 기존 데이터 있으면 실패
});
```

---

## 5. Restore Validation

### 5.1 Dry Run

```typescript
// 복원 미리보기
const preview = await serviceSnapshotService.startRestore({
  snapshotId: 'snap-1234567890',
  targetTenantId: 'tenant-yaksa-001',
  restoreType: 'full',
  conflictStrategy: 'overwrite',
  dryRun: true
});

console.log(preview.validationResult);
// {
//   isValid: true,
//   errors: [],
//   warnings: ['기존 데이터가 덮어씌워집니다.'],
//   checksumVerified: true
// }
```

### 5.2 검증 항목

| 검증 | 설명 |
|------|------|
| Snapshot Status | 스냅샷 완료 상태 확인 |
| Expiration | 만료 여부 확인 |
| Checksum | 데이터 무결성 검증 |
| Target Tenant | 타겟 테넌트 존재 확인 |
| Compatibility | 버전 호환성 검증 |

---

## 6. Snapshot Policy

### 6.1 정책 정의

```typescript
interface SnapshotPolicy {
  id: string;
  tenantId: string;
  name: string;
  enabled: boolean;

  // 스케줄
  schedule: {
    type: 'daily' | 'weekly' | 'monthly';
    time?: string;        // HH:mm
    dayOfWeek?: number;   // 0-6 (weekly)
    dayOfMonth?: number;  // 1-31 (monthly)
  };

  // 스냅샷 설정
  snapshotConfig: {
    type: SnapshotType;
    compress: boolean;
    encrypt: boolean;
  };

  // 보존 정책
  retention: {
    keepLast: number;       // 최근 N개 유지
    keepDaily?: number;     // 일별 N개 유지
    keepWeekly?: number;    // 주별 N개 유지
    keepMonthly?: number;   // 월별 N개 유지
    maxAge?: number;        // 최대 보존 일수
  };
}
```

### 6.2 정책 생성 예시

```typescript
// 일일 자동 백업 정책
const dailyPolicy = await serviceSnapshotService.createPolicy({
  tenantId: 'tenant-yaksa-001',
  name: 'Daily Backup',
  enabled: true,

  schedule: {
    type: 'daily',
    time: '02:00'  // 매일 오전 2시
  },

  snapshotConfig: {
    type: 'incremental',
    compress: true,
    encrypt: true
  },

  retention: {
    keepLast: 7,      // 최근 7개
    keepWeekly: 4,    // 주간 4개
    keepMonthly: 3,   // 월간 3개
    maxAge: 90        // 최대 90일
  }
});
```

### 6.3 주간 전체 백업 정책

```typescript
const weeklyPolicy = await serviceSnapshotService.createPolicy({
  tenantId: 'tenant-yaksa-001',
  name: 'Weekly Full Backup',
  enabled: true,

  schedule: {
    type: 'weekly',
    dayOfWeek: 0,    // 일요일
    time: '03:00'
  },

  snapshotConfig: {
    type: 'full',
    compress: true,
    encrypt: true
  },

  retention: {
    keepLast: 4,      // 최근 4개 (1달치)
    keepMonthly: 6    // 월간 6개 (6개월치)
  }
});
```

---

## 7. Snapshot Comparison

### 7.1 스냅샷 비교

```typescript
const comparison = await serviceSnapshotService.compareSnapshots(
  'snap-001',
  'snap-002'
);

console.log(comparison);
// {
//   summary: {
//     addedEntities: 0,
//     removedEntities: 0,
//     modifiedEntities: 3,
//     configChanges: 1
//   },
//   changes: [
//     { component: 'database', entity: 'Member', changeType: 'modified', recordCount: 50 },
//     { component: 'database', entity: 'Order', changeType: 'modified', recordCount: 230 },
//     { component: 'config', changeType: 'modified', details: 'theme preset changed' }
//   ],
//   sizeChange: {
//     snapshot1Size: 52428800,
//     snapshot2Size: 55574528,
//     difference: 3145728,
//     percentChange: 6.0
//   }
// }
```

---

## 8. Statistics

### 8.1 스냅샷 통계

```typescript
const stats = await serviceSnapshotService.getStats('tenant-yaksa-001');

console.log(stats);
// {
//   tenantId: 'tenant-yaksa-001',
//   totalSnapshots: 15,
//   totalSize: 524288000,  // ~500MB
//   byType: {
//     full: { count: 3, totalSize: 400000000 },
//     incremental: { count: 12, totalSize: 124288000 }
//   },
//   byStatus: {
//     completed: 14,
//     failed: 1
//   },
//   trend: [
//     { date: '2025-12-05', count: 2, size: 35000000 },
//     { date: '2025-12-06', count: 2, size: 33000000 },
//     ...
//   ],
//   lastSnapshot: '2025-12-10T02:05:30Z',
//   lastRestore: '2025-12-08T14:30:00Z'
// }
```

---

## 9. API Reference

```typescript
// 스냅샷 생성
POST /api/v1/snapshot/create
Body: CreateSnapshotRequest

// 스냅샷 조회
GET /api/v1/snapshot/:snapshotId

// 테넌트 스냅샷 목록
GET /api/v1/snapshot/tenant/:tenantId

// 스냅샷 삭제
DELETE /api/v1/snapshot/:snapshotId

// 복원 시작
POST /api/v1/snapshot/restore
Body: RestoreRequest

// 복원 상태 조회
GET /api/v1/snapshot/restore/:jobId

// 복원 롤백
POST /api/v1/snapshot/restore/:jobId/rollback

// 스냅샷 비교
POST /api/v1/snapshot/compare
Body: { snapshot1Id, snapshot2Id }

// 정책 생성
POST /api/v1/snapshot/policy
Body: SnapshotPolicy

// 정책 조회
GET /api/v1/snapshot/policy/:policyId

// 통계
GET /api/v1/snapshot/stats/:tenantId
```

---

## 10. Best Practices

### 스냅샷 생성

1. **정기적인 Full 스냅샷**
   - 주 1회 full 스냅샷 권장
   - incremental은 매일

2. **중요 작업 전 스냅샷**
   - 업그레이드 전
   - 대규모 데이터 변경 전
   - 마이그레이션 전

3. **태그 활용**
   ```typescript
   tags: ['pre-upgrade', 'v2.0', 'important']
   ```

4. **암호화 사용**
   ```typescript
   encrypt: true
   ```

### 복원

1. **항상 Dry Run 먼저**
   ```typescript
   { dryRun: true }
   ```

2. **충돌 전략 신중히 선택**
   - 기존 데이터 없으면: `fail`
   - 덮어쓰기 필요하면: `overwrite`
   - 신규 데이터만: `skip`

3. **부분 복원 활용**
   - 전체 복원보다 특정 엔티티만 복원이 빠름

### 정책 관리

1. **보존 정책 설정**
   ```typescript
   retention: {
     keepLast: 7,
     keepWeekly: 4,
     keepMonthly: 3
   }
   ```

2. **스토리지 모니터링**
   - 정기적으로 totalSize 확인
   - 만료 스냅샷 정리

---

*최종 업데이트: 2025-12-11*
