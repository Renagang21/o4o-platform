# CHECK-O4O-OTC-LONG-RUN-PRODUCTION-READINESS-DA-V1 — 장시간 병렬 생산 병목 제거 (에이전트 다)

WO: `WO-O4O-OTC-LONG-RUN-PRODUCTION-READINESS-DA-V1` · 일자: 2026-07-22 · 상태: **완료 — 코드·비DB/read-only 검증 (production write 0)**
대상: `drug-otc-grounded-upgrade-runner.ts` · `drug-otc-en-complete-runner.ts` · `drug-otc-ko-en-bundle-runner.ts` (전부 additive 최소 확장)

---

## 0. 목표

> 3시간·10시간 병렬 생산을 막는 두 병목을 제거:
> **① 공유 registry 편집 경합** — 그룹마다 `GROUP_REGISTRY`/`EN_REGISTRY`(.ts) 를 손으로 편집 → 동시 세션 파일 충돌·forward 커밋 유발.
> **② DB 연결 풀 고갈** — 자식 runner 가 기본 pool 로 연결을 많이 열고, timeout 으로 죽은 자식이 destroy 미도달 → 연결 누수 → `remaining connection slots` 로 장시간 실행 붕괴.

---

## 1. 변경 요약 (fingerprint·승격·번역 정책 불변, 대규모 리팩터 없음)

| # | 변경 | 파일 | 성격 |
|---|---|---|---|
| 1 | `--config=<path>` 외부 batch config JSON 지원 (`.ko`/`.groups` 맵을 built-in 위 병합, 외부 우선) | grounded runner | additive (main 해석부 + loader) |
| 1 | `--config=<path>` (`.en`/`.groups` 맵 병합) | en runner | additive |
| 2 | registry(.ts) 미수정 실행 — 외부 config 로 그룹 주입 | 두 runner | — |
| 3 | DataSource `extra.max = 2` (연결 풀 상한) | 두 runner | 1-line |
| 4 | child timeout → `killTree()`(win `taskkill /T /F` · posix 프로세스그룹 SIGKILL) + 연결 정리 | bundle | additive |
| 4 | 자식 spawn `detached`(posix 그룹) + `--config` 전파 + `--timeout` | bundle | additive |
| 5 | `remaining connection slots`/`too many connections`/`terminated` → 공통 **DB 연결·인증 장애** 분류 | bundle | 정규식 추가 |
| — | 외부 bundle config(`--config`: `{order, ko, en}`) 로 등록 없이 실행 | bundle | additive |

- **정책 불변 증명**: `fingerprintOf()`·ko 승격 TX 로직·EN master_id 스코프·byte-identical 게이트 **미변경**. 외부 config 는 그룹 **파라미터**(candidate/fp/expected/outBase 등)만 주입 — 산식/스코프 규칙은 built-in 코드가 강제.

---

## 2. 외부 config 계약

```jsonc
// otc-ko-en-bundle-config.example.json (committed 템플릿)
{
  "bundleKey": "...", "writeOwner": "...",
  "order": ["k1", "k2"],           // ko→en 완결 순서
  "ko": { "k1": { GroupUpgradeConfig }, ... },   // grounded runner 가 읽음
  "en": { "k1": { EnCompleteConfig }, ... }      // en runner 가 읽음
}
```

- 실행: `bundle --config=<file> [--apply]` (자식에 `--config` 자동 전파) · 개별 `runner --group=<key> --config=<file>`.
- 신규 배치는 **이 JSON 만 작성**(나 감사 fp 값) → .ts registry **편집 0** → 동시 세션 충돌·forward 커밋 제거.

---

## 3. 검증 (production DB write 0)

### 비DB self-test

| runner | self-test | 결과 |
|---|---|---|
| grounded | `--selftest` | PASS 14건 |
| bundle | `--selftest` | **PASS 36건** (기존 29 + **child timeout 격리 continue** + report-null timeout↔계약 구분 + **mock 병렬 3-bundle 동시 결정론**) |

- S8 child timeout: 첫 그룹 ko timeout → 그룹 FAILED **disposition=continue**(트리 종료·연결 정리), bundle **PARTIAL**(중단 아님), 다음 그룹 진행. S8b: timeout 아닌 report-null → **abort**(계약 불일치) 유지.
- S9 mock 병렬: `Promise.all` 3 bundle 동시 → 전부 NO_OP · 결과 직렬화 동일(상호 독립·결정론).

### read-only DB (write 0)

| 검증 | 명령 | 결과 |
|---|---|---|
| **registry-free 실행(ko)** | `grounded --group=ex-diosmin --config=<ext>` (ex-diosmin 은 built-in 미등록) | **ALREADY_UPGRADED** target 38/38 ✅ |
| **registry-free 실행(en)** | `en --group=ex-diosmin --config=<ext>` | **ALREADY_COMPLETE** ✅ |
| **완료 그룹 3 no-op 회귀** | `bundle --bundle=regression-completed-da` (dry-run) | **NO_OP** · 3 ALREADY_COMPLETE(ko ALREADY_UPGRADED·en ALREADY_COMPLETE) · actual 0 · dbWrite 0 ✅ |

- pool max=2 적용 후 연결 사용량 감소 확인. child timeout 트리 종료로 누수 방지.

### typecheck

- 내 3파일(`grounded`·`en`·`bundle`) `tsc --noEmit` 신규 에러 **0**.

---

## 4. 장시간 병렬 생산 준비 효과

| 병목 | 이전 | 이후 |
|---|---|---|
| registry 편집 경합 | 그룹마다 .ts 편집 → 동시 세션 충돌·forward 커밋 | 외부 JSON 만 작성, .ts 편집 0 |
| 연결 풀 고갈 | 자식 기본 pool·timeout 누수 → `remaining connection slots` 붕괴 | pool max=2 + timeout 트리 종료·연결 정리 |
| 연결 오류 분류 | "분류 불가→보수적 abort"(라벨 부정확) | 공통 DB 장애로 정확 분류 |
| 한 그룹 장애 | (timeout=report-null) 전체 abort | timeout=그룹 격리 continue, 안전 오류만 전체 abort |

→ N 그룹 배치를 **1 config JSON + 1 bundle 명령**으로, 동시 세션과 registry 충돌 없이, 연결 안정적으로 장시간 연속 실행 가능.

---

## 5. 완료 보고

| 항목 | 값 |
|---|---|
| 시작/종료 HEAD | (세션 시작) → 본 커밋 |
| 변경 파일 | grounded/en/bundle runner (additive) · config 예시 JSON · 본 CHECK |
| production DB write | **0** (dry-run·read-only·self-test) |
| 정책 변경 | **없음** (fingerprint·승격·번역 스코프 불변) |
| 대규모 리팩터 | **없음** (main 해석부·DataSource·spawn 국소 additive) |
| 중지 조건 | 미해당 |

> 결과: 두 병목(registry 경합·연결 고갈) 제거. 장시간 병렬 생산 시 외부 config 로 등록 충돌 없이, pool 제한·timeout 트리 종료로 연결 안정. 실제 bundle 적용은 나 감사 fp 로 config JSON 작성 후 `bundle --config --apply`.
