# 🔄 Common-Core 저장소 동기화 가이드

## 📋 현재 상황
- 로컬 Common-Core 코드가 최신 상태
- GitHub 저장소는 오래된 상태일 가능성
- 로컬 코드를 기준으로 GitHub 강제 업데이트 필요

---

## 🚀 동기화 방법

### Option 1: Git 강제 푸시 (권장)
```bash
# 1. common-core 디렉토리로 이동
cd /mnt/c/Users/sohae/OneDrive/Coding/common-core

# 2. 현재 상태 확인
git status
git log --oneline -5

# 3. 모든 변경사항 추가
git add -A

# 4. 커밋 생성
git commit -m "feat: Update Common-Core Auth with latest OAuth implementation

- Updated package.json with required dependencies
- Added TypeScript configuration
- Configured OAuth providers (Google, Naver, Kakao)
- Added environment configuration
- Ready for production deployment"

# 5. 강제 푸시 (기존 GitHub 데이터 덮어쓰기)
git push origin main --force
```

### Option 2: 새 브랜치로 작업
```bash
# 1. 새 브랜치 생성
git checkout -b production-ready

# 2. 푸시
git push origin production-ready

# 3. GitHub에서 main으로 PR/Merge
```

---

## 📂 확인해야 할 주요 파일들

### Auth Backend 핵심 파일
```
common-core/auth/backend/
├── package.json          ← 의존성 정보
├── tsconfig.json         ← TypeScript 설정
├── src/
│   ├── server.ts         ← 메인 서버
│   ├── config/
│   │   ├── environment.ts ← 환경변수 설정
│   │   ├── passport.ts   ← OAuth 설정
│   │   └── database.ts   ← DB 설정
│   ├── controllers/      ← 컨트롤러
│   ├── entities/         ← TypeORM 엔티티
│   └── routes/           ← 라우터
└── .env.example          ← 환경변수 예시
```

---

## 🔍 동기화 전 체크리스트

### 1. 로컬 상태 확인
```bash
cd common-core
ls -la auth/backend/
cat auth/backend/package.json | grep "name\|version"
```

### 2. GitHub 원격 확인
```bash
git remote -v
git fetch origin
git status
```

### 3. 충돌 해결 준비
```bash
# 기존 브랜치 백업
git branch backup-$(date +%Y%m%d)

# 작업 공간 정리
git clean -fd
```

---

## ⚠️ 주의사항

### 강제 푸시 시 고려사항
1. **팀 작업**: 다른 팀원이 작업 중이라면 조율 필요
2. **히스토리 손실**: 기존 커밋 히스토리가 사라짐
3. **백업**: 중요한 데이터는 미리 백업

### 안전한 방법
```bash
# 1. 기존 브랜치 백업
git push origin main:backup-main

# 2. 강제 푸시
git push origin main --force

# 3. 백업 브랜치는 나중에 삭제
# git push origin :backup-main
```

---

## 📋 실행 순서

### 즉시 실행할 명령어
```bash
# PowerShell에서 실행
cd C:\Users\sohae\OneDrive\Coding\common-core
git status
git add -A
git commit -m "feat: Production-ready Common-Core Auth system"
git push origin main --force
```

### 동기화 완료 확인
```bash
# GitHub에서 최신 커밋 확인
git log --oneline -3

# 서버에서 클론 테스트
# ssh ubuntu@13.125.144.8
# git clone https://github.com/Renagang21/common-core.git test-clone
# ls -la test-clone/auth/backend/
```

---

## 🎯 동기화 후 서버 배포

Common-Core 동기화 완료 후:
1. **o4o-platform 스크립트 실행**
2. **최신 Common-Core 클론**
3. **Auth 시스템 설치**
4. **OAuth 키값 설정**

---

**🚨 중요: Common-Core 동기화를 먼저 완료한 후 서버 배포를 진행하세요!**