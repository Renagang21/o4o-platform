# CHECK-O4O-GLUCOSEVIEW-FULL-LEGACY-REMOVAL-V1

> **WO**: `WO-O4O-GLUCOSEVIEW-FULL-LEGACY-REMOVAL-V1` — 종료된 GlucoseView 서비스의 전 계층 잔재 제거
> **판정**: ✅ **PASS**
> **작성일**: 2026-08-05
> **선행**: [`CHECK-O4O-GLUCOSEVIEW-SERVICE-KEY-RETIREMENT-V1.md`](CHECK-O4O-GLUCOSEVIEW-SERVICE-KEY-RETIREMENT-V1.md)

---

## 0. 결론 요약

| 항목 | 결과 |
|------|------|
| 운영 DB row (typeorm_migrations 제외) | **0** — DB write 0건 |
| 실행 코드의 GlucoseView service key 참조 | **1** (의도적 유지 — §4) |
| 삭제한 dead 스크립트 / 산출물 | 4 스크립트 + 7 스크린샷 + results.json 1 entry |
| 제거한 dead 환경변수 | 3 (`CGM_PROVIDER`, `CARE_MULTI_METRIC`, `CARE_ANALYSIS_PROVIDER`) |
| 제거한 가짜 공급자 항목 | 2 (`supplier: 'GlucoseView'` static/fallback item) |
| 정리한 주석·값목록 | 30 single-line + 20 block/값목록 |
| typecheck / test / build | PASS |
| 중지 조건 해당 | **없음** |

---

## 1. 운영 DB 재-census (read-only)

`cloud-sql-proxy` → `netureyoutube:asia-northeast3:o4o-platform-db`, user `o4o_api`, db `o4o_platform`.
자격증명은 런타임에 Cloud Run env 에서 추출해 scratchpad `.pgpass` 로만 사용했고 저장소·문서·커밋에 기록하지 않았다.

### 1-1. 전 테이블 row 스캔

`pg_class` (relkind='r', size < 60MB) 기준 **282 테이블**에 대해
`to_jsonb(x)::text ilike '%glucose%'` 로 동적 UNION 스캔.

| 테이블 | 매칭 row | 분류 |
|--------|:--------:|------|
| `typeorm_migrations` | 9 | **HISTORY_RETAIN** |
| 그 외 281 테이블 | **0** | — |

`typeorm_migrations` 9행 (실행 완료된 이력 — 삭제 금지):

- `CreateGlucoseViewTables1735566000000`
- `UpdateGlucoseViewTestAccountPasswords1737100000000`
- `ActivateGlucoseViewTestAccounts1737100100000`
- `UpdateGlucoseViewTestAccountPasswords1737400100000`
- `CreateGlucoseViewCustomersTable20260222300000`
- `AddOrganizationIdToGlucoseViewCustomers20260222400000`
- `AddUserIdToGlucoseviewCustomers20260326300000`
- `RemoveGlucoseViewFromFeatured20260404200000`
- `DropGlucoseviewAndCgmTables20260600000000`

### 1-2. 스키마 오브젝트 스캔

`pg_class` / `pg_enum` / `pg_type` / `pg_constraint` / `pg_proc` (prokind='f') / `pg_trigger` (not tgisinternal) /
`pg_get_viewdef` / `information_schema.columns` (1,636 text·varchar·json 계열 컬럼) 전수 조회.

| 오브젝트 | 매칭 |
|----------|:----:|
| table / view / matview / index | 0 |
| enum label / composite type | 0 |
| CHECK 제약 정의 | 0 |
| function 본문 / trigger | 0 |
| 컬럼명 | 0 |

→ **DB write 0건**. 선행 WO 에서 삭제한 6행 외 추가 변경 불필요.

---

## 2. 참조 분류

### 2-1. DELETE — 실행 코드 / dead 자산

| 대상 | 근거 |
|------|------|
| `scripts/care-e2e-operation-test-v2.mjs` | `/glucoseview/customers` 호출 — 테이블 DROP 완료로 100% 실패 |
| `scripts/care-data-accumulation-test.{sh,py,mjs}` | 동일 |
| `e2e/screenshots/GlucoseView-01~07-*.png` | 폐지 서비스 E2E 산출물 |
| `e2e/screenshots/results.json` 의 `GlucoseView` entry | 동일 (잔여 services = Neture / GlycoPharm / KPA-a / K-Cosmetics) |
| `.github/workflows/deploy-api.yml` 의 `CGM_PROVIDER`, `CARE_MULTI_METRIC` | 코드 소비처 **0** — 제거가 동작 중립 |
| `apps/api-server/deploy-cloudrun.sh` 의 동일 2건 | 동일 |
| `apps/api-server/.env.apiserver.example` 의 `# === Care 모듈 (CGM 분석) ===` 블록 | `CGM_PROVIDER` / `CARE_ANALYSIS_PROVIDER` 소비처 0 |
| `public.controller.ts` 의 `staticNowRunning` 2번 항목 | `supplier: 'GlucoseView'` — 폐지 서비스를 광고하는 가짜 공급자 (§3) |
| `services/web-glycopharm/src/api/public.ts` 의 `fallbackNowRunning` 동일 항목 | 동일 |
| `SETUP.md` / `QUICK-START.md` 의 `Glucoseview Web` Cloud Run URL 행 | 존재하지 않는 서비스 URL 을 현행 온보딩 문서가 안내 |
| tombstone 주석 30건 (28 파일) + block 주석 20건 | 현재 기능과 무관한 폐지 안내 주석 |

### 2-2. REPLACE — 값 치환

| 대상 | 치환 |
|------|------|
| `__tests__/security/cross-service.spec.ts` (3곳) | `'glucoseview:admin'` → `'nonexistent-service:admin'` (선행 WO 에서 완료, 본 WO 는 주석만 정리) |
| `__tests__/kpa-role-guard.spec.ts` | 동일 |
| 값 목록 주석 15개 파일 | `'glucoseview'` 토큰만 제거 (`service-scope-guard.ts`, `CmsContent.entity.ts`, `Channel.entity.ts`, `service-scopes.ts`, `OperatorNotificationSettings.ts`, `PartnerTarget/Event/Content.ts`, `ServiceMembership.ts`, `cms-content-query.handler.ts`, `approval-service-keys.ts`, `offer.service.ts`, `scope-assignment.utils.ts`) |

### 2-3. HISTORY_RETAIN — 이력 보존

- `typeorm_migrations` 9행 및 `apps/api-server/src/database/migrations/**` 의 실행 완료 마이그레이션 파일
- `docs/**` 의 과거 WO·IR·CHECK·RBAC 감사 문서
- `services/web-glycopharm/UX-TRUST-RULES-V1.md` (과거 WO 확산 대상 목록)
- `docs/archive/investigations/IR-O4O-OVERSIZED-FILE-AUDIT-PHASE2-NEXT-PICK-V1.md` (과거 감사 스냅샷)

### 2-4. UNRELATED_RETAIN — 동명이인

| 대상 | 사유 |
|------|------|
| `ContextAssetListPage.tsx:88-89` (`guide-glucose.jpg`, `/content/glucose-guide-2026`) | 혈당 콘텐츠 — 서비스 키 아님 |
| `services.routes.tsx:47` (`Pharmacy Blood Glucose Products`) | GlycoPharm 제품 설명 |
| `PharmacyServicePage.tsx:58` (`/info/glucose-program`) | KPA 혈당 프로그램 안내 |
| HFF / OTC 스크립트·데이터의 `glucose*` (glucosamine 등) | 의약품 성분명 |
| `pharmacy-ai-insight` / 일반 health check / GlycoPharm CGM 상품 기능 | WO 명시 유지 대상 |

---

## 3. `supplier: 'GlucoseView'` 판정

WO 지시대로 자동 유지하지 않고 실제 의미를 확인했다.

- 위치: GlycoPharm Home `now-running` 목록의 **정적 데이터** 1건 (백엔드) + 동일 항목의 **프런트 fallback** 1건.
- 내용: `type: 'event'`, `title: '혈당관리 앱 연동 이벤트'`, `supplier: 'GlucoseView'`, `deadline: '2026.02.15'`.
- 판정: 실재하지 않는 공급자명으로, **종료된 GlucoseView 서비스 연동을 광고하는 항목**이다. 문자열만 바꾸면 존재하지 않는 이벤트가 남으므로 **항목 전체를 제거**했다.
- 영향: `now-running` 목록이 3건 → 2건(백엔드) / 2건 → 1건(fallback). 나머지 항목(Trial / 당뇨인의 날 캠페인)은 그대로.

---

## 4. `offer.service.ts` 방어 필터 — 의도적 유지

```ts
const filteredServiceKeys = (data.serviceKeys || []).filter((k) => k !== 'neture' && k !== 'glucoseview');
```

WO 의 특별 확인 항목에 따라 재검토했다.

- **allowlist 검증 부재 확인**: `modules/neture` 전역에서 `serviceKeys` 를 `platform_services` 등 등록 서비스 목록으로 검증하는 경로는 없다. `service_audience_policies` 는 규제 상품의 약국 대상 여부만 판정하며 미등록 키를 거르지 않는다.
- **제거 시 결과**: API 로 직접 전달된 `'glucoseview'` 가 `service_keys` 에 그대로 저장되고, `deriveDistributionType(isPublic, serviceKeys)` 이 `serviceKeys.length > 0` 이라는 이유로 해당 offer 를 **SERVICE 유통으로 뒤집는다**. 즉 제거가 허용 범위를 **넓힌다**.
- **승인 범위와 무관**: 승인 대상은 `APPROVAL_ELIGIBLE_SERVICE_KEYS` / `filterApprovalEligibleServiceKeys()` 가 별도 통제한다. 본 필터를 유지해도 승인 정책은 완화되지 않는다.

→ **유지**. 단 tombstone 주석은 제거하고, 왜 이 두 값이 입력 단계에서 걸러지는지만 설명하는 주석으로 교체했다.

> 후속 여지: `serviceKeys` 를 등록 서비스 allowlist 로 검증하는 구조가 도입되면 본 blacklist 는 삭제 가능하다. 본 WO 범위 밖.

---

## 5. 특별 확인 항목 대조

| 항목 | 결과 |
|------|------|
| `rbac-catalog.ts` | 선행 WO 에서 제거 완료 · 본 WO 에서 tombstone 주석 정리 |
| `useOperatorPolicy.ts` | 동일 |
| `PointBudgetPage.tsx` | 선행 WO 제거 완료 · 잔여 참조 0 |
| CMS slot scope mapping (`cms-content-slot.handler.ts`) | 제거 완료 |
| campaign `ALLOWED_SERVICES` | 5 → 4 |
| `offer.service.ts` 방어 필터 | §4 — 유지 |
| `PartnerApplication` 의 `GlucoseView` | `ServiceInterest` union 에서 제거 완료 (`partner_applications` 테이블 운영 DB 부재) |
| debug controller | `user-debug.controller.ts` / `approval-test.controller.ts` / `pharmacy-debug.controller.ts` 정리 완료 |
| security 음성 대조 테스트 | `nonexistent-service:admin` 치환 · 51 tests PASS |
| `CGM_PROVIDER` 환경변수 | 소비처 0 → deploy 설정 3곳에서 제거 |
| `cpt.init.ts` 및 glucoseview schema 등록 | **참조 0** — 등록된 적 없음 (`ds_*` 와 무관) |
| shortcode / main-site / signage 의 오래된 API URL | glucoseview 관련 **0건** |
| `scripts/*glucose*` · `scripts/*settlement*` · bootstrap seed | care-* 4건 삭제 후 **0건** |
| Cloud Run · GitHub Actions 환경변수 | `deploy-api.yml` 정리 완료 · glucoseview 전용 workflow·서비스 디렉터리 없음 |

---

## 6. 전역 재검색 (최종)

정규식 `(?i)glucose[-_ ]?view` — `dist` / `build` / `node_modules` / `migrations` 제외.

| 영역 | 잔여 |
|------|:----:|
| 실행 코드 (`.ts`/`.tsx`/`.js`/`.mjs`) | **2 줄** — `offer.service.ts:1030` 주석 + `:1033` 필터 (§4 의도적 유지) |
| 설정 (`.yml`/`.json`/`.sh`/`.env*`) | **0** |
| 현행 온보딩 문서 (`SETUP.md`, `QUICK-START.md`) | **0** |
| 이력 문서 (`docs/**`, 과거 IR/WO/CHECK) | HISTORY_RETAIN |

---

## 7. 검증

| 검증 | 결과 |
|------|------|
| `tsc -p apps/api-server/tsconfig.build.json --noEmit` | PASS (0 error) |
| `pnpm type-check:frontend` | PASS (main-site / admin-dashboard / web-kpa-society / forum-yaksa) |
| `tsc -p services/web-glycopharm --noEmit` | PASS |
| `jest cross-service.spec.ts kpa-role-guard.spec.ts --maxWorkers=1` | PASS (2 suites / 51 tests) |

---

## 8. 중지 조건 대조

| 중지 조건 | 해당 여부 |
|-----------|:--------:|
| 현재 운영 기능이 실제 GlucoseView key 를 소비 | ❌ — DB row 0, 소비 경로 0 |
| 보존해야 할 사용자·조직·업무 데이터 발견 | ❌ — `typeorm_migrations` 외 0 |
| 제거가 GlycoPharm CGM / `pharmacy-ai-insight` 기능 변경으로 확대 | ❌ — 두 영역 미접촉 |
| 병렬 세션 WIP 와 충돌 | ❌ — HFF·yaksa/reporting 트랙 파일 미접촉, pathspec 커밋 |

---

## 9. 원칙 준수

- DB write **0건** (read-only SELECT / information_schema 조회만)
- 신규 service key 생성 **0**
- 다른 서비스 enum·권한·필터 **미변경**
- 단순 문자열 일치가 아니라 실제 service key 의미만 제거 (§2-4 동명이인 5종 유지)
- 병렬 세션 WIP (`hff-zh-*`, `easy-drug-ko-full-rebuild-live/*`, yaksa/reporting 은퇴 트랙) **미접촉** — 명시 pathspec 커밋

---

*Version: 1.0*
*Status: CLOSED*
