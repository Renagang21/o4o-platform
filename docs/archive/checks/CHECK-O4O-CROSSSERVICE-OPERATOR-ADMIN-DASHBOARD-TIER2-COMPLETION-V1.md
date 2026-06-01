# CHECK-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-TIER2-COMPLETION-V1

**검증 일자**: 2026-05-31
**검증 환경**: HEAD (main) `8ccb79f55` 시점 정적 코드 / git history / TypeScript 검증
**검증 도구**: Grep / Git log / TypeScript compiler
**작업 성격**: 검증 및 문서화 전용 — 코드/DB/source 수정 없음
**선행 CHECK**: [CHECK-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-TIER1-COMPLETION-V1](CHECK-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-TIER1-COMPLETION-V1.md), [CHECK-O4O-GLYCOPHARM-CARE-GLUCOSEVIEW-RESIDUE-CLEANUP-FINAL-PASS-V1](CHECK-O4O-GLYCOPHARM-CARE-GLUCOSEVIEW-RESIDUE-CLEANUP-FINAL-PASS-V1.md), [CHECK-O4O-KCOSMETICS-OPERATOR-VOCABULARY-RECHECK-V1](CHECK-O4O-KCOSMETICS-OPERATOR-VOCABULARY-RECHECK-V1.md)

---

## 0. 핵심 결론 (TL;DR)

> ✅ **PASS** — Cross-service operator/admin dashboard 정비 Tier 2 (W4 / W5 / W6) 모두 완료.
>
> 1. **W4 K-Cosmetics 어휘 정리** — pharmacy/약사/(K-Cos 회원분류)공급자 active code 잔존 0건. Neture 공급자 / 상품 공급자 / Event Offer 공급자 사업 개념은 모두 보존.
> 2. **W5 Care + GlucoseView 정리** — Care active code 0건 / GlucoseView active code 0건. 1차 최종 완료 (`9e9bd7ac9` Final PASS).
> 3. **W6 Neture pharmacy placeholder 정리** — operator/ 부적절한 placeholder 0건 (RecruitingProducts + StoreManagement).
> 4. **TypeScript 신규 에러 0건** — 5개 서비스 + api-server 검증 통과 (web-glycopharm 22 는 pre-existing, lms.ts + Dashboard unused, 본 Tier 2 작업 전체와 무관).
> 5. **Source file 수정 0건** — 본 CHECK 는 검증 + 문서화만.

---

## 1. Executive Summary

| 영역 | 상태 | 핵심 commit |
|------|:----:|------------|
| W4 K-Cos 어휘 정리 | ✅ | `6beabab22` (recheck `984140f55`) |
| W5 Care + GlucoseView 1차 최종 | ✅ | `9e9bd7ac9` Final PASS chain |
| W6 Neture pharmacy placeholder | ✅ | `fe0a71fb5` |
| TypeScript 신규 에러 | **0** | 5 서비스 + api-server |
| Source 수정 (본 CHECK) | **없음** | ✅ |

### Tier 2 전체 판정: ✅ **PASS**

---

## 2. 검증 대상 commit 목록

### W4 — K-Cosmetics operator vocabulary cleanup

```
6beabab22 refactor(k-cosmetics): WO-O4O-KCOSMETICS-OPERATOR-VOCABULARY-PHARMACY-CLEANUP-V2
984140f55 docs(kcosmetics): CHECK-O4O-KCOSMETICS-OPERATOR-VOCABULARY-RECHECK-V1
```

### W5 — GlycoPharm Care + GlucoseView residue cleanup (chain)

```
9e9bd7ac9 docs(glycopharm): CHECK-...-FINAL-PASS-V1                         ← 최종 PASS
b18858252 refactor(api-server): W-Patch auth GlucoseView cleanup
ee221f185 docs(glycopharm): CHECK-...-COMPLETION-V1 (CONDITIONAL PASS)
3abfdfe7b refactor(operator): I-β GlucoseView shared residue cleanup
14240d0ad refactor(operator): W5c-v2 shared CARE type contract removal
c94ed8e49 refactor(glycopharm): W5d-Frontend type/intro/guard cleanup
1c65e0ad0 refactor(glycopharm): W5b backend Care alert metrics cleanup
d3b56d525 docs(glycopharm): I-α Care 재도입 정책 IR (옵션 A)
741e59b4e refactor(glycopharm): W5a Admin KPI whitelist cleanup
```

### W6 — Neture pharmacy placeholder cleanup

```
fe0a71fb5 refactor(neture): WO-O4O-NETURE-OPERATOR-PAGES-RESIDUAL-PHARMACY-LABEL-CLEANUP-V1
```

전 11 commit 모두 origin/main push 완료, history 검증.

---

## 3. W4 K-Cosmetics vocabulary cleanup 검증

### 3.1 제거 확인 (사용자 노출 잔재)

| 파일 | line | 항목 | 상태 |
|------|-----:|------|:----:|
| `pages/operator/StoresPage.tsx` | 54 | typeLabels `pharmacy: '약국'` | ✅ 제거 (주석 trace 만 line 54) |
| `pages/operator/StoreDetailPage.tsx` | 183 | inline typeLabel `pharmacy: '약국'` | ✅ 제거 (주석 trace 만 line 184) |
| `pages/operator/UsersPage.tsx` | 71 | KCOS_ROLE_DISPLAY `pharmacist: '약사'` | ✅ 제거 |
| `pages/operator/UsersPage.tsx` | 72 | KCOS_ROLE_DISPLAY `supplier: '공급자'` (K-Cos 회원 분류) | ✅ 제거 |
| `pages/operator/EditUserModal.tsx` | 10 | docstring "pharmacist / supplier" | ✅ 정정 ("seller / consumer / partner") |
| `pages/operator/EditUserModal.tsx` | 36 | membershipRoleOptions `{ value: 'pharmacist', label: '약사' }` | ✅ 제거 |
| `pages/operator/EditUserModal.tsx` | 37 | membershipRoleOptions `{ value: 'supplier', label: '공급자' }` (K-Cos 회원 분류) | ✅ 제거 |

### 3.2 grep 잔존 검색 (코드)

```
패턴: pharmacy: '약국' / pharmacist: '약사' / supplier: '공급자'
결과 (operator/ 영역): 2건 — 모두 정리 사유 주석 (F 보존)
  - StoreDetailPage.tsx:184  // 주석
  - StoresPage.tsx:54        // 주석
→ active code 잔존 0건 ✅
```

### 3.3 사업 개념 "공급자" 유지 확인

| 파일 | 항목 | 컨텍스트 | 유지 |
|------|------|---------|:----:|
| `EventOfferApprovalsPage.tsx` (line 6/150/154/190/207/212/247) | "공급자", `supplierName`, "공급자가 제안한", "공급사" label | Neture 공급자 cross-service OPL 제안 | ✅ |
| `ProductDetailPage.tsx` (line 46-47/75/86-100/241-266) | `supplierId/Name`, "공급자 오퍼", "공급자" column header, "연결된 공급자가 없습니다" | 상품 공급자 business model | ✅ |
| `ProductsPage.tsx` (line 29/185-186/253) | `supplierCount`, "공급자" column, "공급자 연결" label | 상품 공급자 column | ✅ |
| `supplierId / supplierName / supplierCount` 상품 공급 관계 필드 전체 | (광역) | 도메인 정상 표기 | ✅ |

→ **사업 개념 "공급자" 전부 보존** ✅. K-Cos 자체 회원 분류로서의 supplier 만 정확히 제거.

### 3.4 operatorMenuGroups.ts

잔재 **0건** ✅ (메뉴 구조에는 약국/약사/공급자 없음).

### 3.5 판정

✅ **W4 PASS**

---

## 4. W5 GlycoPharm Care + GlucoseView cleanup 검증

### 4.1 Care active code 잔존 검색

| 검색어 | 영역 | active code 잔존 |
|-------|------|:----------------:|
| `OperatorCapability.CARE` | apps + packages + services | **0** ✅ |
| `OperatorGroupKey 'care'` / `key: 'care'` (STANDARD_GROUPS) | packages/ui | **0** ✅ |
| `GROUP_TO_DOMAIN.care` | 3 서비스 web | **0** ✅ |
| `openCareAlerts / careAdoptionRate / highRiskPatients / weeklyCareActivity` | apps/api-server | **0** ✅ |
| `CARE_ALERTS / CARE_ADOPTION / HIGH_RISK / WEEKLY_CARE` THRESHOLDS | apps/api-server | **0** ✅ |
| `AlertItem.type='care'` | services/web-glycopharm | **0** ✅ |
| `FeatureIntro care config` | services/web-glycopharm | **0** ✅ |
| `ADMIN_KPI_KEYS` 의 `'total-patients'`/`'high-risk-patients'`/`'open-care-alerts'` | services/web-glycopharm/admin | **0** ✅ |
| `'care-alerts'` (active aiRuleGenerator check) | apps/api-server | **0** ✅ |

### 4.2 GlucoseView active code 잔존 검색

| 검색어 | 영역 | active code 잔존 |
|-------|------|:----------------:|
| `glucoseview:admin/operator` MemberBadges | packages/operator-ux-core | **0** ✅ |
| `SERVICE_OPTIONS` 의 `'glucoseview'` | packages/ui | **0** ✅ |
| `SERVICE_LABELS` 의 `glucoseview` | packages (ui/operator-ux-core) | **0** ✅ |
| `'glucoseview'` service key union | packages/platform-core (slug/policy/payment-config) | **0** ✅ |
| `/admin/glucoseview` alias | apps/admin-dashboard | **0** ✅ |
| `register.dto.ts` GlucoseView 전용 displayName 필드 | apps/api-server | **0** ✅ |
| `password.controller.ts` `'https://glucoseview.co.kr'` ALLOWED_ORIGINS | apps/api-server | **0** ✅ |
| 사용자 노출 GlucoseView 표시 (UI badge/option/label/service key) | apps + packages + services | **0** ✅ |

### 4.3 W5 잔존 항목 분류 (모두 F 보존)

| 위치 | 분류 |
|------|:----:|
| `docs/investigations/IR-*.md`, `CHECK-*.md` 다수 | F (정책/감사 문서) |
| `services/web-glycopharm/src/pages/admin/GlycoPharmAdminDashboard.tsx:54-56,262` | F (W5a 정리 trace + line 262 totalPatients **W5a 명시 보존 결정 dead-on-the-vine** — §10 후속 추적) |
| `services/web-glycopharm/src/config/operatorCapabilities.ts:19` | F (W5d trace) |
| `packages/ui/src/operator-shell/constants.ts:9` | F (W5c-v2 trace, HeartPulse import 제거) |
| `apps/api-server/src/utils/operator-alert.utils.ts:21,48` `pendingApprovals?` | F (W5b 의도적 보존 주석) |
| `apps/api-server/src/modules/auth/dto/register.dto.ts:7,252` 정리 사유 주석 | F |
| `apps/api-server/src/modules/auth/controllers/password.controller.ts:26` 정리 사유 주석 | F |
| `apps/api-server/src/modules/auth/entities/ServiceMembership.ts:46` entity docstring | F (선행 CHECK 보존) |
| `apps/api-server/__tests__/security/*.spec.ts` glucoseview role | F (cross-service 차단 검증 fixture) |
| `services/web-glycopharm/src/api/public.ts:85` `supplier: 'GlucoseView'` | F (mock supplier 별도 트랙) |
| `scripts/care-*.{mjs,py,sh}` | F (broken test, dead endpoint) |
| migration 파일 다수 (1737100*, 1771200000016, 1739700000000, 20260205070000, 20260600000000 등) | F (이미 실행된 변경 이력) |

### 4.4 판정

✅ **W5 PASS** (선행 Final PASS CHECK `9e9bd7ac9` 재확인 — Care + GlucoseView active 모두 0건)

---

## 5. W6 Neture pharmacy placeholder cleanup 검증

### 5.1 제거 확인

| 파일 | line | 항목 | 상태 |
|------|-----:|------|:----:|
| `pages/operator/RecruitingProductsOverviewPage.tsx` | 165 | `placeholder="상품명 / 약국명 검색"` → "상품명 / 조직명 검색" | ✅ |
| `pages/operator/RecruitingProductsOverviewPage.tsx` | 186 | `<th>약국/공급자</th>` → "조직/공급사" | ✅ |
| `pages/operator/RecruitingProductsOverviewPage.tsx` | 321 | `<p>약국/공급자</p>` → "조직/공급사" | ✅ |
| `pages/operator/StoreManagementPage.tsx` | 53-57 | typeLabels `pharmacy: '약국'` 키 | ✅ 제거 (store/branch 유지) |

### 5.2 grep 잔존 검색 (operator/)

```
패턴: 약국명 검색 / 약국/공급자 / pharmacy: '약국'
결과: No matches found
→ active code 잔존 0건 ✅
```

### 5.3 Neture 정상 business content 유지 확인

다음 위치는 Neture 사업의 핵심 타겟 (약국 채널 대상 사업자 안내) — **legitimate, 유지**:

- `PharmacyTargetPage.tsx` — 약국 네트워크 대상 사업자 안내 페이지 (Neture business product)
- `O4OMainPage.tsx` — '약국, 안경원, 전문 매장 등' 사업 대상 표현
- `SellerOverviewByIndustry.tsx` — 약국 industry overview
- `ApplyForm.tsx` — pharmacy industry option
- `PlatformPrinciplesPage.tsx` — Neture 가 약국 자격을 검증하지 않는 이유 등 정책 안내
- `ContentUtilizationGuide.tsx` 등 광역 사이트 콘텐츠

→ **Neture 사업 본질 약국 채널 안내**는 보존 ✅. operator/ 영역의 부적절한 placeholder 만 정리.

### 5.4 분류 잔존 (F 보존)

- `types/procurement.ts:97` `pharmacy: '약국'` — BuyerType (`general/pharmacy/medical`) 의 약국 구매자 분류, **정책상 필요** (F)
- `pages/operator/NetureOperatorDashboard.tsx:11` — 정리 이력 주석 (F)

### 5.5 판정

✅ **W6 PASS**

---

## 6. 잔존 검색 결과와 분류

### 6.1 종합 분류표

| 분류 | 의미 | 본 Tier 2 잔존 |
|------|------|:-------------:|
| **Active code 잔재** | 사용자 노출 / 제거 대상 | **0건** ✅ |
| **사용자 노출 문구 잔재** | 사용자 노출 / 제거 대상 | **0건** ✅ |
| **정상 business context** | 사업 개념 / 유지 | 다수 (Neture 공급자, 상품 공급자, 약국 채널 안내 등) |
| **문서/주석/정리 이력** | docs / WO trace | 다수 (F 보존, 감사 증거) |
| **migration / test fixture** | 이력 / 차단 검증 | 다수 (F 보존) |
| **mock / optional follow-up** | 별도 트랙 | 4건 (Final PASS CHECK §10) |

### 6.2 OPTIONAL 후속 (Tier 2 PASS 에 영향 없음)

| ID (가칭) | 우선순위 |
|-----------|:--------:|
| `WO-O4O-GLYCOPHARM-ADMIN-DASHBOARD-TOTAL-PATIENTS-VAR-CLEANUP-V1` — `GlycoPharmAdminDashboard.tsx:262` totalPatients dead-on-the-vine 변수 + line 265 networkStats '회원 수' 항목 (W5a 보존 결정 재확정 시) | 낮음 |
| `WO-O4O-GLYCOPHARM-PUBLIC-API-GLUCOSEVIEW-MOCK-CLEANUP-V1` — `web-glycopharm/api/public.ts:85` mock `supplier: 'GlucoseView'` 라벨 중립화 | 낮음 |
| `WO-O4O-SCRIPTS-DEAD-GLUCOSEVIEW-TEST-CLEANUP-V1` — `scripts/care-*.{mjs,py,sh}` broken test scripts | 매우 낮음 |
| `WO-O4O-API-SERVER-AUTH-SERVICEMEMBERSHIP-DOCSTRING-CLEANUP-V1` — ServiceMembership.ts:46 entity docstring 의 'glucoseview' 예시 제거 | 매우 낮음 |

---

## 7. TypeScript / build 결과

순차 typecheck. 본 CHECK source 변경 0건 — 모든 결과는 main HEAD `8ccb79f55` 시점 ground truth.

| 영역 | TS errors | 분석 |
|------|----------:|------|
| api-server | **0** ✅ | W5 backend Care alert + GlucoseView auth cleanup 모두 정합 |
| web-k-cosmetics | **0** ✅ | W4-v2 변경 신규 에러 0 |
| web-kpa-society | **0** ✅ | W5c-v2 shared CARE type contract 정리 후 정합 |
| web-neture | **0** ✅ | W6 placeholder + GlucoseView shared 정리 후 정합 |
| web-glycopharm | 22 (pre-existing) | lms.ts 4 + DashboardLayout/InstructorDashboardPage unused 등 — 본 Tier 2 작업 전체와 무관. Tier 1 시점 (`b904ef30c`) 부터 동일 수치 |

**본 Tier 2 작업 신규 에러 0건** ✅

### 7.1 web-glycopharm pre-existing 22 errors 의 출처

이전 CHECK (`b904ef30c`, `89a285593`, `b746c2da4`, `ee221f185`, `9e9bd7ac9`) 시점 모두 동일 수치. 본 Tier 2 의 W4-v2 / W5 chain / W6 어느 작업과도 무관한 별도 영역 (lms.ts 의 LMS api 반환 type mismatch, DashboardLayout 의 unused 'user' 변수, InstructorDashboardPage 의 CSS property 정합 문제). **별도 cleanup 트랙**.

---

## 8. Working tree 격리 상태

### 8.1 CHECK 시작 시점

```
(nothing to commit, working tree clean)
```

→ 다른 세션 WIP 0건 (이전 단계의 operator-ux-core sidebar 공통화 + safe-fallback WO 모두 commit 완료: `8ccb79f55`).

### 8.2 commit 정책

- 본 CHECK 문서 1개만 path-restricted commit (`git commit -- <path>`)
- `git add .` 금지
- 다른 세션 WIP 발생 시 격리 보존

---

## 9. 최종 판정

### 판정: ✅ **PASS**

| 기준 | 결과 |
|------|:----:|
| W4 K-Cos 사용자 노출 잔재 제거 | ✅ |
| W4 사업 개념으로서의 공급자 표현 유지 | ✅ |
| W5 Care + GlucoseView active code 잔재 제거 | ✅ |
| W6 Neture 부적절한 약국 placeholder 제거 | ✅ |
| 남은 항목이 정상 business / 문서/주석/migration/test fixture | ✅ |
| 신규 TypeScript 오류 없음 | ✅ (5 영역 모두 신규 0) |
| Source file 수정 없음 | ✅ |
| CHECK 문서만 생성 | ✅ |

### Cross-service dashboard 전체 진행 흐름 (Tier 1 + Tier 2 종결)

| 단계 | Commit |
|------|--------|
| 상위 IR audit | `fe4354a5d` |
| **Tier 1**: W1 KPA signage dead link | `8246b2da4` |
| **Tier 1**: W3 K-Cos adminOnly (no-op) | — |
| **Tier 1**: W7 AI Summary vague refine | `b746c2da4` |
| **Tier 1 완료 CHECK** | `b904ef30c` |
| **Tier 5**: 데이터 검증 CHECK | `89a285593` |
| **Tier 2**: W6 Neture pharmacy placeholder | `fe0a71fb5` |
| **Tier 2**: W5 chain (W5a/I-α/W5b/W5d/W5c-v2/I-β/CHECK/W-Patch/Final PASS) | `741e59b4e` ~ `9e9bd7ac9` |
| **Tier 2**: W4 K-Cos 어휘 (보류 → recheck → v2) | `984140f55`, `6beabab22` |
| **Tier 2 완료 CHECK** | (이 commit) |

---

## 10. 남은 optional 후보

본 Tier 2 PASS 에 영향 없는 별도 트랙 (필요 시 진행):

1. **OPTIONAL — Care/GlucoseView 잔존 정리** (Final PASS CHECK §10):
   - `WO-O4O-GLYCOPHARM-ADMIN-DASHBOARD-TOTAL-PATIENTS-VAR-CLEANUP-V1`
   - `WO-O4O-GLYCOPHARM-PUBLIC-API-GLUCOSEVIEW-MOCK-CLEANUP-V1`
   - `WO-O4O-SCRIPTS-DEAD-GLUCOSEVIEW-TEST-CLEANUP-V1`
   - `WO-O4O-API-SERVER-AUTH-SERVICEMEMBERSHIP-DOCSTRING-CLEANUP-V1`

2. **OPTIONAL — web-glycopharm pre-existing 22 errors 별도 cleanup** (본 Tier 2 작업 무관, 별도 트랙):
   - lms.ts type mismatch (4건)
   - DashboardLayout / InstructorDashboardPage unused 등

3. **별도 IR 트랙 (Tier 4)** (선행 IR §12):
   - `IR-O4O-KPA-OPERATOR-DASHBOARD-API-5BLOCK-UNIFICATION-V1`
   - `IR-O4O-GLYCOPHARM-EVENT-OFFER-APPROVAL-SCOPE-AUDIT-V1`
   - `IR-O4O-CROSSSERVICE-OPERATOR-AXIS-NAVIGATION-CONVERGENCE-V1`
   - `IR-O4O-KCOSMETICS-OPERATOR-MENU-ADMIN-ENTRY-MIX-V1` (W3 finding 정정에서 파생)

4. **Future-α**:
   - `IR-O4O-CARE-CORE-REINTRODUCTION-ARCHITECTURE-V1` (사업 결정 트리거 시)

---

## 11. 다음 우선순위 제안

Tier 2 PASS 후 자연스러운 다음 단계:

### 1순위 — Tier 4 정책 결정 IR (구조 변경 결정)

선행 IR §12 의 3개 + 신규 1개:
- **I1**: KPA backend `/operator/dashboard` 5-Block unified 응답 도입 여부 (Neture/Cosmetics 와 정합)
- **I2**: GlycoPharm Event Offer approval 권한 (operator vs admin) — 본 Tier 2 와 인접
- **I3**: 4개 서비스 AxisNavigationSection 형태 정합 (Neture 도 axis 도입 vs 메뉴 그룹 통합)
- **Iα**: K-Cos operator menu admin entry mix 여부 (W3 finding 정정)

각 IR 은 read-only 조사 + 정책 권고 (즉시 코드 변경 없음). 본 Tier 2 의 어휘/UX 정리와 별개의 구조 결정 트랙.

### 2순위 — Optional cleanup (각각 매우 작은 단위)

§10 의 4개 OPTIONAL WO. PASS 판정에 영향 없으나 코드베이스 노이즈 감소.

### 3순위 — pre-existing 22 errors cleanup

web-glycopharm 의 lms.ts + Dashboard unused 정리 — 본 dashboard 트랙과 별개이나 일반 코드 위생.

### 4순위 — 별도 영역 진행

Tier 2 와 무관한 다른 트랙 (대시보드 외 다른 정비 영역) 으로 이동 가능.

---

## 12. 완료 보고 (commit 미실행)

| 항목 | 값 |
|------|------|
| **판정** | ✅ **PASS** |
| **작성 문서** | `docs/investigations/CHECK-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-TIER2-COMPLETION-V1.md` |
| **W4 검증** | K-Cos pharmacy/약사/공급자 (회원분류) active 잔존 0 ✅. 사업 개념 supplier 보존 ✅ |
| **W5 검증** | Care + GlucoseView active 잔존 0 ✅. 1차 최종 완료 (Final PASS `9e9bd7ac9`) 재확인 |
| **W6 검증** | Neture operator 부적절한 약국 placeholder active 잔존 0 ✅. 사업 본질 약국 채널 안내 보존 |
| **잔존 항목과 분류** | 모두 §6.1 의 F (문서/주석/migration/test fixture/정상 business / mock optional) |
| **TypeScript 결과** | api-server / web-k-cos / web-kpa / web-neture 모두 0 ✅ / web-glycopharm 22 pre-existing (lms.ts + Dashboard unused, 본 Tier 2 무관) |
| **Source file 수정** | 없음 ✅ |
| **다른 세션 WIP 미포함** | ✅ working tree clean |
| **Commit 여부** | **사용자 승인 대기** — 본 CHECK 문서 1개만 path-restricted commit 예정 |

---

> **상태**: Cross-service operator/admin dashboard 정비 Tier 2 **최종 완료 검증** 통과. 본 CHECK 문서 commit 은 사용자 승인 후 path-restricted single commit 으로 진행 예정. Tier 1 + Tier 2 (W1/W3/W4/W5/W6/W7) 모두 closure — 다음은 §11 의 Tier 4 정책 결정 IR 또는 별도 영역 트랙.
