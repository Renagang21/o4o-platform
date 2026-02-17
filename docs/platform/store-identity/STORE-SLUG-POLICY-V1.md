# STORE-SLUG-POLICY-V1

> **O4O 플랫폼 매장 Slug 정책**
> **상태**: Approved
> **작성일**: 2026-02-17
> **적용 범위**: 전 서비스 (GlycoPharm, K-Cosmetics, KPA 등)

---

## 1. 설계 철학

slug는:
- 단순 URL 문자열이 아니라 **매장의 플랫폼 자산 식별자**
- 향후 통합 storefront, 채널 확장, 도메인 연결까지 확장 가능한 핵심 키
- **Extension이 아니라 Core 책임**

---

## 2. 핵심 설계 결정

### 2-1. slug Uniqueness Scope

**결정: 플랫폼 전체 유니크**

- 모든 서비스(GlycoPharm, Cosmetics, KPA 등)에서 slug 중복 불가
- 테이블별 unique가 아니라 "플랫폼 레벨"에서 unique

**이유:**
- 향후 통합 URL 전략 가능
- 브랜드 충돌 방지
- 매장이 플랫폼 자산으로 보호됨

### 2-2. slug 소유 단위

**결정: 매장 단위 1개 slug + 채널은 path 분기**

```
/store/{slug}                → B2C 웹
/store/{slug}/kiosk          → 키오스크
/store/{slug}/tablet         → 태블릿
/store/{slug}/blog           → 블로그
```

**이유:**
- 채널이 늘어나도 slug 추가 생성 필요 없음
- 브랜드 일관성 유지
- SEO 안정성

### 2-3. slug 변경 정책

**결정: 1회 변경 허용 + 자동 redirect**

- previous_slug_history 테이블
- 301 redirect 처리
- 변경 로그 기록

**이유:**
- 오타/브랜딩 수정 허용
- 무제한 변경은 SEO 리스크

### 2-4. 예약어 정책

```typescript
const RESERVED_SLUGS = [
  'admin',
  'api',
  'system',
  'store',
  'kiosk',
  'tablet',
  'blog',
  'login',
  'signup',
  'www',
  'app',
  'static',
  'assets',
  'health',
  'operator',
  'partner',
  'supplier',
];
```

---

## 3. Core 계층 구조

### 3-1. 패키지 위치

```
packages/platform-core
    └── store-identity/
        ├── entities/
        │   ├── platform-store-slug.entity.ts
        │   └── platform-store-slug-history.entity.ts
        ├── services/
        │   └── store-slug.service.ts
        ├── constants/
        │   └── reserved-slugs.ts
        └── index.ts
```

### 3-2. 엔티티 정의

#### PlatformStoreSlug

```typescript
@Entity('platform_store_slugs')
export class PlatformStoreSlug {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  slug: string;

  @Column({ type: 'uuid', name: 'store_id' })
  storeId: string;

  @Column({ type: 'varchar', length: 50, name: 'service_key' })
  serviceKey: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

#### PlatformStoreSlugHistory

```typescript
@Entity('platform_store_slug_history')
export class PlatformStoreSlugHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'store_id' })
  storeId: string;

  @Column({ type: 'varchar', length: 120, name: 'old_slug' })
  oldSlug: string;

  @Column({ type: 'varchar', length: 120, name: 'new_slug' })
  newSlug: string;

  @Column({ type: 'uuid', name: 'changed_by' })
  changedBy: string;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt: Date;
}
```

### 3-3. Core Service 인터페이스

```typescript
interface IStoreSlugService {
  // 가용성 체크
  checkAvailability(slug: string): Promise<{ available: boolean; reason?: string }>;

  // slug 예약 (매장 생성 시)
  reserveSlug(storeId: string, serviceKey: string, slug: string): Promise<void>;

  // 자동 생성 (fallback)
  generateUniqueSlug(base: string): Promise<string>;

  // slug 변경 (1회 제한)
  changeSlug(storeId: string, newSlug: string, changedBy: string): Promise<void>;

  // 변경 이력 조회
  getSlugHistory(storeId: string): Promise<PlatformStoreSlugHistory[]>;

  // slug로 store 조회
  findBySlug(slug: string): Promise<PlatformStoreSlug | null>;
}
```

---

## 4. Validation 규칙

### 4-1. slug 형식

```typescript
const SLUG_REGEX = /^[a-z0-9\uAC00-\uD7AF]([a-z0-9\uAC00-\uD7AF-]*[a-z0-9\uAC00-\uD7AF])?$/;
const MIN_LENGTH = 3;
const MAX_LENGTH = 120;
```

- 한글, 영소문자, 숫자, 하이픈 허용
- 하이픈으로 시작/끝 불가
- 연속 하이픈 불가
- 최소 3자, 최대 120자

### 4-2. 예약어 체크

```typescript
function isReserved(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase());
}
```

---

## 5. 신청/승인 워크플로우 변경

### 5-1. Application 테이블 확장

```sql
ALTER TABLE glycopharm_applications ADD COLUMN requested_slug VARCHAR(120);
ALTER TABLE cosmetics_store_applications ADD COLUMN requested_slug VARCHAR(120);
```

### 5-2. 신청 API

```typescript
// POST /applications
{
  organizationName: "강남약국",
  requestedSlug: "gangnam-pharmacy",  // 신규 필드
  // ...
}
```

### 5-3. 승인 API

```typescript
// 승인 시
const slug = requestedSlug
  ? await storeSlugService.reserveSlug(storeId, serviceKey, requestedSlug)
  : await storeSlugService.generateUniqueSlug(organizationName);
```

---

## 6. Migration 전략

### 6-1. 백필 순서

1. platform_store_slugs 테이블 생성
2. glycopharm_pharmacies에서 백필
3. cosmetics_stores에서 백필
4. 충돌 처리 (suffix 추가)

### 6-2. 충돌 처리

```typescript
async function backfillWithConflictResolution(serviceKey: string) {
  // 기존 slug 조회
  // 충돌 시 -1, -2 suffix 추가
  // 로그 기록
}
```

---

## 7. API 엔드포인트

### 7-1. slug 체크 API

```
GET /api/v1/platform/slug/check?value=xxx

Response:
{
  available: boolean,
  reason?: 'reserved' | 'invalid' | 'duplicate'
}
```

### 7-2. slug 변경 API

```
PATCH /api/v1/stores/:slug/change-slug

Body:
{
  newSlug: "new-store-name"
}

권한: store owner only
제한: 1회
```

---

## 8. 구현 Phase

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | Core 엔티티 + 서비스 정의 | 진행 예정 |
| 2 | Migration + 백필 | 진행 예정 |
| 3 | 승인 워크플로우 연동 | 대기 |
| 4 | slug 변경 정책 + history | 대기 |
| 5 | slug 중복 체크 API | 대기 |

---

## 9. 참조 문서

- [GAP 분석](../investigations/IR-CYBER-STORE-GAP-TABLE-V1.md)
- [Phase 1 DB 조사](../investigations/IR-CYBER-STORE-PHASE1-DB-INVENTORY-V1.md)
- [Phase 2 API 조사](../investigations/IR-CYBER-STORE-PHASE2-API-INVENTORY-V1.md)
- [Phase 3 UI 조사](../investigations/IR-CYBER-STORE-PHASE3-UI-INVENTORY-V1.md)

---

*Version: 1.0*
*Status: Approved*
