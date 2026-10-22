# 메가팜 협업체 운영 완성 검증

- 작성일: 2026-10-22
- 상태: 기능 PR #761 병합, 배포 전 기존 세션 호환 보완 중
- 작업: [WO](../work-orders/WO-O4O-MEGAPHARM-OPERATIONAL-COMPLETION-V1.md)
- 정본: [약국 설계 §15-9](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md#15-9-사업-운영-도구와-사업별-약관-2026-10-22), [My Home](../baseline/O4O-MY-HOME-CANONICAL-V1.md)

## 결과

사업별 법정정보·약관과 가입 동의, 담당 사업 월별 고객 요구, 직원 숙지 자료 선택을 기존 운영 화면·정책 테이블·태그에 연결했다. 새 DB 구조·역할·정책 엔진은 만들지 않았다. pharmacy·megapharm·carepharm·pharmcoop는 공통 neture 계정 세션을 사용하며 사업 가입 권한은 별도로 확인한다. 약사 상담은 해당 매장 경영자의 확인만 읽는다.

| 검증 | 결과 | 확인 범위 |
|---|---|---|
| API 선택 회귀 | 287 PASS | 협업체·정책 lifecycle·공통 세션·권한 판정. 선택 suite의 143개 별도 opt-in 테스트는 미실행 |
| 추가 격리 PostgreSQL | 68 PASS | 협동조합 개인 가입 23, 사업 신청/무료 직원·복수 제공·종료·유료 경영자 12, 기존 매장 commerce 26, 공급자↔매장 흐름 7 |
| operator-core-ui | 220 PASS | 기존 관리자·담당 사업 화면, 새 운영 패널·자료 체크 포함 |
| shared-space-ui | 165 PASS | 기존 서비스 동의 호환, 사업 문서 누락/부분 응답 차단 |
| 약국 앱 | 139 PASS | pharmacy/Mega 공동 앱의 가입·사업 범위·알림·인증 문맥 |
| Neture 앱 | 1,251 PASS | CarePharm 동의, My Home 직원 허용·전문인 확인 포함 |
| 협동조합 앱 | 70 PASS | 개별 조합 권한·신청·정책 참조 |
| 내 매장 앱 | 761 PASS | 공통 매장·상담·직원 지원 회귀 |
| PC·모바일 브라우저 | 74 PASS | 1440/390px. 사업 집계 실패/재시도·법정정보, 숙지 태그 저장, 관리자→My Home→상담·고객 화면, 음성 시작/중지/오류 |
| build/type-check | PASS | API 타입, admin·약국·Neture·협동조합·내 매장 production build |

API 선택 회귀에는 별도 격리 DB로 실행한 새 운영 API 8건과 담당 역할 SQL 검증이 포함된다. 실제 SQL/HTTP에서는 미설정 정책 503·다른 사업 403·다른 사업 문서 ID 404·구버전 동의 거절·동의/신청 원자 저장·본문 해시·신청별 연결 기록을 확인했다. 실제 문안 대신 example.test 계정과 합성 문서만 사용했다. 기본 DB URL이나 운영 자격 증명은 쓰지 않았다.

정적 점검: unsafe route 0건, migration contract 21 PASS, docs 민감정보 패턴 0건, git diff --check PASS. Lint ratchet은 기존 baseline 46 errors를 유지했다(신규 오류 증가 0).

## 공통 소비처와 정합

- generic 법정정보 controller의 기본 scope guard는 유지했다. 사업 adapter에서만 현행 담당 사업을 확인하고 불변 UUID 범위를 고정한다. 공개 generic enrollment API로 사업 adapter를 우회하지 못한다.
- 공통 동의 hook은 기존 서비스의 과거 빈 정책 호환을 유지한다. business 범위는 terms/privacy 두 문서·같은 버전을 요구한다. 약국 앱·CarePharm·개별 조합이 각 사업 endpoint를 사용한다. 공통 계정 약관은 별도다.
- 공통 자료 편집기는 staff-quick-guide만 선택/해제하고 다른 태그·20개 제한을 유지한다. 기존 약국·CarePharm·개별 조합 wrapper에 동일하게 적용된다.
- PR #760에서 제거한 KPA 운영·설문·매장 사본은 복구하지 않았다. OPEN 사업 독립 정비 WO의 카탈로그·기존 Store/내 매장 신청 정책 키·backend 잔여 정리·운영 데이터 삭제·인프라 이름 변경은 완료 범위에 포함하지 않았다.

## 운영에 남겨 둔 입력과 한계

실제 사업자가 확인한 법정정보와 약관 두 문서의 게시는 담당 사업 admin이 진행해야 한다. 문서가 없거나 부분 게시이면 신규 신청을 계속 차단한다. 운영 역할·사업 등록·유료 자격·실제 경영자의 약사 사용 확인은 테스트를 위해 생성하거나 바꾸지 않았다.

브라우저 API와 번역 응답은 합성이다. 실제 약국 PC/태블릿의 마이크 권한·인식 정확도·언어별 음성·스피커·소음 환경과 외부 AI 품질을 검증했다는 뜻이 아니다. Google Speech/Translation API·자동 결제·공용기기 직원 전환·교육 과제/담당자 체계는 추가하지 않았다. 상담 원문/번역 저장 정책도 바꾸지 않았다.

## Git·Delivery

전용 branch wo/megapharm-operational-completion, 기준 main 7dc02646da. 정상 PR·CI·리뷰를 통과한 뒤 병합·Delivery 결과를 기록한다. 새 migration이 없어 이 작업의 운영 DDL은 없다. [PR #761](https://github.com/Renagang21/o4o-platform/pull/761)에서 통합·배포 상태를 추적한다.

최종 교차 점검 보완: CarePharm 공개 정책만 business endpoint를 읽도록 loader의 명시적 serviceKey를 따른다. 같은 호스트의 공통 계정 재동의·My Home 약관은 neture 문서를 유지한다. 이 경우와 미게시 fallback 차단 회귀 3개를 추가했고, 관련 계정 gate/패널 테스트 및 Neture production build를 다시 통과했다.

문서 정합: 약국 설계·My Home·OPEN 독립 정비 WO에 현재 연결 범위와 남은 범위를 반영했다. 이전 COMPLETED 실행 기록은 수정하지 않았다.

## PR 교차 검증 보완

Codex P1(기존 Pharmacy handoff 세션 범위)을 반영했다. 기존 kpa-society 이동 대상은 pharmacy.neture.co.kr에서만 교환하는 고정 transport alias이며 최종 세션은 neture다. 기존 My Home·내 매장 링크를 유지하고, 다른 Origin의 교환·대표 Neture 토큰의 타 호스트 교환은 거절한다. CarePharm 전용 경로 제한도 유지한다.

Handoff·세션·로그아웃 관련 9 suite 142 PASS. 이 중 실제 격리 PostgreSQL 토큰 원장·client·교환 흐름 21개를 실행했고, 네 사업 호스트의 공통 계정 로그아웃과 다른 호스트의 Pharmacy 토큰 교환 거절을 확인했다. 이 검증은 앞의 API 선택 회귀와 일부 중복이다. 관련 shared-space-ui 165 PASS·API 타입·Neture build를 재검증했다.

계정 인증/카탈로그 소비처 대조: 공통 session scope와 회원가입 약관의 기존 기대값을 새 neture 계정 문맥으로 정렬했다. 서비스별 가입·과거 동의 원장을 바꾸지 않는다. 관련 21 suite 414 PASS(별도 opt-in 73개 제외).

CI 전체 회귀 보완: 첫 전체 실행에서 관리자 guard 인벤토리 2건과 provider 데모 응답의 과거 scope 기대값 5건이 실패했다. 사업별 주입 guard의 명칭을 requireLegalScope로 맞춰 기존 정적 인벤토리 인식을 유지했고 검사 예외는 늘리지 않았다. 데모 응답도 Pharmacy Origin의 neture scope를 검증하도록 정렬하고 일반 사용자 provider 응답에도 Pharmacy Origin을 추가했다. 수정 후 관련 8 suite 107 PASS·API 타입 PASS. 나머지 로컬 전체 shard 1/3·3/3의 실패는 이 두 파일뿐이었다. 최종 CI는 수정 HEAD에서 다시 실행한다.

## 배포 전 기존 세션 종료 호환

배포 이전에 발급된 pharmacy의 kpa-society 세션 및 pharmcoop의 coop 세션도 사용자 로그아웃 시 서버에서 종료돼야 한다. Origin의 새 neture 판정만 적용하면 기존 서명 scope와 달라 서버 종료가 거절되는 경로를 확인했다. 각자의 정확한 기존 호스트에서 로그아웃할 때만 원래 서명 scope와 브라우저 ID로 폐기하도록 보완했다. 일반 Neture·다른 사업·서로 뒤바뀐 legacy scope는 거절한다. 신규 세션 발급은 계속 neture이며 계정/사업 가입이나 권한에는 예외를 주지 않는다.

관련 handoff/세션/로그아웃 128 PASS(이번 실행의 별도 PostgreSQL opt-in 21건은 미실행, 앞선 SQL 21 PASS는 유지), API 타입 PASS. 새 양성 2건·교차 Origin 거절 5건을 추가했다. 동일 WO의 후속 PR에서 최종 CI·병합·배포를 함께 추적한다.
