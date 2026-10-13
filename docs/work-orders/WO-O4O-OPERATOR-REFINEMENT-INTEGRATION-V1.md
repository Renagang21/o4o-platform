# 운영자 정비 8개 트랙 main 통합·배포

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13
> **근거 WO/IR**: 사용자 요청 — Main merge 및 배포까지 진행

## 범위

기준 main `90e49c3e601d62beb1363842dc71f6fb7064b0b1`에 완료된 다음 8개 branch를 통합한다.
과거 WO/CHECK의 push 종료 기록은 당시 기록으로 보존하며 이번 요청이 통합·배포 범위를 추가한다.
약사회 분회 소스·배포, 미커밋 용어 정비 문서, 신규 서비스 간 공통화, 운영 DB 변경은 제외한다.

| 트랙 | 통합한 source SHA |
|---|---|
| 공통 회원관리 후속 | a9bcdac96d915d51a4154320a9f6fb745705b8a2 |
| 펀딩 단계별 업무 연결 | a509e5edc32a9a6a58e85ab7ab7a4ae21ed30960 |
| 운영자 소규모 업무 흐름 | 5a98dac4012deb60c558e5c6bc05688145de0732 |
| 회원 목록 조회 1차 정비 | d71ac8e19b34cd924ce9e9844d590547f89ba7c6 |
| Neture 가입 요청 2차 정비 | e282d13f36f8bc07b4f09b57084889ed97b5ed7b |
| Neture 상품 승인 요청값·선택 | a5121b8065564eeafab15a0a239cd59e1b4feaf3 |
| Neture 상품 승인 실패·부분 성공 | 66416aec8081b347cf861eec32322ad472de3237 |
| Neture 상품 승인 조회 수명 | 80987d5c523290d113b56991f5e6fbac87b02d92 |

## TODO → 보완 → 통합

- [x] 최신 main·원격 branch·미병합 여부 확인, 기존 작업공간 보존
- [x] 8개 트랙 통합, 상품 승인 import 및 처리 함수 충돌 해소
- [x] 승인/거절 단일 처리기와 최신 조회 수명 제어를 함께 보존; 처리 후 `refreshData()`로 현재 필터 재조회
- [x] 공통 모듈 소비처 재확인: 회원 상세는 Neture/약사회 본회/전체 관리자, 회원 목록은 Neture/약사회 본회; 분회 소비 없음
- [x] 전체 frontend 타입 검사, 변경 소스 lint, 관련 테스트·4개 앱 build
- [x] 브라우저 통합 회귀 검증 및 CHECK 확정
- [x] PR CI·Codex blocker·현재 main gate 확인 후 정상 merge
- [x] 현재 Delivery 정책에 따라 API 선행 후 `admin,neture,kpa-society,lecture` 배포 및 serving 검증

## 배포 경계

main 직접 push·admin bypass·force push를 사용하지 않는다. CI Gate 통과가 선행 조건이다.
LEVEL 3이면 target main SHA를 고정한 Promote를 사용한다. API와 migration 변경은 이번 diff에 없다.
실계정 지정·재로그인·접근 검증은 사용자 담당이다. 합성 fixture 검증은 실계정 검증을 대신하지 않는다.

## 완료

- [PR #538](https://github.com/Renagang21/o4o-platform/pull/538) 정상 merge, main `e36bcf9318f2c52daee25bc6ffb637def93569d5`. 8개 source commit 모두 main ancestor 확인.
- [main CI](https://github.com/Renagang21/o4o-platform/actions/runs/38386448085) 및 CI Gate PASS. Codex 지적·미해결 thread 0.
- [Promote](https://github.com/Renagang21/o4o-platform/actions/runs/38387560873) SUCCESS, API·admin·neture·kpa-society·lecture verified rollout 및 최종 serving SHA 확인 PASS.
- 기존 main의 API 변경에 프런트가 의존하여 API를 선행 배포했다. 마지막 API 배포 `88d45b820` 이후 database/bootstrap/migration/실행기 변경 0; 새 migration 추가 0. 기존 배포 절차의 migration 단계 PASS.
- 약사회 분회 소스 변경·배포 0. 비선택 서비스 때문에 전체 `production` status는 `NOT_SELECTED/pending`이며 이번 선택한 5개 서비스 배포 실패를 뜻하지 않는다.
- 실계정 검증은 사용자 담당. 이전 미커밋 문서와 작업공간을 보존한다.
