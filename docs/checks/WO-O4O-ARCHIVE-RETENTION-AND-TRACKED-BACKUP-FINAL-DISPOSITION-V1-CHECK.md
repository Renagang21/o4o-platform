# CHECK — WO-O4O-ARCHIVE-RETENTION-AND-TRACKED-BACKUP-FINAL-DISPOSITION-V1

> 상태: IMPLEMENTATION_COMPLETE_CI_PENDING (§10 에서 CI 확정 후 갱신)
> 작성일: 2026-09-11
> 기준 origin/main: `6ae74cbd6` (worktree `work/o4o-archive-disposition-v1`)
> 정책 정본: [`docs/rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md §8`](../rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md) (본 WO 에서 추가)

---

## 0. 요약

| 묶음 | 파일 | 판정 | 처분 |
|---|---:|---|---|
| 저장소 루트 `archive/**` (5 묶음 + README) | 53 | **DELETE_TRACKED_BACKUP** | 삭제 (505,091 bytes) |
| `docs/archive/**` (audits · checks · investigations · obsolete · reports · work-orders) | 540 | **KEEP_HISTORICAL_EVIDENCE** | 보존 · 본문 무변경 |
| `docs/baseline/legacy/GLYCOPHARM-LEGACY-POSTMORTEM.md` | 1 | **KEEP_BUSINESS_DECISION** (CLAUDE.md 색인) | 보존 |
| 설정 잔재 (`admin tsconfig` · `eslint.config.js` · `api-server tsconfig.build.json`) | 3 | 삭제 경로 제외 목록 | 정리 |
| 추적 `tmp/**` (범위 밖 발견) | 169 · 43.6 MB | 전역 census 인계 (§11) | 무변경 |

삭제 53 / 보존 541 / 중지 0. 운영 DB 접근 없음.

---

## 1. 조사 범위 실측

| 패턴 (§3) | 추적 파일 |
|---|---:|
| `archive/**` | 53 |
| `docs/archive/**` | 540 |
| `**/backup/**` · `**/backups/**` · `**/*-backup/**` · `**/*_backup/**` | 0 (root archive 안의 `media-library-backup-20250912` · `theme-backup-20250912` 만 해당 → 위 53 에 포함) |
| `**/*.bak` · `*.old` · `*.orig` · `*.deprecated.*` | 0 (`archive/2025-01-06-fix/*.before-reorder` · `pages-test/*.tsx.fix` 는 위 53 에 포함) |
| `**/legacy/**` | 1 (`docs/baseline/legacy/GLYCOPHARM-LEGACY-POSTMORTEM.md`) |
| `theme-backup` · `old-post-components` · `duplicate-cleanup` · `media-library-backup` 문자열 | 코드 0 · 활성 문서 0 · 기록물(`docs/checks` 1 · `docs/investigations` 1) 만 언급 |

별도 범주(`docs/checks` · `docs/investigations` · `docs/work-orders` · `migrations` · `fixtures` · `test-data`) 는 자동 삭제 대상에서 제외하고 보존만 확인했다.

---

## 2. 전수표 — 저장소 루트 `archive/**`

| 경로 | 파일 수 | 용량 | 마지막 변경 | 내용 | 활성 소비 | Git 복구 가능 | 보존 필요 | 판정 |
|---|---:|---:|---|---|---:|---|---|---|
| `archive/old-post-components/` | 5 | 72 KB | `46070c0da` 2025-09-04 | admin Posts 관리 구 컴포넌트 (`AllPosts` · `PostList*`) | 0 | ✅ 원본 `e40425b28` (2025-07-10) → 이동 `46070c0da` | 없음 | DELETE_TRACKED_BACKUP |
| `archive/theme-backup-20250912/` | 22 | 168 KB | `b12fd708b` 2025-09-12 | Astra Customizer 이전 theme/themes 컴포넌트·hook·css | 0 | ✅ 원본 `e6a8193e2` (2025-09-01) → 이동 `b12fd708b` | 없음 | DELETE_TRACKED_BACKUP |
| `archive/media-library-backup-20250912/` | 3 | 60 KB | `8c191b4e1` 2025-09-12 | MediaLibrary 재구현 이전 사본 | 0 | ✅ 원본 `95ae11d25` (2025-07-24) → 이동 `8c191b4e1` | 없음 | DELETE_TRACKED_BACKUP |
| `archive/2025-01-06-duplicate-cleanup/` | 21 | 199 KB | `224c4b67f` 2025-09-06 (경로 정리 `3e7576ec2`) | admin Users 페이지·WordPressBlockEditor·test 페이지 중복 사본 | 0 | ✅ 원본 `671bf7f4a` (2025-07-24) 등 → 이동 `224c4b67f` | 없음 | DELETE_TRACKED_BACKUP |
| `archive/2025-01-06-fix/` | 1 | 26 KB | `224c4b67f` 2025-09-06 | `StandaloneEditor.tsx.before-reorder` (편집 전 스냅샷) | 0 | ✅ 원본 `7106b0535` (2025-08-28) | 없음 | DELETE_TRACKED_BACKUP |
| `archive/README.md` | 1 | 2 KB | `3e7576ec2` 2025-09-30 | "git 에 포함하되 빌드 제외" 구 정책 안내 | 0 | ✅ | 없음 — 정책 대체 (§8 정본) | DELETE_TRACKED_BACKUP |

공통 확인:
- 현재 코드와 중복 여부: 전부 현행 컴포넌트로 대체된 구버전 (WordPress 스타일 테이블 · Astra Customizer · MediaLibrary 재구현 · Users 페이지 통합).
- import 0: `git grep` 전 서비스·패키지 `archive/` import 0. 유일한 참조 = `apps/admin-dashboard/tsconfig.json` exclude · `eslint.config.js` ignore (둘 다 "대상 제외" 선언 → 함께 정리).
- 라이선스·외부 출처: 헤더 0. `theme-backup/theme/PreviewPanel.tsx` 의 `© 2024 Your Business` 는 프리뷰 placeholder 문자열.
- 문서 안내: 활성 문서(`docs/` 비기록 폴더 · CLAUDE/AGENTS/README/SETUP) 0. 기록물 2건(`docs/checks/WO-O4O-WINDOW-WP-POLYFILL-RUNTIME-CENSUS-V1-CHECK.md` · `docs/investigations/IR-O4O-FRONTEND-DANGEROUS-HTML-RENDERING-AUDIT-V1.md`) 은 과거 시점 census 표이므로 수정하지 않는다 (`CLAUDE.md §16-1`).
- 사용자 데이터·비밀정보: §6.

## 3. 전수표 — `docs/archive/**`

| 경로 | 파일 수 | 용량 | 마지막 변경 | 내용 | 활성 소비 | Git 복구 | 보존 필요 | 판정 |
|---|---:|---:|---|---|---|---|---|---|
| `docs/archive/investigations/` | 292 | 5.5 MB | `684a3010a` 2026-08-06 | 완료 IR | `docs/README.md` 색인 · 다수 CHECK 링크 | ✅ | 과거 판단 근거 | KEEP_HISTORICAL_EVIDENCE |
| `docs/archive/audits/` | 154 | 2.3 MB | `91f240411` 2026-06-01 | 완료 감사 IR | 색인 | ✅ | 삭제·권한·데이터 판단 근거 | KEEP_HISTORICAL_EVIDENCE |
| `docs/archive/checks/` | 56 | 0.5 MB | `2dc16e22e` 2026-08-06 | 완료 CHECK | 색인 | ✅ | 검증 증거 | KEEP_HISTORICAL_EVIDENCE |
| `docs/archive/reports/` | 21 | 0.2 MB | `1bc1cedc0` 2026-08-08 | 완료 보고서 · `FIRSTMALL-CSV-SAMPLE-V1.csv`(합성 3행 샘플 · 보고서 부속) · `TEST_VIEW_PREVIEW.md`(테스트 기록) | `CLAUDE.md` 색인 (`OPERATOR-CORE-EXTRACTION-VERIFY-CHECKLIST-V1`) | ✅ | 완료 기록 | KEEP_HISTORICAL_EVIDENCE |
| `docs/archive/obsolete/` | 11 | 0.15 MB | `3334a72e9` 2026-06-01 | Care · Point · 폐기 WO 초안 | 색인 | ✅ | 폐기 결정 기록 | KEEP_BUSINESS_DECISION |
| `docs/archive/work-orders/` | 6 | 55 KB | `eb0ce94f9` 2026-08-06 | 완료 일회성 WO/REPORT | 색인 | ✅ | 완료 기록 | KEEP_HISTORICAL_EVIDENCE |

삭제·축약 후보 검사: 비-Markdown 파일 = `.gitkeep` 5 + CSV 1(합성 샘플) · **동일 blob 중복 0** (`git ls-files -s` 해시 대조) · 자동 생성 숫자 목록/로그 원문/빌드 출력 0. 축약 대상 없음 → 본문 무변경, `HISTORICAL/SUPERSEDED` 표기 추가 0 (대체 관계 판정은 별도 문서 작업이며 본 WO 는 코드 archive 축이 목적).

`docs/README.md` 의 폴더별 파일 수(289/153/29/20/10/4) 는 현재(292/154/56/21/11/6) 와 어긋난다 — 색인 수치 drift · 본 WO 범위 밖 · 보고만.

---

## 4. 활성 소비처 검사 (§5)

| 소비 유형 | 검사 | 결과 |
|---|---|---|
| import/require (`archive/`) | `git grep` apps · packages · services · scripts | 0 |
| TypeScript path / exclude | `apps/admin-dashboard/tsconfig.json` `../../archive/**` exclude | 제거 (제외 선언이지 소비 아님) |
| package export | `packages/*/package.json` | 0 |
| build script · Docker context | `Dockerfile*` · `.dockerignore` · `package.json scripts` | 0 |
| test fixture | Jest/Vitest 소스 | 0 |
| CI workflow | `.github/**` | 0 |
| lint | `eslint.config.js` `archive/**` ignore | 제거 |
| `sonar-project.properties` · `.github/CODEOWNERS` | archive 언급 | 0 |
| migration runner / runtime file read / copy script | `apps/api-server/tsconfig.build.json` `src/migrations/ARCHIVE_2025/**/*` exclude → **부재 경로**(추적 0) | stale exclude 제거 |
| `.gitignore` | `*.backup` 규칙만 존재 | 유지 |

이전 필요 자산(ACTIVE_FIXTURE_RELOCATE · ACTIVE_CONSUMER_KEEP): 0.

---

## 5. 변경 파일

삭제 (53): `archive/**` 전체.

수정:
- `apps/admin-dashboard/tsconfig.json` — exclude `../../archive/**` 제거
- `eslint.config.js` — ignore `archive/**` 제거 (주석 갱신)
- `apps/api-server/tsconfig.build.json` — 부재 경로 `src/migrations/ARCHIVE_2025/**/*` exclude 제거
- `docs/rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md` — §8 "코드 archive · 추적 백업 정책" 추가 (기존 §8 관련 문서 → §9). 본 WO 가 정책 확정 WO 이므로 인라인 허용 범위.

신규: `apps/api-server/src/__tests__/archive-retention-and-tracked-backup-disposition.spec.ts` (11 tests)

추적 파일 수: 28,048 → 27,996 (−53 +1) · 용량 −505,091 bytes.

---

## 6. 민감정보 검사 (§8)

패턴: 비밀번호/API key/secret/token 대입 · AWS/GCP/OpenAI/GitHub 키 형태 · PEM private key · DB 접속 URL · JWT · 개인 이메일 도메인 · 휴대전화. 내용은 출력·기록하지 않았다.

| 범위 | secret 패턴 | 개인정보 패턴 | 판정 |
|---|---:|---:|---|
| `archive/**` (삭제 대상) | 0 | 0 | ZERO |
| `docs/archive/**` | 2 | 111 줄 / 34 파일 | 아래 |
| `tmp/**` (범위 밖 · 보고) | 0 | 6 파일 | §11 인계 |

`docs/archive` 상세:
- secret 패턴 2건 = IR 본문의 **요청 형태 예시** (`operator@example.com` · `ir-supplier-test@o4o.com` 계정의 placeholder 비밀번호). 실제 자격정보 여부: `docs/local/TEST-ACCOUNTS.local.md` 미일치 · 다른 추적 파일 0 · placeholder 어휘 포함 → **실 secret 아님**.
- 개인정보 패턴 = 검증에 사용된 계정 이메일 6개(개발자·검증 tenant 계정) 와 휴대전화 형태 5개(테스트 fixture 값 · 1건은 CSV 바코드 숫자열 오탐). 제3자 실사용자 개인정보로 확인된 항목 0. 기록물 본문은 수정하지 않는다(`CLAUDE.md §16-1`) — 계정 마스킹이 필요하다고 판단되면 별도 문서 정비 WO.

**ARCHIVE_SECRET_EXPOSURE = ZERO** (중지 조건 §14-4 비발동 · Git 이력 제거·rotation 불요).

---

## 7. 문서 링크 정합

- 삭제 경로를 가리키는 **활성** 링크: 0 (기록물 2건은 §2 대로 유지).
- `docs/rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md` 절 번호 변경(관련 문서 §8→§9): 외부에서 `#8` 앵커 참조 0.
- `archive/README.md` 삭제로 사라진 안내는 정본 §8 이 대체.

---

## 8. 회귀 테스트 (§11)

`archive-retention-and-tracked-backup-disposition.spec.ts` — 경로 개수 고정 없이 금지 유형·소비 관계 검사:

| 계약 | 검사 |
|---|---|
| tracked source backup directories = zero | 루트 `archive/` 부재 · 활성 트리(apps/packages/services/scripts/.github)에 `*.bak/*.old/*.orig/*.before-*/*.tsx.fix` 0 · `backup(s)/ · *-backup-*/ · *_backup/` 0 |
| active runtime imports from archive = zero | 활성 소스 import/require 에 `archive/` 0 |
| CI/build dependencies on archive = zero | `.github/**` yml 에 `archive/` 0 · admin tsconfig · api tsconfig.build · eslint 에 잔존 0 |
| historical checks · business decision records · migration history = preserved | `docs/archive/{audits,checks,investigations,reports,work-orders,obsolete}` 존재 · `docs/checks` · `docs/investigations` 존재 · `apps/api-server/src/database/migrations/*.ts` > 0 |
| 정책 문서화 | rules §8 문구 존재 |

결과: 11/11 PASS.

---

## 9. 로컬 검증 (§12)

| 명령 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm run build:packages` | exit 0 |
| `pnpm run type-check:frontend` | OK |
| `pnpm --filter @o4o/api-server exec tsc --noEmit` | exit 0 |
| `pnpm --filter @o4o/admin-dashboard run type-check` | exit 0 |
| `pnpm --filter @o4o/admin-dashboard run lint` | 0 errors (487 warnings · 기존 baseline) |
| 관련 Jest (archive-retention · unprovisioned-form · shortcode-domain-retirement · wordpress-compat-field) | 4 suites · 90 tests PASS |
| 활성 문서 링크 검사 | 삭제 경로 활성 링크 0 |
| secret scanning | §6 |

프로덕션 브라우저 검증: 불필요 (소비처 없는 코드 사본·설정 제외 목록만 변경).

---

## 10. CI (§13)

(push 후 갱신)

---

## 11. 중지 조건 · 전역 census 인계

중지 조건(§14) 발동: **0**.

전역 `IR-O4O-REPOSITORY-WIDE-DEAD-CODE-AND-LEGACY-SURFACE-CENSUS-V1` 인계 항목:

| # | 항목 | 실측 | 비고 |
|---|---|---|---|
| 1 | 추적 `tmp/**` | 169 파일 · **43.6 MB** · 21 묶음 | §3 범위 밖(이름이 archive/backup 아님). (a) `tmp/delete_list_*.json` 4 · `tmp/*_install.sql` 4 (2025-12-10 · forum_yaksa/membership_yaksa 등 부재 모듈 산출물) = 생성 산출물 삭제 후보. (b) `tmp/cosmetics-*` · `product-*` 등 17 묶음 = 2026-08 화장품 census/생산 파이프라인의 dry-run·apply·**rollback.sql**·운영 read-only dump — 스크립트(`apps/api-server/src/scripts/cosmetics-*`)가 입력으로 읽는 **활성 소비 + 운영 복구 자료**(§14-8) → 보존 위치·`.gitignore` 정책을 전역 census 에서 판정. secret 패턴 0 · 이메일 6 파일(검증 계정). |
| 2 | `packages/auth-client/src` 추적 산출물 28 · `packages/forum-core/src` 34 | 선행 WO 기록 | `packages/types/src` 와 동일한 기계적 원인(tsc outDir 오설정 시점 산출물 커밋). 수기 후보 `axios.d.ts` · `ForumTag.d.ts/.js` 분리 판정 후 일괄 정리 가능. 본 WO 미확대. |
| 3 | 운영 `apps` · `app_usage_logs` 물리 테이블 | 선행 WO | DROP migration 별도 |
| 4 | `docs/README.md` 폴더별 파일 수 drift | §3 | 색인 수치 정정 (문서 작업) |
| 5 | admin Overview 목업 · `Theme` entity | 미조사 | archive 와 무관 · 전역 census |

---

## 12. 최종 판정

```text
TRACKED_SOURCE_BACKUPS           = ZERO
TRACKED_GENERATED_ARCHIVES       = ZERO
ACTIVE_ARCHIVE_IMPORTS           = ZERO
ACTIVE_CI_ARCHIVE_DEPENDENCIES   = ZERO
HISTORICAL_CHECKS                = PRESERVED
BUSINESS_DECISION_RECORDS        = PRESERVED
MIGRATION_HISTORY                = PRESERVED
ARCHIVE_SECRET_EXPOSURE          = ZERO
BROKEN_ACTIVE_ARCHIVE_LINKS      = ZERO
OTHER_SERVICE_REGRESSION         = PASS
CI_PIPELINE                      = PENDING
CODEQL                           = PENDING

ARCHIVE_RETENTION_AND_TRACKED_BACKUP_FINAL_DISPOSITION
  = IMPLEMENTATION_COMPLETE_CI_PENDING
```

`TRACKED_GENERATED_ARCHIVES = ZERO` 주석: §3 범위(`archive/**` · `docs/archive/**` · backup 패턴) 안의 생성 산출물은 0. 범위 밖 `tmp/**` 는 §11-1 로 인계.
