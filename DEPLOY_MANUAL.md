# 🚨 수동 배포 가이드 - Admin Dashboard

## 문제 상황
GitHub Actions 워크플로우는 성공하지만 실제 파일이 서버에 반영되지 않음

## 즉시 해결 방법

### 방법 1: 로컬에서 테스트 (권장)
```bash
# 개발 서버 실행 (이미 실행 중)
npm run dev:admin

# 브라우저에서 접속
http://localhost:3001
```

### 방법 2: 수동 서버 배포
서버에 SSH 접속 권한이 있다면:

```bash
# 1. 서버 접속
ssh ubuntu@admin.neture.co.kr

# 2. 프로젝트 디렉토리로 이동
cd /home/ubuntu/o4o-platform

# 3. 최신 코드 가져오기
git pull origin main

# 4. 의존성 설치
npm install

# 5. 빌드
cd apps/admin-dashboard
npm run build

# 6. 정적 파일 복사
sudo cp -r dist/* /var/www/admin.neture.co.kr/

# 7. Nginx 재시작
sudo systemctl reload nginx
```

### 방법 3: 빌드 파일 직접 업로드
로컬에서 빌드 후 FTP/SCP로 업로드:

```bash
# 로컬에서 빌드
cd apps/admin-dashboard
npm run build

# SCP로 업로드 (SSH 키 필요)
scp -r dist/* ubuntu@admin.neture.co.kr:/var/www/admin.neture.co.kr/
```

## 🔍 현재 구현된 기능

### ParagraphTestBlock (Gutenberg 수준)
- ✅ 인라인 텍스트 편집
- ✅ 플로팅 툴바 (Bold, Italic, Link 등)
- ✅ 설정 사이드바 (폰트 크기, 정렬, 색상)
- ✅ 3단계 시각 피드백 (idle, hover, selected)
- ✅ 키보드 단축키 지원
- ✅ 드롭캡 지원

### StandaloneEditor
- ✅ 풀스크린 편집 모드
- ✅ WordPress 스타일 헤더
- ✅ 모바일 반응형
- ✅ 독립적인 라우트 (/editor/*)

## 📝 테스트 체크리스트

1. **Gutenberg Editor 페이지**
   - [ ] Paragraph (Enhanced) 블록 추가 가능
   - [ ] 텍스트 입력 정상 작동
   - [ ] 포맷팅 툴바 표시
   - [ ] 설정 패널 작동

2. **StandaloneEditor 페이지** 
   - [ ] /editor/posts/new 접속 가능
   - [ ] 풀스크린 모드 작동
   - [ ] 저장/게시 버튼 표시

## 🚨 문제 해결

### 빌드 해시가 변경되지 않는 경우
- 브라우저 캐시 삭제 (Ctrl+Shift+R)
- 시크릿/프라이빗 모드로 접속
- 개발자 도구 > Network > Disable cache 체크

### 로컬 개발 서버 오류
```bash
# 포트 충돌 시
lsof -i :3001
kill -9 [PID]

# 다시 시작
npm run dev:admin
```

## 📞 추가 지원
- GitHub Actions 로그 확인: https://github.com/Renagang21/o4o-platform/actions
- 서버 상태 확인 필요 시 서버 관리자에게 문의