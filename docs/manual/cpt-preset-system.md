# CPT/ACF Preset System - 종합 매뉴얼

**작성일:** 2025-10-31
**버전:** 1.0.0
**대상:** 관리자, 개발자

---

## 📚 목차

### 기본 가이드
1. [개요 및 소개](#1-개요-및-소개)
2. [핵심 개념](#2-핵심-개념)
3. [시스템 아키텍처](#3-시스템-아키텍처)

### 사용자 가이드
4. [Form Preset 사용법](./cpt-preset-form-guide.md)
5. [View Preset 사용법](./cpt-preset-view-guide.md)
6. [Template Preset 사용법](./cpt-preset-template-guide.md) ✓

### 개발자 가이드
7. [API 레퍼런스](./cpt-preset-api-reference.md)
8. [개발자 가이드](./cpt-preset-developer-guide.md)
9. [타입 정의](./cpt-preset-types-reference.md)

### 고급 가이드
10. [블록 및 숏코드 통합](#10-블록-및-숏코드-통합)
11. [역할 기반 접근 제어](#11-역할-기반-접근-제어)
12. [문제 해결 가이드](#12-문제-해결-가이드)

---

## 1. 개요 및 소개

### 1.1 CPT/ACF Preset System이란?

CPT/ACF Preset System은 O4O 플랫폼의 **재사용 가능한 컨텐츠 템플릿 시스템**입니다. WordPress의 Custom Post Type(CPT)과 Advanced Custom Fields(ACF) 개념을 확장하여, 폼, 뷰, 템플릿을 **설정 기반**으로 정의하고 관리할 수 있습니다.

### 1.2 주요 기능

| 기능 | 설명 |
|------|------|
| **Form Preset** | 데이터 입력 폼 레이아웃 정의 (관리자 페이지) |
| **View Preset** | 데이터 목록/그리드 표시 설정 (프론트엔드) |
| **Template Preset** | 단일 포스트 상세 페이지 템플릿 (SEO 포함) |
| **SSOT** | Single Source of Truth - 한 곳에서 정의, 모든 곳에서 사용 |
| **버전 관리** | 프리셋 버전 추적 및 관리 (v1, v2, v3...) |
| **역할 기반 필터링** | 사용자 역할에 따른 프리셋 접근 제어 |
| **블록/숏코드 통합** | 블록 에디터와 숏코드에서 동일한 프리셋 사용 |

### 1.3 왜 Preset System을 사용하나요?

#### 기존 방식의 문제점
```tsx
// ❌ 코드에 하드코딩된 레이아웃
function ProductList() {
  return (
    <div className="grid grid-cols-3">
      {products.map(p => (
        <div key={p.id}>
          <img src={p.image} />
          <h3>{p.name}</h3>
          <p>${p.price}</p>
        </div>
      ))}
    </div>
  );
}
```

**문제:**
- 레이아웃 변경 시 코드 수정 필요
- 여러 곳에서 동일한 레이아웃을 중복 구현
- 비개발자가 레이아웃 변경 불가능

#### Preset System 방식
```tsx
// ✅ 설정 기반 렌더링
function ProductList({ presetId }) {
  return <PresetRenderer presetId="view_product_grid_v1" />;
}
```

**장점:**
- 레이아웃은 DB에 저장된 JSON 설정
- 관리자 UI에서 비개발자도 레이아웃 편집 가능
- 동일한 presetId는 모든 곳에서 동일하게 렌더링 (SSOT)
- 버전 관리로 변경 이력 추적

---

## 2. 핵심 개념

### 2.1 Three Types of Presets

```
┌─────────────────┐
│  FormPreset     │  데이터 입력 폼 (Admin)
│  - 필드 배치    │
│  - 검증 규칙    │
│  - 조건부 로직  │
└─────────────────┘

┌─────────────────┐
│  ViewPreset     │  데이터 목록/그리드 (Frontend)
│  - 렌더 모드    │
│  - 필터/정렬    │
│  - 페이지네이션 │
└─────────────────┘

┌─────────────────┐
│ TemplatePreset  │  단일 포스트 상세 페이지
│  - 레이아웃     │
│  - SEO 설정     │
│  - 블록 조합    │
└─────────────────┘
```

### 2.2 SSOT (Single Source of Truth)

**원칙:** 프리셋은 **한 곳(DB)**에만 정의되고, **모든 곳(블록, 숏코드, API)**에서 참조됩니다.

```
Database (PostgreSQL)
  └─ form_presets 테이블
      └─ id: "form_product_basic_v1"
          config: { fields: [...], layout: {...} }

사용처:
✅ Admin 대시보드 → formPresetsApi.getById('form_product_basic_v1')
✅ 블록 에디터 → <FormRenderer presetId="form_product_basic_v1" />
✅ 숏코드 → [preset id="form_product_basic_v1" type="form"]
✅ React Hook → usePreset('form_product_basic_v1', 'form')

모든 곳에서 동일한 설정을 사용하므로 일관성 보장!
```

### 2.3 Preset 버전 관리

프리셋은 `version` 필드로 버전을 관리합니다:

```
form_product_basic_v1  → version: 1 (최초 생성)
form_product_basic_v2  → version: 2 (필드 추가)
form_product_basic_v3  → version: 3 (레이아웃 변경)
```

**권장사항:**
- 중대한 변경 시 새 버전 생성 (Clone 기능 사용)
- 이전 버전은 `isActive: false`로 비활성화
- 운영 환경에서는 항상 버전 명시 (`v1`, `v2` 등)

### 2.4 Config-Driven Rendering

모든 프리셋은 `config` 필드에 **JSON 형태의 설정**을 저장합니다:

```typescript
// ViewPreset 예시
{
  "id": "view_product_grid_v1",
  "cptSlug": "product",
  "config": {
    "renderMode": "grid",       // ← 렌더링 방식
    "fields": [                 // ← 표시할 필드들
      {
        "fieldKey": "field_product_image",
        "format": "image",
        "order": 1
      },
      {
        "fieldKey": "field_product_name",
        "format": "text",
        "order": 2
      }
    ],
    "pagination": {             // ← 페이지네이션 설정
      "pageSize": 12,
      "showPagination": true
    }
  }
}
```

이 설정을 `PresetRenderer` 컴포넌트가 읽어서 자동으로 UI를 생성합니다.

---

## 3. 시스템 아키텍처

### 3.1 전체 구조도

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (React)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Admin Pages  │  │    Blocks    │  │  Shortcodes  │  │
│  │ FormPresets  │  │ FormRenderer │  │   [preset]   │  │
│  │ ViewPresets  │  │ ViewRenderer │  │              │  │
│  │TemplatePreset│  │              │  │              │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │          │
│         └─────────────────┼──────────────────┘          │
│                           ▼                             │
│              ┌─────────────────────────┐                │
│              │   @o4o/utils Package    │                │
│              │   - usePreset()         │                │
│              │   - PresetRenderer      │                │
│              │   - Cache (5min TTL)    │                │
│              └────────────┬────────────┘                │
└───────────────────────────┼─────────────────────────────┘
                            │ HTTP Request
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Backend (Node.js/Express)               │
│  ┌──────────────────────────────────────────────────┐  │
│  │        /api/v1/presets/* Routes                  │  │
│  │  - GET    /forms                                 │  │
│  │  - GET    /forms/:id                             │  │
│  │  - POST   /forms                                 │  │
│  │  - PUT    /forms/:id                             │  │
│  │  - DELETE /forms/:id                             │  │
│  │  - POST   /forms/:id/clone                       │  │
│  │  (+ /views, /templates 동일)                     │  │
│  └─────────────────┬────────────────────────────────┘  │
│                    ▼                                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │           PresetService                          │  │
│  │  - getAllFormPresets()                           │  │
│  │  - getFormPresetById()                           │  │
│  │  - createFormPreset()                            │  │
│  │  - updateFormPreset()                            │  │
│  │  - deleteFormPreset()                            │  │
│  │  - cloneFormPreset()                             │  │
│  └─────────────────┬────────────────────────────────┘  │
│                    ▼                                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │           TypeORM Entities                       │  │
│  │  - FormPreset                                    │  │
│  │  - ViewPreset                                    │  │
│  │  - TemplatePreset                                │  │
│  └─────────────────┬────────────────────────────────┘  │
└────────────────────┼─────────────────────────────────┘
                     │ SQL Queries
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Database (PostgreSQL)                       │
│  ┌──────────────────┐  ┌──────────────────┐           │
│  │  form_presets    │  │  view_presets    │           │
│  │  - id (UUID)     │  │  - id (UUID)     │           │
│  │  - name          │  │  - name          │           │
│  │  - cpt_slug      │  │  - cpt_slug      │           │
│  │  - config (JSONB)│  │  - config (JSONB)│           │
│  │  - version       │  │  - version       │           │
│  │  - is_active     │  │  - is_active     │           │
│  └──────────────────┘  └──────────────────┘           │
│  ┌──────────────────┐                                  │
│  │ template_presets │                                  │
│  │  - id (UUID)     │                                  │
│  │  - name          │                                  │
│  │  - cpt_slug      │                                  │
│  │  - config (JSONB)│                                  │
│  │  - version       │                                  │
│  │  - is_active     │                                  │
│  └──────────────────┘                                  │
└─────────────────────────────────────────────────────────┘
```

### 3.2 데이터 흐름

#### 프리셋 목록 조회
```
1. 사용자: Admin 페이지에서 "Form Presets" 클릭
2. Frontend: formPresetsApi.list({ page: 1, limit: 20 })
3. Backend: GET /api/v1/presets/forms?page=1&limit=20
4. Service: presetService.getAllFormPresets()
5. Database: SELECT * FROM form_presets LIMIT 20 OFFSET 0
6. Response: { success: true, data: [...], total: 50, pagination: {...} }
```

#### 프리셋 사용 (블록/숏코드)
```
1. 블록: <PresetRenderer presetId="view_product_grid_v1" />
2. Hook: usePreset('view_product_grid_v1', 'view')
3. Cache Check: 캐시에 있으면 즉시 반환
4. API Request: authClient.api.get('/api/v1/presets/views/view_product_grid_v1')
5. Backend: presetService.getViewPresetById('view_product_grid_v1')
6. Database: SELECT * FROM view_presets WHERE id = 'view_product_grid_v1'
7. Response: { success: true, data: { config: {...}, ... } }
8. Render: PresetRenderer가 config 읽어서 UI 생성
```

### 3.3 주요 패키지 및 파일

#### Frontend Packages
```
@o4o/types
  └─ src/preset.ts                    # 타입 정의

@o4o/utils
  ├─ src/hooks/
  │   ├─ usePreset.ts                 # 프리셋 조회 훅
  │   ├─ usePresetData.ts             # 데이터 + 프리셋 조합
  │   ├─ usePresets.ts                # 목록 조회 훅
  │   └─ usePresetMutations.ts        # 생성/수정/삭제 훅
  └─ src/components/
      └─ PresetRenderer.tsx           # 범용 렌더러

@o4o/shortcodes
  └─ src/components/
      └─ PresetShortcode.tsx          # [preset] 숏코드

apps/admin-dashboard
  ├─ src/pages/cpt-engine/presets/
  │   ├─ FormPresets.tsx              # Form Preset 관리 페이지
  │   ├─ ViewPresets.tsx              # View Preset 관리 페이지
  │   └─ TemplatePresets.tsx          # Template Preset 관리 페이지
  ├─ src/components/presets/
  │   ├─ FormPresetModal.tsx          # Form 생성/편집 모달
  │   ├─ ViewPresetModal.tsx          # View 생성/편집 모달
  │   ├─ TemplatePresetModal.tsx      # Template 생성/편집 모달
  │   └─ PresetSelector.tsx           # 프리셋 선택 드롭다운
  └─ src/api/
      └─ presets.ts                   # API 클라이언트
```

#### Backend Files
```
apps/api-server/src/
  ├─ entities/
  │   ├─ FormPreset.ts                # TypeORM 엔티티
  │   ├─ ViewPreset.ts
  │   └─ TemplatePreset.ts
  ├─ modules/cpt-acf/
  │   ├─ services/
  │   │   └─ preset.service.ts        # 비즈니스 로직
  │   ├─ controllers/
  │   │   └─ preset.controller.ts     # HTTP 요청 처리
  │   └─ routes/
  │       └─ preset.routes.ts         # API 라우트 정의
  └─ database/migrations/
      └─ 1762000000000-CreatePresetTables.ts  # DB 마이그레이션
```

---

## 10. 블록 및 숏코드 통합

### 10.1 숏코드 사용법

#### 기본 문법
```
[preset id="프리셋ID" type="view|form|template"]
```

#### 예시
```
<!-- View Preset (상품 그리드) -->
[preset id="view_product_grid_v1" type="view"]

<!-- Form Preset (문의 폼) -->
[preset id="form_contact_standard_v1" type="form"]

<!-- Template Preset (상품 상세 페이지) -->
[preset id="template_product_single_v1" type="template"]
```

#### 숏코드 등록 (개발자용)
```typescript
// apps/admin-dashboard/src/utils/register-dynamic-shortcodes.ts
import { registerPresetShortcode } from '@o4o/shortcodes';

// 앱 초기화 시 자동 등록
registerPresetShortcode();
```

### 10.2 블록에서 프리셋 사용

#### PresetRenderer 컴포넌트
```tsx
import { PresetRenderer } from '@o4o/utils';
import { usePreset } from '@o4o/utils';

function ProductListBlock({ presetId = 'view_product_grid_v1' }) {
  const { preset, loading, error } = usePreset(presetId, 'view');

  // 실제 데이터 fetch
  const products = useFetchProducts();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <PresetRenderer
      preset={preset}
      data={products}
      loading={false}
    />
  );
}
```

### 10.3 블록 에디터 통합

#### PresetSelector 컴포넌트
```tsx
import { PresetSelector } from '@/components/presets';

function ProductBlockInspector({ attributes, setAttributes }) {
  return (
    <div>
      <label>View Preset</label>
      <PresetSelector
        type="view"
        value={attributes.presetId}
        onChange={(presetId) => setAttributes({ presetId })}
        cptSlug="product"
      />
    </div>
  );
}
```

---

## 11. 역할 기반 접근 제어

### 11.1 프리셋 레벨 권한

각 프리셋은 `roles` 필드로 접근 가능한 역할을 제한할 수 있습니다:

```json
{
  "id": "form_product_admin_v1",
  "name": "Product Admin Form",
  "roles": ["admin", "seller"],    // ← 이 역할만 접근 가능
  "config": { ... }
}
```

**동작:**
- `roles: null` 또는 `roles: []` → 모든 역할 접근 가능 (public)
- `roles: ["admin"]` → admin 역할만 접근 가능
- `roles: ["admin", "seller"]` → admin 또는 seller만 접근 가능

### 11.2 API 레벨 필터링

Backend에서 자동으로 역할 기반 필터링을 수행합니다:

```typescript
// PresetService.getAllFormPresets()
async getAllFormPresets(options: PresetQueryOptions, userRole?: string) {
  const queryBuilder = this.formPresetRepository.createQueryBuilder('preset');

  // 역할 필터링
  if (userRole) {
    queryBuilder.andWhere(
      'preset.roles IS NULL OR preset.roles = \'{}\' OR :role = ANY(preset.roles)',
      { role: userRole }
    );
  }

  // ...
}
```

### 11.3 Frontend 권한 처리

`usePreset` 훅은 403/401 에러를 자동으로 처리합니다:

```typescript
const { preset, loading, error } = usePreset('form_admin_only_v1', 'form');

if (error) {
  // error.message: "You do not have permission to access this preset"
  return <PermissionDenied />;
}
```

---

## 12. 문제 해결 가이드

### 12.1 자주 발생하는 오류

#### 오류 1: "Preset not found"
```
원인: 잘못된 presetId 또는 비활성화된 프리셋
해결:
1. Admin 페이지에서 해당 프리셋이 존재하는지 확인
2. isActive: true인지 확인
3. presetId 철자 확인 (대소문자 구분)
```

#### 오류 2: "You do not have permission to access this preset"
```
원인: 현재 사용자의 역할이 preset.roles에 포함되지 않음
해결:
1. Admin 페이지에서 프리셋의 roles 필드 확인
2. 필요한 역할 추가 또는 roles를 비워두기 (모든 역할 허용)
```

#### 오류 3: "Invalid preset configuration"
```
원인: preset.config가 타입 정의와 맞지 않음
해결:
1. 프리셋 편집 시 JSON 검증 오류 확인
2. docs/cpt-acf/03-presets-spec.md 참조하여 올바른 구조 확인
3. 필수 필드 누락 여부 확인 (renderMode, fields 등)
```

### 12.2 캐시 관련 문제

#### 캐시가 업데이트되지 않는 경우
```typescript
import { clearPresetCache, clearPresetFromCache } from '@o4o/utils';

// 전체 캐시 삭제
clearPresetCache();

// 특정 프리셋만 삭제
clearPresetFromCache('view_product_grid_v1', 'view');
```

### 12.3 디버깅 팁

#### 1. 프리셋 데이터 확인
```typescript
const { preset, loading, error } = usePreset('view_product_grid_v1', 'view');

console.log('Preset:', preset);
console.log('Config:', preset?.config);
console.log('Fields:', preset?.config.fields);
```

#### 2. API 응답 확인
```bash
# 프리셋 조회
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.neture.co.kr/api/v1/presets/views/view_product_grid_v1

# 프리셋 목록
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.neture.co.kr/api/v1/presets/views?cptSlug=product
```

#### 3. DB 직접 확인 (개발 환경)
```sql
-- 프리셋 목록
SELECT id, name, cpt_slug, version, is_active FROM view_presets;

-- 특정 프리셋의 config
SELECT config FROM view_presets WHERE id = 'view_product_grid_v1';

-- 역할 필터링 확인
SELECT id, name, roles FROM form_presets WHERE 'admin' = ANY(roles);
```

---

## 추가 리소스

- **타입 정의:** [cpt-preset-types-reference.md](./cpt-preset-types-reference.md)
- **API 레퍼런스:** [cpt-preset-api-reference.md](./cpt-preset-api-reference.md)
- **개발자 가이드:** [cpt-preset-developer-guide.md](./cpt-preset-developer-guide.md)
- **Form Preset 상세:** [cpt-preset-form-guide.md](./cpt-preset-form-guide.md)
- **View Preset 상세:** [cpt-preset-view-guide.md](./cpt-preset-view-guide.md)
- **Template Preset 상세:** [cpt-preset-template-guide.md](./cpt-preset-template-guide.md)

---

**마지막 업데이트:** 2025-10-31
**작성자:** O4O Platform Team
