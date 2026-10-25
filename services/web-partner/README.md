# O4O Partner

사업자와 인플루언서의 홍보 활동에 필요한 도구와 공동공간을 제공한다.
협의·계약·보상 조건 결정·분쟁 판정에는 관여하지 않는다.

## 개발 실행

Node/pnpm 기준과 기본 API/로컬 DB 구성은 루트 `SETUP.md`를 따른다.
기존 O4O API를 로컬 3002번에서 실행하고 승인된 로컬 DB에 migration을 적용한 뒤:

```bash
pnpm --filter @o4o/web-partner dev
pnpm --filter @o4o/web-partner build
pnpm --dir services/web-partner test
```

프런트 개발 포트는 3011이며 `/api`는 로컬 API로 proxy한다.
production 기본 API origin은 `https://api.neture.co.kr`이다. 별도 환경은 빌드 시 `VITE_PARTNER_API_ORIGIN`에 HTTPS origin을 지정한다. HTTP는 loopback에서만 허용한다.
API의 CORS에는 `https://partner.neture.co.kr`만 추가했고 wildcard는 사용하지 않는다.
실제 도메인 배포는 이 소스 변경만으로 수행되지 않는다.

## 제공 기능

- 기존 O4O 이메일 로그인/쿠키 세션 확인·refresh·로그아웃. 비밀번호와 access/refresh token을 별도 보관하지 않는다.
- 공동공간 생성·선택, 자료/활동/정산 공유, 일회용 7일 만료 초대와 접근 해제
- 홍보 제안·홍보자 프로필·콘텐츠 자료 등록/수정/삭제/탐색
- 채널별 템플릿 구성안 제작·편집·자료실 저장, 원본 URL·사용 범위·문구 다운로드
- 홍보자별 UTM 링크, 게시 활동·직접 입력 지표와 출처 표시
- 수동 지급 기록·정산 CSV·소유자 전용 변경 이력
- JSON 백업과 소유자의 명시적 서버 가져오기
- 로컬 도구 모드: 브라우저별 저장·오래된 탭 덮어쓰기 방지·손상 데이터 보호
- 이미지/영상 파일 업로드·보호된 미리보기/다운로드·파일 버전, 텍스트 버전 복원
- 분류·태그·재사용 템플릿과 보관 자료에서 제작 도구로 이동
- 복수 채널·활동 언어/지역 프로필, 활동 CSV와 직접 입력 지표 비교 리포트
- 지급 예정일·등록 월/상태별 명세, 외부 지급 결과 CSV의 전량 검증·재실행 보호
- 공동공간 변경 알림과 계정별 읽음 cursor

## 파일 저장소

파일 저장소는 기본 OFF다. 로컬 개발은 `PARTNER_MEDIA_DIR`에 전용 절대 경로를 지정해 disk adapter를 사용한다.
production은 별도 영속 볼륨을 연결하고 `PARTNER_MEDIA_PERSISTENT_VOLUME=true`를 명시한 경우에만 파일 기능이 켜진다.
여러 API 인스턴스는 같은 저장소를 공유해야 한다. 운영 반영 전 객체 저장소/공유 볼륨·백업·개인정보 파기 정책 연결이 필요하다.
파일은 public static 경로로 노출하지 않으며 기존 사용자/공간 권한을 매 요청 확인한다. PNG/JPEG/GIF/WebP/MP4/WebM만, 파일당 25MB·공간당 버전 포함 100개/500MB를 허용한다.
signature/MIME/해시를 검사하고 HTML/SVG는 거부한다. snapshot JSON에 binary/base64를 넣지 않는다.
첨부 삭제는 모든 파일 버전의 접근을 먼저 해제한다. 디스크 정리에 실패하면 `cleanupPending`과 202를 반환하므로 물리 삭제 완료로 간주하지 않는다.
JSON 백업에는 첨부 파일 bytes가 포함되지 않는다. 파일은 별도로 내려받아 보관한다.

## 권한과 저장 경계

소유자는 초대·접근 해제·정산 변경을 담당한다. 편집자는 자료·활동을 변경하고, 열람자는 기록을 본다.
모든 참여자는 공간 내 정산 내역도 열람한다. 개인별 비공개 자료가 필요하면 별도 공간을 사용한다.
다른 공간의 자료는 서버에서 접근을 차단한다. 기존 전역 역할/회원 원장을 변경하거나 과거 Partner role을 복원하지 않는다.

서버는 1MB 이내의 version 1 snapshot과 revision을 저장한다. 쓰기는 행 잠금과 revision 비교를 사용하며 오래된 저장은 409로 거부한다.
정산 변경 전후는 actor와 서버 시각을 포함한 append-only 이벤트로 보관한다. 정산과 이력 쓰기는 같은 transaction이다.
로컬 자료는 서버로 자동 전송하지 않는다. JSON 가져오기는 자료 교체이므로 원본을 먼저 백업한다.
실제 SNS 수집·클릭/전환 집계·AI 호출·송금·원천징수·세금 처리는 연결하지 않았다. 문구 제작은 입력 사실 기반 템플릿이다.

## API

기본 경로: `/api/v1/partner-support`. 모든 경로는 기존 `requireAuth`를 통과한다. 일반 변경은 JSON, 파일 업로드는 단일 multipart 파일과 `X-Requested-With: O4O-Partner`를 사용한다.

| 경로                                                 | 메서드       | 기능                                     |
| ---------------------------------------------------- | ------------ | ---------------------------------------- |
| `/spaces`                                            | GET / POST   | 접근 가능한 공간 목록 / 생성             |
| `/spaces/:id`                                        | GET / PUT    | 읽기 / revision을 포함한 snapshot 저장   |
| `/spaces/:id/members`                                | GET          | 참여자 목록                              |
| `/spaces/:id/members/:memberId`                      | DELETE       | 소유자가 접근 해제                       |
| `/spaces/:id/invites`                                | GET / POST   | 소유자가 초대 조회 / 생성                |
| `/spaces/:id/invites/:inviteId`                      | DELETE       | 소유자가 초대 취소                       |
| `/join`                                              | POST         | token을 JSON으로 전달해 일회 참여        |
| `/spaces/:id/events`                                 | GET          | 소유자가 최근 변경 이력 조회             |
| `/spaces/:id/assets/:assetId/versions`               | GET          | 참여자가 최근 텍스트 버전 30개 조회      |
| `/spaces/:id/media-capabilities`                     | GET          | 파일 저장소 사용 가능 상태               |
| `/spaces/:id/files`                                  | GET          | 공간 내 파일 metadata                    |
| `/spaces/:id/assets/:assetId/files`                  | POST         | 첨부 파일 등록                           |
| `/spaces/:id/assets/:assetId/files/:fileId/versions` | POST         | 동일 그룹에 파일 버전 추가               |
| `/spaces/:id/files/:fileId`                          | GET / DELETE | 권한 검사된 다운로드 / 그룹 전체 삭제    |
| `/notifications`                                     | GET          | 접근 가능한 공간의 다른 참여자 변경 알림 |
| `/spaces/:id/read`                                   | POST         | 해당 계정의 확인한 event cursor 기록     |

활동 CSV는 `url,publishedAt,views,likes,comments,shares`, 지급 결과 CSV는 `settlementId,paidAt,reference` 열을 사용한다.
ISO 지급 시각은 timezone을 포함해야 한다. 파일 전체 검증 후 저장하며 ID 오류/중복·기존 지급 충돌 시 부분 반영하지 않는다.
지표는 직접 등록/CSV 출처를 표시하고 자동 수집·검증한 성과로 취급하지 않는다.

초대 원문은 생성 시 한 번만 반환하고 DB에는 SHA-256 hash만 보관한다. 초대 fragment는 진입 후 주소에서 제거한다.

## 검증

로컬 도구 검증은 production preview를 실행한 뒤 별도 터미널에서 진행한다.

```bash
pnpm --filter @o4o/web-partner preview --host 127.0.0.1
PARTNER_TEST_ORIGIN=http://127.0.0.1:3011 pnpm --dir services/web-partner test:browser
```

서버 검증은 **별도로 만든 일회성 PostgreSQL 15**만 사용한다. 통합 테스트는 `127.0.0.1` 또는 `localhost`의 포트 `55439`, DB `partner_test`만 허용하며 자체 무작위 schema를 생성·삭제한다.
`PARTNER_TEST_DATABASE_URL`은 해당 테스트 DB만 가리키도록 설정한다. 값을 로그나 문서에 복사하지 않는다.

```bash
pnpm --filter @o4o/api-server exec jest --runInBand --runTestsByPath src/routes/partner/__tests__/partner.postgres.test.ts
```

DB 변수가 없으면 이 PostgreSQL 전용 suite는 skipped다. 이를 검증 성공으로 간주하지 않는다.
다중 브라우저 검증은 다음 명령으로 진행한다. harness와 preview는 별도 터미널에서 유지한다.

```bash
NODE_ENV=test pnpm exec tsx apps/api-server/src/routes/partner/__tests__/browser-harness.ts
VITE_PARTNER_API_ORIGIN=http://127.0.0.1:3012 pnpm --filter @o4o/web-partner build
pnpm --filter @o4o/web-partner preview --host 127.0.0.1
pnpm --dir services/web-partner test:server-browser
```

첫 명령에는 위 테스트 DB 변수를 전달해야 한다. harness는 테스트용 인증 어댑터와 실제 PostgreSQL을 사용하며 **실계정 로그인 검증을 대체하지 않는다**.
종료 시 harness를 Ctrl+C로 중단하면 테스트 schema를 삭제한다. 브라우저 context와 테스트 데이터는 격리된다.
브라우저 실행 파일 기본값은 `/usr/bin/chromium`이며 `CHROMIUM_PATH`로 지정할 수 있다.
진행 상태·검증 결과·운영 인계 항목은 `docs/work-orders/WO-O4O-PARTNER-SUPPORT-WORKSPACE-V1.md`를 참조한다.
