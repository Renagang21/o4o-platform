# IR-O4O-NETURE-OPERATOR-AUTH-SMOKE-BLOCKER-AUDIT-V1

> **목적**: `WO-O4O-NETURE-OPERATOR-DASHBOARD-V2-IA-REBUILD-V1`(commit cd5d10017) 완료 후 남은
> 인증 브라우저 smoke 블로커를 조사한다.
> **성격**: read-only 조사 (코드/UI/API/DB/migration/운영데이터/테스트계정/commit 없음). 로그인 probe·read-only API/DB probe·Playwright 노출/점유 확인만 수행.
> **작성일**: 2026-06-03
> **대상**: Neture (KPA/GlycoPharm/K-Cosmetics는 참고 비교만)

---

## 배경

WO-O4O-NETURE-OPERATOR-DASHBOARD-V2-IA-REBUILD-V1 은 완료·배포됨:

```
commit: cd5d10017
배포: API Server live (o4o-core-api 최신 리비전)
endpoint: GET /api/v1/neture/operator/dashboard
상태: 401 AUTH_REQUIRED guard 정상
```

그러나 live browser smoke 미실행:
1. Playwright 브라우저가 병렬 세션에 점유됨
2. 테스트 계정 sohae2100 로그인 시 INVALID_CREDENTIALS

본 IR은 smoke 재실행 조건을 확정한다.

---

## 1. 전체 판정

**B (계정 정정 필요)** — 1차 원인. **+ C (Playwright 세션 정리 필요)** — 병행 필요.

즉시 smoke 불가. **auth flow·endpoint guard·계정 권한은 모두 정상**이며, 막는 것은
① 문서화된 operator 계정 비밀번호 drift + ② 브라우저 점유 두 가지뿐.

판정 후보 대비:
- A 즉시 smoke 가능 — ❌
- **B 계정 정정 필요 — ✅ (1차)**
- **C Playwright 세션 정리 필요 — ✅ (병행)**
- D 권한 보정 필요 — ❌ (sohae2100은 이미 operator/admin/super_admin 보유)
- E 수동 smoke만 가능 — fallback

---

## 2. Neture 테스트 계정 확인 결과

| 계정 | 로그인 | 활성 roles | neture membership | operator 권한 | dashboard probe |
|---|---|---|---|---|---|
| `sohae2100@gmail.com` | ❌ (문서 PW 불일치) | neture:operator, neture:admin, **platform:super_admin** + cosmetics/glycopharm/kpa admin·operator (전부 active) | active(파생) | ✅ 완전 자격 | (토큰 미획득) |
| `renagang21@gmail.com` | ❌ (문서 PW 불일치) | — | — | — | — |
| `sohae21@naver.com` | ✅ (`Seochuran1!` 유효) | kpa:store_owner, supplier | active(supplier) | ❌ (neture:operator **is_active=f**) | **403** |

- **serviceKey 필요 여부**: **불필요**. 로그인 payload는 `{email, password}`(+`includeLegacyTokens`)뿐 — login은 서비스 중립(global `users`). serviceKey 누락은 원인 아님.
- **sohae2100 DB 상태 (read-only 확인)**: `id=cfd2a5e7-…`, `status=active`, bcrypt hash 존재(length 60), 생성 2026-05-15. role_assignments 10건 전부 `is_active=t` (neture:operator·neture:admin·platform:super_admin 포함). **계정·권한 완전 정상.**

근거 코드:
- 로그인 payload: `packages/auth-client/src/client.ts` `login()` — `{ ...credentials, includeLegacyTokens }`, serviceKey 없음.
- 오류 분기: `apps/api-server/src/modules/auth/controllers/auth-login.controller.ts:115-129` — `INVALID_CREDENTIALS`(PW 불일치)와 `SERVICE_NOT_MEMBER`/`ACCOUNT_NOT_ACTIVE`/`TOO_MANY_ATTEMPTS`가 **별개 코드**.

---

## 3. INVALID_CREDENTIALS 원인

**순수 비밀번호 오류 (문서 PW drift).**

- ❌ serviceKey 누락 — 아님 (login은 serviceKey 무관)
- ❌ 계정 미존재 — 아님 (DB 존재, active)
- ❌ 권한/membership 문제 — 아님 (별도 코드 존재, 받은 건 PW-mismatch 전용 `INVALID_CREDENTIALS`)
- ❌ lockout — 아님 (`TOO_MANY_ATTEMPTS` 아님)
- ✅ **문서값 `(TEST-ACCOUNTS.local.md 기재)` 가 sohae2100/renagang21 라이브 해시와 불일치.** 동일 인물(서철환)의 sohae21@naver.com 비밀번호도 sohae2100엔 불일치. 정답 PW는 미상(bcrypt 해시 평문 복원 불가).

> 평문 비밀번호는 본 문서에 기재하지 않는다. TEST-ACCOUNTS.local.md(gitignored)가 SSOT.

---

## 4. Playwright MCP / 브라우저 상태

- **MCP 노출**: ✅ 정상 (`mcp__playwright__*` 로드·호출 성공)
- **브라우저 점유**: ✅ 점유됨 — `Browser is already in use ... use --isolated` (병렬 세션이 동일 chrome 프로파일 점유)
- **재시작 필요**: 병렬 세션의 브라우저 점유 해제 또는 격리 컨텍스트 필요. MCP 재설치/재등록은 불필요.

---

## 5. `/api/v1/neture/operator/dashboard` 인증 probe 결과

- 무인증: **401 AUTH_REQUIRED** (route live)
- sohae21 토큰(비-operator): **403** (scope guard 정상 동작)
- **200 + 5-block 페이로드**: operator 토큰 미획득으로 **미검증** (Action Queue/Quick Actions 실데이터 확인 불가). 단 endpoint 배포·가드는 정상 확인.

---

## 6. live smoke 재실행 가능 여부

**현재 불가.** 다음 2개 충족 시 즉시 가능:
1. sohae2100(또는 다른 active neture:operator 계정)의 **올바른 비밀번호 확보**(사용자 제공) 또는 **비밀번호 reset 승인**(DB write).
2. **Playwright 브라우저 점유 해제**(병렬 세션 종료) 또는 신규 세션.

---

## 7. 이전 WO 완료 보고의 정정 사항

WO 보고는 블로커를 "test-account credential mismatch (known blocker)"로 기재했으나, 본 IR로 정밀화:
- auth flow·serviceKey는 **문제 아님** (정상).
- sohae2100 계정·권한은 **완전 정상** (active neture:operator/admin + super_admin).
- 블로커 = **문서 PW drift 단일 원인** + 브라우저 점유.
- 추가 사실: sohae21@naver.com은 로그인되나 **operator 아님(supplier)** → operator smoke 부적합(403).

---

## 8. 코드 수정 여부

**없음.** read-only 조사. 로그인 probe + read-only DB/API probe만 수행, write 없음.

---

## 9. 후속 권장

1. **TEST-ACCOUNTS.local.md 정정** (승인 후 별도 작업): sohae2100/renagang21 문서 PW가 라이브와 불일치 — 올바른 값으로 정정. (sohae21@naver.com 은 유효 확인됨.)
2. **즉시 smoke 필요 시**: 사용자가 sohae2100 올바른 PW 제공, 또는 sohae2100 PW reset 승인(DB write) → 이후 `CHECK-O4O-NETURE-OPERATOR-DASHBOARD-V2-LIVE-SMOKE-V1` 재실행.
3. **Playwright 점유 해제**: 병렬 세션 브라우저 종료 후 재시도.
4. (대안) 올바른 operator 토큰 확보 시, 브라우저 없이도 **API 인증 probe로 5-block 페이로드 검증** 가능.

---

## 다음 단계 순서

```
IR 저장 → operator 계정 비밀번호 정합 확보(또는 reset 승인)
        → Playwright 브라우저 점유 해제 → CHECK-O4O-NETURE-OPERATOR-DASHBOARD-V2-LIVE-SMOKE-V1
```

CHECK 단계 확인 항목:
1. /operator dashboard 렌더
2. Action Queue 6종 표시
3. 공급사 승인 대기 카드 description 표시
4. 주요 카드 클릭 이동 (공급사/상품/Market Trial)
5. Quick Actions 링크 깨짐 없음
6. console/network critical error 없음
