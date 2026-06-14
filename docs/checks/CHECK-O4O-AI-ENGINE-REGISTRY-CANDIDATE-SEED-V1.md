# CHECK-O4O-AI-ENGINE-REGISTRY-CANDIDATE-SEED-V1

> **작업명:** WO-O4O-AI-ENGINE-REGISTRY-CANDIDATE-SEED-V1
> **유형:** AiEnginesPage 엔진 seed/registry 를 Gemini 2.5 계열에 정렬 + 무효 id 정리 (runtime seed 코드 + migration)
> **결과: PASS** — runtime seed(`ai-admin.service.seedDefaultEngines`)에 `gemini-2.5-flash-lite` 추가, migration 으로 기존 prod 의 `ai_engines` 를 2.5 계열(flash/pro/flash-lite) idempotent upsert + 무효 `gemini-3.0-flash` 제거 + `is_active` 를 운영 모델(`ai_query_policy.default_model`)에 정합. **운영 모델(default_model) 미변경 → 편집 AI 동작 무영향**(registry 표시만 일치). api-server typecheck 0. package.json/pnpm-lock/Dockerfile 변경 없음.
> **선행:** `WO-O4O-AI-GEMINI-MODEL-UPGRADE-V1`(whitelist+드롭다운 2.5 정리) · `WO-O4O-AI-MODEL-SELECTION-RUNTIME-RESOLVER-V1`(resolver 배선)
> **작성일:** 2026-06-14 · 기준 HEAD `ebc71a6dd`

---

## 1. 목적

직전 WO 로 whitelist·admin 드롭다운(AiQuerySettings)은 2.5 계열로 정리됐으나, **AiEnginesPage(web-neture) 경로의 엔진 seed 는 구 상태**(`gemini-2.0-flash` active + 무효 `gemini-3.0-flash`)로 남아 있었다. 본 WO 는 엔진 registry 를 2.5 계열로 정렬하고 무효 id 를 정리한다. provider 확장 전 admin 설정 정돈.

## 2. 선행 Gemini upgrade 요약

- 편집 6개 endpoint → `resolveEditingModel()` → `AiQueryPolicy.defaultModel`(fallback `gemini-2.5-flash`).
- whitelist(`MODEL_WHITELIST.gemini`) + AiQuerySettings 드롭다운: `gemini-2.5-flash`/`pro`/`flash-lite` 선택 가능.
- **두 admin 경로:** (a) AiQuerySettings 드롭다운(`default_model` 직접) — 정리 완료 / (b) **AiEnginesPage activate(`default_model=engine.slug`) — 본 WO 대상**.

## 3. 현황 진단 (정리 전)

| seed 출처 | 내용 | 실행 조건 |
|-----------|------|-----------|
| migration `1737100700000` | `gemini-2.0-flash`(active) + `gemini-3.0-flash`(무효, inactive) | `count===0` (deploy 시 먼저 실행 → **prod 추정 상태**) |
| runtime `seedDefaultEngines` | `gemini-2.5-flash`(active) + `gemini-2.5-pro` (이미 canonical) | `count===0` (migration 이 먼저 채우면 미실행) |

→ prod 의 `ai_engines` 는 **구 migration seed(2.0-flash + 무효 3.0-flash)** 일 가능성이 높음. runtime seed 는 이미 2.5 지만 `count>0` 이라 미적용. **migration 으로 기존 row 교정 필요.**

## 4. 변경 파일

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/services/ai-admin.service.ts` | runtime seed `defaultEngines` 에 `gemini-2.5-flash-lite`(sortOrder 3) 추가 — **신규 설치 경로 정합** |
| `apps/api-server/src/database/migrations/20261111000000-AlignGeminiEngineRegistry.ts` | **신규 migration** — 기존 prod row 교정(upsert 2.5×3 / 무효 id 삭제 / active 정합 / 포인터 동기화) |
| `docs/checks/CHECK-...-V1.md` | 본 문서 |

**무변경:** `AiEngine` entity, AiEnginesPage(web-neture, getEngines 그대로 소비), `resolveEditingModel`/`ai-proxy`(편집 경로), `AiQueryPolicy.default_model`(**운영 모델 불변**), whitelist/드롭다운(직전 WO 완료), package.json/pnpm-lock, Dockerfile, 비-Gemini provider.

## 5. AiEngine seed/registry 변경 내용

**runtime seed(신규 설치):** flash(active) + pro + **flash-lite(신규)** → fresh DB 가 2.5 3종 보유.

**migration(기존 prod, idempotent):**
1. `gemini-2.5-flash`/`pro`/`flash-lite` **upsert**(`ON CONFLICT(slug) DO UPDATE`, is_available=true, sort 1/2/3).
2. legacy `gemini-2.0-flash` **보존**(sort_order=4 로 뒤로) — whitelist/드롭다운에 여전히 존재하므로 제거 안 함.
3. 무효 `gemini-3.0-flash` **DELETE**.
4. `is_active` 정합: 전부 false → `ai_query_policy.default_model`(engine 존재 시) 1개만 true, 없으면 `gemini-2.5-flash`.
5. `ai_query_policy.active_engine_id` 를 active engine id 로 동기화.

## 6. active / default 유지 여부 (안전성)

- **운영 모델 = `ai_query_policy.default_model` 불변.** 편집 AI 모델은 `resolveEditingModel()`이 `default_model` 로 결정하므로 **실제 AI 동작 무변경**.
- migration 의 `is_active` 정합은 **default_model 에 맞춰** 설정 → registry 표시가 실제 운영 모델과 일치(이전엔 engine=2.0-flash vs default_model=2.5-flash 불일치였음). admin 의 의도적 선택(default_model)이 있으면 그대로 honor, 없으면 gemini-2.5-flash.
- **production active 엔진을 무리하게 바꾸지 않음**(WO §4) — 모델 결정 소스(default_model)를 건드리지 않기 때문.

## 7. 무효 `gemini-3.0-flash` 처리

- Google API 미존재 id(WO-O4O-AI-MODEL-SETTINGS-CLEANUP-V1 에서 whitelist/runtime seed 는 이미 제거됨). 본 WO 가 **DB row 까지 DELETE** 로 정리 → AiEnginesPage 에서 무효 후보 사라짐.
- runtime seed 에는 이미 없음(재유입 없음). down() 은 best-effort 로 복원.

## 8. 후보 모델 정리 결과

AiEnginesPage(getEngines, sortOrder ASC) 노출 순서(정리 후): `gemini-2.5-flash`(1) · `gemini-2.5-pro`(2) · `gemini-2.5-flash-lite`(3) · `gemini-2.0-flash`(4, legacy). 무효 id 없음. whitelist·드롭다운·engine registry **3축 정합**.

## 9. 검증 결과

- **TypeScript:** `apps/api-server` `tsc --noEmit` **error 0**(신규 migration + service 포함).
- **정적:**
  - slug 정합: `gemini-2.5-flash-lite` 가 whitelist·AiQuerySettings·runtime seed·migration 에 일관. `gemini-3.0-flash` 는 cleanup 맥락(삭제)만 존재.
  - migration idempotent: upsert(ON CONFLICT) + DELETE/UPDATE(존재 여부 무관 안전). 재실행 안전.
  - `default_model`(운영 모델) 미변경 → 편집 AI 무회귀. `resolveEditingModel`/`ai-proxy` 무변경.
  - web-neture AiEnginesPage 코드 미변경(getEngines API 그대로 소비) → frontend 영향 없음.
- **무변경:** package.json/pnpm-lock, Dockerfile, whitelist/드롭다운(직전 WO), 비-Gemini.
- **migration 실행:** main 배포 시 CI/CD 자동 실행(직접 prod SQL 미실행 — CLAUDE.md §0). 배포 후 `migration:show` 로 `AlignGeminiEngineRegistry20261111000000` 적용 확인 권장.
- **런타임 smoke:** 미수행 — 배포·migration 후 AiEnginesPage 에 2.5 3종 노출 + 무효 id 부재 + active=default_model 일치 확인 권장.

## 10. 후속 작업

1. **`WO-O4O-AI-PROVIDER-ABSTRACTION-CALLPROVIDER-ALIGNMENT-V1`** — DeepSeek/Qwen 적용을 위한 `generateRawContent` gemini 고정 해제 + `callProvider`(OpenAI-compatible 재사용).
2. **`IR-O4O-AI-DATA-GOVERNANCE-FOR-CHINESE-PROVIDERS-V1`** — 중국계 provider 도입 전 리전/데이터 처리/도메인(약사회·의료) 검토.
3. **`IR-O4O-AI-EDITING-PROMPT-PRESET-STANDARD-V1`** — surface별 preset prompt/tone/length/output 표준(모델과 독립).

## 11. 완료 판정

**PASS.** AiEnginesPage 엔진 registry 를 Gemini 2.5 계열(flash/pro/flash-lite)로 정렬, 무효 `gemini-3.0-flash` 제거, `is_active` 를 운영 모델(`default_model`)에 정합. runtime seed(신규 설치) + migration(기존 prod) 양 경로 처리, **운영 모델 불변으로 편집 AI 무회귀**. whitelist·드롭다운·engine registry 3축 정합. api-server typecheck 0, DB 변경은 CI/CD migration, package/Dockerfile 무변경. provider 확장 전 admin 설정 정돈 완료 — 다음은 비-Gemini 트랙(provider abstraction) 또는 prompt preset 표준.
