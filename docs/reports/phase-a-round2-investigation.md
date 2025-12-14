# Phase A Round 2: CMS Core Assessment - Deep Investigation

**Date**: 2025-12-14
**Status**: Completed

---

## Executive Summary

Phase A Round 2에서는 CMS Core 통합 가능성을 평가하기 위해 실제 코드베이스의 CPT/ACF 구조를 심층 분석했습니다. 분석 결과, 현재 플랫폼은 일관된 패턴을 따르고 있으나 몇 가지 표준화가 필요한 영역이 확인되었습니다.

---

## 1. Product CPT 구조 비교

### 1.1 Dropshipping-Core (Core App)

| Entity | 역할 | 주요 필드 | 확장 방식 |
|--------|------|-----------|-----------|
| **ProductMaster** | 상품 마스터 | name, sku, productType, attributes (JSONB) | productType enum 분기 |
| **SupplierProductOffer** | 공급가격/재고 | productId, costPrice, supplyPrice, stock | attributes JSONB |
| **SellerListing** | 판매 채널 등록 | offerId, sellerPrice, channel | metadata JSONB |

**ProductType Enum**:
```typescript
GENERAL | COSMETICS | FOOD | HEALTH | PHARMACEUTICAL | INDUSTRIAL | ELECTRONICS | FASHION | OTHER
```

### 1.2 Dropshipping-Cosmetics (Extension)

| Entity | 역할 | 확장 대상 |
|--------|------|-----------|
| **CosmeticsCategory** | 화장품 카테고리 분류 | 독립 Entity |
| **CosmeticsBrand** | 브랜드 정보 | 독립 Entity |
| **CosmeticsIngredient** | 성분 정보 | 독립 Entity |

**확장 패턴**: `extendsCPT: ['ds_product']` - ProductMaster.attributes JSONB에 화장품 메타데이터 저장

### 1.3 Health-Extension (Extension)

**확장 패턴**: Type-only (Entity 없음)

```typescript
// HealthMetadata Interface
interface HealthMetadata {
  nutritionInfo?: NutritionInfo[];
  functionDescription: string;
  intakeMethod: string;
  healthCategory: HealthCategory;
  expirationDate: Date;
  certifications?: HealthCertification[];
}
```

- Entity를 만들지 않고 ProductMaster.attributes에 HealthMetadata 저장
- 가장 경량화된 Extension 패턴

### 1.4 E-commerce Core

| Entity | 역할 | 핵심 필드 |
|--------|------|-----------|
| **EcommerceOrder** | 판매 원장 | orderType, status, totalAmount, buyerId, sellerId |
| **EcommerceOrderItem** | 주문 상품 | orderId, quantity, unitPrice |
| **EcommercePayment** | 결제 정보 | orderId, paymentMethod, status |

**OrderType Enum**:
```typescript
RETAIL | DROPSHIPPING | B2B | SUBSCRIPTION
```

### 1.5 Product CPT 분석 결론

| 패턴 | 사용처 | 장점 | 단점 |
|------|--------|------|------|
| **attributes JSONB** | ProductMaster | 스키마 변경 불필요 | 타입 안전성 약함 |
| **독립 Entity** | CosmeticsCategory/Brand | 타입 안전, 관계 명확 | 스키마 추가 필요 |
| **Type-only** | Health-Extension | 가장 가벼움 | 쿼리 최적화 어려움 |

---

## 2. Member CPT 구조 비교

### 2.1 Platform User (api-server)

```
apps/api-server/src/modules/auth/entities/User.ts
```

| 필드 | 타입 | 용도 |
|------|------|------|
| email | string | 로그인 ID |
| password | string | bcrypt hash |
| name, firstName, lastName | string | 표시 이름 |
| phone | string | 연락처 |
| role (deprecated) | enum | Legacy 역할 |
| dbRoles | Role[] | RBAC 역할 |
| activeRole | Role | 현재 활성 역할 |
| status | enum | PENDING/ACTIVE/SUSPENDED |
| businessInfo | JSON | 사업자 정보 |

### 2.2 Organization-Core

| Entity | 역할 | 핵심 필드 |
|--------|------|-----------|
| **Organization** | 조직 계층 | type (national/division/branch), level, path |
| **OrganizationMember** | 조직 멤버십 | userId, organizationId, role, isPrimary |
| **RoleAssignment** | RBAC 권한 | userId, role, scopeType, scopeId |

**Organization Type**:
- national (본부, level=0)
- division (지부, level=1)
- branch (분회, level=2)

### 2.3 Membership-Yaksa (Extension)

| Entity | 역할 | 핵심 필드 |
|--------|------|-----------|
| **Member** | 약사 회원 | userId, licenseNumber, pharmacistType, officialRole |
| **Affiliation** | 다중 소속 | memberId, organizationId, position, isPrimary |
| **MemberCategory** | 회원 분류 | name, requiresAnnualFee, annualFeeAmount |
| **MembershipYear** | 연도별 회비 | memberId, year, paid |
| **Verification** | 자격 인증 | memberId, status, verifiedAt |

**PharmacistType**:
```typescript
'working' | 'owner' | 'hospital' | 'public' | 'industry' | 'retired' | 'other'
```

**OfficialRole**:
```typescript
'president' | 'vice_president' | 'general_manager' | 'auditor' | 'director' | 'branch_head' | 'district_head' | 'none'
```

### 2.4 Member 구조 분석 결론

#### 필드 중복 현황

| 필드 | User | Member | 비고 |
|------|------|--------|------|
| phone | O | O | 중복 |
| email | O | O | 중복 |
| name | O | O | 중복 |
| isActive | O | O | 중복 |

#### 관계 구조

```
User (Platform)
  ├── OrganizationMember (organization-core) ─→ Organization
  │     └── role: admin | manager | member | moderator
  │
  └── Member (membership-yaksa)
        ├── Affiliation ─→ Organization (다중 소속)
        │     └── position: 회장, 부회장, 총무...
        └── MemberCategory, MembershipYear, Verification
```

#### 권고 사항

1. **필드 중복 해소**: Member.phone/email은 User 참조로 대체 검토
2. **관계 통합**: OrganizationMember ↔ Affiliation 역할 명확화
3. **RBAC 완료**: User.role deprecated 완전 제거

---

## 3. Health/DiabetesCare CPT 구조 비교

### 3.1 Health-Extension (Type-only 패턴)

- **Entity 없음**: HealthMetadata interface만 정의
- **확장 방식**: ProductMaster.attributes에 저장
- **Manifest 선언**: `extendsCPT: ['ds_product']`

### 3.2 Diabetes-Core (Full Entity 패턴)

| Entity | 역할 | 주요 필드 |
|--------|------|-----------|
| **CGMSession** | 센서 세션 | userId, deviceType, startDate, endDate |
| **CGMReading** | 개별 측정값 | sessionId, glucoseValue, trend, quality |
| **CGMEvent** | 저/고혈당 이벤트 | sessionId, eventType, severity |
| **DailyMetrics** | 일별 집계 | userId, date, avgGlucose, tir |
| **PatternAnalysis** | 패턴 분석 | userId, patternType, occurrences |
| **CoachingSession** | 코칭 세션 | userId, pharmacyId, scheduledAt |
| **CoachingMessage** | 코칭 메시지 | sessionId, content, sentBy |
| **DiabetesReport** | 리포트 | userId, summaryMetrics, recommendations |

### 3.3 아키텍처 비교

| 패턴 | 사용처 | 특징 | 적합한 경우 |
|------|--------|------|-------------|
| **Type-only** | health-extension | Entity 없음, metadata만 | 단순 확장, 필드 추가 |
| **Full Entity** | diabetes-core | 완전한 도메인 모델 | 복잡한 비즈니스 로직 |

---

## 4. Navigation & Template 매핑 구조 비교

### 4.1 현재 사용 중인 패턴

#### Pattern A: menus.admin (가장 일반적)

```typescript
menus: {
  admin: [{
    id: 'dropshipping',
    label: 'Dropshipping',
    icon: 'truck',
    order: 30,
    parent?: 'parent-id',  // 부모 메뉴 ID
    children: [{
      id: 'dropshipping-dashboard',
      label: '대시보드',
      path: '/admin/dropshipping',
      icon: 'layout-dashboard',
    }]
  }]
}
```

**사용처**: dropshipping-core, forum-yaksa, forum-cosmetics, health-extension

#### Pattern B: navigation.admin (cms-core)

```typescript
navigation: {
  admin: [{
    id: 'cms-core.cms',
    label: 'CMS',
    path: '/admin/cms',
    icon: 'layout',
    parentId: 'parent.id',  // parentId 사용
    order: 5,
  }]
}
```

**사용처**: cms-core

#### Pattern C: viewTemplates (cms-core)

```typescript
viewTemplates: [{
  viewId: 'templates-list',
  route: '/admin/cms/templates',
  title: '템플릿 목록',
  type: 'list',
  layout: 'admin',
  auth: true,
}]
```

### 4.2 패턴 불일치 사항

| 항목 | Pattern A | Pattern B | 권고 |
|------|-----------|-----------|------|
| 부모 참조 | `parent` | `parentId` | 통일 필요 |
| 중첩 구조 | `children[]` 배열 | flat + parentId | 통일 필요 |
| 위치 | `menus.admin` | `navigation.admin` | 통일 필요 |

### 4.3 권고 사항

1. **표준 패턴 선정**: menus.admin을 표준으로 채택 (더 많이 사용)
2. **cms-core 마이그레이션**: navigation → menus 변환
3. **viewTemplates 유지**: 라우트-뷰 매핑용으로 별도 유지

---

## 5. ACF Fieldset 비교

### 5.1 DB 기반 ACF (cms-core)

#### CmsAcfFieldGroup Entity

```typescript
@Entity('cms_acf_field_groups')
class CmsAcfFieldGroup {
  organizationId: string;
  key: string;           // 고유 키
  title: string;         // 표시 제목
  location: Record[];    // 표시 위치 규칙
  position: string;      // normal, side, acf_after_title
}
```

#### CmsAcfField Entity

```typescript
@Entity('cms_acf_fields')
class CmsAcfField {
  fieldGroupId: string;
  parentFieldId?: string;  // 중첩 필드용
  key: string;
  label: string;
  type: string;            // text, select, repeater, etc.
  choices: Record[];       // select, checkbox용
  conditionalLogic: Record; // 조건부 표시
}
```

### 5.2 Manifest 기반 ACF (Extensions)

```typescript
// forum-yaksa manifest
acf: [{
  groupId: 'pharmacy_meta',
  label: '약물 메타데이터',
  fields: [
    { key: 'drugName', type: 'string', label: '약물명' },
    { key: 'drugCode', type: 'string', label: '약물 코드 (EDI)' },
    { key: 'category', type: 'select', label: '카테고리',
      options: ['복약지도', '부작용', '상호작용', '조제'] },
    { key: 'severity', type: 'select', label: '중요도',
      options: ['일반', '주의', '경고'] },
    { key: 'caseStudy', type: 'boolean', label: '케이스 스터디' },
  ],
}],

extendsCPT: [{
  name: 'forum_post',
  acfGroup: 'pharmacy_meta',
}],
```

### 5.3 forum-cosmetics ACF 예시

```typescript
acf: [{
  groupId: 'cosmetics_meta',
  label: 'Cosmetics Metadata',
  fields: [
    { key: 'skinType', type: 'select', label: '피부 타입',
      options: ['건성', '지성', '복합성', '민감성', '중성'] },
    { key: 'concerns', type: 'multiselect', label: '피부 고민',
      options: ['모공', '미백', '주름', '탄력', '여드름', '홍조'] },
    { key: 'brand', type: 'text', label: '브랜드' },
    { key: 'rating', type: 'number', label: '평점', min: 1, max: 5 },
    { key: 'ingredients', type: 'multiselect', label: '주요 성분',
      options: ['레티놀', '비타민C', '나이아신아마이드', '히알루론산'] },
  ],
}],
```

### 5.4 ACF 패턴 분석

| 패턴 | 저장 위치 | 장점 | 단점 |
|------|-----------|------|------|
| **DB 기반** | cms_acf_* 테이블 | 런타임 수정 가능, UI 편집 | 마이그레이션 필요 |
| **Manifest 기반** | 코드 내 선언 | 배포 시 확정, 버전 관리 | 런타임 수정 불가 |

### 5.5 권고 사항

1. **Dual Pattern 유지**: 각각의 장점이 있으므로 병행 사용
2. **Manifest → DB 동기화**: 앱 설치 시 manifest ACF를 DB에 등록
3. **Priority 규칙**: DB에 동일 key 있으면 DB 우선 (커스터마이징 보존)

---

## 6. 종합 결론 및 권고

### 6.1 현재 아키텍처 평가

| 영역 | 상태 | 점수 |
|------|------|------|
| Product CPT | 일관된 패턴 (JSONB 확장) | A |
| Member CPT | 필드 중복 있음, RBAC 마이그레이션 중 | B- |
| Health/Diabetes | 도메인별 적합한 패턴 선택 | A |
| Navigation | 3가지 패턴 혼재 | C |
| ACF | Dual pattern 운영 가능 | B+ |

### 6.2 우선순위 권고

#### P0: 즉시 필요
- Navigation 패턴 표준화 (menus.admin 채택)
- cms-core navigation → menus 변환

#### P1: 단기 (1-2주)
- Member 필드 중복 제거 계획 수립
- User.role deprecated 완전 제거

#### P2: 중기 (1개월)
- ACF manifest → DB 자동 동기화 구현
- viewTemplates 표준 문서화

### 6.3 Phase B 준비 사항

1. **표준 Manifest 스키마** 확정
2. **Navigation 마이그레이션** 스크립트 준비
3. **Member 통합 방안** 상세 설계

---

## 7. 참조 파일 목록

### Product CPT
- `packages/dropshipping-core/src/entities/ProductMaster.entity.ts`
- `packages/dropshipping-core/src/entities/SupplierProductOffer.entity.ts`
- `packages/dropshipping-cosmetics/src/backend/entities/CosmeticsCategory.entity.ts`
- `packages/health-extension/src/types.ts`

### Member CPT
- `apps/api-server/src/modules/auth/entities/User.ts`
- `packages/organization-core/src/entities/Organization.ts`
- `packages/organization-core/src/entities/OrganizationMember.ts`
- `packages/membership-yaksa/src/backend/entities/Member.ts`
- `packages/membership-yaksa/src/backend/entities/Affiliation.ts`

### Health/Diabetes
- `packages/health-extension/src/manifest.ts`
- `packages/diabetes-core/src/backend/entities/CGMSession.entity.ts`
- `packages/diabetes-core/src/backend/entities/DiabetesReport.entity.ts`

### Navigation & ACF
- `packages/cms-core/src/manifest.ts`
- `packages/dropshipping-core/src/manifest.ts`
- `packages/forum-yaksa/src/manifest.ts`
- `packages/forum-cosmetics/src/manifest.ts`
- `packages/cms-core/src/entities/CmsAcfFieldGroup.entity.ts`
- `packages/cms-core/src/entities/CmsAcfField.entity.ts`

---

*Report Generated: 2025-12-14*
*Analyst: Claude Code*
