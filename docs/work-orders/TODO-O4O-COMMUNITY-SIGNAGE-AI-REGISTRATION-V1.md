# TODO-O4O-COMMUNITY-SIGNAGE-AI-REGISTRATION-V1

- 작성일: 2026-11-01
- 상태: IMPLEMENTED — LOCAL_VALIDATED — PUSH_ONLY
- 기준 main: `948855d408` (작업 시작 시 origin/main)
- 사용자 요청: 내 매장 AI의 영상 등록을 실제 저장까지 한 흐름으로 먼저 완성하고, 커뮤니티 디지털사이니지에도 같은 흐름을 연결한다. 최종 사용자 지시에 따라 commit/push까지만 진행한다. PR 생성·main 병합·배포는 하지 않는다.

## 확정 범위

- O4O 저장 영상은 해당 서비스 이용자가 함께 이용한다. 개인별 비공개 보안 영상 기능을 만들지 않는다.
- 기본 외부 저장 채널: https://studio.youtube.com/channel/UCG9wb2OKmCBZ63g_ONuFkzg
- 목록의 재생 대상은 업로드·처리가 끝난 개별 영상 URL이다. Studio/채널 주소는 등록하지 않는다.
- YouTube 업로드 및 처리에는 시간이 걸림을 내 매장부터 안내한다. 업로드 창을 열거나 URL만 입력한 것을 업로드·재생 가능 확인 완료로 표시하지 않는다.
- 새 Core/인증/Task/Memory/정산 원장을 만들지 않는다. 기존 AI 실행·비용 정책, Media Library, signage_media, 매장 가져오기·목록 재생을 재사용한다.
- 영상 등록은 명시적 사용자 요청 1회로 AI 입력 보완과 실제 목록 저장까지 진행한다. 실패 시 입력·준비 결과를 보존하고 중복 저장 없이 재시도한다. 재생 기기에 적용하는 기존 사용자 동작은 유지한다.
- **추가 사용자 지시:** YouTube 자동 업로드가 핵심이다. 지정 채널 OAuth 연결 화면·공식 resumable upload·채널별 서버 순차 큐·처리 완료 확인·실제 목록 저장·요청자 알림까지 개발한다. 실제 채널 소유자의 Google 권한 동의와 운영 Cloud Tasks/IAM 연결은 코드 검증 후 별도 실제 연결 단계에서 수행하며, 인증/전달 미설정을 업로드 진행·완료로 표시하지 않는다.
- 커뮤니티 Hero 아래의 범용 서비스 AI는 이 영상 등록 흐름 후 별도 작업이다.

## 추가 확정: 비동기 YouTube 자동 등록

- 여러 장소/매장에서 같은 운영 채널에 동시에 요청한다. 브라우저를 닫아도 요청이 남고 같은 채널에서는 하나씩 처리한다.
- 기존 `automation_jobs` VIDEO 슬롯·Media Library·알림을 재사용한다. 새로운 Task/Memory/정산/영상 원장이나 DB migration을 만들지 않는다.
- 현재 Cloud Run은 min instances 0이므로 브라우저/서버 타이머만으로 백그라운드 완료를 보장하지 않는다. Cloud Tasks의 인증된 전달·재시도와 DB 채널 잠금을 함께 사용한다. 실제 큐/IAM/Google OAuth 콘솔 연결은 실행하지 않은 상태와 구분한다.
- 업로드 세션 재개·애매한 결과의 확인 대기·요청 멱등성을 사용해 중복 업로드를 방지한다. 처리·공유 가능 상태 확인 후 목록 저장과 완료 알림을 한다. 접수 알림을 완료 알림이라고 하지 않는다.

## TODO (코드·문서 대조 후 보정)

- [x] 최신 정본·Core/Extension·서비스/매장 소유권 및 기존 저장 API 확인
- [x] 공통 영상 등록 입력·진행·성공·실패 재시도 계약과 소비처 확정
- [x] 내 매장 통합 AI를 영상 등록 저장 동작에 연결; AI 출력이 URL/소유권/권한을 결정하지 않게 검증
- [x] 서버 중복 클릭·응답 유실·같은 요청 재시도·계정/매장 전환 검증
- [x] 업로드/YouTube 처리 시간 및 실제 등록 완료 구분, O4O 파일 보관·목록 연결 상태 안내
- [x] 커뮤니티 디지털사이니지 진입·URL 목록·공통 AI 등록·내 매장 가져오기 연결
- [x] 서비스 공유 범위·참조 자산 삭제 보호·은퇴한 커뮤니티 사이니지 판정과 현행 문서 정합
- [x] PC/모바일 실제 UI fixture, 관련 API/공통 소비처 회귀·타입/build 검증
- [x] YouTube OAuth 연결 UI·서버 채널 검증·암호화 credential 재사용
- [x] durable 순차 업로드·resumable 재개·처리 확인·중복 없는 실제 등록/알림
- [x] 비동기 상태 UI·화면 재진입·실패·재시도·권한 회수 검증
- [x] CHECK·commit/push 후 종료. PR·PR CI/Codex 리뷰·병합·배포는 이번 요청 범위에서 제외

## 조사 근거 / 재사용 경계

- 내 매장 `StoreAiAssistant`는 `/api/ai/query` 답변만 반환하며 domain editor가 저장한다. 현재 영상 등록 modal과 통합 AI 사이에 저장 실행 연결이 없다.
- `SignageMediaService.createLibraryVideo`는 기존 자산 잠금·동일 자산 재등록 조회를 사용한다. hosted URL 등록은 별도 중복 요청 보호 보완이 필요하다.
- 기존 MediaPicker는 공용 활용 동의를 받는다. 서비스 공유 정책을 비공개 자산이라는 이름으로 바꾸지 않는다.
- 커뮤니티는 독립 서비스다. 내 매장 조직 필수 조건을 커뮤니티 영상 등록에 복사하지 않는다.

## 운영 연결 단계 (이번 push 범위에서 미실행)

- [ ] 지정 채널 소유자의 실제 Google OAuth 동의 및 채널 일치 확인
- [ ] 운영 Cloud Tasks 큐·OIDC/IAM·환경 secret 설정 및 end-to-end 업로드
- [ ] 실제 서비스 계정으로 접수→처리→목록→알림 확인, 약국 현장 재생 검증

로컬 검증은 격리 PostgreSQL·mock provider·브라우저 fixture를 사용한다. 실제 외부 업로드 성공이나 운영 배포 완료를 뜻하지 않는다.
