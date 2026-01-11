# Work Order: Neture Core P1 - Real DB & API Integration

## Work Order Header (Standard)

| 항목 | 내용 |
|------|------|
| **Work Order ID** | WO-NETURE-CORE-P1 |
| **Title** | Neture P1 - Mock → Real DB/API 전환 |
| **Phase** | P1 (Backend Integration) |
| **Parent Work Order** | WO-NETURE-CORE-V1 |
| **Service** | Neture (web-neture) |
| **Service Status** | Development → Active 전환 준비 |
| **App Type** | standalone (non-core) |
| **Branch** | `feature/neture-core-v1` (계속 사용) |
| **Assigned To** | Claude Code / Backend Agent |
| **Priority** | HIGH (통합 테스트 차단 중) |
| **Estimated Scope** | Backend DB + API 구현 + Frontend 연동 |

---

## 📋 Phase Transition Context

### P0 완료 상태
- ✅ Frontend 5개 페이지 구현 완료
- ✅ Mock 데이터 기반 UI/UX 검증 완료
- ✅ HARD RULES 준수 확인 (읽기 전용 플랫폼)
- ✅ Build 성공 (205.33 kB)

### P0 → P1 전환 사유
**통합 테스트 필요성**: 전체 서비스 통합 테스트 환경에서 Neture를 Mock 상태로 남겨둘 수 없음. 실제 DB/API 기반으로 전환하여 다른 서비스와 동일한 수준의 테스트 가능 상태로 만들어야 함.

---

## 🎯 P1 목표 (한 줄)

> Mock 기반 Neture를 실제 DB + 실제 API 기반의 "통합 테스트 가능한 실서비스 상태"로 완성

---

## ✅ P1 Scope (IN SCOPE)

### 1. Database Schema 구현
- `neture_suppliers` 테이블 생성
- `neture_supplier_products` 테이블 생성
- `neture_partnership_requests` 테이블 생성
- `neture_partnership_products` 테이블 생성
- Migration 스크립트 작성

### 2. Backend API 구현 (GET Only)
- `GET /api/v1/neture/suppliers` - 공급자 목록
- `GET /api/v1/neture/suppliers/:slug` - 공급자 상세
- `GET /api/v1/neture/partnership/requests` - 제휴 요청 목록
- `GET /api/v1/neture/partnership/requests/:id` - 제휴 요청 상세

### 3. Frontend Integration
- Mock 데이터 제거 (`src/data/mockData.ts` 삭제)
- API fetch 로직 구현
- 로딩/에러 상태 최소 처리
- 환경변수 설정 (`VITE_API_URL`)

### 4. Integration Testing
- 전체 서비스 실행 상태에서 Neture 접근 확인
- Supplier → Partnership 흐름 테스트
- 다른 서비스 영향 없음 확인

---

## ❌ P1 Out of Scope (절대 포함 금지)

| 금지 항목 | 사유 |
|----------|------|
| POST/PUT/DELETE API | 읽기 전용 플랫폼 원칙 |
| 제휴 요청 생성/수정 | 외부 협의만 허용 |
| 상태 변경 API | 중립 플랫폼 위반 |
| 승인/선택 기능 | 관리 기능 금지 |
| 주문/결제/정산 | HARD RULES 위반 |
| Neture 대시보드 | 관리 콘솔 금지 |
| 내부 메시지/채팅 | HARD RULES 위반 |

> ⚠️ 위 항목 중 하나라도 구현 시도 시 **즉시 작업 중단 및 재판단 필요**

---

## 📊 Database Schema Specification

### 1. neture_suppliers

```sql
CREATE TABLE neture_suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  category VARCHAR(100),
  short_description TEXT,
  description TEXT,
  pricing_policy TEXT,
  moq VARCHAR(100),
  shipping_standard TEXT,
  shipping_island TEXT,
  shipping_mountain TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_website TEXT,
  contact_kakao TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE INDEX idx_neture_suppliers_slug ON neture_suppliers(slug);
CREATE INDEX idx_neture_suppliers_status ON neture_suppliers(status);
```

### 2. neture_supplier_products

```sql
CREATE TABLE neture_supplier_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES neture_suppliers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_neture_supplier_products_supplier ON neture_supplier_products(supplier_id);
```

### 3. neture_partnership_requests

```sql
CREATE TABLE neture_partnership_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id VARCHAR(255) NOT NULL, -- Soft reference (no FK)
  seller_name VARCHAR(255) NOT NULL,
  seller_service_type VARCHAR(100), -- 'glycopharm', 'k-cosmetics' etc
  seller_store_url TEXT,
  product_count INT DEFAULT 0,
  period_start DATE,
  period_end DATE,
  revenue_structure TEXT,
  status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'MATCHED', 'CLOSED')),
  promotion_sns BOOLEAN DEFAULT false,
  promotion_content BOOLEAN DEFAULT false,
  promotion_banner BOOLEAN DEFAULT false,
  promotion_other TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_kakao TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  matched_at TIMESTAMP,
  metadata JSONB -- 확장 가능한 추가 정보
);

CREATE INDEX idx_neture_partnership_status ON neture_partnership_requests(status);
CREATE INDEX idx_neture_partnership_seller ON neture_partnership_requests(seller_id);
```

### 4. neture_partnership_products

```sql
CREATE TABLE neture_partnership_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partnership_request_id UUID NOT NULL REFERENCES neture_partnership_requests(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100)
);

CREATE INDEX idx_neture_partnership_products_request ON neture_partnership_products(partnership_request_id);
```

---

## 🔧 API Implementation Specification

### Base URL
```
/api/v1/neture
```

### 1. GET /suppliers

**Query Parameters:**
- `category` (optional): Filter by category
- `status` (optional): Filter by status (default: 'ACTIVE')

**Response:**
```json
{
  "suppliers": [
    {
      "id": "uuid",
      "slug": "abc-pharma",
      "name": "ABC 제약",
      "logo": "https://...",
      "category": "의약품",
      "shortDescription": "검증된 의약품 공급자",
      "productCount": 3
    }
  ]
}
```

### 2. GET /suppliers/:slug

**Response:**
```json
{
  "id": "uuid",
  "slug": "abc-pharma",
  "name": "ABC 제약",
  "logo": "https://...",
  "category": "의약품",
  "shortDescription": "검증된 의약품 공급자",
  "description": "ABC 제약은 20년 경력의...",
  "products": [
    {
      "id": "uuid",
      "name": "비타민 C",
      "category": "건강기능식품",
      "description": "고함량 비타민 C"
    }
  ],
  "pricingPolicy": "도매가 기준 20% 할인",
  "moq": "50개 이상",
  "shippingPolicy": {
    "standard": "무료 배송",
    "island": "3,000원",
    "mountain": "5,000원"
  },
  "contact": {
    "email": "contact@abc-pharma.com",
    "phone": "02-1234-5678",
    "website": "https://abc-pharma.com",
    "kakao": "https://pf.kakao.com/abc-pharma"
  }
}
```

### 3. GET /partnership/requests

**Query Parameters:**
- `status` (optional): Filter by status ('OPEN', 'MATCHED', 'CLOSED')

**Response:**
```json
{
  "requests": [
    {
      "id": "uuid",
      "seller": {
        "id": "seller-1",
        "name": "서울약국",
        "serviceType": "glycopharm",
        "storeUrl": "https://..."
      },
      "productCount": 12,
      "period": {
        "start": "2026-02-01",
        "end": "2026-07-31"
      },
      "revenueStructure": "매출의 5% 수익 배분",
      "status": "OPEN"
    }
  ]
}
```

### 4. GET /partnership/requests/:id

**Response:**
```json
{
  "id": "uuid",
  "seller": {
    "id": "seller-1",
    "name": "서울약국",
    "serviceType": "glycopharm",
    "storeUrl": "https://..."
  },
  "productCount": 12,
  "period": {
    "start": "2026-02-01",
    "end": "2026-07-31"
  },
  "revenueStructure": "매출의 5% 수익 배분",
  "status": "OPEN",
  "products": [
    {
      "id": "uuid",
      "name": "당뇨 영양제",
      "category": "건강기능식품"
    }
  ],
  "promotionScope": {
    "sns": true,
    "content": true,
    "banner": false,
    "other": "월 1회 뉴스레터 발송"
  },
  "contact": {
    "email": "seoul@pharmacy.com",
    "phone": "010-1234-5678",
    "kakao": "https://pf.kakao.com/seoul-pharmacy"
  },
  "createdAt": "2026-01-15T00:00:00Z",
  "matchedAt": null
}
```

---

## 📦 Implementation Checklist

### Phase 1: Database (Backend)

- [ ] Migration 파일 생성 (`packages/api-server/migrations/YYYYMMDD_create_neture_tables.ts`)
- [ ] `neture_suppliers` 테이블 생성
- [ ] `neture_supplier_products` 테이블 생성
- [ ] `neture_partnership_requests` 테이블 생성
- [ ] `neture_partnership_products` 테이블 생성
- [ ] 인덱스 생성
- [ ] Migration 실행 및 검증

### Phase 2: Backend API

- [ ] TypeORM Entity 생성
  - [ ] `NetureSupplier.entity.ts`
  - [ ] `NetureSupplierProduct.entity.ts`
  - [ ] `NeturePartnershipRequest.entity.ts`
  - [ ] `NeturePartnershipProduct.entity.ts`
- [ ] Service 생성 (`NetureService.ts`)
- [ ] Controller 생성 (`NetureController.ts`)
- [ ] DTO 생성 (Request/Response types)
- [ ] API 라우트 등록
- [ ] GET /suppliers 구현
- [ ] GET /suppliers/:slug 구현
- [ ] GET /partnership/requests 구현
- [ ] GET /partnership/requests/:id 구현
- [ ] Postman/curl 테스트

### Phase 3: Frontend Integration

- [ ] Mock 데이터 파일 삭제 (`src/data/mockData.ts`)
- [ ] API client 설정
- [ ] Supplier 목록 API 연동
- [ ] Supplier 상세 API 연동
- [ ] Partnership 목록 API 연동
- [ ] Partnership 상세 API 연동
- [ ] 로딩 상태 처리
- [ ] 에러 상태 처리 (최소)
- [ ] 환경변수 설정 (`VITE_API_URL`)

### Phase 4: Integration Testing

- [ ] 로컬 환경 전체 서비스 실행
- [ ] Neture 홈페이지 접근 확인
- [ ] Supplier 목록 렌더링 확인
- [ ] Supplier 상세 데이터 정확성 확인
- [ ] Partnership 목록 렌더링 확인
- [ ] Partnership 상세 데이터 정확성 확인
- [ ] 다른 서비스 정상 동작 확인
- [ ] 콘솔 에러 없음 확인
- [ ] Build 성공 확인

---

## 🚨 HARD RULES (재확인)

### Database Rules
- ✅ 모든 테이블은 `neture_` prefix 사용
- ❌ Core DB 테이블 수정 절대 금지
- ❌ Core 테이블에 대한 FK 설정 금지
- ✅ Soft reference (문자열/UUID) 사용

### API Rules
- ✅ GET 메서드만 구현
- ❌ POST/PUT/DELETE 절대 금지
- ✅ API Contract 문서 100% 준수
- ❌ 필드 추가/삭제 금지

### Frontend Rules
- ✅ 읽기 전용 UI만 유지
- ❌ 신청/승인/선택 버튼 절대 금지
- ✅ 외부 링크만 허용 (email, phone, kakao, website)
- ❌ 내부 액션 폼 금지

---

## 📝 Definition of Done (P1 완료 기준)

다음 조건이 **모두** 충족되어야 P1 완료 인정:

1. **Database**
   - [ ] 모든 테이블 생성 완료
   - [ ] Migration 실행 성공
   - [ ] 샘플 데이터 삽입 완료 (최소 2개씩)

2. **Backend API**
   - [ ] 4개 GET API 모두 구현 완료
   - [ ] API Contract 100% 준수
   - [ ] Postman/curl 테스트 통과

3. **Frontend**
   - [ ] Mock 데이터 완전 제거
   - [ ] 모든 페이지 실데이터 렌더링
   - [ ] 로딩/에러 상태 처리
   - [ ] `pnpm build` 성공

4. **Integration**
   - [ ] 전체 서비스 실행 상태에서 Neture 정상 동작
   - [ ] 다른 서비스 영향 없음
   - [ ] 콘솔 에러 없음

5. **HARD RULES**
   - [ ] OUT OF SCOPE 위반 없음
   - [ ] Core DB 변경 없음
   - [ ] 읽기 전용 플랫폼 유지

---

## 🎯 Next Steps After P1

P1 완료 후 Neture는 **Active 서비스 전환 가능 상태**가 됨.

**P2 이후 확장 가능 항목** (별도 승인 필요):
- 제휴 요청 생성 API (POST) - ⚠️ 중립성 검토 필요
- 상태 변경 API (PATCH) - ⚠️ 관리 기능 여부 검토
- 통계/분석 기능 - ⚠️ 대시보드 여부 검토
- 알림 기능 - ⚠️ 내부 메시지 금지 원칙 충돌

---

## 📚 Reference Documents

- [WO-NETURE-CORE-V1.md](./WO-NETURE-CORE-V1.md) - Parent Work Order
- [API-CONTRACT-NETURE-P0.md](./API-CONTRACT-NETURE-P0.md) - API 계약서
- [FE-WO-NETURE-CORE-P0.md](./FE-WO-NETURE-CORE-P0.md) - Frontend 스펙
- [CLAUDE.md](../../../CLAUDE.md) - 플랫폼 헌법

---

## 🤖 Execution Note

본 Work Order는 **Claude Code / Backend Agent에게 직접 실행 가능한 형태**로 작성됨.

**실행 순서**:
1. Database Migration 먼저 실행
2. Backend API 구현 및 테스트
3. Frontend Mock 제거 및 연동
4. Integration Testing

**중단 조건**:
- OUT OF SCOPE 항목 구현 시도 감지 시 즉시 중단
- Core DB 변경 시도 시 즉시 중단
- POST/PUT/DELETE API 구현 시도 시 즉시 중단

---

**Work Order Status**: ✅ READY FOR EXECUTION
**Created**: 2026-01-11
**Last Updated**: 2026-01-11
**Author**: Claude Sonnet 4.5
