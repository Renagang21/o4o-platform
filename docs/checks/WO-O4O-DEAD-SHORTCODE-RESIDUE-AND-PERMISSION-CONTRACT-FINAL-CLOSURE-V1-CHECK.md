# WO-O4O-DEAD-SHORTCODE-RESIDUE-AND-PERMISSION-CONTRACT-FINAL-CLOSURE-V1 — CHECK

> **상태**: CLOSED (CI·배포 확인 완료 — §11)
> **작성일**: 2026-09-11
> **작업 성격**: 판정 충돌 해소 → 소비 경계·운영 데이터 실측 → 소스 잔재 제거 (DB 변경 0)

---

## 1. 격리 작업공간 · 기준 SHA

| 항목 | 값 |
|---|---|
| worktree | `C:/tmp/o4o-shortcode-residue` (`git worktree add`, 전용) |
| branch | `work/o4o-dead-shortcode-residue-v1` |
| 기준 SHA (origin/main at start) | `60bfb79ffb03485bfd430b9f2fab11026ac43529` |
| 시작 시 status | clean (다른 세션 dirty/미추적 파일 0) |
| `pnpm install --frozen-lockfile` | exit 0 · lockfile 변경 0 |
| 작업 중 origin/main 전진 | `75e478747` (KCos store-contents wrapper WO) — 본 WO 변경 파일과 교집합 0 |

---

## 2. 선행 판정 충돌표

| 대상 | CENSUS-V1-CHECK | DOMAIN-RETIREMENT-V1-CHECK | IR-MAIN-SITE-FULL-CENSUS | WP-COMPAT-FINAL-DISPOSITION-CHECK | 본 WO 확정 판정 | 근거 |
|---|---|---|---|---|---|---|
| `Form.shortcode` (entity column) | 언급 없음 | `KEEP_UNRELATED` (form-builder 자체 문자열) | `DEAD_EXECUTABLE` (item 6) | 후속 WO 이관 | **REMOVED** | parser/renderer 0 · 프론트 read 0 · 외부 API 소비 0 · **운영 `forms` 테이블 부재** (§5) |
| `FormsController` `[form name=…]` 생성 (L228·L403) | 생성만, 미등록 | `KEEP_UNRELATED` | `DEAD_EXECUTABLE` | — | **REMOVED** | 생성 값의 소비처 0 (등록·파싱 0) |
| `AppManifest.provides.shortcodes` | — | 손대지 않음 | `DEAD_EXECUTABLE` (item 7) | — | **REMOVED** | 작성처 0 · 읽기처 0 · 운영 manifest shortcodes 0 |
| `App.type='shortcode'` (entity enum 값) | — | "**실제 DB enum** … 손대지 않음" | `DEAD_EXECUTABLE` (item 7) | — | **REMOVED (SOURCE_ONLY_ENUM_RESIDUE)** | 운영 `apps.type` = **varchar(50)**, PostgreSQL enum 부재, check constraint 0, `type='shortcode'` row 0 (§6) — 선행 "실제 DB enum" 주장은 운영 실측으로 반증 |
| `shortcodes.manage` (legacy 문자열) | — | — | `DEAD_EXECUTABLE` (item 8) | — | **REMOVED (RETURN_ONLY_RESIDUE)** | `hasPermission('shortcodes.manage')` 0 · 미들웨어 0 · 프론트 리터럴 0 · 반환 배열 2곳에만 존재 (§4) |
| `cms.shortcodes.manage` (`PERMISSIONS` SSOT) | — | — | 언급 없음 | — | **REMOVED_WITH_EVIDENCE (TYPE_ONLY_RESIDUE)** | `PERMISSIONS['cms.shortcodes.manage']` 직접 참조 0 · role 부여는 `...Object.values(PERMISSIONS)` spread 뿐 · `PERMISSION_CATEGORIES.SHORTCODES` 참조 0 · 운영 permissions 행 0 (§4). **이름만 보고 삭제하지 않음** |

원칙 적용: "최근 IR이라는 이유만으로 기존 보존 판정을 자동 폐기하지 않는다" — 두 건의 `KEEP` / "실제 DB enum" 판정은 §5·§6 운영 실측으로만 뒤집었다.

---

## 3. 검색 범위 · 분류

- 활성 범위: `apps/** packages/** services/** scripts/** .github/** package.json pnpm-lock.yaml` (`git grep`, 저장소 grep 도구 회피)
- 분리 범위: `docs/** archive/** apps/api-server/src/database/migrations/**` (기록물 — 보존)
- 검색어: `shortcode`, `shortcodes`, `shortcodes.manage`, `cms.shortcodes.manage`, `[form`, `registerShortcode`, `renderShortcode`, `parseShortcode`, `shortcode-loader`, `shortcode registry`, `type: 'shortcode'`, `type = 'shortcode'`

| 분류 | 결과 |
|---|---|
| `shortCode` / `short_code` (외국인 관광객 파트너 QR 현행 식별자) | 17 파일 — **제외 · 미수정** (`foreign-visitor-partner-qr-code.entity.ts`, `services/web-kpa-society/src/api/foreignVisitorPartnerQrCodes.ts` 등) |
| promotion/affiliate `shortCode` | 위와 동일 축 — 미수정 |
| `[form` | React `[form, setForm]` 구조분해 false positive 만 — 실제 `[form name=` 생성은 `FormsController` 2곳뿐 |
| `registerShortcode / renderShortcode / parseShortcode / shortcode-loader / shortcode registry` | 활성 범위 0 (은퇴 spec·`scripts/audit/README.md` 과거형 언급만) |
| `WordPressGalleryShortcode` (admin gallery `types.ts:161`, interface 이름) | 실행 잔재 아님 — WP-COMPAT 계열 후속 · 미수정 |
| 실행 잔재 (본 WO 처리 대상) | `User.ts:263`, `role-assignment.service.ts:352-353`, `permissions.ts:32,142` (+tracked `.d.ts`/`.js`), `Form.ts:73`, `FormsController.ts:228,403`, `form-builder.ts:164-165` (+`.d.ts`), `App.ts:29,91`, `AppRegistry.ts:14`(주석) |
| 문서 잔재 | `apps/api-server/docs/ROLE_SYSTEM_INVESTIGATION_REPORT.md:156,159`, `scripts/audit/REGISTRY_AUDIT_REPORT.md:202,208` |

작업 후 재검색: 활성 범위에서 소문자 `shortcode` 는 본 WO 판정 주석 · `scripts/audit/README.md` 과거형 서술 · 은퇴 spec 만 남음 (실행 코드 0).

---

## 4. A축 — 권한 문자열별 소비표

| 권한 | 정의 위치 | 부여 경로 | 검사(hasPermission/미들웨어) | 프론트 소비 | 운영 데이터 | 판정 |
|---|---|---|---|---|---|---|
| `shortcodes.manage` | `User.getAllPermissions()` (super_admin 분기 하드코딩 배열) · `role-assignment.service.getPermissions()` | 반환 배열 → `toPublicData().permissions` · `/api/v1/userRole` | **0** | 리터럴 0 | `permissions` 0행 · `roles.permissions` JSON 내 0 · `role_assignments` 내 0 | `RETURN_ONLY_RESIDUE` → **REMOVED** |
| `cms.shortcodes.manage` | `packages/types/src/auth/permissions.ts` `PERMISSIONS` (+`PERMISSION_CATEGORIES.SHORTCODES`) | ADMIN/ADMINISTRATOR/SUPER_ADMIN 에 `...Object.values(PERMISSIONS)` spread 로만 포함 | 직접 키 참조 **0** (`auth-client` rbac 재수출 helper 의 앱 소비 0 · `organization-core` 는 자체 ROLE_PERMISSIONS) | 0 | 위와 동일 0 | `TYPE_ONLY_RESIDUE` → **REMOVED_WITH_EVIDENCE** |

- 두 문자열은 **별개로 판정**했고 합치거나 일괄 삭제하지 않았다.
- raw-source spec 소비 조사 (`node scripts/quality/check-literal-consumers.mjs --source …`): `User.ts` 의 live consumer 1 = `auth-runtime-and-legacy-package-final-closure.spec.ts` (getAllPermissions 가 스냅샷을 읽지 않음을 단언 — 영향 없음, 통과 확인). 나머지 대상 파일 0.
- tracked `.d.ts`/`.js` (`packages/types/src/auth/permissions.{d.ts,js}`, `form-builder.d.ts`): `tsconfig` outDir=`dist` 라 **빌드 산출물이 아니라 stale 추적 파일**(`d2e37b255` 유래, 58 파일 군, import 하는 곳 0). 본 WO 는 정합 유지를 위해 shortcode 줄만 동일하게 제거하고, 파일 군 정리는 별도 hygiene WO 로 이관.

---

## 5. B축 — Form shortcode 데이터 흐름

| # | 확인 항목 | 결과 |
|---|---|---|
| 1 | 생성 위치 | `FormsController.createForm` (L228) · `duplicateForm` (L403) — 템플릿 문자열 `[form name="…"]` |
| 2 | 저장 | `Form.shortcode` (text nullable) — `Form` 은 `database/entities.ts:74` 등록 |
| 3 | 파서/렌더러 | **0** (`@o4o/shortcodes` 은퇴 이후 전무) |
| 4 | 프론트 read | admin `cpt-engine/index.tsx:59-61` → FormsManager/FormBuilder — `.shortcode` 읽기 **0** |
| 5 | 외부/공개 API 노출 | `GET /api/v1/cpt/forms/name/:name` (비인증) 응답에 컬럼 포함 가능성 — 소비처 0 |
| 6 | 고유 form 의존 | 0 |
| 7 | 라우트 마운트 | `/api/v1/cpt` (`routes/cpt.ts:141-168`) — 활성 |
| 8 | migration | `forms` 테이블 생성 migration **0** |
| 9 | 운영 DB | **`forms` · `form_submissions` 테이블 부재** (§7) → column 실존 아님 |
| 10 | 부분 정리 시 은폐 여부 | 아래 별도 발견으로 기록 |

판정: `FORM_SHORTCODE_FIELD = REMOVED`, `FORM_SHORTCODE_RUNTIME_CONSUMER = ZERO`.

**별도 발견 — `FORM_FEATURE_UNPROVISIONED_IN_PRODUCTION`**: Form 기능은 entity · `/api/v1/cpt/forms*` 라우트 · admin FormBuilder 화면이 모두 존재하지만 **운영 DB 에 테이블이 없다** (synchronize:false · migration 0). Form 기능 전체 삭제는 §9 금지 항목이므로 손대지 않았고, 소유자·존치 여부는 별도 WO 로 이관한다. 불완전 구조를 감추지 않기 위해 여기 기록한다.

---

## 6. C축 — App · AppRegistry · DB enum 관계

| 대상 | 소스 | 운영 DB | 판정 |
|---|---|---|---|
| `App` entity (`apps` 테이블) | 활성 — `startup.service.ts:214-250` 이 `google-gemini-text`(type `integration`) 을 `app-registry.service.ts` 경유 등록 | `apps` 1행 (`google-gemini-text` / `integration`) · `type` 컬럼 = **varchar(50)** · PostgreSQL enum 타입 **0** · check constraint **0** · `type='shortcode'` **0** · manifest `provides.shortcodes` **0** | entity `type: 'enum'` ↔ 실제 varchar 드리프트 = `LEGACY_APP_AXIS_DEBT` (본 WO 미수정) |
| `App.type` 의 `'shortcode'` 값 | enum 배열 문자열 | 위 | `SOURCE_ONLY_ENUM_RESIDUE` → 소스 제거 · **migration 0** |
| `AppManifest.provides.shortcodes` | 작성처 0 · 읽기처 0 | 0 | REMOVED |
| `AppRegistry` (`app_registry` 테이블) | 별도 축 | 2행 (`digital-signage-core` core active · `partnerops` standalone inactive) · `type` varchar | 주석 1줄만 교정 |

`APP_SHORTCODE_DB_ENUM`: 제거할 DB enum 자체가 **존재하지 않음** → `PRESERVED` 로 기재 (의미: DB 무변경 · migration 미작성). "운영 row 0 이어도 즉시 enum migration 을 만들지 않는다" 원칙 준수.

---

## 7. 운영 DB read-only 실측

- 경로: Cloud SQL Auth Proxy (로컬 포트) + `psql -w` read-only. 자격정보는 Secret Manager 에서 환경변수로만 주입 — 본 문서·터미널·diff 에 미기록.
- 실행 쿼리: 테이블 존재 · 컬럼 타입 · COUNT · enum 카탈로그 · constraint 조회만 (SELECT 전용, 개인정보 컬럼 미조회).

| 항목 | 결과 |
|---|---|
| `forms` / `form_submissions` 테이블 | **부재** |
| `apps` | 1행 · `type` varchar(50) · `type='shortcode'` 0 · manifest shortcodes 0 |
| `app_registry` | 2행 · `type` varchar |
| `pg_enum` 에 label `shortcode` | 0 |
| `permissions` | 0행 · `role_permissions` 0행 |
| `roles` | 41행 — permissions JSON 내 `shortcode` 0 |
| `role_assignments` | 활성 57행 — `shortcode` 0 |
| `typeorm_migrations` | 668건 실행 완료 (미수정) |

`PRODUCTION_DATA_CHANGE = ZERO`.

---

## 8. 삭제 · 보존 · 유보 목록

**삭제 (소스)**
- `User.getAllPermissions()` 의 `'shortcodes.manage'`
- `role-assignment.service.getPermissions()` 의 `'shortcodes.manage'`
- `PERMISSIONS['cms.shortcodes.manage']` · `PERMISSION_CATEGORIES.SHORTCODES` (+tracked `.d.ts`/`.js` 동일 줄)
- `Form.shortcode` 컬럼 · `FormsController` 의 `[form name=…]` 생성 2곳 · `form-builder.ts` `shortcode?: string` (+`.d.ts`)
- `AppManifest.provides.shortcodes` · `App.type` enum 의 `'shortcode'`

**보존**
- `shortCode`/`short_code` (외국인 관광객 파트너 QR) 전체
- `packages/block-renderer` 및 소비처
- `'cms.blocks.manage'` 등 형제 권한 · `'cpt.manage'`
- Form 기능(entity·라우트·admin 화면) · App/AppRegistry 엔티티 · CPT
- 모든 실행 완료 migration · `docs/checks/**` · `archive/**` · `scripts/audit/REGISTRY_AUDIT_REPORT.md` (이미 역사화 헤더 보유, registry spec 이 참조)

**유보 (별도 WO)**
- `FORM_FEATURE_UNPROVISIONED_IN_PRODUCTION` (§5)
- `LEGACY_APP_AXIS_DEBT` — `App.type` entity enum vs 운영 varchar 드리프트 (§6)
- `packages/types/src/**/*.{js,d.ts,map}` stale tracked 산출물 58 파일 군 + `packages/auth-client/src/rbac.js` 등 (hygiene)
- `WordPressGalleryShortcode` interface 이름 (WP-COMPAT 후속)

---

## 9. 변경 파일

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/modules/auth/entities/User.ts` | `'shortcodes.manage'` 제거 + 판정 주석 |
| `apps/api-server/src/modules/auth/services/role-assignment.service.ts` | 동일 |
| `packages/types/src/auth/permissions.ts` / `.d.ts` / `.js` | `SHORTCODES` 카테고리 · `cms.shortcodes.manage` 제거 |
| `apps/api-server/src/entities/Form.ts` | `shortcode` 컬럼 제거 + 판정 주석 |
| `apps/api-server/src/controllers/cpt/FormsController.ts` | `[form name=…]` 생성 2곳 제거 |
| `packages/types/src/form-builder.ts` / `.d.ts` | `shortcode?: string` 제거 |
| `apps/api-server/src/entities/App.ts` | `provides.shortcodes` 제거 · enum `'shortcode'` 제거 + 판정 주석 |
| `apps/api-server/src/entities/AppRegistry.ts` | 주석 타입 목록 교정 |
| `apps/api-server/docs/ROLE_SYSTEM_INVESTIGATION_REPORT.md` | 상단 역사 기록 인용문 1단락 추가 (본문 미수정) |
| `apps/api-server/src/__tests__/shortcode-domain-retirement.spec.ts` | describe 9 회귀 계약 추가 (A/B/C축 + 보존 계약) |
| `docs/checks/…-FINAL-CLOSURE-V1-CHECK.md` | 본 문서 |

DB · migration · `package.json` · lockfile · CI 변경 0.

---

## 10. 테스트 · 검증

| 명령 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm run build:packages` | exit 0 |
| `pnpm run type-check:frontend` | exit 0 |
| `pnpm --filter @o4o/api-server exec tsc --noEmit` | exit 0 |
| `pnpm --filter @o4o/admin-dashboard run type-check` | exit 0 |
| `pnpm --filter @o4o/admin-dashboard run build` | exit 0 (built in 33.5s) |
| api-server Jest — `shortcode-domain-retirement.spec.ts` | 39/39 통과 (신규 describe 9 포함) |
| api-server Jest — 은퇴·권한·auth·admin·security·CPT/App/registry 관련 42 suites | 775/775 통과 |
| api-server Jest — app-management/wordpress/legacy-schema 4 suites | 178/178 통과 |
| admin-dashboard Vitest | 15 files 통과 |
| ESLint (변경 api-server 파일 7개) | 0 error · warning 2 = `FormsController.ts:7` 미사용 import (`FormNotification`, `FormConfirmation`) — **기존** (해당 줄 미변경) · 신규 0 |
| QR `shortCode` 회귀 | 은퇴 spec describe 9 보존 계약으로 고정 (전용 단위 테스트는 저장소에 없음 — 기록) |

---

## 11. CI · 배포

구현 커밋 `f62793064` · CHECK 커밋 `2e9d1fb60` (rebase 후 SHA, origin/main 반영).

| Workflow | 상태 | run ID / SHA |
|---|---|---|
| Deploy API Server | **success** | 34546871487 / `2e9d1fb60` |
| Deploy Admin Dashboard | **success** | 34546871481 / `2e9d1fb60` |
| Deploy Web Services | **success** | 34546871543 / `2e9d1fb60` |
| CI Pipeline | `2e9d1fb60` 실행 34546871488 = **cancelled** (concurrency — 다른 세션 push `c874a070d` 가 취소, 그 실행 34546903905 도 `87081e04d` push 로 cancelled). 선형 후손 `87081e04d` 실행 **34547310318 = success** (Code Quality Check / Build admin-dashboard 모두 success) | 34547310318 / `87081e04d` |
| CodeQL | `2e9d1fb60` 실행 34546871490 = **cancelled** (동일 사유). 선형 후손 `87081e04d` 실행 **34547310167 = success** | 34547310167 / `87081e04d` |
| AppStore Guard | NOT_TRIGGERED (path filter 미해당) | — |

- 취소된 실행은 성공으로 기재하지 않는다. 후손 근거: `git merge-base --is-ancestor 2e9d1fb60 87081e04d` = true (`2e9d1fb60` → `c874a070d`(docs-only) → `87081e04d`), 본 WO 변경 파일은 후손 커밋에서 되돌려지지 않았다.

---

## 12. 중지 조건

발동 0. DB enum 삭제 · column DROP · 운영 데이터 변경 · Form/App/CPT/block-renderer 삭제 · migration 수정 · `shortCode` 변경 모두 수행하지 않음. 운영 DB 자격정보는 Secret Manager 경로로 확보되어 "자격정보 없음" 기록 사유 없음.

---

## 13. 다음 archive 정책 작업과의 경계

- 본 WO 는 **활성 소스**의 shortcode 실행 잔재만 닫았다. `docs/checks/**` · `archive/**` · migration 의 shortcode 문자열은 기록물로 보존했으며, 그 보존 정책 자체는 후속 `archive/**` 보존 정책 WO 의 범위다.
- 후속 repo-wide dead-code census 는 §8 유보 4건(Form 미프로비저닝 · App enum 드리프트 · stale tracked 산출물 · WP gallery interface)을 입력으로 받는다.

---

## 16. 최종 판정

```text
WORDPRESS_SHORTCODE_RUNTIME       = ZERO
SHORTCODE_PACKAGE                 = ABSENT
SHORTCODE_PARSER_RENDERER         = ZERO
LEGACY_SHORTCODES_MANAGE          = REMOVED
CMS_SHORTCODES_MANAGE             = REMOVED_WITH_EVIDENCE
FORM_SHORTCODE_FIELD              = REMOVED
FORM_SHORTCODE_RUNTIME_CONSUMER   = ZERO
APP_SHORTCODES_METADATA           = REMOVED
APP_SHORTCODE_DB_ENUM             = PRESERVED   (PostgreSQL enum 부재 · migration 0 · DB 무변경)
QR_SHORTCODE_CONTRACT             = PRESERVED
BLOCK_RENDERER_CONSUMERS          = PRESERVED
MIGRATION_HISTORY                 = PRESERVED
PRODUCTION_DATA_CHANGE            = ZERO
OTHER_SERVICE_REGRESSION          = PASS
CI_PIPELINE                       = SUCCESS   (linear descendant 87081e04d · run 34547310318)
CODEQL                            = SUCCESS   (linear descendant 87081e04d · run 34547310167)

DEAD_SHORTCODE_RESIDUE_AND_PERMISSION_FINAL_CLOSURE
  = CLOSED
```
