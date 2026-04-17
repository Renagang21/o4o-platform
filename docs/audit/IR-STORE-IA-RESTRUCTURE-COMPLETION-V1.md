# IR-STORE-IA-RESTRUCTURE-COMPLETION-V1

> **상태: 완료**
> **기준일: 2026-04-17**
> **대상 서비스: KPA Society (`/store`)**

---

## 1. Overview

### 목적

`/store` 영역의 정보구조(IA)를 작업 흐름 중심으로 재배치하여, 사용자가 기능을 발견하고 활용하는 경로를 단순화한다.

### 정비 전 문제

- **메뉴 분산**: 채널, 태블릿, 사이니지 관련 기능이 서로 다른 섹션에 산재
- **hidden 기능 존재**: `products/b2c`, `channels`, `tablet-displays` 등 구현된 기능이 사이드바에 미노출
- **흐름 단절**: 상품 노출 설정(PharmacySell) → 디바이스 배치(TabletDisplays) 연결 없음. 채널 현황(Channels) → 태블릿 진열(TabletDisplays) 진입점 없음

### 정비 후 상태

기능은 유지한 상태에서, 작업 흐름 중심 구조로 재배치 완료.

---

## 2. 최종 구조 (Top-level IA)

### 2.1 상단 개념 구조

| 구분 | 설명 |
|---|---|
| **HOME** | 매장 현황 요약. KPI 카드 + 오늘 바로 하기 중심 |
| **ORDER** | 주문 접수 · 처리 흐름 (B2B/B2C) |
| **STORE_DISPLAY** | 상품 진열 · 채널 배분 · 디바이스 배치 |
| **EXTERNAL_PROMOTION** | QR, POP, 블로그 등 외부 홍보 도구 |

---

### 2.2 사이드바 구조 (최종)

```
홈
약국 정보

── 콘텐츠
  자료실             /store/operation/library
  블로그             /store/content/blog

── 홍보
  QR 관리            /store/marketing/qr
  POP 자료           /store/marketing/pop

── 상품/주문
  상품 관리           /store/commerce/products
  자체 상품           /store/commerce/local-products
  주문 관리           /store/commerce/orders

── 매장 디스플레이          ← 이번 정비 핵심 섹션
  매장 진열 상품       /store/commerce/products/b2c
  채널 현황           /store/channels
  매장 사이니지        /store/marketing/signage
  태블릿 진열         /store/commerce/tablet-displays

── 분석
  마케팅 분석          /store/analytics/marketing

── 설정
  매장 설정           /store/settings
  레이아웃 빌더        /store/settings/layout
```

---

## 3. 주요 변경 사항 요약

### 3.1 사이드바 재구성

- `signage` 항목을 "콘텐츠" 섹션에서 "매장 디스플레이" 섹션으로 이동
- "매장 디스플레이" 섹션 신설 (4항목, flat 구조)
- 섹션 순서 고정: 매장 진열 상품 → 채널 현황 → 매장 사이니지 → 태블릿 진열
- 관련 WO: `WO-STORE-HIDDEN-ROUTES-UNHIDE-V1`

### 3.2 hidden 기능 정식 노출

이전에 구현되어 있었으나 사이드바 미노출 상태였던 페이지:

| 페이지 | 이전 상태 | 변경 후 |
|---|---|---|
| `/store/commerce/products/b2c` | 미노출 | 매장 디스플레이 섹션 정식 노출 |
| `/store/channels` | 미노출 | 매장 디스플레이 섹션 정식 노출 |
| `/store/commerce/tablet-displays` | 미노출 | 매장 디스플레이 섹션 정식 노출 |
| `/store/marketing/signage` | 콘텐츠 섹션 | 매장 디스플레이 섹션으로 이동 |

### 3.3 UX 흐름 연결

**Channels → TabletDisplays**
- `/store/channels` TABLET 탭의 Quick Action에 "태블릿 진열" 버튼 추가 (→ `/store/commerce/tablet-displays`)
- 기존 "태블릿 요청 관리" 버튼 라벨을 "태블릿 주문 요청"으로 명확화
- TABLET 탭 하단에 두 작업 분기점 카드 추가 (진열 구성 / 주문 요청)
- 관련 WO: `WO-STORE-CHANNELS-TABLET-QUICKACTION-FIX-V1`

**PharmacySell → TabletDisplays**
- `/store/commerce/products/b2c` ChannelSettingsPanel TABLET 행에 안내 문구 + 링크 추가
- "노출 여부는 여기서 설정합니다. 디바이스별 배치는 [태블릿 진열]에서 관리합니다."
- 관련 WO: `WO-STORE-SELL-LISTINGS-TABLET-LINK-V1`

---

## 4. 핵심 페이지 역할 정의 (고정 기준)

| 페이지 | 역할 정의 |
|---|---|
| `/store/commerce/products/b2c` | **매장 진열 상품** — 상품을 매장에 등록하고 채널별 노출 여부를 설정하는 입력 레이어 |
| `/store/channels` | **채널 현황** — B2C/KIOSK/TABLET/SIGNAGE 4채널의 상위 요약 및 디스패처 |
| `/store/marketing/signage` | **매장 사이니지** — 콘텐츠·플레이리스트·스케줄 운영 화면 |
| `/store/commerce/tablet-displays` | **태블릿 진열** — 태블릿 디바이스별 상품 배치 편집 화면 |

이 기준은 역할 매트릭스 조사 결과를 따르며, 향후 WO 작성 시 이 정의를 기준으로 사용한다.

---

## 5. 사용자 작업 흐름

### 5.1 기본 흐름

1. **공급 상품 찾기** — `/hub/b2b` 또는 `/store/commerce/products` 에서 상품 확인
2. **매장 진열 상품 등록** — `/store/commerce/products/b2c` 에서 판매 신청 및 승인 확인
3. **채널 노출 설정** — 채널 설정 패널에서 B2C/KIOSK/TABLET/SIGNAGE 노출 여부 결정
4. **태블릿 진열 구성** — `/store/commerce/tablet-displays` 에서 디바이스별 배치 편집
5. **사이니지/홍보 활용** — `/store/marketing/signage`, `/store/marketing/qr` 등

### 5.2 TABLET 흐름 (중요)

| 단계 | 화면 | 작업 |
|---|---|---|
| 1 | `/store/commerce/products/b2c` | 상품의 TABLET 채널 노출 활성화 |
| 2 | `/store/commerce/tablet-displays` | 실제 태블릿 디바이스별 배치 설정 |
| 3 | `/store/channels` TABLET 탭 | 채널 상태 및 주문 요청 확인 |

이 흐름은 "입력(노출 설정) → 배치(디바이스별 편집) → 확인(채널 현황)" 구조다.

---

## 6. 개선된 UX 포인트

| 항목 | 내용 |
|---|---|
| hidden 기능 제거 | 구현된 기능이 사이드바에 노출되지 않는 상태 해소 |
| 메뉴 명칭 명확화 | "채널 집행" → "채널 현황", "태블릿 디스플레이" → "태블릿 진열" 등 역할 중심 명칭으로 통일 |
| "입력 → 배치" 흐름 가시화 | PharmacySell ChannelSettings TABLET 행에 태블릿 진열 직접 링크 추가 |
| 채널 중심 사고 구조 정립 | Channels 페이지가 4채널의 단순 목록이 아니라 각 채널별 작업 분기점이 되도록 개선 |
| flat 구조 유지 | 매장 디스플레이 4개 항목을 트리 계층 없이 동등 flat 구조로 유지 |

---

## 7. 남은 과제 (Outstanding Issues)

### 7.1 PARTIAL 기능 (구현됨, 미완성)

| 페이지 | 현재 상태 |
|---|---|
| `/store/commerce/orders` | 기본 목록 존재, 처리 워크플로우 미완성 |
| `/store/billing` | UI 존재, 실 데이터 연동 미확인 |
| Suppliers 연동 | Mock 데이터 기반, 실 공급자 연동 미완성 |

### 7.2 추가 개선 여지

| 항목 | 상태 |
|---|---|
| Channels TABLET ↔ TabletDisplays 연결 | **완료** (WO-STORE-CHANNELS-TABLET-QUICKACTION-FIX-V1) |
| PharmacySell → TabletDisplays 연결 | **완료** (WO-STORE-SELL-LISTINGS-TABLET-LINK-V1) |
| `/store/channels` TABLET 채널의 주문 요청 플로우 정교화 | 별도 WO 필요 |
| 매장 사이니지 콘텐츠 업로드 / 스케줄 UX 고도화 | 별도 WO 필요 |
| B2C 채널 스토어프론트 ↔ 진열 상품 실시간 미리보기 연결 | 별도 WO 필요 |

---

## 8. 제외된 영역

이번 정비 범위에서 의도적으로 제외된 항목:

| 영역 | 이유 |
|---|---|
| `/store/:slug/*` (스토어프론트) | 운영자 IA와 분리된 소비자 영역 |
| API / 데이터 구조 변경 | 이번 정비는 UI/UX 레이어만 대상 |
| GlycoPharm, K-Cosmetics 등 외부 서비스 | 각 서비스별 독립 구조 유지 |
| Store Core 패키지 내부 구조 | Frozen Baseline (F3) 대상 |

---

## 9. 최종 결론

- **현재 상태**: `/store` 영역 IA 정비 완료. 기능 유지, 흐름 가시화, 메뉴 구조 단순화 완료.
- **이후 단계**: 기능 확장 및 UX 개선. 남은 PARTIAL 기능 완성 및 신규 채널 운영 도구 추가.

**한 줄 요약**: `/store`는 이제 설계 기준이 고정된 상태이며, 이후 모든 확장 작업은 이 문서의 역할 정의와 흐름을 기준으로 진행한다.

---

*작성 기준: 실제 코드 및 WO 결과*
*관련 WO: WO-STORE-HIDDEN-ROUTES-UNHIDE-V1 · WO-STORE-CHANNELS-TABLET-QUICKACTION-FIX-V1 · WO-STORE-SELL-LISTINGS-TABLET-LINK-V1*
