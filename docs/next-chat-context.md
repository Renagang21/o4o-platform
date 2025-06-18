# 다음 채팅방 시작용 컨텍스트 문서

## 🎯 **새 채팅방에서 Claude/Cursor에게 전달할 정보**

다음 내용을 복사해서 새 채팅에서 첫 메시지로 전달하세요.

---

## 📋 **프로젝트 상황 요약**

### 🏗️ **프로젝트 정보**
- **프로젝트명**: O4O Platform
- **GitHub 저장소**: https://github.com/Renagang21/o4o-platform
- **문서 위치**: https://github.com/Renagang21/o4o-platform/tree/main/docs
- **현재 상태**: ✅ **개발환경 완전 구축 완료** (2024-06-18)

### 🏠 **현재 작업 환경** (상황에 맞게 수정)
```
현재 환경: [집(sohae) - Windows PowerShell / 직장(home) - Linux/Mac bash]
프로젝트 경로: [C:\Users\sohae\OneDrive\Coding\o4o-platform / /workspace/o4o-platform]
개발 서버 상태: [실행중/중단] 
- 프론트엔드: http://localhost:3000
- API 서버: http://localhost:4000
```

### ✅ **완전 해결된 문제들**
1. **MCP 패키지 버전 이슈** → 모든 패키지 최신 버전으로 업데이트 완료
2. **환경별 설정 문제** → Windows/Linux 환경별 가이드 완성
3. **개발 서버 실행 불가** → .env 파일 구성 완료, 정상 실행
4. **문서 분산 문제** → 체계적인 3단계 구조 완성
5. **Git 동기화 문제** → 안전한 동기화 스크립트 적용
6. **설정 파일 관리** → 템플릿 기반 표준화 완료

### 🎯 **현재 개발환경 상태**
- ✅ **의존성**: 모든 npm 패키지 최신 버전, 설치 완료
- ✅ **환경변수**: 루트 + 각 서비스별 .env 파일 구성 완료
- ✅ **개발 서버**: npm run dev:all 정상 실행
- ✅ **문서화**: 체계적인 가이드 문서 완성
- ✅ **AI 협업**: Cursor 협업 환경 최적화 완료

---

## 📚 **필수 참고 문서** (GitHub에서 확인)

### 🔧 **환경 설정**
- **환경 설정 가이드**: `docs/01-setup/environment-setup.md`
- **설정 파일 템플릿**: `docs/01-setup/config-templates.md`

### 🛠️ **운영 & 문제해결**
- **문제 해결 가이드**: `docs/02-operations/troubleshooting.md`
- **해결된 이슈 목록**: `docs/02-operations/known-issues.md`

### 🤖 **AI 협업**
- **Cursor 협업 가이드**: `docs/cursor-guide.md`
- **작업 시작 체크리스트**: `docs/work-start-checklist.md`
- **작업 종료 체크리스트**: `docs/work-end-checklist.md`

### 📖 **기술 레퍼런스**
- **기술 스택 정보**: `docs/03-reference/tech-stack.md`
- **전체 문서 네비게이션**: `docs/README.md`

---

## 🎯 **작업 요청 템플릿**

새 채팅에서 작업을 요청할 때 다음 템플릿을 사용하세요:

```
현재 환경: [집(sohae) Windows PowerShell / 직장(home) Linux/Mac bash]
작업 요청: [구체적인 작업 내용]

프로젝트 컨텍스트:
- GitHub: https://github.com/Renagang21/o4o-platform
- 문서: https://github.com/Renagang21/o4o-platform/tree/main/docs
- 상태: 개발환경 완전 구축 완료 (MCP, 환경변수, 개발서버 모두 정상)

필요시 참고 문서:
- 환경 설정: docs/01-setup/environment-setup.md
- 문제 해결: docs/02-operations/troubleshooting.md  
- Cursor 가이드: docs/cursor-guide.md

현재 개발 서버: 
- ✅ http://localhost:3000 (프론트엔드)
- ✅ http://localhost:4000 (API)
```

---

## 🔄 **프로젝트 기술 스택**

### 📦 **주요 구성**
- **프론트엔드**: React 19.1.0, Tailwind CSS 4.1.7, TypeScript 5.8.3
- **백엔드**: Express 4.18.2, TypeORM 0.3.20, TypeScript 5.0.4
- **데이터베이스**: PostgreSQL, Redis
- **AI/자동화**: MCP 서버들 (filesystem, github, postgres, memory)
- **개발도구**: Cursor, pm2, concurrently

### 🌐 **서비스 구조**
```
o4o-platform/
├── services/
│   ├── api-server/     # Express API (포트 4000)
│   └── main-site/      # React 웹앱 (포트 3000)
├── docs/               # 문서 (체계적 구조)
└── scripts/            # 자동화 스크립트
```

---

## 🚨 **주의사항**

### 🔒 **보안**
- `.env` 파일들은 절대 커밋하지 말 것 (.gitignore로 보호됨)
- `.env.example` 파일들만 템플릿으로 관리

### 🔄 **환경 동기화**
- 작업 시작 전: `git pull` 후 `work-start-checklist.md` 참조
- 작업 종료 시: `work-end-checklist.md` 참조 후 안전하게 commit/push

### 💡 **효율적 작업**
- 문제 발생 시: `docs/02-operations/troubleshooting.md` 우선 확인
- 새 환경 설정: `docs/01-setup/environment-setup.md` 참조
- Cursor 협업: `docs/cursor-guide.md`의 환경별 템플릿 활용

---

## 📝 **이 문서 사용법**

1. **새 채팅 시작 시**: 위의 "프로젝트 상황 요약" 부분을 복사해서 첫 메시지로 전달
2. **작업 요청 시**: "작업 요청 템플릿" 활용
3. **문제 발생 시**: 해당 문서 링크 제공
4. **환경 변경 시**: 환경 정보만 수정해서 재전달

---

**마지막 업데이트**: 2024-06-18  
**완전성**: 개발환경 정비 100% 완료  
**다음 작업**: 실제 기능 개발 및 확장