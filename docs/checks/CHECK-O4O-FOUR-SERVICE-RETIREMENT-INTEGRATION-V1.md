# 네 서비스 퇴역 코드 통합 검증

> **상태**: ACTIVE · **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15
> **근거 WO/IR**: [퇴역 census](../investigations/IR-O4O-FOUR-RETIRED-SERVICES-FULL-RETIREMENT-CENSUS-V1.md), PR #615

## 범위와 보완

원본 head `6e9701a4d8`은 K-Cosmetics 전용 테이블 실행 코드와 네 서비스의 일부 잔여 scope·진입 경로를 제거한다. 실제 데이터·미디어 삭제, 전용 테이블/enum 제거와 최종 패키지 정리는 후속이다. 원본 전체 Jest의 로컬 중단은 PASS가 아니며 해당 head의 CI Gate 통과를 별도로 확인했다.

리뷰 지적에 따라 `SHARED_STORE_SERVICE_CODES`의 K-Cosmetics 키는 실제 잔여 enrollment 삭제 전까지 유지한다. 다른 서비스 종료 시 남아 있는 활성 K-Cosmetics 연결이 공유 QR·playlist·tablet·매장 콘텐츠의 파기를 막는 기존 보호 근거이기 때문이다. 신규 서비스 계약을 다시 허용하거나 전용 테이블 실행 코드를 복구하지 않는다. 회귀는 보호 목록에서 이 키가 빠지면 다른 서비스 존재 판정이 실패하도록 입력 조건을 명시했다.

## 통합 공간 검증

- pinned Node22.18.0/pnpm10.25.0, frozen lockfile·store 무결성 설치와 공통 패키지 빌드 PASS.
- 원본 관련 API7 suites/136 tests PASS, API 타입·production build, 관리자 타입·production build, KPA 타입·production build PASS.
- KPA production bundle의 공개 약국 소개/참여 페이지를 Chromium1440/390px로 확인한 4시나리오 PASS. 퇴역 서비스 문구·화면 넘침·pageerror 없음. API는 합성 응답이며 실제 운영 요청·쓰기 없음.
- 공유 Store 보호 리뷰 보완 후 해당 API1 suite/7 tests 재통과.
- main 통합·배포는 미완료다. #610 배포 뒤 최신 main 반영과 최신 CI·리뷰를 다시 확인한다.

## 운영 경계

운영 DB·GCS 삭제와 migration 수동 적용, 도메인 등록 해지·자동연장 변경은 실행하지 않았다. 데이터 삭제 후 잔여0·공유 offer/사용자 보존 검증 및 스키마/임시 도구 정리는 로컬 후속 트랙이다. API 제거는 저장소 외부 소비처가 있으면404를 발생시킬 수 있다는 원본 인계를 유지한다.

문서 정합: 원본 조사 기록을 보존하고 코드 통합 검증과 실제 삭제 완료를 구분한다.
