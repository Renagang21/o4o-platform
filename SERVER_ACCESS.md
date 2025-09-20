# O4O Platform 서버 접속 정보

## 서버 구성
- **웹서버**: neture.co.kr 호스팅 (nginx, 정적 파일)
- **API서버**: API 백엔드 서비스 호스팅

## SSH 접속 정보

### 웹서버 (neture.co.kr)
- **IP**: 13.125.144.8
- **SSH 키**: `~/.ssh/webserver_key.pem`
- **사용자**: ubuntu
- **접속 명령**: 
  ```bash
  ssh webserver
  # 또는
  ssh -i ~/.ssh/webserver_key.pem ubuntu@13.125.144.8
  ```

### API서버
- **IP**: 43.202.242.215
- **SSH 키**: `~/.ssh/apiserver_key.pem`
- **사용자**: ubuntu
- **접속 명령**:
  ```bash
  ssh o4o-apiserver
  # 또는
  ssh -i ~/.ssh/apiserver_key.pem ubuntu@43.202.242.215
  ```

## SSH 설정 파일 위치
- **Linux/WSL**: `~/.ssh/config`
- **Windows**: `C:\Users\sohae\.ssh\config`

## 주요 작업 완료 사항
- [x] 웹서버 nginx X-Frame-Options 수정 (admin.neture.co.kr에서 iframe 허용)
- [x] 로컬에서 양쪽 서버 SSH 접속 환경 구성
- [x] SSH 키 파일 및 설정 완료

## 문제 해결 참고사항
1. **IP 주소 확인**: API 서버 IP가 112.153.205.95 ❌ → 43.202.242.215 ✅
2. **SSH 키 분리**: 웹서버와 API서버는 서로 다른 SSH 키 사용
3. **호스트 키 검증**: 최초 접속시 `-o StrictHostKeyChecking=no` 필요할 수 있음

## 서버별 주요 서비스
### 웹서버 (13.125.144.8)
- nginx 설정: `/etc/nginx/sites-available/neture.co.kr.conf`
- 웹사이트 루트: `/var/www/o4o-platform/apps/main-site/dist`

### API서버 (43.202.242.215)
- 내부 IP: 172.26.8.62
- 모니터링 서비스들이 PM2로 실행 중
- 홈 디렉토리: `/home/ubuntu`