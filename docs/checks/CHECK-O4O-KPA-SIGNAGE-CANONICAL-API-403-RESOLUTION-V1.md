# CHECK-O4O-KPA-SIGNAGE-CANONICAL-API-403-RESOLUTION-V1

- **WO**: `WO-O4O-KPA-SIGNAGE-CANONICAL-API-403-RESOLUTION-V1`
- **작업일**: 2026-08-19
- **브랜치/워크트리**: `work/kpa-signage-403` (base `852ff2060`, 별도 worktree)
- **판정**: **PASS** — 원인 확정(D WRONG_ORGANIZATION_SCOPE) · 최소 수정 완료 · 권한 회귀 매트릭스 통과 · production smoke 통과
- **선행 기록**: `CHECK-O4O-MY-STORE-FINAL-COMMONIZATION-AUDIT-AND-CLOSURE-V1` §12 에서 `NON_BLOCKING_TECH_DEBT` 로 남긴 KPA signage canonical API 403 항목을 본 WO 로 해소한다.

---

## 1. 요약

정상 KPA `store_owner` 계정이 `/store/marketing/signage/*` 진입 시 canonical signage API 가
403(`SIGNAGE_STORE_REQUIRED` / `SIGNAGE_ACCESS_DENIED`) 을 반환했다.

원인은 RBAC(role) 도 membership 도 아니고 **organization 축 혼용**이었다.
KPA signage 프론트 3개 화면이 `X-Organization-Id` 로 **약사회 회원 자격 조직**
(`kpa_members.organization_id`) 을 보냈고, signage store 가드는 **매장 조직**
(`organization_members` owner/admin/manager) 만 인정한다. 두 값은 실제로 다른 조직이었다.

수정은 프론트 3개 화면의 조직 출처를 canonical 매장 조직으로 교정한 것뿐이다.
백엔드 가드·권한·role·membership·schema 는 **변경하지 않았다**.

---

## 2. 재현 (§3)

| 항목 | 값 |
|---|---|
| 계정 | KPA 약국 경영자 테스트 계정 (`docs/local/TEST-ACCOUNTS.local.md`, 자격증명 미기재) |
| 로그인 | `POST /api/v1/auth/login` · `serviceKey='kpa-society'` · 200 · 인증은 httpOnly cookie(`accessToken`/`refreshToken`) |
| roles | `kpa:store_owner`, `cosmetics:store_owner`, `glycopharm:store_owner`, `pharmacy-hub:store_owner`, `lms:instructor` 외 |
| service_memberships | `kpa-society=active`, `platform=active`, `pharmacy-hub=active`, `k-cosmetics=active`, `glycopharm=active`, `neture=active`, `kpa-branch=active` |
| user.organizationId | **undefined** (JWT/user 객체에 없음) |
| user.permissions / scopes | 빈 배열 |
| 프론트가 보낸 organizationId | `c92b857f…` = `kpa_members.organization_id` (조직명 「테스트 약국」) |
| canonical 매장 조직 | `9c87f46b…` (조직명 「테스트 약국」 — **동명 별개 조직**) |

재현 결과 (기존 코드 · production API):

| 요청 | 상태 | code |
|---|---|---|
| `GET /api/signage/kpa-society/media?limit=200` + 회원조직 헤더 | 403 | `SIGNAGE_ACCESS_DENIED` |
| `GET /api/signage/kpa-society/playlists` + 회원조직 헤더 | 403 | `SIGNAGE_ACCESS_DENIED` |
| `GET /api/signage/kpa-society/schedules` + 회원조직 헤더 | 403 | `SIGNAGE_STORE_REQUIRED` |
| `GET /api/signage/kpa-society/schedules` (헤더 없음) | 400 | `ORGANIZATION_ID_REQUIRED` |
| 동일 계정 · **canonical 매장 조직** 헤더 | **200** | — |

정상 동작하는 비교군(같은 계정·같은 세션): `GET /api/v1/kpa/store/local-products` 200,
`GET /api/v1/kpa/pharmacy/info` 200 (`organizationId=9c87f46b…`),
`GET /api/v1/kpa/pharmacy/store/config` 200 (`organizationId=9c87f46b…`).
→ **My Store 의 다른 화면은 백엔드가 조직을 스스로 해석**하므로 영향이 없었고,
signage 만 클라이언트가 조직을 지정하는 구조라 이 축 혼용이 드러났다.

---

## 3. Signage endpoint census (§4) — 미조사 0

mount: `apps/api-server/src/bootstrap/register-routes.ts:1021` → `app.use('/api/signage/:serviceKey', signageRoutes)`
(공개 라우트는 `:serviceKey/public`, L1012). 라우터 전역: `router.use(requireAuth)` → `router.use(validateServiceKey)`.

`apps/api-server/src/routes/signage/signage.routes.ts` 전 라우트:

| 그룹 | 라우트 | 가드 |
|---|---|---|
| Playlist | `GET /playlists`, `GET /playlists/:id` | `requireSignageOperatorOrStore` |
| Playlist | `POST /playlists`, `PATCH /playlists/:id`, `DELETE /playlists/:id` | `requireSignageStore` |
| Playlist items | `GET/POST/PATCH/DELETE /playlists/:playlistId/items*` (bulk·reorder 포함) | `requireSignageOperatorOrStore` |
| Media | `GET /media`, `GET /media/:id` | `requireSignageOperatorOrStore` |
| Media | `POST /media`, `PATCH /media/:id`, `DELETE /media/:id` | `requireSignageStore` |
| Schedule | `GET/POST /schedules`, `GET/PATCH/DELETE /schedules/:id` | `requireSignageStore` |
| Schedule | `GET /schedules/calendar` | `requireSignageStore` |
| Playback 해석 | `GET /active-content` | `allowSignageStoreRead` |
| Template | `GET /templates`, `GET /templates/:id`, `POST /templates/preview`, `GET /templates/:templateId/zones` | `allowSignageStoreRead` |
| Template | `POST/PATCH/DELETE /templates*`, zones 변경 | `requireSignageOperator` |
| Content block · Layout preset | `GET` 계열 | `allowSignageStoreRead` |
| Content block · Layout preset | `POST/PATCH/DELETE` | `requireSignageOperator` |
| Media library | `GET /media/library` | `allowSignageStoreRead` |
| Upload | `POST /upload/presigned` | `requireSignageOperatorOrStore` |
| AI | `POST /ai/generate` | `requireSignageOperatorOrStore` |
| Global(read) | `GET /global/playlists*`, `GET /global/media*` | `allowSignageStoreRead` |
| HQ | `POST/PATCH/DELETE /hq/*` (playlists·media·forced-content·usage) | `requireSignageOperator` |
| Community | `POST/DELETE /community/media*`, `/community/playlists*` | `requireSignageCommunity` |

프론트 소비처(KPA):

| 화면 / 클라이언트 | 호출 | organizationId 출처(수정 전) |
|---|---|---|
| `StoreSignagePage.tsx` | media·schedules·playlists CRUD | `user.kpaMembership.organizationId` ❌ |
| `SignagePlayerSelectPage.tsx` | `active-content` | `user.kpaMembership.organizationId` ❌ |
| `SignagePlaybackPage.tsx` | `active-content`, `playlists/:id` | `user.kpaMembership.organizationId` ❌ |
| `StorePlaylistCreatePage.tsx` | store-playlist API (`/api/v1/kpa/store-playlists`) | 백엔드 해석 (영향 없음) |
| `api/signageMedia.ts`·`signageSchedule.ts`·`signageTemplate.ts`·`signageAi.ts`·`lib/api/signageV2.ts` | 위 화면들이 사용 | 인자로 전달 |
| `pages/operator/signage/*`, `pages/signage/*` | HQ·community·global | operator/community 경로 (영향 없음) |

---

## 4. 권한 축 census (§5)

| 축 | 실측 | 판정 |
|---|---|---|
| `role_assignments` | `kpa:store_owner` 활성 보유 | 정상 — role 은 원인 아님 |
| `service_memberships` | `kpa-society` = `active` | 정상 — membership 은 원인 아님 |
| `organization_members` | 4행 전부 `role='owner'`, `left_at IS NULL` — 그중 KPA 매장 = `9c87f46b…` | 정상 |
| `kpa_members` | 1행 — `organization_id=c92b857f…`, `role='member'`, `status='active'` | **다른 축**(회원 자격) |
| `organization_service_enrollments` | `9c87f46b→kpa-society(active)`, `c92b857f→kpa-society/glycopharm(active)` | 두 조직 모두 서비스 연결은 있음 |
| `platform_store_slugs` | `9c87f46b→kpa(네뚜레-약국)`, `c92b857f→kpa(테스트-약국)` | 동일 |
| store-owner resolver (`resolveStoreOrganization('kpa')`) | 후보 **1건 = `9c87f46b…`** (`c92b857f` 는 `organization_members` 행 자체가 없어 탈락) | **canonical 매장 조직 확정** |
| `kpa ↔ kpa-society 혼용` | operator 경로에는 rolePrefix 정규화 존재(`hasSignageOperatorPermission`), store 경로는 role prefix 를 보지 않음 | 이번 403 과 무관 |
| `store_owner ↔ admin/operator 혼용` | 없음 (계정 roles 에 `platform:super_admin` 미포함 → admin bypass 미발동) | 무관 |
| legacy signage 권한 | `dbRoles` / `permissions` 경로 모두 빈 값 | 무관 |

---

## 5. 교차 서비스 대조군 (§6)

- K-Cosmetics / GlycoPharm / Pharmacy-Hub 의 내 매장 화면은 **조직 id 를 클라이언트가 보내지 않는다**.
  전부 백엔드 `resolveStoreOrganization(serviceKey)` 로 해석한다 → 동일 결함 없음.
- KPA 도 signage 외 화면(`local-products`·`handled-products`·`pharmacy/info`·`store/config`)은 백엔드 해석이라 정상이었다.
- 즉 이 결함은 **"클라이언트가 조직을 지정하는 유일한 축(signage)"** 에만 존재했다.

---

## 6. 원인 확정 (§7)

**D. WRONG_ORGANIZATION_SCOPE** — `kpa_members.organization_id`(회원 자격 조직) 를
매장 조직으로 사용. A(role) · B(serviceKey) · C(membership) · E(legacy route) · F(data-only) ·
G(policy) 는 §4 실측으로 배제했다.

---

## 7. 최소 수정 (§8)

백엔드 0 변경. 프론트 4파일:

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/src/hooks/useStoreOrganizationId.ts` (신규) | 기존 계약 `GET /api/v1/kpa/pharmacy/store/config` 의 `organizationId`(= 백엔드 canonical 해석 결과) 를 반환 |
| `pages/pharmacy/StoreSignagePage.tsx` | 조직 출처 교체 |
| `pages/pharmacy/SignagePlayerSelectPage.tsx` | 조직 출처 교체 |
| `pages/pharmacy/SignagePlaybackPage.tsx` | 조직 출처 교체 + 비동기 해석 중 "조직 없음" 오판 방지 |

새 API·새 테이블·새 role/service mapping 없음. `requireAuth` 제거·권한 우회·role 승격·
membership 완화 **없음** (§8 금지 항목 전부 미해당).

---

## 8. 권한 회귀 매트릭스 (§9) — production API 실측

| # | 시나리오 | 기대 | 실측 |
|---|---|---|---|
| M1 | KPA store_owner · 자기 canonical 매장 조직 | 200 | **200** (`/schedules`, `/media`, `/playlists`) |
| M2 | 같은 계정 · 소유하지 않은 다른 KPA 조직 | 403 | **403** |
| M3 | 존재하지 않는 조직 id | 403 | **403** |
| M4 | 다른 서비스(K-Cosmetics) 매장 조직 | 403 | **200 — 아래 §10 잔여 결함 1** |
| M5 | 미인증 요청 | 401 | **401** |
| M6 | 조직 헤더 없음 | 400 | **400** (`ORGANIZATION_ID_REQUIRED`) |
| M7 | KPA operator/admin 계약 회귀 | 기존과 동일 | **동일** (operator 는 `/media` 200 · store 전용 `/schedules` 는 타 조직 403) |
| M8 | membership 없음 / inactive / role 없음 계정 | 403 | **BLOCKED_DATA** — 해당 조건의 테스트 계정이 없고 프로덕션 데이터 변경은 금지(§11·§12) |

---

## 9. Production smoke (§10)

실행: 2026-08-19 · production `https://kpa-society.co.kr` · 배포 커밋 `8cf3bec6e`
(`Deploy Web Services (Cloud Run)` run 32229779245 성공 후) · Chromium(Playwright) 실브라우저 · KPA 약국 경영자 계정.

| 단계 | URL | 결과 |
|---|---|---|
| 로그인 | `/login` → `/store` | 정상 진입 |
| 내 매장 홈 | `/store` | 렌더 정상 |
| Signage 목록 | `/store/marketing/signage` → `/store/marketing/signage/playlist` | 렌더 정상 |
| Signage 플레이어 선택 | `/store/marketing/signage/player` | 렌더 정상 |
| Signage 재생(스케줄) | `/store/marketing/signage/play/_schedule` | 「현재 시간에 적용된 스케줄이 없습니다.」 정상 빈 상태 |

관측된 canonical API 호출 — **전부 200, 403 0건**:

```
200 GET /api/v1/kpa/pharmacy/store/config
200 GET /api/signage/kpa-society/media?limit=200
200 GET /api/signage/kpa-society/schedules
200 GET /api/signage/kpa-society/playlists?limit=100
200 GET /api/signage/kpa-society/active-content   (player select)
200 GET /api/signage/kpa-society/active-content   (playback)
```

| 판정 기준 | 결과 |
|---|---|
| canonical API 403 회귀 | **0** (수정 전 3/3 → 수정 후 0/6) |
| white screen | **0** (전 화면 본문 렌더) |
| JS exception / console error | **0** |
| dead link | **0** |
| 타 조직 데이터 노출 | **0** (요청 조직 = canonical 매장 조직 `9c87f46b…` 단일) |
| 목록 데이터 | 0건 — `BLOCKED_DATA` 아님. 플랫폼 전체 매장 스코프 signage 데이터가 0행(§10-3)이라 **정상 빈 상태**. 상세/편집 화면의 실데이터 조작은 데이터 부재로 미수행 = `BLOCKED_DATA` |

---

## 10. 잔여 결함 (범위 외 · 별도 WO 제안)

이번 WO 의 원인(D)과 무관하며, 고치려면 4개 서비스 공용 signage 가드를 바꿔야 해
`CLAUDE.md` 실행 원칙(작업 범위 외 수정 금지) · Shared Module Change Protocol 에 따라 **보고만** 한다.

1. **signage store 가드에 serviceKey↔organization 스코프가 없다** (§8 M4).
   `requireSignageStore` / `requireSignageOperatorOrStore` 는 `organization_members`
   (owner/admin/manager) 만 보고 그 조직이 URL 의 `:serviceKey` 매장인지 검사하지 않는다.
   → 타 서비스 매장 조직 id 로 KPA signage API 에 접근 가능.
   현재 노출 규모는 0 (아래 3 참조) 이지만 Boundary Policy Guard Rule 3 취지에 어긋난다.
   해석기의 `STORE_SERVICE_ORG_LINKAGE` 를 재사용하면 새 테이블 없이 좁힐 수 있다.
2. **`GET /schedules/calendar` 가 `GET /schedules/:id` 에 가려진다.**
   선언 순서가 `:id`(L113) → `calendar`(L197) 이라 `calendar` 가 `:id` 로 매칭되어
   500 `invalid input syntax for type uuid: "calendar"`. 현재 KPA 프론트는 호출하지 않는다.
3. **매장 스코프 signage 데이터가 플랫폼 전체 0건** — `signage_media`(7행) ·
   `signage_playlists`(1행) 모두 `organizationId IS NULL`(HQ), `signage_schedules` 0행.
   따라서 §9 smoke 의 목록은 정상적으로 빈 상태이며, 1·2 의 실제 노출 위험도 현재 0 이다.
4. **`StoreOrderWorktablePage.tsx` 도 `user.kpaMembership.organizationId` 를 사용한다.**
   signage 밖(주문 축)이라 이번 범위에서 건드리지 않았다. 같은 축 혼용인지 별도 확인 필요.

---

## 11. 변경 금지 준수 (§11) · 중지 조건 (§12)

- Signage View 재공통화 · 전체 재설계 · DB schema/migration · role hierarchy · membership 정책 ·
  KPA 밖 UI · Store Hub/Operator/Community: **전부 미변경**.
- 프로덕션 DB 는 read-only 조회만 수행 (write 0).
- 중지 조건 해당 없음 (Frozen RBAC 변경 불필요 · API contract breaking 없음 · 다른 세션 WIP 미접촉).

---

## 12. 검증 (§14)

| 항목 | 결과 |
|---|---|
| KPA frontend build (`tsc && vite build`, 의존 패키지 포함) | **PASS** |
| api-server store-owner/membership guard 회귀 (`store-owner-service-scoped-org`, `store-owner-backcompat-servicekey`) | **PASS** — 2 suites / 25 tests |
| api-server typecheck | 백엔드 변경 0 — 해당 없음 |
| KPA signage 전용 Jest | 저장소에 해당 spec 없음 (`apps/api-server/src/__tests__` 에 signage spec 부재) |
| Production API 권한 매트릭스 | §8 (M4 제외 통과, M4 는 §10 잔여 결함 1) |
| Production browser smoke | §9 |

---

## 13. 문서 정합

§16 기준 발견 사항 없음.
본 CHECK 신설 외 기준 문서(`docs/baseline/` · `docs/architecture/` · `docs/rules/`) 변경 없음.
SUPERSEDED 표기 대상·깨진 링크 발견 없음.

```
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 4건 (§10)
```
