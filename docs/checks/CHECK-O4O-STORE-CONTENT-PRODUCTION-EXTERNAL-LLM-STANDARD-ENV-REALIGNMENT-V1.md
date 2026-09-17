# CHECK-O4O-STORE-CONTENT-PRODUCTION-EXTERNAL-LLM-STANDARD-ENV-REALIGNMENT-V1

> **WO**: `WO-O4O-STORE-CONTENT-PRODUCTION-EXTERNAL-LLM-STANDARD-ENV-REALIGNMENT-V1` · **일자**: 2026-09-14 · **성격**: AUDIT + BASELINE/DOCUMENT REALIGNMENT (기능 개발 없음)
> **상태**: **PASS — ACTIVE_CODE_CONTRADICTION = 0 · 잔존 제작형 AI entry 1건(PARTIAL, 후속 WO 판정) · 문서 정합 완료**
> **IR**: [IR-O4O-STORE-CONTENT-PRODUCTION-EXTERNAL-LLM-STANDARD-ENV-AUDIT-V1](../investigations/IR-O4O-STORE-CONTENT-PRODUCTION-EXTERNAL-LLM-STANDARD-ENV-AUDIT-V1.md) · **신규 baseline**: [O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1](../baseline/O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1.md)
> **시작 기준**: `origin/main` = `2464f2494`

---

## 1. 판정 표 (WO §11 · 12축)

| 축 | 판정 | 근거 (IR 절) |
|---|---|---|
| EXTERNAL_LLM_CREATIVE_STRATEGY | **PASS** | O4O 코드 어디에도 외부 LLM 결과 반입을 막거나 O4O AI 를 필수 관문으로 강제하는 곳 없음. 편집기 HTML 탭 raw 보존 · Guide 모달 · `LlmAssistPanel` 모두 "사용자 자신의 LLM → 가져오기" 방향 (IR §1·§2) |
| CONTENT_CREATION_GUIDE | **PARTIAL** | `ContentCreationGuideModal` 은 원칙과 동일 방향(3단계 · Brief 축 포함)이나 **KPA 전용 파일**, 소비처 5 모두 KPA. KCos/PharmacyHub 매장 화면은 안내 부재 (IR §2 · 후속 8-2) |
| LLM_HANDOFF_SUPPORT | **PARTIAL** | `LlmAssistPanel`(`@o4o/content-editor`) 은 "LLM API 호출/계정 연동/대화 저장 없음" 을 명시한 순수 handoff 도구 — 설계 PASS. 채택은 태블릿 코너 편집기 1곳뿐 (IR §2 · 후속 8-1) |
| PRODUCTION_ENTRY_CORE | **PASS** | `StartProductionModal`(store-ui-core): 콘텐츠 선택 → 제작 대상(POP/QR/Blog/상품설명) → 템플릿 → route. AI 관문 없음. `onAiAction` 은 전 소비처 미전달 = DORMANT(삭제 안 함, 주석만 정정) (IR §3) |
| EDITOR_ASSIST | **PASS** | Toolbar `AI 정리`(`AiContentModal` → `/api/ai/content`) 는 선택 보조. 편집기 흐름에서 건너뛰어도 저장·실행 가능. KEEP (IR §3·§4) |
| MEDIA_LIBRARY | **PASS** | `MediaAsset` 의 `usageType/derivationType/originType/generationProvider(string, provider 비고정)/qaStatus/productAccuracyLevel/rightsType` 이 재사용·출처·검수 축을 이미 표현. 관리 화면 `/content-resource/media-assets` (IR §5) |
| VIDEO_JOB | **PASS** | `AutomationJob` VIDEO: DRAFT/IN_PROGRESS/WAITING/COMPLETED/CANCELLED · `cleanupDecision`(KEEP_ALL/KEEP_OUTPUTS/KEEP_SELECTED/DECIDE_LATER) 별개 축 · admin workspace CHECK 존재 (IR §5) |
| TEMP_OUTPUT | **PASS** | `temp_output_*` 컬럼 + `VIDEO_TEMP_OUTPUT_TTL_HOURS`(기본 48h) + in-app 만료 job + AVAILABLE/EXPIRED/DELETE_FAILED. "완성본은 항상 임시 TTL" 주석과 원칙 §7 일치 (IR §5) |
| INTERNAL_AI_BOUNDARY | **PARTIAL** | 이전 4 WO 로 페이지형 제작 AI 는 제거됨(CHECK 4종 확인). **잔존 1건**: KPA "AI 설명 QR 만들기"(`/store/marketing/qr/ai-description` → `/api/ai/qr-description`, Gemini, 설명 HTML 전체 생성). 필수 관문 아님·외부 LLM 반입 차단 없음 → 충돌 아님. 처분은 후속 8-4(**필수, 판정만**) (IR §4) |
| PROVIDER_NEUTRALITY | **PASS** | 사용자 외부 AI 는 플랫폼 밖(코드 접점 0). 영상 생성 provider 는 `generationProvider` 문자열로만 기록, 특정 provider 를 canonical 로 박은 코드 없음. Guide 문구는 "ChatGPT, Gemini 같은" 예시 표현 (IR §2·§5) |
| PRODUCTION_LEARNING_LOOP | **PASS (문서 정의)** | 원칙 문서 §8 에 개선 loop · 승격 규칙 정의. 코드 기능 아님 — 파일럿 CHECK(EP01) 가 첫 실증 기록. 기능화는 후속 8-6/8-7 선택 |
| CANONICAL_DOC_ALIGNMENT | **PASS** | 신규 baseline 작성 · `O4O-AI-USAGE-FLOW-BASELINE-V1` 정합(§1 External 행 · §4.1 stale `PopCreatePage` 정정 · §10 문구 · §15 신설) · `CANONICAL-INDEX` §2 `O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-V1` 행 + §6 신규 baseline 행 추가 · `StartProductionModal.tsx` stale 주석 4곳 정정 (IR §6·§7) |

## 2. 종료 조건 (WO §13)

| # | 조건 | 결과 |
|---|---|---|
| 1 | 최신 `origin/main` 동기화 후 census | ✅ `2464f2494` 기준 |
| 2 | A(Guide 모달 · LlmAssistPanel) census | ✅ IR §2 |
| 3 | B(`StartProductionModal.onAiAction` ACTIVE/DORMANT/DEAD) census | ✅ DORMANT (IR §3.2) — 필드 존재만으로 삭제하지 않음 |
| 4 | C(잔존 ACTIVE 제작형 AI entry) census | ✅ 1건 (IR §4) · Toolbar `AI 정리` 는 제거 대상 아님 |
| 5 | 충돌 판정 | ✅ **ACTIVE_CODE_CONTRADICTION = 0** |
| 6 | IR 작성 | ✅ |
| 7 | 신규 baseline(6-1~6-8) 작성 | ✅ 원칙 문서 §1~§10 |
| 8 | AI-USAGE-FLOW · CANONICAL-INDEX 정합 | ✅ |
| 9 | 코드 변경 = stale 주석/문구/링크만 · 기능 변경 0 | ✅ `StartProductionModal.tsx` 주석 4곳(동작 무변경, contract test 무관) |
| 10 | 파일럿 ≠ canonical 명시 | ✅ 원칙 문서 §9 |
| — | §12 중지 조건 | 해당 없음(정반대 정책 0 · 기능 삭제 필요 충돌 0 · 다른 세션 파일 미접촉 · DB/API/권한 변경 0) |

## 3. 변경 파일

| 파일 | 종류 |
|---|---|
| `docs/baseline/O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1.md` | 신규 baseline |
| `docs/investigations/IR-O4O-STORE-CONTENT-PRODUCTION-EXTERNAL-LLM-STANDARD-ENV-AUDIT-V1.md` | 신규 IR |
| `docs/checks/CHECK-O4O-STORE-CONTENT-PRODUCTION-EXTERNAL-LLM-STANDARD-ENV-REALIGNMENT-V1.md` | 본 문서 |
| `docs/baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md` | 정합(상단 요지 · §1 · §4.1 · §10 · §15) — Home AI 계약(§11~§14) 무변경 |
| `docs/CANONICAL-INDEX.md` | §2 행 1 추가 · §6 행 1 추가 + 기존 행 설명 보강 |
| `packages/store-ui-core/src/components/StartProductionModal.tsx` | 주석만(`onAiAction` DORMANT 사실 · 원칙 문서 링크) |

## 4. 검증

- 신규/수정 문서의 상대 링크 존재 검증: 스크래치패드 스크립트(아래 §4-1).
- `git diff` 로 `StartProductionModal.tsx` 변경이 주석 줄만임을 확인(10줄, 코드 토큰 무변경).
- 다른 세션 파일(`services/web-kpa-society/src/pages/HandoffPage.tsx` · 미추적 `IR-O4O-MIGRATION-TIMESTAMP-…`)은 stage/commit 에서 제외.

### 4-1 링크 검증 결과

`checklinks.py`(스크래치패드, 상대 링크 존재 검사) — 5 파일(원칙 baseline · IR · CHECK · AI-USAGE-FLOW · CANONICAL-INDEX) 검사 → **missing 0**.

## 5. 후속 WO 후보 (IR §8 요약)

**필수(판정만)**: 8-4 KPA "AI 설명 QR 만들기" 처분(유지/Guide 전환/제거).
**선택**: 8-1 `LlmAssistPanel` 채택 확대 · 8-2 Guide 모달 공통화 · 8-3 DORMANT 정리 · 8-5 표준 Brief UI · 8-6 private workspace · 8-7 video recipe engine · 8-8 CONTENT-PRODUCTION-FLOW §1 문구.

## 6. 문서 정합

발견 3건(AI-USAGE-FLOW stale `PopCreatePage` 행 · CONTENT-PRODUCTION-FLOW 색인 누락 · `StartProductionModal.tsx` onAiAction stale 주석) / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 8건(필수 1 · 선택 7). CANONICAL-INDEX 행 추가 및 baseline 신규 작성은 사용자 WO 지시로 허용.
