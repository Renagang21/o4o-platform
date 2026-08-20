# WO-O4O-RETIRED-MAIN-SITE-LMS-MARKETING-RESIDUE-FINAL-CLEANUP-V1 — CHECK

- **작업일**: 2026-08-20
- **대상**: main-site · LMS Marketing 폐기 트랙의 최종 잔재 (CI · root scripts · Artifact Registry · local dist · production DB)
- **선행**: [MAIN-SITE-DECOMMISSION-FINAL-CLOSURE](WO-O4O-MAIN-SITE-DECOMMISSION-FINAL-CLOSURE-V1-CHECK.md) · [ADMIN-LMS-MARKETING-CONSOLE-RETIREMENT](WO-O4O-ADMIN-LMS-MARKETING-CONSOLE-RETIREMENT-V1-CHECK.md)

---

## 1. 요약 판정

| # | 잔재 | 판정 | 처리 |
|---|---|---|---|
| ① | `deploy-api.yml` 의 `@o4o/lms-marketing` build step | `BUILD_RESIDUE` | **제거** |
| ② | root `package.json` 의 `@o4o/main-site` 필터 | `DEAD_RUNTIME` | **제거** (`dev:web` 삭제 · `dev` 재정의) |
| ③ | Artifact Registry `o4o-api/main-site` image | `DEAD_RUNTIME` (consumer 0) | **package 삭제** (22 versions) |
| ④ | local `packages/lms-marketing/{dist,node_modules}` | `LOCAL_RESIDUE` | **삭제** |
| ⑤ | production DB `lms_marketing_*` | **테이블 자체가 존재하지 않음** | **DROP 대상 0건** |

`UNKNOWN` **0** · 미조사 **0** · production DB write **0건**.

---

## 2. 임시 프로세스 안전 규칙 (§2) 준수

| 항목 | 결과 |
|---|---|
| 기동한 임시 프로세스 | `cloud-sql-proxy.exe` 1개 (**전용 포트 5459** — 타 세션 5432/5442 회피) |
| PID 기록 | 기동 직후 OS PID **9056** 기록 |
| 종료 방식 | `Stop-Process -Id 9056` — **자기 PID만** |
| 프로세스명/image명 기준 일괄 종료 | **수행하지 않음** |

DB 비밀번호는 scratchpad 임시 파일로만 취급했고 census 종료 직후 삭제했다. 저장소·문서 어디에도 기록하지 않았다.

---

## 3. 저장소 전수 census (§3)

`@o4o/lms-marketing` · `@o4o/main-site` · `packages/lms-marketing` · `lms_marketing` · `content_bundle` 전수 조사.

### 3-1. 코드 영역

| 위치 | 내용 | 판정 | 처리 |
|---|---|---|---|
| `.github/workflows/deploy-api.yml:100` | `pnpm --filter '@o4o/lms-marketing' run build` | `BUILD_RESIDUE` | 제거 |
| `package.json:25` | `dev:web` = `--filter=@o4o/main-site` | `DEAD_RUNTIME` | 제거 |
| `apps/admin-dashboard/src/routes/lms-marketing.routes.tsx:12` | 선행 WO 가 남긴 제거 사유 주석 | `HISTORICAL_DOC` (주석) | 유지 |
| `apps/api-server/src/database/entities.ts:554` | Phase R1 제거 목록 주석 | `HISTORICAL_DOC` (주석) | 유지 |
| `apps/main-site/src/router/index.tsx:28` | 동일 성격 주석 | `HISTORICAL_DOC` (주석) | 유지 |
| `apps/main-site/package.json:2` | `"name": "@o4o/main-site-nextgen"` | `ACTIVE` (보존 source 자산) | 유지 |
| `scripts/optimize-npm-immediate.sh:61` | `pnpm install --workspace=@o4o/main-site` | `DEAD_RUNTIME` | **미처리** — §5 범위(root package.json) 밖. 후속 WO 후보 (§12-1) |

`lms_marketing` **문자열은 저장소 코드에 0건**이다 (docs 제외 `git grep` 0). 테이블명 상수·entity·repository 어디에도 남아 있지 않다.

### 3-2. `content_bundle` — 오탐 차단 (§16 핵심)

저장소의 `content_bundle` 참조는 **전부 `lms_content_bundles`** 이며 이는 **`@o4o/lms-core` 소유의 살아 있는 테이블**이다. LMS Marketing 과 무관하다.

| 위치 | 판정 |
|---|---|
| `packages/interactive-content-core/src/entities/ContentBundle.ts:40` `@Entity('lms_content_bundles')` | `ACTIVE` |
| `apps/api-server/src/database/entities.ts:521,914` `ContentBundle` 등록 | `ACTIVE` (entity registry) |
| `packages/lms-core/src/manifest.ts:37` `ownsTables` | `DB_CONTRACT` (유효) |
| `packages/lms-core/src/lifecycle/install.ts:241-304` | `DB_CONTRACT` (유효) |
| `apps/api-server/src/database/migrations/20260410000001-CreateLmsCoreTables.ts` | `DB_CONTRACT` (유효 · 적용됨) |

→ **`content_bundle*` 은 이번 WO 의 삭제 대상이 아니다.** 패턴 문자열이 겹친다는 이유만으로 삭제하지 않았다.

### 3-3. 문서

`docs/archive/**` 3건 · `docs/checks/**` 4건 · `docs/work-orders/WO-O4O-INTERACTIVE-CONTENT-LMS-AUDIT-V1.md` 1건 = 전부 `HISTORICAL_DOC`.
CLAUDE.md §16-1 에 따라 **수정하지 않았다.**

---

## 4. ① `deploy-api.yml` build step 제거 (§4)

**no-op 실측** — 삭제 전 로컬에서 동일 명령을 실행해 확인했다.

```
$ pnpm --filter '@o4o/lms-marketing' run build
No projects matched the filters in "C:\Users\home\coding\o4o-platform"
exit=0
```

| 검증 | 결과 |
|---|---|
| 패키지 실재 | `packages/lms-marketing` 에 `package.json` 없음 → workspace 패키지 아님 |
| `pnpm-lock.yaml` 참조 | **0건** |
| 다른 build step 의존 | 없음 (뒤따르는 `@o4o/market-trial` 등은 독립) |
| Dockerfile / `.dockerignore` COPY | **0건** |
| 실패 시 파이프라인 영향 | 없음 (exit 0 · 산출물 없음) |

→ 순수 no-op 임을 확인한 뒤 해당 1줄만 제거했다. YAML 파싱 재검증 PASS.

---

## 5. ② root `package.json` 정리 (§5)

**핵심 사실**: `apps/main-site/package.json` 의 실제 패키지명은 **`@o4o/main-site-nextgen`** 이다.
따라서 `--filter=@o4o/main-site` 는 **아무 것도 매칭하지 않는 no-op** 이었다 (위와 동일하게 실측 확인).

| 스크립트 | 판정 | 처리 |
|---|---|---|
| `dev:web` = `--filter=@o4o/main-site run dev` | `DEAD_RUNTIME` — 실행해도 아무 서버도 뜨지 않음 | **삭제** |
| `dev` = `concurrently "dev:web" "dev:admin"` | 절반이 dead | `pnpm run dev:admin` 으로 재정의 |
| `build:main-site` = `cd apps/main-site && pnpm run build` | **`ACTIVE`** — 경로 기반이라 정상 동작 | **유지** |
| `build:apps` · `build:apps:all` · `build:web` | `build:main-site` 소비 | **유지** |

`build:*` 계열을 유지한 이유:

- `ci-pipeline.yml:134` 의 `matrix: app: [main-site, admin-dashboard]` 가 **보존된 source 의 컴파일 가능 상태를 계속 검증**한다 (배포 아님).
- `scripts/ci-build-app.sh:83` · `scripts/ci-complete-setup.sh:36` 이 `build:apps` 를 호출한다.
- 제거하면 CI 가 깨진다. → **main-site source 자산 보존 정책과 충돌하지 않도록 build 계약은 손대지 않았다.**

`SETUP.md §3` 터미널 2 안내에서도 `dev:web` 행을 제거하고 `dev` 설명을 실제 동작에 맞췄다.

---

## 6. ③ Artifact Registry image 삭제 (§6)

### 삭제 게이트 재확인

| 게이트 | 실측 | 판정 |
|---|---|---|
| runtime consumer | Cloud Run 서비스 중 `main-site` image 사용 **0건** (`o4o-main-site` 는 선행 WO 에서 삭제) | PASS |
| revision consumer | 프로젝트 전체 revision 중 해당 image **0건** | PASS |
| CI consumer | `.github` · `scripts` 에서 `o4o-api/main-site` 참조 **0건** (`deploy-main-site.yml` 은 이미 삭제) | PASS |
| `UNKNOWN` | **0** | PASS |

### 실행

```
gcloud artifacts packages delete main-site --repository=o4o-api --location=asia-northeast3
→ Deleted package [main-site].
```

- 삭제 전 **22 versions** 의 digest·tag·createTime 을 전량 기록한 뒤 삭제했다 (최신 = `latest` + `b7abe85e…`, 2026-08-20).
  - 선행 CHECK 의 "23건" 은 `--include-tags` 기준 재집계 결과 **22건**이었다. 실측치를 기록한다.
- 삭제 후 `o4o-api` 저장소 잔존 package: `admin-dashboard` · `admin-dashboard-dev` · `api-server` · `neture-web` — **전부 사용 중.**
- 웹 서비스 6종은 `gcr.io/netureyoutube/*` 로 **저장소가 다르다.** 이번 삭제 범위와 무관하다.

---

## 7. ④ local `packages/lms-marketing` 삭제 (§7)

| 확인 | 결과 |
|---|---|
| git 추적 파일 | **0건** (`git ls-files` 공백) |
| `package.json` 존재 | 없음 → pnpm workspace 패키지 아님 |
| `pnpm-lock.yaml` 참조 | **0건** |
| 남아 있던 것 | `dist/` 252K · `node_modules/` 26K (src 없음) |
| 다른 세션 사용 가능성 | src 가 없어 빌드·실행 주체가 존재할 수 없음 |

→ `packages/lms-marketing` 디렉터리 전체 삭제. **git 변경 0건** (원래 untracked).

삭제 직전 `dist/manifest.js` 에서 폐기된 확장의 `ownsTables` 를 회수해 §8 DB census 대상 테이블명을 확정했다.

---

## 8. ⑤ production DB census (§8~§11) — 가장 중요한 영역

접속: Cloud SQL Auth Proxy (전용 포트 5459) → `o4o-platform-db` / `o4o_platform`. **read-only SELECT 만 수행.**

### 8-1. 대상 테이블명 확정

삭제된 `@o4o/lms-marketing` 의 소유 테이블은 **정확히 3개**다. 두 경로에서 교차 확인했다.

| 근거 | 값 |
|---|---|
| `git show 2d5be046b^:packages/lms-marketing/src/manifest.ts` 의 `ownsTables` | `lms_marketing_product_contents` · `lms_marketing_quiz_campaigns` · `lms_marketing_survey_campaigns` |
| 삭제 직전 src 의 `@Entity(...)` 3개 | 동일 (3/3 일치) |

### 8-2. 실측 결과

`lms_marketing%` · `content_bundle%` · `content_bundles%` · `bundle_%` 패턴을 `pg_class` 전수 조회(모든 non-system schema: `public` · `cosmetics` · `neture`).

```
SELECT c.relkind, n.nspname, c.relname FROM pg_class c JOIN pg_namespace n ...
→ 0 rows
```

**`lms_marketing_*` 테이블은 production DB 에 애초에 존재하지 않는다.** 확장 lifecycle `activate` 가 운영에서 실행된 적이 없다.

이름이 겹치는 relation 을 확인하기 위해 `%marketing%` · `%bundle%` 로 범위를 넓힌 결과:

| relation | 소유 | row | 판정 |
|---|---|---|---|
| `lms_content_bundles` (+ index 3, pkey) | `@o4o/lms-core` — entity 등록 · migration `CreateLmsCoreTables20260410000001` 적용됨 | 0 | **`ACTIVE`** |
| `product_marketing_assets` (+ pkey) | `ProductMarketingAsset` entity — migration `CreateProductMarketingAssets20260304200000` | 0 | **`ACTIVE`** |

두 테이블 모두 현재 row 0 이지만 **repository consumer 가 존재**하므로 §10 게이트의 "repository consumer 0" 을 충족하지 못한다. → **DROP 대상 아님.** `lms_content_bundles` 로 들어오는 FK 는 0건이지만, 데이터가 비었다는 사실만으로 살아 있는 계약을 제거하지 않는다.

### 8-3. 판정 (§9)

| 테이블 | 판정 |
|---|---|
| `lms_marketing_product_contents` | **부존재** — 삭제 대상 없음 |
| `lms_marketing_quiz_campaigns` | **부존재** — 삭제 대상 없음 |
| `lms_marketing_survey_campaigns` | **부존재** — 삭제 대상 없음 |
| `lms_content_bundles` | `ACTIVE` (lms-core) — 유지 |
| `product_marketing_assets` | `ACTIVE` (별개 기능) — 유지 |
| `UNKNOWN` | **0** |

### 8-4. DROP 실행 (§10) 및 migration (§11)

- **DROP 대상 0건 → SQL write 0건.**
- 삭제할 테이블이 없으므로 **신규 migration 도 작성하지 않았다.** "운영 DB 수동 DROP 만 하고 저장소 계약을 남기지 않는" 상황 자체가 발생하지 않았다.
- 기존 migration 역사 파일 **수정 0건**.

---

## 9. 검증 (§12~§13)

| 항목 | 결과 |
|---|---|
| `package.json` JSON 파싱 | PASS (`dev` = `pnpm run dev:admin` · `dev:web` = undefined) |
| `deploy-api.yml` YAML 파싱 | PASS (`jobs: [build-and-deploy]`) |
| Cloud Run 서비스 | **10개 전부 `Ready=True`** |
| 사용 중 image 삭제 여부 | 0건 (전 서비스 image 실재 확인) |
| `api.neture.co.kr/health` | 200 |
| `/health/database` | `healthy` · pingMs 1 · activeConnections 14 · longRunningQueries 0 |
| 도메인 6종 (neture · www · kpa-society · glycopharm · k-cosmetics.site · admin) | 전부 **200** |
| production DB write | **0건** |

미수행 항목을 명시한다: 이번 변경은 **CI 워크플로 1줄 · root script · 문서**뿐이고 애플리케이션 source 를 건드리지 않아 **전체 build / type-check 는 수행하지 않았다.** 대신 변경 파일 각각의 파서 검증(JSON · YAML)과 필터 no-op 실측으로 대체했다.

---

## 10. §14 중지 조건 대조

| 조건 | 해당 |
|---|---|
| DB 소비처 불명확 | 없음 — 대상 테이블 자체가 부존재 |
| `UNKNOWN` 잔존 | 없음 (0) |
| 다른 세션 WIP 접촉 | 없음 (path-specific stage) |
| 프로세스명 기준 일괄 종료 | 수행하지 않음 |
| 폐기 기능 복원 | 없음 |

중지 조건 발동 없음.

---

## 11. 변경 파일

| 파일 | 변경 |
|---|---|
| `.github/workflows/deploy-api.yml` | `@o4o/lms-marketing` build step 1줄 제거 |
| `package.json` | `dev:web` 삭제 · `dev` 재정의 · 사유 주석 추가 |
| `SETUP.md` | 개발 서버 안내에서 `dev:web` 행 제거 |
| `packages/lms-marketing/` | 디렉터리 삭제 (untracked — git 변경 없음) |

GCP: Artifact Registry `o4o-api/main-site` package 삭제 (22 versions).

---

## 12. 범위 밖 발견 (수정하지 않음 · 후속 WO 후보)

1. **`scripts/optimize-npm-immediate.sh`** — `pnpm install --workspace=@o4o/main-site` (dead) + `--workspace` 는 npm 플래그라 pnpm 에서 동작하지 않는다. 게다가 이 스크립트는 root `.npmrc` 를 **덮어쓴다**. 저장소 어디에서도 호출되지 않는다 → 은퇴 검토 필요.
2. **`concurrently` devDependency** — `dev` 재정의로 소비처가 0이 됐다. dependency/lockfile 변경은 CLAUDE.md 중지 조건이므로 **손대지 않았다.**
3. **`deploy-api.yml` 의 `@o4o/cosmetics-sample-display-extension` build step** — `entities.ts` 주석 기준 해당 패키지도 Phase R1 제거 목록에 있다. 이번 WO 범위(main-site · lms-marketing) 밖이라 판정만 남긴다 → 동일 성격의 no-op 여부 확인 필요.

---

## 13. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건

`docs/checks/**` · `docs/archive/**` 의 `HISTORICAL_DOC` 참조는 CLAUDE.md §16-1 에 따라 **대상이 아니므로 수정하지 않았다.**
