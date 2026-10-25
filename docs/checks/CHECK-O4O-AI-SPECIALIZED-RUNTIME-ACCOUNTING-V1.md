# 전문 AI·기존 직접 호출의 공통 회계 연결 검증

> **상태**: COMPLETED
> **개발 결과**: 로컬 검증 완료·commit/push 인계. main/운영 적용은 별도
> **작성·갱신**: 2026-10-25 (Asia/Seoul)
> **작업**: [TODO](../work-orders/TODO-O4O-AI-SPECIALIZED-RUNTIME-ACCOUNTING-V1.md) · `wo/ai-specialized-runtime-accounting`
> **기준**: main `4ee5a8ecda` + 선행 텍스트 정비 `d11cb4afa1` 정상 merge `cb8693daff`

## 1. 판정·검증 범위

이미지/PDF·화면 계획·이미지 분석·검색·OCR·TTS·Qwen과 같은 경로의 편집/URL/강의 직접 호출을 함께 정비했다. 기존 quota·가격 catalog·예약/정산·Extension을 재사용하며 새 schema/migration·원장·Core 패키지·dependency·메뉴·상태 변경 도구를 만들지 않았다. Core의 선택적 계측 flag와 retry 소유권만 보강했다.

명시 모델 가격/profile을 준비해야 native provider를 호출할 수 있다. 운영 요율/예산·한도·credential은 저장하지 않았다. **가격 준비가 없는 전문 경로는 503으로 차단되므로 이 branch는 현재 운영 설정 확인 없이 배포 가능한 상태를 뜻하지 않는다.** 운영 검증·요금 적용은 [TODO §4](../work-orders/TODO-O4O-AI-SPECIALIZED-RUNTIME-ACCOUNTING-V1.md#4-구현-계약과-운영-준비-항목)의 선행 조건을 따른다. 실제 외부 청구·결제·실계정 사용은 검증하지 않았다.

## 2. Shared Module Change Verification

### Changed shared module

- Module: `modules/ai-policy/ai-accounted-execution.ts`, `ai-pricing.ts`, `ai-native-metering.ts`, `ai-quota.service.ts`; 기존 native/AIProxy transport·관리 집계·확인된 actor 전달 host.
- Package: 서버 `@o4o/api-server`, 공통 `@o4o/ai-core`의 execute/provider/Extension 오류 전달. 실행·권한/자료·Task/Memory 계약을 우회하지 않는다.
- Direct consumers: Home native helper·planner 4종, 공개/로그인 research, 이미지 분석, 상품 이미지 OCR, 관리자 TTS, 기존 AIProxy 편집/블록/URL/강의, 카탈로그 가져오기 후 콘텐츠.
- Indirect consumers: Neture·병원약국 공개 도구·관리자 AI 운영/블록·공급자 이미지·기존 매장/분회/협력 모임/LMS Extension. standalone 파일 CLI는 기존 명시 transport를 유지한다.
- 조사: apps/packages/services/scripts의 import·factory·method·route를 대조했다. 현재 소비처를 찾지 못한 legacy HUB/인사이트와 폐기된 서비스/메뉴는 복구하지 않았다.

### Consumer impact matrix

| 소비처 | 사용 여부 | 변경 영향 | route/role/capability 영향 | 검증 방식 | 결과 |
|---|---|---|---|---|---|
| Neture Home·Work | 직접 | Gemini 이미지/PDF·Gemini/OpenAI 일반/강화 계획·현재 actor 비용 연결 | 기존 가입/인증·scope/tool/실행 검증 유지 | 실제 HTTP router·native 요청 형상·예약/정산 fixture, web 타입/소비 테스트 | PASS (로컬) |
| 병원약국 공개 research | 직접 | 익명 scope·검색 fee/질의 수·사용량 누락 처리 | 공개 read·기존 IP/표본 경계 유지, body로 actor 추정 없음 | 실제 research/Core·HTTP 오류 fixture, web 타입/파일 선택 테스트 | PASS (로컬) |
| 관리자 AI·블록·이미지 분석 | 직접 | 매 시도 예약, provider 교체·중복 집계 제거 | 기존 인증/관리 조회 guard·허용 모델 유지 | API 권한·관리 모델·실제 집계 SQL·admin 타입 | PASS (로컬) |
| 공급자/관리자 상품 이미지·가져오기 | 직접 | OCR 이미지 단위, 확인된 actor 전달, AI 생성 실제 건수 기록 | 기존 업로드/가져오기 권한 유지. 상품 소유자/과거 생성자 추정 없음 | 실제 OCR 서비스·상품/가져오기 actor fixture·source host 대조 | PASS (로컬) |
| 관리자 TTS | 직접 | native 예산·미계측 audio 보류, 기존 binary 반환 | 기존 플랫폼 관리자 guard·voice/format/input validation 유지 | OpenAI audio·Gemini PCM/WAV·거부/성공 후 기록 장애 fixture | PASS (로컬) |
| KPA·매장·협력 모임·LMS | 간접 | 공통 Core retry/계측·가격 오류 allowlist 수정 | 업무 자료·권한·모델·도구·확인 경계 유지 | package/API build·전체 API 회귀 | PASS (로컬) |
| K-Cosmetics/PharmacyHub 폐기 runtime | 미사용 | 없음 | 폐기 route/menu/UI 생성 없음 | canonical·source 대조 | N/A |

### Route / role / capability check

- Route existence: 기존 HTTP route만 사용하며 신규 메뉴/route는 없다.
- Role guard: Home Neture 가입·이미지 분석 인증·상품 이미지/카탈로그 관리자/공급자 판정·TTS 플랫폼 관리자·관리 조회 guard 유지. 공개 research는 public read 문맥을 유지한다.
- Capability map: 모델/자료/실행 위험 판정·재개/완료 확인은 유지한다. AI가 게시·주문·삭제 권한을 얻지 않는다.
- Visibility/filter·empty group/block removal: UI/layout/메뉴 필터 변경 없음. 해당 없음.
- Error/receipt: admission 거부는 재시도/fallback 금지. transport 실패는 예산 보류 후 기존 허용 fallback, 성공 후 기록 장애는 결과 반환. native/legacy 로그에 동일 호출을 중복 집계하지 않는다.

### Smoke result

provider/DB transport를 fixture로 바꾼 실제 Express router·실행기·provider와 실제 집계 SQL을 검증한다. 실제 공급자 API·운영 계정·Windows·운영 DB·desktop/mobile 브라우저 smoke는 하지 않았다. UI/layout 변경이 없어 화면 검증 완료를 주장하지 않는다. 원본 운영 응답/credential/이미지/audio/검색어를 문서에 복사하지 않았다.

## 3. 계측 근거와 한계

- [Google GenerateContent protocol](https://github.com/googleapis/googleapis/blob/master/google/ai/generativelanguage/v1beta/generative_service.proto): prompt/candidates/thoughts/tool-use/total token 필드와 검색 metadata를 원문 proto에서 대조했다. cached prompt는 이미 prompt count에 포함되므로 다시 더하지 않는다. 사고·도구 입력을 후보 token만으로 누락하지 않는다.
- [OpenAI Speech protocol](https://github.com/openai/openai-node/blob/master/src/resources/audio/speech.ts): 기존 audio 응답은 binary transport다. 임의로 byte→audio token을 추정하지 않고 usage 미반환 예산을 보류한다.
- [Google Vision protocol](https://github.com/googleapis/googleapis/blob/master/google/cloud/vision/v1/image_annotator.proto): 이미지 annotation 요청이며 OCR 문자열 수를 과금 단위로 쓰지 않는다. 성공했으나 문자 없는 이미지도 처리 이미지 1건이다.

위 공개 원문은 프로토콜 확인 근거이며 현재 가격/모델 가용성·외부 계정 권한·실제 invoice 검증의 근거가 아니다. 검색 정책 예산과 audio 예산을 upstream에서 강제할 수 있는 결제 상한으로 소개하지 않는다. 실제 관측값이 추정 예산을 초과하면 원장에 실제 계측을 남기고 경고한다. 사용량이 빠지면 기존 보류/reconcile을 이용한다.

## 4. 검증 기록

| 검증 | 실제 결과 |
|---|---|
| 환경 | Node 22.18.0 / pnpm 10.25.0. frozen lockfile·ignore-scripts 설치, 테스트용 better-sqlite3 로컬 재빌드 성공. 운영 credential 미사용 |
| 공통 package·API 타입/tsc/bundle | `pnpm run build:packages`, 최종 보완 후 API `type-check`·`build`·database backup→`build:api`→restore 성공. database 산출물 2,400개 hash 일치와 main/migrate 구문 검사, 주요 수정 5개 소스와 번들 source map 일치 확인 |
| 회계·집계 SQL·native host focused | 최종 보완 후 8 suite/147 tests PASS. 가격/단위·이미지/PDF·화면 4 factory·검색·OCR·음성·누락/정산 장애·Qwen fallback·Core retry·성공/실패 중복·미확정 집계 검증. 전체 결과와 중복 합산하지 않음 |
| 전체 API 회귀 | 최종 고정 실행: 583 suite/9,384 tests PASS, 52 suite/802 tests skipped, 실패 0. 이후 아래 작은 보완은 8 suite/147 tests로 별도 재검증 |
| 소비 웹 타입/회귀 | admin-dashboard·web-neture·web-hospital-pharmacy 타입 검사 성공. Neture 첨부 10건·병원약국 파일 선택 20건 통과 |
| 변경 lint | TypeScript 변경 41개 파일 오류 0·기존 미사용 `_dataSource` 경고 1. 마지막 키 테스트 fixture 수정 파일도 재확인 |
| 문서/링크·staged scope | 변경/신규 문서 9개 민감정보 패턴 0, 추가한 로컬 링크/절 17개 존재 확인. path-specific stage·허용 경로 50개와 staged scope·공백 검사로 인계 범위 제한 |

실제 집계 SQL은 SQLite의 메모리 DB에서 실행하며 PG cast/bind만 변환했다. native/legacy 중복, enum 밖 provider, 단위 기반 정상 0-token·미확정 0·crash 보류를 확인한다. PostgreSQL 서버는 제공되지 않아 guarded 실제 PG 검증을 PASS로 합산하지 않는다. 예약/정산 조건은 실제 서비스와 격리 fixture로 검사한다.

첫 전체 실행은 보완 작업 중에 시작되어 가져오기 actor·TTS 테스트 호출·HTTP 기존 오류 코드 기대값 3건이 실패했다. 해당 소비처를 수정한 뒤 3 suite/87 tests 재검증 및 코드 고정 상태의 전체 회귀는 통과했다. 첫 실패 실행을 성공한 전체 검증으로 합산하지 않는다.

전체 회귀 이후 실패 native 로그와 receipt의 요청 ID를 일치시켜 중복 집계를 막고, 키가 없는 검색은 예약 전에 거부하며, legacy Gemini 블록의 tool 입력 토큰도 계측값에 포함했다. 실패 로그→receipt 상관관계와 실제 SQL 집계·키 미연결 무호출·tool/thinking 계측을 최종 8 suite/147 tests에서 확인했다. 추가한 키 미연결 테스트의 ESM mock 초기 오류도 수정 후 재실행했다. 전체 9,384건과 최종 focused 147건은 서로 다른 실행 결과다.

## 5. 인계

이번 개발은 commit/push 인계이며 PR 생성/CI 운영·main 병합·배포·운영 가격/한도 변경은 미실행이다. 새 branch는 선행 `d11cb4afa1`도 포함하므로 중복 통합 PR을 만들지 않고 이 branch의 최종 HEAD를 통합 대상으로 검토한다. 기존 텍스트 branch/worktree를 임의 삭제하지 않는다.

push 직전 read-only fetch에서 main은 `23717b6dc0`으로 이동했다. 작업 기준 이후 변경은 운영자 초대 검증 문서 2개이며 이번 소유 경로와 겹치지 않는다. 개발 공간에서 자동 merge/rebase하지 않았으며 통합 담당이 최신 main·CI·가격 준비를 재확인한다. 기준 checkout의 `work` branch/`1b158cf4c1`·clean 상태도 변경하지 않았다.

문서 정합: 전체 AI 구조·사용 흐름 baseline·전체 TODO·선행 텍스트 TODO·SETUP·신규 개발자 안내에서 현재 branch와 운영 준비 경계를 연결한다. 선행 TODO/CHECK의 상태 표기만 문서 생명주기의 `COMPLETED`로 맞추고 이전 검증 기록은 유지했다. 이전 main/운영 배포 증거와 이번 로컬 검증을 혼동하지 않는다.

WORKTREE_DISPOSITION: `/workspace/o4o-wt/ai-specialized-runtime-accounting` · `wo/ai-specialized-runtime-accounting` · base `4ee5a8ecda` · prerequisite `d11cb4afa1` · main integration/PR CI/deployment 미실행 · `KEEP` (미병합 push 인계·후속 수정용).
