# AGENTS.md — Codex / Agent 진입점

> 이 문서는 **Codex 및 일반 에이전트의 독립 진입점**이다.
> 이 문서만 읽고 작업을 시작할 수 있어야 한다. `CLAUDE.md` 를 선행 조건으로 요구하지 않는다.
> (`CLAUDE.md` 는 Claude Code 의 진입점이며, 두 문서는 **동급**이다. 공통 규칙은 아래 정본을 함께 참조한다.)

---

## 1. 시작 전 확인 — 공통 정본

규칙의 원문은 아래 문서에 있다. 이 파일은 그것을 **복사하지 않고 가리킨다.**

| 영역 | 정본 |
|---|---|
| 사업 철학 (참여 주체 · HUB · AI 역할) | [`docs/baseline/O4O-BUSINESS-PHILOSOPHY-V1.md`](docs/baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) |
| 3자 Canonical Flow (책임 · 데이터 흐름) | [`docs/baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md`](docs/baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) |
| Domain Boundary · Guard Rules 5종 | [`docs/architecture/O4O-BOUNDARY-POLICY-V1.md`](docs/architecture/O4O-BOUNDARY-POLICY-V1.md) |
| Core 동결 범위 | [`docs/architecture/O4O-CORE-FREEZE-V1.md`](docs/architecture/O4O-CORE-FREEZE-V1.md) |
| 공통 모듈 변경 절차 | [`docs/baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md`](docs/baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md) |
| **개발환경 · 검증 명령 · CI 게이트** | [`SETUP.md`](SETUP.md) |
| **Git 병렬 작업 · PC 이동** | [`docs/baseline/operations/O4O-GIT-PARALLEL-WORK-SAFETY-V1.md`](docs/baseline/operations/O4O-GIT-PARALLEL-WORK-SAFETY-V1.md) |
| 프로덕션 마이그레이션 | [`docs/baseline/operations/PRODUCTION-MIGRATION-STANDARD.md`](docs/baseline/operations/PRODUCTION-MIGRATION-STANDARD.md) |
| Frozen Baseline 목록 · 도메인별 규칙 색인 | [`CLAUDE.md`](CLAUDE.md) §14 · 상세 규칙 문서 목록 |
| 문서 폴더 구조 | [`docs/README.md`](docs/README.md) |

작업 시작 전, **현재 WO/IR/CHECK 가 가리키는 영역의 baseline 문서**를 확인한다.

충돌 시 우선순위:

1. 사용자의 현재 명시적 지시
2. 영역별 Freeze / Baseline 정본 (위 표)
3. 본 문서(AGENTS.md)의 실행 규칙
4. 작업별 IR / WO / CHECK

---

## 2. 개발환경

절차·명령·버전은 [`SETUP.md`](SETUP.md) 가 정본이다. 여기서는 반복하지 않는다.

작업 중 최소한 알아야 할 것:

- 설치는 `pnpm install --frozen-lockfile` (Node 22.18.0 · pnpm 10.25.0, `volta` 기준)
- 검증은 `pnpm run type-check` · `pnpm run lint` · `pnpm test` · `pnpm run build`
- CI 는 대부분 blocking 이며, lint 는 기존 오류 **102건 baseline 의 회귀 차단(ratchet)** 이다
  → 신규 lint 오류는 CI 를 막는다
- api-server 를 clean 상태에서 type-check 하려면 사전 빌드가 필요하다 (`SETUP.md` §5)

---

## 3. Git 안전

절차의 정본은 [`O4O-GIT-PARALLEL-WORK-SAFETY-V1.md`](docs/baseline/operations/O4O-GIT-PARALLEL-WORK-SAFETY-V1.md) 다.
**다중 PC · 다중 세션(사람 + AI)이 같은 `main` 에 직접 커밋**하는 환경이므로 아래는 예외 없이 지킨다.

- 작업 전 `git status --short` · `git branch --show-current` · `git fetch origin` · `git status -sb`
- **path-specific stage 만 사용.** `git add .` · `git add -A` · `git commit -am` 금지
- 다른 세션의 수정·미추적 파일은 **불가침** (판단·커밋·정리 대상 아님)
- 범위 밖 파일을 `restore` / `reset` / `stash` 하지 않는다
- `--force` push 금지
- 완료 조건은 저장소 전체 clean 이 아니라 **`이번 WO 범위의 미커밋 변경 0건` + `HEAD == origin/main`**

---

## 4. DB · 보안 (절대 규칙)

상세는 [`PRODUCTION-MIGRATION-STANDARD.md`](docs/baseline/operations/PRODUCTION-MIGRATION-STANDARD.md) 와 [`SETUP.md`](SETUP.md) §4.

- **기본 환경은 프로덕션이다.**
- read-only 검증(SELECT · 상태 조회 · migration 이력)은 허용 범위에서 직접 수행 가능.
- **UPDATE / DELETE / DROP / ALTER · 대량 write · migration 적용은 사용자 명시 승인 필요.**
- 실제 DB host / password / 계정값을 문서 · 로그 · 커밋 · 스크린샷에 기록하지 않는다.
- 운영 데이터 보고 시 민감정보는 요약 · 마스킹한다.

---

## 5. 실행 원칙

```text
조사 → 문제 확정 → 최소 수정 → 검증 → CHECK/IR 갱신 → path-specific stage → commit → push → 완료 보고
```

- WO 가 **조사 전용**이면 구현하지 않는다.
- WO 가 **구현을 명시**하면 조사 후 안전 범위 안에서 검증까지 중간 승인 없이 계속 진행한다.
- 작업 범위 밖은 수정하지 않는다. 발견한 범위 밖 문제는 **보고**하고 별도 WO 로 분리한다.

---

## 6. 중지 조건

아래는 진행을 멈추고 사용자 판단을 요청한다.

- WO 범위 밖 파일 수정 필요
- 다른 세션의 dirty 파일 접촉 필요
- DB schema / migration 필요
- `package.json` / lockfile / dependency 변경 필요
- Docker / CI / build 인프라 변경 필요
- Core · Frozen · 공통 계약 변경 필요
- 권한 / role / route / API contract 변경 필요
- 데이터 삭제 · 대량 update · seed 변경 필요
- 결제 · 정산 · 법률 · 규제 판단 필요
- 실제 계정 · 자격정보 · 외부 서비스 승인 필요
- 현재 변경과 무관한 build / test 실패

---

## 7. 검증 기준

- 빌드 성공만으로 UI 작업을 종결하지 않는다.
- 실행 환경과 테스트 계정이 있으면 browser smoke 를 수행한다.
  콘솔 오류 0 만으로 PASS 판정하지 않고 **toast · API 응답까지** 확인한다.
- route / menu / layout 변경은 desktop · mobile 모두 확인한다.
- 신규 route 는 메뉴 진입과 직접 URL 을 모두 확인한다. 기존 route 회귀도 확인한다.
- smoke 가 불가하면 **구체적인 이유**를 기록한다.
- 테스트 계정은 `docs/local/TEST-ACCOUNTS.local.md` 가 SSOT 다. 운영 계정 사용 금지,
  계정값을 코드 · 문서 · 커밋에 복사하지 않는다.

---

## 8. 코드 규칙

- 의존 방향 `Core → Extension → Feature → Service` 유지 (역방향 금지).
- 공통 sidebar / menu / layout / config / capability 수정 시 **모든 소비처 영향도를 먼저 확인**한다.
  단일 서비스 기준으로 완료 판단하지 않는다 (절차: 공통 모듈 변경 정본 문서).
- route 없는 메뉴를 노출하지 않고, 실기능이 있는 메뉴를 은폐하지 않는다.
- UI 정책 문제를 DB backfill · migration 으로 우회하지 않는다.
- TypeScript + ES modules. 명명·스타일 규칙은 [`README.md`](README.md) 코딩 컨벤션을 따른다.
- 기존 코드 패턴을 우선 따르고, 명확한 이유 없이 과도한 추상화·리팩터링을 하지 않는다.

> **TypeORM Entity (위반 시 API 서버 기동 실패)** — 상세: [`docs/reference/ESM-CIRCULAR-DEPENDENCY-ANALYSIS-V01.md`](docs/reference/ESM-CIRCULAR-DEPENDENCY-ANALYSIS-V01.md)
> ```typescript
> import type { RelatedEntity } from './related.entity.js';   // type-only import
> @ManyToOne('RelatedEntity', 'property')                      // 문자열 참조
> ```

---

## 9. 완료 보고

- 중간 보고와 완료 보고는 **한국어**로 작성한다.
- 파일명 · route · API · component · commit hash 등 기술 식별자는 원문을 유지한다.
- 긴 diff 나 전체 파일을 그대로 붙이지 않는다.
- 변경 / 미변경 / 검증 결과 / CHECK / Git 상태 중심으로 간결하게 쓴다.
- 검증에 실패했거나 건너뛴 항목이 있으면 **숨기지 않고 그대로** 보고한다.
- 작업이 끝나면 관련 CHECK / IR 문서를 갱신한다.
