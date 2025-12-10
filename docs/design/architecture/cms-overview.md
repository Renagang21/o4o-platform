# CMS Overview

## 1. 목적(Purpose)

O4O Platform의 **콘텐츠 관리 시스템(CMS 2.0)**으로,
CPT(Custom Post Type), ACF(Advanced Custom Fields), View System을 통해
앱이 데이터 구조와 화면을 선언적으로 정의하고 자동으로 통합되도록 한다.

WordPress의 CPT/ACF 개념을 현대적으로 재해석하여, 코드 없이도 데이터 구조와 UI가 연결되는 구조를 제공한다.

## 2. 개요(Overview)

- CMS 2.0은 **앱 기반 데이터 구조 관리 시스템**이다.
- 앱이 manifest.ts에서 CPT/ACF/View를 선언하면, CMS가 자동으로 등록·관리한다.
- View System은 페이지(Page) 없이 **View Component 기반**으로 화면을 구성한다.
- AppStore, ModuleLoader, Navigation 시스템과 자동 연동된다.

## 3. 핵심 구성요소(Key Components)

### 1) CPT (Custom Post Type)
- 앱이 필요로 하는 데이터 구조 정의 (product, shop, order 등)
- slug, name, visibility, category 등 메타 정보 포함

### 2) ACF (Advanced Custom Fields)
- CPT 내부의 필드 구조를 정의하는 표준 시스템
- 타입(text, number, relation 등) 중심으로 재사용 가능하게 설계

### 3) View System
- 페이지 생성 없이 View Template(Component) 단위로 화면 구성
- List, Detail, Edit View 등 유형 기반
- Navigation/Menu 시스템과 자동 연결

### 4) Manifest Integrator
- 앱의 manifest.ts에서 선언된 구조를 CMS Registry에 자동 통합
- CPT/ACF/View가 설치 시점에 자동 반영됨

### 5) CMS Registry
- 전체 플랫폼의 데이터 구조를 추적하는 중앙 저장소
- AppStore, ModuleLoader, Navigation 시스템과 연동

## 4. 동작 구조(Architecture / Flow)

### CMS 등록 흐름

```
┌──────────────┐
│   앱 설치     │
└──────┬───────┘
       ▼
┌──────────────────────────┐
│ manifest.ts 분석         │
│ (CPT/ACF/View 추출)      │
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│ CPT/ACF 등록             │
│ (CMS Registry 업데이트)   │
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│ View Template 등록       │
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│ Dynamic Routing 적용     │
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│ View Component 렌더링    │
└──────────────────────────┘
```

### CMS 계층 구조

```
┌─────────────────────────────────────────────────────┐
│                    CMS Registry                     │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │     CPT     │  │     ACF     │  │    View     │ │
│  │  Registry   │  │  Registry   │  │  Registry   │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │        │
│         └────────────────┼────────────────┘        │
│                          ▼                          │
│              ┌─────────────────────┐               │
│              │  Manifest Integrator │               │
│              └─────────────────────┘               │
└─────────────────────────────────────────────────────┘
```

### 핵심 요약

```
앱이 manifest에서 CPT/ACF/View 선언 → CMS가 자동 등록 → 라우팅/렌더링 자동화
```

## 5. 개발 및 유지보수 규칙(Development Rules)

1. **manifest 선언 필수**: CPT/ACF/View는 반드시 manifest.ts에서 선언해야 한다.
2. **SSOT 원칙**: 데이터 구조는 CMS Registry를 Single Source of Truth로 사용한다.
3. **View 기반 화면 구성**: 페이지(Page) 직접 생성 대신 View Template을 사용한다.
4. **Core Entity 수정 금지**: Extension/Service에서 Core 앱의 CPT/ACF를 직접 수정하지 않는다.
5. **관련 문서 참조**:
   - `docs/specs/cms/engine-spec.md`
   - `docs/app-guidelines/manifest-specification.md`
   - `docs/design/architecture/view-system.md`

---
*최종 업데이트: 2025-12-10*
*상태: 초안 완료*
