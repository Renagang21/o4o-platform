# CHECK-O4O-HOME-AI-PRODUCTION-CREDENTIAL-AND-CLOSURE-V1

> **상태**: BLOCKED — credential 쓰기 권한 부재로 Phase 3 CLOSED 판정 보류
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

## 2. 정상화 방식 — **미실행 (권한 차단)**

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

### 사용자가 실행해야 할 조치 (권장 순서)

1. **GitHub secret 갱신** — 이것이 정본이다. 이걸 건너뛰고 Cloud Run 만 고치면 **다음 api 배포에서 stale 키로 되돌아간다.**
   ```bash
   gcloud services api-keys get-key-string 1ca07e5e-ca64-4b81-9f76-285d1f8905af \
     --format="value(keyString)" | gh secret set GEMINI_API_KEY --body-file -
   ```
2. **api-server 재배포** — `deploy-api.yml` 를 main 에서 실행(또는 `workflow_dispatch`).
3. 이후 §3~§4 smoke 를 수행하고 본 문서를 갱신한다.

---

## 3. API smoke — **미실행 (선행 조치 대기)**

정상화 후 확인할 항목:

```text
POST https://api.neture.co.kr/api/ai/home-chat   (mount: register-routes.ts:431 → '/api/ai')
Authorization: Bearer <신규 로그인 토큰>   (로그인 시 serviceKey:"neture" 필수)
body: {"message":"약국 POP 제작 시 기본 원칙을 간단히 설명해줘","workScope":{"workspace":"home"}}
기대: HTTP 200 / data.message 텍스트 존재 / provider error 없음 / secret 미노출
```

수정 전 상태로 401(`INVALID_TOKEN`) 1회를 관측했으나 이는 토큰 파싱 실패이며 **AI blocker 와 무관**하다. 재현·확정은 정상화 후 수행한다.

---

## 4. Browser · WorkScope smoke — **미실행 (선행 조치 대기)**

- `neture.co.kr/` 로그인 → 중앙 입력창 → 질문 → loading → 응답 → 2회차 질문 → 서비스 pill navigation 회귀 없음
- home scope(`workspace=home`, storeId 없음) / resolved store scope(`workspace=store`) 각 1건, 식별자 답변 노출 0

---

## 5. 이번 작업의 확정 사실 요약

| 항목 | 결과 |
|---|---|
| production Gemini credential valid | **NO** (배포된 키 400) — 유효 키는 프로젝트에 **존재**(200) |
| 코드 변경 필요 | **없음** |
| DB migration | **0** |
| DB write | **0** (read-only SELECT 만: `ai_settings` count, `ai_query_policy.default_model`) |
| secret leakage | **0** (git · CHECK · terminal 어디에도 키 값 미기록) |
| 새 production revision | **없음** |
| Phase 3 판정 | **CLOSED 불가 — BLOCKED** |

### 후속 작업

1. (필수·차단 해제) GitHub secret `GEMINI_API_KEY` 갱신 + api 재배포 → §3·§4 smoke → 본 문서 갱신 후 `WO-O4O-COMMON-HOME-AI-INPUT-V0 = CLOSED`.
2. (별도 WO) `ai_query_policy.default_model = 'gemini-3.0-flash'` 가 `MODEL_WHITELIST.gemini` 에 없어 admin 선택이 무시되는 drift.
3. (기존 기술부채·범위 밖) `/api/ai/query` 의 `column AiSettings.apikey does not exist`.
4. (구조 개선 후보) AI 키가 Cloud Run **평문 env** 로 주입된다. DB 비밀번호·encryption key 와 달리 Secret Manager 를 경유하지 않는다.

---

## 6. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건 (위 후속 작업 2·4)
