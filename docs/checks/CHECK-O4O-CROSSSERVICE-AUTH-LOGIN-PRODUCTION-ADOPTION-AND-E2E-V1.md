# CHECK — WO-O4O-CROSSSERVICE-AUTH-LOGIN-PRODUCTION-ADOPTION-AND-E2E-V1

- **작업일**: 2026-08-14
- **기준**: `origin/main` `184eac978` (동기화 후)
- **성격**: 조사 + production 브라우저 검증 (코드 변경 0)
- **핵심 결론**: 구조 공통화는 **이미 완료**되어 있었다(5 서비스 전부 `@o4o/auth-react` 소비).
  자격 없이 가능한 production 검증은 **전부 PASS**(로그인 실패 UX · 보호 route 차단 · JS exception 0).
  그러나 **실계정 로그인이 필요한 완료 기준은 자격증명 부재로 미검증**이며, 별건으로
  **PharmacyHub 공개 화면 404(백엔드 scope drift)** 를 발견해 중지·보고한다.

---

## 1. 전제 정정 — 인증 공통화는 이미 main 에 있다

작업 착수 시 "`@o4o/auth-react` 트랙은 main 미병합" 이라는 인식이 있었으나 **실측 결과 틀렸다.**

| 확인 | 결과 |
|---|---|
| `packages/auth-react` main tracked | ✅ 11 파일 |
| 도입 커밋 | `bcdb1cf9b` → `9d9dfbb0b` → `f05cb81c0` (5개 서비스 마감) |
| `work/frontend-auth-commonization` 브랜치 | 원격에 **없음**(병합 후 삭제) |

→ 이번 WO 는 "공통화 구현"이 아니라 **채택 상태 확인 + production 검증**이 본체다.

---

## 2. 공통 인증 소비처 전수 (WO §1)

| 서비스 | `@o4o/auth-react` 소비 | 소비 파일 | 로그인 폼 `serviceKey` |
|---|:---:|---|---|
| KPA-Society | ✅ | `contexts/AuthContext.tsx` · `components/auth/RoleGuard.tsx` | `kpa-society` |
| K-Cosmetics | ✅ | 동일 2파일 | `k-cosmetics` |
| GlycoPharm | ✅ | 동일 2파일 | `glycopharm` |
| PharmacyHub | ✅ | `contexts/AuthContext.tsx` | `SERVICE_KEY`(=`pharmacy-hub`) |
| Neture | ✅ | 동일 2파일 | `neture` |

공통 API: `useServiceAuth` · `createRouteGuard` · `useRoleSelection`.
PharmacyHub 만 `RoleGuard` 대신 `StoreOwnerGuard`(store-ui-core)를 쓴다 — 매장 축 전용 가드로 **의도된 차이**.

**중복·임시 인증 구현 발견 0** — 서비스별 자체 토큰 파싱·자체 세션 복구 구현은 없었다(WO §4 최소 수정 대상 없음).

---

## 3. return URL 계약 — 생산·소비 양쪽 확인

공통 가드가 `state.from` 을 **생산**한다:

```tsx
// packages/auth-react/src/createRouteGuard.tsx:109
return <Navigate to={fallback} state={{ from: location.pathname + location.search }} replace />;
```

5 서비스가 모두 **소비**한다(실측):

| 서비스 | 소비 지점 |
|---|---|
| KPA-Society | `App.tsx:436` (로그인 모달 성공 콜백) |
| K-Cosmetics | `pages/auth/LoginPage.tsx:17` |
| GlycoPharm | `App.tsx:555` + `pages/auth/LoginPage.tsx:26` (sessionStorage 보존) |
| PharmacyHub | `pages/LoginPage.tsx:24` |
| Neture | `App.tsx:642` (`state.from` 또는 `?returnUrl=`) |

→ **구조적으로 return URL 복원 경로는 5/5 연결돼 있다.** 단 실제 복원 동작은 로그인이 필요해 미검증(§7).

PharmacyHub 로그인은 canonical 패턴을 모두 갖췄다 — `result.success` 분기 · `SERVICE_NOT_MEMBER` 전용 문구 ·
`accountAccess === 'restricted'` → `/join/status` · try/catch 오류 표시 · `finally` submit 해제.

---

## 4. production 브라우저 검증 — 자격 불필요 범위 (전부 실측)

**5 서비스 × desktop/mobile = 10 실행.** 실계정 비밀번호는 **대입하지 않았다** —
실패 경로는 존재하지 않는 계정(`@example.invalid`)으로만 시도해 잠금 위험을 제거했다
(TEST-ACCOUNTS §6: 실패 5회/30분 → 잠금).

| 항목 | 결과 |
|---|---|
| 로그인 화면 HTTP | **200 × 10** |
| 렌더 (white screen 아님) | **10/10** |
| 비밀번호 입력 필드 존재 | **10/10** |
| 로그인 실패 API 응답 | **`401 INVALID_USER` × 10** |
| 실패 후 화면 유지(무한 redirect 없음) | **10/10** (URL 불변) |
| 실패 메시지 노출 | **10/10** — 정확히 `"등록되지 않은 이메일입니다."` 한 줄 |
| 보호 route 미인증 차단 | **10/10** |
| 보호 route 렌더(white screen 아님) | **10/10** |
| **JS exception (`pageerror`)** | **0 × 10** |

보호 route 대상: KPA·KCos·GP `/store-hub` · PharmacyHub `/store-owner` · Neture `/mypage`.
Neture 는 `/mypage` URL 을 유지한 채 로그인 안내를 렌더하고, 나머지는 `/login`(또는 `/`)으로 이동한다 — 둘 다 차단은 성립.

### 4-1. 가입 진입 경로 (WO §3)

| 서비스 | 경로 | HTTP | JS exception | "준비 중" |
|---|---|:---:|:---:|:---:|
| KPA-Society | `/register` · `/join/pharmacy` | 200 · 200 | 0 | 없음 |
| K-Cosmetics | `/register` | 200 | 0 | 없음 |
| GlycoPharm | `/register` (→ `/` 모달) | 200 | 0 | 없음 |
| PharmacyHub | `/join` | 200 | 0 | 없음 |
| Neture | `/register` (→ `/` 모달) | 200 | 0 | 없음 |

**dead link 0 · 준비 중 0 · JS exception 0** (desktop/mobile 양쪽).
`/register` 중 일부는 입력 필드가 즉시 보이지 않는다(모달·안내형 진입) — 결함으로 판정하지 않고 관측만 기록한다.

### 4-2. 측정 오탐 정정 (기록)

1차 실행에서 **K-Cosmetics 모바일만 실패 메시지 미표시**로 나왔다. 재현·정밀 측정 결과 **오탐**이었다:
판정 정규식이 body 전체를 훑어 desktop 네비게이션의 "회원**가입**" 에 매칭됐고, 모바일은 햄버거로 접혀
매칭이 안 됐을 뿐이다. **오류 메시지가 아니라 네비게이션을 읽고 있었다.**
제출 전/후 body diff 로 판정축을 바꿔 재측정 → **10/10 정상**. 실제 결함 아님.

---

## 5. 발견 — PharmacyHub 공개 화면 404 (중지·보고)

### 5-1. 사실

```text
GET https://api.neture.co.kr/api/v1/public/services/pharmacy-hub/footer-legal  → 404 UNKNOWN_SERVICE
```

서비스별 실측:

| serviceKey | HTTP |
|---|:---:|
| `kpa-society` · `k-cosmetics` · `glycopharm` · `neture` | **200** |
| `pharmacy-hub` | **404** |

PharmacyHub 공개 화면 전반에서 재현된다(`/login` · `/join` 모두).

### 5-2. 원인 — 데이터가 아니라 백엔드 allowlist drift

핸들러는 404 를 만들지 않는다. 프로필이 없으면 `{success:true, data:null}` 로 200 이다.
404 는 **경로 가드**에서 나온다:

```ts
// apps/api-server/src/modules/service-legal/service-legal-scope.ts:25
export const SUPPORTED_LEGAL_SERVICE_KEYS = ['neture','glycopharm','kpa-society','k-cosmetics'] as const;
// public-service-legal.controller.ts:35  isSupportedLegalServiceKey 실패 → 404 UNKNOWN_SERVICE
```

모듈이 "4개 서비스 공통 구조" 전제로 작성됐는데, 프런트가
`5f7efff63 feat(pharmacy-hub): 공개 화면 공통 헤더·역할 메뉴·푸터 적용` 로 **5번째 서비스에 푸터를 채택**하면서
백엔드 allowlist 만 4개에 머물렀다. **cross-service scope drift.**

### 5-3. 왜 이번에 고치지 않았는가

WO 원칙 "권한·role·API 계약 변경이 필요하면 중지하고 정확한 원인을 보고한다" 에 해당한다. 필요한 변경이:

1. `SUPPORTED_LEGAL_SERVICE_KEYS` 에 `pharmacy-hub` 추가 (**API scope 계약 변경**)
2. `PHARMACY_HUB_SCOPE_CONFIG` 신설 — **security-core 에 존재하지 않는다**(타입 union 에만 `'pharmacy-hub'` 있음).
   security-core 는 **CLAUDE.md §14 F1 Frozen Baseline** → 구조 변경에 명시적 WO 필수
3. 법정정보 row seed (**운영 데이터 변경** — WO 금지)

**영향**: 로그인·가입 기능 자체는 정상이다(실측). 푸터 법정정보만 렌더되지 않고 콘솔 404 가 남는다.

### 5-4. 후속 WO 제안

```text
WO-O4O-SERVICE-LEGAL-PHARMACY-HUB-SCOPE-EXTENSION-V1
- SUPPORTED_LEGAL_SERVICE_KEYS 에 pharmacy-hub 편입
- security-core PHARMACY_HUB_SCOPE_CONFIG 신설 (F1 Freeze 해제 승인 필요)
- 법정정보 seed (운영 데이터 — 별도 승인)
- 검증: 5 serviceKey 전부 200 · PH 공개 화면 콘솔 404 0
```

---

## 6. typecheck / build (WO §12)

| 대상 | 명령 | rc |
|---|---|:---:|
| `packages/auth-react` | `tsc --noEmit -p` | **0** (error 0) |
| 공통 패키지 전체 | `pnpm run build:packages` | **0** |
| `web-kpa-society` | `pnpm build` (`tsc && vite build`) | **0** |
| `web-k-cosmetics` | 동일 | **0** |
| `glycopharm-web` | `tsc -b && vite build` | **0** |
| `pharmacy-hub-web` | `tsc -b && vite build` | **0** |
| `neture-web` | `tsc && vite build` | **0** |

**코드 변경이 0 이므로 이는 현재 main 의 상태 확인이다**(이번 WO 가 만든 변경의 검증이 아니다).

---

## 7. 미검증 — 실계정 자격증명 부재 (차단)

### 7-1. 차단 사실

`docs/local/TEST-ACCOUNTS.local.md`(SSOT) 실측:

| 자격 계층 | 상태 |
|---|---|
| L1 (`users.password`, serviceKey 없음) | `sohae2100` · `renagang21` 사용 가능 |
| **L2 (`service_credentials`, 웹 로그인이 쓰는 값)** | **3계정 × 4서비스 전량 `unknown`** (§2) |
| §7 내 매장 smoke 전용 계정 2개 | **`suspended`** (smoke 종료 후 비활성화) |
| §4-3 `renariver21` | ✅ 사용 가능하나 **`platform:super_admin` 전용 smoke 한정**(문서 사용 규칙 1) |

문서 §4 결론 그대로다 — **"서비스 웹 로그인(모든 서비스): ❌ 불가"**.
웹 로그인 폼은 항상 `serviceKey` 를 보내므로 L2 로 판정되고, L1 비밀번호로는 로그인되지 않는다(설계상 정상).

### 7-2. 미검증 항목 (완료 기준 중 남은 것)

| # | 항목 | 상태 |
|---|---|:---:|
| 1 | 공식 4서비스 정상 로그인 | **미검증** |
| 2 | 새로고침 후 세션 유지(복구) | **미검증** |
| 3 | 로그아웃 후 보호 route 차단 | **미검증** |
| 4 | 보호 route return URL **실제 복원** (구조는 §3 확인) | **미검증** |
| 5 | 서비스 미가입 계정(`SERVICE_NOT_MEMBER`) 처리 | **미검증** |
| 6 | pending/rejected 계정 허용 범위 | **미검증** |
| 7 | 서비스 간 credential 영향 0 | **미검증** |
| 8 | GlycoPharm 로그인 후 회귀 | **미검증**(로그인 전 범위는 PASS) |

**추측 대입은 하지 않았다** — TEST-ACCOUNTS §6 금지 규칙 + 계정 잠금 위험.

### 7-3. 해소 경로 (승인 필요 — 실행하지 않음)

| 안 | 내용 | 필요한 승인 |
|---|---|---|
| A | §7 smoke 계정 2개 재활성화 (`PATCH /api/v1/admin/users/{id}/status`) 후 보관된 자격으로 로그인. 자격 파일 `c:/tmp/wo-viewdup/.smoke_creds` 는 **현존 확인** | 프로덕션 계정 status 쓰기 |
| B | 서비스별 `/forgot-password` 로 L2 재설정 후 SSOT 갱신 | 메일 수신 + 운영 계정 비밀번호 변경 |
| C | 폐기 가능한 신규 smoke 계정 생성(`POST /api/v1/admin/users`, `credentialPolicy=CREATED`) | 프로덕션 계정 생성 |

**A 가 가장 작은 변경**이다(기존 테스트 계정 status 복원, 실사용자 무영향).
어느 쪽도 "실제 운영 사용자 데이터 변경 금지" 와 CLAUDE.md 중지 조건("실제 계정·자격정보 승인 필요")에 걸려
**사용자 승인 없이 진행하지 않았다.**

---

## 8. 변경 사항

| 축 | 값 |
|---|---|
| 코드 변경 | **0** |
| backend · DB · migration | **0** |
| 운영 데이터 변경 | **0** |
| 다른 서비스 credential·membership·role 영향 | **0** (읽기·비인증 요청만 수행) |
| 신규 문서 | 본 CHECK 1건 |

---

## 9. 후속

| # | 항목 | 사유 |
|---|---|---|
| 1 | 자격증명 해소(§7-3) 후 로그인 E2E 8항목 재개 | 이번 WO 의 잔여 완료 기준 |
| 2 | `WO-O4O-SERVICE-LEGAL-PHARMACY-HUB-SCOPE-EXTENSION-V1` | §5. security-core F1 Freeze 관련 |

---

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건
