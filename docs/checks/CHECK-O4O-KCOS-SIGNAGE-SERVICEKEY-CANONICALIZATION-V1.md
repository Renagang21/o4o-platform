# CHECK-O4O-KCOS-SIGNAGE-SERVICEKEY-CANONICALIZATION-V1

- **WO**: `WO-O4O-KCOS-SIGNAGE-SERVICEKEY-CANONICALIZATION-V1`
- **작업일**: 2026-08-20
- **브랜치/워크트리**: `work/kcos-signage-svckey` (base `31ec7bcd5`, 별도 worktree)
- **판정**: **PASS** — 400 원인 확정(whitelist 단계) · canonical 계약 판정 A 확정 · SSOT 기반 최소 수정 · cross-service 403 회귀 없음
- **선행 기록**: `CHECK-O4O-KPA-SIGNAGE-CANONICAL-API-403-RESOLUTION-V1` (같은 signage 가드 축, organization 축 혼용 해소)

---

## 1. 요약

K-Cosmetics 매장 signage 프론트가 보내는 `serviceKey='k-cosmetics'` 가 signage
`validateServiceKey` 허용목록에 없어 **400 `INVALID_SERVICE_KEY`** 로 거부됐다.

원인은 허용목록이 **역할 prefix `cosmetics`** 를 API 경로 key 로 들고 있던 drift 였다.
KCos 의 canonical 축은 MEMBERSHIP·ENROLLMENT·LISTING 모두 `k-cosmetics` 이고,
`cosmetics` 는 ROLE_SCOPE / SLUG 축의 값이다.

수정은 문자열 추가가 아니라 **canonical 정규화**다.
`@o4o/security-core` 의 기존 SSOT(`resolveCanonicalServiceKey`)로 URL param 을 canonical 로
수렴시키고, 허용목록은 canonical key 로만 유지했다. 역할 prefix 가 필요한 지점은
기존 `resolveRolePrefixFromCanonicalServiceKey` 로 되돌린다.
새 mapping 체계·서비스별 if/else·guard 완화는 없다.

---

## 2. 재현 (§3) — production, 수정 전

계정: KCos 매장 계정 (`docs/local/TEST-ACCOUNTS.local.md`, 자격증명 미기재).
로그인 `POST /api/v1/auth/login` · `serviceKey='k-cosmetics'` · 200 · httpOnly cookie.
`role_assignments`(is_active) = `cosmetics:store_owner`, `kpa:store_owner`,
`glycopharm:store_owner`, `pharmacy-hub:store_owner`.

| 요청 (`GET`, `X-Organization-Id` = 자기 KCos 매장 조직) | 상태 | code |
|---|---|---|
| `/api/signage/k-cosmetics/media?limit=50` | **400** | `INVALID_SERVICE_KEY` |
| `/api/signage/k-cosmetics/playlists` | **400** | `INVALID_SERVICE_KEY` |
| `/api/signage/k-cosmetics/schedules` | **400** | `INVALID_SERVICE_KEY` |
| `/api/signage/bogus-key/media` | 400 | `INVALID_SERVICE_KEY` (**동일 응답**) |
| `/api/signage/cosmetics/media?limit=50` | 200 | — |
| `/api/signage/cosmetics/playlists` | 200 | — |
| 쿠키 없음 · `/api/signage/k-cosmetics/media` | 401 | (인증 먼저) |

**400 단계 확정**: 응답이 존재하지 않는 `bogus-key` 와 완전히 동일하고,
라우터 체인이 `requireAuth`(401) → `validateServiceKey`(400) → 개별 guard 순서이므로
400 은 **whitelist 단계**에서 발생하며 canonicalization·role·organization 귀속 판정에는
**도달조차 하지 않았다**. (도달했다면 403 계열 code 가 나왔어야 한다.)

frontend caller: `services/web-k-cosmetics/src/lib/api/signageV2.ts:98`
(`getBaseUrl(serviceKey = 'k-cosmetics')`) → 매장 signage 화면 전부.

---

## 3. serviceKey census (§4) — 미조사 0

mount: `apps/api-server/src/bootstrap/register-routes.ts`
→ `app.use('/api/signage/:serviceKey', signageRoutes)` / `'/api/signage/:serviceKey/public'`.
(`/api/v1` 아래가 아니다.) 라우터 전역: `requireAuth` → `validateServiceKey` → 라우트별 guard.
공개 라우터는 `validateServiceKey` 만.

| 서비스 | frontend key | URL `:serviceKey` | validator 허용(수정 전) | canonical service key | role scope | enrollment | slug | production 결과(수정 전) |
|---|---|---|---|---|---|---|---|---|
| KPA-Society | `kpa-society` | `kpa-society` | 허용 | `kpa-society` | `kpa` | `kpa-society` | `kpa` | 200 |
| K-Cosmetics (매장) | `k-cosmetics` | `k-cosmetics` | **미허용** | `k-cosmetics` | `cosmetics` | `k-cosmetics` | `cosmetics` | **400** |
| K-Cosmetics (운영자 HQ) | `cosmetics` | `cosmetics` | 허용(=drift) | `k-cosmetics` | `cosmetics` | `k-cosmetics` | `cosmetics` | 200 |
| GlycoPharm | `glycopharm` | `glycopharm` | 허용 | `glycopharm` | `glycopharm` | `glycopharm` | `glycopharm` | 200 |
| Neture (admin-dashboard) | `neture` | `neture` | 허용 | `neture` | `neture` | `neture` | `neture` | 200 |
| PharmacyHub | (signage URL 미사용) | — | — | `pharmacy-hub` | `pharmacy-hub` | `pharmacy-hub` | — | 해당 없음 |

canonical SSOT: `packages/security-core/src/service-configs.ts`
`ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY = { kpa: 'kpa-society', cosmetics: 'k-cosmetics' }`
(+ 역방향 `resolveRolePrefixFromCanonicalServiceKey`, self-map fallback).
귀속 SSOT: `apps/api-server/src/utils/store-organization.resolver.ts`
`STORE_SERVICE_ORG_LINKAGE.cosmetics = { enrollmentCodes: ['k-cosmetics','cosmetics'], slugKeys: [...] }`,
`toStoreOwnerServiceKey()` → `'cosmetics'`.

`req.params.serviceKey` 직접 읽던 지점 전수(수정 대상): middleware 7 · `signage-helpers.extractScope`
· `content.controller` 3 · `forced-content.controller` 4 · `signage-public.routes` 5
· `extensions/common/extension.router` 1 · `extensions/index` 1 → **수정 후 0건**
(`grep -rn "req.params" routes/signage/ | grep -i servicekey` → 없음).

### signage 테이블을 쓰지만 URL param 을 쓰지 않는 소비처 (범위 밖 확인)

| 소비처 | serviceKey 출처 | 판정 |
|---|---|---|
| `routes/o4o-store/controllers/store-playlist.controller.ts` | 서비스별 mount 인자 (KPA=`'kpa-society'`, Cosmetics=`undefined`) | 영향 없음 |
| `controllers/pharmacy-hub/PharmacyHubStoreSignageController.ts` | `SERVICE_KEYS.PHARMACY_HUB` 상수 | 영향 없음 |
| `routes/kpa/services/content-approval.service.ts` | 캠페인 payload `targetServices` | 영향 없음(범위 밖) |
| `modules/signage/signage-query.service.ts` 외 | 각 서비스 컨텍스트 | 영향 없음 |

---

## 4. 대상 비교 · legacy key (§5)

- `pharmacy` / `tourism` / `common`: 저장소 전체에서 **살아있는 호출부 0** (문서 문자열만).
- `neture`: `apps/admin-dashboard` signage v2 (`DEFAULT_SERVICE_KEY='neture'`) 가 실사용.
- `test`: 테스트 탈출구.

→ **본 WO 범위 밖이므로 전부 기존 동작 그대로 유지**했다 (정비로 확장하지 않는다).

---

## 5. canonical 계약 확정 (§6) — **판정 A**

**A. API `:serviceKey` = canonical service key. 내부에서 role scope(`cosmetics`)로 변환.**

근거(프로덕션 데이터, read-only):

| 테이블 | 저장된 service key | 행수 |
|---|---|---|
| `signage_media` | `kpa-society` | 7 |
| `signage_playlists` | `kpa-society` | 1 |
| `signage_templates` | `kpa-society` | 4 |
| `signage_forced_content` | `kpa-society` | 2 |
| `signage_schedules` / `content_blocks` / `layout_presets` / `playback_logs` / `ai_logs` | — | 0 |

- 저장된 값은 **canonical(`kpa-society`)** 뿐이고, **cosmetics 계열 signage 행은 0** →
  canonical 로 정규화해도 **데이터 마이그레이션이 필요 없다**.
- enrollment(`k-cosmetics`)·service_credentials(`k-cosmetics`) 도 canonical.
- 따라서 허용목록의 `cosmetics` 가 **역할 prefix 가 API 경로 축으로 샌 drift** 였다.
- B안(프론트를 `cosmetics` 로 되돌리기)은 KCos 매장 화면 전부와 canonical SSOT 를
  역방향으로 끌고 가므로 채택하지 않았다.

축 혼동 금지 재확인: `ROLE_SCOPE_KEY='cosmetics'` ≠ `MEMBERSHIP_KEY='k-cosmetics'`
≠ `ENROLLMENT_KEY='k-cosmetics'`. `actionPolicyPrefix: 'cosmetics:signage'` 는 역할 축이라
**변경하지 않았다**.

---

## 6. 수정 내역 (§7)

backend 6 · frontend 1 · 테스트 1.

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/middleware/signage-role.middleware.ts` | `canonicalizeSignageServiceKey()` · `getSignageServiceKey(req)` 추가(security-core SSOT 위임) · guard 7곳 canonical 사용 · `validateServiceKey` 가 canonical 로 판정(허용목록 `cosmetics`→`k-cosmetics`) · 하드코딩 `startsWith('kpa-')` 2곳 제거 → `resolveRolePrefixFromCanonicalServiceKey` |
| `routes/signage/controllers/signage-helpers.ts` | `extractScope` 가 canonical serviceKey 반환(데이터 scope 단일화) |
| `routes/signage/controllers/content.controller.ts` | 3곳 canonical |
| `routes/signage/controllers/forced-content.controller.ts` | 4곳 canonical (destructuring 형태라 1차 census 에서 누락됐던 지점) |
| `routes/signage/signage-public.routes.ts` | 5곳 canonical |
| `routes/signage/extensions/common/extension.router.ts` · `extensions/index.ts` | 각 1곳 canonical |
| `services/web-k-cosmetics/src/pages/operator/signage/signageHqConfig.ts` | `serviceKey: 'cosmetics'` → `'k-cosmetics'` (운영자 HQ 도 canonical 로 통일). `actionPolicyPrefix` 불변 |

**하지 않은 것**: 허용목록에 `k-cosmetics` 문자열만 추가 · 두 키 동시 무조건 허용 ·
서비스별 분기 추가 · guard 완화 · organization 귀속 검사 우회 · 새 mapping 체계 신설 ·
DB write · migration.

---

## 7. 자동 테스트 (§9)

신규 `apps/api-server/src/__tests__/signage-servicekey-canonicalization.spec.ts` (24 케이스, DB stub):

- canonical 수렴: `cosmetics→k-cosmetics`, `kpa→kpa-society`, canonical self-map, 빈 값
- validator: `k-cosmetics` 통과(본 결함) · KPA/GP/Neture 회귀 없음 · alias 수렴 통과 ·
  legacy key 기존 동작 유지 · 미등록 key 400 유지(원본 key 를 메시지에 노출) · `SERVICE_KEY_REQUIRED` 유지
- 축 변환: role scope(`cosmetics:*`) 판정 · community 판정 · `toStoreOwnerServiceKey` ·
  `extractScope` 데이터 scope canonical
- §8 cross-service 매트릭스: 자기 KCos org 200 · 미소유 org 403 `SIGNAGE_STORE_REQUIRED` ·
  KPA-only / GP-only org 403 · alias 입력이어도 `req.signageContext.serviceKey === 'k-cosmetics'` ·
  operator 계약 회귀 없음

기존 `signage-cross-service-org-guard.spec.ts` 는 **무수정 통과**.

---

## 8. 검증 결과 (§13)

| 항목 | 결과 |
|---|---|
| api-server 전체 Jest | **PASS** — 163 suites / 2529 tests |
| api-server `tsc --noEmit` | **PASS** |
| K-Cosmetics `tsc --noEmit` | **PASS** |
| K-Cosmetics `vite build` | **PASS** |
| KPA / GlycoPharm signage 테스트 | 회귀 없음(전체 스위트에 포함) |
| production DB write | **0** (read-only 조회만) |

> 참고: `pnpm --filter "./packages/**" run build` 에서 `@o4o/financial-core` 의
> `tsup: No input files` 실패는 **본 WO 이전부터 존재하는 무관 결함**이다(46 pass / 1 fail).

---

## 9. Production smoke (§10)

배포 후 기록. (본 CHECK 커밋 시점 = 배포 전)

---

## 10. 함께 하지 않은 것 (§11)

`allowSignageStoreRead` global-read 정책 · `GET /schedules/calendar` route shadowing ·
Signage 데이터 0행 · 로그인 API 간헐 500 · `StoreOrderWorktablePage` organization 축 ·
`pharmacy`/`tourism`/`common`/`neture`/`test` legacy key 전면 정리 — 모두 **미착수**.

---

## 11. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건.
