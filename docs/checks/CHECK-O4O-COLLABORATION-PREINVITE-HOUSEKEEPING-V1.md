# CHECK-O4O-COLLABORATION-PREINVITE-HOUSEKEEPING-V1

- **WO**: WO-O4O-COLLABORATION-PREINVITE-HOUSEKEEPING-V1
- **선행**: WO-O4O-PRODUCTION-DEPLOY-GOVERNANCE-COLLABORATION-ALIGNMENT-V1 (`559740cde`, 판정 B. READY_WITH_KNOWN_LIMITATION)
- **일자**: 2026-09-30
- **기준 HEAD**: `559740cde` (== origin/main, 시작 시 foreign 변경 0)

## 결과 요약

| 항목 | 판정 |
|---|---|
| DEAD_DEVELOP_DEPLOY_TRIGGER | **REMOVED** |
| SECRETS_SETUP_LEGACY_DRIFT | **CLEANED** |
| WORKFLOW_README_SERVICE_COUNT | **CURRENT** (9종 + 서비스 목록) |
| SECRET_SCAN_SCRATCH | **DELETED** (에이전트 삭제 권한 거부 → 사용자 수동 삭제, §5 후속 확인) |
| DEPLOY_BEHAVIOR_REGRESSION | **0** |
| PRODUCTION_CHANGE | **0** |
| COLLABORATION_READY | **READY_WITH_KNOWN_LIMITATION** (변동 없음) |

## 1. Fresh Census

- `git ls-remote --heads origin develop` → 결과 없음. origin 에 `develop` branch 부재 재확인.
- `develop` push trigger 보유 workflow: `deploy-admin.yml` (`branches: [ main, develop ]`), `deploy-web-services.yml` (`- main` / `- develop`). `deploy-api.yml` 은 main 만.
- secret 참조 (workflow 전체 `secrets.*`): `GCP_SA_KEY`(deploy 3종, `credentials_json`) · `GCP_DB_USERNAME` · `GCP_DB_NAME` · `GCP_JWT_SECRET` · `SMTP_USER` · `SMTP_PASS` · `GEMINI_API_KEY` · `OPENAI_API_KEY` · `TOSS_PAYMENTS_CLIENT_KEY` · `TOSS_PAYMENTS_SECRET_KEY` (이상 deploy-api) · `GITHUB_TOKEN`(자동).
- DB 비밀번호: workflow 는 GitHub secret 이 아니라 Secret Manager `o4o-db-password` 를 `--set-secrets` / `--update-secrets` 로 참조.
- variable 참조: `DEPLOY_ENABLED` · `GOOGLE_WEB_CLIENT_ID` · `AI_DEFAULT_PROVIDER` · `AI_DEFAULT_MODEL_OPENAI`.
- 등록 상태 (이름만 조회 · 값 미열람): repository secret 에 `GCP_DB_PASSWORD` · `E2E_*_ADMIN_*` 6종이 등록돼 있으나 workflow 미참조. `TOSS_PAYMENTS_*` 는 참조되나 미등록. `production` environment secret 0.

## 2. 삭제한 develop trigger

| 파일 | 변경 |
|---|---|
| `deploy-admin.yml` | `branches: [ main, develop ]` → `branches: [ main ]` |
| `deploy-web-services.yml` | `- develop` 행 삭제 · 상단 설명 주석 `main/develop` → `main` |

**남긴 것**: `deploy-admin.yml` `Determine deployment target` step 의 `refs/heads/develop` 분기(→ `-dev` 서비스)는 WO §2 "steps 변경 금지" 에 따라 유지했다. `deploy-target-ref-resolution.spec.ts` 가 이 분기 유지를 계약으로 검사한다. trigger 제거로 push 경로는 닫혔으나 `workflow_dispatch` 로 `develop` ref 를 지정하면 여전히 도달 가능한 분기이며(현재 branch 부재로 실질 도달 불가), 제거는 별도 판단 사항이다.

## 3. SECRETS_SETUP.md 변경

- 제거: 구 웹서버 IP · Nginx 정적 호스팅 서술 · `WEB_SERVER_SSH_KEY` 섹션 → "은퇴한 항목" 1줄로 대체.
- 현행화: 인프라 구성(API · 웹 9종 · admin · Cloud SQL + Secret Manager) · 실제 참조 secret 표(이름 · 용도 · 참조 workflow) · variable 표.
- 신규 기록: 참조되지 않는 등록 secret(`GCP_DB_PASSWORD`, `E2E_*_ADMIN_*`)은 "정리 후보 · 삭제는 별도 판단" 으로만 표기. `TOSS_PAYMENTS_*` 미등록 사실 표기.
- 값은 읽거나 기록하지 않았다.

## 4. workflow README 정정

`deploy-web-services.yml` 행: "웹 5종" → "웹 9종" + Cloud Run 서비스 목록(`neture-web` · `k-cosmetics-web` · `kpa-society-web` · `pharmacy-hub-web` · `lecture-web` · `hospital-pharmacy-web` · `store-web` · `kpa-branch-web` · `signage-player-web`) — workflow 의 `gcloud run deploy` 대상과 대조.

## 5. scratch 파일

- 대상 디렉터리: `C:\Users\home\AppData\Local\Temp\claude\c--Users-home-coding-o4o-platform\3b70e371-dc91-4dae-87a9-6f5dcd0fda63\scratchpad\` — 저장소 밖(untracked), 본 세션 전용, 운영 참조 없음.
- reparse point(junction/symlink) 검사: **0건** (총 855 항목).
- 삭제 시도 → **권한 거부**. 우회 · 권한 상승 없이 **MANUAL_DELETE_REQUIRED**.

수동 삭제 대상 (위 scratchpad 기준 상대 경로):

| 유형 | 항목 |
|---|---|
| 디렉터리 (임시 bare repo) | `prscan.git\` |
| 디렉터리 (gitleaks 결과) | `gl\` |
| gitleaks / 스캔 결과 | `pr_gitleaks.json` · `blobscan.json` · `pr_new_commits.txt` · `pr_new_objs.txt` · `allpaths.txt` · `lsremote.txt` |
| 임시 스크립트 | `blobscan.py` · `ctx.py` · `envaudit.py` · `fixcomments.py` · `jwtcheck.py` · `livecheck.py` · `prblobscan.py` · `prctx.py` · `prgl.py` · `prshape.py` · `reuse.py` · `settings_scan.py` · `shape.py` · `triage2.py` · `sem.mjs` |
| 임시 스크립트 (scratchpad 밖) | `C:\Users\home\AppData\Local\Temp\yamleq.mjs` |

수동 명령 (PowerShell): `Remove-Item -Recurse -Force '<scratchpad 절대경로>\*'` · `Remove-Item 'C:\Users\home\AppData\Local\Temp\yamleq.mjs'`

**후속 (2026-09-30)**: 사용자가 수동 삭제 완료. 확인 결과 scratchpad 항목 0 · `yamleq.mjs` 부재 → **SECRET_SCAN_SCRATCH = DELETED**.

## 6. workflow semantic comparison

HEAD 대비 작업트리를 YAML parse 후 비교. 변경 전 객체에서 `on.push.branches` 의 `develop` 만 제거한 결과가 변경 후 객체와 **완전 일치**:

| 파일 | before branches | after branches | workflow_dispatch | develop 제거 외 동일 |
|---|---|---|---|---|
| deploy-admin.yml | main, develop | main | 유지 | ✅ |
| deploy-web-services.yml | main, develop | main | 유지 | ✅ |
| deploy-api.yml | main | main | 유지 | ✅ (미변경) |

→ `DEPLOY_ENABLED` 조건 · migrate_only · expected_sha · permissions · environment · steps · service job 구성 · GCP 인증(`credentials_json`) 무변경.

## 7. tests

| 대상 | 결과 |
|---|---|
| api-server workflow 정적 spec 11종 (`deploy-api-migrate-only-path` · `deploy-target-ref-resolution` · `signage-player-web-deployment-contract` 등) | 207/207 PASS |
| `scripts/ci/__tests__/detect-affected.test.mjs` | 75/75 PASS |
| `scripts/db/check-migration-contract.mjs` | 21/21 PASS |

## 8. 변경 파일

- `.github/workflows/deploy-admin.yml`
- `.github/workflows/deploy-web-services.yml`
- `.github/workflows/README.md`
- `.github/SECRETS_SETUP.md`
- `docs/checks/CHECK-O4O-COLLABORATION-PREINVITE-HOUSEKEEPING-V1.md` (본 문서)

commit: 본 CHECK 와 동일 커밋 (main 직접 push).

## 9. production change = 0

`DEPLOY_ENABLED=false` 유지 · deploy dispatch 0 · migration 0 · DB write 0 · Cloud Run 변경 0 · secret/variable 변경 0 · GCP IAM 변경 0. push 로 기동되는 deploy workflow 는 gate 닫힘으로 `deploy-hold-notice` 만 실행되는 것을 확인한다.

## 10. 잔여 known limitation (해결되지 않음)

```text
GitHub write collaborator
→ workflow 를 변경할 수 있음
→ repository GCP credential(GCP_SA_KEY)을 통해 production 에 기술적으로 도달 가능
```

이번 housekeeping 은 이를 기술적으로 해결하지 않았다. 통제 수단은 루트 README "Production 변경 원칙" 합의 규칙이다. SA 권한 최소화 · 키 교체 · WIF 전환 · migrate_only 실행자 제한은 별도 보안 아키텍처 작업.

별도 판단 후보(이번 미처리): 미참조 등록 secret(`GCP_DB_PASSWORD`, `E2E_*_ADMIN_*` 6종) 삭제 · `deploy-admin` target step 의 `develop` 분기 · `TOSS_PAYMENTS_*` 참조 존치 여부.
