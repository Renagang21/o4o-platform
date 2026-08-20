# CHECK — Signage Cross-Service Organization Scope Guard V1

- **WO**: `WO-O4O-SIGNAGE-CROSS-SERVICE-ORGANIZATION-SCOPE-GUARD-V1`
- **작업일**: 2026-08-20
- **커밋**: `329a050b9` (구현) · 본 문서(기록)
- **판정**: **PASS** — cross-service authorization boundary 결함 해소, 기존 계약 회귀 0

---

## 1. 문제 정의

공용 Signage 권한 가드가 URL 의 `:serviceKey` 와 전달된 `organizationId` 의 **실제 서비스 귀속**을
대조하지 않았다. 소유(`organization_members`)만 확인했기 때문에, 사용자가 소유한 **타 서비스 매장
organization id** 를 헤더로 넣으면 다른 서비스의 Signage API 가 그대로 통과했다.

Signage 는 My Store 축에서 **클라이언트가 organization 을 지정**하는 유일한 API 다
(`X-Organization-Id` 헤더 / `organizationId` query·body). 다른 매장 축은 서버가 조직을 해석한다.

실제 데이터 노출은 0 이었으나(§5), 권한 경계 자체의 결함으로 취급했다.

---

## 2. 수정 전 재현 (프로덕션, DB write 0)

계정: KPA 매장 소유 계정(자격정보는 `docs/local/TEST-ACCOUNTS.local.md`, 본 문서에 기재하지 않음)
엔드포인트: `/schedules`(store 전용) · `/media` · `/playlists`(operator-or-store)

| # | organization | 귀속 | 수정 전 | 기대 |
|---|---|---|---|---|
| A | 자기 KPA 매장 | KPA | **200** | 200 |
| B | 소유하지 않은 KPA 조직 | KPA | 403 | 403 |
| C | 존재하지 않는 org | — | 403 | 403 |
| D | 자기 K-Cosmetics 매장 | KCos | **200** ❌ | 403 |
| E | 자기 GlycoPharm 매장 | GP | **200** ❌ | 403 |
| F | 자기 Neture 조직 | Neture | **200** ❌ | 403 |
| G | 헤더 없음 | — | 400 `ORGANIZATION_ID_REQUIRED` | 동일 |
| H | 미인증 | — | 401 | 동일 |

**역방향도 동일**: `serviceKey=cosmetics` · `glycopharm` 로 요청해도 A(KPA 조직) 가 200 이었다.
즉 가드는 양방향으로 완전히 service-blind 였다.

---

## 3. 가드 전수 census (§4)

| 가드 | 사용 route | serviceKey 출처 | organizationId 출처 | 역할 검사 | 소유 검사 | 서비스 귀속 검사(수정 전) |
|---|---|---|---|---|---|---|
| `requireSignageStore` | schedules · active-content · content-blocks · layout-presets · uploads 등 store 축 | URL `:serviceKey` | header/query/body | admin 우회 | `organization_members` (owner/admin/manager, `left_at IS NULL`) | **없음** |
| `requireSignageOperatorOrStore` | media · playlists · templates · media/library | URL `:serviceKey` | header/query/body | operator 우선(조직 무관) | store branch 만 동일 SQL | **없음** |
| `requireSignageOperator` | operator 전용 | URL `:serviceKey` | 사용 안 함 | operator | 없음 | 해당 없음(조직 축 아님) |
| `allowSignageStoreRead` | `/global/*` 읽기 | URL `:serviceKey` | header/query/user | admin/operator/store 구분만 | **없음(기존)** | 해당 없음(global 콘텐츠) |
| `requireSignageCommunity` | community | URL `:serviceKey` | 사용 안 함 | community | 없음 | 해당 없음 |
| `validateServiceKey` | 라우터 공통 | URL | — | — | — | 허용 키 화이트리스트만 |

- 이 5개 가드는 **`signage.routes.ts` 외 소비처가 없다** (전수 grep). 영향 범위가 Signage 로 닫힌다.
- 마운트: `app.use('/api/signage/:serviceKey', signageRoutes)` → `requireAuth` → `validateServiceKey` → route guard.

## 4. endpoint 적용범위 census (§5)

| 분류 | endpoint | 귀속 검사 필요 |
|---|---|---|
| STORE_SCOPED | schedules · active-content · content-blocks · layout-presets · upload/presigned · ai/generate | **필요** (적용함) |
| STORE_OR_OPERATOR | media · playlists · playlist items · templates · media/library | **store branch 만 필요** (적용함) |
| OPERATOR_SCOPED | operator 전용 route | 불필요 (조직 축 아님) |
| GLOBAL / HQ | `/global/*` · `/hq/*` | 불필요 (조직 스코프 데이터 아님) |
| PUBLIC / OTHER | player · device · community | 불필요 |

모든 Signage API 에 동일 검사를 넣지 않았다.

---

## 5. 데이터 노출 실측 (프로덕션 read-only)

| 테이블 | 행 수 | `organizationId IS NULL` |
|---|---:|---:|
| `signage_media` | 7 | 7 |
| `signage_playlists` | 1 | 1 |
| `signage_schedules` | 0 | 0 |

전부 HQ(조직 미지정) 자료로, **매장 스코프 데이터 노출은 0**. 결함은 권한 경계 문제로만 존재했다.

---

## 6. canonical 귀속 계약 (§6·§9)

새 mapping·새 테이블·backfill 없음. 기존 SSOT 만 사용한다.

1. `:serviceKey` → 매장 서비스 키: `@o4o/security-core` 의
   `resolveRolePrefixFromCanonicalServiceKey()` (`kpa-society`→`kpa`, `k-cosmetics`→`cosmetics`, 그 외 self-map).
   로컬 mapping 상수를 만들지 않았다.
2. 조직 ↔ 서비스 귀속: `store-organization.resolver.ts` 의 `STORE_SERVICE_ORG_LINKAGE` 가 정의한
   기존 2계약의 합집합 —
   `organization_service_enrollments(service_code, status='active')` **또는**
   `platform_store_slugs(service_key, is_active = true)`.
   `findStoreOrganizationCandidates()` 와 **동일한 조건**을 사용한다.
3. 첫 enrollment · 첫 slug · membership 우선순위 · 조직 이름 등으로 **추정하지 않는다.**
4. 한 조직이 복수 서비스에 정상 귀속될 수 있으므로(합법 구조) "요청 서비스에 귀속 기록이 있는가" 만 본다.
   다른 서비스 귀속은 배제 사유가 아니다.

---

## 7. 구현 (§8)

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/utils/store-organization.resolver.ts` | `isOrganizationLinkedToService(dataSource, organizationId, serviceKey)` 추가 (+39줄, 삽입 전용) |
| `apps/api-server/src/middleware/signage-role.middleware.ts` | `toStoreOwnerServiceKey()` + `isSignageOrganizationInService()` 헬퍼 추가, `requireSignageStore` / `requireSignageOperatorOrStore`(store branch)에서 호출 (+75줄) |
| `apps/api-server/src/__tests__/signage-cross-service-org-guard.spec.ts` | 신규 회귀 spec |

계약 유지:

- 불일치 시 **기존 403 코드 재사용** (`SIGNAGE_STORE_REQUIRED` / `SIGNAGE_ACCESS_DENIED`) — API 계약 불변.
- `platform:super_admin` 우회 유지. 400/401 응답 불변.
- operator branch 미접촉 (§11).
- 귀속 SSOT 가 없는 serviceKey(`pharmacy` · `tourism` · `common` · `neture` · `test`)는 추정으로 차단하지 않고
  **기존 동작 유지**. (§16 잔여 항목으로 보고)
- 귀속 조회 DB 오류는 **fail-closed 403** (기존 소유 검사 fallback 과 동일 정책).

금지 사항 준수: organizationId 자동 치환 없음 · 프론트에서 org 숨겨 우회 없음 · requireAuth/role guard 완화 없음 ·
타 서비스 membership 인정 없음 · serviceKey 하드코딩 분기 누적 없음.

---

## 8. 자동 회귀 테스트 (§10·§17)

`signage-cross-service-org-guard.spec.ts` (20 케이스) — `AppDataSource.query` stub, DB 미접속.

- A 자기 서비스 org → 통과 / B 미소유 org → 403 / D·E·F 타 서비스 org → 403 (kpa-society·cosmetics·glycopharm 3키)
- 다중 서비스 조직 → 두 서비스 모두 통과 · 귀속 SSOT 없는 키 → 기존 동작 유지(귀속 조회 0회)
- platform admin 우회 유지 · 헤더 없음 400 · 미인증 401 · DB 오류 fail-closed 403
- `requireSignageOperatorOrStore`: 타 서비스 org 403 / 자기 서비스 org 통과 / **operator 는 org 없이 통과하며 귀속 조회 0회**
- `isOrganizationLinkedToService`: enrollment·slug 2소스 조회 + 파라미터가 `STORE_SERVICE_ORG_LINKAGE` 값과 동일

검증 결과:

| 항목 | 결과 |
|---|---|
| api-server 전체 Jest | **162 suites / 2504 tests PASS** |
| `store-owner-service-scoped-org.spec.ts` (기존 resolver 회귀) | PASS |
| api-server `type-check` (tsc --noEmit) | PASS |
| frontend build | **해당 없음** — 변경 파일 전부 backend |

---

## 9. 배포 후 프로덕션 권한 매트릭스 (§12, DB write 0)

`/schedules` (store 전용) · `/media` · `/playlists` (operator-or-store), 매장 소유 계정 기준.

| organization | `serviceKey=kpa-society` | `cosmetics` | `glycopharm` |
|---|---|---|---|
| A 자기 KPA 매장 | **200** | 403 | 403 |
| B 미소유 KPA 조직 | 403 | 403 | 403 |
| C 존재하지 않는 org | 403 | 403 | 403 |
| D 자기 KCos 매장 | **403** (이전 200) | **200** | 403 |
| E 자기 GlycoPharm 매장 | **403** (이전 200) | 403 | **200** |
| F 자기 Neture 조직 | **403** (이전 200) | 403 | 403 |
| G 헤더 없음 | 400 `ORGANIZATION_ID_REQUIRED` | 동일 | 동일 |
| H 미인증 | 401 | 401 | 401 |

- 정방향·역방향 모두 자기 서비스 매장에서만 200. **cross-service 통과 0.**
- 403 코드: store 전용 `SIGNAGE_STORE_REQUIRED`, operator-or-store `SIGNAGE_ACCESS_DENIED` — 기존 코드 그대로.

### Operator 계약 회귀 (§11)

`kpa:operator`·`cosmetics:operator`·`glycopharm:operator` 보유 계정으로 동일 매트릭스를 돌린 결과,
`/media`·`/playlists` 는 **organization 과 무관하게 200** 을 유지했다 (operator branch 조기 통과).
operator 가 organization scope 없이 접근하는 endpoint 에 store 검사를 강제하지 않았음을 확인.

---

## 10. 브라우저 회귀 (§13)

`https://kpa-society.co.kr` · 매장 소유 계정 · 자체 Playwright 하네스(격리 프로필).

로그인 → 내 매장 → 디지털 사이니지 목록 → 플레이어 선택 → 재생 화면.

| 항목 | 결과 |
|---|---|
| Signage API 호출 | `playlists` `media` `schedules` `active-content` ×2 · `store/config` ×3 — **전부 200** |
| 403 회귀 | **0** |
| white screen | 0 (각 화면 정상 렌더) |
| JS exception | 0 (`pageerror` 0건) |
| 기타 4xx | 로그인 전 `/auth/me` · `/auth/refresh` 401 2건 (미인증 상태 정상 동작) |

---

## 11. 함께 하지 않은 것 (§14) · 변경 금지 준수 (§15)

- `/schedules/calendar` shadowing 500 · StoreOrderWorktablePage organization 축 · Signage 매장 데이터 0행 ·
  Signage 기능/콘텐츠 생산 — 모두 미착수.
- DB schema/migration 0 · 프로덕션 데이터 write 0 · RBAC 재설계 0 · membership 정책 변경 0 ·
  Signage View 공통화 0 · 새 serviceKey mapping 체계 0 · 무관 API 정리 0.

---

## 12. 잔여 사항 (보고만, 별도 WO 대상)

1. **`allowSignageStoreRead` 는 소유 검사 자체가 없다.** `/global/*` 읽기 전용이라 조직 스코프 데이터는
   아니지만, store 컨텍스트를 헤더 값 그대로 신뢰한다. 본 WO 범위(store-scoped) 밖이라 미변경.
2. **귀속 SSOT 가 없는 signage serviceKey**: `pharmacy` · `tourism` · `common` · `neture` · `test` 는
   `STORE_SERVICE_ORG_LINKAGE` 항목이 없어 귀속 검사를 건너뛴다(기존 동작 유지). 추정 차단은 §9 위반이라 하지 않았다.
3. **K-Cosmetics 프론트는 signage `serviceKey='k-cosmetics'` 를 보내는데 `validateServiceKey` 화이트리스트에 없어
   400 이 된다** — KCos signage 는 이미 동작하지 않는 상태. 본 WO 와 무관한 선행 결함.
4. 로그인 API 가 간헐적으로 500 을 반환한 사례 1건 (재시도 시 200). 재현되지 않아 기록만 남긴다.

---

## 13. Git

| 항목 | 값 |
|---|---|
| 커밋 | `329a050b9` fix(signage): store 가드에 organization↔service 귀속 검사 추가 |
| 파일 | middleware 1 · resolver 1 · spec 1 (+ 본 CHECK) |
| stage 방식 | path-specific (`git add .` 미사용) |
| 배포 | Deploy API Server (Cloud Run) success — 프로덕션 매트릭스로 반영 확인 |

## 14. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
