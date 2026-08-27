# WO-O4O-KPA-AUTH-RUNTIME-E2E-LOGIN-REGRESSION-ROOT-CAUSE-AND-CI-CLOSURE-V1 — CHECK

- **작업일**: 2026-08-26
- **기준**: `316a8ea08` (`HEAD == origin/main`, clean)
- **성격**: **조사 · 원인 확정** — 코드/DB/CI secret 변경 0건
- **판정**: **H1 — L2 `service_credentials` drift** (코드 회귀 아님)
- **상태**: 원인 확정 완료 · **수정은 자격정보 조작이라 사용자 승인 대기**

---

## 1. 세 가설 분리 결과

| # | 가설 | 판정 | 근거 |
|:--:|---|:--:|---|
| H1 | L2 `service_credentials` 문제 | ✅ **확정** | §3 타임라인 |
| H2 | CI fixture / secret 문제 | ▲ **부분** | secret 자체는 정상 동작 중(3개 서비스 통과). 단 **KPA 값만 stale** — H1 의 결과 |
| H3 | 실제 로그인 계약 회귀 | ❌ **배제** | §4 |

---

## 2. 실패 범위 — KPA 단독

동일 run(`32967332679`) 내 서비스별 결과:

| 서비스 | login #9 | #10 | #11 | #12 | logout #21 | #22 |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| Neture | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| GlycoPharm | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **KPA-Society** | **✘** | ✓ | ✓ | ✓ | **✘** | **✘** |
| K-Cosmetics | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

4개 서비스가 **같은 `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`** 를 쓰는데 KPA 만 실패한다
→ secret 주입 자체는 정상. **KPA 쪽 자격만 어긋났다.**

---

## 3. Root cause — L2 credential 이 E2E 성공 56분 뒤에 변경됨

KPA 로그인은 `serviceKey` 를 보낸다 → **L2(`service_credentials`) 경로**로 판정된다:

```
services/web-kpa-society/src/contexts/AuthContext.tsx:259
  serviceKey: 'kpa-society',
```

프로덕션 DB 실측 (read-only · 해시/비밀번호 미출력):

```
sohae2100@gmail.com × kpa-society
  created_at = 2026-05-24 06:00:21
  updated_at = 2026-08-21 01:26:53   ← 변경됨
```

### 타임라인

| 시각 | 사건 |
|---|---|
| 2026-08-21 **00:30** | E2E **마지막 성공** (`7b63a676a`) |
| 2026-08-21 **01:26:53** | **KPA-Society L2 credential updated** ← 56분 후 |
| 2026-08-24 03:05 | E2E 다음 실행 (`690a108f4`) → **실패** |
| 2026-08-26 12:12 | E2E 실행 (`01c7784dc`) → **실패** |

### 왜 KPA 만인가

전 계정 × 서비스 credential 변경 시각:

| service_key | 최종 생성/변경 |
|---|---|
| glycopharm · k-cosmetics · kpa-society · neture (일괄) | ~2026-08-14 |
| **`sohae2100 × kpa-society`** | **2026-08-21 01:26:53** ← 유일하게 이후 |
| pharmacy-hub (E2E 임시계정) | 2026-08-21 05:xx (E2E 픽스처, 무관) |

→ **8-21 이후 변경된 credential 은 KPA 하나뿐이고, 실패한 서비스도 KPA 하나뿐이다.**
CI secret `E2E_ADMIN_PASSWORD` 는 변경 이전 값을 그대로 들고 있어 L2 대조에서 실패한다.

---

## 4. H3(코드 회귀) 배제 근거

첫 실패 run 의 커밋이 `690a108f4`(KPA 커뮤니티 Home/Nav/Footer 공통화)라 의심했으나 **무관**하다:

1. **시간 순서** — credential 변경(8-21 01:26)이 `690a108f4`(8-24 12:04)보다 **3일 앞선다.**
   8-21 01:26 이후 첫 E2E 실행이 우연히 `690a108f4` 였을 뿐이다.
2. **변경 내용** — 해당 커밋의 `KpaGlobalHeader.tsx` diff 는 **nav 조립 순서**를
   `filterContextualNav` → `buildCommunityPrimaryNav` 로 옮긴 것뿐. 로그인·토큰·유저메뉴 무관.
3. **토큰 키 일치** — 테스트가 보는 `o4o_accessToken` 은 KPA 실제 키와 같다
   (`services/web-kpa-society/src/api/token-refresh.ts:16 TOKEN_KEY = 'o4o_accessToken'`).
   → 키 불일치라는 **2차 원인 없음**. 토큰이 없는 이유는 **로그인이 실제로 실패**했기 때문이다.
4. **logout 실패는 종속 증상** — `[KPA-Society] UI logout: success=false, method=no-trigger`.
   로그인이 안 됐으니 `button[aria-label="사용자 메뉴"]`(공통 `packages/ui/src/layout/GlobalHeader.tsx:254`)가
   렌더되지 않는다. 독립 결함이 아니다.

---

## 5. 부수 발견 — E2E 판정력 결함 (별건, 수정 안 함)

로그인이 실패했는데도 KPA #10·#11·#12 가 **통과**했다. 단언이 느슨하기 때문이다.

특히 #12 `로그인 후 dashboard 접근 가능` 은 `expect(url).not.toMatch(/\/login/)` 뿐이다.
**로그아웃 상태로 protectedPath 를 직접 실측**한 결과:

| 서비스 | protectedPath | 로그아웃 상태 착지 | `/login` 포함? | #12 오탐? |
|---|---|---|:--:|:--:|
| **KPA-Society** | `/admin` | `/admin` 유지 — "🔒 접근 권한이 없습니다" 인라인 표시 | ❌ | **예** |
| Neture | `/admin` | `/` (로그인 화면) | ❌ | **예** |
| GlycoPharm | `/operator` | `/` (로그인 화면) | ❌ | **예** |
| K-Cosmetics | `/operator` | `/login` | ✅ | 아니오 |

→ **4개 중 3개에서 #12 는 로그아웃 상태에서도 통과한다.** 실질 판정력이 있는 건 K-Cosmetics 뿐이다.
   (조사 초기에 "#12 통과 → 로그인은 정상"이라고 추정했는데 **틀렸다.** 위 실측으로 정정했다.)

권장: #12 를 URL 문자열이 아니라 **인증 상태 신호**(토큰 존재 / 유저메뉴 렌더 / 401 부재)로 단언하도록 교체.

---

## 6. 구조적 취약점

`E2E_ADMIN_PASSWORD` **하나**를 4개 서비스가 공유하는데, 실제 인증은 **서비스별 L2 credential** 이다.
→ **어느 한 서비스의 비밀번호만 바뀌어도 CI 가 깨지고, 원인이 "코드 회귀"처럼 보인다.** 이번이 정확히 그 사례다.

---

## 7. 수정 방안 — **사용자 승인 필요 (미실행)**

자격정보 조작이라 CLAUDE.md 중지 조건("실제 계정 · 자격정보 · 외부 서비스 승인 필요")에 해당한다.
**아무 것도 변경하지 않았다.**

| 안 | 내용 | 성격 |
|:--:|---|---|
| **A** | CI secret `E2E_ADMIN_PASSWORD` 를 KPA 현행 L2 값으로 갱신 | 가장 빠름. 단 §6 취약점은 그대로 |
| **B** | KPA-Society L2 credential 을 다른 서비스와 같은 값으로 재설정 | 원상복구. 운영 계정 비밀번호 변경이라 신중 |
| **C** | **서비스별 E2E secret 분리**(`E2E_PASSWORD_KPA` 등) 또는 E2E 전용 계정 도입 | §6 근본 해소. 권장 |

> A/B 는 **현행 KPA L2 비밀번호를 아는 사람**만 수행할 수 있다. 나는 그 값을 모르고, 알아내려 시도하지 않았다.

---

## 8. 종료 상태

| 항목 | 결과 |
|---|---|
| 가설 분리 | ✅ H1 확정 / H2 부분(H1 의 결과) / H3 배제 |
| root cause | ✅ 확정 — L2 credential 변경(8-21 01:26:53) vs stale CI secret |
| 코드 회귀 | **없음** (`690a108f4` 무관 — 증명 §4) |
| 코드 변경 | **0** |
| DB 변경 | **0** (read-only 조회만) |
| CI secret 변경 | **0** (승인 대기) |
| CI 현재 상태 | `E2E — Auth Runtime Regression` **red 유지** — §7 결정 전까지 해소 불가 |

**남은 결정**: §7 A/B/C 중 택1. C 를 권장한다.

---

## 9. 범위 밖 발견

1. **E2E #12 판정력 결함** (§5) — 4개 중 3개 서비스에서 로그아웃 상태 오탐. 별도 WO 권장.
2. `apps/api-server/.env` DB 비밀번호가 프로덕션과 불일치 · ADC 미구성
   — 선행 WO 에서 보고한 **개발환경/검증 절차 정합화** 건과 동일 묶음.
3. KPA `/admin` 은 미인증 시 redirect 없이 인라인 거부 화면을 렌더한다(다른 서비스와 패턴 다름).
   보안 결함은 아니나 cross-service 일관성 관점의 검토 대상.

---

## 10. 구조 개선 실행 — **C안 승인분 (2026-08-27)**

승인 범위: `APPROVED = C` / 서비스별 E2E credential 분리 + 가능하면 E2E 전용 계정 +
`#12` 인증상태 assertion 보강 + 동일 WO 에서 CI green 까지.

### 10.1 항목별 결과

| # | 항목 | 결과 |
|:--:|---|---|
| 1 | 공용 `E2E_ADMIN_PASSWORD` 계약 제거 | ✅ 코드·CI 참조 0 |
| 2 | 서비스별 E2E credential secret 계약 도입 | ✅ 8개 변수 계약 확정 |
| 3 | 운영 개인계정 → E2E 전용 계정 교체 | ⛔ **미수행 — 차단** (10.4) |
| 4 | KPA 현행 L2 credential 과 E2E credential 정합 | ⛔ **미수행 — 차단** (10.4) |
| 5 | 실제 로그인 폼으로 4서비스 로그인 검증 | ⛔ **미실행** — 3·4 선행 필요 |
| 6 | `#12` URL 판정 → 인증상태 판정 교체 | ✅ |
| 7 | logout 은 로그인 성공 후에만 검증 | ✅ 공통 setup 강제 |
| 8 | CI 4서비스 login / protected / logout PASS | ⛔ **미달성** — 3·4 선행 필요 |
| 9 | 공용 secret 참조 0 확인 | ✅ (10.3) |
| 10 | CHECK → commit → push → CI green | ⚠️ **부분** — commit/push 완료, CI green 은 차단 |

### 10.2 코드 변경

| 파일 | 변경 |
|---|---|
| `e2e/auth-runtime/helpers/auth.helpers.ts` | `ServiceConfig` 에 `serviceKey` / `emailEnv` / `passwordEnv` 추가. `getAdminCredentials()` **삭제** → `getServiceCredentials(svc)` (미설정 시 **fallback 없이 throw**, 누락 변수명·serviceKey 명시). 인증증거 수집부 신설: `collectAuthEvidence` / `isAuthenticated` / `expectAuthenticated` / `loginAndAssertAuthenticated`. 약한 `expectNotOnLoginPage()` **삭제** |
| `e2e/auth-runtime/auth-login.spec.ts` | `#9` 를 `accessToken` 필수로 강화. `#12` 를 URL 정규식 → `expectAuthenticated` 로 교체 |
| `e2e/auth-runtime/auth-logout.spec.ts` | 두 테스트 모두 `loginAndAssertAuthenticated` 선행. `test.skip` 전량 제거. 실패 분기도 assert 로 전환 |
| `e2e/auth-runtime/auth-refresh.spec.ts` | 1~3 로그인 성공 강제 + reload 후 `expectAuthenticated`. 4 는 `/auth/me` probe 가 중복호출 카운트를 오염시키지 않도록 `tracker.count()` 를 probe 앞에서 읽음 |
| `e2e/auth-runtime/auth-token-cleared.spec.ts` | `loginAndAssertAuthenticated` 선행. `test.skip` 2건 제거 |
| `e2e/auth-runtime/playwright.config.ts` | env 주석을 8개 변수 계약으로 교체 |
| `.github/workflows/e2e-auth-runtime.yml` | 공용 secret 검증·env 제거 → 8개 secret 검증. **미설정 시 warning+skip 이 아니라 `exit 1`** (검증하지 못한 채 초록불을 만들지 않는다) |

**`#12` 인증 판정 규칙** — 아래를 모두 만족해야 PASS:

- `o4o_accessToken` 존재
- URL 이 `/login` 이 아님
- 거부 화면(`접근 권한이 없습니다`) 없음
- `/api/v1/auth/me` 가 401/403 이 **아님**
- `/api/v1/auth/me == 200` **또는** 인증 UI 신호(사용자/계정 메뉴 트리거) 존재

`auth/me` 가 네트워크·CORS 로 도달 불가(`null`)일 때만 UI 신호로 대체한다.
**"URL 이 `/login` 이 아니다"는 단독 PASS 근거로 쓰지 않는다.**

### 10.3 검증

| 검증 | 결과 |
|---|---|
| `npx tsc --noEmit` (e2e/auth-runtime 전체) | ✅ 오류 0 |
| `npx eslint e2e/auth-runtime --ext .ts` | ✅ exit 0 |
| YAML 파싱 (`js-yaml`) | ✅ OK |
| `grep -rn E2E_ADMIN_EMAIL\|E2E_ADMIN_PASSWORD\|getAdminCredentials` (e2e/.github/scripts/docs) | ✅ 실행 참조 **0** — 잔존 5건은 전부 서술용(이 문서 §2/§3/§6/§7, 폐기 주석 2건) |
| E2E 실제 실행 | ❌ **미실행** — 자격증명 없음 (10.4) |

### 10.4 차단 — 사용자 조치 필요

3·4·5·8 및 CI green 은 내가 완료할 수 없다. 이유:

1. **E2E 전용 계정 생성** = 프로덕션 `service_credentials` 쓰기.
   CLAUDE.md 중지 조건("DB 데이터 변경은 사용자 승인 필요")에 해당한다.
2. **secret 값**은 내가 알지 못하며, 알아내거나 코드·CI 에 하드코딩해서도 안 된다
   (CLAUDE.md "자격증명 하드코딩 금지").

필요한 조치 — 서비스별 계정 준비 후 GitHub Actions Secrets 에 8개 등록:

| serviceKey | EMAIL secret | PASSWORD secret |
|---|---|---|
| `kpa-society` | `E2E_KPA_ADMIN_EMAIL` | `E2E_KPA_ADMIN_PASSWORD` |
| `k-cosmetics` | `E2E_KCOS_ADMIN_EMAIL` | `E2E_KCOS_ADMIN_PASSWORD` |
| `neture` | `E2E_NETURE_ADMIN_EMAIL` | `E2E_NETURE_ADMIN_PASSWORD` |
| `glycopharm` | `E2E_GLYCO_ADMIN_EMAIL` | `E2E_GLYCO_ADMIN_PASSWORD` |

기존 `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` 는 8개 등록 후 삭제 대상이다.

8개 등록 전까지 `E2E — Auth Runtime Regression` 은 **red 유지**된다. 이는 의도된 동작이다 —
검증 불가 상태를 skip 으로 흡수해 초록불로 보이게 하던 기존 계약이 이번 사고의 구조적 원인이다.

### 10.4b push 후 CI 실측 (commit `dd0ce9e48`)

| Run | 결과 | 판단 |
|---|---|---|
| `E2E — Auth Runtime Regression` (33034146402) | ❌ failure | **의도된 실패.** `Validate E2E credentials (per service)` 가 8개 secret 전부 미설정을 이름과 함께 출력하고 `exit 1`. 검증 불가 상태를 초록불로 만들지 않는다 |
| `CodeQL Security Analysis` (33034146356) | ✅ success | |
| `CI Pipeline` (33034146350) | ❌ failure | **내 변경과 무관 — 기존 실패.** `apps/api-server/src/bootstrap/__tests__/admin-route-auth-boundary.test.ts` 가 존재하지 않는 `routes/admin/channel-{playback-logs,heartbeat,ops}.routes.ts` 를 읽어 ENOENT 3건 (`3 failed / 3561 passed`). 직전 커밋 `a193ba4df` 의 run 32977730669 에서 **동일 3건**이 이미 실패 중이었음을 대조 확인 |

> `CI Pipeline` 의 3건은 이 WO 범위 밖(§9 계열)이며 별도 처리 대상이다. 여기서 손대지 않았다.

### 10.5 중간 상태 — **WO 미종료** (2026-08-27, 사용자 확정)

```
ROOT_CAUSE                       = CLOSED
SERVICE_SPECIFIC_SECRET_CONTRACT = IMPLEMENTED
FALSE_POSITIVE_AUTH_CHECK        = CLOSED
CHAINED_FALSE_PASS               = CLOSED

E2E_FIXTURE_PROVISIONING         = BLOCKED
GITHUB_SECRETS                   = BLOCKED
4_SERVICE_REAL_LOGIN_E2E         = NOT_VERIFIED
CI_GREEN                         = BLOCKED

MUST_FIX_BEFORE_CLOSE            = 1
```

`MUST_FIX_BEFORE_CLOSE = 1` 은 **fixture 공급**이다. 코드 결함이 아니다.

> 현재 `E2E — Auth Runtime Regression` 의 red 는 새로운 코드 결함이 아니라
> **필요한 fixture 가 아직 공급되지 않았음을 정확히 표시하는 red** 이다.
> secret 등록 전 추가 코드 수정은 하지 않는다. fallback 을 되살리면 §6 원문제로 회귀한다.

### 10.6 재개 조건 — 사용자 작업 (코드 작업 중단)

**1. 서비스별 E2E 전용 관리 계정 생성** (4개)

기존 개인 운영자 계정(`sohae2100`)의 비밀번호를 CI 에 맞추지 **않는다.**
CI fixture 는 사람이 정상적으로 비밀번호를 변경해도 깨지지 않는 전용 계정이어야 한다.

**2. GitHub Actions Secrets 8개 등록** (§10.4 표)

**3. 기존 공용 secret 삭제**
`E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` — 실제 consumer 0 재확인 후 삭제.

### 10.7 최종 검증 절차 (재개 시)

```
1. E2E — Auth Runtime Regression 재실행

2. 4서비스 각각
   실제 로그인 form
   → access token 확인
   → /auth/me 인증 확인
   → protected page 확인
   → refresh
   → logout
   → token cleared

3. 4/4 PASS 확인

4. CI Pipeline 도 최신 main 에서 green 인지 확인

5. CHECK 최종 갱신

6. 최종 판정
   AUTH_RUNTIME_E2E      = CLOSED
   CI_GREEN              = PASS
   MUST_FIX_BEFORE_CLOSE = 0
```
