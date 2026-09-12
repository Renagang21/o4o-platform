# CHECK-O4O-TMP-OPERATIONAL-RECOVERY-AND-TEMPORARY-ARTIFACT-DISPOSITION-V1

- **WO**: WO-O4O-TMP-OPERATIONAL-RECOVERY-AND-TEMPORARY-ARTIFACT-DISPOSITION-V1
- **작업일**: 2026-09-12
- **입력**: `IR-O4O-REPOSITORY-WIDE-DEAD-CODE-AND-LEGACY-SURFACE-CENSUS-V1-PASS2` §8 (`tmp/**` 169 파일 · 42MB) · `WO-O4O-ARCHIVE-RETENTION-AND-TRACKED-BACKUP-FINAL-DISPOSITION-V1-CHECK` §5 (tmp 인계)
- **기준 SHA**: `origin/main` = `11b7083f861aee205bf8780629a5920ee1e918de` (조사·검증 기준) → push 직전 다른 세션의 `8f286151e`(ai-tools · 범위 겹침 0) 위에 rebase · 전용 worktree `.claude/worktrees/wo-tmp-disposition-v1` · branch `worktree-wo-tmp-disposition-v1`
- **커밋**: `fc3b339cc` (본체) · 본 문서 CI 결과 갱신 커밋
- **성격**: `tmp/**` 추적 파일 처분 — 운영 복구자료 보존 / 일회성·생성 산출물 제거
- **schema / migration / production data**: **0 · 0 · 0**

---

## 1. 요약

> `tmp/` 는 이름과 달리 **대부분 운영 복구자료**다. 2026-08 화장품 설명서 파이프라인이 프로덕션 `product_masters` · `shared_product_descriptions` 에 쓴 6개 배치의 `apply / rollback / baseline / dry-run / post-verify` 가 여기에만 있고 Git·migration 으로 재구성할 수 없다.
> 이번 WO 는 그 복구자료(6 묶음 · 78 파일)와 재현 불가 외부 snapshot(2 묶음 · 14 파일)을 **보존**하고, 일회성 탐침·smoke·감사 스크립트(35 `.mjs` 전부)와 결정적으로 재생성되는 생산 산출물(`cosmetics-guide-production` 20 · pilot 생성물 5)을 **제거**했다.

```text
before  169 파일 · 43,601,889 bytes (41.6 MB)
after    96 파일 · 33,987,605 bytes (32.4 MB)
removed  73 파일 ·  9,614,284 bytes ( 9.2 MB)
```

---

## 2. tmp/** 전수표 (묶음 단위 · 15 묶음)

| # | 묶음 | before | after | 판정 | 근거 |
|---|---|---:|---:|---|---|
| 1 | `cosmetics-guide-gap-enrichment/` | 39 · 5.35MB | 21 · 5.32MB | **OPERATIONAL_RECOVERY_KEEP** (데이터 21) / DELETE_TEMPORARY (`.mjs` 18) | 프로덕션 UPDATE 6,749 (`product_masters` 3,452 · `shared_product_descriptions` 3,297) 의 `apply.sql.gz` · `rollback.sql.gz` · `apply-log.txt` · `baseline-before/after` · `dry-run-plan` · `post-verify`. `mfds-detail/match.json.gz` = 식약처 보고 상세 snapshot(후속 배치 입력) |
| 2 | `cosmetics-mfds-usage-caution/` | 21 · 1.06MB | 15 · 1.05MB | **OPERATIONAL_RECOVERY_KEEP** / DELETE_TEMPORARY (`.mjs` 5 + `closeout-verify.json`) | UPDATE 2,618 의 apply/rollback 세트. closeout 수치는 CHECK §10-1 표에 동일 기록 |
| 3 | `cosmetics-store-to-b2b-copy/` | 14 · 7.54MB | 12 · 7.54MB | **OPERATIONAL_RECOVERY_KEEP** / DELETE_TEMPORARY (`smoke.mjs` · `smoke.json`) | INSERT 32,674 의 `rollback.sql.gz`(신규 id 매니페스트 기반 DELETE) · `baseline-store.jsonl.gz` · `apply-result.json.gz`. smoke 결과는 CHECK §9 에 기록 |
| 4 | `cosmetics-productmaster-apply-pilot/` | 13 · 1.60MB | 13 | **OPERATIONAL_RECOVERY_KEEP** | ProductMaster 500 + 32,174 INSERT. `apply-result.json` · `full-apply-result.json` 의 `rollback` 필드(`tags->>'woBatch'` 기반 DELETE) + 모집단·dry-run·post-verify |
| 5 | `cosmetics-name-cleanup/` | 7 · 4.27MB | 7 | **OPERATIONAL_RECOVERY_KEEP** | 상품명 339건 UPDATE. `apply-result.json.items[].beforeName/afterName` + `rollback` = 원복 자료. `census-rows.json.gz` = 적용 전 DB 기준선 |
| 6 | `product-landing-coverage-closure/` | 10 · 20KB | 10 | **OPERATIONAL_RECOVERY_KEEP** | landing 73,645 backfill. `rollback.json` = soft-delete 원복 계약 + 사후 검증 md5 |
| 7 | `cosmetics-retail-census/` | 12 · 12.7MB | 12 | **UNKNOWN_ORIGIN_STOP** | 외부 소스 snapshot(무신사·화해·올리브영 글로벌·식약처 기능성 목록 180,412). 원본 URL/API 가 현재 동일 결과를 보장하지 않음 → 자동 삭제 금지 (§5). 배치 #1·#4 의 입력 모집단 |
| 8 | `cosmetics-pilot/` (snapshot 2) | 2 · 1.44MB | 2 | **UNKNOWN_ORIGIN_STOP** | `functional-candidates-500.json` · `general-candidates-500.json` = 2026-08-07 외부 계통 표본. 프로덕션에 쓰인 적 없고 #7 이 대체하나 재현 불가 외부 snapshot 규칙에 따라 자동 삭제하지 않음 |
| 9 | `cosmetics-pilot/` (생성물 5) | 5 · 2.33MB | 0 | **DELETE_GENERATED_ARTIFACT** | `guide-pilot-ko/en` · `normalized-products` · `issue-queue` · `pilot-summary` — 파일럿 스크립트 03~05 의 출력. DB write 0 · 후속 census 로 대체 · 요약은 `CHECK-…-INITIAL-CENSUS-AND-GUIDE-PILOT-V0` |
| 10 | `cosmetics-guide-production/` | 20 · 7.13MB | 0 | **DELETE_GENERATED_ARTIFACT** | census(#7, 보존) 입력으로 **네트워크 0 · LLM 0 · 난수 0** 인 `guide-core.mjs` 가 결정적으로 생성. 생성 스크립트는 `c100b6f71` 이후 변경 0. DB write 0 (README §11) |
| 11 | `product-db-write-authority/` | 7 · 60KB | 0 | **DELETE_TEMPORARY** / DELETE_DUPLICATE | 코드 전용 WO 의 postVerify·smoke·raw-scan. 수치는 `CHECK-O4O-PRODUCT-DB-WRITE-AUTHORITY-BOUNDARY-ALIGNMENT-V1` 에 기록 (272,035 등) |
| 12 | `product-ai-tags-ownership/` | 6 · 7KB | 0 | **DELETE_TEMPORARY** / DELETE_DUPLICATE | 코드 전용 WO 의 read-only audit/postVerify. `CHECK-O4O-PRODUCT-AI-TAGS-SUPPLIER-OWNERSHIP-GUARD-V1` 에 기록 |
| 13 | `admin-product-description-auth-boundary/` | 3 · 20KB | 0 | **DELETE_TEMPORARY** / DELETE_DUPLICATE | route-inventory 정적 감사 + smoke. 후속 CHECK 가 이미 `DOC/HISTORY_ONLY` 로 분류 |
| 14 | `supplier-productmaster-nondestructive-link/` | 2 · 4KB | 0 | **DELETE_TEMPORARY** / DELETE_DUPLICATE | read-only audit. `CHECK-O4O-SUPPLIER-EXISTING-PRODUCTMASTER-NON-DESTRUCTIVE-LINK-V1` 에 기록 |
| 15-a | `delete_list_*.json` 4 | 4 · 19KB | 0 | **DELETE_TEMPORARY** | 2025-12-09 **문서 재구성**(Phase 4/5)의 삭제 후보 목록 — DB 삭제 원장이 아니다. 대상 문서는 전부 git history 에 있음. PASS2 의 "삭제 배치의 대상 원장" 판정은 오독이었다 (§13) |
| 15-b | `*_install.sql` 4 | 4 · 13KB | 4 | **OPERATIONAL_RECOVERY_KEEP** (schema provenance) | `forum_core` · `forum_yaksa` · `membership_yaksa` · `organization_core` install SQL. `yaksa_*` · `forum_category/post/comment` 는 migration 이 만들지 않은 테이블 → Git/migration 만으로 재구성 불가. `WO-O4O-FORUM-YAKSA-DEAD-PACKAGE-ROUTE-AND-ALIAS-LOCKSTEP-REMOVAL-V1-CHECK` §후속 2 가 `yaksa_*` 운영 테이블과 함께 처분하도록 이미 인계 — 본 WO 범위 밖(schema cleanup) |

---

## 3. before / after

| | 파일 | bytes |
|---|---:|---:|
| before (`11b7083f8`) | 169 | 43,601,889 |
| after | 96 | 33,987,605 |
| 제거 | 73 | 9,614,284 |
| 그중 STOP 보존 (#7 · #8) | 14 | 14,184,088 |
| 그중 복구자료 보존 (#1~#6 · #15-b) | 82 | 19,803,517 |

---

## 4. `.mjs` 35 판정 — 전부 DELETE_TEMPORARY

5개 기준(일회성 / runtime·CI·test 호출 / 운영 복구용 / CHECK 재현용 명시 참조 / `scripts/**` 정식본 존재)을 파일마다 확인했다.

| 파일 | 성격 | runtime/CI/test 호출 | 복구용 | 정식본 |
|---|---|:---:|:---:|---|
| `cosmetics-guide-gap-enrichment/probe-{alt,alt2,alt3,e1e3,family,hwahae2,mfds,mfds-headroom,name-facts,rate,refine,sample,tokens,type-pairs,yield}.mjs` (15) | 외부 원천 접근성·수집 속도·분포 탐침 | 0 | ✗ | 결과는 `source-availability.json` (10-source-availability.mjs 가 생성) |
| `cosmetics-guide-gap-enrichment/negative-control.mjs` · `count-cautions.mjs` · `final-numbers.mjs` (3) | 검증기 음성 대조 · 집계 1회 | 0 | ✗ | 결과는 `validation.json` · CHECK |
| `cosmetics-mfds-usage-caution/probe-{claim,judge,shapes}.mjs` · `negative-control.mjs` · `closeout-verify.mjs` (5) | 판정 분포 탐침 · 음성 대조 · main 병합 closeout | 0 | ✗ | CHECK §10-1 표 |
| `cosmetics-store-to-b2b-copy/smoke.mjs` (1) | 배포 후 GET smoke | 0 | ✗ | CHECK §9 |
| `admin-product-description-auth-boundary/route-inventory.mjs` · `smoke.mjs` (2) | 정적 route 감사 · smoke | 0 | ✗ | CHECK 본문 |
| `product-ai-tags-ownership/audit.mjs` · `postverify.mjs` · `tags-shape.mjs` · `tags-shape2.mjs` (4) | read-only DB 감사 | 0 | ✗ | CHECK 본문 |
| `product-db-write-authority/postverify.mjs` · `smoke.mjs` · `smoke-roles.mjs` · `id-dup-breakdown.mjs` (4) | read-only DB 감사 · smoke | 0 | ✗ | CHECK 본문 |
| `supplier-productmaster-nondestructive-link/audit.mjs` (1) | read-only DB 감사 | 0 | ✗ | CHECK 본문 |

- **ACTIVE_FIXTURE_RELOCATE = 0.** PASS2 §8 은 35개를 "파이프라인 `.mjs` → `apps/api-server/src/scripts/` 이동" 으로 봤으나, 실제 파이프라인 본체(01~11 단계)는 **이미 `apps/api-server/src/scripts/cosmetics-*/`** 에 있고 `tmp/` 의 `.mjs` 는 전부 그 파이프라인 옆에서 1회 돌린 탐침·smoke·감사다. 옮길 도구가 없다.
- CHECK 7곳이 이들 경로를 언급하나 전부 "산출물: … / 실행 결과 …" 형태의 **과거 실행 기록**이며 재현 지시가 아니다 (`CHECK-O4O-CHANNEL-RETIREMENT-ADMIN-AUTH-GUARD-RESIDUAL-CLOSURE-V1` 이 같은 파일을 `DOC/HISTORY_ONLY` 로 선례 판정). 기록물은 §16-1 에 따라 수정하지 않는다.
- 생성 스크립트 주석 1곳(`10-source-availability.mjs:5` "재현: probe-*.mjs")만 정합 수정.

---

## 5. 대용량 snapshot 판정 (`.json.gz` · `.jsonl.gz` · `.sql.gz` 35)

| 파일 | 크기 | 출처 | 재현성 | 판정 |
|---|---:|---|---|---|
| `cosmetics-retail-census/functional-index.json.gz` | 4.8MB | 식약처 기능성화장품 보고 목록 (2026-08-07) | 목록이 계속 갱신 → 동일 결과 불보장 | **UNKNOWN_ORIGIN_STOP** |
| `cosmetics-retail-census/source-musinsa.json.gz` · `source-hwahae.json.gz` · `source-oliveyoung-global.json` | 1.75MB · 0.33MB · 53KB | 소매 사이트 공개 랭킹/목록 snapshot | 랭킹·재고 변동 → 재현 불가 (PASS2 §8 동일) | **UNKNOWN_ORIGIN_STOP** |
| `cosmetics-retail-census/retail-raw-union` · `retail-unique-guide-candidates` · `functional-match.json.gz` (+ 소형 5) | 1.8 · 2.3 · 1.3MB | 위 snapshot 의 결정적 파생 (04·06·08) | snapshot 보존 시 재현 가능하나 **배치 #1·#4 의 입력 모집단**이라 함께 보존 | STOP 묶음 동반 보존 |
| `cosmetics-pilot/functional-candidates-500.json` · `general-candidates-500.json` | 0.98 · 0.46MB | 파일럿 외부 계통 표본 | 재현 불가 | **UNKNOWN_ORIGIN_STOP** (대체됨 → 후속 삭제 권고 §13) |
| `cosmetics-guide-gap-enrichment/mfds-detail.json.gz` · `mfds-match.json.gz` | 83KB · 0.84MB | 식약처 보고 상세 1,289건 | 상세 페이지 존속 불보장 · 배치 #1·#2 의 근거 원문 | OPERATIONAL_RECOVERY_KEEP (근거) |
| `cosmetics-guide-gap-enrichment/gap-population` · `type-triage` · `dry-run-plan` · `check-queue.json.gz` | 2.1 · 0.58 · 0.56 · 0.25MB | 적용 전 DB dump + 위 입력의 파생 | 적용 후 DB 가 바뀌어 재현 불가 → 적용 provenance | OPERATIONAL_RECOVERY_KEEP |
| `*/apply.sql.gz` · `*/rollback.sql.gz` (5) | 0.20~0.71MB | 배치 apply/rollback SQL | 재현 대상 아님 | **OPERATIONAL_RECOVERY_KEEP** |
| `cosmetics-store-to-b2b-copy/baseline-store.jsonl.gz` · `apply-result.json.gz` · `dry-run-plan.json.gz` | 3.1 · 0.72 · 3.0MB | 적용 전 STORE 기준선 · 신규 id 매니페스트 · 계획 | rollback 의 안전판 1·3 근거 | **OPERATIONAL_RECOVERY_KEEP** |
| `cosmetics-mfds-usage-caution/population` · `dry-run-plan.json.gz` | 0.23 · 0.29MB | 적용 전 본문 포함 모집단 | 적용 provenance | OPERATIONAL_RECOVERY_KEEP |
| `cosmetics-productmaster-apply-pilot/cleansed-population` · `full-apply-issue-queue.json.gz` | 0.45 · 0.32MB | INSERT 모집단 | 적용 provenance | OPERATIONAL_RECOVERY_KEEP |
| `cosmetics-name-cleanup/census-rows.json.gz` | 3.7MB | 적용 전 상품명 DB 기준선 | 적용 provenance | OPERATIONAL_RECOVERY_KEEP |
| `cosmetics-guide-production/*.json.gz` (11) | 7.1MB | census → `guide-core.mjs` 결정적 생성 | **재현 가능** (네트워크·LLM·난수 0 · 엔진 변경 0) | **DELETE_GENERATED_ARTIFACT** |

---

## 6. rollback / recovery 보존 목록

| 배치 | 프로덕션 write | 원복 자료 | 원복 절차 |
|---|---|---|---|
| `cosmetics-productmaster-apply-pilot` (`cosmetics-pilot-500-v2` · `cosmetics-full-apply-v1`) | ProductMaster 32,674 INSERT + STORE canonical 32,674 INSERT | `apply-result.json.rollback` · `full-apply-result.json.rollback` (`tags->>'woBatch'` 기반 DELETE 2문) | 결과 JSON 의 `rollback` SQL |
| `cosmetics-guide-gap-enrichment` (`cosmetics-gap-enrichment-v1`) | UPDATE 6,749 | `rollback.sql.gz` · `apply-log.txt` · `baseline-before/after.txt` · `dry-run-plan.json.gz` | README §원복 (`psql -f rollback.sql`, 적용 후 값과 같을 때만 원복) |
| `cosmetics-mfds-usage-caution` (`cosmetics-mfds-usage-caution-v1`) | UPDATE 2,618 | `rollback.sql.gz` · `apply-log.txt` · `baseline-before/after.txt` · `dry-run-plan.json.gz` | README §원복 |
| `cosmetics-name-cleanup` (`nameCleanupV1`) | 상품명 339 UPDATE | `apply-result.json` (`items[].beforeName/afterName` · `rollback`) · `census-rows.json.gz` | 결과 JSON 의 `rollback` |
| `cosmetics-store-to-b2b-copy` (`o4o_cosmetics_retail` B2B) | B2B canonical 32,674 INSERT | `rollback.sql.gz` (id 매니페스트 + `updated_at = created_at` 안전판) · `baseline-store.jsonl.gz` · `apply-result.json.gz` | README §원복 |
| `product-landing-coverage-closure` (`product-landing-full-backfill-v1`) | landing 73,645 INSERT | `rollback.json` (soft-delete SQL + 사후 md5 검증) · `preexisting-landing-baseline.json` | `rollback.json.sql` |
| `*_install.sql` 4 | (2025-12 · migration 밖 테이블 생성) | install SQL 원문 | schema provenance — 처분은 yaksa 후속 WO |

각 배치의 README(3곳)는 보존했고, 제거한 `.mjs` 행과 삭제된 `cosmetics-guide-production` 입력 안내만 정합 수정했다 (§9).

---

## 7. active consumer 검사

| 검사 축 | 방법 | 결과 |
|---|---|---|
| `import` / `require` / `readFile` | `git grep "tmp/"` (non-doc) + 파이프라인 `lib.mjs` 의 `OUT_DIR / CENSUS_DIR / PROD_DIR` 추적 | 소비자 = `apps/api-server/src/scripts/cosmetics-*/` 파이프라인(1회 실행 완료된 WO 스크립트)뿐. **runtime 소비 0** |
| package script | `**/package.json` `"tmp"` 검색 | **0** |
| CI workflow | `.github/workflows/**` | `tmp/` 참조 0 (`/tmp/` OS 경로만) |
| test fixture | `__tests__ / *.spec.* / *.test.*` | `neture-asset-mount-and-dead-package-residue.spec.ts:71` 이 `tmp/` 를 **제외**할 뿐 — 소비 0 |
| Docker COPY | `**/Dockerfile*` | **0** |
| migration / deploy script | `deploy-api.yml` · `scripts/**` | **0** |
| docs recovery procedure | `docs/**` markdown 링크 → `tmp/` 11개 | 전부 보존 파일로 해결 (제거된 `cosmetics-guide-production/README.md` 1건은 §9 에서 수정) |
| 제거 경로 literal scan | 삭제 73 경로 각각 `git grep -F` (non-doc · non-tmp) | 실소비 **0** — 잔여 3건은 파일럿 스크립트 03~05 의 "산출:" 주석(스크립트가 **쓰는** 파일, 재실행 시 재생성) |

- `ACTIVE_CONSUMER_KEEP = 0` · `ACTIVE_FIXTURE_RELOCATE = 0`.
- 생산 파이프라인(`cosmetics-guide-production/01~05`, `cosmetics-guide-gap-enrichment/01-census.mjs`)이 제거된 `tmp/cosmetics-guide-production/*.json` 을 입력으로 읽는 경로는 그대로 유효하다 — README 에 "census 에서 재생성" 으로 안내했고 재실행 전에 01~04 를 돌리면 같은 위치에 다시 생긴다.

---

## 8. secret / 개인정보 검사

169 파일 전수 (`.gz` 는 `zcat |` 파이프, 디스크 해제 0). 패턴: `password|passwd|api[_-]?key|access/refresh[_-]?token|bearer|set-cookie|cookie:|private key|BEGIN (RSA|EC|OPENSSH|PGP)|postgres(ql)?://|mysql://|mongodb://|DATABASE_URL|DB_PASSWORD|connection string|secret|AKIA…|sk-…|ghp_…|AIza…` + 이메일 + 한국 휴대전화.

| 히트 | 파일 | 판정 |
|---|---|---|
| `password` / `cookie` 5·3·3 | `admin-product-description-auth-boundary/smoke.mjs` · `cosmetics-store-to-b2b-copy/smoke.mjs` · `product-db-write-authority/smoke.mjs` | 변수명·주석. 실값은 gitignore 된 `docs/local/TEST-ACCOUNTS.local.md` 에서 **런타임에 읽는** 구조 — 하드코딩 0. (제거됨) |
| `secret` 59·55 | `cosmetics-retail-census/source-musinsa.json.gz` · `retail-raw-union.json.gz` | 브랜드명 (`secretkey` · `Paradise Secrets` · `hollywoodfashionsecrets` …) |
| 이메일 3종 (`sohae2100@gmail.com` · `renagang21@gmail.com` · `sohae21@naver.com`) | smoke 관련 6 파일 | §15 검증 계정 식별자(비밀번호 0). `tmp/` 밖 추적 파일 131 · 104 · 48 곳에 이미 존재 → 신규 노출 아님. (6 파일 모두 제거) |
| 휴대전화 | — | **0** |
| SQL dump 내 사용자 데이터 | `apply/rollback.sql.gz` 5 · `apply.sql` · `baseline.sql` 2 | 대상 테이블 = `product_masters` · `shared_product_descriptions` 만. `users` · `service_memberships` 등 사용자 테이블 **0** |

**SECURITY_STOP = 0.** 실제 secret · 개인정보 없음.

---

## 9. 삭제 / 이동 / 수정 목록

- **삭제 73** (`git rm`): §2 의 #9 · #10 · #11 · #12 · #13 · #14 · #15-a 전체 + #1 `.mjs` 18 + #2 `.mjs` 5 · `closeout-verify.json` + #3 `smoke.mjs` · `smoke.json`.
- **이동 0** (relocation 대상 없음 — §4).
- **수정 5**
  - `apps/api-server/src/scripts/cosmetics-guide-gap-enrichment/10-source-availability.mjs:5` — "재현: probe-*.mjs" 주석 → 탐침은 저장소에 두지 않았고 `source-availability.json` 이 정본.
  - `tmp/cosmetics-guide-gap-enrichment/README.md` — `gunzip tmp/cosmetics-guide-production/*.gz` 입력 안내 → 01~04 로 재생성 안내 · `negative-control` · `probe-*` 행 제거.
  - `tmp/cosmetics-mfds-usage-caution/README.md` — `node tmp/…/negative-control.mjs` 단계 · 표 2행 제거.
  - `tmp/cosmetics-store-to-b2b-copy/README.md` — `node tmp/…/smoke.mjs` 단계 · 표 1행 제거.
  - `docs/checks/CHECK-O4O-COSMETICS-KO-GUIDE-FULL-PRODUCTION-V1.md:10` — 제거된 README 로의 markdown 링크 1건 → 커밋 `c100b6f71` 열람 + 재생성 안내 (§16-3 (2) 기계적 링크 교정).
- **미변경**: `.gitignore` (기존 `tmp-*` 만 무시 · `tmp/` 는 계속 추적 — 복구자료 보존 정책상 의도), 파이프라인 스크립트 본체, schema, migration, production data.

---

## 10. 회귀 테스트

| 항목 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | PASS (8.5s · lockfile 변경 0) |
| `pnpm run build:packages` | PASS (TS error 0) |
| `pnpm run type-check:frontend` | PASS (`type-check:frontend: OK`) |
| `pnpm --filter @o4o/api-server exec tsc --noEmit` | PASS (error 0) |
| Jest `neture-asset-mount-and-dead-package-residue.spec.ts` (추적 산출물 계약) | **12 / 12 PASS** |
| tmp consumer literal scan (삭제 73 경로 × non-doc) | 실소비 0 (§7) |
| docs 링크 검사 (`docs/**` → `tmp/`) | 11 / 11 해결 (수정 1) |
| 삭제·이동된 script 참조 | **0** |
| production browser 검증 | 해당 없음 (tmp-only · runtime 코드 변경 0) |

---

## 11. CI

- push 후 `deploy-api` / `deploy-web` 는 `detect-changes` 가 tmp·docs·script 주석만 감지 → 배포 skip 예상 (runtime 변경 0 이므로 의도된 동작).
- 결과 (`fc3b339cc`): **CI Pipeline SUCCESS** (run 34668032788) · **Deploy API Server (Cloud Run) SUCCESS** (34668032805) · **CodeQL SUCCESS** (34668032792).
- 별건: 같은 시각 Actions 에 남아 있던 `Auth Runtime E2E (3 Services)` 실패는 직전 WO 커밋 `4c4f93ecd` 의 실행(2026-09-11 14:55Z)이며, 원인은 저장소 Actions secret `E2E_{KPA,KCOS,NETURE}_ADMIN_{EMAIL,PASSWORD}` 6개 미등록(2026-08-27 이후 6회 연속 동일). 본 WO 와 무관하고 `fc3b339cc` 는 해당 워크플로의 path 필터에 걸리지 않는다 → 아래 §11-A 에서 별건으로 해소.

### 11-A. 별건 해소 — `e2e-auth-runtime.yml` 서비스별 secret 전환 (2026-09-12)

| 단계 | 내용 | 결과 |
|---|---|---|
| 1 | Actions secret 6개 등록 `E2E_{KPA,KCOS,NETURE}_ADMIN_{EMAIL,PASSWORD}` (값 = `TEST-ACCOUNTS.local.md` 서비스별 admin 행, stdin 으로 전달 · 로그 출력 0) | 완료 03:09Z |
| 2 | 1차 재실행 [34669662809](https://github.com/Renagang21/o4o-platform/actions/runs/34669662809) | `Validate E2E credentials` PASS · Neture/KCos PASS · **KPA 로그인 401** (`INVALID_CREDENTIALS` — kpa-society 스코프 비밀번호 drift, API 직접 확인) |
| 3 | 2차 재실행 [34670923633](https://github.com/Renagang21/o4o-platform/actions/runs/34670923633) — KPA 를 `renagang21@gmail.com` 으로 시도 | 로그인 200 이나 `/admin` `accessDenied=true` (kpa:store_owner) → 워크플로 계약(`E2E_KPA_ADMIN_*` · `protectedPath '/admin'`)에 부적합. 계정 교체안 폐기 |
| 4 | 사용자가 kpa-society.co.kr 에서 `sohae2100@gmail.com`(kpa:admin) 비밀번호를 문서값으로 reset → API `serviceKey=kpa-society` 200 확인 → KPA secret 2개 sohae2100 으로 재등록 | 완료 04:43Z |
| 5 | 3차 재실행 [34673778579](https://github.com/Renagang21/o4o-platform/actions/runs/34673778579) | **success · 48 passed / 0 failed** (KPA-Society 16 · K-Cosmetics 16 · Neture 16, KPA `/admin` 포함) |
| 6 | 폐기된 공용 `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` 삭제 | 완료. 잔여 E2E secret = 서비스별 6개만. 저장소 내 옛 이름 참조 = "폐기" 주석 2곳뿐(코드 사용 0) |

코드·워크플로 변경 0. 자격정보 값은 본 문서·터미널·커밋 어디에도 기록하지 않았다.

---

## 12. STOP 항목

| # | 묶음 | 상태 | 사유 | 해제 조건 |
|---|---|---|---|---|
| S1 | `cosmetics-retail-census/` 12 · 12.7MB | **UNKNOWN_ORIGIN_STOP** | 외부 소매·식약처 snapshot — 재수집해도 동일 결과 불보장. 프로덕션 배치 #1·#4 의 입력 모집단 | 사용자가 "감사 보존 불필요" 로 판정하면 삭제 (README 의 `01~08` 로 **현재 시점** 재수집은 가능) |
| S2 | `cosmetics-pilot/functional-candidates-500.json` · `general-candidates-500.json` 1.44MB | **UNKNOWN_ORIGIN_STOP** | 외부 계통 표본. 프로덕션 미사용 · #7 이 대체 | 삭제 권고 — S1 과 함께 판정 |
| — | `*_install.sql` 4 | KEEP (schema provenance) | 본 WO 범위 밖 (`yaksa_*` schema cleanup) | forum-yaksa CHECK §후속 2 의 yaksa 후속 WO |

`SECURITY_STOP` = 0.

---

## 13. 후속 인계

1. **S1 · S2 판정** — 화장품 설명서 축이 안정되면 `cosmetics-retail-census` snapshot(12.7MB)과 pilot 표본(1.4MB)의 보존 여부를 사용자가 결정. 삭제 시 `cosmetics-guide-gap-enrichment/README.md` · `cosmetics-productmaster-apply-pilot` 의 "선행 census 입력" 안내를 함께 정리.
2. **`*_install.sql` 4** — `yaksa_*` 운영 테이블 처분 WO (forum-yaksa CHECK §후속 2) 에서 함께 판정.
3. **PASS2 §8 정정 2건** (기록물이라 본문은 고치지 않고 여기 정정): (a) `delete_list_*.json` 은 DB 삭제 원장이 아니라 2025-12 문서 재구성 후보 목록 → DELETE. (b) `.mjs` 35 는 ACTIVE_FIXTURE_RELOCATE 가 아니라 전부 일회성 → DELETE (파이프라인 본체는 이미 `scripts/**`).
4. **`tmp/` 명명** — 남은 96 파일은 "임시" 가 아니라 운영 복구자료다. 디렉터리명을 `ops-recovery/` 류로 바꾸는 것은 README 3 · CHECK 다수 · 파이프라인 `lib.mjs` 8곳의 경로 계약을 바꾸므로 별도 WO 로 분리(본 WO 는 경로 불변).
5. ~~`e2e-auth-runtime.yml` Actions secret 6개 등록~~ → **완료** (§11-A). 남은 인계 1건: `sohae2100@gmail.com` 의 **k-cosmetics · neture 운영 비밀번호 ↔ `TEST-ACCOUNTS.local.md` drift** — 문서는 세 서비스 admin 행을 KPA reset 값으로 통일했으나 운영은 KPA 만 그 값(KCos/Neture 는 이전 값, API 401 확인). GitHub secret 은 이전(유효) 값이라 E2E 는 green. 해소 = KCos/Neture 운영 비밀번호를 문서값으로 reset 후 secret 2쌍 재등록, 또는 문서 두 행을 이전 값으로 복원.
6. 향후 배치 WO 의 `tmp/<wo>/` 에는 탐침·smoke `.mjs` 를 커밋하지 않는다 — 결과 JSON/CHECK 만 남기고 스크립트는 `scripts/**` 파이프라인에 두거나 버린다.

---

## 14. 완료 조건

```text
TMP CENSUS                       = CLOSED (169 → 96 · 15 묶음 전수)
OPERATIONAL RECOVERY MATERIAL    = PRESERVED (6 배치 78 + install.sql 4)
TEMPORARY MJS RESIDUE            = ZERO (35 / 35 제거)
GENERATED TMP ARTIFACTS          = ZERO / EXCEPTIONS_RECORDED (제거 25 · 적용 provenance 는 복구자료로 분류)
ACTIVE TMP CONSUMERS             = ZERO (runtime/CI/test/Docker 0 · 파이프라인 입력 경로 유효)
LARGE EXTERNAL SNAPSHOTS         = PRESERVED_OR_STOPPED_WITH_REASON (S1 · S2)
TMP SECRET EXPOSURE              = ZERO
BROKEN REFERENCES                = 0 (링크 11/11 · script 참조 0)
SCHEMA CHANGE                    = 0
PRODUCTION DATA CHANGE           = 0
OTHER SERVICE REGRESSION         = PASS (build:packages · type-check:frontend · api tsc · Jest 12/12)
CI                               = SUCCESS (fc3b339cc · CI Pipeline / Deploy API / CodeQL)
AUTH RUNTIME E2E (별건)           = GREEN (48/48 · 서비스별 secret 6 전환 · legacy secret 2 제거)
WO                               = CLOSED
```

---

## 15. 문서 정합

```text
문서 정합: 발견 3건 / SUPERSEDED 표기 0건 / 링크 수정 1건 / 별도 WO 제안 2건
```

- 발견 1·2: PASS2 §8 의 판정 2건 오독 — 기록물이라 §13-3 에 정정만.
- 발견 3 (링크 수정 1): `CHECK-O4O-COSMETICS-KO-GUIDE-FULL-PRODUCTION-V1.md:10` 제거된 README 링크 → §9.
- 별도 WO 제안 2: `tmp/` 디렉터리명 계약 변경 (§13-4) · `*_install.sql` + `yaksa_*` 처분 (§13-2).
