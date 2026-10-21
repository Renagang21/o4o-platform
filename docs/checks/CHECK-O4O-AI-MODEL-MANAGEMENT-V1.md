# AI 모델 관리 및 사용 모델 지정 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-21 · **최종 갱신**: 2026-10-21 (Asia/Seoul)
> **근거 WO/IR**: [모델 관리 TODO](../work-orders/TODO-O4O-AI-MODEL-MANAGEMENT-V1.md)
> **관련 정본**: [AI 공통 기반 §12](../architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md#12-관리자-ai-운영-조회-기반--main운영-반영-2026-10-20)

## 변경과 적용 범위

관리자 `/settings`의 AI 운영 관리에서 공급자별 모델을 등록·수정·삭제하고, 사용처 상세에서 사용할 모델을 선택·저장한다. `AiModelControls.tsx`와 `api/ai-management.ts`가 관리 API를 사용한다. 기존 조회·공통 질의 정책·사용량 집계는 유지한다.

| 구분 | 계약 |
|---|---|
| 저장 | 기존 `settings`의 `ai:model-controls:v1` 한 문서에 revision·모델·삭제 표식·사용처 선택 저장. schema/migration 없음 |
| 읽기 | GET은 저장하지 않음. 키·prompt·응답·수정자 ID 비노출. 설정 조회/파싱 실패는 성공 기본값으로 숨기지 않음 |
| 쓰기 | 기존 `authenticate` + `requireAdmin` 아래 POST/PUT/DELETE. 한 revision에 한 쓰기만 성공하도록 PostgreSQL 조건부 upsert. 충돌은 409 |
| 삭제·변경 보호 | 기존 정책의 주/대체 모델(비활성 포함), 환경 설정·코드 fallback·사용처 지정 모델은 삭제 및 ID/지원 기능 변경 거부. 이름 수정은 허용 |
| 재등장 방지 | 삭제 표식으로 코드 기본 목록·Gemini 동적 목록에서 제거한 모델의 재등장 차단. 명시적으로 다시 등록하면 사용 가능 |
| 사용 모델 | 다음 새 호출에서 지정값 우선. 지정 해제는 기존 경로 상속으로 복귀. 진행 중 요청·캐시된 결과·과거 사용량은 수정하지 않음 |
| 능력·공급자 | 실제 기존 adapter와 맞는 공급자·텍스트/이미지/검색/음성 조합만 선택. 강화 복구는 화면 첨부 가능성이 있어 이미지 지원 필요 |
| 비용·fallback | 기존 가격·한도·재시도·장애 대체 정책 유지. 모델 등록이 공급자 인증·지원 능력·실제 단가 확인을 대신하지 않음. 기존 공급자 추정 가격을 실제 모델 청구 단가로 표시하지 않음 |

API 경로는 `/api/ai/admin/management` 아래 `GET/POST /models`, `PUT/DELETE /models/:provider/:model`, `PUT /model-selections/:target`다. 기존 root와 `/usage` GET은 읽기 전용이다. 새 설정에 credential·base URL을 저장하지 않는다.

## 실행 연결 조사·구현

31개 논리적 사용처 중 30개의 선택을 기존 실행 경로에 연결했다. 실제 공급자 실행/운영 이용을 30곳에서 확인했다는 의미는 아니다. 목록 자체는 업무 권한이나 서비스 활성 registry가 아니다.

| 사용처 | 연결한 기존 코드·주의점 |
|---|---|
| 공통 질의 | `ai-query.service.ts` → 기존 과금 실행 전에 모델 지정 적용. 질의 중지·actor·quota 유지 |
| 홈 대화·첨부, Assistant·운영 인사이트 | `ai-provider-runtime.ts`의 usage 지정 호출. 홈 첨부는 기존 Gemini adapter만 선택 |
| 업무 계획·화면 판독·강화 복구 | `work-planner.ts`에서 일반/이미지/강화 목표를 분리. 기존 직접 vision 요청과 텍스트 실행기 유지 |
| 웹 조사·공개 약품 조사 | `web-research.service.ts`의 별도 usage. 기존 Gemini grounding·응답 정규화 유지 |
| 파일·공개 파일 구조 추론 | `structure-inference.service.ts`의 서버 소유 usage. 파일 파싱·인증 경계 유지 |
| 편집/URL/매장 활용, 강의 구조·본문, 관리자 블록 | `ai-proxy.routes.ts`·`ai-proxy.service.ts`. 등록 모델이 정적 whitelist 밖이라는 이유로 다른 모델로 조용히 바뀌지 않음. 기존 Qwen 저위험 실험 경로를 새로 확장하지 않음 |
| 상품 태그·KPA 요약/추출/태그 | 기존 호출부에서 관리 모델을 해석한 뒤 같은 실행기 사용. 업무 저장·인가 유지 |
| 상품 콘텐츠·매장 번역·약국 상담 번역 | 기존 `AiPolicyExecutorService`의 주 호출에 적용. 두 번역은 `policy.CONTENT_TRANSLATION`을 공유하며 UI에 함께 변경됨을 표시 |
| LMS 분석·운영 행동 추천 | 기존 Extension과 과금 실행 전 해석. 지정 공급자 키가 없으면 다른 유료 공급자로 자동 전환하지 않음. 기존 규칙 대체·결과 캐시는 별개 |
| 음성 합성 | 기존 TTS provider별 목표 두 개. model resolver만 주입하고 요청 provider·voice·출력 format·codec 유지 |
| 제외: 이전 공급자 HUB | 현재 사용 미확인인 `supplier.hub`는 모델 지정 제외. 이전 사업 기능 또는 Frozen Core를 복구·확장하지 않음 |

OpenAI/Gemini와 기존 관리자 블록의 Claude는 해당 기존 adapter 범위에서 선택한다. Qwen·DeepSeek는 목록 CRUD만 제공하고 새 실행 공급자로 노출하지 않는다. 별도 adapter·인증·능력·가격 계약 없이 DeepSeek 실행이 가능하다고 표시하지 않는다. 음성→텍스트 API는 미도입 상태를 유지한다.

Gemini 기존 정책 화면의 동적 모델 조회도 관리자 등록·삭제를 반영한다. 직접 transport의 전체 회계 통합, 공급자 사용량/invoice 일치, 통합 중지 admission, 번역별 독립 정책은 이번 작업의 완료 범위가 아니다.

## 실행한 검증

격리된 cloud worktree, Node 22.18.0·pnpm 10.25.0, 합성 API/계정·공급자 응답, 시스템 Chromium을 사용했다. 실제 Google 세션·운영 DB·유료 공급자 요청은 사용하지 않았다.

| 검증 | 결과 |
|---|---|
| API 핵심·HTTP 인가·동적 registry·OpenAI/Gemini runtime·업무 Extension·번역·TTS 회귀 | 12 suites, 185 PASS |
| 기존 과금 실행 admission/실패·중복 호출 방지 | 1 suite, 15 PASS |
| 관리자 전체 Vitest | 29 files, 436 PASS |
| 새 모델 관리 browser | desktop 1280×800 / mobile 390×844의 CRUD·409 입력 유지·모델 지정·새로고침·삭제 보호 및 운영자403·익명 로그인, 4 PASS |
| 기존 설정 browser 회귀 | desktop/mobile Email·AI 정책·사용처 조회 및 권한 경계 12 PASS. 이후 새 모델 관리 4개 재실행도 PASS |
| 실제 모델 전달 | 신규 등록·지정 모델이 기존 OpenAI HTTP body 및 TTS body에 전달됨을 합성 fetch로 확인. prompt·voice·format 유지 |
| 임시 PostgreSQL 16 | 새 모델 설정 3개 PASS: 최초 insert/후속 update 동시 쓰기, 새 service instance 재조회, 삭제 보호·해제, 이전 ai_settings 물리 schema 호환. 기존 quota 예약 14개 PASS |
| 기존 schema bootstrap/rollback | 4개 중 2 PASS / 2 FAIL. 아래 별도 미해결 사항 |
| 타입·빌드 | API `tsc --noEmit`·정식 build, 관리자 type-check·Vite build PASS |
| 변경 TS/TSX lint | error 0. 기존 미사용 변수 경고 3건(KPA RequestHandler/uploadSingleMiddleware, AI proxy content) |
| 문서 | 관련 링크·민감정보·diff whitespace 검사 수행. canonical의 이전 조회 단계와 이번 개발 상태를 구분 |

명령은 저장소 루트에서 `pnpm --filter @o4o/api-server exec jest --runInBand <대상 spec>`, `pnpm --filter @o4o/admin-dashboard exec vitest run`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium pnpm --filter @o4o/admin-dashboard exec playwright test src/test/e2e/ai-model-controls.spec.ts --project chromium --workers 1`를 사용했다. 실제 PostgreSQL 검증은 애플리케이션 DB 설정을 읽지 않는 loopback fixture와 `O4O_AI_QUOTA_TEST_PORT=55447`로 실행했다.

### 미해결: 기존 quota rollback 테스트 2건

`ai-quota-schema.integration.spec.ts`의 rollback archive 생성 및 old precision overflow rollback 검증이 실패했다. 이 spec은 전체 incremental bootstrap 후 `undoLastMigration()`이 `CreateAiUsageReservations1791870434349`를 되돌린다고 가정한다. 현재 manifest의 마지막은 `CreateCooperativeManagement1792300000000`이므로 실제 되돌리는 migration이 다르다. 해당 spec·quota migration·manifest는 작업 기준 `5c6150a6b0`와 diff 0이며 이번 작업에서 수정하지 않았다. PASS로 숨기거나 migration 이력을 바꾸지 않는다. 테스트가 실제 목표 migration을 명시하도록 별도 보완이 필요하다. 독립된 기준 checkout에서 같은 테스트를 재실행한 것은 아니므로 별도 baseline 실행 증거로 표현하지 않는다.

실제 Google 로그인·운영 저장/재조회·공급자 인증·요금은 미검증이다. 등록 모델의 실제 제공/능력/가격을 확인한 뒤 통합 담당이 필요한 운영 검증을 진행해야 한다.

## 데이터 정리·Git 인계

- 임시 PostgreSQL에서 생성한 `o4o_ai*` DB 잔존 count 0 확인 후 이번 컨테이너 삭제, 컨테이너 목록에서도 잔존 0 확인. browser/API fixture는 메모리 데이터이며 운영 데이터 생성 없음.
- 저장소 `Renagang21/o4o-platform`, branch `wo/ai-model-catalog-retirement`, base `5c6150a6b0f12ef5006d745862196b2ee5b22b8b`.
- push 전 확인한 `origin/main=ac38af8df1`의 CarePharm 변경과 이번 작업 경로 중복 없음. 기준 checkout은 건드리지 않음.
- 종료 범위는 개발·로컬 검증·commit·push. PR CI는 미실행, main 병합·운영 배포는 미실행. `DEPLOYMENT=REQUIRED`이며 통합 담당의 별도 작업으로 남김. 위 기존 rollback 실패도 인계한다.
- `WORKTREE_DISPOSITION`: branch-only 개발 변경 보존, 통합 전 worktree `KEEP`. 최종 commit SHA·원격 동일 SHA·clean은 Git 및 최종 보고에서 확인한다.

## 2026-10-21 통합 재검증 (진행 중)

사용자가 main 병합·배포를 추가 지시했다. 개발 기록의 미해결 quota rollback 2건은 이번 통합에서 보완했다. 전체 최신 schema 검사는 별도 DB에 유지하고, rollback fixture는 manifest에서 quota migration까지의 prefix를 찾아 적용한다. 따라서 `undoLastMigration()`이 실제 quota를 대상으로 하며 전후 fingerprint도 해당 위치를 사용한다. production migration·manifest·fingerprint 정본은 변경하지 않았다.

최신 main `cec025afb55584d5411f82deaa58d6303a9e02e5`를 충돌 없이 병합한 후 실행 결과:

- API 모델 관리·HTTP 인가: 2 suites, 25 PASS.
- 실제 격리 PostgreSQL schema/rollback 및 모델 CAS/재조회: 2 suites, 7 PASS. 기존 실패 2건 해소.
- quota 예약·다중 공급자 runtime·동적 목록·TTS·서비스/LMS Extension·과금 실행: 7 suites, 139 PASS. 예약 14건 포함.
- 관리자 전체 Vitest: 30 files, 441 PASS.
- API 및 관리자 type-check PASS, API 정식 build PASS.

테스트는 Node 22.18.0·pnpm 10.25.0, 합성 공급자 응답 및 격리 loopback PostgreSQL 16을 사용했다. 실제 Google 로그인·운영 모델 설정 저장·유료 공급자 호출은 수행하지 않았다. browser·관리자 build·PR/운영 배포·일회성 DB 정리 결과는 이후 실제 실행에 따라 추가한다.

### 통합 추가 실행 결과

관리자 Vite build 및 desktop/mobile browser 16건 PASS(CRUD·409 입력 유지·모델 지정/해제·새로고침·삭제 보호·Email/AI 설정 회귀·서비스 운영자/익명 접근 제한). API build와 별개 실행했으며 실제 운영 계정은 사용하지 않았다.

이번 통합용 PostgreSQL 컨테이너의 `o4o_ai*` DB 잔존 count 0을 확인한 뒤 해당 일회성 컨테이너/임시 저장소를 제거했다. 이번 작업 label의 컨테이너 잔존도 0이다. 운영 DB·계정·공급자 설정을 변경하지 않았다.

기능 PR은 #754이며 CI·Codex·배포는 아직 진행 중이다. 위 개발 단계 검증과 운영 배포 결과를 구분한다.

### PR #754 리뷰 보완

- 환경변수 키만 검사하던 운영 인사이트의 사전 gate를 제거하고 기존 DB/env resolver 결과로 실행 여부를 판단한다. DB에만 키가 있는 경우에도 관리 모델을 전달하며 키 미설정·실패 시 기존 규칙 fallback을 유지한다.
- 모델 변경과 공통 질의 정책 저장이 같은 PostgreSQL transaction advisory lock을 사용한다. 모델 참조 확인·삭제/CAS를 한 transaction에 묶고 정책은 잠금 내부에서 삭제 여부를 다시 검사한 뒤 저장한다. 삭제 직전 검사 후 다른 정책이 저장되는 경쟁을 방지하며 stale 정책 저장에는 409를 반환한다. 현재 scope 정책/credential의 다른 app 쓰기 소비처는 확인되지 않았으며 향후 writer도 같은 잠금 계약이 필요하다. migration/직접 CLI 쓰기를 이 API 보호와 동일하다고 주장하지 않는다.
- 새 회귀: 환경변수 키가 없는 인사이트 및 실제 관리자 CRUD HTTP 포함 3 suites, 26 PASS. 실제 격리 PostgreSQL 모델 설정 4 PASS(정책 먼저 저장→삭제 거절, 삭제 먼저→정책 거절 포함). API type-check PASS. 추가 정책 서비스·기존 runtime 회귀 및 build 결과는 후속 기록한다.

추가 정책 서비스·질의 HTTP·동적 모델·다중 공급자·인사이트 회귀는 5 suites, 63 PASS, API 정식 build PASS다. 처음 실행에서는 신규 잠금 mock 및 기존 질의 HTTP fixture에 transaction/query 계약이 없어 실패했으며 fixture를 보완 후 재실행했다. 공급자 유료 호출을 사용하지 않았다.

### 후속 리뷰: 관리자 블록·기존 엔진 경로

관리자 블록의 OpenAI transport는 기존 Core의 `isReasoningGenerationModel` 판별을 재사용해 GPT-5/6·o-series에는 `max_completion_tokens`를 보내고 `temperature`/`max_tokens`는 생략한다. 구세대는 기존 파라미터를 유지한다. 전체 Core adapter 이관이나 재시도/요금 정책 변경은 하지 않았다.

기존 `AiAdminService.activateEngine`도 정책 writer임을 추가 확인했다. 엔진 활성화와 일반 관리자 정책 저장을 같은 transaction advisory lock에 연결했다. 활성화는 삭제 표식을 검사한 후 엔진 플래그와 정책을 원자 저장하며 삭제된 모델은 409로 거절한다. 일반 정책 저장은 잠금 내부에서 최신 정책을 재조회하므로 오래된 모델 필드를 덮어쓰지 않는다. 앞 절의 "다른 app 쓰기 소비처 미확인"은 당시 조사 결과이며 이 추가 writer 확인으로 보완한다.

실제 `generateContent` 진입점에서 GPT-6/GPT-5/o3/GPT-4.1 모델별 합성 HTTP body, 삭제된 비활성 엔진의 활성화/정책 무변경, 기존 CRUD·질의·정책 회귀: 5 suites, 48 PASS. API type-check PASS. 실제 유료 호출이나 엔진 운영 설정 변경은 하지 않았다.
