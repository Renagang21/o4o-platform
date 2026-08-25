# CHECK-O4O-CMS-CHANNELS-COMPLETED-BRANCHES-MAIN-INTEGRATION-V1

WO: `WO-O4O-CMS-CHANNELS-COMPLETED-BRANCHES-MAIN-INTEGRATION-V1`

목적: 이미 PASS 로 끝난 두 브랜치(CMS alias SSOT 잔여 정리 / channels serviceKey canonical 정렬)를
최신 main 에 **의미 보존** 방식으로 통합하고, 충돌 해소 → 전체 회귀 → main push → 배포 →
production read-only smoke 까지 한 번에 닫는다. 신규 기능 0, schema/migration 0, production DB write 0.

---

## 1. 통합 시작 기준 (§3)

| 항목 | 값 |
|---|---|
| 통합 시작 시점 `origin/main` | `3df7eec2c` refactor(apps): App 관리 축 canonical 고정 + runtime residue retire |
| integration branch | `work/cms-channels-completed-branches-main-integration-v1` (worktree `C:\tmp\o4o-integration`) |
| 브랜치 A (CMS) tip | `2f02530f6` refactor(cms): serviceKey alias 잔여 리터럴을 security-core SSOT 로 수렴한다 |
| 브랜치 A 선행 commit | `0795c6922` fix(api): CMS mutation 인가를 role 축으로 접어 KPA/KCos 403 을 닫는다 |
| 브랜치 B tip | `b58e44005` fix(channels): serviceKey 를 canonical SSOT 로 정렬해 CMS slot 고립을 없앤다 |
| A merged? | `git merge-base --is-ancestor 2f02530f6 origin/main` → **NOT_MERGED** |
| B merged? | `git merge-base --is-ancestor b58e44005 origin/main` → **NOT_MERGED** |
| 다른 세션 WIP | 기존 worktree 2개(`o4o-cms-kpa-mutation`, `o4o-channels-servicekey`) 모두 clean. 수정·삭제·stash **하지 않음** |

**A 는 1 commit 이 아니라 2 commit 이었다.** WO §5 는 "완료 브랜치"를 통합하라고 했고, A 의 tip 만
cherry-pick 하면 그 부모(`0795c6922` — CMS mutation 인가 정리 +
`canonicalizeCmsServiceKey` / `isSameCmsService` helper 추가)가 main 에 없어 tip 이 참조하는 helper 와
CHECK 문서가 붕 뜬다. 실제로 tip 단독 cherry-pick 시
`docs/checks/CHECK-O4O-CMS-KPA-MUTATION-SERVICEKEY-CANONICALIZATION-V1.md` 가 modify/delete conflict
로 떴다 — 그 문서를 만든 commit 이 부모였기 때문이다. §18 의 "KPA mutation smoke" 항목도 이 부모
commit 의 변경을 대상으로 하므로 같은 결론이다. 따라서 A 는 **브랜치 전체(2 commit)** 를 순서대로 통합했다.

## 2. main 의 제3 변경과의 충돌 여부 (§21)

`eb2c4db7f` 이후 main 신규 4 commit(`3df7eec2c`, `508bb9e7d`, `c98d95644`, `88fda710c`)이 건드린
파일 집합과 A/B 파일 집합의 교집합 = **∅** (app-manager / apps 축 + docs 만 변경).
→ "main 의 제3 변경이 동일 hunk 를 선점" 중지 조건 **비해당**.

## 3. 통합 순서와 결과 (§5·§6)

완료 commit 단위, 브랜치 순서 A → B:

| 순서 | 원본 | 통합 후 | 결과 |
|---|---|---|---|
| 1 | `0795c6922` | `002619b91` | conflict 0 — 5 files, +542/−11 |
| 2 | `2f02530f6` | `ee4b39f40` | conflict 0 — 14 files, +720/−55 |
| 3 | `b58e44005` | `e1fb25e2d` | conflict 2 files(수동 해소) — 9 files, +916/−14 |

의미 없는 재포맷 / unrelated line churn 0. `git add .` 미사용 — 충돌 파일만 path-specific stage.

## 4. 충돌 해소 기록 (§19)

### 4-1. `apps/admin-dashboard/src/pages/cms/channels/ChannelFormModal.tsx`
### 4-2. `apps/admin-dashboard/src/pages/cms/channels/ChannelList.tsx`

| 항목 | 내용 |
|---|---|
| 원인 | 두 브랜치가 같은 `const SERVICES = [...]` 블록을 서로 다른 방식으로 고쳤다(textual overlap). |
| A 의 의미 | 6개 CMS 화면이 각자 복제하던 서비스 목록을 `pages/cms/cmsServiceCatalog.ts` 한 벌로 모으고, KPA 항목을 role prefix(`kpa`) → canonical(`kpa-society`) 로 교정. 화면별로 다른 "전체" 문구만 `cmsServiceOptionsWithAll(label)` 로 주입. |
| B 의 의미 | channel 화면이 서버로 보내는 `value` 는 canonical ledger key 여야 한다(`kpa-society`). 화면 내 배열의 KPA 값만 교정. |
| 최종 선택 | **A 의 카탈로그 SSOT 호출** 채택 — `cmsServiceOptionsWithAll('Global (All Services)')`(FormModal) / `cmsServiceOptionsWithAll('All Services')`(List). 그 위에 두 WO 를 함께 명시하는 주석을 남겼다. |
| 두 계약이 모두 보존되는 이유 | 카탈로그의 값 집합과 순서가 B 의 배열과 **완전히 동일**(`glycopharm`, `kpa-society`, `neture`, `k-cosmetics`)하고, 화면별 "전체" label 도 각각 그대로다. 즉 B 의 canonical-value 계약은 값 그대로 살아 있고, A 의 "화면별 복제 금지" 계약도 살아 있다. B 의 배열을 그대로 두면 A 의 SSOT(§12)가 깨지고, A 만 두고 B 를 "버렸다"고 기록하면 B 의 의도가 사라진다 — 실제로는 둘 다 만족하는 상위 집합이 존재했다. PharmacyHub 는 추가하지 않았다(§7: 카탈로그 4항목 유지). frontend 로컬 canonicalization/alias mapping 도 추가하지 않았다(§8). |

### 4-3. `apps/api-server/src/__tests__/channels-servicekey-canonical-scope.spec.ts` (충돌 파생 조정)

| 항목 | 내용 |
|---|---|
| 원인 | conflict 자체는 아니지만, B 의 static contract 테스트가 "channel 화면 **소스 파일**에 `value: 'kpa-society'` 리터럴이 있어야 한다"고 단정했다. 4-1/4-2 해소로 그 리터럴은 카탈로그 한 곳으로 이동했으므로 위치 기준 단정이 사실과 어긋난다. |
| 최종 선택 | 단정을 **약화하지 않고 위치만 SSOT 로 옮겼다**: (a) 카탈로그 파일에 `value: 'kpa-society'` 존재 + `value: 'kpa'` / `value: 'cosmetics'` 부재, (b) 두 channel 화면은 `cmsServiceOptionsWithAll(` 를 `../cmsServiceCatalog` 에서 import 해 **소비만** 하고 자기 목록 리터럴(`value: 'kpa-society'` 포함)을 갖지 않을 것. |
| 강도 | 오히려 강해졌다 — 이전 단정은 화면이 목록을 다시 복제해도 통과했지만, 지금은 복제가 곧 실패다(§12 를 테스트가 지킨다). |
| 음성 대조(negative control) | `ChannelList.tsx` 의 카탈로그 호출을 로컬 배열(`value: 'kpa-society'` 포함)로 되돌리면 해당 테스트가 **실패**(1 failed / 32 skipped)함을 실측한 뒤 원복(tree clean). |

## 5. 두 브랜치 내용 손실 0 증명 (§6 "어느 한쪽을 통째로 덮어쓰지 않는다")

A/B 가 건드린 **모든 파일**에 대해 통합 HEAD 와 원본 브랜치 tip 을 파일 단위로 diff 했다:

| 대상 | 원본과 다른 파일 |
|---|---|
| A(`2f02530f6`) 14 파일 | `ChannelFormModal.tsx`, `ChannelList.tsx` (= 4-1/4-2) |
| B(`b58e44005`) 9 파일 | `ChannelFormModal.tsx`, `ChannelList.tsx`, `channels-servicekey-canonical-scope.spec.ts` (= 4-1/4-2/4-3) |

그 외 A 12 파일 / B 6 파일은 **원본과 byte 단위로 동일**. 차이는 위에 기록한 3건뿐이다.

## 6. 계약 보존 실측 (§9·§10·§11·§12)

| 검사 | 결과 |
|---|---|
| §10 B slot linkage `IN` 보존 | `channels.routes.ts:567` `(slot.serviceKey IN (:...serviceKeys) OR slot.serviceKey IS NULL)` 존재 |
| B canonical write 보존 | `channels.routes.ts:274`(create) / `:384`(update) `resolveCanonicalServiceKey(String(serviceKey))` |
| B alias read 보존 | `channels.routes.ts` + `admin/channel-{ops,heartbeat,playback-logs}.routes.ts` 4 파일에 `resolveCmsServiceKeys` 참조 11 회 |
| A helper 보존 | `cms-content-utils.ts` exports `resolveCmsServiceKeys` / `canonicalizeCmsServiceKey` / `resolveCmsRolePrefix` / `isSameCmsService` |
| §9 로컬 alias 배열 부활 | A/B 가 건드린 파일에 `['kpa-society','kpa']` 류 배열 **0**. 그 밖에 main 에 이미 있던 3 파일(`modules/asset-snapshot/resolvers/kpa-asset.resolver.ts`, `routes/kpa/controllers/kpa-checkout.controller.ts`, `routes/kpa/controllers/operator-summary.controller.ts`)은 이번 통합으로 **한 줄도 바뀌지 않음**(`git diff origin/main HEAD -- <path>` 공집합) → 선행 잔여 부채(§12-1) |
| §12 admin catalog 단일 SSOT | `cmsServiceCatalog.ts` 1 벌 + 소비 화면 6개(contents 2 / slots 2 / channels 2). 복제 배열 0 |
| §7 PharmacyHub 신규 추가 | 없음 |
| §8 frontend 로컬 canonicalization | 없음 (`if (service === 'kpa')` 류 0) |

## 7. 회귀 결과 (§13·§14·§15) — skip/완화 0

| 항목 | 결과 |
|---|---|
| 통합 핵심 3 spec | `channels-servicekey-canonical-scope` + `cms-servicekey-alias-ssot-closure` + `cms-content-mutation-service-scope` → **3 suites / 95 tests / 0 fail** |
| api-server 전체 Jest | **191 suites / 3175 tests / 0 fail / 0 skip** |
| api-server `tsc --noEmit` | **0 error** |
| admin-dashboard `tsc --noEmit` | **0 error** |
| admin-dashboard production build | **성공** (`✓ built in 2m 11s`, postbuild 포함) |
| web-kpa-society `tsc --noEmit` | **0 error** |
| web-kpa-society production build | **성공** (`✓ built in 40.42s`) |
| workspace packages build | 46 pass / **1 fail = `@o4o/financial-core`** (`tsup`: "No input files") |
| CI Pipeline (GitHub Actions, `e1fb25e2d`) | **success** |
| CodeQL Security Analysis | **success** |

`@o4o/financial-core` 는 main 에 이미 존재하는 **빈 패키지**이고 이번 통합이 건드린 파일이 아니다
(선행 main baseline 실패, 직전 WO 에서도 동일하게 기록됨). 이 한 건 때문에 테스트를 skip 하거나
기준을 완화하지 않았다.

직전 channels 단독 브랜치의 `188 suites / 3051 tests` → `191 / 3175` 증가분은 A 의 spec 2개
(`cms-content-mutation-service-scope` 272 lines, `cms-servicekey-alias-ssot-closure` 315 lines)가 합류한 결과다.

## 8. main push / 배포 (§16)

| 항목 | 값 |
|---|---|
| push | `git push origin HEAD:main` → `3df7eec2c..e1fb25e2d` (force 없음, fast-forward) |
| main 최종 3 commit | `002619b91` → `ee4b39f40` → `e1fb25e2d` |
| Deploy API Server (Cloud Run) | **success** (`e1fb25e2d`) |
| Deploy Admin Dashboard (Cloud Run) | **success** (`e1fb25e2d`) |
| Deploy Web Services (Cloud Run) | **success** (`e1fb25e2d`) |

### 8-1. API revision 이 두 핵심 변경을 포함하는지 (§16)

| 항목 | 값 |
|---|---|
| Cloud Run 서비스 | `o4o-core-api` (asia-northeast3) |
| 서빙 revision | `o4o-core-api-03461-djt` (created 2026-08-25T07:22:05Z) |
| image digest | `sha256:2bcf0fa8caadaa00e73b2e7d8c5a12d807c710c1d3e0b6d4d048e9009c1d5a7d` |
| 그 digest 의 태그 | **`e1fb25e2d67b387aa6951430e69344197ce2550b`** + `latest` |
| 판정 | 서빙 이미지가 통합 HEAD commit 으로 태깅돼 있다 = A 2 commit + B 1 commit 전부 포함 |
| runtime 확인 | `/api/health` → `status: alive`, `database: healthy`, uptime 558s(새 revision) |

## 9. Production read-only smoke (§17) — write 0

### 9-1. DB (Cloud SQL Auth Proxy 127.0.0.1:5462, `o4o_api`, SELECT 전용)

| 질의 | 결과 | 의미 |
|---|---|---|
| `select count(*) from channels` | **0** | channels 는 여전히 0행 → 이번 변경으로 어긋날 운영 행 없음 |
| `cms_content_slots` serviceKey 분포 | `kpa-society` 28 / `kpa` 1 / `glycopharm` 1 | legacy alias slot 이 실제로 1행 존재 |
| `slotKey='intranet-hero'` 분포 | `kpa` 1행 (canonical 0행) | 문제의 legacy slot |
| 구 semantics 재현 `slotKey='intranet-hero' AND "serviceKey"='kpa-society'` | **0 rows** | canonical channel 이 legacy slot 을 놓쳤다(고립) |
| 신 semantics 재현 `slotKey='intranet-hero' AND ("serviceKey" IN ('kpa-society','kpa') OR "serviceKey" IS NULL)` | **1 row** | 통합된 계약이 같은 서비스를 하나로 인식 |
| `cms_contents` serviceKey 분포 | `glycopharm` 66 / `kpa-society` 53 / `neture` 6 / `kpa` 1 / `pharmacy-hub` 1 | alias 집합 read 가 필요한 근거(legacy `kpa` 1행) |

### 9-2. HTTP (`https://api.neture.co.kr`, GET only)

| 요청 | 결과 | 기대 |
|---|---|---|
| `GET /api/v1/cms/contents?limit=1` (serviceKey 없음) | **400 `SERVICE_KEY_REQUIRED`** | 일치 |
| `GET /api/v1/cms/contents?serviceKey=kpa-society&limit=1` | **200**, 첫 행 `e0000000-…-021` | 일치 |
| `GET /api/v1/cms/contents?serviceKey=kpa&limit=1` (alias) | **200**, **동일한 첫 행** | alias/canonical 동일 모집단 확인 |
| `GET /api/v1/cms/contents/e0000000-…-021?serviceKey=kpa-society` | **200** | 일치 |
| `GET /api/v1/cms/contents/e0000000-…-021?serviceKey=glycopharm` | **404 `NOT_FOUND`** | 타 서비스 격리 확인 |
| `GET /api/v1/channels` | **500 `No metadata for "Channel" was found.`** | ⚠ 아래 9-3 |
| `GET /api/v1/channels?serviceKey=kpa` | 동일 500 | ⚠ 아래 9-3 |
| `GET /api/v1/channels?serviceKey=kpa-society` | 동일 500 | ⚠ 아래 9-3 |

### 9-3. channels HTTP 500 은 이번 통합과 무관한 **선행 결함**이다

- 원인: `apps/api-server/src/database/entities.ts` 의 DataSource entity 목록에 cms-core `Channel` /
  `ChannelPlaybackLog` / `ChannelHeartbeat` 가 **등록되어 있지 않다**. 등록된 cms-core entity 는
  `CmsContent`, `CmsContentSlot`, `CmsMedia*` 뿐이다. 따라서 요청은 DB 에 닿기 전에
  TypeORM metadata 단계에서 실패한다.
- 이번 통합과의 관계: `git diff 3df7eec2c HEAD -- apps/api-server/src/database/entities.ts` = **공집합**.
  즉 통합 전 main 에서도 동일하게 500 이었고, 이 통합이 만든 회귀가 아니다.
  (channels 가 0행인 이유도 이것으로 설명된다 — 애초에 생성 경로가 열려 있지 않았다.)
- 조치: **보고만 한다.** entity 등록은 두 브랜치 어디에도 없는 신규 변경이고, 등록하면 그 순간
  channels 엔드포인트 전체가 운영에 노출되므로 §2("신규 기능 추가 금지")·§20 범위 밖이다.
  §17 의 "channels 0행 empty 정상"은 9-1 의 DB 질의(0행)와 191/3175 회귀로 대신 확인했다.

## 10. KPA operator mutation smoke (§18)

| 시도 | 결과 |
|---|---|
| `POST /api/v1/cms/contents` (no auth) | **401** — DB 도달 전 차단, write 0 |
| `POST /api/v1/cms/contents` (invalid bearer) | **401 `INVALID_TOKEN`** |
| `POST /api/v1/channels` (no auth) | **401** |
| KPA operator 실계정 토큰으로 mutation | **불가** — Secret Manager 에 smoke/test 계정 credential 이 존재하지 않는다(`cafe24-client-id`, `cafe24-client-secret`, `o4o-api-db-password`, `o4o-db-password`, `o4o-encryption-key` 뿐). 운영 사용자 비밀번호·토큰을 만들어내는 것은 §2(production DB write 0)와도 충돌한다. |

판정: **`DEPLOYED_BUT_AUTH_SMOKE_BLOCKED`**
인가 경로(`kpa:operator` 가 KPA CMS mutation 을 수행)의 실계정 검증만 미완이며, 해당 계약은
`cms-content-mutation-service-scope.spec.ts`(272 lines) + `cms-servicekey-alias-ssot-closure.spec.ts`
로 코드 수준에서 검증돼 있다. WO §18 에 따라 이 한 항목 때문에 통합을 되돌리지 않는다.

## 11. DB / schema 영향

- migration 파일 추가·수정 **0**
- entity 구조 변경 **0** (`Channel.entity.ts` 는 주석만)
- production write **0** (전 구간 SELECT / GET, mutation 은 401 에서 차단)
- Cloud SQL proxy 세션·임시 password 파일은 검증 후 정리

## 12. 잔여 부채 (이번 WO 범위 밖, §20)

1. `asset-snapshot/resolvers/kpa-asset.resolver.ts`, `kpa/controllers/kpa-checkout.controller.ts`,
   `kpa/controllers/operator-summary.controller.ts` 의 로컬 `['kpa-society','kpa']` 배열 — main 선행 잔여.
   `resolveCmsServiceKeys` 로 수렴 가능하나 CMS 경계 밖이라 이번 통합에서 건드리지 않았다.
2. **cms-core `Channel` / `ChannelPlaybackLog` / `ChannelHeartbeat` 가 api-server DataSource 에 미등록**
   → channels 엔드포인트 전체가 운영에서 500 (§9-3). 별도 WO 로 처리해야 한다.
3. channels 에는 서비스 단위 인가가 없다(read `optionalAuth` 공개 / write platform admin 전용).
   service-scoped RBAC 도입은 §20 범위 밖.
4. slot `KNOWN_PREFIXES` 및 admin catalog 에 pharmacy-hub 부재 — 의도적 유지(§7·§20).
5. legacy `kpa` slot 1행 / content 1행의 canonical 이관은 data migration 이 필요 → 범위 밖.
   현재는 read 시 alias 집합으로 함께 잡힌다.
6. `@o4o/financial-core` 빈 패키지 build 실패(main baseline).

## 13. §21 중지 조건 점검

| 조건 | 판정 |
|---|---|
| 두 브랜치가 서로 다른 제품 계약을 요구 | 비해당 — 같은 canonical 값 집합, 상위 집합 존재 |
| 한쪽을 살리면 다른 쪽 핵심 테스트가 깨짐 | 비해당 — 95/95, 3175/3175 pass |
| main 의 제3 변경이 동일 hunk 선점 | 비해당 (§2) |
| schema/migration 필요 | 비해당 |
| production data write 필요 | 비해당 |
| 다른 세션 WIP 직접 충돌 | 비해당 — 두 worktree clean, 미변경 |
| 단순 textual conflict | 2건 — 중지 조건 아님. 의미 기준 수동 해소(§4) |

## 14. 최종 판정

**PASS (with `DEPLOYED_BUT_AUTH_SMOKE_BLOCKED` on §18)**

- 두 완료 브랜치 3 commit 이 최신 main 에 의미 보존 통합 → `e1fb25e2d`
- 충돌 2 파일 + 파생 1 파일만 수동 조정, 나머지 18 파일은 원본과 동일
- 회귀 191 suites / 3175 tests / 0 fail, typecheck 3/3 clean, production build 2/2 성공
- main push → API/Admin/Web 배포 success, 서빙 image 가 통합 commit 으로 태깅됨
- production read-only smoke 로 alias/canonical 동일 모집단과 legacy slot 포착(0행 → 1행) 확인
- production write 0, schema/migration 0
