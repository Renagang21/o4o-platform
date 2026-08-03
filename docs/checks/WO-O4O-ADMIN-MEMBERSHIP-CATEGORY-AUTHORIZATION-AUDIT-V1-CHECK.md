# WO-O4O-ADMIN-MEMBERSHIP-CATEGORY-AUTHORIZATION-AUDIT-V1 — CHECK

> **선행**: `WO-O4O-ADMIN-MEMBERSHIP-CATEGORY-API-PREFIX-FIX-V1` §17 관측 항목
> **일자**: 2026-08-03 · branch `main` · 시작 HEAD `43c017dae`
> **성격**: READ-ONLY 조사. **코드 수정 0 · 운영 데이터 쓰기 0 · 배포 0**

---

## 0. 시작 기준

| 항목 | 값 |
|---|---|
| branch | `main` |
| HEAD | `43c017dae` |
| `git status` | 다른 세션의 HFF 산출물 8건(untracked)만 존재 — **미접촉** |
| 동기화 | `git pull --ff-only origin main` → `Already up to date` |
| `pnpm-lock.yaml` | 미변경 |

---

## 1. 전체 route 연결 구조

```
main.ts:50            const app = express()
main.ts:127           setupMiddlewares(app)          ← 전역 미들웨어 (아래 §3)
main.ts:186           registerDomainRoutes(app, AppDataSource)
  register-routes.ts:364
      app.use('/api/v1/membership', createMembershipRoutes(dataSource))   ← guard 인자 없음
        routes/index.ts:55
            router.use('/categories', createCategoryRoutes(dataSource))   ← guard 없음
              categoryRoutes.ts:11-85
                  handler 6개 — 미들웨어 없이 바로 서비스 호출
                    services/MemberCategoryService.ts
                      repo(yaksa_member_categories) 직접 read/write
main.ts:190           app.use(globalErrorHandler)
```

`MemberCategoryService` 는 **인증·소유권·테넌트 검사를 전혀 하지 않는다.**
`delete()` 는 `repo.remove()` — **물리 삭제**다(soft delete 아님).

---

## 2. 6개 endpoint 별 판정

경로 접두 = `/api/v1/membership/categories`

| # | method | path | 기능 | 인증 미들웨어 | 권한 guard | 서비스 계층 보호 | write | **판정** |
|:-:|---|---|---|:-:|:-:|:-:|:-:|---|
| 1 | GET | `/` | 활성 분류 목록 | 없음 | 없음 | 없음 | — | **UNPROTECTED** |
| 2 | GET | `/:id` | 단건 조회 | 없음 | 없음 | 없음 | — | **UNPROTECTED** |
| 3 | POST | `/` | **생성** | 없음 | 없음 | 이름 중복 검사만 | ✅ | **UNPROTECTED** |
| 4 | PUT | `/:id` | **전체 수정** | 없음 | 없음 | 존재 검사만 | ✅ | **UNPROTECTED** |
| 5 | PATCH | `/:id` | **부분 수정(활성 토글)** | 없음 | 없음 | 존재 검사만 | ✅ | **UNPROTECTED** |
| 6 | DELETE | `/:id` | **물리 삭제** | 없음 | 없음 | 존재 검사만 | ✅ | **UNPROTECTED** |

`INDIRECTLY_PROTECTED` 는 **하나도 없다** — 근거는 §3.

---

## 3. 상위 공통 보호 존재 여부 — 없음

`setup-middlewares.ts` 의 전역 `app.use` 전량:

```
helmet · compression · cors · /uploads static · performanceMonitor
securityMiddleware · sqlInjectionDetection · tenantContextEnhanced
cookieParser · express.json · express.urlencoded · session
passport.initialize() · httpMetrics · slowThreshold
```

- **인증 미들웨어가 없다.** `passport.initialize()` 는 전략 등록일 뿐 검증을 수행하지 않는다
  (`passport.session()` 조차 없다).
- `cors` 는 **브라우저 전용** 통제라 `curl`·서버 간 호출을 막지 못한다.
- `register-routes.ts` 의 `app.use` 전량을 확인했으나 `/api/v1/membership` 앞에 붙은 guard 는 없다.
  (비교: 136행 `app.use('/api/v1/lms', kpaLmsScopeGuard)` — **mount 지점 guard 선례는 존재한다.**)

`membership-yaksa` 패키지의 **라우터 9개 전체**에서 인증 관련 식별자 출현 횟수:

```
affiliationRoutes 0 · auditLogRoutes 0 · categoryRoutes 0 · exportRoutes 0
index 0 · licenseVerificationRoutes 0 · memberRoutes 0 · statsRoutes 0 · verificationRoutes 0
```

유일한 예외는 `memberRoutes.ts` 의 `/me`·`/me/summary` 두 곳으로,
미들웨어가 아니라 **핸들러 내부에서 `req.user?.id` 를 직접 보고 401 을 반환**한다.

---

## 4. 안전한 런타임 검증 (READ-ONLY)

대상 `https://api.neture.co.kr` · **전부 비로그인**.
쓰기 판정에는 **존재할 수 없는 합성 UUID `00000000-0000-4000-8000-000000000000`** 만 사용했고,
운영 목록이 **0건**이라 어떤 행도 변경·삭제될 수 없다. **POST 는 행을 생성하므로 호출하지 않았다.**

| 요청 | 응답 | 해석 |
|---|---|---|
| `GET /membership/categories` | **200** `{"success":true,"data":[]}` | 인증 없이 **정상 응답** |
| `GET /membership/categories/{synthetic}` | **404** `Category not found` | **핸들러·서비스까지 도달** |
| `PUT /membership/categories/{synthetic}` | **400** `Category "…" not found` | **서비스 update() 까지 도달** |
| `PATCH /membership/categories/{synthetic}` | **400** `Category "…" not found` | 동일 |
| `DELETE /membership/categories/{synthetic}` | **400** `Category "…" not found` | **서비스 delete() 까지 도달** |
| **대조군** `GET /admin/users` | **401** `AUTH_REQUIRED` | 보호된 API 는 이렇게 응답한다 |
| **대조군** `PATCH /admin/users/{synthetic}/status` | **401** `AUTH_REQUIRED` | 동일 |

> **판정 근거의 핵심**: 쓰기 3종이 401 이 아니라 **"Category not found"** 를 반환했다.
> 이는 요청이 인증 계층에 막히지 않고 **서비스 계층의 존재 검사까지 통과해 들어갔다**는 뜻이다.
> 실제 행이 있었다면 그대로 수정·삭제됐을 것이다.
> 다만 **실제 write 성공을 관측한 것은 아니므로**, 판정은 "도달 가능"이며 과장하지 않는다.

### 인접 endpoint 확산 확인 (GET·상태만)

| endpoint | 비로그인 응답 |
|---|---|
| `/membership/members` | **200** (`data: []`, 페이지네이션 구조 노출) |
| `/membership/stats` | **200** (`totalMembers`·`unpaidFees`·`organizationBreakdown` 등 키 노출) |
| `/membership/verifications` | **200** |
| **`/membership/export/categories.xlsx`** | **200 · 16,142 bytes** |
| **`/membership/export/members.xlsx`** | **200 · 16,436 bytes** |
| `/membership/audit-logs` | 500 |
| `/membership/members/me/summary` | 401 (핸들러 자체 검사) |

> **`export/*.xlsx` 두 개가 비로그인으로 파일을 내려준다.** 회원 명부 내보내기 경로다.
> 현재는 회원 0건이라 실 데이터가 담기지 않지만(응답 크기는 xlsx 템플릿 오버헤드),
> **회원이 등록되는 즉시 개인정보가 무인증 다운로드 대상이 된다.**
> 값은 확인하지 않았고 구조(키 이름)만 기록했다.

---

## 5. 화면 접근 제어 vs API 보호 — 완전히 분리돼 있다

| 계층 | 상태 |
|---|---|
| 화면 route guard | ✅ `AdminProtectedRoute requiredPermissions={['membership:manage']}` ([yaksa.routes.tsx:78](apps/admin-dashboard/src/routes/yaksa.routes.tsx#L78)) |
| 메뉴 노출 | 현재 **미연결** (다음 WO 예정) |
| API 요청 시 토큰 | ✅ `authClient` 가 쿠키·Bearer 를 실어 보냄 |
| **백엔드 토큰 검증** | ❌ **없음 — 토큰을 아예 읽지 않는다** |

즉 **관리자 화면은 잠겨 있으나 API 는 열려 있다.**
화면을 통하지 않고 `curl` 로 직접 호출하면 권한 검사가 전혀 없다.
**메뉴를 연결하든 말든 이 노출은 변하지 않는다** — 메뉴 연결은 완화도 악화도 아니다.

---

## 6. 비교한 기존 관리자 API 보호 패턴

| API | 패턴 |
|---|---|
| **`/api/v1/admin/users`** (Core Freeze) | `router.use(authenticate)` + `requireRole(['platform:admin','platform:super_admin'])` — [users.routes.ts:29-35](apps/api-server/src/routes/admin/users.routes.ts#L29-L35) |
| `/api/v1/lms` | mount 지점 guard: `app.use('/api/v1/lms', kpaLmsScopeGuard)` |
| `/api/v1/membership/**` | **없음** |

**표준은 `authenticate` + `requireRole(ADMIN_ROLES)` 이며 재사용 가능하다.**
다만 `membership-yaksa` 는 패키지라 `apps/api-server` 의 미들웨어를 직접 import 할 수 없다
(App 계층 역방향 의존 금지). 따라서 적용 지점은 둘 중 하나다.

1. **mount 지점 guard** — `register-routes.ts` 에서 categories 경로에만 미들웨어를 끼운다 (LMS 선례와 동일)
2. **factory 주입** — `createMembershipRoutes(dataSource, { adminGuard })` 로 미들웨어를 주입한다

---

## 7. 실제 보안 결함 여부와 영향 범위

**결함은 실재한다.** 다만 현재 피해 규모는 데이터가 없어 제한적이다 — 두 가지를 구분해 적는다.

| 구분 | 현재(2026-08-03) | 데이터가 생기면 |
|---|---|---|
| 분류 조회 | 0건이라 노출 정보 없음 | 분류 체계·**연회비 금액** 공개 노출 |
| 분류 **생성**(POST) | **지금도 가능** — 누구나 임의 분류 주입 | 동일 |
| 분류 수정·토글 | 대상 행이 없어 실효 없음 | **무인증 변조 가능** |
| 분류 **삭제**(DELETE) | 대상 행이 없어 실효 없음 | **무인증 물리 삭제** (복구 불가) |
| 회원 목록·명부 xlsx | 0건 | **개인정보 무인증 유출** |

> **가장 급한 것은 `POST /categories` 다.** 유일하게 **지금 당장** 상태를 바꿀 수 있는 경로이며,
> 분류명이 유니크 인덱스라 선점 주입 시 정상 분류 생성이 막힐 수 있다.
> (검증 시 호출하지 않았으므로 **성공을 관측한 것은 아니다** — 코드 경로 판정이다.)

---

## 8. 권장 최소 수정안 — 범위를 넓히지 않는 방법

### ⚠️ mount 전체에 admin guard 를 걸면 안 된다

`/api/v1/membership` 아래에는 **일반 회원용 경로가 섞여 있다.**

```
apps/main-site/src/pages/mypage/MemberProfilePage.tsx  → GET /membership/me
apps/main-site/src/pages/member/MemberHome.tsx         → GET /membership/members/me/summary
apps/main-site/src/pages/mypage/MemberProfilePage.tsx  → GET /membership/audit-logs/member/:id
```

`app.use('/api/v1/membership', authenticate, requireRole(ADMIN_ROLES), …)` 로 일괄 적용하면
**main-site 의 마이페이지가 깨진다.** 이번 조사에서 확인된 가장 중요한 제약이다.

### 권장안 (이번 WO 범위 밖 — 실행하지 않음)

```
1단계 (최소·즉시)  categories 서브트리에만 guard
    register-routes.ts:364 직전에
      app.use('/api/v1/membership/categories', authenticate, requireRole(ADMIN_ROLES))
    → 라우터 순서상 뒤의 createMembershipRoutes 로 내려가기 전에 차단된다.
    → 변경 1곳. membership-yaksa 패키지 무변경. main-site 영향 0.

2단계 (동일 위험)   export/*.xlsx 도 같은 방식으로 보호
3단계 (별도 판단)   members·stats·verifications·audit-logs 정책 통일
```

**Admin Dashboard 현재 호출 유지 여부**: 유지된다.
`CategoryManagement` 는 `authClient` 로 토큰을 이미 실어 보내고 있고
화면 자체가 `membership:manage` 로 잠겨 있으므로, 서버가 검증을 시작해도 정상 관리자에게는 변화가 없다.
**단, `requireRole` 에 넣을 역할 집합이 화면의 `membership:manage` 와 일치하는지 확인이 필요하다**(§9).

---

## 9. 필요한 권한 정책 — 결정이 필요한 지점

| 질문 | 조사 결과 |
|---|---|
| 회원 분류는 전역인가 서비스별인가 | **테이블 `yaksa_member_categories` 에 `serviceKey`·`organizationId` 컬럼이 없다.** `name` 이 전역 UNIQUE. → **yaksa(KPA) 도메인 단일 전역 설정** |
| 최소 권한은 | 전역 설정이므로 **플랫폼 관리자** 또는 **KPA 서비스 관리자** 중 택일 |
| 기존 상수 재사용 가능한가 | ✅ `ADMIN_ROLES = ['platform:admin','platform:super_admin']` · `authenticate` · `requireRole` |
| 화면 권한과 일치하는가 | ❓ 화면은 `membership:manage` **permission**, 백엔드 표준은 **role** 기반. **매핑 확인 필요** |

> **중지 조건 해당**: "서비스별 권한과 플랫폼 관리자 권한 중 어느 것을 적용할지 결정이 필요함".
> 테이블이 `yaksa_` 접두인데 mount 는 서비스 중립적 `/api/v1/membership` 이라
> **`platform:admin` 로 잠글지 `kpa:admin` 까지 허용할지는 정책 판단**이며 코드로 확정할 수 없다.
> 따라서 조사를 여기서 멈추고 수정에 착수하지 않았다.

---

## 10. 메뉴 연결 진행 가능 여부

**판정: 메뉴 연결은 이 결함에 의해 차단되지 않는다. 다만 순서상 뒤로 두는 것이 맞다.**

근거:
- 메뉴 연결은 **화면 노출**만 바꾼다. 화면은 이미 `membership:manage` 로 잠겨 있다.
- API 노출은 메뉴 유무와 **무관하게 이미 열려 있다** — 연결해도 악화되지 않고, 미연결로 둬도 완화되지 않는다.

그럼에도 **보호를 먼저 넣는 편이 낫다.** 메뉴를 먼저 열면 화면에서 분류를 만들기 시작하고,
그 시점부터 §7 의 "데이터가 생기면" 열이 현실이 되기 때문이다.
**현재 0건인 지금이 가장 안전하게 고칠 수 있는 시점이다.**

---

## 11. 조사 중 발견한 별개 기능 결함 (범위 밖 · 기록만)

`MemberCategoryService.list()` 는 `where: { isActive: true }` 로 고정돼 있다.

```ts
async list(): Promise<MemberCategory[]> {
  return await this.repo.find({ where: { isActive: true }, … });
}
```

관리자 화면은 이 목록만 받으므로 **비활성 분류는 화면에서 사라진다.**
결과적으로 분류를 비활성화하면 **화면에서 다시 활성화할 방법이 없다**(편집 진입 자체가 불가).
`CategoryManagement` 가 "비활성" 배지를 렌더하는 코드를 갖고 있지만 **도달할 수 없는 분기**다.

> 선행 WO 의 "활성 토글" 정상화와 직결되는 사안이나 **서비스 계층 변경이 필요해 이번 범위 밖**이다.
> 보호 작업 또는 메뉴 연결 WO 에서 함께 다룰지 판단이 필요하다.

---

## 12. 운영 데이터 쓰기

| 항목 | 값 |
|---|---:|
| 분류 생성·수정·삭제 | **0** |
| POST 호출 | **0** (행 생성 위험으로 의도적 미호출) |
| PUT·PATCH·DELETE 호출 | 3 (**존재하지 않는 합성 UUID 전용** → 변경된 행 **0**) |
| DB 직접 접속 | **0** |
| 코드 수정 | **0** |
| 배포 | **0** |
| 민감정보 기록 | **0** (응답 값 미출력, 구조·키 이름만 기록) |

---

## 13. 변경 파일

| 파일 | 변경 |
|---|---|
| `docs/checks/WO-O4O-ADMIN-MEMBERSHIP-CATEGORY-AUTHORIZATION-AUDIT-V1-CHECK.md` | 신규 (본 문서) |

**그 외 변경 없음.**

---

## 14. pnpm-lock.yaml 및 다른 세션 작업물

| 항목 | 상태 |
|---|---|
| `pnpm-lock.yaml` | **미변경·미포함** |
| HFF·OTC 산출물 (untracked 8건) | **미접촉** |
| 기존 staged 파일 | 없음 |
| commit 방식 | `--only -- <pathspec>` 단일 파일 |

---

## 15. 최종 판정 요약

| 항목 | 결과 |
|---|:--:|
| 6개 endpoint 전부 | **UNPROTECTED** |
| 상위 공통 보호 | **없음** |
| 화면 guard | ✅ 존재 (API 와 분리) |
| 실제 무인증 도달 검증 | ✅ read 2 · write 3 (합성 UUID) |
| 인접 노출 | `members`·`stats`·`verifications`·**`export/*.xlsx` 2건** |
| 현재 실피해 | 데이터 0건이라 제한적 — 단 **POST 주입은 지금도 가능** |
| 권장 조치 | categories 서브트리 guard (**mount 전체 적용 금지** — main-site 파손) |
| 미결 정책 | `platform:admin` vs `kpa:admin` — **사용자 결정 필요** |
| 메뉴 연결 | 차단되지 않음. 단 **보호 후 진행 권장** |
