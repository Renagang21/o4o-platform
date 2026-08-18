# CHECK — O4O Cross-Service Profile Final Browser Closure V1

- **WO**: [`WO-O4O-CROSS-SERVICE-PROFILE-FINAL-BROWSER-CLOSURE-V1`](../work-orders/WO-O4O-CROSS-SERVICE-PROFILE-FINAL-BROWSER-CLOSURE-V1.md)
- **선행 CHECK**: [`CHECK-O4O-CROSS-SERVICE-SELF-PROFILE-WRITE-CONTRACT-V1`](CHECK-O4O-CROSS-SERVICE-SELF-PROFILE-WRITE-CONTRACT-V1.md) · [`CHECK-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1`](CHECK-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1.md)
- **작성일**: 2026-08-19
- **성격**: production browser 검증 + 발견 결함 수정 + Profile 트랙 FINAL CLOSE
- **상태**: ACTIVE · 판정 **PROFILE TRACK = FINAL CLOSED**

---

## 1. 기준 commit / deployed revision

| 항목 | 값 |
|------|-----|
| 시작 기준 | `origin/main` (선행 구현 `408fe8e0c` · 선행 CHECK `c86d6fd0d` 모두 ancestor 확인) |
| 본 WO 수정 commit ① | `910431dcc` fix(auth-utils): normalizeUser 에 nickname 포함 — 프로필 저장 시 nickname 소실 방지 |
| 본 WO 수정 commit ② | `becd8e71e` fix(auth-utils): 표시명 정본을 `users.name`(displayName) 으로 정정 |
| 본 WO 수정 commit ③ | `5bc5e3c83` fix(auth): displayName 우선순위를 name 정본 기준으로 정정 (backend `/auth/me` · `/auth/login`) |
| Web 배포 | `Deploy Web Services (Cloud Run)` run `32113478149` (headSha `becd8e71e`) = **success** |
| API 배포 | `Deploy API Server (Cloud Run)` run `32114440439` (headSha `349137d9f`, ③ 포함) = **success** |
| 현재 API revision | `o4o-core-api-03370-fq8` |
| 검증 시점 bundle | KCos `index-BrnYmxAd.js` · Neture `index-DnUKht1h.js` |
| 세 commit ancestor 확인 | `910431dcc` / `becd8e71e` / `5bc5e3c83` 모두 `origin/main` ancestor |

**도메인 주의 (기록)** — K-Cosmetics 의 실제 플랫폼 진입점은 **`k-cosmetics.site`** 다.
`k-cosmetics.co.kr` 는 카페24 페이지이며 O4O 플랫폼과 무관하다 (페이지 타이틀 `카페24`).
`.github/workflows/deploy-web-services.yml` 의 `VITE_SERVICE_URL_K_COSMETICS: https://k-cosmetics.site` 가 정본이다.
검증 도메인을 `.co.kr` 로 잡으면 전혀 다른 사이트를 검증하게 되므로 후속 작업에서도 `.site` 를 쓴다.

---

## 2. K-Cosmetics browser 결과 (`https://k-cosmetics.site/mypage/profile`)

계정: `sohae2100@gmail.com` (TEST-ACCOUNTS SSOT). 로그인은 브라우저 저장 세션 / autofill 경유 — 비밀번호를 명령·문서·로그에 남기지 않았다.

| 확인 항목 | 결과 |
|---|---|
| `/mypage/profile` 진입 | PASS — HTTP 200, 렌더 정상 |
| `AccountProfileSection` 렌더 | PASS — 이름 / 닉네임(공개 안내문 포함) / 연락처 / 이메일(read-only) / 역할 |
| 기존 값 표시 | PASS — 이름 `서철환` · 닉네임 `Rena` · 연락처 `01025733743` |
| 편집 진입 시 prefill | PASS — `["서철환","Rena","01025733743"]` (수정 ① 이전에는 닉네임이 빈 값이었다) |
| 저장 | PASS — `PATCH /api/v1/users/me/profile` 200 |
| 새로고침 persist | PASS |
| 원복 | PASS |
| 원복 재조회 | PASS — `GET /users/me/profile` = name `서철환` · nickname `Rena` · phone `01025733743` · displayName `서철환` |
| `editableFields` | `["name","firstName","lastName","nickname","phone"]` (ACCOUNT_CORE allowlist 와 일치) |
| BusinessProfileSection 회귀 | 회귀 없음 (해당 계정 노출 범위 내) |
| 404 / 403 / 5xx | **0** |
| console error | **0** |
| 무한 refetch · 중복 save | 없음 |

---

## 3. Neture browser 결과 (`https://neture.co.kr/mypage/profile`)

| 확인 항목 | 결과 |
|---|---|
| `/mypage/profile` 진입 | PASS — HTTP 200, `마이페이지 > 프로필` 렌더 |
| `AccountProfileSection` 렌더 | PASS — 이름 / 이메일(read-only) / 역할(`관리자`) |
| 기존 값 표시 | PASS — 이름 `서철환` |
| 편집 진입 시 prefill | PASS — `["서철환"]` |
| 저장 | PASS — 200, 헤더 표시명 즉시 반영 |
| 새로고침 persist | PASS (수정 ②③ 이전에는 **FAIL** — §4 D-2 참조) |
| 원복 | PASS |
| 원복 재조회 | PASS — `GET /users/me/profile` name `서철환` · nickname `Rena` · phone `01025733743`, `GET /auth/me` displayName `서철환` |
| `/mypage/settings` (AccountSecuritySettings) | PASS — 보안 설정 / 비밀번호 변경 / 모든 기기 로그아웃 렌더, 4xx 0 |
| `/mypage/business-profile` (MyBusinessProfilePage) | 진입 자체는 정상 (HTTP 200). 검증 계정이 공급자가 아니어서 `/neture/supplier/*` 가 401 → "공급자 프로필을 불러오지 못했습니다 / 다시 시도" 표시. **Profile Core 회귀 아님** (권한 기반 정상 동작 · 조회 실패 삼킴 계약대로 오류 노출) |
| `/supplier/profile` (SupplierProfilePage 축) | 진입 정상 — 비공급자 계정에 `접근 권한이 없습니다` 가드 화면. 회귀 없음 |
| Profile 화면 자체의 404 / 403 / 5xx | **0** |
| console exception (JS 예외) | **0** |

> Neture 프로필 화면은 이름·이메일·역할만 노출한다 (닉네임 / 연락처 미노출). KCos 와 필드 집합이 다른 것은 기존 서비스별 폼 범위이며 이번 WO 범위 밖이다.

---

## 4. 발견 결함 2건 — 원인 · 수정 · 재검증

**두 결함 모두 production API smoke(`PATCH /users/me/profile` → 재조회)에서는 드러나지 않고 브라우저에서만 드러났다.**
API 계약 자체는 처음부터 정상이었고, 깨진 곳은 (a) 프론트 공통 정규화, (b) `/auth/me` 표시명 파생이었다.

### D-1. `normalizeUser` 가 `nickname` 을 탈락시킴 (frontend) — commit `910431dcc`

| 항목 | 내용 |
|---|---|
| 증상 | KCos / Neture 프로필 편집 폼의 닉네임이 **빈 값으로 로드**. 그 상태로 저장하면 기존 nickname 이 지워진다 (silent data loss) |
| 원인 | `packages/auth-utils/src/normalizeUser.ts` 반환 객체에 `nickname` 이 없었다. `...apiUser` spread 없이 이 결과만 쓰는 소비처(`buildPlatformUser` 경로 = Neture · KCos)에서 필드가 사라진다. `/auth/me` 는 nickname 을 정상적으로 내려주고 있었다 |
| API smoke 로 안 잡히는 이유 | 결함이 서버 응답이 아니라 **클라이언트 정규화 계층**에 있었다. API 만 호출하면 nickname 은 항상 정상으로 보인다 |
| 수정 | `normalizeUser` 반환에 `nickname` 포함 + `buildPlatformUser` 경유 보존 |
| 재검증 | KCos 편집 진입 prefill = `["서철환","Rena","01025733743"]` (PASS) |

### D-2. `displayName` 이 파생 `lastName+firstName` 을 우선함 (backend) — commit `5bc5e3c83` (+ frontend 정합 `becd8e71e`)

| 항목 | 내용 |
|---|---|
| 증상 | Neture 프로필에서 이름을 저장하면 화면에는 반영되는데 **새로고침하면 옛 이름으로 되돌아감**. DB 에는 새 값이 저장돼 있었다 (`GET /users/me/profile` = `서철환QA` 인데 `GET /auth/me` displayName = `서철환`) |
| 원인 | canonical self-profile 계약(`PATCH /users/me/profile`)이 수정하는 표시명 정본은 `users.name` 인데, `/auth/me` · `/auth/login` 의 `displayName` 은 `lastName + firstName` 파생값을 **먼저** 사용했다. name 만 수정하는 canonical 경로에서는 파생값이 갱신되지 않아 새로고침 시 옛 값이 돌아왔다 |
| API smoke 로 안 잡히는 이유 | smoke 는 `PATCH` → `GET /users/me/profile` 만 왕복했다. 화면 표시명은 `GET /auth/me` 의 `displayName` 을 쓰므로, **두 엔드포인트가 서로 다른 값을 내는 상태**가 API 단독 검증에서는 보이지 않았다 |
| 수정 (backend) | `auth-account.controller.ts` · `auth-login.controller.ts` 의 우선순위를 `name > (lastName+firstName) > email prefix > '사용자'` 로 정정. `lastName/firstName` 을 쓰는 write 경로(KPA `mypage.service` · `MembershipConsoleController`)는 `name` 을 함께 동기화하므로 name 이 항상 최신이다 |
| 수정 (frontend 정합) | `normalizeUser` 표시명 우선순위를 `displayName(= users.name) > name > fullName` 로 정정 |
| 재검증 | API 배포(run `32114440439`) 후 Neture: 저장 → 새로고침 persist **PASS**, 원복 후 `/auth/me` displayName = `서철환` |

---

## 5. console / network 결과

| 대상 | 결과 |
|---|---|
| KCos `/mypage/profile` (조회·편집·저장·원복 전 구간) | console error 0 / 4xx·5xx 응답 0 |
| KCos `/mypage/settings` | HTTP 200 / 4xx 0 |
| Neture `/mypage/profile` (전 구간) | console JS 예외 0 / 4xx·5xx 응답 0 |
| Neture `/mypage/settings` | HTTP 200 / 4xx 0 |
| Neture `/mypage/business-profile` · `/supplier/profile` | `neture/supplier/*` 401 — **비공급자 계정의 정상 권한 거부**. Profile Core 무관, 회귀 아님 |
| 미인증 상태 진입 시 `auth/me` · `auth/refresh` 401 | 세션 만료 후 재로그인 전 관측. 로그인 후 재현 없음 (정상 동작) |
| 무한 refetch / 중복 save | 관측 없음 |
| cross-service contamination | 없음 — KCos 세션 · Neture 세션이 각자 값만 조회·수정 |

---

## 6. 코드 수정 여부

| 파일 | 성격 |
|---|---|
| `packages/auth-utils/src/normalizeUser.ts` | nickname 포함 + 표시명 우선순위 정정 |
| `packages/auth-utils/src/buildPlatformUser.ts` | nickname 보존 |
| `packages/auth-utils/src/types.ts` | `ApiUser.displayName` 타입 추가 |
| `apps/api-server/src/modules/auth/controllers/auth-account.controller.ts` | `/auth/me` displayName 우선순위 정정 |
| `apps/api-server/src/modules/auth/controllers/auth-login.controller.ts` | `/auth/login` displayName 우선순위 정정 |

DB schema / migration / Identity 재설계 / membership 구조 변경 / 신규 기능 = **0**.

---

## 7. typecheck / build / test

| 항목 | 결과 |
|---|---|
| `@o4o/auth-utils` build (`tsc --build`) | PASS |
| `web-k-cosmetics` typecheck | OK |
| `web-neture` typecheck | OK |
| `web-glycopharm` typecheck | OK |
| `web-pharmacy-hub` typecheck | OK |
| `web-account` typecheck | OK |
| `web-kpa-branch` typecheck | OK |
| `apps/api-server` typecheck | PASS (exit 0) |
| `auth-account.businessInfoWrite.test.ts` + `self-profile-write-contract.spec.ts` | PASS — 2 suites / **33 tests** |
| CI / Deploy | Web `32113478149` success · API `32114440439` success |

공통 패키지(`@o4o/auth-utils`) 변경이므로 GP · PH · account · kpa-branch 포함 6 소비처 전부 typecheck 회귀를 확인했다.

---

## 8. production write / 원복

| 항목 | 값 |
|---|---|
| 대상 | 테스트 계정 `sohae2100@gmail.com` **본인만** |
| 필드 | ACCOUNT_CORE allowlist (`nickname` @KCos · `name` @Neture) |
| 절차 | 변경 전 값 기록 → 수정 → 저장 → 새로고침 persist → 원복 → 재조회 |
| KCos 최종 상태 | name `서철환` · firstName `철환` · lastName `서` · nickname `Rena` · phone `01025733743` · displayName `서철환` |
| Neture 최종 상태 | 동일 (`GET /users/me/profile` · `GET /auth/me` 양쪽 재조회 확인) |
| 잔존 `QA` 접미사 | **0** — UI · API 양쪽에서 재확인 |
| role / status / membership / service_credentials / businessInfo / organizations / 타 사용자 | 미접촉 |

자격증명: 브라우저 autofill 로만 취득해 페이지 컨텍스트 안에서 사용했다. 비밀번호는 코드·스크립트·명령·CHECK·Git·로그·환경변수 어디에도 남기지 않았다 (WO §6).

---

## 9. 잔존 followup (closure blocker 아님)

| # | 항목 | 성격 | 제안 |
|---|------|------|------|
| R1 | `UserController.getProfile/updateProfile` (dead 구현) 잔존 | dead code | dead backend cleanup 계열 WO |
| R2 | `PharmacyHubAccountController` + `/pharmacy-hub/store-owner/account/profile` (소비처 0) | legacy | 별도 은퇴 WO |
| R4 | `email` 변경 계약 부재 (본인 인증 절차 필요) | 미구현 | 별도 WO |
| R5 | 4서비스 `마이페이지` ↔ PH `내 프로필` 라벨 축 불일치 | 용어 | 정합화 후속 WO |

이번 WO 에서 수정하지 않았다. WO §11 에 따라 이 4건 때문에 FINAL CLOSE 를 보류하지 않는다.

관측 기록 (신규 결함 아님):

- Neture `/mypage/business-profile` 은 비공급자 계정에서 401 → 오류 카드. 권한 기반 정상 동작이지만, 진입 자체를 역할로 게이팅할지는 My Page 공통화 트랙에서 판단할 사안이다.
- KCos 와 Neture 의 프로필 필드 집합이 다르다 (KCos: 이름·닉네임·연락처 / Neture: 이름). 의도된 서비스별 폼 범위이며 통일 여부는 My Page 공통화 트랙 사안이다.

---

## 10. PROFILE TRACK 최종 판정

WO §10 FINAL CLOSE 기준 대조:

| 기준 | 결과 |
|---|---|
| KCos browser PASS | PASS |
| Neture browser PASS | PASS |
| 화면 렌더 | PASS |
| 기존 값 조회 | PASS |
| 편집 | PASS |
| 저장 | PASS |
| 새로고침 persist | PASS |
| 원복 | PASS |
| 예상 외 401/403/404/5xx | 0 (Profile 화면 기준) |
| console exception | 0 |
| Profile Core runtime 오류 | 0 |
| cross-service contamination | 0 |

```text
PROFILE TRACK = FINAL CLOSED
```

후속으로 My Page 공통화(census → Core/Extension 판정 → 공통화 → 5서비스 adoption → production 검증)를 별도 WO 로 시작한다. 이번 WO 에서는 착수하지 않았다.

---

## 11. CHECK / commit / push

| 항목 | 값 |
|------|-----|
| 코드 commit | `910431dcc` · `becd8e71e` · `5bc5e3c83` (전부 push 완료 · `origin/main` ancestor) |
| CHECK commit | 본 문서 (docs only) |
| 선행 CHECK 상태 정합화 | `CHECK-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1` · `CHECK-O4O-CROSS-SERVICE-SELF-PROFILE-WRITE-CONTRACT-V1` → **FINAL CLOSED** 표기 (WO §12) |
| 인프라 변경 | 0 (Cloud Run config · env · secret · IAM 무변경, migration 0) |
| stage 방식 | path-specific only (`git add .` 미사용) |
| 타 세션 작업 | 다른 세션의 미커밋 변경(`apps/api-server/src/utils/crypto.ts` 등)은 손대지 않았다 |
| 완료 기준 | 본 WO 범위 미커밋 변경 0 / `HEAD == origin/main` |

---

문서 정합: 발견 2건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 4건 (R1·R2·R4·R5)
