# WO-O4O-MAIN-SITE-DECOMMISSION-FINAL-CLOSURE-V1 — CHECK

- **작업일**: 2026-08-20
- **대상**: Cloud Run `o4o-main-site` (GCP `netureyoutube` / `asia-northeast3`)
- **선행**: [RUNTIME-CONTRACT-AUDIT](WO-O4O-MAIN-SITE-RUNTIME-CONTRACT-AUDIT-AND-DECOMMISSION-DECISION-V1-CHECK.md) · [UNIQUE-VIEWER-MIGRATION](WO-O4O-MAIN-SITE-UNIQUE-VIEWER-MIGRATION-AND-PREVIEW-LINK-CLOSURE-V1-CHECK.md)

---

## 1. 요약 판정

| 항목 | 결과 |
|---|---|
| Final Gate | **PASS (8/8)** |
| Cloud Run `o4o-main-site` | **삭제 완료** |
| legacy deploy workflow | **삭제 완료** (`deploy-main-site.yml`) |
| runtime consumer | **0** |
| `ACTIVE_REFERENCE` 잔존 | **0** |
| `UNKNOWN` | **0** |
| 다른 Cloud Run 서비스 | 11 → 10, 전부 `Ready=True` / `traffic=100` |
| production 웹/API/auth | 정상 (신규 ERROR 0) |
| 비용 판정 | `NO_COST_EFFECT` + `INDIRECT_COMPLEXITY_REDUCTION` |

---

## 2. 삭제 전 리소스 실측 (기록 보존)

| 항목 | 값 |
|---|---|
| 서비스 | `o4o-main-site` |
| 마지막 revision | `o4o-main-site-00022-g9d` (generation 22, 총 22 revisions) |
| image | `asia-northeast3-docker.pkg.dev/netureyoutube/o4o-api/main-site:b7abe85edbd81e809fc507ba4828872b14ab3d56` |
| URL | `https://o4o-main-site-3e3aws7zqa-du.a.run.app` |
| spec | cpu 1 · 256Mi · port 8080 · maxScale 5 · minScale 0 · concurrency 80 · timeout 60s |
| env | `[]` (없음) |
| service account | `117791934476-compute@developer.gserviceaccount.com` (기본 compute SA, 공용) |

---

## 3. Final Gate (§4) — 삭제 직전 live 재확인

| # | 기준 | 실측 | 판정 |
|---|---|---|---|
| 1 | 유의미 트래픽 0 | 24h 2건 / 7d 3건. 1건 `curl/8.5.0` + Azure IP `172.174.110.132` = GitHub Actions self-smoke, 2건 = 본 작업 워크스테이션 IP `124.194.156.36` (`https://api.ipify.org` 로 자기 IP 대조). **외부 사용자 트래픽 0** | PASS |
| 2 | GCLB backend 연결 0 | backendService 중 `o4o-main-site` 대상 0건 | PASS |
| 3 | serverless NEG 0 | 프로젝트 NEG 8건 전수 resolve → 전부 타 서비스 | PASS |
| 4 | domain mapping 0 | `gcloud run domain-mappings list` 프로젝트 전역 0건 | PASS |
| 5 | Cloud Scheduler 0 | Cloud Scheduler API 자체가 `SERVICE_DISABLED` = 미활성 → job 0건 확정 | PASS |
| 6 | 타 서비스 runtime link 0 | `o4o-main-site` run.app URL 을 참조하는 실행 코드/env 0건 | PASS |
| 7 | 유일 기능 0 | 선행 WO 에서 3 viewer 전부 `DEAD_FEATURE` 판정 후 제거 완료 | PASS |
| 8 | CI 의존 | `deploy-main-site.yml` 1건뿐. `workflow_call` 없음 → 재사용 워크플로 아님. 타 워크플로 참조 0 | PASS |

---

## 4. Workflow 처리 (§5)

- `.github/workflows/deploy-main-site.yml` **삭제**.
- **재배포 유발 여부 사전 확인**: 해당 workflow 의 trigger 는 `push: paths: ['apps/main-site/**', '.github/workflows/deploy-main-site.yml']`.
  GitHub Actions 는 **push 의 head commit 시점에 존재하는 workflow 파일만 평가**하므로, 삭제 커밋 자체는 이 workflow 를 실행시키지 않는다. → 마지막 유령 배포 없음.
- `workflow_call` 정의가 없어 다른 워크플로의 reusable 호출 대상도 아니다.
- `ci-pipeline.yml:134` 의 `matrix: app: [main-site, admin-dashboard]` 는 **의도적으로 유지**했다. build 검증 전용이며 배포하지 않는다. 보존된 source 의 컴파일 가능 상태를 지킨다.

---

## 5. Cloud Run 삭제 (§6)

```
gcloud run services delete o4o-main-site --region asia-northeast3 --quiet
→ Deleted service [o4o-main-site].
```

- 삭제 후 revision 잔재 **0건**.
- run.app URL → **404** (Cloud Run 미배포 응답).

### 임시 프로세스 안전 규칙 준수 (§3)

이번 WO 에서 기동한 보조 프로세스는 없다. 이전 WO 에서 image 명 기준 일괄 종료로 타 세션 `cloud-sql-proxy` 를 종료시킨 사고가 있었으므로, 본 WO 는 **프로세스명/image명 기준 종료를 일절 수행하지 않았다.**

---

## 6. Cloud Run 재 census (§10)

| 구분 | 삭제 전 | 삭제 후 |
|---|---|---|
| 서비스 수 | 11 | **10** |
| `Ready=True` | 전부 | **전부** |
| `traffic=100` (latest) | 전부 | **전부** |

`o4o-main-site` 외 어떤 Cloud Run 서비스도 수정하지 않았다.

---

## 7. Image 판정 (§7)

| 대상 | 판정 | 근거 |
|---|---|---|
| `o4o-api/main-site` (23 versions) | **`ORPHAN_MANUAL_CANDIDATE`** | 이 image 를 쓰는 Cloud Run 서비스 0건. 다만 Artifact Registry 정책 중 `keep-recent-50-versions` (**KEEP**, keepCount 50) 가 `delete-any-older-than-30d` (**DELETE**) 보다 우선하므로, 23 versions 는 **자동 정리되지 않는다** |
| 그 외 `o4o-api/*` | `ACTIVE_SHARED` | 다른 서비스가 실행 중 |

§7 의 "cleanup policy 가 자동 정리하도록 되어 있으면 즉시 수동 삭제를 강제하지 않아도 된다" 는 이 image 에는 **해당하지 않는다**(KEEP 정책이 자동 정리를 막는다). 그러나 active shared image 삭제 금지 원칙과 범위 관리를 위해, 수동 삭제는 **후속 WO 후보**로 남긴다. 이번 WO 에서 image 는 삭제하지 않았다.

---

## 8. Secret / env / SA 판정 (§8)

| 대상 | 판정 |
|---|---|
| `GCP_SA_KEY` | **공용** — 9개 workflow 가 사용. 유지 |
| service account `117791934476-compute@…` | **공용 기본 compute SA** — 유지 |
| main-site 전용 secret / env | **0건** (서비스 spec env 가 `[]`) |

main-site 전용 secret·IAM 은 존재하지 않았다. 삭제 대상 없음.

---

## 9. 저장소 정리 (§9)

| 파일 | 변경 |
|---|---|
| `.github/workflows/deploy-main-site.yml` | **삭제** |
| `.github/workflows/README.md` | `deploy-main-site.yml` → `o4o-main-site` 행 제거 |
| `scripts/README.md` | `o4o-main-site` 배포 대상 행 + 트리 라인 제거 |
| `SETUP.md` | §7 프로덕션 참조 표에서 `Main Site` 행 제거 |
| `README.md` | 배포 워크플로 표에서 `deploy-main-site.yml` 행 제거 |
| `apps/main-site/README.md` | 상단에 `RETIRED_RUNTIME (2026-08-20)` 배너 추가 |

`apps/main-site` source 전체는 **삭제하지 않았다** (§9 지시). 참고·재사용 자산으로 남고 `ci-pipeline.yml` build 검증에는 계속 포함된다.

---

## 10. URL/이름 잔재 분류 (§12)

정리 후 `git grep -In "o4o-main-site"` · `"deploy-main-site"` 전수 재조사 결과:

| 분류 | 건수 | 내용 |
|---|---|---|
| `HISTORICAL_DOC` | 11 파일 | `docs/checks/**` 8건 · `docs/archive/**` 1건 등 과거 시점 기록. **수정하지 않는다** (§14 · CLAUDE.md §16-1) |
| `SOURCE_ASSET` | 3 | `apps/main-site/README.md` 배너 · `admin-dashboard` publisher edit 2곳의 설명 주석 (실행 코드 아님) |
| `DEAD_RUNTIME_REFERENCE` | **0** | (`README.md:113` 1건이 남아 있었으나 이번에 제거) |
| `ACTIVE_REFERENCE` | **0** | — |
| `UNKNOWN` | **0** | — |

---

## 11. Production 검증 (§11)

| 항목 | 결과 |
|---|---|
| `/health` | 200 |
| `/health/database` | healthy (pingMs 4) |
| 도메인 8개 | https=200 / http=301 (glucoseview http=200) / `tls_verify=0` 전부 |
| Cloud Run `severity>=ERROR` (30m) | **0** |
| LB 5xx (30m) | **0** |
| auth smoke (쿠키 자 사용) | login 200 · `/auth/me` 200 · `/auth/services` 200 · `/auth/logout` 200 — **4/4 PASS** |

삭제 전 baseline 과 동일 → **회귀 없음**. 자격증명은 `docs/local/TEST-ACCOUNTS.local.md` 에서만 참조했고 어디에도 기록하지 않았다.

---

## 12. 비용 판정 (§13)

- `o4o-main-site` 는 `minScale 0` 이었고 7일 요청 3건(전부 CI/본인)에 불과해 **과금 인스턴스 시간이 사실상 0** 이었다.
- 따라서 **`NO_COST_EFFECT`**. 절감액을 주장하지 않는다.
- 실질 효과는 **`INDIRECT_COMPLEXITY_REDUCTION`** — 배포 계약 1건, Cloud Run 서비스 1건, 워크플로 1건, 문서 참조 4곳이 사라져 향후 census·감사 비용이 줄어든다.

---

## 13. 범위 밖 발견 (수정하지 않음 · 후속 WO 후보)

1. **`admin-dashboard` LMS Marketing publisher 콘솔 11개 파일** — 삭제된 `/api/v1/lms/marketing/*` 백엔드를 호출하는데 여전히 마운트돼 있고 `OnboardingHome.tsx` 에서 링크된다. → `WO-O4O-ADMIN-LMS-MARKETING-CONSOLE-RETIREMENT-V1` 제안.
2. **Artifact Registry `main-site` image 23건** — `ORPHAN_MANUAL_CANDIDATE`. 수동 삭제 WO 필요.
3. **`deploy-api.yml:100`** — 이미 삭제된 `@o4o/lms-marketing` build 단계가 no-op 로 남아 있다.
4. **root `package.json` scripts** — 존재하지 않는 `@o4o/main-site` 필터 사용 (실제 패키지명은 `@o4o/main-site-nextgen`).

---

## 14. §14 중지 조건 대조

| 조건 | 해당 |
|---|---|
| Final Gate 미충족 항목 | 없음 (8/8 PASS) |
| 삭제 직후 production 이상 | 없음 |
| 다른 Cloud Run 서비스 영향 | 없음 (수정 0건) |
| GCLB/DNS 변경 | **하지 않음** |
| 다른 세션 WIP 접촉 | 없음 (path-specific stage) |

중지 조건 발동 없음.

---

## 15. 문서 정합

발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 4건

- 발견 1건 = `README.md:113` 의 `deploy-main-site.yml` 행 (`DEAD_RUNTIME_REFERENCE`). 본 WO §9 저장소 정리 범위에 해당해 인라인 제거했다.
- `docs/checks/**` · `docs/archive/**` 의 과거 기록은 CLAUDE.md §16-1 에 따라 **대상이 아니므로 수정하지 않았다.**
