# ChatGPT 심사용 격리 환경

이 환경은 실제 회원·약사 면허·운영 자료를 복사하지 않는다. 합성 데이터만 가진 별도 PostgreSQL과 같은 애플리케이션의 별도 API 인스턴스를 사용한다. 운영 계정을 승인하거나 기존 운영 DB의 자격·권한을 바꾸는 절차가 아니다.

## 현재 구성

- DB: 별도 컨테이너·전용 volume `review-data`, DB `o4o_chatgpt_review_demo`, role `o4o_review_demo`.
- 표식: DB 설명 메타데이터의 목적 문자열까지 확인한 CLI만 초기 데이터를 생성한다. 공통 DB 환경변수로 대상을 선택하지 않는다.
- 초기화: 정본 `migrate.ts`로 빈 schema를 bootstrap/migrate한 뒤 provision CLI 실행. 표식은 스키마 객체를 추가하지 않아 정본의 빈 DB 판정을 보존한다.
- 계정: `reviewer@example.invalid` — 합성 심사 전용 계정. 별도 보관한 `REVIEW_DEMO_PASSWORD`로 이메일/비밀번호 로그인한다. fixture actor에는 비밀번호나 운영자 역할을 주지 않는다.
- 약국: 합성 테스트 약국 1곳, 비의약품 합성 안내판 1개, 합성 참고 자료 1개. 전문 자격 행은 실제 승인이 아닌 격리 fixture임을 이름·면허 문자열·사유로 명시한다.
- 권한: 해당 약국의 조회·비공개 초안 저장/수정만. 운영 DB 및 관리자 접근 권한 없음. 메일 제공자와 결제 수단을 연결하지 않는다.
- `--apply` 없이는 데이터 생성 없음. 동일 marker version으로 재실행하면 기존 계정·비밀번호·작성 결과를 덮어쓰지 않는다. 파괴적 reset CLI를 제공하지 않는다.

## 로컬 준비

저장소의 `SETUP.md`에 따라 frozen lockfile 설치와 패키지/API 빌드를 먼저 완료한다. 이 branch에서 빌드한 API 이미지에는 `dist/provision-chatgpt-review-demo.js`가 포함돼야 한다. 기존 운영 이미지를 임의로 지정하지 않는다.

```bash
node deploy/chatgpt-review-demo/create-local-env.mjs
# private .env는 0600, 이미 존재하면 덮어쓰지 않음. 값은 출력하지 않음.
docker compose --env-file deploy/chatgpt-review-demo/.env -f deploy/chatgpt-review-demo/compose.yml config --quiet
node deploy/chatgpt-review-demo/build-local-images.mjs
docker compose --env-file deploy/chatgpt-review-demo/.env -f deploy/chatgpt-review-demo/compose.yml --profile ui up -d
```

로컬 HTTP/TCP 검증용 API bundle은 `NODE_ENV=development pnpm --filter @o4o/api-server run build:api`로 빌드한다. 이 저장소의 bundler는 `NODE_ENV`를 build 시 고정하므로 production bundle에 실행 시 development만 지정해 재사용하지 않는다. 공개 HTTPS 배포는 별도의 production build가 필요하다.

컨테이너 대신 로컬 프로세스를 사용할 때는 전용 DB만 올리고, 같은 private env로 provision CLI의 `--check-environment`를 먼저 실행한 뒤 정본 `migrate.ts`, provision dry-run/`--apply`/재실행을 차례로 실행한다. 표준 DB 변수는 review 전용 값에서 명시적으로 매핑한다. API는 다음 명령으로 시작한다.

```bash
node --env-file=deploy/chatgpt-review-demo/.env deploy/chatgpt-review-demo/run-local-api.mjs
REVIEW_DEMO_BROWSER_SMOKE=1 node --env-file=deploy/chatgpt-review-demo/.env --import tsx apps/api-server/src/scripts/review-demo/smoke.ts
```

브라우저 검증에는 Linux의 `/usr/bin/chromium`과 저장소의 Playwright 의존성이 필요하다. 위 smoke 명령은 전체 Compose 실행 후에도 동일하게 사용한다. API 10개 검사와 브라우저 로그인·동의·편집기 동선을 컨테이너 구성에서도 통과했다.

이 smoke는 실제 이메일 로그인·DCR·PKCE·동의·토큰 교환과 핵심 8개 MCP 도구의 P1~P5, 읽기 전용/다른 작업공간/이전 revision 거부를 검사한다. 발견된 11개 도구 중 상품 콘텐츠 3개 실행, 실제 ChatGPT 모델의 호출 선택 및 제출용 negative prompt 3개는 이 결과에 포함하지 않는다. 테스트 초안·DCR/연결/credential은 종료 시 정리하고 합성 기준 fixture와 보안 로그는 유지한다.

DB의 외부 노출은 loopback `55459`, API는 loopback `13002`뿐이다. 다른 checkout의 기존 개발 DB와 volume을 공유하지 않는다. localhost 주소는 내부 검증용이며 OpenAI 심사 URL로 제출할 수 없다.

웹 UI는 같은 commit으로 빌드한 Neture/Store를 사용하고 API를 반드시 `http://localhost:13002`로 지정한다. `VITE_API_BASE_URL`과 `VITE_API_URL`을 함께 지정한다. Neture `13000`, Store `13001`을 사용한다. Compose의 `--profile ui`는 해당 UI 이미지가 준비됐을 때 실행한다. 공개 TLS나 DNS를 자동 배포하지 않는다. 공통 My Home의 handoff는 운영 origin을 고정한 기존 계약이므로 이를 데모 이동 경로로 검증 완료했다고 보고하지 않는다. 실제 reviewer 동선은 데모 로그인/동의와 도구가 반환한 데모 편집기 주소로 한정하고, 공개 전 그 동선의 UI/로그인과 운영 호스트 이탈 여부를 반드시 검증한다.

## 공개 심사 환경으로 전환하기 전

1. 별도 API/DB/Neture/Store 자원과 HTTPS 호스트를 확보한다. 운영 image·서비스·DB·secret을 덮어쓰거나 공유하지 않는다.
2. 각 UI의 `VITE_API_BASE_URL`을 데모 API로 빌드한다. API issuer/web/admin/store origin도 실제 데모 HTTPS 주소로 설정한다. `EXTERNAL_AI_STORE_ORIGIN`은 저장 결과가 운영 편집기로 향하지 않게 한다.
3. `NODE_ENV=production`, host-only cookie, 데모 전용 JWT/refresh/credential keys와 실제 ChatGPT callback allowlist를 사용한다. SMTP·메일·결제·운영 스토리지 credential은 공급하지 않는다.
4. 별도 DB에도 marker와 같은 전용 DB/role을 사용한다. 인증 URL·동의·작업공간·초안 열기·로그아웃까지 운영 호스트로 이동하지 않는지 브라우저 검증한다.
5. 5개 정상/3개 비적용·거부 사례를 실제 실행하고, 비공개 초안·revision·조직 간 격리를 검증한다. 새 상품 콘텐츠 도구는 별도 검증 전 PASS로 기록하지 않는다.
6. 실제 시연을 녹화해 접근 가능한 URL을 준비한다. 그 후 기존 제출 ZIP의 MCP URL과 reviewer 안내를 실제 데모 값으로 갱신한다. placeholder URL을 제출하지 않는다.

공개 호스트, UI 이미지, Cloud 권한·배포·시연 URL은 이 구성 파일만으로 확보되지 않는다. GitHub 인증과 별도 인프라 준비/검증이 완료되기 전에는 심사 준비 완료로 보고하지 않는다.

## 수명 및 정리

심사 계정·기준 샘플은 재심사를 위해 유지하는 데모 fixture다. 일회성 smoke가 생성한 초안/연결 데이터는 실행 전 추적·정리 범위를 정하고 종료 후 삭제·잔존 확인한다. 전용 환경 전체 폐기는 외부 연결 해제 후 해당 Compose project의 전용 volume만 대상으로 별도 확인한다. 운영 DB·기존 개발 volume·보안 감사 보존 기록에는 적용하지 않는다.
