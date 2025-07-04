# 🚀 O4O Platform 백지 화면 긴급 해결 가이드

## 서버 접속 정보
- IP: 13.125.144.8
- 도메인: https://neture.co.kr
- 유저: ubuntu
- 작업 디렉토리: `/home/ubuntu/o4o-platform/services/main-site/`

## 🔥 즉시 실행 명령어 (서버에서 복사/붙여넣기)

### 1단계: 서버 접속 후 실행
```bash
cd /home/ubuntu/o4o-platform/services/main-site/
```

### 2단계: 완전 클린 빌드 (한 줄씩 실행)
```bash
# 캐시 및 빌드 파일 완전 삭제
rm -rf node_modules/.vite dist .vite node_modules/.cache

# node_modules 재설치
rm -rf node_modules
rm -f package-lock.json
npm ci

# 환경변수 설정
export NODE_ENV=production
export VITE_NODE_ENV=production

# .env.production 파일 생성
cat > .env.production << EOF
NODE_ENV=production
VITE_NODE_ENV=production
VITE_API_URL=https://api.neture.co.kr
EOF

# 프로덕션 빌드
NODE_ENV=production npm run build

# 빌드 확인
ls -lah dist/
ls -lah dist/assets/

# 배포
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/
sudo chmod -R 755 /var/www/html/

# Nginx 재시작
sudo systemctl reload nginx
```

### 3단계: 빌드 파일 검증
```bash
# 개발 모드 키워드 검색
JS_FILE=$(find /var/www/html/assets -name "*.js" | head -1)
echo "검사 중인 파일: $JS_FILE"
grep -c "node_modules" "$JS_FILE" || echo "✅ node_modules 없음"
grep -c ".vite" "$JS_FILE" || echo "✅ .vite 없음"
grep -c "localhost:3000" "$JS_FILE" || echo "✅ localhost 없음"
```

## 🔍 문제 확인 방법

### 브라우저에서:
1. https://neture.co.kr 접속
2. Ctrl+Shift+R (강력 새로고침)
3. F12 → Network 탭 확인
4. Console 에러 확인

### 서버에서:
```bash
# Nginx 에러 로그
sudo tail -f /var/log/nginx/error.log

# 배포된 파일 확인
ls -lah /var/www/html/
ls -lah /var/www/html/assets/
```

## ✅ 성공 체크리스트
- [ ] 빌드 시 TypeScript 에러 0개
- [ ] dist/assets/ 에 js, css 파일 생성
- [ ] 브라우저에서 백지 화면 대신 실제 사이트 표시
- [ ] Network 탭에서 개발 모드 파일 요청 없음
- [ ] Console 에러 없음

## 🚨 여전히 백지 화면이라면?

### 추가 조치:
```bash
# 1. 브라우저 캐시 강제 삭제
# Chrome: Ctrl+Shift+Del → 캐시된 이미지 및 파일 삭제

# 2. 시크릿 모드에서 테스트

# 3. 다른 브라우저에서 테스트

# 4. CDN 캐시 확인 (CloudFlare 등 사용 시)
```

## 📱 연락처
문제 지속 시 Cursor AI에게 아래 정보 제공:
- 브라우저 Console 에러 스크린샷
- Network 탭 스크린샷
- `sudo tail -20 /var/log/nginx/error.log` 결과