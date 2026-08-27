# WO-O4O-ENCRYPTION-KEY-ROTATION-CANONICAL-DETECTION-DETERMINISM-FIX-V1 CHECK

- 작성: 2026-08-27
- 범위: `apps/api-server/src/scripts/encryption-key-rotation.ts`, `apps/api-server/src/__tests__/encryption-key-rotation-runner.spec.ts` (2개 파일, 그 외 변경 없음)
- 계기: `main` 의 `e485baba9` CI Pipeline 실패. 실패 지점은 `encryption-key-rotation-runner.spec.ts` 단일 테스트이며, 무작위 IV 에 따라 확률적으로 붉어졌다.

## 1. 원인 — 테스트 flake 가 아니라 판정 계약 결함

기존 `rotateCell` 은 **"canonical 키로 복호화가 예외 없이 끝나면 이미 canonical"** 로 판정했다.

저장 형식은 `ivHex:cipherHex` 의 **AES-256-CBC + PKCS#7** 이며 **인증 태그도 버전 표식도 없다**.
AES-CBC/PKCS#7 에서 **틀린 키**로 복호화하면 마지막 블록이 우연히 유효한 패딩이 되는 경우가 있고, 그때 예외가 나지 않는다.
확률은 대략 `2^-8`.

실측(무작위 IV, 틀린 키로 복호화 시도):

| 시행 | 예외 없이 통과(=오판) | 비율 |
| --- | --- | --- |
| 20,000 | 66 | 0.33% |

즉 CI 의 붉은색은 테스트 결함이 아니라 **런너가 legacy 암호문을 "이미 canonical" 로 잘못 보고 교체를 건너뛸 수 있다**는 실제 결함의 표면화였다. 테스트만 결정적으로 바꾸면 이 결함을 덮는 것이 된다.

## 2. 현행 저장 형식으로 무엇을 결정적으로 판정할 수 있는가

- envelope: `${ivHex(32)}:${cipherHex}` — 알고리즘/키 버전/무결성 태그 **없음**.
- 따라서 **암호문만 보고 어떤 키로 만들어졌는지 결정적으로 식별하는 것은 불가능**하다. (형식 변경 없이는 원리적으로 불가능)
- 대신 **평문 도메인**은 좁고 확인 가능하다: 이 런너가 다루는 셀은 전부 자격증명 문자열이다 (PG `api_key` / `api_secret`, OAuth `clientSecret`, Cafe24 access/refresh token). 모두 출력 가능한 ASCII 이다.

그래서 "UTF-8 로 보이면 유효" 같은 약한 판정 대신, **자격증명으로 성립하는 평문인가**를 술어로 명시했다.

```ts
const CREDENTIAL_TEXT = /^[\x20-\x7e]+$/;
export function isPlausibleCredential(plaintext: string): boolean {
  return plaintext.length > 0 && CREDENTIAL_TEXT.test(plaintext);
}
```

오판 확률(1블록 비밀 기준):

| 판정 | 오판 확률 |
| --- | --- |
| 이전: 예외 없음 = canonical | `2^-8` (실측 0.33%) |
| 현재: 예외 없음 **그리고** 출력가능 ASCII | `2^-8 x (95/256)^15` 약 `2^-29` |
| (미채택) AES-256-GCM 인증 태그 | `2^-128` |

이것은 **암호학적 인증이 아니다**. 형식을 바꾸지 않는 범위에서 얻을 수 있는 최선이며, 그 사실을 소스 주석과 이 문서에 남긴다.

## 3. 변경 내용

| 항목 | 내용 |
| --- | --- |
| `readAs(value, rawKey)` | 복호화 후 `isPlausibleCredential` 을 통과할 때만 평문 반환, 아니면 `null`. 예외는 `null`. |
| `rotateCell` 판정 순서 | (0) 포맷 불일치 -> `HOLD_UNREADABLE` (어느 키도 시도하지 않음) (1) **canonical/legacy 두 키를 모두** 시도 (2) 결과로 분기 |
| 양쪽 모두 읽힘 + 평문 동일 | `SKIPPED_ALREADY_CANONICAL` (두 raw key 가 `toAesKey` 로 같은 AES 키를 파생하는 경우를 키 문자열 비교 없이 결정적으로 처리) |
| 양쪽 모두 읽힘 + 평문 상이 | **신규** `HOLD_AMBIGUOUS` — 덮어쓰지 않는다 |
| canonical 만 읽힘 | `SKIPPED_ALREADY_CANONICAL` |
| legacy 만 읽힘 | 교체 진행 (dry-run 은 `ROTATED` 집계만) |
| 둘 다 못 읽음 | `HOLD_UNREADABLE` |
| 보고 | `Tally.ambiguous` / `ambiguousLocators` 추가, 요약에 경고 출력, `process.exitCode = 6` |
| 헤더 안전 계약 | "모호하면 손대지 않는다" 항목 추가 |

**유지된 기존 계약**: write 후 readback 검증 실패 시 원래 값으로 rollback, 재실행 멱등성, 빈 값 제외, 평문 잔재 HOLD, dry-run 무write. 해당 테스트 7건 그대로 통과.

## 4. 검증 실측

| 항목 | 명령 | 결과 |
| --- | --- | --- |
| 런너 spec | `npx jest src/__tests__/encryption-key-rotation-runner.spec.ts` | **12 passed** (기존 7 + 신규 5) |
| flake 재현 | spec 내 무작위 IV **2000회** 반복 판정 | 판정 집합 `['ROTATED']` 단일 — **재현 0** |
| 우연 패딩 성공 케이스 | 틀린 키로 복호화가 성공하는 암호문을 탐색해 주입 | `ROTATED` (canonical 으로 오인하지 않음) |
| 파생 키 충돌 | `toAesKey` 가 같은 키를 만드는 두 raw key | `SKIPPED_ALREADY_CANONICAL` |
| 모호 케이스 | 양쪽으로 서로 다른 평문 | `HOLD_AMBIGUOUS`, write 없음 |
| rollout 회귀 | `npx jest src/__tests__/encryption-key-canonical-rollout.spec.ts` | **8 passed** |
| 타입 | `npx tsc --noEmit` (apps/api-server) | exit 0 |
| 전체 | `npx jest --maxWorkers=1` | **217 suites / 3648 tests 통과** |

## 5. 판정

| # | WO 항목 | 판정 |
| --- | --- | --- |
| 1 | canonical 판정 계약 재확인 | PASS — envelope 에 인증/버전 없음을 확인, §2 에 기록 |
| 2 | "복호화 예외 없음 = canonical" 제거 | PASS |
| 3 | 복호화 결과가 실제 canonical plaintext 로 유효한지 검증 | PASS — 도메인(자격증명) 기반 술어, 약한 UTF-8 판정 아님 |
| 4 | wrong-key + valid PKCS#7 도 reject | PASS — 전용 테스트 |
| 5 | rollback / idempotency 계약 유지 | PASS — 기존 7 테스트 무변경 통과 |
| 6 | 랜덤 IV 반복 flake 0 | PASS — 2000회 |
| 7 | encryption-key rollout 회귀 | PASS — 8/8 |
| 8 | 전체 Jest | PASS — 217 suites / 3648 tests |
| 9 | CI green | PASS — `c2b7eb505` (e21ae63bc 포함) CI Pipeline success |
| 10 | CHECK + commit + push | PASS — `e21ae63bc` push 완료 |

`UNKNOWN = 0 · UNJUDGED = 0`

## 6. 실행 기록

| 항목 | 결과 |
| --- | --- |
| `npx jest --maxWorkers=1` (apps/api-server) | **217 suites / 3648 tests 전부 통과**, exit 0 |
| `node scripts/lint-ratchet.mjs` | 통과 (ESLint 64 errors, baseline 69). 64 로 낮추는 것은 **별도 maintenance 커밋**으로 분리 |
| `node scripts/check-unsafe-routes.mjs` | 1393 파일 · 위반 0 |
| `node scripts/check-typeorm-entities.mjs` | DEFINED_BUT_UNREGISTERED 0 / 중복 0 / stale 0 |
| commit | `e21ae63bc` (main). 범위: 위 2개 파일 + 본 CHECK |
| CI Pipeline | `e21ae63bc` 자체 run 은 후속 세션 push(`fbcd9550d`, `c2b7eb505`)에 의해 concurrency **cancelled** (실패 아님). 같은 커밋의 Deploy API Server / CodeQL 은 success. `e21ae63bc` 를 포함하는 `c2b7eb505` 의 **CI Pipeline success** 로 통합 검증 완료 |

## 7. 남은 위험 · DEFERRED

| # | 내용 | 판단 |
| --- | --- | --- |
| DF-E1 | 술어 오판 확률 `2^-29` 는 0 이 아니다. 결정적 식별은 **형식 변경(v2 AES-256-GCM 인증 envelope + 버전 접두)** 으로만 가능하다. | 이번 WO 범위에서 제외. 형식 변경은 읽기/쓰기 2단계 배포가 필요하므로 별도 WO. |
| DF-E2 | 자격증명이 출력 불가 문자를 포함하는 새 도메인이 셀 목록에 추가되면 술어가 과도하게 엄격해진다 (교체 대상이 `HOLD_UNREADABLE` 로 남음 — 안전 방향 실패). | 셀 목록 확장 시 술어를 함께 검토. 데이터 손실 방향이 아니므로 즉시 위험 아님. |
| DF-E3 | `HOLD_AMBIGUOUS` 는 사람이 legacy 키 지정을 확인해야 해소된다. | 자동 해소 불가가 의도된 설계. exit code 6 으로 노출. |
