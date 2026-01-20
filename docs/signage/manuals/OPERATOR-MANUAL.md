# Digital Signage 운영자 매뉴얼

## Version 3.0 (Phase 3)

**최종 수정일:** 2026-01-20
**대상:** 서비스 운영자 (Operator)

---

## 목차

1. [시스템 개요](#1-시스템-개요)
2. [역할 및 권한](#2-역할-및-권한)
3. [Pharmacy Extension 운영](#3-pharmacy-extension-운영)
4. [Cosmetics Extension 운영](#4-cosmetics-extension-운영)
5. [Seller Extension 운영](#5-seller-extension-운영)
6. [Global Content 관리](#6-global-content-관리)
7. [콘텐츠 승인 워크플로우](#7-콘텐츠-승인-워크플로우)
8. [통계 및 리포트](#8-통계-및-리포트)
9. [문제 해결 가이드](#9-문제-해결-가이드)
10. [FAQ](#10-faq)

---

## 1. 시스템 개요

### 1.1 Digital Signage란?

Digital Signage는 매장 내 디지털 디스플레이를 통해 콘텐츠를 표시하는 시스템입니다.
운영자는 중앙에서 콘텐츠를 관리하고, 각 매장에서 자율적으로 선택/편집할 수 있습니다.

### 1.2 Phase 3 Extension 구성

| Extension | 용도 | Force 지원 |
|-----------|------|-----------|
| **Pharmacy** | 약국/헬스케어 콘텐츠 | ✅ (HQ만) |
| **Cosmetics** | 화장품/브랜드 콘텐츠 | ❌ |
| **Seller** | 광고/프로모션 콘텐츠 | ❌ |

### 1.3 콘텐츠 흐름

```
운영자(HQ) → Global Content 생성
      ↓
매장(Store) → Clone/편집
      ↓
Player → 재생
```

---

## 2. 역할 및 권한

### 2.1 역할 정의

| 역할 | 설명 | 접근 범위 |
|------|------|----------|
| **Admin** | 시스템 관리자 | 모든 기능 |
| **Operator** | 서비스 운영자 | HQ 콘텐츠 관리 |
| **Store** | 매장 관리자 | Clone/편집만 |
| **Partner** | Seller 파트너 | 자신의 콘텐츠만 |

### 2.2 권한 매트릭스

| 기능 | Admin | Operator | Store | Partner |
|------|-------|----------|-------|---------|
| Global Content 생성 | ✅ | ✅ | ❌ | ❌ |
| Global Content 조회 | ✅ | ✅ | ✅ | ❌ |
| Force Content 설정 | ✅ | ✅ (Pharmacy만) | ❌ | ❌ |
| Clone | ✅ | ✅ | ✅ | ❌ |
| Store Content 편집 | ❌ | ❌ | ✅ | ❌ |
| Seller Content 등록 | ❌ | ❌ | ❌ | ✅ |
| Seller 승인 | ✅ | ❌ | ❌ | ❌ |
| 통계 조회 | ✅ | ✅ | ❌ | 자신만 |

---

## 3. Pharmacy Extension 운영

### 3.1 카테고리 관리

카테고리는 약국 콘텐츠를 분류하는 기준입니다.

**API 경로:** `/api/signage/{serviceKey}/ext/pharmacy/categories`

#### 카테고리 생성

```bash
POST /categories
{
  "name": "건강기능식품",
  "code": "health-supplement",
  "parentId": null,
  "iconUrl": "https://cdn.example.com/icons/health.png",
  "displayOrder": 1
}
```

#### 카테고리 목록 조회

```bash
GET /categories?page=1&limit=20&isActive=true
```

#### 주요 필드

| 필드 | 설명 | 필수 |
|------|------|------|
| name | 카테고리명 | ✅ |
| code | 고유 코드 | ✅ |
| parentId | 상위 카테고리 ID | ❌ |
| iconUrl | 아이콘 URL | ❌ |
| displayOrder | 표시 순서 | ❌ |

---

### 3.2 시즌 캠페인 관리

시즌별 건강 캠페인을 관리합니다 (예: 겨울철 면역력, 여름철 피부건강).

**API 경로:** `/api/signage/{serviceKey}/ext/pharmacy/campaigns`

#### 캠페인 생성

```bash
POST /campaigns
{
  "name": "2025년 겨울 면역력 캠페인",
  "season": "winter",
  "healthCondition": "immunity",
  "categoryId": "uuid-of-category",
  "productKeywords": ["비타민C", "프로폴리스", "홍삼"],
  "startDate": "2025-12-01",
  "endDate": "2026-02-28",
  "priority": 1,
  "scope": "global",
  "isForced": true
}
```

#### Force 설정 규칙

| 조건 | Force 가능 |
|------|-----------|
| source = pharmacy-hq | ✅ |
| source = supplier | ❌ |

**주의:** Force 콘텐츠는 매장에서 삭제할 수 없습니다.

---

### 3.3 HQ 콘텐츠 관리

본사(HQ)에서 생성하는 콘텐츠입니다.

**API 경로:** `/api/signage/{serviceKey}/ext/pharmacy/hq/contents`

#### 콘텐츠 생성

```bash
POST /hq/contents
{
  "title": "겨울철 면역력 관리 안내",
  "description": "겨울철 건강관리 필수 정보",
  "contentType": "health-tip",
  "categoryId": "uuid-of-category",
  "campaignId": "uuid-of-campaign",
  "templatePresetId": "uuid-of-preset",
  "mediaData": {
    "imageUrl": "https://cdn.example.com/content.jpg",
    "videoUrl": null,
    "thumbnailUrl": "https://cdn.example.com/thumb.jpg"
  },
  "source": "pharmacy-hq",
  "scope": "global",
  "isForced": true,
  "validFrom": "2025-12-01T00:00:00Z",
  "validUntil": "2026-02-28T23:59:59Z"
}
```

#### 콘텐츠 유형

| 유형 | 설명 |
|------|------|
| product-info | 제품 정보 |
| health-tip | 건강 팁 |
| promotion | 프로모션 |
| seasonal | 시즌 콘텐츠 |
| announcement | 공지사항 |

---

### 3.4 템플릿 프리셋

콘텐츠 디자인 템플릿을 관리합니다.

**API 경로:** `/api/signage/{serviceKey}/ext/pharmacy/presets`

#### 프리셋 생성

```bash
POST /presets
{
  "name": "건강정보 기본 템플릿",
  "type": "health-info",
  "coreTemplateId": "uuid-of-core-template",
  "config": {
    "layout": "vertical",
    "colorScheme": "medical-blue",
    "fontSize": "large"
  },
  "thumbnailUrl": "https://cdn.example.com/preset-thumb.jpg"
}
```

---

## 4. Cosmetics Extension 운영

### 4.1 브랜드 관리

화장품 브랜드를 등록하고 관리합니다.

**API 경로:** `/api/signage/{serviceKey}/ext/cosmetics/brands`

#### 브랜드 생성

```bash
POST /brands
{
  "name": "설화수",
  "code": "sulwhasoo",
  "description": "아모레퍼시픽 대표 럭셔리 브랜드",
  "logoUrl": "https://cdn.example.com/brands/sulwhasoo.png",
  "colorScheme": {
    "primary": "#8B4513",
    "secondary": "#F5DEB3",
    "accent": "#D2691E"
  },
  "category": "luxury",
  "displayOrder": 1
}
```

#### 브랜드 카테고리

| 카테고리 | 설명 |
|----------|------|
| luxury | 럭셔리 |
| premium | 프리미엄 |
| masstige | 매스티지 |
| mass | 대중 |

---

### 4.2 브랜드 콘텐츠 관리

**API 경로:** `/api/signage/{serviceKey}/ext/cosmetics/contents`

#### 콘텐츠 생성

```bash
POST /contents
{
  "brandId": "uuid-of-brand",
  "title": "2025 S/S 신제품 런칭",
  "description": "봄 시즌 신제품을 소개합니다",
  "contentType": "promotion",
  "mediaAssets": {
    "imageUrl": "https://cdn.example.com/cosmetics/ss2025.jpg",
    "videoUrl": "https://cdn.example.com/cosmetics/ss2025.mp4",
    "thumbnailUrl": "https://cdn.example.com/cosmetics/thumb.jpg",
    "additionalImages": [
      "https://cdn.example.com/cosmetics/detail1.jpg",
      "https://cdn.example.com/cosmetics/detail2.jpg"
    ]
  },
  "season": "2025-SS",
  "scope": "global",
  "campaignStart": "2025-03-01T00:00:00Z",
  "campaignEnd": "2025-05-31T23:59:59Z"
}
```

#### 콘텐츠 유형

| 유형 | 설명 |
|------|------|
| product | 제품 소개 |
| brand-story | 브랜드 스토리 |
| promotion | 프로모션 |
| lookbook | 룩북 |
| tutorial | 튜토리얼 |

**참고:** Cosmetics는 Force를 지원하지 않습니다. 모든 콘텐츠는 매장에서 Clone 가능합니다.

---

### 4.3 트렌드 카드 관리

시즌별 트렌드/룩북 카드를 관리합니다.

**API 경로:** `/api/signage/{serviceKey}/ext/cosmetics/trends`

#### 트렌드 카드 생성

```bash
POST /trends
{
  "title": "2025 S/S 컬러 트렌드",
  "description": "올 봄 주목해야 할 메이크업 컬러",
  "trendType": "color",
  "colorPalette": ["#FF6B6B", "#4ECDC4", "#FFE66D"],
  "productReferences": ["product-uuid-1", "product-uuid-2"],
  "thumbnailUrl": "https://cdn.example.com/trends/ss2025-color.jpg",
  "season": "SS",
  "year": 2025,
  "displayOrder": 1
}
```

#### 트렌드 유형

| 유형 | 설명 |
|------|------|
| color | 컬러 트렌드 |
| style | 스타일 트렌드 |
| technique | 기법 트렌드 |
| ingredient | 성분 트렌드 |

---

## 5. Seller Extension 운영

### 5.1 파트너 관리 (Admin 전용)

광고주/파트너를 등록하고 관리합니다.

**API 경로:** `/api/signage/{serviceKey}/ext/seller/partners`

#### 파트너 등록

```bash
POST /partners
{
  "displayName": "ABC 제조사",
  "code": "abc-mfg",
  "description": "건강기능식품 전문 제조사",
  "logoUrl": "https://cdn.example.com/partners/abc.png",
  "category": "manufacturer",
  "tier": "standard",
  "contactInfo": {
    "name": "홍길동",
    "email": "hong@abc.com",
    "phone": "010-1234-5678"
  },
  "contractInfo": {
    "contractId": "CONTRACT-2025-001",
    "startDate": "2025-01-01",
    "endDate": "2025-12-31"
  }
}
```

#### 파트너 카테고리

| 카테고리 | 설명 |
|----------|------|
| manufacturer | 제조사 |
| distributor | 유통사 |
| brand | 브랜드 |
| agency | 광고 대행사 |
| local-business | 지역 사업자 |

#### 파트너 상태

| 상태 | 설명 |
|------|------|
| pending | 승인 대기 |
| active | 활성 |
| suspended | 일시 중지 |
| terminated | 계약 종료 |

---

### 5.2 캠페인 관리

**API 경로:** `/api/signage/{serviceKey}/ext/seller/campaigns`

#### 캠페인 생성

```bash
POST /campaigns
{
  "partnerId": "uuid-of-partner",
  "title": "2025년 봄 프로모션",
  "description": "신제품 출시 기념 할인 이벤트",
  "campaignType": "promotion",
  "startAt": "2025-03-01T00:00:00Z",
  "endAt": "2025-03-31T23:59:59Z",
  "targeting": {
    "serviceKeys": ["pharmacy-seoul", "pharmacy-gyeonggi"],
    "regions": ["seoul", "gyeonggi"],
    "storeTypes": ["flagship", "regular"],
    "excludeStoreIds": []
  },
  "budget": {
    "totalBudget": 1000000,
    "dailyBudget": 50000,
    "currency": "KRW"
  },
  "priority": 1
}
```

#### 캠페인 승인 (Admin 전용)

```bash
POST /campaigns/{id}/approve
{
  "approved": true
}
```

또는 거절:

```bash
POST /campaigns/{id}/approve
{
  "approved": false,
  "rejectionReason": "예산 정보가 불명확합니다. 수정 후 재제출해주세요."
}
```

---

### 5.3 Seller 콘텐츠 관리

**API 경로:** `/api/signage/{serviceKey}/ext/seller/contents`

#### 콘텐츠 생성

```bash
POST /contents
{
  "partnerId": "uuid-of-partner",
  "campaignId": "uuid-of-campaign",
  "title": "신제품 ABC 출시",
  "description": "건강한 봄을 위한 신제품",
  "contentType": "product-ad",
  "mediaAssets": {
    "imageUrl": "https://cdn.example.com/ads/abc-product.jpg",
    "videoUrl": "https://cdn.example.com/ads/abc-product.mp4",
    "thumbnailUrl": "https://cdn.example.com/ads/abc-thumb.jpg",
    "qrCodeUrl": "https://cdn.example.com/ads/abc-qr.png",
    "landingUrl": "https://partner.com/product/abc"
  },
  "metricsEnabled": true,
  "displayOrder": 1
}
```

#### 콘텐츠 승인 (Admin 전용)

```bash
POST /contents/{id}/approve
{
  "approved": true
}
```

**참고:** Seller 콘텐츠는 승인 후에만 Global Content로 노출됩니다.

---

## 6. Global Content 관리

### 6.1 Global Content란?

Global Content는 모든 매장에서 조회/Clone할 수 있는 콘텐츠입니다.

### 6.2 조회 조건

Global Content로 노출되려면:
- `scope = 'global'`
- `status = 'published'` 또는 `'approved'`
- `isActive = true`
- 유효 기간 내

### 6.3 Extension별 Global Content 조회

#### Pharmacy

```bash
GET /api/signage/{serviceKey}/ext/pharmacy/global/contents
?page=1&limit=20&categoryId=xxx&season=winter
```

#### Cosmetics

```bash
GET /api/signage/{serviceKey}/ext/cosmetics/global/contents
?page=1&limit=20&brandId=xxx&contentType=promotion
```

#### Seller

```bash
GET /api/signage/{serviceKey}/ext/seller/global/contents
?page=1&limit=20&partnerId=xxx&contentType=product-ad
```

### 6.4 병합 우선순위

Player에서 콘텐츠가 표시되는 순서:

```
1. Core Forced (hq)           ← 최우선
2. Extension Forced (pharmacy-hq)
3. Core Global
4. Extension Global
5. Store Local                ← 최하위
```

---

## 7. 콘텐츠 승인 워크플로우

### 7.1 Seller 승인 프로세스

```
Partner 생성
    ↓
[draft] 작성 중
    ↓
제출 요청
    ↓
[pending] 승인 대기
    ↓
Admin 검토
    ↓
┌─────┴─────┐
│           │
[approved]  [rejected]
승인됨      거절됨
    ↓
캠페인 기간 도래
    ↓
[active]
활성화 (노출)
```

### 7.2 승인 알림

승인/거절 시 Partner에게 알림이 전송됩니다 (구현 예정).

### 7.3 재제출

거절된 콘텐츠는 수정 후 재제출 가능합니다:

```bash
PATCH /contents/{id}
{
  "status": "pending",
  ... (수정된 내용)
}
```

---

## 8. 통계 및 리포트

### 8.1 Pharmacy 통계

```bash
GET /api/signage/{serviceKey}/ext/pharmacy/hq/stats
```

응답:
```json
{
  "data": {
    "totalContents": 150,
    "byCategory": { "health-supplement": 50, "otc-drug": 30, ... },
    "byStatus": { "published": 120, "draft": 20, "archived": 10 },
    "byContentType": { "product-info": 80, "health-tip": 40, ... },
    "totalClones": 500,
    "totalViews": 10000
  }
}
```

### 8.2 Cosmetics 통계

```bash
GET /api/signage/{serviceKey}/ext/cosmetics/stats
```

### 8.3 Seller 통계 (Admin 전용)

```bash
GET /api/signage/{serviceKey}/ext/seller/stats
```

응답:
```json
{
  "data": {
    "totalPartners": 20,
    "activePartners": 15,
    "totalCampaigns": 50,
    "activeCampaigns": 10,
    "totalContents": 200,
    "approvedContents": 150,
    "pendingContents": 30,
    "byContentType": { "product-ad": 100, "promotion": 50, ... },
    "totalImpressions": 50000,
    "totalClicks": 1500,
    "totalClones": 300
  }
}
```

### 8.4 Seller Metrics 조회

```bash
GET /api/signage/{serviceKey}/ext/seller/metrics
?startDate=2025-01-01&endDate=2025-01-31&partnerId=xxx
```

응답:
```json
{
  "data": {
    "contentId": "xxx",
    "partnerId": "xxx",
    "period": { "startDate": "2025-01-01", "endDate": "2025-01-31" },
    "totals": {
      "impressions": 10000,
      "clicks": 300,
      "qrScans": 50,
      "videoStarts": 5000,
      "videoCompletes": 3500,
      "totalDurationSeconds": 180000
    },
    "ctr": 3.0,
    "vtr": 70.0
  }
}
```

---

## 9. 문제 해결 가이드

### 9.1 일반 문제

#### 콘텐츠가 매장에 표시되지 않음

**확인 사항:**
1. `scope`가 `'global'`인가?
2. `status`가 `'published'` 또는 `'approved'`인가?
3. `isActive`가 `true`인가?
4. 유효 기간 내인가?
5. (Seller) 캠페인이 `'active'` 상태인가?

#### Force 콘텐츠가 삭제되지 않음

**정상 동작입니다.** Force 콘텐츠는 삭제할 수 없습니다.
비활성화하려면 `isActive: false`로 설정하세요.

#### 매장에서 Clone이 안 됨

**확인 사항:**
1. 매장 사용자가 `Store` 역할인가?
2. (Pharmacy) Force 콘텐츠가 아닌가? (Force는 Clone 불가)
3. 네트워크 연결 상태 확인

### 9.2 Seller 관련 문제

#### 캠페인이 노출되지 않음

**확인 사항:**
1. 캠페인 상태가 `'active'`인가?
2. 현재 날짜가 `startAt` ~ `endAt` 사이인가?
3. 타겟팅 조건에 해당 매장이 포함되어 있는가?
4. 콘텐츠가 `'approved'` 상태인가?

#### Metrics가 수집되지 않음

**확인 사항:**
1. 콘텐츠의 `metricsEnabled`가 `true`인가?
2. Player가 정상 작동 중인가?
3. 네트워크 연결 상태 확인

---

## 10. FAQ

### Q1. Force와 Non-Force의 차이점은?

| 항목 | Force | Non-Force |
|------|-------|-----------|
| 매장 표시 | 필수 (항상 표시) | 선택 (Clone 필요) |
| 매장 삭제 | 불가 | 가능 |
| Clone | 불가 | 가능 |
| 설정 가능 역할 | Admin/Operator (Pharmacy HQ만) | 모든 콘텐츠 생성자 |

### Q2. 캠페인 기간이 지나면 콘텐츠는 어떻게 되나요?

캠페인 기간이 지나면:
- Global Content 목록에서 미노출
- 이미 Clone된 Store 콘텐츠는 유지
- Metrics 수집 중단

### Q3. 여러 Extension의 콘텐츠가 함께 표시되나요?

예. 각 Extension의 Global Content가 병합 우선순위에 따라 함께 표시됩니다.

### Q4. Partner가 직접 콘텐츠를 수정할 수 있나요?

`'draft'` 또는 `'rejected'` 상태의 콘텐츠만 수정 가능합니다.
`'approved'` 또는 `'active'` 상태에서는 수정 불가합니다.

### Q5. 통계 데이터는 실시간인가요?

- 기본 통계 (counts): 실시간
- Metrics (impressions, clicks): 준실시간 (최대 5분 지연)
- 일별 집계: 매일 자정 기준

---

## 부록

### A. API Base URL

```
Production: https://api.o4o-platform.com/api/signage/{serviceKey}/ext
Development: http://localhost:3000/api/signage/{serviceKey}/ext
```

### B. 공통 응답 형식

**성공 (단일 항목):**
```json
{
  "data": { ... }
}
```

**성공 (목록):**
```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**오류:**
```json
{
  "error": "ERROR_CODE",
  "message": "에러 설명",
  "statusCode": 400
}
```

### C. HTTP 상태 코드

| 코드 | 설명 |
|------|------|
| 200 | 성공 |
| 201 | 생성 성공 |
| 204 | 삭제 성공 |
| 400 | 잘못된 요청 |
| 401 | 인증 필요 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 500 | 서버 오류 |
| 503 | Extension 비활성화 |

---

*문서 버전: 3.0.0*
*최종 수정: 2026-01-20*
