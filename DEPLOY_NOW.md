# 웹서버 긴급 배포 가이드

## 웹서버에서 실행할 명령어

```bash
# 1. 웹서버에 SSH 접속 후
cd /home/sohae21/o4o-platform

# 2. 최신 코드 가져오기
git pull origin main

# 3. 패키지 설치 (필요시)
pnpm install

# 4. Admin Dashboard 빌드
cd apps/admin-dashboard
pnpm run build

# 5. PM2 재시작
npx pm2 restart o4o-admin-webserver

# 6. 확인
npx pm2 logs o4o-admin-webserver
```

## 주요 변경사항
- archive 폴더 삭제 (Posts.tsx, NewPost.tsx 등 제거)
- PostsManagement.tsx만 사용
- API URL 중복 문제 수정 (/api/api -> /api)