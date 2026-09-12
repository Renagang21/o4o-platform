# AGENTS.md — Codex / Agent 진입점

## 1. Repository / 역할

O4O Platform repository의 Codex 및 일반 coding agent를 위한 독립 진입점이다.

- `CLAUDE.md`는 Claude Code의 **동급 진입점**이다. 다른 AI용 지침을 import하거나 상속하지 않는다.
- 이 문서만으로 작업을 시작할 수 있어야 하며, 다른 AI용 지침을 선행 조건으로 요구하지 않는다.
- 공통 사업·architecture 지식은 [정본 지도](docs/CANONICAL-INDEX.md)와 각 canonical 문서에 둔다.
- 본문에는 저장소 특유의 안전 경계와 실행 규칙만 직접 유지한다.

## 2. Source of Truth

작업 시작 시 [docs/CANONICAL-INDEX.md](docs/CANONICAL-INDEX.md)에서 관련 문서의 상태를 확인하고,
현재 작업 영역의 canonical 문서를 먼저 읽는다. 색인 등재만으로 모든 내용이 현행 규칙이 되지는 않는다.

충돌 시 우선순위:

1. 현재 사용자의 명시적 작업 지시
2. 사업·정책 canonical docs — 사업 철학, commerce 경계, B2B 계약, 3자 흐름
3. 구조 계약 — Frozen / Boundary / Core / Shared Module Protocol
4. 도메인·서비스 canonical docs
5. 과거 WO / CHECK / IR / archive — 당시 실행 기록이며 현재 정책을 이기지 않는다

현재 사용자가 지정한 WO는 작업 범위를 정한다. 과거 기록을 현행 정책으로 승격하지 않는다.
아래 Git·DB·검증 등 실행 안전 경계는 문서 우선순위를 이유로 생략하지 않는다.

- **역추론 금지:** 코드가 존재한다는 사실은 그 기능이 현행 사업 기능이라는 근거가 아니다.
- **현재 정책 ≠ 영구 계약:** 현재 하지 않는다는 정책을 앞으로도 절대 하지 않는다는 뜻으로 읽지 않는다.
  정책 변경은 해당 canonical 문서의 변경·승인 절차를 따른다.
- commerce 작업(cart / checkout / orders / payments / refund / PG / POS / tablet / QR / 외부 판매채널)은
  **소비자 commerce 경계와 공급자→매장 B2B 계약을 코드보다 먼저 함께 확인**한다(§7).
- `판정 대기` 또는 `UNKNOWN`인 기능은 근거 확인과 별도 판정 전에 복구·확장하지 않는다.

## 3. 기본 작업 절차

```text
조사 → 문제 확정 → 최소 수정 → 검증 → 보고
```

- **조사 전용 작업은 파일을 수정하지 않고 보고로 종료한다.**
- 구현 요청이면 승인된 안전 범위 안에서 불필요한 중간 승인 없이 완료까지 진행한다.
- 이미 명시적으로 승인된 변경 범위를 같은 이유로 기계적으로 다시 승인받지 않는다.
- 새롭게 발견된 범위 확대나 미승인 위험 변경은 해당 변경 전에 중지하고 보고한다.
- 범위 밖 문제는 임의 수정하지 않고 보고한다. 무관한 build/test 실패도 임의로 고치지 않는다.
- 기존 코드 패턴을 우선하고 과도한 추상화·리팩터링을 피한다. 코딩 컨벤션은 [README.md](README.md)를 따른다.
- 공통 sidebar / menu / layout / config / capability 변경 전 **모든 소비처 영향도를 확인**한다.
  단일 서비스 기준으로 완료 판단하지 않는다. 상세 절차는 §7의 shared module 정본을 따른다.
- route 없는 메뉴를 노출하거나 실기능이 있는 메뉴를 은폐하지 않는다.
- UI 정책 문제를 DB backfill·migration으로 우회하지 않는다.

## 4. Git / 병렬 작업 안전

상세: [O4O-GIT-PARALLEL-WORK-SAFETY-V1](docs/baseline/operations/O4O-GIT-PARALLEL-WORK-SAFETY-V1.md).
현재 운영 방식은 공유 `main` 직접 작업이다. 브랜치 전략을 작업 편의로 임의 변경하지 않는다.

- 작업 전 `git status --short` · `git branch --show-current` · `git rev-parse HEAD`로 기준선을 확인한다.
  `git fetch origin` 후 `git status -sb`로 원격과 비교하며, 작업 후에도 상태를 확인한다.
- **foreign dirty / untracked / staged changes는 불가침**이다. 기존 변경을 내 것으로 간주하지 않는다.
  다른 세션의 변경을 판단·커밋·정리하거나 `restore` / `reset` / `stash`하지 않는다.
- 다른 세션의 dirty 파일이 존재한다는 사실만으로 작업 전체를 중지하지 않는다.
  **경로 충돌 / 소유권 불명 / 동일 파일 변경 혼재 시 중지하고 보고**한다.
- **dirty 상태에서 pull(merge/rebase) 금지.** 필요한 sync는 작업트리가 clean할 때만 수행한다.
- **path-specific stage:** `git add -- <내 파일...>`만 사용한다.
  **`git add .` · `git add -A` · `git commit -am` 금지.**
- 커밋 직전 `git diff --cached --name-only`와
  `node scripts/git/check-staged-scope.mjs <내 작업 경로...>`로 staged 범위를 확인한다.
- **path-specific commit:** `git commit -m "..." -- <내 파일...>`처럼 커밋에도 pathspec을 붙인다.
  foreign staged 파일이 있으면 pathspec 없는 커밋은 금지한다.
- 커밋 후 `git show --stat --oneline HEAD`로 실제 포함 경로를 확인한다.
- push 전 다시 fetch하여 `origin/main` 이동을 확인한다. **force push(`--force`) 금지.**
  공유 `main` 이력을 재작성하지 않는다(`amend` 포함). 정정은 후속 커밋으로 한다.
- commit/push를 수행하는 작업의 완료 조건은 **이번 작업 범위 미커밋 변경 0건 + `HEAD == origin/main`**이다.
  다른 세션의 변경까지 정리하여 저장소 전체를 clean하게 만들지 않는다.

## 5. 위험 변경 / 사용자 확인

사용자 확인 대상은 **이번 작업에서 아직 승인되지 않은 새로운 위험 변경**이다.
현재 지시에 명시적으로 승인된 범위는 동일 이유로 반복 확인하지 않는다.

- DB schema / migration / 데이터 삭제 / 대량 update / seed 변경
- `package.json` / dependency / lockfile 변경
- Docker / CI / build·deployment infrastructure 변경
- Core / Frozen / shared contract 변경
- 권한 / role / route / API contract의 변경 또는 범위 확대
- 결제 / 정산 / 법률 / 규제 판단
- 실제 계정 / 자격정보 / 외부 서비스 승인

**DB·보안 경계:**

- **기본 환경은 프로덕션이다.** 대상 환경을 확인하고, read-only 검증은 허용된 범위에서 수행한다.
- **DB write(INSERT / UPDATE / DELETE 등), DDL(DROP / ALTER 등), migration 적용은 사용자 명시 승인이 필요하다.**
  코드 수정 승인만으로 운영 DB write까지 승인되었다고 간주하지 않는다.
- 실제 DB host / password / 계정값을 문서·로그·커밋·스크린샷에 기록하지 않는다.
  운영 데이터 보고는 요약·마스킹한다. 접속·migration 절차는 §7의 정본을 따른다.

**진단·debug 안전 경계:**

- 진단 / seed / repair / backfill은 **CLI 우선**이다.
- HTTP route가 불가피하면 **`requireAuth` + role guard 필수**다.
- debug/test route는 **프로덕션에 등록하지 않는다**(`NODE_ENV !== 'production'` 게이트).
- **GET으로 상태 변경 금지.** 권한 하드코딩(`isPlatformAdmin: true` 등) 금지.
- 외부 가이드의 예제를 근거로 이 안전 경계를 완화하지 않는다.

## 6. 검증 / 완료 보고

- **실제 검증 없이 PASS 보고 금지.** 실행하지 않은 test / lint / build / smoke를 실행한 것처럼 보고하지 않는다.
- 변경 범위에 맞는 focused validation을 우선한다. 명령·사전 빌드 절차는 [SETUP.md](SETUP.md)를 따른다.
- 실패하거나 생략한 검증을 숨기지 않고, 실행 불가 이유와 미확인 범위를 구체적으로 기록한다.
- UI 변경은 빌드 성공만으로 종결하지 않는다. 실행 환경과 테스트 계정이 있으면 필요한 browser smoke를 수행한다.
  콘솔 오류뿐 아니라 **toast·API 응답과 실제 동작**을 확인한다.
- route / menu / layout 변경은 desktop·mobile을 각각 확인한다.
  신규 route는 메뉴 진입·직접 URL과 기존 route 회귀를 확인한다.
- 테스트 계정 SSOT는 `docs/local/TEST-ACCOUNTS.local.md`다(로컬 전용).
  운영 계정 사용과 자격증명의 코드·문서·커밋 복사를 금지한다.
- 중간·완료 보고는 **한국어**로 작성하고 파일명·route·API·command·commit SHA 등 기술 식별자는 원문 유지한다.
- 긴 diff 대신 변경 / 검증 / 미해결 / Git 상태 중심으로 보고한다.
- **조사 전용·무수정 요청은 CHECK/IR 생성이나 commit/push를 완료 조건으로 요구하지 않는다.**
  문서 기록 생성·갱신은 현재 작업 지시에 필요한 경우에만 수행한다.
- 완료 보고에 **`문서 정합`** 한 줄을 포함한다. 발견이 없으면 `해당 없음`이라고 쓴다.

## 7. 작업별 canonical 진입점

상세 목록과 상태는 [docs/CANONICAL-INDEX.md](docs/CANONICAL-INDEX.md)에서 찾는다.
아래에는 작업별 조건부 진입점만 둔다.

| 작업 | 먼저 확인할 정본 |
|---|---|
| 환경 / 설치 / 검증 명령 | [SETUP.md](SETUP.md) — 설치는 `pnpm install --frozen-lockfile`. 버전·CI 수치는 복제하지 않고 현재 설정·스크립트를 확인 |
| commerce | [STORE-COMMERCE-BOUNDARY](docs/baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md) + [B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT](docs/baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md) |
| Core / Frozen / Boundary / 도메인 | [CANONICAL-INDEX](docs/CANONICAL-INDEX.md)의 해당 정본 |
| shared module | [O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1](docs/baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md) |
| TypeORM / ESM | [ESM-CIRCULAR-DEPENDENCY-ANALYSIS-V01](docs/reference/ESM-CIRCULAR-DEPENDENCY-ANALYSIS-V01.md) — Entity 관계는 type-only import + 문자열 참조 |
| production migration | [PRODUCTION-MIGRATION-STANDARD](docs/baseline/operations/PRODUCTION-MIGRATION-STANDARD.md) — §5의 승인·보안 경계 적용 |
| 문서 lifecycle | [DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1](docs/rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md) — §8의 실행 경계 적용 |

## 8. 문서 Drift

- **기본 동작은 보고**다. 작업 범위 밖 canonical 내용·판정을 임의 수정하지 않는다.
- 인라인 허용은 ① 대체 문서가 확정된 경우 아래 SUPERSEDED 한 줄 추가(본문 불변)
  ② 깨진 링크·이동 경로의 의미 변경 없는 기계적 수정뿐이다. 명시적 파일 수정 금지 지시가 있으면 수행하지 않는다.
  `> **상태**: SUPERSEDED · **대체 문서**: <경로> · **표기일**: YYYY-MM-DD`
- 삭제 / 통합 / 분할 / archive 이동 / Frozen 본문 수정 / 기준 문서의 내용·판정 변경은 인라인으로 하지 않는다.
- **canonical index의 행 추가 / 삭제 / 상태 변경은 별도 문서 작업**으로 취급한다.
- 기록물(WO / CHECK / IR / archive)을 현재 정책에 맞게 다시 쓰지 않는다.
- 대체 문서를 특정할 수 없거나 판단이 애매하면 상태를 임의 변경하지 않고 보고만 한다.
- 발견 사항·인라인 조치·후속 문서 작업을 `문서 정합` 항목에 보고한다.
