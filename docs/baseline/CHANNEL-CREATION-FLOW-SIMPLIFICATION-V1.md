# Channel Creation Flow Simplification — Baseline Declaration

> **WO-CHANNEL-CREATION-FLOW-SIMPLIFICATION-V1**
> **Date: 2026-02-25**
> **Status: Complete**

---

## 1. Overview

`organization_channels` 단일 테이블을 유지하되,
채널 생성 흐름을 단순화하고 channel_type별 lifecycle 정책을 코드로 강제한다.

### 전략

- 구조 분리하지 않는다
- 리팩토링 최소화
- 실사용 축적 우선

---

## 2. 채널별 Lifecycle 정책

| channel_type | 생성 시 status | 승인 필요 | 비고 |
|-------------|:---:|:---:|------|
| **B2C** | PENDING | 예 (Gate) | 기존 유지 |
| **KIOSK** | PENDING | 예 (Gate) | B2C와 동일 |
| **TABLET** | APPROVED | 없음 | 즉시 생성 |
| **SIGNAGE** | APPROVED | 없음 | 즉시 생성 |

코드 강제: `INSTANT_CHANNELS = ['TABLET', 'SIGNAGE']`

---

## 3. DB 변경

### config JSONB 컬럼 추가

```sql
ALTER TABLE "organization_channels"
ADD COLUMN "config" JSONB NOT NULL DEFAULT '{}';
```

목적: 채널별 Hero/Theme/배치 설정 저장 (향후 Phase 2)

---

## 4. API Endpoint

### `POST /api/v1/kpa/store-hub/channels`

```
Body: { channelType: "B2C" | "KIOSK" | "TABLET" | "SIGNAGE" }
```

| 조건 | 응답 |
|------|------|
| TABLET/SIGNAGE | 201 — status: APPROVED, approved_at: NOW() |
| B2C/KIOSK | 201 — status: PENDING |
| 중복 | 409 — ALREADY_EXISTS |
| 잘못된 타입 | 400 — INVALID_INPUT |

### 보호 로직

- Cross-Org 방어: `organization_id` 인증 컨텍스트에서 강제
- channel_type ENUM 강제: 4개만 허용
- `UQ_org_channel_type (organization_id, channel_type)` DB 제약 활용
- B2C/KIOSK 자동 승인 금지

---

## 5. Frontend 변경

### 미등록 채널 → "채널 만들기" 버튼

- KPI 카드 "채널 상태" 영역에 버튼 표시
- 제품 목록 영역에도 버튼 표시
- 생성 후 전체 데이터 새로고침

### PENDING 상태 안내

- 제품 목록 영역에 "채널이 신청되었습니다. 승인 후 제품을 진열할 수 있습니다." 표시
- "제품 추가" 버튼은 APPROVED 상태에서만 노출

---

## 6. 파일 목록

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/database/migrations/20260225000001-AddConfigToOrganizationChannels.ts` | config JSONB 마이그레이션 |
| `apps/api-server/src/routes/kpa/entities/organization-channel.entity.ts` | Entity config 컬럼 추가 |
| `apps/api-server/src/routes/kpa/controllers/store-hub.controller.ts` | POST /channels 엔드포인트 |
| `services/web-kpa-society/src/api/storeHub.ts` | createChannel() API 클라이언트 |
| `services/web-kpa-society/src/pages/pharmacy/StoreChannelsPage.tsx` | 채널 만들기 UI |

---

## 7. 의도적 미구현

- 템플릿 선택 UI
- 색상/배치 설정 UI (config 수정 API)
- 법적 서류 업로드
- CMS Channel 구조 변경
- B2C activate Gate 엔드포인트 (기존 유지)

---

## 8. 관련 WO

- **WO-CHANNEL-EXECUTION-CONSOLE-V1**: 채널 실행 콘솔 (선행, 완료)
- **WO-TABLET-DOMAIN-SIMPLIFICATION-V1**: TABLET 도메인 분리 (별도 진행)

---

*WO-CHANNEL-CREATION-FLOW-SIMPLIFICATION-V1*
*Updated: 2026-02-25*
