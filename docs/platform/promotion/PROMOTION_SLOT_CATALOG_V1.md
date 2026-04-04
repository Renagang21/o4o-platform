# PROMOTION_SLOT_CATALOG_V1

> 프로모션/안내 영역 공통 슬롯 카탈로그

---

## 1. 문서 목적

O4O 플랫폼에서 사용할 **프로모션 슬롯 키(slotKey)의 공식 카탈로그**를 정의한다.

이 문서에 정의된 slotKey만 `CmsContentSlot.slotKey`에 사용할 수 있다.
새 slotKey가 필요하면 이 문서를 먼저 업데이트한 후 구현한다.

---

## 2. slotKey 네이밍 규칙

```
{context}-{position}
```

| 세그먼트 | 설명 | 예시 |
|---------|------|------|
| `context` | 화면/영역 맥락 | `home`, `community`, `dashboard`, `hub`, `page` |
| `position` | 배치 위치 | `hero`, `ads`, `logos`, `banner`, `promo`, `cta`, `sponsors` |

---

## 3. 공통 슬롯 (Cross-Service)

모든 서비스에서 사용 가능한 슬롯.

| slotKey | 설명 | 다중/단일 | 자동 전환 | 시간 노출 | 비고 |
|---------|------|:---------:|:---------:|:---------:|------|
| `home-hero` | Home 메인 Hero 슬라이더 | **다중** (슬라이드) | 5초 자동 전환 | 선택적 | 가장 중요한 슬롯 |
| `home-ads` | Home 광고/프로모션 카드 | **다중** (최대 3열) | 없음 | 선택적 | 0건이면 미표시 |
| `home-logos` | Home 파트너/브랜드 로고 캐러셀 | **다중** | 무한 스크롤 | 없음 | 0건이면 미표시 |
| `home-featured` | Home 추천/주목 섹션 | **다중** (최대 3) | 없음 | 선택적 | |
| `home-cta` | Home 하단 CTA 블록 | **단일** | 없음 | 선택적 | |
| `community-hero` | Community Hub Hero 배너 | **다중** (슬라이드) | 5초 자동 전환 | 선택적 | 현재 `community_ads` type=hero |
| `community-ads` | Community Hub 광고 그리드 | **다중** (최대 3열) | 없음 | 선택적 | 현재 `community_ads` type=page |
| `community-sponsors` | Community Hub 스폰서 바 | **다중** | 없음 | 없음 | 현재 `community_sponsors` |
| `dashboard-banner` | 대시보드 배너 | **단일** 또는 **다중** (최대 2) | 없음 | 선택적 | |
| `dashboard-promo` | 대시보드 프로모/안내 카드 | **다중** (최대 3) | 없음 | **필수** (기간) | |

---

## 4. 서비스 전용 슬롯

특정 서비스에서만 사용하는 슬롯.

### 4.1 Neture 전용

| slotKey | 설명 | 다중/단일 | 비고 |
|---------|------|:---------:|------|
| `neture-home-b2b` | B2B 소개 섹션 | 단일 | 정적 유지 가능 |

### 4.2 KPA 전용

| slotKey | 설명 | 다중/단일 | 비고 |
|---------|------|:---------:|------|
| `intranet-hero` | 인트라넷 메인 Hero (조직별) | **다중** | `organizationId` 필수 |
| `intranet-promo` | 인트라넷 프로모/안내 카드 (조직별) | **다중** (최대 3) | 기간 필터 필수 |
| `intranet-partners` | 인트라넷 협력업체 로고 | **다중** | 지부만 관리 |

### 4.3 K-Cosmetics 전용

| slotKey | 설명 | 다중/단일 | 비고 |
|---------|------|:---------:|------|
| `home-running` | Now Running (진행 중 프로그램) | **다중** (최대 4) | metadata에 type/deadline |
| `home-notices` | Home 운영 공지 | **다중** | metadata에 isPinned |

### 4.4 GlycoPharm 전용

| slotKey | 설명 | 다중/단일 | 비고 |
|---------|------|:---------:|------|
| (없음 — Store Hero는 Store Template 전용으로 Core 슬롯 대상 아님) | | | |

---

## 5. 페이지 내부 슬롯 (향후 확장)

Phase 1에서는 정의만 하고 구현 보류.

| slotKey | 설명 | 다중/단일 | 비고 |
|---------|------|:---------:|------|
| `page-top-banner` | 페이지 상단 안내 배너 | **단일** | 모든 페이지 공통 사용 가능 |
| `page-mid-promo` | 페이지 중간 프로모션 | **다중** | 콘텐츠 목록 사이 삽입 |
| `page-bottom-cta` | 페이지 하단 CTA | **단일** | |

---

## 6. 슬롯별 데이터 구조 요구사항

### 6.1 Hero 계열 (`*-hero`)

```
CmsContent 필수 필드:
- title: 헤드라인
- summary: 서브헤드 (nullable)
- imageUrl: 배경 이미지 (nullable → 그라데이션 폴백)
- linkUrl: CTA 링크 (nullable)
- linkText: CTA 버튼 텍스트 (nullable)
- metadata.backgroundColor: 배경색 (nullable)
```

### 6.2 Ads/Promo 계열 (`*-ads`, `*-promo`, `dashboard-promo`)

```
CmsContent 필수 필드:
- title: 제목
- summary: 설명 (nullable)
- imageUrl: 썸네일 (nullable)
- linkUrl: 클릭 대상 (nullable)
- type: 'promo' | 'event' | 'notice'

CmsContentSlot 추가:
- startsAt/endsAt: 기간 노출 (dashboard-promo는 필수)
```

### 6.3 Logo 계열 (`*-logos`, `*-sponsors`, `intranet-partners`)

```
CmsContent 필수 필드:
- title: 업체명
- imageUrl: 로고 이미지
- linkUrl: 업체 링크 (nullable)
- metadata.logoUrl: 별도 로고 URL (nullable, imageUrl 우선)
```

### 6.4 Banner 계열 (`dashboard-banner`, `page-top-banner`)

```
CmsContent 필수 필드:
- title: 배너 텍스트
- summary: 부가 설명 (nullable)
- imageUrl: 배너 이미지 (nullable)
- linkUrl: 클릭 대상 (nullable)
```

---

## 7. slotKey 추가 절차

1. 이 문서에 새 slotKey를 추가 (PR)
2. 문서 3(서비스 매트릭스)에 해당 서비스 반영
3. 문서 4(데이터 모델)에서 필요 필드 확인
4. 구현 WO 작성

---

*Version: 1.0*
*Created: 2026-04-04*
*Status: Draft*
