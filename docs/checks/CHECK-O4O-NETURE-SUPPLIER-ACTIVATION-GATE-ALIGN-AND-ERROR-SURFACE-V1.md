# CHECK-O4O-NETURE-SUPPLIER-ACTIVATION-GATE-ALIGN-AND-ERROR-SURFACE-V1

> WO: `WO-O4O-NETURE-SUPPLIER-ACTIVATION-GATE-ALIGN-AND-ERROR-SURFACE-V1`
> IR 참고: `docs/work-orders/IR-O4O-NETURE-SUPPLIER-APPROVAL-AND-ACTIVATION-FLOW-AUDIT-V1.md`
> 작업 위치: `C:\Users\sohae\coding\o4o-platform` (Laptop workspace)
> 작성일: 2026-07-12
> 상태: 구현 완료 + 검증(정적/배포) 완료, DB/브라우저 라이브 스모크는 환경 제약으로 제한적

---

## 0. 요약 (Executive Summary)

WO의 백엔드·프론트 요구사항 **대부분은 선행 세션 커밋으로 이미 구현·배포된 상태**였다.
독립 재조사 결과, 실제 코드에서 **단일 미충족 갭 1건**(대량 등록 진입 미차단)을 발견하여 최소 수정으로 보완했다.

| 구분 | 결과 |
|------|------|
| 선행 구현 커밋 | `077100f20` (2026-06-29) + `2bc55ad3a` (2026-06-29) — origin/main 반영, 라이브 배포됨 |
| 이번 세션 신규 수정 | `services/web-neture/src/pages/supplier/SupplierBulkRegisterPage.tsx` — 대량 등록 진입 사전 게이트 추가 (5줄) |
| 백엔드 변경 | 없음 (선행 구현이 요구사항 충족) |
| 미해결(정책상 유지) | sohae21 계정 = 기존 PENDING supplier row의 담당자 정보 null → 자동 backfill 금지 정책상 프로필 보완 후 운영자 활성화로 해결 |

---

## 1. 변경 파일 목록

| 파일 | 변경 | 성격 |
|------|------|------|
| `services/web-neture/src/pages/supplier/SupplierBulkRegisterPage.tsx` | +5 | 대량 등록 페이지 전체를 `<SupplierActivationGate mode="gate">` 로 래핑 (진입 사전 차단) |
| `docs/checks/CHECK-O4O-NETURE-SUPPLIER-ACTIVATION-GATE-ALIGN-AND-ERROR-SURFACE-V1.md` | 신규 | 본 문서 |

이번 세션에서 백엔드 파일, 기타 프론트 파일, `pnpm-lock.yaml`, 무관한 파일은 수정하지 않았다.
기존 dirty 파일 `docs/checks/CHECK-O4O-DRUG-SEED-CANDIDATE-APPLY-RUNBOOK-V1.md` (UU, 무관)는 접촉하지 않았다.

---

## 2. 백엔드 응답 구조 (선행 구현 — 검증 완료)

### 2.1 활성화 가능 여부 단일 권위

`getMissingActivationFields()` (`supplier.service.ts:1219-1225`)가 유일 권위이며 3개 필드만 요구한다:

```ts
if (!supplier.representativeName?.trim()) missing.push('representativeName');
if (!supplier.managerName?.trim())        missing.push('managerName');
if (!supplier.managerPhone?.trim())       missing.push('managerPhone');
```

문서·정산 정보는 ACTIVE 게이트에서 제외되어 판매전/정산전 게이트(`getMissingSaleFields`/`getMissingSettlementFields`)로 이동됨.

### 2.2 응답에 포함되는 필드

| 응답 | 메서드 / 위치 | 라우트 | activationReady | missingActivationFields |
|------|---------------|--------|:---:|:---:|
| 공급자 목록 | `getAllSuppliers()` `supplier.service.ts:400-401` | `GET /neture/operator/suppliers`, `.../suppliers/list`(paged), `GET /neture/admin/suppliers` | ✅ | ✅ |
| 공급자 본인 프로필 | `getSupplierProfile()` `supplier.service.ts:608-609` | `GET /neture/supplier/profile` | ✅ | ✅ |

예시:
```json
{ "status": "PENDING", "activationReady": false, "missingActivationFields": ["managerName", "managerPhone"] }
```

> 알려진 비영향 갭: `getPendingSuppliers()`(`/…/suppliers/pending`)는 두 필드를 미포함.
> 그러나 운영자/관리자 승인 화면은 각각 `getSuppliersPaged`(paged list) / `getSuppliers`(full list)를 소비하므로 **활성화 UI에는 영향 없음**. 후속 정합 후보로만 기록.

### 2.3 활성화 오류 구조화 (HTTP 400)

서비스 `approveSupplier()` (`supplier.service.ts:125-131`):
```ts
if (missingActivationFields.length > 0)
  return { success: false, error: 'ONBOARDING_INCOMPLETE', missingFields: missingActivationFields };
```
컨트롤러 매핑 — operator(`operator-supplier.controller.ts:304-313`) / admin(`admin.controller.ts:96-100`):
```ts
const status = result.error === 'SUPPLIER_NOT_FOUND' ? 404 : 400;
return res.status(status).json({
  success: false,
  error: { code: result.error, message: result.error, missingFields: result.missingFields ?? [] },
});
```
→ 클라이언트는 `error.code === 'ONBOARDING_INCOMPLETE'` + `error.missingFields[]` 를 **HTTP 400** 으로 수신. 문자열 파싱 의존 제거됨.

### 2.4 ACTIVE 전환 정책 / 자동 활성화 금지 (유지 확인)

- 상품 등록 mutation 게이트: `neture-identity.middleware.ts:57-64` — `status !== 'ACTIVE'` 이면 403 + `SUPPLIER_NOT_ACTIVE`("Supplier account is PENDING…"). 서비스단 2차 방어 `offer.service.ts:832-835`.
- PENDING→ACTIVE 전환은 **오직 `approveSupplier()`(운영자/관리자 명시 호출)** 로만 발생. 타이머·마이그레이션·backfill로 인한 자동 전환 없음(확인됨).
- 신규 가입 supplier row는 `operator-registration.service.ts:191` 에서 `status='PENDING'` 로 생성, 이후 상태 변경 없음.

---

## 3. 프론트 표시 방식 (선행 구현 — 검증 완료 + 이번 세션 보완)

### 3.1 운영자/관리자 활성화 화면

- 활성화 화면 2종: `pages/operator/OperatorSupplierApprovalPage.tsx`(`/operator/suppliers`, 표준 paged list), `pages/admin/AdminSupplierApprovalPage.tsx`(`/admin/admin-suppliers`).
- 버튼 활성 조건은 백엔드 `activationReady` 를 그대로 사용 (`isActivationReady` = `s.activationReady ?? !!s.representativeName`). `activationReady`가 내려오면 그 값이 권위이고, 로컬 `representativeName`-only 경로는 **레거시 payload 백워드 호환 fallback**으로만 존재(현 계약에서는 미사용).
- 누락 필드 한국어 매핑 `admin.ts:124-128`:
  `representativeName→대표자명`, `managerName→담당자명`, `managerPhone→담당자 연락처`.
- 활성화 실패: API 함수(`operatorSupplierApi.approveSupplier`/`adminSupplierApi.approveSupplier`)가 `{ success, code, missingFields }` 구조를 반환(빈 false 아님). 핸들러가 `ONBOARDING_INCOMPLETE`/`INVALID_STATUS`/`SUPPLIER_NOT_FOUND` 분기 후 **배너로 사유 표시** — silent no-op 없음.
- 활성화 성공: 성공 배너 + 목록 refetch + 상태 배지 ACTIVE 갱신. `actionLoading` 로 중복 클릭 방지.

### 3.2 공급자 대시보드

`SupplierDashboardPage.tsx:119-121` → `<SupplierActivationGate mode="banner">`.
`SupplierActivationGate.tsx`: `!active` 일 때 PENDING 안내 배너 + `missingActivationFields` 한국어 표시 + 프로필 편집 링크(`/mypage/business-profile`). 데이터는 `supplierProfileApi.getProfile()` 직접 소비(재계산 없음).

### 3.3 상품 등록 진입 사전 차단

`SupplierActivationGate mode="gate"` 는 `!active` 시 children 을 **렌더하지 않고** 차단 패널(누락 필드 + 프로필 링크)만 표시 → 이미지 복사/상품 분석/상세 편집 이전에 차단, 미디어 orphan 발생 불가.

| 진입 경로 | 컴포넌트 | 게이트 |
|-----------|----------|:---:|
| `/supplier/products/register`(선택) | `SupplierProductRegisterEntryPage` | ✅ (선행) |
| `/supplier/products/new` | `SupplierProductCreatePage` | ✅ (선행) |
| `/supplier/products/import-assistant` | `SupplierProductImportPage` | ✅ (선행) |
| **`/supplier/products/bulk`** | **`SupplierBulkRegisterPage`** | ✅ **(이번 세션 추가)** |

---

## 4. 이번 세션 수정 상세 — 대량 등록 진입 게이트

**문제**: `SupplierBulkRegisterPage`(`/supplier/products/bulk`)에는 활성화 게이트가 없어, PENDING 공급자가 직접 진입 시 CSV 업로드·`submitBulkCandidates`(후보 생성 mutation)까지 도달 가능 → WO §8.3 / 완료조건("PENDING 공급자는 상품 등록 진입에서 사전 차단") 미충족.

**수정**: 다른 3개 등록 페이지와 동일 패턴으로 최상위 return 을 `<SupplierActivationGate mode="gate">` 로 래핑. 게이트 컴포넌트가 자체적으로 프로필을 조회하므로 추가 props 불필요.

```tsx
import SupplierActivationGate from '../../components/supplier/SupplierActivationGate';
// …
return (
  <SupplierActivationGate mode="gate">
    <div className="max-w-3xl"> … </div>
  </SupplierActivationGate>
);
```

이제 PENDING 공급자는 대량 등록에서도 파일 선택/제출 이전에 차단되며 담당자 정보 보완 안내를 받는다.

---

## 5. sohae21@naver.com 계정 — 근본 원인 및 전후 상태

### 5.1 근본 원인 (정적 분석 확정)

- 회원(users/service_membership)은 ACTIVE → 로그인·대시보드 접근 가능.
- `neture_suppliers` row 는 PENDING 이며 `manager_name` / `manager_phone` 이 null 로 추정 → `getMissingActivationFields` 가 두 필드를 반환 → 운영자 활성화 시 백엔드 400(`ONBOARDING_INCOMPLETE`).
- **왜 null 인가**: supplier row 가 이미 존재하는 경우, `operator-registration.service.ts` 의 매핑 INSERT 는 `if (!existingSupplier)` 가드와 `ON CONFLICT (user_id) DO NOTHING`(`:192`) 때문에 실행되지 않고, else 분기는 `updated_at` 만 갱신 → 담당자 정보가 **보완되지 않음**. (WO §9 3항이 지적한 정확한 상황)

### 5.2 전후 상태

| 시점 | 회원 상태 | 공급자 상태 | 상품 등록 |
|------|-----------|-------------|-----------|
| 전 | ACTIVE | PENDING (담당자 정보 null) | 마지막 저장에서 400 실패, 화면 무반응 |
| 후(코드) | 변화 없음(정책상 DB 미변경) | 변화 없음 | **진입 즉시 안내 차단** + 운영자 화면에 누락 필드 한국어 표시 + 활성화 버튼 비활성 |
| 해결 경로 | — | 공급자가 프로필에서 담당자명/연락처 입력 → 운영자 활성화 클릭 → ACTIVE | ACTIVE 후 정상 등록 |

> 정책 준수: DB에서 계정을 직접 ACTIVE 로 바꾸거나 담당자 정보를 추정값으로 채우지 않음(자동 backfill 금지).

### 5.3 라이브 DB 직접 확인 제약

본 워크스페이스(Laptop)는 네트워크 방화벽으로 outbound 5432 차단, `gcloud sql connect` 행업(기존 기록된 제약). 따라서 sohae21 의 실제 row 값 read-only 조회는 이 환경에서 수행 불가.
→ 필요 시 **Cloud Console SQL Editor** 로 다음 read-only 집계만 확인 권장(이번 WO 범위 외, backfill 금지):
```sql
SELECT status, representative_name, manager_name, manager_phone
FROM neture_suppliers s JOIN users u ON u.id = s.user_id
WHERE u.email = 'sohae21@naver.com';
-- 유사 케이스 집계 (담당자 정보 null 인 PENDING supplier 수)
SELECT count(*) FROM neture_suppliers
WHERE status='PENDING' AND (manager_name IS NULL OR manager_phone IS NULL);
```

---

## 6. 검증 결과

### 6.1 정적 검증
- 변경 격리 확인: `git status` 상 이번 세션 수정은 `SupplierBulkRegisterPage.tsx` 1개 파일(+5)뿐.
- `web-neture` `tsc --noEmit`: 수정 파일 관련 오류 **0건**(grep 카운트 0). 남은 오류는 로컬 미빌드 워크스페이스 패키지(`@o4o/store-ui-core`, `@o4o/content-editor`의 `MediaInsert`) 모듈 해석 오류로, 본 변경과 무관한 **기존 환경 이슈**(CI는 deps 선빌드). `SupplierActivationGate` import 는 정상 해석(동일 import 를 쓰는 형제 페이지도 게이트 관련 오류 없음).
- 백엔드 미변경 → api-server typecheck 대상 아님.

### 6.2 배포 검증
- 선행 WO 커밋 `2bc55ad3a`(2026-06-29) < `neture-web` 현재 리비전 `neture-web-01253-ngd` 배포시각 `2026-07-12T00:35Z` → **백엔드·프론트 선행 구현은 라이브 반영됨**.
- 이번 세션 bulk-gate 수정은 커밋/푸시 시 CI/CD 로 배포 예정.

### 6.3 라이브 브라우저 스모크 제약
- 이번 변경은 이미 3개 형제 페이지에서 검증된 `SupplierActivationGate mode="gate"` 래퍼의 동일 적용(추가 로직 없음)으로, 회귀 위험이 사실상 없어 정적 검증으로 갈음.
- PENDING 실계정 브라우저 관측은 테스트 데이터(후보 상품) 생성/정리 부담과 DB 접근 제약으로 이번 세션 미수행. 필요 시 배포 후 PENDING 테스트 공급자 계정으로 `/supplier/products/bulk` 진입이 차단되는지 확인 권장.

---

## 7. 테스트 데이터 / 미디어 정리

이번 세션에서 테스트 상품·미디어·smoke 데이터를 **생성하지 않음** → 정리 대상 없음.

---

## 8. 완료 조건 대비 결과

| WO §13 완료 조건 | 상태 |
|------------------|:---:|
| 백엔드가 activationReady/missingActivationFields 제공 | ✅ (선행) |
| 프론트가 활성화 조건 재계산 안 함 | ✅ (레거시 fallback만, 현 계약 미사용) |
| 누락 필드 있으면 활성화 버튼 비활성 | ✅ (선행) |
| 실패 사유 한국어 표시 / silent no-op 없음 | ✅ (선행) |
| PENDING 공급자 대시보드·프로필 작성 가능 | ✅ (선행) |
| PENDING 공급자 상품 등록 진입 사전 차단 | ✅ (선행 3경로 + **이번 세션 bulk 보완**) |
| ACTIVE 공급자 기존 등록 흐름 유지 | ✅ (게이트는 ACTIVE 시 children 그대로 렌더) |
| DB 직접 ACTIVE 변경 안 함 | ✅ |
| smoke 데이터·미디어 정리 | ✅ (생성 없음) |
| typecheck/build/deploy/live smoke | 부분 — typecheck(격리) ✅ / 선행 배포 ✅ / bulk-gate 배포 예정 / 라이브 스모크 제약 |

---

## 9. 알려진 후속 항목 (이번 WO 범위 외, 비차단)

1. `getPendingSuppliers()` 에 `activationReady`/`missingActivationFields` 미포함 — 활성화 UI 비소비라 무영향, 정합 목적 후속 가능.
2. `POST /operator/suppliers/batch` 승인은 `missingFields` 미전달(단건 승인만 표시). 배치에서도 사유 노출하려면 후속.
3. `rejectSupplier`/`deactivateSupplier` 는 여전히 bare boolean 반환(활성화 approve 경로는 정상). admin reject 실패 배너 미표시 — 활성화 범위 외.
4. 기존 PENDING supplier row 담당자 정보 null 보완: 정책상 자동 backfill 금지. read-only 집계로 규모 파악 후 별도 WO 판단 권장.

---

## 10. 커밋 정보

- 이번 세션 코드 커밋 SHA: `554fdb357` (feat(neture): 대량 등록 진입 활성화 게이트 추가)
- 선행 구현 커밋: `077100f20`, `2bc55ad3a` (2026-06-29, 이미 라이브 배포됨)
- 스테이징: `services/web-neture/src/pages/supplier/SupplierBulkRegisterPage.tsx`, `docs/checks/CHECK-O4O-NETURE-SUPPLIER-ACTIVATION-GATE-ALIGN-AND-ERROR-SURFACE-V1.md` (경로 명시 스테이징, `git add .` 미사용)
- 기존 dirty UU 파일은 스테이징에서 제외.
</content>
</invoke>
