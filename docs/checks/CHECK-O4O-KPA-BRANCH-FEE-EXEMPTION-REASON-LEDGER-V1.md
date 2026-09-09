# CHECK — 회비 면제 사유 원장 (W9)

- **WO**: `WO-O4O-KPA-BRANCH-FEE-EXEMPTION-REASON-LEDGER-V1`
- **일자**: 2026-09-09
- **판정**: **CLOSED** — 조사 + migration + 구현 + 프로덕션 E2E 24항목 실측 · fixture 전량 원복
- **선행**: [W5 회비 원장](CHECK-O4O-KPA-BRANCH-ANNUAL-FEE-LEDGER-V1.md) · [W6 연수교육](CHECK-O4O-KPA-BRANCH-CONTINUING-EDUCATION-CREDIT-LEDGER-V1.md)
- **commit**: `d780e2da0` (migration + entity + service + controller + 운영자 UI + 회원 화면) · 본 CHECK 는 후속 커밋
- **환경**: 프로덕션 (`https://api.neture.co.kr` · DB `o4o_platform` · `kpa-branch-web`)

---

## 0. 결과 요약

WO §8 필수 11항목 + 추가 13항목.

| # | E2E 항목 | 결과 |
|:--:|---|:---:|
| 1 | exempt 전환 — `unemployed` | ✅ 200 |
| 1b | exempt 전환 — `exempted` | ✅ 200 |
| 2 | exemption_type 없이 면제 시도 | ✅ 422 `FEE_VALUE_INVALID` |
| 2b | 정의되지 않은 코드(`bogus`) | ✅ 422 |
| 3 | `other` 인데 사유 없음 | ✅ 422 |
| 3b | `other` 사유가 공백만 | ✅ 422 |
| 3c | `other` + 사유 | ✅ 200 |
| 4 | exempt → unpaid 전환 시 사유 정리 | ✅ `exemptionType`·`exemptionReason` 모두 null |
| 4b | `other` 행을 완납 전환 (자유사유까지 정리) | ✅ 둘 다 null |
| 4c | 면제 아닌데 사유를 보내면 무시 | ✅ 저장되지 않음 |
| 4d | 납부액 있는 행을 면제로 (W5 계약) | ✅ 422 — 기존 계약 유지 |
| 5 | 회원 조회 readonly — 유형 노출 | ✅ `exemptionType='unemployed'` |
| 5b | 회원 조회 — **자유사유 미유출** | ✅ 운영자 응답엔 있고 회원 응답은 `null` |
| 6 | member → operator PATCH | ✅ 403 |
| 6b | 타 분회 목록 / 타 분회 경로 PATCH | ✅ 403 · 403 |
| 6c | 미소속 `ledgerId` / 미인증 | ✅ 404 · 401 |
| 7 | 신상신고 `fee.exemptionType` resolved | ✅ `unemployed` → resolved · `exempted` → resolved |
| 7b | `other` 는 양식 option 없어 미연결 | ✅ `not_linked` (추정하지 않음) |
| 7c | 면제 해제 시 미연결 복귀 | ✅ `not_linked` |
| 8 | `fee.*` payload 변조 무시 | ✅ `ignoredKeys` 3건 · 저장값은 원장값 유지 |
| 9 | 제출 snapshot 불변 | ✅ 원장을 `exempted` 로 바꿔도 md5 동일 (`unemployed` 유지) |
| 10 | 기존 partial/paid 흐름 회귀 0 | ✅ partial→paid 정상 · summary 정확 · 정책 조회 200 |
| 10b | DB CHECK 제약 5종 (앱 우회) | ✅ 전건 거부 |
| 11 | fixture 원복 | ✅ 전량 0 복귀 · 403 `MEMBERSHIP_NOT_FOUND` |

추가: 한글 자유사유 UTF-8 왕복(34 octets / 14자 · DB 값 일치).

---

## 1. 기존 구조 (WO §1 조사)

| 대상 | 실측 |
|---|---|
| `branch_fee_ledgers` 컬럼 | `fee_category` · `assessed_amount` · `paid_amount` · `paid_at` · `status` · `memo` · `updated_by` — **면제 관련 컬럼 없음** |
| `status='exempt'` 계약 (W5) | 금액에서 파생되지 않는 유일한 상태. `paid_amount=0` 필수 |
| `fee.category` resolve | W5 에서 연결 완료 (`toReportFeeCode`) |
| `fee.exemptionType` resolve | **`not_linked`** — 연결 원장 없음 |
| 운영자 회비 화면 | `FeeLedgerPage` — 면제는 체크박스 1개뿐 |
| 회원 회비 화면 | `MyFeePage` — 상태 배지 + `memo` 노출 |
| 기존 exemption 잔재 | **없음.** `exemption_type` 은 연수교육 원장(W6)에만 있고 축이 다르다 |
| 프로덕션 데이터 | `branch_fee_ledgers` **0행** → 제약 추가가 기존 데이터와 충돌하지 않는다 |

## 2. 면제사유 모델

**기존 컬럼을 재사용할 수 없다.** `memo` 는 일반 운영 메모이고 이미 회원에게 노출된다.
면제사유를 memo 에 섞으면 "왜 면제인가"와 임의 메모를 구분할 수 없고, "other 일 때만"
같은 제약도 걸 수 없다. 그래서 **2컬럼만** 더했다.

| 컬럼 | 타입 | 내용 |
|---|---|---|
| `exemption_type` | varchar(20) NULL | 면제 사유 구분 |
| `exemption_reason` | text NULL | 자유 사유 — `other` 전용 |

### 코드는 신상신고 양식을 따랐다 (WO §2)

WO 권고안은 `unemployed / exempt_member / other` 였으나, **2026 양식의
`fee.exemptionType` option 이 이미 정본 코드를 갖고 있어** 그것을 우선했다.

```text
unemployed  미취업자      ← 양식 option
exempted    회비면제자    ← 양식 option  (WO 권고안의 exempt_member 대신)
other       기타          ← 양식에 없음. 분회 실무 사유. 자유사유 필수
```

`other` 를 더한 이유는 위 2종으로 담기지 않는 면제가 실무에 있기 때문이다.
대신 양식에 option 이 없으므로 신상신고 resolve 에서는 표시하지 않는다 (§6).

**회비구분과 면제사유를 혼동하지 않는다** — `fee_category` 는 "얼마를 내는 사람인가",
`exemption_type` 은 "왜 안 내는가" 다. `D_fee_exempted`(정) 는 구분이지 사유가 아니다.

### `exempted_at` 은 만들지 않았다 (WO §2 필요성 판단)

`updated_by` / `updated_at` 이 이미 "누가 언제 이 행을 바꿨는가"를 갖고 있고,
면제 시각만 따로 읽는 소비처가 없다. 감사 테이블도 만들지 않았다 (WO §3).

## 3. 상태 / DB 제약

migration `20270328000000-AddBranchFeeExemptionReason` (프로덕션 적용 확인).

| 제약 | 내용 |
|---|---|
| `CHK_branch_fee_ledgers_exemption_type` | `unemployed` / `exempted` / `other` 만 |
| `CHK_branch_fee_ledgers_exemption_status` | `status='exempt'` → 사유구분 필수 · `status≠'exempt'` → 사유·자유사유 **모두 NULL** |
| `CHK_branch_fee_ledgers_exemption_reason` | 자유사유는 `other` 전용 · `other` 는 자유사유 필수 (`btrim` 으로 공백 우회 차단) |
| `IDX_branch_fee_ledgers_exemption` | `(organization_id, year, exemption_type) WHERE status='exempt'` |

**두 번째 제약의 뒤쪽 절이 핵심이다.** 면제를 해제했는데 사유가 남으면
"완납인데 미취업 면제" 같은 행이 원장에 남는다. 서비스도 같은 방향으로
`!exempt` 면 사유를 지운다 — 애플리케이션과 DB 가 같은 규칙을 두 번 말한다.

ENUM 을 만들지 않았다 (W5·W6 와 같은 판단) — 제도가 바뀔 때마다 migration 을
요구하면 정책 변경을 코드가 막는다.

실측 10b: 앱을 우회한 직접 UPDATE 5종이 전부 거부됐다.

```text
면제 아닌데 사유 남김            → CHK_..._exemption_status
면제인데 사유 없음                → CHK_..._exemption_status
정의되지 않은 코드                → CHK_..._exemption_type
other 아닌데 자유사유 있음        → CHK_..._exemption_reason
other 인데 자유사유가 공백만      → CHK_..._exemption_reason
```

### 일괄 부과의 0원 정책 행

W5 는 정책 부과액 0원을 `status='exempt'` 로 만든다. 사유가 필수가 됐으므로
`other` + `'정책 부과액 0원 (일괄 부과 자동 기록)'` 을 남긴다. 지어낸 값이 아니라
**사실 그대로**이며 운영자가 실제 사유로 바꿀 수 있다.

## 4. 운영자 UI

**새 화면을 만들지 않았다** (WO §4). 기존 `FeeLedgerPage` 의 면제 셀에만 추가했다.

- 면제 체크 시에만 사유 select 가 나타난다.
- `other` 를 고를 때만 자유사유 입력칸이 나타난다.
- 면제를 풀면 화면도 사유를 비운다 — 서버·DB 계약과 같은 방향.
- 읽기 행에는 배지 아래 `면제 유형 · 자유사유` 를 표시한다.

## 5. 회원 조회

`MyFeePage` 에 **면제 유형만** 읽기 전용으로 표시한다.

**자유사유는 회원에게 내려보내지 않는다** (WO §5). 서버가 경계에서 막는다 —
`serialize(row, 'member')` 가 `exemptionReason` 을 항상 `null` 로 비운다.
화면에서 숨기는 것이 아니라 **응답에 담기지 않는다.**

실측 5b: 같은 행을 운영자는 자유사유와 함께 받고, 회원 응답의 `exemptionReason` 은 `null` 이었다.

> `memo` 노출은 기존 동작 그대로 두었다 (W5 부터 회원 화면이 memo 를 보여준다).
> 이번 WO 범위 밖이라 바꾸지 않았다.

## 6. 신상신고 연동

```text
resolveAssociationValues('fee.exemptionType')
  → 그 해 branch_fee_ledgers 가 status='exempt' 이고
    exemption_type ∈ {unemployed, exempted}          → resolved
  → other · 면제 아님 · 원장 없음                      → null + not_linked
```

- **`other` 를 다른 값으로 바꾸지 않는다.** 양식에 option 이 없으므로 추정하지 않고
  미연결로 둔다 (§4 가짜 값 금지 — `toReportFeeCode` 와 같은 판단).
- 자유사유는 양식에 내보내지 않는다 — 운영자 기록이지 신고 항목이 아니다.
- 회원 payload 의 `fee.*` 는 계속 `sanitizeIncoming` 이 버린다.
  **association ownership 계약을 바꾸지 않았다.**
  실측 8: `fee.category`·`fee.exemptionType`·`training.completedCredits` 3키가
  `ignoredKeys` 에 들어갔고 저장값은 원장값 그대로였다.
- 이미 제출된 snapshot 은 수정하지 않는다. 실측 9: 제출 후 원장을 `exempted` 로
  바꿔도 제출본은 `unemployed` 이고 `md5(values)` 가 동일했다.

> 양식 hint 는 "회비구분 «정» 에 한한다"고 적고 있으나 **원장에 그 게이트를 넣지 않았다.**
> 원장은 사실을 기록하는 곳이고, 운영자가 정(D) 이 아닌 회원을 면제 처리했다면 그것도
> 사실이다. 정책 강제가 필요하면 별도 판단이 필요하므로 지어내지 않았다.

## 7. tenant / 권한

- Primary Boundary = `organizationId`. 조회·수정 모두 `(id, organization_id)` 복합 —
  **UUID 단독 조회 없음.**
- body 의 `organizationId` / `userId` 를 읽지 않는다. tenant 는 `:branchSlug` 로만 정해진다.
- 회원은 본인 조회만. 쓰기 경로가 없다.
- 실측 6: member→operator PATCH 403 · 타 분회 403 · 미소속 ledgerId 404 · 미인증 401.

## 8. fixture · 원복

운영자 1 + 회원 4명(A paid / B unemployed / C exempted / D other). `kpa_members` 미변경.

| 대상 | before | 부여 | after (원복) |
|---|:--:|:--:|:--:|
| `service_memberships` (kpa-branch) | 0 | 2 | **0** |
| `role_assignments` (`kpa-branch:*`) | 0 | 2 | **0** |
| `branch_memberships` | 0 | 5 | **0** |
| `branch_fee_ledgers` | 0 | 4 | **0** |
| `annual_reports` (E2E 8·9 산물) | 0 | 1 | **0** |
| `kpa_members.fee_category` | 전건 NULL | **미변경** | 전건 NULL |
| `kpa_members` / `users` 총 행수 | 7 / 57 | **미변경** | **7 / 57** |
| `branch_education_credit_ledgers` | 0 | **미변경** | 0 |

- namgu 분회 + 검증 5계정으로 한정했다. 타 분회 · 타 서비스 데이터는 건드리지 않았다.
- 로그인은 L1(플랫폼 자격). `service_credentials` 를 만들지 않았다.
- 원복 확인: 운영자·회원 양쪽 `403 MEMBERSHIP_NOT_FOUND`.

### 제약 기록

1. **제출 상태는 SQL 로 만들었다.** 2026 신고기간(2026-01-01~02-28)이 닫혀 있어
   제품 API 로 제출을 만들 수 없다 (W3·W4·W6·W7 와 같은 제약).
   **draft 저장(E2E 8)은 제품 API 로 통과**시켰다.
2. **B(`unemployed`) · C(`exempted`) · D(`other`) 계정은 로그인 자격이 없다.**
   신상신고 resolve 검증(E2E 7)은 로그인 가능한 `renagang21` 한 계정으로
   `other → unemployed → exempted → 해제` 를 순차 전환하며 4가지 경우를 모두 통과시켰다.
3. **DB 제약 4번째 케이스는 처음에 발화하지 않았다** — 그 시점에 `unemployed` 행이
   0건이라 UPDATE 가 0행에 매칭됐다. 대상 행을 만든 뒤 재시도해 거부를 확인했다(§3).
   "오류가 없다"를 통과로 읽지 않았다.
4. **브라우저 smoke 는 하지 않았다.** kpa-branch 의 L2 `service_credentials` 가 0건이다.
   화면은 typecheck + lint + API 실측으로 확인했다.
5. **한글 payload 는 UTF-8 파일 + `--data-binary @file` 로 보냈다** (W5·W6 와 같은 도구 함정).

## 9. 범위 밖 (건드리지 않음)

전국/지부 회비 면제정책 · 면제 승인 워크플로 · 증빙파일 업로드 · 자동 자격판정 ·
회비 환급 · 회계 처리 · 대한약사회 외부 연동 · `memo` 회원 노출 정책 변경 ·
회원 업무 콘솔(W7)의 회비 섹션에 면제사유 추가 · 양식 hint 의 «정» 한정 게이트(§6).

---

## 문서 정합

발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건

**발견 1건 (범위 밖 · 미수정)** — `apps/api-server/src/copilot/insight-rules.ts:38` 타입 오류.
`83853d8d3 feat(platform)!: GlycoPharm 서비스 완전 삭제` 가 데이터에서 `glycopharm` 을
제거했으나 `AIServiceId` 타입에는 남겨두어 `Record<AIServiceId, …>` 가 불만족이다.
이번 변경과 무관한 기존 실패이며 CLAUDE.md 중지 조건에 해당해 고치지 않았다.
→ 별도 WO 후보.
