# 보류 #615 퇴역 코드 재검증

> **상태**: ACTIVE — 코드 정리 한정 범위, 4서비스 완전 삭제 완료 아님
> **작성일**: 2026-10-24 (UTC)
> **기준**: main `12565e2b2f` · `wo/four-service-retirement-revalidation-20261024`
> **사용자 지시**: 보류 #610·#641·#615 최신 main 대조 및 필요한 작업 진행

## 판정

[#615](https://github.com/Renagang21/o4o-platform/pull/615)의 과거 변경을 그대로 병합하지 않는다. [K-Cosmetics 퇴역 잔여 계약](../architecture/K-COSMETICS-RETIREMENT-RESIDUE-CONTRACT-V1.md)을 기준으로 현재 소비처가 없는 실행 코드와 재현한 문의 입력 문제만 분리했다. 원본 PR/브랜치는 보존한다.

- `/api/v1/admin/store-network`, `/api/v1/admin/physical-stores`: admin 화면은 이미 제거됐으나 backend 2개 mount와 전용 구현 6파일이 남았다. 저장소 runtime 소비처 검색에서 bootstrap과 해당 구현 내부 참조 외 호출을 찾지 못했다. K-Cosmetics 테이블만 집계/동기화하는 이 경로와 구현을 제거한다. 범용 Store·공유 physical_stores 테이블을 삭제하지 않는다.
- 공통 content-resource Core에 남은 소비처 없는 K-Cosmetics 전용 write handler와 가입 승인 후 cosmetics_members upsert를 제거한다. 공통 KPA handler, 기존 계정의 role 회수·거절 처리는 보존한다.
- 매장 경영자 계약 종료의 신규 K-Cosmetics 지원·전용 cosmetics 테이블 SQL을 제거한다. 해당 서비스 요청은 DB 호출 전 지원 대상 아님으로 거부한다. 기존 K-Cosmetics 종료 case의 운영 데이터 처리는 별도 controlled cleanup 범위다. KPA 종료/반환/실패 재시도와 활성 K-Cosmetics enrollment가 있는 공유 매장 보호를 유지한다. main의 PH 정리 후 공유 보호 목록을 과거 버전으로 되돌리지 않는다.
- 공개 문의는 알려진 retired 유형 siteguide만 거부하고 그 외 미등록 값은 저장했다. 수정 전 미등록·잘못된 타입 **7개 실패**를 재현했다. 현재 InquiryType과 같은 platform/partnership/other 문자열만 허용한다. siteguide의 기존 RETIRED_INQUIRY_TYPE 응답과 정상 유형·기본값은 보존한다.

## 최신 main에 맞춰 제외한 것

- 공급 상품 등록은 후속 2단계 draft/publication 구조로 개편됐다. 과거 등록 시점 serviceKeys 필터 변경을 그대로 적용하면 현재 구조를 훼손하므로 가져오지 않았다.
- 최신 admin/서비스 사업 화면·공통 권한 변경, 퇴역 식별자 일괄 삭제, 패키지/의존성 변경은 포함하지 않는다.
- 과거 IR·CHECK·admin 제거 이력 주석은 당시 기록으로 보존한다. 현재 backend 제거 판정은 본 기록을 따른다.

## 검증과 운영 경계

- frozen lockfile/offline 설치. 같은 main 기준·변경 없는 packages의 dependency build 산출물을 이 작업공간에 복사해 재사용했다. source/lockfile 변경 없음.
- API 타입 검사·최종 production build PASS. 영향 5 suites / 84 tests PASS, PostgreSQL opt-in 1 suite / 1 test SKIP. 문서 링크·민감정보·diff 검사 PASS. 최종 lint 결과와 PR CI·리뷰·배포는 PR 인계 결과로 판정한다.
- 실제 PostgreSQL 연동 suite는 opt-in fixture 미지정으로 미실행이다. 합성 repository 테스트를 실제 DB 검증으로 보고하지 않는다.
- 실계정/브라우저/운영 DB/메일/Cloud 변경을 실행하지 않았다. SQL 제거만으로 운영 데이터 삭제나 table DROP 완료를 뜻하지 않는다.
- migration·DDL·데이터 삭제·도메인 종료는 이번 변경에 없다. #610의 조직·QR 경계와 snapshot second-pass는 별도 잔여다.
- CI·Codex·main 통합 후 API 배포 검증이 필요하다. 기존 #615 전체 완료로 닫힘 사유를 덮어쓰지 않는다. 개발 worktree는 KEEP.
