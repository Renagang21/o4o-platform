# ✅ PM2 프로세스 이름 통일 작업 완료

## 📊 변경 요약
- **변경 내용**: `o4o-api-server` → `api-server` (전체 22개 파일)
- **작업 시간**: 약 10분
- **타입체크**: ✅ 통과
- **린트체크**: ✅ 통과

## 🔧 변경된 파일 목록

### 1. ✅ PM2 설정 파일 (2개)
- `/ecosystem.config.js`
- `/deployment/pm2/ecosystem.config.js`

### 2. ✅ GitHub Actions 워크플로우 (5개)
- `.github/workflows/deploy-api-server.yml`
- `.github/workflows/deploy-api-server-v2.yml`
- `.github/workflows/deploy-api-alternative.yml`
- `.github/workflows/api-server.yml`
- `.github/workflows/main.yml`

### 3. ✅ 배포 및 운영 스크립트 (4개)
- `scripts/quick-deploy-api.sh`
- `scripts/emergency-deploy.sh`
- `scripts/emergency-fix-503.sh`
- `scripts/server-diagnosis.sh`

### 4. ✅ 문서 파일 (11개)
- `CLAUDE.md`
- `DEPLOYMENT_EXECUTION_CHECKLIST.md`
- `EMERGENCY_DEPLOYMENT.md`
- 기타 docs/ 하위 문서들

## 🚀 서버 작업 (필수)

### 현재 실행 중인 PM2 프로세스 이름 변경
```bash
# 1. SSH 접속
ssh ubuntu@43.202.242.215

# 2. 현재 프로세스 확인
pm2 list

# 3. 기존 프로세스 중지 및 삭제
pm2 stop o4o-api-server
pm2 delete o4o-api-server

# 4. 새 이름으로 시작
cd /home/ubuntu/o4o-platform
pm2 start ecosystem.config.js --only api-server

# 5. 상태 저장
pm2 save

# 6. 확인
pm2 list
pm2 describe api-server
```

## ⚠️ 주의사항
- **다운타임**: 약 30초 예상
- **헬스체크**: 재시작 후 반드시 확인
- **모니터링**: PM2 로그 확인 필요

## 📝 변경 후 사용법
```bash
# 이전 (작동 안 함)
pm2 restart o4o-api-server
pm2 logs o4o-api-server

# 현재 (올바른 사용)
pm2 restart api-server
pm2 logs api-server
```

## ✨ 기대 효과
- 패키지명과 PM2 프로세스명 일치
- 직관적인 명령어 사용
- 개발자 경험 개선
- 유지보수 용이성 증가

## 🎯 다음 단계
1. GitHub에 커밋 및 푸시
2. 서버에서 PM2 프로세스 재구성
3. 헬스체크 확인
4. 팀에 변경사항 공유