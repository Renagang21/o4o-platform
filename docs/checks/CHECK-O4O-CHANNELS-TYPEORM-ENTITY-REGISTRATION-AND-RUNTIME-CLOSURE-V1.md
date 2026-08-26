# CHECK-O4O-CHANNELS-TYPEORM-ENTITY-REGISTRATION-AND-RUNTIME-CLOSURE-V1

작업 기준: `origin/main` = `fb49dabf2`
작업 브랜치: `work/channels-typeorm-entity-registration-and-runtime-closure-v1`
작업 worktree: `C:\tmp\o4o-integration` (시작 시 clean, 다른 세션 WIP 미접촉)

---

## 1. 결함 재현 (§9)

배포된 production(`https://api.neture.co.kr`)에서 수정 전 실측:

| 요청 | 응답 |
|---|---|
| `GET /api/v1/channels` | `500 {"code":"INTERNAL_ERROR","message":"No metadata for \"Channel\" was found."}` |
| `GET /api/v1/channels?serviceKey=kpa` | 동일 500 |
| `GET /api/v1/channels/health` | `400 {"code":"INVALID_ID","message":"Invalid channel ID format"}` |
| `GET /api/v1/admin/channels/ops` | `401 AUTH_REQUIRED` (auth 경계는 정상) |
| `GET /api/v1/admin/channels/heartbeat/status` | `401 AUTH_REQUIRED` |
| `GET /api/v1/admin/channel-playback-logs` | `401 AUTH_REQUIRED` |

즉 admin UI의 채널 화면이 목록을 아예 못 그리는 상태였고, health 조차 200이 아니었다.

## 2. 근본 원인 (UNKNOWN 0) (§10)

`Channel` / `ChannelPlaybackLog` / `ChannelHeartbeat` 가 runtime DataSource 의
entity 등록 배열(`apps/api-server/src/database/entities.ts`, SSOT)에 **없었다**.
TypeORM 은 entity 파일이 export 되고 route 가 import 하는 것만으로는 metadata 를 만들지 않는다.
등록되지 않은 클래스로 `getRepository()` 를 호출하면 `No metadata for "X" was found.` 가 난다.

커밋 이력으로 확정한 유입 경로:

1. `38aff8d9e` — cms-core entity 5종을 `connection.ts` 에 등록.
2. `6371364a2` ("bootstrap stabilization - ESM circular dependency resolution") —
   `// Removed to prevent package side-effect loading from @o4o-apps/cms-core` 주석과 함께 **전부 주석 처리**.
3. `476b1f5a3` ("WO-NETURE-SMOKE-STABILIZATION-V1") — `No metadata for CmsContent` 를 쫓다가
   `/entities` subpath 로 **`CmsContent`, `CmsContentSlot`(+ 이후 `CmsMedia` 계열)만** 복구.
   channels 축 3종은 그대로 미등록으로 남았다.

## 3. 왜 테스트/빌드가 못 잡았나 (§8)

- 기존 `channels-servicekey-canonical-scope.spec.ts` 는 `@o4o-apps/cms-core` 를
  `jest.mock(..., { virtual: true })` 로 **가짜 class 로 치환**하고 fake DataSource 를 주입한다.
  → "등록 여부"를 구조적으로 볼 수 없다.
- `tsc` 는 import 가능 여부만 본다. 등록은 **런타임 배열**이라 타입 검사 대상이 아니다.
- 등록 완전성을 긍정적으로 검증하는 테스트가 없었다
  (`app-instances-retirement.spec.ts` 에 부정형 검사만 존재).

## 4. entity ↔ production table 정합 판정 (§10/§11)

production read-only census (Cloud SQL Auth Proxy, SELECT only):

| table | 존재 | 행수 | 컬럼 표기 | 판정 |
|---|---|---|---|---|
| `channels` | O | 0 | camelCase (`"organizationId"`, `"serviceKey"`, `"slotKey"` …) | **SCHEMA_MATCH** |
| `channel_playback_logs` | O | 0 | snake_case (`channel_id`, `played_at`, `created_at` …) | **SCHEMA_DRIFT** (수정 전) |
| `channel_heartbeats` | O | 0 | snake_case (`channel_id`, `received_at`, `is_online` …) | **SCHEMA_DRIFT** (수정 전) |

drift 원인: 세 table 을 만든 migration 이 서로 다른 표기를 썼다.

- `1736600000000-CreateChannelsTable` → camelCase (entity 와 일치)
- `1736700000000-CreateChannelPlaybackLog` → snake_case
- `1736710000000-CreateChannelHeartbeat` → snake_case

그런데 두 log entity 는 camelCase property 만 선언하고 `name:` 매핑이 없었고,
`AppDataSource` 에는 naming strategy 가 없다(`connection.ts:91` 의 `// namingStrategy: new SnakeNamingStrategy(),` 는 주석).
즉 **처음부터 entity 와 table 이 어긋나 있었고**, 그냥 등록만 했다면
`/channels/:id/playback-log`, `/channels/:id/heartbeat`, admin ops 계열이
`column "channelId" does not exist` 로 다시 500이 났을 것이다.

TypeORM 이 실제로 계산하는 컬럼명을 metadata build 로 실측해 확인했다(수정 전):

```
channel_playback_logs → id,channelId,contentId,serviceKey,organizationId,playedAt,durationSec,completed,source,createdAt
production            → id,channel_id,content_id,service_key,organization_id,played_at,duration_sec,completed,source,created_at
```

## 5. drift 해소 방식과 그 근거 (§2/§11/§29)

WO 는 (a) 기존 table 이 있으면 schema 변경 금지, (b) migration 자동 생성 금지,
(c) production write 0 을 요구한다. 동시에 §13 은 부분 등록(“Channel 만 등록”)을 금지한다.

채택한 해소: **entity 쪽에 실제 컬럼명을 명시 매핑**한다.

- `@Column({ name: 'channel_id', ... }) channelId`, `@CreateDateColumn({ name: 'received_at' })` 등
- production schema 변경 0 / DDL 0 / migration 파일 0 / write 0
- 대상 3 table 모두 0행이라 데이터 재해석 위험 없음
- `synchronize` 는 `connection.ts`, `migration-config.ts` 모두 `false` — 등록이 DDL 을 유발하지 않음

**§29 관련 명시 기록:** "production table schema 와 entity 가 실제 불일치" 조건은 실제로 발생했다.
다만 그 해소를 DB 쪽(rename/migration)이 아니라 **코드 쪽 매핑**으로 처리했으므로
§29 가 막으려는 위험(무단 DDL·자동 migration)은 발생하지 않았다.
DB 를 snake→camel 로 통일하는 정리는 이 WO 범위 밖이며, 별도 WO 로 다뤄야 한다.

수정 후 실측(metadata build):

```
channels              → id,organizationId,serviceKey,name,code,description,type,slotKey,status,resolution,orientation,autoplay,refreshIntervalSec,defaultDurationSec,location,metadata,createdBy,createdAt,updatedAt
channel_playback_logs → id,channel_id,content_id,service_key,organization_id,played_at,duration_sec,completed,source,created_at
channel_heartbeats    → id,channel_id,service_key,organization_id,player_version,device_type,platform,ip_address,is_online,uptime_sec,metrics,received_at
```

→ 세 table 모두 production 실제 컬럼과 **정확히 일치**. index 도 `channel_id + played_at`,
`channel_id + received_at`, `service_key + organization_id` 로 migration 이 만든 index 와 같은 축이다.

## 6. 등록 census 와 등록 (§12/§13)

- runtime DataSource 는 `connection.ts` 하나뿐이고 entity 배열은 `entities.ts` 가 SSOT.
  (`data-source.ts` 는 CLI 용 glob 설정, `migration-config.ts` 는 migration 전용 — 둘 다 서버 런타임 아님)
- `@Entity('channel...')` 선언은 cms-core 에만 존재하며 중복 정의 없음 → 별도 datasource 를 의도한 구조 아님.
- 세 entity를 기존 `@o4o-apps/cms-core/entities` subpath 패턴 그대로 **한 번에** 등록했다.
  새 datasource 생성 0 / glob 자동 등록 0 / synchronize 변경 0.

## 7. repository 초기화 실증 (§14)

production DB(proxy 경유, **SELECT only**)에 실제 DataSource 를 붙여 확인:

```
Channel            table=channels               count=0
ChannelPlaybackLog table=channel_playback_logs  count=0
ChannelHeartbeat   table=channel_heartbeats     count=0
HB  SQL: SELECT "hb"."id", "hb"."channel_id", "hb"."service_key", "hb"."organization_id", "hb"."player_version" ...
PL  SQL: SELECT "pl"."id", "pl"."channel_id", "pl"."content_id", "pl"."service_key", ...
```

metadata 확보 + 실제 컬럼으로 SQL 전개 + 쿼리 성공. write 0.

## 8. 회귀 테스트 (§15/§16/§17/§18/§24)

신규: `apps/api-server/src/__tests__/channels-typeorm-entity-registration.spec.ts` (18 tests)

import 가능 여부만 보는 약한 테스트가 아니라 네 축을 본다.

1. **실제 entity 클래스**로 TypeORM metadata 를 build 해 table 명/컬럼 databaseName 이
   production 실측 schema 와 정확히 일치하는지 (mock class 사용 안 함 —
   `jest.config.cjs` 에 `@o4o-apps/cms-core/entities` → src 매핑 추가).
   naming strategy 부재 전제와 `synchronize: false` 도 함께 고정한다.
2. `entities.ts` 의 `export const entities = [...]` 배열을 파싱해 세 entity 등록 여부 확인
   (subpath import 여부, glob 자동 등록 금지 포함).
3. 위 (2)에서 얻은 **등록된 이름 집합만 metadata 를 가지는** fake DataSource 로
   실제 라우터를 mount → 미등록이면 production 과 같은 형태로 실패하도록 재현.
   목록 200 + 빈 배열, alias(`?serviceKey=kpa`) 200, `/health` 200,
   playback-log / heartbeat 저장 성공을 검증.
4. admin 전용 라우트의 403 계약, 500 body 의 내부 문자열 비노출.

**부정 대조(negative control) 실측** — 고의로 되돌렸을 때 실패하는지 확인:

| 되돌린 것 | 결과 |
|---|---|
| 등록 배열에서 3종 제거 + `channel_id` 매핑 제거 | 18 중 **8 실패** (등록/컬럼/목록/alias/playback/heartbeat/누출) |
| `/health` 를 다시 `/:id` 아래로 이동 | health 테스트 **실패** |
| 원상 복구 | 18/18 통과 |

## 9. 추가로 닫은 결함

- **`/api/v1/channels/health` 가 400** — `router.get('/health')` 가 `router.get('/:id')` **뒤**에
  선언돼 있어 `/:id` 에 먼저 매칭됐다. 라우터 선두로 이동하고, 재발 방지 주석 + 회귀 테스트 추가.
- **내부 오류 문자열 외부 노출 (§24)** — channels 축 4개 라우터의 500 응답이
  `error.message` 를 그대로 실어 TypeORM 내부 문자열(`No metadata for "Channel" was found.`)을
  외부에 노출했다. 서버 로그에는 원본을 남기고 응답은 `Internal server error` 로 통일했다
  (총 14곳; repo 의 기존 non-leaking 패턴과 동일).

## 10. serviceKey canonical / slot 연결 (§19/§20)

- 기존 `channels-servicekey-canonical-scope.spec.ts` 가 전체 회귀에 포함되어 통과.
- production read-only 확인: `cms_content_slots` = `kpa-society` 28 / `kpa` 1 / `glycopharm` 1.
  KPA 채널의 조회 조건(`serviceKey IN ('kpa-society','kpa') OR IS NULL`, `isActive`)으로
  legacy `kpa` slot(`intranet-hero`)이 canonical 결과와 **함께** 잡히는 것을 확인했다.
  fixture 생성 0.

## 11. admin-dashboard (§21)

`apps/admin-dashboard/src/lib/channels.ts` 의 호출 경로(`/channels`, `/channels/:id`,
`/channels/code/:code`, `/channels/:id/contents`, status/PUT/DELETE)는 서버 계약과 일치한다.
화면이 비어 있던 원인은 클라이언트가 아니라 서버 500 이었으므로 admin 쪽 코드 변경은 없다.
typecheck 0 error, production build 성공.

## 12. 범위 밖 (§22/§28)

signage-player-web 배포, channels service-scoped RBAC 설계, `channel.code` unique constraint,
`?code=` filter 구현, legacy kpa slot/content migration, pharmacy-hub KNOWN_PREFIXES,
admin catalog pharmacy-hub 추가, CMS organization visibility 정비 — 이번 WO 에서 손대지 않았다.
DB 컬럼 표기 통일(snake→camel)도 범위 밖으로 남겼다(§5 참조).

## 13. 전체 회귀 (§25)

| 항목 | 결과 |
|---|---|
| api-server `tsc --noEmit` | 0 error |
| api-server build (emit) | 성공 |
| api-server Jest 전체 | **194 suites / 3242 tests / 0 fail** (rebase 후 재실행 기준) |
| admin-dashboard typecheck | 0 error |
| admin-dashboard build | 성공 (`built in 1m 46s`) |

skip / 완화 / `.only` / 테스트 삭제 없음.

## 14. 변경 파일

```
apps/api-server/src/database/entities.ts                        (+13)  entity 3종 등록
apps/api-server/src/routes/channels/channels.routes.ts                 /health 순서 + 오류 비노출
apps/api-server/src/routes/admin/channel-ops.routes.ts                 오류 비노출
apps/api-server/src/routes/admin/channel-heartbeat.routes.ts           오류 비노출
apps/api-server/src/routes/admin/channel-playback-logs.routes.ts       오류 비노출
apps/api-server/jest.config.cjs                                        cms-core/entities → src 매핑
apps/api-server/src/__tests__/channels-typeorm-entity-registration.spec.ts  (신규, 18 tests)
packages/cms-core/src/entities/ChannelPlaybackLog.entity.ts            컬럼 name: 매핑
packages/cms-core/src/entities/ChannelHeartbeat.entity.ts              컬럼 name: 매핑
```

`git add .` 미사용(경로 지정 stage). 다른 세션 WIP 미접촉. 신규 기능 추가 0.

## 15. production 안전성 요약 (§27)

| 항목 | 값 |
|---|---|
| production DB write | **0** (SELECT / metadata build 전용) |
| schema 변경 | **0** |
| migration 파일 생성 | **0** |
| `synchronize` | `connection.ts`, `migration-config.ts` 모두 `false` (변경 없음) |
| fixture 생성 | **0** |

## 16. 배포 (§26)

- main push: `2b931ff5ae48d624317baa56dab955ba509c9c57`
  (push 직전 `origin/main` = `23f1cc723` 로 rebase, conflict 0. rebase 후 tsc/Jest 재실행 → 위 §13 수치)
- GitHub Actions (headSha `2b931ff5a`):
  - Deploy API Server (Cloud Run) — **success**
  - Deploy Admin Dashboard (Cloud Run) — **success**
  - Deploy Web Services (Cloud Run) — **success**
  - CodeQL Security Analysis — **success**
  - CI Pipeline — `cancelled` (이후 커밋 `6f950958f` 가 push 되어 concurrency 로 취소됨.
    동일 트리에 대한 tsc/Jest 전체는 로컬에서 통과 확인 — §13)
- 서빙 확인:
  `o4o-core-api` 서빙 revision `o4o-core-api-03466-f7n`
  image `asia-northeast3-docker.pkg.dev/netureyoutube/o4o-api/api-server:2b931ff5ae48d624317baa56dab955ba509c9c57`
  → 이번 커밋 SHA 태그가 실제로 서빙 중.

## 17. production 사후 smoke (§23) — read-only

수정 전/후 비교:

| 요청 | 수정 전 | 수정 후 |
|---|---|---|
| `GET /api/v1/channels` | 500 `No metadata for "Channel" was found.` | **200** `{"success":true,"data":[],"pagination":{"total":0,"limit":50,"offset":0}}` |
| `GET /api/v1/channels?serviceKey=kpa` | 500 | **200** (빈 목록) |
| `GET /api/v1/channels?serviceKey=kpa-society` | 500 | **200** (alias/canonical 동일 결과) |
| `GET /api/v1/channels/health` | 400 `INVALID_ID` | **200** `{"status":"ok","service":"channels"}` |
| `GET /api/v1/channels/:uuid` (없는 id) | 500 | **404 NOT_FOUND** |
| `GET /api/v1/channels/code/NOPE` | 500 | **404 NOT_FOUND** |

404 가 정상적으로 나온다는 것은 metadata 확보 후 실제 DB 조회까지 성공했다는 뜻이다
(미등록이면 조회 이전에 500 이 났다).

auth 계약(§18) — 모두 DB 접근 이전에 차단됨:

| 요청 | 응답 |
|---|---|
| `POST /api/v1/channels` (미인증) | 401 `AUTH_REQUIRED` |
| `GET /api/v1/admin/channels/ops` | 401 `AUTH_REQUIRED` |
| `GET /api/v1/admin/channels/heartbeat/status` | 401 `AUTH_REQUIRED` |
| `GET /api/v1/admin/channel-playback-logs` | 401 `AUTH_REQUIRED` |
| `GET /api/v1/admin/channel-playback-logs/stats/summary` | 401 `AUTH_REQUIRED` |

**AUTH_SMOKE_BLOCKED:** admin 인증 토큰이 없어 admin 전용 3개 라우트의 **인증 후** 200 응답과
admin UI 브라우저 화면(로그인 필요)은 직접 확인하지 못했다.
서버측 근거는 확보되어 있다 — 세 entity 모두 production DB 에 붙여 repository 초기화와
실제 컬럼 SQL 전개를 실증했고(§7), admin UI 가 호출하는 `/channels` 계열은 200 이다.
`POST /:id/playback-log`, `POST /:id/heartbeat` 는 인증이 없는 write 경로이므로
production write 0 원칙에 따라 **호출하지 않았다**(테스트 fixture 로만 검증, §8).

배포 후 재확인: `channels=0 logs=0 heartbeats=0` — 이번 작업으로 production 에 쓴 행 **0**.

## 18. 판정

**PASS** — `/api/v1/channels*` 의 500 이 제거되었고, 같은 runtime 축의
`ChannelPlaybackLog` / `ChannelHeartbeat` 까지 등록·컬럼 정합·회귀 테스트로 함께 닫았다.
남은 미확인 항목은 §17 의 admin 인증 후 smoke 하나이며, 그 원인은 credential 부재다.
