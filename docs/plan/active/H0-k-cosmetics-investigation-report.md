# H0 조사 보고서: K-Cosmetics 서비스 현황 분석

> **목적**: K-Cosmetics 서비스의 설계 전제 파악 및 여행자 채널 통합 적합성 판단
> **작성일**: 2025-01-02
> **상태**: 완료

---

## 1. 조사 범위

### 조사 대상
1. **Admin Dashboard - Cosmetics Pages** (`apps/admin-dashboard/src/pages/cosmetics-*`)
2. **Cosmetics API** (`apps/api-server/src/routes/cosmetics/`)
3. **Cosmetics Packages** (`packages/cosmetics-*-extension/`)
4. **Web K-Cosmetics** (`services/web-k-cosmetics/`)

---

## 2. 서비스 개요 요약

**K-Cosmetics는 "매장 중심 화장품 판매 플랫폼"으로 설계되어 있다.**

- 일반 소비자 대상 온라인 쇼핑몰이 아님
- 매장 체험 → 상담 → 구매 흐름 전제
- B2B2C 모델 (공급사 → 매장/파트너 → 소비자)
- 주문/결제 기능은 현재 미구현 (상품 카탈로그 중심)

---

## 3. 현재 k-cosmetics의 설계 전제

### 3.1 명시적 전제

| 전제 | 근거 |
|------|------|
| **매장 중심** | web-k-cosmetics: "매장에서 경험하고, 집에서 이어집니다" |
| **체험 기반** | "직접 써보고 결정하는 화장품 쇼핑" |
| **B2B2C 구조** | Partner, Supplier, Sample 확장 존재 |
| **카탈로그 우선** | 상품/브랜드/가격 관리 API만 구현 |

### 3.2 암묵적 전제

| 전제 | 근거 |
|------|------|
| **로컬 사용자 기준** | 배송 주소, 매장 방문 전제 UX |
| **한국어 전용** | 다국어 미지원 |
| **여행자 배제 아님** | 여행자에 대한 명시적 배제 코드 없음 |
| **오프라인 연계 지향** | 샘플 진열, 매장 픽업 흐름 설계 |

---

## 4. 기능 분류 표

### 4.1 Admin Dashboard Pages

| 기능 | 경로 | CORE 적합 | 여행자 공유 가능 | K-Cosmetics 전용 |
|------|------|-----------|----------------|-----------------|
| 상품 목록/상세 | `/cosmetics-products` | O | O | - |
| 브랜드 관리 | `/cosmetics-products` | O | O | - |
| 상품 생성/수정 | `/cosmetics-products-admin` | O | O | - |
| 파트너 대시보드 | `/cosmetics-partner` | - | - | O |
| 파트너 링크/수익 | `/cosmetics-partner/*` | - | X | O |
| 파트너 루틴 | `/cosmetics-partner/routines` | - | X | O |
| 샘플 대시보드 | `/cosmetics-sample` | - | O | - |
| 샘플 추적 | `/cosmetics-sample/tracking` | - | O | - |
| 진열 관리 | `/cosmetics-sample/display` | - | X | O |
| 전환 분석 | `/cosmetics-sample/analytics` | - | O | - |
| 공급사 대시보드 | `/cosmetics-supplier` | - | X | O |
| 승인 관리 | `/cosmetics-supplier/approvals` | - | X | O |
| 가격 정책 | `/cosmetics-supplier/price-policies` | - | X | O |

### 4.2 API 엔드포인트

| 기능 | 엔드포인트 | CORE 적합 | 여행자 공유 가능 |
|------|-----------|-----------|----------------|
| 상품 목록 | `GET /cosmetics/products` | O | O |
| 상품 검색 | `GET /cosmetics/products/search` | O | O |
| 상품 상세 | `GET /cosmetics/products/:id` | O | O |
| 브랜드 목록 | `GET /cosmetics/brands` | O | O |
| 브랜드 상세 | `GET /cosmetics/brands/:id` | O | O |
| 라인 목록 | `GET /cosmetics/lines` | O | O |
| 상품 생성 | `POST /cosmetics/admin/products` | O | O |
| 상품 수정 | `PUT /cosmetics/admin/products/:id` | O | O |
| 가격 정책 | `/cosmetics/admin/prices/*` | O | O |
| 감사 로그 | `/cosmetics/admin/logs/*` | O | O |

### 4.3 Extension Packages

| 패키지 | 역할 | 여행자 공유 가능 |
|--------|------|----------------|
| `cosmetics-partner-extension` | 파트너/인플루언서 | X (로컬 파트너 전용) |
| `cosmetics-seller-extension` | 셀러 관리 | X (매장 셀러 전용) |
| `cosmetics-supplier-extension` | 공급사 관리 | X (브랜드 공급사 전용) |
| `cosmetics-sample-display-extension` | 샘플/진열 | 조건부 (샘플 트래킹은 공유 가능) |
| `design-system-cosmetics` | 디자인 시스템 | O |
| `dropshipping-cosmetics` | 드롭쉬핑 | X |
| `forum-cosmetics` | 포럼 | O |

---

## 5. 핵심 질문 응답

### Q1. 서비스 정체성 전제

**결론: "매장 중심 판매 플랫폼"**

- 코드/화면/문구 기준 판단:
  - `web-k-cosmetics`: "매장에서 경험하고, 집에서 이어집니다"
  - 파트너 대시보드: 인플루언서/매장 기반 수익 모델
  - 샘플 대시보드: 매장 내 샘플 진열/전환 추적

- **여행자까지 포함한 판매 채널** 아님 (현재)
- 그러나 **명시적 배제**도 없음

### Q2. 사용자 모델

| 사용자 유형 | 현재 상태 | 여행자 포함 가능성 |
|------------|---------|------------------|
| 일반 소비자 | 암묵적 전제 | O (UX 확장 필요) |
| 매장 관리자 | 명시적 지원 | - |
| 파트너/인플루언서 | 명시적 지원 | X (로컬 기반) |
| 공급사/브랜드 | 명시적 지원 | X |
| **여행자** | **미고려** | **O (별도 채널 필요)** |

### Q3. 구매 흐름

**현재 전제: 오프라인 연계 (매장 체험 → 상담 → 구매)**

| 흐름 유형 | 현재 지원 | 여행자 적합성 |
|----------|---------|-------------|
| 전통적 온라인 쇼핑 (배송 중심) | X | X |
| 오프라인 연계 (픽업/전시/샘플) | O | O (매장 픽업) |
| QR/현장 진입 전제 | 부분적 | O |
| 키오스크/사이니지 연계 | 설계됨 | O |

### Q4. 데이터 소유와 경계

| 데이터 | 소유자 | 여행자 채널과 중복 위험 |
|--------|-------|---------------------|
| 상품 정보 | Cosmetics API | **없음** (공유 가능) |
| 브랜드/라인 | Cosmetics API | **없음** (공유 가능) |
| 가격 정책 | Cosmetics API | **없음** (공유 가능) |
| 파트너 수익 | Cosmetics Partner | 없음 (별도 영역) |
| 주문/결제 | **미구현** | **판단 필요** |

### Q5. 채널 분리 적합성

**K-Cosmetics는 다음 구조를 수용할 수 있는가?**

```
k-cosmetics.co.kr         → 기본 웹 (매장 중심)
travel.k-cosmetics.co.kr  → 여행자 전용 채널
```

| 평가 항목 | 가능 여부 | 비고 |
|----------|---------|------|
| 동일 API 사용 | O | 상품/브랜드 API 공유 가능 |
| 다른 UX | O | 별도 프론트엔드 가능 |
| 인증 통합 | O | Core auth-core 공유 |
| 주문 분리 | **판단 필요** | 주문 모델 미구현 상태 |

**기술적 제약: 없음**
**비즈니스 판단: 필요**

---

## 6. 여행자 채널과의 충돌 지점 (Top 3)

### 1. 사용자 모델 확장 필요
- 현재: 로컬 소비자 + 매장 기반 파트너
- 필요: 여행자 (외국인/내국인) 추가
- 충돌: 여행자 전용 UX, 다국어 지원 필요

### 2. 구매 흐름 분기
- 현재: 매장 체험 → 상담 → 매장/배송 수령
- 필요: 면세점/가이드 판매 → 세금 환급 → 현장 수령
- 충돌: 결제/환급 흐름 다름

### 3. 참여자 유형 확장
- 현재: Partner (인플루언서), Seller (매장), Supplier (공급사)
- 필요: Store (면세 매장), Guide (가이드), Partner (여행사)
- 충돌: K-Shopping의 참여자 모델과 중복 가능성

---

## 7. 단일 Core 전략과의 적합성 판단

### 판단: **조건부 적합**

| 항목 | 평가 |
|------|------|
| 상품 카탈로그 공유 | **적합** |
| 브랜드/라인 공유 | **적합** |
| 가격 정책 공유 | **적합** |
| 파트너 모델 공유 | **부적합** (역할 다름) |
| 주문/결제 공유 | **판단 필요** (미구현) |
| 사용자 모델 확장 | **조건부** (여행자 UX 필요) |

### 조건

1. **상품/브랜드 데이터는 단일 Core로 통합 적합**
2. **파트너/참여자 모델은 채널별 분리 유지**
3. **주문/결제 구현 시 채널 타입 분기 필요**
4. **여행자 전용 프론트엔드 별도 개발 필요**

---

## 8. K-Shopping vs Cosmetics 비교

| 항목 | K-Shopping | Cosmetics | 통합 전략 |
|------|-----------|-----------|----------|
| **주요 기능** | 신청/승인 워크플로우 | 상품 카탈로그 | 상호 보완 |
| **사용자** | 참여자 (store/guide/partner) | 소비자/파트너/공급사 | 역할 매핑 필요 |
| **데이터** | 신청/참여자 | 상품/브랜드/가격 | 분리 유지 |
| **API 경로** | `/k-shopping` | `/cosmetics` | 통합 가능 |
| **여행자 지원** | 명시적 설계 | 암묵적 미고려 | K-Shopping 병합 |

---

## 9. 결론

**K-Cosmetics는 여행자 채널(travel.k-cosmetics)을 수용할 수 있으며, K-Shopping의 참여자/신청 기능을 통합하는 것이 적합하다.**

### 통합 제안

```
k-cosmetics (통합 도메인)
├── Core (상품/브랜드/가격) ─────────── 모든 채널 공유
├── Local Channel (매장 중심) ────────── 기존 cosmetics 유지
├── Travel Channel (여행자 중심) ──────── k-shopping 병합
└── Partner/Supplier (B2B) ────────── 별도 관리
```

### 핵심 판단

| 결정 | 근거 |
|------|------|
| 상품 데이터 공유 | 중복 방지, 단일 원본 |
| 참여자 모델 병합 | K-Shopping → cosmetics_participants |
| 채널 분리 | UX/비즈니스 로직 분기 |
| 주문/결제 통합 설계 | 미구현 상태에서 통합 설계 기회 |

---

## 10. 다음 단계 제안

### 즉시 조치 (Before Refactoring)
1. [ ] 두 조사 보고서 나란히 검토
2. [ ] 통합 아키텍처 결정
3. [ ] 주문/결제 모델 설계 방향 확정

### 리팩토링 작업 (After Decision)
1. K-Shopping 엔티티 → Cosmetics 도메인 이전
2. API 경로 통합 (`/k-shopping` → `/cosmetics`)
3. 여행자 전용 프론트엔드 개발
4. 채널 타입 기반 분기 로직 추가

---

*Report generated: 2025-01-02*
*Version: 1.0*
