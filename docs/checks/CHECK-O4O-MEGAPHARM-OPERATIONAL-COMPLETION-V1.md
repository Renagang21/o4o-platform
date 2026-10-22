# 메가팜 협업체 운영 완성 검증

- 작성일: 2026-10-22
- 상태: 로컬 구현·검증 완료, PR #761 CI·리뷰 진행 중
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
