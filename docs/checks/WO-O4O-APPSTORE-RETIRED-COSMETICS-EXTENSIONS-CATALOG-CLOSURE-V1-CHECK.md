# WO-O4O-APPSTORE-RETIRED-COSMETICS-EXTENSIONS-CATALOG-CLOSURE-V1 — CHECK

- **작성일**: 2026-08-21
- **대상**: `cosmetics-supplier-extension` · `cosmetics-sample-display-extension`
- **판정**: 둘 다 `RETIRED_EXTENSION` · 설치 소비처 0 → **카탈로그 항목 제거**
- **UNKNOWN**: 0 · **중지 조건 발동**: 없음

---

## 1. App Store 전체 구조 (§3)

| 계층 | 실체 |
|---|---|
| 카탈로그 SSOT | `apps/api-server/src/app-manifests/appsCatalog.ts` — 하드코딩 `APPS_CATALOG` (작업 전 **19 항목**) |
| 서비스 | `apps/api-server/src/services/AppStoreService.ts` |
| 모듈 로더 | `apps/api-server/src/modules/module-loader.ts` — `packages/**/manifest.ts` 스캔 |
| 라우트 | `apps/api-server/src/routes/appstore.routes.ts` — `GET /` · `GET /modules` · `GET /:appId` · `POST /install` · `POST /activate` · `POST /deactivate` · `DELETE /uninstall` |
| 마운트 | `register-routes.ts:238` `/api/v1/appstore` (**인증 가드 없음** — 이번 WO 범위 밖, 후속 후보) |
| 영속화 | `app_registry` 테이블 (`appId` + `status` 만 보유. serviceKey/organizationId/구독 컬럼 없음) |
| manifest 레지스트리 | `app-manifests/index.ts` 의 `manifestRegistry` 는 **비어 있음**(Phase R1) → `loadLocalManifest()` 항상 throw |

카탈로그 항목 필드: `appId` · `name` · `version` · `description` · `category` · `tags` · `type` · `status?` · `dependencies` · `author` · `serviceGroups`.
설치 가능 노출 = 카탈로그 존재 + `serviceGroups` 매칭. 별도 `installable` 플래그는 없다.

## 2. 대상 2개 판정 (§4)

| 확인 항목 | `cosmetics-supplier-extension` | `cosmetics-sample-display-extension` |
|---|---|---|
| git-tracked source (`git ls-files packages/<name>`) | **0** | **0** |
| workspace package / `package.json` | 없음 | 없음 |
| `manifest.ts` | 없음 | 없음 |
| 마운트된 runtime route | 없음 (`register-routes.ts` 주석만) | 없음 (`/api/v1/cosmetics-sample` 미마운트) |
| entity / migration | 없음 | 없음 |
| admin/operator/web consumer | `apps/admin-dashboard/src/pages/cosmetics-supplier/` 7파일이 **어디에도 라우팅되지 않음**(폴더 밖 참조 0) | `apps/admin-dashboard/src/pages/cosmetics-sample/` 동일하게 라우팅 0 |
| build/deploy consumer | 직전 WO(`4e276a183`)에서 no-op CI step 제거 완료 | 동일 |
| production `app_registry` row | **0** | **0** |
| 소스 삭제 시점 | commit `2d5be046b` | commit `2d5be046b` |
| **판정** | `RETIRED_EXTENSION` | `RETIRED_EXTENSION` |

구조 대조: 카탈로그 19 항목 vs `packages/**/manifest.ts` tracked 17개 → **manifest 없는 항목이 정확히 이 2개**였다.

§13 중지 조건 점검: 실제 설치 사용자 0 / remote install 계약 없음(카탈로그는 로컬 하드코딩, 원격 레지스트리·다운로드 경로 없음) / ownership 명확(O4O Platform) / 다른 기능 alias 아님(admin 페이지군 전부 미라우팅) / DB installation 부재 / UNKNOWN 0 / active 확장과 계약 공유 없음. → **발동 없음.**

## 3. 살아 있는 cosmetics 확장 대조 (§5)

| | `cosmetics-seller-extension` (ACTIVE) | 제거 대상 2개 |
|---|---|---|
| git-tracked 파일 | **39** | 0 |
| `package.json` · `src/manifest.ts` | 있음 | 없음 |
| `apps/api-server` 의존 | `workspace:*` | 없음 |
| 카탈로그 `status` | `active` | 없음(기본) |
| 역할 | 매장 **판매원** 운영(진열·샘플·재고·상담·KPI) — 매장 실행 주체 | supplier=브랜드(공급사) 가격정책·승인·캠페인 / sample-display=Seller↔Supplier 연결 운영 모듈 |

역할 차이가 분명하며 계약을 공유하지 않는다. `cosmetics-seller-extension` 은 **미변경**.

> 참고: `packages/cosmetics-seller-extension/src/frontend/pages/{SampleManagement,DisplayManagement}.tsx` 가 삭제된 확장의 API(`/api/v1/cosmetics-sample/*`)를 호출하는 주석·코드를 갖고 있으나, 해당 패키지 프론트엔드를 import 하는 앱이 없어 렌더되지 않는다. 패키지 내부 문제이므로 이번 WO 범위 밖 — 후속 후보로 기록.

## 4. 설치 경로와 거짓 성공 여부 (§6)

```
카탈로그 항목 → POST /api/v1/appstore/install
  → isInCatalog(appId)            ... 통과(제거 전)
  → moduleLoader.loadAll()        ... packages/**/manifest.ts 스캔
  → moduleLoader.getModule(appId) ... undefined
  → throw 'Failed to load app ... package not found in workspace'
  → 라우트 catch → HTTP 500
```

- **거짓 성공 없음** — DB row 생성 없음, 기능 활성화 없음. 항상 500 실패.
- 다만 **`GET /api/v1/appstore/{retired-id}` 가 200** 을 반환했다(존재하지 않는 id 는 404). 즉 "판매·설치 가능한 앱처럼 보이는" 거짓 계약이 목록·상세 양쪽에 있었다. 이것이 이번 WO 가 제거한 대상이다.

## 5. Production / DB 현황 (§7) — read-only SELECT

| 확인 | 결과 |
|---|---|
| `app_registry` row 수 | 6 (`annualfee-yaksa` · `digital-signage` · `digital-signage-core` · `membership-yaksa` · `partnerops` · `reporting-yaksa`) |
| 대상 2개 포함 여부 | **0건** |
| `app_instances` | 0 rows |
| `app_usage_logs` | 0 rows |
| `apps` | 1 row (무관한 AI integration) |
| **판정** | **`NOT_INSTALLED`** — historical 기록도 없음 |

→ **migration 불필요**, 기존 installation 처리 불필요. (선례 `20270219000000-RemoveLegacyCosmeticsPartnerAppRegistry.ts` 와 달리 삭제할 row 자체가 없다.)

배포 전 프로덕션 baseline: `GET /api/v1/appstore` → 200, **19 apps**, 전부 `not_installed`, 대상 2개 노출됨. 상세 200/200, `cosmetics-seller-extension` 200, 없는 id 404.

## 6. 실제 변경 내역 (§8)

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/app-manifests/appsCatalog.ts` | 대상 2개 카탈로그 항목 **삭제**(25줄) + WO 사유 주석 블록 추가. `serviceGroup id 'sellerops'/'supplierops'` 주석을 실제 소비처(sellerops=`cosmetics-seller-extension`·`market-trial` / supplierops=`market-trial`)로 정정 |
| `apps/api-server/src/bootstrap/register-routes.ts` | "Still disabled (Phase R2)" 목록에서 18·19번(삭제된 두 패키지)을 **dead metadata 로 정정**. 17번(`cosmetics-seller-extension`)은 패키지 실재하므로 유지 |
| `apps/api-server/tests/multi-tenant/appstore.spec.ts` | 아래 §7 |

DB 변경 0 / migration 0 / entity 0 / active 확장 0 변경.

## 7. 테스트 정합 (§9)

숫자 맞추기가 아니라 **계약 검증으로 전환**했다. 테스트 개수 24 유지, skip·삭제 0.

| 위치 | 이전 | 이후 |
|---|---|---|
| cosmetics 카탈로그 | `toContain('cosmetics-supplier-extension')` | `toContain('forum-cosmetics')` + retired 2개 `not.toContain` |
| supplierops 카탈로그 | `toContain('cosmetics-supplier-extension')` | `toContain('market-trial')` + retired `not.toContain` |
| cosmetics 추천 | `toContain('cosmetics-sample-display-extension')` | `toContain('forum-cosmetics')` + retired `not.toContain` |
| cosmetics vs yaksa 격리 | sample-display 기준 | `forum-cosmetics` 기준(cosmetics 전용) + retired `not.toContain` |
| 설치 가능 판정 | `canInstallApp('cosmetics-sample-display-extension','cosmetics') === true` | `forum-cosmetics` 로 대체 + retired 2개가 `{canInstall:false, reason:'App not found in catalog'}` 임을 **명시 검증** |
| cross-service 차단 | sample-display 기준 | `forum-cosmetics` 기준 |

대체 앱 선정 근거: `forum-cosmetics` 는 `serviceGroups: ['cosmetics']` 로 cosmetics 전용(yaksa 미포함)이라 격리 검증에 적합. `market-trial` 은 제거 후 `supplierops` 를 갖는 **유일한** 잔존 항목이다. 테스트가 쓰는 `getRecommendedApps` 는 `tests/multi-tenant/setup.ts:76` 의 **테스트 로컬 헬퍼**(의존성 필터 없음)이므로 대체가 성립한다.

installable count 정합: spec 에 하드코딩된 카탈로그 개수 단언은 없다(`toBeGreaterThan` 형태만). 실제 개수는 19 → **17**.

## 8. 잔존 참조 재검색 (§10)

| 참조 | 분류 |
|---|---|
| `appsCatalog.ts` · `register-routes.ts` · `appstore.spec.ts` 의 신규 WO 주석/`not.toContain` | `ACTIVE_RECORD` (의도된 제거 근거·회귀 방지) |
| `app-manifests/index.ts:15` · `disabled-apps.registry.ts:29-30` · `database/entities.ts:553` | `COMMENT_RECORD` (Phase R1 이력 주석, 동작 없음) |
| `docs/archive/**` 4개 문서 · `docs/checks/**` 3개 문서 | `HISTORICAL_DOC` (기록물 — CLAUDE.md §16-1 상 정비 대상 아님) |
| `packages/cosmetics-seller-extension/src/frontend/pages/{SampleManagement,DisplayManagement}.tsx` | `HISTORICAL_DOC`/orphan — 소비 앱 0, 렌더 경로 없음. 패키지 내부 정리는 별도 WO |
| `apps/main-site/src/pages/seller/dashboard/sellerDashboard.api.ts` | orphan — main-site 는 `858787430` 에서 Cloud Run 폐기됨. 폐기 트랙 잔재 |
| `apps/admin-dashboard/src/pages/{cosmetics-sample,cosmetics-supplier}/` | orphan — 라우팅 0. alias 아님 |
| `docs/services/cosmetics/service-definition.md:52-53` | 낡은 서비스 정의(같은 목록에 `dropshipping-core`·`dropshipping-cosmetics`·`cosmetics-partner-extension` 등 이미 제거된 항목 다수) → **별도 WO 제안** |

**`DEAD_REFERENCE`(제거된 확장을 설치 가능/마운트 가능한 것으로 취급하는 살아 있는 runtime·config 참조) = 0.**

## 9. 검증 (§11)

| 항목 | 결과 |
|---|---|
| `tests/multi-tenant/appstore.spec.ts` | **24 passed** |
| `tests/multi-tenant` 전체 | **75 passed / 4 files** |
| api-server typecheck (`tsc --noEmit`) | **exit 0** |
| api-server build | **exit 0** |
| admin/web build | 해당 없음 — 프론트엔드 파일 변경 0 |
| 실제 App Store API (배포 전) | 목록 200/19 · 상세 200 · 미존재 id 404 (baseline) |

## 10. Production 검증 (§12)

배포: `Deploy API Server (Cloud Run)` run `32439872493` **success** · `AppStore Guard` run `32439872316` **success** (commit `8d33e36cd`).

| 항목 | 결과 |
|---|---|
| `GET /api/v1/appstore` | 200 · **17 apps** (배포 전 19) |
| retired 2개 목록 노출 | **0** |
| retired 2개 상세 `GET /api/v1/appstore/{id}` | **404** (배포 전 200 → 거짓 계약 해소) |
| `cosmetics-seller-extension` | 목록 포함 · 상세 200 (회귀 없음) |
| 대체 검증 앱 `market-trial` · `forum-cosmetics` | 둘 다 목록 포함 · 상세 200 |
| `POST /install` (retired) | `App cosmetics-supplier-extension not found in catalog` — **카탈로그 게이트에서 차단**. 이전에는 `package not found in workspace`(모듈 로더 단계)였다 |
| `/health` | 200 |
| `/health/database` | `healthy` · pingMs 3 · version 15.17 |
| Cloud Run 신규 ERROR | **1건 = 위 검증용 install 요청 자체**. 그 외 신규 ERROR **0** |

> 미해결(범위 밖): `POST /install` 실패 응답이 여전히 **HTTP 500** 이다. 이는 `appstore.routes.ts` 가 모든 예외를 500 으로 매핑하는 기존 동작이며 이번 변경으로 생긴 신규 5xx 가 아니다(배포 전에도 500). 400/404 매핑은 후속 후보로 남긴다.

## 11. Git

- commit: `8d33e36cd` (코드+테스트+CHECK) · `(본 갱신 커밋)` (§10 배포 후 결과 기재)
- push: main

## 12. 문서 정합

`문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건`
— `docs/services/cosmetics/service-definition.md` 의 Apps 목록이 다수의 제거된 앱을 유지 중(§8). 이번 WO 대상 2개만 지우면 문서가 여전히 틀리므로 인라인 수정하지 않고 별도 WO 로 제안한다 (CLAUDE.md §16-2 · §16-4).

## 13. 후속 후보

1. `/api/v1/appstore` 라우터 **인증 가드 부재** — 설치/제거 API 가 무인증 노출.
2. `docs/services/cosmetics/service-definition.md` 전면 갱신 (제거된 앱 5종 이상).
3. `packages/cosmetics-seller-extension` 프론트엔드 페이지의 미마운트 API 호출 정리.
4. `apps/admin-dashboard/src/pages/{cosmetics-sample,cosmetics-supplier}/` 미라우팅 페이지군 처리.
5. `apps/main-site` 소스 잔존 여부 판단(Cloud Run 은 이미 폐기).
6. `POST /api/v1/appstore/install` 의 실패 응답 상태코드 매핑(카탈로그 부재 → 400/404).
