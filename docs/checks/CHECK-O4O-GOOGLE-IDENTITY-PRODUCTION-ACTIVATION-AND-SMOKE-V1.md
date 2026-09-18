# CHECK — WO-O4O-GOOGLE-IDENTITY-PRODUCTION-ACTIVATION-AND-SMOKE-V1

> **판정:** `GOOGLE IDENTITY PRODUCTION ACTIVATION: COMPLETE` — smoke 1~4 PASS · read-only 최종 검증 PASS(2026-09-18 22:4xZ+09 · 아래 §2-1) · 자동 병합 방지 PASS
> **용어 정정(2026-09-18 · 사용자 결정):** `sohae2100` = **실제 운영자 계정**(기존 `platform:super_admin`) · `renagang21` = **Google-only 테스트 계정**(기존 테스트 데이터의 향후 연결 대상). 본문의 "cleanup user" 는 작성 당시 표현이며 **두 계정 모두 더 이상 cleanup user 라 부르지 않는다.** §4 의 옛 후속(WO-2E 로 renagang21 에 `platform:super_admin` 부여)은 **폐기**.
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
| 2 | 운영자와 **다른 email** 의 Google 계정(`renagang21`)으로 신규 signup | **PASS** — 사용자 브라우저: 가입 화면 → 계정 생성. DB(§2-1): users 1→**2** · linked_accounts 0→**1**(provider=google · providerId 21자 존재 · FK user 존재) · 신규 user `password IS NULL` ✅ · 신규 user credentials **0** / memberships **0** / roles **0** · `account_activities` `login_google` + `details.reason='google_signup'` **1건**(04:38:15Z, linked_accounts.createdAt 과 동시각) |
| 3 | 로그아웃 → 같은 Google 계정 재로그인 | **PASS** — 사용자 브라우저: 재가입/동의 화면 없이 기존 계정으로 복귀. DB: `login_google`(reason 없음) **2건**(04:39:31Z · 04:40:18Z) 이 **같은 `users.id`**(f707c74e…) 에 기록 · users **2** · linked_accounts **1** 유지(재생성 0 — createdAt 불변) · 해당 user `lastLoginAt` = 04:40:18Z 로 갱신 |
| 4 | 새 user 로 `admin.neture.co.kr` 접근 | **PASS** — 화면 "접근 권한 없음 / 관리자 권한이 필요합니다"(사용자 확인). DB: 신규 user role_assignments **0** — Google 로그인이 권한을 만들지 않는다 |

운영자(`sohae2100`) 불변: §2-1 에서 확인 — `updatedAt` 2026-09-17T20:53Z · `lastLoginAt` 2026-09-17T15:11Z(둘 다 smoke 시작 04:38Z 이전) · credentials 5 / memberships 5 / roles 11(`platform:super_admin` 포함) 전부 이 user 소유 · google_links 0.

### 2-1. read-only 최종 검증 (2026-09-18 22:44 KST · Cloud SQL Auth Proxy · SELECT 만 · 트랜잭션 rollback · PII 실값 미기록)

| 기대값 | 실측 | 판정 |
|---|---|---|
| `users = 2` | 2 | ✅ |
| `linked_accounts = 1`, provider=google | 1 · google 1 · providerId 존재(21자) · FK user 존재 | ✅ |
| Google 신규 user `password IS NULL` | NULL(true) — 운영자 user 는 password 유지 | ✅ |
| `service_credentials = 5` 유지 | 5 (전부 운영자 user) | ✅ |
| `service_memberships = 5` 유지 | 5 (전부 운영자 user) | ✅ |
| `role_assignments = 11` 유지 | 11 (전부 운영자 user · `platform:super_admin` 포함) | ✅ |
| 신규 Google user 의 credentials/membership/role = 0 | 0 / 0 / 0 | ✅ |
| 재로그인 전후 users 2 · linked 1 유지 | 2 · 1 (linked createdAt = signup 시각 그대로) | ✅ |
| 동일 linked account → 동일 `users.id` 재사용 | `login_google` 3건(signup 1 + 재로그인 2) 모두 같은 userId · linked_accounts.userId 와 일치 | ✅ |
| 기존 운영자 role/membership/auth 불변 | updatedAt · lastLoginAt 모두 smoke 이전 시각 · 11 roles 그대로 | ✅ |
| PII 실값 기록 0 | email 마스킹 · id prefix 8자 · providerId 는 길이만 | ✅ |


## 3. 24항목 보고 (진행분)

1 Web Client 생성 ✅(사용자, Google Cloud) · 2 등록 origins = WO §2 확정 목록(사용자 확정) · 3 Canonical `neture.co.kr` / Transitional 4 host + www · 4 ✅ · 5 ✅ · 6 ✅ 미사용 · 7 `03710-k2f` → `03711-gh4` · 8 ✅ enabled=true · 9 PASS(사용자 브라우저 · canonical origin) · 10~19 PASS(smoke 2~4 · §2-1) · 20 운영자 계정 불변 ✅(row 값 기준) · 21 PII raw 기록 0 ✅ · 22 secret commit 0 ✅ · 23 HEAD/작업트리 = 본 CHECK 커밋 · 24 Mobile 미착수 ✅.

## 4. 후속 (2026-09-18 갱신 — 용어 정정 반영)

- **폐기:** 옛 후속 "WO-2E First Google Admin Bootstrap — 신규 Google user(`renagang21`) 에 `platform:super_admin` 부여". 두 계정의 목적이 다르다 — `renagang21` 은 테스트 계정이며 관리자 권한을 받지 않는다.
- **인증 트랙 다음 작업 = `sohae2100`(실제 운영자 · 기존 password 인증) 에 Google Identity 를 명시적으로 연결.** 이메일 일치 자동 연결이 아니라, **이미 로그인된 운영자 본인이 "이 Google 계정을 내 기존 O4O 계정에 연결한다" 를 명시 수행** → `linked_accounts(provider=google, providerId=검증된 Google sub, userId=기존 sohae users.id)` → Google 로그인으로 **같은 기존 user · `platform:super_admin` 그대로** → 이후 legacy password/auth 제거. (자동 병합 방지 409 는 그대로 유지.)
- **별도 정리 트랙(인증 작업과 섞지 않음):** `sohae2100` 에 임시로 모아둔 테스트 데이터를 `renagang21` 로 화면 보며 하나씩 재배정.
- `renagang21` 과 같은 email 문제(2-pre 의 409)는 위 재배정/정리 후 별도 결정. `sohae2100` 의 email 변경·삭제는 하지 않는다(사용자 결정 2026-09-18).

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
