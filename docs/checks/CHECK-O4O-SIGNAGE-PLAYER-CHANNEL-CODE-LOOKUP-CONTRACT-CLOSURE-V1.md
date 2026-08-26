# CHECK-O4O-SIGNAGE-PLAYER-CHANNEL-CODE-LOOKUP-CONTRACT-CLOSURE-V1

- WO: `WO-O4O-SIGNAGE-PLAYER-CHANNEL-CODE-LOOKUP-CONTRACT-CLOSURE-V1`
- 기준 commit(base): `d525575a1` (origin/main)
- 결과 commit: `f6b35153e`
- 작업 worktree: `C:\tmp\o4o-integration` (branch `work/signage-player-channel-code-lookup-contract-closure-v1`)
- 작성일: 2026-08-26

---

## 1. 문제 재현 (§4)

signage player 는 channel code 로 채널을 찾기 위해 목록 endpoint 를 호출하고 있었다.

```
GET https://api.neture.co.kr/api/v1/channels?code=KPA-LOBBY-01
→ 400 {"success":false,"error":{"code":"SERVICE_KEY_REQUIRED",
        "message":"serviceKey is required for CMS read access"}}
```

두 개의 독립된 사실이 겹쳐 있었다.

1. `GET /channels` 는 `WO-O4O-CHANNELS-SERVICE-SCOPED-AUTHORIZATION-CONTRACT-V1` 이후
   **serviceKey 로 경계가 그어진 enumeration endpoint** 다. serviceKey 없는 익명 호출은 400 이다.
2. 그와 무관하게, **서버는 목록에 `code` 필터를 구현한 적이 없다.**
   serviceKey 를 붙였더라도 `?code=` 는 무시되고 그 서비스의 채널 전체가 돌아왔을 것이다.

즉 400 은 증상이고, 원인은 player 가 애초에 존재하지 않는 필터를 호출하고 있었다는 것이다.

---

## 2. code endpoint 전수 census (§5)

`/api/v1/channels` (CMS channels 축) 라우트 11개 중 code 를 다루는 경로:

| 경로 | 인증 | code 취급 |
|---|---|---|
| `GET /channels` | optionalAuth | **없음** — serviceKey/organizationId/type/status/slotKey/limit/offset 만 필터 |
| `GET /channels/code/:code` | optionalAuth | **exact lookup (기존부터 존재)** |
| `GET /channels/:id` | optionalAuth | id 전용 (UUID 아니면 400 INVALID_ID) |
| `POST /channels` | requireAdmin | code 중복 시 409 DUPLICATE_CODE |
| `PUT /channels/:id` | requireAdmin | code 중복 시 409 DUPLICATE_CODE |

다른 축(`/api/signage/:serviceKey/channels`, `organization_channels`)에는 code 기반 단건 조회가 없고,
player 의 이 경로와도 무관하다.

**결론: canonical 단건 lookup 은 이미 존재한다 → `GET /api/v1/channels/code/:code` (§9 A안).**

---

## 3. player consumer 전수 census (§6)

`services/signage-player-web` 에서 `/api/v1/channels` 를 쓰는 곳은 `src/api/channels.ts` 한 파일뿐이다.

| 화면 | 축 | code lookup |
|---|---|---|
| `ChannelPlayerPage` (`/player/channels/:channelId`, `/player/channels/code/:code`) | `/api/v1/channels` | 해당 |
| `SignagePlayerPage` (`/signage/:serviceKey/channel/...`) | `/api/signage/:serviceKey/...` | 무관(다른 축) |

`?code=` 호출자는 이 한 곳이며, 다른 앱(admin-dashboard 포함)에는 `?code=` 호출이 없다.

---

## 4. code 의 의미와 유일성 (§7 §8)

- `POST /channels`, `PUT /channels/:id` 모두 **serviceKey 와 무관하게** `findOne({ where: { code } })` 로
  중복을 검사하고 409 를 던진다 → `channel.code` 는 **platform-global 식별자**다.
- 대소문자 구분, trim 없음. 즉 `KPA-LOBBY-01` 과 `kpa-lobby-01` 은 서로 다른 code 다.
- **DB unique constraint 는 없다** (application-level 보장만 존재). §29/§30 에 따라 이번 WO 에서 추가하지 않았다.

§31 중지 조건 점검: code 는 globally addressable key 이고, 여러 service 에서 동일 code 를 허용하는 제품 계약이
아니며, exact lookup 에 serviceKey 가 필요하지 않다 → **중지 조건 해당 없음.**

---

## 5. 판정 (§10)

| 항목 | 판정 |
|---|---|
| `GET /channels?code=` | **PLAYER_BUG** — 서버가 지원한 적 없는 필터를 player 가 호출했다. legacy 계약도, 누락된 compat 도 아니다. |
| canonical lookup | **A. `GET /api/v1/channels/code/:code`** (기존 endpoint, 익명 허용, 의미 일치) |
| status filtering | **PLAYER_DECIDES** — 서버는 inactive 채널도 반환하고, 재생 여부는 player 의 `isChannelPlayable` 이 결정한다(`/:id` 와 동일 계약). |
| player 런타임 | **PLAYER_RUNTIME_NOT_DEPLOYED** (§24 §25) |

---

## 6. 계약 분리 (§11 §12)

```
ENUMERATION   GET /channels             serviceKey 필수 (없으면 400 SERVICE_KEY_REQUIRED)
EXACT LOOKUP  GET /channels/code/:code  익명 단건 조회 (device-addressed)
              GET /channels/:id         익명 단건 조회 (device-addressed)
```

`?code=` 를 목록 handler 의 예외 분기로 되살리는 방식은 **채택하지 않았다**(§12 금지).
그렇게 하면 code 하나로 serviceKey 경계를 우회하는 통로가 생기고, 목록의 필터 규약도 깨진다.
serviceKey 요구 완화, anonymous cross-service list, 새 alias map, 새 device credential 체계 — **전부 도입하지 않았다**(§15).
player 에 serviceKey 를 주입하지도 않았다(§14) — device 는 serviceKey 를 알 방법이 없고, canonical lookup 은 그것을 요구하지 않는다.

---

## 7. 서버 변경 (§13)

`apps/api-server/src/routes/channels/channels.routes.ts` — `/code/:code` 한 곳:

```ts
const channel = await channelRepo.findOne({
  where: { code },
  order: { createdAt: 'ASC' },
});
```

이유: code 에 DB unique constraint 가 없어 경쟁 조건으로 중복 row 가 생기면 `findOne` 이 임의의 한 건을 돌려준다.
사이니지 디바이스가 **호출마다 다른 채널을 재생하는** 비결정성을 없애기 위해 가장 오래된 행으로 고정했다.
schema/migration 변경 없음. 인증 계약·응답 계약 변경 없음.

---

## 8. player 변경 (§17)

`services/signage-player-web/src/api/channels.ts`

1. code lookup 을 canonical endpoint 로 교체
   `GET /api/v1/channels?code=` → `GET /api/v1/channels/code/:code` (`encodeURIComponent`).
2. **인접 결함 수정**: player 는 서버의 `{ success, data }` envelope 을 벗기지 않고 있었다.
   by-id 경로도 마찬가지여서 `channel.id` / `channel.status` 가 `undefined` 였고,
   그 결과 contents 조회 URL 과 telemetry 의 `channelId` 가 모두 깨져 있었다.
   `unwrapChannel()` 로 envelope 을 벗기되, envelope 없는 응답도 그대로 통과시킨다.
3. contents 응답을 `ContentRenderer` 계약으로 매핑(adapter, §17 — 응답 계약을 임의로 깨지 않는다):
   `sortOrder→displayOrder`, `startsAt/endsAt→startDate/endDate`,
   `content.type→contentType`, `content.summary→excerpt`, `content.imageUrl→featuredImage`, `meta.total→totalCount`.
4. nullable 정합: `organizationId`, `serviceKey`, `code`, `refreshIntervalSec` 를 `| null` 로 정정.

`services/signage-player-web/src/pages/ChannelPlayerPage.tsx`
- `refreshInterval = (channel.refreshIntervalSec ?? 0) * 1000`
- `key={currentContent.slotId}` (기존 `.id` 는 서버가 보내지 않는 필드였다)

telemetry(`/playback-log`, `/heartbeat`) 는 손대지 않았다(§20).

---

## 9. 회귀 테스트 (§19 §20 §21 §22)

신규: `apps/api-server/src/__tests__/channels-code-lookup-contract.spec.ts` — **20/20 PASS**

| 그룹 | 검증 |
|---|---|
| ENUMERATION (3) | serviceKey 없는 목록 400 / `?code=foo` 로도 우회 불가(쿼리 자체가 실행되지 않음) / serviceKey 있는 목록에서도 `code` 는 필터로 취급되지 않음 |
| EXACT LOOKUP (6) | 익명 200+envelope / 404 NOT_FOUND / prefix 로는 안 잡히는 exact match / URL-encoded code / `order: createdAt ASC` 고정 / inactive 도 반환(PLAYER_DECIDES) |
| ROUTE ORDER (4) | UUID 형태 code 도 code handler 도달 / 비-UUID 단일 세그먼트는 여전히 `/:id` 400 INVALID_ID / `/health` 정상 / 선언 순서 static-first (주석 제거 후 검사) |
| SLOT LINKAGE (2) | `kpa-society` 채널의 slot 조회가 `['kpa-society','kpa']` legacy alias 를 유지 / contents 응답의 channel 메타·meta.total 유지 |
| STATIC CONTRACT (5) | player client 가 `/channels?code=` 를 쓰지 않음 / canonical endpoint 사용 / serviceKey 미주입 / telemetry endpoint 유지 |

정적 계약 테스트는 `/api/v1/channels?` 패턴만 금지하며, player 의 무관한 query 사용은 금지하지 않는다(§22).

---

## 10. 전체 검증 (§28)

| 대상 | 명령 | 결과 |
|---|---|---|
| api-server 타입 | `tsc --noEmit` | PASS |
| api-server 테스트 | `jest` (전체) | 201 suite 중 200 PASS, **3365/3366 tests PASS** |
| signage-player-web | `npm run type-check` | PASS |
| signage-player-web | `npm run build` (production) | PASS (`dist/assets/index-*.js` 607.91 kB) |
| admin-dashboard | `npm run type-check` | PASS |
| admin-dashboard | `npm run build` | PASS |

**유일한 실패 1건은 이 WO 와 무관한 로컬 환경 잔재다.**
`src/__tests__/ecommerce-core-and-commerce-residue-retirement.spec.ts` 의
"packages/ecommerce-core 디렉토리가 존재하지 않는다" 가 실패한다.
`git ls-tree origin/main packages/ecommerce-core` 는 비어 있고(= main 에서 이미 은퇴),
`git ls-files packages/ecommerce-core` 도 비어 있다. 남아 있는 것은 이 worktree 의 추적되지 않는
빌드 잔재(`dist/`, `node_modules/`, `tsconfig.tsbuildinfo`, `package.json` 없음)뿐이다.
→ 판정 `PRE_EXISTING_LOCAL_ENV_ARTIFACT`. 테스트를 skip 하거나 완화하지 않았고(§28), 코드 회귀도 아니다.
정리 시도는 auto-mode 권한 정책에 의해 차단되어 수행하지 않았다.

---

## 11. 배포 (§23)

- push: `f6b35153e` → `origin/main`
- 배포 파이프라인: `Deploy API Server (Cloud Run)` / `o4o-core-api` (asia-northeast3)
- 검증 기준: serving revision 의 image tag == commit SHA
- 결과: **성공**. serving image tag `f6b35153ec767c15206ffab31fe4b65035376370` == commit `f6b35153e` (검증 완료)
- 같은 SHA 의 `CodeQL Security Analysis`: success
- 같은 SHA 의 `CI Pipeline`: **failure — 이 WO 와 무관한 기존 실패**.
  실패 step 은 `Code Quality Check / type-check:frontend` 의 `services/web-glycopharm` 한 건이며,
  base commit `d525575a1` 의 CI Pipeline 도 동일하게 failure 였다. 이번 변경은 web-glycopharm 을 건드리지 않는다.

**player 는 배포하지 않았다.** `.github/workflows/` 어디에도 signage-player-web 이 없고
(`deploy-web-services.yml` 은 web-* 6개만 다룬다), Cloud Run 에도 해당 서비스가 없다.
서비스 안에 `Dockerfile` 과 `nginx.conf` 는 있으므로 산출물은 준비되어 있고 파이프라인만 없는 상태다.
→ **`PLAYER_RUNTIME_NOT_DEPLOYED`** (§24 — `PLAYER_DEPLOYMENT_BLOCKED` 아님).
배포 파이프라인 추가는 §30 범위 밖이므로 하지 않았다. 대신 §24 가 요구한 로컬 production build 와
API client 계약 테스트를 수행했다(§9, §10).

---

## 12. production read-only smoke (§23)

모두 GET, **production DB write 0 / schema 0 / migration 0** (§29).

| # | 요청 | 기대 | 실제 |
|---|---|---|---|
| 1 | `GET /channels` | 400 SERVICE_KEY_REQUIRED | 400 `SERVICE_KEY_REQUIRED` PASS |
| 2 | `GET /channels?code=KPA-LOBBY-01` | 400 (code 로 우회 불가) | 400 `SERVICE_KEY_REQUIRED` PASS |
| 3 | `GET /channels?serviceKey=kpa&limit=2` | 200 scoped list | 200 `{"data":[],"pagination":{"total":0}}` PASS |
| 4 | `GET /channels?serviceKey=kpa&code=x` | 200, code 는 필터가 아님 | 200 (동일 결과) PASS |
| 5 | `GET /channels/code/NO-SUCH-CODE` | 404 NOT_FOUND | 404 `NOT_FOUND` PASS |
| 6 | `GET /channels/code/11111111-1111-4111-8111-111111111111` | 404 (400 INVALID_ID 아님 = shadowing 없음) | 404 `NOT_FOUND` PASS |
| 7 | `GET /channels/health` | 200 | 200 `{"status":"ok","service":"channels"}` PASS |
| 8 | `GET /channels/not-a-uuid` | 400 INVALID_ID (`/:id` 계약 유지) | 400 `INVALID_ID` PASS |

8/8 PASS. 전부 GET, 인증 없이 실행.

**200 exact-lookup smoke 는 실행할 수 없었다.** production 의 channels table 에 행이 0건이다
(`serviceKey=kpa|kpa-society|k-cosmetics|cosmetics|glycopharm|neture|pharmacy-hub|kpa-branch` 전부 `total: 0`).
채널을 만들면 production write 가 되므로(§29, fixture 생성 금지) 하지 않았다.
→ **`SMOKE_200_BLOCKED_NO_PRODUCTION_CHANNEL_ROW`**. 200 경로는 회귀 테스트(§9)로만 고정되어 있다.

---

## 13. 범위 밖으로 남긴 것 (§30) / 후속 후보

- `channel.code` 의 DB unique constraint (지금은 application-level 409 + `createdAt ASC` 결정성으로만 방어)
- signage-player-web 배포 워크플로 추가 (Dockerfile 은 이미 존재)
- device credential 체계 — 단건 조회는 여전히 "UUID/code 를 아는 것 = 신뢰"
- channels organization authorization, legacy kpa CMS migration, PH admin catalog/KNOWN_PREFIXES

## 14. UNKNOWN

없음 (0건).
