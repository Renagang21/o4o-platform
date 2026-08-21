# CHECK — Signage HQ Forced Content 삭제 NOT_FOUND 정규화

- **WO**: `WO-O4O-SIGNAGE-FORCED-CONTENT-DELETE-NOT-FOUND-NORMALIZATION-V1`
- **작성일**: 2026-08-21
- **기준 commit**: `2ea6cd81f` (worktree 생성 시점) → 최종 `4a3550360` (코드)
- **작업공간**: `C:/tmp/o4o-signage-fc` (fresh worktree · branch `work/signage-forced-delete`)
- **판정**: **결함 확정 · 수정 완료** (idempotent DELETE 정책 아님)

---

## 1. 문제

```text
DELETE /api/signage/:serviceKey/hq/forced-content/<valid-but-missing-uuid>
→ 200 { "success": true, "data": { "id": "...", "deleted": true } }
```

DB 는 0행 변경. 즉 **존재하지 않는 리소스 삭제가 성공으로 보고**된다.

조사 중 **같은 근본 원인의 두 번째 결함**을 발견했다.

```text
PATCH /api/signage/:serviceKey/hq/forced-content/<valid-but-missing-uuid>
→ 200 { "success": true, "data": [] }
```

---

## 2. 수정 전 재현 (production · 2026-08-21)

`sohae2100@gmail.com` (operator) 로 3개 서비스 모두 재현. missing UUID 만 사용 →
**0-row DELETE · 데이터 변경 0**.

| 요청 | kpa-society | k-cosmetics | glycopharm |
|---|---|---|---|
| `GET /hq/forced-content` | 200 `data:[]` | 200 `data:[]` | 200 `data:[]` |
| `DELETE .../{missing}` | **200 `{deleted:true}`** | **200 `{deleted:true}`** | **200 `{deleted:true}`** |
| `DELETE .../not-a-uuid` | 400 `INVALID_ID` | 400 `INVALID_ID` | 400 `INVALID_ID` |
| `PATCH .../{missing}` | **200 `data:[]`** | **200 `data:[]`** | **200 `data:[]`** |
| `PATCH .../not-a-uuid` | 400 `INVALID_ID` | 400 `INVALID_ID` | 400 `INVALID_ID` |

우선순위 확인:

```text
미인증 DELETE            → 401 AUTH_REQUIRED
잘못된 serviceKey DELETE → 401 AUTH_REQUIRED (requireAuth 가 먼저 — 기존 계약)
```

경로 요약:

| 항목 | 값 |
|---|---|
| route | `apps/api-server/src/routes/signage/signage.routes.ts:277` |
| guard | `requireAuth` → `validateServiceKey` → `requireSignageOperator` → `validateUuidParams('id')` |
| controller | `SignageForcedContentController.remove` |
| service/repository | **없음** — controller 가 `dataSource.query` 직접 호출 |
| 실행 방식 | raw SQL `UPDATE signage_forced_content SET deleted_at = NOW() ... RETURNING id` (soft delete) |
| row count | 판정에 사용되지 않았음 (아래 §5) |
| response 생성 위치 | `forced-content.controller.ts` `remove()` 말미 `res.json({ success: true, data: { id, deleted: true } })` |

---

## 3. Forced-content endpoint 전수 census (미조사 0)

route 정의: `signage.routes.ts:267~277`. **`GET detail` endpoint 는 존재하지 않는다.**

| # | method / path | guard | handler | ID 계약 | 수정 전 missing 응답 | repository/service | frontend consumer |
|---|---|---|---|---|---|---|---|
| 1 | `GET /hq/forced-content` | operator | `list` | — | — (collection) | controller raw `SELECT` | HQContentManager · operator-core-ui · web-glycopharm |
| 2 | `POST /hq/forced-content` | operator | `create` | — | — (create) | controller raw `INSERT ... RETURNING` | 동일 |
| 3 | `PATCH /hq/forced-content/:id` | operator + `validateUuidParams('id')` | `update` | UUID | **200 `data:[]`** ❌ | controller raw `UPDATE ... RETURNING` | 동일 |
| 4 | `DELETE /hq/forced-content/:id` | operator + `validateUuidParams('id')` | `remove` | UUID | **200 `{deleted:true}`** ❌ | controller raw `UPDATE deleted_at ... RETURNING id` (soft) | 동일 |

- **lifecycle action(활성/비활성)** 은 별도 endpoint 가 아니라 `PATCH { isActive }` 다 (#3 에 포함).
- `GET detail` 미존재 → WO §3 의 "GET not-found 계약 확인"은 **해당 없음**.
- consumer 3곳 모두 PATCH/DELETE 응답 **body 를 사용하지 않고** 목록을 재조회한다
  (`fetchItems()`). 따라서 상태코드/포맷 정규화가 화면 계약을 깨지 않는다.

---

## 4. 삭제 구현 census · affected-row 분석

```text
router.delete('/hq/forced-content/:id', requireSignageOperator, validateUuidParams('id'), forcedCtrl.remove)
→ SignageForcedContentController.remove
→ this.dataSource.query(`UPDATE ... RETURNING id`, [id, serviceKey])   ← service/repository 계층 없음
```

수정 전 코드:

```ts
const rows = await this.dataSource.query(`UPDATE ... RETURNING id`, [id, serviceKey]);
if (rows.length === 0) { /* 404 */ }
res.json({ success: true, data: { id, deleted: true } });
```

`{deleted:true}` 가 **DB 결과와 무관하게 고정 반환**된 것이 맞다. 다만 이유는
"의도적 고정 반환"이 아니라 **not-found 분기가 도달 불가능(dead)** 했기 때문이다.

### 근본 원인

`node_modules/typeorm/driver/postgres/PostgresQueryRunner.js` (typeorm 0.3.27):

```js
switch (raw.command) {
  case "DELETE":
  case "UPDATE":
    // for UPDATE and DELETE query additionally return number of affected rows
    result.raw = [raw.rows, raw.rowCount];
    break;
  default:
    result.raw = raw.rows;
}
```

즉 `dataSource.query()` 는

- `SELECT` / `INSERT ... RETURNING` → `rows` 배열
- `UPDATE` / `DELETE` → **`[rows, rowCount]`** (길이 항상 2)

를 반환한다. controller 는 후자를 rows 배열로 보고 `.length === 0` 을 검사했으므로

| 상황 | 실제 반환 | `rows.length` | 결과 |
|---|---|---|---|
| 대상 없음 | `[[], 0]` | 2 | 404 분기 미진입 → **200 성공** |
| 대상 존재 | `[[{id}], 1]` | 2 | 200 성공 (우연히 맞음) |

`update()` 도 동일 — 게다가 성공 시 `rows[0]` 이 **행 객체가 아니라 행 배열**이어서
`data` 가 배열로 나갔다.

`RETURNING` 은 사용 중이고 `find-before-delete` 는 없다. `DeleteResult`/`UpdateResult` 의
`.affected` 는 이 raw query 경로에서는 노출되지 않는다(structured result 미사용).

---

## 5. 플랫폼 / Signage delete 계약 비교

Signage 의 다른 UUID DELETE 는 전부 **repository 의 `(result.affected || 0) > 0`** 으로
판정하고 없으면 404 를 낸다.

| endpoint | 구현 | missing valid UUID | 판정 |
|---|---|---|---|
| `DELETE /media/:id` | `media.repository.softDeleteMedia` → `affected` | 404 `Media not found` | 정상 NOT_FOUND |
| `DELETE /playlists/:id` | `playlist.repository.softDeletePlaylist` → `affected` | 404 | 정상 NOT_FOUND |
| `DELETE /playlists/:playlistId/items/:itemId` | `playlistItemRepo.delete` → `affected` | 404 | 정상 NOT_FOUND |
| `DELETE /schedules/:id` | `schedule.repository.softDeleteSchedule` → `affected` | 404 | 정상 NOT_FOUND |
| `DELETE /templates/:id` | `template.repository.softDeleteTemplate` → `affected` | 404 | 정상 NOT_FOUND |
| `DELETE /templates/:templateId/zones/:zoneId` | `templateZoneRepo.delete` → `affected` | 404 | 정상 NOT_FOUND |
| `DELETE /content-blocks/:id` | `content.repository.softDeleteContentBlock` → `affected` | 404 | 정상 NOT_FOUND |
| `DELETE /layout-presets/:id` | `content.repository.softDeleteLayoutPreset` → `affected` | 404 | 정상 NOT_FOUND |
| `DELETE /hq/media/:id` | `hardDeleteMedia` → `{deleted, code}` | 404 `MEDIA_NOT_FOUND` (409 사용중) | 정상 NOT_FOUND |
| `DELETE /hq/playlists/:id` | `hardDeletePlaylist` → `{deleted, code}` | 404 `PLAYLIST_NOT_FOUND` | 정상 NOT_FOUND |
| `DELETE /community/media/:id` | `deleteCommunityMedia` → `{deleted, code}` | 404 (`NOT_OWNER` 403) | 정상 NOT_FOUND |
| `DELETE /community/playlists/:id` | `deleteCommunityPlaylist` → `{deleted, code}` | 404 | 정상 NOT_FOUND |
| **`DELETE /hq/forced-content/:id`** | controller raw query | **200 `{deleted:true}`** | **동일 결함 아님 — 유일 outlier** |

같은 결함(`query()` 반환형 오독)이 Signage 안에 또 있는지 재탐색:
`routes/signage/**` 에서 raw `UPDATE`/`DELETE` 는 4곳이며, 그중 **반환값을 판정에 쓰는
곳은 forced-content 의 2곳뿐**이다 (나머지 2곳은 `media.repository` / `playlist.repository`
의 스냅샷 정리로 결과를 사용하지 않는다). → **횡전개 대상 0.**

응답 포맷은 새로 만들지 않고 **이 파일에 이미 존재하던(도달 불가였던) 분기를 그대로** 사용한다.

```json
404 { "success": false, "error": { "code": "NOT_FOUND", "message": "Forced content not found" } }
```

---

## 6. idempotent DELETE 여부 최종 판정 — **A. Resource-oriented (404)**

근거:

1. controller 안에 **이미 404 NOT_FOUND 분기가 작성돼 있다** — 작성자 의도는 not-found 다.
2. idempotent 삭제를 명시한 주석·문서·테스트가 **0건**.
3. sibling Signage DELETE **12개 전부 404** (§5).
4. consumer 3곳 모두 응답 body 를 쓰지 않으며 실패 시 목록 재조회로 수렴 → 404 로 바뀌어도 화면 계약 무변.
5. 플랫폼 전역 관행도 not-found = 404.

→ WO §16 의 "명시적 idempotent 정책 증거" 없음. **결함으로 확정**하고 NOT_FOUND 로 정규화한다.

---

## 7. 수정 내용

파일 1개: `apps/api-server/src/routes/signage/controllers/forced-content.controller.ts` (+26/−4)

```ts
function readWriteResult<T = any>(raw: unknown): { rows: T[]; affected: number } {
  if (Array.isArray(raw) && Array.isArray(raw[0])) {           // UPDATE/DELETE: [rows, rowCount]
    const rows = raw[0] as T[];
    const affected = Number(raw[1] ?? rows.length);
    return { rows, affected: Number.isFinite(affected) ? affected : rows.length };
  }
  const rows = (Array.isArray(raw) ? raw : []) as T[];          // SELECT/INSERT: rows
  return { rows, affected: rows.length };
}
```

`update()` · `remove()` 두 곳에서

```ts
const { rows, affected } = readWriteResult(raw);
if (affected === 0 || rows.length === 0) { /* 기존 404 분기 */ }
```

### WO §8 금지 항목 준수

| 금지 | 준수 |
|---|---|
| DELETE 전 별도 SELECT 추가 | ✅ 쿼리 수 그대로 1회 (테스트로 고정) |
| DB exception 으로 not-found 판정 | ✅ 사용 안 함 |
| controller 에서 404/200 하드코딩 | ✅ row-count 로 분기 |
| 존재하지 않아도 `deleted:true` 유지하며 status 만 변경 | ✅ 404 본문에 `data` 없음 |
| schema/migration 변경 | ✅ 0건 |

### 부수 효과 (개선)

`PATCH` 성공 응답의 `data` 가 **배열 → 객체 1건**으로 교정됐다. consumer 는 이 body 를
사용하지 않으므로 회귀 위험 없음 (§3).

---

## 8. 자동 테스트

신규 `apps/api-server/src/__tests__/signage-forced-content-delete-not-found.spec.ts` — **21 케이스 PASS**.

- DELETE invalid UUID 4종 → 400 `INVALID_ID` · `query` 미호출
- DELETE valid missing → 404 `NOT_FOUND` (`affected 0` 반영)
- DELETE 쿼리 **1회** · 바인딩 `[id, canonicalServiceKey]` (별도 SELECT 없음)
- DELETE valid existing (`affected 1`) → 200 `{deleted:true}`
- PATCH invalid → 400 / missing → 404 / existing → 200 + `data` 객체 / 빈 body → 400
- GET collection 200 · POST create 201 (SELECT·INSERT 반환형 회귀)
- 미인증 401 · 잘못된 serviceKey 400 · operator 아님 403 — **모두 `query` 미호출**
- serviceKey canonicalization 5종(`kpa`→`kpa-society`, `cosmetics`→`k-cosmetics` alias 포함)

**비공허성 확인**: 수정 전 controller 로 되돌려 같은 spec 실행 → missing 관련 **7건 FAIL**,
수정 후 전부 PASS.

기존 Signage spec 5개(162 케이스) 회귀 없음. `apps/api-server` 전체 Jest
**167 suites / 2,678 tests 전부 통과**. `tsc --noEmit` — signage/forced-content 관련 오류 0
(기존 무관 오류 2건: `copilot-engine.service.ts`, `dashboard-assets.mutation-handlers.ts`).

---

## 9. Production smoke (수정 후)

배포: commit `4a3550360` → Deploy API Server (Cloud Run) **success** →
리비전 **`o4o-core-api-03413-5vd`** (2026-08-21). 검증은 이 리비전에서 수행했다.

`sohae2100@gmail.com` (operator) · **missing UUID 만 사용 → 0-row · 데이터 변경 0**.

| 요청 | k-cosmetics | `cosmetics` (alias) | glycopharm |
|---|---|---|---|
| `GET /hq/forced-content` | 200 `data:[]` | 200 `data:[]` | 200 `data:[]` |
| `DELETE .../{missing}` | **404 `NOT_FOUND`** | **404 `NOT_FOUND`** | **404 `NOT_FOUND`** |
| `DELETE .../not-a-uuid` | 400 `INVALID_ID` | 400 `INVALID_ID` | 400 `INVALID_ID` |
| `PATCH .../{missing}` | **404 `NOT_FOUND`** | **404 `NOT_FOUND`** | **404 `NOT_FOUND`** |
| `PATCH .../not-a-uuid` | 400 `INVALID_ID` | 400 `INVALID_ID` | 400 `INVALID_ID` |
| 미인증 `DELETE .../{missing}` | 401 `AUTH_REQUIRED` | 401 `AUTH_REQUIRED` | 401 `AUTH_REQUIRED` |

- 잘못된 serviceKey: `DELETE /api/signage/nope/hq/forced-content/{missing}` → **400 `INVALID_SERVICE_KEY`**
  (not-found 판정보다 앞선다)
- 응답 body 는 §2 재현 시점의 `200 {deleted:true}` / `200 {data:[]}` 가 **완전히 사라졌다**.

### kpa-society — operator 경로 production 미검증 (정직 기록)

`sohae2100@gmail.com` + `serviceKey:"kpa-society"` 로그인이 본 검증 시점에 **401
`INVALID_CREDENTIALS`** 를 반환했다 (같은 계정·같은 비밀번호로 `k-cosmetics` /
`glycopharm` 은 200). `ACCOUNT_LOCKED` 가 아닌 자격 불일치이므로
`service_credentials` 의 kpa-society 행 문제로 보이며, **본 WO 변경과 무관한 계정
환경 이슈**다. 비밀번호 변경은 WO 범위 밖이라 수행하지 않았다.

대체 검증으로 `renagang21@gmail.com` (`kpa:store_owner`) 로 kpa-society 경로에 접근:

| 요청 | 결과 |
|---|---|
| `DELETE /api/signage/kpa-society/hq/forced-content/{missing}` | 403 `SIGNAGE_OPERATOR_REQUIRED` |
| `DELETE /api/signage/kpa-society/hq/forced-content/not-a-uuid` | 403 `SIGNAGE_OPERATOR_REQUIRED` |

→ kpa-society 라우트·guard 는 정상 도달하며 **403 이 not-found 판정보다 앞선다**는
계약도 그대로다. kpa-society 의 **operator 404 경로만** production 미측정이며,
동일 코드 경로를 Jest 에서 `kpa-society` · `kpa` alias 로 커버했다(§8).

### 브라우저 회귀

| 서비스 | 화면 | 결과 |
|---|---|---|
| k-cosmetics | `/operator/signage/forced-content` | 정상 렌더 · console error 0 · api 4xx/5xx 0 |
| glycopharm | `/operator/signage/forced-content` | 정상 렌더 · console error 0 · api 4xx/5xx 0 |
| kpa-society | `/operator/signage/forced-content` | **미수행** — 위 operator 로그인 401 |

---

## 10. DB · schema 영향

- migration **0건** · schema 변경 **0건**
- production 데이터 **실삭제 0건** — 모든 검증은 존재하지 않는 UUID(0-row)로 수행
- `signage_forced_content` 행 수는 3개 서비스 모두 **0** (수정 전후 동일)

---

## 11. 잔존 부채

1. `routes/signage/extensions/**` 미마운트 dead code (직전 WO 에서 기록 · 본 WO 제외 범위)
2. 컨트롤러 로컬 `UUID_RE` 중복 (직전 WO 기록)
3. **forced-content 는 service/repository 계층 없이 controller 가 raw SQL 을 직접 실행**한다.
   Signage 의 다른 리소스는 repository 계층을 갖는다. 계층 정합은 별도 WO 후보
   (본 WO 는 "가장 작은 계층에서 수정" 원칙에 따라 계층 신설을 하지 않았다).
4. **`sohae2100@gmail.com` 의 kpa-society service credential 불일치** (§9) — 검증 계정
   환경 문제. 코드 결함 아님. `docs/local/TEST-ACCOUNTS.local.md` 갱신 또는 credential
   재설정이 필요하며 본 WO 범위 밖이다.

---

## 12. 문서 정합

`문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건`
