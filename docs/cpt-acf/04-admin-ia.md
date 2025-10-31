# CPT/ACF Admin 메뉴 구조 (IA)

**작성일:** 2025-10-31
**버전:** MVP-A
**대상:** Admin Dashboard UI

---

## 🗂️ 메뉴 구조 Overview

```
Admin Dashboard
└─ CPT & ACF  📦 (새 메뉴 그룹)
    ├─ Custom Post Types  📝
    │   ├─ All CPTs (목록)
    │   ├─ Add New (생성)
    │   └─ Settings (설정)
    │
    ├─ ACF Fields  🔧
    │   ├─ Field Groups (필드 그룹 목록)
    │   ├─ Add Field Group (그룹 생성)
    │   └─ Import/Export (JSON I/O)
    │
    ├─ Presets  ⚙️ (⭐ 신규)
    │   ├─ Form Presets
    │   │   ├─ All Form Presets
    │   │   └─ Add New Form Preset
    │   ├─ View Presets
    │   │   ├─ All View Presets
    │   │   └─ Add New View Preset
    │   └─ Template Presets
    │       ├─ All Template Presets
    │       └─ Add New Template Preset
    │
    └─ Revisions  📜 (⭐ 신규)
        └─ Preset History (변경 이력)
```

---

## 📝 1. Custom Post Types 메뉴

### 1.1 All CPTs (목록 페이지)

**경로:** `/admin/cpt/all`

**기능:**
- CPT 목록 테이블 표시
- 검색 및 필터 (활성/비활성)
- 빠른 편집 (Quick Edit)
- 일괄 작업 (Bulk Actions)

**테이블 컬럼:**
| 컬럼 | 설명 | 정렬 가능 |
|------|------|----------|
| Icon | CPT 아이콘 | ❌ |
| Name | CPT 이름 | ✅ |
| Slug | URL slug | ✅ |
| Post Count | 포스트 수 | ✅ |
| Status | 활성/비활성 | ✅ |
| Created | 생성일 | ✅ |
| Actions | 편집/삭제/복제 | ❌ |

**액션:**
- Edit - 편집 페이지로 이동
- Delete - 삭제 확인 후 제거
- Duplicate - CPT 복제
- View Posts - 해당 CPT의 포스트 목록

---

### 1.2 Add New CPT (생성 페이지)

**경로:** `/admin/cpt/new`

**폼 섹션:**
1. **Basic Info**
   - Name (required)
   - Slug (required, auto-generated from name)
   - Description
   - Icon (아이콘 선택기)

2. **Capabilities**
   - Supports (title, editor, thumbnail, excerpt, custom-fields)
   - Public (공개 여부)
   - Has Archive (아카이브 페이지)
   - Show in Menu (메뉴 표시)

3. **Taxonomies**
   - Categories
   - Tags
   - Custom Taxonomies

4. **Permissions**
   - Capability Type (post/page/custom)
   - Role Access (체크박스)

**CTA:**
- Save as Draft
- Publish
- Preview (미리보기)

---

### 1.3 Edit CPT (편집 페이지)

**경로:** `/admin/cpt/edit/:slug`

**레이아웃:**
- 좌측: 폼 (1.2와 동일)
- 우측 사이드바:
  - Status (활성/비활성 토글)
  - Statistics (포스트 수, 최근 수정일)
  - Quick Actions (Delete, Duplicate)

---

## 🔧 2. ACF Fields 메뉴

### 2.1 Field Groups (목록)

**경로:** `/admin/acf/field-groups`

**기능:**
- 필드 그룹 목록
- 드래그&드롭으로 순서 변경
- Location Rules 미리보기

**테이블 컬럼:**
| 컬럼 | 설명 |
|------|------|
| Title | 필드 그룹 이름 |
| Key | 필드 그룹 key |
| Locations | 적용 위치 (CPT, 페이지 템플릿 등) |
| Fields Count | 포함된 필드 수 |
| Active | 활성 상태 |
| Actions | 편집/삭제/복제/Export |

---

### 2.2 Add/Edit Field Group

**경로:** `/admin/acf/field-groups/new`, `/admin/acf/field-groups/edit/:id`

**폼 구조:**
1. **Group Settings**
   - Title
   - Key (auto-generated)
   - Description

2. **Fields** (드래그 가능한 리스트)
   - Add Field 버튼
   - 각 필드:
     - Label
     - Name (key)
     - Type (select dropdown)
     - Instructions
     - Required (toggle)
     - 타입별 설정 (조건부 표시)

3. **Location Rules**
   - Rule Groups (OR)
   - Rules (AND)
   - Add Rule Group 버튼

4. **Display Settings**
   - Position (normal/side/acf_after_title)
   - Style (default/seamless)
   - Label Placement (top/left)
   - Hide on Screen (체크박스 리스트)

**CTA:**
- Save
- Save & Continue Editing
- Export JSON

---

### 2.3 Import/Export

**경로:** `/admin/acf/import-export`

**기능:**
- JSON 파일로 Export
- JSON 업로드로 Import
- 선택적 Import (체크박스로 선택)

---

## ⚙️ 3. Presets 메뉴 (⭐ 신규)

### 3.1 Form Presets 목록

**경로:** `/admin/presets/forms`

**테이블 컬럼:**
| 컬럼 | 설명 |
|------|------|
| Name | 프리셋 이름 |
| Preset ID | `form_xxx_v1` |
| CPT | 연결된 CPT |
| Version | 버전 번호 |
| Status | 활성/비활성 |
| Last Modified | 최근 수정일 |
| Actions | Edit/Duplicate/Delete/Preview |

**필터:**
- CPT Slug (드롭다운)
- Active Only (토글)

---

### 3.2 Add/Edit Form Preset

**경로:** `/admin/presets/forms/new`, `/admin/presets/forms/edit/:id`

**UI 구성:**

#### 좌측: 폼 에디터
1. **Basic Info**
   - Name (required)
   - Description
   - CPT Slug (select)
   - Version (auto-increment)

2. **Field Selection**
   - 왼쪽: Available Fields (ACF 필드 목록)
   - 오른쪽: Selected Fields (드래그로 추가)
   - 각 선택된 필드:
     - Order (드래그로 변경)
     - Section (드롭다운)
     - Required (toggle)
     - Placeholder
     - Help Text

3. **Layout Settings**
   - Columns (1/2/3 선택)
   - Sections (Add Section 버튼)
     - Section Title
     - Collapsible (toggle)

4. **Validation Rules**
   - Add Rule 버튼
   - Rule:
     - Field (select)
     - Type (required/email/url/number/pattern)
     - Message

5. **Submit Behavior**
   - Redirect To (input)
   - Success Message

6. **Permissions**
   - Roles (다중 선택)

#### 우측: Live Preview
- 폼 미리보기 (실시간)
- "Preview in New Tab" 버튼

**CTA:**
- Save as Draft
- Publish
- Export JSON

---

### 3.3 View Presets

**경로:** `/admin/presets/views`

**Add/Edit View Preset:**
`/admin/presets/views/new`, `/admin/presets/views/edit/:id`

**UI 구성:**

1. **Basic Info** (Form Preset와 동일)

2. **Render Settings**
   - Render Mode (list/grid/card/table 라디오 버튼)
   - Grid Columns (renderMode='grid'일 때)

3. **Field Configuration**
   - Available Fields → Selected Fields (드래그)
   - 각 필드:
     - Label (override)
     - Format (text/html/image/date/number/badge)
     - Formatter Settings (조건부)
     - Sortable (toggle)

4. **Pagination**
   - Page Size (number)
   - Show Pagination (toggle)
   - Page Size Selector (toggle)
   - Page Size Options (multi-input)

5. **Filters**
   - Add Filter 버튼
   - Filter:
     - Label
     - Field (select)
     - Type (select/date-range/number-range)
     - Options (조건부)

6. **Search Settings**
   - Enable Search (toggle)
   - Search Fields (다중 선택)
   - Placeholder

7. **Cache Settings**
   - TTL (seconds, number)
   - Strategy (select)
   - Revalidate on Focus (toggle)

8. **Permissions** (동일)

**우측:** Live Preview (그리드/리스트 전환 가능)

---

### 3.4 Template Presets

**경로:** `/admin/presets/templates`

**Add/Edit Template Preset:**
`/admin/presets/templates/new`, `/admin/presets/templates/edit/:id`

**UI 구성:**

#### 메인 영역: Visual Template Builder

**레이아웃 선택:**
- 1-Column
- 2-Column Left Sidebar
- 2-Column Right Sidebar
- 3-Column

**슬롯 에디터:**
각 슬롯(Header/Main/Sidebar/Footer)마다:
- **Add Block** 버튼
- 블록 리스트 (드래그로 순서 변경):
  - Block Name (select from registered blocks)
  - Props (JSON editor 또는 Form)
  - Nested Preset ID (optional, select)
  - Remove Block (X 버튼)

**SEO Settings (사이드바):**
1. **Meta Tags**
   - Title Template (input with variables)
   - Description Field (ACF select)
   - OG Image Field (ACF select)
   - Keywords (tags input)
   - Keywords Field (ACF select, optional)

2. **Schema.org**
   - Type (select: Product/Article/Event/Organization)
   - Field Mapping (JSON editor 또는 Form)
     - Name → field_xxx
     - Description → field_yyy
     - Image → field_zzz

3. **Permissions** (동일)

**우측:** Live Preview (iframe으로 실제 렌더링)

**CTA:**
- Save & Publish
- Preview in New Tab
- Export JSON

---

## 📜 4. Revisions 메뉴 (⭐ 신규)

### 4.1 Preset History

**경로:** `/admin/presets/revisions`

**기능:**
- 모든 프리셋 변경 이력
- Diff View (변경 전후 비교)
- Restore 기능

**테이블 컬럼:**
| 컬럼 | 설명 |
|------|------|
| Preset Type | Form/View/Template |
| Preset Name | 프리셋 이름 |
| Version | v1 → v2 |
| Changed By | 사용자명 |
| Changed At | 변경 시간 |
| Changes | "Added 2 fields, Updated layout" |
| Actions | View Diff/Restore |

**Diff Modal:**
- Side-by-side JSON diff (Monaco Editor)
- Restore 버튼 (confirm dialog)

---

## 🎨 5. UI/UX 가이드라인

### 5.1 공통 컴포넌트

| 컴포넌트 | 사용처 | 라이브러리 |
|----------|--------|-----------|
| JSON Editor | Preset 설정 | Monaco Editor |
| Drag & Drop | 필드 순서, 블록 배치 | @dnd-kit |
| Form Validation | 모든 폼 | React Hook Form + Zod |
| Icon Picker | CPT 아이콘 | Lucide React |
| Color Picker | Badge 색상 매핑 | React Colorful |
| Toast | 성공/에러 메시지 | Sonner |

### 5.2 반응형 브레이크포인트

- Mobile: < 768px (1-column 강제)
- Tablet: 768px ~ 1024px (2-column)
- Desktop: > 1024px (full layout)

### 5.3 다크 모드

- 모든 페이지 다크 모드 지원
- Monaco Editor 테마 자동 전환

---

## 🔐 6. 권한 관리 (RBAC)

### 역할별 접근 권한

| 역할 | CPT 관리 | ACF 관리 | Preset 생성 | Preset 편집 | Revisions |
|------|----------|----------|-------------|-------------|-----------|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Editor** | ❌ | ❌ | ✅ | 본인 것만 | ✅ 조회만 |
| **Seller** | ❌ | ❌ | ❌ | ❌ | ❌ |

**구현:**
- API 레벨에서 `req.user.role` 체크
- Frontend에서 메뉴 숨김 처리

---

## 🧪 7. 테스트 시나리오

### 7.1 CPT 생성 플로우
1. "Add New CPT" 클릭
2. Name: "Product", Slug 자동 생성
3. Supports: title, editor, thumbnail 체크
4. Public: true
5. "Publish" 클릭
6. 성공 메시지 표시
7. "All CPTs" 목록에 추가됨

### 7.2 Form Preset 생성 플로우
1. "Add New Form Preset" 클릭
2. Name: "Product Basic Form"
3. CPT Slug: "product" 선택
4. Available Fields에서 "product_name", "product_price" 드래그
5. Layout: 2 columns 선택
6. Validation Rule 추가: product_price → number
7. "Publish" 클릭
8. Live Preview에서 폼 확인
9. "form_product_basic_v1" ID 자동 생성됨

### 7.3 Template Preset 생성 플로우
1. "Add New Template Preset" 클릭
2. Layout: 2-Column Right Sidebar 선택
3. Main Slot: "custom/product-gallery" 블록 추가
4. Sidebar Slot: "custom/product-price-box" 블록 추가
5. SEO Title Template: "{field_product_name} | My Store"
6. Schema.org Type: "Product" 선택
7. Field Mapping: name → field_product_name
8. "Save & Publish"
9. Live Preview에서 페이지 확인

---

## 📊 8. Analytics & Metrics

### 대시보드 위젯 (Optional)
- CPT별 포스트 수 차트
- Preset 사용 통계
- 최근 수정된 프리셋 목록
- 인기 있는 프리셋 Top 5

---

## 🎯 MVP-A 구현 우선순위

### Phase 1: 기본 CRUD ⭐⭐⭐
- [ ] CPT 목록/생성/편집/삭제
- [ ] ACF Field Groups 목록/생성/편집
- [ ] Form Preset 목록/생성 (JSON Editor만)

### Phase 2: Preset 에디터 ⭐⭐
- [ ] Form Preset Visual Editor
- [ ] View Preset Editor
- [ ] Template Preset Editor (Basic)

### Phase 3: 고급 기능 ⭐
- [ ] Live Preview
- [ ] Revisions
- [ ] Import/Export
- [ ] Drag & Drop

---

## 📖 다음 단계

1. ✅ Admin IA 설계 완료
2. ⏳ UI 와이어프레임 (Figma)
3. ⏳ React 컴포넌트 구현
4. ⏳ API 엔드포인트 연동

---

**승인 필요:**
- [ ] 메뉴 구조 확정
- [ ] Preset Editor UI 승인
- [ ] 권한 관리 정책 확정
