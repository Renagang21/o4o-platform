# CHECK-O4O-NETURE-SUPPLIER-APPROVAL-COUNTS-LOAD-ERROR-CONTRACT-V1

WO: `WO-O4O-NETURE-SUPPLIER-APPROVAL-COUNTS-LOAD-ERROR-CONTRACT-V1`
선행 IR: `IR-O4O-NETURE-SUPPLIER-API-LOAD-ERROR-CONTRACT-AUDIT-V1` (우선순위 2 그룹)
작성일: 2026-07-26 (KST)

---

## 1. 기존 `getApprovalCounts()` 실패 반환값

`services/web-neture/src/lib/api/supplier.ts`

```ts
catch (error) {
  console.warn('[Supplier API] Failed to fetch approval counts:', error);
  return { total: 0, unrequested: 0, pending: 0, approved: 0, rejected: 0 };
}
```

- 오류를 **정상 0 카운트로 변환** → 화면에서 "실제 0건" 과 구분 불가.
- `result.data || {…0}` 도 동일 문제 — `success=false` / `data` 누락도 0 으로 처리.

## 2. 정상 응답 구조와 필드

```text
GET /neture/supplier/products/approval-counts
→ { success: true, data: { total, unrequested, pending, approved, rejected } }
```

| 필드 | 의미 |
|------|------|
| `total` | 전체 |
| `unrequested` | 승인요청 전 |
| `pending` | 승인 요청 중 |
| `approved` | 승인완료 |
| `rejected` | 거절 |

> WO 예시의 `not_requested` 는 실제 필드명이 아니다. **실제는 `unrequested`** — 코드 기준으로 확정했다.

## 3. 전체 소비처 조사 결과 — 2곳

전수 검색(`getApprovalCounts` / `approvalCounts` / `serviceApprovalStatus`) 결과:

| # | 파일 | 사용처 | 기존 오류 처리 |
|---|------|--------|----------------|
| 1 | `pages/supplier/SupplierProductsPage.tsx:1094` | `fetchTabCounts()` → 승인 탭 배지 5종 | **try/catch 없음** (API 가 삼켜서 0 표시) |
| 2 | `pages/supplier/SupplierDashboardPage.tsx:190` | `Promise.allSettled` ops[3] → 상품·공급 섹션 + 처리 필요 '상품 승인 대기' | rejection 을 `null` 로 흡수(IR B 등급) |

그 외 소비처 없음. `serviceApprovalStatus` 는 `getProductsPaginated()` 의 필터 파라미터로 본 함수와 무관.

## 4. 적용한 실패 계약과 오류 코드

```text
SUPPLIER_APPROVAL_COUNTS_LOAD_FAILED
```

```ts
성공 → SupplierApprovalCounts 그대로 반환
실패 → console.warn(extractApiError(error)) 후 고정 코드 throw
```

실패 판단 조건 (WO §6):

```text
4xx / 5xx / 네트워크 오류
200 이지만 data 가 객체가 아님
필수 카운트 필드가 숫자가 아님
```

정상 `0` 은 오류가 아니며 그대로 반환한다. 서버 원문·stack trace·응답 본문은 화면에 노출하지 않는다.

## 5. payload 검증

```ts
export interface SupplierApprovalCounts {
  total: number; unrequested: number; pending: number; approved: number; rejected: number;
}

function isValidApprovalCounts(value: unknown): value is SupplierApprovalCounts {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.total === 'number' && typeof v.unrequested === 'number'
    && typeof v.pending === 'number' && typeof v.approved === 'number'
    && typeof v.rejected === 'number';
}
```

- 5개 카운트가 **모두 number 일 때만** 성공. `0` 은 유효값이므로 통과한다.
- schema 라이브러리 추가 0 / 응답 구조·필드명·계산 방식 변경 0.

## 6. SupplierDashboardPage 독립 실패 처리

- `approvalError` 상태를 신설해 **승인 카운트 영역만** 실패로 표시한다.
- 실패 시 `approval` 을 `null` 로 두고 **0 으로 대체하지 않는다.**
- 처리 필요의 `상품 승인 대기` 카드는 실패 시 후보에서 제외(0 표시 안 함).
- 상품·공급 섹션에서 **`등록 상품` · `판매 중` 은 그대로 유지**하고 승인 3행 자리에만:

```text
승인 현황을 불러오지 못했습니다.  [다시 시도]
```

- 재호출은 현재 구조상 대시보드 전체 `fetchData()` 재실행이다(승인 카운트만 단독 재호출하는 경로가 없음). 중복 호출·회귀는 §8-2 에서 확인했다.
- 선행 WO 의 `OpsFailures`(주문·재고·정산)와 **별개 상태**로 관리 — 서로 간섭하지 않는다.

## 7. SupplierProductsPage 카운트·목록 상태 분리

| 항목 | 변경 |
|------|------|
| `tabCounts` | `{…0}` 초기값 → **`SupplierApprovalCounts \| null`** (미수신과 0 구분) |
| `countsError` | 신설 — 목록의 `loadError` 와 **완전 독립** |
| 탭 배지 | `{tab.count ?? '—'}` — 실패·미수신 시 0 대신 `—` |
| 탭 클릭 | **차단하지 않음** — 카운트 실패여도 목록 조회 가능 |
| 재시도 | 탭 하단에 카운트 전용 `다시 시도` (목록 재조회와 분리) |

## 8. 오류 주입·복구 결과

검증 방식: 프로덕션에서 XHR `open()` URL 재작성(네트워크 실패/404/다른 payload) + 합성 200 응답. **운영 데이터 write 0.**

### 8-1. WO §13-2 시나리오 A~G — 7/7 PASS

| 시나리오 | 조건 | 결과 | 관측값 |
|----------|------|:---:|--------|
| A | 정상 응답 + 전부 0 | PASS | 탭 `전체0 / 승인요청 전0 / 승인 요청 중0 / 승인완료0 / 거절0`, 오류 미표시 |
| B | 정상 응답 + non-zero (합성 200) | PASS | 탭 `전체7 / 승인요청 전3 / 승인 요청 중2 / 승인완료1 / 거절1` 정확 표시 |
| C | 4xx (404 주입) | PASS | 5개 탭 전부 `—`, `승인 현황을 불러오지 못했습니다.` + 다시 시도 |
| D | 네트워크 실패 | PASS | 동일 |
| E | 200 + payload 깨짐 | PASS | 동일 (검증 함수가 걸러냄) |
| F | 다시 시도 실패 | PASS | 오류 유지, 탭 계속 `—`, 다시 시도 유지 |
| G | 다시 시도 성공 | PASS | 오류 해제, 탭 `0` 복원, 다시 시도 사라짐 |

**전 시나리오에서 `승인 완료 0 / 승인 대기 0 / 미요청 0` 오표시 0건.**

### 8-2. WO §14 독립 실패 — 3/3 PASS

| 조건 | 결과 |
|------|:---:|
| 상품 페이지: 카운트 실패 + 목록 성공 | PASS — 탭 전부 `—`, 카운트 오류만 표시, **목록 오류 없음** |
| 상품 페이지: 카운트 성공 + 목록 실패 | PASS — 탭 `0` 정상 표시, **목록만 오류 상태** |
| 공급자 홈: 카운트만 실패 | PASS — 승인 3행만 실패 표시, KPI 6종(`등록 상품·판매 중·처리 대기 주문·배송 준비 주문·재고 주의·정산 대기`) 전부 정상, **8개 섹션 전부 유지**, 대시보드 전체 오류 전환 없음, "처리할 업무 없음" 미노출 |

두 API 상태가 서로 덮어쓰지 않음을 양방향으로 확인했다.

## 9. 라우트·반응형 회귀

| route | 렌더 | 로딩 고착 | 오탐 오류 | 가로 overflow |
|-------|:---:|:---:|:---:|:---:|
| `/supplier/dashboard` | OK | 없음 | 없음 | 없음 |
| `/supplier/products` | OK | 없음 | 없음 | 없음 |

- 상품 탭 이동(`승인요청 전` 클릭) 정상, 검색·필터 파라미터 전달 회귀 없음.
- 정상 상태 **콘솔 오류 0**, unhandled rejection 0.

| 폭 | 결과 |
|----|:---:|
| Desktop 1440×900 | PASS |
| Tablet 768×1024 | PASS — 오류 문구·다시 시도 노출, scrollWidth 768 = viewport |
| Mobile 390×844 | PASS — 다시 시도 47×16px 노출, 탭 배지 `—` 겹침 없음(폭 62~75px), scrollWidth 387 ≤ 390 |

## 10. 배포 및 프로덕션 smoke

| 항목 | 값 |
|------|-----|
| commit | `7faf53bf8` |
| workflow | `Deploy Web Services (Cloud Run)` — **success** (run 30188194510) |
| jobs | `detect-changes` success · `deploy-neture` **success** (타 3서비스 skipped) |
| Cloud Run revision | `neture-web-01315-hhg` → **`neture-web-01316-knx`** |

§8·§9 의 모든 검증은 배포된 프로덕션에서 수행했다.

## 11. 무변경 확인

| 항목 | 값 |
|------|-----|
| 승인 정책 / 승인 상태 ENUM | **무변경** |
| 승인 요청 mutation | **무변경** |
| 상품 목록 API | **무변경** |
| 카운트 계산 방식·필드명·응답 구조 | **무변경** |
| 공급자 활성 승인 정책 / 프로필 완성 결합 | **무변경** |
| 공통 API wrapper | **무변경** |
| dependency / lockfile | **무변경** |
| 사이드바 · 대시보드 정보구조 | **무변경** |
| backend / DB / migration | 0 / 0 / 0 |
| 운영 데이터 write | **0** |
| typecheck (`tsc --noEmit`) | PASS |
| build | PASS (11.38s) |

## 12. 변경 파일

```text
services/web-neture/src/lib/api/supplier.ts
services/web-neture/src/pages/supplier/SupplierProductsPage.tsx
services/web-neture/src/pages/supplier/SupplierDashboardPage.tsx
```

3 파일 — **API 와 소비처 2곳을 같은 구현 커밋(`7faf53bf8`)에 담았다.** 부분 반영 0.

## 13. 실데이터 제한

| 항목 | 상태 | 사유 |
|------|:---:|------|
| 정상 0 ↔ 오류 구분 | 확인 완료 | 계정 상품 0건 — 본 WO 핵심 회귀 검증에 적합 |
| non-zero 카운트 렌더 | **합성 200 응답으로 확인** | 실제 승인 데이터 없음. WO §13-2 허용 방식 사용, 운영 데이터 생성 0 |
| 실데이터 기준 탭 필터링 정확도 | **미확인** | 상품 0건. 테스트 데이터 생성은 WO 금지 |

## 14. 후속 항목

| # | 항목 |
|---|------|
| 1 | `WO-O4O-NETURE-SUPPLIER-CONTENT-DISTRIBUTION-LOAD-ERROR-CONTRACT-V1` (IR 우선순위 3) — recruitments C 등급 + 설명서·펀딩·이벤트 B 등급 |
| 2 | IR E 등급 2건(`getShipment` / `getOrderCondition`) — backend 404 vs 5xx 계약 확인 후 판단 |
| 3 | 대시보드에서 승인 카운트만 단독 재호출하는 경로 (현재는 전체 `fetchData()` 재실행) |
| 4 | 실데이터 보유 계정으로 non-zero 카운트·탭 필터 재검증 |
