# Cross-Service Data Migration Guide

> Phase 11 - Cross-Service Migration, Consolidation & Evolution Layer

이 문서는 O4O Platform의 Cross-Service Data Migration 시스템을 설명합니다.

---

## 1. 개요

Cross-Service Migration은 서로 다른 서비스(Template/ServiceGroup) 간에 데이터를 안전하게 이전하는 시스템입니다.

### 주요 기능

- **ETL Pipeline**: Extract-Transform-Load 기반 데이터 마이그레이션
- **Field Mapping**: 소스-타겟 필드 간 자동/수동 매핑
- **Preview Mode**: 실제 실행 전 미리보기
- **Rollback**: 마이그레이션 실패 시 롤백 지원
- **Validation**: 데이터 유효성 검증

---

## 2. Migration Schema

### 2.1 Schema 구조

```typescript
interface CrossServiceMigrationSchema {
  id: string;
  name: string;
  description?: string;

  // Source & Target
  source: {
    serviceType: string;     // 'yaksa' | 'cosmetics' | etc.
    tenantId: string;
    version?: string;
  };
  target: {
    serviceType: string;
    tenantId: string;
    version?: string;
  };

  // Entity Mappings
  entityMappings: EntityMapping[];

  // Global Settings
  settings: {
    preserveIds?: boolean;
    skipDuplicates?: boolean;
    validateBeforeMigrate?: boolean;
    batchSize?: number;
    parallelism?: number;
  };
}
```

### 2.2 Field Mapping

```typescript
interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: FieldTransform;
  required?: boolean;
  defaultValue?: any;
}

type FieldTransform =
  | 'direct'           // 직접 복사
  | 'uppercase'        // 대문자 변환
  | 'lowercase'        // 소문자 변환
  | 'json_stringify'   // JSON 문자열화
  | 'json_parse'       // JSON 파싱
  | 'date_format'      // 날짜 포맷
  | 'number_format'    // 숫자 포맷
  | 'custom';          // 커스텀 변환
```

---

## 3. Migration Job

### 3.1 Job 상태

| Status | 설명 |
|--------|------|
| `pending` | 대기 중 |
| `validating` | 스키마 검증 중 |
| `extracting` | 데이터 추출 중 |
| `transforming` | 데이터 변환 중 |
| `loading` | 데이터 로딩 중 |
| `completed` | 완료 |
| `failed` | 실패 |
| `rolled_back` | 롤백됨 |

### 3.2 Job 생성

```typescript
// Migration 시작
const job = await crossServiceMigrationService.startMigration({
  schemaId: 'yaksa-to-pharmacy-migration',
  options: {
    preview: false,        // 실제 실행
    validateFirst: true,   // 검증 후 실행
    createBackup: true     // 백업 생성
  }
});

console.log(job);
// {
//   id: 'migration-1234567890',
//   status: 'pending',
//   progress: 0,
//   ...
// }
```

### 3.3 Preview Mode

```typescript
// 미리보기 (실제 데이터 변경 없음)
const preview = await crossServiceMigrationService.startMigration({
  schemaId: 'yaksa-to-pharmacy-migration',
  options: { preview: true }
});

console.log(preview.previewResult);
// {
//   totalRecords: 15000,
//   byEntity: {
//     'Member': { count: 500, sampleData: [...] },
//     'Post': { count: 14500, sampleData: [...] }
//   },
//   estimatedDuration: 120,
//   warnings: ['일부 필드가 매핑되지 않았습니다.']
// }
```

---

## 4. Entity Mapping Examples

### 4.1 약사 → 약국 마이그레이션

```typescript
const yaksaToPharmacySchema: CrossServiceMigrationSchema = {
  id: 'yaksa-to-pharmacy',
  name: '약사 인트라넷 → 약국 서비스',

  source: {
    serviceType: 'yaksa',
    tenantId: 'tenant-yaksa-001'
  },
  target: {
    serviceType: 'pharmacy',
    tenantId: 'tenant-pharmacy-001'
  },

  entityMappings: [
    {
      sourceEntity: 'Member',
      targetEntity: 'PharmacyStaff',
      fieldMappings: [
        { sourceField: 'id', targetField: 'id', transform: 'direct' },
        { sourceField: 'name', targetField: 'fullName', transform: 'direct' },
        { sourceField: 'email', targetField: 'email', transform: 'lowercase' },
        { sourceField: 'licenseNumber', targetField: 'pharmacistLicense', transform: 'direct' },
        { sourceField: 'createdAt', targetField: 'registeredAt', transform: 'date_format' }
      ],
      filter: { role: 'pharmacist' }
    },
    {
      sourceEntity: 'ForumPost',
      targetEntity: 'KnowledgeBase',
      fieldMappings: [
        { sourceField: 'title', targetField: 'title', transform: 'direct' },
        { sourceField: 'content', targetField: 'content', transform: 'direct' },
        { sourceField: 'authorId', targetField: 'contributorId', transform: 'direct' },
        { sourceField: 'category', targetField: 'topic', transform: 'custom' }
      ]
    }
  ],

  settings: {
    batchSize: 100,
    validateBeforeMigrate: true
  }
};
```

### 4.2 화장품 → 의약외품 마이그레이션

```typescript
const cosmeticsToQuasiDrug: CrossServiceMigrationSchema = {
  id: 'cosmetics-to-quasi-drug',
  name: '화장품 → 의약외품 서비스',

  source: {
    serviceType: 'cosmetics',
    tenantId: 'tenant-cosmetics-001'
  },
  target: {
    serviceType: 'quasi-drug',
    tenantId: 'tenant-quasidrug-001'
  },

  entityMappings: [
    {
      sourceEntity: 'Product',
      targetEntity: 'QuasiDrugProduct',
      fieldMappings: [
        { sourceField: 'name', targetField: 'productName', transform: 'direct' },
        { sourceField: 'sku', targetField: 'sku', transform: 'direct' },
        { sourceField: 'price', targetField: 'retailPrice', transform: 'direct' },
        { sourceField: 'ingredients', targetField: 'activeIngredients', transform: 'json_parse' },
        // 새 필드 추가
        { targetField: 'regulatoryCategory', defaultValue: 'quasi_drug' },
        { targetField: 'requiresPrescription', defaultValue: false }
      ],
      filter: { category: 'skincare' }
    }
  ]
};
```

---

## 5. Validation

### 5.1 검증 항목

| 검증 | 설명 |
|------|------|
| Schema Validation | 스키마 구조 유효성 |
| Entity Exists | 소스/타겟 엔티티 존재 여부 |
| Field Type Match | 필드 타입 호환성 |
| Required Fields | 필수 필드 매핑 확인 |
| Transform Valid | 변환 함수 유효성 |

### 5.2 검증 실행

```typescript
const validation = await crossServiceMigrationService.validateSchema(schema);

console.log(validation);
// {
//   isValid: true,
//   errors: [],
//   warnings: [
//     'sourceField "legacyCode"가 매핑되지 않았습니다.'
//   ]
// }
```

---

## 6. Rollback

### 6.1 자동 롤백

마이그레이션 실패 시 자동으로 롤백됩니다:

```typescript
// 롤백 조건
if (job.status === 'failed' && job.rollbackAvailable) {
  // 자동 롤백 실행됨
}
```

### 6.2 수동 롤백

```typescript
// 완료된 마이그레이션 수동 롤백
await crossServiceMigrationService.rollback(jobId);
```

---

## 7. API Reference

```typescript
// 스키마 생성
POST /api/v1/migration/schema
Body: CrossServiceMigrationSchema

// 마이그레이션 시작
POST /api/v1/migration/start
Body: { schemaId, options }

// 마이그레이션 상태 조회
GET /api/v1/migration/:jobId

// 마이그레이션 이력
GET /api/v1/migration/history/:tenantId

// 롤백
POST /api/v1/migration/:jobId/rollback

// 스키마 검증
POST /api/v1/migration/validate
Body: CrossServiceMigrationSchema
```

---

## 8. Best Practices

### 권장 사항

1. **항상 Preview 먼저 실행**
   ```typescript
   const preview = await startMigration({ schemaId, options: { preview: true } });
   // 결과 검토 후 실제 실행
   ```

2. **백업 생성**
   ```typescript
   options: { createBackup: true }
   ```

3. **작은 배치로 시작**
   ```typescript
   settings: { batchSize: 100 }  // 처음에는 작게
   ```

4. **필드 매핑 명시적 지정**
   - 자동 매핑보다 명시적 매핑 권장
   - transform 함수 테스트 후 사용

5. **검증 단계 포함**
   ```typescript
   options: { validateFirst: true }
   ```

---

*최종 업데이트: 2025-12-11*
