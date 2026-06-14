# CHECK-O4O-AI-PROVIDER-GUARDRAIL-CONFIG-V1

> **작업명:** WO-O4O-AI-PROVIDER-GUARDRAIL-CONFIG-V1
> **유형:** 비-Gemini provider 도입 전 provider×surface 안전장치 정책 SSOT 추가 (@o4o/types, config-only)
> **결과: PASS** — `@o4o/types` 에 `AiProviderKey`(gemini/qwen/deepseek) + `SURFACE_RISK`(EditingSurface 재사용) + `AI_PROVIDER_GUARDRAILS`(provider별 allowedSurface/opt-in/region/warning) + `HIGH_RISK_DATA_TYPES` + `PROVIDER_WARNINGS` + 헬퍼(`isProviderAllowedForSurface`/`getProviderGuardrail`) 추가. **Gemini default·전 surface / Qwen admin opt-in·저위험(pop/qr/blog)만 / DeepSeek 1st-party 기본 금지(allowedSurfaces 비움)**. 실제 provider 호출·abstraction·UI **미수행**(정책만). `@o4o/types` typecheck 0. backend/모델/DB·migration/package.json/Dockerfile 변경 없음.
> **선행:** `IR-O4O-AI-DATA-GOVERNANCE-FOR-CHINESE-PROVIDERS-V1`(§9 guardrail 선결)
> **작성일:** 2026-06-14 · 기준 HEAD `34d5428a6`

---

## 1. 목적

거버넌스 IR 결론("조건부 가능 + guardrail 선결")에 따라, **비-Gemini 를 열기 전 문을 좁히는** 정책을 코드(SSOT)로 고정한다. provider abstraction 의 **선결 작업** — 실제 Qwen/DeepSeek 호출 개통은 안 함.

## 2. 선행 거버넌스 IR 요약

- Gemini = 민감 도메인 기본값. Qwen(Singapore, no-train) = 제한적 가능(admin opt-in·저위험 surface). DeepSeek 1st-party(중국 저장·학습 사용) = 기본 금지. provider abstraction 은 guardrail 없이 착수 금지.

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `packages/types/src/ai-provider-guardrail.ts` | **신규** — guardrail 정책 타입/registry/헬퍼/경고 copy |
| `packages/types/src/index.ts` | `export * from './ai-provider-guardrail.js'`(main barrel — 신규 subpath 없음 → package.json 무변경) |
| `docs/checks/CHECK-...-V1.md` | 본 문서 |

**무변경:** backend(`ai-proxy`·`generateRawContent` — abstraction 미수행), 모델/provider 호출, admin/service UI(경고 copy 는 config 로 준비, UI 배선은 후속), `EditingPreset`·`ProductionTemplate`, DB/migration, package.json/pnpm-lock, Dockerfile. `@o4o/types` dist gitignored(CI 재빌드 — 로컬 `pnpm --filter @o4o/types build` 로 검증).

## 4. provider guardrail 구조

```ts
type AiProviderKey = 'gemini' | 'qwen' | 'deepseek';   // 편집 AI provider 정책 축(≠ backend AIProvider transport)
type AiSurfaceRisk = 'low' | 'medium' | 'high';
SURFACE_RISK: Record<EditingSurface, AiSurfaceRisk>     // EditingSurface 재사용(중복 타입 없음)
interface AiProviderGuardrail { defaultAllowed; requiresAdminOptIn; allowedSurfaces: EditingSurface[]; sensitiveDefault?; region?; warningRequired?; note? }
AI_PROVIDER_GUARDRAILS: Record<AiProviderKey, AiProviderGuardrail>
HIGH_RISK_DATA_TYPES: readonly string[]                 // 모든 외부 provider 전송 금지 원칙(SSOT)
PROVIDER_WARNINGS: Partial<Record<AiProviderKey, string>>  // admin UI 경고 copy(후속 소비)
isProviderAllowedForSurface(provider, surface): boolean
getProviderGuardrail(provider): AiProviderGuardrail | undefined
```

## 5. surface risk mapping (IR §7 기준, 보수적)

| surface | risk |
|---------|:---:|
| pop / qr / blog | low |
| product-description / library-entry / resource / lms-lesson | medium |

→ 편집 surface 에 high 없음(high 는 데이터 등급 = `HIGH_RISK_DATA_TYPES`). `course-structure`/`signage`/`admin-builder` 는 EditingSurface 밖(별도 파이프라인 — guardrail 범위 외, closure 결정).

## 6. Gemini default 확인

- `gemini`: `defaultAllowed:true`, `requiresAdminOptIn:false`, `allowedSurfaces`=전 편집 surface, `sensitiveDefault:true`. **기존 Gemini 동작 불변**(본 WO 는 정책 정의만, 호출 경로 미변경).

## 7. Qwen 제한적 허용 기준

- `qwen`: `defaultAllowed:false`, `requiresAdminOptIn:true`, `allowedSurfaces:['pop','qr','blog']`(**1차 저위험만**), `region:'singapore'`, `warningRequired:true`.
- medium surface(product-description/resource/lms-lesson)는 **미허용** — `IR-...-PROVIDER-SURFACE-RISK-MATRIX-V1` 후 확장(§11-2).

## 8. DeepSeek 1st-party 보류 기준

- `deepseek`: `defaultAllowed:false`, `allowedSurfaces:[]`(**기본 금지**), `region:'china'`, `warningRequired:true`, note=데이터 거버넌스 위험. open-weight 서방 no-train 호스트 경로는 별도 재평가(본 정책 밖).

## 9. 고위험 데이터 금지 원칙

- `HIGH_RISK_DATA_TYPES`(환자/처방/PII/약국 매출·거래/비공개 계약·정산/민감 협회 문서) = **모든 외부 provider(Gemini 포함) 전송 금지**. 본 WO 는 DLP 미구현, 원칙만 SSOT 고정(후속 enforcement 참조).

## 10. admin 경고 반영 여부 / provider abstraction 미수행 확인

- **admin 경고:** `PROVIDER_WARNINGS` 에 copy 준비. **UI 배선은 후속**(현재 비-Gemini 선택 UI 자체가 없어 부착 지점 없음 — abstraction WO + UI 에서 소비). WO §4.4 "UI 범위 크면 코드 변경 말고 후속 분리" 준수.
- **provider abstraction 미수행:** `generateRawContent` provider='gemini' 고정 **그대로**, Qwen/DeepSeek 실제 호출 코드 **없음**, API key 미등록, production provider 전환 0. 본 WO = 정책 SSOT 만.

## 11. 검증 결과

- **TypeScript:** `@o4o/types` `tsc --build` **error 0**(신규 guardrail 포함, dist 재빌드 확인). 소비처 없음(정책만) → 서비스 typecheck 불요.
- **정적:**
  - Gemini = default provider 유지(`defaultAllowed:true`, 호출 경로 미변경).
  - Qwen = admin opt-in + 저위험 surface(pop/qr/blog)만 정의.
  - DeepSeek 1st-party = `allowedSurfaces:[]`(기본 금지).
  - `HIGH_RISK_DATA_TYPES` 금지 원칙 문서화.
  - provider abstraction 코드 미혼입(`generateRawContent`/`callProvider` 미변경). 실제 호출 provider 변경 0.
- **무변경:** backend, DB/migration, package.json/pnpm-lock, Dockerfile.

## 12. 후속 작업

1. **`WO-O4O-AI-PROVIDER-ABSTRACTION-CALLPROVIDER-ALIGNMENT-V1`** — guardrail 전제로 `generateRawContent` gemini 고정 해제 + `callProvider` 수렴 + `isProviderAllowedForSurface` enforcement + `PROVIDER_WARNINGS` UI 배선. 1차 = Qwen(Singapore) × 저위험 surface.
2. **`IR-O4O-AI-PROVIDER-SURFACE-RISK-MATRIX-V1`** — medium surface(product-description/resource/lms-lesson) Qwen 확장 전 세부 매트릭스.
3. **`WO-O4O-AI-QWEN-SINGAPORE-LOW-RISK-SURFACE-EXPERIMENT-V1`** — Qwen Singapore 를 pop/qr/blog 제한 실험.
4. **`KEEP-O4O-AI-DEEPSEEK-FIRSTPARTY-BLOCKED-V1`** — DeepSeek 1st-party 기본 금지 원칙 유지(본 guardrail `allowedSurfaces:[]` 로 코드 반영됨 — 별도 문서는 필요 시).

## 13. 완료 판정

**PASS.** 비-Gemini provider 도입 전 provider×surface guardrail 정책을 `@o4o/types` SSOT 로 고정 — **Gemini default·전 surface / Qwen admin opt-in·저위험만 / DeepSeek 1st-party 기본 금지 / 고위험 데이터 전송 금지 원칙**. 실제 호출·abstraction·UI 미수행(정책만), `@o4o/types` typecheck 0, backend/모델/DB/package/Dockerfile 무변경. **문을 열기 전 좁히는 작업 완료** — 다음은 guardrail 을 전제로 한 provider abstraction WO.
