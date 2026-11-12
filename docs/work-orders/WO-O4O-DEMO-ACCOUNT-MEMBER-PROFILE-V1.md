# WO-O4O-DEMO-ACCOUNT-MEMBER-PROFILE-V1 — Demo 계정의 회원 목록 「미등록」 해소

> **상태**: ACTIVE
> **작성일**: 2026-11-12
> **실행 위치**: BOTH (구현 CLOUD 완료 · 운영 적용 LOCAL — **운영 DB 쓰기, 통합 담당 승인 필요**)
> **인계**: 코드 PR 병합 후 LOCAL 이 T1 → T2 → T3 순서로 실행
> **근거**: 2026-11-12 사용자 지시(Admin 회원 목록의 Demo 계정 「미등록」 · 닉네임 형식 확정 · 나머지 판단 위임) · [`O4O-CANONICAL-DEMO-ACCOUNTS-V1`](../baseline/O4O-CANONICAL-DEMO-ACCOUNTS-V1.md) §2 · §15

## 1. 문제

Admin 회원 목록에서 Demo 계정의 「가입 유형」 · 「닉네임」이 「미등록」으로 보인다.

- Demo 세 계정은 가입 신청 절차가 아니라 보정 스크립트(`demo-account-reconcile`)로 만들어졌다.
- 그래서 가입 신청 기록과 닉네임이 비어 있다.
- 가입 유형은 기록이 없으면 원장에서 추정한다: 약국 신청 → 약국경영자, 공급자 조직 owner → 공급자, 약사 면허 → 약사.
- 매장 직원은 추정할 원장이 없다.

| 계정 | 가입 유형(현재) | 닉네임(현재) |
|---|---|---|
| 매장 경영자 Demo | 약국경영자 (약국 원장에서 추정) | 있음 |
| 공급자 Demo | 공급자 (공급자 원장에서 추정) | 미등록 |
| 매장 직원 Demo | **미등록** | **미등록** |

## 2. 결정

| 항목 | 값 | 근거 |
|---|---|---|
| 닉네임 | 경영자 `테스트-약국경영자` · 공급자 `테스트-공급자` · 직원 `테스트-직원` | 사용자 지정 「테스트-…」 형식. 띄어쓰기는 통일했다 |
| 매장 직원 가입 유형 | `other`(기타) · 승인 상태 | 약사로 두면 Demo 가 약사 자격을 갖게 돼 체험 범위가 넓어진다(정본 「별도 자격 없이 가장하지 않는다」) |
| 매장 경영자 약사 면허 | **쓰지 않음** (2026-11-12 통합 리뷰로 제외) | 승인 면허를 만들면 Demo 가 실제 약사 자격 확인(`hasApprovedPharmacist`)을 통과해 매장 접근 · 세미프랜차이즈 가입 조건까지 열린다. 정본 「Demo 약국 경영 체험 자격」은 실제 면허 승인 기록 생성을 금지한다. 회원 목록의 가입 유형은 약국 원장에서 이미 「약국경영자」로 보인다 |
| 공급자 · 경영자 가입 유형 | 쓰지 않음 | 원장에서 이미 올바르게 추정된다 |
| 「테스트-약사」 | 적용 안 함 | 해당하는 Demo 계정(약사)이 없다. 새 계정 생성은 범위 밖 — 필요하면 별도 지시 |
| 하지 않는 것 | 가입 승인 흐름 재실행 · 자격증명 · 세션 · 역할 · 소속 변경 · 운영자 등 실제 계정 변경 | 승인 흐름은 약국 · 공급자 조직을 새로 만들 수 있다 |

## 3. 구현 (CLOUD · 완료)

- `apps/api-server/src/scripts/demo-account-profile.service.ts`:
  - plan(읽기 전용 transaction) → 같은 before-image digest 로 apply → 사후 재검사 → 복구 스냅숏(`canonical_demo_repair_snapshots`).
  - apply 는 실행 승인자(활성 `platform:super_admin`)의 사용자 ID 를 요구한다. 그 ID 를 가입 검토자로 기록한다.
  - `kpa_pharmacist_profiles` 는 읽지도 쓰지도 않는다.
- CLI: 기존 `apps/api-server/src/scripts/demo-account-reconcile.ts` 에 `DEMO_ACCOUNTS_PROFILE=true` 로 선택한다.
- 시험: `src/scripts/__tests__/demo-account-profile.test.ts`. 실제 canonical schema(baseline + migration)에서 실행한다.

## 4. TODO

- [ ] T1 [LOCAL] plan — 읽기 전용 transaction. 결과의 `digest` 와 `accounts` 를 기록한다(식별자 · 원문 없음)
- [ ] T2 [LOCAL] apply — **통합 담당 명시 승인 후**(운영 DB 쓰기 · AGENTS.md §5). T1 의 digest 와 승인자 ID 로 실행한다
- [ ] T3 [LOCAL] 확인
  - Admin 회원 목록에서 세 Demo 의 닉네임 · 가입 유형이 보인다(직원 = 기타)
  - 「회원 상태」는 그대로 「정상」이다
  - plan 을 다시 돌리면 `changes: 0` 이다
  - 테스트 로그인 버튼 3개로 로그인이 계속 된다(자격증명 · 세션은 바꾸지 않는다)

## 5. 실행 (LOCAL)

Cloud SQL Proxy 를 `127.0.0.1:55432` 로 띄운 상태에서, 저장소 루트에서 실행한다(접속 절차는 [`SETUP.md`](../../SETUP.md)).
CLI 는 기존 Demo 보정과 같은 운영 계정 비밀번호를 Secret Manager 에서 읽는다. plan 도 운영 계정으로 접속하므로(세션은 읽기 전용), 통합 담당이 지정한 세션에서만 실행한다.

```bash
DEMO_ACCOUNTS_PROFILE=true DEMO_ACCOUNTS_MODE=plan DB_USERNAME=<운영 계정> DB_NAME=<운영 DB> npx tsx apps/api-server/src/scripts/demo-account-reconcile.ts
```

```bash
DEMO_ACCOUNTS_PROFILE=true DEMO_ACCOUNTS_MODE=apply DEMO_ACCOUNTS_DIGEST=<T1 digest> DEMO_ACCOUNTS_APPROVED_BY=<통합 담당 사용자 ID> DB_USERNAME=<운영 계정> DB_NAME=<운영 DB> npx tsx apps/api-server/src/scripts/demo-account-reconcile.ts
```

**판정 기준**

- plan 의 `changes` 는 최대 3 이다.
  - 경영자: 닉네임
  - 공급자: 닉네임
  - 직원: 닉네임 + 가입 유형
- 실패 코드가 나오면 apply 하지 않고 코드를 기록해 CLOUD 로 넘긴다.
  - `BEFORE_IMAGE_CHANGED_REPLAN` 은 plan 부터 다시 한다.
- 결과는 식별자 · 원문 없이 `accounts` 의 참/거짓만 기록한다(공개 저장소).

## 6. 문서 정합

해당 없음.
