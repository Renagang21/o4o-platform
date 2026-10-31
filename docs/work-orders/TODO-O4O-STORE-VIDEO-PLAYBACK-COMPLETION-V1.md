# TODO-O4O-STORE-VIDEO-PLAYBACK-COMPLETION-V1

- 상태: LOCAL_VERIFIED — 구현·로컬 검증 완료, PR CI·리뷰 진행 후 main 병합 전 인계
- 작성일: 2026-10-31
- 기준 main: `0ab734a68c599e63e00c6f4d972243b77df03416`
- 사용자 지시: TODO를 만들고 코드·문서로 보정한 뒤, 영상 저장·목록 재생 흐름을 한 업무 묶음으로 개발한다.
- 정본: [재생 경로](../baseline/O4O-SIGNAGE-CANONICAL-PLAYBACK-PATH-V1.md), [매장 playlist 경계](../baseline/O4O-SIGNAGE-STORE-PLAYLIST-MODEL-BOUNDARY-V1.md), [제작 운영 원칙](../baseline/O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1.md), [공통 모듈 변경](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md).

## 사용자 결정 / 완료 계약

1. 각 영상이 끝나면 다음 영상으로 이동하고, 마지막 영상이 끝나면 목록 처음부터 반복한다. 영상 한 편의 개별 loop와 영상 길이를 잘라 넘기는 기본 타이머를 목록 반복으로 취급하지 않는다. 이미지 자료의 표시 시간은 별개다.
2. YouTube 저장과 O4O 미디어 라이브러리 보관을 사용자가 선택한다. YouTube 채널 `UCG9wb2OKmCBZ63g_ONuFkzg`는 사용자가 제공한 업로드 대상이며 재생에는 개별 영상 URL/ID를 쓴다.
3. O4O 보관을 선택한 완성본은 기존 Media Library 자산을 사용한다. 기존 VIDEO Job 임시 결과의 48시간 자동 삭제와 구분한다. 공용 라이브러리 동의·현재 자료 접근/매장 소유권 경계를 유지한다.
4. 목록 변경·적용은 약국 사용자가 수동으로 한다. 주기적 목록/일정 재조회, 다음 반복 때 자동 교체는 만들지 않는다.
5. 삭제·재생 제한·실패한 영상 때문에 전체 목록이 무한 정지하거나 오류 반복하지 않게 하고, 사용자가 재시도/다음 자료/목록 재적용을 선택할 수 있게 한다.
6. 실제 약국 TV·태블릿의 장시간 운용 점검은 개발 완료 후 현장 대상이다. 개발 검증은 격리 fixture·브라우저·API/DB 계약으로 구분한다.

## 조사로 보정할 항목

- [x] SignagePlaybackPage, TabletKiosk/PublicScreenSetViewer, preview/editor, media URL/ID parser 소비처와 raw-source 계약 조사
- [x] Media Library upload/list/link/delete와 Signage Media/playlist snapshot의 현재 연결·보관 계약 대조
- [x] YouTube 업로드 연결의 기존 구현/인증 존재 여부 조사. 새 인증 원장을 만들거나 외부 계정에 자동 업로드했다고 가장하지 않는다.
- [x] 위 결과에 따라 아래 범위·정본을 현행 사용자 결정으로 보정한 뒤 구현

## 조사 보정 (2026-10-31)

- 기존 YouTube 업로드 API/OAuth 연결은 없다. 지정 채널 Studio 업로드 진입과 완료 영상 URL 등록을 제공하며, 새 인증 원장/제공업체 연동/실제 업로드는 이번 범위에서 만들거나 가장하지 않는다.
- Media Library는 일반 영상 업로드를 이미 지원한다. 이미지 전용 picker를 선택적 video 모드로 확장하고 image 기본 동작은 유지한다. 기존 HTTP 업로드 경로의 전송 한도 안에서 처리하며 큰 파일은 YouTube 저장을 안내한다.
- Signage 영상은 기존 `sourceType='url'`과 metadata의 Media Library 참조를 사용한다. 새 enum/schema/미디어 원장 없이 서버가 선택 자산의 URL/타입을 확인한다. 저장소 presigned 업로드 endpoint의 `storage.example.com`은 미구현 예시이므로 사용하지 않는다.
- 기존 `media_entity_links.entity_type`은 DB CHECK enum이다. 새 종류나 이중 원장을 만들지 않고, 현재 signage/snapshot URL 참조를 기존 미디어 삭제 가드에 포함한다.
- 공통 video 종료 재생을 내 매장 playlist와 Tablet ScreenSet의 기존 `items`에 연결한다. 외부 YouTube/Vimeo 오류·자동재생 제한은 실패/재시도 UI로 드러내며 SDK/iframe 종료 이벤트를 사용한다.
- 기존 태블릿 기기 연결·수동 화면 적용 계약은 유지한다. 목록의 주기적 서버 재조회/자동 교체는 추가하지 않는다.

## 개발 TODO

- [x] 공통 동영상 재생에 종료 이벤트·오류·로드 실패·한 항목 반복을 일관되게 처리
- [x] 내 매장 playlist의 영상 종료 기반 순환, 실패 처리, 수동 목록 재적용 연결
- [x] O4O 영상 업로드/선택 → 기존 signage media → 매장 snapshot/playlist → 미리보기·재생 연결
- [x] 태블릿 기존 ScreenSet 경로에서 O4O 보관 영상의 선택·검증·미리보기·재생 연결
- [x] 지정 YouTube 채널 업로드 진입과 완료된 개별 영상 등록·검증·수정 연결
- [x] 보관 자산의 삭제/사용처 경계를 기존 연결 원장으로 유지하고 임시 VIDEO output과 혼동하지 않게 표시
- [x] 기능/격리 API 계약·PC/모바일 브라우저·소비 서비스 타입/build·오류/매장 전환/중복 요청 회귀 검증
- [ ] TODO/CHECK·정본 정합, 정확한 scope commit/push, 동일 PR CI·Codex 지적 보완 후 병합 직전 인계

## 경계

기존 `media_assets`, `media_entity_links`, `signage_media`, `store_playlists`/snapshot, Tablet ScreenSet과 현재 권한을 재사용한다. 신규 Core·인증·Task·Memory·영상 렌더 엔진·DB 원장은 만들지 않는다. 기존 외부 제작 결과를 받는 작업이며 새 영상 생성 제공업체/유료 호출을 추가하지 않는다. 실제 외부 계정 업로드·운영 데이터 변경·migration 실행·main 병합·배포는 하지 않는다. 다른 작업공간은 수정/정리하지 않는다.

## 로컬 검증

[CHECK](../checks/CHECK-O4O-STORE-VIDEO-PLAYBACK-COMPLETION-V1.md)에 실제 검증 결과·합성 fixture 범위·YouTube 수동 업로드 및 현장 점검 경계를 기록했다.
