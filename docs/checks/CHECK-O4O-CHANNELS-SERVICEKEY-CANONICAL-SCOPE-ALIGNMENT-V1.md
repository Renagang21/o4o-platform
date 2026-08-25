# CHECK-O4O-CHANNELS-SERVICEKEY-CANONICAL-SCOPE-ALIGNMENT-V1

`channels.serviceKey` 를 문자열 동등으로 다루던 경로를 security-core canonical SSOT 로 정렬한다.

- WO: `WO-O4O-CHANNELS-SERVICEKEY-CANONICAL-SCOPE-ALIGNMENT-V1`
- 기준: `origin/main` = `eb2c4db7f` (fresh worktree `/c/tmp/o4o-channels-servicekey`, branch `work/channels-servicekey-canonical-scope-alignment-v1`)
- 판정: **PASS** — 실동작 결함 1건(canonical 채널이 legacy slot 을 놓친다)을 프로덕션 데이터로 재현·수정했다.

---

## 1. 시작 기준 (§3)

```
git rev-parse origin/main            eb2c4db7f98c078eb1a3fb4178f3b6d06c478832
```

직전 CMS alias WO 계약의 main 반영 상태:

| 계약 | main 상태 |
|---|---|
| `resolveCmsServiceKeys` (cms-content-utils) | **있다** (`apps/api-server/src/routes/cms-content/cms-content-utils.ts:44`) |
| CMS read alias scope (`resolveCmsReadScope`) | **있다** |
| slot **operator** read alias scope | **있다** (`In(scope.serviceKeys)`) |
| slot **admin/filter** exact-match 제거 · slot canonical write | **없다** |
| admin CMS canonical catalog (`cmsServiceCatalog.ts`) | **없다** |
| `kpa.routes.ts` 로컬 alias 배열 제거 | **없다** (`KPA_SERVICE_KEYS = ['kpa-society','kpa']` 그대로) |

→ 직전 WO(`WO-O4O-CMS-SERVICEKEY-ALIAS-SSOT-RESIDUAL-CLOSURE-V1`, commit `2f02530f6`)는 **아직 main 에 병합되지 않았다**.
§3 지시대로 그 commit 을 기준 삼지 않고 **최신 main 구조**를 따랐다. 즉 이 WO 는 main 에 이미 있는
`resolveCmsServiceKeys` + `@o4o/security-core` resolver 만 재사용하며, 미병합 브랜치의 신규 모듈
(`cmsServiceCatalog.ts`, `canonicalizeCmsServiceKey`, `isSameCmsService`)에 의존하지 않는다.

---

## 2. Channels endpoint census (§4) — 미조사 0

`createChannelRoutes` 는 `apps/api-server/src/bootstrap/register-routes.ts:1034` 에서
`/api/v1/channels` 로 마운트된다. 엔티티는 `packages/cms-core/src/entities/Channel.entity.ts`
(`channels` 테이블, `slotKey` 로 `CmsContentSlot` 을 **느슨하게** 참조 — FK 없음).

| # | method/path | R/W | serviceKey 출처 | 저장/비교 | canonicalization (수정 전 → 후) | guard | CMS linkage | consumer |
|---|---|---|---|---|---|---|---|---|
| 1 | `GET /channels` | R | query | 비교 | 없음(`=`) → **alias 집합 `In`** | `optionalAuth` | – | admin `lib/channels.ts` |
| 2 | `GET /channels/code/:code` | R | – | – | 해당 없음 | `optionalAuth` | – | signage-player(미배포) |
| 3 | `GET /channels/:id` | R | – | – | 해당 없음 | `optionalAuth` | – | admin, signage-player |
| 4 | `POST /channels` | W | body | 저장 | 없음(입력 그대로) → **canonical 저장** | `requireAdmin` | – | admin `ChannelFormModal` |
| 5 | `PUT /channels/:id` | W | body | 저장 | 없음(입력 그대로) → **canonical 저장** | `requireAdmin` | – | admin `ChannelFormModal` |
| 6 | `PATCH /channels/:id/status` | W | – | – | 해당 없음(status 만) | `requireAdmin` | – | admin ops |
| 7 | `DELETE /channels/:id` | W | – | – | 해당 없음 | `requireAdmin` | – | admin |
| 8 | `GET /channels/:id/contents` | R | **row**(`channel.serviceKey`) | 비교(slot join) | 없음(`=`) → **alias 집합 `IN`** | `optionalAuth` | **핵심** | signage-player, admin preview |
| 9 | `POST /channels/:id/playback-log` | W | row → 로그 복제 | 저장(파생) | 채널 값 복제 — 채널이 canonical 이면 canonical | 없음(player 신뢰) | – | signage-player(미배포) |
| 10 | `POST /channels/:id/heartbeat` | W | row → 로그 복제 | 저장(파생) | 동일 | 없음 | – | signage-player(미배포) |
| 11 | `GET /channels/health` | R | – | – | 해당 없음 | 없음 | – | – |
| 12 | `GET /admin/channels/ops` | R | query | 비교 | 없음(`=`) → **alias 집합** | `authenticate+requireAdmin` | – | `ChannelOpsDashboard` |
| 13 | `GET /admin/channels/ops/:channelId` | R | – | – | 해당 없음 | 동일 | – | `ChannelDetailDrawer` |
| 14 | `GET /admin/channel-heartbeats` | R | query | 비교 | 없음 → **alias 집합** | 동일 | – | (직접 소비처 0) |
| 15 | `GET /admin/channel-heartbeats/status` | R | query | 비교 | 없음 → **alias 집합** | 동일 | – | (직접 소비처 0) |
| 16 | `GET /admin/channel-heartbeats/:channelId` | R | – | – | 해당 없음 | 동일 | – | – |
| 17 | `GET /admin/channel-playback-logs` | R | query | 비교 | 없음 → **alias 집합** | 동일 | – | (직접 소비처 0) |
| 18 | `GET /admin/channel-playback-logs/:id` | R | – | – | 해당 없음 | 동일 | – | – |
| 19 | `GET /admin/channel-playback-logs/stats/summary` | R | query | 비교(QB) | 없음(`log.serviceKey = :serviceKey`) → **`IN`** | 동일 | – | (직접 소비처 0) |

**동명이인 제외(범위 밖, 별도 business axis)** — 이름에 channel 이 들어가지만 CMS ledger 축이 아니다:
`organization_channels` / `organization_product_channels`(스토어 판매 채널), `external_channel_product_links`
(네이버 등 외부 판매처), `store-channel.service.ts`, `/o4o-store/**/channels`, `operator/stores.routes.ts:/channels`,
`signage_*` 테이블 계열(`/api/signage/:serviceKey/**`, 별도 라우트 패밀리). 이들은 `serviceKey` 를
CMS slot 과 join 하지 않는다 → 이번 WO 에서 미접촉.

---

## 3. Consumer census (§15)

| consumer | 경유 | serviceKey 전달값 | R/W | slot 연계 | reachable |
|---|---|---|---|---|---|
| admin-dashboard `src/lib/channels.ts` | `/channels` CRUD | 호출부에서 주입 | R+W | 간접(preview) | **예**(배포됨) |
| admin `pages/cms/channels/ChannelList.tsx` | list 필터 | `SERVICES` select → **수정 전 `'kpa'`** | R | – | 예 (`/admin/cms/channels`) |
| admin `pages/cms/channels/ChannelFormModal.tsx` | create/update | `SERVICES` select → **수정 전 `'kpa'`** | W | – | 예 |
| admin `pages/cms/channels/ChannelContentsPreview.tsx` | `/channels/:id/contents` | 없음(채널 row 사용) | R | **예** | 예 |
| admin `pages/channels/ops/ChannelOpsDashboard.tsx` | `/admin/channels/ops` | **자유 입력 text** | R | – | 예 (`/admin/cms/channels/ops`) |
| services/signage-player-web | `/channels/:id`, `/:id/contents`, playback-log, heartbeat | URL path 의 `:serviceKey` 는 **플레이어 라우팅용**(API 로 안 보냄) | R+W(log) | **예** | **아니오** — `deploy-web-services.yml` 에 없음(미배포) |
| KPA / KCos / GP / PH / Neture web | – | – | – | – | **소비 0** (`/api/v1/channels` 호출 없음) |
| shared packages (`store-ui-core`, `operator-core-ui`) | `/channels` 문자열은 **스토어 메뉴 subPath** | – | – | – | CMS channels API 소비 0 |

`ChannelOpsDashboard` 의 serviceKey 필터가 **자유 입력**이라는 점이 §9 invariant 가 실사용에서
중요한 이유다(운영자가 `kpa` 라고 칠 수 있다).

---

## 4. Production schema/data census (§5) — read-only

`channels` 스키마: `serviceKey varchar(50) NULL`(nullable = cross-service 허용),
index `idx_channels_scope(serviceKey, organizationId, status)` / `idx_channels_service(serviceKey) WHERE NOT NULL` /
`idx_channels_slot(slotKey, status)`. **serviceKey 에 unique/FK 없음**, `slotKey` 에도 FK 없음(설계상 loose coupling).
CHECK 제약은 orientation/status/type 3개.

```
channels                 0행   (serviceKey별/status별 그룹 결과 0행)
channel_playback_logs    0행
channel_heartbeats       0행

cms_content_slots   kpa-society 28 / kpa 1 / glycopharm 1
cms_contents        glycopharm 66 / kpa-society 53 / neture 6 / kpa 1 / pharmacy-hub 1
```

slot 의 `slotKey × serviceKey` 실측(핵심):

```
intranet-hero          kpa            org=NULL  active  1     ← legacy alias slot
home-hero              glycopharm     org=NULL  active  1
kpa-dashboard-banner   kpa-society    …                 4
kpa-dashboard-benefit  kpa-society    …                 5
kpa-main-benefit       kpa-society    …                 6
kpa-main-hero          kpa-society    …                 4
kpa-pharmacy-banner    kpa-society    …                 4
kpa-supplier-promo     kpa-society    …                 5
```

`intranet-hero` slot 은 **legacy `kpa` 로만 존재**한다. 과거 보고의 "channels 0행"은 재확인되었고,
연관 테이블 2개도 0행이다.

---

## 5. `channels.serviceKey` 의 의미 (§8) — 코드 근거

**CMS ledger service key** (= `cms_content_slots.serviceKey` 와 같은 축). 근거:

1. `Channel.entity.ts` 주석: *"Scope follows CMS pattern (organizationId + serviceKey)"*, *"References CmsContentSlot via slotKey"*.
2. `GET /channels/:id/contents` 가 `channel.serviceKey` 를 **slot.serviceKey 와 직접 비교**한다 (`channels.routes.ts` 구 555–557행). 같은 축이 아니면 이 비교 자체가 성립하지 않는다.
3. role scope 축이 아니다: channels 라우트에는 `requireKpaScope`/`:operator` 류 역할 판정이 **하나도 없다**. write 는 `requireAdmin`(platform admin) 단일 관문이다.
4. route mount key 도 아니다: 경로는 `/api/v1/channels` 고정이고 serviceKey 는 컬럼일 뿐이다.
5. ownership key 도 아니다: 소유 축은 `organizationId` 로 따로 있다.

→ 문자열 이름이 아니라 **slot 과의 비교 및 CMS scope 주석**이 축을 확정한다. §22 중지 조건
"별도 business axis" 는 **비해당**.

---

## 6. 문자열 동등 비교 목록 + 분류 (§6) — UNKNOWN 0

| # | 위치 | 패턴 | 분류 | 처리 |
|---|---|---|---|---|
| 1 | `channels.routes.ts` GET `/` | `where.serviceKey = serviceKey` | **ALIAS_UNSAFE** | `In(resolveCmsServiceKeys(...))` |
| 2 | `channels.routes.ts` POST `/` | `serviceKey: serviceKey \|\| null` (저장) | **ALIAS_UNSAFE** | `resolveCanonicalServiceKey` |
| 3 | `channels.routes.ts` PUT `/:id` | `channel.serviceKey = serviceKey` (저장) | **ALIAS_UNSAFE** | `resolveCanonicalServiceKey` |
| 4 | `channels.routes.ts` GET `/:id/contents` | `slot.serviceKey = :serviceKey OR IS NULL` | **ALIAS_UNSAFE** (실동작 결함) | `slot.serviceKey IN (:...serviceKeys) OR IS NULL` |
| 5 | `channels.routes.ts` playback-log | `serviceKey: channel.serviceKey` (복제) | **CANONICAL_SAFE**(파생) | 미변경 |
| 6 | `channels.routes.ts` heartbeat | `serviceKey: channel.serviceKey` (복제) | **CANONICAL_SAFE**(파생) | 미변경 |
| 7 | `channel-ops.routes.ts` GET `/` | `channelWhere.serviceKey = ...` | **ALIAS_UNSAFE** | alias 집합 |
| 8 | `channel-heartbeat.routes.ts` GET `/` | `where.serviceKey = ...` | **ALIAS_UNSAFE** | alias 집합 |
| 9 | `channel-heartbeat.routes.ts` GET `/status` | `channelWhere.serviceKey = ...` | **ALIAS_UNSAFE** | alias 집합 |
| 10 | `channel-playback-logs.routes.ts` GET `/` | `where.serviceKey = ...` | **ALIAS_UNSAFE** | alias 집합 |
| 11 | `channel-playback-logs.routes.ts` stats | `log.serviceKey = :serviceKey` | **ALIAS_UNSAFE** | `IN (:...serviceKeys)` |
| 12 | `Channel.entity.ts` 주석 예시 | `'glycopharm','kpa','neture','k-cosmetics'` (축 혼재 문서) | **DEAD**(문서) | canonical 예시로 정정 |
| 13 | admin `ChannelFormModal.tsx` / `ChannelList.tsx` | `{ value: 'kpa' }` | **ALIAS_UNSAFE**(UI → ledger 전송값) | `'kpa-society'` |
| 14 | `signage-player-web` URL 의 `:serviceKey` | 플레이어 라우팅 파라미터 | **ROUTE_KEY_ONLY** | 미변경 |
| 15 | `ChannelOpsDashboard` serviceKey 자유 입력 | UI 필터 문자열 | **ROLE_SCOPE_COMPARISON 아님 / 서버에서 해석** | 미변경(서버 수렴) |

`UNKNOWN = 0`.

---

## 7. Canonicalization 계약 (§7·§10)

새 mapping 을 만들지 않았다. main 에 이미 있는 것만 썼다.

- `resolveCanonicalServiceKey` (`@o4o/security-core`) — 저장값 수렴. canonical 입력에도 **멱등**
  (`ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY` 에 `kpa-society` 항목이 없어 fallback 자기 반환).
- `resolveCmsServiceKeys` (`routes/cms-content/cms-content-utils.ts`) — 읽기 alias 집합.
  security-core 양방향 resolver 합성 파생이며 CMS read 경계가 이미 쓰는 함수다.

```
kpa | kpa-society        → 저장 kpa-society   / 읽기 ['kpa-society','kpa']
cosmetics | k-cosmetics  → 저장 k-cosmetics   / 읽기 ['k-cosmetics','cosmetics']
neture | glycopharm | pharmacy-hub | platform → self-map, 집합 크기 1
serviceKey 없음/null      → null 유지 (cross-service 채널, 기존 계약)
```

§13 지시대로 **새 범용 alias SQL abstraction 을 만들지 않았다** — 기존 helper 를 `In()`/`IN (:...)` 에 그대로 넣었다.
§18 static test 로 `['kpa-society','kpa']` 류 로컬 배열/맵 재도입을 channels 4개 파일에 대해 금지했다.

---

## 8. Read / Write 결과 (§9·§10)

- read: `GET /channels?serviceKey=kpa` 와 `=kpa-society` 가 **같은 모집단**(canonical+legacy 채널 둘 다).
  타 서비스(glycopharm) 혼입 0. 필터는 **query 단계**(`In`)에서 적용 — 응답 후 JS filter 없음.
- write: `kpa→kpa-society`, `cosmetics→k-cosmetics`, canonical 입력은 그대로, 미지정은 `null` 유지.
  PUT 에서 `serviceKey: null` 로 cross-service 복귀도 가능(기존 동작 보존, 이제 `null` 명시 처리).
- role prefix 가 ledger 컬럼에 저장되는 경로는 남지 않았다(서버가 최종 관문이므로 UI 가 `'kpa'` 를
  보내도 canonical 로 저장된다).

---

## 9. CMS slot linkage (§12) — 이번 WO 의 실동작 결함

프로덕션 데이터로 재현(read-only SQL):

```sql
-- canonical KPA 채널(serviceKey='kpa-society', slotKey='intranet-hero', org=NULL) 가정
-- (수정 전) 문자열 동등
… WHERE s."slotKey"='intranet-hero' AND s."isActive" AND (s."serviceKey"='kpa-society' OR s."serviceKey" IS NULL) …
→ 0행

-- (수정 후) alias 집합
… AND (s."serviceKey" IN ('kpa-society','kpa') OR s."serviceKey" IS NULL) …
→ 1행  80b1df7f-5416-4064-8d01-9f550ffaca0a  intranet-hero  kpa  published
```

즉 **canonical KPA 채널은 화면에 아무것도 못 띄운다**(콘텐츠는 published 로 존재). 반대 방향도 같다:
legacy `kpa` 채널은 canonical slot 28건을 놓친다. 수정 후 alias 집합은 `kpa` 계열 slot **29건**(28+1)을
같은 서비스로 인식한다 — CMS read 경계와 동일한 해석이다. 고립되는 row 0.

`slot.serviceKey IS NULL`(글로벌 slot) 허용은 기존 계약이라 그대로 유지했다.

---

## 10. JOIN 정합 (§13)

`slotKey` 는 FK 가 아니고 조인 키는 `slotKey`(문자열) + scope 조건이다. **canonical 저장만으로는
부족하다** — legacy `kpa` slot 이 실제로 남아 있으므로 canonical 채널 쪽에서 alias 집합 조인이
필요하다(§9 의 1행/0행 차이가 그 증거). 반대로 `channel.serviceKey` 자체는 canonical 로만 저장하므로
채널 쪽에 dual-write 는 만들지 않았다.

---

## 11. Role / auth 정합 (§14)

- channels 라우트에는 서비스별 role guard 가 **원래 없다**: read = `optionalAuth`(공개),
  write = `requireAdmin`(platform admin). 이번 변경은 guard 를 건드리지 않았다.
- `${canonicalServiceKey}:operator` 류 문자열 조립은 **추가하지 않았고**, 기존에도 없다.
- 따라서 "KPA operator → KPA channel 만" 은 **현재 제품 계약이 아니다**. §1 의
  "가상의 제품 정책을 새로 만들지 않는다" 에 따라 service-scoped 권한을 새로 도입하지 않고
  잔존 부채로만 기록했다(§19-2). 테스트는 현 계약(비관리자 write 403)을 고정한다.
- CMS 쪽 role-prefix mapping(`kpa:operator` 등)은 이 WO 에서 손대지 않았다.

---

## 12. 기능 판정 (§16)

**LATENT_BUT_VALID**

- 운영 데이터 0행(channels/heartbeat/playback-log 전부) → 현재 트래픽 없음.
- 그러나 소비처는 0이 아니다: admin-dashboard 의 CMS Channels 화면과 Channel Ops 화면이
  `/admin/cms/channels`, `/admin/cms/channels/ops` 로 **실제 라우팅·배포되어 있다**.
- 참조 slot(`intranet-hero`, published content)이 존재하므로 채널 1행만 만들면 즉시 유의미하게 동작한다.
- `DEAD_LEGACY` 는 아니다(소비 UI 가 살아 있음). 대규모 삭제 확장도 하지 않았다.

---

## 13. 실제 수정 파일 (§13 보고항목)

```
apps/api-server/src/routes/channels/channels.routes.ts                 list/create/update/slot-join
apps/api-server/src/routes/admin/channel-ops.routes.ts                 serviceKey 필터
apps/api-server/src/routes/admin/channel-heartbeat.routes.ts           serviceKey 필터 ×2
apps/api-server/src/routes/admin/channel-playback-logs.routes.ts       serviceKey 필터 ×2
packages/cms-core/src/entities/Channel.entity.ts                       축 주석 정정(코드 동작 무변경)
apps/admin-dashboard/src/pages/cms/channels/ChannelFormModal.tsx       value 'kpa' → 'kpa-society'
apps/admin-dashboard/src/pages/cms/channels/ChannelList.tsx            value 'kpa' → 'kpa-society'
apps/api-server/src/__tests__/channels-servicekey-canonical-scope.spec.ts   신규 33 tests
docs/checks/CHECK-O4O-CHANNELS-SERVICEKEY-CANONICAL-SCOPE-ALIGNMENT-V1.md   본 문서
```

schema/migration 0. 새 helper·새 alias 배열 0.

---

## 14. 자동 테스트 (§17·§18)

`apps/api-server/src/__tests__/channels-servicekey-canonical-scope.spec.ts` — **33 tests, 전부 PASS**.
fixture 는 프로덕션 구조(legacy `kpa` slot `intranet-hero` + canonical slot + GP slot + 글로벌 slot)를 그대로 옮겼다.

- canonicalization 9: `kpa|kpa-society→kpa-society`, `cosmetics|k-cosmetics→k-cosmetics`,
  `neture|glycopharm|pharmacy-hub|platform` self-map, alias 집합 양방향 동일.
- read 4: alias/canonical 동일 모집단, 타 서비스 혼입 0, self-map 필터, serviceKey 미지정 전체.
- write 9: POST 5축 canonical 저장, 미지정 null, PUT alias→canonical, PUT null 복귀, 비관리자 403.
- slot linkage 4: **canonical 채널이 legacy `kpa` slot 을 놓치지 않음**, legacy 채널이 canonical slot 조회,
  쿼리 파라미터가 security-core 파생값과 일치, GP 채널에 KPA slot 혼입 0.
- static 7: channels 4개 파일에 로컬 alias 배열/맵 금지, `where.serviceKey = serviceKey` ·
  `slot.serviceKey = :serviceKey` 금지, admin 필터 alias 집합 사용, admin 화면 canonical value 만.

**음성 대조(negative control)**: slot join 만 예전 `=` 비교로 되돌리면
"canonical KPA 채널이 legacy kpa slot 을 놓치지 않는다" 가 **FAIL** 한다(1 failed / 32 skipped).
테스트가 결함을 실제로 판별한다는 확인 후 원복했다.

---

## 15. CMS 회귀 (§20)

api-server 전체 Jest 안에서 main 에 존재하는 CMS/serviceKey 계약 스위트가 함께 통과했다:
`cms-content-detail-service-scope.spec.ts`, `cms-content-slot-service-scope.spec.ts`,
`signage-servicekey-canonicalization.spec.ts`, `store-owner-backcompat-servicekey.spec.ts`,
`crossservice-identity-rbac-membership-closure.spec.ts` — CMS read 경계 / slot alias 호환 / canonical
serviceKey 계약 회귀 0.
(직전 WO 의 `cms-content-mutation-service-scope.spec.ts` · `cms-servicekey-alias-ssot-closure.spec.ts` 는
아직 main 에 없다 — §1 참조. 이 WO 는 `cms-content-utils.ts` 를 **변경하지 않았고**(import 만 추가)
CMS helper 시그니처 변화가 0이므로 그 브랜치의 계약에도 영향이 없다.)

---

## 16. 전체 검증 (§23)

| 항목 | 결과 |
|---|---|
| 신규 channels spec | **33/33 PASS** |
| api-server `tsc --noEmit` | **0 errors** |
| api-server 전체 Jest | **188 suites / 3051 tests, 0 fail** (699s) |
| `@o4o/security-core` build | PASS (`tsc --build`). 자체 Jest 스위트는 이 패키지에 **원래 없다** |
| `@o4o-apps/cms-core` build | PASS |
| workspace packages build | PASS (기존 실패 1건 `@o4o/financial-core`: `tsup` "No input files" — main 기준 선재 결함, 이 WO 무관) |
| admin-dashboard `tsc --noEmit` | **0 errors** |
| admin-dashboard production build | **PASS** (`✓ built in 4m 12s`) |

---

## 17. Production read-only 검증 (§19)

```
channels                                      0
channels WHERE serviceKey IN ('kpa-society','kpa')      0
channels WHERE serviceKey IN ('k-cosmetics','cosmetics') 0
cms_content_slots WHERE serviceKey IN ('kpa-society','kpa')  29
canonical KPA 채널 join 시뮬레이션: 신 semantics 1행 / 구 semantics 0행
```

channels 0행 → empty state 정상, SQL/에러 0. production fixture 생성하지 않았다.
쿼리는 전부 SELECT. **production DB write 0**.

---

## 18. DB / schema / write 영향 (§24)

- schema 변경 0, migration 0, 인덱스 변경 0.
- production write 0행.
- 앱 동작 변화는 **쿼리 semantics 뿐**: `=` → `IN(alias 집합)`, 저장 시 canonical 수렴.
  `idx_channels_service` / `idx_channels_scope` 는 `IN` 에도 그대로 쓰인다.

---

## 19. 잔존 부채

1. **channels service-scoped 권한 없음** — read 는 `optionalAuth` 로 전 서비스 채널이 공개되고,
   write 는 platform admin 단일 관문이다. "KPA operator 가 자기 서비스 채널만" 같은 계약은
   현재 존재하지 않는다. 데이터 0행이라 지금은 노출 피해가 없다. 제품 정책 결정 사항이므로
   §1(가상 정책 금지)에 따라 도입하지 않았다.
2. **`channels.code` 유니크 제약 없음** — `idx_channels_code` 는 비유니크 partial index 고,
   중복 검사(`DUPLICATE_CODE`)는 앱 레벨뿐이다. 동시 요청에서 중복 가능. schema 사안이라 미변경.
3. **`signage-player-web` 미배포** — `/channels/:id/contents`·playback-log·heartbeat 의 유일한
   런타임 소비처인데 배포 워크플로에 없다. 기능 판정이 LATENT 인 주된 이유.
   (`services/signage-player-web/src/api/channels.ts:83` 이 `GET /channels?code=` 를 호출하는데
   서버 list 는 `code` 필터를 지원하지 않는다 — serviceKey 축과 무관한 별개 결함, 미접촉.)
4. **legacy `kpa` slot/content 1쌍 잔존** — 직전 WO 에서 `SAFE_MIGRATE` 판정 후 승인 대기 중.
   이 WO 는 코드 호환으로 해결했고 migration 하지 않았다.
5. **직전 CMS WO(`2f02530f6`) 미병합** — main 의 slot admin 필터 exact-match, `kpa.routes.ts`
   로컬 alias 배열, admin CMS 카탈로그 중복은 그 브랜치에 있다. 두 브랜치가 `ChannelFormModal.tsx`
   / `ChannelList.tsx` 를 함께 건드리므로 병합 시 해당 hunk 충돌이 예상된다(양쪽 모두 canonical
   value 로 수렴하는 방향이라 해소는 자명하다). 이 WO 는 미병합 브랜치 모듈에 의존하지 않는다.
6. §21 제외 목록(slot `KNOWN_PREFIXES` pharmacy-hub 누락, admin CMS 카탈로그 pharmacy-hub 누락,
   GP dead `getContent`, platform+organizationId 정책, Resource category/tag, PH operator upload UI)은
   손대지 않았다.

---

## 20. 중지 조건 점검 (§22)

| 조건 | 판정 |
|---|---|
| channels.serviceKey 가 별도 business axis | **비해당** — CMS ledger key 확정(§5) |
| channel-slot 연계가 다른 계약 요구 | **비해당** — CMS alias 계약과 동일해야 정상 동작(§9) |
| alias 처리에 schema migration 필요 | **비해당** — 쿼리 semantics 만으로 해결 |
| 운영 legacy channel 데이터 발견 | **비해당** — channels 0행 |
| security-core resolver 로 표현 불가 | **비해당** — 기존 resolver 로 전부 표현 |
| 다른 세션 WIP 직접 충돌 | **비해당**(자기 브랜치와의 예상 병합 충돌만 §19-5 에 기록) |
