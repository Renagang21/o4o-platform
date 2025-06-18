# 📚 O4O Platform 문서

프로젝트 개발/운영에 필요한 모든 문서가 정리되어 있습니다.

## 🎯 **개발환경 완전 구축 완료** ✅

**상태**: 모든 문제 해결, 개발 서버 정상 실행, AI 협업 환경 최적화 완료 (2024-06-18)

---

## 🚀 새 문서 구조 (권장)

### 📁 [01-setup](01-setup/) - 환경 설정
새로운 개발자나 새로운 환경 설정 시 필요한 모든 가이드
- [환경 설정 가이드](01-setup/environment-setup.md) - 집/직장 환경별 설정, PATH 문제 해결
- [설정 파일 템플릿](01-setup/config-templates.md) - package.json, .env, .gitignore 등 모든 설정 파일

### 🛠️ [02-operations](02-operations/) - 운영 & 문제 해결  
일상적인 운영과 문제 발생 시 해결 방법
- [문제 해결 가이드](02-operations/troubleshooting.md) - 긴급상황 대응, 자주 발생하는 문제 해결법
- [해결된 이슈 목록](02-operations/known-issues.md) - 완전 해결된 문제들과 현재 상태

### 📚 [03-reference](03-reference/) - 기술 레퍼런스
프로젝트의 기술적 구조와 아키텍처 정보
- [기술 스택](03-reference/tech-stack.md) - 사용 중인 기술과 버전 정보

---

## 📋 **작업 관리 문서** (NEW!)

### 🏁 **작업 시작/종료 체크리스트**
- [작업 시작 체크리스트](work-start-checklist.md) - 집/사무실 환경별 작업 시작 가이드
- [작업 종료 체크리스트](work-end-checklist.md) - 안전한 작업 종료 및 환경 전환 가이드

### 🤖 **AI 협업 최적화**
- [Cursor 협업 가이드](cursor-guide.md) - 환경별 Cursor 작업 요청 템플릿
- [다음 채팅방 컨텍스트](next-chat-context.md) - 새 채팅 시작용 프로젝트 요약

---

## 🔥 긴급상황 빠른 참조

### 사이트가 안 보일 때
```bash
pm2 restart all
npm run build:all
# 브라우저에서 Ctrl+F5 (강력 새로고침)
```

### Git 동기화 문제
```bash
# Windows PowerShell (집)
git stash push -m "backup-$(Get-Date -Format 'yyyyMMdd_HHmm')"
git fetch origin && git reset --hard origin/main

# Linux/Mac (사무실)
git stash push -m "backup-$(date +%Y%m%d_%H%M)"
git fetch origin && git reset --hard origin/main
```

### 환경변수/설정 문제
```bash
cp .env.example .env
# .env 파일 편집 후 서버 재시작
```

---

## 🎯 문서 사용법

### 1️⃣ **새 채팅방에서 작업 시작**
1. [다음 채팅방 컨텍스트](next-chat-context.md) - 프로젝트 상황을 Claude/Cursor에게 전달
2. [작업 시작 체크리스트](work-start-checklist.md) - 환경별 작업 시작 가이드

### 2️⃣ **새로 시작하는 경우**
1. [환경 설정 가이드](01-setup/environment-setup.md) - 환경 설정
2. [설정 파일 템플릿](01-setup/config-templates.md) - 설정 파일 확인  
3. 개발 시작: `npm run dev:all`

### 3️⃣ **문제가 발생한 경우**
1. [문제 해결 가이드](02-operations/troubleshooting.md) - 문제 해결
2. [해결된 이슈 목록](02-operations/known-issues.md) - 이미 해결된 문제인지 확인

### 4️⃣ **작업을 마칠 때**
1. [작업 종료 체크리스트](work-end-checklist.md) - 안전한 코드 커밋 및 환경 전환

### 5️⃣ **기술적 정보가 필요한 경우**  
1. [기술 스택 정보](03-reference/tech-stack.md) - 기술 스택 정보
2. [기존 아키텍처 문서](architecture/) - 상세 아키텍처 정보

---

## 📂 기존 문서 구조 (단계적 정리 예정)

<details>
<summary>기존 폴더들 (참고용)</summary>

### [ai-collaboration](ai-collaboration/) - AI 협업 가이드
- Cursor 설정, 컨텍스트 가이드라인

### [architecture](architecture/) - 시스템 아키텍처  
- API 엔드포인트, 데이터베이스 스키마, 폴더 구조

### [current-status](current-status/) - 현재 상태
- 프로젝트 개요, 알려진 문제들, 최근 변경사항

### [development-guide](development-guide/) - 개발 가이드
- 빠른 시작, 빌드/배포, 코드 패턴, UI/UX 설계 가이드

### [progress-tracking](progress-tracking/) - 진행 상황
- 완료된 기능, 진행 중인 작업, 변경 로그
</details>

---

## 📋 문서 업데이트 규칙

### 필수 업데이트 시점
- [ ] 새 라이브러리 설치/업그레이드 시
- [ ] 설정 파일 변경 시
- [ ] 문제 해결 후 (해결 방법 추가)
- [ ] 환경 구성 변경 시

### 업데이트 방법
1. 해당 문서 직접 수정 (GitHub 웹에서 편집 가능)
2. 또는 로컬에서 수정 후 commit/push
3. 중요한 변경사항은 팀원들에게 공지

---

## 🤖 AI 협업 가이드

### 새 채팅방에서 Claude/Cursor 협업 시작
1. **첫 메시지**: [next-chat-context.md](next-chat-context.md) 내용 복사 붙여넣기
2. **작업 시작**: [work-start-checklist.md](work-start-checklist.md) 참조
3. **환경별 협업**: [cursor-guide.md](cursor-guide.md) 템플릿 활용

### 문서 우선순위
1. **필수**: [environment-setup.md](01-setup/environment-setup.md), [troubleshooting.md](02-operations/troubleshooting.md)
2. **중요**: [config-templates.md](01-setup/config-templates.md), [tech-stack.md](03-reference/tech-stack.md)  
3. **참고**: [cursor-guide.md](cursor-guide.md), [next-chat-context.md](next-chat-context.md)

### 문제 해결 시 AI 활용법
1. 문제 상황을 구체적으로 설명
2. 관련 문서 링크 제공
3. 해결 후 문서 업데이트 요청

---

## 🎉 **완성된 개발환경**

현재 상태:
- ✅ **환경 설정**: Windows/Linux 환경별 완전 구축
- ✅ **의존성**: MCP 패키지 포함 모든 패키지 최신화
- ✅ **개발 서버**: http://localhost:3000, 4000 정상 실행
- ✅ **문서화**: 체계적인 가이드 완성
- ✅ **AI 협업**: Cursor 최적화 완료
- ✅ **작업 관리**: 시작/종료 체크리스트 완비

**이제 환경 설정에 시간을 낭비하지 않고 순수하게 개발에만 집중할 수 있습니다!** 🚀

---

**마지막 업데이트**: 2024-06-18  
**상태**: 개발환경 정비 100% 완료  
**다음 작업**: 실제 기능 개발 및 확장