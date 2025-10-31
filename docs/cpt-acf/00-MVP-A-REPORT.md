# 🧩 CPT/ACF MVP-A 작업 결과 보고

**보고일:** 2025-10-31
**작업자:** 로컬 에이전트 (Claude)
**작업 유형:** 분석 및 설계 (Phase 0 - Planning)
**프로젝트:** O4O Platform - CPT/ACF 시스템 개선

---

## 📋 작업 요약

### 수행한 작업
1. ✅ CPT/ACF 시스템 현황 파악
2. ✅ 프리셋 기반 아키텍처 설계
3. ✅ 상세 스키마 명세서 작성
4. ✅ Admin UI IA (Information Architecture) 설계

### 생성된 산출물
```
docs/cpt-acf/
├── 00-MVP-A-REPORT.md          # 본 보고서
├── 01-current-status.md         # 현황 분석
├── 02-mvp-a-plan.md            # MVP-A 계획
├── 03-presets-spec.md          # 프리셋 스키마 명세
└── 04-admin-ia.md              # Admin 메뉴 구조
```

---

## 🔍 1. 현황 분석 결과

### ✅ 구현 완료 사항
- **Entity Layer**: CustomPostType, CustomPost, ACFFieldGroup, ACFField 엔티티 존재
- **Service Layer**: CPT/ACF CRUD 로직 구현 완료
- **API Layer**: REST API 엔드포인트 정상 작동
- **위치**: `apps/api-server/src/modules/cpt-acf/`

### ❌ 미구현 핵심 기능
- **Preset 시스템**: FormPreset, ViewPreset, TemplatePreset 부재
- **Admin UI**: CPT/ACF 전용 관리 화면 없음
- **블록/숏코드 통합**: presetId 기반 통일 인터페이스 없음
- **캐싱 전략**: ViewPreset 단위 캐시 미적용

### 📊 기술 부채
- 블록과 숏코드가 각각 독립적으로 API fetching (중복 코드)
- ACF 필드 정의와 렌더링 로직 분산
- 버전 관리 부재 (변경 이력 추적 불가)

---

## 🎯 2. 설계 완료 사항

### 2.1 프리셋 시스템 아키텍처

**핵심 원칙:** "정의는 한 곳(SSOT), 사용은 어디서나(Preset ID)"

```
[Preset DB Tables] ← SSOT (Single Source of Truth)
    ├─ form_presets
    ├─ view_presets
    └─ template_presets
        ↓
[Preset Service Layer]
        ↓
[Presentation Layer]
    ├─ Admin UI (Form/View/Template Editors)
    ├─ Blocks (presetId prop)
    └─ Shortcodes ([cpt_form preset="xxx"])
```

---

### 2.2 프리셋 타입 정의

#### FormPreset (폼 레이아웃)
- **용도**: CPT 데이터 입력 폼
- **구성**: 필드 배치, 검증 규칙, 조건부 로직
- **예시**: `form_product_basic_v1`

```typescript
interface FormPreset {
  id: string;                    // preset ID
  name: string;
  cptSlug: string;
  version: number;
  fields: FieldConfig[];         // ACF 필드 참조
  layout: { columns, sections };
  validation: ValidationRule[];
  submitBehavior: {};
  roles?: string[];
}
```

#### ViewPreset (뷰 템플릿)
- **용도**: CPT 데이터 목록/그리드 표시
- **구성**: 렌더 모드, 필터, 정렬, 페이지네이션, 캐싱
- **예시**: `view_product_grid_v1`

```typescript
interface ViewPreset {
  id: string;
  renderMode: 'list' | 'grid' | 'card' | 'table';
  fields: ViewField[];
  pagination: {};
  filters?: FilterConfig[];
  cache?: {
    ttl: number;
    strategy: 'stale-while-revalidate' | 'cache-first';
  };
}
```

#### TemplatePreset (페이지 템플릿)
- **용도**: 단일 포스트 상세 페이지
- **구성**: Header/Main/Sidebar/Footer 슬롯, SEO, Schema.org
- **예시**: `template_product_single_v1`

```typescript
interface TemplatePreset {
  id: string;
  layout: {
    header?: SlotConfig;
    main: SlotConfig;
    sidebar?: SlotConfig;
    footer?: SlotConfig;
  };
  seoMeta: {
    titleTemplate: string;
    descriptionField?: string;
    ogImageField?: string;
  };
  schemaOrg?: {
    type: 'Product' | 'Article' | 'Event';
    fieldMapping: Record<string, string>;
  };
}
```

---

### 2.3 DB 스키마 설계

```sql
-- 3개의 프리셋 테이블
CREATE TABLE form_presets (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  cpt_slug VARCHAR(100),
  config JSONB,           -- 모든 설정을 JSONB로 저장
  version INT DEFAULT 1,
  roles TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  created_by UUID,
  FOREIGN KEY (cpt_slug) REFERENCES custom_post_types(slug)
);

-- view_presets, template_presets 동일 구조
```

**장점:**
- 버전 관리 용이
- RBAC 적용 가능
- 실시간 변경 반영
- JSONB로 유연한 스키마

---

### 2.4 Admin UI 구조

```
CPT & ACF 📦
├─ Custom Post Types 📝
│   ├─ All CPTs
│   ├─ Add New
│   └─ Settings
├─ ACF Fields 🔧
│   ├─ Field Groups
│   ├─ Add Field Group
│   └─ Import/Export
├─ Presets ⚙️ ⭐ 신규
│   ├─ Form Presets
│   │   ├─ All Form Presets
│   │   └─ Add New Form Preset
│   ├─ View Presets
│   │   ├─ All View Presets
│   │   └─ Add New View Preset
│   └─ Template Presets
│       ├─ All Template Presets
│       └─ Add New Template Preset
└─ Revisions 📜 ⭐ 신규
    └─ Preset History
```

**핵심 UI 컴포넌트:**
- JSON Editor (Monaco Editor)
- Drag & Drop (필드 순서, 블록 배치)
- Live Preview (실시간 미리보기)
- Diff Viewer (변경 이력 비교)

---

## 🎯 3. 다음 단계 (구현 로드맵)

### Phase 1: 기초 인프라 (우선순위 ⭐⭐⭐)
**예상 기간:** 3-5일

- [ ] Preset 엔티티 생성 (TypeORM)
  - `FormPreset.ts`
  - `ViewPreset.ts`
  - `TemplatePreset.ts`
- [ ] Migration 파일 작성
  - `Create-Preset-Tables.ts`
- [ ] Preset Service 구현
  - `preset.service.ts` (CRUD 로직)
- [ ] Preset Controller & Routes
  - `/api/v1/presets/forms`
  - `/api/v1/presets/views`
  - `/api/v1/presets/templates`

**완료 기준:**
- Preset CRUD API 정상 작동
- Postman으로 테스트 가능
- TypeScript 타입 안전성 확보

---

### Phase 2: Admin UI 골격 (우선순위 ⭐⭐)
**예상 기간:** 5-7일

- [ ] Admin 메뉴 추가
  - `apps/admin-dashboard/src/routes/` 에 CPT/ACF 라우트 추가
- [ ] Preset 목록 페이지
  - Form Presets List
  - View Presets List
  - Template Presets List
- [ ] Preset 생성/편집 페이지 (Basic JSON Editor)
  - Monaco Editor 통합
  - CRUD API 연동

**완료 기준:**
- Admin에서 Preset JSON 직접 편집 가능
- 생성/수정/삭제 정상 작동
- 역할별 권한 제어 적용

---

### Phase 3: 블록/숏코드 통합 (우선순위 ⭐⭐⭐)
**예상 기간:** 3-4일

- [ ] React Hook 생성
  - `usePreset(presetId)` - Preset 데이터 fetching
  - TanStack Query 적용
- [ ] 블록 Props 리팩터링
  - 기존 블록에 `presetId` prop 추가
  - `usePreset()` 훅 사용
- [ ] 숏코드 파서 수정
  - `[cpt_form preset="xxx"]` 지원
  - `[cpt_view preset="xxx"]` 지원
  - `[cpt_template preset="xxx" post_id="123"]` 지원

**완료 기준:**
- 블록과 숏코드 모두 동일한 presetId로 동작
- 캐시 적용 (TanStack Query)
- 중복 코드 제거 확인

---

### Phase 4: 캐싱 전략 (우선순위 ⭐)
**예상 기간:** 2-3일

- [ ] TanStack Query 설정
  - `queryClient` 설정
  - `stale-while-revalidate` 전략
- [ ] ViewPreset 캐시 TTL 적용
  - `cache.ttl` 필드 활용
  - `revalidateOnFocus` 설정
- [ ] ISR 지원 (Next.js)
  - `getStaticProps` revalidate 옵션

**완료 기준:**
- API 호출 50% 감소 (캐시 히트율)
- TTL 동작 확인
- Network 탭에서 캐시 확인

---

### Phase 5: Storage Adapter (우선순위 ⭐)
**예상 기간:** 2일

- [ ] `IStorageAdapter` 인터페이스 정의
  ```typescript
  interface IStorageAdapter {
    upload(file: Buffer, path: string): Promise<string>;
    delete(path: string): Promise<void>;
    getSignedUrl(path: string): Promise<string>;
  }
  ```
- [ ] `LocalStorageAdapter` 구현 (현재)
- [ ] `GCSAdapter` 스텁 생성 (미래 대비)

**완료 기준:**
- 로컬 파일 업로드 정상 작동
- GCS Adapter 인터페이스만 준비

---

### Phase 6: Visual Editors (우선순위 ⭐)
**예상 기간:** 10-14일 (고급 기능)

- [ ] Form Preset Visual Editor
  - Drag & Drop 필드 배치
  - Live Preview
- [ ] View Preset Visual Editor
  - 렌더 모드 선택 UI
  - 필터 설정 UI
- [ ] Template Preset Visual Builder
  - 슬롯 기반 블록 배치
  - SEO 설정 UI

**완료 기준:**
- JSON Editor 없이도 Preset 생성 가능
- Live Preview 정상 작동
- UX 테스트 완료

---

## ✅ 4. 완료 기준 (Definition of Done)

### 기능 요구사항
- [ ] 새 CPT 생성 후 Form/View/Template 프리셋 각 1개 이상 등록 가능
- [ ] 블록과 숏코드 모두 `presetId`로 동일 데이터 렌더링
- [ ] TemplatePreset의 SEO 메타 필드 정상 적용 (OG 태그, Schema.org)
- [ ] ViewPreset 캐시 동작 (TTL 60초 테스트)
- [ ] Admin UI에서 Preset CRUD 가능

### 기술 요구사항
- [ ] TypeScript 타입 안전성 (`any` 사용 금지)
- [ ] 모든 Preset에 `version` 필드 포함
- [ ] Migration 파일 롤백 가능 (`down` 메서드 구현)
- [ ] API 응답 시간 < 200ms (캐시 적용 시)
- [ ] 에러 핸들링 (try-catch, 사용자 친화적 메시지)

### 테스트 요구사항
- [ ] Unit Test: Preset Service CRUD
- [ ] Integration Test: API 엔드포인트
- [ ] E2E Test: Admin UI에서 Preset 생성 플로우
- [ ] 캐시 TTL 동작 테스트

---

## 📊 5. 성공 지표 (KPI)

| 지표 | 현재 | 목표 | 측정 방법 |
|------|------|------|-----------|
| **Preset 재사용률** | 0% (없음) | 80% 이상 | 블록/숏코드 사용 통계 |
| **API 호출 감소** | 기준값 | 50% 감소 | TanStack Query 캐시 히트율 |
| **Admin UI 완성도** | 0% | 100% | Form/View/Template 모두 CRUD 가능 |
| **코드 중복 제거** | 많음 | 최소화 | 블록/숏코드 공통 로직 통합 |
| **문서화** | 부분적 | 완전 | 모든 Preset 타입 스키마 문서화 |

---

## 💡 6. 개선 제안

### 단기 (MVP-A 범위)
1. **Preset ID 자동 생성 규칙 강화**
   - 현재: `form_xxx_v1` (수동)
   - 제안: `{type}_{cptSlug}_{name}_{version}` (자동)
   - 예: `form_product_basic_v1`

2. **Preset 버전 충돌 방지**
   - 동일 이름 Preset 생성 시 자동 버전 증가
   - 또는 "Copy of XXX" 형태로 이름 변경

3. **Preset 사용 통계**
   - 각 Preset이 얼마나 자주 사용되는지 추적
   - 인기 Preset Top 5 대시보드 위젯

### 장기 (MVP-B 이후)
1. **Preset Marketplace**
   - 커뮤니티에서 공유 가능한 Preset 저장소
   - Import/Export JSON

2. **A/B Testing**
   - 동일 CPT에 대한 여러 View Preset 성능 비교

3. **AI 기반 Preset 추천**
   - CPT 타입에 맞는 Preset 자동 제안

---

## 🔗 7. 참고 문서

### 작성된 문서
- `01-current-status.md` - CPT/ACF 현황 분석
- `02-mvp-a-plan.md` - MVP-A 계획 및 목표
- `03-presets-spec.md` - 프리셋 스키마 상세 명세
- `04-admin-ia.md` - Admin UI 구조 및 UX

### 관련 코드
```
apps/api-server/src/
├── entities/
│   ├── CustomPostType.ts
│   ├── CustomPost.ts
│   ├── ACFFieldGroup.ts
│   └── ACFField.ts
└── modules/cpt-acf/
    ├── controllers/
    ├── services/
    ├── routes/
    └── repositories/
```

---

## 🚨 8. 발견된 이슈

### 설계 단계 이슈
1. **Preset 순환 참조 가능성**
   - TemplatePreset → ViewPreset → FormPreset → TemplatePreset
   - **해결책**: Preset depth 제한 (최대 3단계)

2. **JSONB 스키마 검증 부재**
   - DB에 잘못된 JSON 저장 가능
   - **해결책**: Zod 스키마 검증 추가

3. **Preset 삭제 시 참조 무결성**
   - Preset A가 Preset B를 참조하는 경우 B 삭제 불가
   - **해결책**: CASCADE DELETE 또는 경고 메시지

### 기술 부채
1. **ACF 필드 key 관리**
   - 현재 `field_xxx` 형태로 하드코딩
   - **제안**: ACF 필드 Registry 서비스 생성

2. **블록 렌더링 성능**
   - 중첩 Preset 로딩 시 N+1 문제 가능
   - **제안**: DataLoader 패턴 적용

---

## 🎯 9. 다음 승인 필요 사항

### 설계 승인
- [ ] Preset 스키마 최종 확정 (`03-presets-spec.md`)
- [ ] DB 테이블 구조 승인 (JSONB vs 개별 컬럼)
- [ ] Admin UI IA 승인 (`04-admin-ia.md`)

### 기술 선택 승인
- [ ] Storage: DB 테이블 vs JSON 파일
- [ ] Cache: TanStack Query vs Redis
- [ ] Editor: Monaco Editor vs CodeMirror

### 우선순위 승인
- [ ] Phase 1~6 순서 확정
- [ ] MVP-A 범위 최종 확정 (Visual Editors 포함 여부)

---

## 📝 10. 작업 로그

### 2025-10-31
- ✅ **09:00-10:00** CPT/ACF 코드베이스 분석
  - `apps/api-server/src/modules/cpt-acf/` 구조 파악
  - Entity/Service/Controller 계층 확인
- ✅ **10:00-11:00** 현황 분석 문서 작성 (`01-current-status.md`)
- ✅ **11:00-12:30** MVP-A 계획 수립 (`02-mvp-a-plan.md`)
- ✅ **12:30-14:00** 프리셋 스키마 설계 (`03-presets-spec.md`)
  - FormPreset, ViewPreset, TemplatePreset 타입 정의
  - DB 스키마 작성
  - JSON 예시 작성
- ✅ **14:00-15:30** Admin IA 설계 (`04-admin-ia.md`)
  - 메뉴 구조 설계
  - UI/UX 가이드라인 작성
  - 테스트 시나리오 작성
- ✅ **15:30-16:00** 작업 결과 보고서 작성 (본 문서)

---

## ✅ 결론

### 달성 사항
1. ✅ CPT/ACF 시스템 전체 현황 파악 완료
2. ✅ 프리셋 기반 아키텍처 설계 완료
3. ✅ 상세 스키마 및 DB 설계 문서화 완료
4. ✅ Admin UI 구조 설계 완료
5. ✅ 구현 로드맵 수립 완료

### 다음 실행 사항
1. **PM/팀장 승인 대기**
   - 설계 문서 검토
   - MVP-A 범위 최종 확정
   - 우선순위 조정

2. **Phase 1 구현 준비**
   - Entity 파일 생성 준비
   - Migration 파일 작성 준비
   - Service/Controller 골격 코드 준비

3. **개발 환경 설정**
   - TypeORM 설정 확인
   - Monaco Editor 설치 (`npm install @monaco-editor/react`)
   - TanStack Query 설정 확인

---

**작업 상태:** ✅ **Planning Phase 완료**
**다음 단계:** ⏸️ **승인 대기 → Phase 1 구현 시작**

---

**보고자:** 로컬 에이전트 (Claude)
**보고일시:** 2025-10-31 16:00
