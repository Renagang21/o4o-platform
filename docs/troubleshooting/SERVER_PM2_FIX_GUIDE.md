# 서버 PM2 경로 문제 해결 가이드

## 🚀 빠른 해결 단계 (5분)

### 1. 서버 접속 및 코드 동기화
```bash
ssh ubuntu@admin.neture.co.kr
cd /home/ubuntu/o4o-platform
git pull origin main
```

### 2. PM2 프로세스 재시작
```bash
# 기존 프로세스 확인
pm2 list

# admin-dashboard 프로세스 삭제 및 재시작
pm2 delete o4o-admin-dashboard
pm2 start deployment/pm2/ecosystem.config.js --only o4o-admin-dashboard

# 설정 저장
pm2 save
pm2 startup  # 재부팅 시 자동 시작 설정
```

### 3. 검증
```bash
# PM2 상태 확인
pm2 status

# 로그 확인 (정상 작동 확인)
pm2 logs o4o-admin-dashboard --lines 50

# 프로세스 상세 정보 확인
pm2 describe o4o-admin-dashboard | grep cwd
# 출력이 /home/ubuntu/o4o-platform/apps/admin-dashboard 여야 함
```

### 4. 웹 브라우저 테스트
- https://admin.neture.co.kr 접속
- MultiThemeContext 404 에러가 해결되었는지 확인
- 로그인 및 기본 기능 테스트

## 📋 변경사항 요약

### PM2 설정 파일 수정 내용
1. **하드코딩 경로 제거**
   - 이전: `/home/sohae21/Coding/o4o-platform/apps/admin-dashboard`
   - 이후: `process.env.PM2_ADMIN_PATH || '/home/ubuntu/o4o-platform/apps/admin-dashboard'`

2. **배포 설정 동적화**
   - user, host, path 모두 환경변수 또는 기본값 사용

3. **프로젝트 정리**
   - 불필요한 로그 파일 제거
   - DESKTOP-* 파일들 제거
   - .gitignore 개선

## 🔧 문제 해결 확인 사항

### ✅ 성공 지표
- PM2 프로세스가 정상 실행됨
- 로그에 에러가 없음
- 웹사이트가 정상 작동함
- MultiThemeContext 파일을 정상적으로 찾음

### ❌ 실패 시 추가 확인
```bash
# 디렉토리 구조 확인
ls -la /home/ubuntu/o4o-platform/apps/admin-dashboard/src/shared/components/theme/

# 파일 존재 확인
test -f /home/ubuntu/o4o-platform/apps/admin-dashboard/src/shared/components/theme/MultiThemeContext.tsx && echo "파일 존재" || echo "파일 없음"

# PM2 환경변수 확인
pm2 env o4o-admin-dashboard | grep PM2_ADMIN_PATH
```

## 🚨 옵션: services 디렉토리 정리 (선택사항)

만약 서버에 /services 디렉토리가 있다면:
```bash
# 백업 (안전을 위해)
sudo mv /home/ubuntu/o4o-platform/services /home/ubuntu/o4o-platform/services.backup

# 또는 심볼릭 링크로 임시 해결
ln -s /home/ubuntu/o4o-platform/apps/admin-dashboard /home/ubuntu/o4o-platform/services/admin-dashboard
```

## 📞 문제 발생 시

1. PM2 로그 확인: `pm2 logs o4o-admin-dashboard --err`
2. 시스템 로그 확인: `sudo journalctl -u pm2-ubuntu -n 100`
3. Nginx 로그 확인: `sudo tail -f /var/log/nginx/admin.neture.co.kr.error.log`

---

예상 소요 시간: **5분**
서비스 중단 시간: **30초 미만**

*작성일: 2025-07-19*