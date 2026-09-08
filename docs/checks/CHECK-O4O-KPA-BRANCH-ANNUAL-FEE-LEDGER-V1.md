# CHECK — 분회 연회비 정책·원장 (W5)

- **WO**: `WO-O4O-KPA-BRANCH-ANNUAL-FEE-LEDGER-V1`
- **일자**: 2026-09-08
- **판정**: **CLOSED** — 구현 + migration + 프로덕션 E2E 31항목 실측 · fixture 전량 원복
- **선행**: [W1](CHECK-O4O-KPA-BRANCH-ANNUAL-REPORT-TEMPLATE-SCHEMA-V1.md) · [W2](CHECK-O4O-KPA-BRANCH-ANNUAL-REPORT-SUBMISSION-V1.md) · [W3](CHECK-O4O-KPA-BRANCH-ANNUAL-REPORT-MEMBERSHIP-SYNC-V1.md) · [W4](CHECK-O4O-KPA-BRANCH-ANNUAL-REPORT-REVIEW-V1.md)
- **commit**: `a7914fd12` (migration + entity ×2 + service + controller + route + 운영자 UI + 회원 화면) · 본 CHECK 는 후속 커밋
- **환경**: 프로덕션 (`https://api.neture.co.kr` · DB `o4o_platform` · `kpa-branch-web`)

---

## 0. 결과 요약

| # | E2E 항목 | 결과 |
|:--:|---|:---:|
| 1 | 미인증 → 운영자 원장 API | ✅ 401 |
| 2 | 회원 → 운영자 원장 조회 | ✅ 403 `FORBIDDEN` |
| 3 | 운영자 정책 조회 (정책 0건) | ✅ 200 `items:[]` (기본 금액을 지어내지 않음) |
| 4 | 정책 없이 일괄 부과 | ✅ 409 `POLICY_INVALID` |
| 5 | 연도 정책 일괄 저장 (A1 300,000 · B1 150,000) | ✅ 200 |
| 6 | 음수 부과액 | ✅ 422 `FEE_VALUE_INVALID` |
| 7 | 회비구분 중복 | ✅ 422 `POLICY_INVALID` |
| 8 | 2026년 일괄 부과 | ✅ 200 `created:2 / targetCount:2 / skipped:[]` |
| 9 | 일괄 부과 재실행 (멱등) | ✅ 200 `created:0`, 전건 `ALREADY_ASSESSED` |
| 10 | 원장 목록 + 합계 | ✅ 구분별 금액 정확 (A1 300,000 · B1 150,000 · 합계 450,000) |
| 11 | `unpaid → partial` (10만원 납부) | ✅ `status:partial` · `outstanding:200000` |
| 12 | `partial → paid` (완납) | ✅ `status:paid` · `outstanding:0` |
| 13 | 납부액 있는 행을 면제 지정 | ✅ 422 `FEE_VALUE_INVALID` |
| 14 | `unpaid → exempt` | ✅ `status:exempt` · `outstanding:0` |
| 15 | `exempt → unpaid` (면제 해제, 부과액 복원) | ✅ `assessed:150000` 보존 |
| 16 | 회원 본인 조회 | ✅ 200 · **본인 1건만** |
| 17 | 운영자 본인 조회 | ✅ 200 · **본인 1건만** (운영자여도 남의 것이 섞이지 않음) |
| 18 | 타 분회 경로(`gangnamgu`) 운영자 API | ✅ 403 `BRANCH_SCOPE_MISMATCH` |
| 19 | 미소속 `ledgerId` PATCH | ✅ 404 `LEDGER_NOT_FOUND` |
| 20 | `status=paid` 필터 | ✅ 200 · 해당 건만 |
| 21 | `year=abcd` | ✅ 422 `YEAR_INVALID` |
| 22 | 한글 memo 저장 (UTF-8 왕복) | ✅ 16 octets / 6자 · DB 값 일치 |
| 23 | DB 실측 (상태·금액·납부일·`updated_by`) | ✅ `updated_by` = **운영자** (대상 회원 아님) |
| 24 | CHECK 제약 — "완납인데 납부액 0" 직접 UPDATE | ✅ `CHK_branch_fee_ledgers_status` 거부 |
| 25 | CHECK 제약 — "납부액 있는데 납부일 없음" | ✅ `CHK_branch_fee_ledgers_paid_at` 거부 |
| 26 | UNIQUE — 같은 (org,user,year) 중복 INSERT | ✅ `UQ_branch_fee_ledgers_org_user_year` 거부 |
| 27 | 신상신고 `fee.category` 연동 (회원 B1 → 을) | ✅ `values['fee.category']='B'` · `linkStatus='resolved'` |
| 28 | 신상신고 `fee.category` 연동 (운영자 A1 → 갑) | ✅ `'A'` · `resolved` (회원별로 다르게 해석) |
| 29 | 회원이 자기 원장 PATCH | ✅ 403 |
| 30 | 회원이 정책 저장 / 일괄 부과 | ✅ 403 (양쪽) |
| 31 | fixture 원복 + 접근 차단 확인 | ✅ 전량 0 복귀 · 403 `MEMBERSHIP_NOT_FOUND` |

---

## 1. 무엇을 만들었고 무엇을 만들지 않았나

**만든 것** — 분회가 연도별 회비를 부과하고 납부 사실을 기록하는 **단순 원장**.

**만들지 않은 것** (WO 원칙 그대로):

| 안 만든 것 | 이유 |
|---|---|
| 전국/지부/분회 회비 배분 | 부과액은 분회가 정한 한 숫자다. 배분은 분회 업무가 아니다 |
| PG 결제 · 송금 · 정산 | **돈이 이 시스템을 통과하지 않는다.** 운영자가 확인한 사실을 기록할 뿐이다 |
| 납부 이력(트랜잭션) 테이블 | 누적 납부액 + 최종 납부일로 충분하다. 분할납부 스케줄·독촉·이자 범위 밖 |
| 새 회비구분 코드계 | 기존 `kpa_members.fee_category` 를 그대로 쓴다 |
| 청구서 발행 · 알림 | W4 와 같은 판단 — 화면에서 확인한다 |

## 2. DB 변경

migration `20270325000000-CreateBranchFeeLedger` (프로덕션 적용 확인: `typeorm_migrations` 등재 + 테이블 2개 생성).

### `branch_fee_policies` — 분회 × 연도 × 회비구분 → 부과액

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `organization_id` | uuid | `kpa_organizations.id` (분회) |
| `year` | int | |
| `fee_category` | varchar(50) | `kpa_members.fee_category` 와 **같은 코드계** |
| `amount` | int | 연 부과액(원) · `CHK … >= 0` |
| `memo` | text | |

`UNIQUE(organization_id, year, fee_category)` — 분회별 정책 독립.

**연도별로 행을 새로 만든다.** 2026 정책을 고쳐서 2027 을 만들지 않는다 —
과거 연도의 부과 근거가 사라지면 이미 부과된 원장을 설명할 수 없다.

### `branch_fee_ledgers` — 분회 × 연도 × 회원 → 부과 · 납부

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `organization_id` / `user_id` / `year` | uuid / uuid / int | |
| `fee_category` | varchar(50) NULL | **부과 시점 스냅샷** |
| `assessed_amount` / `paid_amount` | int | |
| `paid_at` | timestamptz NULL | |
| `status` | varchar(20) | `unpaid` / `partial` / `paid` / `exempt` |
| `memo` | text | |
| `updated_by` | uuid NULL | 마지막으로 바꾼 **운영자** |

제약·인덱스 (전부 프로덕션 실측):

| 이름 | 내용 |
|---|---|
| `CHK_branch_fee_ledgers_amounts` | 금액 음수 금지 |
| `CHK_branch_fee_ledgers_status` | status ↔ 금액 정합. `exempt` 만 예외이며 납부액 0 을 요구 |
| `CHK_branch_fee_ledgers_paid_at` | 납부액이 있으면 납부일이 있고, 없으면 없다 |
| `UQ_branch_fee_ledgers_org_user_year` | 한 분회에서 한 해에 한 행 |
| `IDX_branch_fee_ledgers_outstanding` | `status IN ('unpaid','partial')` 부분 인덱스 (미납 조회) |
| `IDX_branch_fee_ledgers_user_org` | `(user_id, organization_id)` — **user_id 단독 인덱스를 만들지 않았다** |

**왜 status 를 DB 가 강제하는가.** status 는 금액에서 파생되는 값이라 애플리케이션이
한 번만 잘못 써도 "완납인데 납부액 0" 같은 행이 남는다. 원장은 사후에 고치기 어려우므로
계산 규칙을 CHECK 로 못 박았다. 실측 24·25 에서 **앱을 우회한 직접 UPDATE 도 거부**됨을 확인했다.

## 3. 상태 모델

```text
       ┌──────────── 금액에서 파생 ────────────┐
unpaid ──(일부 납부)──▶ partial ──(완납)──▶ paid
   │                        │                 │
   └──────── exempt ◀───────┴─────────────────┘   (면제 = 운영자 판정 · 납부액 0 필요)
```

- `deriveStatus(assessed, paid, exempt)` **한 함수**만 status 를 정한다.
  화면도 API 도 status 를 보내지 않는다 — 보낸 상태를 믿으면 목록과 저장값이 어긋난다.
- **면제를 "부과액 0" 으로 표현하지 않았다.** 0원 부과와 면제는 다른 사실이고,
  0으로 뭉개면 면제를 풀었을 때 원래 부과액을 복원할 수 없다.
  실측 15: `exempt → unpaid` 해제 후 `assessed_amount=150000` 그대로 남았다.
- 부과액 0원인 행은 `exempt` 로 만든다 (CHECK 가 `assessed=0` 인 `unpaid` 를 허용하지 않고,
  "낼 것이 없는 사람"을 미납 목록에 남기지 않는 편이 운영 실무에 맞다).

## 4. API

기존 operator 가드 2겹(`requireKpaBranchScope` + `resolveBranch` + `requireBranchScope`)을
**그대로 재사용**한다. 회비 전용 가드를 새로 만들지 않았다.

| Method | Path | 비고 |
|---|---|---|
| GET | `/branches/:slug/operator/fee-policies?year=` | |
| PUT | `/branches/:slug/operator/fee-policies/:year` | **연도 단위 일괄 저장** |
| GET | `/branches/:slug/operator/fee-ledgers?year=&status=` | 합계 포함 |
| POST | `/branches/:slug/operator/fee-ledgers/assess` | 연도 일괄 부과 (멱등) |
| PATCH | `/branches/:slug/operator/fee-ledgers/:ledgerId` | 개별 수정 · **status 를 받지 않는다** |
| GET | `/branches/:slug/me/fees` | 회원 본인 조회 (쓰기 경로 없음) |

- 본문의 `organizationId` / `userId` 는 **읽지 않는다.** tenant 는 `:branchSlug` 로만 정해진다.
- 모든 조회가 `organization_id` 로 시작한다 — UUID 단독 조회 없음 (CLAUDE.md §7 Guard 1).
  실측 19: 미소속 `ledgerId` → 404.
- **정책에 항목 PATCH 를 만들지 않았다.** 정책은 표 한 장이고 부분 수정하면 화면과 DB 가
  조용히 어긋난다. 보낸 목록이 그 연도 정책의 전부가 되고, 다른 연도는 건드리지 않는다.

## 5. 일괄 부과의 계약

```text
대상 = 이 분회 active 소속 회원 (branch_memberships)
       LEFT JOIN kpa_members   ← 원장이 없어도 대상에서 빼지 않는다
```

- **멱등이다.** 이미 행이 있으면 건너뛴다 (`ALREADY_ASSESSED`). 실측 9: 재실행 `created:0`.
  재실행이 납부 기록을 지우지 않고 금액을 소급 변경하지도 않는다 —
  부과 후 정책이 바뀌어도 이미 낸 사람의 부과액이 달라지면 안 된다. 개별 조정은 PATCH 로 한다.
- 회비구분이 없거나 그 구분의 정책이 없으면 **0원으로 만들어 넣지 않고 사유를 돌려준다**
  (`NO_FEE_CATEGORY` / `NO_POLICY`). 조용히 누락되면 운영자가 빠진 사람을 알 수 없다.
- 동시 실행은 `ON CONFLICT DO NOTHING` 으로 흡수한다.

## 6. 신상신고 `fee.category` 연동

W1 CHECK F2 에서 "연결 원장 없음 → `not_linked`" 로 남겨둔 항목이 원장을 얻었다.

```text
resolveAssociationValues('fee.category')
  → 그 해 branch_fee_ledgers.fee_category   (부과 시점 스냅샷 · 우선)
  → kpa_members.fee_category                (원장 폴백)
  → 둘 다 없으면 null + not_linked
```

세분류(`A1_pharmacy_owner`)를 양식의 대분류(`A`/`B`/`C`/`D` = 갑/을/병/정)로 옮긴다.
**매핑표를 두지 않고 첫 글자를 쓴다** — 회비 체계가 바뀌어 `A3` 가 생겨도 코드를 고칠 필요가 없다.
첫 글자가 A~D 가 아니면 **추정하지 않고 `not_linked`** 로 둔다 (§4 가짜 값 금지).

실측 27·28: 같은 API 가 회원(B1)에게 `'B'`, 운영자(A1)에게 `'A'` 를 냈고 둘 다 `resolved` 다.

> `fee.exemptionType` 은 여전히 `not_linked` 다. 면제 **사유 구분**(미취업자/회비면제자)은
> 이번 원장이 갖고 있지 않다 — `status='exempt'` 는 면제 여부이지 사유가 아니다.
> 사유를 원장에 넣는 것은 별도 판단이므로 지어내지 않았다.

## 7. 화면

| 화면 | 경로 | 내용 |
|---|---|---|
| 운영자 | `/{slug}/operator/fees` | ① 연도 정책(구분별 부과액) ② 회비 원장(합계 4칸 + 목록 + 인라인 수정 + 일괄 부과) |
| 회원 | `/{slug}/mypage/fees` | 연도별 부과·납부·상태 **조회 전용** |

- 회원 화면에 납부 버튼·PG 진입점이 없다. 납부는 운영자가 기록하는 사실이다.
- 상태 배지는 서버가 준 `status` 를 그대로 쓴다. 화면이 다시 계산하지 않는다.
- `outstanding` 도 서버 계산값이다 (면제는 0). 화면에서 `assessed - paid` 를 다시 하지 않는다.

## 8. fixture · 원복

프로덕션에 `kpa-branch` 접근계정이 0명이고 `kpa_members.fee_category` 보유 회원이 0명이라
검증용 fixture 를 만들고 검증 후 전부 되돌렸다. **제품에 우회 로직은 넣지 않았다.**
범위는 사용자가 지정한 **검증 2계정 + namgu 분회 + 그 2계정의 `fee_category`** 로 한정했다.

| 대상 | before | 부여 | after (원복) |
|---|:--:|:--:|:--:|
| `service_memberships` (kpa-branch) | 0 | 2 | **0** |
| `role_assignments` (`kpa-branch:*`) | 0 | 2 | **0** |
| `branch_memberships` | 0 | 2 | **0** |
| `branch_fee_policies` | 0 | 2 | **0** |
| `branch_fee_ledgers` | 0 | 2 | **0** |
| `kpa_members.fee_category` (2계정) | NULL / NULL | A1 / B1 | **NULL / NULL** |
| `kpa_members` 총 행수 | 7 | 7 | **7** |
| `annual_reports` | 0 | 0 | **0** |

- 타 회원 5명의 `kpa_members` 행 · 타 분회 227개 · 타 서비스 데이터는 **건드리지 않았다.**
- 로그인은 L1(플랫폼 자격)로 했다 — `service_credentials` 를 만들지 않았으므로 그 축은 baseline 그대로다.
- 원복 확인: 두 계정 모두 `403 MEMBERSHIP_NOT_FOUND` (운영자 API · `/me/fees` 양쪽).

### 제약 기록

1. **검증 계정 2개는 실사용 계정이다** (`sohae2100` · `renagang21`). 프로덕션에 전용 테스트
   계정이 없어 SSOT(`docs/local/TEST-ACCOUNTS.local.md`)에 등재된 계정을 썼다.
   두 계정의 `kpa_members.fee_category` 는 검증 중에만 값을 가졌고 NULL 로 복귀했다.
2. **`kpa_members.fee_category` 폴백 경로는 단독으로 실측하지 못했다.** 부과 후에는
   두 계정 모두 원장 행을 가져 우선순위상 ledger 가 이겼다. 폴백은 코드 경로와
   "원장 없는 연도" 로직으로만 확인했다.
3. **브라우저 로그인 smoke 는 하지 않았다.** kpa-branch 의 L2 `service_credentials` 가
   0건이고 비밀번호를 만들지 않았다. 화면은 typecheck + API 실측으로 확인했다.
4. **한글 payload 전송 시 셸 인코딩 함정** — `curl -d '{"memo":"한글"}'` 은 이 환경에서
   바이트가 깨져 저장된다(10자/28옥텟). UTF-8 파일 + `--data-binary @file` 로 재전송하니
   16옥텟/6자로 정확히 왕복했다(실측 22). **제품 결함이 아니라 검증 도구 함정**이다.
5. `status` 필터에 정의되지 않은 값이 오면 무시하고 전체를 반환한다(400 아님).
   W4 와 같은 판단 — 필터는 편의 기능이고 tenant 경계와 무관하다.

## 9. 범위 밖 (건드리지 않음)

전국·지부 회비 배분 · PG 결제 · 송금 · 정산 · 청구서 · 독촉 · 이자 · 분할납부 스케줄 ·
납부 이력 테이블 · 회비 감면 신청 워크플로 · 연수교육 평점 원장(다음 W6) ·
`fee.exemptionType` 원장화(§6).

---

## 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건 — **해당 없음**
