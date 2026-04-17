# IR-STORE-IA-RESTRUCTURE-COMPLETION-V1

> **상태: 완료**
> **기준일: 2026-04-17**
> **대상 서비스: KPA Society (`/store`)**

본 작업은 CLAUDE.md의 앱 개발 시 작업 규칙에 따라 작성한다.

---

## 1. Overview

`/store` 영역은 기존에 기능은 대부분 구현되어 있었으나,
메뉴 구조와 실제 작업 흐름이 일치하지 않아 사용성이 크게 저하된 상태였다.

주요 문제는 다음과 같았다.

- 사이드바, 홈 카드, 라우트 구조가 서로 다른 기준으로 구성됨
- 핵심 기능이 hidden 상태로 존재
- 사용자 작업 흐름이 단절됨
- "상품/주문/콘텐츠" 중심 구조로 인해 실제 업무 흐름과 불일치

이번 정비를 통해 `/store` 영역은
**기존 기능을 유지한 상태에서, 작업 흐름 중심 구조로 재배치 완료된 상태**가 되었다.

---

## 2. 최종 구조 (Top-level IA)

### 2.1 상단 개념 구조

| 구분 | 설명 |
|---|---|
| **HOME** | 매장 요약 및 진입 화면 |
| **ORDER** | 공급 상품 조회 및 주문 작업 |
| **STORE_DISPLAY** | 매장 내 고객에게 보여지는 구성 |
| **EXTERNAL_PROMOTION** | 매장 외부로 나가는 홍보 콘텐츠 |

---

### 2.2 사이드바 구조 (최종)

#### HOME

- 홈 → `/store`
- 약국 정보 → `/store/info`
- 매장 설정 → `/store/settings`

---

#### ORDER

- 공급 상품 찾기 → `/store/commerce/products`
- 주문 워크테이블 → `/store/commerce/order-worktable`
- 태블릿 주문 요청 → `/store/channels/tablet`

(※ orders, billing, suppliers는 PARTIAL로 미노출)

---

#### STORE_DISPLAY

- 매장 진열 상품 → `/store/commerce/products/b2c`
- 채널 현황 → `/store/channels`
- 매장 사이니지 → `/store/marketing/signage`
- 태블릿 진열 → `/store/commerce/tablet-displays`

---

#### EXTERNAL_PROMOTION

- QR 관리 → `/store/marketing/qr`
- POP 자료 → `/store/marketing/pop`
- 블로그 → `/store/content/blog`
- 마케팅 분석 → `/store/analytics/marketing`

---

## 3. 주요 변경 사항 요약

### 3.1 사이드바 재구성

- 기존 6개 섹션 → 4개 작업 중심 구조로 단순화
- 기능 중심 → 작업 흐름 중심으로 전환

---

### 3.2 홈 화면 재정렬

- KPI 카드에 실제 진입 링크 연결
- "오늘 바로 하기" 중심 구조 도입
- hidden 기능 일부를 홈에서 직접 접근 가능하게 개선

---

### 3.3 hidden 기능 노출

다음 핵심 기능을 hidden 상태에서 정식 노출로 전환

- `/store/commerce/order-worktable`
- `/store/commerce/products/b2c`
- `/store/channels`
- `/store/commerce/tablet-displays`

---

### 3.4 UX 흐름 연결

다음 작업 흐름 연결 완료

- Channels → TabletDisplays 연결
- PharmacySell → TabletDisplays 연결

---

## 4. 핵심 페이지 역할 정의 (고정 기준)

| 페이지 | 역할 정의 |
|---|---|
| `/store/commerce/products/b2c` | 매장 진열 상품 (상품 중심 편집) |
| `/store/channels` | 채널 현황 (4채널 요약 및 디스패처) |
| `/store/marketing/signage` | 매장 사이니지 (콘텐츠/플레이리스트/스케줄 관리) |
| `/store/commerce/tablet-displays` | 태블릿 진열 (디바이스별 상품 배치) |

이 기준은 향후 WO 작성 시 이 정의를 기준으로 사용한다.

---

## 5. 사용자 작업 흐름

### 5.1 기본 흐름

1. **공급 상품 찾기** — `/store/commerce/products`
2. **매장 진열 상품 등록** — `/store/commerce/products/b2c`
3. **채널 노출 설정** — 채널 설정 패널에서 B2C/KIOSK/TABLET/SIGNAGE 노출 여부 결정
4. **태블릿 진열 구성** — `/store/commerce/tablet-displays`
5. **사이니지 및 외부 홍보 활용** — `/store/marketing/signage`, `/store/marketing/qr` 등

---

### 5.2 TABLET 흐름

| 단계 | 화면 | 작업 |
|---|---|---|
| 1 | `/store/commerce/products/b2c` | TABLET 채널 노출 설정 |
| 2 | `/store/commerce/tablet-displays` | 디바이스별 배치 구성 |

---

## 6. 개선된 UX 포인트

| 항목 | 내용 |
|---|---|
| hidden 기능 제거 | 구현된 기능이 사이드바에 노출되지 않는 상태 해소 |
| 작업 흐름 중심 구조 | 기능 중심 → 사용자 행동 기준 네비게이션 구성 |
| 메뉴 명칭 명확화 | 역할 중심 명칭으로 통일 |
| "입력 → 배치" 흐름 가시화 | PharmacySell TABLET 행에 태블릿 진열 직접 링크 추가 |
| 채널 중심 사고 구조 정립 | Channels 페이지가 4채널별 작업 분기점이 되도록 개선 |

---

## 7. 남은 과제 (Outstanding Issues)

### 7.1 PARTIAL 기능 (구현됨, 미완성)

다음 기능은 아직 완전 구현되지 않아 미노출 상태 유지

| 페이지 | 현재 상태 |
|---|---|
| `/store/commerce/orders` | 기본 목록 존재, 처리 워크플로우 미완성 |
| `/store/billing` | UI 존재, 실 데이터 연동 미확인 |
| `/store/commerce/products/suppliers` | Mock 데이터 기반, 실 공급자 연동 미완성 |

---

### 7.2 추가 개선 여지

| 항목 | 상태 |
|---|---|
| Channels ↔ Tablet 연결 추가 UX 개선 | 별도 WO 필요 |
| Tablet 진열 화면 내 UX 고도화 | 별도 WO 필요 |
| B2C 채널 스토어프론트 ↔ 진열 상품 실시간 미리보기 연결 | 별도 WO 필요 |

---

## 8. 제외된 영역

이번 정비 범위에서 의도적으로 제외된 항목

| 영역 | 이유 |
|---|---|
| `/store/:slug/*` (스토어프론트) | 운영자 IA와 분리된 소비자 영역 |
| API / 데이터 구조 변경 | 이번 정비는 UI/UX 레이어만 대상 |
| GlycoPharm, K-Cosmetics 등 외부 서비스 | 각 서비스별 독립 구조 유지 |
| Store Core 패키지 내부 구조 | Frozen Baseline (F3) 대상 |

---

## 9. 최종 결론

`/store` 영역은
기존 기능을 유지한 상태에서
**정보 구조와 사용자 작업 흐름이 일치하도록 재정비 완료된 상태**이다.

현재 상태는
**구조 정비 완료 단계이며, 이후는 기능 확장 및 UX 고도화 단계로 진행 가능하다.**

이 문서는 `/store`의 기준 문서이며,
이후 모든 확장 작업은 이 문서의 역할 정의와 흐름을 기준으로 진행한다.

---

*작성 기준: 실제 코드 및 WO 결과*
*관련 WO: WO-STORE-HIDDEN-ROUTES-UNHIDE-V1 · WO-STORE-CHANNELS-TABLET-QUICKACTION-FIX-V1 · WO-STORE-SELL-LISTINGS-TABLET-LINK-V1*
