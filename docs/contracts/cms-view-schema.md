# CMS View Schema Contract

> **이 문서는 CMS View의 공식 스키마 계약(Contract)이다.**
> Entity, Lifecycle, DB 스키마 간의 불일치를 방지하기 위한 단일 기준 문서.

---

## 1. 목적 (Purpose)

CMS View는 O4O Platform의 ViewSystem 핵심 구성요소로,
CPT(Custom Post Type) 기반 데이터를 화면에 렌더링하기 위한 뷰 템플릿을 정의한다.

본 Contract는 다음을 보장한다:

- **DB 스키마**와 **Entity 정의**가 항상 일치
- **Lifecycle 생성 로직**이 이 스키마를 준수
- 향후 변경 시 **충돌/불일치 방지**

---

## 2. 확정 스키마 (Canonical Schema)

### 테이블명: `cms_views`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | Primary Key |
| `organizationId` | uuid | NO | - | 조직 ID (FK soft) |
| `name` | varchar(255) | NO | - | View 이름 |
| `slug` | varchar(255) | NO | - | URL-friendly 식별자 |
| `type` | varchar(100) | NO | 'list' | View 타입 (list, grid, detail, custom) |
| `description` | text | YES | NULL | View 설명 |
| `templateId` | uuid | YES | NULL | 연결된 템플릿 ID |
| `cptType` | varchar(255) | YES | NULL | 연결된 CPT 타입 |
| `query` | jsonb | NO | '{}' | 데이터 조회 쿼리 설정 |
| `layout` | jsonb | NO | '{}' | 레이아웃/컴포넌트 설정 |
| `filters` | jsonb | NO | '{}' | 필터 설정 |
| `metadata` | jsonb | NO | '{}' | 추가 메타데이터 |
| `isActive` | boolean | NO | true | 활성화 상태 |
| `sortOrder` | integer | NO | 0 | 정렬 순서 |
| `createdAt` | timestamp | NO | now() | 생성일시 |
| `updatedAt` | timestamp | NO | now() | 수정일시 |

### 인덱스

- `UNIQUE (organizationId, slug)` - 조직 내 slug 유일성
- `INDEX (organizationId)` - 조직별 조회 최적화

---

## 3. 책임 경계 (Responsibility Boundaries)

### cms-core Lifecycle (`packages/cms-core/src/lifecycle/install.ts`)

**책임:**
- `cms_views` 테이블 생성
- 위 스키마와 **정확히 동일한** 구조로 생성
- 인덱스 생성

**금지:**
- 스키마 임의 변경
- Contract 없이 필드 추가/삭제

### api-server Entity (`apps/api-server/src/modules/cms/entities/View.ts`)

**책임:**
- Lifecycle이 생성한 테이블과 **1:1 매핑**
- TypeORM 데코레이터로 정확히 반영

**금지:**
- DB에 없는 필드 정의
- 필드 타입 불일치
- 가정 기반 확장

---

## 4. 변경 절차 (Change Protocol)

CMS View 스키마 변경이 필요한 경우, **반드시 아래 순서를 따른다:**

```
1. Contract 문서 수정 (docs/contracts/cms-view-schema.md)
   ↓
2. cms-core Lifecycle 수정 (migration 또는 install.ts)
   ↓
3. api-server Entity 수정 (View.ts)
   ↓
4. 관련 Service/Controller 수정 (필요시)
```

### 변경 금지 사항

- ❌ Entity만 단독 수정
- ❌ Lifecycle만 단독 수정
- ❌ Contract 없이 필드 추가
- ❌ 순서 역전 (Entity 먼저 → Lifecycle 나중)

---

## 5. TypeScript 타입 정의

```typescript
/**
 * CMS View Entity
 *
 * @contract docs/contracts/cms-view-schema.md
 * @table cms_views
 * @owner cms-core
 */
interface CMSView {
  id: string;                      // uuid
  organizationId: string;          // uuid
  name: string;                    // varchar(255)
  slug: string;                    // varchar(255)
  type: string;                    // varchar(100), default: 'list'
  description: string | null;      // text, nullable
  templateId: string | null;       // uuid, nullable
  cptType: string | null;          // varchar(255), nullable
  query: Record<string, any>;      // jsonb, default: {}
  layout: Record<string, any>;     // jsonb, default: {}
  filters: Record<string, any>;    // jsonb, default: {}
  metadata: Record<string, any>;   // jsonb, default: {}
  isActive: boolean;               // boolean, default: true
  sortOrder: number;               // integer, default: 0
  createdAt: Date;                 // timestamp
  updatedAt: Date;                 // timestamp
}
```

---

## 6. 관련 파일 참조

| 파일 | 역할 |
|------|------|
| `packages/cms-core/src/lifecycle/install.ts` | 테이블 생성 |
| `apps/api-server/src/modules/cms/entities/View.ts` | Entity 정의 |
| `apps/api-server/src/modules/cms/services/ViewService.ts` | CRUD 서비스 |
| `apps/api-server/src/modules/cms/controllers/ViewController.ts` | API 엔드포인트 |

---

## 7. 버전 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0.0 | 2025-12-16 | 초기 Contract 생성 (Entity-DB 불일치 해결 후 확정) |

---

## 8. 참고: 이전 이슈 (2025-12-16)

### 문제 상황

- `/api/v1/cms/views` API가 500 에러 반환
- 원인: `column view.schema does not exist`

### 근본 원인

api-server의 View Entity가 DB에 없는 필드들을 정의:
- `schema` (존재하지 않음)
- `status` (존재하지 않음)
- `postTypeSlug` (존재하지 않음)

### 해결

Entity를 실제 DB 스키마에 맞춰 재작성하고,
본 Contract 문서를 생성하여 재발 방지.

---

*Updated: 2025-12-16*
*Status: Active Contract*
