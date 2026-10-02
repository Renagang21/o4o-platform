# GitHub Secrets 설정 가이드

이 문서는 O4O Platform 배포 workflow 가 참조하는 GitHub Actions secret · variable 의 **이름과 용도**만 적는다.
값은 어디에도 기록하지 않는다. 배포 게이트 · 변경 원칙은 루트 [`README.md`](../README.md) "배포" · "Production 변경 원칙" 절이 정본이다.

## 인프라 구성 (2026-09-30 확인)

- **API 서버**: GCP Cloud Run `o4o-core-api` (+ 마이그레이션 Job `o4o-api-migrations`) — `deploy-api.yml`
- **웹 서비스**: GCP Cloud Run 서비스별 웹 9종 — `deploy-web-services.yml` (목록은 [`workflows/README.md`](workflows/README.md))
- **관리자 대시보드**: GCP Cloud Run `o4o-admin-dashboard` — `deploy-admin.yml`
- **데이터베이스**: GCP Cloud SQL (PostgreSQL). DB 비밀번호는 GitHub secret 이 아니라 **GCP Secret Manager `o4o-db-password`** 를 Cloud Run 이 직접 참조한다.

**목표 구조 (WO-O4O-PUBLIC-COLLABORATOR-PRODUCTION-BOUNDARY-AND-MAIN-PROTECTION-V1)**: 아래 secret 은 전부 **`production` Environment secret** 이다.
`production` Environment 는 배포 ref 를 `main` branch · `deploy/*` tag 로 제한한다(required reviewer 없음) — collaborator branch · PR 의 workflow 는 받지 못한다.
secret 을 쓰는 job 은 모두 `environment: production` 을 선언한다(`scripts/ci/__tests__/deploy-workflow-gates.test.mjs` 가 검사).

> **이행 상태 (2026-10-02)**: environment ref 제한 적용됨 · environment secret 0 — 값 이전(`gh secret set <NAME> --env production`, 소유자)과
> 저장소 수준 사본 삭제는 **진행 전**. 이전 전까지는 저장소 수준 secret 이 그대로 쓰인다.

## Production secrets (workflow 가 참조하는 것)

| 이름 | 용도 | 참조 workflow |
|---|---|---|
| `GCP_SA_KEY` | GCP 서비스 계정 JSON 키 — `google-github-actions/auth` 의 `credentials_json` (build · push · Cloud Run 배포 · migration Job) | `deploy-api` · `deploy-web-services` · `deploy-admin` |
| `GCP_DB_USERNAME` | Cloud SQL 사용자명 → API `DB_USERNAME` | `deploy-api` |
| `GCP_DB_NAME` | Cloud SQL 데이터베이스명 → API `DB_NAME` | `deploy-api` |
| `GCP_JWT_SECRET` | API `JWT_SECRET` · `JWT_REFRESH_SECRET` | `deploy-api` |
| `SMTP_USER` · `SMTP_PASS` | API 메일 발송 계정 | `deploy-api` |
| `GEMINI_API_KEY` · `OPENAI_API_KEY` | API AI provider 키 | `deploy-api` |
| `TOSS_PAYMENTS_CLIENT_KEY` · `TOSS_PAYMENTS_SECRET_KEY` | API 결제 연동 키 (workflow 는 참조하지만 2026-09-30 기준 저장소에 미등록 — 빈 값으로 주입된다) | `deploy-api` |

`GITHUB_TOKEN` 은 GitHub 이 자동 발급하므로 등록하지 않는다.

## Repository variables

| 이름 | 용도 |
|---|---|
| `DEPLOY_FREEZE` | 배포 게이트(비상 정지). 정확히 `'false'` 일 때만 배포 — 정상 운영값 `false`. 부재 · 공백 · `true` · 오타 = freeze (fail-closed). `DEPLOY_ENABLED` 는 2026-10-01 은퇴 |
| `GOOGLE_WEB_CLIENT_ID` | API `GOOGLE_WEB_CLIENT_ID` · `GOOGLE_ALLOWED_CLIENT_IDS` |
| `AI_DEFAULT_PROVIDER` · `AI_DEFAULT_MODEL_OPENAI` | API AI 기본값 (미등록 시 빈 값 → 서버 기본값) |

## 참조되지 않는 등록 secret (정리 후보 · 삭제는 별도 판단)

| 이름 | 상태 |
|---|---|
| `GCP_DB_PASSWORD` | workflow 미참조 — DB 비밀번호는 Secret Manager `o4o-db-password` 사용 |
| `E2E_{KCOS,KPA,NETURE}_ADMIN_{EMAIL,PASSWORD}` | `e2e-auth-runtime.yml` 이 소비를 제거함(로그인 수단 Google 단일화) |

## 은퇴한 항목

- 구 웹서버(Nginx 정적 호스팅) 와 `WEB_SERVER_SSH_KEY` 기반 SSH 배포는 Cloud Run 전환으로 은퇴했다. 어떤 workflow 도 참조하지 않는다.

## Secret 추가 · 변경

Settings → Secrets and variables → Actions. **Production 변경 원칙에 따라 저장소 소유자 승인 없이 추가 · 변경 · 열람 · 반출하지 않는다.**

## 보안 주의사항

1. 실제 값을 코드 · 문서 · 로그 · 커밋에 포함하지 않는다.
2. 저장소 쓰기 권한자는 workflow 를 통해 위 secret 에 기술적으로 접근할 수 있다(known limitation) — 규칙은 루트 README 가 정본이다.
