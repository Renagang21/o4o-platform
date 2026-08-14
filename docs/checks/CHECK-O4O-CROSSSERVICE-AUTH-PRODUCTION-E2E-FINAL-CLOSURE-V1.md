# CHECK — WO-O4O-CROSSSERVICE-AUTH-PRODUCTION-E2E-FINAL-CLOSURE-V1

- **작업일**: 2026-08-14
- **기준**: `origin/main` (착수 `f004f5df2` → 수정 커밋 `4e62945ad`)
- **성격**: production E2E 마감 + GlycoPharm return URL 결함 최소 수정
- **핵심 결론**: 공식 4서비스 + GlycoPharm 의 **정상 로그인 · return URL · 세션 복구 10/10 PASS**.
  선행 WO 에서 미확정이던 **GlycoPharm return URL 결함의 원인을 실증 확정하고 수정·배포·production 재검증까지 완료**했다.
  UI 로그아웃 9/10(PH 모바일 1건 미확정). 신규 발견 1건(**rejected 계정 상태 오표기**)은 backend 계약 변경이 필요해 분리한다.

---

## 1. 전용 계정 확보 (WO §1) — 병렬 세션과 분리

선행 WO 에서 `o4o-smoke-mystore*` 계정을 **다른 세션이 동시에 조작**해(12:39·12:42 재-suspend) 검증이 중단됐다.
이번에는 **이 WO 전용 식별자**로 계정을 새로 만들어 충돌을 원천 차단했다.

| 계정 | 이메일 | 용도 |
|---|---|---|
| MAIN | `o4o-e2e-auth-main@neture.co.kr` | 5 서비스 로그인·세션·로그아웃·return URL |
| NOTMEMBER | `o4o-e2e-auth-notmember@neture.co.kr` | `SERVICE_NOT_MEMBER` fixture (neture membership 만 보유) |
| PENDING | `o4o-e2e-auth-pending@neture.co.kr` | `status=pending` fixture |
| REJECTED | `o4o-e2e-auth-rejected@neture.co.kr` | `status=rejected` fixture |

- 생성 경로: canonical `POST /api/v1/admin/users` (SQL 조립 아님). 같은 이메일로 serviceKey 를 바꿔
  반복 호출하면 **기존 credential 을 덮지 않고**(`KEEP_EXISTING_CREDENTIAL`) 서비스별 L2 자격이 누적된다.
- MAIN 은 5 서비스 credential + 매장 경영자 role 보유(role 추가 시 `credentialPolicy=KEEP_EXISTING_CREDENTIAL` 확인 — 비밀번호 무변경).
- **비밀번호는 로컬 `C:/tmp/auth-e2e/.e2e_creds` 에만 존재**하며 문서·로그·커밋에 기록하지 않았다.
- **다른 세션의 `o4o-smoke-mystore*` 계정과 실사용자는 이번 작업에서 접촉 0.**

---

## 2. API 레벨 계약 매트릭스 (실측)

| 시도 | 결과 |
|---|---|
| MAIN × `neture` / `kpa-society` / `k-cosmetics` / `glycopharm` / `pharmacy-hub` | **200 × 5** · `accountAccess=normal` · 토큰 발급 |
| MAIN neture 비밀번호 × `kpa-society` (교차) | **401 `INVALID_CREDENTIALS`** — 토큰 없음 |
| NOTMEMBER × `kpa-society` (membership 없음) | **401 `SERVICE_NOT_MEMBER`** |
| PENDING × `neture` | **200** · `accountAccess=restricted` (제한 로그인) |
| REJECTED × `neture` | **403 `ACCOUNT_NOT_ACTIVE`** |

→ **서비스별 L2 credential 독립성 PASS.** 한 서비스 비밀번호로 다른 서비스에 로그인되지 않는다.
로그인은 **membership 을 credential 보다 먼저** 검사한다(`auth-login.service.ts` — SERVICE_NOT_MEMBER 가 선행).

---

## 3. production 브라우저 E2E — 5 서비스 × desktop/mobile (10 실행)

| 서비스 | 보호 route | 로그인 | return URL | 세션 복구 | UI 로그아웃 | 로그아웃 후 차단 | JS exception |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Neture | `/mypage` | ✅✅ | ✅✅ | ✅✅ | ✅✅ direct | ✅✅ | 0 |
| KPA-Society | `/mypage` | ✅✅ | ✅✅ | ✅✅ | ✅✅ menu | ✅✅ | 0 |
| K-Cosmetics | `/mypage` | ✅✅ | ✅✅ | ✅✅ | ✅✅ direct | ✅✅ | 0 |
| PharmacyHub | `/store-owner` | ✅✅ | ✅✅ | ✅✅ | ✅ / ⚠️ | ✅✅ | 0 |
| GlycoPharm | `/mypage` | ✅✅ | ✅✅ | ✅✅ | ✅✅ direct | ✅✅ | 0 |

(각 칸 = desktop / mobile)

- **정상 로그인 10/10 · return URL 10/10 · 세션 복구 10/10 · JS exception 0.**
- **UI 로그아웃 9/10** — 실제 로그아웃 컨트롤을 눌러 토큰 소거 + 새 탭(쿠키 포함) 보호 route 차단까지 확인했다.
  선행 WO 의 "localStorage 만 지우는" 무효 측정을 폐기하고 실제 UI 경로로 재측정한 결과다.
- ⚠️ **PharmacyHub 모바일 로그아웃 1건 미확정** — 로그아웃 버튼이 DOM 에는 있으나 클릭 도달에 실패했다
  (모바일에서 사이드바가 접혀 화면 밖에 있는 것으로 추정). **결함으로 단정하지 않는다** — §6-2.

### 3-1. Neture · GlycoPharm 의 보호 화면 동작 (정상)

두 서비스의 `/mypage` 는 `/login` 으로 **바운스하지 않고** 같은 URL 에서 "로그인이 필요합니다" 안내 +
로그인 진입 버튼을 렌더한다. 버튼을 눌러 모달로 로그인하면 그 자리에 머문다 → **return URL 요건 충족**.
초기 측정에서 실패로 보인 것은 하네스가 이 UX 를 따라가지 못한 것이었고, 제품 결함이 아니다.

---

## 4. GlycoPharm return URL 결함 — 원인 확정 · 수정 · 배포 · 재검증 (WO §4)

### 4-1. 선행 WO 상태

"`/store-hub` → 로그인 → `/store` 착지"라는 **사실**만 확인되고 원인은 추정으로 남아 있었다.

### 4-2. 원인 확정 (계측)

```text
/store-hub → GlycoHubGuard (state.from 보존) → /login
           → LoginGate: sessionStorage['glycopharm_login_return_url'] = "/store-hub"   ← 저장 정상
           → / + 로그인 모달
로그인 성공 → sessionStorage 값이 **null 로 비워짐** = LoginModal 이 소비하고 navigate("/store-hub") 수행
           → 그런데 최종 URL 은 "/store"
```

키가 소비됐다는 것이 결정적 증거다 — **모달은 제 일을 했고, 그 뒤에 다른 네비게이터가 덮었다.**

`PostLoginRedirect` 와 `LoginModal` 이 **같은 auth 상태 변화에 함께 반응하는 레이스**다.
`PostLoginRedirect` 는 "`/` 또는 `/login` 에서만 redirect" 로 가드하지만, 모달의 `navigate` 보다
먼저 실행되면 pathname 이 아직 `/` 라 가드를 통과해 역할 대시보드로 보내 버린다.

### 4-3. 최소 수정

| 파일 | 변경 |
|---|---|
| `services/web-glycopharm/src/components/common/LoginModal.tsx` | returnUrl 로 명시 이동할 때 `sessionStorage[LOGIN_EXPLICIT_NAV_KEY]='1'` 표시 |
| `services/web-glycopharm/src/App.tsx` | `PostLoginRedirect` 가 그 플래그를 보면 **1회 건너뛰고** 플래그 제거 |

- 기존 pathname 가드는 **그대로 두었다**(제거하지 않음).
- 상수는 `LOGIN_RETURN_URL_KEY` 와 동일한 **로컬 상수 패턴**을 따랐다 — App 이 LoginModal 을 import 하므로 역방향 import 는 순환이 된다.
- 다른 서비스 코드 무변경. 커밋 `4e62945ad`.

### 4-4. 배포 후 production 재검증 — **PASS**

```text
bounce: /            sessionStorage: "/store-hub"
로그인 후 URL: /store-hub   sessionStorage 잔존: null
returnUrl 복원: true
```

`Deploy Web Services (Cloud Run)` `4e62945ad` **completed / success** 후 실측. 회귀 확인용 전체 E2E 재실행에서도 10/10 유지.

---

## 5. 미가입 · pending · rejected UX (WO §5)

전용 fixture 로만 검증했다. **실사용자 상태 변경 0 · 임의 membership 생성 0.**

| 상태 | 브라우저 결과 (desktop·mobile 동일) | 판정 |
|---|---|:---:|
| 미가입 | KPA: **"이 계정은 KPA-Society 서비스에 가입되어 있지 않습니다. 회원가입 또는 서비스 이용 절차를 진행해 주세요."** + `회원가입 진행하기` 버튼 · 토큰 미발급 | **PASS** — 비밀번호 오류와 명확히 분리, 다음 행동 제시 |
| pending | Neture: 로그인 성공(`accountAccess=restricted`) 후 홈 진입 · 토큰 발급 | **PASS**(제한 로그인 설계대로 동작) |
| rejected | Neture: 토큰 미발급 + **"가입 승인 대기 중입니다. 운영자 승인 후 이용 가능합니다."** | **결함** — §6-1 |

---

## 6. 발견

### 6-1. rejected 계정에 "승인 대기 중" 오표기 (신규 · 중지·보고)

**사실**: `status=rejected` 계정으로 로그인하면 **"가입 승인 대기 중입니다"** 가 표시된다.
반려된 사용자에게 "대기 중"이라고 알리는 **상태 오표기**이며, 사용자는 기다리면 된다고 오해한다.

**원인**: 로그인 API 가 `rejected` 와 `suspended` 를 **모두 `403 ACCOUNT_NOT_ACTIVE` 하나로** 내려
프런트가 두 상태를 구분할 수 없다(실측: rejected → `ACCOUNT_NOT_ACTIVE`, suspended → `ACCOUNT_NOT_ACTIVE`).

**왜 이번에 고치지 않았는가**: 정확한 문구를 내려면 **응답 코드/필드를 나누는 backend API 계약 변경**이 필요하다.
WO 원칙 "권한·role·API 계약 변경이 필요하면 중지하고 정확한 원인을 보고한다" 에 해당 → 별도 WO 로 분리.

### 6-2. PharmacyHub 모바일 로그아웃 도달 실패 (미확정)

로그아웃 버튼이 DOM 에 존재하나 모바일 viewport 에서 클릭에 도달하지 못했다(접힌 사이드바 추정).
desktop 은 정상 동작한다. **결함으로 확정하지 않는다** — 햄버거 등 실제 사용자 경로로 도달 가능한지
확인이 남았다. 후속에서 다룬다.

### 6-3. (기존) PharmacyHub `footer-legal` 404

선행 CHECK §5 그대로 유효하며 인증과 무관하다. 별도 WO 로 유지한다 —
**조사 순서**: ① 공개 legal-profile 조회가 실제로 security scope 를 요구하는지 ② allowlist 에 PharmacyHub 만
추가하면 되는지 ③ scope config 가 설정 화면·write API 에만 필요한지 구분 ④ 데이터 부재 시 `200+null` 인지
`404` 인지 공통 계약 확정. **scope config 신설·seed 가 필요하다고 미리 확정하지 않는다.**

---

## 7. 검증 (WO §12)

| 대상 | 명령 | rc |
|---|---|:---:|
| `web-glycopharm` | `tsc -b` | **0** (error 0) |
| `glycopharm-web` | `pnpm build` | **0** |
| `web-kpa-society` | `pnpm build` | **0** |
| `web-k-cosmetics` | `pnpm build` | **0** |
| `pharmacy-hub-web` | `pnpm build` | **0** |
| `neture-web` | `pnpm build` | **0** |
| 배포 | `Deploy Web Services (Cloud Run)` `4e62945ad` | **success** |

---

## 8. 테스트 계정 정리 (WO §5 · 승인 범위)

| 계정 | 최종 status |
|---|---|
| `o4o-e2e-auth-main@neture.co.kr` | **suspended** |
| `o4o-e2e-auth-notmember@neture.co.kr` | **suspended** |
| `o4o-e2e-auth-pending@neture.co.kr` | **suspended** |
| `o4o-e2e-auth-rejected@neture.co.kr` | **suspended** |

4/4 `PATCH .../status {"status":"suspended"}` **HTTP 200** 후 재조회로 확인했다.
계정은 남겨 두었으므로 재사용 시 `approved` 로 전환하면 되고, 폐기해도 무방하다.
자격은 로컬 파일에만 있으며 계정이 suspended 라 무효다.

---

## 9. 완료 기준 대조

| 기준 | 결과 |
|---|:---:|
| 공식 4서비스 정상 로그인 | **PASS** (Neture 포함 4/4, 각 desktop/mobile) |
| 세션 복구 | **PASS** (10/10) |
| UI 로그아웃 | **PASS 9/10** (PH 모바일 1건 미확정 — §6-2) |
| return URL | **PASS** (10/10) |
| `SERVICE_NOT_MEMBER` · pending | **PASS** |
| rejected | **결함 발견** (§6-1 — backend 계약 변경 필요) |
| GlycoPharm return URL 회귀 해소 | **PASS** (원인 확정 · 수정 · 배포 · 재검증) |
| 서비스 간 credential 영향 0 | **PASS** |
| dead link · white screen · 무한 redirect · JS exception 0 | **PASS** |
| 테스트 계정 정리 | **PASS** (4/4 suspended) |
| typecheck · 5서비스 build · 배포 | **PASS** |
| 실사용자 · 타 세션 계정 변경 | **0** |

---

## 10. 후속

| # | 항목 | 사유 |
|---|---|---|
| 1 | rejected/suspended 상태 구분 응답 + 문구 정정 | §6-1. backend 로그인 응답 계약 변경 필요 |
| 2 | PharmacyHub 모바일 로그아웃 도달성 확인 | §6-2 |
| 3 | PharmacyHub legal-profile API adoption | §6-3 (인증과 분리) |

---

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건
