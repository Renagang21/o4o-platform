# 작업 종료 체크리스트

## 🏠 **집(sohae) 환경에서 작업 종료**

### 📋 **필수 완료 체크리스트**

#### ✅ **1. 코드 정리 및 테스트**
```powershell
# 개발 서버 정상 작동 확인
npm run dev:all
# ✅ http://localhost:3000 접속 확인
# ✅ http://localhost:4000/api/health 확인

# 빌드 테스트 (배포 준비)
npm run build:all
```

#### ✅ **2. 변경사항 확인 및 커밋**
```powershell
# 변경된 파일 확인
git status
git diff

# 중요한 변경사항만 선별 커밋
git add [특정 파일들]
git commit -m "feat: [오늘 작업한 기능 설명]"

# .env 파일 커밋 방지 재확인
git status | Select-String ".env"  # 결과가 없어야 함
```

#### ✅ **3. 문서 업데이트**
- [ ] 새로운 기능/변경사항이 있다면 docs 폴더 문서 업데이트
- [ ] 문제 해결한 경우 troubleshooting.md에 해결법 추가
- [ ] 새로운 설정이 있다면 config-templates.md 업데이트

#### ✅ **4. GitHub 동기화**
```powershell
# 변경사항 푸시
git push origin main

# 사무실에서 동기화할 수 있도록 상태 정리
git log --oneline -5  # 최근 커밋 5개 확인
```

#### ✅ **5. 환경 정리**
```powershell
# 개발 서버 종료 (선택사항)
# Ctrl+C로 npm run dev:all 중단

# 임시 파일 정리 (선택사항)
# Remove-Item node_modules/.cache -Recurse -Force -ErrorAction SilentlyContinue
```

### 🤖 **Cursor와 작업 종료**

#### ✅ **6. 작업 일지 정리**
```
작업 완료 보고:
- 작업 기간: [시작 시간] ~ $(Get-Date -Format 'yyyy-MM-dd HH:mm')
- 환경: 집(sohae) - Windows PowerShell
- 완료된 작업: [구체적으로 기술]
- 해결된 문제: [있다면 기술]
- 다음 작업 계획: [다음에 할 일]
- 주의사항: [사무실에서 작업 시 고려할 점]

커밋 상태: [커밋 메시지 및 파일 목록]
푸시 완료: ✅ GitHub 동기화 완료
```

---

## 🏢 **사무실(home) 환경에서 작업 종료**

### 📋 **필수 완료 체크리스트**

#### ✅ **1. 코드 정리 및 테스트**
```bash
# 개발 서버 정상 작동 확인
npm run dev:all
# ✅ http://localhost:3000 접속 확인
# ✅ http://localhost:4000/api/health 확인

# 빌드 테스트 (배포 준비)
npm run build:all
```

#### ✅ **2. 변경사항 확인 및 커밋**
```bash
# 변경된 파일 확인
git status
git diff

# 중요한 변경사항만 선별 커밋
git add [특정 파일들]
git commit -m "feat: [오늘 작업한 기능 설명]"

# .env 파일 커밋 방지 재확인
git status | grep ".env"  # 결과가 없어야 함
```

#### ✅ **3. 문서 업데이트**
- [ ] 새로운 기능/변경사항이 있다면 docs 폴더 문서 업데이트
- [ ] 문제 해결한 경우 troubleshooting.md에 해결법 추가
- [ ] 새로운 설정이 있다면 config-templates.md 업데이트

#### ✅ **4. GitHub 동기화**
```bash
# 변경사항 푸시
git push origin main

# 집에서 동기화할 수 있도록 상태 정리
git log --oneline -5  # 최근 커밋 5개 확인
```

#### ✅ **5. 환경 정리**
```bash
# 개발 서버 종료 (선택사항)
# Ctrl+C로 npm run dev:all 중단

# 임시 파일 정리 (선택사항)
# rm -rf node_modules/.cache
```

### 🤖 **Cursor와 작업 종료**

#### ✅ **6. 작업 일지 정리**
```
작업 완료 보고:
- 작업 기간: [시작 시간] ~ $(date '+%Y-%m-%d %H:%M')
- 환경: 직장(home) - Linux/Mac bash
- 완료된 작업: [구체적으로 기술]
- 해결된 문제: [있다면 기술]
- 다음 작업 계획: [다음에 할 일]
- 주의사항: [집에서 작업 시 고려할 점]

커밋 상태: [커밋 메시지 및 파일 목록]
푸시 완료: ✅ GitHub 동기화 완료
```

---

## 🔄 **환경 전환 준비**

### 🏠 → 🏢 **집에서 사무실로 이동**
```
다음 작업환경: 직장(home) - Linux/Mac
전달사항:
- 최신 커밋: [커밋 해시 및 메시지]
- 진행 중인 작업: [계속할 작업 내용]
- 환경 차이점: Windows PowerShell → Linux/Mac bash
- 주의사항: [환경별 차이로 인한 주의점]

준비사항:
- git pull 후 environment-setup.md 참조
- Linux/Mac 환경별 설정 적용
- cursor-guide.md의 직장 환경 정보 활용
```

### 🏢 → 🏠 **사무실에서 집으로 이동**
```
다음 작업환경: 집(sohae) - Windows PowerShell
전달사항:
- 최신 커밋: [커밋 해시 및 메시지]
- 진행 중인 작업: [계속할 작업 내용]
- 환경 차이점: Linux/Mac bash → Windows PowerShell
- 주의사항: [환경별 차이로 인한 주의점]

준비사항:
- git pull 후 environment-setup.md 참조
- Windows PowerShell 환경별 설정 적용
- cursor-guide.md의 집 환경 정보 활용
```

---

## 📊 **작업 성과 기록**

### 일일 작업 로그 (선택사항)
```
날짜: $(Get-Date -Format 'yyyy-MM-dd')
환경: [집/사무실]
작업 시간: [시작] ~ [종료]
주요 성과:
- [완료한 기능 1]
- [해결한 문제 1]
- [문서 업데이트 내용]

다음 계획:
- [우선순위 1]
- [우선순위 2]

문제점/개선사항:
- [발견한 문제점]
- [개선 아이디어]
```

---

## 🚨 **긴급 상황 대비**

### 급하게 작업을 중단해야 할 때
```powershell
# 작업 내용 즉시 백업
git add -A
git commit -m "WIP: 급하게 중단 - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
git push origin main

# 상태 메모 남기기
echo "급하게 중단한 작업: [간단한 설명]" >> work-notes.txt
git add work-notes.txt
git commit -m "docs: 급하게 중단한 작업 메모"
git push origin main
```

---

**마지막 업데이트**: 2024-06-18  
**환경**: Windows PowerShell(집) + Linux/Mac(사무실)