# CHECK-O4O-DRUG-IMAGE-IDENTIFICATION-V0-ROLLBACK

> **WO**: `WO-O4O-DRUG-IMAGE-IDENTIFICATION-V0` — 작업 전 상태 원복 (decision record)
> **상태**: 원복 완료 · 회귀 PASS
> **작성일**: 2026-09-12
> **상위 원칙**: [`O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1`](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md) §18 (멀티모달 입력 원칙) · §14 (업무 사전 정의 금지)

---

## 1. 중단 이유

진행 중이던 설계는 `알약 이미지 → Vision 으로 frontMark/backMark/color/shape 추출 → pill_identification 입력 구조 → health.kr 검색`
이었다. 즉 **약품 전용 Vision feature extractor 를 canonical 구조로** 세우는 방향이었다.

확정된 O4O 방향은 `사용자 Goal → 실제 화면 관찰 → 현재 업무에 필요한 입력 파악 → 이미지/텍스트/파일에서 필요한 정보만 동적으로 추출
→ 사이트 조작 → 결과 화면 인계` 다(원칙 §18: "입력을 먼저 완벽히 구조화" 보다 "업무 목적 + 현재 화면 → 필요한 정보 결정" 우선).
알약 이미지는 이 범용 구조의 첫 사례일 뿐, 별도 약품 Vision 파이프라인으로 만들지 않는다. 따라서 중단하고 원복한다.

## 2. 원복 전 상태

- branch `main`, HEAD `c9f85bdba`(다른 세션의 media V2 문서 커밋) == `origin/main`.
- 해당 WO 변경은 **한 번도 commit/push 되지 않았다.** 전부 작업 트리의 미커밋 변경이었다.
- `git status`: 수정 6 · 신규 4 — hunk 단위로 확인해 **전부 이 WO 의 변경**(다른 세션 hunk 혼입 0). 다른 세션의 media WIP 는 그 세션이 이미 커밋해 트리에 없었다.

## 3. 원복 대상 (10 파일)

| 구분 | 파일 | 방식 |
|---|---|---|
| 수정 → 원복 | `apps/api-server/src/routes/ai-proxy.routes.ts` (`/drug-image/extract` · `/drug-image/search` 라우트 +152) | `git restore -- <path>` |
| 수정 → 원복 | `apps/api-server/src/utils/ai-provider-runtime.ts` (`PROVIDER_CAPABILITIES` · `providerSupports` · `resolveVisionProvider` — 이 WO 가 새로 넣은 vision capability) | `git restore` |
| 수정 → 원복 | `apps/api-server/src/services/local-agent/pharmacy-web-core.ts` (usage event `inputMode`) | `git restore` |
| 수정 → 원복 | `apps/api-server/src/services/ai-tools/pharmacy-web-executor.ts` (`options.inputMode`) | `git restore` |
| 수정 → 원복 | `apps/api-server/src/__tests__/pharmacy-web-core.spec.ts` (`inputMode` 기대값) | `git restore` |
| 수정 → 원복 | `services/web-neture/src/pages/O4OHomePage.tsx` (붙여넣기 · 사진 버튼 · 패널 연결) | `git restore` |
| 신규 → 삭제 | `apps/api-server/src/services/ai-tools/drug-image-identification-contract.ts` (PillVisualFeatures · 어휘 정규화 · EntryPoint 매핑 · DRUG_IMAGE_* 오류) | 파일 삭제 |
| 신규 → 삭제 | `apps/api-server/src/services/ai-tools/drug-image-identification.service.ts` (sharp 준비 · gemini inline_data 호출) | 파일 삭제 |
| 신규 → 삭제 | `services/web-neture/src/lib/ai/drug-image.ts` | 파일 삭제 |
| 신규 → 삭제 | `services/web-neture/src/components/home/DrugImageIdentifyPanel.tsx` | 파일 삭제 |

`git reset --hard` · `git checkout .` · `git clean` · force push 는 쓰지 않았다. 전용 테스트 · CHECK 문서는 아직 만들지 않은 상태였다(삭제 대상 0).

## 4. 유지 대상 (손대지 않음)

- `WO-O4O-BROWSER-DOM-CONTROL-V0` · `WO-O4O-SUPPLIER-SITE-ADAPTER-V0` · `WO-O4O-PHARMACY-WEB-AUTOMATION-CORE-AND-HEALTHKR-ADAPTER-V0` 의 커밋 전부
  (`pharmacy-web-core.ts` · `healthkr-adapter.ts` · `browser-dom-executor.ts` · health.kr site 3 사본 · EntryPoint 4 · content-script 의 form 제출 응답/중첩 표 결함 수정).
- 기존 공통 Vision 경로 `POST /api/ai/vision/analyze`(gemini inline_data) — 이 WO 이전부터 존재, 미변경.
- `sharp` 의존 — 이 WO 이전부터 api-server 의존. `package.json`/lockfile 변경 0.
- 원칙 문서 `O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1`(`5ce930426`) — 유지.

## 5. DB / secret / env 영향

| 항목 | 결과 |
|---|---|
| cloud/local migration · 신규 테이블/컬럼 | **0** (migrations 디렉터리 마지막 커밋은 다른 세션의 media V2) |
| secret · env var · provider config | **0** — 새 secret 없음(`gcloud secrets list` 에 drug/vision/pill 없음), env 변경 없음, 기존 `GEMINI_API_KEY` 경로만 참조했었음 |
| Chrome extension · native host | **0** — manifest · content-script · host 는 이 WO 에서 미변경(health.kr 권한은 이전 WO 것으로 유지) |

## 6. 원복 후 검증

| 게이트 | 결과 |
|---|---|
| `git status --short` · `git diff --stat` | 0 / 0 (트리 clean, HEAD == origin/main) |
| HEAD 내 `drug-image-identification` · `DrugImageIdentifyPanel` · `PillVisualFeatures` 참조 | 0 |
| tsc(api-server · web-neture) | 관련 파일 오류 0 |
| api-server jest — pharmacy-web-core · healthkr-adapter · supplier-site-adapter · browser-dom-control · browser-bridge · automation-execution-layer · ai-capability-tool-routing · computer-use | **8 스위트 164 PASS** |
| agent node:test (browser-dom · native-bridge · local-db) | **59 PASS** |
| extension · agent · migrations vs HEAD | 변경 없음 |

## 7. 최종 상태

```text
WO-O4O-DRUG-IMAGE-IDENTIFICATION-V0 = STOPPED
DRUG-SPECIFIC IMAGE ARCHITECTURE    = RETIRED
PRE-WO FUNCTIONAL BASELINE          = RESTORED

DRUG IMAGE V0 CHANGES          = 0
PILL-SPECIFIC VISION CONTRACT  = 0
OTHER WO CHANGES LOST          = 0
PHARMACY WEB CORE              = PASS
HEALTHKR ADAPTER               = PASS
BROWSER DOM                    = PASS
CHROME BRIDGE                  = PASS
DB UNINTENDED CHANGE           = 0
SECRET UNINTENDED CHANGE       = 0
```

## 8. 후속 방향

```text
User Goal → Current UI Observation → Dynamic Planning → Multimodal Input Interpretation
→ Browser DOM / UIA → Result Observation → User Takeover → Workflow Learning
```

이미지 · 텍스트 · 파일은 "현재 화면이 요구하는 입력" 을 기준으로 필요한 부분만 추출한다. 재사용 가능한 것: 기존 공통 Vision 경로,
Pharmacy Web Core 의 EntryPoint/Adapter, 원칙 문서 §25 의 정렬 상태 표(usage event 확장 · AI 판단 층 · 결과 화면 인계 UX).

---

*문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건*
