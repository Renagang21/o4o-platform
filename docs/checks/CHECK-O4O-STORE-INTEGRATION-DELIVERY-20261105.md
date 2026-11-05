# Store 통합·배포·운영 확인 — 2026-11-05

## 범위·main

사용자가 이 공간을 통합 담당으로 지정했다. PR #943에 PC 설치/계정 연결/문체와 Store 콘텐츠·사이니지 작업 aa7b209012를 통합했다. main의 SVG 로고를 보존하고 문체/신청 폐기 충돌을 정합했다.

- [PR #943](https://github.com/Renagang21/o4o-platform/pull/943) merged: **4db39d8368361d0b03b419138aa5e9b31dd2df60**.
- 이전 공간 작업 PR #841/#926/#928은 이미 main에 포함됐다. 별도 공간 PR #945/#936은 임의로 편입하지 않았다.
- 저장소/다른 worktree 변경 없음. Node 22.23.4·npm 10.9.9·pnpm 10.25.0, frozen 설치·무결성 검증 유지. manifest/lockfile·새 migration 변경 없음.

## 기술 gate·배포

| 증적 | 결과 |
|---|---|
| [통합 PR CI #41958987693](https://github.com/Renagang21/o4o-platform/actions/runs/41958987693) | SUCCESS, Windows 설치 포함 |
| [병합 후 CI #41960410532](https://github.com/Renagang21/o4o-platform/actions/runs/41960410532) | SUCCESS |
| [Delivery #41961466041](https://github.com/Renagang21/o4o-platform/actions/runs/41961466041) | CI green·freeze false·target==main, migration 위험 hit 0, LEVEL 3 HOLD |
| [Promote #41961643478](https://github.com/Renagang21/o4o-platform/actions/runs/41961643478) | SUCCESS·production DEPLOYED |
| [조합 frontend-only #41962930715](https://github.com/Renagang21/o4o-platform/actions/runs/41962930715) | SUCCESS, apply=false·frontend_only=true |

Promote의 최종 Cloud Run serving 확인에서 api/admin/partner/neture/kpa-society/lecture/store/kpa-branch/hospital-pharmacy 모두 **DEPLOYED**, revision-label은 target 4db39d8368에 일치했다. API 성공 후 관련 프런트를 배포했다. 기본 migration job은 기존 workflow 안에서 실행했으며 새 migration/DDL·seed를 추가하거나 수동 DB 보정을 하지 않았다.

web-pharmacy-coop는 기존 별도 경로로 프런트만 갱신했다. provision 단계는 skip하여 조합/회원 등록 데이터를 읽거나 변경하지 않았다. web-account는 미배포 보류 자산 정책을 유지했다. 후속 기록 변경은 문서-only·추가 runtime 배포 NOT_APPLICABLE이다.

## 운영 계정·화면

승인된 환경 변수의 Store 테스트 계정만 사용했다. 값·실제 이메일/이름/매장명/토큰/응답 원문은 기록하지 않는다. 비교 결과 정본 STORE_OWNER Demo와 일치했다.

- 이메일 로그인 HTTP 200, 접근 가능한 매장 1개, 활성 매장 서비스 1개.
- 매장 정보 HTTP **403 PHARMACIST_QUALIFICATION_REQUIRED → 200**. 본인 조직 일치와 demoExample 제공을 확인했다. 실제 면허/승인 원장을 수정하지 않았다.
- store-playlists / store-assets(signage) / signage media / schedules / active-content 모두 HTTP 200. 영상·목록·일정·활성 재생은 0건이다.
- Chromium의 실제 운영 응답으로 `/pharmacy → /store/info`, 가상 정보 영역, 별도 사이니지 메뉴 활성화, 설정 중복 0, 390px 가로 넘침 0, pageerror 0 확인. 업무 데이터 POST/PATCH/DELETE는 실행하지 않았다. 로그인/보안 감사 기록은 보존 정책을 따른다.
- 브라우저 기본 프록시 CA 신뢰가 실패하여 Node의 설정된 CA로 TLS 검증한 **실제 서버 응답**을 전달했다. 합성 API 응답을 운영 검증으로 주장하지 않으며 TLS 검증을 끄지 않았다.

## 공개 배포물

Neture `/downloads/pc-connection/release.json`의 sourceSha가 4db39d8368과 일치했다. 공개 CMD를 다운로드하여 manifest SHA256·크기 **33,539,069 bytes**를 검증했다. 배포 버전 0.6.0, Windows 내장 Node **22.18.0** 유지. 사용자 Windows에서 실제 설치·동의·pairing을 실행하지 않았다. Store/Partner/Neture 공개 홈과 API health는 HTTP 200이었다.

## 실제 YouTube/TV의 한계

사용자가 외부 공개 YouTube 영상을 선택해 테스트하도록 요청했다. `Blender Big Buck Bunny official` 검색과 공개 샘플 후보 `https://www.youtube.com/watch?v=aqz-KE-bpKQ`의 oEmbed 요청을 시도했지만 `www.youtube.com` CONNECT가 클라우드 프록시 403으로 거절됐다. 검색 성공·현재 영상 공개/퍼가기 허용·실제 재생 성공을 주장하지 않는다.

현재 운영 자료가 비어 있고 Store 삭제는 숨김 처리이므로 운영 일회성 영상/목록을 생성하지 않았다. 이는 [AGENTS.md §5](../../AGENTS.md)의 ‘종료 후 완전 삭제할 수 없는 테스트는 운영 환경에서 실행하지 않는다’ 기준을 따른다. 실제 영상/물리 TV 송출은 **BLOCKED / 미검증**이며 배포·운영 조회 성공과 구분한다. 사용자 기기의 네트워크·외부 영상 제공자 상태도 이 클라우드의 결과로 단정하지 않는다.

## 남은 문제·보존

- Sonar 새 코드 Security Rating B 실패. 상세 이슈 API는 CloudFront 403, GitHub annotation 확인. required CI Gate·CodeQL 통과와 별도이며 실패를 숨기거나 기준을 바꾸지 않았다.
- 실제 YouTube 플레이 및 물리 TV, 사용자 Windows 설치 GUI·LNA/pairing은 미검증이다.
- 코드 작업 worktree는 운영 후속/외부 검증과 기록을 위해 **KEEP**. 다른 세션 worktree·branch는 정리하지 않았다.
