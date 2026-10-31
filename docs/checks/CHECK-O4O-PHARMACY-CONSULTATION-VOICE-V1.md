# 다국어 상담 음성 입력·읽어주기 검증

> 현행 안내(2026-10-31): 협업체 이름은 **드럭스토어형 약국**, 현재 주소는 `https://drugstore.neture.co.kr`다.
> **과거 증적의 대상 보존:** 아래 “해당 협업체(당시 구명칭)”·“당시 협업체 구호스트”는 개명·주소 변경 전의 관측 대상이다. 아래 성공·실패·배포 결과를 현재 이름·주소의 운영 검증으로 읽지 않는다. 사용자 지시로 이전 표시명·주소 문자열은 재게시하지 않으며, 문서 경로와 기술 키의 현행 참조 정합은 과거 재실행을 뜻하지 않는다. 당시 원문·실제 호스트 식별자는 기존 Git 이력에서 확인하며 이력을 변경하지 않는다.

> **상태**: COMPLETED — 코드·문서·로컬 검증·작업 branch push 범위
> **작성일**: 2026-10-18
> **작업**: [TODO](../work-orders/TODO-O4O-PHARMACY-CONSULTATION-VOICE-V1.md)

## 사용자 답변 반영

사용자는 첫 상담 버전에 음성 입력·읽어주기를 포함하고, 약사 사용 확인은 소규모 약국의 경영자가 관리하도록 정했다. 선행 문자 상담 `36bd4b8d14`의 동일 WO·branch를 유지해 후속 반영한다. My Home 경영자 확인은 유지하며 중앙 면허 심사·직원 등급·관리자 설정 항목을 추가하지 않았다.

- 마이크는 버튼을 눌러 시작/마친다. 한국어 직원 문장 또는 선택 언어 고객 문장을 입력란에 반영하고 확인·수정 후 번역한다. 자동 번역·자동 재생·상시 녹음은 없다.
- 비전문 직원의 outgoing 응답은 기존 고정 문구다. 해당 방향에는 마이크/자유 입력을 제공하지 않으며 고객 발화 입력은 허용한다.
- 번역 결과와 고객용 큰 화면에 읽어주기/중지를 제공한다. 고객 방향은 선택 외국어, 직원 방향은 한국어다. 매 클릭에 최신 기기 음성 목록을 읽고 같은 언어 음성을 선택한다.
- 7개 locale는 ko-KR, en-US, zh-CN, ja-JP, vi-VN, th-TH, id-ID다. 기기/브라우저가 해당 음성 언어를 지원한다는 보장은 아니다. API 미지원·권한 거절·마이크 없음·무음·언어 미지원·네트워크/재생 실패는 안내하고 문자 사용을 유지한다.
- 계정/매장/언어/모드/방향 변경·새 상담·pagehide·백그라운드 전환은 마이크/재생을 중지한다. 중지한 인식/재생의 늦은 콜백은 화면에 반영하지 않는다. 인식 중 번역과 번역 중 새 인식을 막고 인식 문장도 1,000자로 제한한다.
- 브라우저 Web Speech API만 추가했다. [MDN SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)의 서버 기반 인식 안내를 대조했다. 브라우저 음성 서비스로 음성/문장이 전달될 수 있음을 클릭 전에 알린다. O4O에 음성 파일을 업로드/저장하지 않고 확인한 문장만 기존 번역 API로 보낸다.
- 새 서버·AI 음성 provider·schema·dependency·API 계약·권한 key 변경은 없다. 기존 상담 기능 자격·직원 허용·호출 후 자격 재확인은 유지한다.

## 검증

| 검증 | 결과 |
|---|---|
| 음성 통합/사용 흐름·lifecycle·오류·locale | 1 file / 17 tests PASS |
| 기존 상담·기능 판정·직원 지원 회귀 | 3 files / 13 tests PASS |
| 이번 실행 합계 | 4 files / 30 tests PASS |
| Store 타입 포함 build | `pnpm --fail-if-no-match --filter store-web build` PASS |
| 변경 TS/TSX ESLint | 오류/경고 0 |
| PC/모바일 Chromium | 1440/390px, 관리자·My Home·상담·고객 화면 54개 확인 PASS, 화면 오류·가로 넘침 0 |
| 문서 민감정보 검사·diff | 패턴/오류 0 |

단위/브라우저의 음성 인식·읽어주기는 합성 Web Speech API를 사용했다. 실제 React 화면에서 버튼·입력 검토·언어 선택·서버 요청·읽어주기 중지·권한 거절·전환 후 늦은 결과 폐기를 확인했다. native dialog와 PC/모바일 레이아웃도 확인했다. 첫 검증에서 jsdom의 미구현 dialog는 테스트 fixture로 보완했고 테스트 코드의 ES2020 미지원 Array.at 사용을 제거한 뒤 통과했다. 브라우저 fixture의 hidden dialog 중복 text locator도 접근 가능한 status로 보완했다.

실제 마이크 권한창·음성 인식 서비스·스피커 소리·기기별 지원 언어/발음 품질·실제 AI 호출·실계정 로그인은 검증하지 않았다. 실기기 검증은 HTTPS에서 마이크 허용/거절, 한국어 및 사용할 외국어 입력 검토, 양방향 읽어주기·중지, 언어/화면 전환 중지를 확인해야 한다. 기존 API/SQL·관리자/My Home의 선행 검증은 [상담 CHECK](CHECK-O4O-PHARMACY-MULTILINGUAL-CONSULTATION-V1.md)에 보존하며 이번에는 변경한 Store 범위를 재검증했다.

## 소비처와 통합 인계

- 상담 페이지와 그 전용 hook만 변경했다. Pharmacy·Drugstore·CarePharm·Cooperative는 같은 Store 상담 기능을 사용한다. 공통 메뉴/route/권한/관리자/My Home 코드·비약국 Store에는 변경이 없다. literal 소비처는 상담 페이지 테스트와 App route import이며 신규 hook은 상담 페이지만 소비한다.
- branch `wo/pharmacy-multilingual-consultation`, 후속 기준 `36bd4b8d14`, 선행 서비스 설정 `9af97a9413` 포함. fetch 시 main `f8a849ba6e`를 확인했으며 자동 통합하지 않았다. 통합 담당은 최신 main 병합·관련 재검증 후 PR CI/리뷰·병합·배포를 진행한다.
- 운영 설정/DB/배포는 변경하지 않았다. 미커밋 변경 없이 후속 commit을 같은 branch에 push하며 worktree는 `KEEP`한다. 환경 도구/의존성은 기존 설치를 재사용하므로 환경 설정 초안 변경은 없다.

문서 정합: 사용자 답변에 맞춰 약국 설계·My Home 정본과 새 TODO/CHECK를 갱신했다. 앞선 문자 상담의 완료 기록과 canonical index는 변경하지 않았다.
