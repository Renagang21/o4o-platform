# 빌드/배포 프로세스 (2024-06-18 기준)

## 서버 2대 운영, 수동 배포
- git pull, npm run build, pm2 restart main-site
- 충돌/동기화 문제 발생 시 임시 대응법:
  - git fetch, git reset --hard origin/main 등
- 향후 CI/CD 개선 필요(문서 정비 후 구체적 방안 논의)

## 임시 대응법/우회법
- 서버별로 git pull 전 반드시 변경사항 커밋/백업
- 충돌 발생 시 강제 reset, 필요시 수동 머지
- 배포 후 반드시 브라우저 새로고침(캐시 문제 방지)

## 향후 개선안(초안)
- GitHub Actions, Docker, SSH 자동 배포 등 도입 검토
- 단일 소스 기준 배포 체계 확립
