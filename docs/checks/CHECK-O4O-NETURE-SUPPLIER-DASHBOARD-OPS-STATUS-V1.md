# CHECK-O4O-NETURE-SUPPLIER-DASHBOARD-OPS-STATUS-V1

WO: `WO-O4O-NETURE-SUPPLIER-DASHBOARD-OPS-STATUS-V1`
대상: `/supplier/dashboard` · `services/web-neture/src/pages/supplier/SupplierDashboardPage.tsx`
작성일: 2026-07-25 (KST)

---

## 1. 변경 전 대시보드 구조

`SupplierDashboardPage` = **공급자 AI Copilot 8-Block** (WO-O4O-SUPPLIER-COPILOT-DASHBOARD-V1).

```text
헤더: "공급자 AI Copilot" / "…상품 성과와 매장 확산 현황을 AI가 분석합니다."
Block 1   공급자 KPI        등록 상품 / 판매 중 / 최근 7일 주문 (링크 없음)
Block 1.5 이벤트/특가 현황 (KPA)
Market Trial CTA (violet, 큰 설명 블록)
Block 2   AI 공급자 요약
Block 3+4 상품 성과 / 매장 확산
Block 5   AI 상품 분석
Block 6+7 인기 상품 / 성장 상품
Block 8   추천 전략 + Quick Links
```

문제점:

- 주문·배송·재고·정산 등 **지금 처리해야 할 업무가 전혀 없음**.
- 상단 대부분이 AI·분석 블록. 실데이터 0건 환경에서 "데이터가 없습니다" 카드가 화면을 점유.
- KPI 카드에 링크 없음 → 업무 화면으로 이동 불가.
- Quick Link 에 legacy 경로(`/supplier/library`) 및 `inferActionPath` 의 `/supplier/requests`(비-canonical) 잔존.

## 2. 변경 후 대시보드 구조

```text
0. SupplierActivationGate 배너 (승인 상태 / 프로필 보완 — 기존 컴포넌트 재사용)
1. 헤더           "공급자 홈" / "…주문·재고·정산과 상품·콘텐츠 운영 현황을 확인하세요."
2. 처리 필요       값 > 0 인 항목만. 전부 0 이면 정상 문구 1줄
3. 핵심 운영 현황   KPI 6종 — 전부 canonical 경로 링크
4. 업무 바로가기    7개
5. 상품·공급 / 매장용 콘텐츠  (2-column)
6. 유통 활동       판매자 모집 / 유통참여형 펀딩 / 이벤트 오퍼 (3-column)
7. 공급자 계정 상태  공급자 상태 ↔ 프로필 정보 분리
8. AI · 분석       기존 Copilot 블록 전량 보존, 접기 가능(기본 접힘), 최하단
```

## 3. 재사용한 API (신규 backend 0)

| # | API | 용도 |
|---|-----|------|
| 1 | `supplierCopilotApi.getKpi()` | 등록 상품 / 판매 중 (기존 재사용) |
| 2 | `supplierApi.getOrderKpi()` → `GET /neture/supplier/orders/kpi` | 처리 대기·배송 준비 주문 |
| 3 | `supplierApi.getInventory()` + `getInventoryStatus()` | 재고 부족 / 품절 |
| 4 | `supplierApi.getSettlementKpi()` → `GET /neture/supplier/settlements/kpi` | 정산 대기 건수·금액 |
| 5 | `supplierApi.getApprovalCounts()` | 상품 승인 대기 / 완료 / 미요청 |
| 6 | `supplierProfileApi.getProfile()` | 공급자 status · profileComplete · missingProfileFields |
| 7 | `supplierRecruitmentApi.listMine()` | 판매자 모집 건수·모집 중·신청 대기 |
| 8 | `supplierStoreDescriptionApi.listMine()` | 매장용 설명서 상태별 건수 |
| 9 | `getMyTrials()` (`api/trial`) | 유통참여형 펀딩 상태별 건수 |
| 10 | `supplierKpaEventOfferApi.getStats()` | 이벤트 오퍼 현황 (기존 재사용) |
| 11 | `supplierCopilotApi.getAiInsight/getProductPerformance/getDistribution/getTrendingProducts` | AI·분석 (기존 유지) |

- 1번만 `await` (공급자 권한 확인). 2~10 은 **`Promise.allSettled` 병렬**. 11은 기존과 동일 fire-and-forget.
- **신규 복합 dashboard API 생성 0.** WO §5.2 우선순위 1~4 범위 내에서만 해결.

## 4. 각 KPI의 계산 기준

| 카드 | 계산식 | 출처 |
|------|--------|------|
| 등록 상품 | `kpi.registeredProducts` | copilot KPI |
| 판매 중 | `kpi.activeProducts` | copilot KPI |
| 처리 대기 주문 | `orderKpi.pending_processing` | 주문 KPI API 원본값 |
| 배송 준비 주문 | `orderKpi.pending_shipping` | 주문 KPI API 원본값 |
| 재고 주의 | `lowStock + outOfStock` | `getInventoryStatus()` 판정 후 집계 |
| 정산 대기 | `settlementKpi.pending_amount` (금액) | 정산 KPI API 원본값 |

- 금액 표기: `1,234,567원` — 기존 `EventKpiCard` / 상품 성과 블록의 `toLocaleString('ko-KR') + '원'` 과 동일.
- **모든 KPI 카드는 링크**(`/supplier/products`, `/supplier/orders`, `/supplier/inventory`, `/supplier/settlements`).

## 5. 처리 필요 상태 정의

`value > 0` 인 항목만 렌더한다. 0 카드는 나열하지 않는다.

| 항목 | 값 | 이동 | 강조 |
|------|-----|------|:---:|
| 처리 대기 주문 | `orderKpi.pending_processing` | `/supplier/orders` | red |
| 배송 준비 주문 | `orderKpi.pending_shipping` | `/supplier/orders` | amber |
| 품절 상품 | `getInventoryStatus() === 'out_of_stock'` 개수 | `/supplier/inventory` | red |
| 재고 부족 상품 | `getInventoryStatus() === 'low_stock'` 개수 | `/supplier/inventory` | amber |
| 설명서 수정 요청 | `status === 'revision_requested'` 개수 | `/supplier/store-descriptions` | red |
| 판매자 모집 신청 대기 | `Σ recruitment.applications.pending` | `/supplier/recruitments` | amber |
| 상품 승인 대기 | `approvalCounts.pending` | `/supplier/products` | amber |
| 정산 대기 | `settlementKpi.pending_count` | `/supplier/settlements` | amber |
| 공급자 정보 미완료 | `profileComplete === false` | `/mypage/business-profile` | sky |

전부 0 이면: `현재 바로 처리해야 할 주요 업무가 없습니다.` (체크 아이콘 1줄)

## 6. status mapping (코드 실측 — 하드코딩 추정 없음)

### 주문 / 배송

`SupplierOrderKpi` (`lib/api/store.ts:130`) 의 필드를 **그대로** 사용한다. 프론트에서 주문 status ENUM 을 재해석하지 않는다.

```text
today_orders / pending_processing / pending_shipping / total_orders
```

- 처리 대기 = `pending_processing`, 배송 준비 = `pending_shipping` — backend 산출값이 단일 권위.

### 재고

`getInventoryStatus()` (`lib/api/store.ts:158`) 기존 판정 함수 재사용:

```text
!track_inventory        → untracked (집계 제외)
available_stock <= 0    → out_of_stock (품절)
available_stock <= low_stock_threshold → low_stock (재고 부족)
그 외                    → in_stock
```

### 정산

`SettlementKpi` = `{ pending_amount, paid_amount, total_amount, pending_count, paid_count }`.
정산 대기 = `pending_count` / `pending_amount` — **금액 재계산 없음**(정책 판단 회피).

### 매장용 설명서

`SupplierStoreDescriptionStatus` 원본 7종을 그대로 사용, 라벨만 부여:
`draft 임시저장 · needs_review 검수 요청 · revision_requested 수정 요청 · canonical 게시됨 · hidden 숨김 · candidate 후보 · deprecated 보관`

### 유통참여형 펀딩

`TrialStatus` 원본 7종 그대로:
`draft 작성 중 · submitted 제출됨 · recruiting 모집 중 · development 개발 중 · outcome_confirming 결과 확인 · fulfilled 이행 완료 · closed 마감`

> 새로운 공통 상태 모델을 만들지 않았다. 각 기능의 실제 status 를 라벨링만 했다.

## 7. 상품 · 콘텐츠 · 유통 현황 구성

**상품·공급**: 등록 상품 / 판매 중 / 승인 완료 / 승인 대기 / 승인 미요청 + `공급 오퍼 관리` 진입.

**매장용 콘텐츠**: 설명서 상태별 건수(실데이터 있을 때만) + 진입 링크 4종
(`제품 콘텐츠 /supplier/b2b-content`, `매장용 설명서`, `태블렛`, `디지털 사이니지`).

**유통 활동** 3-column:
- 판매자 모집 — 전체 / 모집 중(`status==='open'`) / 신청 대기
- 유통참여형 펀딩 — 상태별 건수, 없으면 설명 + `펀딩 생성하기`
- 이벤트 오퍼 (KPA) — 전체 / 노출 중 / 주문 / 매출

## 8. 공급자 승인 · 프로필 상태 구분

- 배너·모달은 기존 `SupplierActivationGate`(mode=banner) 를 **그대로** 사용 — 승인/프로필 분리 정책의 단일 권위.
- 대시보드에 `공급자 계정 상태` 섹션 추가:

```text
공급자 상태 : 활성 / 승인 대기 / 거절 / 정지   ← profile.status
프로필 정보 : 입력 완료 / 일부 미입력          ← profile.profileComplete (backend 권위)
```

- 하단 안내: "공급자 승인과 프로필 완성은 별개입니다. 프로필이 일부 미입력이어도 승인된 공급 업무는 그대로 이용할 수 있습니다."
- `activationReady` / `missingActivationFields` 는 **deprecated fallback 으로만** 읽고 승인 판단에 사용하지 않는다. 승인 결합 개념 재도입 0.
- 프로필 조회 실패 시 `profileComplete` 를 true 로 두어 **미완료로 단정하지 않는다**(gate 와 동일 fail-open).

## 9. 표시하지 않은 항목과 사유

| 항목 | 사유 |
|------|------|
| 활성 공급 오퍼 수 | `/supplier/supply-offers` 는 **API 없는 정적 안내 허브**(`SupplierSupplyOffersPage`). count 산출 불가 → 진입점만 제공 |
| 제품 콘텐츠 / 태블렛 / 사이니지 건수 | 각 기능의 상태 모델이 서로 달라 합산 시 의미가 왜곡. 공통 count API 없음 → 진입점만 제공 (WO §6.5) |
| 미정산 예정 금액(정산 예정) | `SettlementKpi` 에 예정 개념 없음. `pending_amount` 만 표시 |
| 배송 중 / 배송 완료 주문 | `SupplierOrderKpi` 에 해당 필드 없음. shipment status 를 프론트에서 재집계하면 주문-배송 계약 재해석이 되어 제외 |
| 최근 7일 주문 | KPI 슬롯 6개를 운영 우선 항목으로 채우며 제외. copilot KPI 자체는 계속 호출되므로 후속 복원 가능 |

**하드코딩 가짜 수치 0건.** 모든 숫자는 위 API 응답에서 직접 계산.

## 10. 로딩 · 오류 · 빈 상태

- 권한 확인용 `getKpi()` 실패만 전체 화면 오류 + `다시 시도`.
- 나머지는 `Promise.allSettled` → 개별 실패가 다른 섹션을 막지 않는다.
- 주문/재고/정산 중 하나라도 실패하면 처리 필요 영역 하단에 `일부 운영 현황을 불러오지 못했습니다. + 다시 시도` 만 노출.
- **API 오류 메시지·stack trace 원문 노출 없음.**
- 빈 배열은 오류가 아니라 정상 빈 상태로 처리(설명서 0건 → 안내 문구, 펀딩 0건 → 설명 + CTA).

## 11. 변경 파일

| 파일 | 변경 |
|------|------|
| `services/web-neture/src/pages/supplier/SupplierDashboardPage.tsx` | 전면 재구성 (+645 / −303) |

| 항목 | 값 |
|------|-----|
| backend 변경 | 0 |
| DB 변경 | 0 |
| migration | 0 |
| 신규 API client 파일 | 0 (기존 export 재사용, `supplierRecruitmentApi` 만 `lib/api/supplier` 에서 직접 import) |
| 공통 패키지 추출 | 0 |
| 사이드바 / `/account/supplier/*` | 무변경 |
| AI API·프롬프트·분석 로직 | 무변경 |

## 12. 검증

| 항목 | 결과 |
|------|:---:|
| `tsc --noEmit` (web-neture) | PASS (오류 0) |
| `pnpm --filter @o4o/web-neture build` | PASS (13.98s) |

## 13. 배포 및 프로덕션 smoke

| 항목 | 값 |
|------|-----|
| commit | `f75681e79` |
| workflow | `Deploy Web Services (Cloud Run)` — conclusion **success** (run 30150788290) |
| job | `detect-changes` success · `deploy-neture` **success** (타 3서비스 skipped) |
| Cloud Run revision | `neture-web-01310-ml6` |

검증 계정: Neture 공급자 테스트 계정 (`docs/local/TEST-ACCOUNTS.local.md`) — 자격정보 비기재.

### Desktop 1440×900 — PASS

| 항목 | 결과 |
|------|:---:|
| `/supplier/dashboard` 직접 접근 | PASS |
| 헤더 `공급자 홈` + 공급자명 표시 (`(주)…님의 …`) | PASS |
| 섹션 순서 (처리 필요 → 핵심 운영 현황 → 업무 바로가기 → 상품·공급 / 매장용 콘텐츠 → 유통 활동 → 공급자 계정 상태 → AI·분석) | PASS |
| 처리 필요 렌더 | PASS — 실제 미완료인 `공급자 정보 미완료` 1건만 노출, 0 카드 나열 없음 |
| 핵심 KPI 6종 렌더 | PASS |
| KPI 카드 이동 (`정산 대기` → `/supplier/settlements`) | PASS |
| 대시보드 내 링크 16종 전부 canonical | PASS — legacy `/supplier/library` · `/supplier/requests` **0건** |
| 상품·콘텐츠·유통 영역 렌더 | PASS |
| 공급자 상태 `활성` ↔ 프로필 `일부 미입력` 분리 표시 | PASS |
| AI 영역 유지 | PASS — 펼침 시 AI 공급자 요약 / 상품 성과 / 매장 확산 / AI 상품 분석 / 인기 상품 / 성장 상품 / 추천 전략 **7블록 전부 보존** |
| 콘솔 치명 오류 | 0 |
| 가로 overflow | 없음 (scrollWidth 1425 ≤ 1440) |

### Mobile 390×844 — PASS

| 항목 | 결과 |
|------|:---:|
| KPI 카드 줄바꿈 | PASS — 2열 × 3행 (카드 폭 141px) |
| 텍스트 잘림 | 0 (scrollWidth > clientWidth 요소 0건) |
| Quick Link 터치 영역 | PASS — 높이 36px, 자동 줄바꿈 |
| 가로 overflow | 없음 (scrollWidth 375 ≤ 390) |
| 사이드바 drawer 충돌 | 없음 |

### Tablet 768×1024 — PASS

| 항목 | 결과 |
|------|:---:|
| KPI 레이아웃 전환 | PASS — 3열 × 2행 (카드 폭 210px) |
| 텍스트 잘림 | 0 |
| 가로 overflow | 없음 (scrollWidth 753 ≤ 768) |

### 실데이터 제한

검증 계정은 주문·상품·재고·정산·설명서·모집·펀딩이 **전부 0건**이다. 따라서:

- 확인됨: 0 상태에서의 정상 빈 상태 렌더, 0 카드 미나열, `공급자 정보 미완료` 1건만 강조.
- **미확인**: 처리 필요 카드의 non-zero 렌더(색상 red/amber 분기), 설명서 상태별 건수 목록, 펀딩 상태별 건수 목록.
  사유 — 검증 가능한 실데이터 없음. WO 금지 사항에 따라 테스트 데이터를 생성하지 않았다.
  각 값은 API 원본 필드를 그대로 렌더하므로 계산 로직 자체는 §4·§5 기준으로 정적 확인함.

## 14. 후속 항목

| # | 항목 |
|---|------|
| 1 | 공급 오퍼 실제 목록·상태 API (현재 `/supplier/supply-offers` 는 정적 허브) → count 표시 가능해짐 |
| 2 | 제품 콘텐츠 / 태블렛 / 사이니지 count 또는 상태 summary API |
| 3 | 주문 KPI 에 배송 중·배송 완료 집계 추가 검토 (backend, 별도 승인 필요) |
| 4 | 정산 "예정 금액" 정의 확정 후 표시 |
| 5 | 실데이터 보유 공급자 계정으로 처리 필요 카드의 non-zero 렌더 검증 |
