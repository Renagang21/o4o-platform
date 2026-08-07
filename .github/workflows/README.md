# GitHub Actions Workflows

이 폴더의 워크플로 목록이다. **배포 인프라·서비스 대응표의 정본은
[`scripts/README.md`](../../scripts/README.md)** 이며, 여기서는 중복 서술하지 않는다.

## 검증 (CI)

| 워크플로 | 트리거 | 역할 |
|---|---|---|
| `ci-pipeline.yml` | main push · PR | type-check · lint(ratchet) · test · build. **대부분 blocking** |
| `ci-guard-policy.yml` | PR (`services/web-*/src/**`) | RoleGuard 정적 분석 (GUARD-005~007) |
| `ci-appstore-guard.yml` | manifest·lifecycle 변경 | App Store 일관성 가드 |
| `ci-security.yml` | main push · PR · 주간 | CodeQL 보안 분석 |
| `e2e-auth-runtime.yml` | 수동 · auth 관련 경로 변경 | 4개 서비스 auth 런타임 E2E |

## 배포

| 워크플로 | 대상 |
|---|---|
| `deploy-api.yml` | `o4o-core-api` (+ 마이그레이션 Job) |
| `deploy-web-services.yml` | 서비스별 웹 5종 (변경 감지 후 선별 배포) |
| `deploy-admin.yml` | `o4o-admin-dashboard` |
| `deploy-main-site.yml` | `o4o-main-site` |

## 자동화

| 워크플로 | 역할 |
|---|---|
| `automation-pr-labeler.yml` | PR 크기 라벨 |
| `automation-repo-setup.yml` | 저장소 설정 자동화 |

## 공통 액션

`.github/actions/setup-build-env/action.yml` — pnpm/Node 셋업 + 의존성 설치 + 공유 패키지 빌드.
`strict-lockfile: 'true'` 로 opt-in 하면 lockfile drift 를 실패로 만든다(CI Pipeline 이 사용).

## 규칙

- 로컬 검증 명령과 CI 의 의미를 일치시킨다 — [`SETUP.md`](../../SETUP.md) §5.
- lint 는 회귀 차단 ratchet 이다. baseline 은 내리는 방향으로만 갱신한다
  ([`scripts/lint-ratchet.mjs`](../../scripts/lint-ratchet.mjs)).
