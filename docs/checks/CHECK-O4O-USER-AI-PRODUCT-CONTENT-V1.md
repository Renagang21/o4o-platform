# 사용자 주도 외부 AI 상품 콘텐츠 개발 검증·통합 인계

> **상태**: ACTIVE · **작성일**: 2026-10-26 · **최종 갱신**: 2026-10-26
> **범위**: [개발 WO](../work-orders/WO-O4O-USER-AI-PRODUCT-CONTENT-V1.md)의 1·2단계 코드·격리 검증 및 추가 지시에 따른 병합 전 PR 준비. 실사용·main 병합·운영 배포는 별도
> **구조 계약**: [기존 외부 AI 설계 §10](../design/DESIGN-O4O-EXTERNAL-AI-CONTENT-CONNECTION-V1.md#10-매장-상품별-소비자-콘텐츠-초안)

## 1. 개발한 기능과 보호 경계

같은 OAuth/MCP에 `save_product_content_draft`, `get_product_content`, `update_product_content_draft`를 연결했다. 기존 8개 도구와 `o4o:read`/`o4o:draft:write`, 일반 destinations, 연결·계정·업무 권한·quota·멱등성을 재사용한다. 별도 AI 엔진·회원·원장·migration·의존성을 추가하지 않았다. 공급자·사업·커뮤니티의 기존 회귀도 함께 실행했다.

상품별 소비자 안내는 기존 `store_multilingual_product_content_groups/pages`에만 저장한다. local/listing의 매장 소유·활성을 확인하고 기존 다국어 업무 기능 자격을 적용한다. 언어별 비공개 HTML 초안을 만들고 기존 페이지 덮어쓰기는 거부한다. 수정은 페이지 ID와 revision으로 하고 상품/언어/공개 상태를 받지 않는다. 공개키·published 언어·보관 그룹·비HTML 페이지는 외부 수정 대상에서 제외한다.

기존 웹과 상품 소유 확인·언어 페이지 저장 함수를 공유한다. 새 초안의 웹 API 재조회와 수동 웹 편집 후 MCP revision 충돌을 실제 격리 PostgreSQL에서 확인했다. 기존 일반 자료함·직접 등록 상품 detail_html·공급자 STORE 설명서의 저장 목적을 변경하지 않았다. 저장 ID와 상품/언어, groupId, revision, 기존 편집 URL을 반환한다. Store 진입 컴포넌트는 서버가 허용한 매장만 선택하고 상품별 편집기는 groupId/상품 일치를 다시 검사한다.

신규 상품 쓰기 감사는 `recordOperation`의 기존 `action_logs`에 같은 transaction으로 기록한다. 감사에 본문·토큰·사용자 이름을 넣지 않는다. 감사 실패 시 초안·그룹·멱등 기록이 모두 rollback한다. 빈 보안 이벤트 persist 함수나 24시간 재시도 기록을 장기 감사 원장으로 오인하지 않는다.

검증 중 기존 OAuth SDK의 custom raw IPv6 key에서 검증 경고가 발생했다. authorization/registration의 override 2개를 제거해 기존 Express 신뢰 proxy 판정 후 SDK 기본 IPv6 서브넷 키를 사용하도록 수정했다. 동일 /56의 서로 다른 IPv6 주소 21번째 등록은 429, 다른 서브넷은 201임을 실제 SDK HTTP로 확인했다. 운영 proxy 설정이나 SDK 검증을 끄지 않았다.

## 2. 실제 수행한 검증

| 검증 | 실행·결과 |
|---|---|
| 개발 환경 | Node 22.18.0 / pnpm 10.25.0, 새 자기 worktree에서 frozen install. lockfile 변경 없음 |
| 공통 의존성 | 저장소 의존 순서로 API·Store 웹 의존 패키지 빌드 |
| API 회귀 | `pnpm --filter @o4o/api-server exec jest --runInBand src/modules/external-ai/__tests__ src/middleware/__tests__/external-ai-opaque-fields.test.ts` — 5 suites / 48 tests PASS |
| 실제 PG·공식 SDK | `node scripts/dev/run-external-ai-fixture.mjs` — 69 cases PASS. 기존 54 + 상품 연결 14 + IPv6 1. 고정 loopback의 자기 PostgreSQL 15, 새 marker DB만 생성/정리, 삭제 후 DB 잔존 0 |
| 기존 웹·진입/언어 회귀 | Store workspace에서 `pnpm exec vitest run src/pages/ExternalAiDraftEntry.test.tsx src/pages/pharmacy/multilingual/workflow.test.tsx` — 2 files / 48 tests PASS |
| 타입 | API `build`의 전체 tsc 및 Store `pnpm exec tsc -b` PASS |
| 배포 빌드 | API tsup 번들·main/migrate/product worker entry 문법 PASS. compiled database 2,416개 파일 backup/restore hash 일치. Store Vite build PASS |
| lint | 변경 API 모듈·도메인 서비스·controller 검사: 소스 오류/경고 0. 기존 ESLintIgnoreWarning은 도구 설정 안내이며 이 작업에서 전역 설정을 변경하지 않음 |
| 공개 운영 읽기 | OAuth/보호 자원 metadata 2개 HTTP 200, 인증 없는 MCP GET 401. 실계정·업무 자료·OAuth 연결 생성 요청 아님 |

테스트를 위한 새 상품·메일·사용자 자료를 운영에 만들지 않았다. 초기 fixture 기대값이 기존 API가 노출하지 않는 publicKey를 가정한 점과 새 시험 데이터/연결이 기존 검사에 간섭한 점을 수정하고 최종 전체 69건을 재실행했다. 웹 최초 실행의 공통 dist 누락은 의존 빌드 후 해소했다. 실패를 완료 증거로 합산하지 않았다. 웹 빌드의 기존 큰 chunk 안내는 남는다.

## 3. 미실행·미확인 범위

- 사용자가 실사용 대상으로 시험 약국 경영자 계정과 현재 로그인된 본인 ChatGPT를 지정했다. 이 클라우드에는 사용자 브라우저 연결과 현행 `docs/local/TEST-ACCOUNTS.local.md`가 없다. 계정 정보를 요청하거나 과거 Demo로 대체하지 않았고 실제 ChatGPT 연결·쓰기·해제를 실행하지 않았다.
- 로컬 실제 browser 검사도 미실행이다. Chromium headless shell 다운로드가 `Domain forbidden` HTTP 403으로 차단됐다. 정책·proxy/TLS를 우회하지 않았다. 위 48건은 DOM 회귀이며 desktop/mobile browser 결과가 아니다.
- 운영 MFDS 근거 연결의 사실 정확성은 이번 격리 상품 검증으로 확정하지 않는다. 코드에서는 매장 상품 ID/source·소유·master 연결을 지키며 참고자료와 소비자 문안을 구분한다. 실제 자료 대조는 해당 권한과 원천 자료가 있는 실사용 검증 범위다.
- 개발 push 시점에는 PR·PR CI·Codex 원격 review를 실행하지 않았다. 이후 사용자의 병합 전 준비 지시로 PR 단계는 §5에서 이어간다. main 병합·배포·운영 DB write·설정/Secret·외부 계정 연결·공개 제출은 실행하지 않는다.
- 메일 서비스·메일 MCP 권한·카카오 채널/PlayMCP·SIWC를 구현 완료로 표시하지 않는다. 다음 순서와 외부 조건은 WO §4를 따른다.

## 4. 통합 담당 및 실사용 인계

착수 main은 `7e9c1c99d6`, push 전 확인 main은 `792b3d0f6e`다. 그 사이 5개 변경 경로는 별도 운영 정리이며 자기 코드·schema·lockfile과 중첩이 없다. 개발 branch는 `wo/user-ai-product-content`, 최초 push HEAD는 `6b33f85b8728debb90558f38202c891b0097b210`이다. 이후 사용자 지시로 PR 준비를 진행하며 최종 HEAD/push 결과는 완료 보고에서 전달한다. 같은 branch를 재사용하고 중복 PR을 만들지 않는다.

운영 API의 마지막 확인 근거는 기존 [Promote 40257061836](https://github.com/Renagang21/o4o-platform/actions/runs/40257061836)의 `c16d024420` serving 대조 성공이다. 이 개발의 새 코드가 운영에 있다는 뜻이 아니다. 현 시점의 정확한 Cloud Run revision 이름/트래픽은 이 환경에서 독립 조회하지 않았으므로 UNKNOWN이다. 조회 시 main `792b3d0f6e`의 production 상태는 partner의 LEVEL_3 보류였으며 전체 서비스 배포 완료로 해석하지 않는다.

실사용은 계정·시험 매장/상품·생성될 연결/초안·완전 정리 방법을 먼저 고정한다([AGENTS.md §5](../../AGENTS.md#5-위험-변경--사용자-확인)). 본인 ChatGPT에서 기존 8개 도구의 로그인→작업공간/상품→일반 비공개 초안→재조회/revision 수정→외부 매장 차단→해제를 확인한다. 완료된 Demo 기록은 반복을 요구하지 않으며 새 일반 계정 검증과 구분한다.

새 3개 도구는 통합·배포 후 확인한다. 검색 결과의 상품 ID/source와 실제 원천을 대조하고, 시험용 contentKey·언어로 소비자용 초안을 만들고, 반환된 페이지 ID로 재조회한다. 편집 URL이 올바른 매장·상품·언어를 열고 공개되지 않았는지 확인한다. 최신 revision 수정·기존 언어 보존·다른 매장 차단·해제를 확인한다. 자동 공개·메일 변경은 시험하지 않는다. 생성 업무 자료·연결 데이터의 정리 결과와 개인정보 보존 대상 접속/감사 기록을 구분한다.

문서 정합: ACTIVE 외부 AI 설계에 새 계약과 기존 destinations 호환을 반영했다. 기존 공개 제출 DRAFT의 8개 도구 목록은 실제 제출 전에 11개 계약과 대조해야 한다. 과거 CHECK/Demo 기록·canonical index·운영 공개 정책은 고치지 않았다.

WORKTREE_DISPOSITION: `wo/user-ai-product-content` / `/workspace/o4o-wt/user-ai-product-content`는 push 후 KEEP. 통합·실사용 후속 수정에 필요하며 다른 worktree는 보존한다.

## 5. 사용자 추가 지시: main 병합 전 준비

2026-10-26 사용자가 “main 병합 전까지 진행”을 지시했다. 기존 개발 branch에서 [PR #832](https://github.com/Renagang21/o4o-platform/pull/832)를 생성했다. 중복 PR 0건을 확인했고, main `792b3d0f6e`와 충돌이 없으며 auto-merge는 설정하지 않았다. 현재 ruleset을 실제 조회해 PR과 GitHub Actions `CI Gate`가 필수임을 확인했다. human approval 필수 수는 0이며 우회 권한을 사용하지 않는다.

최초 source `6b33f85b87`의 Codex 자동 code review는 완료·지적 없음이었다. [최초 CI](https://github.com/Renagang21/o4o-platform/actions/runs/40271479524)와 [CodeQL](https://github.com/Renagang21/o4o-platform/actions/runs/40271479572)는 해당 HEAD의 실행 기록이며 이후 수정 HEAD의 성공 증거로 대신하지 않는다. 최종 HEAD의 CI·품질·리뷰·미해결 thread와 main 대비 상태는 PR의 실제 검사 및 완료 보고에서 확인한다. 취소되거나 superseded된 실행을 PASS로 합산하지 않는다.

병합 전 자체 검토에서는 신규 fixture의 문자열 정렬 두 곳에 비교 함수를 명시했다. 테스트 자료의 영문 메타데이터 키 비교이며 상품 저장·권한·배포 동작은 변경하지 않는다. 문서 민감정보·링크·staged 범위와 fixture 문법을 재확인하고 같은 PR에 반영한다.

후속 `260eb9fbc1`의 Sonar check `121408800495`는 신규 Security B로 실패했다. GitHub annotations에서 이번 변경의 16개 지적을 확보했다. 시험용 Express 서버의 버전 응답 헤더를 제거하고 HTTP에서 헤더 부재를 검증한다. 독립된 공개 상태 시험·정리 대상은 대상별 Promise로 묶고, IPv6 한도 경계 검사는 Promise chain으로 응답 순서를 유지한다. 감사 인자는 식별자 DTO로 묶어 본문 없는 메타 계약을 유지하고 React props는 readonly로 명시한다. 규칙 제외·등급 변경 없이 수정한 최종 HEAD에서 검증한다.

`260eb9fbc1`의 전체 CI `40272034057`·CodeQL `40272034012`와 Codex code review는 성공/지적 없음이었으며 Sonar 실패는 별도로 수정했다. 수정 후 로컬 API 48·Store DOM 48·실제 PG/SDK 69건과 타입/lint가 다시 통과했다. 69건에는 독립 시나리오 병렬 실행·순차 한도 경계·응답 헤더 부재·감사 rollback 검증이 포함된다. 시험 DB 삭제 후 잔존 0을 확인했다. 최종 커밋의 외부 검사 결과는 PR 상태와 완료 보고에서 따로 확정한다.

수정 source `39b05bba2f`의 Sonar check `121413699108`은 Quality Gate PASS, 신규 이슈 0·주석 0·Security Hotspots 0·신규 중복 0%였다. 검사 제외나 이슈 수용 처리로 통과시킨 결과가 아니다. 이후 main을 반영한 최종 HEAD의 검사도 따로 확인한다.

검토 중 main에 [PR #830](https://github.com/Renagang21/o4o-platform/pull/830)의 상담자료 저작 기능 `68268d19f6`가 반영됐다. 자기 변경 21개 경로와 직접 충돌은 없지만 공통 sanitizer·ProductDescriptionAssist·ProductEvidencePicker가 바뀌어 main을 자기 branch에 정상 merge했다. 자기 기능 파일의 내용 보존과 새 main 포함을 확인했다. main branch에는 쓰지 않았다.

새 저작 기능은 기존 `kpa_store_contents.content_json.productConsultation`과 상품 연결 원장을 사용한다. 이번 MCP 도구의 소비자용 `store_multilingual_product_content_groups/pages`와 다른 목적이다. 새로운 상담자료 원장이나 별도 제작 기반을 만들지 않는다. 전문/직원용 작성 맥락을 MCP로 확장할 때는 기존 `saveConsultationContent` 계약을 재사용할 대상이며 이번 소비자용 도구로 자동 전환하지 않는다. [저작 안내](../guides/products/O4O-STORE-PRODUCT-CONSULTATION-AUTHORING-V1.md)를 참조한다. 기존 strict sanitizer 함수는 그대로이고 추가 rich sanitizer는 별도 저작 계약이다. 편집 도움 컴포넌트의 새 controlled props는 optional이어서 기존 호출을 유지한다.

통합 후 API 6 suites / 58 tests(기존 48 + 상담자료 실제 PG 10), Store 6 files / 61 tests, MCP 실제 PG/SDK 69건과 API/웹 타입 검사가 통과했다. 새 PG 시험의 전용 DB 이름을 처음 잘못 지정한 실행은 변경 전 안전 가드에서 중단됐으며 PASS로 계산하지 않았다. 해당 시험이 요구하는 loopback `consultation_review` DB를 자기 container에 생성해 재실행했다. 종료 후 시험 schema와 두 시험 DB의 잔존 0을 확인했다. 새 main의 업무 메타 계약과 기존 MCP 소비자 페이지 저장을 서로 덮어쓰지 않는다.

이번 종료점은 병합 직전이다. main merge·auto-merge·운영 배포 dispatch·운영 데이터 시험은 실행하지 않는다. 실제 ChatGPT·desktop/mobile browser·MFDS 원천 검증의 위 미완료 범위도 유지한다. 사용자 지시 없이 이 제한을 배포 승인으로 확대하지 않는다.
