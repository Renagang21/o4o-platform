# 커뮤니티 운영 화면 요청 안정성과 공지 관리

> **상태**: IMPLEMENTED — 로컬 검증 완료, PR 전달
> **작성일**: 2026-10-11 · **최종 갱신**: 2026-10-11
> **근거**: 운영자 조사 결과에 대한 사용자 진행 지시 — 권장 1~2번 우선
> **기준**: main `05bf209a49` · `wo/community-operator-ux`

## 초기 TODO

- [x] 조사 결과를 기반으로 초기 TODO 작성
- [x] 최신 정본·회원/지정 화면·공지 API 및 모든 소비처 확인
- [x] 조사 후 수정 TODO 확정
- [x] 조회·처리 중 응답 격리, 중복 차단, 재시도 구현
- [x] 독립 커뮤니티 공지 고정·해제 연결
- [x] 회귀 테스트·빌드·desktop/mobile mock browser 검증
- [x] 검증 한계·문서 정합·commit·push·PR

## 범위

현행 역할·서비스/개별 가입 원장·게시판 owner 권한과 서버 API 계약을 유지한다. 요청한 회원·운영자 지정 UX와 기존 공지 pin API 연결을 먼저 정비한다. 검색·페이지 조회, 신고·숨김·owner 승계, 공개 열람·이력 보존 정책은 후속 범위다. 운영 데이터 변경·main 병합·배포는 이번 지시에 포함하지 않는다.

관련 정본: [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §5 · [공유 모듈 변경](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md). 기존 자기 탈퇴·후보 자격 안내의 구현·배포 상태는 [기존 TODO](WO-O4O-COMMUNITY-REMAINING-TODO-V1.md) §7을 따른다.

## 조사 후 수정 TODO

- [x] 현행 역할·독립 커뮤니티/사업 포럼 구분과 모든 화면 소비처 확인
- [x] 기존 회원 제재·후보 자격·마지막 admin 보호·서버 pin 계약 유지 확정
- [x] 회원 상태·커뮤니티·화면 이탈별 늦은 목록/이력/변경 응답 격리
- [x] 단일 처리 lock으로 다른 행의 동시 처리·중복 요청 차단
- [x] 회원·운영자 지정 및 개설 심사 화면의 실패 재시도와 결과 안내 유지
- [x] ForumPostPage의 독립 커뮤니티 운영자에게만 기존 pin API 연결
- [x] 고정/해제 결과 재조회·실패 안내·페이지 이동 시 응답 격리
- [x] 빠른 화면 전환·다중 행 처리·일반 회원 비노출 회귀 테스트
- [x] Neture build·desktop/mobile mock browser, 실계정 미검증 구분
- [x] 문서 정합·commit·push·PR

`ForumPostPage`는 독립 커뮤니티와 기존 Neture forum 소비처가 있다. 새 버튼은 유효한 `/communities/<slug>` 경로와 `canModerate`로 한정하며 기존 서비스 화면의 권한을 확장하지 않는다. `forumApi`의 현재 공간 resolver와 서버의 게시판별 고정 1건 계약을 재사용한다. 공통 packages·DB·role·route·dependency/lockfile 변경은 필요하지 않다. 개설 심사 화면에도 같은 busyId/조회 패턴이 있어 동일 화면 내 처리 안정성을 함께 보완한다.

## 구현 및 검증 결과

최신 응답만 반영하는 공통 hook, 단일 처리 lock, 실패 재조회와 결과 안내를 적용했다. 공지 API는 요청 시점의 커뮤니티 키를 명시하며, 쓰기 성공 후 조회 실패 시 재시도는 조회만 수행한다. 역할·DB·서버 계약은 변경하지 않았다.

[검증 기록](../checks/CHECK-O4O-COMMUNITY-OPERATOR-UX-V1.md)에 자동 검증과 사용자가 직접 확인할 항목을 기록했다. 실계정 검증은 남아 있다. main 병합·배포는 수행하지 않았다.
