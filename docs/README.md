# 📚 O4O Platform 문서

프로젝트 개발/운영에 필요한 모든 문서가 정리되어 있습니다.

## 🚀 새 문서 구조 (권장)

### 📁 [01-setup](01-setup/) - 환경 설정
새로운 개발자나 새로운 환경 설정 시 필요한 모든 가이드
- [환경 설정 가이드](01-setup/environment-setup.md) - 집/직장 환경별 설정, PATH 문제 해결
- [설정 파일 템플릿](01-setup/config-templates.md) - package.json, .env, .gitignore 등 모든 설정 파일

### 🛠️ [02-operations](02-operations/) - 운영 & 문제 해결  
일상적인 운영과 문제 발생 시 해결 방법
- [문제 해결 가이드](02-operations/troubleshooting.md) - 긴급상황 대응, 자주 발생하는 문제 해결법

### 📚 [03-reference](03-reference/) - 기술 레퍼런스
프로젝트의 기술적 구조와 아키텍처 정보
- [기술 스택](03-reference/tech-stack.md) - 사용 중인 기술과 버전 정보

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
git stash push -m "backup-$(date +%Y%m%d_%H%M)"
git fetch origin && git reset --hard origin/main
```

### 환경변수/설정 문제
```bash
cp .env.example .env
# .env 파일 편집 후 서버 재시작
```

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

## 🎯 문서 사용법

### 1️⃣ 새로 시작하는 경우
1. [01-setup/environment-setup.md](01-setup/environment-setup.md) - 환경 설정
2. [01-setup/config-templates.md](01-setup/config-templates.md) - 설정 파일 확인  
3. 개발 시작: `npm run dev:all`

### 2️⃣ 문제가 발생한 경우
1. [02-operations/troubleshooting.md](02-operations/troubleshooting.md) - 문제 해결
2. 해결되지 않으면 [current-status/known-issues.md](current-status/known-issues.md) 확인

### 3️⃣ 기술적 정보가 필요한 경우  
1. [03-reference/tech-stack.md](03-reference/tech-stack.md) - 기술 스택 정보
2. [architecture/](architecture/) - 상세 아키텍처 정보

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

### Cursor에게 보여줄 문서 우선순위
1. **필수**: [01-setup/environment-setup.md](01-setup/environment-setup.md), [02-operations/troubleshooting.md](02-operations/troubleshooting.md)
2. **중요**: [01-setup/config-templates.md](01-setup/config-templates.md), [03-reference/tech-stack.md](03-reference/tech-stack.md)  
3. **참고**: [current-status/project-overview.md](current-status/project-overview.md)

### 문제 해결 시 AI 활용법
1. 문제 상황을 구체적으로 설명
2. 관련 문서 링크 제공
3. 해결 후 문서 업데이트 요청

---

**마지막 업데이트**: 2024-06-18  
**문서 구조 정리**: 진행 중 (새 구조 → 기존 구조 단계적 통합)