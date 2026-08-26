# CHECK-O4O-CHANNELS-SERVICE-SCOPED-AUTHORIZATION-CONTRACT-V1

**WO**: WO-O4O-CHANNELS-SERVICE-SCOPED-AUTHORIZATION-CONTRACT-V1
**기준**: `origin/main` = `ff6f05b4f` → 배포 커밋 `ad0a8141f`
**범위**: `/api/v1/channels*` · `/api/v1/admin/channel*` 의 권한 계약 확정과 최소 정비
**production DB write**: 0 · **schema 변경**: 0 · **migration**: 0 · **새 role/alias mapping**: 0

---

## §1. 문제 정의

channels runtime 은 직전 WO(entity 등록)로 살아났으나, 권한 계약은
`read → optionalAuth` / `write → requireAdmin` 두 줄뿐이었다. 이것이 제품 의도와
일치하는지는 검증된 적이 없다. 특히 `channels.serviceKey` 는 **CMS ledger service key
축**(= `cms_contents.serviceKey`, `cms_content_slots.serviceKey`)인데, 그 축의 read
경계는 이미 다른 WO 에서 확정되어 있었다. 즉 **같은 데이터 축에 두 벌의 경계**가 있었다.

---

## §2. Endpoint 전수 census (19/19, 미조사 0)

### 2-1. `/api/v1/channels` (`routes/channels/channels.routes.ts`)

| # | Method / Path | 기존 guard | 익명 | serviceKey 입력 | 데이터 scope | consumer |
|---|---|---|---|---|---|---|
| 1 | GET `/health` | 없음 | 허용 | – | 없음(정적) | infra probe |
| 2 | GET `/` | `optionalAuth` | **허용** | query(선택) | **전 서비스 enumeration** | admin-dashboard ChannelList / player(`?code=`, 미구현 필터) |
| 3 | GET `/code/:code` | `optionalAuth` | 허용 | 없음 | 단건 | signage player |
| 4 | GET `/:id` | `optionalAuth` | 허용 | 없음 | 단건 | signage player, admin |
| 5 | POST `/` | `requireAdmin` | 거부 | body | 생성 | admin ChannelFormModal |
| 6 | PUT `/:id` | `requireAdmin` | 거부 | body | 수정(ownership 포함) | admin ChannelFormModal |
| 7 | PATCH `/:id/status` | `requireAdmin` | 거부 | 없음 | 상태 변경 | admin ChannelList |
| 8 | DELETE `/:id` | `requireAdmin` | 거부 | 없음 | 삭제 | admin ChannelList |
| 9 | GET `/:id/contents` | `optionalAuth` | 허용 | 없음(channel 에서 파생) | 단건+slot 연결 | signage player, admin ChannelContentsPreview |
| 10 | POST `/:id/playback-log` | **없음** | 허용 | 없음(channel 에서 파생) | telemetry insert | signage player |
| 11 | POST `/:id/heartbeat` | **없음** | 허용 | 없음(channel 에서 파생) | telemetry insert | signage player |

### 2-2. `/api/v1/admin/channel*` (8개)

| Router | Endpoints | guard |
|---|---|---|
| `admin/channel-ops.routes.ts` | GET `/`, GET `/:channelId` | `requireAdmin` |
| `admin/channel-heartbeat.routes.ts` | GET `/`, GET `/status`, GET `/:channelId` | `requireAdmin` |
| `admin/channel-playback-logs.routes.ts` | GET `/`, GET `/:id`, GET `/stats/summary` | `requireAdmin` |

→ 관리 계열 8개는 이미 platform admin 전용. 이 WO 에서 변경 없음.

---

## §3. Actor / consumer 전수 census

| Actor | 인증 수단 | 실제 호출 경로 | 근거 |
|---|---|---|---|
| platform admin | admin-dashboard 세션(JWT/cookie) | `/api/v1/channels` 전부 + `/admin/channel*` | `routes/content.routes.tsx` 의 `AdminProtectedRoute requiredRoles={['admin']}`, `requireAdmin` = `platform:super_admin` |
| service operator (`kpa:operator`, `cosmetics:operator`) | 서비스 세션 | **채널 관리 UI 없음** | admin-dashboard 외에 channel 관리 화면이 없고, role catalog(`@o4o/security-core`)에 channel permission 자체가 없다 |
| store owner / member | 서비스 세션 | 없음 | `/api/v1/channels` 를 호출하는 서비스 웹 코드 없음 |
| signage player (device) | **credential 없음** | `GET /:id`, `GET /?code=`, `GET /:id/contents`, `POST /:id/playback-log`, `POST /:id/heartbeat` | `services/signage-player-web/src/api/channels.ts` — 전부 plain `fetch`, Authorization 헤더·쿠키 없음 |
| anonymous(웹 방문자) | – | 없음 | 공개 웹에서 channel API 를 호출하는 코드 없음 |

**오귀속 방지**: `services/web-glycopharm/.../StoreChannelsPage.tsx` 계열은 **판매 채널**
(`organization_channels`) 축이며 `/api/v1/channels` consumer 가 아니다.
`admin-dashboard/pages/digital-signage/v2/*` 는 `/api/signage/:serviceKey/channels` 라는
별도 축을 쓴다. 둘 다 이 WO 의 consumer 목록에서 제외했다.

---

## §4. 제품 계약 확정 (§6 판정)

| 계약 | 판정 | 근거 |
|---|---|---|
| MANAGEMENT (write 5종) | **platform admin 전용 유지** | service operator 에게 줄 제품 근거 부재 (아래 §5) |
| ENUMERATION (`GET /`) | **serviceKey 가 read 경계** | CMS ledger 동일 축의 확정된 경계 재사용 |
| DEVICE-ADDRESSED PUBLIC READ (`/:id`, `/code/:code`, `/:id/contents`) | **익명 유지** | player 가 serviceKey 를 갖지 않음. id/code 가 주소이자 capability |
| DEVICE INGEST (`playback-log`, `heartbeat`) | **INTENTIONAL_DEVICE_INGEST** | §6 |
| organization 경계 | **SERVICE_SCOPE_ONLY_FIXED** + **ORGANIZATION_SCOPE_UNRESOLVED** | §7 |

---

## §5. service operator write — `SERVICE_OPERATOR_WRITE_NOT_GRANTED`

권한을 부여할 근거를 세 곳에서 찾았고 **모두 없음**으로 확인했다.

1. **role/permission catalog**: `packages/security-core/src` 전체에 channel 관련
   permission 이 하나도 없다(`grep -i channel` → 0건, 판매채널 축 제외).
2. **운영 UI**: channel 관리 화면은 admin-dashboard 의 CMS 메뉴 하나뿐이고,
   route guard 가 `requiredRoles={['admin']}` 이다. 서비스 운영자용 채널 화면이 없다.
3. **consumer**: 서비스 웹앱 어디에서도 channel write 를 호출하지 않는다.

WO §3 "권한 정책 근거가 불명확하면 임의 강화하지 않는다" 및 §18 금지 항목에 따라
**부여하지 않고 현행 유지**한다. (`resolveCmsReadScope`/`authorizeCmsMutation` 이
CMS content 에서 operator 에게 write 를 주는 것은 그 축에 catalog·UI·consumer 가
모두 존재하기 때문이며, channel 축에는 그 셋이 없다.)

---

## §6. 무인증 write 판정 — `INTENTIONAL_DEVICE_INGEST` (UNKNOWN 0)

| 판정 축 | 관측 | 결론 |
|---|---|---|
| 의도의 명시성 | 두 핸들러 모두 `No authentication required (Player 신뢰 기반)` + `Fire-and-forget` 주석, WO-P5-CHANNEL-PLAYBACK-LOG-P0 / WO-P5-CHANNEL-HEARTBEAT-P1 로 기원 추적 가능 | 의도됨 |
| consumer 정합성 | player 클라이언트가 credential 을 **보내지 않도록** 작성되어 있고, 실패를 무시한다 | 의도됨 |
| 권한 상승 가능성 | body 의 `serviceKey`/`organizationId` 를 **읽지 않는다**. 두 값은 `channelRepo.findOne` 으로 얻은 channel row 에서 파생된다 | cross-service 주입 경로 없음 |
| 상태 변조 가능성 | Channel row 를 저장하지 않는다. telemetry insert 전용 | 관리 상태 변조 없음 |
| 존재하지 않는 channel | 404 로 종료, insert 없음 | 무제한 삽입 아님 |

→ **SECURITY_GAP 아님**. 다만 **잔여 리스크**는 명시해 둔다: channel UUID 를 아는
주체는 누구나 telemetry row 를 넣을 수 있다(신뢰 경계가 "UUID 를 앎"). 이를 닫으려면
**device credential 체계**가 필요하고, 그것은 WO §30 의 중지 조건이자 §29 범위 밖이므로
이 WO 에서 만들지 않는다. 후속 WO 후보로만 남긴다.

---

## §7. organization 경계 — `SERVICE_SCOPE_ONLY_FIXED` / `ORGANIZATION_SCOPE_UNRESOLVED`

`GET /` 는 `organizationId` 필터를 받고 `Channel.organizationId` 컬럼도 있으나,

- organization membership 을 확인하는 authorization 이 channel 축에 존재하지 않고,
- `organizationId` 를 보내는 consumer 도 없다.

따라서 이번 WO 는 **service scope 만 고정**하고(`SERVICE_SCOPE_ONLY_FIXED`),
organization ownership 은 제품 결정이 필요한 상태로 분리 기록한다
(`ORGANIZATION_SCOPE_UNRESOLVED`). 임의 설계하지 않았다(WO §15).

---

## §8. 구현 (최소 변경 1개소)

`apps/api-server/src/routes/channels/channels.routes.ts` — `GET /` 한 곳.

```ts
const scope = await resolveCmsReadScope({
  user: (req as any).user,
  serviceKey,
  roleChecker: roleAssignmentService,
  onError: (message) => console.warn('[Channels] platform admin role check failed:', message),
});
if (!scope.ok) {
  res.status(400).json(CMS_SERVICE_KEY_REQUIRED_ERROR);
  return;
}

const where: any = {};
if (scope.serviceKeys) {
  where.serviceKey = In(scope.serviceKeys);
}
```

- 권한 판정 근거는 **기존 SSOT 한 벌**(`resolveCmsReadScope` → `isCmsPlatformAdmin` →
  `roleAssignmentService.hasAnyRole(['platform:super_admin'])`).
- `` `${serviceKey}:operator` `` 같은 role 문자열 조립 **없음**(WO §7).
- `serviceKey` 없음을 admin 으로 간주하는 암묵적 bypass **없음** — 역할을 실제로 확인한다(WO §8).
- 새 alias mapping·서비스별 분기·frontend authorization **없음**(WO §16·§18).

### §8-1. 403 vs 404 (WO §19)

새 에러 계약을 만들지 않았다. 기존 플랫폼 관례를 그대로 따랐다.

- **scope 파라미터 누락** → `400 SERVICE_KEY_REQUIRED`
  (`cms-content-query.handler.ts` 3곳 + `cms-content-slot.handler.ts` 1곳과 동일한 상수/코드/상태값).
- **단건 미존재/범위 밖** → `404 NOT_FOUND` (존재 여부를 상태코드로 구분 노출하지 않는 기존 anti-enumeration 관례).
- **권한 부족 write** → `401`(미인증) / `403 FORBIDDEN`(비-admin), `requireAdmin` 기존 계약 그대로.

---

## §9. 회귀 테스트

신규 `apps/api-server/src/__tests__/channels-service-scoped-authorization-contract.spec.ts` — **30 tests**.
실제 라우터를 mount 하고 actor × endpoint 전수로 응답과 **repository 에 전달된 where 절**을 검증한다
(약한 import 검사 아님).

- ENUMERATION 7: anonymous/operator serviceKey 없음 → 400 **이면서 DB 도달 0**,
  platform admin → cross-service, `kpa` == `kpa-society` alias 동일 모집단,
  admin 도 serviceKey 주면 제한, cosmetics 조회에 kpa 모집단 미혼입.
- PUBLIC READ 4: 익명 단건 3종 200, 미존재 404.
- DEVICE INGEST 5: 익명 201, **body 의 serviceKey/organizationId 주입 무효**(channel row 파생 확인), Channel row 저장 없음.
- MANAGEMENT 12: write 4종 × (익명 401 / operator 403 + 저장 0), admin 201,
  canonical 저장(`kpa` → `kpa-society`), **ownership 이전**(operator 403 / admin 200 + `k-cosmetics` 로 canonical 접힘).
- 구조 불변식 3: role 문자열 조립 금지, serviceKey 동등 비교 분기 금지, CMS helper 재사용 확인(주석 제외 코드 본문 기준).

**기존 계약 테스트 갱신(skip/완화 아님)**: `channels-servicekey-canonical-scope.spec.ts` 의
"serviceKey 없으면 전체를 반환한다(기존 계약 유지)" 는 이번에 닫은 동작 그 자체이므로
"비-platform-admin 에게 400" 으로 **계약을 갱신**했다. `channels-typeorm-entity-registration.spec.ts`
의 두 테스트는 관심사가 entity 등록/오류 비노출이므로 경계를 만족하는 요청으로 조정했다.

전체: `196 suites / 3281 tests` 전부 통과, `tsc --noEmit` 0 error, `npm run build` 성공.

---

## §10. Frontend 영향

- **admin-dashboard 4화면 무영향**: ChannelList / ChannelFormModal / ChannelContentsPreview /
  ChannelOpsDashboard. 목록은 필터 미선택 시 serviceKey 없이 호출하지만 사용자가
  `platform:super_admin`(화면 진입 조건 자체가 그것)이므로 cross-service 가 유지된다.
  admin-dashboard 코드 변경 **0줄**.
- **signage-player-web**: `fetchChannel(id)` / `fetchChannelContents` / telemetry 2종 —
  **영향 없음**. `fetchChannelByCode` 만 `GET /channels?code=` 를 쓰는데, 서버에 `code`
  필터가 구현된 적이 없어 이미 `data[0]`(전 서비스 목록의 임의 첫 채널)을 돌려주던
  **결함 경로**였다. 이제 400 으로 명시적으로 실패한다 — 잘못된 채널을 조용히 재생하는 것보다 낫다.
  올바른 경로는 이미 존재하는 익명 `GET /channels/code/:code` 다.
  `?code=` 필터 구현과 player 배포는 WO §17·§29 에 따라 **범위 밖**, 별도 결함으로 유지한다.

---

## §11. 배포 / production smoke

**배포 확인**: Deploy API Server (Cloud Run) `ad0a8141f` success →
serving revision `o4o-core-api-03468-ddz`,
image `...o4o-api/api-server:ad0a8141f0be396cb829b3a7980ce923bdedd75c`
= 커밋 SHA 일치. CodeQL success.

**production auth smoke (익명, 2026-08-26, `https://api.neture.co.kr`) — 14/14 계약 일치, write 0**

| # | 요청 | 결과 | 계약 |
|---|---|---|---|
| 1 | GET `/api/v1/channels/health` | 200 `{status:ok}` | 정상 |
| 2 | GET `/api/v1/channels` | **400 `SERVICE_KEY_REQUIRED`** | 익명 cross-service enumeration 차단 ✔ |
| 3 | GET `?serviceKey=kpa` | 200 `total:0` | service-scoped read 허용 ✔ |
| 4 | GET `?serviceKey=kpa-society` | 200 `total:0` | alias == canonical ✔ |
| 5 | GET `?serviceKey=cosmetics` | 200 `total:0` | 타 서비스도 동일 규칙 ✔ |
| 6 | GET `/:id`(미존재) | 404 `NOT_FOUND` | device read 익명 유지 + 존재 비노출 ✔ |
| 7 | GET `/code/:code`(미존재) | 404 `NOT_FOUND` | 동일 ✔ |
| 8 | GET `/:id/contents`(미존재) | 404 `NOT_FOUND` | 동일 ✔ |
| 9 | POST `/` | 401 `AUTH_REQUIRED` | write 익명 차단 ✔ |
| 10 | PUT `/:id` | 401 `AUTH_REQUIRED` | ✔ |
| 11 | DELETE `/:id` | 401 `AUTH_REQUIRED` | ✔ |
| 12 | POST `/:id/heartbeat` | **404** (401 아님) | 무인증 도달 가능 = INTENTIONAL_DEVICE_INGEST 확인, 미존재 channel 이라 insert 0 ✔ |
| 13 | POST `/:id/playback-log` | **404** (401 아님) | 동일 ✔ |
| 14 | GET `/api/v1/admin/channels/ops` | 401 `AUTH_REQUIRED` | 관리 계열 차단 유지 ✔ |

production `channels` 테이블은 이 시점에도 0행이라 3~5 는 빈 목록이지만,
**400 과 200 의 분기 자체**가 경계 적용을 증명한다. 12·13 은 존재하지 않는 channel 을
대상으로 해 404 로 종료되므로 **row 생성 0** 이다 (WO §28: production DB write 0 유지).

**`ADMIN_BROWSER_SMOKE_BLOCKED`** — WO §25 의 admin 브라우저 스모크는
platform admin 자격증명이 이 세션에 없어 실행하지 못했다. 따라서
"platform admin 이 serviceKey 없이 목록을 받는다"는 경로는 **production 실측이 아니라**
(a) 코드 경로(`resolveCmsReadScope` → `isCmsPlatformAdmin`)와
(b) 회귀 테스트(actor matrix 30/30)로만 확인됐다. 완화·우회 없이 그대로 기록한다.

---

## §12. 남은 항목(범위 밖, 후속 WO 후보)

1. `?code=` 필터 미구현 + player 가 `/code/:code` 를 쓰지 않는 문제 (§17).
2. device credential 체계 — telemetry ingest 의 "UUID 를 앎 = 신뢰" 잔여 리스크 (§6).
3. `ORGANIZATION_SCOPE_UNRESOLVED` — organization ownership 정책 결정 (§7).
4. `channel.code` unique constraint 부재 (§29 범위 밖).
