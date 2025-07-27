# GitHub Secrets 설정 가이드

이 문서는 O4O Platform의 CI/CD 파이프라인에 필요한 GitHub Secrets 설정을 안내합니다.

## 필수 Secrets

### 1. SSH 키 설정

#### API_SERVER_SSH_KEY
- **설명**: API 서버(43.202.242.215) 접속용 SSH 개인키
- **생성 방법**:
  ```bash
  # 로컬에서 새 SSH 키 생성
  ssh-keygen -t rsa -b 4096 -f ~/.ssh/o4o-api-server -C "github-actions@o4o-platform"
  
  # 공개키를 서버에 추가
  ssh-copy-id -i ~/.ssh/o4o-api-server.pub ubuntu@43.202.242.215
  
  # 개인키 내용 복사 (이것을 GitHub Secret에 추가)
  cat ~/.ssh/o4o-api-server
  ```

#### WEB_SERVER_SSH_KEY
- **설명**: 웹 서버(13.125.144.8) 접속용 SSH 개인키
- **생성 방법**:
  ```bash
  # 로컬에서 새 SSH 키 생성
  ssh-keygen -t rsa -b 4096 -f ~/.ssh/o4o-web-server -C "github-actions@o4o-platform"
  
  # 공개키를 서버에 추가
  ssh-copy-id -i ~/.ssh/o4o-web-server.pub ubuntu@13.125.144.8
  
  # 개인키 내용 복사 (이것을 GitHub Secret에 추가)
  cat ~/.ssh/o4o-web-server
  ```

### 2. 환경 변수 (Production)

#### API_SERVER_ENV
- **설명**: API 서버 production 환경변수
- **형식**: `.env` 파일 전체 내용
- **예시**:
  ```env
  NODE_ENV=production
  PORT=4000
  
  # Database
  DB_HOST=localhost
  DB_PORT=5432
  DB_USERNAME=o4o_user
  DB_PASSWORD=실제_비밀번호
  DB_NAME=o4o_platform
  
  # Auth
  JWT_SECRET=실제_JWT_시크릿_키
  JWT_EXPIRES_IN=7d
  
  # Redis
  REDIS_HOST=localhost
  REDIS_PORT=6379
  REDIS_PASSWORD=실제_Redis_비밀번호
  
  # OAuth (선택사항)
  GOOGLE_CLIENT_ID=구글_클라이언트_ID
  GOOGLE_CLIENT_SECRET=구글_클라이언트_시크릿
  KAKAO_CLIENT_ID=카카오_클라이언트_ID
  KAKAO_CLIENT_SECRET=카카오_클라이언트_시크릿
  
  # Email
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=이메일_주소
  SMTP_PASS=앱_비밀번호
  
  # Session
  SESSION_SECRET=실제_세션_시크릿_키
  COOKIE_DOMAIN=.neture.co.kr
  ```

### 3. 추가 Secrets (선택사항)

#### SLACK_WEBHOOK_URL
- **설명**: 배포 알림용 Slack Webhook URL
- **형식**: `https://hooks.slack.com/services/xxx/xxx/xxx`

#### SENTRY_DSN
- **설명**: 에러 추적용 Sentry DSN
- **형식**: `https://xxx@xxx.ingest.sentry.io/xxx`

#### CDN_API_KEY
- **설명**: CDN 캐시 삭제용 API 키 (CloudFlare 등)

## GitHub에서 Secrets 추가하기

1. GitHub 저장소로 이동
2. Settings → Secrets and variables → Actions 클릭
3. "New repository secret" 버튼 클릭
4. Name과 Value 입력 후 저장

## 보안 주의사항

1. **절대 커밋하지 마세요**: 실제 값을 코드에 포함시키지 마세요
2. **정기적으로 교체**: SSH 키와 비밀번호는 정기적으로 교체하세요
3. **최소 권한 원칙**: 각 키/계정은 필요한 최소한의 권한만 부여
4. **접근 로그 모니터링**: 서버 접근 로그를 정기적으로 확인

## 문제 해결

### SSH 키가 작동하지 않을 때
```bash
# 서버에서 authorized_keys 확인
cat ~/.ssh/authorized_keys

# 권한 확인
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### 환경변수가 적용되지 않을 때
- GitHub Actions 로그에서 환경변수 주입 단계 확인
- 서버에서 `.env` 파일 존재 및 내용 확인

## 연락처

문제 발생 시 DevOps 팀에 문의하세요.