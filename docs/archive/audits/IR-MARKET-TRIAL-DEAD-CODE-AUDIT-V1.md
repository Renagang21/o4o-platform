# IR-MARKET-TRIAL-DEAD-CODE-AUDIT-V1

> Market Trial 정리 작업 완료 후 잔존 Dead Code 감사 보고서

---

## 감사 정보

| 항목 | 내용 |
|------|------|
| 감사 식별자 | IR-MARKET-TRIAL-DEAD-CODE-AUDIT-V1 |
| 선행 WO | WO-CLEANUP-1, WO-CLEANUP-2, WO-MONITOR-1, WO-MONITOR-UI-1 |
| 감사 일자 | 2026-04-17 |
| 감사 범위 | Market Trial 전체 코드베이스 (entity, controller, routes, frontend pages, API types) |
| 감사 방법 | 정적 분석 (코드 탐색 + 참조 추적), 변경 없음 |

---

## 6-1. 총평 (Verdict)

**PARTIAL** — 일부 dead code 존재. 즉시 삭제 가능한 후보 3개 확인.

WO-CLEANUP-1에서 `MarketTrialServiceApproval` 엔티티/라우트/컨트롤러를 완전 제거하여 2차 승인 인프라의 주요 dead code는 이미 정리되었다. 그러나 `TrialStatus.APPROVED` 열거값과 관련 UI 필터 탭이 backend/frontend 양쪽에 잔존하며, 현재의 단일 승인 흐름(1차 승인 = 최종 승인)에서는 더 이상 유효한 상태가 아니다.

게이트웨이 서비스(KPA-Society, GlycoPharm, K-Cosmetics)의 리다이렉트 코드와 WO-MONITOR-1에서 신설된 모니터링 코드는 모두 정상적으로 사용 중이다.

---

## 6-2. 요약

| 구분 | 개수 |
|------|------|
| 전체 후보 | 10개 |
| 즉시 DROP 권장 | 3개 |
| VERIFY 후 결정 | 1개 |
| KEEP (정상 사용 중) | 6개 |

---

## 6-3. 카테고리별 분류

### A. ServiceApproval 잔재

WO-CLEANUP-1에서 핵심 인프라는 제거되었으나, 상태 enum에 `APPROVED` 값이 남아있다.

- `TrialStatus.APPROVED` — backend entity에 정의되어 있으나 현재 흐름에서 도달 불가
- 프론트엔드 `TrialStatus` union type의 `'approved'` — API 응답에서 반환될 수 없음
- 운영자 페이지의 `APPROVED` 필터 탭 — 항상 0건을 표시하는 빈 탭

### B. Admin URL 별칭

WO-CLEANUP-2에서 `/admin/market-trial` → `/operator/market-trial` 리다이렉트가 추가되었다. 이 코드는 backward compat 용도이므로 **KEEP**.

### C. 게이트웨이 서비스

KPA-Society, GlycoPharm, K-Cosmetics의 Market Trial 진입점은 모두 Neture로 리다이렉트하는 정상 코드다. **KEEP**.

### D. 포럼 모니터링

WO-MONITOR-1/UI-1에서 신설된 코드. 정상 사용 중. **KEEP**.

### E. 상태 설명 문구

`SupplierTrialDetailPage`의 `submitted` 상태 메시지는 WO-CLEANUP-1에서 이미 정리됨. 나머지 문구는 정상.

---

## 6-4. Dead Code 상세 테이블

| # | 파일 | 위치 | 유형 | 심각도 | 참조 여부 | 권고 |
|---|------|------|------|--------|----------|------|
| 1 | `packages/market-trial/src/entities/MarketTrial.entity.ts` | `TrialStatus.APPROVED` 열거값 | Enum value | HIGH | CSV export label에서만 참조 (backward compat) | **DROP** |
| 2 | `services/web-neture/src/api/trial.ts:15` | `'approved'` in TrialStatus union | Type union member | MEDIUM | STATUS_CONFIG, FILTER_TABS에서 참조 | **DROP** |
| 3 | `services/web-neture/src/pages/operator/MarketTrialApprovalsPage.tsx` | `APPROVED` 필터 탭 (FILTER_TABS) | UI filter tab | MEDIUM | 자체 참조만 (tab 렌더링용) | **DROP** |
| 4 | `apps/api-server/src/controllers/market-trial/marketTrialController.ts` | PRE_LAUNCH_STATUSES 주석 ("2차 승인" 언급) | 코드 주석 | LOW | 해당 없음 | **VERIFY** |
| 5 | `services/web-neture/src/pages/operator/MarketTrialApprovalsPage.tsx` | STATUS_CONFIG `approved` 항목 | Config entry | LOW | FILTER_TABS #3과 연동 | KEEP (항목 #3 삭제 시 함께 정리) |
| 6 | `apps/api-server/src/controllers/market-trial/marketTrialOperatorController.ts` | CSV export의 `'approved'` 레이블 | String literal | LOW | CSV 다운로드에서 사용 | KEEP (backward compat) |
| 7 | `services/web-neture/src/pages/kpa/market-trial/*` | Neture 리다이렉트 게이트웨이 | Gateway redirect | — | 정상 사용 | KEEP |
| 8 | `services/web-neture/src/pages/glycopharm/market-trial/*` | Neture 리다이렉트 게이트웨이 | Gateway redirect | — | 정상 사용 | KEEP |
| 9 | `services/web-neture/src/App.tsx` | `/admin/market-trial` 리다이렉트 | URL alias | — | 정상 backward compat | KEEP |
| 10 | `apps/api-server/src/extensions/trial-forum-monitor/` | ForumSyncFailure 모니터링 | 신설 기능 | — | 정상 사용 | KEEP |

---

## 6-5. 즉시 삭제 가능 후보 (DROP)

### DROP-1: `TrialStatus.APPROVED` 열거값

**파일**: `packages/market-trial/src/entities/MarketTrial.entity.ts`

현재 단일 승인 흐름에서 `APPROVED` 상태로 전환되는 코드 경로가 없다. `approve1st()`는 `PENDING_APPROVED`로 전환하고, 이후 `updateTrialStatus()`로 `ACTIVE`로 넘어간다.

유일한 참조는 CSV export의 레이블 매핑 (`'approved': '승인됨'`)으로, 이는 이미 이 상태에 있는 기존 레코드를 위한 backward compat 처리다. **Enum 값 자체를 제거하려면 DB의 `status` 컬럼 CHECK constraint 또는 기존 row 마이그레이션이 선행되어야 한다.**

> ⚠️ DB 마이그레이션 필요: 기존 row 중 `status = 'approved'`인 것이 있을 경우 먼저 상태 일괄 전환 필요.

---

### DROP-2: `'approved'` in frontend TrialStatus

**파일**: `services/web-neture/src/api/trial.ts`  
**위치**: `type TrialStatus = ... | 'approved' | ...` (line ~15)

API 응답에서 `approved` 상태가 반환되지 않으므로 dead type. DROP-1과 연동하여 처리.

---

### DROP-3: APPROVED 필터 탭

**파일**: `services/web-neture/src/pages/operator/MarketTrialApprovalsPage.tsx`  
**위치**: `FILTER_TABS` 배열의 `{ value: 'approved', label: '승인됨' }` 항목

현재 흐름에서 `approved` 상태 레코드는 존재하지 않으므로 이 탭은 항상 0건을 표시한다. 운영자 UX상 혼란을 야기할 수 있다.

---

## 6-6. 보류/검증 필요 후보

### VERIFY-1: PRE_LAUNCH_STATUSES 주석

**파일**: `apps/api-server/src/controllers/market-trial/marketTrialController.ts`  
**내용**: `PRE_LAUNCH_STATUSES` 배열 근처의 주석이 "2차 승인" 흐름을 언급할 수 있음

코드 로직 자체는 문제없으나, 주석이 현행 단일 승인 구조와 맞지 않을 경우 혼란을 줄 수 있다. 코드 변경 없이 주석만 업데이트하면 됨.

---

## 6-7. 후속 WO 제안

### WO-CLEANUP-3: APPROVED 상태 완전 제거 (권고)

**범위**:
1. DB에서 `status = 'approved'` 레코드 확인 및 상태 마이그레이션 (`approved` → `pending_approved` 또는 `active`)
2. `TrialStatus.APPROVED` enum 값 제거
3. Frontend `TrialStatus` union에서 `'approved'` 제거
4. `FILTER_TABS`에서 `approved` 탭 제거
5. `STATUS_CONFIG`에서 `approved` 항목 제거

**선행 조건**: DB 조회로 `approved` 상태 row 유무 확인 필수

---

### WO-DOCS-1: 주석 현행화 (선택)

**범위**: `marketTrialController.ts`의 `PRE_LAUNCH_STATUSES` 주석을 현행 단일 승인 구조에 맞게 업데이트

---

### WO-CLEANUP-4: Admin URL 리다이렉트 제거 (향후)

**범위**: `/admin/market-trial` 리다이렉트 코드는 현재 backward compat 용도이나, 일정 기간 후 완전 제거 가능

**전제 조건**: 모든 북마크/외부 링크가 `/operator/market-trial`로 전환된 후

---

## 결론

WO-CLEANUP-1~2, WO-MONITOR-1~UI-1 완료로 Market Trial 코드베이스는 Neture 단일 실행 구조로 정리되었다. 잔존 dead code의 핵심은 `TrialStatus.APPROVED` 값과 이를 참조하는 UI 코드로, DB 마이그레이션을 선행하는 **WO-CLEANUP-3**으로 최종 정리를 권장한다.
