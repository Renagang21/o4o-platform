# CHECK-O4O-REPOSITORY-DOCUMENT-SCRIPT-FULL-CLEANUP-V1

> WO-O4O-REPOSITORY-DOCUMENT-SCRIPT-FULL-CLEANUP-V1 · 2026-08-08
> 착수 HEAD `7ff4624aa` (= `origin/main`)

---

## 0. 조사 결과가 WO 전제와 다른 점 (먼저 밝힘)

WO 는 "지금까지 쌓인 문서·스크립트 잔재를 크게 한 번 걷어낸다" 를 전제했다.
전수 조사 결과 **그 전제가 이미 대부분 해소된 상태**였다.

| 확인 항목 | 실측 |
|---|---|
| 현행 정본 폴더의 `api-gateway` 참조 | **0** |
| Cursor / `.cursorrules` 참조 | **0** |
| `cosmetics-partner` 참조 | **0** |
| AWS Lightsail | 2 (둘 다 "폐쇄됨" 명시 문장 — 의도적) |
| 내용 완전 중복 `.md` | **1쌍** (둘 다 빈 파일) |
| 빈 `.md` | **2** |
| 존재하지 않는 파일을 호출하는 package script | **0** |

이유: 본 세션 체인의 선행 WO 들(`api-gateway` 은퇴, dev-env cleanup 1·2회차,
문서 정본화, 하네스 재구성, 재현성 검증)이 이미 해당 잔재를 제거했다.

### 대량 삭제를 하지 않은 근거 (데이터)

| 영역 | 전체 | 최근 30일 변경 | 판정 |
|---|--:|--:|---|
| `apps/api-server/src/scripts/**` | 4,891 | **4,863 (99%)** | 활성 생산 도구 — 삭제 금지 |
| `docs/checks/**` | 2,475 | **2,064 (83%)** | 활성 생산 기록 — HISTORICAL_KEEP |
| `docs/investigations/**` | 975 | 350 | 조사 기록 유지 |
| `docs/archive/**` | 541 | 36 | 이미 정착됨 |

작업 중 병렬 세션이 **8분 전에도 커밋**했다(hff-ja · easy-drug-en).
WO 자체가 "현재 생산 트랙이 실행 중인 파일은 절대 삭제하지 않는다",
"대량 생산 결과의 재현에 필요한 CHECK 는 HISTORICAL_KEEP" 으로 규정하므로,
**이 두 영역은 규정상 삭제 대상이 아니다.** 숫자를 맞추기 위한 삭제는 하지 않았다.

---

## 1. 실제로 발견한 잔재 — 추적된 빌드 산출물

가장 실질적인 발견이다.

```text
apps/admin-dashboard/.vite-cache/**   164 파일   65 MB
test-results/**                         1 파일
playwright-report/**                    1 파일
                                      ─────────
                                      166 파일
```

**세 경로 모두 이미 `.gitignore` 에 있다**(`7`, `8`, `126` 행).
ignore 규칙이 추가되기 **전에 커밋된 파일이라 git 이 계속 추적**하고 있었다
(`.gitignore` 는 이미 추적 중인 파일을 untrack 하지 않는다).

→ `git rm --cached` 로 추적만 해제했다. **로컬 파일 164개는 그대로 보존**되며,
Vite 가 재생성하는 산출물이라 손실이 없다.

---

## 2. 삭제한 문서

| 파일 | 근거 |
|---|---|
| `.github/workflows/ANALYSIS_REPORT.md` (986L) | 2025-10-31 워크플로 재구성 **일회성 분석**. 재구성 완료됨. 외부 참조 0 |
| `.github/workflows/EXECUTIVE_SUMMARY.md` (415L) | 위 분석의 요약본. 외부 참조 0 |
| `.github/workflows/INDEX.md` (265L) | 위 문서군 전용 색인. 외부 참조 0 |
| `.github/workflows/REORGANIZATION_PLAN.md` (646L) | **완료된 계획서**. 외부 참조 0 |
| `.github/workflows/WORKFLOW_MAP.txt` (288L) | 위 계획의 ASCII 도식. 외부 참조 0 |
| `.github/workflows/README-CI-CD.md` (105L) | 2025-10-04. `README.md`(2025-12-24)로 대체됨. 외부 참조 0 |
| `.github/workflows/deploy-admin-staging.yml.example` | staging 환경 부재, 외부 참조 0 (dead workflow fragment) |
| `docs/archive/reports/cosmetics_app_architecture_audit.md` | **빈 파일**, 외부 참조 0 |

## 3. 수정한 문서

`.github/workflows/README.md` — 349줄 → 40줄로 재작성(MERGE).
기존본은 존재하지 않는 `deploy-nginx.yml` 을 표에 싣고, 제거된 `setup-pnpm.yml` 을 언급하며,
현행 `ci-guard-policy` · `ci-appstore-guard` · `deploy-web-services` · `e2e-auth-runtime` **4개가 누락**돼 있었다.
현행 11개 워크플로만 정확히 싣고, 배포 대응표 정본은 `scripts/README.md` 로 링크했다.

---

## 4. scripts 판정

| 영역 | 조사 | 삭제 | 근거 |
|---|--:|--:|---|
| `scripts/**` | 51 | 0 | 전부 현행 CI·검증·빌드 도구 (`dev.mjs` · `lint-ratchet.mjs` · `ci-build-app.sh` 등) |
| `apps/api-server/src/scripts/**` | 4,891 | 0 | 99% 가 최근 30일 변경. 활성 생산 파이프라인 |
| `package.json` scripts | 전수 | 0 | 대상 파일 부재 script **0건** (1회차 WO 에서 이미 4종 제거) |

---

## 5. 숫자 요약

```text
문서 조사              3,091 (tracked .md)
문서 삭제                  8
문서 수정                  1
script 조사            4,942 + package.json
script 삭제                0
빌드 산출물 추적 해제      166  (65 MB)

삭제된 총 파일            174

dead link  before/after   46 / 46   (신규 발생 0)
dead path  before/after   75 / 75   (신규 발생 0)
CLAUDE §N dangling         0 (archive 역사 1건 제외)
api-gateway 현행 참조      0
Cursor 현행 참조           0
```

---

## 6. REVIEW / FOLLOW-UP

| # | 항목 | 이유 |
|---|---|---|
| R1 | `docs/work-orders/CHECK-O4O-OTC-EASY-DRUG-...-PILOT-100-QUEUE-V1.md` (빈 파일) | 다른 세션이 만든 WIP placeholder 로 기록돼 있음. 미접촉 |
| R2 | `docs/checks/**` 2,475건 대량 정리 | 83% 가 최근 30일 활성 생산 기록. 트랙 종료 후 별도 판단 |
| R3 | `apps/api-server/src/scripts/**` 구버전 정리 | 생산 진행 중. 트랙 종료 후에만 안전 |
| FU-1 | dead link 46 · dead path 75 | 서비스별 실제 파일 확인 필요(직전 WO 에서 자동 수정 취소한 건) |
| FU-2 | dependency 정리 | WO 범위 제외 |

---

## 7. 검증

```text
pnpm install --frozen-lockfile   OK
pnpm run type-check              OK
pnpm run type-check:frontend     OK
lint ratchet                     102 errors (baseline 유지, 증가 0)
git diff --check                 OK
build                            미실행 — 삭제 대상이 문서·ignore 대상 산출물뿐
package script → 삭제파일 참조    0
삭제 파일 외부 참조               0 (삭제 전 전수 확인)
```

기능 코드 · dependency · DB · CI 로직 · Secret · 배포 무변경.
병렬 세션(hff-ja · easy-drug-en) WIP 미접촉 — staged diff 로 확인.
