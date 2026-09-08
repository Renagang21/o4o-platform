# CHECK — 분회 연수교육 평점 원장 (W6)

- **WO**: `WO-O4O-KPA-BRANCH-CONTINUING-EDUCATION-CREDIT-LEDGER-V1`
- **일자**: 2026-09-08
- **판정**: **CLOSED** — 재사용 조사 + 구현 + migration + 프로덕션 E2E 22항목 실측 · fixture 전량 원복
- **선행**: [W1](CHECK-O4O-KPA-BRANCH-ANNUAL-REPORT-TEMPLATE-SCHEMA-V1.md) · [W2](CHECK-O4O-KPA-BRANCH-ANNUAL-REPORT-SUBMISSION-V1.md) · [W3](CHECK-O4O-KPA-BRANCH-ANNUAL-REPORT-MEMBERSHIP-SYNC-V1.md) · [W4](CHECK-O4O-KPA-BRANCH-ANNUAL-REPORT-REVIEW-V1.md) · [W5](CHECK-O4O-KPA-BRANCH-ANNUAL-FEE-LEDGER-V1.md)
- **commit**: `a8acb1a7a` (migration + entity + service + controller + route + 운영자 UI + 회원 화면) · 본 CHECK 는 후속 커밋
- **환경**: 프로덕션 (`https://api.neture.co.kr` · DB `o4o_platform` · `kpa-branch-web`)

---

## 0. 결과 요약

WO §9 필수 15항목 + 추가 7항목.

| # | E2E 항목 | 결과 |
|:--:|---|:---:|
| 1 | 운영자 연도별 원장 조회 (개설 전) | ✅ 200 `items:[]` (기본 의무평점을 지어내지 않음) |
| 2 | 회원 원장 생성 (연도 개설) | ✅ 200 `created:2 / targetCount:2` |
| 2b | 개설 재실행 (멱등) | ✅ 200 `created:0`, 전건 `ALREADY_OPEN` |
| 3 | required/completed 입력 | ✅ `numeric` 이 숫자로 역직렬화 (`8`, 문자열 `"8.0"` 아님) |
| 4 | 부분 이수 상태 | ✅ 8 중 6 → `incomplete` · `remaining:2` |
| 4b | 반평점 (0.5 단위) | ✅ 6.5 → `remaining:1.5` |
| 5 | 완전 이수 상태 | ✅ 8 → `complete` · `remaining:0` |
| 5b | 초과 이수 | ✅ 10 → `complete` · `remaining:0` (음수 안 됨) |
| 6 | 면제 | ✅ `exemptionType:exempt` → `status:exempt` |
| 6b | 유예 | ✅ `exemptionType:deferred` → `status:exempt` |
| 6c | 면제 해제 (의무평점 복원) | ✅ `required:8` 보존 · `incomplete` 복귀 |
| 7 | 회원 본인 조회 | ✅ 200 · **본인 1건만** |
| 8 | 타 회원 원장 조회 차단 | ✅ 403 `FORBIDDEN` |
| 9 | 타 분회 접근 차단 (운영자·회원 양쪽) | ✅ 403 `BRANCH_SCOPE_MISMATCH` |
| 10 | member 수정 API 403 (타인·본인·개설 3경로) | ✅ 전건 403 |
| 10b | 미인증 | ✅ 401 |
| 10c | 미소속 `ledgerId` PATCH | ✅ 404 `LEDGER_NOT_FOUND` |
| 11 | 신상신고 `training.*` 실제 값 resolve | ✅ `2026 / 8 / 6` · 3필드 모두 `resolved` |
| 12 | `training.*` payload 변조 무시 | ✅ `ignoredKeys` 5건 · 저장값은 원장값 유지 |
| 13 | 제출 snapshot 불변 | ✅ 원장 12/7.5 로 변경해도 snapshot md5 동일 (8/6 유지) |
| 14 | 타 서비스 회귀 0 | ✅ `lms_courses` 11 · `lms_enrollments` 11 · `credit_transactions` 13 (전부 불변) |
| 15 | fixture 원복 | ✅ 전량 0 복귀 · 403 `MEMBERSHIP_NOT_FOUND` |

추가 실측: 입력 검증 4종(0.5 단위 아님 · 잘못된 면제구분 · 면제 아닌데 의무 0 · 개설 의무 0) 전부 422 ·
DB 제약 5종 앱 우회 거부.

---

## 1. 재사용 조사 (WO §8) — 재사용 가능한 active 구조 없음

**구현 전에 프로덕션에서 실측했다.** "중복 원장을 만들 위험"이 이 WO 의 가장 큰 리스크였다.

| 후보 | 실측 | 판정 |
|---|---|---|
| `CreditRecord` (lms-yaksa) | **소스 삭제됨.** `packages/lms-yaksa/` 에 `dist/` + `node_modules/` 만 잔존하며 **git 미추적** | dead scaffold — 복원하지 않는다 |
| `credit_balances` (3행) | `userId, balance` | **포인트·정산성 크레딧** — 연수교육 무관 |
| `credit_transactions` (13행) | `amount, transactionType, sourceType, referenceKey` | 위와 같은 축 — 연수교육 무관 |
| `lms_certificates` (1행) | `credits = 0.00` · `courseId` 필수 · 분회 축 없음 | 데이터 없음 · course 결합 |
| `lms_courses` (11) / `lms_enrollments` (11) | `organizationId`·`service_key` 는 있으나 강좌 모델 | "회원 × 연도 × 인정평점" 축이 아니다 |

> 참고로 삭제된 `CreditRecord` 의 설계는 `courseId` / `certificateId` / `enrollmentId` 를 갖는
> **강좌 결합 건별 기록**이었다. 이번 WO 가 요구하는 "분회가 확인·관리하는 연도 평점"과
> 축이 다르므로, 살아 있었더라도 그대로 쓸 수 없었다.

**결론**: 신규 원장이 중복이 아니다. **LMS 테이블은 읽지도 쓰지도 않는다** (E2E 14 로 불변 확인).

## 2. 데이터 모델

migration `20270326000000-CreateBranchEducationCreditLedger` (프로덕션 적용 확인).

### `branch_education_credit_ledgers` — 분회 × 연도 × 회원

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `organization_id` / `user_id` / `year` | uuid / uuid / int | |
| `required_credits` / `completed_credits` | numeric(4,1) | **0.5 평점이 실재하므로 int 로 자르지 않는다** |
| `exemption_type` | varchar(20) NULL | `exempt`(면제) / `deferred`(유예) |
| `status` | varchar(20) **GENERATED** | 아래 §3 |
| `memo` | text | 면제·유예 사유 등 |
| `updated_by` | uuid NULL | 마지막으로 바꾼 **운영자** |

| 제약 · 인덱스 | 내용 |
|---|---|
| `CHK_branch_edu_credits_amounts` | 평점 음수 금지 |
| `CHK_branch_edu_credits_exemption_type` | `exempt` / `deferred` 2종만 |
| `CHK_branch_edu_credits_required` | 면제가 아니면 의무평점 > 0 |
| `UQ_branch_edu_credits_org_user_year` | 한 분회에서 한 해에 한 행 |
| `IDX_branch_edu_credits_incomplete` | `status='incomplete'` 부분 인덱스 |
| `IDX_branch_edu_credits_user_org` | `(user_id, organization_id)` — **user_id 단독 인덱스 없음** |

**`_entries` 테이블을 만들지 않았다** (WO §1 판단). 운영자 기능(§3)·회원 화면(§4)이 요구하는
값은 의무평점·인정평점·상태뿐이고, **건별 발생내역은 대한약사회 시스템이 갖는 원본**이다.
분회가 사본을 관리하기 시작하면 원본과 어긋나는 두 번째 원장이 생긴다.
W5 회비 원장에 납부 이력 테이블을 두지 않은 것과 같은 판단이다.

**의무평점 정책 테이블도 만들지 않았다** (WO §3 최소). 의무평점은 연도 개설 시 한 숫자로 받고,
회원별 차이는 개별 PATCH 로 조정한다. 회비(W5)는 회비구분별 금액표가 필요해 정책 테이블을 뒀지만
연수교육 의무평점에는 구분 축이 없다.

## 3. 상태 / 평점 계산 계약

```sql
status GENERATED ALWAYS AS (
  CASE WHEN exemption_type IS NOT NULL          THEN 'exempt'
       WHEN completed_credits >= required_credits THEN 'complete'
       ELSE 'incomplete' END
) STORED
```

**W5 보다 한 걸음 더 갔다.** 회비 원장은 status 를 저장하고 CHECK 로 정합을 강제했지만,
여기서는 계산식만 둔다 — **저장하지 않으면 어긋날 수 없다** (WO §2 "계산 가능하면 중복 저장하지 않는다").

- 입력값은 면제·유예뿐이고 나머지 2상태는 (의무평점, 인정평점)에서 유일하게 결정된다.
- PATCH 는 `status` 를 **받지 않는다.** 보낼 값 자체가 없다.
- 실측: 앱을 우회한 `UPDATE ... SET status='complete'` 는
  `column "status" can only be updated to DEFAULT` 로 **DB 가 거부**한다.

**면제(exempt)와 유예(deferred)를 상태로 늘리지 않았다.** 신상신고 양식의 '연수교육 면제·유예
확인서'가 둘을 구분하므로 업무상 구분은 필요하지만, 상태를 4종으로 만들면 WO §2 의 3상태 최소를
벗어난다. `status='exempt'` 아래에서 `exemption_type` 으로 구분해 양쪽을 지켰다.

**`remaining_credits` 는 서버 계산값**이다 (면제는 0, 초과 이수는 음수가 아니라 0).
화면이 `required - completed` 를 다시 하지 않는다.

> **numeric 함정** — pg 드라이버는 `numeric` 을 **문자열로** 돌려준다. 그대로 두면
> `"8" + 1 = "81"` 같은 사고가 난다. serialize 경계에서 한 번만 `Number()` 로 바꾸고
> E2E 3 에서 응답이 `8`(문자열 `"8.0"` 아님)임을 실측했다.

## 4. 운영자 API / 화면

기존 operator 가드 2겹(`requireKpaBranchScope` + `resolveBranch` + `requireBranchScope`)을
**그대로 재사용**한다. 연수교육 전용 가드를 만들지 않았다.

| Method | Path | 비고 |
|---|---|---|
| GET | `/branches/:slug/operator/education-credits?year=&status=` | 필터 2개뿐 (WO §3) |
| POST | `/branches/:slug/operator/education-credits/open` | 연도 개설 (멱등) |
| PATCH | `/branches/:slug/operator/education-credits/:ledgerId` | **status 를 받지 않는다** |

화면 `/{slug}/operator/education` — 연도 선택 · 상태 필터 · 요약 4칸(대상/이수완료/미이수/면제·유예) ·
목록 · 인라인 수정(의무평점/인정평점/면제·유예/메모) · 연도 개설.
**LMS 진입점(강좌·수강신청·출결)을 두지 않았다.**

CSV import / 복잡한 대량 입력은 만들지 않았다 (WO §3·§10). 연도 개설이 사실상의 bulk 이고,
그 이상이 필요하다는 근거가 아직 없다.

## 5. 회원 조회

`GET /branches/:slug/me/education-credits` · 화면 `/{slug}/mypage/education`.

**쓰기 경로가 없다.** 평점은 분회가 확인해 기록하는 사실이지 회원의 신고가 아니다 (WO §4).
실측 10: 회원이 자기 원장을 PATCH 해도 403 이다 (본인 것이어도 예외 없음).

## 6. 신상신고 `training.*` 연동

W1 CHECK F2 에서 "연결 원장 없음"으로 남겨둔 3필드가 원장을 얻었다.

```text
resolveAssociationValues('training.creditYear' | 'requiredCredits' | 'completedCredits')
  → 그 해 branch_education_credit_ledgers 한 줄  (3필드를 한 번의 조회로 채운다)
  → 없으면 null + not_linked
```

- **의무평점 기본값을 지어내지 않는다.** 분회가 그 해를 아직 개설하지 않았는데 "8평점"을
  보여주면 그것은 사실이 아니라 추측이다 (§4 가짜 값 금지).
- 회원 payload 의 `training.*` 는 계속 `sanitizeIncoming` 이 버린다.
  실측 12: 위조 시도 5키가 전부 `ignoredKeys` 에 들어갔고 저장값은 원장값 그대로였다.
  같은 요청에 섞은 `personal.division:'해킹분회'` 도 무시되고 DB 의 실제 분회명
  `'남구약사회'` 가 유지됐다.
- **이미 제출된 snapshot 은 바뀌지 않는다.** 실측 13: 제출 후 원장을 12/7.5 로 바꿔도
  제출본은 8/6 이고 `md5(values)` 가 동일했다. 제출본 조회는 association 을 재주입하지 않는다(W2 §8).

> `fee.exemptionType` 은 여전히 `not_linked` 다. 회비 면제 **사유 구분**은 이번 WO 범위 밖이며
> (WO §10) 별도 회비 원장 보강 WO 로 남긴다.

## 7. 면제·유예 확인서 (WO §6 조사 결과)

**파일 업로드는 후속으로 남긴다.**

- kpa-branch 에 업로드 파이프라인이 **없다.** 신상신고의 `training.exemptionCertificate`(type=`file`)는
  이미 `FieldRenderer.tsx:167` 에서 "파일 첨부는 준비 중입니다. 분회 사무국으로 제출해 주세요."로
  막혀 있다 (W2 시점 판단).
- 재사용할 안전한 미디어 경로가 없으므로 **이 기능 하나 때문에 저장소 시스템을 만들지 않는다** (WO §6).
- 원장에는 `exemption_type` + `memo` 만 둔다. 사무국이 종이로 받은 확인서를 메모로 기록할 수 있다.

## 8. tenant / 권한

- Primary Boundary = `organizationId`. 모든 조회가 `organization_id` 로 시작한다 — **UUID 단독 조회 없음.**
- body 의 `organizationId` / `userId` 를 읽지 않는다. tenant 는 `:branchSlug` 로만 정해진다.
- 회원 조회도 `(user_id, organization_id)` 복합이다. 인덱스도 복합으로만 만들었다.
- 실측 8·9·10: 회원→운영자 API 403 · 타 분회 403 · 미소속 ledgerId 404.

## 9. fixture · 원복

**W5 보다 침습 범위가 좁다** — `kpa_members` 를 건드리지 않았다 (연수교육은 회원 원장 컬럼을 쓰지 않는다).

| 대상 | before | 부여 | after (원복) |
|---|:--:|:--:|:--:|
| `service_memberships` (kpa-branch) | 0 | 2 | **0** |
| `role_assignments` (`kpa-branch:*`) | 0 | 2 | **0** |
| `branch_memberships` | 0 | 2 | **0** |
| `branch_education_credit_ledgers` | 0 | 2 | **0** |
| `annual_reports` (E2E 11~13 산물) | 0 | 1 | **0** |
| `kpa_members.fee_category` | 전건 NULL | **미변경** | 전건 NULL |
| `branch_fee_ledgers` (W5) | 0 | **미변경** | 0 |
| `lms_courses` / `lms_enrollments` / `credit_transactions` | 11 / 11 / 13 | **미변경** | **11 / 11 / 13** |

- 대상은 검증 2계정(`sohae2100` · `renagang21`) + namgu 분회로 한정했다.
  타 회원 5명 · 타 분회 227개 · 타 서비스 데이터는 건드리지 않았다.
- 로그인은 L1(플랫폼 자격)로 했다 — `service_credentials` 를 만들지 않았다.
- 원복 확인: 두 계정 모두 `403 MEMBERSHIP_NOT_FOUND` (운영자 API · `/me/education-credits` 양쪽).

### 제약 기록

1. **제출 상태는 SQL 로 만들었다.** 2026 신고기간(2026-01-01~02-28)이 닫혀 있어 첫 제출을 제품
   API 로 만들 수 없다. W3·W4 와 같은 제약이며, 209개 분회가 공유하는 `period_end` 를 검증
   목적으로 늘리지 않는다는 판단도 그대로다. **draft 저장(E2E 12)은 제품 API 로 실제 통과**시켰다.
2. **브라우저 로그인 smoke 는 하지 않았다.** kpa-branch 의 L2 `service_credentials` 가 0건이다.
   화면은 typecheck + lint + API 실측으로 확인했다.
3. **한글 payload 는 UTF-8 파일 + `--data-binary @file` 로 보냈다.** `curl -d '{"…":"한글"}'` 은
   이 환경에서 바이트가 깨진다 (W5 CHECK §8-4 와 같은 도구 함정). 콘솔에 한글이 깨져 보이는 것도
   표시 문제이며, E2E 12 는 **바이트 비교**로 판정했다(`'남구약사회'` ≠ `'해킹분회'`).
4. `status` 필터에 정의되지 않은 값이 오면 무시하고 전체를 반환한다(400 아님). W4·W5 와 같은 판단.

## 10. 범위 밖 (건드리지 않음)

LMS 신규 구현 · 강좌 생성 · 수강신청 · 출결관리 · 대한약사회 연수교육 API 연동 · 자동 평점 수집 ·
교육비 결제 · 증빙파일 관리 · 회비 면제사유 구조 변경(`fee.exemptionType`) ·
CSV import · 평점 발생내역 테이블.

---

## 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건 —
**회비 원장 보강 WO** (`fee.exemptionType` 면제 사유 구분 · 사용자 지시로 W6 범위에서 제외)
