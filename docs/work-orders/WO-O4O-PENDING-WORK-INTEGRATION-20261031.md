# O4O 미반영 작업 통합 · 2026-10-31

> 현행 안내(2026-10-31): 협업체 이름은 **드럭스토어형 약국**, 현재 주소는 `https://drugstore.neture.co.kr`다.
> **과거 증적의 대상 보존:** 아래 “해당 협업체(당시 구명칭)”·“당시 협업체 구호스트”는 개명·주소 변경 전의 관측 대상이다. 아래 성공·실패·배포 결과를 현재 이름·주소의 운영 검증으로 읽지 않는다. 사용자 지시로 이전 표시명·주소 문자열은 재게시하지 않으며, 문서 경로와 기술 키의 현행 참조 정합은 과거 재실행을 뜻하지 않는다. 당시 원문·실제 호스트 식별자는 기존 Git 이력에서 확인하며 이력을 변경하지 않는다.

> **상태**: ACTIVE · **작성일**: 2026-10-31 (Asia/Seoul)
> **근거**: 사용자 요청 — 미병합 파일 모두 통합, 병합된 변경 배포.
> **기준 main**: `0ab734a68c599e63e00c6f4d972243b77df03416`

## 1. 전체 조사와 범위

실제 GitHub 원격 224개 branch와 PR 이력 897건, 로컬 기존 worktree 6곳을 읽기 전용으로 대조했다. 열린 PR·미커밋 변경·진행 중 Git operation은 0건이었다. 제한된 fetch refspec으로 main 포함을 오판하지 않도록 전체 remote head를 명시적으로 가져왔다.

조상 관계상 미반영 30개를 재분류했다. 동일 patch 5개, squash 등 기존 병합 3개, 기존 종료·대체 판정 19개, 실제 추가 통합 대상 3개다. 동일 patch·기존 병합·종료 판정은 아래 근거 및 [이전 통합 조사](WO-O4O-PUSHED-WORK-INTEGRATION-20261027.md)와 대조한다. 이들을 모두 새로 병합했다고 보고하지 않는다.

| 실제 통합 대상 | 반영 범위 |
|---|---|
| `wo/cross-service-ui-ux-standardization` | 서비스·공간 전환기, 공통 header/footer, Hero 접근성·운영 presentation, 소비처 검증·문서 |
| `wo/chatgpt-registration-preparation-20261027` | 승인된 등록 소개·로고·공개 제출용 template 준비 자료. 실제 제출·OAuth·관리자 설정은 실행하지 않음 |
| `wo/unified-operations-workspace` | 기존 PR #878의 운영 배포·검증 후속 기록. 새 migration/권한 확대 없음 |

기존 19개 종료·대체 branch 전체를 복원해 퇴역 기능·옛 권한·철회한 테스트 데이터 보존 계획·운영 원문 JSON을 재도입하지 않는다. 이 분류는 신규 기능 제외를 숨기는 용도가 아니며, 현재 main과 각 변경의 내용·종료 기록을 확인한 결과다. 원격 branch와 기존 worktree는 보존한다.

## 2. 통합 TODO

- [x] 전체 remote head·PR·기존 worktree 상태 조사, patch·종료 판정·merge preview 비교
- [x] 실제 미반영 3개와 기존 27개 분류, 이전 검증·운영 반영 기록과 현재 상태 구별
- [x] 최신 main의 전용 branch에 원래 이력을 보존해 3개 작업 통합
- [x] 대표 홈 import 충돌 해소, 현행 일상 업무 배치·서버 자료 전환·상담 복구 보존
- [x] 공통 모듈 소비처 전수 대조, 기존 UI CHECK의 Consumer Impact Matrix와 현행 정본 재확인
- [x] frozen 설치·공통 package build·영향 서비스 타입/build·관련 단위 회귀·문서/JSON·민감정보 검사
- [x] 실제 Chromium desktop/mobile 합성 API smoke. 로그인·서비스 전환·Hero·법정 고지와 기존 Main 업무 흐름 확인
- [ ] 자체 diff 검토·경로 지정 commit/push·통합 PR·최종 HEAD CI/Codex 지적 보완
- [ ] 정상 PR merge·main CI·Delivery/필요 시 일반 Promote·서빙 결과 및 공개 HTTP 검증
- [ ] 최종 통합/기반영/보존 항목, 검증 실패·미실행 범위, 배포 결과 인계

## 3. 두 번째 TODO 점검

구현 전 각 원래 WO/CHECK와 공통 모듈 정본을 다시 대조했다. UI 작업은 Neture·강의·Store 직접 소비와 약국 협력사업·분회·협동조합의 간접 Hero/CSS 소비를 포함한다. 공유 auth-react/types 변경을 단일 서비스 build만으로 완료하지 않는다. 이미 퇴역한 서비스는 복구 대상이 아니다.

원래 UI branch 이후 main에서 바뀐 Main 일상 업무 순서·별도 데이터 정비 폼 제거·서버 자료 authority를 유지하는 것을 충돌 검토와 회귀 조건에 추가했다. ChatGPT 준비 자료는 공개 저장소용 placeholder·template이며 외부 제출·연결 활성화·유료 AI 실행의 승인이 아니다. 통합 운영자 후속 문서는 이미 실행한 migration/배포 기록이고 이번에 재실행하는 지시가 아니다.

이번 소스 통합에 새 DB schema·dependency·lockfile·배포 설정 변경은 없다. 실제 계정 권한 변경·업무 데이터 생성·유료 AI·ChatGPT 제출은 하지 않는다. 실제 운영 migration 등 새로운 위험 변경이 필요해지면 실행 전에 구체적인 범위를 구분한다.

## 4. 검증·배포 결과

최신 main `0ab734a68c` 위에서 원래 branch 세 개를 normal merge했다. UI merge의 대표 홈 import 충돌은 `AiRequestInput`·`workDataRequest`·공통 탐색 import를 모두 보존해 해소했다. 새 UI가 기존 일상 업무·서버 authority·상담 복구를 덮어쓰지 않았음을 기존 테스트와 합성 브라우저로 확인했다.

| 통합본의 실제 실행 | 결과 |
|---|---|
| Node 22.18.0 / pnpm 10.25.0, frozen offline install, `build:packages` | PASS |
| 전체 `type-check:frontend`와 API `type-check` | PASS |
| auth-react / shared-space-ui / ui / store-ui-core Vitest | 245 / 222 / 40 / 156 PASS |
| Neture / 강의 / 내 매장 Vitest | 1,493 / 83 / 896 PASS |
| 약국 협력사업 / 분회 / 협동조합 Vitest | 169 / 25 / 85 PASS |
| HomePresentation API Jest | 24 PASS; 위와 합계 3,438건 |
| 영향 웹앱 6개 production build | PASS |
| `scripts/quality/ui-shell-smoke.mjs` | PC 1280 / 모바일 390 × 대표 홈·공통 shell·강의·내 매장 = 8개 PASS |
| `scripts/checks/main-automation.browser.mjs` | PC·모바일 2개 PASS; PC→서버 전환·자동 저장·다른 기기 서버 조회·수량/품절 이력·내보내기 |
| 변경 TS/TSX/MJS ESLint | 오류 0. 기존 SupplierSpaceLayout의 hook dependency 경고 1개 유지 |
| 변경 문서 민감정보·공개 JSON 2개 parse·diff whitespace | PASS |

Main 브라우저 스크립트의 첫 cold-start `networkidle` 시간 초과 뒤, 기존 체크박스를 찾는 오래된 단계가 현재 main의 서버 전환 버튼과 맞지 않는 것을 확인했다. 문서화된 현재 계약에 맞게 readiness를 실제 UI locator로 기다리고 합성 API에 `local → transferring → server` 상태를 반영했다. 사용자 동의·동일 원본 PC 식별·전환 이후 PC 재조회 없음·모바일 서버 자료 지속 사용을 검증한다. 업무 코드를 과거 체크박스로 되돌리지 않는다.

합성 검증은 실제 로그인·운영 계정 권한·PC 연결 프로그램·실제 주문 사이트·유료 AI를 검증한 것이 아니다. 이번에는 기존 환경 테스트 계정의 로그인 실패 결과를 재사용해 정상 로그인으로 보고하거나 암호를 반복 추측하지 않는다. 실제 사업 데이터 변경은 없다.

최종 CI·리뷰·병합·배포 SHA와 서빙 결과는 같은 통합 PR에 후속 기록한다. 이전 branch의 과거 PASS·차단 기록은 보존하고 이번 확인과 구분한다.

## 5. 기반영·보존 판정 근거

동일 patch 5개: `wo/ai-model-delete-usability`, `wo/chatgpt-domain-verification`, `wo/o4o-proprietary-license-notice-v1`, `wo/pharmacy-coop-foundation`, `wo/pharmacyhub-purge-gate-fixture-isolation`. 전체 원격 head의 `git cherry`로 현재 main의 patch와 대조했다.

기존 병합 3개: `wo/frontend-design-accessibility`(PR #560), `wo/my-home-document-alignment`(PR #500), `wo/neture-host-static-seo`(PR #571). GitHub PR의 최종 head가 현재 원격 branch head와 같고 merged 상태임을 확인했다. 나머지 종료·대체 19개는 [이전 통합 조사 §branch 판정](WO-O4O-PUSHED-WORK-INTEGRATION-20261027.md)에 기록된 현행 대체·제외 근거와 각 diff를 재대조했다. 원격 branch의 비조상 관계 자체를 기능 누락으로 계산하지 않는다.

## 6. 문서 정합

기존 공통 UI CHECK에 이번 최신 main 통합 검증을 후속 절로 추가한다. ChatGPT 준비 자료와 통합 운영자 배포 기록은 원래 승인·실행 시점의 기록으로 유지한다. 새 통합 WO에서 이번 실행·이전 기록·남은 실제 계정/현장 검수의 경계를 명시한다.


## 7. PR #900 원격 리뷰 보완

[통합 PR #900](https://github.com/Renagang21/o4o-platform/pull/900)의 첫 Codex 리뷰는 독립 사업 참여자가 일반 `service_memberships` 없이 전환기의 이용 서비스에서 누락되는 문제를 지적했다. 이미 읽는 `/neture/home/entry.businesses`를 사용하고 `pharmacy → kpa-society`로 연결한다. `canParticipate`가 사업 이용 판정의 우선 출처이며, 신청·정지·거절·탈퇴·종료 상태나 자격이 확인되지 않은 active 원장을 이용 권한으로 승격하지 않는다. 약국 개인 회원의 기존 진입과 별도 handoff alias가 없는 해당 협업체(당시 구명칭)의 공개 진입을 유지한다.

사업 원장 전용 참여·약국/CarePharm handoff·여섯 비참여 상태·기존 개인 가입·잘못된 응답에 관한 회귀 9건을 추가했다. auth-react 전체 254건 PASS이며 다른 초기 테스트와 중복을 빼면 통합 검증 합계는 3,447건이다. PC·모바일 8개 브라우저 조합에서 사업 전용 참여 표시를 확인하고 모바일에서는 약국 handoff 요청을 실제 UI로 검증했다. 보완 후 전체 frontend typecheck와 영향 웹앱 6개 build 재실행 PASS. 마지막 결과는 같은 PR의 최종 HEAD 검증 기록을 따른다.


## 8. PR #900 운영자 sticky sidebar 리뷰 보완

두 줄 GlobalHeader의 실측 높이가 기존 운영자 sidebar 기본 offset 80px보다 커지는 문제를 추가 확인했다. 공통 `OperatorAreaShell`의 기본 offset과 현행 `SupplierOpsLayout`을 `--o4o-global-header-height + 1rem`에 맞췄다. 기존 64px 헤더의 fallback과 호출자가 지정한 offset, 헤더 없이 직접 쓰는 `DomainIASidebar`의 기본 24px는 보존한다.

공통 shell의 실제 소비처는 Neture operator/admin·서브도메인 operator/admin·CarePharm wrapper다. 중앙 Admin은 DomainIASidebar를 직접 소비하며 메뉴 표시/이동 회귀 3건을 재실행했다. Neture의 관련 wrapper 회귀 35건과 production build 재실행 PASS. 다른 영향 헤더 소비처도 고정 offset을 검색했다. 내 매장 주문 요약은 relative 헤더 아래의 별도 sticky 요소, AGAppLayout은 자체 고정 64px 헤더 계약이므로 이번 가림 문제의 소비처로 오인해 바꾸지 않는다.

공통 UI 합성 브라우저에 운영자 화면을 추가해 10개 PC/모바일 조합 PASS. 실제 UI에서 긴 본문을 스크롤한 뒤 첫 메뉴가 sticky 헤더 아래 16px에 남는지 측정하고 모바일 메뉴 접근을 확인했다. 외부 API·운영 소재 게시·실계정은 사용하지 않았다. 단위 테스트에 같은 class 문자열만 단언하는 것으로 대신하지 않는다. 전체 원격 CI와 Codex는 새 보완 HEAD에서 다시 확인한다.


## 9. SonarCloud 보안·품질 보완

기존 HEAD `e1920f046a`의 CI Gate·API 세 shard·웹/Admin build·PostgreSQL·Windows·CodeQL은 통과했다. 별도 SonarCloud는 새 코드 보안 등급 D로 실패했다. 직접 분석 API는 403이어서 GitHub check-run의 실제 주석으로 원인을 확인했다. 공통 브라우저 검사 결과를 예측 가능한 임시 디렉터리에 쓰던 부분을 매 실행 `mkdtemp` 고유 디렉터리·0700 권한으로 바꿨다. `O4O_UI_SMOKE_OUTPUT`은 이제 결과 디렉터리의 prefix이고 실제 경로는 실행 로그에 출력한다.

사업 참여 상태 반영과 합성 API 응답을 작은 순수 helper로 분리해 복잡도를 낮추고, 이번 UI에서 중복된 auth-react import를 합쳤다. 서비스 원장·handoff·검사 assertion·직렬 브라우저 흐름과 품질 기준은 유지했다. 실제 외부 AI·운영 소재 게시는 실행하지 않는다. auth-react 254건과 보안 저장 방식을 포함한 실제 Chromium 10개 조합 재실행 PASS이며, 마지막 원격 결과는 같은 PR의 새 HEAD에서 확인한다.
