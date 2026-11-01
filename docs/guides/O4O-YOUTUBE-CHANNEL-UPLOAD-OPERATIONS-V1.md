# O4O YouTube 채널 자동 등록 운영 연결

- 작성일: 2026-11-01
- 상태: 코드 검증 / 실제 운영 연결은 별도 실행
- 채널: `UCG9wb2OKmCBZ63g_ONuFkzg`
- 관리 주소: https://studio.youtube.com/channel/UCG9wb2OKmCBZ63g_ONuFkzg
- 범위: 내 매장·커뮤니티의 자동 등록 요청. 기존 AI 실행/비용, Media Library, VIDEO Job, signage_media, 알림을 재사용한다.

## 사용자 흐름

1. 영상 보관·선택 → 요청 입력 → YouTube 공개 등록 요청(기본) 또는 O4O 보관 목록 등록 선택.
2. YouTube 요청은 기존 `automation_jobs`의 VIDEO 슬롯에 저장한다. 파일은 기존 Media Library를 재사용하며 현재 업로드 상한은 기존 MP4/WebM 30MiB다. 자동 등록에 앞서 파일 보관을 마친다.
3. Cloud Tasks가 서버를 깨워 처리한다. 브라우저를 닫아도 요청은 DB에 남는다. 앱/브라우저 타이머로 작업 완료를 보장하지 않는다.
4. 같은 운영 채널은 DB의 가장 오래된 요청부터 하나씩 처리한다. 큐 설정(max concurrent dispatches=1)과 PostgreSQL 채널 advisory lock을 함께 사용한다. 영상 처리가 끝나기 전에는 다음 요청의 업로드를 시작하지 않는다.
5. 실제 처리·공유·퍼가기 가능 상태 확인 → 기존 목록에 멱등 등록 → 요청자에게 기존 in-app 알림 1회 저장. 접수와 완료를 구분한다.
6. 미연결은 접수 전에 알리고 AI 비용도 사용하지 않는다. 아직 전송을 시작하지 않은 요청은 취소할 수 있다. 전송 시작 후의 요청을 취소하면서 이미 공개한 영상을 삭제했다고 표시하지 않는다.

기존에 업로드한 개별 영상 URL은 바로 등록할 수 있다. Studio/채널 주소는 재생 영상으로 등록하지 않는다. O4O 보관 영상은 서비스 이용자가 함께 활용한다.

## 필요한 운영 설정 — 이 문서 작성 작업에서 적용하지 않음

새 패키지·DB migration·인증/Task/Memory 원장은 추가하지 않는다. 다음은 실제 배포/운영 연결 담당이 승인된 범위로 적용한다.

| 서버 설정 이름 | 용도 |
|---|---|
| `YOUTUBE_OAUTH_CLIENT_ID` / `YOUTUBE_OAUTH_CLIENT_SECRET` | Google OAuth Web Client. 일반 로그인 Google identity 설정을 변경하지 않는다 |
| `YOUTUBE_OAUTH_REDIRECT_URI` | `https://admin.neture.co.kr/settings/youtube/callback` 고정 경로 |
| 기존 `ENCRYPTION_KEY` | canonical 암호화 키. 누락/약한 키는 연결 거부, 기본 키 fallback 없음 |
| `GOOGLE_CLOUD_PROJECT` | Cloud Tasks 프로젝트 |
| `YOUTUBE_TASKS_REGION` / `YOUTUBE_TASKS_QUEUE` | 운영 채널 전용 serial queue |
| `YOUTUBE_TASKS_SERVICE_ACCOUNT` | Cloud Tasks OIDC 호출 주체. 일반 사용자 JWT로 worker를 실행하지 않음 |
| 기존 `GCS_MEDIA_LIBRARY_BUCKET` | 실제 파일 읽기. 브라우저가 보낸 외부 파일 URL을 서버가 내려받지 않음 |

Google 프로젝트에 YouTube Data API v3와 Cloud Tasks API를 사용할 수 있어야 한다. OAuth consent에는 `youtube.upload`와 `youtube.readonly` 범위가 필요하다. 승인된 채널 관리자가 `/settings/youtube`에서 **Google 채널 연결**을 누르고 실제 권한을 승인한다. 다른 개인/브랜드 채널을 고르면 서버가 연결을 거절한다. 일반 O4O 로그인 계정 연결/roles/linked_accounts를 변경하지 않는다.

Google의 앱·업로드 프로젝트 승인 상태에 따라 API 영상이 비공개로 제한될 수 있다. 공개·퍼가기 가능한 영상이 확인되기 전에는 완료 알림이나 목록 등록을 하지 않는다. 실제 프로젝트의 승인 상태는 운영 연결 때 확인한다.

OAuth refresh token은 기존 `settings`의 `youtube-credential` 값에 암호화 저장한다. PKCE/actor에 묶인 단기 1회용 state도 기존 settings를 사용하며 만료된 state만 정리한다. 업로드 세션은 VIDEO Job instructions 안에서 암호화한다. API·상태 UI에 token/session URL을 반환하지 않는다. 기존 암호화 키 교체 CLI에 이 필드들도 포함하되, 동시 변경은 compare-and-swap으로 보존한다. 실제 키 교체는 실행하지 않았다.

## Cloud Tasks / IAM 검토용 실행안

아래 명령은 **적용 기록이 아니다**. 운영 설정 검토와 실행 승인을 받은 담당자가 값·기존 큐 유무를 확인하고 수행한다. 기존 큐나 IAM을 임의로 덮어쓰거나 기존 인증정보를 대체하지 않는다.

```sh
# 각 변수는 승인된 운영 값을 사용한다. 비밀번호/토큰은 출력하지 않는다.
gcloud tasks queues create "$O4O_YT_QUEUE" \
  --project="$O4O_YT_PROJECT" --location="$O4O_YT_REGION" \
  --max-concurrent-dispatches=1 --max-dispatches-per-second=1 \
  --max-attempts=20 --min-backoff=5s --max-backoff=300s
```

필요 권한은 API runtime 주체의 `roles/cloudtasks.enqueuer`, 지정 worker 주체로 OIDC를 발급하는 데 필요한 `iam.serviceAccounts.actAs`, Cloud Tasks service agent의 해당 service account 토큰 발급 권한이다. 실제 주체와 이미 보유한 권한을 확인해 필요한 항목만 부여한다. 광범위한 owner/editor 부여나 public worker 허용으로 우회하지 않는다.

Worker 주소는 `https://api.neture.co.kr/api/v1/youtube/worker`다. 서버는 서명된 Google ID token의 audience·검증된 service account email을 대조한다. 요청 header 이름이나 body의 사용자/매장을 권한 근거로 쓰지 않는다.

큐의 병렬 값이 1이 아니면 요청 전달을 거절한다. Cloud Run min instances 0에서도 Cloud Tasks가 HTTP 요청을 전달하므로 사용자가 화면을 계속 열어 둘 필요가 없다. 전달 실패로 접수 결과를 확인하지 못한 요청은 DB 상태를 먼저 보고 같은 요청 번호로 재시도한다.

## 장애·재시도·중복 방지

- DB 요청 번호는 actor/서비스/매장/입력 hash에 묶는다. 다른 입력으로 같은 번호를 재사용하면 409다.
- 업로드 세션을 먼저 보관하고 전송한다. 재시작 시 서버가 확인한 byte offset 또는 이미 생성된 video ID를 재사용한다.
- 전송 결과가 불확실한 만료 세션은 새 영상으로 재업로드하지 않고 확인 대기에 둔다. 관리자는 운영 채널의 기존 개별 영상 주소를 확인해 연결할 수 있다. 서버가 그 채널의 실제 처리·공유 가능 상태를 다시 확인한다.
- 처리 지연이 장시간 지속되거나 실패하면 상태와 알림으로 드러내고 다음 요청을 막아 두지 않는다. 확인/재시도 때도 기존 video ID·session을 보존한다.
- 권한은 접수·worker·실제 저장 직전에 현재 상태로 재검증한다. 다른 매장의 요청이나 임의의 외부 채널로 확장하지 않는다.
- 채널 승인이 만료되면 연결 대기로 남긴다. 관리자 재연결/설정 확인 후 **대기 작업 다시 시작**으로 기존 요청을 이어간다.
- in-app 알림은 기존 notifications/EventHub를 사용한다. 이메일·카카오톡 발송이나 개인 채널 연결은 추가하지 않았다.

## 실제 운영 연결 후 확인할 항목

관리자가 채널 권한을 승인하고 Cloud Tasks/IAM/서버 설정을 적용한 뒤, 정리 가능한 테스트 영상의 범위·제거 방법을 정하고 한 건을 실제 검증한다. 여러 장소의 동시 요청, 화면 종료 후 진행, 순차 완료, 개별 URL, 실제 알림, 실패·재시도까지 확인한다. 코드/fixture 통과를 실제 YouTube 업로드 완료 증거로 대체하지 않는다. 현재 작업 종료 범위는 사용자 지시대로 commit/push뿐이다.
