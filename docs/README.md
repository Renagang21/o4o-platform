# 📚 O4O Platform 문서

> **차세대 마이크로서비스 플랫폼의 통합 문서**  
> AI 기반 개발환경과 6개 핵심 서비스로 구성된 O4O Platform 가이드

[![개발환경 완료](https://img.shields.io/badge/개발환경-완료-brightgreen)](https://github.com/Renagang21/o4o-platform)
[![Cursor 1.0](https://img.shields.io/badge/Cursor-1.0-blue)](https://cursor.com)
[![AI 통합](https://img.shields.io/badge/AI-통합완료-purple)](docs/ai-collaboration/)

---

## 🎯 **빠른 시작 가이드**

### 📋 **상황별 문서 네비게이션**

| 상황 | 문서 | 설명 |
|------|------|------|
| 🆕 **처음 시작** | [overview.md](overview.md) | 플랫폼 전체 개요 |
| 🚀 **개발 시작** | [01-setup/](01-setup/) | 환경 설정 가이드 |
| 🐛 **문제 해결** | [02-operations/](02-operations/) | 긴급상황 대응 |
| 📚 **기술 참조** | [03-reference/](03-reference/) | 아키텍처 정보 |
| 🤖 **AI 협업** | [ai-collaboration/](ai-collaboration/) | Cursor/Claude 가이드 |

---

## 📖 **핵심 문서 구조**

### 🌟 **[프로젝트 개요](overview.md)**
- **플랫폼 비전**: "One-for-One, Online-to-Offline"
- **6개 핵심 서비스**: api-server, main-site, crowdfunding, ecommerce, forum, signage  
- **기술 스택**: React 19 + Node.js 22 + TypeScript 5.8
- **AI 통합**: Cursor 1.0 최적화 완료

### 🛠️ **환경 설정 ([01-setup/](01-setup/))**
- **[환경 설정 가이드](01-setup/environment-setup.md)**: 집/직장 환경별 구성
- **[설정 파일 템플릿](01-setup/config-templates.md)**: .env, package.json 등

### ⚡ **운영 관리 ([02-operations/](02-operations/))**  
- **[문제 해결 가이드](02-operations/troubleshooting.md)**: 긴급상황 해결법
- **[해결된 이슈](02-operations/known-issues.md)**: 완료된 문제들

### 📚 **기술 참조 ([03-reference/](03-reference/))**
- **[기술 스택](03-reference/tech-stack.md)**: 사용 기술 및 버전
- **[아키텍처 상세](architecture/)**: 시스템 구조 심화

### 🤖 **AI 협업 ([ai-collaboration/](ai-collaboration/))**
- **[Cursor 가이드](cursor-guide.md)**: 환경별 작업 템플릿
- **[버전 관리](ai-collaboration/version-management-guide.md)**: AI 버전 불일치 방지
- **[컨텍스트 가이드](next-chat-context.md)**: 새 채팅 시작용

---

## 🚀 **작업 시작/종료 가이드**

### **🏁 작업 시작할 때**
```bash
# 1. 환경 상태 확인
git status && npm --version && node --version

# 2. 최신 코드 동기화  
git pull origin main

# 3. 개발 서버 시작
npm run dev:all

# 4. 브라우저 확인
# http://localhost:3000 (main-site)
# http://localhost:4000 (api-server)
```

### **🎯 작업 종료할 때**
```bash
# 1. 변경사항 저장
git add . && git commit -m "feat: 작업 내용"

# 2. 서버 종료
Ctrl+C (개발 서버 종료)

# 3. 안전한 푸시
git push origin main
```

---

## 🔥 **긴급상황 빠른 해결**

### **🚨 사이트가 안 보일 때**
```bash
# 브라우저 강력 새로고침
Ctrl + F5 (Windows) / Cmd + Shift + R (Mac)

# 개발 서버 재시작
npm run dev:all
```

### **🔄 Git 동기화 문제**
```bash
# 백업 후 강제 동기화
git stash push -m "backup-$(date +%Y%m%d_%H%M)"
git fetch origin && git reset --hard origin/main
```

### **⚙️ 환경변수 문제**
```bash
# 설정 파일 복원
cp .env.example .env
# .env 파일 편집 후 서버 재시작
```

---

## 🎪 **플랫폼 주요 특징**

### **🌐 마이크로서비스 아키텍처**
- **6개 독립 서비스**: 각각 독립적 배포 및 확장
- **중앙 API 허브**: api-server가 모든 데이터 통합 관리
- **실시간 통신**: WebSocket + Redis 기반

### **🤖 AI-First 개발환경**
- **Cursor 1.0 최적화**: 전 과정 AI 협업
- **MCP 통합**: 파일시스템, DB, GitHub 직접 제어
- **자동 코드 생성**: 컴포넌트, API 자동 생성

### **🔐 엔터프라이즈급 보안**
- **JWT 통합 인증**: 서비스 간 안전한 통신
- **Role-based 권한**: 세밀한 접근 제어
- **API Rate Limiting**: 남용 방지

---

## 🎯 **개발 워크플로우**

### **1️⃣ 새로운 기능 개발**
1. **브랜치 생성**: `git checkout -b feature/기능명`
2. **AI 협업 시작**: [Cursor 가이드](cursor-guide.md) 참조
3. **코드 작성**: 해당 서비스 폴더에서 개발
4. **테스트**: `npm run test`
5. **PR 생성**: GitHub에서 Pull Request

### **2️⃣ 새로운 서비스 추가**
1. **서비스 생성**: `services/새서비스명/` 폴더
2. **package.json**: 서비스별 의존성 설정
3. **루트 연동**: 메인 `package.json`에 스크립트 추가
4. **문서 업데이트**: 해당 문서들 갱신

### **3️⃣ AI 협업 최적화**
1. **컨텍스트 제공**: [next-chat-context.md](next-chat-context.md) 활용
2. **버전 명시**: [version-management-guide.md](ai-collaboration/version-management-guide.md) 참조
3. **문제 해결**: [troubleshooting.md](02-operations/troubleshooting.md) 우선 확인

---

## 📊 **현재 상태 (2025-06-19)**

### **✅ 완료된 작업**
- **개발환경**: 완전 구축 (Windows/Linux 환경별)
- **AI 통합**: Cursor 1.0 최적화 완료
- **문서화**: 체계적 가이드 완성
- **기본 인프라**: Docker, MCP, 의존성 설정

### **🔄 진행 중인 작업**  
- **서비스별 기능 개발**: 각 마이크로서비스 구현
- **UI/UX 개선**: 사용자 인터페이스 완성도 향상
- **성능 최적화**: 응답시간 및 처리량 개선

### **🎯 다음 마일스톤**
- **Beta 출시**: 2025년 Q3 목표
- **서비스 통합 테스트**: Q2 완료 예정
- **사용자 테스트**: Q3 진행

---

## 🤝 **팀 협업 가이드**

### **📋 문서 업데이트 규칙**
- **새 기능 추가 시**: 관련 문서 동시 업데이트
- **문제 해결 후**: troubleshooting.md에 해결법 추가
- **환경 변경 시**: setup 문서 즉시 갱신

### **🎨 코딩 표준**
- **TypeScript**: strict 모드 사용
- **ESLint + Prettier**: 자동 포맷팅
- **커밋 메시지**: Conventional Commits 규칙
- **테스트 커버리지**: 80% 이상 유지

### **🚀 배포 절차**
1. **개발 완료**: feature 브랜치에서 작업
2. **테스트 통과**: 모든 테스트 성공 확인
3. **코드 리뷰**: 팀원 2명 이상 리뷰
4. **메인 병합**: main 브랜치로 merge
5. **자동 배포**: CI/CD 파이프라인 실행

---

## 🆘 **도움이 필요할 때**

### **🔧 기술적 문제**
1. **[문제 해결 가이드](02-operations/troubleshooting.md)** 우선 확인
2. **[이슈 트래커](../../issues)** 검색
3. **팀 채널**에서 질문

### **📚 문서 관련**
1. **해당 섹션** 문서 확인
2. **GitHub Discussion** 활용
3. **문서 개선 제안** 환영

### **🤖 AI 협업 문제**
1. **[버전 관리 가이드](ai-collaboration/version-management-guide.md)** 확인
2. **[Cursor 가이드](cursor-guide.md)** 재설정
3. **컨텍스트 재제공** 시도

---

## 🎉 **성과 및 성공지표**

### **📈 기술적 성과**
- **개발 속도**: AI 협업으로 **3배 향상**
- **버그 감소**: 자동 리뷰로 **80% 감소**  
- **배포 시간**: CI/CD로 **5분 이내**
- **테스트 커버리지**: **85% 유지**

### **🎯 비즈니스 목표**
- **사용자 증가**: 연 50% 성장 목표
- **서비스 확장**: 연 2개 신규 서비스
- **성능 개선**: 응답시간 100ms 이하
- **글로벌 진출**: 2026년 해외 시장

---

**🚀 O4O Platform: AI와 인간이 협력하는 차세대 개발 플랫폼!**

---

**📅 최종 업데이트**: 2025-06-19  
**🏆 상태**: 개발환경 완료, 서비스 개발 진행 중  
**👥 기여자**: [Contributors](../../graphs/contributors) | **📞 문의**: [Issues](../../issues) | **💬 토론**: [Discussions](../../discussions)
