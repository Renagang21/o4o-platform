# IR-O4O-NETURE-SUPPLIER-APPROVAL-AND-QUALITY-CONSOLE-CANONICALIZATION-AUDIT-V1

- WO: IR-O4O-NETURE-SUPPLIER-APPROVAL-AND-QUALITY-CONSOLE-CANONICALIZATION-AUDIT-V1 (F 버킷)
- 성격: **READ-ONLY 감사** — 코드/DB 변경·배포·상태 변경 0. 통합 실행 아님.
- 판정: **PARTIAL_READY** (승인 콘솔 = 정책 결정 후 통합 가능 / 품질 콘솔 = 은퇴 방향 명확)
- 기준: `main` (807840a2f 시점), 프로덕션 DB read-only 집계.
- 자매 감사: [CHECK-O4O-NETURE-SUPPLIER-LEGACY-CSV-IMPORT-RETIREMENT-V1](../checks/CHECK-O4O-NETURE-SUPPLIER-LEGACY-CSV-IMPORT-RETIREMENT-V1.md) (D 버킷 — CSV import 은퇴)

---

## 1. 화면 인벤토리 (§5)

| 화면 | Route | Guard | 사용자 | 목적 | 데이터 원천 (API) | 주요 액션 | 진입점 |
|------|-------|-------|--------|------|-------------------|-----------|--------|
| **AdminSupplierApprovalPage** | `/admin/admin-suppliers` | `AdminRoute` (neture:admin) | Neture admin | 공급자 승인/거절/**비활성화** | `adminSupplierApi` → `/neture/admin/suppliers/*` | 승인·거절·비활성화·품목군 검토·서류 다운로드 | admin sidebar `getAdminMenu().approvals` "공급자 승인" |
| **OperatorSupplierApprovalPage** | `/operator/suppliers` | `OperatorRoute` (neture:operator) | Neture operator (admin도 통과) | 공급자 승인/거절 + 기본정보 보완 | `operatorSupplierApi` → `/neture/operator/suppliers/*` | 승인·거절·**일괄** 승인/거절·**기본정보 인라인 편집**·품목군·서류 | operator sidebar `UNIFIED_MENU.users` "공급자 승인" |
| **SupplierQualityPage** | `/operator/supplier-quality` **및** `/admin/supplier-quality` (dual-mount, 동일 컴포넌트) | 각각 OperatorRoute / AdminRoute | operator/admin | CSV import 배치 **품질 리포트** (성공률·실패행·오류유형) | `api.get('/neture/operator/supplier-quality')` → `supplier_csv_import_batches`/`_rows` | (mutation 없음) 기간 필터 조회만 | operator sidebar `UNIFIED_MENU.analytics` "공급자 품질" (→ `/operator/supplier-quality`) |

- **실제 렌더 컴포넌트 수: 3** (`AdminSupplierApprovalPage`, `OperatorSupplierApprovalPage`, `SupplierQualityPage`).
- **SupplierQualityPage importer 수: 1** (배럴 `pages/operator/index.ts:46` → App.tsx lazy 2 route 마운트). 실제 default 컴포넌트는 1개.
- **AdminSupplierApprovalPage importer: 1** (App.tsx:348 lazy). **OperatorSupplierApprovalPage importer: 1** (App.tsx:498 lazy).
- 공유 자산: 두 승인 화면 모두 `SupplierRegulatedCategoriesModal` + `AdminSupplier` 타입 + `PROFILE_FIELD_LABELS` 공유.

### 화면별 verdict

| 화면 | Verdict | 근거 |
|------|---------|------|
| OperatorSupplierApprovalPage | **ACTIVE_CANONICAL** | operator 일상 승인 콘솔. 표준 리스트(paged)+일괄+인라인 보완. 회원 IA(users 그룹)에 배치된 canonical 2단계 활성화 업무. |
| AdminSupplierApprovalPage | **ACTIVE_DUPLICATE** (부분) | 동일 도메인(NetureService)·동일 데이터·동일 승인/거절. 차이 = admin scope + **비활성화 고유** + client 필터(비-paged) UX. |
| SupplierQualityPage (operator mount) | **READ_ONLY_HISTORY → 사실상 DEAD_DATA** | 데이터 원천(CSV 배치)이 프로덕션 0건이며 생산 경로(CSV import 프론트)가 D 버킷에서 은퇴됨. |
| SupplierQualityPage (`/admin/supplier-quality` mount) | **DEAD_ROUTE** | `getAdminMenu()`에 메뉴 항목 없음 → 직접 URL 로만 도달. 동일 컴포넌트·동일 operator 엔드포인트 호출. |

---

## 2. Importer / dead-code 분석 (§5)

- `SupplierQualityPage`: 단일 default export, 배럴 1회 재노출, App.tsx 2 route(`/admin/supplier-quality`·`/operator/supplier-quality`) 마운트. **컴포넌트 중복 아님(1개), route 중복(2개).**
- `/admin/supplier-quality` route 는 `getAdminMenu()` 어느 그룹에도 없음(analytics = AI 항목만). → **메뉴 미연결 orphan route**(직접 URL 전용).
- `AdminSupplierApprovalPage` / `OperatorSupplierApprovalPage`: 각각 1 importer, dead 아님(둘 다 각 sidebar 메뉴에서 도달).
- `csvImport` 프론트 헬퍼는 D 버킷에서 제거됨 — 품질 리포트는 **백엔드 직접 `api.get`** 으로 동일 테이블을 읽으므로 프론트 은퇴와 무관하게 잔존.

---

## 3. 승인 책임 · 상태 전이 (§6)

### 상태 머신 (단일 도메인 = `NetureService`)

```
PENDING ──approve──▶ ACTIVE ──deactivate(admin 전용)──▶ INACTIVE
   │
   └────reject────▶ REJECTED
```

- **approve**: `POST /{admin|operator}/suppliers/:id/approve` → `NetureService.approveSupplier(id, actorId)` → status=ACTIVE (+ `approved_at`/승인자 기록, backend). PENDING·activationReady 재검증은 도메인 메서드가 수행.
- **reject**: `.../reject` (reason optional) → REJECTED.
- **deactivate**: `POST /admin/suppliers/:id/deactivate` → INACTIVE. **admin 전용** — operator 컨트롤러는 의도적으로 미노출(주석 명시: "ACTIVE 공급자 비활성화는 운영 정책 영향이 크므로 operator scope 미노출").
- **누가**: operator(neture:operator, admin도 scopeRoleMapping 으로 통과) = 승인/거절; admin(neture:admin) = 승인/거절/비활성화.
- **감사 로그 존재**: ✅ `ActionLogService` — `neture.operator.supplier_approve|reject|basic_info_update` (operator), admin 측 별도 키(`neture.admin.supplier_*`). 일괄 처리도 항목별 로그.

### 프로필 완성도 vs 승인 상태 **분리** (정책 보존 확인)

- 코드: `WO-...-APPROVAL-AND-PROFILE-COMPLETION-SEPARATION-V1` — 프로필 미완료는 **정보성 배지("정보 미완료")로만** 표시하고 승인 버튼을 비활성화하지 않음. 두 화면 모두 준수(`approveDisabled = selectedItems.length===0`, 프로필 조건 없음).
- `ONBOARDING_INCOMPLETE` 게이트 제거 확인(주석·코드). 대표자명/담당자명/연락처 = **하드 승인 게이트 아님**.
- 서류(사업자등록증)·정산정보·통장사본·세금계산서 이메일 = `getDeferredItems()` 로 "판매 전/정산 전" 단계 항목으로 분리(활성화 차단 아님).
- **데이터 검증**: profile-incomplete(대표자명 없음) ACTIVE 공급자 = **0건** → 분리 정책과 데이터 정합.
- 본 감사는 이 정책을 **역전하지 않음**.

### 승인 후 열리는 것

- status=ACTIVE 전환이 후속 판매/오퍼/정산 자격의 전제(supplier ACTIVE ≠ 개별 상품 승인 — 상품 승인은 `/operator/product-candidates`·`/admin/product-approvals` 별도 트랙).

---

## 4. 품질 콘솔 책임 분해 (§7)

`SupplierQualityPage` 가 검사하는 "품질" = **오직 CSV import 배치 데이터 품질**. 다음과 **혼동 금지**:

| "품질" 후보 개념 | SupplierQualityPage 대상 여부 | 실제 담당 |
|------------------|:------------------------------:|-----------|
| 계정/프로필 완성도 | ❌ | 승인 화면의 "정보 미완료" 배지 |
| 상품 데이터 품질 | ❌ | 상품 후보 검토(`/operator/product-candidates`) |
| **CSV 배치 업로드 품질** (성공률/실패행/오류유형) | ✅ **유일 대상** | SupplierQualityPage |
| 후보 검토 | ❌ | 상품 후보 검토 |
| 상품 승인 | ❌ | `/operator/product-approvals`·`/admin/product-approvals` |
| 오퍼 상태 | ❌ | 오퍼/상품관리 |
| 설명서 품질/이미지 누락/식별자 누락 | ❌ | 미구현(해당 화면 아님) |

- **데이터 원천**: `supplier_csv_import_batches` (batch_count/total_rows/applied_rows/rejected_rows) + `supplier_csv_import_rows` (apply_status='failed', validation_error → 오류유형 TOP10). 자동 산출(성공률·등급 GOOD/NORMAL/BAD), 수동 액션 없음.
- **운영 액션**: 없음(기간 필터 조회 전용 리포트). mutation 0.
- **현재 사용성**: 프로덕션 CSV 배치 = **0건** → KPI/공급자별/오류 전부 빈 값 렌더("데이터가 없습니다"). 생산 경로(CSV import UI)는 D 버킷 은퇴. → **은퇴된 적재 경로에 대한 리포트 표면.**
- canonical 중복 여부: 승인 콘솔/상품 후보 검토와 **중복 아님**(다른 데이터·다른 개념). 단 **자기 데이터가 死藏**.

---

## 5. 액션 인벤토리 (§8)

| 액션 | 화면 | API | 상태변경 | 사용가능 | Verdict |
|------|------|-----|:--------:|:--------:|---------|
| 승인 | 두 승인 화면 | POST `.../suppliers/:id/approve` | PENDING→ACTIVE | ✅ | KEEP (operator=canonical) |
| 거절 | 두 승인 화면 | POST `.../reject` | PENDING→REJECTED | ✅ | KEEP |
| 일괄 승인/거절 | Operator | POST `/operator/suppliers/batch` | 다건 | ✅ | KEEP (operator 고유 강점) |
| 비활성화 | Admin | POST `/admin/suppliers/:id/deactivate` | ACTIVE→INACTIVE | ✅ | **admin 고유** — KEEP(admin governance) |
| 기본정보 보완 | Operator | PATCH `/operator/suppliers/:id` (화이트리스트 5필드) | 프로필 필드 | ✅ | KEEP (operator 고유) |
| 품목군 검토 | 두 승인 화면 | PATCH `.../regulated-categories/:cat` | 품목군 상태 | ✅ | KEEP |
| 서류 다운로드 | 두 승인 화면 | GET `.../documents/:type/download` | 없음(blob) | ✅ | KEEP |
| 품질 조회 | Quality | GET `/neture/operator/supplier-quality` | 없음 | ⚠️ (데이터 0) | LEGACY(死藏 데이터) |

- 승인/거절은 admin·operator 두 화면에 **중복**(DUPLICATE) — 단 동일 도메인 로직·별도 scope 진입로.
- BROKEN/UNREACHABLE mutation 없음. POLICY_RISK: 없음(분리 정책 준수).

---

## 6. API · 데이터 원천 정합 (§9)

- `neture_suppliers.status` (PENDING/ACTIVE/REJECTED/INACTIVE) = 승인 배지의 단일 원천. ✅ 프론트 재계산 금지 준수.
- `activationReady`/`missingActivationFields` → `profileComplete`/`missingProfileFields` 로 이관(deprecated 유지). **backend 단일 권위**, 프론트 fallback만.
- Quality 카운트/등급 = `supplier_csv_import_*` 집계 — 승인 상태와 **독립**.
- **금지 혼동 없음 확인**: Supplier ACTIVE ≢ 상품 승인 / CSV 배치 품질 ≢ 계정 품질 / 프로필 미완료 ≢ 계정 미승인 — 세 경계 모두 코드·데이터에서 분리 유지.

---

## 7. 라우트 / IA (§10)

- operator sidebar: `공급자 승인`→`/operator/suppliers` (users 그룹), `공급자 품질`→`/operator/supplier-quality` (analytics 그룹).
- admin sidebar: `공급자 승인`→`/admin/admin-suppliers` (approvals 그룹). **admin sidebar 에 공급자 품질 없음.**
- 교차 진입: `UsersManagementPage`·`NetureOperatorDashboard` 승인대기 배지 → `/operator/suppliers` 안내(mutation 없이 링크만). ✅ 정합.
- **문제**:
  - 동일 라벨 "공급자 승인" 이 **admin/operator 두 sidebar 에 각각** → 역할 표면 분리이나 코드 2벌 drift 위험.
  - `/admin/supplier-quality` = **메뉴 미연결 orphan route**(직접 URL 전용, 死藏 데이터).
- 404/redirect-loop/역할 오가드: 없음.

---

## 8. 권한 / Guard (§11)

| Route | Guard | 비로그인 | 일반 supplier | operator | neture admin |
|-------|-------|:--------:|:-------------:|:--------:|:------------:|
| `/admin/admin-suppliers` | AdminRoute | 차단 | 차단 | 차단 | ✅ |
| `/operator/suppliers` | OperatorRoute | 차단 | 차단 | ✅ | ✅(scope통과) |
| `/operator/supplier-quality` | OperatorRoute | 차단 | 차단 | ✅ | ✅ |
| `/admin/supplier-quality` | AdminRoute | 차단 | 차단 | 차단 | ✅ |

- supplier 가 operator/admin 승인 화면 접근 불가 확인. 권한 오류 시 blank/loop 없음.
- **주의(경미)**: `/admin/supplier-quality`(AdminRoute) 페이지가 **operator scope 엔드포인트**(`/neture/operator/supplier-quality`)를 호출 — admin 은 `neture:operator` scope 를 포함하므로 실동작은 정상. 다만 route guard(admin)와 데이터 엔드포인트(operator) 불일치 = orphan route 정리 시 함께 해소.

---

## 9. 프로덕션 데이터 게이트 (§12, read-only 집계)

| 지표 | 값 |
|------|---:|
| neture_suppliers TOTAL | **3** |
| ─ ACTIVE | 2 |
| ─ PENDING | 1 |
| ─ REJECTED / INACTIVE | 0 / 0 |
| profile-incomplete(대표자명 없음) **ACTIVE** | **0** |
| 승인(approved_at) 최근 30일 / 90일 | 1 / 2 |
| supplier_csv_import_batches TOTAL | **0** |
| supplier_csv_import_rows TOTAL | **0** |

- PII/원문/연락처 미조회 — COUNT/status/date 집계만.
- 해석: 승인 콘솔은 실운영(소량 3건)에서 정상 사용, **분리 정책 위반 0**(profile-incomplete ACTIVE 0). 품질 콘솔은 **원천 0건 → 死藏**.

---

## 10. 최근 사용 게이트 (§13)

- CSV import 백엔드(`/neture/supplier/csv-import`) 히트 = D 버킷에서 90일 0건 확인. 품질 리포트는 그 데이터의 파생 → **NO_OBSERVED_DATA**.
- 승인 엔드포인트: 프로덕션에 ACTIVE 2·PENDING 1 존재 + approved_at 90일 2건 → **ACTIVE_USAGE**(소량).
- Quality 라우트 자체 접근 로그는 별도 계측 없음 → **USAGE_UNKNOWN**(단 데이터 0 으로 실효 없음).

---

## 11. 중복 판정 (§14)

1. **AdminSupplierApprovalPage vs OperatorSupplierApprovalPage = 부분 중복(partial)**
   - 동일: 사용자 의도(공급자 승인), 데이터(`neture_suppliers`), 핵심 액션(승인/거절 via 동일 `NetureService`), 목적.
   - 상이: scope guard(admin vs operator), **비활성화(admin 고유)**, list UX(operator=paged+일괄+인라인 보완, admin=client 필터+KPI 카드).
   - → §14 규칙: 부분 중복 = **canonical 로 이관 + redirect**, 단 고유 액션(비활성화)은 보존. **정책 결정 필요**(아래 §12).

2. **SupplierQualityPage dual-mount = 완전 중복 마운트**
   - 동일 컴포넌트·동일 엔드포인트, 2 route. operator mount 만 메뉴 연결, admin mount 는 orphan.
   - → route 1개로 축약. 데이터 死藏 → **은퇴 후보**(CSV 데이터 은퇴 WO 와 lockstep).

---

## 12. Canonical 구조 제안 (§15)

| 화면 | 구조 verdict | 제안 |
|------|--------------|------|
| **OperatorSupplierApprovalPage** | **KEEP_CANONICAL** | 공급자 승인 일상 콘솔 = operator(`/operator/suppliers`). 표준 리스트+일괄+인라인 보완이 canonical UX. |
| **AdminSupplierApprovalPage** | **HOLD_POLICY** (→ MERGE_INTO_APPROVAL_CONSOLE 후보) | 승인/거절은 operator 로 수렴 가능. **비활성화(ACTIVE→INACTIVE) governance** 를 (a) operator 콘솔에 admin-guard 액션으로 흡수하거나 (b) admin 은 "비활성화 governance" 전용 축소 뷰로 유지 — 둘 중 택1 정책 결정 필요. |
| **SupplierQualityPage** (operator) | **READ_ONLY_HISTORY → RETIRE 후보** | 원천(CSV 배치) 0 + 생산경로 은퇴. CSV import 데이터 은퇴 WO 와 함께 은퇴(또는 CSV 재도입 시 재활성 조건 명시). |
| **SupplierQualityPage** (`/admin/supplier-quality`) | **DEAD_ROUTE → 제거** | 메뉴 미연결 orphan. 최소한 이 route + guard/엔드포인트 불일치 제거. |

**전체 귀결**: WO 원안 Outcome 중 **C 변형** — 승인 콘솔(operator canonical + admin governance 축소)과 CSV 품질(死藏 → 은퇴)을 **분리 정리**. 단일 통합(Outcome B)은 부적절(품질=다른 데이터·死藏). D(승인 유지·품질 은퇴)에 가장 근접하되, 승인 측 admin/operator drift 수렴 결정을 추가.

---

## 13. KEEP / MERGE / REDIRECT / RETIRE 요약 (§15)

- **KEEP**: OperatorSupplierApprovalPage(승인 canonical), 승인 액션(승인/거절/일괄/보완/품목군/서류).
- **MERGE(정책 결정 후)**: AdminSupplierApprovalPage 승인/거절 → operator 콘솔로 수렴, 비활성화는 admin-guard 로 보존.
- **REDIRECT/제거**: `/admin/supplier-quality` orphan route.
- **RETIRE(별도 WO, CSV 데이터 lockstep)**: SupplierQualityPage(死藏 리포트) + `supplier_csv_import_*` 데이터 은퇴.

---

## 14. P0 / P1 / P2 (§16)

- **P0 (보안/승인 우회)**: **없음.** guard·scope 정합, 분리 정책 준수, mutation 오가드 없음.
- **P1**
  - (P1-a) 승인 콘솔 **admin/operator 코드 2벌 drift 위험** — 분리 정책·필드·라벨을 lockstep 으로 유지해야 함(현재는 정합하나 구조적 취약).
  - (P1-b) SupplierQualityPage **死藏 데이터 화면이 operator 메뉴(analytics)에 노출** — 운영자에게 빈 리포트 상시 노출(오해 유발).
- **P2**
  - (P2-a) `/admin/supplier-quality` orphan route(메뉴 미연결) + guard(admin)/엔드포인트(operator) 불일치.
  - (P2-b) `operatorMenuGroups.ts` 의 deprecated `OPERATOR_MENU_ITEMS` 에도 "공급자 품질" 잔존(미사용이나 혼동 소지).

---

## 15. 후속 WO 순서 (§16)

1. **WO-1 (승인 콘솔 정책 결정 + 수렴)**: admin/operator 승인 중복 해소. operator=canonical 고정, 비활성화 governance 흡수/축소 결정 → AdminSupplierApprovalPage MERGE 또는 축소. (정책 게이트 = admin 비활성화 권한 위치.)
2. **WO-2 (품질 콘솔 은퇴)**: CSV import 데이터(`supplier_csv_import_*`) 은퇴 WO 와 lockstep — SupplierQualityPage + `/operator/supplier-quality` 메뉴 + `/admin/supplier-quality` orphan route + operator-supplier-quality 컨트롤러 은퇴. CSV 재도입 계획 있으면 "재활성 조건" 문서화 후 보류.
3. **WO-3 (경미 정리)**: deprecated `OPERATOR_MENU_ITEMS` 잔존 항목 정리(WO-2 에 흡수 가능).

---

## 16. 불변식 준수 (§17·§20)

- 코드 편집 0 · route 변경 0 · UI 통합 0 · DB write 0 · migration 0 · 상태 변경 0 · 승인 실행 0 · CSV 배치 삭제 0 · 백엔드 엔드포인트 삭제 0 · 신규 품질 스코어 설계 0.
- 프로덕션 DB = read-only 집계만(COUNT/status/date). 자격증명 미기록.
- 동시 세션 미커밋 파일(`docs/checks/CHECK-O4O-KPA-OPERATOR-WORKING-CONTENT-...`) 미접촉.
- 본 문서만 커밋 대상.
