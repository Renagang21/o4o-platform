# WO-O4O-GOOGLE-IDENTITY-PRODUCTION-ACTIVATION-AND-SMOKE-V1

> **성격:** Phase 2 — Google Identity 운영 활성화 + 최초 실사용 Smoke (코드 신설 없음 · 설정 + 검증)
> **선행:** WO-2A · WO-2B · WO-2C `COMPLETE` · WO-2D Web/Admin 구현 완료(`PARTIAL — MOBILE PENDING`, 4c506eff2)
> **목적:** production `o4o-core-api` 에 Google Web Client ID 를 반영해 `GET /auth/google/config → enabled=true` 로 만들고, Google 신규가입 → 로그아웃 → 동일 `users.id` 재로그인 → 권한 경계까지 운영에서 검증한다.
> **분리:** AI First URL/IA 리팩토링과 결합하지 않는다. Mobile(WO-2D-M)은 범위 밖.
> **중요:** Client Secret 저장 금지 · Client ID hard-code 금지 · 실제 값 repository commit 금지(`.env.example` 외) · legacy Google passport 설정 재활성화 금지 · 프로덕션 PII 실값 기록 금지(count·status 만) · 프로덕션 UPDATE/DELETE 금지(이번 WO 의 DB write 는 Google signup 이 만드는 users/linked_accounts 1행씩뿐).

---

## 1. 목표와 배경

WO-2D 로 endpoint 3종·`<GoogleContinue />`·진입점 7곳이 배포돼 있으나 production env 에 `GOOGLE_*` 가 없어 모든 화면이 "Google 로그인은 준비 중입니다." 상태다. 이번 WO 는 그 마지막 1건(설정)을 닫고 첫 Google 사용자 생성을 실증한다.

```text
Google Web OAuth Client → Authorized JavaScript Origins → o4o-core-api env
  → Google Login LIVE → 신규 Google user 1명 → 로그아웃 → 동일 sub 로 동일 users.id 재로그인
```

## 2. Origin 정책

| 구분 | origin | 비고 |
|---|---|---|
| **Canonical Future Origin** | `https://neture.co.kr` | 장기 기준. 하위 path 변경은 Google 설정 변경 대상 아님 |
| **Transitional Legacy Origins** | `https://kpa-society.co.kr`(분회 `/kpa` 포함) · `https://k-cosmetics.site` · `https://pharmacyhub.co.kr` · `https://admin.neture.co.kr` | AI First URL 리팩토링 완료 후 제거 가능 |
| `www.` 변형 | 위 4 host 의 `www` 는 리다이렉트 없이 200 을 직접 서빙(2026-09-18 확인) — 해당 host 에서 로그인 UI 를 제공하므로 등록 대상 | `www.neture.co.kr` 포함 |
| 등록 안 함 | Cloud Run `*.a.run.app` 6종 · `dev-admin.neture.co.kr`(DNS 미응답) · `api.neture.co.kr` | 필요 시 사용자 판단으로 추가 |

Origin 조회 근거: [deploy-web-services.yml](../../.github/workflows/deploy-web-services.yml) · [deploy-admin.yml](../../.github/workflows/deploy-admin.yml) · [setup-middlewares.ts](../../apps/api-server/src/bootstrap/setup-middlewares.ts) `getAllowedOrigins` · Cloud Run `status.url` · HTTPS HEAD.

## 3. Google Cloud 수동 설정 (사용자)

- Google Auth Platform → Clients → **Web application** 1개 생성(Web/Admin 공통). Authorized JavaScript Origins = §2 확정 목록. redirect callback URL 없음(ID-token-to-backend 방식).
- 사용하는 값은 **Client ID 뿐**. Client Secret 은 O4O frontend/API 어디에도 저장하지 않는다.
- Mobile Client ID(Android/iOS)는 WO-2D-M.

## 4. Production env 반영 (Claude Code)

```text
GOOGLE_ALLOWED_CLIENT_IDS=<WEB_CLIENT_ID>
GOOGLE_WEB_CLIENT_ID=<WEB_CLIENT_ID>
```

두 값을 모두 명시한다(향후 Android/iOS ID 가 allowlist 에 들어와도 공개 Client ID 가 배열 순서에 의존하지 않도록).

**반영 경로(조사 결과, 2026-09-18):** [deploy-api.yml](../../.github/workflows/deploy-api.yml) 의 `gcloud run deploy o4o-core-api` 가 `--set-env-vars` 로 plain env 전체를 매 배포마다 재설정한다 → `gcloud run services update --update-env-vars` 로 한 번 넣어도 **다음 CI 배포에서 사라진다**. Secret Manager 참조(`--update-secrets`, ENCRYPTION_KEY·CAFE24_* 방식)만 배포를 넘어 유지된다.
따라서 내구적 반영 = **CI 변경 1건**: deploy-api.yml 에 `--set-env-vars="GOOGLE_ALLOWED_CLIENT_IDS=${{ vars.GOOGLE_WEB_CLIENT_ID }}"` · `--set-env-vars="GOOGLE_WEB_CLIENT_ID=${{ vars.GOOGLE_WEB_CLIENT_ID }}"` 추가 + GitHub **repository variable**(`vars`, secret 아님 — 공개 식별자) `GOOGLE_WEB_CLIENT_ID` 등록. 값은 repo 에 commit 되지 않는다. CI 변경은 중지 조건이므로 본 WO 가 그 승인 근거다.

## 5. 배포 후 확인

`GET https://api.neture.co.kr/api/v1/auth/google/config` → `{ enabled: true, clientId: <public web client id> }`. 새 revision 이름을 보고한다.

## 6. Smoke (사용자 브라우저 · Claude 는 read-only count 검증)

| # | Smoke | 기대 |
|---|---|---|
| 1 | `https://neture.co.kr` `[Google로 계속하기]` → Google 계정 선택창 · Transitional 대표 1곳(예: kpa-society.co.kr) 동일 | "준비 중" 아님 · `origin_mismatch` 없음 |
| 2 | cleanup user 와 **다른 Google 계정**으로 신규 signup(동의 → 계정 생성) | `users 1→2` · `linked_accounts 0→1(provider=google, providerId=sub)` · 신규 user `password NULL` · `service_credentials/service_memberships/role_assignments` 증가 0 |
| 3 | 로그아웃 → 같은 Google 계정 재로그인 | 동일 `users.id` · `users=2 · linked_accounts=1` 유지 · email 기반 신규/병합 0 |
| 4 | 새 user 로 `/admin` · store owner/operator 보호 route 1건 | 403 또는 기존 access gate |

cleanup user(password · service_credentials · roles · memberships) 불변. Google email 이 cleanup user email 과 같으면 `409 EMAIL_IN_USE` 명시 오류(자동 병합 0).

## 7. 실패 시 즉시 중지·보고

`origin_mismatch` · audience mismatch · popup 미표시 · `enabled=false` · 미등록 sub 가 기존 email user 와 자동 연결 · signup 이 password/service_credentials/role 생성 · 재로그인 시 새 user · cleanup user 변경 · auth 회귀. **Google Cloud 설정 오류와 코드 오류를 구분**해 보고한다.

## 8. 완료 보고 24항목

1 Web Client 생성 · 2 등록 origins · 3 Canonical/Transitional 구분 · 4 `GOOGLE_ALLOWED_CLIENT_IDS` 적용 · 5 `GOOGLE_WEB_CLIENT_ID` 적용 · 6 Client Secret 미사용 · 7 API revision · 8 `/auth/google/config` · 9 neture.co.kr popup · 10 Transitional 대표 smoke · 11 신규 signup · 12 users before/after · 13 linked_accounts before/after · 14 password NULL · 15 service_credentials +0 · 16 service_memberships +0 · 17 role_assignments +0 · 18 재로그인 동일 users.id · 19 protected route 차단 · 20 cleanup user 불변 · 21 PII raw 기록 0 · 22 secret commit 0 · 23 HEAD/작업트리 · 24 Mobile 미착수.

판정: `GOOGLE IDENTITY PRODUCTION ACTIVATION: COMPLETE | BLOCKED` + `문서 정합:` 한 줄.

## 9. 후속

`COMPLETE` → **WO-2E First Google Admin Bootstrap**: cleanup user 가 기존 Admin UI 로 새 Google user 에게 `platform:super_admin` 부여 → 새 Google 계정으로 Admin 접근 확인 → cleanup user 데이터 화면 검토·수작업 재배정 → 최종 cleanup user 제거.
