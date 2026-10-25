# 내 매장 다국어 상담 통합 TODO

> **상태**: COMPLETED — 로컬 검증·작업 branch push 범위
> **작성일**: 2026-10-18
> **범위**: 관리자·My Home의 기능 설정을 재사용하는 내 매장 상담, 검증·commit·push

## 코드·문서 대조

- [x] 선행 `9af97a9413`은 main 미반영. 최신 main `716504eaf2`에서 후속 branch를 만들고 선행 branch를 의존성으로 병합했다. 운영/main 병합은 실행하지 않는다.
- [x] 공통 제공 설정은 기본/유료/사업 합집합, 직원별 허용과 교집합이다. 신규 기능은 명시적으로 설정하며 기존 직원에 자동 부여하지 않는다.
- [x] 기존 AI Core Extension·CONTENT_TRANSLATION 정책·플랫폼 부담·사용량/한도를 재사용한다. provider 직접 호출·새 결제/Task/상담 원장·schema는 만들지 않는다.
- [x] 기존 상품 콘텐츠 번역은 저장형 HTML 자료용이다. 상담은 문장 단위 양방향 plain text 번역으로 분리하고 원문/번역을 저장·로그·브라우저 저장소에 남기지 않는다.
- [x] 비전문 직원의 한국어 응답은 검토된 짧은 매장 안내 문구로 제한하고 약사 연결을 제공한다. 고객 발화는 한국어로 번역하며 의료 답변/추천을 생성하지 않는다.
- [x] `kpa_pharmacist_profiles.license_verified`는 있지만 운영 확인 화면은 확인되지 않는다. 초기 구현 가정은 기존 My Home 경영자 확인이며 공식 면허 검증 표시는 만들지 않는다. 유료/사업 가입 또는 소유만으로 약사 자격을 간주하지 않는다.
- [x] 문자 양방향 번역·고객용 큰 글씨 표시를 기본으로 진행한다. 초기 문자 상담으로 진행하며 음성은 이번 범위에서 제외한다.
- [x] 메뉴·직접 URL·API는 공통 자격과 조직/직원 경계를 함께 확인한다. AI 호출 완료 뒤에도 자격을 재확인한다.

## 전체 실행

- [x] 기본 약사 상담·매장 직원 응대·매장 약사 상담을 기능 목록에 추가하고 관리자/My Home 선택에 반영.
- [x] 초기 My Home 경영자 확인과 기존 검증 프로필 조회를 연결하고 사용 확인·기능 허용을 분리.
- [x] 짧은 문장 번역 Extension·입출력/언어 검증·기존 AI 한도/이력 연결·안전한 오류 응답.
- [x] 상담 context/번역/직원 안내 API: 세션·매장·제공 기능·직원 허용·전문인 확인, 호출 후 권한 회수 재검증.
- [x] 내 매장 `다국어 상담` 메뉴와 3가지 사용 모드·문자 입력·언어 선택·고객에게 크게 표시·새 상담 초기화.
- [x] 계정/매장/모드/언어 변경·화면 종료 시 요청 무효화/늦은 응답 폐기, 대화·입력 초기화. 초기 버전은 문자 상담이다.
- [x] 관리자/직원 설정→상담 실행 SQL/HTTP, 비전문 경계·타 매장 차단·중복/종료·잘못된 입력/모델 응답·AI 실패 회귀 검증.
- [x] PC/모바일 화면·직접 URL·오류/재시도 확인, 관련 단위/통합 테스트·타입/빌드·문서 검사.
- [x] 정본·CHECK 정합 후 경로별 commit·push. 실계정/실제 AI 호출 및 운영 설정/배포는 실행한 범위를 구분해 보고.

검증 결과와 통합 인계: [CHECK](../checks/CHECK-O4O-PHARMACY-MULTILINGUAL-CONSULTATION-V1.md).

기준: [약국 설계 §15-7](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md), [AI Core + Extension](../architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md), [My Home](../baseline/O4O-MY-HOME-CANONICAL-V1.md), [Store 접근](../baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md).
