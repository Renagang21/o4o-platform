# 미반영 사이니지 작업 main 통합·배포

> 유형: Check · 상태: main 통합·정식 배포 및 운영 읽기 검증 완료 · 작성일: 2026-11-05
> 사용자 요청: 이 공간에서 작업한 미반영 변경만 main 병합 후 배포.

## 범위와 통합

- 기존 main `50fccb687544c6ba2fc8f09753a4fc7196661774`에서 미반영인 1열 동영상 목록 `a3e6c131bb`와 재생목록 제작·필수 영상 `cfefbef5d9`를 확인했다. 다른 로컬 체크아웃의 작업은 이미 main에 포함됐고 미커밋/미추적 변경이 없었다. 다른 세션의 PR #945/#936은 포함하지 않았다.
- PR [#947](https://github.com/Renagang21/o4o-platform/pull/947), 최종 리뷰 수정 HEAD `051879468f93fe51cb1ecd1d14acd09c69fe7a63`.
- 실제 main ruleset의 required `CI Gate`와 PR 경로를 사용했다. direct push, admin bypass, force push 없이 merge했다.
- 병합 SHA `a4d769c1b231108284dd94e1959ceb3cb27e0b72`. 작업 커밋이 main에 모두 포함되는 것을 확인했다.

## 검증 및 리뷰

- 첫 PR CI의 Admin 메뉴 경로/개수 기대값과 UUID 검증용 권한 fixture 불일치를 수정했다. 권한·테스트 기준을 완화하지 않았다.
- 자동 리뷰 2건: 만료된 필수 영상이 사라진 뒤 현재 항목 ID로 순서 변경, 업로드한 저장 영상/사본의 제작 화면 미리보기 복원. 회귀 테스트와 Store 빌드로 확인하고 두 thread를 해결했다.
- 수정 후 Store 전체 95개 파일/952개 테스트, Admin 관련 57개, API UUID/권한 관련 109개 회귀 통과. 개발 단계의 격리 DB 6개 SQL/HTTP 및 schema assertion/roundtrip 검증 기록도 유지한다.
- PR [CI 41980474072](https://github.com/Renagang21/o4o-platform/actions/runs/41980474072) 최종 성공. Windows fixture 프로세스 유일성 검사가 첫 시도에 실패하여 동일 커밋에서 실패 job만 재실행했고 Windows와 CI Gate 모두 통과했다. 설치 코드·검사 기준은 변경하지 않았다.
- CodeQL과 Guard Static Analysis도 성공. main의 [CI 41981934472](https://github.com/Renagang21/o4o-platform/actions/runs/41981934472)도 전체 성공했다.

## 배포·운영 검증

- [Delivery 41983137373](https://github.com/Renagang21/o4o-platform/actions/runs/41983137373): CI green, freeze false, target=main HEAD 확인. migration 때문에 자동 배포를 보류한 뒤 사용자 요청에 따라 정식 Promote를 실행했다.
- [Promote 41983317650](https://github.com/Renagang21/o4o-platform/actions/runs/41983317650): 성공. production status는 DEPLOYED. API·Admin·Partner·Neture·kpa-society·lecture·Store 7개 서비스 모두 `a4d769c1b231108284dd94e1959ceb3cb27e0b72` 서빙 확인. kpa-branch/hospital-pharmacy는 runtime 변경이 없어 NO_DEPLOY로 제외했다.
- migration execution `o4o-api-migrations-5m22h`: 검증된 API 이미지의 `dist/migrate.js`가 정상 종료했다. 이 진입점은 incremental 적용 후 등록된 최종 schema fingerprint assertion을 통과해야 0으로 종료한다. 운영 로그를 직접 조회한 것으로 표현하지 않으며 정식 migration job 성공과 API 동작으로 확인한다. 개발 격리 DB의 등록 fingerprint는 `0856ce6b4cf245e66f8c69e7e55ed949ad31a049dcacfe8a6732cfa159d43cac` / 7556 lines이다.
- API revision `o4o-core-api-04378-seb` 100%, Store revision `store-web-00464-rek`. 배포 워크플로가 기존 traffic 방식을 유지하고 서빙 SHA를 검증했다.
- 승인된 매장 계정: 로그인·매장 조회·약국 정보·재생목록·영상·필수 영상 GET 모두 200. 재생목록 tags 배열을 확인했고 전체 운영자 전용 API는 403 SIGNAGE_ADMIN_REQUIRED였다. 실제 계정/매장 식별자는 기록하지 않는다.
- 실제 운영 응답으로 Chromium 검증: 제목/태그 중심 목록, 출처·상태·등록일 열 없음, 새 제작 창의 복수/반복 선택·순서·태그·저장 가능 상태 확인. PC 1440px/모바일 390px overflow 없음, page error 0. 저장 없이 닫았고 운영 업무 변경 요청/생성 레코드 0이었다.
- 브라우저 자체 CA 오류를 피하기 위해 Node의 설정된 CA/TLS 검증을 사용하는 route.fetch로 실제 운영 응답을 전달했다. TLS 검증 해제나 응답 fixture는 사용하지 않았다.
- 공개 Store/Partner/Neture/health 200. 설치 파일의 release source SHA가 배포 SHA와 일치하고 SHA-256/33,539,072 bytes를 검증했다. release 0.6.0, Windows 번들 Node 22.18.0 유지. 설치 파일을 실행하거나 실제 PC/TV 재생 성공으로 표현하지 않는다.
- 협업체 앱은 변경된 operator-core-ui의 소비처여서 [frontend-only 배포 41984607645](https://github.com/Renagang21/o4o-platform/actions/runs/41984607645)를 실행했다. apply=false, 계정 입력 없이 조합 등록·계정 데이터 변경을 하지 않으며 배포도 성공했다. `cooperative-web-00053-gim`이 100% traffic을 받는 것과 공개 페이지 200을 확인했다. 변경된 서비스는 기본 7개와 협업체 프런트엔드 1개이며 runtime 무변경 서비스는 재배포하지 않았다.
- 정상 로그인 보안 기록과 승인된 정식 migration 이외에 운영 seed/권한 repair/직접 DB 수정/테스트 업무 데이터 쓰기는 하지 않았다. 임시 브라우저 세션 파일은 제거했다.

## 남은 작업과 보존

커뮤니티·협업체 운영 공간의 동일 제작기 연결, 기존 캠페인 필수 정책 정합, 물리 TV/외부 영상 재생 확인은 기존 TODO에 남긴다. 이번 통합은 이미 구현한 변경의 배포이며 미구현 기능을 완료로 표기하지 않는다. 다른 작업공간과 후속 검증에 필요한 브랜치는 보존한다.

## 문서 정합

설계/개발 단계 기록과 후속 통합·배포 결과를 구분하며 이 CHECK에 실제 운영 반영 결과를 기록한다. 비밀값·실제 계정 식별자·운영 응답 원문은 포함하지 않는다.
