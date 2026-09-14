# O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1 — 매장 콘텐츠 제작 운영 원칙

> **상태**: ACTIVE (baseline) · **작성일**: 2026-09-14
> **근거 WO**: `WO-O4O-STORE-CONTENT-PRODUCTION-EXTERNAL-LLM-STANDARD-ENV-REALIGNMENT-V1` (AUDIT + BASELINE REALIGNMENT, 기능 개발 없음)
> **근거 조사**: [IR-O4O-STORE-CONTENT-PRODUCTION-EXTERNAL-LLM-STANDARD-ENV-AUDIT-V1](../investigations/IR-O4O-STORE-CONTENT-PRODUCTION-EXTERNAL-LLM-STANDARD-ENV-AUDIT-V1.md)
> **관계 문서**: [O4O-AI-USAGE-FLOW-BASELINE-V1](O4O-AI-USAGE-FLOW-BASELINE-V1.md)(AI 진입 흐름) · [O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-V1](../architecture/O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-V1.md)(제작 6단계·저장 모델) · [O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1](../architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md)(테이블·경계) · [O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1](O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md)(자동화 진화 원칙)
>
> 이 문서는 **역할 경계와 운영 원칙**만 고정한다. 기능 목록·화면 설계·API 계약을 새로 정의하지 않으며, 기존 도메인 canonical(POP V2 · QR · Blog · Product Description · Tablet · Signage · Media Library V2 · VIDEO Job)을 대체하지 않는다.

---

## 1. 한 줄 원칙

> **O4O 콘텐츠 제작 서비스는 창작자의 AI를 대신하는 서비스가 아니라, 사용자가 자신의 AI와 만든 콘텐츠 기획을 실제 매장용 콘텐츠로 안정적으로 생산하는 표준 제작환경이다.**

따라서 O4O 는 "O4O 자체 AI API 로 모든 기획·창작을 수행하는 구조"를 목표로 하지 않는다. 사용자가 ChatGPT · Gemini · Claude 등 **자신의 AI** 로 기획·초안을 만들고, O4O 는 그것을 **실제 매장 콘텐츠로 바꾸는 제작·관리·재사용 환경**을 제공한다. O4O 내부 AI 는 그 과정의 **선택적 보조**다.

## 2. 역할 분리

| 주체 | 역할 | 하는 것 | 하지 않는 것 |
|---|---|---|---|
| **User AI** (사용자의 ChatGPT / Gemini / Claude 등) | **Creative / Strategy** | 홍보 기획 · 제품 스토리 · 콘텐츠 아이디어 · 초안 작성 · 문구 · 구성 · 톤 · 수정 방향 | — (O4O 가 특정 LLM 을 강제하지 않는다) |
| **O4O Guide** (제작 안내 · 요청문 · 붙여넣기 안내) | **Normalize / Missing Check / Handoff** | 표준 Brief 축 안내(무엇을 · 목적 · 대상 · 핵심 메시지 · 형태 · 필수 사실/수치 · 피해야 할 표현 · 이미지/영상 · 길이/규격 · CTA · 재사용 자산) · 누락 항목 안내 · O4O 편집기로 가져오는 방법 안내 | 기획 재창작 · LLM API 호출 · 계정 연동 · 대화 저장 |
| **O4O Production Environment** (콘텐츠 선택 → 제작 대상 → 자료 연결 → 편집 → 중간 결과 → 검수 → 수정 → 조립 → 다운로드/게시) | **Execute / Manage / Reuse** | POP · QR · Blog · Product Description · Tablet · Signage · Video 각각의 실행 계약 유지 · 저장 · 템플릿 · 산출물 생성 · 재편집 | 창작 주체가 되는 것 |
| **Specialized AI** (이미지 · 영상 · 음성 생성기) | **Image / Video / Voice** | 외부 전문 생성(사용자 계정·결제) | O4O 가 provider 를 고정하는 것 |
| **O4O Assembly** | **정확한 자산 조립 / 렌더링** | 실제 제품 자산 · 정확한 한글/숫자 · 자막 · 그래픽을 생성물과 **후합성** · 미리보기 | 사실 정보를 AI 생성에 맡기는 것 |
| **User** | **검수 / 승인 / 최종 활용** | 결과 확인 · 채택/재생성 판단 · 게시 · 매장 활용 | — |

**O4O 내부 AI 의 경계(§2-D)**

- KEEP: Home AI(플랫폼 일반 업무 진입 · Q&A) · 편집기 Toolbar `AI 정리`(기존 본문 편집·정리 보조) · 관리자/ProductMaster 내부 자동화(Product AI pipeline · 태그 생성 등, 매장 콘텐츠 초안 정책과 별개 축) · 구조화/누락 확인/저위험 QA.
- NOT REQUIRED FOR CONTENT CREATION: 홍보 기획 · 제품 스토리 창작 · 초안 전체 생성. **매장 콘텐츠 제작에서 O4O AI 는 필수 단계가 아니다.** 어떤 제작 화면도 O4O AI 를 거치지 않으면 진행할 수 없게 설계하지 않는다.

## 3. 표준 반복 (Standard Loop)

```text
기획(User AI) → Brief(O4O Guide 축으로 정리) → 자산(Media Library · 자료실 · 상품 정보)
→ 제작(O4O 제작환경 · 필요 시 Specialized AI) → Preview → 검수(User) → 수정 → 완성 → 재사용
```

- 기획과 Brief 는 O4O 밖(사용자 AI)에서 만들어져도 된다. O4O 는 **가져오는 지점**(HTML 붙여넣기 · 자료 연결 · Media Library 등록)부터 책임진다.
- 재제작은 저장된 콘텐츠·자산에서 다시 시작한다 ([CONTENT-PRODUCTION-FLOW §1](../architecture/O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-V1.md) 단방향 원칙 유지).

## 4. 콘텐츠 종류

HTML 콘텐츠 · POP · PDF · QR · Blog · Product Description · Tablet · Signage · Video.
각 종류의 실행 계약·저장 모델·canonical 화면은 **기존 도메인 canonical 이 그대로 정본**이며 이 문서가 바꾸지 않는다. 이 문서는 모든 종류에 공통으로 §1~§3 의 역할 경계만 적용한다.

## 5. Provider 중립성

- 텍스트 LLM(ChatGPT / Gemini / Claude …) · 영상 생성(Seedance / Veo / Kling …) · TTS(ElevenLabs …) · 이미지 생성은 **교체 가능한 provider** 다.
- 안내 문구·Brief·Runbook 에서 예시로 들 수는 있으나 **canonical 문서·코드 계약에 특정 provider 를 고정하지 않는다**. Media Library 의 `generationProvider` 는 자유 문자열(기록용)이며 enum 이 아니다.
- O4O 내부 AI 의 provider(현재 Gemini 계열)도 같은 원칙 — 정책/엔진 설정으로 교체 가능해야 하며 화면 문구에 박지 않는다.

## 6. 자산 재사용

- **Media Library V2 = O4O 공통 제작자산 카탈로그 정본**(`media_assets`, `/content-resource/media-assets`, catalog 확장 필드 `originType · derivationType · generationProvider · qaStatus · productAccuracyLevel · rightsType · usageType`).
- 캐릭터 reference · 공통 설명 그래픽 · 배경 · 제품 Master/Cutout 같은 **재사용 자산**은 Media Library 에 등록하고, 개별 제작(Job)은 그것을 `INPUT / INTERMEDIATE` 로 **연결**한다(복제하지 않는다).
- 자산의 정확도 등급(`productAccuracyLevel`) · 권리(`rightsType`) · QA 상태는 자산에 기록하고, 제작 화면이 다시 판단하지 않는다.

## 7. 동영상 (VIDEO Job)

```text
VIDEO Job 생성 → INPUT / INTERMEDIATE 자산 연결(Media Library)
→ 외부 전문 생성(사용자 계정: 영상 · 음성) → 조립(후합성 · preview)
→ private temporary output → download → TTL 자동 cleanup
```

- 완성 영상은 **영구 자산이라는 전제가 없다**. Job 의 임시 output(`temp_output_*`, 기본 TTL `VIDEO_TEMP_OUTPUT_TTL_HOURS`=48h, in-app expiry job)으로 두고 사용자가 내려받는다. 장기 보관은 사용자의 결정이며 자동 승격하지 않는다.
- 제작 자료(INTERMEDIATE)의 정리 방침(`cleanupDecision`)과 완성본 보관 정책은 별개 축이다.
- 근거 CHECK: [P0 Admin Workspace](../checks/CHECK-O4O-AUTOMATION-VIDEO-JOB-P0-ADMIN-WORKSPACE-V1.md) · [Temp Output Download & Auto Cleanup](../checks/CHECK-O4O-AUTOMATION-VIDEO-JOB-TEMP-OUTPUT-DOWNLOAD-AND-AUTO-CLEANUP-V1.md) · [Media Library V2 P0](../checks/CHECK-O4O-MEDIA-LIBRARY-V2-P0-AI-VIDEO-FOUNDATION-V1.md).

## 8. 개선 loop (Production Learning Loop)

실사용에서 다음을 **관찰·기록**하고, 반복성이 검증된 것만 표준 기능으로 승격한다.

| 관찰 축 | 예 |
|---|---|
| 실패 | 어떤 CUT/자산이 재생성됐는가, 왜 |
| 비용 · 시간 | provider 크레딧 · 생성 횟수 · 소요 시간 |
| 사람 판단 | 어느 단계에서 사람이 개입했는가(채택/재생성/문구 수정) |
| 재사용 자산 | 다음 제작에 그대로 쓰인 자산 |
| 반복 가능 단계 | 두 번 이상 같은 방식으로 수행된 단계 |

**승격 규칙**: 파일럿 1회 성공 = 학습 결과. 서로 다른 제작에서 같은 패턴이 반복되어야 "candidate production pattern" → 별도 WO 로 표준 기능 검토. 승격 전까지 파일럿 스크립트·Runbook 은 canonical 플랫폼 기능이 아니다.

## 9. 파일럿과 Canonical 의 경계

`Pilot Pattern ≠ Platform Canonical Core`.

- 미네락600 EP01 파일럿(`scripts/media/minerock600-pilot/**`, `docs/media-pilot/minerock600/**`)은 **특정 상품의 실사용 학습 사례**다. FFmpeg assembly · 제품 cutout 후합성 · TTS-first duration(내레이션 실측 → CUT 길이) · 정확한 한글/숫자 후합성 · 캐릭터 reference 는 §8 의 "candidate production pattern" 이며 canonical 플랫폼 기능으로 선언하지 않는다.
- `assemble_ep01.py` 는 파일럿 스크립트다. 플랫폼 `video recipe engine` 같은 기능은 §8 승격 규칙을 거친 뒤 별도 WO 로만 다룬다.
- 파일럿이 검증하는 것은 "영상 하나"가 아니라 **§3 표준 반복이 실제로 도는가**다.

## 10. 재구현 금지 · 후속 WO 경계

이미 존재하는 다음은 **재구현하지 않는다**: `StartProductionModal`(`@o4o/store-ui-core`) · `RichTextEditor` / Toolbar `AI 정리` · `LlmAssistPanel`(`@o4o/content-editor`) · `ContentCreationGuideModal` · POP V2 / QR / Blog / Product Description 제작 · Media Library V2 · VIDEO Job · Temporary Output · Home AI · Product AI pipeline.

이 문서에서 파생되는 기능 변경(예: `LlmAssistPanel` 채택 확대 · `ContentCreationGuideModal` 공통화 · 잔존 제작형 AI entry 처분 · 표준 Brief UI · private production workspace · video recipe engine)은 **전부 별도 WO** 로만 진행한다. 목록은 [IR §8](../investigations/IR-O4O-STORE-CONTENT-PRODUCTION-EXTERNAL-LLM-STANDARD-ENV-AUDIT-V1.md).
