# IR-MARKET-TRIAL-NETURE-CANONICAL-RESTART-AUDIT-V1

> **작업 분류:** Audit / 재감사  
> **작업 원칙:** Neture 단일 execution service 원칙 기준 전수 조사  
> **작업 유형:** 구현 없음 — 코드 기준 감사 및 정비 우선순위 확정  
> **감사일:** 2026-04-17

---

## 1. 전체 판정

**PASS**

> Neture canonical execution 구조는 정확히 구현되어 있으며, KPA-Society·GlycoPharm·K-Cosmetics는 redirect-only 게이트웨이로 동작한다. 단, 2차 승인(ServiceApproval) 레거시 인프라가 아직 코드 및 라우트에 잔존하고 있어 명시적 제거 작업이 필요하다.

---

## 2. Canonical 구조 요약

| 항목 | 내용 |
|------|------|
| **canonical execution service** | Neture (`services/web-neture`) |
| **non-canonical legacy surfaces** | ServiceApproval 2차 승인 라우트 (`/api/v1/:serviceKey/operator/market-trial/*`) |
| **gateway-only surfaces** | KPA-Society, GlycoPharm, K-Cosmetics (redirect 컴포넌트만 존재) |
| **deprecated execution patterns** | `approve2nd()`, `reject2nd()` — HTTP 403 반환하나 라우트 여전히 마운트됨 |
| **현재 기준 source of truth** | Neture 운영자 승인 1단계 → Market Trial 상태 머신 전체 |

---

## 3. 서비스별 분류표

### 3-1. Neture (canonical execution service)

| 컴포넌트 | 경로 | 현재 역할 | 실행성 | Canonical 부합 | 판정 |
|---------|------|---------|------|--------------|------|
| Hub 목록 페이지 | `pages/market-trial/MarketTrialHubPage.tsx` | 공개 trial 목록 | YES | PASS | KEEP |
| Trial 상세 페이지 | `pages/market-trial/MarketTrialDetailPage.tsx` | 상세 + 참여 신청 | YES | PASS | KEEP |
| 내 참여 현황 | `pages/market-trial/MyParticipationsPage.tsx` | 참여자 대시보드 | YES | PASS | KEEP |
| 공급자 목록 | `pages/supplier/SupplierTrialListPage.tsx` | 내 trial 관리 | YES | PASS | KEEP |
| 공급자 등록 | `pages/supplier/SupplierTrialCreatePage.tsx` | 신규 trial 생성 | YES | PASS | KEEP |
| 공급자 상세 | `pages/supplier/SupplierTrialDetailPage.tsx` | 상세 + 제출 | YES | PASS | KEEP |
| 운영자 승인 목록 | `pages/operator/MarketTrialApprovalsPage.tsx` | 승인 큐, 상태 필터 | YES | PASS | KEEP |
| 운영자 승인 상세 | `pages/operator/MarketTrialApprovalDetailPage.tsx` | 상세 + 액션 | YES | PASS | KEEP |
| `/admin/market-trial` 라우트 alias | `App.tsx` lines 819-820 | operator 페이지 중복 | YES | PARTIAL | HOLD |
| `/operator/market-trial` 라우트 | `App.tsx` lines 896-897 | operator 페이지 정식 | YES | PASS | KEEP |

### 3-2. KPA-Society (gateway-only)

| 컴포넌트 | 경로 | 현재 역할 | 실행성 | Canonical 부합 | 판정 |
|---------|------|---------|------|--------------|------|
| 홈 배너 섹션 | `components/home/MarketTrialSection.tsx` | 외부 링크 배너 | NO | PASS | KEEP |
| redirect 컴포넌트 | `components/MarketTrialNetureRedirect.tsx` | Neture로 자동 redirect | NO | PASS | KEEP |
| `/market-trial` 라우트 | App.tsx | redirect 실행 | NO | PASS | KEEP |
| `/market-trial/:id` 라우트 | App.tsx | redirect 실행 | NO | PASS | KEEP |

### 3-3. GlycoPharm (gateway-only)

| 컴포넌트 | 경로 | 현재 역할 | 실행성 | Canonical 부합 | 판정 |
|---------|------|---------|------|--------------|------|
| redirect 컴포넌트 | `components/common/MarketTrialNetureRedirect.tsx` | Neture로 자동 redirect | NO | PASS | KEEP |
| `/store/market-trial*` 라우트 | App.tsx | redirect 실행 | NO | PASS | KEEP |

### 3-4. K-Cosmetics (gateway-only)

| 컴포넌트 | 경로 | 현재 역할 | 실행성 | Canonical 부합 | 판정 |
|---------|------|---------|------|--------------|------|
| redirect 컴포넌트 | `components/common/MarketTrialNetureRedirect.tsx` | Neture로 자동 redirect | NO | PASS | KEEP |
| `/store/market-trial*` 라우트 | App.tsx | redirect 실행 | NO | PASS | KEEP |

### 3-5. 공통/Backend

| 컴포넌트 | 경로 | 현재 역할 | 실행성 | Canonical 부합 | 판정 |
|---------|------|---------|------|--------------|------|
| MarketTrial 엔티티 | `packages/market-trial/src/entities/MarketTrial.entity.ts` | 핵심 엔티티 | YES | PASS | KEEP |
| MarketTrialParticipant 엔티티 | `packages/market-trial/src/entities/` | 참여자 데이터 | YES | PASS | KEEP |
| MarketTrialForum 엔티티 | `packages/market-trial/src/entities/` | 포럼 연계 | YES | PASS | KEEP |
| **MarketTrialServiceApproval 엔티티** | `packages/market-trial/src/entities/MarketTrialServiceApproval.entity.ts` | **2차 승인 (deprecated)** | DEPRECATED | FAIL | **HOLD → DROP** |
| MarketTrialController | `apps/api-server/src/controllers/market-trial/marketTrialController.ts` | 공개 API | YES | PASS | KEEP |
| MarketTrialOperatorController | `apps/api-server/src/controllers/market-trial/marketTrialOperatorController.ts` | 운영자 API | YES | PASS | KEEP |
| **2차 승인 라우트** | `apps/api-server/src/bootstrap/register-routes.ts` line 344 | **레거시 라우트 (403 반환)** | DEPRECATED | FAIL | **DROP** |
| MarketTrialService | `packages/market-trial/src/` | trial 생명주기 | YES | PASS | KEEP |
| MarketTrialDecisionService | `packages/market-trial/src/` | 결정 로직 | YES | PASS | KEEP |
| MarketTrialForumService | `packages/market-trial/src/` | 포럼 연계 | YES | PASS | KEEP |
| visibleServiceKeys 컬럼 | `MarketTrial.entity.ts` line 175 | 노출 게이트 제어 | DISCOVERY ONLY | PASS | KEEP |

---

## 4. 기능 축별 정리

| 기능 축 | 처리 위치 | 실행 서비스 | Neture only? | 상태 |
|--------|---------|-----------|-------------|------|
| **Trial 등록** | Neture 공급자 페이지 → MarketTrialController | Neture | YES | PASS |
| **Trial 제출** | `POST /api/market-trial/:id/submit` | Neture | YES | PASS |
| **Trial 1차 승인** | `approve1st()` — `/api/v1/neture/operator/market-trial/:id/approve` | Neture 운영자 | YES | PASS |
| **Trial 2차 승인 (deprecated)** | `approve2nd()` — `/api/v1/:serviceKey/operator/market-trial/:id/approve` | 레거시 (HTTP 403) | NO — deprecated | **HOLD → DROP** |
| **Trial 노출** | `visibleServiceKeys[]` 기반 필터링 | Neture 운영자 설정 | 발견/게이트만 | PASS |
| **Trial 상세** | `GET /api/market-trial/:id` (공개) | Neture | YES | PASS |
| **참여 신청** | `POST /api/market-trial/:id/join` | Neture | YES | PASS |
| **참여자 관리** | `/api/v1/neture/operator/market-trial/:id/participants` | Neture | YES | PASS |
| **상태 전이** | `updateTrialStatus()` — `/api/v1/neture/operator/...` | Neture 운영자 | YES | PASS |
| **정산 선택** | `saveSettlementChoice()` — `/api/market-trial/:id/settlement-choice` | Neture | YES | PASS |
| **정산 상태 관리** | `updateParticipantSettlementStatus()` | Neture 운영자 | YES | PASS |
| **고객 전환 상태** | `updateParticipantConversionStatus()` | Neture 운영자 | YES | PASS |
| **공급자 관리** | Neture 공급자 대시보드 | Neture | YES | PASS |
| **운영자 관리** | Neture 운영자 대시보드 | Neture | YES | PASS |
| **외부 서비스 게이트 유입** | redirect 컴포넌트 (KPA/GlycoPharm/K-Cosmetics) | 게이트 전용 | YES — no exec | PASS |
| **Product 전환** | `convertToProduct()` — `/api/v1/neture/operator/market-trial/:id/convert` | Neture | YES | PASS |
| **스토어 리스팅 연결** | `createListingFromParticipant()` | Neture | YES | PASS |
| **포럼/홍보 연계** | `MarketTrialForumService` — 1차 승인 시 자동 생성 | Neture | YES (fire-and-forget) | PASS (모니터링 권장) |

---

## 5. KEEP / HOLD / DROP 목록

### KEEP — Neture canonical 구조에 부합, 유지 필수

- Neture Hub 페이지 (목록/상세/참여현황) — 전체
- Neture 공급자 페이지 (목록/등록/상세) — 전체
- Neture 운영자 페이지 (`/operator/market-trial*`) — 전체
- Backend controllers: `marketTrialController.ts`, `marketTrialOperatorController.ts`
- packages/market-trial: 엔티티(MarketTrial, MarketTrialParticipant, MarketTrialForum, MarketTrialDecision), 서비스 레이어 전체
- `visibleServiceKeys` 컬럼 — 발견 가시성 제어 (실행 분산이 아님)
- KPA-Society/GlycoPharm/K-Cosmetics redirect 컴포넌트 — 순수 게이트웨이
- KPA-Society 홈 배너 (`MarketTrialSection.tsx`) — 외부 링크 전용

### HOLD — 즉시 제거하지 않되 후속 판단 필요

- Neture `/admin/market-trial` 라우트 alias
  - 이유: `/operator/market-trial`와 동일 컴포넌트 사용; URL 이중화로 UX 혼선
  - 권장: 다음 정비 WO에서 `/admin/market-trial` → `/operator/market-trial` redirect로 전환
- `MarketTrialServiceApproval` 엔티티
  - 이유: 2차 승인 deprecated 후 엔티티/테이블이 아직 존재
  - 권장: DB 레코드 확인 후 DROP 단계로 이동

### DROP — Neture 단일 실행 원칙 불부합, 제거/축소/redirect 대상

- `/api/v1/:serviceKey/operator/market-trial/*` 라우트 등록 (`register-routes.ts` line 344)
  - 현재 상태: 마운트되어 있으나 403 반환
  - 제거 대상: 라우트 등록 코드 삭제
- `approve2nd()`, `reject2nd()` 메서드 (`MarketTrialOperatorController`)
  - `@deprecated` 주석 있으나 코드 존재
  - 제거 대상: 메서드 삭제
- `createServiceOperatorTrialRoutes()` export
  - 제거 대상: 함수 삭제
- `market_trial_service_approvals` 테이블
  - 제거 대상: DB 마이그레이션으로 테이블 드롭 (데이터 백업 후)

---

## 6. 위험 포인트

### Risk-1: 레거시 ServiceApproval 라우트 여전히 마운트됨 (중간)

- **내용:** `/api/v1/:serviceKey/operator/market-trial/*` 라우트가 `register-routes.ts` line 344에 등록되어 있으며, 실제로 HTTP 403을 반환하지만 라우트 자체는 살아있음
- **위험:** 개발자가 403 응답을 "미승인" 상태로 오해하여 우회 시도 가능성; deprecated 코드 오용 가능성
- **조치:** 라우트 등록 삭제 또는 명시적 404/410 Gone 응답으로 교체

### Risk-2: Admin/Operator URL 이중화 — UX 혼선 (낮음)

- **내용:** Neture `App.tsx` lines 819-820에서 `/admin/market-trial`이 `MarketTrialApprovalsPage`에 연결됨. `/operator/market-trial`(lines 896-897)과 동일 컴포넌트
- **위험:** 운영자가 어느 URL을 사용해야 하는지 불명확; OPERATOR-DASHBOARD-STANDARD-V1 기준(operator URL만 사용)과 불일치
- **조치:** `/admin/market-trial` → `/operator/market-trial` redirect 처리

### Risk-3: DB 고아 ServiceApproval 레코드 가능성 (낮음)

- **내용:** `market_trial_service_approvals` 테이블에 이전 2차 승인 레코드가 잔존할 수 있음
- **위험:** 런타임 오류 없음; 단순 데이터 오염 및 혼선 원인
- **조치:** 테이블 레코드 조회 후 아카이브 또는 삭제; 테이블 DROP 마이그레이션

### Risk-4: 포럼 연계 fire-and-forget 실패 무시 (중간)

- **내용:** 1차 승인 시 포럼 포스트 자동 생성이 `void dispatchConversionNotifications(...).catch(console.error)` 패턴으로 처리됨
- **위험:** 포럼 서비스 불가 시 trial이 승인되었으나 포럼에 노출되지 않을 수 있음
- **조치:** 실패 건 모니터링 추가; 어드민 API로 미생성 건 조회 가능하게 구현 권장

### Risk-5: visibleServiceKeys 오용 가능성 (낮음)

- **내용:** `visibleServiceKeys` 컬럼이 발견/게이트 전용인데, 향후 개발자가 이를 "실행 분산 플래그"로 오해할 수 있음
- **위험:** 신규 서비스 연동 시 잘못된 방향으로 구현될 수 있음
- **조치:** 엔티티 및 API 문서에 "discovery-only, not execution distribution" 명시 주석 추가

### Risk-6: 구형 KPA URL 북마크 단절 (낮음)

- **내용:** KPA-Society 내 `/market-trial/*` URL은 Neture로 `window.location.replace()` (영구 교체)
- **위험:** 북마크 링크가 모두 무효화됨; 사용자 혼선 가능
- **조치:** 릴리즈 노트에 URL 변경 사항 명시; 이미 의도된 통합이므로 별도 대응 불필요

### Risk-7: 전환 알림 중복 방지 가드 (낮음, 설계상 허용)

- **내용:** `notificationSentAt` 가드로 중복 알림 방지 처리됨
- **위험:** 없음 — 설계대로 동작
- **상태:** PASS

---

## 7. 후속 Work Order 제안

### WO-CLEANUP-1: ServiceApproval 레거시 완전 제거

**우선순위:** 중간 (다음 스프린트 권장)

**묶음 내용:**
1. `register-routes.ts` line 344 — 2차 승인 라우트 등록 제거
2. `MarketTrialOperatorController` — `approve2nd()`, `reject2nd()` 메서드 삭제
3. `createServiceOperatorTrialRoutes()` export 삭제
4. DB 마이그레이션: `market_trial_service_approvals` 레코드 백업 + 테이블 DROP
5. `MarketTrialServiceApproval.entity.ts` 파일 삭제

**효과:** deprecated 코드 완전 제거, DB 스키마 정리, 라우트 노출 차단

---

### WO-CLEANUP-2: Admin/Operator URL 통합

**우선순위:** 낮음 (다음 정기 정비 시 처리)

**묶음 내용:**
1. Neture `App.tsx` lines 819-820 — `/admin/market-trial*` 라우트 제거
2. `/admin/market-trial` → `/operator/market-trial` HTTP redirect 추가
3. 운영자 대시보드 내 링크/메뉴 URL 검토 → `/operator` 기준 통일
4. OPERATOR-DASHBOARD-STANDARD-V1 준수 확인

**효과:** UX 혼선 제거, CLAUDE.md 표준 준수

---

### WO-MONITOR-1: 포럼 연계 모니터링 강화

**우선순위:** 중간 (안정성 향상)

**묶음 내용:**
1. `dispatchConversionNotifications()` 실패 시 trial ID + 오류 로그 Cloud Logging에 기록
2. Admin API 엔드포인트: `GET /api/v1/admin/market-trial/failed-forum-posts` — 미생성 건 조회
3. 알림: 1시간 내 포럼 포스트 생성 실패 3건 이상 시 Cloud Monitoring 알림

**효과:** 포럼 연계 오류 가시성 확보, 운영 대응 가능

---

### WO-DOC-1: visibleServiceKeys 계약 명문화

**우선순위:** 낮음 (코드 문서화)

**묶음 내용:**
1. `MarketTrial.entity.ts` `visibleServiceKeys` 컬럼에 JSDoc 추가 — "발견 가시성 제어 전용, 실행 분산 아님"
2. `listForService()` 메서드에 read-only 사용 설명 추가
3. API 문서 업데이트: visibleServiceKeys 파라미터 용도 설명
4. (선택) 아키텍처 다이어그램 추가: Neture canonical + gateway-only 구조

**효과:** 신규 개발자 오용 방지, canonical 원칙 코드 수준 명시

---

## 8. 핵심 결론 (완료 보고)

**전체 판정: PASS**

1. **Neture canonical 구조는 정확히 구현되어 있다.** 등록·승인·모집·참여·운영·정산·전환 모든 실행 흐름이 Neture 내에서 완결된다.
2. **타 서비스(KPA-Society, GlycoPharm, K-Cosmetics)는 redirect 전용 게이트웨이로 동작한다.** 실행 로직·API 호출 없음. 완전히 준수.
3. **2차 승인(ServiceApproval) 레거시가 코드 및 라우트에 잔존한다.** HTTP 403 반환으로 실제 동작은 안 하지만 라우트가 마운트되어 있어 명시적 제거 필요.
4. **visibleServiceKeys는 발견/게이트 전용**으로 올바르게 사용되고 있다. 실행 분산 흔적 없음.
5. **Admin/Operator URL 이중화**는 OPERATOR-DASHBOARD-STANDARD-V1과 충돌; redirect 처리로 정리 권장.
6. **포럼 연계(fire-and-forget)는 운영 위험 존재**. 실패 시 포럼 노출 누락 가능성. 모니터링 추가 권장.
7. **Product 전환 및 스토어 리스팅 연결** 모두 Neture 운영자 기준으로 구현됨. 완전히 준수.
8. **다음 단계 우선 실행 WO:** `WO-CLEANUP-1` (레거시 제거) → `WO-CLEANUP-2` (URL 통합) → `WO-MONITOR-1` (포럼 모니터링) 순 권장.

---

*Audit completed: 2026-04-17*  
*Auditor: Claude Code (claude-sonnet-4-6)*  
*WO reference: WO-MARKET-TRIAL-NETURE-CANONICAL-RESTART-AUDIT-V1*
