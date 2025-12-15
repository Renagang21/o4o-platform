> ⚠️ **ARCHIVED DOCUMENT** - Phase 1 설계 문서
>
> 본 문서는 CLAUDE.md v2.0으로 대체되었습니다.
> 현재 AppType 체계는 CLAUDE.md §2.2 및 `docs/app-guidelines/manifest-specification.md`를 참조하세요.
>
> **아카이브 일자**: 2025-12-15

---

# App Registry 데이터베이스 스키마 설계

**작성일**: 2025-11-28
**Phase**: AM2 – App Market V1 설계
**상태**: ⏸️ ARCHIVED (CLAUDE.md v2.0으로 대체)
**데이터베이스**: PostgreSQL 14+

---

## 1. 개요

### 1.1 목적

`app_registry` 테이블은 O4O 플랫폼에 **설치된 앱의 상태 정보**를 저장하는 테이블이다.

**주요 역할**:
- 설치된 앱 목록 관리
- 앱 활성화/비활성화 상태 관리
- 앱별 설정값 저장
- 앱 설치 이력 추적

### 1.2 설계 원칙

1. **단순함**: 필수 컬럼만 포함
2. **확장성**: JSONB 활용으로 유연한 설정 저장
3. **성능**: 인덱스 최적화
4. **이력 관리**: 설치/활성화/비활성화 타임스탬프 기록

---

## 2. 테이블 스키마

### 2.1 DDL (SQL)

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE app_registry (
  -- 기본 키
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 앱 식별 정보
  app_name VARCHAR(100) UNIQUE NOT NULL,  -- manifest.name과 동일
  display_name VARCHAR(200) NOT NULL,     -- manifest.displayName과 동일
  version VARCHAR(20) NOT NULL,           -- 설치된 버전 (Semantic Versioning)

  -- 상태 정보
  is_active BOOLEAN DEFAULT true NOT NULL,
  is_core BOOLEAN DEFAULT false NOT NULL,

  -- 설정 및 메타데이터
  config JSONB,                           -- 앱별 설정값
  metadata JSONB,                         -- 추가 메타데이터

  -- 타임스탬프
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  installed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  activated_at TIMESTAMP WITH TIME ZONE,
  deactivated_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- 제약 조건
  CONSTRAINT app_name_lowercase CHECK (app_name = LOWER(app_name))
);

-- 인덱스
CREATE INDEX idx_app_registry_app_name ON app_registry(app_name);
CREATE INDEX idx_app_registry_is_active ON app_registry(is_active);
CREATE INDEX idx_app_registry_is_core ON app_registry(is_core);
CREATE INDEX idx_app_registry_installed_at ON app_registry(installed_at DESC);

-- 코멘트
COMMENT ON TABLE app_registry IS '설치된 앱 레지스트리';
COMMENT ON COLUMN app_registry.app_name IS '앱 고유 ID (manifest.name)';
COMMENT ON COLUMN app_registry.is_active IS '활성화 여부 (true: 활성, false: 비활성)';
COMMENT ON COLUMN app_registry.is_core IS '코어 앱 여부 (true: 삭제 불가)';
COMMENT ON COLUMN app_registry.config IS '앱별 설정값 (JSON)';
COMMENT ON COLUMN app_registry.metadata IS '추가 메타데이터 (JSON)';
```

---

### 2.2 컬럼 상세 설명

| 컬럼명 | 타입 | 제약 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `id` | UUID | PK | `uuid_generate_v4()` | 레코드 고유 ID |
| `app_name` | VARCHAR(100) | UNIQUE, NOT NULL | - | 앱 고유 ID (예: `forum`, `wishlist`) |
| `display_name` | VARCHAR(200) | NOT NULL | - | 사용자에게 표시될 앱 이름 (예: `Forum`, `Wishlist`) |
| `version` | VARCHAR(20) | NOT NULL | - | 설치된 앱 버전 (Semantic Versioning, 예: `1.0.0`) |
| `is_active` | BOOLEAN | NOT NULL | `true` | 앱 활성화 여부 (true: 활성, false: 비활성) |
| `is_core` | BOOLEAN | NOT NULL | `false` | 코어 앱 여부 (true: 삭제 불가) |
| `config` | JSONB | - | `NULL` | 앱별 설정값 (JSON 형태) |
| `metadata` | JSONB | - | `NULL` | 추가 메타데이터 (확장용) |
| `installed_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | 앱 설치 시각 |
| `installed_by` | UUID | FK (users.id) | `NULL` | 앱을 설치한 사용자 (NULL: 시스템 설치) |
| `activated_at` | TIMESTAMPTZ | - | `NULL` | 마지막 활성화 시각 |
| `deactivated_at` | TIMESTAMPTZ | - | `NULL` | 마지막 비활성화 시각 |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | 마지막 업데이트 시각 |

---

### 2.3 컬럼별 상세 설명

#### 2.3.1 `app_name` (앱 고유 ID)

- **타입**: `VARCHAR(100)`
- **제약**: `UNIQUE`, `NOT NULL`, `CHECK (app_name = LOWER(app_name))`
- **설명**: 앱의 고유 ID. `manifest.json`의 `name` 필드와 동일.
- **예시**: `"forum"`, `"wishlist"`, `"partner-affiliate"`

**제약 조건**:
- 소문자만 허용 (`CHECK` 제약으로 강제)
- 중복 불가 (`UNIQUE` 제약)
- 변경 불가 (업데이트 금지 정책)

---

#### 2.3.2 `display_name` (표시 이름)

- **타입**: `VARCHAR(200)`
- **제약**: `NOT NULL`
- **설명**: 사용자에게 표시될 앱 이름. Admin UI에서 사용.
- **예시**: `"Forum"`, `"Wishlist"`, `"Partner & Affiliate"`

---

#### 2.3.3 `version` (설치된 버전)

- **타입**: `VARCHAR(20)`
- **제약**: `NOT NULL`
- **설명**: 현재 설치된 앱의 버전. Semantic Versioning 형식.
- **예시**: `"1.0.0"`, `"2.1.3"`

**향후 확장**:
- 앱 업그레이드 시 이 필드 업데이트
- 버전 히스토리 관리 (별도 테이블 `app_version_history`)

---

#### 2.3.4 `is_active` (활성화 여부)

- **타입**: `BOOLEAN`
- **제약**: `NOT NULL`
- **기본값**: `true`
- **설명**: 앱 활성화 여부.
  - `true`: 활성 (라우트 접근 가능, 메뉴 표시)
  - `false`: 비활성 (라우트 404, 메뉴 숨김)

**용도**:
- Feature Flag 동기화 (`ENABLE_FORUM = is_active`)
- API Guard 조건
- 메뉴/링크 표시 여부 결정

---

#### 2.3.5 `is_core` (코어 앱 여부)

- **타입**: `BOOLEAN`
- **제약**: `NOT NULL`
- **기본값**: `false`
- **설명**: 코어 앱 여부.
  - `true`: 코어 앱 (삭제 불가, 예: Seller, Supplier, Settlement)
  - `false`: 선택 앱 (삭제 가능, 예: Forum, Wishlist)

**용도**:
- 앱 삭제 시 코어 앱 체크
- Admin UI에서 "삭제" 버튼 비활성화

---

#### 2.3.6 `config` (앱별 설정값)

- **타입**: `JSONB`
- **설명**: 앱별 설정값. `manifest.json`의 `config` 기본값을 오버라이드.

**예시** (Forum):
```json
{
  "postsPerPage": 20,
  "maxPostsPerDay": 100,
  "requireLoginToRead": false,
  "requireApproval": false,
  "allowedFileTypes": ["image/jpeg", "image/png"],
  "maxFileSize": 5242880,
  "editTimeLimit": 86400
}
```

**용도**:
- Admin UI에서 설정 편집
- 앱 로직에서 설정값 읽기 (`AppManagerService.getAppConfig()`)

---

#### 2.3.7 `metadata` (추가 메타데이터)

- **타입**: `JSONB`
- **설명**: 추가 메타데이터. 확장용 필드.

**예시**:
```json
{
  "tags": ["community", "discussion"],
  "installNotes": "Installed for community engagement",
  "customData": { ... }
}
```

---

#### 2.3.8 `installed_at` (설치 시각)

- **타입**: `TIMESTAMP WITH TIME ZONE`
- **제약**: `NOT NULL`
- **기본값**: `NOW()`
- **설명**: 앱이 설치된 시각.

---

#### 2.3.9 `installed_by` (설치한 사용자)

- **타입**: `UUID`
- **제약**: `FOREIGN KEY (users.id) ON DELETE SET NULL`
- **설명**: 앱을 설치한 사용자 ID. NULL이면 시스템이 설치.

---

#### 2.3.10 `activated_at` (활성화 시각)

- **타입**: `TIMESTAMP WITH TIME ZONE`
- **설명**: 마지막으로 앱이 활성화된 시각.

**용도**:
- 활성화 이력 추적
- Admin UI에서 표시

---

#### 2.3.11 `deactivated_at` (비활성화 시각)

- **타입**: `TIMESTAMP WITH TIME ZONE`
- **설명**: 마지막으로 앱이 비활성화된 시각.

**용도**:
- 비활성화 이력 추적
- Admin UI에서 표시

---

#### 2.3.12 `updated_at` (마지막 업데이트 시각)

- **타입**: `TIMESTAMP WITH TIME ZONE`
- **제약**: `NOT NULL`
- **기본값**: `NOW()`
- **설명**: 레코드가 마지막으로 업데이트된 시각.

---

## 3. TypeORM Entity

### 3.1 Entity 파일 위치

- `apps/api-server/src/entities/AppRegistry.ts`

### 3.2 Entity 정의

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { User } from './User.js';

@Entity('app_registry')
@Index(['appName'])
@Index(['isActive'])
@Index(['isCore'])
export class AppRegistry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  appName!: string;

  @Column({ type: 'varchar', length: 200 })
  displayName!: string;

  @Column({ type: 'varchar', length: 20 })
  version!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false })
  isCore!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  config?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  installedAt!: Date;

  @Column({ type: 'uuid', nullable: true })
  installedBy?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'installedBy' })
  installer?: User;

  @Column({ type: 'timestamp with time zone', nullable: true })
  activatedAt?: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  deactivatedAt?: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  // Methods
  activate(): void {
    this.isActive = true;
    this.activatedAt = new Date();
  }

  deactivate(): void {
    this.isActive = false;
    this.deactivatedAt = new Date();
  }

  updateConfig(newConfig: Record<string, any>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfigValue<T = any>(key: string, defaultValue?: T): T | undefined {
    return this.config?.[key] ?? defaultValue;
  }

  canBeUninstalled(): boolean {
    return !this.isCore;
  }
}
```

---

## 4. Migration

### 4.1 Migration 파일 위치

- `apps/api-server/src/migrations/[timestamp]-create-app-registry.ts`

### 4.2 Migration 코드

```typescript
import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateAppRegistry1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 테이블 생성
    await queryRunner.createTable(
      new Table({
        name: 'app_registry',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()'
          },
          {
            name: 'app_name',
            type: 'varchar',
            length: '100',
            isUnique: true,
            isNullable: false
          },
          {
            name: 'display_name',
            type: 'varchar',
            length: '200',
            isNullable: false
          },
          {
            name: 'version',
            type: 'varchar',
            length: '20',
            isNullable: false
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false
          },
          {
            name: 'is_core',
            type: 'boolean',
            default: false,
            isNullable: false
          },
          {
            name: 'config',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'installed_at',
            type: 'timestamp with time zone',
            default: 'NOW()',
            isNullable: false
          },
          {
            name: 'installed_by',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'activated_at',
            type: 'timestamp with time zone',
            isNullable: true
          },
          {
            name: 'deactivated_at',
            type: 'timestamp with time zone',
            isNullable: true
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'NOW()',
            isNullable: false
          }
        ]
      }),
      true
    );

    // 인덱스 생성
    await queryRunner.createIndex(
      'app_registry',
      new TableIndex({
        name: 'idx_app_registry_app_name',
        columnNames: ['app_name']
      })
    );

    await queryRunner.createIndex(
      'app_registry',
      new TableIndex({
        name: 'idx_app_registry_is_active',
        columnNames: ['is_active']
      })
    );

    await queryRunner.createIndex(
      'app_registry',
      new TableIndex({
        name: 'idx_app_registry_is_core',
        columnNames: ['is_core']
      })
    );

    await queryRunner.createIndex(
      'app_registry',
      new TableIndex({
        name: 'idx_app_registry_installed_at',
        columnNames: ['installed_at']
      })
    );

    // 외래 키 생성
    await queryRunner.createForeignKey(
      'app_registry',
      new TableForeignKey({
        columnNames: ['installed_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL'
      })
    );

    // CHECK 제약 조건 추가 (소문자 강제)
    await queryRunner.query(`
      ALTER TABLE app_registry
      ADD CONSTRAINT app_name_lowercase CHECK (app_name = LOWER(app_name))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('app_registry');
  }
}
```

---

## 5. 인덱스 전략

### 5.1 인덱스 목록

| 인덱스명 | 컬럼 | 타입 | 용도 |
|---------|------|------|------|
| `idx_app_registry_app_name` | `app_name` | B-tree | 앱 조회 (WHERE app_name = ?) |
| `idx_app_registry_is_active` | `is_active` | B-tree | 활성 앱 필터링 (WHERE is_active = true) |
| `idx_app_registry_is_core` | `is_core` | B-tree | 코어 앱 필터링 |
| `idx_app_registry_installed_at` | `installed_at DESC` | B-tree | 최근 설치 앱 정렬 (ORDER BY installed_at DESC) |

### 5.2 인덱스 사용 쿼리 예시

```sql
-- 활성 앱 목록 조회 (idx_app_registry_is_active 사용)
SELECT * FROM app_registry WHERE is_active = true;

-- 특정 앱 조회 (idx_app_registry_app_name 사용)
SELECT * FROM app_registry WHERE app_name = 'forum';

-- 최근 설치 앱 10개 (idx_app_registry_installed_at 사용)
SELECT * FROM app_registry ORDER BY installed_at DESC LIMIT 10;

-- 삭제 가능한 앱 목록 (idx_app_registry_is_core 사용)
SELECT * FROM app_registry WHERE is_core = false;
```

---

## 6. 데이터 예시

### 6.1 초기 데이터 (Seed)

```sql
-- 코어 앱 (삭제 불가)
INSERT INTO app_registry (app_name, display_name, version, is_active, is_core) VALUES
  ('seller', 'Seller', '1.0.0', true, true),
  ('supplier', 'Supplier', '1.0.0', true, true),
  ('settlement', 'Settlement', '1.0.0', true, true),
  ('notification', 'Notification', '1.0.0', true, true);

-- 선택 앱 (삭제 가능)
INSERT INTO app_registry (app_name, display_name, version, is_active, is_core, config) VALUES
  ('forum', 'Forum', '1.0.0', false, false, '{"postsPerPage": 20, "maxPostsPerDay": 100}'),
  ('wishlist', 'Wishlist', '1.0.0', true, false, '{"maxItemsPerUser": 100}'),
  ('partner', 'Partner & Affiliate', '1.0.0', true, false, NULL);
```

### 6.2 레코드 예시

#### Forum 앱 (비활성)

```
id: 123e4567-e89b-12d3-a456-426614174000
app_name: forum
display_name: Forum
version: 1.0.0
is_active: false
is_core: false
config: {
  "postsPerPage": 20,
  "maxPostsPerDay": 100,
  "requireLoginToRead": false,
  "requireApproval": false,
  "editTimeLimit": 86400
}
metadata: {
  "tags": ["community", "discussion"],
  "installNotes": "Installed for community engagement"
}
installed_at: 2025-11-28 10:00:00+00
installed_by: admin-user-id
activated_at: NULL
deactivated_at: NULL
updated_at: 2025-11-28 10:00:00+00
```

#### Wishlist 앱 (활성)

```
id: 234e4567-e89b-12d3-a456-426614174001
app_name: wishlist
display_name: Wishlist
version: 1.0.0
is_active: true
is_core: false
config: {
  "maxItemsPerUser": 100
}
metadata: NULL
installed_at: 2025-11-28 09:00:00+00
installed_by: admin-user-id
activated_at: 2025-11-28 09:00:00+00
deactivated_at: NULL
updated_at: 2025-11-28 09:00:00+00
```

---

## 7. 쿼리 패턴

### 7.1 조회 쿼리

#### 모든 설치된 앱 조회

```sql
SELECT * FROM app_registry ORDER BY installed_at DESC;
```

#### 활성 앱만 조회

```sql
SELECT * FROM app_registry WHERE is_active = true;
```

#### 특정 앱 조회

```sql
SELECT * FROM app_registry WHERE app_name = 'forum';
```

#### 삭제 가능한 앱 조회

```sql
SELECT * FROM app_registry WHERE is_core = false;
```

---

### 7.2 업데이트 쿼리

#### 앱 활성화

```sql
UPDATE app_registry
SET is_active = true,
    activated_at = NOW(),
    updated_at = NOW()
WHERE app_name = 'forum';
```

#### 앱 비활성화

```sql
UPDATE app_registry
SET is_active = false,
    deactivated_at = NOW(),
    updated_at = NOW()
WHERE app_name = 'forum';
```

#### 앱 설정 업데이트

```sql
UPDATE app_registry
SET config = jsonb_set(config, '{postsPerPage}', '30', true),
    updated_at = NOW()
WHERE app_name = 'forum';
```

---

### 7.3 삭제 쿼리

#### 앱 삭제 (코어 앱 체크)

```sql
DELETE FROM app_registry
WHERE app_name = 'forum' AND is_core = false;
```

---

## 8. 성능 고려사항

### 8.1 JSONB 인덱스

향후 `config` 필드의 특정 키로 검색이 필요할 경우 GIN 인덱스 추가:

```sql
CREATE INDEX idx_app_registry_config_gin ON app_registry USING GIN (config);
```

### 8.2 파티셔닝

앱 개수가 많아질 경우 (100개 이상) `is_active` 기준 파티셔닝 고려:

```sql
-- 활성 앱 파티션
CREATE TABLE app_registry_active PARTITION OF app_registry FOR VALUES IN (true);

-- 비활성 앱 파티션
CREATE TABLE app_registry_inactive PARTITION OF app_registry FOR VALUES IN (false);
```

---

## 9. 보안 고려사항

### 9.1 접근 권한

- `app_registry` 테이블은 **Admin만 수정 가능**
- API 엔드포인트에 `apps:manage` 권한 체크 필요

### 9.2 SQL Injection 방지

- TypeORM 사용 시 Parameterized Query 자동 적용
- 직접 쿼리 작성 시 Prepared Statement 사용

---

## 10. 향후 확장

### 10.1 버전 히스토리 테이블

```sql
CREATE TABLE app_version_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_name VARCHAR(100) NOT NULL REFERENCES app_registry(app_name) ON DELETE CASCADE,
  from_version VARCHAR(20),
  to_version VARCHAR(20) NOT NULL,
  upgraded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  upgraded_by UUID REFERENCES users(id) ON DELETE SET NULL
);
```

### 10.2 멀티테넌트 지원

```sql
ALTER TABLE app_registry ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_app_registry_tenant_id ON app_registry(tenant_id);
```

---

## 11. 참고 자료

- **App Manifest Schema**: `docs/dev/design/app-manifest-schema-v1.md`
- **AM2 설계 요청**: `docs/dev/AM2-AppMarket-Design-Request.md`
- **PostgreSQL JSONB**: https://www.postgresql.org/docs/current/datatype-json.html

---

**End of Document**
