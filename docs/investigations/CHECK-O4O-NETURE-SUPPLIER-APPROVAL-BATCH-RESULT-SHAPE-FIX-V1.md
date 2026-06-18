# CHECK-O4O-NETURE-SUPPLIER-APPROVAL-BATCH-RESULT-SHAPE-FIX-V1

> **WO:** WO-O4O-NETURE-SUPPLIER-APPROVAL-BATCH-RESULT-SHAPE-FIX-V1
> **선행 IR:** [IR-O4O-NETURE-SUPPLIER-PROFILE-APPROVAL-TARGET-AUDIT-V1](./IR-O4O-NETURE-SUPPLIER-PROFILE-APPROVAL-TARGET-AUDIT-V1.md) (commit `1622b0cb8`)
> **일자:** 2026-06-18
> **범위:** frontend-only — Neture 운영자 회원관리 일괄 승인/거절 응답 shape 정규화

---

## 1. 문제

Neture 운영자 회원관리(`/operator/members`)에서 공급자 가입 승인/거절을 일괄 처리하면,
서버가 실제로 처리했거나 처리 가능한 상태임에도 UI가 항상 다음을 표시:

```
총 0건 / 성공 0건 / 처리 대상이 없습니다.
```

추가로 승인 성공 후에도 `successCount===0` 이라 목록이 새로고침되지 않았다.

## 2. 원인 (확정)

**응답 shape 계약 불일치 (IR §4.2, D형).**

- 서버 `POST /neture/operator/registrations/batch` 응답:
  `{ success, data: { succeeded: string[], failed: {id,error}[], total } }`
- 프론트 [useBatchAction.executeBatch](../../packages/operator-ux-core/src/list/useBatchAction.ts#L41) 기대:
  `res.data.results || res.data.data.results` → `[{ id, status, error }]`
- `netureMembersClient.batchUpdateStatus` 가 axios body(`r.data`)를 그대로 반환 →
  `.results` 가 없어 `items = []` → 항상 0건.

같은 화면의 정지/복원/탈퇴 `extraBulkActions` 는 이미 `{ data: { results: [...] } }` 를
반환하므로 정상 — 승인/거절 adapter 에만 정규화가 빠져 있었다.

### 승인 대상 필터(E형)는 변경 불요 — 이미 정렬됨

[MembershipConsoleController.getMembers](../../apps/api-server/src/controllers/operator/MembershipConsoleController.ts#L218)
는 `effectiveStatus = memberships[0].status`(service_memberships 우선)를 노출한다.
따라서 목록의 `user.status` = 멤버십 상태이며, client 승인 필터
(`selectedApprovableIds`: status ∈ {pending, rejected})와 server 필터
(`service_memberships.status IN ('pending','rejected')`)가 이미 일치한다.
이미 active 회원은 client-side(`selectedApprovableIds`)에서 제외되어 승인 버튼도 노출되지 않는다.
⇒ "총 0건" 의 실제 원인은 D형 단독. 필터 정렬 코드 변경은 하지 않았다.
(잔여 E-risk = 한 user에 다중 neture 멤버십이 있는 edge case — 범위 외.)

## 3. 수정 내용

- 파일: [services/web-neture/src/pages/operator/UsersManagementPage.tsx](../../services/web-neture/src/pages/operator/UsersManagementPage.tsx)
- `netureMembersClient.batchUpdateStatus` 에서 응답을 표준 batch result shape 로 정규화:

```ts
const payload = r.data?.data ?? r.data ?? {};
const succeeded = Array.isArray(payload.succeeded) ? payload.succeeded : [];
const failed    = Array.isArray(payload.failed) ? payload.failed : [];
const results = [
  ...succeeded.map((id) => ({ id, status: 'success' as const })),
  ...failed.map((f) => ({ id: f.id, status: 'failed' as const, error: f.error })),
];
return { data: { results } };
```

- 응답 래핑이 `{data:{...}}` 이든 평탄하든(`?? r.data`) 모두 수용하도록 방어.
- 공통 `useBatchAction` / `BulkResultModal` 등 공통 코드는 **미변경** (Neture adapter 한정).

## 4. 검증

| 항목 | 결과 |
|------|------|
| `tsc --noEmit` (web-neture) | ✅ PASS (오류 0) |
| 변경 범위 | UsersManagementPage.tsx 1개 파일, batchUpdateStatus 1개 메서드 |
| 공통 코드 영향 | 없음 (adapter 정규화만) |
| 기존 extraBulkActions(정지/복원/탈퇴) | 무변경 — 각자 `{data:{results}}` 반환, 회귀 없음 |

### 브라우저 smoke (배포 후 운영자 계정 권장 시나리오)
1. `https://neture.co.kr/operator/members` 접속
2. 승인대기(공급자) 회원 선택 → 승인 → 결과 모달의 총/성공/실패가 실제와 일치하는지 확인
3. 승인 성공 후 목록 refresh 및 해당 회원이 승인대기에서 사라지는지 확인
4. 이미 active 공급자는 승인 대상에 포함되지 않는지 확인
5. 정지/복원/탈퇴 일괄 작업 회귀 없음 확인

> 배포(main → CI/CD) 후 사용자 측 live smoke 로 최종 PASS 고정 예정.

## 5. 완료 조건 대비

| 조건 | 상태 |
|------|:----:|
| 1. 더 이상 무조건 "총 0건" 아님 | ✅ (shape 정규화) |
| 2. succeeded/failed/total 정확 반영 | ✅ |
| 3. 승인 성공 후 목록 refresh | ✅ (successCount>0 경로 복구) |
| 4. 승인 불가 대상 성공 오표시 없음 | ✅ (failed→status:'failed') |
| 5. 정지/복원/탈퇴 회귀 없음 | ✅ (무변경) |
| 6. write-path / neture_suppliers / backfill 미변경 | ✅ |
| 7. CHECK 문서 기록 | ✅ (본 문서) |

## 6. 제외 / 금지 준수

- ✅ 공급자 가입 write-path, `neture_suppliers` 생성 로직 변경 없음
- ✅ DB 수정 / 마이그레이션 / backfill 없음
- ✅ Neture 외 서비스 무변경, 공통 batch hook 무변경
- ✅ unrelated WIP 무간섭

## 7. 후속 (별도 WO)

공급자 프로필이 비어 보이는 문제(IR §5 C형)는 본 WO 범위 외 — 가입 시 `neture_suppliers`
미생성에서 비롯. 별도 처리:
- `WO-O4O-NETURE-SUPPLIER-REGISTRATION-PROFILE-WRITEPATH-FIX-V1`
- `WO-O4O-NETURE-SUPPLIER-PROFILE-CREATION-BACKFILL-V1` (read-only SELECT로 영향 계정 확정 후 별도 승인)
</content>
