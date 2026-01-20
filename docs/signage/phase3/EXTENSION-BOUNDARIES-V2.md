# Digital Signage - Extension Boundaries V2

> **Phase:** 3 Pre-Design
> **Status:** Draft
> **Date:** 2025-01-20

---

## 1. Overview

이 문서는 Digital Signage Phase 3의 산업별 확장앱(Extension Apps)이 담당하는 책임과 경계를 정의합니다.

**핵심 원칙:**
- 확장앱은 Core를 수정하지 않는다
- 확장앱은 산업별 특화 기능만 담당한다
- 확장앱 간 직접 의존은 금지한다

---

## 2. Core vs Extension 책임 분리

### 2.1 Core의 책임 (Phase 2 완료)

| Component | Responsibility |
|-----------|----------------|
| SignagePlaylist | 재생목록 관리 |
| SignageMedia | 미디어 파일 관리 |
| SignageSchedule | 스케줄 관리 |
| SignageTemplate | 템플릿 정의 |
| SignageLayoutPreset | 레이아웃 프리셋 |
| SignageContentBlock | 콘텐츠 블록 |
| Player Engine | 재생 및 Merge |
| Global Content Flow | HQ/Supplier/Community |

### 2.2 Extension의 책임 (Phase 3)

| Component | Responsibility |
|-----------|----------------|
| Domain Entity | 산업별 데이터 모델 |
| Domain Template | 산업별 템플릿 프리셋 |
| Domain Content | 산업별 콘텐츠 자동 생성 |
| Domain Supplier | 산업별 공급자 연결 |
| Domain AI | 산업별 AI 콘텐츠 생성 |

---

## 3. 산업별 확장앱 정의

### 3.1 signage-pharmacy-extension (약국)

**Target:** 약국, 드럭스토어

**책임 범위:**
| Feature | Description |
|---------|-------------|
| OTC 카테고리 | 의약품/건강기능식품 분류 |
| 계절성 추천 | 시즌별 상품 추천 로직 |
| 복약 안내 | 복약지도 템플릿 |
| 건강 정보 | 약사 전용 건강 슬라이드 |
| 약국 이벤트 | 세일/프로모션 템플릿 |
| 브랜드 세트 | 기본 약국 브랜드 콘텐츠 |

**Core 연결점:**
- Global Content → `pharmacy-hq` source 추가
- Template → Pharmacy 전용 프리셋 연결
- AI Generate → 약품 카드 자동 생성

**금지 사항:**
- Core Playlist 구조 수정 ❌
- Core Schedule 로직 수정 ❌
- 직접 DB 접근 ❌

---

### 3.2 signage-cosmetics-extension (화장품)

**Target:** 화장품 매장, 뷰티샵

**책임 범위:**
| Feature | Description |
|---------|-------------|
| 신제품 템플릿 | 신제품 출시 카드 |
| 트렌드 콘텐츠 | 시즌 트렌드 자동 생성 |
| 브랜드 수신 | 공급자 콘텐츠 자동 연동 |
| 색상 조합 | 룩북/컬러 매칭 |
| 뷰티 팁 | 스킨케어/메이크업 팁 |

**Core 연결점:**
- Global Content → `cosmetics-brand` source 추가
- Template → Cosmetics 전용 프리셋 연결
- Supplier → CosmeticsBrand 엔티티 연결

**금지 사항:**
- Core Media 구조 수정 ❌
- Player Merge 로직 수정 ❌

---

### 3.3 signage-tourist-extension (관광/면세점)

**Target:** 관광지, 면세점, 공항

**책임 범위:**
| Feature | Description |
|---------|-------------|
| 다국어 변환 | AI 기반 자동 번역 |
| 명소 카드 | 지명/관광지 정보 자동 생성 |
| 행사 안내 | 지역 행사/축제 스케줄 |
| 환율 표시 | 실시간 환율 연동 |
| 면세 안내 | 면세 한도/절차 안내 |

**Core 연결점:**
- Global Content → `tourism-authority` source 추가
- AI Generate → 다국어 콘텐츠 생성
- Schedule → 행사 기반 자동 스케줄

**금지 사항:**
- Core Entity 수정 ❌
- Core API 경로 수정 ❌

---

### 3.4 signage-seller-promo-extension (판매자/파트너)

**Target:** 인플루언서, 파트너, 셀러

**책임 범위:**
| Feature | Description |
|---------|-------------|
| 프로모션 카드 | 제품 홍보 카드 자동 생성 |
| 파트너 템플릿 | 파트너가 직접 편집 가능 |
| 판매 연동 | 제품 판매 정보 연결 |
| 성과 추적 | 콘텐츠 노출/전환 분석 |

**Core 연결점:**
- Global Content → `seller-partner` source 추가
- Template → Self-edit 가능 템플릿
- Analytics → 파트너별 성과 집계

**금지 사항:**
- Core 결제 로직 포함 ❌
- Core 사용자 인증 수정 ❌

---

## 4. Extension → Core 연결 패턴

### 4.1 Global Content 확장

```typescript
// Core의 source enum 확장
type ContentSource =
  | 'hq'
  | 'supplier'
  | 'community'
  // Phase 3 Extension sources
  | 'pharmacy-hq'
  | 'cosmetics-brand'
  | 'tourism-authority'
  | 'seller-partner';
```

### 4.2 Template 연결

```typescript
// Extension은 Template을 "참조"만 한다
interface ExtensionTemplatePreset {
  id: string;
  extensionType: 'pharmacy' | 'cosmetics' | 'tourist' | 'seller';
  coreTemplateId: string; // Core Template 참조
  domainConfig: Record<string, unknown>;
}
```

### 4.3 API 경로 패턴

```
Core API:     /api/signage/:serviceKey/...
Extension:    /api/signage/:serviceKey/ext/pharmacy/...
Extension:    /api/signage/:serviceKey/ext/cosmetics/...
Extension:    /api/signage/:serviceKey/ext/tourist/...
Extension:    /api/signage/:serviceKey/ext/seller/...
```

---

## 5. Extension 간 의존 금지

```
✅ 허용:
Extension → Core

❌ 금지:
Extension A → Extension B
Extension → Core 수정
```

---

## 6. Extension 개발 규칙

### 6.1 Entity 규칙

- Extension 전용 스키마/테이블 사용
- Core 테이블 직접 참조 금지
- ID 참조만 허용 (FK 아님)

### 6.2 API 규칙

- `/ext/{extension-name}/` 경로 사용
- Core 미들웨어 재사용
- Core 인증 체계 준수

### 6.3 UI 규칙

- Extension 전용 페이지/컴포넌트
- Core 컴포넌트 import 허용
- Core 컴포넌트 수정 금지

---

## 7. 수익 모델 연결점

| Extension | Revenue Model |
|-----------|---------------|
| Pharmacy | 약품 프로모션, 계절 패키지 |
| Cosmetics | 브랜드 광고, 신제품 노출 |
| Tourist | 관광청 협찬, 면세점 광고 |
| Seller | 파트너 유료 템플릿, 성과 기반 |

---

## 8. Phase 3 Extension 우선순위

| Priority | Extension | Reason |
|----------|-----------|--------|
| 1 | signage-pharmacy-extension | GlycoPharm/KPA 연계 |
| 2 | signage-cosmetics-extension | K-Cosmetics 연계 |
| 3 | signage-seller-promo-extension | Neture 파트너 연계 |
| 4 | signage-tourist-extension | 추후 확장 |

---

*Document: EXTENSION-BOUNDARIES-V2.md*
*Phase 3 Pre-Design*
