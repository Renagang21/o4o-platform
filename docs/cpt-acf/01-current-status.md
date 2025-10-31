# CPT/ACF 시스템 현황 분석

**작성일:** 2025-10-31
**작성자:** 로컬 에이전트
**버전:** 1.0.0

---

## 📊 현재 구현 상태

### ✅ 구현 완료 항목

#### 1. **DB 엔티티 (Entity Layer)**
- **위치:** `apps/api-server/src/entities/`
- **구현 파일:**
  - `CustomPostType.ts` - CPT 정의
  - `CustomPost.ts` - CPT 포스트 데이터
  - `ACFFieldGroup.ts` - ACF 필드 그룹
  - `ACFField.ts` - ACF 개별 필드

#### 2. **비즈니스 로직 (Service Layer)**
- **위치:** `apps/api-server/src/modules/cpt-acf/`
- **구현 서비스:**
  - `services/cpt.service.ts` - CPT CRUD 로직
  - `services/acf.service.ts` - ACF 필드 관리
  - `services/block-data.service.ts` - 블록 에디터 데이터 API

#### 3. **API 엔드포인트 (Controller/Routes)**
- **컨트롤러:**
  - `controllers/cpt.controller.ts`
  - `controllers/acf.controller.ts`
- **라우트:**
  - `routes/cpt.routes.ts`
  - `routes/acf.routes.ts`
  - `routes/block-api.routes.ts`

#### 4. **DB 마이그레이션**
- `migrations/1756000000000-CreateACFTables.ts` - ACF 테이블 생성
- `migrations/1760745000000-AddCPTTypeToMenuItem.ts` - 메뉴 연동

---

### ❌ 미구현 항목

#### 1. **Preset 시스템 (핵심 부재)**
- ❌ FormPreset - 폼 레이아웃 프리셋
- ❌ ViewPreset - 뷰 템플릿 프리셋
- ❌ TemplatePreset - 페이지 템플릿 프리셋
- ❌ Preset 저장소 (DB 테이블 또는 JSON 파일)
- ❌ PresetId 기반 참조 시스템

#### 2. **블록/숏코드 통합**
- 현재: 블록과 숏코드가 각각 독립적으로 데이터 fetching
- 필요: presetId 통일 인터페이스

#### 3. **Admin UI (CPT/ACF 관리 화면)**
- ❌ CPT/ACF 전용 관리자 메뉴
- ❌ 프리셋 등록/수정 UI
- ❌ 템플릿 빌더 UI

#### 4. **캐싱 전략**
- ❌ ViewPreset 단위 캐시
- ❌ TanStack Query 설정
- ❌ ISR (Incremental Static Regeneration) 지원

#### 5. **Storage Adapter**
- ❌ 파일 업로드 인터페이스 (로컬 → GCS 마이그레이션 대비)

---

## 🏗️ 아키텍처 현황

### 데이터 흐름 (현재)
```
[Admin UI]
    ↓ (없음 - 직접 API 호출)
[API Server]
    ├─ CPT Service → CustomPostType Entity
    └─ ACF Service → ACFFieldGroup Entity

[Frontend Blocks/Shortcodes]
    → 직접 API fetching (통일된 인터페이스 없음)
```

### 이상적인 데이터 흐름 (목표)
```
[Admin UI - CPT/ACF 메뉴]
    ├─ Form Preset Editor
    ├─ View Preset Editor
    └─ Template Preset Editor
        ↓
[Preset Service] (SSOT)
        ↓
[Blocks/Shortcodes]
    → presetId로 통일 참조
    → TanStack Query 캐싱
```

---

## 📝 핵심 과제

### 1. **프리셋 스키마 정의**
Form/View/Template 각각의 JSON 스키마 확정 필요

### 2. **Preset 저장소 선택**
- **옵션 A:** DB 테이블 (`form_presets`, `view_presets`, `template_presets`)
- **옵션 B:** JSON 파일 (`/presets/*.json`)
- **권장:** DB 테이블 (버전 관리, RBAC 적용 용이)

### 3. **블록/숏코드 리팩터링**
현재 각 블록이 직접 API 호출 → `usePreset(presetId)` 훅으로 통일

### 4. **Admin 메뉴 구조**
```
CPT/ACF
├─ Custom Post Types
├─ ACF Fields
├─ Form Presets ⭐ 신규
├─ View Presets ⭐ 신규
├─ Template Presets ⭐ 신규
└─ Revisions
```

---

## 🎯 다음 단계

1. ✅ 현황 분석 완료
2. ⏳ 프리셋 스키마 문서 작성 (`03-presets-spec.md`)
3. ⏳ Admin IA 설계 (`04-admin-ia.md`)
4. ⏳ 구현 시작 (MVP-A)

---

## 📌 참고 파일 경로

### Backend (API Server)
```
apps/api-server/src/
├── entities/
│   ├── CustomPostType.ts
│   ├── CustomPost.ts
│   ├── ACFFieldGroup.ts
│   └── ACFField.ts
├── modules/cpt-acf/
│   ├── controllers/
│   ├── services/
│   ├── routes/
│   └── repositories/
└── database/migrations/
    └── 175*-CreateACFTables.ts
```

### Frontend
```
apps/admin-dashboard/src/
└── (CPT/ACF UI 미구현)

apps/main-site/src/
└── (블록/숏코드에서 개별 fetching)
```

---

**Status:** 기본 인프라는 구축되어 있으나, **Preset 시스템이 부재**하여 확장성과 재사용성이 제한적임.
