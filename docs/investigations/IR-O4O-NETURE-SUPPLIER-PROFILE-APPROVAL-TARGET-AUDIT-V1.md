# IR-O4O-NETURE-SUPPLIER-PROFILE-APPROVAL-TARGET-AUDIT-V1

> **Read-only Investigation Report** — 코드/DB/마이그레이션 수정 없음.
> Neture 공급자 등록 후 운영자 회원관리 화면에서 (1) 공급자 프로필이 비어 보이고
> (2) 일괄 승인 시 `처리 대상 없음 / 총 0건`이 표시되는 원인을 확정한다.

- **유형**: IR (조사 전용)
- **일자**: 2026-06-18
- **범위**: 공급자 등록 write-path · 운영자 회원관리 read-path · 일괄 승인 target/응답 path · 영향 계정 DB 상태(검증 SQL 제시)
- **금지**: 코드 변경 / DB 변경 / 마이그레이션 / FE·BE 동작 변경 / 무관 WIP 손대지 않음

---

## 1. 현상

| # | 화면 관측 | 위치 |
|---|-----------|------|
| 1 | 회원 유형 = **공급자** 배지는 표시됨 | 회원 유형 컬럼 |
| 2 | **공급자 프로필** 컬럼은 비어 있음 (`—`) | 공급자 프로필 컬럼 |
| 3 | 선택 후 일괄 승인 → **총 0건 / 성공 0건 / 처리 대상이 없습니다** | BulkResultModal |

대상 화면: `services/web-neture/src/pages/operator/UsersManagementPage.tsx`
(`@o4o/operator-core-ui` 의 `OperatorMembersConsolePage` thin wrapper)

---

## 2. 저장 경로 (Write-path)

### 2.1 가입 시점 — neture_suppliers row는 생성되지 않는다

- 화면: `services/web-neture/src/components/RegisterModal.tsx` → `POST /auth/register`
- 처리: [auth-register.controller.ts](../../apps/api-server/src/modules/auth/controllers/auth-register.controller.ts)
  - `users` row 생성 (`businessInfo` JSONB 에 공급자 입력값 저장)
  - `service_memberships` row 생성: `service_key='neture'`, `status='pending'`, `role='supplier'` (unprefixed)
  - **`neture_suppliers` row는 생성하지 않음**
  - **`role_assignments` 도 이 시점엔 없음** (승인 시 생성)

> ⇒ 가입 직후 공급자는 `service_memberships.role='supplier'` 만 가지며, `neture_suppliers` 프로필 row는 **존재하지 않는다.**

### 2.2 가입 승인 시점 — neture_suppliers row가 lazy 생성된다

- [operator-registration.service.ts `approveRegistration()`](../../apps/api-server/src/modules/neture/services/operator-registration.service.ts#L90-L231)
  - `service_memberships.status → 'active'`
  - `users.status → 'active'`
  - `role_assignments` 에 `supplier` insert
  - **`role==='supplier'` 이면 `neture_suppliers` row를 `status='PENDING'` 으로 생성** (line 149-221), 이후 `organizations` 연동
  - 이미 존재하면 상태 유지

> ⇒ `neture_suppliers` 는 **가입 승인(`approveRegistration`) 경로를 통과해야만** 생성된다.
> 가입 승인을 다른 경로로 처리하면 row가 생기지 않는다 (§4.3 참조).

### 2.3 프로필 본문 — neture_suppliers / organizations / users.businessInfo 분산 저장

- `neture_suppliers`: `representative_name`, `manager_name/phone`, `business_type/item`, 정산/배송/연락처/`status` 등
- `organizations`: `business_number`, `address` (org SSOT, 2026-03-27 마이그레이션으로 neture_suppliers에서 이전됨)
- `users.businessInfo`(JSONB): 가입 입력 원본
- 온보딩(통신판매업/정산/품목군)은 별도 엔드포인트(`/supplier/onboarding`, `/supplier/regulated-categories`)로 `neture_suppliers` 및 `neture_supplier_regulated_categories` 에 저장

---

## 3. 조회 경로 (Read-path) — 두 데이터 소스의 분기

운영자 회원관리 목록은 **두 개의 독립 API**로 화면을 조립한다.

| 표시 항목 | 데이터 소스 | 호출 | Join key |
|-----------|-------------|------|----------|
| 회원 목록 + **공급자 배지(회원 유형)** | `service_memberships.role` ∪ `role_assignments` ∪ `users.role` | `GET /operator/members?serviceKey=neture` ([MembershipConsoleController](../../apps/api-server/src/controllers/operator/MembershipConsoleController.ts)) | `user_id` |
| **공급자 프로필 컬럼** | `neture_suppliers.status` | `GET /neture/operator/suppliers` → `userId→status` Map | `neture_suppliers.user_id` |

- 배지: `UsersManagementPage.tsx` `getPrimaryRole()` (line 51) — 토큰 집합에 `supplier`/`neture:supplier` 가 있으면 "공급자".
- 프로필 컬럼: `UsersManagementPage.tsx` line 237-256 의 `supplierStatusMap` — `operatorSupplierApi.getSuppliers()` 결과를 `userId→status` 로 매핑. **해당 userId의 `neture_suppliers` row가 없으면 `—` 표시** (line 305-306). 조회 실패 시에도 `—`.

> ⇒ 배지(membership.role 기반)와 프로필(neture_suppliers 기반)은 **서로 다른 테이블을 본다.**
> membership.role='supplier' 인데 neture_suppliers row가 없으면 → **배지는 뜨고 프로필은 비어 보인다.** 이는 §2.1/§4.3 상태에서 정상적으로 발생한다.

---

## 4. 승인 경로 (Approval-path)

### 4.1 일괄 승인 호출 체인

```
OperatorMembersConsolePage "승인" 버튼
 → selectedApprovableIds  (CLIENT 필터: user.status ∈ {pending, rejected})   [OperatorMembersConsolePage.tsx:415-422]
 → client.batchUpdateStatus(ids,'approved')                                   [UsersManagementPage.tsx:144-151]
 → POST /neture/operator/registrations/batch  { ids, action:'approve' }       [operator-registration.controller.ts:192-253]
 → approveRegistration(id)  (SERVER 필터: service_memberships.status ∈ {pending, rejected})  [operator-registration.service.ts:97-105]
 → 응답 { succeeded:[], failed:[], total }
 → useBatchAction.executeBatch 가 res.data.results 를 읽음                     [useBatchAction.ts:41]
 → BulkResultModal: results.length===0 → "처리 대상이 없습니다"                [BulkResultModal.tsx:95-98]
```

### 4.2 ★ 확정된 1차 원인 — 응답 shape 계약 불일치 (총 0건의 직접 원인)

[useBatchAction.ts:41](../../packages/operator-ux-core/src/list/useBatchAction.ts#L41) 는 다음 shape를 기대한다:

```ts
const items = res?.data?.results || res?.data?.data?.results || [];
// 기대: { results: [{ id, status:'success'|'failed', error? }] }
```

그러나 `netureMembersClient.batchUpdateStatus` 는 axios 응답 body 를 그대로 반환하고
([UsersManagementPage.tsx:144-151](../../services/web-neture/src/pages/operator/UsersManagementPage.tsx#L144-L151)),
서버 `/registrations/batch` 응답 shape 는:

```json
{ "success": true, "data": { "succeeded": ["..."], "failed": [{"id","error"}], "total": N } }
```

- `res.data.results` → `undefined` (res.data = `{succeeded,failed,total}`, `.results` 없음)
- `res.data.data.results` → `undefined`
- ⇒ `items = []`, `successCount = 0`
- ⇒ 모달은 **항상 "총 0건 / 처리 대상이 없습니다"** 를 표시하고, `successCount>0` 이 아니므로 목록도 새로고침되지 않는다.

> **서버가 실제로 승인에 성공했더라도** UI는 0건으로 보고한다.
> 비교: 같은 화면의 `extraBulkActions`(정지/복원/탈퇴)는 `{ data: { results: [...] } }` shape를 올바르게 반환하여 정상 동작한다 ([UsersManagementPage.tsx:369-417](../../services/web-neture/src/pages/operator/UsersManagementPage.tsx#L369-L417)). 즉 승인/거절 client adapter에만 shape 어댑터가 빠져 있다.

### 4.3 ★ 동시 기여 원인 — client/server 필터 소스 불일치 + 이미 active

- **CLIENT 필터**는 `user.status`(목록의 회원 상태)를, **SERVER 필터**는 `service_memberships.status` 를 본다. 두 status 원천이 다르면, client가 보낸 대상을 server가 `REGISTRATION_NOT_FOUND` 로 거른다.
- 선택된 회원이 이미 `service_memberships.status='active'` 이면(과거에 승인됨) server 필터 `IN ('pending','rejected')` 에서 제외 → `succeeded=0`.
- 특히 **가입 승인을 `approveRegistration` 이 아닌 다른 경로(Membership Console `/operator/members/:id/approve` 등)로 처리**했다면:
  - `service_memberships.status='active'` (재승인 대상 아님 → 일괄 승인 0건)
  - `neture_suppliers` row 미생성 (§2.2 미통과 → 공급자 프로필 `—`)
  - 두 현상이 **하나의 원인에서 동시에** 발생한다.

---

## 5. 원인 분류 (A~E)

| 구분 | 판정 | 근거 |
|------|:----:|------|
| A. 저장 자체 실패 | ❌ | `users`+`service_memberships`는 정상 저장 |
| B. 다른 테이블/shape에 저장 | △(부분) | 프로필은 `neture_suppliers`(승인 시 생성), 응답은 `{succeeded,failed,total}` shape |
| C. userId/supplierId/org join 깨짐 | △(부분) | join key(`user_id`)는 정상이나, **row 부재**로 프로필 join 결과가 비음 |
| D. FE가 obsolete field를 봄 | ✅ | **일괄 승인 응답 shape 불일치** (`results` vs `succeeded/failed/total`) — 총 0건의 직접 원인 |
| E. 승인 target filter 오류 | ✅ | client(`user.status`) vs server(`service_memberships.status`) 필터 소스 분기 + 이미 active 제외 |

**결론**: 두 현상은 **별개이나 같은 write-path 공백에서 갈라진다.**

1. **공급자 프로필 비어 보임** = **C형(neture_suppliers row 부재)**.
   `neture_suppliers` 는 가입 승인(`approveRegistration`) 경로에서만 lazy 생성되므로, 미승인(pending) 또는 비표준 승인 경로를 거친 공급자는 프로필이 `—` 다.
2. **일괄 승인 총 0건** = **D형(응답 shape 계약 불일치)이 1차**, **E형(필터 소스 분기/이미 active)이 2차**.
   shape 불일치 때문에 서버 성공 여부와 무관하게 UI가 0건으로 보고한다.

---

## 6. 수정 후보 (다음 WO 분기 — 본 IR에서는 미실행)

| 후보 WO | 대상 | 내용 |
|---------|------|------|
| **WO-…-SUPPLIER-APPROVAL-BATCH-RESULT-SHAPE-FIX-V1** | FE adapter | `batchUpdateStatus` 가 `{succeeded,failed,total}` → `{results:[{id,status,error}]}` 로 매핑하도록 어댑터 추가. (D형 — 총 0건 직접 해결) |
| **WO-…-SUPPLIER-APPROVAL-TARGET-FILTER-ALIGN-V1** | FE/BE | client 승인 target 필터를 membership status 기준으로 정렬, 또는 server 필터를 client status 원천과 일치. 이미 active 회원의 일괄 승인 UX 명확화. (E형) |
| **WO-…-SUPPLIER-PROFILE-CREATION-BACKFILL-V1** | BE/DB | membership.role='supplier' 인데 `neture_suppliers` row 없는 계정 backfill, 또는 등록 시점 생성으로 정책 변경. (C형) — **별도 승인 필요** |

선택은 §7 DB 검증 결과에 따른다.

---

## 7. 영향 계정 DB 검증 (read-only SELECT — 미실행, SQL만 제시)

> CLAUDE.md §0 상 read-only SELECT 는 Claude Code가 `gcloud sql` 채널로 수행 가능하나,
> 본 IR은 "DB 변경 없음" 원칙에 따라 **SELECT 검증 SQL을 제시**하고 실행은 승인 후 진행한다.

```sql
-- 1) 해당 계정의 membership status vs 공급자 프로필 row 존재 여부
SELECT u.id, u.email,
       sm.role            AS membership_role,
       sm.status          AS membership_status,
       ra.role            AS assigned_role,
       ns.id              AS supplier_row,
       ns.status          AS supplier_status
FROM users u
LEFT JOIN service_memberships sm
       ON sm.user_id = u.id AND sm.service_key = 'neture'
LEFT JOIN role_assignments ra
       ON ra.user_id = u.id AND ra.role = 'supplier' AND ra.is_active = true
LEFT JOIN neture_suppliers ns
       ON ns.user_id = u.id
WHERE u.email IN ('test@test.com', 'aop80@naver.com');  -- + 실제 문제 계정 추가
```

**판정 가이드**:
- `membership_status='pending'`, `supplier_row=NULL` → §2.1 정상 미승인 상태 (프로필 `—` 당연). 일괄 승인 0건은 **D형(shape)** 으로 확정.
- `membership_status='active'`, `supplier_row=NULL` → §4.3 비표준 승인 경로 통과. **C형 backfill 필요** + 일괄 승인 0건은 D/E 복합.
- `membership_status='active'`, `supplier_status='PENDING'` → 정상(프로필 컬럼에 "승인대기" 표시되어야 함). 컬럼이 `—` 면 `GET /neture/operator/suppliers` 조회 실패 의심.

---

## 8. 금지 사항 (준수 확인)

- ✅ 코드 수정 없음
- ✅ DB 변경 없음 (SELECT SQL은 제시만, 미실행)
- ✅ 마이그레이션 없음
- ✅ FE/BE 동작 변경 없음
- ✅ 무관 WIP 손대지 않음

---

## 부록 — 주요 파일/라인

| 경로 | 역할 |
|------|------|
| [services/web-neture/src/pages/operator/UsersManagementPage.tsx](../../services/web-neture/src/pages/operator/UsersManagementPage.tsx) | 회원관리 화면 · client adapter · 프로필 컬럼 |
| [packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx:415-440](../../packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx#L415-L440) | client 승인 target 필터 |
| [packages/operator-ux-core/src/list/useBatchAction.ts:41](../../packages/operator-ux-core/src/list/useBatchAction.ts#L41) | 응답 shape 기대(`results`) |
| [packages/ui/src/components/table/BulkResultModal.tsx:95-98](../../packages/ui/src/components/table/BulkResultModal.tsx#L95-L98) | "처리 대상이 없습니다" 렌더 조건 |
| [apps/api-server/src/modules/neture/controllers/operator-registration.controller.ts:192-253](../../apps/api-server/src/modules/neture/controllers/operator-registration.controller.ts#L192-L253) | `/registrations/batch` 응답 shape(`succeeded/failed/total`) |
| [apps/api-server/src/modules/neture/services/operator-registration.service.ts:90-231](../../apps/api-server/src/modules/neture/services/operator-registration.service.ts#L90-L231) | server 승인 필터 + neture_suppliers lazy 생성 |
| [apps/api-server/src/modules/auth/controllers/auth-register.controller.ts](../../apps/api-server/src/modules/auth/controllers/auth-register.controller.ts) | 가입 시 users+service_memberships 생성(neture_suppliers 미생성) |
</content>
</invoke>
