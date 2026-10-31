# TODO-O4O-STORE-CONTENT-ASSISTANT-FLOW-V1

> **상태**: ACTIVE · **작성일**: 2026-10-31 (Asia/Seoul)
> **작업 종류**: 문서·코드·사용자 진입 흐름 대조 및 개발 TODO 보정
> **기준 main**: `01fd02a23ee035a46aa68d6edf17b528dbab139a`
> **사용자 지시**: 병합을 미루고, 업무 도우미에서 내 약국 콘텐츠를 준비해 내 매장에 적용하는 흐름을 먼저 대조한다.
> **이번 종료점**: 조사·TODO 문서 보정. 기능 코드·권한·DB·provider·운영 설정은 변경하지 않는다. main 병합·배포는 하지 않는다.

## 1. 이번 조사에서 확정한 방향

**새 콘텐츠 AI를 만드는 것이 아니라, 기존 업무 도우미·자료·초안·편집기·매장 적용 사이의 연결을 완성하는 것이 우선이다.**

- 대표 명칭은 **O4O 업무 도우미 / O4O Personal Assistant**, 서비스의 AI는 **O4O Service AI Agent**를 유지한다.
- 메인에는 이미 서버 자료 조회·텍스트 초안 저장이 있다. 이를 없는 기능으로 보고 다시 만들지 않는다.
- 콘텐츠 기획·창작에는 사용자가 선택한 외부 AI를 사용할 수 있다. 내부 AI를 필수 단계로 만들거나 창작 전체를 새 내부 모델 호출로 바꾸지 않는다. 기존 메인의 명시적 텍스트 초안 요청도 일괄 폐기하지 않는다.
- O4O는 참고자료·편집·검토·보관·재사용·매장 적용을 이어 준다. 간단한 요청으로 가능한 작업을 시작하고, 대상이나 필수 사실을 확정할 수 없을 때만 짧게 묻는다. 고정된 긴 Brief 입력을 요구하지 않는다.
- 서버의 O4O 자료로 하는 제작·편집에 PC 설치를 요구하지 않는다. 다른 기기에서 이용하는 것과 PC 화면을 원격 조작하는 것은 별개다.
- 영상 구성안·대본·정지 이미지·실제 동영상 파일·재생 목록을 구분한다. 대본을 저장하거나 제작 Job을 생성했다고 영상 완성을 표시하지 않는다.

## 2. 정본과 우선순위

`AGENTS.md`와 `docs/CANONICAL-INDEX.md`를 먼저 확인했다. 현재 사용자 결정 → 사업/정책 → 구조 계약 → 도메인 문서 → 과거 WO/CHECK의 순서로 판단한다. 코드 존재와 과거 완료 표시는 현재 이용·운영 검증 증거가 아니다.

- [콘텐츠 제작 운영 원칙](../baseline/O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1.md): User AI / Guide / 제작환경 / 전문 생성기 / 조립 / 사용자 검토 책임.
- [AI Core + Extension 기반](../architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md): 기존 실행·모델·quota·회계·업무 권한 재사용.
- [자동화 진화 원칙 §25](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md), [Assistant V2](../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md): 최소 질문, 기존 Task/Memory/Experience, 사용자별 추천, 서버 업무와 PC 실행 분리.
- [콘텐츠/실행 모델](../baseline/O4O-STORE-CONTENT-AND-EXECUTION-MODEL-V1.md), [제작 흐름](../architecture/O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-V1.md), [제작 자료 경계 §2.4](../architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md): 콘텐츠·자산·산출물·적용 대상의 구분. 낡은 구현 현황은 §5에서 별도 대조한다.
- [Signage 재생 정본](../baseline/O4O-SIGNAGE-CANONICAL-PLAYBACK-PATH-V1.md), [매장 playlist 경계](../baseline/O4O-SIGNAGE-STORE-PLAYLIST-MODEL-BOUNDARY-V1.md): 기존 store playlist/snapshot과 Tablet ScreenSet을 재사용.
- [소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md), [B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md): QR·태블릿 콘텐츠 적용을 소비자 결제나 별도 주문 원장으로 확장하지 않는다.
- [공통 모듈 변경](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md), [문서 생명주기 §10](../rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md).

## 3. 선행 작업과 현재 main의 구분

| 구분 | 관측 사실 | 이번 TODO에서의 취급 |
|---|---|---|
| 기존 콘텐츠 작업 정비 | main에 공통 LlmAssistPanel의 자료 선택·요청문 복사·결과 검토·본문 적용·복원·기존 저장 연결이 존재한다. [당시 WO](WO-O4O-AI-CONTENT-WORKFLOW-COMPLETION-V1.md)는 실행 기록이다. | KEEP. 전체 재구현 대상이 아니다. |
| 메인 서버 콘텐츠 작업 | `server-work.ts`와 `/api/ai/request`에 자료 조회·새 텍스트 초안 저장이 존재한다. | KEEP + 연결 보완. 없는 기능으로 취급하지 않는다. |
| 외부 AI 직접 연결 | 기존 MCP/OAuth/동의·권한·draft write adapter와 문서 열기 주소가 존재한다. | KEEP. 현재 사용자 연결과 ChatGPT 서비스 활성화 여부는 별도 확인 대상이다. |
| [PR #901](https://github.com/Renagang21/o4o-platform/pull/901) | HEAD `870ef3ad92607c6d793988e57a6419349af7d873`, 조사 당시 OPEN·미병합. 영상 보관 선택·종료 기반 재생·삭제 보호 등이 검증된 별도 branch에 있다. | **main/운영 반영 완료로 표시하지 않는다.** 해당 작업트리를 읽기 전용으로 대조했으며 이번 branch에 복사·병합하지 않았다. |

PR #901의 선행 범위: O4O 보관 MP4/WebM 선택·등록, 기존 signage media/snapshot/playlist 및 ScreenSet 연결, 종료 후 다음 영상·마지막에서 반복, 수동 목록 재적용, 삭제 보호, 지정 YouTube Studio 진입. **실제 동영상 생성과 YouTube 자동 업로드는 그 PR의 범위가 아니다.**

영상 후속 개발은 실제 착수 때 #901의 반영 상태를 확인한다. 병합을 미룬 현재 상태에서 두 branch의 기능을 합쳐 운영 완료로 간주하지 않는다. 통합 방식은 통합 담당의 절차를 따르며 원격 이력을 재작성하지 않는다.

## 4. 사용자 여정과 실제 연결 대조

| 사용자 행동 | 현재 코드/화면 근거 | 판정·보완점 |
|---|---|---|
| 메인에서 한 문장 요청 | `services/web-neture/src/pages/O4OHomePage.tsx` → `sendUnifiedRequest` → `apps/api-server/src/routes/ai-proxy.routes.ts`의 `/request` | 입력/서버 라우팅 있음. 콘텐츠 제작을 끝까지 잇는 전용 결과·이어가기 연결은 부족하다. |
| “우리 약국 혈압 관리 안내 영상을 만들어 줘” | `services/work-data/server-work.ts::isServerContentRequest`는 O4O/자료함/내 매장 등의 공간 어휘 + 자료/문서/게시글/콘텐츠/초안 + 행동 어휘를 함께 요구 | 이 예문은 `영상`만으로 해당 서버 콘텐츠 분기에 들어가지 않는다. 등록 대상이 없으면 일반 chat으로 갈 수 있다. 안내 응답을 제작 실행으로 표시하지 않게 보정한다. |
| 참고자료를 붙여 제작 요청 | `/request`의 서버 콘텐츠 분기는 `!runId && attachments.length===0`일 때만 실행 | 첨부가 있는 제작 요청은 다른 경로로 빠진다. 기존 첨부 읽기 결과와 허용 자료 참조를 같은 업무로 이어 주는 계약을 확인해야 한다. |
| 내 약국 정보·기존 자료 활용 | `runServerContentWork`는 기존 AdapterRegistry의 허용 workspaces를 조회하고 materials/material/draft 중 한 작업을 계획 | 소유·자료 조회 기반 있음. 생성 입력에 약국의 필수 사실·선택 문서 본문을 조회해 결합하는 단계는 현재 한 번의 계획으로 연결되지 않는다. 없는 사실을 약국 이름만으로 생성하면 안 된다. |
| 텍스트 초안 저장 | `server-work.ts` → `StoreAdapter.save` → 기존 `createLibraryAsset` | 명시적 작성 요청과 저장 직전 권한 재확인 있음. 새 저장 원장을 만들 필요 없다. |
| 저장한 문서를 바로 열고 수정 | `StoreAdapter.content`는 id/revision/openUrl 반환. `server-work.ts`는 이를 일반 완료 문장과 taskId로 축약. 메인 화면은 chat.message 표시 | **핵심 단절**: 기존 결과 id/openUrl/저장 공간을 구조화된 결과로 보존·표시하고 후속 작업으로 넘겨야 한다. 기존 `/external-ai/drafts/:id`가 허용 매장 선택 후 편집기로 연결하므로 재사용한다. |
| 외부 AI에서 만들고 가져오기 | `packages/content-editor/src/components/LlmAssistPanel.tsx`, store 편집 화면, `modules/external-ai/contracts.ts` 및 MCP tools | 복사/붙여넣기와 직접 draft 저장 연결이 모두 존재한다. 사용자 연결이 활성화됐다고 추정하지 않는다. 기존 연결을 우선 확인하고 미연결 시 외부 AI 수동 작업도 계속 가능하게 한다. |
| 미리 보고 수정·저장 | `StoreDirectContentPage`, `ProductionMaterialEditorPage`, `CreateContentFromResourcesModal` 및 공통 authoring session | 결과 미리보기·검토·본문 적용·복원·별도 저장 있음. HTML 텍스트 결과를 영상 파일 미리보기와 혼동하지 않는다. |
| 영상 제작 | `modules/automation/controllers/automation-job.controller.ts`, `tts-narration.controller.ts` | VIDEO Job·임시 결과 업로드/다운로드·TTS는 **플랫폼 관리자 guard**. 파일 업로드는 생성 실행이 아니다. 매장 일반 사용자용 생성·조립·MP4 완성을 제공한다고 볼 수 없다. 관리자 API 권한을 풀어 우회하지 않는다. |
| 완성본 보관 | main의 기존 Media Library/VIDEO temp output + #901의 영상 picker | 일반 보관과 48시간 임시 결과를 구분한다. #901 경로를 재사용하고, 완성본이 준비되기 전에 보관/생성 완료를 표시하지 않는다. 공용 라이브러리 기존 동의도 유지한다. |
| 내 매장 적용 | `StoreContentNextSteps`는 저장 문서에 QR 생성과 자료 선택·제작/매장에서 활용 링크 제공. Signage와 Tablet은 각 기존 작성·저장·적용 경로 | 다음 화면 진입은 있지만 모든 산출물에 저장한 대상이 자동 승계되지는 않는다. 기존 콘텐츠 ID·매장 문맥을 전달하고 사용자가 대상·공개·기기 적용을 확인하도록 연결한다. |
| “내 동영상” 이용 | `PharmacyVideoPage`는 HUB에서 가져온 QR용 동영상 사본 관리. Signage videos 화면과 저장/활용 모델이 다름 | 화면 이름이 비슷하다고 같은 목록으로 합치지 않는다. 사용 목적과 권한을 확인하고 올바른 기존 목적지로 안내한다. |

표의 짧은 파일명은 아래 코드 링크로 확인한다. 작업공간·도메인 adapter·기존 동의가 권한의 최종 판정이며, 클라이언트 storeId나 AI가 작성한 완료 문장은 그 근거가 아니다.

주요 코드 근거: [메인 입력](../../services/web-neture/src/pages/O4OHomePage.tsx) · [통합 API](../../apps/api-server/src/routes/ai-proxy.routes.ts) · [서버 콘텐츠 작업](../../apps/api-server/src/services/work-data/server-work.ts) · [매장 adapter](../../apps/api-server/src/modules/external-ai/adapters/store.adapter.ts) · [초안 열기](../../services/web-store/src/pages/ExternalAiDraftEntry.tsx) · [저장 후 활용](../../services/web-store/src/components/store/StoreContentNextSteps.tsx) · [공통 외부 AI 보조](../../packages/content-editor/src/components/LlmAssistPanel.tsx) · [관리자 VIDEO API](../../apps/api-server/src/modules/automation/controllers/automation-job.controller.ts) · [관리자 TTS API](../../apps/api-server/src/modules/automation/controllers/tts-narration.controller.ts).

## 5. 문서 정합 — 이번에 보정한 계획과 별도 문서 정비 항목

이 TODO는 아래 낡은 전제를 개발 조건에서 제거한다. 정본의 대량 삭제·상태 변경, 과거 WO/CHECK 재작성은 이번에 하지 않는다.

| 낡거나 혼동되는 설명 | 실제 대조 결과 | 개발 때 적용할 보정 |
|---|---|---|
| 제작 흐름 §3의 KPA/K-Cosmetics parity와 AiContentModal 공통 제작 경로 | 현재 대상은 Neture Main/Store. 퇴역 서비스 복구가 아니며 매장 편집기는 외부 AI 보조를 사용 | 오래된 서비스 현황을 새 개발 의무로 승격하지 않는다. 현재 소비처 기준으로 대조하고 해당 기준 문서 현황표의 정비를 후속 범위에 포함한다. |
| 제작 흐름 §4의 `store_execution_assets`는 “항상 산출물” | 자매 제작 자료 경계 §2.4는 INPUT+OUTPUT 이중 역할을 명시. 현행 adapter는 해당 원장에 재편집 가능한 일반 문서 초안도 저장 | 테이블 이름만으로 일괄 산출물 판정·DB 분리/통합하지 않는다. 현행 모델과 source/asset/usage·원본/사본 계약을 대조해 기준의 충돌 문장을 정비한다. |
| 자료함 → 제작 → 동영상까지 같은 기존 골격으로 가능 | `ProductionTarget`은 pop/qr/blog/product-description. `PharmacyVideoPage`는 QR용 사본 관리, VIDEO Job은 관리자용 | 대상 enum 확장·매장 권한 확대를 당연한 수정으로 넣지 않는다. 기존 일반 문서와 외부 영상 완성본의 연결을 우선한다. |
| 메인은 Q&A만 가능 / 초안 저장 기능이 없음 | main 서버 콘텐츠 작업이 이미 존재 | 기존 기능을 재사용하고 라우팅·자료 결합·저장 결과 전달을 보완한다. |
| 자동화는 PC 연결 후에만 가능 / 스마트폰 요청은 원격 PC 실행 | 서버 자료 기반 O4O 콘텐츠 업무는 PC와 무관. 서버 전환과 PC 화면 실행은 별개 | 해당 업무에 PC 설치나 로컬 자료 서버 전환 동의를 불필요하게 요구하지 않는다. PC에서만 필요한 별도 자료는 기존 동의·지정 PC 경계를 따른다. |
| #901 기능과 유튜브 주소 등록 = 자동 생성·업로드 완료 | #901은 미병합이며 보관·재생 연결. 생성 provider/OAuth 업로드는 추가하지 않음 | 텍스트/제작안/완성 파일/보관/게시/적용을 각각 사실대로 표시한다. |

## 6. 다음 개발 TODO — 사용자 업무로 확인되는 한 묶음

### 조사·계획 보정 (이번 완료)

- [x] 최신 main·정본·관련 과거 작업과 #901의 미병합 상태를 구분한다.
- [x] 메인 요청 → 자료 조회 → 초안 → 편집 → 보관 → 매장 적용의 코드와 실제 화면 진입을 대조한다.
- [x] 존재하는 기능, 연결 누락, 관리자/매장 권한 차이, 문서 drift를 구분한다.
- [x] 재사용 지점·비개발 경계·사용자 여정별 완료 기준·미검증 범위를 이 TODO에 반영한다.

### 기능 개발 (미착수 — 다음 지시 범위)

- [ ] **한 문장 요청부터 기존 문서 편집까지 연결:** 기존 Task와 server content 작업을 사용해 자연스러운 콘텐츠/영상 준비 요청과 첨부를 처리한다. 서버가 확인한 매장·허용 자료를 결합하고 최소 질문으로 진행한다. 저장한 id/목적지/openUrl/단계 상태를 돌려주며 메인·다른 기기에서 같은 업무를 열고 이어가게 한다. 실패/재시도·매장 전환 때 초안과 완료 증거를 보존하고 중복 저장을 막는다.
- [ ] **제작 결과 검토·보관·내 매장 적용까지 연결:** 기존 외부 AI 보조/연결·authoring session·문서/Media Library·#901 경로를 재사용한다. 요청·참고자료·검토 결과를 적절한 기존 편집 화면으로 승계한다. 완성 영상이 없으면 제작안 준비/외부 제작 대기라고 표시하고 사용자가 외부 도구에서 만든 실제 파일/개별 영상 주소를 받아 이어간다. 저장 뒤 QR·Tablet ScreenSet·Signage의 올바른 대상과 수동 적용으로 연결한다.
- [ ] **작업 진행과 경험 재사용을 같은 흐름에 연결:** 실제 단계/대기 이유·이어가기·직접 수정·취소를 보여 주고 무진전 반복을 멈춘다. 기존 소유권 안에서 채택된 스타일·길이·사용처와 참조를 기존 Task/Experience에 연결한다. 원문·자격정보를 새 Memory에 복제하거나 개인 경험을 다른 사용자에게 자동 공유하지 않는다. 추천은 사용자가 바꿀 수 있게 한다.
- [ ] **관련 문서와 실제 업무 완결성을 함께 검증:** §5의 현재 기준 충돌·현황 설명을 승인 범위 안에서 정비하고 아래 시나리오를 PC/모바일·API·기존 권한·실패/복구로 검증한다. 새 provider·인증·운영 데이터 변경이 필요한 범위는 별도 확인하며 미실행을 성공으로 보고하지 않는다.

구현은 API/UI를 따로 완료 처리하는 작은 작업들의 합이 아니라 위 사용자 여정 전체를 한 개발 범위로 확인한다. 우선 실제 사용과 교정을 남기고 개선하며, 모든 약국 프로그램·사이트의 매뉴얼 사전 등록이나 고정 Workflow를 선행 조건으로 만들지 않는다.

## 7. 사용자 시나리오별 완료 기준

| 시나리오 | 확인할 사용자 결과 |
|---|---|
| “우리 약국 혈압 관리 안내문을 만들어 줘” | 가능한 기존 매장 문맥·허용 자료로 준비하고 필요한 사실만 묻는다. 검토 가능한 실제 초안과 열기/수정 진입을 제공한다. 저장 원장·본문을 확인한 뒤 저장 완료를 표시하며 공개·게시·기기 적용과 분리한다. |
| “이 자료로 약국 안내 영상을 준비해 줘” + 문서/이미지 | 첨부와 원래 목적을 같은 업무에서 유지한다. 대본·장면 구성·필수 문구/권리와 사실의 출처를 검토한다. MP4가 없으면 영상 완성을 주장하지 않고 다음 제작/사용자 도움 단계로 이어진다. |
| 외부 AI 결과/완성 파일을 가져와 O4O에 보관 | 결과를 미리 보고 수정·검토한다. 실제 파일을 기존 Media Library 동의·권한 안에서 보관하고 같은 파일을 불필요하게 다시 올리지 않는다. 임시 출력 TTL과 일반 보관의 차이를 구분한다. |
| YouTube에 저장하고 매장에 사용 | 지정 채널 `UCG9wb2OKmCBZ63g_ONuFkzg`의 Studio 업로드는 사용자 로그인·권한으로 진행한다. 자동 업로드를 구현한 것처럼 표시하지 않는다. 개별 영상 주소를 검증하고 기존 목록에 수동 적용한다. |
| 저장한 콘텐츠를 QR/태블릿/사이니지에서 활용 | 저장한 콘텐츠/파일과 올바른 매장·적용 대상이 이어진다. 미리보기·저장·공개·게시·기기 적용의 성공 증거를 구분한다. 영상 순환·수동 목록 변경은 #901 계약을 재사용한다. |
| 실패 후 다른 기기에서 계속 / 사용자 수정 | 서버 기반 O4O 업무에 PC 설치를 요구하지 않는다. 기존 저장본·Task/대상 참조로 이어가고, 다른 계정/매장 자료가 섞이지 않는다. 저장 실패/응답 유실에 중복 생성·자동 게시·무제한 유료 재시도를 하지 않는다. |

## 8. 이번 실행 증거와 미검증

- 코드 조사 기준은 위 main SHA다. #901은 별도 작업트리의 code/TODO와 GitHub PR 상태를 읽기 전용으로 확인했다.
- 실제 Chromium에서 **1365px/390px 각각** `neture.co.kr/`, `store.neture.co.kr/store`, `/store/library/contents`, `/store/marketing/signage/videos`의 공개 진입을 관찰했다(총 8회).
- 각 요청의 HTML 응답은 200이었다. 메인에는 입력창이 보였고, Store의 보호 화면은 로그인 안내를 표시했다. **HTTP 200을 비로그인 콘텐츠 접근이나 편집 성공으로 판정하지 않는다.** 생산 파일·게시·기기 적용까지 관찰한 결과가 아니다.
- 새 브라우저 문맥에서 GET/HEAD/OPTIONS 외 요청은 차단했다. 로그인·AI 실행·콘텐츠 저장/삭제·유튜브 업로드·운영 설정·DB 쓰기는 하지 않았다. 운영 서빙 SHA와 이 main의 일치를 검증하지 않았다.
- 테스트 계정 기준 파일 `docs/local/TEST-ACCOUNTS.local.md`는 새 작업트리와 기준 checkout 모두 없었다. 주입 변수의 존재를 실계정·역할 검증으로 간주하지 않았으며, 예전 계정이나 Demo 계정으로 대체하지 않았다. 로그인 후 편집·저장·실제 모델 품질·비용·게시/적용 검증은 후속 대상이다.
- 기존 테스트 소스의 경계도 대조했다: `services/work-data/server-work.spec.ts`, 외부 AI adapter/MCP 계약 테스트, Store authoring/signage/tablet 테스트. 이 조사에서 기능 테스트를 새로 실행한 것으로 보고하지 않는다.
- 브라우저 관찰 script/result는 로컬 `/tmp/o4o-content-flow-readonly*`에만 있다. 계정값·본문·실제 약국명·토큰·production 응답 원문은 이 문서에 기록하지 않는다.

## 9. 비개발·보존 경계

상품 DB 관리·공급자 상품 등록 AI, 신규 Core/인증/Task/Memory/정산 원장, 새 미디어 원장·playlist 테이블, 관리자 VIDEO API의 매장 개방, 신규 생성 provider·유튜브 OAuth 자동 업로드, 필수 PC 설치, 자동 게시·목록 갱신·기기 적용은 이번 조사 및 위 연결 개발의 자동 승인 범위가 아니다. 기존 모듈·도메인 저장/권한/검토 계약을 우선한다.

현재 작업은 TODO 보정까지만이다. #901의 branch/worktree와 다른 세션 작업은 그대로 보존한다. 실제 약국 기기의 장시간 재생은 사용자 결정대로 개발 완료 후 현장 점검 대상이다.
