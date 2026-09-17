# IR-O4O-PRIVACY-POLICY-RUNTIME-DATA-FLOW-CENSUS-V1

> **상태**: COMPLETE_WITH_UNKNOWNS · **조사일**: 2026-09-17 · **기준 commit**: `4f8dd3b90` (`main` == `origin/main`)
> **성격**: 조사 전용. 코드 수정 0 · DB write 0 · migration 0 · 설정 변경 0 · 배포 0.
> **목적**: 주식회사 쓰리라이프존 O4O 「개인정보 처리방침 v1.0」 최종 작성을 위해 **현재 프로덕션에서 실제로 동작하는** 개인정보 처리 흐름을 확정한다. 코드에 존재하는 기능과 실제 운영되는 기능을 분리한다.
> **대상 서비스**: neture · kpa-society · k-cosmetics · pharmacy-hub (GlycoPharm 은 삭제 완료 — 제외)
> **비밀값 정책**: secret · API key · SMTP 비밀번호 · 토큰 · 개인 문의내용 · 이메일 주소는 어떤 것도 기록하지 않았다. 존재 여부(`SET / NOT_SET`)와 집계·날짜만 사용한다.

---

## 0. 조사 방법 (read-only 채널)

| 채널 | 용도 |
|---|---|
| `gcloud run services describe / list` (asia-northeast3) | Cloud Run 리전 · 현재 revision · env **이름**과 SET/NOT_SET (값은 whitelist 된 비민감 항목만) |
| `gcloud sql instances describe · backups list` | Cloud SQL 리전 · 백업 위치 |
| `gcloud storage buckets list/describe/get-iam-policy · ls` | 버킷 위치 · 공개 여부 · lifecycle · 최상위 prefix 만 |
| `gcloud logging buckets list · logging read --limit 1` | 로그 버킷 위치·보존일 · 요청 로그의 IP/UA 필드 **존재 여부** |
| `gcloud services list · api-keys list · billing projects describe` | Gemini API 활성·키 메타데이터(이름·제한만)·결제 연계 |
| Cloud SQL Auth Proxy + `psql` (`o4o_api`, SELECT only) | `information_schema` · `count(*)` · `min/max(created)` · 상태별 집계 |
| 저장소 코드 grep | 저장 컬럼 · retention job · 전송 항목 · tracker · cookie/localStorage |
| `curl` 프로덕션 HTML 4종 | 실제 배포된 페이지의 third-party tracker 스캔 |

---

## 1. Google Cloud 국내 저장 확인 (§4)

프로젝트 `netureyoutube`. 2026-09-17 현재 운영값을 재확인했다(과거 조사 복사 아님).

| 리소스 | 실제 위치 | 개인정보 가능성 | 판정 |
|---|---|---|---|
| API `o4o-core-api` (revision `o4o-core-api-03684-jkj`) 및 web 서비스 8종 | Cloud Run **asia-northeast3(서울)** | 처리 중 메모리 · 요청 로그(IP/UA) | **국내** |
| DB `o4o-platform-db` (PostgreSQL 15, ZONAL, PD_SSD) | Cloud SQL **asia-northeast3(서울)** | 회원 · 문의 · 로그 전부 | **국내** |
| DB 자동 백업 (7세대 보관, PITR 활성) | 백업 위치 **미지정 → 실제 백업 row `location = asia` (multi-region)** | DB 전체 사본 | **국외 가능성 있음** — Google 이 asia multi-region 내(한국·일본·대만·싱가포르 등) 어느 리전에 둘지 보장하지 않음 → `NEEDS_CONTRACT_CHECK` (또는 백업 위치를 `asia-northeast3` 로 고정하는 설정 변경 WO) |
| 미디어 `o4o-media-library` | GCS **ASIA-NORTHEAST3** · **공개(allUsers objectViewer)** · lifecycle 없음 | 상품 이미지 · 매장 콘텐츠 · data-seed (개인정보 목적 아님, 업로드 내용에 따라 포함 가능) | **국내** |
| 임시 영상 `o4o-video-temp-output` | GCS ASIA-NORTHEAST3 · 비공개 · `video-jobs/` 3일 자동삭제 | 자동화 임시 산출물 | 국내 |
| `neture-db-final-export` · `yaksasite` · `run-sources-*` | ASIA-NORTHEAST3 · 비공개 | DB export 사본(과거) · 코드 미참조 legacy | 국내 (별도 정리 대상, 본 IR 범위 밖) |
| `netureyoutube_cloudbuild` | **US multi-region** | 빌드 소스/아티팩트(코드) — 개인정보 아님 | 국외이나 개인정보 무관 |
| Cloud Logging `_Default`(30일) · `_Required`(400일) | 위치 **`global`** | Cloud Run 요청 로그에 `remoteIp` · `userAgent` **포함 확인** · 앱 로그의 `req.ip`(에러 핸들러·performanceMonitor) | **국외 저장 가능** — `global` 로그 버킷은 저장 리전이 고정되지 않음 → `NEEDS_CONTRACT_CHECK` (Google Cloud 위탁·국외이전 항목으로 기재하거나, 로그 버킷을 asia-northeast3 로 고정하는 별도 WO) |

**결론**: 개인정보 **주 저장(DB · 미디어)** 은 한국이다. 단 ① DB 자동 백업 위치가 `asia` multi-region, ② Cloud Logging 이 `global` 인 두 가지가 "전부 국내" 라고 단정하지 못하게 한다.

---

## 2. Gmail / 이메일 처리 실태 (§5)

현재 revision env(값은 whitelist 만):

```text
EMAIL_SERVICE_ENABLED = true
SMTP_HOST   = smtp.gmail.com
SMTP_PORT   = 587
SMTP_SECURE = false   (STARTTLS)
SMTP_USER   = SET  → 도메인 = gmail.com
SMTP_PASS   = SET
EMAIL_FROM_NAME = O4O Platform

ACCOUNT_TYPE = CONSUMER_GMAIL
DOMAIN_TYPE  = GMAIL_DOMAIN
```

- **Google Workspace 가 아니다.** 일반 Gmail 계정(@gmail.com) + 앱 비밀번호 방식. 따라서 Workspace 계약 · Cloud Data Processing Addendum · 데이터 리전 설정 **해당 없음**. Gmail 소비자 서비스는 Google 개인정보처리방침이 적용되고 처리 위치는 Google 글로벌 인프라 → **국외 처리 후보**.
- 추가 관찰: DB `settings.key='email'` jsonb 에 `smtpHost,smtpPort,smtpUser,fromEmail,smtpSecure,smtpPassword,fromName` 키가 존재한다(값 미확인). 운영 env 와 DB 설정 두 곳에 SMTP 자격정보가 있는 구조 — 본 IR 범위 밖, 별도 정리 후보.

**Gmail SMTP 를 통과하는 이메일 (프로덕션 `email_logs` 90건, 2026-05-18 ~ 2026-09-11, 전부 `sent`)**

| emailType | 건수 | 포함 개인정보 |
|---|---|---|
| `email-verification` | 43 | 수신 이메일 · 인증 링크(토큰) |
| `password-reset` | 16 | 수신 이메일 · 비밀번호 재설정 링크(토큰) |
| `welcome` | 2 | 수신 이메일 · 이름 |
| `custom` | 29 | 회원 승인/반려 안내 · 역할 신청 결과 · **문의 접수 알림(관리자 수신)** · 문의 자동응답 · 오류 알림(관리자) |

`email_logs` 에 실제 저장되는 컬럼: `recipient · sender · subject · status · messageId · emailType · error · sentAt · createdAt`. **`body` / `htmlBody` 컬럼은 존재하나 코드(`mail-core/mail-transport.service.ts logEmail()`)가 쓰지 않으며 프로덕션 90건 모두 body NULL 확인.** 보존기간·삭제 job **없음**.

---

## 3. OAuth 실제 활성상태 (§6)

- DB `settings` 에 **`oauth_settings` 키가 없다** (존재 키: `email · general · reading · theme`).
- Cloud Run env 에 `GOOGLE_CLIENT_*` · `KAKAO_CLIENT_*` · `NAVER_CLIENT_*` **0개**.
- `passportDynamic.ts` 는 DB 설정 → env 순으로 읽고 둘 다 없으면 전 provider `enabled:false`.
- `users.provider` 58명 전원 `NULL` (소셜 가입자 0).
- 활성 web 4종 + `account-ui` 에 소셜 로그인 UI 코드 **없음**.

| provider | enabled | 설정 존재 | 현재 사용자 로그인 UI 노출 | 실제 scope |
|---|:---:|:---:|:---:|---|
| Google | **false** | 없음 | 없음 | (코드 기본값 `profile email` — 미사용) |
| Kakao | **false** | 없음 | 없음 | (코드 기본값 `[]` — 미사용) |
| Naver | **false** | 없음 | 없음 | (코드 기본값 `[]` — 미사용) |

**판정**: 소셜 로그인은 **현재 미사용**. 처리방침 v1.0 에 "수집출처: Google/Kakao/Naver" 를 넣지 않는다(개시 시 개정 대상).

---

## 4. AI provider 실제 운영 상태 (§7)

```text
AI_DEFAULT_PROVIDER     = NOT_SET  → 코드 기본값 gemini (ai-provider-runtime.ts FALLBACK_DEFAULT_PROVIDER)
GEMINI_API_KEY          = SET  (literal env)
OPENAI_API_KEY          = SET  (literal env)
AI_DEFAULT_MODEL        = NOT_SET → GEMINI_CANONICAL_MODEL = gemini-3.8-flash (관리자 정책 AiQueryPolicy.defaultModel 우선)
AI_DEFAULT_MODEL_OPENAI = NOT_SET → 코드 기본 gpt-6-astra (openai 로 전환 시에만 의미)
```

- 기본 provider: **gemini**. 사용 가능 provider: gemini · openai (둘 다 키 SET). Home UI 는 provider 를 보내지 않으므로 **실사용 트래픽은 전부 gemini** (요청 body 로 `provider:'openai'` 를 명시하는 클라이언트는 활성 web 에 없음).
- 운영 로그 근거: `ai_usage_logs` 25건 전부 `gemini / gemini-2.5-flash` (2026-05-20 ~ 06-29). 6/29 이후 row 가 없는 이유는 Home AI(`/ai/home-chat`) 경로가 `ai_usage_logs` 에 기록하지 않기 때문(기록 경로는 `ai-proxy.service` · `ai-policy-executor` 뿐). 즉 **현재 AI 트래픽의 usage row 가 남지 않는 구간이 있다** — 정확한 provider 실측은 코드 기본값 + env 부재로 확정.
- Gemini 키 메타데이터: 프로젝트 `netureyoutube` 에 `o4o-gemini-prod-key` (API 제한 `generativelanguage.googleapis.com`, 2026-05-07 생성) 존재 · `generativelanguage.googleapis.com` 활성 · **프로젝트 결제 연계 `billingEnabled = True`** → Gemini API **유료 서비스(Paid Services) 약관 적용 가능성 높음** (단 Cloud Run 의 `GEMINI_API_KEY` 값이 이 키인지는 값 비교를 하지 않아 미확정).
- OpenAI 키: 프로덕션 트래픽 없음(위). 대시보드 설정은 접근 권한 밖.

---

## 5. AI 데이터 흐름 (§8)

### 5-1. O4O 자체 저장

| 항목 | 저장 여부 | 근거 |
|---|---|---|
| prompt 본문 | **저장 안 함** (Home AI · 편집 AI) | `ai_usage_logs` 컬럼: `userId · scope · costEstimated · provider · model · requestId · promptTokens · completionTokens · totalTokens · durationMs · status · errorMessage · errorType · createdAt` |
| response 본문 | **저장 안 함** | 동일 |
| 첨부파일 | **저장 안 함** — 요청 중 메모리에서 읽어 전송(`attachment-reader.ts` 에 파일/DB 쓰기 없음). 응답에는 첨부 **이름·종류·읽힘 여부만** 반환 | `ai-proxy.routes.ts` 2109~2172 |
| usage metadata | 저장 (위 컬럼) — 단 Home AI 경로는 미기록 | §4 |
| errorMessage | 저장 (provider 오류 원문 → **서버 로그**에만, DB 는 정규화 코드) | `normalizeAiError` |
| work run 상태 | `runId · userId · deviceId · 상태` 만, **TTL 30분** 후 만료·물리 삭제 | `work-run-coordination-service.ts` |
| **예외: `ai_query_logs`** | 컬럼에 `question · answer · contextData · attachedInfo` 가 있어 **프롬프트·답변 본문을 저장하는 구조** — 그러나 **프로덕션 0 row**. 호출 경로는 `AiSummaryModal`(`@o4o/ai-components`) → `POST /ai/query` 뿐이며 활성 web 에서 re-export 만 되고 렌더하는 화면 없음 → **DEAD/미사용** | `ai-query.service.ts` 496~506 |

### 5-2. 외부 AI(Gemini) 전송 항목 — 코드가 실제로 보내는 것만

```text
사용자 입력 텍스트(질문·지시)
시스템 프롬프트(O4O 가 작성한 고정 문구 + 사용자 workScope 등 비식별 컨텍스트)
첨부 이미지 (inline multimodal part)
첨부 PDF / DOCX / TXT / MD / XLSX / CSV 에서 추출한 텍스트
편집 AI: 편집 대상 콘텐츠 본문
→ 생성 결과(응답) 수신
```

보내지 않는 것: 사용자 이메일·이름·회원 식별자(요청 본문에 포함시키는 코드 없음) · O4O DB 레코드 자체. **사용자가 텍스트/첨부에 스스로 넣은 개인정보는 그대로 전송된다**(처리방침에 이용자 주의 문구 필요).

---

## 6. AI 사업자 데이터 보존 설정 (§9)

### Gemini
| 항목 | 결과 |
|---|---|
| Cloud Billing 연계 유료 API | **가능성 높음** — 프로젝트 billingEnabled · 전용 키 존재. 키 값 동일성 미검증 → `NEEDS_CONTRACT_CHECK` |
| API logging(Google AI Studio 로깅) 설정 | `UNKNOWN — CONTRACT/ACCOUNT CHECK REQUIRED` (gcloud 로 조회 불가) |
| log retention | 유료 서비스 약관: 악용 탐지 목적 **제한 기간 보관** — 구체 일수는 계정/약관 확인 필요 |
| dataset 공유 · 제품 개선 opt-in | `UNKNOWN — CONTRACT/ACCOUNT CHECK REQUIRED` |
| 처리 국가 | Google 약관상 "Google 또는 대리인 시설이 있는 국가에서 처리·캐시 가능" → **국외이전 후보** |

### OpenAI
| 항목 | 결과 |
|---|---|
| retention 유형 · ZDR · Modified Abuse Monitoring · data residency · data sharing opt-in | 전부 `UNKNOWN — CONTRACT/ACCOUNT CHECK REQUIRED` (플랫폼 계정 접근 권한 밖) |
| 현재 프로덕션 트래픽 | **없음** (§4). 따라서 v1.0 에는 "현재 미사용 · 전환 시 개정" 으로 두는 것이 안전 |

---

## 7. 문의(Contact) 개인정보 (§10)

`contact_inquiries` 실제 컬럼: `service_key · inquiry_type · name · email · phone · organization_name · subject · message · privacy_consent · status · source_path · user_agent · ip_hash · notification_status · handled_at · handled_by · internal_note · created_at/updated_at`

| 확인 항목 | 결과 |
|---|---|
| 실제 production row | **3건** (전부 `k-cosmetics`) |
| 가장 오래된 row | 2026-06-12 (최신도 2026-06-12) |
| IP 처리 | 원본 IP 저장 안 함 — `sha256(ip)` 해시만 (`public-contact-inquiry.controller.ts:64,158`) |
| 자동 삭제 job | **없음** |
| retention 정책(코드·설정) | **없음** — 모듈 내 delete/cleanup 코드 0 |
| 접수 시 이메일 | 관리자 알림 + 문의자 자동응답이 Gmail SMTP 로 발송(`custom` type) |

**판정**: `NEEDS_POLICY_DECISION` — 보유기간(예: 처리 완료 후 3년 또는 1년) 을 회사가 정해야 하며, 정한 뒤 자동 삭제 구현 WO 가 필요하다. "필요한 기간" 식 표현 금지.

---

## 8. 로그인·보안 로그 (§11)

| 데이터 | 테이블 | 개인정보 | 코드 retention | 실제 운영 상태 | ENFORCED |
|---|---|---|---|---|---|
| 로그인 시도 | `login_attempts` (`email · ipAddress · userAgent · successful · failureReason · deviceId · location`) | 이메일 · **원본 IP** · UA | `CleanupLoginAttemptsJob` 24h 주기, `LOGIN_ATTEMPTS_RETENTION_DAYS` 기본 **30일**, `server.ts:166` 에서 start | **0 row** (oldest `-`) | **YES** (30일 초과 row 0 · 다만 row 자체가 0 이라 "job 이 지운 것" 과 "기록 자체가 안 되는 것" 을 구분 못 함 → 다음 실측 때 최근 30일 row 유무 확인 필요) |
| 사용자 활동 로그 | `user_activity_logs` (entity 존재, `ipAddress · userAgent`) | — | 없음 | **테이블이 프로덕션 DB 에 없음** → 미사용 | n/a |
| 감사 로그 | `audit_logs` (`entityType · entityId · action · userId · changes · reason · ipAddress · userAgent`) | userId · IP · UA | 없음 | **8 row**, 2026-07-07 단일 | NO (정책 없음) |
| 액션 로그 | `action_logs` (`service_key · user_id · organization_id · action_key · source · status · duration_ms · error_message · meta`) — **IP/UA 없음** | user_id + meta(법정정보 변경 before/after 등) | 없음 | **9,390 row**, 2026-05-14 ~ 09-17, 90일 초과 4,153 | NO (정책 없음) |
| KPA 운영자 감사 | `kpa_operator_audit_logs` (`operator_id · operator_role · action_type · target_* · metadata`) — IP/UA 없음 | operator_id | 없음 | 267 row, 2026-04-03 ~ 08-21 | NO |
| refresh token | `refresh_tokens` | — | — | **0 row** (토큰은 httpOnly cookie/JWT 로만 운용) | n/a |
| 이메일 발송 로그 | `email_logs` | 수신 이메일 · 제목 | 없음 | 90 row, 2026-05-18 ~ | NO |
| Cloud Run 요청 로그 | Cloud Logging `_Default` | **remoteIp · userAgent 포함 확인** | Google 기본 **30일** | 위치 `global` | YES (Google 측) |

**판정**: 로그인 로그 30일 정책은 코드·스케줄 모두 존재하고 30일 초과 row 0 → 작동 중으로 본다. `audit_logs · action_logs · email_logs` 는 보유기간 **미정** → `NEEDS_POLICY_DECISION`.

---

## 9. 미디어 및 문서 저장 (§12)

| bucket | 존재 | location | 공개/비공개 | 개인정보 가능 | 보유정책 | 코드 사용처 |
|---|:-:|---|---|:-:|---|---|
| `o4o-media-library` | O | ASIA-NORTHEAST3 | **공개**(allUsers objectViewer) | 낮음(업로드 내용 의존) | 없음 | `media-library.service.ts` (기본값) · prefix `media/ · products/ · data-seed/` — 상품 이미지 · 매장 제작 콘텐츠 · seed 자료 |
| `o4o-video-temp-output` | O | ASIA-NORTHEAST3 | 비공개 | 낮음 | `video-jobs/` **3일 자동삭제** | `video-temp-output.config.ts` |
| `o4o-private-documents` (`GCS_PRIVATE_DOCUMENT_BUCKET` 기본값) | **X (404)** | — | — | (공급자 사업자등록증 등 서류 — 설계상) | — | `supplier-onboarding.service.ts:65` · `supplier-regulated-category.service.ts:110` — env 도 NOT_SET → **공급자 서류 업로드는 현재 동작하지 않음** |
| `neture-db-final-export` | O | ASIA-NORTHEAST3 | 비공개 | **높음**(DB export 사본) | 없음 | 코드 미참조(과거 이관 산출물) — 본 IR 범위 밖 정리 후보 |
| `yaksasite` | O | ASIA-NORTHEAST3 | 비공개 | 불명 | 없음 | 코드 미참조(legacy) |
| `run-sources-*` · `netureyoutube_cloudbuild`(US) | O | — | 비공개 | 없음(코드) | — | 배포 인프라 |

**판정**: 처리방침 v1.0 의 "파일 저장" 항목은 **미디어 라이브러리(공개 이미지·콘텐츠)** 만 CONFIRMED. 공급자 서류 저장은 **현재 처리항목이 아님**(버킷 부재) → 기능 개통 시 개정.

---

## 10. 결제 처리 (§13)

```text
TOSS_PAYMENTS_CLIENT_KEY = NOT_SET
TOSS_PAYMENTS_SECRET_KEY = NOT_SET
```

| 테이블 | 집계 |
|---|---|
| `checkout_payments` | 1 row · `pending` · pgProvider `toss` · approvedAt **0건** (2026-08-09) |
| `o4o_payments` | 13 row · 전부 `CREATED` · paidAt **0건** (neture-b2b 2 · store-service-subscription 5 · pharmacy-hub 6, 최신 2026-08-18) |
| `store_paid_feature_entitlements` | 0 row |

**판정**: 결제 키 미배포 · 결제 성공 데이터 0 → **Toss 결제는 live 아님**. v1.0 현재 처리항목에서 제외, 결제 개시 시 개정 대상(카드정보는 PG 가 보유, O4O 는 `cardCompany · cardNumber(마스킹)` 컬럼 설계만 존재).

---

## 11. 외부 분석·광고·모니터링 SDK (§14)

프로덕션 HTML 4종(`neture.co.kr · kpa-society.co.kr · k-cosmetics.site · pharmacyhub.co.kr`, 캐시버스트) + 활성 web 4종 · `packages/*` · api-server 코드 스캔.

| 대상 | 결과 |
|---|---|
| Google Analytics / gtag | **NOT_PRESENT** |
| Google Tag Manager | NOT_PRESENT |
| Meta Pixel | NOT_PRESENT |
| Microsoft Clarity | NOT_PRESENT |
| Hotjar · Mixpanel · Amplitude | NOT_PRESENT |
| Sentry · Datadog · New Relic | NOT_PRESENT (서버 오류는 자체 `ErrorAlertService` → Gmail 로 관리자 메일) |
| Naver/Kakao 광고 픽셀 | NOT_PRESENT |

(코드 grep 1건 `ProductDetailDrawer.tsx` 는 `setAddingTag(` 이 `gtag(` 에 대소문자 무시 매칭된 오탐.)

**판정**: 광고·행태정보 분석 tracker **없음**. 처리방침에 "행태정보 수집·광고 쿠키" 문구를 넣지 않는다.

---

## 12. 자동수집 기술 (§15)

| 항목 | 실제 사용 | 목적 | 만료/삭제 |
|---|---|---|---|
| 인증 cookie `accessToken` | O (httpOnly · Secure(prod) · domain `.neture.co.kr`) | 로그인 세션 | **15분** (`cookie.utils.ts:88`) |
| 인증 cookie `refreshToken` | O (httpOnly) | 세션 갱신 | **7일** |
| cookie `sessionId` | O (httpOnly) | 세션 식별 | 7일 |
| localStorage `o4o_accessToken · o4o_refreshToken · accessToken · refreshToken · token · authToken · admin-auth-storage · user` | O (서비스별 토큰/사용자 캐시) | 로그인 유지 | 로그아웃 시 삭제 · 만료 토큰은 재로그인 시 교체 |
| localStorage `neture:theme · o4o-work-agent:last-target · sso:login/logout · auth-session-expired` | O | UI 설정 · 탭 간 로그인 동기화 | 브라우저 보관(개인정보 아님) |
| device/session identifier | `deviceId`(login_attempts 컬럼 · work run) | 보안·작업 재개 | login_attempts 30일 · work run 30분 |
| IP | 서버: `login_attempts.ipAddress`(30일) · `audit_logs.ipAddress` · `contact_inquiries.ip_hash`(해시) · 에러/성능 로그 · Cloud Run 요청 로그(30일) | 보안 · 부정이용 방지 · 장애 대응 | 위 표 참조 |
| User-Agent | `login_attempts · audit_logs · contact_inquiries.user_agent` · Cloud Run 요청 로그 | 동일 | 동일 |
| 광고성 cookie | **없음** | — | — |

---

## 13. 수탁자 / 제3자 / 국외이전 후보 매트릭스 (§16)

| 사업자/서비스 | 실제 사용 | 전달 데이터 | 목적 | 처리 관계 후보 | 국내/국외 | 처리방침 반영 |
|---|:-:|---|---|---|---|---|
| Google Cloud (Cloud Run · Cloud SQL · GCS · Cloud Logging) | **O** | 회원 DB 전체 · 파일 · 요청 로그(IP/UA) | 인프라 호스팅 · 백업 · 로그 | **위탁** | 주 저장 **국내(서울)** · 백업 `asia` multi-region · 로그 `global` → **일부 국외 가능** | **반영(위탁)** + 국외 가능 부분은 `NEEDS_CONTRACT_CHECK` |
| Gmail (소비자 계정, SMTP) | **O** | 수신 이메일 · 제목 · 본문(인증/재설정 링크 · 승인 안내 · 문의 알림) | 알림 메일 발송 | **위탁 후보** (소비자 Gmail 은 DPA 없음 → 관계 정의 필요) | **국외** (Google 글로벌) | 반영 필요 — `NEEDS_CONTRACT_CHECK` |
| Gemini API (Google) | **O** (기본 provider) | 사용자 입력 텍스트 · 첨부 이미지 · 첨부 문서 추출 텍스트 · 편집 대상 본문 · 시스템 프롬프트 | AI 응답 생성 | **위탁 후보** (처리위탁형 국외이전) | **국외** | 반영 필요 — 보관기간·처리국가 `NEEDS_CONTRACT_CHECK` |
| OpenAI API | 키 SET · **트래픽 없음** | (전환 시 Gemini 와 동일) | 예비 provider | 위탁 후보 | 국외 | **v1.0 미반영** (전환 시 개정) |
| Google OAuth / Kakao / Naver | **X** | — | — | — | — | 미반영 |
| Toss Payments | **X** (키 미배포 · 결제 0) | — | — | 제3자/위탁 판정 보류 | — | 미반영 (결제 개시 시 개정) |
| Cafe24 (env `CAFE24_CLIENT_*` SET) | 설정만 (OAuth 완료 · 상품 연동 Phase A STOP) | 현재 개인정보 전달 없음(상품 데이터) | 매장 상품 연동 | 향후 판정 | 국내 | 미반영 (개통 시 재조사) |
| 공공데이터(nedrug 등 의약품 이미지 원본) | O | 개인정보 아님 | seed | — | 국내 | 해당 없음 |

---

## 14. 처리방침 v1.0 확정 가능 여부 등급 (§17)

### CONFIRMED — 바로 기재 가능
- 개인정보 주 저장 위치: Google Cloud 서울 리전(Cloud SQL · GCS) — 위탁(클라우드 인프라)
- 회원 항목: 이메일 · 비밀번호(해시) · 이름 · 서비스별 역할/소속(58 users, 소셜 0)
- 이메일 발송: 인증 · 비밀번호 재설정 · 가입/승인 안내 · 문의 알림 (Gmail SMTP 경유)
- AI 기능: Gemini 에 입력 텍스트·첨부 내용 전송, O4O 는 **프롬프트·응답·첨부를 저장하지 않음**, 토큰/모델 메타데이터만 보관
- 문의: 이름 · 이메일 · 전화 · 소속 · 제목 · 내용 · UA · IP 해시 수집
- 자동수집: 인증 쿠키(15분/7일, httpOnly) · localStorage 토큰 · 로그인 시도 로그(IP·UA, 30일 자동삭제)
- **광고·행태정보 tracker 없음** · 소셜 로그인 없음 · 결제 없음 · 공급자 서류 저장 없음 (→ "현재 수집하지 않음" 으로 명시 가능)

### NEEDS_POLICY_DECISION — 처리는 확인, 회사 결정 필요
- 문의(`contact_inquiries`) 보유기간 + 자동 삭제 구현
- `audit_logs · action_logs · email_logs · kpa_operator_audit_logs` 보유기간
- 회원 탈퇴 시 관련 로그 처리 기준
- 미디어 라이브러리(공개 버킷) 업로드물의 보유·삭제 기준
- `neture-db-final-export` 버킷(DB 사본) 보관 여부/기간

### NEEDS_CONTRACT_CHECK — 계약·계정 자료 확인 필요
- Cloud SQL 자동 백업 `asia` multi-region → 국외 저장 여부 (또는 `asia-northeast3` 고정 설정 WO)
- Cloud Logging `global` 버킷 저장 리전
- Gmail 소비자 계정: 위탁 계약 부재 → Workspace 전환 또는 처리방침상 관계 정의
- Gemini: 유료 약관 적용 확정(키-프로젝트 동일성) · 로그 보관기간 · 제품개선 공유 opt-in 상태 · 처리 국가
- OpenAI: 전환 전 retention/ZDR/residency 확인 (v1.0 에는 미반영)

---

## 15. 반드시 답할 항목 (§18)

| 질문 | 답 |
|---|---|
| 개인정보 주 저장국가는 한국인가 | **예** (Cloud SQL · GCS 서울). 단 DB 자동 백업은 `asia` multi-region, Cloud Logging 은 `global` — 이 둘은 계약 확인 필요 |
| 국외이전이 실제 발생하는 기능은 무엇인가 | ① AI 기능(Gemini API 로 입력·첨부 전송) ② 이메일 발송(소비자 Gmail SMTP) ③ (가능성) DB 백업 · Cloud Logging 의 Google 리전 배치 |
| Gmail 은 어떤 계약 유형인가 | **소비자 Gmail 계정(@gmail.com)** — Workspace 아님, DPA 없음 |
| 실제 AI 기본 provider 는 무엇인가 | **Gemini** (`AI_DEFAULT_PROVIDER` 미설정 → 코드 기본값; 운영 usage 25/25 gemini). OpenAI 키는 있으나 트래픽 없음 |
| AI 프롬프트를 O4O 가 저장하는가 | **아니오** — `ai_usage_logs` 는 토큰·모델·상태만. (`ai_query_logs` 는 본문 저장 구조이나 0 row · 호출 화면 없음) |
| 외부 AI 사업자가 프롬프트를 얼마나 보관하는가 | Gemini 유료 약관: 악용 탐지 목적 제한 기간(구체 일수·계정 설정) **UNKNOWN — CONTRACT/ACCOUNT CHECK REQUIRED**. OpenAI: 미사용 |
| OAuth 실제 활성 provider 는 무엇인가 | **없음** (DB 설정·env·UI 모두 없음, 소셜 가입자 0) |
| 문의정보 보유기간은 현재 정해져 있는가 | **아니오** — 정책·삭제 job 없음 (3건, 2026-06-12) |
| 로그인로그 30일 정책이 실제 작동하는가 | **예로 판단** — job 기동 확인 · 30일 초과 row 0 (총 row 0 이라 기록 자체 여부는 추가 실측 권장) |
| Toss 결제가 현재 live 인가 | **아니오** — 키 NOT_SET · 결제 성공 0 |
| 광고/행태분석 tracker 가 존재하는가 | **아니오** — 프로덕션 HTML 4종·코드 모두 NOT_PRESENT |
| 개인정보 처리방침 v1.0 을 지금 게시할 수 있는가 | **조건부 가능** — CONFIRMED 항목만으로 본문 작성은 가능. 게시 전 최소 ① 문의·로그 보유기간 결정(POLICY) ② Gemini·Gmail 국외이전 문구를 "위탁·국외이전 후보" 로 기재하되 보관기간은 계약 확인 후 확정(CONTRACT) 이 필요. 백업·로그 리전은 "Google Cloud 아시아 리전" 수준으로 기재하거나 설정 고정 WO 후 "국내" 로 좁힌다 |

---

## 16. 범위 밖 관찰 (수정하지 않음 · 별도 WO 후보)

1. `GEMINI_API_KEY · OPENAI_API_KEY · JWT_SECRET · JWT_REFRESH_SECRET · SMTP_PASS` 가 Cloud Run env **literal** 로 배포됨(Secret Manager `secretRef` 는 `ENCRYPTION_KEY · DB_PASSWORD · CAFE24_*` 만). 값은 확인하지 않았다. → secretRef 전환 WO 후보.
2. DB `settings.email` 에 `smtpPassword` 키 존재 — env 와 이중 보관.
3. Cloud SQL 백업 위치 미지정(`asia`) · Cloud Logging `global` — 국내 고정 설정 WO 후보.
4. `o4o-media-library` 전체 공개(allUsers) · lifecycle 없음.
5. `neture-db-final-export` (DB 사본 버킷) 보관 목적·기간 미정.
6. Home AI 경로가 `ai_usage_logs` 를 남기지 않음(비용·감사 관점).
7. `ai_query_logs`(본문 저장 구조) 는 dead path — 처리방침과 어긋나지 않도록 유지하려면 폐기 또는 "저장 안 함" 계약 명시 필요.
8. 공급자 서류 업로드 코드가 존재하지 않는 버킷을 가리킴(기능 불능).

---

## 17. 변경 0 확인

- 코드 수정 0 · DB write 0 (SELECT 만, 프록시 종료) · migration 0 · Cloud Run/GCS/Secret/OAuth/AI 설정 변경 0 · 배포 0.
- 산출물: 본 문서 1개.
