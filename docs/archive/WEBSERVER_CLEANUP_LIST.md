# 웹서버 불필요 파일 제거 목록

## 🗑️ 즉시 제거 대상 (API 서버 관련)

### 1. API 서버 환경 변수 파일
```bash
# 제거 명령어
rm -f apps/api-server/.env
rm -f apps/api-server/.env.production
```

### 2. API 서버 전용 설정 파일
```bash
# 제거 명령어 (웹서버에서 불필요)
rm -f ecosystem.config.apiserver.cjs
rm -f .rsyncignore.apiserver
```

### 3. API 서버 빌드 결과물 (있을 경우)
```bash
# 확인 후 제거
rm -rf apps/api-server/dist/
rm -rf apps/api-gateway/dist/
```

## ⚠️ 검토 후 제거 대상

### 1. 로컬 개발 설정
- `ecosystem.config.local.cjs` - 웹서버에서 로컬 개발하지 않으면 제거
- `.env.apiserver.example` - API서버 예제 파일, 웹서버에 불필요

### 2. 백업 디렉토리 내 API 관련 파일
```bash
# .backup 디렉토리 확인
ls -la .backup/*/
# 오래된 백업 정리 고려
```

## ✅ 유지해야 할 파일

### 웹서버 전용 파일 (절대 삭제 금지)
- `.rsyncignore.webserver` ✅ (방금 생성)
- `ecosystem.config.webserver.cjs` ✅
- `.env.webserver.example` ✅
- `docs/WEBSERVER_SYNC_GUIDE.md` ✅
- `show_server_info.sh` ✅
- `CLAUDE.md` ✅

### 공통 설정 파일
- `.gitignore`
- `.npmrc`
- `package.json`
- `tsconfig.json`
- `eslint.config.js`
- `jest.config.js`

## 📝 제거 스크립트

전체 정리를 위한 스크립트:
```bash
#!/bin/bash
# webserver_cleanup.sh

echo "🧹 웹서버 불필요 파일 정리 시작..."

# API 서버 관련 파일 제거
echo "API 서버 파일 제거 중..."
rm -f apps/api-server/.env
rm -f apps/api-server/.env.production
rm -f ecosystem.config.apiserver.cjs
rm -f .rsyncignore.apiserver
rm -f .env.apiserver.example

# API 서버 빌드 결과물 제거
echo "API 서버 빌드 결과물 제거 중..."
rm -rf apps/api-server/dist/
rm -rf apps/api-gateway/dist/

echo "✅ 정리 완료!"

# 남은 설정 파일 확인
echo ""
echo "📋 현재 설정 파일 목록:"
ls -la .rsyncignore* ecosystem.config.* .env* 2>/dev/null
```

## 🔍 정리 후 확인 사항

1. PM2 프로세스 확인
```bash
pm2 status
```

2. 웹서버 설정 파일 확인
```bash
ls -la ecosystem.config.webserver.cjs
ls -la .rsyncignore.webserver
```

3. Git 상태 확인
```bash
git status
```