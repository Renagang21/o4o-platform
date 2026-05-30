# CHECK-O4O-GLYCOPHARM-CARE-GLUCOSEVIEW-RESIDUE-CLEANUP-FINAL-PASS-V1

**검증 일자**: 2026-05-31
**검증 환경**: HEAD (main) `b18858252` 시점 정적 코드 / git history / TypeScript 검증
**검증 도구**: Grep / Git log / TypeScript compiler
**작업 성격**: 검증 및 문서화 전용 — 코드/DB/source 수정 없음
**선행 CHECK**: [CHECK-O4O-GLYCOPHARM-CARE-GLUCOSEVIEW-RESIDUE-CLEANUP-COMPLETION-V1](CHECK-O4O-GLYCOPHARM-CARE-GLUCOSEVIEW-RESIDUE-CLEANUP-COMPLETION-V1.md) (CONDITIONAL PASS, commit `ee221f185`)
**보완 WO**: [WO-O4O-API-SERVER-AUTH-GLUCOSEVIEW-RESIDUE-CLEANUP-V1](https://github.com/Renagang21/o4o-platform/commit/b18858252) (commit `b18858252`)

---

## 0. 핵심 결론 (TL;DR)

> ✅ **PASS** — A1 + A2 모두 active code 제거 완료. Care + GlucoseView 삭제 잔재 정리 1차 **최종 완료**.
>
> 1. **A1 register.dto.ts** — `displayName?` 필드 제거 (사용처 0 dead code), `pharmacyName?` 보존 (KPA active 사용) + 주석 정정, 헤더 docstring "5개 → 4개 서비스" 정정
> 2. **A2 password.controller.ts** — `'https://glucoseview.co.kr'` ALLOWED_ORIGINS 라인 제거 + docstring 정정
> 3. **GlucoseView active code 잔존 0건** (모두 정리 사유 주석 trace + entity docstring — F 보존)
> 4. **Care active code 잔존 0건** (1건 example: `GlycoPharmAdminDashboard.tsx:262` 의 `totalPatients = getKpiValue(..., 'total-patients')` 는 W5a 시점 사용자가 명시적으로 보존 결정한 dead-on-the-vine — backend STUB 제거로 응답 없음, 후속 트래킹 §6.5)
> 5. **api-server TypeScript 0 errors** — A1/A2 가 위치한 영역 신규 에러 0건 ✅
> 6. **본 CHECK source 변경 0건** — 검증 + 문서화만

---

## 1. Executive Summary

| 기준 | 결과 |
|------|:----:|
| A1 제거 확인 (register.dto.ts) | ✅ |
| A2 제거 확인 (password.controller.ts) | ✅ |
| GlucoseView active code 0 | ✅ |
| Care active code 0 (의도적 보존 분리) | ✅ |
| 신규 TypeScript 오류 없음 | ✅ |
| Source file 수정 없음 | ✅ |
| CHECK 문서만 생성 | ✅ |

---

## 2. 선행 CONDITIONAL PASS 사유

선행 CHECK [`ee221f185`](https://github.com/Renagang21/o4o-platform/commit/ee221f185) 의 §11 CONDITIONAL 사유:

| ID | 위치 | 분류 |
|----|------|:----:|
| A1 | `apps/api-server/src/modules/auth/dto/register.dto.ts:249-256` | active code (GlucoseView 전용 displayName/pharmacyName 필드) |
| A2 | `apps/api-server/src/modules/auth/controllers/password.controller.ts:28` | active code (`'https://glucoseview.co.kr'` CORS allowed origin) |

본 CHECK 의 목적: 보완 WO `b18858252` 가 A1 + A2 를 모두 제거하여 PASS 로 격상 가능한지 검증.

---

## 3. 보완 WO 검증

**Commit**: [`b18858252`](https://github.com/Renagang21/o4o-platform/commit/b18858252) `WO-O4O-API-SERVER-AUTH-GLUCOSEVIEW-RESIDUE-CLEANUP-V1`

| 항목 | 처리 |
|------|------|
| 수정 파일 | 2개 (register.dto.ts + password.controller.ts) |
| 변경 | +12 / -11 |
| commit method | path-restricted (`git commit -- <path>`) |
| 다른 세션 WIP 격리 | ✅ |

---

## 4. A1 register DTO 검증

**파일**: [apps/api-server/src/modules/auth/dto/register.dto.ts](../../apps/api-server/src/modules/auth/dto/register.dto.ts)

### 4.1 GlucoseView 전용 필드 섹션

| 검색 | 결과 |
|------|:----:|
| `// --- GlucoseView 전용 필드 ---` (active 섹션 라벨) | **0** ✅ |
| 대체 라벨 `// --- 약국 정보 필드 ---` | 존재 ✅ |

### 4.2 displayName? 필드

| 검색 (register.dto.ts 내 active) | 결과 |
|------|:----:|
| `displayName?: string` (register.dto.ts 의 active 정의) | **0** ✅ — 제거됨 |
| `data.displayName` (register flow 사용) | **0** ✅ (auth/auth-register.controller.ts 내) |

→ register flow 사용처가 0이었던 dead code 안전 제거.

> 다른 displayName 필드 3건 (`guest-auth.dto.ts:98`, `service-login.dto.ts:52`, `role.service.ts:24`) 은 별개 컨텍스트 (guest auth / service login / role 관리) — 본 CHECK 범위와 무관.

### 4.3 pharmacyName? 필드

| 검색 | 결과 |
|------|:----:|
| `pharmacyName?: string` (line 259) | **유지** ✅ |
| 정정된 주석 (line 253) "KPA pharmacist 활동: 약국명" | 존재 ✅ |

→ KPA register flow 의 약사 활동 시 약국명 필드로 active 사용 (`auth-register.controller.ts:458/671/691/721`) — WO 중단 조건 "다른 서비스가 사용하는 일반 필드와 혼동" 정확히 해당, 필드 유지 + 주석만 정정 처리.

### 4.4 헤더 docstring

| 검색 | 결과 |
|------|:----:|
| "5개 서비스(KPA, GlycoPharm, Neture, K-Cosmetics, GlucoseView)" | **0** ✅ |
| "4개 서비스(KPA, GlycoPharm, Neture, K-Cosmetics)" (line 8) | 존재 ✅ |
| 정정 사유 주석 (line 6 WO reference) | 존재 ✅ |

**판정**: ✅ A1 PASS

---

## 5. A2 password CORS 검증

**파일**: [apps/api-server/src/modules/auth/controllers/password.controller.ts](../../apps/api-server/src/modules/auth/controllers/password.controller.ts)

### 5.1 ALLOWED_ORIGINS

| 검색 | 결과 |
|------|:----:|
| `'https://glucoseview.co.kr'` (active entry) | **0** ✅ — 제거됨 |
| 다른 서비스 origin (`getServiceOrigins()`, `admin.neture.co.kr`, `localhost:`) | 유지 ✅ |

### 5.2 docstring

| 검색 | 결과 |
|------|:----:|
| "(glucoseview / admin sub-domain / localhost dev)" 잘못된 명시 | **0** ✅ |
| "(admin sub-domain / localhost dev)" 정정된 명시 | 존재 ✅ |
| 정정 사유 주석 (line 26 WO reference) | 존재 ✅ |

### 5.3 CORS 구조

password reset CORS 구조 자체 변경 없음 — 단일 ALLOWED_ORIGINS array 의 entry 1개만 제거. `getServiceOrigins()` SSOT helper 호출 패턴 보존.

**판정**: ✅ A2 PASS

---

## 6. GlucoseView active code 재검색 결과

### 6.1 전수 검색

| 영역 | active code 잔존 |
|------|:----------------:|
| `apps/api-server/src/modules/auth/**` | **0** ✅ (3건 모두 정리 사유 주석 — F) |
| `packages/**` | **0** ✅ (이전 cleanup commit 들의 정리 trace) |
| `services/**` | **0** ✅ (mock supplier 1건 별도 트랙) |
| `apps/api-server/src/**` (auth 외) | **0** ✅ |

### 6.2 잔존 항목 분류

| 위치 | 분류 |
|------|:----:|
| `register.dto.ts:7, 252` 정리 사유 주석 | F (WO trace) |
| `password.controller.ts:26` 정리 사유 주석 | F |
| `ServiceMembership.ts:46` entity docstring (`// 'neture' \| 'glycopharm' \| 'kpa-society' \| 'glucoseview' \| ...`) | F (selected CHECK 보존) |
| `web-glycopharm/api/public.ts:85` `supplier: 'GlucoseView'` | F (mock supplier 별도 트랙) |
| `apps/api-server/__tests__/security/*.spec.ts` | F (cross-service 차단 검증 test fixture) |
| `apps/api-server/utils/operator-alert.utils.ts:21,48` `pendingApprovals?` 주석 | F (W5b 의도적 보존) |
| `scripts/care-*.{mjs,py,sh}` | F (broken test scripts, dead endpoint 호출) |
| docs / IR / migration 다수 | F (정책/감사 문서, 이미 실행된 변경 이력) |

→ **active code 잔존 0건** ✅

---

## 7. Care active code 재확인

### 7.1 전수 검색

| 검색어 | 영역 | active code 잔존 |
|-------|------|:----------------:|
| `OperatorCapability.CARE` | apps + packages + services | **0** ✅ (주석 trace 만) |
| `key: 'care'` (STANDARD_GROUPS) | packages/ui | **0** ✅ |
| `OperatorGroupKey 'care'` | packages/ui | **0** ✅ |
| `openCareAlerts / careAdoptionRate / highRiskPatients / weeklyCareActivity` | apps/api-server | **0** ✅ |
| `CARE_ALERTS / CARE_ADOPTION / HIGH_RISK / WEEKLY_CARE` (THRESHOLD) | apps/api-server | **0** ✅ |
| `AlertItem.type='care'` | services | **0** ✅ (주석 trace 만) |
| `FeatureIntro care config` | services/web-glycopharm | **0** ✅ |
| `ADMIN_KPI_KEYS` Care 3개 키 (`total-patients/high-risk-patients/open-care-alerts`) | services/web-glycopharm | **0** ✅ (whitelist 에서 제거됨) |

### 7.2 W5a 명시 보존 항목 (분리 추적)

[`GlycoPharmAdminDashboard.tsx:262`](../../services/web-glycopharm/src/pages/admin/GlycoPharmAdminDashboard.tsx#L262):

```ts
const totalPatients = getKpiValue(data.kpis, 'total-patients');
```

- W5a (`741e59b4e`) 시점 사용자가 **명시적으로 보존 결정**한 항목 — "ADMIN_KPI_KEYS 에서 3개 키 제거만" 으로 W5a 명시 범위 한정.
- networkStats 의 '회원 수' 라벨 렌더 (line 265 `... !== null ? [{ label: '회원 수', value: totalPatients }] : []`).
- **현재 상태**: backend STUB 4개 metrics 제거 (W5b `1c65e0ad0`) 로 backend KPI 응답에 `'total-patients'` 키 없음 → `getKpiValue` undefined 반환 → '회원 수' 항목 networkStats 에서 미생성. **dead-on-the-vine** (호출은 active 하나 응답 데이터 없음 → 결과 0 효과).

→ 본 CHECK 의 PASS 격상 trigger (A1+A2) 와 별개. W5a 의 의도적 보존 결정 유지. **§6.5 후속 추적 후보로 명시**.

### 7.3 정리 사유 주석 잔존 (F 보존)

| 위치 | 분류 |
|------|:----:|
| `services/web-glycopharm/src/config/operatorCapabilities.ts:19` | F (W5d trace) |
| `services/web-glycopharm/src/pages/admin/GlycoPharmAdminDashboard.tsx:54-56` | F (W5a trace) |
| `packages/ui/src/operator-shell/constants.ts:9` | F (W5c-v2 trace) |
| `apps/api-server/src/utils/operator-alert.utils.ts:21,48` | F (W5b 정리 trace + 보존 주석) |
| `packages/ai-core/src/orchestration/execute.ts:91-92` | F (JSDoc 예제) |

→ **Care active code 잔존 0건** ✅

---

## 8. TypeScript 결과

순차 typecheck 진행. 본 CHECK source 변경 0건이므로 모든 변동은 다른 세션 WIP 영향.

| 영역 | TS errors | 분석 |
|------|----------:|------|
| **api-server** | **0** ✅ | **A1/A2 위치한 영역. 본 CHECK 의 직접 검증 대상 — PASS** |
| web-glycopharm | 32 (선행 CHECK 22 → 32) | pre-existing 6 (lms.ts 4, App.tsx unused 2) + **다른 세션 WIP** 약 26 (GlycoOperatorSidebar 의 `DOMAIN_DISPLAY_ORDER`/`GROUP_TO_DOMAIN` 등을 `@o4o/operator-ux-core/sidebar` 로 이동 중인 중간 상태) — 본 CHECK 무관 |
| web-kpa-society | 10 (선행 CHECK 0 → 10) | **다른 세션 WIP** (KpaOperatorLayoutWrapper / KpaOperatorSidebar 변경 중간 상태) — 본 CHECK 무관 |
| web-k-cosmetics | **0** ✅ | 영향 없음 |
| web-neture | **0** ✅ | 영향 없음 |

**본 CHECK 신규 에러 0건** ✅ — A1/A2 위치 (api-server) TS 통과. 다른 서비스의 증가 에러는 다른 세션의 `WO-O4O-CROSSSERVICE-OPERATOR-SIDEBAR-COMMON-COMPONENT-V1` (operator-ux-core sidebar 추출) 중간 상태 — 본 검증 범위 외.

---

## 9. Working tree 격리 상태

### 9.1 CHECK 시작 시점

```
 M packages/operator-ux-core/package.json
 M packages/operator-ux-core/src/index.ts
 M pnpm-lock.yaml
 M services/web-glycopharm/src/components/layouts/OperatorLayoutWrapper.tsx
 M services/web-glycopharm/src/config/operatorMenuGroups.ts
 M services/web-k-cosmetics/src/components/layouts/OperatorLayoutWrapper.tsx
 M services/web-k-cosmetics/src/config/operatorMenuGroups.ts
 M services/web-kpa-society/src/components/kpa-operator/KpaOperatorLayoutWrapper.tsx
 M services/web-kpa-society/src/config/operatorMenuGroups.ts
?? packages/operator-ux-core/src/sidebar/
```

**다른 세션 WIP 10개** — operator-ux-core sidebar 공통화 작업. 본 CHECK 와 무관, 격리 보존.

### 9.2 CHECK 문서 작성 후 시점

위 10개 + 본 CHECK 신규 untracked 1개 (`docs/investigations/CHECK-O4O-GLYCOPHARM-CARE-GLUCOSEVIEW-RESIDUE-CLEANUP-FINAL-PASS-V1.md`).

### 9.3 commit 정책

- 본 CHECK 문서 1개만 path-restricted commit (`git commit -- <path>`)
- 다른 세션 WIP 10개 절대 stage 안 함
- `git add .` 금지

---

## 10. 최종 판정

### 판정: ✅ **PASS**

| 기준 | 결과 |
|------|:----:|
| A1 제거 확인 | ✅ |
| A2 제거 확인 | ✅ |
| GlucoseView active code 0 | ✅ |
| Care active code 0 (W5a 보존 결정 분리 추적) | ✅ |
| 신규 TypeScript 오류 없음 | ✅ |
| Source file 수정 없음 | ✅ |
| CHECK 문서만 생성 | ✅ |

### PASS 격상 사유

선행 CHECK [`ee221f185`](https://github.com/Renagang21/o4o-platform/commit/ee221f185) 의 CONDITIONAL 사유였던 A1 + A2 가 보완 WO [`b18858252`](https://github.com/Renagang21/o4o-platform/commit/b18858252) 로 모두 제거 확인. **Care + GlucoseView 삭제 잔재 정리 1차 — 최종 완료**.

### Care + GlucoseView 정리 전체 종결 commit 흐름

| 단계 | Commit |
|------|--------|
| W5a Admin KPI whitelist | `741e59b4e` |
| I-α Care 재도입 정책 IR | `d3b56d525` |
| W5b backend alert cluster | `1c65e0ad0` |
| W5d-Frontend type/intro/guard | `c94ed8e49` |
| W5c-v2 shared CARE type contract | `14240d0ad` |
| I-β GlucoseView shared residue | `3abfdfe7b` |
| Tier 5 CONDITIONAL CHECK | `ee221f185` |
| W-Patch auth GlucoseView cleanup | `b18858252` |
| **본 Final PASS CHECK** | (이 commit) |

### 분리 추적 후속 후보 (모두 OPTIONAL, 별도 트랙)

| ID (가칭) | 범위 | 사유 |
|-----------|------|------|
| `WO-O4O-GLYCOPHARM-ADMIN-DASHBOARD-TOTAL-PATIENTS-VAR-CLEANUP-V1` | GlycoPharmAdminDashboard.tsx:262 의 totalPatients dead-on-the-vine 변수 + line 265 networkStats '회원 수' 항목 | W5a 명시 보존 결정 (사용자 결정으로 보존됨, backend STUB 제거 후 응답 없음). 정책 재확정 시 정리 |
| `WO-O4O-GLYCOPHARM-PUBLIC-API-GLUCOSEVIEW-MOCK-CLEANUP-V1` | web-glycopharm/api/public.ts:85 `supplier: 'GlucoseView'` mock supplier 라벨 중립화 (W6 패턴) | 낮음, 별도 mock 트랙 |
| `WO-O4O-SCRIPTS-DEAD-GLUCOSEVIEW-TEST-CLEANUP-V1` | scripts/care-*.{mjs,py,sh} broken test scripts (이미 삭제된 `/glucoseview/customers` endpoint 호출) | 매우 낮음 |
| `WO-O4O-API-SERVER-AUTH-SERVICEMEMBERSHIP-DOCSTRING-CLEANUP-V1` | ServiceMembership.ts:46 entity docstring 의 'glucoseview' 제거 | 매우 낮음 (docstring) |
| `Future-α IR-O4O-CARE-CORE-REINTRODUCTION-ARCHITECTURE-V1` | 새 Care Core 설계 IR | 사업 결정 트리거 시 |

→ 모두 **OPTIONAL**. 본 PASS 판정에 영향 없음.

---

## 11. 완료 보고 (commit 미실행)

| 항목 | 값 |
|------|------|
| **판정** | ✅ **PASS** |
| **작성 문서** | `docs/investigations/CHECK-O4O-GLYCOPHARM-CARE-GLUCOSEVIEW-RESIDUE-CLEANUP-FINAL-PASS-V1.md` |
| **A1 제거 확인** | ✅ (register.dto.ts displayName 제거 + pharmacyName 유지/주석 정정 + docstring 4개 서비스 정정) |
| **A2 제거 확인** | ✅ (password.controller.ts ALLOWED_ORIGINS 의 glucoseview.co.kr 제거 + docstring 정정) |
| **GlucoseView active code 잔존** | **0건** ✅ |
| **Care active code 잔존** | **0건** ✅ (totalPatients line 262 는 W5a 보존 결정, dead-on-the-vine 별도 추적) |
| **TypeScript 결과** | api-server 0 errors ✅. 다른 서비스 변동 (32, 10) 은 다른 세션 sidebar 추출 WIP 영향, 본 CHECK 무관 |
| **Source file 수정** | 없음 ✅ |
| **다른 세션 WIP 미포함** | ✅ 10개 격리 |
| **Commit 여부** | **사용자 승인 대기** — 본 CHECK 문서 1개만 path-restricted commit 예정 |

---

> **상태**: Care + GlucoseView 삭제 잔재 정리 1차 **최종 완료 검증** 통과. 본 CHECK 문서 commit 은 사용자 승인 후 path-restricted single commit 으로 진행 예정. PASS 격상 — CONDITIONAL 사유 (A1+A2) 모두 해소.
