# CHECK-O4O-KPA-OPERATOR-TABLET-SCREEN-SET-STANDARD-LIST-V1

> WO: `WO-O4O-KPA-OPERATOR-TABLET-SCREEN-SET-STANDARD-LIST-V1`  
> Date: 2026-07-25  
> Result: **PASS (브라우저 상호작용 smoke 제외 — 연결 브라우저 없음)**

## 1. 구현 결과

- KPA 전용 `GET /api/v1/kpa/operator/screen-sets`에 서버 페이지네이션을 추가했다.
  - query: `page`, `limit`
  - 기존 `success`, `data` 유지
  - additive metadata: `page`, `limit`, `total`, `totalPages`
  - 기본값 `page=1`, `limit=20`, 최대 `limit=100`
  - 서버 SQL에서 `COUNT(*)`, `LIMIT`, `OFFSET`을 수행하며 프론트 전체 로딩 후 자르기는 없다.
- 기존 scope를 유지했다.
  - `origin='operator'`
  - `service_key='kpa'`
  - `deleted_at IS NULL`
  - 기존 정렬 `updated_at DESC` 유지, 동률 안정 정렬 `id DESC` 추가
- KPA 운영자 목록을 수동 `<table>`에서 표준 `DataTable` + `Pagination`으로 전환했다.
- 단건 `수정`, `목록에서 제거`를 `RowActionMenu`에 연결했다.
  - 제거는 표준 확인 dialog를 사용한다.
  - 기존 상세/수정 builder, preview API, soft-delete API를 그대로 재사용한다.
- 로딩, 오류/재시도, 빈 상태, 페이지 이동과 마지막 페이지 제거 후 페이지 보정을 반영했다.
- 안전한 일괄 액션이 없으므로 selection과 `ActionBar`는 도입하지 않았다.

## 2. 변경 파일

- `apps/api-server/src/routes/o4o-store/controllers/operator-screen-set.controller.ts`
- `services/web-kpa-society/src/api/operatorTabletScreenSets.ts`
- `services/web-kpa-society/src/pages/operator/tablet/OperatorTabletScreenSetsPage.tsx`
- 본 CHECK 문서

변경하지 않은 영역:

- DB table / entity / migration
- route mount와 권한 guard
- 운영자 원본 상태 정책과 HUB 노출 조건
- 매장·공급자 Screen Set API/UI
- 코너 적용, QR, 공개 태블렛 runtime
- package/lockfile/build infrastructure

## 3. 검증

### 로컬

| 검증 | 결과 |
|---|---|
| `pnpm --filter @o4o/api-server build` | PASS |
| `pnpm --filter @o4o/web-kpa-society build` | PASS (`tsc && vite build`) |
| 대상 파일 `git diff --check` | PASS |
| 전체 API `pnpm --filter @o4o/api-server type-check` | 기존 범위 밖 `src/scripts` 의약품/HFF 오류로 FAIL. 대상 controller 오류 없음 |

기존 typecheck 오류 파일 예:

- `drug-otc-apply-pilot-b01ac06-dryrun.ts`
- `drug-otc-description-promotion-dryrun.ts`
- `drug-otc-nutrition-combo-membership-persist.ts`
- `drug-otc-track-a-3h-config-gen.ts`
- `hff-nutrient-generate.ts`
- `hff-shard0-remainder-census.ts`
- `hff-vd-generate.ts`

본 WO에서 기존 스크립트는 수정하지 않았다. API 배포용 `tsconfig.build.json` 빌드는 통과했다.

### 배포

- 코드 commit: `e8c17edb3dc7779f9098384ec6a778133a5c7cf9`
- GitHub CI Pipeline: PASS
- CodeQL Security Analysis: PASS
- Deploy Web Services: PASS
  - KPA web revision: `kpa-society-web-01696-pxn`
  - traffic: 100%
- Deploy API Server: PASS
  - API revision: `o4o-core-api-02875-v2g`
  - traffic: 100%

### 운영 smoke

운영 API: `https://api.neture.co.kr`

| 항목 | 결과 |
|---|---|
| KPA operator 로그인 | 200 / success |
| `GET .../screen-sets?page=1&limit=2` | `page=1`, `limit=2`, `total=0`, `totalPages=0`, `data=[]` |
| `GET .../screen-sets?page=2&limit=2` | `page=2`, `limit=2`, 동일 `total=0` |
| 잘못된 범위 `page=0&limit=999` | `page=1`, `limit=100`으로 보정 |
| 비인증 목록 호출 | 401 |
| `POST .../screen-sets/preview` (빈 blocks, read-only) | 200, `mode='screen_set'` |
| 존재하지 않는 상세 ID | 404 |
| KPA web `/operator/tablet/screen-sets` | HTTP 200 HTML |

운영 원본 데이터가 0건이므로 실제 행 수정/제거와 2페이지 데이터 교집합은 운영 데이터 write 없이 검증할 수 없었다. 빌드와 코드 경로로 기존 상세·수정·preview·soft-delete 연결을 확인했다. 인앱 브라우저가 연결되어 있지 않아 `DataTable`, kebab menu, dialog의 실제 클릭 smoke는 수행하지 못했다.

## 4. 상태 및 후속

- 기존 dirty/untracked 파일은 보존했고 수정·stage하지 않았다.
  - `docs/investigations/CHECK-CODEX-ENV-SETUP-V1.md`
  - `.codex/`
  - `apps/api-server/_msm.mjs`
  - `apps/api-server/_msmx.mjs`
  - `apps/api-server/src/scripts/otc-remaining-full-corpus-census.ts`
- 코드 commit은 push 완료했다.
- 본 CHECK 외 staged 파일 없음.
- 후속 일괄 액션: **불필요**. 현재 상태 정책상 안전한 공통 일괄 전이가 없으며 억지로 `ActionBar`를 추가하지 않는 것이 표준에 부합한다.
- 선택 가능한 운영자 원본 데이터가 생기고 브라우저가 연결된 시점에 행 메뉴/수정/제거 UI 클릭 smoke를 재실행할 수 있다.
