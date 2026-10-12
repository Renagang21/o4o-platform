# WO-O4O-STORE-STAFF-FINAL-APPROVAL-V1

> **상태**: COMPLETED · **작성일**: 2026-10-12 KST
> **근거**: 사용자 확정 — 경영자 초대 → 직원 수락 → 경영자 최종 승인, My Home 관리, 직원 업무 전체 이용
> **정본**: [매장 접근](../baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md) · [My Home](../baseline/O4O-MY-HOME-CANONICAL-V1.md)

## 범위

현재 운영 약국의 승인 직원 접근과 개인 My Home 초대·승인 관리다. 기존 경영자 판정과
직원·소유 관리 전용 권한을 유지한다. 공통 Frozen Core 재작성, 은퇴 서비스 복구,
운영 DB 변경·계정 생성·대량 backfill은 포함하지 않는다. 직원이 작성한 자료는 해제 후에도 유지한다.

## TODO

- [x] 기존 초대·수락·해제와 전체 업무 API 소비처 조사
- [x] 수락과 최종 승인 분리 (`invited` → `accepted` → `staff`)
- [x] 경영자 승인 API, 본인 거절·수락 취소, 대기 상태 해제
- [x] My Home 직원 관리·받은 초대 UI 연결
- [x] 승인 직원의 매장 목록·서비스 조회·업무 권한 연결, 명시 선택 매장 격리
- [x] 서비스 조회 오류·재시도 처리
- [x] 회귀 테스트·타입·lint·PC/모바일 fixture 검증
- [x] 검증 결과 정합·commit·push·PR·required CI
- [x] 기술 gate 충족 후 정상 PR merge·Delivery 확인

## 실행 경계

서버는 활성 약국 원장·활성 직원 관계·현재 인가 Role을 요청마다 조회한다.
초대 수락·승인 대기 중에는 권한을 주지 않는다. 직원은 자신의 초대를 승인할 수 없고
다른 매장 구성원을 변경할 수 없다. 해제는 관계 이력을 보존하고 다른 매장의 권한은 유지한다.

실제 운영 계정·DB 변경 검증은 이 개발의 fixture 검증과 구분한다. 정상적인 PR 병합·배포는
현재 AGENTS.md의 기술 gate를 확인하고 진행하며 운영 DB write는 포함하지 않는다.

## 로컬 검증 — 2026-10-12 KST

- Neture: 71 files / 605 tests PASS. Store: 6 files / 43 tests PASS.
- Store·Signage·대표 홈 API 71개 파일 명시 선택: 70 PASS / 1 SKIPPED, 1,130 tests PASS / 1 SKIPPED.
  SKIPPED는 격리 PG URL이 필요한 기존 매장 종료 통합 검사이며 운영 DB로 대체하지 않았다.
  사이니지의 다른 매장 경영자 Role·이전 조직 claim, 자료의 association fallback 해제 우회,
  약국 enrollment 없는 상태의 Role 회수와 선택 매장의 정확한 member 자격도 검증했다.
- API `tsc --noEmit`, Neture·Store 타입 포함 production build PASS.
- 저장소 ESLint ratchet PASS (기존 baseline 46 errors / 1,005 warnings 유지).
- Chromium 실제 My Home 화면: 1280px·375px·320px에서 초대 수락·승인 대기·최종 승인·직원 이용·해제,
  직원의 구성원 관리 버튼 미노출과 수평 overflow 없음을 확인했다. 21 assertions PASS.
  사용자·업무 API는 합성 fixture이며 실제 로그인·운영 DB 검증이 아니다.
- 운영 DB write·migration·계정 추가·권한 backfill은 실행하지 않았다.
- Frozen Core·dependency·lockfile·CI·배포 설정 변경 없음.

main 통합과 운영 배포를 완료했으며 아래 실행 기록으로 확정한다.

## 자동 리뷰 보완

- 승인 직원에게 개인 Neture 가입을 추가 요구하던 매장 업무 gate를 분리했다. 경영자의 기존 가입 gate와 개인·공급자·운영자 경로는 유지한다.
- 약국 외 현역 Café24 B2B의 수락·Role 발급을 기존 흐름으로 유지했다. 약국과 함께 연결된 현역 Café24 권한은 최종 승인 후 발급하며 은퇴한 PH·K-Cosmetics Role은 발급하지 않는다.
- 직원의 개인 약국 개설 신청은 내 매장 메뉴의 직원 안내와 구분한다. 현재 선택한 매장에서 직원이라는 이유로 개인 신청 URL을 막지 않는다.

- 후속 리뷰의 Café24 매장 선택 누락도 보완했다. 현역 Café24의 유효 Role·staff 관계·서비스 연결을 확인해 매장 목록과 서비스 조회에 함께 포함하며, 약국 업무 권한으로 확대하지 않는다.

## main 통합·배포 기록

- 구현 [PR #503](https://github.com/Renagang21/o4o-platform/pull/503) 정상 merge, main `64b8df16f1544bd3a505ba00af643d697bcb38c4`.
- [main CI](https://github.com/Renagang21/o4o-platform/actions/runs/38212078522)·CodeQL PASS.
- [자동 Delivery](https://github.com/Renagang21/o4o-platform/actions/runs/38212841828)는 auth-context 변경을 LEVEL 3으로 판정해 보류했다.
- 운영 serving API부터 대상까지 migration 파일 차이 0을 확인하고 [Promote](https://github.com/Renagang21/o4o-platform/actions/runs/38213034663)를 실행했다.
- Promote SUCCESS, `production=DEPLOYED · deploy: api,neture,store`. 세 서비스의 대상은 위 main SHA다.
- 배포 후 공개 API 준비 상태 `200 ready`, 인증 없는 초대·매장 권한 조회 `401` 확인.
- 실제 배포 Neture HTML·assets를 TLS 검증 curl로 받아 Chromium에서 실행: 1280px·375px·320px 합성 업무 API fixture 21 assertions PASS. 브라우저의 프록시 CA 오류를 인증서 검증 해제로 우회하지 않았다.
- 실제 직원 계정 로그인·운영 데이터 변경 검증은 미실행이다. 이는 합성 UI·로컬 회귀 검사와 별개다.
- 이 결과 정합은 문서-only closure이며 `DEPLOYMENT=NOT_APPLICABLE`; 운영 기능 배포 SHA와 후속 문서 SHA를 구분한다.
