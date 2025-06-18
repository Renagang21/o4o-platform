# Cursor 작업 가이드

Cursor에게 작업을 요청할 때 이 정보를 함께 제공하세요.

## 📍 현재 환경 확인

### 집에서 작업 시
```
현재 환경: 집(sohae)
프로젝트 경로: ~/projects/o4o-platform
Node.js 경로: ~/.nvm/versions/node/latest/bin
```

### 사무실에서 작업 시  
```
현재 환경: 직장(home)
프로젝트 경로: /workspace/o4o-platform
Node.js 경로: /usr/local/bin
```

## 📚 필수 참고 문서

Cursor에게 다음 문서들을 보여주세요:

### 1️⃣ 환경 설정 가이드
```
https://github.com/Renagang21/o4o-platform/blob/main/docs/01-setup/environment-setup.md

집/직장 환경별 설정, PATH 문제 해결법, 라이브러리 버전 관리
```

### 2️⃣ 문제 해결 가이드  
```
https://github.com/Renagang21/o4o-platform/blob/main/docs/02-operations/troubleshooting.md

긴급상황 대응, Git 동기화, 빌드 문제, Medusa/TipTap 이슈 해결
```

### 3️⃣ 설정 파일 템플릿
```
https://github.com/Renagang21/o4o-platform/blob/main/docs/01-setup/config-templates.md

package.json, .env, .gitignore, PM2 설정 등 모든 템플릿
```

## 🚀 Cursor 작업 요청 템플릿

### 새 작업 시작할 때
```
현재 환경: [집/사무실]
작업 내용: [구체적인 작업 설명]

참고해야 할 문서:
- 환경 설정: https://github.com/Renagang21/o4o-platform/blob/main/docs/01-setup/environment-setup.md
- 문제 해결: https://github.com/Renagang21/o4o-platform/blob/main/docs/02-operations/troubleshooting.md

현재 알려진 이슈:
- 서버 2대 동기화 불안정 (Git 충돌 주의)
- Medusa 버전 불일치 (최신 문서 확인 필요)
- 사이트 간헐적 미노출 (빌드 후 pm2 restart 필요)
```

### 문제 발생 시
```
문제 상황: [구체적인 증상]
현재 환경: [집/사무실]
오류 메시지: [정확한 오류 내용]

우선 확인할 문서:
https://github.com/Renagang21/o4o-platform/blob/main/docs/02-operations/troubleshooting.md

관련된 알려진 이슈:
https://github.com/Renagang21/o4o-platform/blob/main/docs/02-operations/known-issues.md
```

## ⚡ 빠른 명령어 (환경별)

### 집(sohae) 환경
```bash
# 프로젝트로 이동 & 개발 시작
cd ~/projects/o4o-platform && npm run dev:all

# Git 안전 동기화
git stash push -m "backup-$(date +%Y%m%d_%H%M)"
git fetch origin && git reset --hard origin/main

# 문제 발생 시 재시작
pm2 restart all && npm run build:all
```

### 직장(home) 환경
```bash
# 프로젝트로 이동 & 개발 시작  
cd /workspace/o4o-platform && npm run dev:all

# Git 안전 동기화
git stash push -m "backup-$(date +%Y%m%d_%H%M)"
git fetch origin && git reset --hard origin/main

# 문제 발생 시 재시작
pm2 restart all && npm run build:all
```

## 📋 Cursor 작업 후 체크리스트

- [ ] 변경된 설정 파일이 있다면 템플릿 문서 업데이트
- [ ] 새로운 문제가 발생했다면 troubleshooting.md에 해결법 추가
- [ ] 환경별 차이점이 발견되면 environment-setup.md 보완
- [ ] 작업 완료 후 다른 환경(집↔사무실)에서도 테스트

---

**사용법**: 이 파일 내용을 복사해서 Cursor 대화창에 붙여넣기하세요!