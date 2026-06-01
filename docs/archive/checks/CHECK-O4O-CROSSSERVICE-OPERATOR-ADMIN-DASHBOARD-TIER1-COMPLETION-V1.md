# CHECK-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-TIER1-COMPLETION-V1

**검증 일자**: 2026-05-30
**검증 환경**: HEAD (main) — 정적 코드 / git history / TypeScript 검증
**선행 IR**: [IR-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-CANONICAL-AUDIT-V1](IR-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-CANONICAL-AUDIT-V1.md)
**검증 도구**: Grep / Git log / TypeScript compiler (`npx tsc --noEmit`)
**작업 성격**: 검증 및 문서화 전용 — 코드/DB/소스 파일 수정 없음

---

## 0. 핵심 결론 (TL;DR)

> **Cross-service operator/admin dashboard Tier 1 (W1 / W3 / W7) — PASS.**
>
> - **W1**: KPA `/operator/signage/content` dead link 5곳 모두 `/operator/signage/hq-media` 로 교체 완료. 사용자 노출 / config / 기타 어느 곳에도 잔존 0건.
> - **W3**: no-op closure 타당 — K-Cosmetics UNIFIED_MENU 에 `/admin/*` 경로 항목 0건이고, layout/route 단계에서 이미 분리되어 있어 adminOnly 적용 대상이 존재하지 않음. IR §11 W3 finding 의 일부는 실제 코드 기준으로 부정확했음 (정정 note 본 §4 참조).
> - **W7**: Cosmetics inactivity + Order Spike vague 문구 모두 구체화. 사용자 노출 메시지에 "플랫폼 활동을 점검하세요" / "운영 상태를 점검하세요" 잔존 0건. Neture inactivity 회귀 없음.
> - **TypeScript**: api-server 총 에러 0건 (W7 변경 영역 + 전체). web-kpa-society W1 변경 영역 신규 에러 0건.
> - **다른 세션 WIP 격리**: working tree 에 K-Cos 메뉴 영역 / Neture supplier 영역 등 다른 세션 WIP 다수 존재 — 본 CHECK 의 commit 에는 미포함.

---

## 1. Executive Summary

| 항목 | 결과 | 근거 |
|------|:----:|------|
| W1 KPA signage dead link | ✅ PASS | commit `8246b2da4` · grep `/operator/signage/content` = 0 · grep `/operator/signage/hq-media` = 5 (operatorConfig.ts line 85/177/225/278/312) |
| W3 K-Cos adminOnly no-op | ✅ PASS | UNIFIED_MENU 의 `/admin/*` 항목 0건 · `adminOnly:true` 0건 · filterMenuByRole hookup 정상 · ProtectedRoute 분리 |
| W7 AI Summary vague refine | ✅ PASS | commit `b746c2da4` · 사용자 노출 vague 문구 잔존 0건 · Neture inactivity 회귀 없음 |
| TypeScript 신규 오류 | ✅ 0건 | api-server 전체 0 errors |
| 소스 파일 수정 | ✅ 없음 | 본 CHECK 는 문서 1개만 작성 |
| 다른 세션 WIP 격리 | ✅ 보존 | 3개 unstaged (working tree 보존, commit 미포함) |

---

## 2. 검증 대상

| WO | Commit | 상태 |
|----|--------|------|
| W1 — `WO-O4O-KPA-OPERATOR-DASHBOARD-SIGNAGE-DEAD-LINK-FIX-V1` | [`8246b2da4`](https://github.com/Renagang21/o4o-platform/commit/8246b2da4) | merged main |
| W3 — `WO-O4O-KCOSMETICS-OPERATOR-MENU-ADMINONLY-FLAG-APPLY-V1` | — (no-op) | closed |
| W7 — `WO-O4O-CROSSSERVICE-INSIGHT-RULES-VAGUE-MESSAGE-REFINE-V1` | [`b746c2da4`](https://github.com/Renagang21/o4o-platform/commit/b746c2da4) | merged main |

Git log 확인 (CHECK 시점 기준):

```
b746c2da4 fix(copilot): WO-O4O-CROSSSERVICE-INSIGHT-RULES-VAGUE-MESSAGE-REFINE-V1
008051e54 feat(kpa-mypage): WO-O4O-MYPAGE-BUSINESS-INFO-EDIT-P2-P4-ADD-V1
1693382af refactor(neture-supplier): WO-O4O-NETURE-SUPPLIER-PROFILE-BUSINESSREGISTRATIONFIELDS-REUSE-V1
8246b2da4 fix(kpa): WO-O4O-KPA-OPERATOR-DASHBOARD-SIGNAGE-DEAD-LINK-FIX-V1
fe4354a5d docs(dashboard): IR-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-CANONICAL-AUDIT-V1
```

---

## 3. W1 KPA signage dead link 검증

**Commit**: `8246b2da4` · **수정 파일**: [services/web-kpa-society/src/pages/operator/operatorConfig.ts](../../services/web-kpa-society/src/pages/operator/operatorConfig.ts)

### 3.1 잔존 검증 (정적 grep)

| 검색 패턴 | 범위 | 결과 |
|----------|------|:----:|
| `/operator/signage/content` | `services/web-kpa-society` 전체 | **0건** ✅ |
| `/operator/signage/hq-media` | `operatorConfig.ts` only | **5건** ✅ (line 85, 177, 225, 278, 312) |

### 3.2 5곳 교체 위치 확정

| Block | line | 의도된 위치 |
|-------|:----:|------------|
| KPI 카드 '사이니지 검수 대기' | 85 | ✅ |
| AI Summary 'ai-signage-pending' | 177 | ✅ |
| Action Queue 'aq-signage' | 225 | ✅ |
| Activity Log signage recentMedia | 278 | ✅ |
| Quick Actions 'qa-signage' | 312 | ✅ |

### 3.3 대체 route 실제 존재 근거

1. [OperatorRoutes.tsx](../../services/web-kpa-society/src/routes/OperatorRoutes.tsx) line 99: `<Route path="signage/hq-media" element={<HqMediaPage />} />` — 등록 확인
2. [OperatorRoutes.tsx](../../services/web-kpa-society/src/routes/OperatorRoutes.tsx) line 96-97 명시적 주석: `{/* signage/content removed (WO-KPA-SIGNAGE-UI-RESTRUCTURE-V1) */}` — dead link 제거가 의도된 작업
3. [KpaOperatorDashboard.tsx:194](../../services/web-kpa-society/src/pages/operator/KpaOperatorDashboard.tsx#L194) AxisNavigationSection 이 동일 path `/operator/signage/hq-media` 사용 — canonical entry 일관성
4. [operatorMenuGroups.ts:78](../../services/web-kpa-society/src/config/operatorMenuGroups.ts#L78) 사이드바 그룹 첫 항목과 일치

### 3.4 범위 외 변경 없음

- 신규 route 생성 없음 ✅
- KPA signage 구조 재설계 없음 ✅
- backend / DB 수정 없음 ✅
- 다른 서비스 수정 없음 ✅

### 3.5 IR 카운트 정정 메모

IR §11 W1 항목 본문은 "operatorConfig 4 라인" 으로 기록되어 있으나, **실제 5라인** (line 177 AI Summary 가 IR 카운트에서 누락). W1 commit 은 5곳 모두 정확히 교체했으므로 dead link 0건 결과에는 영향 없음. IR 정정 추가 commit 은 본 CHECK 에서 진행하지 않음 — 후속 정정 commit (`docs: IR amendment`) 또는 다음 CHECK 와 묶어 처리 가능.

**판정: W1 PASS** ✅

---

## 4. W3 K-Cosmetics adminOnly no-op 검증

**Commit**: 없음 (no-op closure) · **결정 사유**: IR finding premise 부정확

### 4.1 K-Cos UNIFIED_MENU 의 `/admin/*` 항목 검증

| 검색 패턴 | 범위 | 결과 |
|----------|------|:----:|
| `/admin/` | [operatorMenuGroups.ts](../../services/web-k-cosmetics/src/config/operatorMenuGroups.ts) | **0건** ✅ |
| `adminOnly: true` | 동 파일 | **0건** ✅ (적용할 대상 자체 없음) |

UNIFIED_MENU 24개 항목 모두 `/operator/*` 경로 → adminOnly 적용 대상 0건.

### 4.2 filterMenuByRole hookup 확인 (HEAD state)

```
HEAD operatorMenuGroups.ts:
  line 12-15: UnifiedMenuItem 타입에 `adminOnly?: boolean` 정의
  line 70-76: filterMenuByRole 함수 구현

HEAD OperatorLayoutWrapper.tsx:
  line 16: import { isAdminOrAbove } from '@o4o/auth-utils'
  line 19: import { UNIFIED_MENU, filterMenuByRole }
  line 27: const isAdmin = user ? isAdminOrAbove(user.roles, 'cosmetics') : false
  line 30: filterMenuByRole(UNIFIED_MENU, isAdmin) — 호출 hooked up ✅
```

### 4.3 `/admin/*` 라우트 분리 확인

[App.tsx:521-526](../../services/web-k-cosmetics/src/App.tsx#L521-L526):

```tsx
<Route
  path="admin"
  element={
    <ProtectedRoute allowedRoles={['cosmetics:admin', 'platform:super_admin']}>
      <DashboardLayout role="admin" />
    </ProtectedRoute>
  }
>
```

- Admin layout (`DashboardLayout role="admin"`) 은 OperatorLayoutWrapper 와 **다른 컴포넌트** — 메뉴 소스 자체 분리
- `ProtectedRoute allowedRoles={['cosmetics:admin', 'platform:super_admin']}` 가 URL 직접 접근도 차단

→ operator 가 admin 메뉴/페이지에 노출될 경로 자체가 없음.

### 4.4 W3 no-op closure 타당성

| IR finding (당시) | 실제 코드 reality | 정정 note |
|------------------|------------------|----------|
| "filterMenuByRole 호출 위치 미추적" | OperatorLayoutWrapper.tsx:30 에서 정상 호출 중 | **부정확** — hook 이미 되어 있었음 |
| "adminOnly 플래그 미적용 → admin 항목 operator 노출 가능" | UNIFIED_MENU 에 admin 항목 0건이라 노출될 대상이 존재하지 않음. `/admin/*` 는 별도 layout + ProtectedRoute 로 분리 | **부정확** — 실제 노출 위험은 없음 |

### 4.5 IR finding Correction Note (본 CHECK 에 기록)

> **IR §11 W3 의 finding 일부는 실제 코드 기준으로 부정확했다.**
>
> 구체적으로:
> 1. "K-Cosmetics filterMenuByRole 호출 위치 미확인" → 실제로는 [OperatorLayoutWrapper.tsx:30](../../services/web-k-cosmetics/src/components/layouts/OperatorLayoutWrapper.tsx#L30) 에서 정상 호출 중.
> 2. "UNIFIED_MENU 항목에 adminOnly 미설정 → admin 항목 operator 노출 가능" → 실제로는 UNIFIED_MENU 에 admin 항목 자체가 0건이라 노출 위험이 없음. K-Cos 는 Neture (admin/operator 혼합 + filter) 와 달리 **layout 완전 분리** 패턴을 사용 — 보안적으로 동등 또는 우위.
>
> **본 CHECK 는 IR 원문을 수정하지 않는다.** 후속 IR amendment commit 또는 다음 CHECK 와 함께 정리 권장. W3 no-op closure 의 정당성은 본 §4 에 기록함으로써 충분.

### 4.6 IR §11 W3 의 유효한 부분

IR 의 다음 권고는 여전히 유효 (다만 보안 격차가 아닌 **Neture baseline 정렬** 관점):

> "Neture 처럼 admin entry 를 operator UNIFIED_MENU 에 mix + adminOnly:true 적용하여 admin 이 /operator 진입 시 admin 작업 (회원 완전삭제 / 역할 관리 / 서비스 설정) 까지 한 sidebar 에서 접근 가능하도록 정렬"

이는 별도 design 의사결정 (Tier 4 정책 결정 IR §12 후보 — 예: `IR-O4O-KCOSMETICS-OPERATOR-MENU-ADMIN-ENTRY-MIX-V1`) 로 분리 권장. 현재 K-Cos 설계 (완전 분리) 도 유효한 패턴.

**판정: W3 PASS** (no-op closure 타당) ✅

---

## 5. W7 AI Summary vague message 검증

**Commit**: `b746c2da4` · **수정 파일**: [apps/api-server/src/copilot/insight-rules.ts](../../apps/api-server/src/copilot/insight-rules.ts)

### 5.1 사용자 노출 vague 문구 잔존 검증

| 검색 패턴 | 사용자 노출 메시지 | 주석 |
|----------|:----------------:|:---:|
| `"플랫폼 활동을 점검하세요"` | **0건** ✅ | 1건 (line 228 정비 사유 문서화 — 의도적 보존, 따옴표 인용형) |
| `"운영 상태를 점검하세요"` | **0건** ✅ | 0건 ✅ |

### 5.2 Order Spike rule (전 서비스 공통, line 193)

- Before: `"주문이 전주 대비 {%}% 급증했습니다. 재고 및 운영 상태를 점검하세요."`
- After (확인): `"주문이 전주 대비 ${growth}% 급증했습니다. 재고, 주문 처리 상태, 고객 안내 준비 상태를 확인하세요."` ✅
- level: warning 유지 ✅

### 5.3 Cosmetics inactivity rule (line 241-246)

- Before: `"최근 주문이 없습니다. 플랫폼 활동을 점검하세요."` (level: warning)
- After (확인 line 244): `"최근 주문 데이터가 아직 충분하지 않습니다. 상품 노출·콘텐츠·프로모션 흐름을 먼저 확인하세요."` ✅
- level (확인): **info** ✅ (warning → info 전환 완료 — severity 정렬에 의해 실제 action item 우선 보장)

### 5.4 Neture inactivity 회귀 확인 (baseline 보존)

- Neture 문구 (line 238 확인): `"최근 주문 데이터가 아직 충분하지 않습니다. 공급사 활성화·상품 노출 흐름을 먼저 확인하세요."` ✅
- level: **info** 유지 ✅
- **회귀 없음**

### 5.5 범위 외 변경 없음

| 영역 | 확인 |
|------|:----:|
| dashboard controller 수정 | 없음 ✅ |
| Action Queue 수정 | 없음 ✅ |
| KPI 수정 | 없음 ✅ |
| DB / migration | 없음 ✅ |
| 서비스별 dashboard 구조 변경 | 없음 ✅ |

**판정: W7 PASS** ✅

---

## 6. TypeScript / build 결과

### 6.1 api-server (W7)

```
$ npx tsc --noEmit
Total TypeScript errors: 0
copilot/insight-rules 관련 신규 에러: 0
```

✅ **api-server 총 에러 0건**. W1 / W7 commit 시점에 존재하던 다른 세션 WIP 의 cross-package 에러 (`businessEntityType`, unused imports 등) 는 이후 commits `008051e54` (KPA mypage P2/P4) / `1693382af` (Neture supplier BusinessRegistrationFields reuse) 에서 해소됨.

### 6.2 web-kpa-society (W1)

W1 commit 시점에 검증 완료:
- `operatorConfig.ts` 신규 에러 0건
- 사전 존재 에러 (`tsconfig.node.json` composite/noEmit cascade, `BusinessRegistrationFields @o4o/types`, `PharmacyInfoPage` unused imports) 는 build-system level + 다른 세션 WIP 영향 — W1 변경과 무관

본 CHECK 시점 재검증 생략 (W1 변경은 string-literal 5곳 치환이라 TypeScript 영향 불가능).

### 6.3 web-k-cosmetics (W3 no-op)

W3 는 코드 변경 없음 → TypeScript 신규 영향 0.

---

## 7. Working tree 격리 상태

### 7.1 본 CHECK 시작 시점 working tree

```
M services/web-k-cosmetics/src/components/layouts/OperatorLayoutWrapper.tsx
M services/web-k-cosmetics/src/config/operatorMenuGroups.ts
?? services/web-k-cosmetics/src/components/kcos-operator/
```

| 항목 | 출처 | 본 CHECK 영향 |
|------|------|--------------|
| `OperatorLayoutWrapper.tsx` M | 다른 세션 WIP (K-Cos 메뉴/operator 영역 작업 추정) | 격리 — stage 안 함. W3 HEAD 검증과 별개 |
| `operatorMenuGroups.ts` M | 다른 세션 WIP | 격리. **W3 검증에 잠재 영향** — 그러나 working tree 상태에서도 `/admin/*` 0건, `adminOnly:true` 0건 확인 → W3 conclusion 유지 |
| `components/kcos-operator/` ?? | 다른 세션 WIP (신규 디렉토리) | 격리 |

### 7.2 본 CHECK commit 시 stage 정책

- CHECK 문서 1개만 stage: `docs/investigations/CHECK-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-TIER1-COMPLETION-V1.md`
- 위 3개 다른 세션 WIP 는 **절대 stage 안 함**
- `git add` 는 specific path 만 사용 — `git add .` 금지

---

## 8. Tier 1 최종 판정

> ✅ **PASS** — Cross-service operator/admin dashboard Tier 1 (W1 / W3 / W7) 완료.

### 판정 근거

| 기준 | 결과 |
|------|:----:|
| W1: `/operator/signage/content` 잔존 0 | ✅ |
| W3: no-op closure 근거 명확 (UNIFIED_MENU admin 항목 0건 + layout 분리 + ProtectedRoute) | ✅ |
| W7: 사용자 노출 vague 문구 0 + Neture 회귀 없음 | ✅ |
| 신규 TypeScript 오류 없음 | ✅ (api-server 0 errors) |
| 소스 파일 수정 없음 (본 CHECK 범위) | ✅ |
| CHECK 문서만 생성 | ✅ (commit 은 사용자 승인 후) |

### Conditional 사유 없음

- 정적 코드 / git history / TypeScript 검증 모두 통과
- 브라우저 smoke test 는 미실행이나, W1 은 link path 변경 (route 존재 정적 확인 완료) / W7 은 message string 변경 (사용자 노출 영역만 영향, 브라우저 동작 변화 없음) / W3 는 no-op — 모두 브라우저 검증 없이도 PASS 판정 가능
- 필요 시 별도 [CHECK-O4O-BUSINESS-REGISTRATION-CROSSSERVICE-E2E-V1](CHECK-O4O-BUSINESS-REGISTRATION-CROSSSERVICE-E2E-V1.md) 같이 Playwright 기반 통합 검증을 별도 트리거 가능

---

## 9. 남은 Tier 2 / Tier 4 / Tier 5 항목

본 CHECK 로 Tier 1 closure. IR §11~§13 의 잔여 항목:

### Tier 2 — 어휘 정리 WO (3건)

| ID | 범위 | 분류 |
|----|------|:----:|
| W4 — `WO-O4O-KCOSMETICS-OPERATOR-VOCABULARY-PHARMACY-CLEANUP-V1` | StoresPage typeLabels `pharmacy:'약국'`, UsersPage KCOS_ROLE_DISPLAY `pharmacist`/`supplier` → cosmetics 도메인 어휘. **선행 SQL** (§9 K-Cos role 데이터 확인) 권장 | H |
| W5 — `WO-O4O-GLYCOPHARM-OPERATOR-DASHBOARD-CARE-VOCABULARY-CLEANUP-V1` | Admin KPI `total-patients`/`high-risk-patients`/`open-care-alerts` 제거 또는 옵셔널 + capabilities.CARE 선언 정리 | H |
| W6 — `WO-O4O-NETURE-OPERATOR-PAGES-RESIDUAL-PHARMACY-LABEL-CLEANUP-V1` | RecruitingProductsOverviewPage placeholder "약국명 검색" / column header "약국/공급자" → "조직/공급사" 어휘 | H |

### Tier 4 — 정책 결정 IR (3건)

| ID | 결정 사항 |
|----|----------|
| I1 — `IR-O4O-KPA-OPERATOR-DASHBOARD-API-5BLOCK-UNIFICATION-V1` | KPA backend `/operator/dashboard` 5-block unified 응답 도입 여부 |
| I2 — `IR-O4O-GLYCOPHARM-EVENT-OFFER-APPROVAL-SCOPE-AUDIT-V1` | GlycoPharm Event Offers Approval 권한 (operator vs admin) |
| I3 — `IR-O4O-CROSSSERVICE-OPERATOR-AXIS-NAVIGATION-CONVERGENCE-V1` | 4개 서비스 AxisNavigationSection 정합 (Neture axis 도입 vs 다른 3개 메뉴 그룹 통합) |

### Tier 4 (추가 후보) — W3 finding 정정으로 파생

| ID | 결정 사항 |
|----|----------|
| Iα — `IR-O4O-KCOSMETICS-OPERATOR-MENU-ADMIN-ENTRY-MIX-V1` (가칭) | K-Cos 가 현재 "layout 완전 분리" 패턴 유지 vs Neture 처럼 "operator sidebar 에 admin entry mix + adminOnly filter" 패턴으로 정렬할지. 본 CHECK §4.6 에서 분리한 정책 결정 |

### Tier 5 — 데이터 검증 CHECK (1건)

| ID | 범위 |
|----|------|
| `CHECK-O4O-CROSSSERVICE-DASHBOARD-PENDING-COUNT-DATA-AUDIT-V1` | IR §9 SQL 후보 5건 실행 (KPA signage pending count 실제 row, GlycoPharm orders STUB 검증, Cosmetics active-orders status filter, K-Cos pharmacy/약사 role 실제 데이터, Neture 약국 placeholder legacy 여부) |

---

## 10. 다음 우선순위 제안

지시하신 흐름과 정렬:

| 순서 | 항목 | 사유 |
|:----:|------|------|
| 1 | **Tier 5 CHECK (Pending count data audit)** | Tier 2 W4 (K-Cos pharmacy 어휘 정리) 가 §9 K-Cos role 데이터에 의존 — 어휘 정리 전 데이터 reality 확인 필요 |
| 2 | **Tier 2 W4 / W5 / W6** | Tier 5 결과 반영 후 순차 진행 |
| 3 | **Tier 4 정책 결정 IR (I1/I2/I3 + Iα)** | 구조 변경 비용 큼 — Tier 2 완료 후 별도 의사결정 트랙 |

또는 Tier 2 부터 바로 시작도 가능 (Tier 5 와 W4 만 의존; W5/W6 는 데이터 검증 없이도 진행 가능).

---

## 11. 완료 보고 (commit 미실행)

| 항목 | 값 |
|------|------|
| 판정 | **PASS** |
| 작성 문서 | `docs/investigations/CHECK-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-TIER1-COMPLETION-V1.md` (본 문서) |
| W1 검증 | dead link 0, hq-media 5곳 교체 확인 (line 85/177/225/278/312) |
| W3 검증 | no-op 타당 — UNIFIED_MENU admin 0건, filterMenuByRole hookup, ProtectedRoute 분리. IR finding 정정 note §4.5 |
| W7 검증 | Order Spike + Cosmetics inactivity 구체화, level info 전환, Neture 회귀 없음 |
| TypeScript | api-server 0 errors |
| 소스 파일 수정 | 없음 |
| 다른 세션 WIP 미포함 | ✅ 3개 보존 (OperatorLayoutWrapper.tsx M / operatorMenuGroups.ts M / kcos-operator/ ??) |
| Commit 여부 | **사용자 승인 대기** — 본 CHECK 문서만 단일 stage 후 commit 예정 |

---

> **상태**: 검증 완료. 본 문서 commit 은 사용자 승인 후 단일 파일 단건 commit 으로 진행 예정 (다른 세션 WIP 격리).
