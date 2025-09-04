# 📋 웹서버 배포 가이드

## ⚠️ 중요: 웹서버에서 빌드하지 마세요!

웹서버는 **GitHub Actions가 빌드한 결과물만 받습니다**. 절대 웹서버에서 직접 빌드하면 안 됩니다.

## 🚀 올바른 배포 프로세스

### 1. 개발자가 코드 수정 후:
```bash
# 로컬에서
git add .
git commit -m "fix: 변경사항 설명"
git push origin main
```

### 2. GitHub Actions 자동 배포:
- main 브랜치에 푸시되면 자동으로 시작
- Actions가 빌드 → 웹서버로 배포
- 약 3-5분 소요

### 3. 배포 확인:
- https://github.com/[your-repo]/actions 에서 진행상황 확인
- 녹색 체크 표시되면 배포 완료

## 🔥 긴급 수동 배포 (권장하지 않음)

웹서버에서 절대 이런 명령어 실행 금지:
```bash
# ❌ 이렇게 하지 마세요!
npm run build
pnpm run build
./scripts/build-webserver.sh
```

대신 GitHub Actions를 수동 실행:
1. GitHub 저장소 → Actions 탭
2. "Deploy Admin Dashboard" 워크플로우 선택
3. "Run workflow" 버튼 클릭

## 📝 웹서버 역할

웹서버는 오직:
1. Nginx로 정적 파일 서빙
2. GitHub Actions에서 배포받은 파일만 사용
3. 빌드 도구나 Node.js 개발 환경 불필요

## 🎯 문제 해결

### "auth-context 빌드 실패" 에러가 나는 경우:
- **원인**: 웹서버에서 빌드를 시도했기 때문
- **해결**: GitHub Actions를 통해 배포

### 캐시 문제로 변경사항이 안 보이는 경우:
1. 브라우저에서 Ctrl+Shift+R (강제 새로고침)
2. 자동 버전 체크가 5분 내 작동

## 📌 요약

| 환경 | 빌드 | 배포 방법 |
|------|------|----------|
| 로컬 개발 | ✅ 가능 | 개발용 |
| GitHub Actions | ✅ 자동 빌드 | 웹서버로 배포 |
| **웹서버** | **❌ 절대 불가** | **Actions에서 받기만** |

---

💡 **핵심**: 웹서버는 빌드하는 곳이 아니라 **서빙하는 곳**입니다!