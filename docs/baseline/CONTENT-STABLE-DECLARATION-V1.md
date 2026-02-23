# Content Stable Declaration v1

> **IR-O4O-CONTENT-STABLE-DECLARATION-V1**
> **Date**: 2026-02-23
> **Status**: STABLE
> **CLAUDE.md Section**: 24

---

## 1. 선언 목적

O4O Platform의 콘텐츠 계층(CMS + Signage + HUB 집계 레이어)은
구조적 정렬, 정책 통합, 안정화 검증을 완료하였으므로
**Stable 상태로 승격**한다.

이 선언 이후, 콘텐츠 계층은
임의 변경이 아닌 **Work Order 기반 변경만** 허용된다.

---

## 2. Stable 범위

| # | 구성 요소 | 위치 | 상태 |
|---|----------|------|------|
| 1 | HubProducer 제작자 모델 | `@o4o/types/hub-content` | Stable |
| 2 | HubVisibility 가시성 모델 | `@o4o/types/hub-content` | Stable |
| 3 | HubSourceDomain 원본 도메인 | `@o4o/types/hub-content` | Stable |
| 4 | Producer ↔ authorRole 매핑 | `hub-content.service.ts` | Stable |
| 5 | Producer ↔ source 매핑 | `hub-content.service.ts` | Stable |
| 6 | HubContentQueryService | `api-server/modules/hub-content/` | Stable |
| 7 | ServiceKey 격리 정책 | 컨트롤러 + 서비스 | Stable |
| 8 | scope='global' Public 보호 | Signage 쿼리 WHERE 절 | Stable |
| 9 | CMS visibilityScope 필터 | CMS 쿼리 WHERE 절 | Stable |

---

## 3. Stable 달성 근거

### 3-A. 선행 정책 문서

| 문서 | 상태 |
|------|------|
| IR-O4O-PLATFORM-CONTENT-POLICY-FINAL-V1 (3축 모델) | 확정 |
| WO-O4O-HUB-CONTENT-QUERY-SERVICE-PHASE1-V2 | 구현 완료 |
| WO-O4O-HUB-CONTENT-STABILIZATION-TEST-V1 | 검증 PASS |

### 3-B. 안정화 검증 결과

| 항목 | 결과 |
|------|------|
| Producer 매핑 서버 이전 | 완료 |
| Visibility DB 조건 강제 | 완료 |
| ServiceKey 격리 | 완료 |
| Store 콘텐츠 HUB 미노출 | 완료 |
| Cross-service 유출 0건 | 검증 PASS |
| 직접 비교 ID 세트 100% 일치 | 검증 PASS |
| 500 에러 0건 | 검증 PASS |
| tsc 빌드 | PASS |
| Edge case 8/8 | PASS |
| 계층 위반 0건 | 확인 완료 |

### 3-C. 성능 측정

| 엔드포인트 | 응답 시간 | 평가 |
|-----------|-----------|------|
| Hub All (3도메인 병합) | ~145ms | 양호 |
| Hub CMS only | ~113ms | 양호 |
| Hub Signage only | ~116ms | 양호 |
| 기존 CMS Direct | ~92ms | 기준 |
| 기존 Signage Direct | ~93ms | 기준 |

---

## 4. 보호 영역 (변경 시 WO 필수)

다음 항목은 명시적 Work Order 없이 수정 불가:

### 4-A. 타입 구조

- `HubProducer` enum: `'operator' | 'supplier' | 'community'`
- `HubVisibility` enum: `'global' | 'service' | 'store'`
- `HubSourceDomain` enum: `'cms' | 'signage-media' | 'signage-playlist'`
- `HubContentItemResponse` 인터페이스 구조
- `HubContentListResponse` 응답 구조

### 4-B. 매핑 로직

| HUB Producer | CMS authorRole | Signage source |
|:---:|:---:|:---:|
| operator | admin, service_admin | hq |
| supplier | supplier | supplier |
| community | community | community |

### 4-C. 쿼리 정책

- CMS: `status = 'published'`, `visibilityScope IN ('platform', 'service')`
- Signage: `status = 'active'`, `scope = 'global'`
- ServiceKey: 필수 파라미터, 서버에서 강제

### 4-D. API 계약

- `GET /api/v1/hub/contents` — 공개 읽기 전용
- Query params: `serviceKey` (필수), `producer`, `sourceDomain`, `page`, `limit`
- 응답 형태: `{ success, data, pagination }`

---

## 5. 허용되는 변경 범위

Stable 이후 WO 없이 허용되는 변경:

- 버그 수정 (Bug fix)
- 성능 개선 (캐싱, 인덱스 등)
- UI 표현 개선 (기존 데이터 구조 내)
- 문서 추가
- 테스트 추가
- 새로운 sourceDomain 추가 (기존 정책 패턴 준수 시)

---

## 6. 변경 절차 (Stable 이후)

```
1. IR (조사 보고서) 작성
2. 영향 범위 분석
3. 명시적 WO 승인
4. 구현
5. Stabilization Test
6. Stable 유지 여부 판정
```

---

## 7. 아키텍처 참조

### 데이터 흐름

```
[CMS DB] ─── CmsContent Entity ──→ ┐
                                    │
[Signage DB] ── signage_media ────→ ├─→ HubContentQueryService ──→ GET /api/v1/hub/contents
                                    │
[Signage DB] ── signage_playlists → ┘
```

### 계층 구조

```
@o4o/types/hub-content          (Shared Types — Stable)
    ↓
api-server/modules/hub-content  (Backend Service — Stable)
    ↓
web-*/api/hubContent.ts         (Frontend Client)
    ↓
web-*/pages/pharmacy/*          (UI Pages)
```

### 관련 Frozen 패키지

- `@o4o/hub-core` — Hub UI 레이아웃 (CLAUDE.md §20)
- `@o4o/hub-exploration-core` — Hub 탐색 컴포넌트
- APP-CONTENT (`ContentQueryService`) — 기준선 APP (CLAUDE.md §18)
- APP-SIGNAGE (`SignageQueryService`) — 기준선 APP (CLAUDE.md §18)

---

## 8. 플랫폼 Stable 현황

| 영역 | 상태 | 선언일 | CLAUDE.md |
|------|------|--------|-----------|
| Retail Stable | Frozen | 2026-02 | §13-A |
| Operator OS Baseline | Frozen | 2026-02-16 | §20 |
| KPA UX Baseline | Frozen | 2026-02-17 | §21 |
| Store Layer Architecture | Frozen | 2026-02-22 | §22 |
| Platform Content Policy | Baseline | 2026-02-23 | §23 |
| **Content Stable** | **Stable** | **2026-02-23** | **§24** |

---

*Updated: 2026-02-23*
*Version: 1.0*
*Status: STABLE*
