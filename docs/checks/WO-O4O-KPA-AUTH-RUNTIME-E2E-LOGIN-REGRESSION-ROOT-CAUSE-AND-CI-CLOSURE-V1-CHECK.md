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
