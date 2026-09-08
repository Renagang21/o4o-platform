# CHECK — 신상신고 운영자 검수·승인 (W4)

- **WO**: `WO-O4O-KPA-BRANCH-ANNUAL-REPORT-REVIEW-V1`
- **일자**: 2026-09-08
- **판정**: **CLOSED** — 구현 + migration + 프로덕션 E2E 15항목 실측 (1항목은 제약 기록, §9)
- **선행**: [W1](CHECK-O4O-KPA-BRANCH-ANNUAL-REPORT-TEMPLATE-SCHEMA-V1.md) · [W2](CHECK-O4O-KPA-BRANCH-ANNUAL-REPORT-SUBMISSION-V1.md) · [W2 종결](CHECK-O4O-KPA-BRANCH-ANNUAL-REPORT-SUBMISSION-PRODUCTION-E2E-CLOSURE-V1.md) · [W3](CHECK-O4O-KPA-BRANCH-ANNUAL-REPORT-MEMBERSHIP-SYNC-V1.md)
- **commit**: `5ca60e56e` (migration + entity + service + controller + route + 운영자 UI + 회원 화면) · 본 CHECK 는 후속 커밋
- **환경**: 프로덕션 (`https://api.neture.co.kr` · DB `o4o_platform` · `kpa-branch-web`)

---

## 0. 결과 요약

| # | E2E 항목 | 결과 |
|:--:|---|:---:|
| 1 | fixture 준비 (접근계정·신고서) | ✅ §8 |
| 2 | 운영자 검수 목록 200 | ✅ 2건·`changedLabels` 포함 |
| 3 | 운영자 검수 상세 200 (제출 스냅샷·양식 version·원장 diff) | ✅ |
| 4 | 회원이 운영자 API 호출 → 차단 | ✅ 403 `FORBIDDEN` |
| 5 | 다른 분회 경로 접근 → 차단 | ✅ 403 `BRANCH_SCOPE_MISMATCH` |
| 6 | submitted → revision_requested (보완요청) | ✅ 200 `round:1` |
| 7 | 회원 화면에 보완사유 노출 | ✅ `revisionReason` + `readonly:false` |
| 8 | 회원 수정 후 재제출 (제품 API) | ✅ 200 `status:submitted` |
| 9 | submitted → approved (승인) | ✅ 200 `approvedAt`/`approvedBy` |
| 10 | 승인 후 회원 편집 차단 | ✅ 409 `ALREADY_APPROVED` (draft·submit 양쪽) |
| 11 | 승인 전 sync 차단 | ✅ 409 `REPORT_NOT_APPROVED` (draft·submitted 양쪽) |
| 12 | 승인 후 sync 성공 + 재실행 no-op | ✅ 200 `applied:true` → `alreadySynced:true` |
| 13 | 검수한 제출본 스냅샷 불변 | ✅ `revision_history[0].values` md5 동일 |
| 14 | 타 회원 원장 불변 | ✅ 무변경 |
| 15 | fixture·원장 원복 | ✅ 접근계정 0 · 신고서 0 · 원장 baseline 복귀 |

추가 실측: 승인만으로 `kpa_members` 가 바뀌지 않음(§6) · UUID 단독조회 404 · `year=abcd` 422.

---

## 1. 상태 전이

```text
draft ──submit──▶ submitted ──approve──▶ approved
                     │  ▲
     request-revision │  │ submit (재제출)
                     ▼  │
             revision_requested
```

- 4상태: `draft | submitted | revision_requested | approved`. **역방향 전이 없음.**
- `rejected` 는 **만들지 않았다.** 분회 신상신고에서 "반려"의 실제 업무 의미는
  "고쳐서 다시 내라" 이고 그것이 `revision_requested` 다. 두 상태를 함께 두면
  운영자가 어느 쪽을 눌러야 하는지 규칙이 생기지 않는다 (WO §1 의 "중복이면 만들지 않는다").
- 회원이 값을 고칠 수 있는 상태 = `MEMBER_EDITABLE_STATUSES = ['draft','revision_requested']`
  (entity 에 선언하고 controller·화면이 같은 상수를 쓴다).
- 검수 가능 상태 = `REVIEWABLE_STATUSES = ['submitted']`.

## 2. DB 변경

migration `20270324000000-AddAnnualReportReview`.

| 컬럼 | 타입 | 용도 |
|---|---|---|
| `revision_reason` | text | 보완요청 사유 (회원 화면에 그대로 노출) |
| `revision_requested_at` | timestamptz | |
| `revision_requested_by` | uuid | 운영자 |
| `approved_at` / `approved_by` | timestamptz / uuid | 승인 |
| `revision_history` | jsonb NOT NULL DEFAULT `'[]'` | **검수한 제출본 스냅샷 보존** (§5) |

제약·인덱스:

| 이름 | 내용 |
|---|---|
| `CHK_annual_reports_status` | 4상태로 확장 |
| `CHK_annual_reports_submitted_at` | draft 는 NULL, 그 외는 NOT NULL |
| `CHK_annual_reports_synced_approved` | `synced_to_membership=false OR status='approved'` (기존 `..._synced_submitted` 대체) |
| `CHK_annual_reports_review_fields` | 승인/보완 필드의 짝 무결성 |
| `IDX_annual_reports_review_pending` | `status='submitted'` 부분 인덱스 |
| `IDX_annual_reports_sync_pending` | `approved AND NOT synced` 로 재생성 |

**§7 계약 변경 영향 분석** — W3 은 "sync 가능 = submitted" 였고 W4 는 "= approved" 로 좁힌다.

- 데이터: migration 적용 시점 프로덕션 `annual_reports` **0행** → 기존 행을 위반시키지 않는다.
- 코드: sync 게이트는 `AnnualReportMembershipSyncService` 한 곳뿐이고, 호출 경로도
  운영자 `/sync` 라우트 하나뿐이다. submitted 를 직접 sync 하던 소비처는 없다.
- 문서: W3 CHECK 는 그 시점의 사실 기록이므로 수정하지 않는다 (CLAUDE.md §16-1 — 기록물은 정비 대상 아님).
  현행 계약은 본 문서다.

## 3. 운영자 검수 API

tenant 는 기존 `:branchSlug` 경로를 그대로 쓴다. 본문의 `organizationId`/`userId` 는 **읽지 않는다.**

| Method | Path | 비고 |
|---|---|---|
| GET | `/branches/:branchSlug/operator/annual-reports` | 필터 `year`, `status` **2개뿐** |
| GET | `.../annual-reports/:reportId` | 제출 스냅샷 + 양식 version + 원장 diff |
| POST | `.../annual-reports/:reportId/approve` | |
| POST | `.../annual-reports/:reportId/request-revision` | `reason` 필수 (1000자) |
| POST | `.../annual-reports/:reportId/sync` | W3. `approved` 에서만 성공 |

모든 조회는 `r.organization_id = $1` 로 시작한다 — **UUID 단독 조회 없음** (CLAUDE.md §7 Guard 1).
실측: 존재하지 않는/타 분회 reportId → `404 REPORT_NOT_FOUND`.

## 4. 검수 화면

`services/web-kpa-branch/src/pages/operator/AnnualReportsReviewPage.tsx` (`/{slug}/operator/annual-reports`).

- 목록 열: 회원 · 신고년도 · 제출일 · 상태 · 주요 변경사항 · 원장 반영 (WO §3 그대로).
- 상세: **제출 당시 값을 그대로** 렌더한다. 현재 회원정보를 재주입하지 않으므로
  전출·개명 이후에도 과거 신고서가 변하지 않는다 (WO §4).
- 양식 version 표시, 원장값 → 신고값 diff, 보완요청 이력 목록.
- diff 판정은 `AnnualReportMembershipSyncService.diffAgainstLedger()` 를 재사용한다 —
  **검수 화면이 보여주는 판단과 실제 sync 판단이 같은 코드**여야 하기 때문이다.

## 5. 보완요청과 스냅샷 보존

보완요청은 회원의 편집을 다시 열어준다. 그대로 두면 회원이 `values` 를 덮어써
**운영자가 검수한 내용이 사라진다.** 그래서 `request-revision` 이 되돌리기 직전에
그 시점의 제출본을 `revision_history` 에 push 한다.

```json
{ "round": 1, "submittedAt": "...", "values": {...}, "templateId": "...",
  "reason": "...", "requestedBy": "...", "requestedAt": "..." }
```

재제출 시 `revision_reason/at/by` 는 비우되 **`revision_history` 는 건드리지 않는다.**
실측(E2E 13): 재제출 후 `revision_history[0].values` md5 = 최초 제출본 md5, 현재 `values` 는 다름.

## 6. 승인과 sync 계약

- `approve()` 는 상태·`approved_at`·`approved_by` 만 쓴다. **`kpa_members` 를 건드리지 않는다.**
  실측: 승인 직후 대상 회원 원장 4필드 무변경.
- 원장 반영은 별도 `/sync` 호출. 흐름은 `submitted → 검수 → approved → 운영자가 sync`.
- 승인 전 sync 는 `draft`·`submitted` 양쪽에서 409 `REPORT_NOT_APPROVED`.

## 7. 회원 화면

- 상태 라벨 4종 + 보완 횟수 표시.
- `revision_requested` 면 **사유를 그대로 보여주고** 편집·재제출을 허용, 버튼은 "재제출".
- `approved` 면 읽기 전용 ("분회에서 승인이 완료되어…").
- 알림 시스템은 만들지 않았다 (WO §11). 사유는 화면에서 확인한다.

**신고기간과 재제출** — `revision_requested` 재제출은 기간 제한을 받지 않는다.

```ts
canSubmitNow(period, status) => period === 'open' || status === 'revision_requested'
```

운영자가 되돌린 신고서는 이미 기간 안에 제출된 건이고, 기간으로 막으면
"보완하라고 열어놓고 고칠 수는 없는" 막다른 길이 된다. 이 예외는 **요청자의 역할과 무관하게
신고서 상태에만** 걸리므로 W2 가 정리한 "기간 정책은 role 무관" 원칙과 충돌하지 않는다.

## 8. fixture · 원복

프로덕션에 `kpa-branch` 접근계정이 0명이고 2026 신고기간(2026-01-01~02-28)이 이미 닫혀 있어
검증용 fixture 를 임시로 만들고 검증 후 전부 되돌렸다. **제품에 우회 로직은 넣지 않았다** (WO §10).

| 대상 | before | 부여 | after (원복) |
|---|:--:|:--:|:--:|
| `service_memberships` (kpa-branch) | 0 | 2 | **0** |
| `role_assignments` (`kpa-branch:*`) | 0 | 2 | **0** |
| `branch_memberships` | 0 | 2 | **0** |
| `service_credentials` (kpa-branch) | 0 | 2 | **0** |
| `annual_reports` | 0 | 2 | **0** |
| `kpa_members` (검증 회원 4필드) | baseline | sync 로 3필드 변경 | **baseline 복귀** |

- `service_credentials` 는 각 계정의 기존 `kpa-society` `password_hash` 를 복사해 넣었다
  (비밀번호를 다루지 않는 되돌릴 수 있는 fixture). 원복 시 행 자체를 삭제했다.
- 원복 확인: 운영자 목록 재호출 → `403 MEMBERSHIP_NOT_FOUND`.

### 제약 기록

1. **최초 `submitted` 상태는 SQL 로 만들었다.** 신고기간이 닫혀 있어 첫 제출을 제품 API 로
   만들 수 없다. W3 §3-2 와 같은 제약이며, 209개 분회가 공유하는
   `annual_report_templates.period_end` 를 검증 목적으로 늘리지 않는다는 판단도 그대로다.
   다만 **재제출(`revision_requested → submitted`)은 제품 API 로 실제 통과**시켰으므로,
   제출 경로 자체가 검증되지 않은 것은 아니다.
2. **타 분회 소속 신고서를 직접 만들어 404 를 보는 시나리오는 수행하지 못했다.**
   행의 `organization_id` 를 다른 분회로 옮기는 쓰기가 안전 정책상 차단됐다. 대신
   (a) 타 분회 경로 접근 403, (b) 미소속 reportId 404, (c) 모든 쿼리가
   `organization_id` 로 시작한다는 코드 사실로 대체 확인했다.
3. **브라우저 로그인 smoke 는 하지 않았다.** 검증 계정 비밀번호를 세션 기록에 남기지 않기 위해서다
   (CLAUDE.md §15). 화면은 typecheck/build 와 API 실측으로 확인했다.
4. 목록의 `status` 필터에 정의되지 않은 값이 오면 **무시하고 전체를 반환**한다(400 아님).
   필터는 편의 기능이고 tenant 경계와 무관하므로 그대로 둔다.

## 9. 범위 밖 (건드리지 않음)

다단계 결재 · 담당자 배정 · 복수 운영자 승인 · 전자결재 · 회비/교육 검수 · 외부 약사회 전송 ·
알림 시스템. `rejected` 상태도 §1 판단에 따라 만들지 않았다.
