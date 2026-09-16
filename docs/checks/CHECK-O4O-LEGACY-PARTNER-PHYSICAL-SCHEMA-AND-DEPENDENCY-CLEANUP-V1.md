# CHECK-O4O-LEGACY-PARTNER-PHYSICAL-SCHEMA-AND-DEPENDENCY-CLEANUP-V1

> **상태**: COMPLETED (실행 기록)
> **작성일**: 2026-09-16
> **근거 WO**: `WO-O4O-LEGACY-PARTNER-PHYSICAL-SCHEMA-AND-DEPENDENCY-CLEANUP-V1` (DDL · 대상 데이터 정리 · dependency/workspace/lockfile 변경 사용자 명시 승인)
> **상위 정본**: [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §7 — `CURRENT PARTNER = FULL RETIREMENT / FUTURE PARTNER = GREENFIELD`
> **선행 기록**: [`CHECK-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1`](CHECK-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1.md) §8 (모집단은 재사용하지 않고 §1 에서 다시 산출)
> **기준 commit**: `ccbd16be480f89668f650245eabe7f3ce1cdf34a` (Fresh Census 시점 HEAD == origin/main · clean)
> **실행 commit**: Phase 1 `a319edbd6a0a435961ed46bd3f61045db563add3` · Phase 2 `6d5cfcdcd` (§10-1)

---

## 0. 결과

```text
PARTNER_PHYSICAL_SCHEMA = RETIRED     (테이블 11 · enum 3 · 컬럼 4 · inactive partner role row 3 — 프로덕션 실행 완료)
SELLER_RECRUITMENT      = PASS        (seller_recruitments · seller_recruitment_applications · applicant_* 로 물리 명칭 정리 · 프로덕션 smoke PASS)
DEAD_PACKAGES           = REMOVED     (@o4o/partner-core · @o4o/financial-core)
LOCKFILE                = ALIGNED     (pnpm-lock.yaml importer 2 제거 · --frozen-lockfile PASS)
ACTIVE_DOCS             = ALIGNED     (F7 · SELLER-PARTNER 설계 문서 → docs/archive/obsolete/partner/ · 현행 링크 3곳 수정)
PRODUCTION_MIGRATION    = PASS        (Phase 1 · Phase 2 모두 Cloud Run Job o4o-api-migrations · INCREMENTAL_EXECUTED=1 · POST_MIGRATION_SCHEMA_ASSERTION=PASS)
PRODUCTION_SMOKE        = PASS        (Seller Recruitment canonical 5 endpoint · Phase 1 revision o4o-core-api-03676-tvk · Phase 2 revision o4o-core-api-03677-lzp 100% · alias 404)
TEMP_COMPAT_ALIAS       = 0           (route alias /neture/partner/* 제거 · 배포 창 VIEW 2개 Phase 2 에서 DROP)

NEXT = GO_SERVICE_TENANT_FOUNDATION
```

---

## 1. Fresh Census (최신 `origin/main` `ccbd16be4` 기준)

### 1-1. 코드 · workspace

| 항목 | 실측 |
|---|---|
| `@o4o/partner-core` importer | 0 (`pnpm why` · `git grep` 모두 0 · `package.json` `build:partner-packages` 스크립트만 참조) |
| `@o4o/financial-core` importer | 0 |
| `packages/partnerops/` · `partner-ai-builder/` · `cosmetics-partner-extension/` | 미추적 빌드 잔여(타 세션 · **불가침**) — workspace glob 에 걸리지 않음 · lockfile importer 없음 |
| Seller Recruitment 물리 seam | 엔티티 상수 `SELLER_RECRUITMENT_TABLE = 'neture_partner_recruitments'` 외 1 · 컬럼 `partner_id` · `partner_name` · raw SQL 7곳 |
| `router.use('/partner', sellerRecruitmentRouter)` alias | 1 (`neture.routes.ts`) — 프런트 소비 0 (`/seller-recruitment/*` 로 전환 완료) |
| `MarketTrialDecision.selectedSellerIds` | 엔티티 매핑 1 · DTO 1 · 컨트롤러 파싱 1 · 서비스 `null` 고정 1 · 프런트 소비 0 |
| Dockerfile · `.github/workflows` 의 dead package 참조 | 0 |

### 1-2. 프로덕션 DB (read-only · 승인 채널)

| 항목 | 실측 |
|---|---|
| DROP 대상 테이블 11 | **전부 0행** (`neture_partner_dashboard_items` · `_item_contents` · `neture_partnership_requests` · `_products` · `neture_seller_partner_contracts` · `partner_commissions` · `partner_referrals` · `partner_settlements` · `partner_settlement_items` · `supplier_partner_commissions` · `neture.neture_partners`) |
| Partner 컬럼 non-null | `checkout_orders."partnerId"` 0 · `store_products.is_partner_recruiting=true` 0 · `neture.neture_products.partner_id` 0 · `market_trial_decisions."selectedSellerIds"` 0 |
| `role_assignments` partner role | active **0** · inactive 3 (`neture:partner` 1 · `cosmetics:partner` 2 · scope global · 참조 FK 없음) |
| 미확인 FK / view / function consumer | 0 (`pg_depend` · `pg_constraint` · `pg_views` · `pg_proc` 정의 검색 — DROP 대상을 참조하는 객체 없음) |
| `neture_partner_recruitments` · `neture_partner_applications` | 0행 (live 기능이지만 현재 데이터 없음) |
| `foreign_visitor_partner*` 3 테이블 | 대상 아님 (KEEP_OTHER_DOMAIN) |

**중지 조건 해당 없음** → 승인 범위 그대로 진행.

### 1-3. Seller Recruitment 전환 순서 실측 (판정 근거)

- `.github/workflows/deploy-api.yml`: build → **Cloud Run Job `o4o-api-migrations`(`dist/migrate.js`) 실행** → 성공 시에만 `gcloud run deploy o4o-core-api`. API 기동은 migration 을 실행하지 않는다.
- 즉 migration 이 끝난 뒤 새 revision 이 뜰 때까지 **old revision 이 옛 물리명으로 요청을 받는 창**이 존재한다 → **direct rename 금지** · **expand → deploy → contract** 채택.
- 배포 창 alias 를 `RENAME` 후 옛 이름의 **auto-updatable VIEW** 2개로 두면 old revision 의 SELECT/INSERT/UPDATE/DELETE 가 그대로 통과한다(격리 PG 에서 DML 4종 + cascade 검증).

---

## 2. Phase 1 — expand (commit `a319edbd6`)

### 2-1. migration `1789523426775-RetireLegacyPartnerPhysicalSchemaAndRenameSellerRecruitment`

| 단계 | 내용 |
|---|---|
| ① 사전 단언 | DROP 대상 11 테이블 `COUNT(*)=0` · active partner role 0 · inactive partner role ≤ 3 · 3 컬럼 non-null 0 — 하나라도 위반 시 throw(트랜잭션 rollback) |
| ② DROP TABLE 11 | child → parent 순 (`neture.neture_partners` 마지막) |
| ③ DROP TYPE 3 | `neture_partnership_status_enum` · `neture_contract_status_enum` · `neture_contract_terminated_by_enum` (테이블 DROP 후 고아) |
| ④ DROP COLUMN 3 | `checkout_orders."partnerId"` · `store_products.is_partner_recruiting` · `neture.neture_products.partner_id` |
| ⑤ DELETE | `role_assignments` inactive partner role 3행 (`RETURNING id` 건수 = 사전 count 일치 단언) |
| ⑥ RENAME | enum 3 → `seller_recruitment_status_enum` · `_exposure_status_enum` · `seller_recruitment_application_status_enum` · 테이블 → `seller_recruitments` · `seller_recruitment_applications` · 컬럼 `partner_id → applicant_id` · `partner_name → applicant_name` · PK/UQ/FK/IDX 명 정리 (값 · 데이터 불변) |
| ⑦ TEMP_COMPAT VIEW 2 | `neture_partner_recruitments` · `neture_partner_applications`(`applicant_* AS partner_*`) — old revision 호환 · `COMMENT ON VIEW` 로 Phase 2 DROP 예고 |
| `down()` | VIEW DROP · rename 역순 · 컬럼 3 재추가(+index). 삭제 테이블 · enum · role row 는 **복원하지 않는다**(가짜 데이터 복원 금지 — 주석 명시) |

### 2-2. 코드 · dependency

- `SellerRecruitment.entity.ts` · `SellerRecruitmentApplication.entity.ts` — 새 물리명 · `applicant_id` · `applicant_name` 매핑 · seam 주석 정리
- `seller-recruitment.service.ts` — raw SQL 7곳 새 컬럼명
- `packages/market-trial` — `selectedSellerIds` 매핑 · DTO · 파싱 제거(컬럼 DROP 은 Phase 2)
- `packages/partner-core`(33 files) · `packages/financial-core`(5 files) `git rm -r` · `package.json` `build:partner-packages` 제거 · `pnpm-lock.yaml` importer 2 제거(`pnpm install` 재생성 · `--frozen-lockfile` PASS)
- 보호 spec 6종 갱신(partner-core/financial-core "존재" 계약 → "부재" 계약 · manifest 12→11 · REMOVED_PACKAGES/DIRS 추가)
- `expected-schema-states.ts` 항목 추가: `d145d68a68ceeb41a46a913ee08fdc1075fc25e44687a774af6e7d317999b33c` (5713 lines · 격리 PG 15.17 산출) · `manifest.ts` append

### 2-3. 프로덕션 실행 (Deploy API run 35048074116 · 2026-09-16T02:34Z)

```text
CLASSIFICATION = LEGACY_ESTABLISHED (typeorm_migrations 678 rows · anchors 5/5)
INCREMENTAL_PENDING = 1 → INCREMENTAL_EXECUTED = 1 (RetireLegacyPartnerPhysicalSchemaAndRenameSellerRecruitment1789523426775)
LIVE_FINGERPRINT = d145d68a… (5713 lines) == EXPECTED → POST_MIGRATION_SCHEMA_ASSERTION = PASS · MIGRATION_JOB = SUCCESS
Cloud Run: o4o-core-api-03676-tvk 100% traffic
```

프로덕션 read-only 재검증(migration 후): DROP 테이블 11 부재 · 옛 recruitment 테이블 부재 · 새 테이블 2 존재 · enum 3 부재 · `seller_recruitment_*_enum` 3 존재 · 컬럼 3 부재 · `applicant_id/applicant_name` 존재 · partner role row 0 · compat VIEW 2 존재 · 제약/인덱스 새 이름 9개 · `typeorm_migrations` 679행(새 이름 기록) · `foreign_visitor_partner*` 3 테이블 불변.

### 2-4. Seller Recruitment 프로덕션 smoke (새 revision · read-only)

| endpoint | 결과 |
|---|---|
| `GET /neture/seller-recruitment/recruitments` (공개 browse) | 200 |
| `GET /neture/seller-recruitment/recruitments/mine` (공급자) | 200 |
| `GET /neture/seller-recruitment/applications/mine` (공급자) | 200 |
| `GET /neture/operator/recruitment-exposure` · `?status=pending` (운영자) | 200 · 200 |
| alias `GET /neture/partner/recruitments` · `/recruitments/mine` · `/applications/mine` | 200 (Phase 2 전 마지막 확인) |

alias 트래픽(Cloud Run request log · 14h): 마지막 organic 요청 **2026-09-15T13:52Z** (web 배포 이전) · 그 이후 = 본 smoke 4건뿐 → **alias 제거 조건 4가지 모두 충족**(web ≥ runtime-retirement commit 배포 · canonical 사용 · smoke OK · alias ≈ 0).

---

## 3. Phase 2 — contract

### 3-1. migration `1789525702200-DropSellerRecruitmentCompatViewsAndSelectedSellerIds`

| 단계 | 내용 |
|---|---|
| 사전 단언 | `market_trial_decisions."selectedSellerIds"` non-null 0 |
| DROP VIEW 2 | `neture_partner_applications` · `neture_partner_recruitments` (TEMP_COMPAT 종료) |
| DROP COLUMN 1 | `market_trial_decisions."selectedSellerIds"` |
| `down()` | 컬럼 재추가 · VIEW 2 재생성 (값 복원 없음 — 은퇴 후 항상 null) |
| expected state | `d0a8d491e188be39df38fa50b708eea6617a6f38e188d781f7c4c2455e0d8535` (5708 lines) |

### 3-2. 코드 · docs

- `neture.routes.ts` — `router.use('/partner', sellerRecruitmentRouter)` 제거 (canonical `/seller-recruitment` 만)
- `legacy-partner-runtime-retirement.spec.ts` — alias mount 부재 계약
- docs §9

---

## 4. 검증 (로컬 · 격리 PG 15.17)

| 항목 | Phase 1 | Phase 2 |
|---|---|---|
| fresh bootstrap + incremental (`migrate.ts`) | PASS (2 migration) | PASS (3 migration) |
| idempotent rerun (`INCREMENTAL_PENDING=0`) | PASS | PASS |
| `scripts/db/check-migration-contract.mjs` | 21/21 | 21/21 |
| compat VIEW DML(old revision shape · INSERT RETURNING / UPDATE / SELECT / DELETE cascade) | PASS | — (VIEW DROP) |
| `tsc --noEmit` (api-server · market-trial) | 0 / 0 | 0 |
| jest 은퇴/dead-package 보호 suite 7종 | 220/220 | 92/92 (3 suite) |
| jest migration suite 7종 | 104 pass · 4 skipped | — |
| 격리 PG classifier/bootstrap spec | 47/47 | — |
| `pnpm install --frozen-lockfile` | PASS | — |
| lint-ratchet | 저장소 내 타 세션 worktree(`.claude/worktrees/**`) 를 제외하면 0 error (CI 는 clean checkout) | 동일 |

---

## 5. 최종 Fresh Re-Census — `partner` 잔존 분류 (Phase 2 프로덕션 적용 후 실측)

| 분류 | 대상 |
|---|---|
| **HISTORICAL_ONLY** | migration 48 + 본 WO 2 · schema baseline 스냅샷 · historical manifest · 과거 CHECK/IR/WO · `docs/archive/**`(본 WO 로 이동한 2 문서 포함) · `typeorm_migrations` 행 |
| **KEEP_OTHER_DOMAIN** | `foreign_visitor_partners` · `foreign_visitor_partner_qr_codes` · `foreign_visitor_partner_qr_scan_events` (+ 컬럼 `partner_id` · `partner_type` · `partner_name`) · 문의 유형 enum · 콘텐츠 소유자 enum · `ContactVisibility.PARTNERS` · 협력사 로고 CMS 섹션 · 외부 Extension 개발사 가이드 · HFF "partner 성분" 데이터 |
| **ALLOWED_GENERIC_TERM** | `operator_notification_settings.notifications` json 의 `partnerApplication` 키(코드 무시 · 무해) · 주석의 "Legacy Partner 은퇴" 설명 · 예약 slug |
| **LEGACY_PARTNER_*** | **0** (runtime · schema · dependency · active doc) |

프로덕션 실측(Phase 2 후): `pg_tables` `%partner%` = `foreign_visitor_partner*` 3 · `pg_views` 0 · 컬럼 4(`foreign_visitor_*` 만) · `pg_type` enum/domain 0(composite 3 = 위 테이블 row type) · `pg_proc` 0 · `role_assignments` `%partner%` 0.

---

## 6. 하지 않은 것

- 다른 도메인 DDL · 대량 update · 과거 migration 수정 · `IF EXISTS` 남용 · 수동 프로덕션 migration — 없음.
- 미래 Partner 호환 계층 — 만들지 않음.
- 타 세션 미추적 `packages/partnerops/` · `partner-ai-builder/` · `cosmetics-partner-extension/` · `.claude/worktrees/**` — 불가침 유지.
- 기록물(과거 CHECK/IR/WO · archive) 안의 옛 경로 `docs/baseline/NETURE-PARTNER-CONTRACT-FREEZE-V1.md` 참조 8곳 — WO 의 "과거 CHECK/IR/WO 편집 금지" 를 우선하여 **그대로 둔다**(archive 규칙의 "경로 참조 수정" 은 현행 문서 3곳에만 적용). 옛 경로로 이동한 파일은 §9 표의 새 경로에 있다.

---

## 7. 운영 안전

- 프로덕션 DB 접근은 read-only SELECT(승인 채널) 만. UPDATE/DELETE/DDL 은 승인된 forward migration 을 CI/CD 가 실행.
- 문서 · 로그 · 커밋에 DB host · 계정값 · role row 식별자 미기록.
- expand → deploy → contract 로 Seller Recruitment 무중단(old revision 창 동안 VIEW 가 옛 이름 요청 처리).

---

## 8. 메모리 정정

기존 메모 "배포 migration 은 기동이 먼저" 는 **stale** — 현행 `deploy-api.yml` 은 migration Job → 성공 후 service deploy 순서다. (세션 메모리 갱신.)

---

## 9. 문서 정합

| 문서 | 조치 |
|---|---|
| `docs/baseline/NETURE-PARTNER-CONTRACT-FREEZE-V1.md` → [`docs/archive/obsolete/partner/`](../archive/obsolete/partner/NETURE-PARTNER-CONTRACT-FREEZE-V1.md) | `git mv` (OBSOLETE — 전제 소멸) · SUPERSEDED 헤더에 archive 이동일 추가 · 헤더 상대링크 2곳 수정 |
| `docs/architecture/SELLER-PARTNER-CONTRACT-ARCHITECTURE-V1.md` → [`docs/archive/obsolete/partner/`](../archive/obsolete/partner/SELLER-PARTNER-CONTRACT-ARCHITECTURE-V1.md) | `git mv` · 헤더 링크 1곳 수정 |
| [`CANONICAL-INDEX`](../CANONICAL-INDEX.md) F7 행 | 원문 링크 → archive 경로 · 물리 정리 완료 표기 (번호 재사용 없음) |
| `CLAUDE.md` §14 F7 | 원문 링크 → archive 경로 (§ · F 번호 순서 불변) |
| [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §7 · §9-1 | "물리 정리는 후속 WO" → 완료 · 링크 2곳 archive 경로 · Seller Recruitment 물리명 기재 |

`문서 정합: 발견 5건 / SUPERSEDED 표기 0건(기존 2건 유지) / 링크 수정 6건 / 별도 WO 제안 0건`

---

## 10. Git · Phase 2 실행

- path-specific stage · `check-staged-scope` · `git commit -- <paths>` 만 사용.
- Phase 1: `a319edbd6` (60 files · +292 / −6,069) — Deploy API 35048074116 SUCCESS · CI 35048074098 · CodeQL · AppStore Guard · Admin/Web deploy SUCCESS.
- Phase 2: `6d5cfcdcd` (13 files · 본 문서 포함) — Deploy API 35049043295 SUCCESS · CI 35049043336 SUCCESS · CodeQL 35049043259 SUCCESS.

### 10-1. Phase 2 프로덕션 실행 · 재검증 (2026-09-16T02:49Z)

```text
CLASSIFICATION = LEGACY_ESTABLISHED · CURRENT_INCREMENTAL_PREFIX = 2 / 3
INCREMENTAL_PENDING = 1 → INCREMENTAL_EXECUTED = 1 (DropSellerRecruitmentCompatViewsAndSelectedSellerIds1789525702200)
LIVE_FINGERPRINT = d0a8d491… (5708 lines) == EXPECTED → POST_MIGRATION_SCHEMA_ASSERTION = PASS · MIGRATION_JOB = SUCCESS
Cloud Run: o4o-core-api-03677-lzp 100% traffic · typeorm_migrations 680행
```

read-only 재검증: compat VIEW 0 · `market_trial_decisions."selectedSellerIds"` 부재 · `seller_recruitments` · `seller_recruitment_applications` 존재. smoke: `GET /neture/seller-recruitment/recruitments` 200 · `/recruitments/mine`(공급자) 200 · `/applications/mine`(공급자) 200 · `GET /neture/operator/recruitment-exposure`(운영자) 200 · alias `/neture/partner/*` **404** (TEMP_COMPAT_ALIAS = 0).

- SHA 기록 커밋: 후속 `docs(check)`.
