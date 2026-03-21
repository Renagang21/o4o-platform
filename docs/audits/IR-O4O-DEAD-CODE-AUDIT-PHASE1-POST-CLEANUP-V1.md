# IR-O4O-DEAD-CODE-AUDIT-PHASE1-POST-CLEANUP-V1

**날짜:** 2026-03-21
**기준 커밋:** `3c50db232` (WO-O4O-DEAD-CODE-CLEANUP-PHASE1-STEP1-P0-V1)
**범위:** api-server, web-neture, web-glycopharm, web-glucoseview, web-k-cosmetics, web-kpa-society, packages
**유형:** 조사 전용 (수정 없음)

---

## 1. 전체 요약

| 분류 | 건수 |
|------|:----:|
| **P1 → SAFE REMOVE 승격** | 4 |
| **P2/HOLD → SAFE REMOVE 승격** | 2 |
| **2차 orphan 신규 발견** | 7 |
| **SAFE REMOVE 합계** | **13** |
| **HOLD 유지** | 1 |
| **NEEDS REVIEW 유지** | 1 |
| **ACTIVE 확인 (유지)** | 2 |

### 핵심 판정

- P0 제거 이후 **신규 dead code 13건** 추가 확인 (2차 orphan 7건 포함)
- HOLD/NEEDS REVIEW는 2건만 남음 (최소 수준)
- 확인된 ACTIVE 항목 2건은 완전히 제외
- **1회 추가 수정으로 Phase 1 종료 가능**

---

## 2. 집중 확인 대상 상세 표

### 2.1 기존 P1 항목 재판정 (4건 → 전원 SAFE REMOVE)

| # | 파일 경로 | 판정 | 근거 | 소비자 | runtime 연결 |
|---|----------|------|------|--------|-------------|
| P1-1 | `routes/v1/customizer.routes.ts` (571줄) | **SAFE REMOVE** | main.ts 미등록. Frontend는 `/api/v1/settings/customizer`만 호출 (settingsRoutes 경유). 이 파일의 `/api/v1/customizer/*` 엔드포인트는 호출처 0건 | 0건 | 없음 |
| P1-2 | `routes/v1/preview.routes.ts` (248줄) + `preview.routes.ts.new` (160줄) | **SAFE REMOVE** | main.ts 미등록. 프론트엔드 호출 0건. `.new` 파일은 미완성 리팩토링 시도 | 0건 | 없음 |
| P1-3 | `controllers/autoRecoveryController.ts` (424줄) | **SAFE REMOVE** | import 0건. 코드 내 주석: "AutoRecoveryService removed (WO-O4O-CODEBASE-CLEANUP-V1)". 지원 서비스 제거 후 컨트롤러만 잔존 | 0건 | 없음 |
| P1-4 | `routes/v2/query.routes.ts` (327줄) | **SAFE REMOVE** | main.ts 미등록. 동적 import 패턴 없음 (moduleLoader, appsCatalog 확인). 프론트엔드 호출 0건 | 0건 | 없음 |

### 2.2 기존 P2/HOLD 항목 재판정 (6건)

| # | 파일/패키지 | 판정 | 근거 | 다음 조치 |
|---|-----------|------|------|----------|
| P2-1 | `routes/admin/seller-authorization.routes.ts` (344줄) | **SAFE REMOVE** | main.ts 미등록. Feature flag `ENABLE_SELLER_AUTHORIZATION` default false. 모든 엔드포인트 501 stub. 프론트엔드 UI 없음 | 삭제 |
| P2-2 | `pages/partner/ReferralLinkModal.tsx` (neture, 240줄) | **HOLD** | import 0건이나 WO-O4O-PARTNER-LINK-CREATION-UX-V1 미완성 기능. ReferralLinksPage/PartnerLinksPage가 실제 활성 페이지 | 모듈 담당자 확인 후 판단 |
| P2-3 | `pages/care/patient-tabs/SummaryTab.tsx` (glycopharm, 133줄) | **NEEDS REVIEW** | index.ts에서 export되나 App.tsx에서 import 안 함. 4개 탭(Data, Analysis, Coaching, History)만 라우트에 등록. 의도적 누락인지 확인 필요 | Care 모듈 확인 후 판단 |
| P2-4 | `pages/operator/operatorConfig.ts` (k-cosmetics) | **ACTIVE** | KCosmeticsOperatorDashboard에서 `buildKCosmeticsOperatorConfig()` 직접 import/호출. 3개 서비스 공통 패턴 | 유지 |
| P2-5 | `packages/yaksa-admin/` (root + api-server 2벌) | **SAFE REMOVE** | import 0건. admin-dashboard는 로컬 `/pages/yaksa-admin/` 컴포넌트 사용. 패키지는 orphan | root + api-server 양쪽 삭제 |
| P2-6 | `packages/cgm-pharmacist-app/` | **ACTIVE** | admin-dashboard에서 lazy import 4건 (PatientList, PatientDetail, Coaching, Alerts). AppRouteGuard 연동. Phase 1 개발 중 | 유지 |

---

## 3. 새롭게 발견된 항목 (2차 orphan)

### 3.1 api-server/packages/ 중복 잔존 (4건)

P0에서 root `packages/`의 패키지를 삭제했으나, `apps/api-server/packages/` 내부에 동일 이름 디렉토리가 잔존.

| # | 경로 | 유형 | 판정 | 근거 |
|---|------|------|------|------|
| O1 | `apps/api-server/packages/yaksa-accounting/` | package | SAFE REMOVE | `@o4o/yaksa-accounting` import 0건. 자기 참조만 존재 |
| O2 | `apps/api-server/packages/signage-pharmacy-extension/` | package | SAFE REMOVE | `@o4o/signage-pharmacy-extension` import 0건. 자기 참조만 |
| O3 | `apps/api-server/packages/member-yaksa/` | package | SAFE REMOVE | `@o4o/member-yaksa` import 0건. 자기 참조만 |
| O4 | `apps/api-server/packages/design-system-cosmetics/` | package | SAFE REMOVE | `@o4o/design-system-cosmetics` import 0건. 자기 참조만 |

### 3.2 코드 레벨 2차 orphan (3건)

| # | 경로 | 유형 | 판정 | 근거 |
|---|------|------|------|------|
| O5 | `validators/customizer.validators.ts` | validator | SAFE REMOVE | 유일 소비자: `routes/v1/customizer.routes.ts` (P1-1, 삭제 예정) |
| O6 | `routes/v1/preview.routes.ts.new` | route backup | SAFE REMOVE | 미완성 리팩토링 파일. 원본(preview.routes.ts)과 함께 삭제 |
| O7 | `routes/v1/` 디렉토리 자체 | directory | SAFE REMOVE 후보 | P1 삭제 후 `platformInquiry.routes.ts` 1개만 남음. 이동 검토 가능 (구조 변경이므로 이번 범위 외) |

---

## 4. Workspace / Package 정합성

| 항목 | 상태 |
|------|------|
| `pnpm-workspace.yaml` | 정상. `packages/*` glob 패턴이므로 삭제 시 자동 반영 |
| `pnpm-lock.yaml` | P0 커밋에서 258 packages 정리 완료 |
| root `package.json` | 삭제 패키지 참조 없음 |
| tsconfig paths | 삭제 패키지 참조 없음 |
| Dockerfile COPY | 삭제 패키지 참조 없음 |
| 삭제 패키지명 잔존 참조 | `@o4o/yaksa-admin` → yaksa-accounting의 peer dependency에만 남음 (둘 다 삭제 예정이므로 무관) |

---

## 5. Dead Code 1단계 종료 가능 여부

### 판정: **1회 추가 수정으로 Phase 1 종료 가능**

### 이유

1. **SAFE REMOVE 13건**은 모두 참조 0건이 확인된 명확한 dead code
2. 수정 범위가 작음 (파일 삭제 + 패키지 디렉토리 삭제)
3. 잔존 HOLD/NEEDS REVIEW 2건은 모듈 담당자 판단이 필요하며 dead code 정비와 별도로 관리 가능
4. ACTIVE 확인된 2건(`operatorConfig.ts`, `cgm-pharmacist-app`)은 완전 제외

### 다음 수정 WO 범위 (제안)

**그룹 E — 잔존 Backend dead code**
```
routes/v1/customizer.routes.ts
routes/v1/preview.routes.ts
routes/v1/preview.routes.ts.new
routes/v2/query.routes.ts
controllers/autoRecoveryController.ts
routes/admin/seller-authorization.routes.ts
validators/customizer.validators.ts
```
> 7파일 삭제. P1-1 삭제 후 `routes/v1/`에는 `platformInquiry.routes.ts`만 남음.

**그룹 F — api-server/packages/ 중복 잔존 + yaksa-admin**
```
apps/api-server/packages/yaksa-accounting/
apps/api-server/packages/signage-pharmacy-extension/
apps/api-server/packages/member-yaksa/
apps/api-server/packages/design-system-cosmetics/
apps/api-server/packages/yaksa-admin/
packages/yaksa-admin/
```
> 6 디렉토리 삭제.

**총 삭제 예상**: ~2,500줄 + 패키지 디렉토리 6개

---

## 6. 잔존 관리 항목 (Phase 1 이후)

| 항목 | 상태 | 관리 방법 |
|------|------|----------|
| `ReferralLinkModal.tsx` (neture) | HOLD | 네처 파트너 모듈 WO 진행 시 통합 또는 삭제 |
| `SummaryTab.tsx` (glycopharm) | NEEDS REVIEW | Care 모듈 개선 시 라우트 연결 또는 삭제 |
| `routes/v1/platformInquiry.routes.ts` | ACTIVE | v1 디렉토리에 단독 잔존. 구조 정비 시 이동 검토 가능 |

---

*Generated: 2026-03-21*
*Audit Method: 3 parallel agents + manual cross-verification*
*Verification: grep import/export, main.ts mount check, dynamic import scan, frontend API call trace, workspace config audit*
