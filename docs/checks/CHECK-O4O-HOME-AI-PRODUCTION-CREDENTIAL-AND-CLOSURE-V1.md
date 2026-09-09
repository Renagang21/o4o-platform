# CHECK-O4O-HOME-AI-PRODUCTION-CREDENTIAL-AND-CLOSURE-V1

> **상태**: CLOSED — secret 갱신 · 재배포 · production smoke 전 항목 PASS
> **작업일**: 2026-09-09
> **선행**: [CHECK-O4O-COMMON-HOME-AI-INPUT-V0.md](CHECK-O4O-COMMON-HOME-AI-INPUT-V0.md) (`PASS_WITH_ENV_BLOCKER`)

본 문서는 secret 값을 기록하지 않는다. 확인은 **존재 여부 · 길이 · sha256 앞 8자(fingerprint) · HTTP 응답 코드** 수준으로만 남긴다.

---

## 1. 원인 (확정)

`/api/ai/home-chat` 의 provider 400(`API key not valid`)은 **코드 결함이 아니라 production 에 주입된 Gemini API key 가 무효**인 것이 원인이다.

| 확인 대상 | 결과 |
|---|---|
| Cloud Run `o4o-core-api` 의 `GEMINI_API_KEY` (env 평문, GitHub Actions secret 에서 주입) | len 39 · fp `7dad938b` · `GET generativelanguage/v1beta/models` → **HTTP 400** |
| GCP 프로젝트 API key `o4o-gemini-prod-key` (uid `1ca07e5e-…`, `generativelanguage.googleapis.com` 제한, 생성 2026-05-07) | len 39 · fp `ac954c61` · 동일 호출 → **HTTP 200** |
| 두 값 일치 여부 | **불일치** |

시간선이 원인을 설명한다. GitHub secret `GEMINI_API_KEY` 의 마지막 갱신은 **2026-03-09**, 유효 키 `o4o-gemini-prod-key` 의 생성은 **2026-05-07** 이다.
→ 키가 재발급된 뒤 **GitHub secret 이 갱신되지 않아 stale 값이 계속 배포**되고 있었다.

### 부수 확인 — 다른 후보 원인은 모두 배제

| 후보 | 판정 | 근거 |
|---|---|---|
| `ai_settings` 테이블의 잘못된 키가 우선순위를 가로챔 | 아님 | production `ai_settings` **0 rows** (read-only SELECT). `resolveAiApiKey()` 는 env fallback 만 사용 |
| Gemini API 자체 비활성 | 아님 | `generativelanguage.googleapis.com` · `aiplatform.googleapis.com` **enabled** |
| 모델 id 부재 | 아님 | 유효 키로 `gemini-2.5-flash:generateContent` → **HTTP 200** |
| policy 의 `default_model` 이 무효 모델 | 영향 없음 | `ai_query_policy.default_model = 'gemini-3.0-flash'` (유효 키로도 **404**) 이지만 `MODEL_WHITELIST.gemini` 에 없어 `resolveEditingModel()` 이 fallback `gemini-2.5-flash` 를 반환. Cloud Run 에 `AI_DEFAULT_MODEL` env 도 없음 |
| billing / IAM | 아님 | 유효 키로 실제 생성 호출 200 |

**코드 변경은 필요 없다.** `/api/ai/home-chat` · `resolveAiApiKey()` · `resolveEditingModel()` 는 정상 동작하며, 잘못된 것은 주입된 값 하나뿐이다.

> 다만 `ai_query_policy.default_model = 'gemini-3.0-flash'` 는 **저장소 whitelist 에 존재하지 않는 모델**이라 admin 이 고른 값이 조용히 무시되고 있다. 이번 WO 범위 밖의 별도 drift 이며 §5 후속 작업에 등재한다.

---

## 2. 정상화 방식 — **완료**

WO §5 가 지정한 "기존 production secret 관리 방식" 은 다음 한 경로다.

```text
GitHub Actions secret  GEMINI_API_KEY
  → .github/workflows/deploy-api.yml:307
      --set-env-vars="GEMINI_API_KEY=${{ secrets.GEMINI_API_KEY }}"
  → Cloud Run o4o-core-api env (평문 env, Secret Manager 미사용)
```

Secret Manager 에는 AI 키가 없다(`cafe24-client-id` / `cafe24-client-secret` / `o4o-api-db-password` / `o4o-db-password` / `o4o-encryption-key` 뿐).

시도한 두 경로가 **모두 세션의 자동 승인 정책에서 차단**되어 실행하지 못했다.

| 시도 | 결과 |
|---|---|
| `gh secret set GEMINI_API_KEY`(값은 stdin, 출력 없음) | 차단 |
| `gcloud run services update o4o-core-api --update-env-vars GEMINI_API_KEY=…` | 차단 |

### 실행 결과 (2026-09-09)

Cloud Run 을 직접 수정하지 않고 **GitHub secret 을 정본으로 갱신**한 뒤 기존 canonical workflow 로 재배포했다.
(Cloud Run 만 고쳤다면 다음 api 배포에서 stale 키로 되돌아간다.)

| 항목 | 값 |
|---|---|
| GitHub secret `GEMINI_API_KEY` | 사용자 실행으로 갱신 (값 미기록) |
| `deploy-api` run | `34321297664` · **SUCCESS** |
| Cloud Run revision | `o4o-core-api-03563-dkd` |
| image | `0ea9ddbccd70548c3a8404111246f7d048f64acb` |
| traffic | 100% |
| health check | PASS |

새 credential subsystem 도입 0 / Cloud Run 평문 하드코딩 0 / 새 배포 방식 도입 0.

---

## 3. API smoke — **PASS**

실브라우저 세션(인증된 테스트 계정)에서 발생한 실제 호출을 관측했다.
`POST https://api.neture.co.kr/api/ai/home-chat` (mount: `register-routes.ts:431` → `/api/ai`)

| # | 질문 | HTTP | 응답 |
|---|---|:---:|---|
| 1 | 약국 POP 제작 시 기본 원칙을 3가지로 알려줘 | **200** | `data.message` 텍스트 574B · 3개 원칙 서술 · requestId `518f11b0-…` |
| 2 | 그중 첫 번째 원칙을 조금 더 자세히 설명해줘 | **200** | `data.message` 텍스트 274B · requestId `7ae07dec-…` |
| 3 | (store scope) 내 매장 기준으로 POP 제작 시 주의할 점 | **200** | `data.message` 텍스트 · requestId `1b7e18b9-…` |

- provider error **0** — `API key not valid` 400 재현되지 않음.
- 요청·응답 본문 어디에도 credential 없음. secret leakage **0**.
- 앞서 관측했던 401(`INVALID_TOKEN`) 1회는 smoke 스크립트의 토큰 파싱 실패였고 실브라우저 경로에서는 재현되지 않았다.

### 비용 · 호출 검증 (WO §10)

| 항목 | 결과 |
|---|---|
| 질문 1회당 `/api/ai/home-chat` 호출 수 | **정확히 1회** (중복 호출 0) |
| 무한 retry | 없음 — 핸들러 `retry.maxAttempts: 1` 유지 |
| provider 5xx 반복 | 0 |
| `maxTokens` · rate limit | 코드 무변경 (`maxTokens: 2048`, `dynamicLimiter('free')`) |

---

## 4. Browser · WorkScope smoke — **PASS**

`neture.co.kr` 실브라우저(Chromium, 프로덕션 도메인) 검증.

| # | 항목 | 결과 |
|---|---|:---:|
| 1 | 로그인 (Neture 테스트 계정) | **PASS** — 로그인 후 `/` 유지 |
| 2 | 중앙 입력창 활성 | **PASS** — placeholder `무엇이든 물어보세요`, disabled 아님 |
| 3 | 질문 입력 · 전송 | **PASS** |
| 4 | loading 표시 | **PASS** — 전송 직후 진행 표시 관측 |
| 5 | AI 응답 출력 | **PASS** — 화면에 3개 원칙 텍스트 렌더 |
| 6 | 두 번째 질문 | **PASS** — HTTP 200 · 응답 렌더 |
| 7 | 서비스 pill navigation 회귀 | **PASS** — 6개 전부 정상 |
| 8 | browser console error | **0** |

pill 목록: 약국 `https://kpa-society.co.kr/` · 약국 경영 `https://pharmacyhub.co.kr` · 화장품 `https://www.k-cosmetics.site/` (3건 `target="_blank"` 외부 이동) / 공급자 `/supplier` · 파트너 `/partner` · 커뮤니티 `/community` (내부 이동, 각 화면 정상 렌더).

### WorkScope (WO §7)

| scope | 요청 | 서버 응답 `scope` | 판정 |
|---|---|---|:---:|
| home | `{workspace:"home", serviceKey:"neture"}` (storeId 없음) | `{workspace:"home", serviceKey:"neture", storeStatus:null}` | PASS |
| resolved store | `{workspace:"store", serviceKey:"kpa"}` | `{workspace:"store", serviceKey:"kpa-society", storeStatus:"resolved"}` | PASS |

- store scope 에서 클라이언트가 보낸 `serviceKey:"kpa"` 를 서버가 **재검증하여 `kpa-society` 로 확정**했다. 클라이언트 hint 가 그대로 신뢰되지 않음을 확인.
- 세 응답 모두 **매장명 · storeId · organizationId · UUID 등 식별자 노출 0**.
- 2회차 질문이 1회차 맥락을 기억하지 못하는 것은 `conversation 저장 = 0` 계약(WO §11)에 따른 **정상 동작**이며 결함이 아니다.

---

## 5. 이번 작업의 확정 사실 요약

| 항목 | 결과 |
|---|---|
| production Gemini credential valid | **YES** — GitHub secret 갱신 후 재배포로 해소 |
| 코드 변경 | **0** |
| DB migration | **0** |
| DB write | **0** (read-only SELECT 만: `ai_settings` count, `ai_query_policy.default_model`) |
| conversation 저장 | **0** |
| secret leakage | **0** (git · CHECK · terminal · CI log · browser console 어디에도 키 값 미기록) |
| 새 production revision | `o4o-core-api-03563-dkd` |
| API smoke | **PASS** (200 × 3) |
| Browser smoke | **PASS** (8항목) |
| WorkScope smoke | **PASS** (home / resolved store) |
| Phase 3 판정 | **CLOSED** |

### 최종 판정

```text
WO-O4O-HOME-AI-PRODUCTION-CREDENTIAL-AND-CLOSURE-V1 = CLOSED
WO-O4O-COMMON-HOME-AI-INPUT-V0                     = CLOSED
PHASE 3                                            = CLOSED
```

### 후속 작업

1. ~~GitHub secret `GEMINI_API_KEY` 갱신 + api 재배포 → §3·§4 smoke~~ → **완료 (2026-09-09)**. `WO-O4O-COMMON-HOME-AI-INPUT-V0 = CLOSED`.
2. (별도 WO) `ai_query_policy.default_model = 'gemini-3.0-flash'` 가 `MODEL_WHITELIST.gemini` 에 없어 admin 선택이 무시되는 drift.
3. (기존 기술부채·범위 밖) `/api/ai/query` 의 `column AiSettings.apikey does not exist`.
4. (구조 개선 후보) AI 키가 Cloud Run **평문 env** 로 주입된다. DB 비밀번호·encryption key 와 달리 Secret Manager 를 경유하지 않는다.

---

## 6. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건 (위 후속 작업 2·4)
