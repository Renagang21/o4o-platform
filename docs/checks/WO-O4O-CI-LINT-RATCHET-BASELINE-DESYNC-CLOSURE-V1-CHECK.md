# CHECK — WO-O4O-CI-LINT-RATCHET-BASELINE-DESYNC-CLOSURE-V1

**작업일**: 2026-09-05
**대상**: CI Pipeline · `Code Quality Check` > `Run ESLint (regression ratchet)`
**결과**: DONE (CI RED 해소)

---

## 1. 증상

CI Pipeline 의 ESLint 게이트가 실패하고, 그 뒤 단계(unsafe route guard · TypeORM entity
registry · console.log 검사 · 각종 test)가 전부 skip 됐다.

```
ESLint: 57 errors, 1376 warnings (error baseline 55)
::error::ESLint 오류가 baseline 을 초과했습니다 (57 > 55). 신규 오류를 수정하세요.
```

실패 job: https://github.com/Renagang21/o4o-platform/actions/runs/33935923004/job/101223768582

---

## 2. 원인 — 신규 오류가 아니라 **baseline desync**

`scripts/lint-ratchet.mjs` 는 저장소 전체 ESLint **오류 총량**이 `ERROR_BASELINE` 을 넘으면
실패하는 순증 차단 게이트다. baseline 은 **내리는 방향으로만** 갱신하도록 문서화돼 있다.

| 확인 항목 | 실측 |
|---|---|
| baseline 55 로 내린 커밋 | `ee629917a` (2026-09-04 15:02) |
| 그 이후 CI 실적 | `25f400057`(09-04 23:34) · `89332f865` · `d6a736afa` · `2943395dc` · `33425df07` · `a863c9d79` **전부 57 errors 로 동일 실패** |
| 오류 보유 파일 39개의 최종 수정일 | 전부 `ee629917a` **이전** (최신 2026-09-03) |

→ 55 로 내린 시점의 **병합 트리 실측은 57** 이었다. 즉 신규 오류가 유입된 게 아니라
baseline 이 실측보다 2 낮게 박혔고, 그 뒤 main 의 모든 커밋이 같은 이유로 RED 였다.
(스크립트 주석이 이미 경고한 merge 함정 — 브랜치별로 같은 줄을 각자 내리면 병합 트리에서 어긋난다.)

**본 세션의 직전 작업(`89332f865`, PharmacyHub 홈 뉴스)과 무관하다.**
그 커밋의 8개 변경 파일은 ESLint 0 issue 이며, 실패 오류 목록에 하나도 없다.
`89332f865` 이전 커밋(`25f400057`)의 CI 도 동일하게 `57 > 55` 로 실패했다.

---

## 3. 조치 — baseline 을 올리지 않고 실제 오류를 제거

스크립트 규칙(“내리는 방향으로만 갱신 · 숫자를 맞추기 위한 코드 수정 금지”)에 따라
**무해한 기존 오류 6건을 실제로 제거**하고 실측값으로 baseline 을 재산출했다.

| 파일 | rule | 조치 |
|---|---|---|
| `services/web-neture/src/lib/api/admin.ts` (3곳) | `no-useless-catch` | `try { … } catch (error) { throw error; }` 래퍼 제거 — 예외 전파 동작 동일 |
| `services/web-neture/src/lib/api/partner.ts` (2곳) | `no-useless-catch` | 동일 |
| `apps/api-server/src/routes/pharmacy-hub/__tests__/pharmacy-hub-parity-contract.test.ts` | `no-useless-escape` | 정규식 문자클래스 `['\`"]` → `['`"]` — 매칭 집합 동일 |

- **동작 변경 0.** 재던지기 전용 catch 제거와 문자클래스 내 불필요 escape 제거는
  런타임 의미가 완전히 같다.
- rule 완화 · `eslint-disable` 추가 · 검사 범위 축소 **없음**.

`ERROR_BASELINE` : `55` → **`51`** (실측). 경위는 스크립트 주석에 남겼다.

### 손대지 않은 것 (의도적)

`apps/api-server/src/__tests__/registry-audit-missing-and-dangling-closure.spec.ts:68` 의
`no-useless-escape` 2건은 **고치면 테스트가 깨진다.**
현재 문자열 `'/\/SlideBlock\.tsx$/'` 는 escape 가 벗겨져 실제로는 `//SlideBlock.tsx$/` 를
검사하고 있어 사실상 vacuous 하다. escape 를 `\` 로 바로잡으면 대상 스캐너
(`scripts/audit/check-block-registry.ts:106`)의 **주석**에 같은 문자열이 있어 assertion 이
실패한다. 이 spec 이 무엇을 검사해야 하는지는 별도 판단이 필요하므로(주석 stripping 등)
이번 CI 해소 범위에서 제외하고 후속으로 남긴다.

---

## 4. 검증

| 항목 | 결과 |
|---|---|
| `node scripts/lint-ratchet.mjs` | **PASS** — `ESLint: 51 errors, 1376 warnings (error baseline 51)` · exit 0 |
| 수정 3파일 ESLint | PASS — 0 issue |
| `web-neture` `tsc -b` | PASS (exit 0) |
| `web-neture` `vite build` | PASS |
| jest `pharmacy-hub-parity-contract` | PASS 11/11 |
| `node scripts/check-unsafe-routes.mjs` | PASS — 1164 파일 · 위반 0 |
| `node scripts/check-typeorm-entities.mjs` | PASS — DEFINED_BUT_UNREGISTERED 0 / 중복 0 / stale 0 |
| `vitest --config packages/shared-space-ui/vitest.config.mjs` | PASS 109/109 |

ESLint 게이트가 통과하므로 그동안 skip 되던 후속 단계들이 다시 실행된다.

---

## 5. 문서 정합

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
(위 §3 의 `registry-audit-missing-and-dangling-closure.spec.ts` escape 정정 + 검사 의미 확정)

---

## 6. 재발 방지 메모

baseline 을 내릴 때는 **작업 브랜치가 아니라 병합될 트리에서 실측**해야 한다.
브랜치에서 잰 값으로 내리면 병합 후 실측이 그보다 높아 main 전체가 RED 가 된다
(이번이 두 번째 사례 — 스크립트 주석의 첫 사례와 동일 패턴).
