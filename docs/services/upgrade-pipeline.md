# Service Upgrade Pipeline

> Phase 10 - Service Evolution Layer

이 문서는 O4O Platform의 Service Upgrade Pipeline을 설명합니다.

---

## 1. 개요

Service Upgrade Pipeline은 운영 중인 서비스를 안전하게 업그레이드하는 시스템입니다.

### 주요 기능

- **Upgrade Diff Analyzer**: 현재 상태와 목표 버전 비교 분석
- **Execution Engine**: 단계별 업그레이드 실행
- **Rollback Support**: 실패 시 자동/수동 롤백
- **Progress Tracking**: 업그레이드 진행 상태 추적

---

## 2. Upgrade Diff Analysis

업그레이드 전 현재 상태와 목표 버전의 차이를 분석합니다.

### UpgradeDiff 구조

```typescript
interface UpgradeDiff {
  templateId: string;
  fromVersion: string;
  toVersion: string;

  // App 변경사항
  addApps: string[];           // 추가될 앱
  removeApps: string[];        // 제거될 앱
  updateApps: Array<{          // 업데이트될 앱
    appId: string;
    reason: string;
  }>;

  // Theme 변경사항
  themeChanges: Array<{
    type: 'preset' | 'config' | 'css';
    from?: string;
    to: string;
    description: string;
  }>;

  // Navigation 변경사항
  navigationUpdates: Array<{
    type: 'add' | 'remove' | 'update';
    key: string;
    description: string;
  }>;

  // InitPack 변경사항
  initPackChanges?: {
    from: string;
    to: string;
  };

  // Migration scripts
  migrations: MigrationScript[];

  // 경고 및 breaking changes
  warnings: string[];
  breakingChanges: string[];

  // 안전성 평가
  isSafeUpgrade: boolean;
  estimatedDuration: number;  // 예상 소요 시간 (초)
}
```

### Diff 분석 실행

```typescript
const diff = await serviceUpgradeService.analyzeDiff(
  'tenant-001',
  'yaksa-intranet-template',
  '1.0.0',  // from
  '2.0.0',  // to
  {
    installedApps: ['cms-core', 'forum-yaksa'],
    themePreset: 'yaksa-default',
    navigationKeys: ['forum', 'members']
  }
);

console.log(diff);
// {
//   addApps: ['reporting-yaksa', 'lms-yaksa'],
//   removeApps: [],
//   themeChanges: [{ type: 'preset', to: 'yaksa-v2-default', description: '...' }],
//   migrations: [...],
//   isSafeUpgrade: true,
//   estimatedDuration: 45
// }
```

---

## 3. Upgrade Execution

### 3.1 실행 옵션

```typescript
interface UpgradeOptions {
  skipApps?: boolean;        // 앱 설치 건너뛰기
  skipTheme?: boolean;       // 테마 업데이트 건너뛰기
  skipNavigation?: boolean;  // 네비게이션 업데이트 건너뛰기
  skipInitPack?: boolean;    // InitPack 적용 건너뛰기
  force?: boolean;           // 경고 무시하고 강제 실행
  dryRun?: boolean;          // 실행하지 않고 계획만 반환
  createBackup?: boolean;    // 백업 생성
}
```

### 3.2 업그레이드 실행

```typescript
// Dry run으로 계획 확인
const plan = await serviceUpgradeService.executeUpgrade(
  'tenant-001',
  'yaksa-intranet-template',
  '2.0.0',
  'admin@example.com',
  { dryRun: true }
);

// 실제 업그레이드 실행
const result = await serviceUpgradeService.executeUpgrade(
  'tenant-001',
  'yaksa-intranet-template',
  '2.0.0',
  'admin@example.com',
  { createBackup: true }
);
```

### 3.3 Upgrade Steps

업그레이드는 다음 단계로 실행됩니다:

| 순서 | Step Type | 설명 |
|------|-----------|------|
| 1 | `app_install` | 새로운 앱 설치 |
| 2 | `app_remove` | 불필요한 앱 제거 |
| 3 | `migration` | 마이그레이션 스크립트 실행 |
| 4 | `theme` | 테마 업데이트 |
| 5 | `navigation` | 네비게이션 업데이트 |
| 6 | `initpack` | InitPack 적용 |

---

## 4. Migration Script Format

### MigrationScript 구조

```typescript
interface MigrationScript {
  id: string;                // 고유 ID
  type: MigrationScriptType; // 마이그레이션 유형
  description: string;       // 설명
  fromVersion: string;       // 시작 버전
  toVersion: string;         // 목표 버전
  script: string;            // 스크립트 경로 또는 내용
  reversible: boolean;       // 롤백 가능 여부
  rollbackScript?: string;   // 롤백 스크립트
  order: number;             // 실행 순서
  estimatedDuration?: number; // 예상 소요 시간
  transactional?: boolean;   // 트랜잭션 사용 여부
  dependsOn?: string[];      // 의존 마이그레이션
}
```

### Migration Type

| Type | 설명 |
|------|------|
| `app-install` | 앱 설치 |
| `app-remove` | 앱 제거 |
| `app-upgrade` | 앱 버전 업그레이드 |
| `data-migrate` | 데이터 구조 변경 |
| `config-update` | 설정 업데이트 |
| `theme-update` | 테마 변경 |
| `nav-update` | 네비게이션 변경 |
| `custom` | 커스텀 스크립트 |

### 마이그레이션 스크립트 예시

```json
{
  "id": "migration-yaksa-1.0-to-2.0-add-lms",
  "type": "app-install",
  "description": "LMS 앱 추가",
  "fromVersion": "1.0.0",
  "toVersion": "2.0.0",
  "script": "migrations/yaksa/add-lms.ts",
  "reversible": true,
  "rollbackScript": "migrations/yaksa/remove-lms.ts",
  "order": 1,
  "estimatedDuration": 30
}
```

---

## 5. Rollback

### 5.1 자동 롤백

업그레이드 실패 시 자동으로 롤백이 시도됩니다:

```typescript
// 자동 롤백 조건
if (upgradeRecord.rollbackAvailable && upgradeFailed) {
  await serviceUpgradeService.rollback(upgradeId);
}
```

### 5.2 수동 롤백

```typescript
// 수동 롤백 실행
await serviceUpgradeService.rollback('upgrade-tenant-001-1234567890');
```

### 5.3 롤백 제한사항

다음 단계는 롤백이 불가능합니다:
- `app_remove`: 앱 제거 후 데이터 손실 가능
- `initpack`: 초기 데이터 변경
- `reversible: false`인 마이그레이션

---

## 6. Upgrade Status Tracking

### UpgradeRecord 구조

```typescript
interface UpgradeRecord {
  id: string;
  tenantId: string;
  templateId: string;
  fromVersion: string;
  toVersion: string;
  status: UpgradeStatus;
  diff: UpgradeDiff;
  steps: UpgradeStep[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  initiatedBy: string;
  rollbackAvailable: boolean;
}

type UpgradeStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'rolled_back'
  | 'cancelled';
```

### 상태 조회

```typescript
// 현재 진행 중인 업그레이드
const current = serviceUpgradeService.getCurrentUpgrade('tenant-001');

// 업그레이드 이력
const history = serviceUpgradeService.getUpgradeHistory('tenant-001');

// 특정 업그레이드 조회
const record = serviceUpgradeService.getUpgradeRecord('upgrade-xxx');
```

---

## 7. API Reference

### Service Upgrade API

```typescript
// Diff 분석
POST /api/v1/service/upgrade/analyze
Body: { tenantId, templateId, fromVersion, toVersion }

// 업그레이드 실행
POST /api/v1/service/upgrade/execute
Body: { tenantId, templateId, toVersion, options }

// 롤백
POST /api/v1/service/upgrade/:upgradeId/rollback

// 업그레이드 상태 조회
GET /api/v1/service/upgrade/:upgradeId

// 업그레이드 이력 조회
GET /api/v1/service/upgrade/history/:tenantId

// 업그레이드 취소
POST /api/v1/service/upgrade/:upgradeId/cancel
```

---

## 8. Best Practices

### 업그레이드 전 체크리스트

1. Dry run으로 변경사항 확인
2. Breaking changes 검토
3. 백업 생성 확인
4. 업그레이드 예상 시간 확인
5. 롤백 가능 여부 확인

### 안전한 업그레이드 수행

```typescript
// 1. Dry run 실행
const plan = await executeUpgrade(tenantId, templateId, toVersion, user, {
  dryRun: true
});

// 2. Breaking changes 확인
if (plan.diff.breakingChanges.length > 0) {
  console.warn('Breaking changes detected:', plan.diff.breakingChanges);
  // 관리자 승인 필요
}

// 3. 백업과 함께 실행
const result = await executeUpgrade(tenantId, templateId, toVersion, user, {
  createBackup: true
});

// 4. 결과 확인
if (result.status === 'completed') {
  console.log('Upgrade successful!');
} else if (result.status === 'rolled_back') {
  console.warn('Upgrade failed, rolled back');
}
```

---

*최종 업데이트: 2025-12-11*
