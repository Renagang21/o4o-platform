# H0 조사 보고서: 여행자 쇼핑 서비스 현황 분석

> **목적**: 여행자 관련 서비스를 k-cosmetics에 포함시키기 위한 현황 조사
> **작성일**: 2025-01-02
> **상태**: 완료

---

## 1. 조사 범위

### 조사 대상
1. **K-Shopping API** (`apps/api-server/src/routes/k-shopping/`)
2. **Cosmetics API** (`apps/api-server/src/routes/cosmetics/`)
3. **Web K-Cosmetics** (`services/web-k-cosmetics/`)
4. **DB Migration** (`apps/api-server/src/database/migrations/`)

---

## 2. K-Shopping 도메인 현황

### 2.1 API 엔드포인트
**Base Path**: `/api/v1/k-shopping`

| 엔드포인트 | 메소드 | 설명 | 권한 |
|-----------|--------|------|------|
| `/applications` | POST | 신청 제출 | 로그인 필수 |
| `/applications/mine` | GET | 내 신청 목록 | 로그인 필수 |
| `/applications/:id` | GET | 신청 상세 | 본인/관리자 |
| `/participants/me` | GET | 내 참여자 정보 | 로그인 필수 |
| `/applications/admin/all` | GET | 전체 신청 목록 | operator/admin |
| `/applications/:id/admin` | GET | 신청 상세 (관리자) | operator/admin |
| `/applications/:id/review` | PATCH | 승인/반려 처리 | operator/admin |

### 2.2 엔티티 구조

#### KShoppingApplication (신청)
```typescript
- id: UUID (PK)
- userId: UUID (신청자)
- participantType: 'store' | 'guide' | 'partner'
- organizationName: string (조직명)
- businessNumber: string (사업자번호)
- serviceTypes: string[] (신청 서비스)
- status: 'submitted' | 'approved' | 'rejected'
- note: string (신청자 메모)
- rejectionReason: string (반려 사유)
- submittedAt, decidedAt, decidedBy
```

#### KShoppingParticipant (승인된 참여자)
```typescript
- id: UUID (PK)
- userId: UUID (사용자 연결)
- participantType: 'store' | 'guide' | 'partner'
- code: string (고유 코드 - KS-xxx, KG-xxx, KP-xxx)
- organizationName, businessNumber
- address, phone, email, contactName
- status: 'active' | 'inactive' | 'suspended'
- enabledServices: string[] (활성화된 서비스)
- applicationId: UUID (원본 신청)
```

### 2.3 서비스 유형 (ServiceTypes)
| 코드 | 설명 |
|------|------|
| `tax_refund` | 세금 환급 서비스 |
| `guide_sales` | 가이드 판매 서비스 |
| `travel_package` | 여행 패키지 서비스 |

### 2.4 참여자 유형 (ParticipantTypes)
| 유형 | 코드 접두사 | 설명 |
|------|------------|------|
| `store` | KS- | 매장 (화장품 판매점) |
| `guide` | KG- | 가이드 (판매 가이드) |
| `partner` | KP- | 파트너 (여행사 등) |

---

## 3. Cosmetics 도메인 현황

### 3.1 API 엔드포인트
**Base Path**: `/api/v1/cosmetics`

| 엔드포인트 | 메소드 | 설명 | 권한 |
|-----------|--------|------|------|
| `/products` | GET | 상품 목록 | Public |
| `/products/search` | GET | 상품 검색 | Public |
| `/products/:id` | GET | 상품 상세 | Public |
| `/brands` | GET | 브랜드 목록 | Public |
| `/brands/:id` | GET | 브랜드 상세 | Public |
| `/lines` | GET | 라인 목록 | Public |
| `/admin/products` | POST | 상품 생성 | cosmetics:admin |
| `/admin/products/:id` | PUT | 상품 수정 | cosmetics:admin |
| `/admin/products/:id/status` | PATCH | 상태 변경 | cosmetics:admin |
| `/admin/prices/:productId` | GET/PUT | 가격 정책 | cosmetics:admin |
| `/admin/logs/products` | GET | 상품 로그 | cosmetics:admin |
| `/admin/logs/prices` | GET | 가격 로그 | cosmetics:admin |

### 3.2 엔티티 구조

#### CosmeticsBrand (브랜드)
```typescript
- id: UUID (PK)
- name: string
- description: string
- logo_url: string
- is_active: boolean
```

#### CosmeticsLine (라인)
```typescript
- id: UUID (PK)
- brand_id: UUID (FK)
- name: string
- description: string
```

#### CosmeticsProduct (상품)
```typescript
- id: UUID (PK)
- brand_id: UUID (FK)
- line_id: UUID (FK, optional)
- name, description
- ingredients: string[]
- status: 'draft' | 'visible' | 'hidden' | 'sold_out'
```

#### CosmeticsPricePolicy (가격 정책)
```typescript
- id: UUID (PK)
- product_id: UUID (FK)
- base_price: number
- sale_price: number (optional)
- sale_start_at, sale_end_at
```

---

## 4. Web K-Cosmetics 현황

### 4.1 현재 상태
- **위치**: `services/web-k-cosmetics/`
- **상태**: 기본 랜딩 페이지만 존재
- **기능**: 마케팅 콘텐츠만 표시

### 4.2 구현된 컴포넌트
```
src/
├── App.tsx          # 메인 컴포넌트 (랜딩 페이지)
├── main.tsx         # 엔트리 포인트
├── pages/
│   └── HomePage.tsx # 홈페이지 (Tailwind 스타일링)
└── assets/          # 정적 자산
```

### 4.3 미구현 기능
- 로그인/회원가입
- 상품 목록/상세
- 신청 기능
- 대시보드
- 관리자 기능

---

## 5. 핵심 질문 응답

### Q1. App 정체성 - 독립 서비스 vs 플랫폼 채널?
**결론: 플랫폼 채널로 통합 가능**

- K-Shopping은 신청/승인 워크플로우에 집중
- Cosmetics는 상품 카탈로그에 집중
- 두 도메인은 **보완적** 관계
- 독립 사용자 모델 없음 (Core auth-core 의존)

### Q2. 사용자 모델 - Core 공유 vs 자체 모델?
**결론: Core 공유**

| 도메인 | 사용자 모델 | 참조 방식 |
|--------|------------|----------|
| K-Shopping | Core User | `userId` UUID 참조 |
| Cosmetics | Core User | `user_id` UUID 참조 |

- 별도 사용자 테이블 없음
- auth-core의 User 엔티티 참조

### Q3. 데이터 소유권 - 독립 DB vs 공유?
**결론: Core DB 내 도메인별 테이블**

| 도메인 | 테이블 접두사 | 소유권 |
|--------|-------------|-------|
| K-Shopping | `kshopping_` | K-Shopping |
| Cosmetics | `cosmetics_` | Cosmetics |

- 동일 PostgreSQL DB 내 분리된 스키마
- FK 관계 없이 UUID 참조

### Q4. 기능 분류 (KEEP / REFACTOR / DROP)

#### KEEP (유지)
| 기능 | 도메인 | 이유 |
|------|--------|------|
| 신청/승인 워크플로우 | K-Shopping | 핵심 비즈니스 로직 |
| 참여자 관리 | K-Shopping | 고유 기능 |
| 상품 CRUD | Cosmetics | 핵심 기능 |
| 브랜드/라인 관리 | Cosmetics | 필수 카탈로그 |
| 가격 정책 | Cosmetics | 비즈니스 로직 |

#### REFACTOR (리팩토링 필요)
| 기능 | 현재 | 목표 |
|------|------|------|
| 신청 타입 | K-Shopping 별도 | k-cosmetics로 통합 |
| 참여자 코드 | KS/KG/KP | 통합 코드 체계 검토 |
| 서비스 타입 | k-shopping 전용 | cosmetics 확장 |
| 권한 체계 | k-shopping:* | cosmetics:* 통합 |

#### DROP (제거 후보)
| 항목 | 이유 |
|------|------|
| web-k-cosmetics 빈 프론트엔드 | 미구현, cosmetics-web으로 대체 |
| 중복 인증 미들웨어 | 공통 패턴으로 통합 |

### Q5. 채널 적합성
**결론: K-Cosmetics 채널로 통합 적합**

| 평가 항목 | K-Shopping | Cosmetics | 통합 가능성 |
|----------|------------|-----------|------------|
| 비즈니스 로직 | 신청/승인 | 상품관리 | **상호보완적** |
| 데이터 모델 | 참여자 중심 | 상품 중심 | **분리 유지 가능** |
| API 구조 | RESTful | RESTful | **통합 용이** |
| 권한 체계 | scope 기반 | scope 기반 | **통합 용이** |

---

## 6. 통합 제안

### 6.1 아키텍처 제안
```
k-cosmetics (통합 도메인)
├── products/      # Cosmetics 상품 관리
├── brands/        # 브랜드/라인 관리
├── participants/  # 참여자 관리 (K-Shopping에서 이전)
├── applications/  # 신청 관리 (K-Shopping에서 이전)
└── services/      # 서비스 관리 (tax_refund, guide_sales 등)
```

### 6.2 엔티티 통합 제안
```
cosmetics_brands          # 유지
cosmetics_lines           # 유지
cosmetics_products        # 유지
cosmetics_price_policies  # 유지
cosmetics_participants    # kshopping_participants 이전
cosmetics_applications    # kshopping_applications 이전
```

### 6.3 API 통합 제안
```
/api/v1/cosmetics
├── /products/*           # 기존 유지
├── /brands/*             # 기존 유지
├── /participants/*       # K-Shopping에서 이전
├── /applications/*       # K-Shopping에서 이전
└── /admin/*              # 통합 관리
```

### 6.4 권한 체계 통합
| 현재 (분리) | 통합 후 |
|------------|--------|
| `k-shopping:admin` | `cosmetics:admin` |
| `k-shopping:operator` | `cosmetics:operator` |
| `cosmetics:admin` | `cosmetics:admin` (유지) |

---

## 7. 리팩토링 작업 목록

### Phase 1: 데이터 마이그레이션
1. [ ] `kshopping_applications` → `cosmetics_applications` 테이블 이전
2. [ ] `kshopping_participants` → `cosmetics_participants` 테이블 이전
3. [ ] 기존 데이터 마이그레이션 스크립트 작성

### Phase 2: API 통합
1. [ ] K-Shopping 컨트롤러를 Cosmetics로 이전
2. [ ] 엔드포인트 경로 변경 (/k-shopping → /cosmetics)
3. [ ] 권한 체계 통합 (k-shopping:* → cosmetics:*)

### Phase 3: 프론트엔드
1. [ ] web-k-cosmetics 제거 또는 cosmetics-web으로 대체
2. [ ] 통합 프론트엔드 개발

### Phase 4: 정리
1. [ ] K-Shopping 라우트 제거
2. [ ] 구 마이그레이션 파일 정리
3. [ ] 문서 업데이트

---

## 8. 결론

**여행자 서비스(K-Shopping)를 K-Cosmetics에 통합하는 것이 적합합니다.**

### 근거:
1. **데이터 독립성**: 두 도메인 모두 Core User를 참조하며 자체 사용자 모델이 없음
2. **기능 보완성**: 상품 관리(Cosmetics) + 참여자/신청 관리(K-Shopping)는 상호 보완적
3. **기술 일관성**: 동일한 인증/권한 패턴, RESTful API 구조
4. **유지보수성**: 단일 도메인으로 관리 시 복잡도 감소

### 리스크:
1. 데이터 마이그레이션 시 기존 데이터 무결성 확인 필요
2. API 경로 변경 시 기존 클라이언트 호환성 고려 필요
3. 권한 체계 통합 시 기존 사용자 역할 검토 필요

---

*Report generated: 2025-01-02*
*Version: 1.0*
