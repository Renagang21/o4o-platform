# CHECK-O4O-AI-GEMINI-MODEL-UPGRADE-V1

> **작업명:** WO-O4O-AI-GEMINI-MODEL-UPGRADE-V1
> **유형:** 편집 AI Gemini 계열 모델 선택지 정리 (code-only, whitelist + admin 드롭다운)
> **결과: PASS** — `gemini-2.5-flash-lite` 를 `MODEL_WHITELIST.gemini` + admin 모델 드롭다운에 추가(저비용/짧은 문구 후보). `gemini-2.5-pro` 는 **이미 드롭다운+whitelist 에 존재 → 변경 없이 선택 가능** 확인. default `gemini-2.5-flash` 유지. provider 추가·abstraction·중국계 provider·prompt preset 미포함. api-server typecheck 0(신규 에러), admin-dashboard 신규 에러 0(잔존 4건은 `@o4o/cgm-pharmacist-app` 무관 사전 에러). DB/migration·package.json/pnpm-lock/Dockerfile 변경 없음.
> **선행:** `IR-O4O-AI-MODEL-CANDIDATE-COMPARISON-V1`(§8-1 Gemini 즉시 트랙) · `WO-O4O-AI-MODEL-SELECTION-RUNTIME-RESOLVER-V1`(resolver 배선)
> **작성일:** 2026-06-14 · 기준 HEAD `8fce6998b`

---

## 1. 목적

resolver 배선(admin 선택 → 편집 AI 도달) 위에서, **Gemini 계열 모델 선택지를 코드만으로 넓힌다.** 현행 default 를 깨지 않고 품질(Pro)·저비용(Flash-Lite) 선택지를 admin 에서 고를 수 있게 한다. 비-Gemini 는 범위 밖.

## 2. 선행 IR 요약

- 편집 6개 endpoint → `resolveEditingModel()` → `AiQueryPolicy.defaultModel` → fallback `gemini-2.5-flash`. resolver 는 `MODEL_WHITELIST.gemini` 로 검증.
- admin 에서 `defaultModel` 을 설정하는 경로 2개: **(a) AiQuerySettings 드롭다운**(admin-dashboard, `PUT /ai/policy` → `defaultModel` 직접) / (b) AiEnginesPage activate(web-neture, `defaultModel = engine.slug`).
- Gemini 계열은 whitelist/드롭다운 정리만으로 즉시 적용 가능(IR §6-A). 비-Gemini 는 provider abstraction 선행(IR §6-B).

## 3. Gemini 후보 모델 (확정 id)

| 모델 | API id(확인) | 용도 | $/1M (in/out) |
|------|--------------|------|---------------|
| Gemini 2.5 Flash | `gemini-2.5-flash` | **기본 운영(유지)** | $0.30 / $2.50 |
| Gemini 2.5 Pro | `gemini-2.5-pro` | 품질 우선(긴 글) | $1.25 / $10 |
| Gemini 2.5 Flash-Lite | `gemini-2.5-flash-lite` | 저비용/짧은 문구(POP/QR) | $0.10 / $0.40 |

- `gemini-2.5-flash-lite` 공식 id 확인: [ai.google.dev .../gemini-2.5-flash-lite](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite) (1M ctx / 65,536 out). 과거 `gemini-3.0-flash`(무효 id) 재발 방지 위해 공식 문서로 검증.
- preview 모델(Gemini 3.x)은 이번 WO 미포함(WO §4).

## 4. 변경 파일

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/types/ai-proxy.types.ts` | `MODEL_WHITELIST.gemini` 에 `gemini-2.5-flash-lite` 추가(2.5-pro 뒤) |
| `apps/admin-dashboard/src/pages/settings/AiQuerySettings.tsx` | 모델 드롭다운에 `gemini-2.5-flash-lite` option 추가(Flash 다음) |
| `docs/checks/CHECK-...-V1.md` | 본 문서 |

**무변경:** `resolveEditingModel`(이미 whitelist 검증 — flash-lite 자동 통과), `ai-proxy.routes/service`(generateRawContent gemini 유지), `AiQueryPolicy`/`AiEngine` entity, **AiEngine seed migration**(DB — §6), backend 그 외, DB/migration, package.json/pnpm-lock, Dockerfile, frontend(AiContentModal), 비-Gemini provider.

## 5. whitelist / 드롭다운 정리 결과

- **whitelist(`MODEL_WHITELIST.gemini`):** `gemini-2.5-flash` · `gemini-2.5-pro` · **`gemini-2.5-flash-lite`(신규)** · `gemini-2.0-flash` · `gemini-2.0-flash-lite` · `gemini-1.5-flash` · `gemini-1.5-pro`. → `resolveEditingModel()` 이 세 2.5 모델 모두 통과.
- **AiQuerySettings 드롭다운:** Flash → **Flash-Lite(신규)** → Pro → 2.0-flash → 1.5-flash → 1.5-pro. admin 이 세 2.5 모델을 직접 선택 가능.
- **Gemini 2.5 Pro 결과:** 드롭다운·whitelist 에 **이미 존재** → 코드 변경 없이 admin 에서 선택 시 `defaultModel=gemini-2.5-pro` → 편집 AI 가 Pro 사용. **즉시 전환 가능(확인됨).**

## 6. admin engine registry/seed 정리 결과 (현황 + 보류)

- `AiEngine` seed(migration `1737100700000`)는 **`gemini-2.0-flash`(active) + `gemini-3.0-flash`(무효 id, inactive)** 만 등록 → AiEnginesPage 경로는 2.5 계열 미노출, 잔여 무효 id 존재.
- **본 WO 는 DB/migration 제외** → engine seed 수정 안 함. 즉시 트랙(코드)으로는 **AiQuerySettings 드롭다운**이 2.5 계열 선택 경로를 제공(충분).
- AiEnginesPage 에 2.5-flash/pro/flash-lite 엔진 등록 + 무효 `gemini-3.0-flash` 정리는 **`WO-O4O-AI-ENGINE-REGISTRY-CANDIDATE-SEED-V1`(후속, DB seed)** 로 분리.

## 7. default 유지 여부

- **default = `gemini-2.5-flash` 유지**(AiQuerySettings 기본값·resolver fallback·정책 기본값 모두 불변). Pro/Flash-Lite 는 admin 이 **선택할 때만** 적용. 무리한 기본값 변경 없음(WO §4).

## 8. 제외한 영역

- 비-Gemini provider(DeepSeek/Qwen/Kimi), provider abstraction, `callProvider`/`generateRawContent` gemini 고정 해제.
- AiEngine seed/registry DB 변경(무효 id 정리 포함), 중국계 provider 데이터 거버넌스, prompt preset 표준, AiContentModal, 비용 최적화, DB/migration.

## 9. 검증 결과

- **TypeScript:** `apps/api-server` `tsc --noEmit` **error 0**. `apps/admin-dashboard` **신규 error 0**(잔존 4건은 `src/routes/apps.routes.tsx` 의 `@o4o/cgm-pharmacist-app` 모듈 미해결 — 타 영역 사전 에러, 본 변경 무관).
- **정적:**
  - `MODEL_WHITELIST.gemini` 에 `gemini-2.5-flash-lite` 포함 → `resolveEditingModel` 통과.
  - 드롭다운에 flash-lite option 추가, pro 기존 유지.
  - default `gemini-2.5-flash` 불변. resolver/admin activate(`AiQueryPolicy.defaultModel`) 흐름 유지.
  - 비-Gemini 작업 미혼입(provider/abstraction 무변경).
- **무변경:** DB/migration, package.json/pnpm-lock, Dockerfile, AiEngine seed.
- **런타임 smoke:** 미수행 — 배포 후 admin AiQuerySettings 에서 `gemini-2.5-pro`/`gemini-2.5-flash-lite` 선택 → 편집 AI(POP/블로그) 응답 로그 `model` 일치 확인 권장.

## 10. 후속 작업

1. **`WO-O4O-AI-PROVIDER-ABSTRACTION-CALLPROVIDER-ALIGNMENT-V1`** — DeepSeek/Qwen 적용을 위한 `generateRawContent` gemini 고정 해제 + `callProvider`(OpenAI-compatible 재사용).
2. **`IR-O4O-AI-DATA-GOVERNANCE-FOR-CHINESE-PROVIDERS-V1`** — 중국계 provider 도입 전 리전/데이터 처리/도메인(약사회·의료) 검토.
3. **`WO-O4O-AI-ENGINE-REGISTRY-CANDIDATE-SEED-V1`** — AiEnginesPage 후보 엔진 seed(2.5 계열 등록 + 무효 `gemini-3.0-flash` 정리, DB seed).
4. **`IR-O4O-AI-EDITING-PROMPT-PRESET-STANDARD-V1`** — surface별 preset prompt/tone/length/output 표준(모델과 독립).

## 11. 완료 판정

**PASS.** Gemini 계열 편집 모델 선택지를 코드만으로 정리 — `gemini-2.5-flash-lite`(공식 id 확인) whitelist+드롭다운 추가, `gemini-2.5-pro` 기존 선택 가능 확인, default `gemini-2.5-flash` 유지. resolver/정책 흐름 무회귀, 비-Gemini·provider abstraction·DB seed 는 후속 분리. api-server typecheck 0, 본 변경 신규 에러 0, DB/package/Dockerfile 무변경. **현 Gemini 운영을 깨지 않고 품질(Pro)·저비용(Flash-Lite) 선택지를 admin 에 노출.**
