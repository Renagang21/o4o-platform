# CPT/ACF Preset 스키마 명세서

**작성일:** 2025-10-31
**버전:** 1.0.0
**상태:** Draft → Review Needed

---

## 🎯 프리셋 시스템 개요

프리셋(Preset)은 CPT의 **렌더링 방식을 재사용 가능한 템플릿으로 정의**한 것입니다.

### 핵심 개념

| 개념 | 설명 | 예시 |
|------|------|------|
| **SSOT** | Single Source of Truth - 프리셋은 한 곳에만 정의 | DB 테이블 또는 `/presets/*.json` |
| **presetId** | 프리셋 참조 ID | `product-form-v1` |
| **Versioning** | 프리셋 버전 관리 | v1, v2, v3... |
| **Composition** | 프리셋 간 조합 가능 | Template ⊃ View ⊃ Form |

---

## 📝 1. FormPreset (폼 레이아웃)

### 1.1 용도
- CPT 데이터 입력 폼 정의
- Admin에서 포스트 작성/수정 시 사용
- ACF 필드 배치 및 검증 규칙 포함

### 1.2 스키마

```typescript
interface FormPreset {
  // 기본 정보
  id: string;                    // UUID
  name: string;                  // 프리셋 이름 (예: "Product Registration Form")
  description?: string;
  cptSlug: string;              // 연결된 CPT (예: "product")
  version: number;               // 버전 (1, 2, 3...)

  // 폼 구성
  fields: FieldConfig[];

  // 레이아웃
  layout: {
    columns: 1 | 2 | 3;          // 칼럼 수
    sections: FormSection[];      // 섹션 구분
  };

  // 검증
  validation: ValidationRule[];

  // 제출 설정
  submitBehavior: {
    redirectTo?: string;          // 제출 후 이동 경로
    showSuccessMessage: boolean;
    successMessage?: string;
  };

  // 권한
  roles?: string[];              // 이 폼을 사용할 수 있는 역할

  // 메타
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;            // 사용자 ID
}

interface FieldConfig {
  fieldKey: string;              // ACF 필드 참조 (예: "field_product_price")
  order: number;                 // 표시 순서
  sectionId?: string;            // 속한 섹션
  required: boolean;
  placeholder?: string;
  helpText?: string;
  conditional?: ConditionalLogic; // 조건부 표시
}

interface FormSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  collapsible: boolean;          // 접을 수 있는지
  defaultCollapsed: boolean;
}

interface ConditionalLogic {
  rules: ConditionalRule[];
  operator: 'AND' | 'OR';
}

interface ConditionalRule {
  field: string;                 // 조건 대상 필드
  operator: '==' | '!=' | '>' | '<' | 'contains';
  value: any;
}

interface ValidationRule {
  field: string;
  type: 'required' | 'email' | 'url' | 'number' | 'pattern';
  pattern?: string;              // Regex (type='pattern'일 때)
  message: string;               // 오류 메시지
}
```

### 1.3 JSON 예시

```json
{
  "id": "form_product_basic_v1",
  "name": "Product Basic Form",
  "description": "Basic product registration form",
  "cptSlug": "product",
  "version": 1,
  "fields": [
    {
      "fieldKey": "field_product_name",
      "order": 1,
      "sectionId": "basic_info",
      "required": true,
      "placeholder": "Enter product name"
    },
    {
      "fieldKey": "field_product_price",
      "order": 2,
      "sectionId": "basic_info",
      "required": true,
      "conditional": {
        "rules": [{
          "field": "field_product_type",
          "operator": "==",
          "value": "paid"
        }],
        "operator": "AND"
      }
    }
  ],
  "layout": {
    "columns": 2,
    "sections": [
      {
        "id": "basic_info",
        "title": "Basic Information",
        "order": 1,
        "collapsible": false,
        "defaultCollapsed": false
      }
    ]
  },
  "validation": [
    {
      "field": "field_product_price",
      "type": "number",
      "message": "Price must be a valid number"
    }
  ],
  "submitBehavior": {
    "redirectTo": "/admin/products",
    "showSuccessMessage": true,
    "successMessage": "Product created successfully!"
  },
  "roles": ["admin", "seller"],
  "isActive": true
}
```

---

## 🖼️ 2. ViewPreset (뷰 템플릿)

### 2.1 용도
- CPT 데이터 목록/그리드 표시
- 필터, 정렬, 페이지네이션 설정
- 캐싱 전략 포함

### 2.2 스키마

```typescript
interface ViewPreset {
  // 기본 정보
  id: string;
  name: string;
  description?: string;
  cptSlug: string;
  version: number;

  // 렌더 모드
  renderMode: 'list' | 'grid' | 'card' | 'table';

  // 표시 필드
  fields: ViewField[];

  // 정렬
  defaultSort: {
    field: string;
    order: 'ASC' | 'DESC';
  };

  // 페이지네이션
  pagination: {
    pageSize: number;
    showPagination: boolean;
    showPageSizeSelector: boolean;
    pageSizeOptions: number[];   // [10, 20, 50, 100]
  };

  // 필터
  filters?: FilterConfig[];

  // 검색
  search?: {
    enabled: boolean;
    fields: string[];            // 검색 대상 필드
    placeholder?: string;
  };

  // 캐싱
  cache?: {
    ttl: number;                 // 초 단위
    strategy: 'stale-while-revalidate' | 'cache-first' | 'no-cache';
    revalidateOnFocus: boolean;
  };

  // 권한
  roles?: string[];

  // 메타
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ViewField {
  fieldKey: string;              // ACF 필드 참조
  label?: string;                // 표시 라벨 (없으면 필드 라벨 사용)
  format: 'text' | 'html' | 'image' | 'date' | 'number' | 'badge';
  formatter?: {
    type: 'date';
    pattern?: string;            // 'YYYY-MM-DD', 'relative' 등
  } | {
    type: 'number';
    currency?: string;           // 'USD', 'KRW' 등
    decimals?: number;
  } | {
    type: 'badge';
    colorMap?: Record<string, string>; // { 'active': 'green', 'inactive': 'gray' }
  };
  sortable: boolean;
  order: number;
}

interface FilterConfig {
  id: string;
  label: string;
  field: string;                 // ACF 필드
  type: 'select' | 'date-range' | 'number-range' | 'checkbox';
  options?: Array<{              // type='select'일 때
    label: string;
    value: any;
  }>;
  defaultValue?: any;
}
```

### 2.3 JSON 예시

```json
{
  "id": "view_product_grid_v1",
  "name": "Product Grid View",
  "cptSlug": "product",
  "version": 1,
  "renderMode": "grid",
  "fields": [
    {
      "fieldKey": "field_product_image",
      "label": "Image",
      "format": "image",
      "sortable": false,
      "order": 1
    },
    {
      "fieldKey": "field_product_name",
      "format": "text",
      "sortable": true,
      "order": 2
    },
    {
      "fieldKey": "field_product_price",
      "label": "Price",
      "format": "number",
      "formatter": {
        "type": "number",
        "currency": "USD",
        "decimals": 2
      },
      "sortable": true,
      "order": 3
    },
    {
      "fieldKey": "field_product_status",
      "format": "badge",
      "formatter": {
        "type": "badge",
        "colorMap": {
          "active": "green",
          "inactive": "gray"
        }
      },
      "sortable": false,
      "order": 4
    }
  ],
  "defaultSort": {
    "field": "createdAt",
    "order": "DESC"
  },
  "pagination": {
    "pageSize": 12,
    "showPagination": true,
    "showPageSizeSelector": true,
    "pageSizeOptions": [12, 24, 48]
  },
  "filters": [
    {
      "id": "status_filter",
      "label": "Status",
      "field": "field_product_status",
      "type": "select",
      "options": [
        { "label": "All", "value": null },
        { "label": "Active", "value": "active" },
        { "label": "Inactive", "value": "inactive" }
      ]
    }
  ],
  "search": {
    "enabled": true,
    "fields": ["field_product_name", "field_product_description"],
    "placeholder": "Search products..."
  },
  "cache": {
    "ttl": 300,
    "strategy": "stale-while-revalidate",
    "revalidateOnFocus": true
  },
  "roles": ["public"],
  "isActive": true
}
```

---

## 📄 3. TemplatePreset (페이지 템플릿)

### 3.1 용도
- 단일 포스트 상세 페이지 템플릿
- 헤더/본문/사이드바/푸터 슬롯 구성
- SEO 메타데이터 설정

### 3.2 스키마

```typescript
interface TemplatePreset {
  // 기본 정보
  id: string;
  name: string;
  description?: string;
  cptSlug: string;
  version: number;

  // 레이아웃
  layout: {
    type: '1-column' | '2-column-left' | '2-column-right' | '3-column';
    header?: SlotConfig;
    main: SlotConfig;
    sidebar?: SlotConfig;
    footer?: SlotConfig;
  };

  // SEO
  seoMeta: {
    titleTemplate: string;       // "{title} | My Site"
    descriptionField?: string;   // ACF 필드 key
    ogImageField?: string;
    keywords?: string[];         // 고정 키워드
    keywordsField?: string;      // 동적 키워드 필드
  };

  // Schema.org (구조화 데이터)
  schemaOrg?: {
    type: 'Product' | 'Article' | 'Event' | 'Organization';
    fieldMapping: Record<string, string>; // { name: 'field_product_name', ... }
  };

  // 권한
  roles?: string[];              // 접근 가능한 역할

  // 메타
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SlotConfig {
  blocks: BlockReference[];
}

interface BlockReference {
  blockName: string;             // 블록 타입 (예: 'core/heading', 'custom/product-info')
  props: Record<string, any>;    // 블록 props
  presetId?: string;             // 중첩 프리셋 참조
  order: number;
}
```

### 3.3 JSON 예시

```json
{
  "id": "template_product_single_v1",
  "name": "Product Single Page Template",
  "cptSlug": "product",
  "version": 1,
  "layout": {
    "type": "2-column-right",
    "header": {
      "blocks": [
        {
          "blockName": "core/heading",
          "props": {
            "level": 1,
            "content": "{field_product_name}"
          },
          "order": 1
        }
      ]
    },
    "main": {
      "blocks": [
        {
          "blockName": "custom/product-gallery",
          "props": {
            "imageField": "field_product_images"
          },
          "order": 1
        },
        {
          "blockName": "core/paragraph",
          "props": {
            "content": "{field_product_description}"
          },
          "order": 2
        },
        {
          "blockName": "custom/product-specs",
          "props": {
            "specsField": "field_product_specs"
          },
          "order": 3
        }
      ]
    },
    "sidebar": {
      "blocks": [
        {
          "blockName": "custom/product-price-box",
          "props": {
            "priceField": "field_product_price"
          },
          "order": 1
        },
        {
          "blockName": "custom/add-to-cart",
          "props": {
            "buttonText": "Add to Cart"
          },
          "order": 2
        }
      ]
    }
  },
  "seoMeta": {
    "titleTemplate": "{field_product_name} - Buy Online | My Store",
    "descriptionField": "field_product_short_description",
    "ogImageField": "field_product_featured_image",
    "keywords": ["ecommerce", "shop"],
    "keywordsField": "field_product_tags"
  },
  "schemaOrg": {
    "type": "Product",
    "fieldMapping": {
      "name": "field_product_name",
      "description": "field_product_description",
      "image": "field_product_featured_image",
      "offers": {
        "price": "field_product_price",
        "priceCurrency": "USD"
      }
    }
  },
  "roles": ["public"],
  "isActive": true
}
```

---

## 🔗 4. 프리셋 간 관계

### 4.1 조합 패턴

```
TemplatePreset (페이지 전체)
    ├─ Header
    │   └─ ViewPreset (최근 상품 목록)
    ├─ Main
    │   └─ FormPreset (상품 정보 폼)
    └─ Sidebar
        └─ ViewPreset (관련 상품)
```

### 4.2 중첩 참조 예시

```json
{
  "id": "template_product_edit_v1",
  "layout": {
    "main": {
      "blocks": [
        {
          "blockName": "custom/form-renderer",
          "props": {
            "presetId": "form_product_basic_v1"
          },
          "order": 1
        }
      ]
    },
    "sidebar": {
      "blocks": [
        {
          "blockName": "custom/view-renderer",
          "props": {
            "presetId": "view_product_list_v1",
            "limit": 5
          },
          "order": 1
        }
      ]
    }
  }
}
```

---

## 🗄️ 5. DB 스키마

### 5.1 테이블 구조

```sql
-- FormPresets
CREATE TABLE form_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cpt_slug VARCHAR(100) NOT NULL,
  config JSONB NOT NULL,  -- fields, layout, validation 등 모든 설정
  version INT DEFAULT 1,
  roles TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  FOREIGN KEY (cpt_slug) REFERENCES custom_post_types(slug) ON DELETE CASCADE
);

-- ViewPresets
CREATE TABLE view_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cpt_slug VARCHAR(100) NOT NULL,
  config JSONB NOT NULL,  -- renderMode, fields, pagination 등
  version INT DEFAULT 1,
  roles TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  FOREIGN KEY (cpt_slug) REFERENCES custom_post_types(slug) ON DELETE CASCADE
);

-- TemplatePresets
CREATE TABLE template_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cpt_slug VARCHAR(100) NOT NULL,
  config JSONB NOT NULL,  -- layout, seoMeta, schemaOrg 등
  version INT DEFAULT 1,
  roles TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  FOREIGN KEY (cpt_slug) REFERENCES custom_post_types(slug) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX idx_form_presets_cpt_slug ON form_presets(cpt_slug);
CREATE INDEX idx_form_presets_active ON form_presets(is_active);
CREATE INDEX idx_view_presets_cpt_slug ON view_presets(cpt_slug);
CREATE INDEX idx_view_presets_active ON view_presets(is_active);
CREATE INDEX idx_template_presets_cpt_slug ON template_presets(cpt_slug);
CREATE INDEX idx_template_presets_active ON template_presets(is_active);
```

### 5.2 TypeORM Entity 예시

```typescript
@Entity('form_presets')
export class FormPreset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('varchar', { length: 100, name: 'cpt_slug' })
  cptSlug!: string;

  @Column('jsonb')
  config!: FormPresetConfig;  // 위 스키마의 모든 설정

  @Column('int', { default: 1 })
  version!: number;

  @Column('simple-array', { nullable: true })
  roles?: string[];

  @Column('boolean', { default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column('uuid', { nullable: true, name: 'created_by' })
  createdBy?: string;

  @ManyToOne('CustomPostType')
  @JoinColumn({ name: 'cpt_slug', referencedColumnName: 'slug' })
  cpt!: CustomPostType;
}
```

---

## ✅ 검증 규칙

### 6.1 필수 검증
1. **presetId 유일성**: 동일 CPT 내에서 presetId 중복 불가
2. **fieldKey 존재성**: 참조하는 ACF 필드가 실제 존재해야 함
3. **버전 순서**: version은 단조 증가 (1 → 2 → 3...)
4. **JSON 스키마**: config JSONB가 타입 정의와 일치

### 6.2 비즈니스 규칙
1. **활성 프리셋**: 동일 목적의 프리셋 중 최대 1개만 `isActive=true`
2. **역할 기반 접근**: `roles` 배열이 비어있으면 모든 역할 허용
3. **캐시 TTL**: ViewPreset의 TTL은 0 이상 (0 = 캐싱 안 함)

---

## 📖 사용 예시

### 7.1 Admin에서 프리셋 사용

```tsx
// Product 등록 폼
import { FormRenderer } from '@/components/cpt/FormRenderer';

function ProductCreate() {
  return <FormRenderer presetId="form_product_basic_v1" />;
}
```

### 7.2 Frontend 블록에서 사용

```tsx
// Product 목록 블록
import { ViewRenderer } from '@/components/cpt/ViewRenderer';

function ProductListBlock({ presetId = 'view_product_grid_v1' }) {
  return <ViewRenderer presetId={presetId} />;
}
```

### 7.3 숏코드에서 사용

```
[cpt_view preset="view_product_grid_v1" limit="10"]
[cpt_form preset="form_product_basic_v1"]
[cpt_template preset="template_product_single_v1" post_id="123"]
```

---

## 🎯 다음 단계

1. ✅ Preset 스키마 정의 완료
2. ⏳ Admin IA 설계 (`04-admin-ia.md`)
3. ⏳ Migration 파일 작성
4. ⏳ Service/Controller 구현

---

**승인 필요:**
- [ ] FormPreset 스키마 최종 검토
- [ ] ViewPreset 캐싱 전략 승인
- [ ] TemplatePreset SEO 필드 확정
- [ ] DB 테이블 구조 승인
