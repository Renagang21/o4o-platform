# CHECK — WO-O4O-REQUIREADMIN-MIDDLEWARE-CONTRACT-HARDENING-V1

- **일자**: 2026-08-11
- **범위**: `apps/api-server/src/common/middleware/auth/authorization.middleware.ts` 인증→역할 계약
- **schema 0 / migration 0 / DB write 0**
- **판정**: **PASS (라이브 우회 8+1건 폐쇄 — 아래 §3 확인 필요)**

---

## 1. 기존 결함 (재현 완료)

```ts
if (!req.user) {
  return requireAuth(req, res, next);   // ← 인증 성공 시 requireAuth 가 직접 next() 를 호출
}                                       //    → 위임한 쪽의 역할 검사는 실행되지 않는다
```

`requireAdmin` 단독 사용 시 **토큰만 유효하면 누구나 통과**한다. 401 은 정상 동작하므로 겉보기엔 가드가 있는 것처럼 보인다.

동일 패턴이 같은 파일의 **4개 미들웨어**에 있었다: `requireAdmin` · `requireRole` · `requirePermission` · `requireAnyPermission`.

**재현**: 신규 spec 을 수정 전 코드(`git show HEAD:…`)에 대고 실행 → **6 tests 실패**
(일반 인증 사용자·`cosmetics:admin`·`kpa-society:operator`·`seller` 가 `requireAdmin` 단독 route 를 통과, `requireRole` 단독도 역할 무시).
수정 후 동일 spec **15 tests 전부 PASS**.

---

## 2. 소비처 전수 (§6)

`requireAdmin|requireRole|requirePermission|requireAnyPermission` 사용 지점 **165건**.

| 구분 | 건수 | 비고 |
|---|---:|---|
| A. 같은 줄에 `authenticate` 선행 | 85 | 안전 |
| A. `router.use(authenticate)` 선행 | 49 | 안전 |
| B. 단독 | 31 | 아래 분해 |
| C. 다른 auth middleware 조합 | 0 | `optionalAuth` 는 인증을 강제하지 않아 A 로 치지 않음 |

**B 31건 분해**

| 파일 | 건수 | 실제 상태 |
|---|---:|---|
| `modules/cms/routes/cms.routes.ts` | 23 | **dead** — `cmsRoutes` 는 어디에도 mount 되지 않음 |
| `routes/channels/channels.routes.ts` | 4 | **live** — `/api/v1/channels` POST/PUT/PATCH/DELETE |
| `routes/content/content-assets.routes.ts` | 3 | **live** — `/api/v1/content/assets` GET 3건 |
| `routes/admin/dashboard.routes.ts` | 1 | 안전 — 바로 윗줄 `router.use(OWNED_PREFIXES, authenticate)` (스캔 휴리스틱 오탐) |

추가로 `requireRole` 단독 **1건** — `content-assets.routes.ts` `POST /:id/copy`.

**즉 WO 가 전제한 "현 소비처가 모두 `authenticate` 선행" 은 성립하지 않았다.**
`/api/v1/channels` 쓰기 4건과 `/api/v1/content/assets` 조회 3건은 **로그인한 아무 사용자나 호출 가능한 상태**였고, 이번 수정으로 닫혔다.

---

## 3. 수정 후 계약 · 동작 변화 (확인 필요)

`ensureAuthenticated(req, res)` 헬퍼를 도입해 `requireAuth` 를 호출하되 **next 를 가로채 호출자에게 제어를 되돌린다.**
- `true` → 인증 완료. 호출자가 역할 검사를 계속한다.
- `false` → `requireAuth` 가 이미 401 을 보냈다. 호출자는 아무것도 하지 않는다(이중 응답 없음).

4개 미들웨어 모두 동일 헬퍼를 사용한다. **역할 집합은 그대로다** (`requireAdmin` = `platform:super_admin` 단일, `WO-O4O-REQUIREADMIN-PREFIXED-ONLY-V1`).

| 경로 | 이전 실제 동작 | 이후 |
|---|---|---|
| `POST/PUT/PATCH/DELETE /api/v1/channels/*` | 인증만 되면 통과 | `platform:super_admin` 만 |
| `GET /api/v1/content/assets`, `/stats`, `/:id` | 인증만 되면 통과 | `platform:super_admin` 만 |
| `POST /api/v1/content/assets/:id/copy` | 인증만 되면 통과 | partner/affiliate/seller/supplier 만 |
| 그 외 134건 (authenticate 선행) | 정상 | **변화 없음** |

두 라우터의 소비처는 **admin-dashboard 단독**이고 주석·문서상 계약도 `(admin)` 이므로, 이번 변화는 **의도된 계약의 복원(축소)** 이지 확장이 아니다.
다만 그동안 super_admin 이 아닌 계정으로 채널 관리 화면을 쓰고 있었다면 배포 후 403 이 보일 수 있다 — 운영 확인이 필요하다.

---

## 4. 테스트

- 신규 `src/__tests__/security/require-admin-contract.spec.ts` — **15 tests PASS**
  비인증 401 / 만료 token 401 `TOKEN_EXPIRED` / 일반 사용자 403 / 서비스 admin·operator·seller 403 /
  `platform:super_admin` PASS + `next()` 1회 / `authenticate` 선행 조합 PASS + `next()` 중복 0 +
  `requireAuth` 재호출 0(JWT 재검증·`req.user` 덮어쓰기 없음) / `requireRole` 단독 401·403·PASS.
- 기존 `bootstrap/__tests__/admin-route-auth-boundary.test.ts` — 결함을 **사실로 고정**하던 테스트 1건을
  새 계약(위임 패턴 부재 + 헬퍼 사용) 검증으로 갱신했다. 해당 테스트 주석에 "guard 를 고치면 함께 갱신한다" 고 명시돼 있었다.
- 회귀: `src/__tests__/security` + `src/bootstrap/__tests__` + `admin-api-guard-inventory` + `service-admin-guard`
  → **19 suites / 472 tests 전부 PASS**. Product DB write authority(33) · dashboard owned-prefix ·
  supplier ownership guard · product-ai tags ownership 모두 유지.
- `tsc --noEmit -p apps/api-server/tsconfig.json` clean.

---

## 5. §8 권한 확장 금지 — 확인

서비스 admin/operator·일반 사용자·supplier·매장 경영자 누구도 새로 admin API 에 접근하지 못한다.
이번 변경의 방향은 **전부 축소**이며, 확장은 0건이다.

---

## 6. 변경 파일

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/common/middleware/auth/authorization.middleware.ts` | `ensureAuthenticated` 헬퍼 신설 + 위임 4곳 교체 |
| `apps/api-server/src/__tests__/security/require-admin-contract.spec.ts` | 신규 15 tests |
| `apps/api-server/src/bootstrap/__tests__/admin-route-auth-boundary.test.ts` | 결함 고정 → 새 계약 검증으로 갱신 |

schema 0 / migration 0 / DB write 0 / 새 테스트 계정 0.

---

## 7. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
— `modules/cms/routes/cms.routes.ts` 는 어디에도 mount 되지 않는 dead router(23 route)다. 이번 범위 밖이라 손대지 않았고, 은퇴 여부는 별도 WO 판단이 필요하다.
