# IR-HUB-CONTENT-AUTHORSHIP-STRUCTURE-V1

> **Investigation Report**
> WO-O4O-HUB-CONTENT-AUTHORSHIP-STRUCTURE-INVESTIGATION-V1
> Date: 2026-02-23
> Status: Complete

---

## 1. 현재 DB 구조 요약

### cms_contents 테이블

| 필드 | 타입 | 존재 여부 | 용도 |
|------|------|-----------|------|
| `id` | UUID | YES | PK |
| `createdBy` | UUID | YES | 생성자 User ID (감사용) |
| `serviceKey` | VARCHAR(50) | YES | 서비스 스코프 ('glycopharm', 'kpa', 'cosmetics' 등) |
| `organizationId` | UUID | YES | 조직 스코프 (null = 플랫폼 전체) |
| `type` | VARCHAR(50) | YES | 콘텐츠 타입 ('hero', 'notice', 'news', 'featured', 'promo', 'event') |
| `status` | VARCHAR(20) | YES | 생명주기 ('draft' → 'published' → 'archived') |
| `metadata` | JSONB | YES | 확장 데이터 (creatorType, category 등) |
| `isOperatorPicked` | BOOLEAN | YES | 운영자 추천 플래그 |
| `isPinned` | BOOLEAN | YES | 상단 고정 |
| `viewCount` | INT | YES | 조회수 |

### 조사 대상 필드 존재 여부

| 필드 | 존재 | 비고 |
|------|------|------|
| `author_id` | **NO** | `createdBy`가 유사 역할 (UUID만, 역할 미포함) |
| `author_type` | **NO** | `metadata.creatorType`으로 대체 가능하나 스키마 레벨이 아님 |
| `author_role` | **NO** | 존재하지 않음 |
| `created_by_role` | **NO** | 존재하지 않음 |
| `source_service` | **NO** | `serviceKey`가 유사 역할 |
| `visibility_scope` | **NO** | `serviceKey` + `organizationId` 조합으로 추론 |

### 스코프 계층 (3단계)

```
Global:        serviceKey = null,  organizationId = null   → 플랫폼 전체 공지
Service:       serviceKey = 'kpa', organizationId = null   → KPA 전용 콘텐츠
Organization:  serviceKey = any,   organizationId = UUID   → 특정 조직 콘텐츠
```

### metadata.creatorType (JSONB 내부)

```typescript
type ContentSourceType = 'operator' | 'supplier' | 'pharmacist';
```

> **핵심 발견**: 작성자 역할 구분은 **스키마 컬럼이 아닌 JSONB metadata** 안에만 존재한다.
> 따라서 역할 기반 필터링/정렬은 **인덱스 불가**, **SQL WHERE 비효율적**.

---

## 2. API 권한 구조 요약

### CMS Content API 엔드포인트 권한

| Method | Path | Guard | 허용 역할 |
|--------|------|-------|-----------|
| POST | `/api/v1/cms/contents` | `requireAdmin` | platform:admin, platform:super_admin |
| PUT | `/api/v1/cms/contents/:id` | `requireAdmin` | platform:admin, platform:super_admin |
| PATCH | `/api/v1/cms/contents/:id/status` | `requireAdmin` | platform:admin, platform:super_admin |
| GET | `/api/v1/cms/contents` | `optionalAuth` | 모든 사용자 (공개 조회) |
| GET | `/api/v1/cms/contents/:id` | `optionalAuth` | 모든 사용자 |
| POST | `/api/v1/cms/slots` | `requireAdmin` | platform:admin, platform:super_admin |
| PUT | `/api/v1/cms/slots/:id` | `requireAdmin` | platform:admin, platform:super_admin |
| GET | `/api/v1/cms/slots/:slotKey` | `optionalAuth` | 모든 사용자 (공개 조회) |

### 역할별 등록 가능 여부

| 역할 | 등록 가능 | API 경로 | Guard |
|------|-----------|----------|-------|
| platform:admin | **YES** | POST /api/v1/cms/contents | requireAdmin |
| platform:super_admin | **YES** | POST /api/v1/cms/contents | requireAdmin |
| operator (서비스 운영자) | **NO** | - | API 없음 |
| supplier (공급자) | **NO** (CMS 불가) | partnerApi 별도 | 별도 시스템 |
| pharmacist (약사) | **NO** | - | API 없음 |
| user (일반 사용자) | **NO** | - | API 없음 |

### Phase 0 제한

현재 CMS Content API는 `hero`와 `notice` 타입만 생성 가능.
`news`, `featured`, `promo`, `event`는 코드 레벨에서 차단됨.

```typescript
// P0: Only hero and notice types allowed
if (!['hero', 'notice'].includes(type)) {
  return 400 VALIDATION_ERROR;
}
```

### 권한 제어 방식

- JWT role 기반: `requireAdmin` → `platform:admin` 또는 `platform:super_admin`
- scope 기반: 콘텐츠 자체의 `serviceKey` / `organizationId`로 스코프 분리
- 서비스별 role guard: **없음** (예: `glycopharm:operator`로 콘텐츠 생성 불가)

---

## 3. 프론트엔드 노출 구조 요약

### 콘텐츠 작성 UI 존재 여부

| 서비스 | 위치 | 작성 UI | 타입 | 역할 | 비고 |
|--------|------|---------|------|------|------|
| **Admin Dashboard** | `/cms/contents/` | **YES** | Full CMS (Hero, Notice) | Admin | 유일한 중앙 CMS 작성 UI |
| **GlycoPharm** | `/partner/ContentPage.tsx` | YES (별도 시스템) | Text/Image/Link | Supplier | partnerApi (CMS와 별개) |
| **K-Cosmetics** | `/partner/ContentPage.tsx` | YES (별도 시스템) | Text/Image/Link | Supplier | partnerApi (CMS와 별개) |
| **GlucoseView** | `/partner/ContentPage.tsx` | YES (별도 시스템) | Text/Image/Link | Supplier | partnerApi (CMS와 별개) |
| **KPA Society** | `/dashboard/MyContentPage.tsx` | NO (복사 관리만) | - | Operator | Hub에서 복사 후 관리 |
| **Neture** | `/content/` | NO (열람만) | - | Seller | CMS 콘텐츠 브라우징 |

### 콘텐츠 흐름 (현재)

```
Admin Dashboard (작성)
    ↓ POST /api/v1/cms/contents
    ↓ PATCH .../status → published
cms_contents 테이블
    ↓ GET /api/v1/cms/contents (serviceKey 필터)
    ↓ GET /api/v1/cms/slots/:slotKey
HUB 페이지 (KPA, GlycoPharm, K-Cosmetics)
    ↓ "내 매장 복사" (KPA만)
MyContentPage (복사본 관리)
```

### 핵심 발견

1. **Admin Dashboard가 유일한 CMS 콘텐츠 생성 수단**
2. **Partner Content 페이지는 CMS와 별도 시스템** (partnerApi, 별도 테이블)
3. **Operator에게 콘텐츠 작성 UI 없음**
4. **Supplier CMS 콘텐츠 직접 등록 경로 없음** (Partner Content ≠ CMS Content)
5. **KPA만 "복사" 기능 존재** (GlycoPharm, K-Cosmetics는 복사 기능 없음)

---

## 4. 구조적 한계 분석

### 한계 1: Admin 집중 구조

```
현재:  Admin → CMS 등록 → 모든 서비스 HUB에 노출
문제:  Admin 1명이 모든 서비스의 콘텐츠를 직접 등록해야 함
결과:  콘텐츠 생산 병목, 서비스별 자율 운영 불가
```

### 한계 2: 역할 기반 분리 미지원 (스키마 레벨)

- `createdBy`는 UUID만 저장 — **역할 정보 없음**
- `metadata.creatorType`은 JSONB 내부 — **인덱스 불가, 쿼리 비효율적**
- "operator가 작성한 콘텐츠"와 "admin이 작성한 콘텐츠"를 **DB 레벨에서 구분 불가**

### 한계 3: 서비스별 독립 등록 경로 부재

- `requireAdmin` Guard만 존재 — 서비스 운영자용 Guard 없음
- 예: `glycopharm:operator`가 GlycoPharm 전용 콘텐츠를 등록할 API 없음
- 서비스별 콘텐츠 등록은 Admin에게 요청해야 함

### 한계 4: Supplier → CMS 연결 부재

- Partner Content (partnerApi)와 CMS Content는 **완전히 별도 시스템**
- Supplier가 partnerApi로 등록한 콘텐츠는 **HUB에 노출되지 않음**
- Supplier → CMS 승인 파이프라인 없음

### 한계 5: Phase 0 타입 제한

- `hero`와 `notice`만 생성 가능
- `news`, `featured`, `promo`, `event`는 코드 레벨에서 차단
- HUB 콘텐츠 다양성 제한

---

## 5. 판단 질문 답변

### Q1. 운영자 콘텐츠 책임 — 현재 구조

> **현재: A안 (admin이 중앙 통제)**

- 모든 CMS 콘텐츠는 `requireAdmin` Guard 뒤에 있음
- Operator/Service 운영자에게 등록 API 없음
- `serviceKey`로 서비스 분리는 가능하지만 **등록 권한이 admin에 집중**

### Q2. 공급자 콘텐츠 등록 구조 — 현재 구조

> **현재: 해당 없음 (A/B/C 어디에도 해당하지 않음)**

- Supplier는 partnerApi로 별도 콘텐츠를 등록하지만 CMS와 무관
- CMS에 직접 등록 불가
- Admin 승인 파이프라인도 없음
- **Supplier 콘텐츠 → HUB 연결 경로 자체가 존재하지 않음**

### Q3. 구조적 한계 — 요약

| 항목 | 상태 |
|------|------|
| 역할 기반 분리 | **미지원** (스키마 레벨 author_role 없음) |
| 서비스 기반 필터 | **부분 지원** (serviceKey 있으나 등록 권한 미분리) |
| 작성자 구분 | **JSONB만** (metadata.creatorType, 인덱스 불가) |
| Supplier→CMS 파이프라인 | **없음** |
| Operator 등록 API | **없음** |
| 타입 다양성 | **Phase 0 제한** (hero, notice만) |

---

## 6. 개선 방향 제안 (구조 중심, UI 제외)

### 방향 A: Operator 등록 권한 확장 (최소 변경)

```
변경점:
1. API Guard 추가: requireServiceOperator(serviceKey)
2. 기존 POST /api/v1/cms/contents에 operator 역할 허용
3. serviceKey 강제 바인딩 (operator는 자기 서비스만)
4. createdBy + metadata.creatorType 자동 설정

장점: DB 변경 없음, API Guard만 추가
단점: 스키마 레벨 author 추적 불가
```

### 방향 B: Author 컬럼 추가 (중간 변경)

```
변경점:
1. cms_contents에 author_role VARCHAR(20) 컬럼 추가
2. 인덱스 추가: [serviceKey, author_role, status]
3. API Guard: operator 허용 + author_role 자동 저장
4. 조회 시 author_role 필터 가능

장점: 역할 기반 필터 효율적, 감사 추적 강화
단점: CMS Core 스키마 변경 필요 (Core 동결 정책 검토)
```

### 방향 C: Supplier → CMS 승인 파이프라인 (대규모 변경)

```
변경점:
1. cms_contents에 approval_status 추가 ('pending', 'approved', 'rejected')
2. Supplier 전용 API: POST /api/v1/cms/supplier/contents
3. Admin/Operator 승인 API: PATCH .../approve
4. 승인 후 자동 published 전환

장점: 다중 출처 콘텐츠 생태계 구축
단점: 대규모 스키마/API/UI 변경, CMS Core Freeze 해제 필요
```

### 권장 순서

```
1단계: 방향 A (Operator 등록 권한 확장) — 즉시 가능
2단계: 방향 B (Author 컬럼) — WO + IR 후 승인 시
3단계: 방향 C (Supplier 파이프라인) — 로드맵 수준
```

---

## 7. 파일 위치 참조

| 구성요소 | 경로 |
|----------|------|
| CmsContent Entity | `packages/cms-core/src/entities/CmsContent.entity.ts` |
| CmsContentSlot Entity | `packages/cms-core/src/entities/CmsContentSlot.entity.ts` |
| Content Types | `packages/types/src/content.ts` |
| CMS Content Routes | `apps/api-server/src/routes/cms-content/cms-content.routes.ts` |
| Auth Middleware | `apps/api-server/src/common/middleware/auth.middleware.ts` |
| ContentQueryService | `apps/api-server/src/modules/content/content-query.service.ts` |
| Admin CMS UI | `apps/admin-dashboard/src/pages/cms/contents/` |
| Partner Content (GlycoPharm) | `services/web-glycopharm/src/pages/partner/ContentPage.tsx` |
| Partner Content (K-Cosmetics) | `services/web-k-cosmetics/src/pages/partner/ContentPage.tsx` |
| KPA MyContent Dashboard | `services/web-kpa-society/src/pages/dashboard/MyContentPage.tsx` |
| Neture Content Browse | `services/web-neture/src/pages/content/` |

---

## 8. 결론

현재 O4O CMS Content 시스템은 **Admin 단일 생산 구조**이다.

- **Operator**는 콘텐츠를 생성할 수 없고, Hub에서 복사만 가능(KPA만)
- **Supplier**는 partnerApi로 별도 콘텐츠를 관리하지만 CMS/HUB와 연결되지 않음
- **역할 기반 분리**는 JSONB metadata에만 존재하여 쿼리 효율성과 감사 추적에 한계
- **serviceKey 기반 스코프**는 조회에서 작동하지만, 등록 권한에서는 미분리

HUB가 **"다중 출처 콘텐츠 집합체"** 가 되려면,
최소한 **Operator 등록 권한 확장(방향 A)** 이 선행되어야 한다.

---

*Investigation completed: 2026-02-23*
*Investigator: Claude (AI-assisted code analysis)*
