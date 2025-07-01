# 작업 시작 체크리스트

## 🏠 **집(sohae) 환경에서 작업 시작**

### 📋 **필수 체크리스트**

#### ✅ **1. 환경 확인**
```powershell
# 올바른 디렉토리 확인
cd o4o-platform
pwd  # C:\Users\sohae\OneDrive\Coding\o4o-platform 인지 확인

# Git 상태 확인
git status
git branch  # main 브랜치인지 확인
```

#### ✅ **2. 최신 코드 동기화**
```powershell
# 안전한 Git 동기화 (변경사항 백업)
git stash push -m "backup-$(Get-Date -Format 'yyyyMMdd_HHmm')"
git fetch origin
git reset --hard origin/main

# 백업된 작업 복구 (필요시)
git stash list
# git stash pop  # 필요한 경우만
```

#### ✅ **3. 개발 서버 실행**
```powershell
# 의존성 업데이트 (필요시)
npm install

# 개발 서버 시작
npm run dev:all

# 성공 확인
# ✅ 프론트엔드: http://localhost:3000
# ✅ API 서버: http://localhost:4000
```

### 🤖 **Cursor와 작업 시작**

#### ✅ **4. Cursor에게 환경 정보 전달**
```
현재 환경: 집(sohae) - Windows PowerShell
프로젝트 경로: C:\Users\sohae\OneDrive\Coding\o4o-platform
작업 시작일: $(Get-Date -Format 'yyyy-MM-dd HH:mm')

참고 문서:
- 환경 설정: https://github.com/Renagang21/o4o-platform/blob/main/docs/01-setup/environment-setup.md
- 문제 해결: https://github.com/Renagang21/o4o-platform/blob/main/docs/02-operations/troubleshooting.md
- Cursor 가이드: https://github.com/Renagang21/o4o-platform/blob/main/docs/cursor-guide.md

현재 해결된 이슈들:
- ✅ MCP 패키지 버전 최신화 완료
- ✅ 개발 서버 정상 실행 (3000, 4000 포트)
- ✅ 환경변수 설정 완료

오늘 작업할 내용: [구체적으로 기입]
```

#### ✅ **5. 작업 전 상태 점검**
- [ ] 개발 서버 정상 실행 확인
- [ ] 브라우저에서 사이트 접속 확인  
- [ ] API 엔드포인트 응답 확인
- [ ] 에러 로그 확인

---

## 🏢 **사무실(home) 환경에서 작업 시작**

### 📋 **필수 체크리스트**

#### ✅ **1. 환경 확인**
```bash
# 올바른 디렉토리 확인
cd /workspace/o4o-platform
pwd  # /workspace/o4o-platform 인지 확인

# Git 상태 확인
git status
git branch  # main 브랜치인지 확인
```

#### ✅ **2. 최신 코드 동기화**
```bash
# 안전한 Git 동기화 (변경사항 백업)
git stash push -m "backup-$(date +%Y%m%d_%H%M)"
git fetch origin
git reset --hard origin/main

# 백업된 작업 복구 (필요시)
git stash list
# git stash pop  # 필요한 경우만
```

#### ✅ **3. 개발 서버 실행**
```bash
# 의존성 업데이트 (필요시)
npm install

# 개발 서버 시작
npm run dev:all

# 성공 확인
# ✅ 프론트엔드: http://localhost:3000
# ✅ API 서버: http://localhost:4000
```

### 🤖 **Cursor와 작업 시작**

#### ✅ **4. Cursor에게 환경 정보 전달**
```
현재 환경: 직장(home) - Linux/Mac bash
프로젝트 경로: /workspace/o4o-platform
작업 시작일: $(date '+%Y-%m-%d %H:%M')

참고 문서:
- 환경 설정: https://github.com/Renagang21/o4o-platform/blob/main/docs/01-setup/environment-setup.md
- 문제 해결: https://github.com/Renagang21/o4o-platform/blob/main/docs/02-operations/troubleshooting.md
- Cursor 가이드: https://github.com/Renagang21/o4o-platform/blob/main/docs/cursor-guide.md

현재 해결된 이슈들:
- ✅ MCP 패키지 버전 최신화 완료
- ✅ 개발 서버 정상 실행 (3000, 4000 포트)
- ✅ 환경변수 설정 완료

오늘 작업할 내용: [구체적으로 기입]
```

#### ✅ **5. 작업 전 상태 점검**
- [ ] 개발 서버 정상 실행 확인
- [ ] 브라우저에서 사이트 접속 확인  
- [ ] API 엔드포인트 응답 확인
- [ ] 에러 로그 확인

---

## 🚨 **문제 발생 시**

### 즉시 참조할 문서
1. **개발 서버 실행 실패**: [troubleshooting.md](02-operations/troubleshooting.md#사이트가-안-보일-때-5분-해결법)
2. **Git 동기화 문제**: [troubleshooting.md](02-operations/troubleshooting.md#git-동기화-충돌-해결)
3. **환경 설정 문제**: [environment-setup.md](01-setup/environment-setup.md)
4. **의존성 문제**: [troubleshooting.md](02-operations/troubleshooting.md#npm-yarn-의존성-문제)

### 긴급 복구 명령어
```bash
# 모든 문제 해결 시도
pm2 restart all
npm run build:all
git fetch && git reset --hard origin/main
```

---

**마지막 업데이트**: 2024-06-18  
**환경**: Windows PowerShell(집) + Linux/Mac(사무실)