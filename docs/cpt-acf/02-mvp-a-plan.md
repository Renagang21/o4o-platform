# CPT/ACF MVP-A 개선 계획

**작성일:** 2025-10-31
**버전:** MVP-A (Minimum Viable Product - Phase A)
**목표:** 프리셋 중심 구조로 안정화

---

## 🎯 MVP-A 목표

> **"정의는 한 곳(SSOT), 사용은 어디서나(Preset ID)"**

1. **프리셋 시스템 구축** - Form/View/Template 프리셋 저장소 생성
2. **Admin UI 골격** - CPT/ACF 관리 메뉴 구조 적용
3. **블록/숏코드 통합** - presetId 기반 통일 인터페이스
4. **캐싱 전략** - ViewPreset 단위 캐시 적용

---

## 📐 설계 원칙

### 1. **SSOT (Single Source of Truth)**
- 프리셋 정의는 DB 또는 presets 디렉터리에만 존재
- 모든 블록/숏코드는 presetId로 참조

### 2. **계층 분리**
```
Preset Layer (정의)
    ↓
Service Layer (비즈니스 로직)
    ↓
Presentation Layer (블록/숏코드)
```

### 3. **확장성 우선**
- Storage Adapter 인터페이스로 로컬 ↔ GCS 전환 대비
- Version 필드로 프리셋 변경 이력 관리

---

## 🗂️ 프리셋 타입 정의

### 1. **FormPreset** (폼 레이아웃)

```typescript
interface FormPreset {
  id: string;                    // preset ID
  name: string;                  // 프리셋 이름
  cptSlug: string;              // 연결된 CPT
  version: number;               // 버전
  fields: FieldConfig[];         // ACF 필드 배열
  layout: {
    columns: 1 | 2 | 3;
    sections: Section[];
  };
  validation: ValidationRule[];
  createdAt: Date;
  updatedAt: Date;
}

interface FieldConfig {
  fieldKey: string;              // ACF 필드 참조
  order: number;
  required: boolean;
  conditional?: ConditionalLogic;
}
```

**사용 예시:**
```tsx
// Admin에서 폼 렌더
<FormRenderer presetId="product-form-v1" />

// 블록에서 동일 폼 사용
[cpt_form preset="product-form-v1"]
```

---

### 2. **ViewPreset** (뷰 템플릿)

```typescript
interface ViewPreset {
  id: string;
  name: string;
  cptSlug: string;
  version: number;
  renderMode: 'list' | 'grid' | 'card' | 'table';
  fields: {
    fieldKey: string;
    label?: string;
    format?: 'text' | 'html' | 'image' | 'date';
  }[];
  pagination?: {
    pageSize: number;
    showPagination: boolean;
  };
  filters?: FilterConfig[];
  cache?: {
    ttl: number;                 // 캐시 유지 시간 (초)
    strategy: 'stale-while-revalidate' | 'cache-first';
  };
}
```

**사용 예시:**
```tsx
// 상품 목록 블록
<ViewRenderer presetId="product-list-grid" />

// 숏코드
[cpt_view preset="product-list-grid" limit="10"]
```

---

### 3. **TemplatePreset** (페이지 템플릿)

```typescript
interface TemplatePreset {
  id: string;
  name: string;
  cptSlug: string;
  version: number;
  layout: {
    header: SlotConfig;
    main: SlotConfig;
    sidebar?: SlotConfig;
    footer: SlotConfig;
  };
  seoMeta: {
    titleTemplate: string;       // 예: "{title} | My Site"
    descriptionField?: string;   // ACF 필드 참조
    ogImageField?: string;
  };
  roles?: string[];              // RBAC: 접근 가능한 역할
}

interface SlotConfig {
  blocks: BlockReference[];
}

interface BlockReference {
  blockName: string;
  props: Record<string, any>;
  presetId?: string;             // 블록 내부에서도 프리셋 참조 가능
}
```

**사용 예시:**
```tsx
// 상품 상세 페이지 템플릿
<TemplateRenderer
  presetId="product-single-v1"
  postId={postId}
/>
```

---

## 🗄️ 저장소 전략

### 옵션 A: DB 테이블 (권장)

```sql
-- FormPresets
CREATE TABLE form_presets (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  cpt_slug VARCHAR(100),
  config JSONB,
  version INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- ViewPresets
CREATE TABLE view_presets ( ... );

-- TemplatePresets
CREATE TABLE template_presets ( ... );
```

**장점:**
- 버전 관리 용이
- RBAC 적용 가능
- 실시간 변경 반영

**단점:**
- DB 의존성 증가

---

### 옵션 B: JSON 파일

```
/presets/
├── forms/
│   ├── product-form-v1.json
│   └── article-form-v1.json
├── views/
│   └── product-list-grid.json
└── templates/
    └── product-single-v1.json
```

**장점:**
- Git으로 버전 관리
- 배포 시 함께 번들링

**단점:**
- 런타임 변경 어려움
- 파일 I/O 오버헤드

---

### 🎯 MVP-A 선택: **DB 테이블**

이유:
1. 관리자 UI에서 실시간 편집 필요
2. RBAC 권한 제어 필요
3. 버전 히스토리 추적 필요

---

## 🧩 작업 순서

### Phase 1: 기초 인프라 (우선순위 ⭐⭐⭐)
- [ ] Preset 엔티티 생성 (FormPreset, ViewPreset, TemplatePreset)
- [ ] Preset 서비스 구현 (CRUD)
- [ ] Migration 파일 작성

### Phase 2: Admin UI 골격 (우선순위 ⭐⭐)
- [ ] CPT/ACF 메뉴 추가
- [ ] Preset 목록/등록 페이지
- [ ] JSON Editor (Monaco Editor 사용)

### Phase 3: 블록/숏코드 통합 (우선순위 ⭐⭐⭐)
- [ ] `usePreset(presetId)` React Hook
- [ ] 숏코드 파서에 preset 파라미터 추가
- [ ] 블록 Props에 presetId 추가

### Phase 4: 캐싱 전략 (우선순위 ⭐)
- [ ] TanStack Query 설정
- [ ] ViewPreset 캐시 TTL 적용
- [ ] ISR 지원 (Next.js revalidate)

### Phase 5: Storage Adapter (우선순위 ⭐)
- [ ] IStorageAdapter 인터페이스 정의
- [ ] LocalStorage 구현
- [ ] GCS Adapter 스텁 생성

---

## ✅ 완료 기준 (Definition of Done)

### 기능 요구사항
1. 새 CPT 생성 후 Form/View/Template 프리셋 각 1개 이상 등록 가능
2. 블록과 숏코드 모두 `presetId`로 동일 데이터 렌더링
3. TemplatePreset의 SEO 메타 필드 정상 적용
4. ViewPreset 캐시 동작 (TTL 확인)

### 기술 요구사항
1. TypeScript 타입 안전성 (any 사용 금지)
2. 모든 Preset에 version 필드 포함
3. Migration 파일 롤백 가능

### 테스트 요구사항
1. Preset CRUD API 테스트
2. presetId 기반 렌더링 통합 테스트
3. 캐시 TTL 동작 확인

---

## 📊 성공 지표

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| Preset 재사용률 | 80% 이상 | 블록/숏코드 사용 통계 |
| API 호출 감소 | 50% 감소 | TanStack Query 캐시 히트율 |
| Admin UI 완성도 | Form/View/Template 모두 CRUD 가능 | 수동 테스트 |
| 문서화 | 모든 Preset 타입 스키마 문서화 | Markdown 파일 존재 여부 |

---

## 🔗 다음 문서

- `03-presets-spec.md` - 각 프리셋 타입의 상세 스키마
- `04-admin-ia.md` - Admin 메뉴 구조 및 IA
- `05-implementation-guide.md` - 단계별 구현 가이드

---

**승인 필요 사항:**
- [ ] DB 테이블 저장소 선택 확정
- [ ] Preset 스키마 최종 검토
- [ ] Admin UI 디자인 승인
