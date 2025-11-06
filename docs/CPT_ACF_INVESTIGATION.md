# CPT/ACF 코드 구조 조사 보고서

**조사 일자:** 2025-11-06
**대상:** o4o-platform 전체 코드베이스
**목적:** CPT(Custom Post Type) 및 ACF(Advanced Custom Fields) 관련 코드 구조 정비를 위한 사전조사

---

## 📊 요약

### 주요 발견사항
- **타입 정의 중복:** 최소 4곳에서 타입이 중복 정의되어 있음
- **서비스 레이어 이중화:** 신규 통합 모듈과 레거시 분리 서비스가 공존
- **데이터 저장 불일치:** JSONB와 개별 레코드 방식이 혼재
- **인덱스 최적화 부족:** JSONB 필드의 부분적 인덱싱만 적용
- **라우팅 중복:** API 라우트가 3곳에서 중복 정의

---

## 1️⃣ 구조 분석 결과

### 📂 CPT 정의 위치

```
apps/api-server/
├── src/models/
│   ├── post.entity.ts          # TypeORM 엔티티 정의
│   ├── post-meta.entity.ts     # 메타 데이터 엔티티
│   └── post-type.entity.ts     # PostType 엔티티
├── src/services/
│   ├── post.service.ts         # 레거시 Post 서비스
│   ├── post-meta.service.ts    # 레거시 메타 서비스
│   └── unified-post.service.ts # 신규 통합 서비스
└── src/types/
    ├── post.types.ts            # Post 타입 정의
    └── acf.types.ts             # ACF 필드 타입

packages/types/
├── src/post.ts                 # 공유 Post 타입
├── src/acf.ts                  # 공유 ACF 타입
└── src/meta.ts                 # 공유 메타 타입

apps/admin-dashboard/
└── src/types/
    ├── post.types.ts            # Admin용 Post 타입 (중복)
    └── acf.types.ts             # Admin용 ACF 타입 (중복)

apps/main-site/
└── src/types/
    └── content.types.ts         # 프론트용 컨텐츠 타입 (중복)
```

### ❌ 구조적 문제점

1. **SSOT(Single Source of Truth) 위반**
   - Post 타입이 4곳에서 각각 정의됨
   - ACF 타입이 3곳에서 중복 정의
   - 메타 필드 타입이 일관성 없음

2. **중앙 등록 로직 부재**
   - CPT 등록이 각 서비스에서 개별적으로 처리
   - 스키마 자동 로드 메커니즘 없음

---

## 2️⃣ ACF 필드 로직 분석

### 🎨 컴포넌트 구조

```
apps/admin-dashboard/src/components/
├── fields/
│   ├── TextField.tsx            # 기본 텍스트 필드
│   ├── SelectField.tsx          # 선택 필드
│   ├── RepeaterField.tsx        # 리피터 필드
│   └── GroupField.tsx           # 그룹 필드
├── legacy-fields/               # 레거시 필드 컴포넌트 (중복)
│   ├── ACFTextField.tsx
│   └── ACFSelectField.tsx
└── form/
    └── DynamicFieldRenderer.tsx # 동적 필드 렌더러
```

### ❌ ACF 로직 문제점

1. **컴포넌트 중복**
   - `fields/`와 `legacy-fields/`에 유사한 컴포넌트 존재
   - Repeater 로직이 3곳에서 각각 구현

2. **직렬화/역직렬화 불일치**
   - JSON.stringify/parse 직접 사용
   - 타입 체크 없는 캐스팅
   - 날짜 필드 처리 불일치

3. **옵션값 타입 관리 부재**
   ```typescript
   // 현재 상태 - 타입 없는 옵션
   const options = field.choices || []

   // 필요한 개선 - 타입 정의
   interface ACFFieldOptions {
     choices?: Choice[]
     defaultValue?: unknown
     placeholder?: string
   }
   ```

---

## 3️⃣ 데이터/성능 분석

### 💾 JSONB 사용 현황

```sql
-- 현재 테이블 구조
CREATE TABLE post_meta (
    id UUID PRIMARY KEY,
    post_id UUID REFERENCES posts(id),
    meta_key VARCHAR(255),
    meta_value JSONB,  -- JSONB 타입 사용
    created_at TIMESTAMP
);

-- 인덱스 현황
CREATE INDEX idx_post_meta_key ON post_meta(meta_key);
-- JSONB GIN 인덱스 누락!
```

### ⚠️ 성능 위험요소

1. **인덱스 부족**
   - JSONB 필드에 GIN 인덱스 없음
   - `meta_value @> '{"field": "value"}'` 쿼리 시 full scan

2. **불필요한 중첩 구조**
   ```json
   // 현재 - 과도한 중첩
   {
     "acf": {
       "fields": {
         "group": {
           "subfield": "value"
         }
       }
     }
   }

   // 개선안 - 평탄화
   {
     "acf_group_subfield": "value"
   }
   ```

3. **쿼리 최적화 부재**
   ```typescript
   // 현재 - N+1 문제
   posts.forEach(post => {
     const meta = await this.getPostMeta(post.id)
   })

   // 필요 - 배치 로드
   const metas = await this.getPostMetaBatch(postIds)
   ```

---

## 4️⃣ 타입 일관성 분석

### 🔀 타입 불일치 사례

| 위치 | Post ID 타입 | Meta 타입 | ACF 타입 |
|------|-------------|-----------|----------|
| API Server | `string \| number` | `any` | `ACFField[]` |
| Admin Dashboard | `number` | `Record<string, unknown>` | `ACFFieldType` |
| Main Site | `string` | `MetaData` | 정의 없음 |
| Packages/types | `UUID` | `JsonValue` | `ACFFieldDefinition` |

### ❌ 타입 관련 문제

1. **이름 불일치**
   - `ACFField` vs `ACFFieldType` vs `ACFFieldDefinition`
   - `PostMeta` vs `MetaData` vs `MetaFields`

2. **반복적 타입 캐스팅**
   ```typescript
   // 여러 곳에서 발견되는 패턴
   const meta = response.data as unknown as PostMeta
   const fields = (meta.acf as any).fields as ACFField[]
   ```

---

## 5️⃣ API-프론트 데이터 교환

### 🔄 현재 데이터 흐름

```
[Admin Dashboard]
    ↓ POST /api/posts (중복 라우트 1)
    ↓ POST /api/v1/posts (중복 라우트 2)
    ↓ POST /posts (중복 라우트 3)
[API Server]
    ↓ 직렬화 불일치
[Database]
    ↓ JSONB vs 개별 레코드
[Main Site]
    ↑ GET /api/posts (타입 불일치)
```

### ❌ 교환 구조 문제

1. **라우트 중복**
   - `/api/posts`, `/api/v1/posts`, `/posts` 모두 존재
   - 버전 관리 전략 부재

2. **응답 형식 불일치**
   ```typescript
   // API Server 응답
   { data: Post[], meta: { total: number } }

   // Admin이 기대하는 형식
   { posts: Post[], pagination: {...} }

   // Main Site이 기대하는 형식
   Post[]
   ```

---

## 6️⃣ 확장성 평가

### 🔧 현재 확장성 한계

1. **CPT 추가 프로세스**
   - 4곳의 타입 정의 수정 필요
   - 3곳의 서비스 로직 추가
   - 2곳의 라우트 등록

2. **영향 범위 파악 어려움**
   - 스키마 변경 시 영향받는 코드 추적 어려움
   - 타입 불일치로 런타임 에러 발생

3. **다국어/테넌트 미지원**
   - i18n 고려 없음
   - tenant_id 구조 없음

---

## 📋 체크리스트 평가 결과

### 구조 분석 ✅
- [❌] CPT 타입 정의가 단일 소스에서 관리되는가? **아니오 - 4곳 분산**
- [❌] 각 CPT별 필드 스키마가 명시적으로 정의되어 있는가? **부분적**
- [❌] 스키마 자동 등록/로드 로직이 존재하는가? **없음**
- [✅] 중복된 CPT 이름 또는 동일 ID가 존재하는가? **있음 - post, page**

### ACF 필드 로직 ✅
- [❌] 필드 렌더 컴포넌트가 한 곳에서 export 되는가? **아니오 - 분산**
- [✅] Repeater, Group 등의 렌더 로직이 중복되어 있는가? **있음 - 3곳**
- [❌] ACF 필드 → DB 저장 시 직렬화 규칙이 일관성 있는가? **없음**
- [❌] ACF 옵션값이 타입으로 관리되는가? **아니오**

### 데이터/성능 ✅
- [❌] JSONB 컬럼 접근에 인덱스가 적용되어 있는가? **부분적**
- [✅] 쿼리시 full-scan 발생 가능성 있는 필드가 있는가? **있음**
- [✅] 불필요한 nested JSON 구조가 존재하는가? **있음**

### 타입/계약 일관성 ✅
- [❌] API와 Front 간 타입 선언이 일치하는가? **아니오**
- [❌] 이름이 일관적인가? **아니오 - 혼재**
- [✅] 타입 캐스팅이 반복되는가? **있음 - 다수**

### 확장성 ✅
- [❌] 새 CPT/ACF 추가 시 중앙 등록 로직이 존재하는가? **없음**
- [❌] 스키마 수정 시 영향 범위가 명확한가? **아니오**
- [❌] 다국어/테넌트 고려 여부? **없음**

---

## 🎯 개선 필요 영역 요약

| 영역 | 현재 상태 | 위험도 | 개선 우선순위 |
|-----|----------|--------|--------------|
| **타입 통합** | 4곳 분산, 불일치 | 🔴 높음 | 1 |
| **JSONB 인덱스** | GIN 인덱스 누락 | 🔴 높음 | 2 |
| **서비스 통합** | 레거시/신규 혼재 | 🟡 중간 | 3 |
| **ACF 컴포넌트** | 중복 구현 | 🟡 중간 | 4 |
| **라우트 정리** | 3중 중복 | 🟢 낮음 | 5 |
| **다국어 지원** | 미구현 | 🟢 낮음 | 6 |

---

## 💡 권장사항

1. **즉시 조치 필요**
   - JSONB GIN 인덱스 추가
   - 타입 정의 통합 시작

2. **단기 개선 (2주)**
   - packages/types를 SSOT로 확립
   - 레거시 서비스 마이그레이션 계획

3. **중기 개선 (1개월)**
   - ACF 컴포넌트 통합
   - 라우트 버전 관리 체계 구축

4. **장기 개선 (3개월)**
   - 다국어/테넌트 구조 설계
   - 스키마 자동 로드 시스템 구현

---

*조사 완료: 2025-11-06*