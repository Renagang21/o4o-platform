# CPT/ACF Preset Specification

**버전:** 2.0.0
**상태:** Active

---

## 1. 개요

프리셋(Preset)은 CPT의 **렌더링 방식을 재사용 가능한 템플릿으로 정의**한 것입니다.
CMS 2.0 구조에서 View System과 연동되어 자동 렌더링됩니다.

### 핵심 개념

| 개념 | 설명 |
|------|------|
| **SSOT** | 프리셋은 한 곳(CMS Registry)에만 정의 |
| **presetId** | 프리셋 참조 ID (예: `product-form-v1`) |
| **View 연동** | ListView / DetailView / FormView 자동 매핑 |

---

## 2. Preset 타입

### 2.1 FormPreset (폼 레이아웃)

```typescript
interface FormPreset {
  id: string;
  name: string;
  cptSlug: string;
  version: number;
  fields: FieldConfig[];
  layout: { columns: 1 | 2 | 3; sections: FormSection[]; };
  validation: ValidationRule[];
  roles?: string[];
  isActive: boolean;
}
```

### 2.2 ViewPreset (화면 템플릿)

```typescript
interface ViewPreset {
  id: string;
  name: string;
  cptSlug: string;
  viewType: 'list' | 'detail' | 'card';
  fields: string[];  // 표시할 필드 목록
  sorting?: { field: string; order: 'asc' | 'desc'; };
}
```

### 2.3 TemplatePreset (페이지 템플릿)

```typescript
interface TemplatePreset {
  id: string;
  name: string;
  regions: TemplateRegion[];  // header, content, sidebar, footer
  defaultViewPresetId?: string;
}
```

---

## 3. View System 연동

ListView / DetailView / FormView는 View Component 기반으로 자동 렌더링됩니다.

| Preset 타입 | 연동 View | 용도 |
|------------|----------|------|
| FormPreset | FormView | 데이터 입력/수정 |
| ViewPreset | ListView/DetailView | 데이터 조회 |
| TemplatePreset | PageLayout | 페이지 구조 |

---

## 4. 규칙

1. **manifest 선언**: 모든 Preset은 앱의 manifest.ts에서 선언
2. **CMS Registry 등록**: 설치 시 자동으로 Registry에 등록
3. **버전 관리**: Preset 변경 시 version 필드 증가
4. **SSOT 준수**: 동일 Preset을 여러 곳에 정의하지 않음

---
*최종 업데이트: 2025-12-10*
