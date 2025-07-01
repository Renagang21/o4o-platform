# 🌿 Git 워크플로우 가이드

> **O4O Platform 팀 개발을 위한 Git 브랜치 전략 및 워크플로우**
> 
> **기준일**: 2025-06-25  
> **적용 대상**: 모든 개발자

---

## 🎯 **브랜치 전략 개요**

### **브랜치 구조**
```
main
├── develop
│   ├── feature/api-enhancement
│   ├── feature/ui-improvement
│   └── feature/new-payment-system
├── release/v1.1.0
└── hotfix/critical-bug-fix
```

### **브랜치 규칙**

| 브랜치 | 목적 | 생성 기준 | 병합 대상 |
|--------|------|-----------|-----------|
| **main** | 프로덕션 코드 | - | - |
| **develop** | 개발 통합 브랜치 | main에서 분기 | main |
| **feature/** | 새 기능 개발 | develop에서 분기 | develop |
| **release/** | 릴리즈 준비 | develop에서 분기 | main + develop |
| **hotfix/** | 긴급 수정 | main에서 분기 | main + develop |

---

## 🔧 **개발 워크플로우**

### **1. 새 기능 개발**

```bash
# 1. develop 브랜치로 전환 및 최신화
git checkout develop
git pull origin develop

# 2. feature 브랜치 생성
git checkout -b feature/user-authentication
# 명명 규칙: feature/기능명-간단설명

# 3. 개발 작업
# ... 코딩 ...

# 4. 커밋 (의미있는 단위로)
git add .
git commit -m "feat: add JWT authentication system"

# 5. 원격 저장소에 푸시
git push origin feature/user-authentication

# 6. Pull Request 생성
# GitHub에서 feature/user-authentication → develop으로 PR
```

### **2. Pull Request 프로세스**

#### **PR 생성 시 체크리스트**
- [ ] **코드 품질**: ESLint/Prettier 통과
- [ ] **타입 검사**: TypeScript 컴파일 오류 없음
- [ ] **테스트**: 관련 테스트 작성/수정
- [ ] **문서**: README 또는 API 문서 업데이트
- [ ] **충돌 해결**: develop과 충돌 없음

#### **PR 템플릿**
```markdown
## 🎯 변경 사항
<!-- 무엇을 변경했는지 간략히 설명 -->

## 📋 체크리스트
- [ ] 코드 품질 검사 통과
- [ ] 타입 검사 통과  
- [ ] 테스트 작성/업데이트
- [ ] 문서 업데이트

## 🧪 테스트 방법
<!-- 어떻게 테스트했는지 설명 -->

## 📸 스크린샷 (UI 변경 시)
<!-- UI 변경사항이 있다면 스크린샷 -->
```

### **3. 코드 리뷰 가이드라인**

#### **리뷰어 체크포인트**
```typescript
// ✅ 좋은 예: 명확한 타입 정의
interface UserCreateRequest {
  email: string;
  password: string;
  role: UserRole;
}

// ❌ 피해야 할 것: any 타입 사용
function processUser(userData: any) { ... }
```

#### **리뷰 코멘트 가이드**
- **P1 (Critical)**: 필수 수정 사항
- **P2 (Major)**: 권장 수정 사항  
- **P3 (Minor)**: 제안 사항
- **Praise**: 좋은 코드에 대한 칭찬

---

## 📦 **릴리즈 프로세스**

### **릴리즈 브랜치 생성**
```bash
# develop에서 릴리즈 브랜치 생성
git checkout develop
git pull origin develop
git checkout -b release/v1.1.0

# 버전 업데이트
npm version minor  # 1.0.0 → 1.1.0

# 최종 테스트 및 버그 수정
# ... 작업 ...

# main으로 병합
git checkout main
git merge --no-ff release/v1.1.0
git tag v1.1.0

# develop으로도 병합 (버전 정보 동기화)
git checkout develop  
git merge --no-ff release/v1.1.0

# 릴리즈 브랜치 삭제
git branch -d release/v1.1.0
```

---

## 🚨 **핫픽스 프로세스**

### **긴급 수정 시**
```bash
# main에서 hotfix 브랜치 생성
git checkout main
git pull origin main
git checkout -b hotfix/critical-payment-bug

# 긴급 수정 작업
# ... 수정 ...

# 커밋
git commit -m "fix: resolve payment processing error"

# main과 develop 모두에 병합
git checkout main
git merge --no-ff hotfix/critical-payment-bug
git tag v1.0.1

git checkout develop
git merge --no-ff hotfix/critical-payment-bug

# hotfix 브랜치 삭제
git branch -d hotfix/critical-payment-bug
```

---

## ✍️ **커밋 메시지 규칙**

### **Conventional Commits 사용**
```bash
# 형식: type(scope): description

# 새 기능
git commit -m "feat(auth): add JWT token validation"

# 버그 수정  
git commit -m "fix(api): resolve user registration error"

# 문서 업데이트
git commit -m "docs(api): update endpoint documentation"

# 리팩토링
git commit -m "refactor(user): simplify role checking logic"

# 테스트 추가
git commit -m "test(auth): add unit tests for login flow"
```

### **타입 정의**
| 타입 | 설명 | 예시 |
|------|------|------|
| **feat** | 새 기능 | feat: add user authentication |
| **fix** | 버그 수정 | fix: resolve payment error |
| **docs** | 문서 변경 | docs: update API guide |
| **style** | 코드 스타일 | style: fix linting issues |
| **refactor** | 리팩토링 | refactor: optimize query performance |
| **test** | 테스트 추가/수정 | test: add integration tests |
| **chore** | 기타 작업 | chore: update dependencies |

---

## 🔍 **브랜치 관리**

### **로컬 브랜치 정리**
```bash
# 병합된 브랜치 확인
git branch --merged

# 병합된 브랜치 일괄 삭제
git branch --merged | grep -v "main\|develop" | xargs -n 1 git branch -d

# 원격 추적 브랜치 정리
git remote prune origin
```

### **브랜치 명명 규칙**
```bash
# 기능 개발
feature/user-authentication
feature/payment-integration
feature/admin-dashboard

# 버그 수정
bugfix/login-error
bugfix/cart-calculation

# 실험적 기능
experiment/new-ui-design
experiment/performance-optimization
```

---

## 🛡️ **브랜치 보호 규칙**

### **main 브랜치 보호**
- ✅ PR을 통해서만 병합 허용
- ✅ 최소 1명 이상 리뷰 필수
- ✅ 상태 검사 통과 필수 (CI/CD)
- ✅ 최신 상태여야 병합 가능

### **develop 브랜치 보호**
- ✅ PR을 통해서만 병합 허용
- ✅ CI/CD 검사 통과 필수
- ✅ 충돌 해결 후 병합

---

## 📊 **워크플로우 체크리스트**

### **매일 개발 시작 전**
- [ ] `git checkout develop`
- [ ] `git pull origin develop`
- [ ] 새 feature 브랜치 생성

### **코딩 완료 후**
- [ ] 의미있는 단위로 커밋
- [ ] 커밋 메시지 규칙 준수
- [ ] `git push origin feature/branch-name`

### **PR 생성 전**
- [ ] develop과 충돌 확인/해결
- [ ] 코드 품질 검사 통과
- [ ] 테스트 작성/업데이트

### **병합 완료 후**
- [ ] feature 브랜치 삭제
- [ ] 로컬 브랜치 정리

---

## 🎯 **팀 협업 팁**

### **충돌 최소화**
```bash
# 자주 develop과 동기화
git checkout feature/my-branch
git fetch origin
git rebase origin/develop
```

### **리베이스 vs 머지**
- **feature → develop**: Squash merge 사용
- **develop → main**: No-fast-forward merge 사용
- **충돌 해결**: 리베이스 권장

### **협업 시 주의사항**
- 🚫 **금지**: main에 직접 push
- 🚫 **금지**: force push to shared branches  
- ✅ **권장**: 작은 단위로 자주 커밋
- ✅ **권장**: 의미있는 커밋 메시지

---

<div align="center">

**🌿 체계적인 Git 워크플로우로 안전한 협업! 🌿**

[📏 코딩 표준](coding-standards.md) • [🧪 테스트 가이드](testing-guide.md) • [🆘 트러블슈팅](../01-getting-started/troubleshooting.md)

</div>
