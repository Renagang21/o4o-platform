# CHECK-O4O-AUTOMATION-TTS-NARROW-ENDPOINT-V1 — 영상 제작용 TTS narrow endpoint · EP01 CUT1 A/B smoke

> **WO**: `WO-O4O-AUTOMATION-TTS-NARROW-ENDPOINT-V1` (사용자 지시 2026-09-15, 채팅) — 기존 O4O 서버의 OpenAI/Gemini key 를 재사용하는 얇은 TTS endpoint. 프로덕션 key 를 로컬로 반입하지 않는다.
> **상태**: **CLOSED_WITH_PARTIAL_SMOKE** — endpoint 배포·동작 PASS · Gemini CUT1 생성 PASS · OpenAI CUT1 은 provider 측 크레딧 소진(`insufficient_quota`)으로 FAIL → **사용자 판단 대기(OpenAI 결제 or Gemini 단독 채택)**
> **선행/관련**: [O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1](../baseline/O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1.md) §2 (TTS = O4O Assembly 축의 제작 실행 기능) · [CHECK-…-EP01-GENERATION-V1](CHECK-O4O-MINEROCK600-EP01-GENERATION-V1.md) · [EP01-GENERATION-RUNBOOK-V1](../media-pilot/minerock600/EP01-GENERATION-RUNBOOK-V1.md)
> **Git**: `3307ba86a` (origin/main) · 배포 run `34921585987` build-and-deploy success

---

## 1. 원칙 준수

| 원칙 | 결과 |
|---|---|
| 프로덕션 API key 로컬 복사·출력 금지 | ✅ 서버가 `resolveAiApiKey(ds, provider)` 로 해석. 로컬 스크립트는 O4O endpoint 만 호출. 응답 헤더·본문·로그·본 문서에 key 없음 |
| `@o4o/ai-core` text model registry 무변경 | ✅ 접촉 없음 |
| `ai-model-registry` `-tts` 제외 정책 유지 | ✅ 무변경 |
| 범용 AI proxy 아님 | ✅ provider·model 서버 allowlist 고정. 클라이언트는 `provider` 키만 선택, model/endpoint 전달 불가(무시) |
| DB migration · 저장 · Media Library · Job attachment 없음 | ✅ audio 바이너리만 반환 |
| CUT2/3 생성 금지 | ✅ CUT1 만 |

## 2. 구현

| 파일 | 내용 |
|---|---|
| [`tts-narration.service.ts`](../../apps/api-server/src/modules/automation/services/tts-narration.service.ts) | `TTS_PROVIDERS` allowlist (`openai → gpt-4o-mini-tts` / `gemini → gemini-3.1-flash-tts-preview`) · `validateTtsRequest` (text ≤ 2000 · style ≤ 500 · voice `^[A-Za-z0-9_-]{1,40}$` · format per provider) · OpenAI `/v1/audio/speech` Bearer · Gemini `generateContent` **헤더 `x-goog-api-key`**(URL `?key=` 미사용) · Gemini PCM(L16 24kHz mono) → WAV 래핑 · provider 오류는 status 만 응답, 본문은 서버 로그 300자 |
| [`tts-narration.controller.ts`](../../apps/api-server/src/modules/automation/controllers/tts-narration.controller.ts) | `POST /automation/tts` · guard `[authenticate, requireMediaPlatformAdmin]` (VIDEO Job 과 동일) · 응답 `audio/mpeg|audio/wav` + `X-Tts-Provider/Model/Voice/Format` · `Cache-Control: private, no-store` |
| [`register-routes.ts`](../../apps/api-server/src/bootstrap/register-routes.ts) 29d-7 | `/api/v1/platform` 에 mount |
| [`automation-tts-narration.spec.ts`](../../apps/api-server/src/__tests__/automation-tts-narration.spec.ts) | jest 10/10 PASS (allowlist·prototype 키 차단·검증·503 미설정·OpenAI 요청형·Gemini 헤더/WAV·no-audio·401/429/네트워크 → 502) |
| [`tts_ab_cut1.py`](../../scripts/media/minerock600-pilot/ep01/tts_ab_cut1.py) | 로컬 smoke 클라이언트 — 자격은 `docs/local/TEST-ACCOUNTS.local.md` 에서만 · token 미출력 · `[CUT1]` 추출 · ffprobe duration · Gemini wav → 청취용 mp3 사본(ffmpeg, 원본 보존) |

오류 코드: `TTS_INVALID_PROVIDER / TTS_TEXT_REQUIRED / TTS_TEXT_TOO_LONG / TTS_INVALID_FORMAT / TTS_INVALID_VOICE / TTS_INVALID_STYLE / TTS_STYLE_TOO_LONG`(400) · `TTS_PROVIDER_NOT_CONFIGURED`(503) · `TTS_PROVIDER_RATE_LIMITED / TTS_PROVIDER_FAILED / TTS_PROVIDER_UNREACHABLE / TTS_PROVIDER_NO_AUDIO`(502).

검증: `npx tsc --noEmit` 오류 0 · jest 10/10 · 배포 후 서버 로그 `✅ TTS narration route registered at /api/v1/platform/automation/tts`.

## 3. CUT1 production smoke (2026-09-15 11:42 KST)

입력: `narration-ko.txt` `[CUT1]` 2문장("미네락 육백은, 어떤 물일까요? / 약국에서 자주 받는 질문이라, 오늘은 이 한 병을 기준으로 설명드릴게요.") · style "30~40대 한국 여성 약사 … 차분하고 신뢰감 … 과장 없이 · 자연스러운 속도 · '미네락 육백' 또박또박" · 속도 변경·후처리 없음.

| 항목 | OpenAI | Gemini |
|---|---|---|
| model | `gpt-4o-mini-tts` | `gemini-3.1-flash-tts-preview` |
| voice | `nova` | `Kore` |
| output format | mp3 (요청) | wav (pcm_s16le 24kHz mono) + mp3 청취본 |
| HTTP status (O4O) | **502** `TTS_PROVIDER_RATE_LIMITED` (2회, 11:42 · 11:43) | **200** |
| 실제 provider 호출 | 호출됨 → OpenAI **429 `insufficient_quota` / `credit_balance_exhausted`** (서버 로그) | 성공 |
| duration | — | **8.88s** |
| 파일 | 미생성 | `C:\tmp\minerock600-pilot\ep01\narration-test\cut1-gemini.wav` (426,284 B) · `cut1-gemini.mp3` (84,548 B) |

- OpenAI 실패는 endpoint 결함이 아니라 **OpenAI 조직 크레딧 소진**(provider 응답 그대로). 충전은 외부 서비스 결제 = 사용자 판단 → 중지 조건.
- Gemini 경로는 key 해석 → 호출 → PCM → WAV → 클라이언트 저장까지 end-to-end PASS.

## 4. 하지 않은 것 · 남은 것

- OpenAI A 안 청취 불가(크레딧). 사용자 선택지: ① OpenAI 크레딧 충전 후 `python tts_ab_cut1.py --only openai` 재실행 → A/B 청취 · ② Gemini 단독 채택(12편 동일 provider 원칙).
- CUT2/3 · `narration/ep01-cut{1,2,3}.mp3` · `--measure` 는 provider 채택 지시 후.
- Gemini voice 는 `Kore` 1종만 시도. 다른 prebuilt voice 비교는 미실행(지시 없음).
- TTS provider 얇은 추상화(`TTS provider = openai|gemini`)는 만들지 않음(지시).

## 5. 문서 정합

`문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건` — 발견: [EP01-GENERATION-RUNBOOK-V1](../media-pilot/minerock600/EP01-GENERATION-RUNBOOK-V1.md) §1 · 제목 · 상단 제작 스택이 ElevenLabs 를 내레이션 도구로 기술(사용자 결정 2026-09-15: ElevenLabs 제외, O4O TTS endpoint 로 대체). `docs/media-pilot/` 는 §16-1 기준 문서 범위 밖이므로 보고만.
