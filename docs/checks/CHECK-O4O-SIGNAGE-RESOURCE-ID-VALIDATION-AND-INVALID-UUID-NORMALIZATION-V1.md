# CHECK-O4O-SIGNAGE-RESOURCE-ID-VALIDATION-AND-INVALID-UUID-NORMALIZATION-V1

- **WO**: `WO-O4O-SIGNAGE-RESOURCE-ID-VALIDATION-AND-INVALID-UUID-NORMALIZATION-V1`
- **작업일**: 2026-08-21
- **상태**: CLOSED
- **commit**: `60b6d33ac` (코드) · `<CHECK_COMMIT>` (본 문서)

---

## 1. 문제

Signage API 의 resource id path parameter 에 **UUID 형식이 아닌 값**이 들어오면
값이 그대로 repository/`dataSource.query` 로 내려가 Postgres 가
`invalid input syntax for type uuid: "not-a-uuid"` 를 던지고
공용 error handler 가 이를 **500 `INTERNAL_ERROR`** 로 응답했다.

형식 오류는 서버 오류가 아니라 **요청 오류**다. 그리고 이 문제는
`/media/:id` · `/schedules/:id` 두 곳의 문제가 아니라 Signage `:id` route **전반**의 패턴이었다.

---

## 2. 계약 (본 WO 로 확정)

| 입력 | 응답 |
|---|---|
| resource id 가 UUID 형식이 아님 | **400 `INVALID_ID`** (DB 도달 전 차단 · handler 미진입) |
| UUID 형식 정상 + 리소스 없음 | **404** (기존 동작 유지) |
| UUID 형식 정상 + 리소스 존재 | 기존 정상 동작 유지 |

우선순위(§10): `requireAuth(401)` → `validateServiceKey(400 INVALID_SERVICE_KEY)` → `resource guard(403)` → **id validation(400 INVALID_ID)** → handler

---

## 3. 수정 전 재현 (production, read-only)

대상: `https://api.neture.co.kr/api/signage/kpa-society/...` (revision 배포 전)
계정: KPA store owner / KPA operator (자격증명은 `docs/local/TEST-ACCOUNTS.local.md` — 본 문서에 기록하지 않는다)

| 요청 | 수정 전 | 실제 원인 |
|---|---|---|
| `GET /media/not-a-uuid` | **500** `INTERNAL_ERROR` | `invalid input syntax for type uuid` |
| `GET /schedules/not-a-uuid` | **500** `INTERNAL_ERROR` | 동일 |
| `GET /media/<valid-missing-uuid>` | 404 | 대조군 — 정상 |
| `GET /schedules/<valid-missing-uuid>` | 404 | 대조군 — 정상 |

`:id` 를 받는 **모든** route 에서 동일하게 재현됐다 (아래 §4 census 의 "수정 전" 열).

**예외 (형식 검사보다 body/enum 검증이 먼저 걸려 500 이 아니던 route)**

- `PATCH /hq/{playlists,media}/:id/status` → 400 `"Invalid status"`
- `PATCH /hq/forced-content/:id` → 400 `INVALID_INPUT` `"Nothing to update"`
- `GET /global/{media,playlists}/:source` → 400 `"Invalid source. Must be: hq, supplier, or community"` (`:source` 는 UUID 가 아님)

---

## 4. `:id` route 전수 census (미조사 0)

mount (`apps/api-server/src/bootstrap/register-routes.ts`)
- `app.use('/api/signage/:serviceKey/public', signagePublicRoutes)` — L1011 (먼저 등록)
- `app.use('/api/signage/:serviceKey', signageRoutes)` — L1020

`/api/v1` 하위가 아니다.

### 4-1. 인증 router (`signage.routes.ts`) — 전체 67 route / UUID parameter 보유 **39**

| # | Method | Path | parameter | guard | 수정 전 | 수정 후 |
|---:|---|---|---|---|---|---|
| 1 | GET | `/playlists/:id` | id | OperatorOrStore | 500 | 400 |
| 2 | PATCH | `/playlists/:id` | id | Store | 500 | 400 |
| 3 | DELETE | `/playlists/:id` | id | Store | 500 | 400 |
| 4 | GET | `/playlists/:playlistId/items` | playlistId | OperatorOrStore | 500 | 400 |
| 5 | POST | `/playlists/:playlistId/items` | playlistId | OperatorOrStore | 500 | 400 |
| 6 | POST | `/playlists/:playlistId/items/bulk` | playlistId | OperatorOrStore | 500 | 400 |
| 7 | POST | `/playlists/:playlistId/items/reorder` | playlistId | OperatorOrStore | 500 | 400 |
| 8 | PATCH | `/playlists/:playlistId/items/:itemId` | playlistId, itemId | OperatorOrStore | 500 | 400 |
| 9 | DELETE | `/playlists/:playlistId/items/:itemId` | playlistId, itemId | OperatorOrStore | 500 | 400 |
| 10 | GET | `/media/:id` | id | OperatorOrStore | 500 | 400 |
| 11 | PATCH | `/media/:id` | id | Store | 500 | 400 |
| 12 | DELETE | `/media/:id` | id | Store | 500 | 400 |
| 13 | GET | `/schedules/:id` | id | Store | 500 | 400 |
| 14 | PATCH | `/schedules/:id` | id | Store | 500 | 400 |
| 15 | DELETE | `/schedules/:id` | id | Store | 500 | 400 |
| 16 | GET | `/templates/:id` | id | StoreRead | 500 | 400 |
| 17 | PATCH | `/templates/:id` | id | Operator | 500 | 400 |
| 18 | DELETE | `/templates/:id` | id | Operator | 500 | 400 |
| 19 | GET | `/templates/:templateId/zones` | templateId | StoreRead | 500 | 400 |
| 20 | POST | `/templates/:templateId/zones` | templateId | Operator | 500 | 400 |
| 21 | PATCH | `/templates/:templateId/zones/:zoneId` | templateId, zoneId | Operator | 500 | 400 |
| 22 | DELETE | `/templates/:templateId/zones/:zoneId` | templateId, zoneId | Operator | 500 | 400 |
| 23 | GET | `/content-blocks/:id` | id | StoreRead | 500 | 400 |
| 24 | PATCH | `/content-blocks/:id` | id | Operator | 500 | 400 |
| 25 | DELETE | `/content-blocks/:id` | id | Operator | 500 | 400 |
| 26 | GET | `/layout-presets/:id` | id | StoreRead | 500 | 400 |
| 27 | PATCH | `/layout-presets/:id` | id | Operator | 500 | 400 |
| 28 | DELETE | `/layout-presets/:id` | id | Operator | 500 | 400 |
| 29 | PATCH | `/hq/playlists/:id/status` | id | Operator | 400(body 우선) | 400 `INVALID_ID` |
| 30 | PATCH | `/hq/media/:id/status` | id | Operator | 400(body 우선) | 400 `INVALID_ID` |
| 31 | PATCH | `/hq/playlists/:id` | id | Operator | 500 | 400 |
| 32 | PATCH | `/hq/media/:id` | id | Operator | 500 | 400 |
| 33 | DELETE | `/hq/playlists/:id` | id | Operator | 500 | 400 |
| 34 | GET | `/hq/media/:id/usage` | id | Operator | 500 | 400 |
| 35 | DELETE | `/hq/media/:id` | id | Operator | 500 | 400 |
| 36 | PATCH | `/hq/forced-content/:id` | id | Operator | 400 `INVALID_INPUT` | 400 `INVALID_ID` |
| 37 | DELETE | `/hq/forced-content/:id` | id | Operator | 500 | 400 |
| 38 | DELETE | `/community/media/:id` | id | Community | 500 | 400 |
| 39 | DELETE | `/community/playlists/:id` | id | Community | 500 | 400 |

**적용 제외 (UUID parameter 아님)**
- `GET /global/playlists/:source` · `GET /global/media/:source` — `:source` 는 `hq|supplier|community` **enum**. 이미 handler 가 400 을 반환한다.
- 나머지 26 route 는 path parameter 가 없다 (`/media`, `/media/library`, `/schedules/calendar`, `/templates/preview`, `/active-content`, `/upload/presigned`, `/ai/generate` 등).

### 4-2. 공개 router (`signage-public.routes.ts`)

| Method | Path | 수정 전 | 수정 후 |
|---|---|---|---|
| GET | `/public/media/:id` | 500 (`dataSource.query` 직접 전달) | 400 `INVALID_ID` |
| GET | `/public/playlists/:id` | 500 | 400 `INVALID_ID` |
| GET | `/public/media` · `/public/playlists` | parameter 없음 | 변경 없음 |
| POST | `/public/playback/log` | body `mediaId` 를 **이미** UUID 검사 (400 `INVALID_MEDIA_ID`) | 변경 없음 |

### 4-3. 미마운트 (dead code)

`apps/api-server/src/routes/signage/extensions/**` 의 `createExtensionRouters` 는
`apps/api-server/src` 어디에서도 mount 되지 않는다 (grep 결과 호출처 0).
pharmacy / cosmetics / seller `:id` route 는 **도달 불가**이므로 수정 대상에서 제외했다.
→ §14 잔존 debt 로 기록한다 (은퇴 판단은 별도 WO).

---

## 5. ID 타입 판정 (§5 — UUID 라고 가정하지 않는다)

근거: entity 정의 + migration DDL.

| 대상 | 근거 | 타입 |
|---|---|---|
| `SignageMedia` · `SignagePlaylist` · `SignagePlaylistItem` · `SignageSchedule` · `SignageTemplate` · `SignageTemplateZone` · `SignageContentBlock` · `SignageLayoutPreset` | `packages/digital-signage-core/src/backend/entities/*.entity.ts` — 전부 `@PrimaryGeneratedColumn('uuid')` + `id!: string` | **UUID** |
| `signage_forced_content` | `20260418100000-CreateSignageForcedContent.ts` — `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` | **UUID** |
| `:source` (global route) | controller 의 enum 검증 (`hq` / `supplier` / `community`) | **enum — UUID 아님** |
| `:serviceKey` | `@o4o/security-core` canonical service key | **string key — UUID 아님** |

→ numeric / slug / composite id 는 Signage 에 **없다**. UUID resource 에만 validation 을 적용했다.

---

## 6. 기존 validation 경로 조사 (§6 — 새 체계를 만들지 않는다)

| 후보 | 결과 |
|---|---|
| `apps/api-server/src/middleware/**` 의 UUID/param validator | **없음** (auth · scope · error-handler · rate-limiter · upload · tenant · signage-role 등만 존재) |
| `ParseUUIDPipe` 유사 helper · 공통 request validator · route param schema | **없음** |
| controller local helper | **다수 존재** — 각 controller 가 `UUID_RE` 상수와 `rejectsMalformedId(req,res)` 를 로컬 정의 (예: `PharmacyHubStoreContentController.ts:99-106`) |

→ 재사용할 공통 middleware 자체가 없어서, **기존 로컬 helper 와 동일한 계약**을 갖는
최소 route-layer middleware 하나를 새로 만들고 Signage 에만 명시 wiring 했다.
Signage 전용 체계를 만든 것이 아니라, 기존 계약을 middleware 형태로 재사용 가능하게 한 것이다.

---

## 7. canonical 4xx 계약 판정 (§7)

저장소 전수 조사:

| code | 사용처 수 |
|---|---|
| `INVALID_ID` (HTTP 400) | **42** |
| `INVALID_IDS` (HTTP 400) | 4 |
| 형식 오류에 404 를 쓰는 사례 | 0 |

Signage 내부 선례: `POST /public/playback/log` 가 `mediaId` 를 UUID 검사해 **400** 을 반환한다.

→ **판정: HTTP 400 + `{ success: false, error: 'Invalid <param>', code: 'INVALID_ID' }`**
형식 정상 + 리소스 없음은 기존대로 404. Signage 만의 독자 응답 형식은 만들지 않았다.

---

## 8. 수정 내용

### 8-1. 신규 — `apps/api-server/src/middleware/validate-uuid-param.middleware.ts`

```ts
export const UUID_PARAM_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuidParam = (v: unknown): v is string => typeof v === 'string' && UUID_PARAM_REGEX.test(v);

export function validateUuidParams(...names: string[]) {
  const validateUuidParams = (req, res, next) => {
    for (const name of names) {
      if (!isUuidParam(req.params?.[name])) {
        res.status(400).json({ success: false, error: `Invalid ${name}`, code: 'INVALID_ID' });
        return;
      }
    }
    next();
  };
  return validateUuidParams;      // 이름 있는 함수 — router stack 회귀 테스트에서 식별 가능
}
```

### 8-2. wiring

- `signage.routes.ts` — 39 route: `router.<m>('<path>', <guard>, validateUuidParams(...), <handler>)`
- `signage-public.routes.ts` — 2 route (guard 는 `validateServiceKey` 가 router-level)

### 8-3. §8 금지 항목 준수

| 금지 | 준수 |
|---|---|
| repository DB error 를 catch 해 400 으로 변환 | ✅ 하지 않음 (DB 도달 전 차단) |
| Postgres `invalid input syntax for uuid` 문자열 검사 | ✅ 없음 |
| controller 마다 `isUUID` 복붙 | ✅ 없음 (route layer 1곳) |
| `id === '특정 문자열'` 예외 분기 | ✅ 없음 |
| DB cast exception 을 정상 flow 로 사용 | ✅ 없음 |
| 모든 API 에 전역 UUID 정책 강제 (§17) | ✅ 하지 않음 — Signage route 에만 명시 wiring |

---

## 9. 자동 테스트 (§11 · §12)

신규 `apps/api-server/src/__tests__/signage-resource-id-validation.spec.ts` — **99 케이스 전부 통과**

| 그룹 | 내용 |
|---|---|
| census | UUID parameter route **39개 전수**가 validator 를 갖는지 router stack 으로 확인 (숫자 고정 → 신규 `:id` route 추가 시 실패) · public 2개 확인 · validator 위치가 **guard 뒤 · handler 앞**인지 확인 |
| invalid → 400 | 39 route × invalid id → 400 `INVALID_ID` + **handler 미진입** · 잘못된 id 5형태 · write(PATCH/DELETE) 8건(§12) · 복합 parameter 두 번째만 잘못돼도 400 · public 2건은 **DB 미호출**까지 확인 |
| valid → 통과 | 39 route × valid UUID → handler 진입 + parameter 원문 전달 · 대문자 UUID 통과 |
| static (§9) | `/media/library` · `/schedules/calendar` · `/templates/preview` 가 validator 에 잡히지 않고 각자 handler 진입 |
| `:source` (§5) | `/global/media/hq` handler 진입 · `/global/playlists/bogus` 는 `INVALID_ID` 가 **아니고** handler 가 판정 |
| 우선순위 (§10) | 미인증+invalid → 401 · invalid serviceKey+invalid → 400 `INVALID_SERVICE_KEY` · 미소유 org+invalid → 403 · public 은 serviceKey 우선 — 모두 handler 미진입 |

기존 spec 2건(`signage-media-library-route-order` · `signage-schedule-route-order`)은
guard chain 동일성 비교에서 **형식 validator 를 제외**하도록 갱신했다
(권한 계약 비교이지 형식 검사 비교가 아니다).

**전체 결과**: `apps/api-server` Jest **166 suites / 2,657 tests 전부 통과**.
`tsc --noEmit`: Signage · middleware 관련 신규 오류 **0**
(잔여 오류는 fresh worktree 에서 workspace 패키지 build 산출물이 없어 생기는 기존 `TS2307` 및 본 WO 와 무관한 기존 2건).

---

## 10. 권한 / serviceKey 회귀 (§10)

| 시나리오 | 기대 | 결과 |
|---|---|---|
| 미인증 | 401 `AUTH_REQUIRED` | ✅ 불변 |
| 알 수 없는 serviceKey | 400 `INVALID_SERVICE_KEY` | ✅ 불변 |
| 타 서비스 / 미소유 org | 403 | ✅ 불변 |
| 자기 서비스 + 자기 org | 정상 | ✅ 불변 |

id validation 은 **guard 뒤**에 있으므로 잘못된 id 로 권한 정보를 흘리지 않는다
(권한 없는 사용자에게는 403 이 먼저 나가고 `INVALID_ID` 는 노출되지 않는다).

---

## 11. static reserved-word 충돌 재탐색 (§13)

`signage.routes.ts`(67) · `signage-public.routes.ts` 의 모든 등록을 파싱해
**같은 method · 같은 segment 수의 param route 보다 뒤에 등록된 static route** 를 검사했다.

```
signage.routes.ts        static-after-dynamic collision: 0
signage-public.routes.ts static-after-dynamic collision: 0
```

→ `/media/library` 케이스(직전 WO 에서 수정) 외에 남은 shadowing 은 **없다**. 미조사 0.

---

## 12. Production smoke (§14 — read-only)

- revision: ``o4o-core-api-03411-gmb``
- 대상: `https://api.neture.co.kr/api/signage/kpa-society/...`

### 12-1. invalid id → 400 `INVALID_ID` (기존 500 전부 소멸)

인증 router 33개 요청 조합(GET/PATCH/DELETE/POST · store 계정 + operator 계정) 전부:

```
{"success":false,"error":"Invalid id","code":"INVALID_ID"}          ← 400
{"success":false,"error":"Invalid playlistId","code":"INVALID_ID"}  ← 400 (복합 parameter)
{"success":false,"error":"Invalid templateId","code":"INVALID_ID"}  ← 400
```

대상: `/media/:id`(GET·PATCH·DELETE) · `/playlists/:id`(GET·PATCH·DELETE) ·
`/schedules/:id`(GET·PATCH·DELETE) · `/templates/:id`(GET·PATCH·DELETE) ·
`/content-blocks/:id`(GET·PATCH·DELETE) · `/layout-presets/:id`(GET·PATCH·DELETE) ·
`/playlists/:playlistId/items`(GET·POST) · `/templates/:templateId/zones`(GET) ·
`/hq/media/:id`(PATCH·DELETE) · `/hq/media/:id/status` · `/hq/media/:id/usage` ·
`/hq/playlists/:id`(PATCH·DELETE) · `/hq/playlists/:id/status` ·
`/hq/forced-content/:id`(PATCH·DELETE) · `/community/{media,playlists}/:id`(DELETE)

**500 발생 0건.**

### 12-2. valid-but-missing → 404 (기존 계약 유지)

```
/media/{miss}          → 404 {"error":"Media not found"}
/playlists/{miss}      → 404 {"error":"Playlist not found"}
/schedules/{miss}      → 404 {"error":"Schedule not found"}
/templates/{miss}      → 404 {"error":"Template not found"}
/content-blocks/{miss} → 404 {"error":"Content block not found"}
/layout-presets/{miss} → 404 {"error":"Layout preset not found"}
/hq/media/{miss}/usage → 404 MEDIA_NOT_FOUND
/hq/playlists/{miss}   → 404 PLAYLIST_NOT_FOUND
/community/{media,playlists}/{miss} → 404 NOT_FOUND
```

body/enum 검증이 먼저 걸리는 route 는 수정 전과 동일하게 유지된다
(`/hq/*/:id/status` → 400 `"Invalid status"`, `PATCH /hq/forced-content/:id` → 400 `INVALID_INPUT`).

### 12-3. valid + 존재 → 정상 (기존 동작 유지)

실 데이터가 있는 공개 route 로 확인했다.

```
GET /kpa-society/public/media/c44ed8dc-e880-44d1-ba5d-d254f493f829     → 200
GET /kpa-society/public/playlists/64bcf16f-b864-4df0-9c54-f9ac46ffb8a3 → 200
GET /kpa-society/media/library                                        → 200 (실제 row 반환)
```

> KPA 매장 org 의 `signage_media` / `signage_playlists` 는 **0행**이라
> 인증 detail route 의 "존재" 케이스는 프로덕션 데이터로 확인할 수 없었다
> (WO §16 에서 "Signage 데이터 0행"은 제외 범위). 대신 valid UUID 가
> handler 까지 도달해 404 를 반환하는 것으로 통과를 확인했고,
> handler 진입 자체는 §9 자동 테스트가 39 route 전수로 고정한다.

### 12-4. 공개 router · 타 서비스

```
kpa-society / k-cosmetics / glycopharm
  GET /public/media/not-a-uuid     → 400 INVALID_ID
  GET /public/playlists/not-a-uuid → 400 INVALID_ID
  GET /public/media/{miss}         → 404 Media not found
```

### 12-5. `:source` (UUID 아님) — 기존 계약 유지

```
GET /global/media/not-a-uuid     → 400 {"error":"Invalid source. Must be: hq, supplier, or community"}
GET /global/playlists/not-a-uuid → 400 (동일)
```

`INVALID_ID` 로 바뀌지 않았다.

### 12-6. static route (§9)

```
GET /media/library      → 200 (실제 목록 반환)
GET /schedules/calendar → 400 {"error":"startDate and endDate are required"}   ← handler 진입 정상
```

### 12-7. 우선순위 (§10)

```
미인증 + invalid id            → 401 AUTH_REQUIRED
invalid serviceKey + invalid id → 400 INVALID_SERVICE_KEY
```

**DB write 0** — GET 조회와 형식 오류 요청만 수행했고, 실제 삭제/수정 대상 UUID 는 사용하지 않았다.

---

## 13. Browser 회귀 (§15)

revision `o4o-core-api-03411-gmb` 배포 후, KPA store owner 계정으로 실제 브라우저(Playwright · 격리 context) 접속.

| 서비스 | 화면 | 본문 렌더 | console error | Signage API 4xx/5xx |
|---|---|---|---|---|
| KPA (`kpa-society.co.kr`) | `/store/marketing/signage/playlist` | ✅ | 0 | 0 |
| KPA | `/store/marketing/signage/videos` | ✅ | 0 | 0 |
| KPA | `/store/marketing/signage/schedules` | ✅ | 0 | 0 |
| KPA | `/store/marketing/signage/player` | ✅ | 0 | 0 |
| KPA | `/store-hub/signage` | ✅ | 0 | 0 |
| K-Cosmetics (`k-cosmetics.site`) | `/store-hub/signage` | ✅ | 0 | 0 |
| GlycoPharm (`glycopharm.co.kr`) | `/store-hub/signage` | ✅ | 0 | 0 |

white screen 0 · JS exception 0 · 신규 4xx/5xx 0 ·
`/media/library` · `/schedules/calendar` 정상 유지.

---

## 14. 잔존 debt (이번 범위 밖 — 별도 WO 대상)

1. **`routes/signage/extensions/**` 미마운트 dead code** — `createExtensionRouters` 호출처 0.
   도달 불가 route 이므로 이번에 수정하지 않았다. 은퇴/복구 판단 필요.
2. **`DELETE /hq/forced-content/<존재하지 않는 valid UUID>` → 200 `{deleted:true}`** —
   soft-delete UPDATE 의 affected row 수를 확인하지 않아 404 대신 200 이 나간다.
   0 rows 이므로 데이터 영향은 없으나 계약 위반이다 (본 WO 는 형식 오류 범위).
3. **controller local `UUID_RE` 중복** — 저장소 전반에 로컬 helper 가 흩어져 있다.
   이번에 만든 `validateUuidParams` 로 수렴시킬 수 있으나, 전역 적용은 §17 금지 사항이므로
   서비스별 별도 WO 로 진행해야 한다.

---

## 15. DB · schema 영향

- migration **0건** · schema 변경 **0건** · production data write **0건**
- 오히려 DB 호출이 **줄었다** (형식 오류 요청이 DB 에 도달하지 않는다)

---

## 16. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건 (§14)
