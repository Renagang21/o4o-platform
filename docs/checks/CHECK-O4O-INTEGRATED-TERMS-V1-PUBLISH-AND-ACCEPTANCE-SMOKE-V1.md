# CHECK — O4O 통합 서비스 이용약관 v1.0 게시 · 기존 회원 재동의 · 신규 가입 smoke

> **상태**: PASS · **실행일**: 2026-09-18 · **환경**: production (`api.neture.co.kr` · Cloud Run `o4o-core-api` 현행 revision)
> **대상**: [`O4O-INTEGRATED-TERMS-OF-SERVICE-V1.0`](../baseline/O4O-INTEGRATED-TERMS-OF-SERVICE-V1.0.md) → `service_policy_documents` `terms` v1 `published` × 4 서비스
> **선행**: [`WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1`](../work-orders/WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1.md)(`c9ca615c0` · CHECK `e4b64bdb8`) — 그 CHECK §21 이 예고한 "publish 직후 운영 end-to-end 재실측" 이 이 문서다.
> **선례 형식**: [`CHECK-O4O-PRIVACY-POLICY-V1-PUBLISH-AND-CROSSSERVICE-SMOKE`](CHECK-O4O-PRIVACY-POLICY-V1-PUBLISH-AND-CROSSSERVICE-SMOKE.md)
> 자격정보 · 토큰 · hash 값은 기록하지 않는다. user id · row id 는 접두 8자리로 줄였다.

## 0. 요약

| 항목 | 결과 |
|---|---|
| 시행일 · 공고일 | **2026-09-17** (사용자 확정 2026-09-18 · 최초 통합약관 + 기존 회원 명시적 재동의 구조이므로 제3조 ④·⑤ 7일/30일 사전 게시는 v1 **이후 변경**부터 적용) |
| 원문 상태 | DRAFT → **ACTIVE** (헤더 · 제1조 시행일 · 부칙 제1조 · 말미 공고일/시행일 4곳 = 2026-09-17) |
| 게시형 변환 | `render-policy-plain.mjs --verify` = `VERIFY OK` · 내부 메타(헤더 blockquote · 부록 정책결정 표) **미포함** |
| 게시 | 4/4 `published` (draft 201 → readback sha 일치 → publish 200) · 감사 로그 `policy_create` 4 · `policy_publish` 4 |
| 공개 API | `GET /public/services/{key}/policies/terms` 4/4 200 · `contentHash` 4/4 = 로컬 sha256 |
| 약관 페이지 | Neture·KCos·PH `/terms` · KPA `/policy` 4/4 본문 렌더(제1조~제23조 · 시행일 문구 · v1 · 내부 메타 노출 0 · pageerror 0) |
| 기존 회원 E2E (renagang21) | 로그인 pending 4 → 보호 API **428** → 브라우저 재동의 게이트 → 명시 동의 → `user_policy_acceptances` 4 row → pending 0 → 보호 API 200 |
| 신규 가입 화면 4/4 | 약관 링크 · 필수 체크 · `(v1)` 표기 · 미체크 시 가입 버튼 비활성 · 페이지가 `/public/…/policies/terms` 200 fetch. **실제 제출은 하지 않음**(운영 계정 생성 금지) |
| DB write | admin API 경유 `service_policy_documents` 4 INSERT + 4 publish UPDATE(서버) · `user_policy_acceptances` 4 INSERT(사용자 동의 API) · 직접 SQL write 0 · `users.tos_accepted_at` 불변 |

## 1. 원문 확정 (step 1~2)

- 파일: `docs/baseline/O4O-INTEGRATED-TERMS-OF-SERVICE-V1.0.md` (tracked · `3f9bcb7e2` 등록본). 조문 수정 0. 날짜 placeholder 4곳 → `2026년 9월 17일`, 헤더 `상태: DRAFT` → `ACTIVE`, 선행조건 문단에 시행일 확정 근거 추가, 게시 결과 1줄 추가.
- 구조: 헤더 blockquote → `> 게시 본문 시작` → `# O4O 통합 서비스 이용약관` → 5장 23조 → 부칙 3조 → 공고일/시행일 → `> 게시 본문 끝` + 부록(정책결정 10건 표, blockquote).

## 2. 게시형 변환 (step 3)

- `node scripts/legal/render-policy-plain.mjs docs/baseline/O4O-INTEGRATED-TERMS-OF-SERVICE-V1.0.md --verify` → `VERIFY OK: 문장 동일(서식 토큰만 제거)`.
- `> ` 행(헤더 메타 · 부록 표) 전부 제외 → 게시 content 에 `정책결정` · `DRAFT` · `게시 본문` 문자열 0.
- 게시 content: **10,320자** · sha256 접두 `3304acb3c071f001` · 제1조~제23조 + 부칙 제1~3조.
- 헤더 1줄 추가 후 재변환 = 동일 10,320자 · 동일 sha (본문 불변 확인).

## 3. API 절차 · 계약 (step 4)

| 단계 | 호출 | 결과 |
|---|---|---|
| 로그인 | `POST /api/v1/auth/login` `{email,password,serviceKey,includeLegacyTokens:true}` — 서비스별 L2 admin credential(값은 `docs/local/TEST-ACCOUNTS.local.md` 만) | 4/4 200 · `data.tokens.accessToken` |
| 사전 census | `GET /api/v1/admin/services/{key}/policies?documentType=terms` | 4/4 기존 `terms` row 0 |
| draft | `POST /api/v1/admin/services/{key}/policies` `{documentType:'terms',title:'O4O 통합 서비스 이용약관',slug:'terms',content,version:1,effectiveDate:'2026-09-17',changeReason}` | 4/4 201 `draft` |
| readback | `GET …/policies/{id}` → content sha256 | 4/4 로컬 sha 일치 |
| publish | `PATCH …/policies/{id}/publish` `{action:'publish'}` | 4/4 200 `published` |
| 공개 | `GET /api/v1/public/services/{key}/policies/terms` | 4/4 200 · `version 1` · `effectiveDate 2026-09-17` · `contentHash` 일치 |

- guard: `authenticate` + `requireServiceLegalScope`. admin 경로는 약관 게이트 예외(`TERMS_GATE_EXEMPT_PREFIXES`) 이므로 게시 계정 자신이 미동의여도 게시 가능(설계대로).
- 게시 row (서비스별 별도 row/id · 정상):

| service_key | id 접두 | published_at (UTC) |
|---|---|---|
| kpa-society | `ef46ab16` | 2026-09-18 00:11:42.700 |
| k-cosmetics | `d67fb7bd` | 2026-09-18 00:11:43.010 |
| neture | `f8b35104` | 2026-09-18 00:11:43.326 |
| pharmacy-hub | `dd03e670` | 2026-09-18 00:11:43.625 |

- 감사 로그(`action_logs`, read-only): `service_legal:policy_create` 4 · `service_legal:policy_publish` 4 · 전부 success.
- retired 서비스 write 0.

## 4. 약관 페이지 렌더 (Playwright headless)

| 페이지 | 결과 |
|---|---|
| `neture.co.kr/terms` | 본문 10,696자 표시 · 제1조·제23조 · `2026년 9월 17일` · v1 · 내부 메타 0 · pageerror 0 |
| `kpa-society.co.kr/policy` | 11,053자 · 동일 조건 PASS |
| `k-cosmetics.site/terms` | 10,849자 · 동일 조건 PASS |
| `pharmacyhub.co.kr/terms` | 10,832자 · 동일 조건 PASS |

## 5. 기존 회원 명시적 재동의 E2E (step 5~6)

계정: renagang21 (kpa-society L1 · 4 서비스 membership 보유 · `users.id` 접두 `6967ebe0`).

| 순서 | 관측 |
|---|---|
| 게시 직후 `POST /auth/login` | 200 · `user.pendingPolicyAcceptances` **4**(kpa-society · neture · k-cosmetics · pharmacy-hub 각 terms v1) |
| `GET /api/v1/notifications` (보호 API) | **428** `TERMS_ACCEPTANCE_REQUIRED` + `pendingPolicyAcceptances` 4 |
| 브라우저 `kpa-society.co.kr/login` → 로그인 | `PolicyAcceptanceGate` 표시(`role="dialog"` · 약관 전문 · 체크 전 "동의하고 계속하기" 비활성) — 스크린샷 확인 |
| 게이트 상태에서 `GET /kpa/me-context` | 428 (게이트 뒤 API 차단 확인) |
| 체크 → "동의하고 계속하기" | `POST /auth/policy-acceptances` **4회 200**(한 번의 동의로 pending 전부 제출) |
| 이후 `GET /auth/me` | 200 · `pendingPolicyAcceptances []` |
| `/store` 진입 · 보호 API | 200 · 재차 `GET /notifications` 200 · 재로그인 시 pending [] |

DB (read-only · cloud-sql-proxy · `SET default_transaction_read_only = on`):

| 확인 | 결과 |
|---|---|
| `user_policy_acceptances` where user = renagang21 | **4 row** · `document_type=terms` · `version=1` · `acceptance_kind=agreement` · `policy_document_id` = 서비스별 게시 row id 4종 |
| `content_hash` = 게시 row content sha256 | 4/4 true |
| `accepted_at` | 2026-09-18 00:15:14.97 ~ 00:15:15.09 UTC (단일 클릭 · 4 row) |
| `users.tos_accepted_at` 집계 | 38/58 · 게시 전후 불변(레거시 컬럼 미사용 확인) |
| 전체 `user_policy_acceptances` | 4 row (이 E2E 외 write 0) |

- 사용자 안내대로 4 서비스 `service_policy_documents` 는 서로 다른 row/id 이므로 동일 사용자에게 서비스별 acceptance 4건이 생기는 것이 **정상**이며 오류가 아니다.
- 게시 계정(sohae2100 admin)은 아직 동의하지 않았다 — 다음 비-admin 요청에서 게이트를 만나는 것이 기대 동작이다.

## 6. 신규 가입 화면 4 서비스 (step 7 · Playwright headless · 제출 없음)

| 서비스 · 경로 | 약관 fetch | 동의 UI |
|---|---|---|
| PH `pharmacyhub.co.kr/join` | `GET /public/services/pharmacy-hub/policies/terms` 200 | 체크박스 2(`* 이용약관에 동의합니다(v1)` · 처리방침) · `/terms` `/privacy` 새 탭 링크 · "가입 신청" **비활성** · pageerror 0 |
| KCos `k-cosmetics.site/register` → 소비자 | `…/k-cosmetics/policies/terms` 200 | `agreeTerms`(required) · `agreePrivacy`(required) · `agreeMarketing`(선택) · `(v1)` 표기 · `/terms` `/privacy` 링크 · "가입하기" **비활성** |
| Neture `neture.co.kr/register` → RegisterModal Step 2 | `…/neture/policies/terms` 200 | `agreeTerms` · `agreePrivacy` · `agreeMarketing` · `(v1) (보기)` `/terms` `/privacy` 새 탭 · "가입 신청하기" **비활성** (Step 1 은 미존재 이메일·더미 값으로 통과만) |
| KPA `kpa-society.co.kr/register` → 약사 정회원 | `…/kpa-society/policies/terms` 200 | `agreeTerms`(required) · `agreePrivacy`(required) · `(v1)` · `/policy` `/privacy` 새 탭 · "가입 신청하기" **비활성** |

- 4 화면 모두 `usePublishedPolicyDocument(key,'terms')` 가 게시 row 의 id/version 을 받아 `(v1)` 을 표시했고 payload 에 `...terms.signupFields` 로 실린다(WO `c9ca615c0`). 가입 시 `user_policy_acceptances` 저장은 register 경로에 구현·jest 검증(CHECK `e4b64bdb8`)되어 있으나 **실제 제출은 운영 계정 생성이 되므로 수행하지 않았다**(테스트 가입 0 · acceptance 신규 row 0).
- 가입 요청(`/auth/register` · `/pharmacy-hub/join`) 호출 0 — 네트워크 관측으로 확인.

## 7. 코드 · DB write 요약

- 코드 변경 0 (문서만). `service_policy_documents` write 는 admin API 경유 4 INSERT + publish 4 UPDATE(서버 기록 `published_at`/`published_by`), `user_policy_acceptances` 4 INSERT 는 동의 API 경유. 직접 SQL write 0 · migration 0 · role/membership/credential 변경 0.
- 문서: 원문 헤더 ACTIVE + 게시 결과 · [`CANONICAL-INDEX` §7](../CANONICAL-INDEX.md) 에 `O4O-INTEGRATED-TERMS-OF-SERVICE-V1.0` ACTIVE 행 추가(명시 WO 범위).

## 8. 잔여 · 후속

- 없음(약관 v1.0 CLOSED). 다음 법률문서 = 매장 경영자 이용계약 또는 공급자 계약(사용자 지정).
- 향후 약관 개정은 원문 개정 → `version 2` draft → 제3조 ④·⑤ 7일/30일 사전 게시 → publish 순(게시 시점 기존 회원 pending 재발생은 설계대로).
