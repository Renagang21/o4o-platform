# 자주 발생하는 문제 해결 (2024-06-18 기준)

## 1. 서버 2대 동기화 문제
- 증상: git pull 충돌, 코드/문서 불일치
- 임시 대응: git fetch, git reset --hard origin/main, 변경사항 백업 후 pull

## 2. 빌드/배포 후 사이트 미노출
- 증상: 화면이 안 나옴, 502/404/빈 화면 등
- 임시 대응: npm run build, pm2 restart main-site, 브라우저 강력 새로고침(Ctrl+F5)

## 3. 환경변수/설정파일 문제
- 증상: 빌드/실행 에러, DB 연결 실패 등
- 임시 대응: .env 파일 재확인, package.json/tailwind.config.js 등 점검

## 4. MCP 툴 과다 활성화
- 증상: 파일/디렉토리 작업 실패, 성능 저하
- 임시 대응: 불필요한 MCP 툴 OFF, 40개 이하로 유지
