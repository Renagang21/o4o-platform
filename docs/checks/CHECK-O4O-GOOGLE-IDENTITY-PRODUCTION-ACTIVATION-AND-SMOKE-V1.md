# CHECK — WO-O4O-GOOGLE-IDENTITY-PRODUCTION-ACTIVATION-AND-SMOKE-V1

> **판정:** `GOOGLE IDENTITY PRODUCTION ACTIVATION: IN PROGRESS — SMOKE 2~4 PENDING (자동 병합 방지 PASS)`
> **일자:** 2026-09-18 · **WO:** [`WO-O4O-GOOGLE-IDENTITY-PRODUCTION-ACTIVATION-AND-SMOKE-V1`](../work-orders/WO-O4O-GOOGLE-IDENTITY-PRODUCTION-ACTIVATION-AND-SMOKE-V1.md)
> **범위:** 코드 신설 0. CI env 반영(§4) · 배포 확인(§5) · 운영 smoke(§6, 사용자 브라우저 + Claude read-only count).
> **원칙:** 프로덕션 PII 실값 기록 0(count · status · 마스킹만) · Client ID/Secret 기록 0 · UPDATE/DELETE 0.

---

## 1. 활성화 (§4 · §5)

| # | 항목 | 결과 |
|---|---|---|
| 4 · 5 | env 반영 | `793f6a72e` — [deploy-api.yml](../../.github/workflows/deploy-api.yml) `--set-env-vars` 에 `GOOGLE_ALLOWED_CLIENT_IDS=${{ vars.GOOGLE_WEB_CLIENT_ID }}` · `GOOGLE_WEB_CLIENT_ID=${{ vars.GOOGLE_WEB_CLIENT_ID }}` 2건. 값은 GitHub repository variable(공개 식별자) · repo commit 0 |
| 6 | Client Secret | 미사용(ID-token-to-backend). env 이름 중 `*SECRET*` Google 항목 0 |
| 7 | API revision | 최초 반영 `o4o-core-api-03710-k2f`(타 세션 확인) → 현재 traffic `o4o-core-api-03711-gh4`(2026-09-18 12:28Z 생성) 에서도 `GOOGLE_ALLOWED_CLIENT_IDS` · `GOOGLE_WEB_CLIENT_ID` 2건 set(gcloud read-only · 이름/설정 여부만) — CI 배포를 넘어 유지됨 확인 |
| 8 | `GET /api/v1/auth/google/config` | `{ success:true, data:{ enabled:true, clientId:<public web client id> } }` (2026-09-18 13:1xZ · `https://api.neture.co.kr`) |

## 2. Smoke (§6)

**Baseline count(read-only · Cloud SQL Auth Proxy · 2026-09-18 11:40Z, 타 세션):** users 1 · linked_accounts 0 · service_credentials 5 · service_memberships 5 · role_assignments 11.

| # | Smoke | 결과 |
|---|---|---|
| 1 | `[Google로 계속하기]` popup / 계정 선택 | **PASS(간접)** — 사용자 브라우저에서 계정 선택 → "처음 오셨네요" 동의 화면 → 계정 만들기까지 도달(`enabled=false` · `origin_mismatch` · popup 미표시 아님). 실행 origin 은 사용자 보고로 확정 예정 |
| 2-pre | **자동 병합 방지** — cleanup user 와 **같은 email** 의 Google 계정으로 signup 시도 | **PASS** — `409 EMAIL_IN_USE`("이미 사용 중인 이메일입니다. 기존 계정은 자동으로 연결되지 않습니다."). 서버 경로: `google-auth.service.ts createGoogleUser` 트랜잭션 내 `users.email` UNIQUE 23505 → 예외 → 롤백. **DB 불변 실측(13:13Z read-only count):** users **1** · password NULL **0** · linked_accounts **0**(google 0) · service_credentials **5** · service_memberships **5** · role_assignments **11** = baseline 과 동일. `account_activities` 11:00Z 이후 **0건**(409 는 `establishSession` 이전에 종료되므로 activity 미기록 = 코드와 일치). email 로 기존 user 에 자동 연결 0 · 부분 생성(orphan users/linked) 0 |
| 2 | cleanup user 와 **다른 email** 의 Google 계정으로 신규 signup | **PENDING** — 사용자 브라우저 진행 대기. 기대: users 1→2 · linked_accounts 0→1(provider=google) · 신규 user password NULL · credentials/memberships/roles +0 · `account_activities` `action='login_google'` + `details.reason='google_signup'` 1건 |
| 3 | 로그아웃 → 같은 Google 계정 재로그인 | **PENDING** — 기대: 동일 `users.id` · users 2 · linked_accounts 1 유지 · `login_google`(reason 없음) +1 |
| 4 | 새 user 로 `/admin` · 보호 route 1건 | **PENDING** — 기대: 403 또는 기존 access gate |

cleanup user 불변: 2-pre 시점 count 로 확인(개별 row 값 비교는 smoke 2 after 에서 `updatedAt`/`lastLoginAt` 변화 0 으로 재확인 예정).

## 3. 24항목 보고 (진행분)

1 Web Client 생성 ✅(사용자, Google Cloud) · 2 등록 origins = WO §2 확정 목록(사용자 확정) · 3 Canonical `neture.co.kr` / Transitional 4 host + www · 4 ✅ · 5 ✅ · 6 ✅ 미사용 · 7 `03710-k2f` → `03711-gh4` · 8 ✅ enabled=true · 9 간접 PASS(origin 확정 대기) · 10 PENDING · 11~19 PENDING(smoke 2~4) · 20 cleanup user 불변(count 기준 ✅) · 21 PII raw 기록 0 ✅ · 22 secret commit 0 ✅ · 23 HEAD/작업트리 = 본 CHECK 커밋 후 갱신 · 24 Mobile 미착수 ✅.

## 4. 후속

- smoke 2~4 완료 → §2 표 갱신 · 판정 `COMPLETE` → **WO-2E First Google Admin Bootstrap**(cleanup super_admin 이 신규 Google user 에게 `platform:super_admin` 부여 → 신규 계정으로 Admin 접근 확인 → cleanup 데이터 재배정 → cleanup user 정리).
- cleanup user 와 같은 email 의 Google 계정을 최종 계정으로 쓰는 문제는 cleanup user 정리 후(해당 email 이 `users.email` 을 점유하지 않게 된 뒤) 별도 결정. 지금 cleanup user 의 email 변경·삭제는 하지 않는다(사용자 결정 2026-09-18).

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
