# CHECK-O4O-SIGNAGE-SCHEDULES-CALENDAR-ROUTE-SHADOWING-FIX-V1

- **WO**: `WO-O4O-SIGNAGE-SCHEDULES-CALENDAR-ROUTE-SHADOWING-FIX-V1`
- **일자**: 2026-08-20
- **대상**: `apps/api-server/src/routes/signage/signage.routes.ts` (Signage schedule route 등록 순서)
- **판정**: **FIXED** — route shadowing 해소. calendar 500 = 0.

---

## 1. 문제

`GET /api/signage/:serviceKey/schedules/calendar` 가 먼저 등록된 `GET /schedules/:id` 에 매칭되어
`getScheduleCalendar` 대신 `getSchedule` 이 실행됐다. `id='calendar'` 가 그대로 SQL 로 내려가
`invalid input syntax for type uuid: "calendar"` → **500**.

Express 는 등록 순서로 매칭한다. static path 가 같은 prefix 의 dynamic param route 뒤에 등록되면 가려진다.

---

## 2. 수정 전 재현 (production, `api.neture.co.kr`)

로그인 계정은 `docs/local/TEST-ACCOUNTS.local.md` (gitignored) 의 매장 계정. DB write 0 · 조회만.

| serviceKey | 요청 | 결과 |
|---|---|---|
| kpa-society | `/schedules/calendar?startDate=2026-08-01&endDate=2026-08-31` | **500** `INTERNAL_ERROR` / `invalid input syntax for type uuid: "calendar"` |
| kpa-society | `/schedules/calendar` (query 없음) | **500** 동일 |
| k-cosmetics | `/schedules/calendar` (query 유/무) | **500** 동일 |
| glycopharm | `/schedules/calendar` (query 유/무) | **500** 동일 |

**진입 handler 확정 근거**: `getScheduleCalendar` 는 `startDate`/`endDate` 누락 시 400 을 먼저 반환한다.
query 없이 호출해도 400 이 아니라 uuid cast 500 이 났다 → calendar handler 에 **들어가지 않았다**.
실제 진입 handler 는 `getSchedule`(detail) 이다.

### 정상 대조군

| 요청 | 결과 |
|---|---|
| `/schedules` | 200 `{"data":[],"meta":{...,"total":0}}` (3 서비스 모두 0행) |
| `/schedules/<random-uuid>` | 404 `{"error":"Schedule not found"}` |
| `/schedules/not-a-uuid` | **500** `invalid input syntax for type uuid: "not-a-uuid"` (기존 결함 · §7 참조) |

### Guard 기준선 (수정 전)

| 조건 | 결과 |
|---|---|
| calendar 미인증 | 401 `AUTH_REQUIRED` |
| calendar 알 수 없는 serviceKey | 400 `INVALID_SERVICE_KEY` |
| calendar 타 서비스 org | 403 `SIGNAGE_STORE_REQUIRED` |
| calendar organization 헤더 없음 | 400 `ORGANIZATION_ID_REQUIRED` |

→ middleware chain 은 정상이었고, **handler 선택만** 잘못돼 있었다.

---

## 3. Route census (schedule 관련 전수)

mount: `app.use('/api/signage/:serviceKey', signageRoutes)` — `/api/v1` 아래가 아니다.
router 공통 chain: `router.use(requireAuth)` → `router.use(validateServiceKey)` → per-route guard.

| 등록 순서(수정 전) | Method / Path | Guard | Handler | Frontend 소비처 |
|---|---|---|---|---|
| L107 | GET `/schedules` | `requireSignageStore` | `getSchedules` | KPA `api/signageSchedule.ts`, GP `api/signageSchedule.ts` |
| L110 | POST `/schedules` | `requireSignageStore` | `createSchedule` | KPA, GP |
| L113 | GET `/schedules/:id` | `requireSignageStore` | `getSchedule` | (직접 호출 없음 — 목록만 사용) |
| L116 | PATCH `/schedules/:id` | `requireSignageStore` | `updateSchedule` | KPA, GP |
| L119 | DELETE `/schedules/:id` | `requireSignageStore` | `deleteSchedule` | KPA, GP |
| L124 | GET `/active-content` | `allowSignageStoreRead` | `resolveActiveContent` | KPA `signageSchedule.ts`, `services/signage-player-web` `ScheduleResolver.ts` |
| **L197** | GET `/schedules/calendar` | `requireSignageStore` | `getScheduleCalendar` | **소비처 0** |
| L201 | POST `/upload/presigned` | `requireSignageOperatorOrStore` | `getPresignedUploadUrl` | (schedule controller 소속이나 schedule 도메인 아님) |

- `signage.routes.ts` 하위에 sub-router 는 없다 (`router.use` 는 `requireAuth` / `validateServiceKey` 2건뿐).
- `signage-public.routes.ts` · extension router 에 schedule route 없음.
- `/schedules/:id/*` 형태의 하위 route 없음.
- 미조사 0.

---

## 4. 원인 확정

**A — static route 가 dynamic route 뒤에 등록됨.**

- router stack 상 GET `/schedules/:id` (L113) 가 GET `/schedules/calendar` (L197) 보다 앞이다.
- B(mount 순서) 아님 — mount 는 1곳이고 prefix 충돌 없음.
- C(wildcard 과다) 아님 — `:id` 는 단일 segment param.
- D(controller 내부 dispatch) 아님 — `getSchedule` 이 그대로 실행됐다.

---

## 5. 수정 (최소)

`signage.routes.ts` 한 곳. static route 등록 위치만 `POST /schedules` 다음, `GET /schedules/:id` 앞으로 이동.
middleware(`requireSignageStore`)·handler·path 문자열 모두 **불변**.

```ts
  // GET /api/signage/:serviceKey/schedules/calendar - Get schedule calendar view
  // NOTE: static path MUST stay registered before '/schedules/:id',
  // otherwise Express matches it as :id='calendar' (route shadowing).
  router.get('/schedules/calendar', requireSignageStore, scheduleCtrl.getScheduleCalendar);
```

금지 항목 준수: controller 에서 `id === 'calendar'` 특별 처리 없음 · 가짜 schedule id 취급 없음 ·
에러 후 다른 handler 로 redirect 없음 · 프론트 URL 우회 없음.

---

## 6. `:id` constraint 판단 (WO §7)

**도입하지 않는다.**

- `/schedules/not-a-uuid` → 500 은 calendar 와 **별개의 기존 결함**이며, 이번 수정 전후로 동일하다.
- `:id` 에 UUID constraint 를 붙이면 not-a-uuid 응답이 500 → 404 로 바뀐다.
  WO §10 은 detail route 의 **기존 계약 유지**를 요구하므로 이번 범위에서 임의 도입하지 않는다.
- **잔존 기술부채**로 기록한다: signage schedule detail/update/delete 의 `:id` 는 uuid 형식 검증 없이
  DB 로 내려가 500 을 만든다. 400/404 로 정규화하려면 별도 WO 가 필요하다.

---

## 7. Calendar API 계약 (소비처 0이어도 고정)

| 항목 | 값 |
|---|---|
| Path | `GET /api/signage/:serviceKey/schedules/calendar` |
| Guard | `requireAuth` → `validateServiceKey` → `requireSignageStore` |
| Query | `startDate` (필수), `endDate` (필수), `channelId` (선택) |
| 누락 시 | 400 `startDate and endDate are required` |
| Scope | `extractScope(req)` — `serviceKey`(canonical) + `organizationId`(X-Organization-Id) |
| Repository 필터 | `serviceKey` AND `organizationId` AND `deletedAt IS NULL` AND `isActive = true` AND validFrom/validUntil 범위 AND (channelId 일치 또는 NULL) |
| Response | `{ data: { events: ScheduleCalendarEventDto[], startDate, endDate } }` |
| Event 필드 | `scheduleId, scheduleName, playlistId, storePlaylistId, playlistName, startTime, endTime, daysOfWeek, priority, date` |
| 데이터 0행 | `events: []` 정상 |

---

## 8. 자동 테스트

신규 `apps/api-server/src/__tests__/signage-schedule-route-order.spec.ts` — 12 케이스, DB 미접속.

- router stack: GET `/schedules/calendar` 등록 index < GET `/schedules/:id`
- calendar route 와 detail route 의 **guard chain 동일** (route 이동 시 middleware 누락 방지)
- dispatch: `/schedules/calendar` → `getScheduleCalendar` 진입, `getSchedule` 미진입
- query 없이도 calendar handler 선택 (handler 선택은 query 와 무관)
- `/schedules/:validUuid` → `getSchedule` · `/schedules` → `getSchedules`
- PATCH/DELETE `/schedules/:id` 회귀 없음 · k-cosmetics / glycopharm 동일 동작
- guard 회귀: 미인증 401 · 알 수 없는 serviceKey 400 · org 헤더 없음 400 · 타 서비스 org 403 (모두 handler 미진입)

**비공허성 확인**: 수정 전 코드(`git checkout -- signage.routes.ts`)로 동일 스펙 실행 시 **4 케이스 FAIL**,
수정 후 12/12 PASS.

`validateServiceKey` / `requireSignageStore` 는 실제 구현을 사용하고, `AppDataSource.query` 와
`requireAuth`(토큰 없으면 401 계약)만 stub 으로 대체했다.

---

## 9. 검증 결과

| 항목 | 결과 |
|---|---|
| `signage-schedule-route-order.spec.ts` | PASS (12) |
| `signage-cross-service-org-guard.spec.ts` | PASS |
| `signage-servicekey-canonicalization.spec.ts` | PASS |
| api-server `tsc --noEmit` | PASS |
| api-server 전체 Jest | **PASS — 164 suites / 2541 tests** |
| production API smoke | (아래 §10 기록) |
| KPA / KCos / GP browser 회귀 | (아래 §12 기록) |

> 참고: `packages/financial-core` 의 `tsup: No input files` 빌드 실패는 이번 변경과 무관한 **기존 상태**이며,
> `--no-bail` 로 나머지 패키지를 빌드한 뒤 typecheck 를 수행했다.

---

## 10. Production 검증 (배포 후)

*배포 후 기록*

---

## 11. 전체 Jest

`apps/api-server` 전체 Jest: **164 suites / 2541 tests 전부 PASS** (실패 0 · skip 0).
(직전 baseline 163 suites / 2529 tests + 이번 신규 스펙 1 suite / 12 tests)

---

## 12. Browser 회귀

*기록*

---

## 13. 범위 외 발견 (수정하지 않음 · 별도 WO 제안)

**`GET /api/signage/:serviceKey/media/library` 가 같은 유형의 shadowing 결함이다.**

- `GET /media/:id` (L97, `requireSignageOperatorOrStore`) 가 `GET /media/library` (L198, `allowSignageStoreRead`) 보다 먼저 등록돼 있다.
- production 실측: `/media/library` → **500** `invalid input syntax for type uuid: "library"`.
- 단순 순서 이동이 아니라 **적용되는 guard 가 바뀌는**(`requireSignageOperatorOrStore` → `allowSignageStoreRead`) 변경이므로
  권한 판단이 필요하다. 이번 WO 범위(schedules calendar) 밖이라 수정하지 않고 별도 WO 로 분리한다.

---

## 14. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건
(① signage `/media/library` route shadowing ② signage schedule `:id` uuid 형식 미검증 500)
