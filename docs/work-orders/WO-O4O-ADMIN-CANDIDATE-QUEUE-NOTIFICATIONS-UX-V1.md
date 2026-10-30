# 관리자 후보 검토·대기 업무·알림 UX

상태: 구현 및 로컬 검증 완료. 종료 범위: PR 검증 후 main 병합 직전.

PR: [#890](https://github.com/Renagang21/o4o-platform/pull/890). CI·Codex 최종 결과는 PR의 최신 HEAD를 기준으로 확인한다.

## 기준

- `docs/architecture/OPERATOR-DATATABLE-POLICY-V1.md`: operator-ux-core DataTable 사용.
- `docs/baseline/O4O-STANDARD-LIST-PHASE1-BASELINE-V1.md`: 체크 후 상단 작업.
- `docs/baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md`: 업무공간·권한 유지.
- 후보 삭제는 기존 보관 API를 사용한다. ProductMaster 삭제·운영 데이터 변경·새 승인 기능은 포함하지 않는다.

적용 유형: B. Targeted Adoption. 공유 상세 모달·분류/대량등록 필터를 유지하고, 서버 목록/검색/페이지 이동·체크 및 상단 작업을 보완한다. 서버 정렬 API는 확장하지 않으며 열 정렬은 현재 페이지 내 정렬이다.

## 발견한 차이

- 대기 집계는 neture 및 service_key NULL 후보를 포함하지만 중앙 목록 wrapper는 neture만 요청한다.
- 집계는 deleted_at 및 상품 설명 수집 namespace 제외 조건이 빠져 있다.
- 공유 후보 화면은 첫 100개만 받고 total을 버리며 페이지 이동이 없다. 검색도 해당 페이지만 대상이다.
- 대기 요약은 정적 카드이며 건수 badge도 링크가 아니다.
- 알림 목록은 긴 대기 목록 다음에 배치된다. 알림 미생성 여부는 표시 위치 문제와 구분해야 한다.

## TODO 및 완료 조건

- [x] 집계/목록 후보 상태·삭제·namespace·서비스 범위 일치. 공통 후보 접근 시 기존 권한 경계 유지.
- [x] 서버 total·페이지 이동·서버 검색으로 전체 후보 탐색. 페이지/검색 전환 때 선택 초기화, 오래된 응답 무시.
- [x] 표 체크 → 상단 선택 보관(삭제), 반려. 확인 및 실패 항목 재시도. 실제 상품 삭제 없음.
- [x] 업무별 대기 배너 및 건수에서 해당 업무로 바로 이동. 키보드 접근·안전 경로 유지.
- [x] 알림이 상단에서 보이고 빈 상태/오류/읽음 처리가 구분됨. 실제 발송·운영 읽음 변경 없이 검증.
- [x] 공유 모듈의 중앙 관리자/Neture 소비처 영향 확인 및 회귀 테스트.
- [x] 로컬 검증·PR 생성·CI 및 Codex 검토 연결. 최신 HEAD 결과는 위 PR 참조. main 병합·배포 없음.

## 검증 기록

- Frontend 15 tests PASS: server total 12,000 가상 데이터, 2페이지 이동, 전체 검색, 선택 상단 액션, 실패만 재시도, 오래된 조회 무시, 업무별 링크, 알림 읽음/오류/권한 변경 회귀.
- Backend 7 tests PASS: 별도 `/tmp` PostgreSQL schema의 가상 후보로 집계=목록 2건 확인. 공통 후보 포함, 삭제·설명 수집 namespace·다른 서비스·종료 상태 제외. 엄격한 기존 serviceKey 필터는 유지. 검색·페이지 이동 확인. 실제 운영 후보 건수는 조회하지 않음.
- API `tsc --noEmit`, 공통 패키지 빌드, 관리자 Vite 빌드, Neture 빌드 PASS.
- Chromium 1440px·390px: 상단 알림, 대기 배너 경로, 체크→상단 작업, 본문 가로 넘침 없음 PASS. 임시 합성 화면으로 확인, 실제 로그인 검증을 대체하지 않음.
- 운영 알림 저장(`contact-inquiry/operator-delivery.ts`)과 수신자 선정(`contact-recipients.ts`) 코드는 존재함. 이번 수정은 표시 위치·목록 높이를 보완하며, 특정 운영 계정의 실제 수신·누락 여부는 미확정. 운영 발송·읽음 변경은 실행하지 않음.
- 공유 화면 소비처: 중앙 관리자와 Neture operator. 서비스 미지정 공통 후보 포함 옵션은 중앙 Neture wrapper에서만 활성화. 기존 API의 서비스 권한을 통과한 neture 범위에서만 옵션 적용.
- 새 DB schema migration, 운영 DB 변경, 권한 정책 변경 없음. 선택 삭제는 후보 상태를 archived로 바꾸는 기존 보관 API 사용.
