# Channel Execution Console — Baseline Declaration

> **WO-CHANNEL-EXECUTION-CONSOLE-V1**
> **Date: 2026-02-25**
> **Status: Phase 2 Complete**

---

## 1. Overview

채널 관리 페이지(`/store/channels`)를 **읽기 전용 KPI 대시보드**에서
**진열 실행 콘솔(Execution Console)** 로 전환한다.

### O4O 철학 기준

- O4O는 온라인 쇼핑몰이 아니다.
- 채널은 가격 전략을 조정하는 공간이 아니다.
- 채널은 **진열 실행 공간**이다.

---

## 2. 채널별 제품 관리 정책

| 채널 | 결제 | 제품 관리 | 대상 | 비고 |
|------|:---:|:---:|------|------|
| **B2C** | O | **O** | supplier 제품 | 전자상거래 |
| **KIOSK** | O | **O** | supplier 제품 | 전자상거래 |
| **TABLET** | X | **X** | 별도 로컬 제품 시스템 | WO-TABLET-DOMAIN-SIMPLIFICATION-V1 |
| **SIGNAGE** | X | **X** | 콘텐츠 전용 | 제품 관리 대상 아님 |

이 정책은 코드로 강제됨 (`PRODUCT_CHANNELS = ['B2C', 'KIOSK']`).

---

## 3. 구현 금지 항목 (절대)

| 항목 | 사유 |
|------|------|
| `channel_price` 사용 | O4O는 가격 전략 콘솔이 아님 |
| `sales_limit` 사용 | 채널별 판매 한도 불필요 |
| 채널에서 Listing 생성 | Listing은 상품 관리에서만 생성 |
| 채널별 재고 분리 | 재고는 공급자 도메인 |
| 채널별 결제 정책 변경 | 결제는 Commerce Core 책임 |

---

## 4. API Endpoints

Base: `/api/v1/kpa/store-hub/channel-products`

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/:channelId` | 채널에 등록된 제품 목록 |
| `GET` | `/:channelId/available` | 등록 가능한 제품 목록 |
| `POST` | `/:channelId` | 제품 등록 |
| `PATCH` | `/:channelId/reorder` | 노출 순서 변경 (Phase 2) |
| `PATCH` | `/:channelId/:productChannelId/deactivate` | 제품 비활성화 |

### 보호 로직

- **Cross-Org 방어**: 모든 쿼리에 `organization_id` 조건
- **채널 정책**: B2C/KIOSK만 허용 (TABLET/SIGNAGE 차단)
- **중복 방지**: `UQ_channel_product (channel_id, product_listing_id)` 제약
- **Reactivation**: 비활성 상태인 기존 매핑은 재활성화

---

## 5. 데이터 흐름

```
organization_product_listings (Listing Pool)
        │
        │ POST /:channelId (등록)
        ▼
organization_product_channels (Channel-Product Mapping)
        │
        │ is_active = true → 진열됨
        │ is_active = false → 비활성
        ▼
Channel KPI (visibleProductCount 반영)
```

---

## 6. 파일 목록

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/routes/kpa/controllers/store-channel-products.controller.ts` | Backend API (5 endpoints) |
| `apps/api-server/src/routes/kpa/controllers/store-hub.controller.ts` | organizationCode 추가 (Phase 2) |
| `apps/api-server/src/routes/kpa/kpa.routes.ts` | Route registration |
| `services/web-kpa-society/src/api/channelProducts.ts` | Frontend API client (reorder 포함) |
| `services/web-kpa-society/src/api/storeHub.ts` | fetchChannelOverviewWithCode 추가 (Phase 2) |
| `services/web-kpa-society/src/pages/pharmacy/StoreChannelsPage.tsx` | 채널 관리 UI (진열 콘솔 + 순서 변경 + 미리보기) |

---

## 7. Phase 구분

| Phase | 범위 | 상태 |
|-------|------|:---:|
| **Phase 1** | 제품 등록/제거/목록 표시 | **완료** |
| **Phase 2** | 노출 순서 변경 + 채널 미리보기 | **완료** |

---

## 8. Phase 2 상세

### 8.1 노출 순서 변경 (Up/Down)

- `PATCH /:channelId/reorder` — 전체 active 제품의 `display_order` 재설정
- UI: 각 제품 행에 ChevronUp/ChevronDown 버튼
- 첫 번째 항목의 Up, 마지막 항목의 Down은 비활성화
- 서버 저장 후 목록 재조회 (optimistic UI 아님)

### 8.2 채널 미리보기

- B2C 탭: Quick Actions에 "스토어 미리보기" 링크 (`/store/:orgCode`, 새 탭)
- `organizationCode`는 channels API 응답에 포함 (`fetchChannelOverviewWithCode`)
- orgCode 없으면 미리보기 버튼 숨김

### 8.3 비활성 제품 표시

- 비활성 제품은 active 제품 아래에 별도 섹션으로 표시
- 회색 처리 + 취소선 + opacity 50%
- 순서 변경 대상에서 제외

---

## 9. 관련 WO

- **WO-TABLET-DOMAIN-SIMPLIFICATION-V1**: TABLET 도메인 완전 분리 (별도 진행)
- **WO-O4O-STORE-CHANNEL-CENTRIC-V1**: 채널 중심 통합 운영 (선행)
- **WO-PHARMACY-HUB-CHANNEL-LAYER-UI-V1**: 채널 KPI 대시보드 (선행)

---

*WO-CHANNEL-EXECUTION-CONSOLE-V1*
*Updated: 2026-02-25*
