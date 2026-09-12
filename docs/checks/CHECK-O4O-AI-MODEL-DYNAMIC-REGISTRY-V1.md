# CHECK-O4O-AI-MODEL-DYNAMIC-REGISTRY-V1

> **WO**: `WO-O4O-AI-MODEL-DYNAMIC-REGISTRY-V1` — Gemini 모델을 **관리자 화면에서** 배포 없이 바꿀 수 있게 한다 + canonical 을 `gemini-3.8-flash` 로
> **상태**: 검증 완료 — production API · admin UI 실측 PASS
> **작성일**: 2026-09-12
> **commit**: `90cd03ea5` (코드·테스트) · 본 문서
> **선행**: `CHECK-O4O-AI-GEMINI-MODEL-UPGRADE-V1`(정적 whitelist 확장) · `CHECK-O4O-AI-MODEL-SELECTION-RUNTIME-RESOLVER-V1`(resolver 배선)

---

## 0. 한 줄 요약

운영 Gemini 모델은 이제 코드가 아니라 **관리자 화면(AI Query 설정)** 에서 정한다. 서버가 운영 `GEMINI_API_KEY`
로 Google `ListModels` 를 조회(1h 캐시)해 **그 키로 실제 제공되는 모델만** 드롭다운에 채우고 저장 시 다시 검증한다.
Google 이 새 모델을 내면 드롭다운에 그냥 나타난다 — 코드 수정 · 배포 없음. 코드에는 안전한 fallback 하나
(`GEMINI_CANONICAL_MODEL = gemini-3.8-flash`)만 남고, 무효 id(과거 `gemini-3.0-flash` 사고)는 400 으로 거절된다.

## 1. 착수 전 조사 (사실)

| 조사 | 결과 |
|---|---|
| 스크린샷의 `/settings/app-services` 카드 | **mock** — 저장 버튼은 1초 대기만, API Key 는 어디에도 저장되지 않았음. 모델/가격 텍스트 하드코딩 |
| 운영 키 출처 | `ai_settings` 0 rows → Cloud Run env `GEMINI_API_KEY` |
| 운영 모델 결정 경로 | `ai_query_policy.default_model = 'gemini-3.0-flash'`(무효, 2026-01) → whitelist 밖 → 하드코딩 fallback `gemini-2.5-flash` 가 실제 사용 모델이었다 |
| Google 이 이 키로 제공하는 모델(ListModels 실측) | `gemini-3.8-flash`(New Stable) · 3.7 · 3.6 · 3.5 · 3.5-flash-lite · 3.1-pro-preview · 2.5 계열 … 3.0-flash 는 없음 |
| 공식 문서/가격(2026-09-12) | 3.8 = "New Stable" · 3.7 = 이전 세대 · 3.5-flash = legacy(2배 단가). 3.6~3.8 = $0.75/$3.75 per 1M, 2.5-flash = $0.30/$2.50 |
| 선택 | **canonical = 3.8** (같은 가격대 최상위, New Stable). 대량 배치는 O4O 런타임에서 돌지 않으므로 단가 상승 영향 없음 |

## 2. 변경

| 파일 | 변경 |
|---|---|
| `services/ai-model-registry.service.ts` (신규) | Google ListModels 조회(운영 키, 1h 캐시, 6s timeout) → `generateContent` 지원 `gemini-*` 만, image/tts/transcribe/robotics/computer-use/embedding/live/audio/omni 제외. 허용 = 정적 whitelist ∪ Google 목록. 실패 시 stale → static. 키·원문 로그 0 |
| `types/ai-proxy.types.ts` | `GEMINI_CANONICAL_MODEL = 'gemini-3.8-flash'` 단일 상수(whitelist 첫 항목) |
| `utils/ai-editing-model-resolver.ts` | fallback = canonical · 정책값이 Google 목록에 있으면 통과(정적 whitelist 밖이어도) |
| `services/ai-proxy.service.ts` | `resolveModel` / `validateRequest` 가 gemini 는 동적 목록도 허용 · 기본값 canonical |
| `controllers/ai/AiQueryController.ts` | `PUT /api/ai/policy` 의 `defaultModel` 을 registry 로 검증 → 허용 밖이면 **400 `INVALID_MODEL`** |
| `routes/ai-query.routes.ts` | `GET /api/ai/models`(admin): `models[] · source · fetchedAt · canonical · current`, `?refresh=1` |
| 기본값 사이트 7곳 | ai-config-resolver · ai-query.service · ai-admin.service(정책 reset · 빈 테이블 seed) · ai-policy-executor · operator-ai-llm · LmsAIService → 전부 상수 참조(하드코딩 0, 테스트 잠금) |
| admin-dashboard `AiQuerySettings.tsx` | 드롭다운을 `/ai/models` 로 채움(표시명 — id · (기본) 표시 · 현재 값이 목록에 없으면 "사용 불가" 로 표시) · 새로고침 · 출처/조회시각/실제 사용 모델 · 선택 모델의 토큰 한도 · 서버 400 사유 toast |
| admin-dashboard `AppServices.tsx` | 하드코딩 "Gemini 3.0 Flash / gemini-2.5-flash / 1,000,000 / $0.075·$0.30" → `current` 실제 값 · 토큰 한도 · 공식 가격표 링크(틀린 가격 제거) |

**무변경**: `packages/ai-core`(F1 Frozen — 호출부가 항상 model 을 명시) · DB schema/migration · `ai_engines` 테이블 · web-neture AiEnginesPage · package.json.

## 3. 테스트 · 게이트

| 게이트 | 결과 |
|---|---|
| `ai-model-dynamic-registry.spec.ts` (신규 9): 응답 정제 · id 형식 · 정적∪동적 허용 · 무효 id 거절 · 조회 실패 fallback(키/URL 로그 0) · stale 유지 · 관리자 목록 · canonical 단일 출처(8 파일 하드코딩 0) · 저장 검증/route 잠금 | 9 PASS |
| 관련 jest(ai-multi-provider · home-chat · ai-admin entity · work-agent · capability-routing) | 115 PASS |
| tsc api-server | WO 파일 오류 0(baseline 62 무관) · admin-dashboard 0 |
| eslint | 0 errors (경고 5건은 기존 코드) |
| CI · Deploy API · Deploy Admin Dashboard (`90cd03ea5`) | success → `o4o-core-api-03633-4wl` · `o4o-admin-dashboard-01261-zb9` |

## 4. Production 실측

| 항목 | 결과 |
|---|---|
| `GET /api/ai/models` | 200 · `source: google` · live 16 + 레거시 4 = 20 · `canonical/current = gemini-3.8-flash` |
| `GET /api/ai/policy` | `defaultModel: gemini-3.0-flash`(무효 값 그대로 — DB 는 손대지 않음) |
| `PUT /api/ai/policy` `gemini-3.0-flash` / `gpt-6-astra` / `gemini-9.9-nonexistent` | **400 INVALID_MODEL** ×3 (DB 미변경) |
| `POST /api/ai/home-chat` | 200 · `provider: gemini` · **`model: gemini-3.8-flash`** (정책값 무효 → canonical fallback) |
| admin UI `/settings/ai-query` | 드롭다운 21 항목(Google 목록 16 + 레거시 4 + "gemini-3.0-flash (현재 값 — 사용 불가)") · "목록 출처: Google 실시간 목록 · 지금 실제 사용 중: gemini-3.8-flash" · 콘솔 에러 0 |
| admin UI `/settings/app-services` | 모델 버전 `gemini-3.8-flash` · 최대 토큰 1,048,576 · 가격표 링크 |

## 5. 운영 안내

- 모델을 바꾸려면: admin-dashboard → 설정 → **AI Query** → 드롭다운에서 선택 → 저장. 즉시 적용(재배포 없음). 새 모델이 안 보이면 **새로고침** 버튼(Google 재조회).
- 현재 정책 DB 값은 무효 `gemini-3.0-flash` 라 fallback(3.8)이 쓰이고 있다. 드롭다운에서 `gemini-3.8-flash` 를 한 번 저장하면 정책값도 정리된다(동작은 동일). 이 저장은 사용자가 화면에서 한다 — 이번 WO 는 DB 를 쓰지 않았다.
- 3.x Flash 는 thinking 모델이라 `maxOutputTokens` 가 아주 작으면(수십 토큰) 본문이 비어 돌아온다. Home 채팅(2048)은 정상 실측. 짧은 문구 surface 는 필요 시 maxTokens 상향.

## 6. Limitations · 후속

1. 동적 목록은 **Gemini 만** — OpenAI 는 여전히 정적 whitelist(`AI_DEFAULT_MODEL_OPENAI`).
2. web-neture 관리자의 **AiEnginesPage(`ai_engines` 테이블)** 는 여전히 2.5 계열 seed 만 있다. 그 화면의 "활성화" 는 `default_model` 을 덮어쓰므로, 동적 목록으로 통일하려면 별도 WO(engine 등록부 폐기 또는 registry 연동).
3. `/settings/app-services` 의 API Key 입력·저장·사용 통계는 여전히 **mock** 이다(실제 키는 Cloud Run env). 카드 문구만 사실로 고쳤다 — 페이지 정리는 admin legacy 마감 트랙의 몫.
4. Google 목록에 alias(`gemini-flash-latest` 등)도 나온다. 선택은 가능하지만 대상이 예고 없이 바뀌므로 명시 id 권장(드롭다운 설명 없이 노출됨 — 필요 시 alias 필터링 후속).
