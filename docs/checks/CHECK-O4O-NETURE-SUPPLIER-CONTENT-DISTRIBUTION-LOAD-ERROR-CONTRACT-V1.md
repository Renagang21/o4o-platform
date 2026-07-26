# CHECK-O4O-NETURE-SUPPLIER-CONTENT-DISTRIBUTION-LOAD-ERROR-CONTRACT-V1

WO: `WO-O4O-NETURE-SUPPLIER-CONTENT-DISTRIBUTION-LOAD-ERROR-CONTRACT-V1`
선행 IR: `IR-O4O-NETURE-SUPPLIER-API-LOAD-ERROR-CONTRACT-AUDIT-V1` (우선순위 3 그룹)
작성일: 2026-07-26 (KST)

---

## 1. IR 우선순위 3 대상 재분류

| 대상 | API | 실패 시 | 소비처 | 등급 | 이번 반영 |
|------|-----|---------|--------|:---:|:---:|
| 매장용 설명서 | `supplierStoreDescriptionApi.listMine()` | catch 없음 → **throw** | Dashboard | **B** | ✅ |
| 유통참여형 펀딩 | `getMyTrials()` (`api/trial`) | catch 없음 → **throw** | Dashboard | **B** | ✅ |
| 이벤트 오퍼 | `supplierKpaEventOfferApi.getStats()` | catch 없음 → **throw** | Dashboard | **B** | ✅ |
| 제품 콘텐츠 | `supplierApi.getProductsPaginated()` (이미 throw) | 소비처 catch → `[]` | `SupplierB2BContentPage` | **B** | ✅ |
| 판매자 모집 | `supplierRecruitmentApi.listMine()` | **`[]` 로 삼킴** | Dashboard · `SupplierRecruitmentsPage` | **C** | ✅ |
| 디지털 사이니지 | signage 목록 | throw | `SupplierSignagePage` — `.catch` → 오류 메시지 상태 유지 | **A** | — |
| 태블렛 화면 | `fetchSupplierScreenSets()` | throw | `SupplierTabletScreenSetsPage` — `catch` → **토스트** + `setSets([])` | **A−** | — (§14) |
| 공급 오퍼 | 없음 (정적 안내 허브) | — | `SupplierSupplyOffersPage` | 해당 없음 | — |

- **B등급 4건 전부 반영**했다.
- **C등급 1건(판매자 모집)** 은 소비처가 2곳으로 제한되어 WO §4·§17 의 "안전하게 정비 가능" 조건에 부합 → API + 모든 소비처를 같은 커밋에 원자적으로 반영했다.

## 2. 기존 오류 흡수 위치

```ts
// SupplierDashboardPage — rejection 을 정상 기본값으로 흡수
setRecruitments(settled(ops[5], []));      // C: API 가 이미 [] 반환
setStoreDescs(settled(ops[6], []));        // B: throw 를 [] 로 흡수
setTrials(settled(ops[7], []));            // B: throw 를 [] 로 흡수
setEventOfferStats(settled(ops[8], null)); // B: throw 를 null 로 흡수

// SupplierB2BContentPage
catch { setProducts([]); }                 // B: throw 를 [] 로 흡수

// supplierRecruitmentApi.listMine()
catch (error) { console.warn(...); return []; }  // C: API 레벨 삼킴
```

## 3. 영역별 실패 상태 구조

```ts
type ContentDistributionFailures = {
  recruitments: boolean;
  storeDescriptions: boolean;
  marketTrials: boolean;
  eventOffers: boolean;
};
```

- 주문·재고·정산의 `OpsFailures`, 승인 카운트의 `approvalError` 와 **완전 별개 상태**다.
- 데이터 상태도 `T[]` → **`T[] | null`** 로 바꿔 "정상 0건(`[]`)" 과 "실패(`null`)" 를 타입 수준에서 구분한다.

## 4. Promise.allSettled 정비

`allSettled` 구조는 유지하고 흡수만 제거했다.

```ts
const storeDescsFailed = ops[6].status === 'rejected';
setStoreDescs(storeDescsFailed ? null : (ops[6] as PromiseFulfilledResult<...>).value);
```

```text
fulfilled → 실제 데이터 저장 + failure false   (정상 [] 도 성공)
rejected  → null 유지 + failure true
```

`settled(result, fallback)` 헬퍼는 이 4영역에서 제거했다(프로필 등 D등급에만 잔존).

## 5. API 변경 (C등급 1건)

```text
SUPPLIER_RECRUITMENTS_LOAD_FAILED
```

```ts
catch → console.warn(extractApiError(error)) 후 고정 코드 throw
!Array.isArray(rows) → 고정 코드 throw   // 200 이지만 payload 계약 위반
```

B등급 API 3종은 이미 throw 계약이므로 **수정하지 않았다**(WO §11).

## 6. 다시 시도 방식 — 영역별 단독 재호출

WO §8 의 우선 방식대로 구현했다. 전체 대시보드 재호출·AI 재호출 없음.

| 영역 | 재시도 함수 | 재호출 대상 |
|------|-------------|-------------|
| 매장용 설명서 | `retryStoreDescs` | `storeDescriptionApi.listMine()` 만 |
| 유통참여형 펀딩 | `retryTrials` | `getMyTrials()` 만 |
| 이벤트 오퍼 | `retryEventOffers` | `eventOfferApi.getStats()` 만 |
| 판매자 모집 | `retryRecruitments` | `recruitmentApi.listMine()` 만 |

실측: 설명서 다시 시도 클릭 시 **신규 네트워크 요청 1건**만 발생(§8-3).

## 7. 처리 필요 카드 처리

- 실패 영역의 카드를 후보에서 제외한다: `설명서 수정 요청`(storeDescriptions), `판매자 모집 신청 대기`(recruitments).
- `cdActionAffected = storeDescriptions || recruitments` 일 때 **"현재 바로 처리해야 할 주요 업무가 없습니다." 를 표시하지 않고** 실패 영역명을 밝힌 문구를 낸다.

> **문구 의미 범위 (WO §9 기록 요구)**: 펀딩·이벤트 오퍼는 현재 "처리 필요" 계산에 사용되지 않는다(대시보드 카드 8종 중 해당 항목 없음). 따라서 이 둘만 실패한 경우 정상 문구가 뜰 수 있으며, 이는 처리 필요 판단이 실제로 온전하다는 뜻이다. 계산에 쓰이는 영역(주문·재고·정산·승인·설명서·모집)이 하나라도 실패하면 문구를 단정하지 않는다.

## 8. 오류 주입·복구 결과

프로덕션에서 XHR `open()` URL 재작성(도달 불가 주소)으로 대상 요청만 실패시킴. **운영 데이터 write 0.**

### 8-1. 정상 0건 (시나리오 A) — PASS

4영역 모두 정상 렌더, 오류 문구 0.

```text
설명서   작성한 매장용 설명서가 없습니다
모집     전체 모집 0건 / 모집 중 0건 / 신청 대기 0건
펀딩     신규 제품·유통안을 콘텐츠로 소개… (0건 안내)
이벤트   전체 이벤트 0건 / 노출 중 0건
```

### 8-2. 단독 실패 4종 (C·D 시나리오) — 4/4 PASS

| 실패 영역 | 표시 | 나머지 3영역 |
|-----------|------|--------------|
| 설명서 | `설명서 현황을 불러오지 못했습니다.` | 정상 유지 |
| 펀딩 | `펀딩 현황을 불러오지 못했습니다.` | 정상 유지 |
| 이벤트 | `이벤트 오퍼 현황을 불러오지 못했습니다.` | 정상 유지 |
| 판매자 모집 | `판매자 모집 현황을 불러오지 못했습니다.` | 정상 유지 |

전 케이스에서 실패 영역의 0건 표시 없음, 섹션 9개 전부 유지.

### 8-3. 부분 실패 조합 (WO §13-3) — 6/6 PASS

| 조합 | 결과 |
|------|:---:|
| 설명서만 | PASS |
| 펀딩만 | PASS |
| 이벤트만 | PASS |
| 모집만 | PASS |
| 설명서 + 펀딩 | PASS — 오류 2건, 모집·이벤트 정상 |
| 펀딩 + 이벤트 | PASS — 오류 2건, 설명서·모집 정상 |
| **4영역 전부** | PASS — 오류 4건, **KPI 6종 전부 정상 표시**(`등록 상품 0 / 판매 중 0 / 처리 대기 주문 0 / 배송 준비 주문 0 / 재고 주의 0 / 정산 대기 0원`), 승인 3행 유지, AI 섹션 유지, 섹션 9개 유지, 대시보드 전체 오류 전환 **없음** |

### 8-4. 재시도 (F·G) — PASS

| 시나리오 | 결과 |
|----------|:---:|
| F 실패 상태에서 다시 시도 | PASS — 해당 영역 오류 유지, 다른 3영역 오류도 그대로 유지(4건) |
| G 주입 해제 후 다시 시도 | PASS — **설명서만 복구**(`작성한 매장용 설명서가 없습니다`), 나머지 3영역 오류 유지, **신규 요청 1건**만 발생 |
| 4영역 순차 복구 | PASS — 오류 0, 4영역 정상 0건 복원 |

### 8-5. 소비처 페이지 — PASS

| 페이지 | 실패 | 복구 |
|--------|:---:|:---:|
| `/supplier/recruitments` | `판매자 모집 현황을 불러오지 못했습니다.` + 다시 시도, `생성한 판매자 모집이 없습니다` 미노출, 로딩 미고착 | 다시 시도 → 정상 빈 상태 복원 |
| `/supplier/b2b-content` | `제품 콘텐츠 목록을 불러오지 못했습니다.` + 다시 시도, `상품이 없습니다` 미노출 | 다시 시도 → 정상 빈 상태 복원 |

### 8-6. 합성 non-zero (시나리오 B)

**미실시** — §13 실데이터 제한 참조.

## 9. 라우트 회귀

| route | 렌더 | 로딩 고착 | 오탐 오류 | 가로 overflow |
|-------|:---:|:---:|:---:|:---:|
| `/supplier/dashboard` | OK | 없음 | 없음 | 없음 |
| `/supplier/store-descriptions` | OK | 없음 | 없음 | 없음 |
| `/supplier/market-trial` | OK | 없음 | 없음 | 없음 |
| `/supplier/event-offers` | OK | 없음 | 없음 | 없음 |
| `/supplier/recruitments` | OK | 없음 | 없음 | 없음 |
| `/supplier/b2b-content` | OK | 없음 | 없음 | 없음 |

정상 상태 **콘솔 오류 0**, unhandled rejection 0.

## 10. 반응형 (오류 상태 기준)

| 폭 | 결과 |
|----|:---:|
| Desktop 1440×900 | PASS |
| Tablet 768×1024 | PASS — 오류 2건·다시 시도 2개 노출, 텍스트 잘림 0, scrollWidth 753 ≤ 768 |
| Mobile 390×844 | PASS — **4영역 오류 + 다시 시도 4개** 동시 노출, 잘림 0, 카드 높이 정상, scrollWidth 375 ≤ 390 |

## 11. 배포 및 프로덕션 smoke

| 항목 | 값 |
|------|-----|
| commit | `0731525c8` |
| workflow | `Deploy Web Services (Cloud Run)` — **success** (run 30189148044) |
| jobs | `detect-changes` success · `deploy-neture` **success** (타 3서비스 skipped) |
| Cloud Run revision | `neture-web-01316-knx` → **`neture-web-01317-vb4`** |

§8~§10 의 모든 검증은 배포된 프로덕션에서 수행했다.

## 12. 무변경 확인

| 항목 | 값 |
|------|-----|
| 상태 ENUM (설명서/펀딩/모집) | **무변경** |
| 설명서 승인 정책 · 펀딩 상태 머신 · 이벤트 오퍼 정책 | **무변경** |
| 공급자 직접 게시 정책 | **무변경** |
| B등급 API 3종 | **무변경** (이미 throw 계약) |
| 공통 API wrapper · 공통 UI Core | **무변경** |
| dependency / lockfile | **무변경** |
| 대시보드 정보구조 · 사이드바 | **무변경** |
| backend / DB / migration | 0 / 0 / 0 |
| 운영 데이터 write | **0** |
| typecheck | PASS |
| build | PASS (16.31s) |

## 13. 변경 파일

```text
services/web-neture/src/lib/api/supplier.ts                      (C등급 API 1종)
services/web-neture/src/pages/supplier/SupplierDashboardPage.tsx (B·C 소비처)
services/web-neture/src/pages/supplier/SupplierRecruitmentsPage.tsx (C 소비처)
services/web-neture/src/pages/supplier/SupplierB2BContentPage.tsx   (B 소비처)
```

4 파일 — 같은 구현 커밋(`0731525c8`). 부분 반영 0.

## 14. 실데이터 제한

| 항목 | 상태 | 사유 |
|------|:---:|------|
| 정상 0건 ↔ 오류 구분 | 확인 완료 | 계정 데이터 0건 — 본 WO 핵심 회귀 검증에 적합 |
| 합성 non-zero 렌더 (시나리오 B) | **미실시** | 4영역이 배열·통계로 형태가 제각각이라 합성 응답 주입 시 Playwright 세션이 반복 종료(§15-1). 상태별 건수 렌더 코드는 기존 로직 무변경이며 선행 WO 에서 검증된 경로다 |
| 설명서·펀딩 상태별 건수 실데이터 | **미확인** | 대상 데이터 없음. 테스트 데이터 생성은 WO 금지 |
| `SupplierRecruitmentsPage` 목록 행 렌더 | **미확인** | 모집 0건 |

## 15. 후속 항목

| # | 항목 |
|---|------|
| 1 | **태블렛 화면(A−)**: `SupplierTabletScreenSetsPage` 는 오류를 **토스트**로만 알리고 `setSets([])` 로 남겨, 토스트가 사라지면 "0건" 과 구분되지 않는다. 지속 오류 상태로 전환 검토 (본 WO 범위 밖 — 대시보드 영역 아님) |
| 2 | IR E 등급 2건(`getShipment` / `getOrderCondition`) — backend 404 vs 5xx 계약 확인 후 판단 |
| 3 | 잔여 C 등급: `getLibraryItems()` · `listSpotPolicies()` · `getOnboarding()` · `regulatedCategory.list()` — 소비처 확인 후 필요 시 별도 WO |
| 4 | 실데이터 보유 계정으로 상태별 건수·목록 행 재검증 |

### 15-1. 검증 도구 제약 (기록)

Playwright MCP 세션이 `/supplier/recruitments` 로의 SPA 이동 및 합성 XHR 응답 주입에서 반복적으로 종료되었다(프로필 잠금 해제 후 재기동 반복). 우회로 **주입 설치 → 단일 이동** 순서로 재구성해 소비처 2곳을 검증했다. 합성 non-zero(시나리오 B)만 이 제약으로 생략했다.
