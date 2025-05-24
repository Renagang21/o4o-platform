# 🔁 15. yaksa.site 초기 통합 흐름 점검 문서

## 🎯 목적
yaksa.site의 메인 화면부터 로그인/회원가입, 권한 분기, 상품 등록까지  
사용자 흐름이 실제로 작동하는지 점검하는 테스트 시나리오를 구성합니다.

---

## ✅ 1. 기본 라우팅 확인

| 경로 | 확인 사항 |
|------|-----------|
| `/` | 메인화면 렌더링, OnboardingBanner 노출 여부 |
| `/login` | 로그인 폼, social 버튼, 로그인 후 리디렉션 동작 |
| `/register` | 회원가입 폼, yaksa 여부 선택, 가입 성공 → 토스트 메시지 |
| `/profile` | 로그인 사용자 정보 표시, 로그아웃/비밀번호 변경 작동 |
| `/products/my` | yaksa 접근 가능 여부, 비로그인 또는 b2c는 접근 차단 |
| `/admin/approvals` | 관리자만 접근 가능 (403 리디렉션 확인) |

---

## 🔐 2. 사용자 역할 흐름

### 2.1 일반 사용자(B2C)
- 회원가입 후 자동 승인
- 로그인 시 `/` 이동
- `products/my`, `admin/*` 경로 접근 시 `/403` 리디렉션

### 2.2 약사(yaksa)
- 회원가입 시 기본 role: b2c
- 승인 후 role: yaksa 로 변경 (현재는 수동 변경 필요)
- 승인되면 상품 등록 경로 접근 가능

### 2.3 관리자(admin)
- `/admin/approvals` 접근 가능
- yaksa 사용자 승인 처리 가능 (기능 준비 중)

---

## 🧪 3. 인증 흐름

- ✅ 로그인 후 `user` 정보 Context에 저장
- ✅ 새로고침 시 localStorage에서 정보 복원
- ✅ 로그아웃 시 Context 및 저장소 초기화
- ✅ 로그인 후 protected route 정상 접근 가능 여부

---

## 💡 4. UI 요소 점검

- 🌓 다크모드 전환
- 🧠 OnboardingBanner: 최초 로그인 후 role 기반 메시지 표시
- 🧾 Toast 알림 UI: 로그인, 로그아웃, 실패 처리 등
- ⌛ 로딩 상태 및 에러 처리 메시지 확인

---

## 📁 핵심 파일

| 파일 | 설명 |
|------|------|
| `App.tsx` | 전체 라우팅 연결 |
| `AuthContext.tsx` | 로그인 상태 및 역할 관리 |
| `Home.tsx` | 초기화면 진입 및 진입 버튼 |
| `Login.tsx`, `Register.tsx` | 인증 흐름 UI |
| `YaksaProtectedRoute.tsx`, `RoleProtectedRoute.tsx` | 역할 보호 기능 |

---

## ✅ 통합 확인용 테스트 사용자 계정 예시

| 유형 | 이메일 | 비밀번호 | 상태 |
|------|--------|----------|------|
| 일반 사용자 | test@b2c.com | test1234 | 자동 승인됨 |
| 약사 회원 | test@yaksa.com | test1234 | 승인 전: b2c, 승인 후: yaksa |
| 관리자 | admin@yaksa.com | admin1234 | role: admin |

> 이 계정은 수동으로 localStorage 초기화하거나 직접 role을 바꿔서 확인할 수 있음

---

## 🔍 5. 테스트 시나리오 실행 방법

### 5.1 로컬 개발 환경 설정
```bash
# 프로젝트 디렉토리로 이동
cd o4o-platform/yaksa-main-site

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 5.2 테스트 계정 설정
1. 브라우저 개발자 도구 열기 (F12)
2. Application 탭 → Local Storage
3. `user` 키에 아래 JSON 데이터 입력:

```json
// 일반 사용자
{
  "id": "1",
  "email": "test@b2c.com",
  "role": "b2c",
  "name": "테스트 사용자"
}

// 약사
{
  "id": "2",
  "email": "test@yaksa.com",
  "role": "yaksa",
  "name": "테스트 약사"
}

// 관리자
{
  "id": "3",
  "email": "admin@yaksa.com",
  "role": "admin",
  "name": "관리자"
}
```

### 5.3 테스트 순서
1. 메인 화면 접속 (`/`)
2. 로그아웃 상태에서 각 보호된 경로 접근 시도
3. 회원가입 진행 (B2C, Yaksa 각각)
4. 로그인 후 권한별 접근 가능 경로 확인
5. 다크모드 전환 및 UI 요소 점검
6. OnboardingBanner 및 Toast 메시지 확인

---

## ⚠️ 6. 주의사항

- 현재는 mock 데이터를 사용하므로 실제 API 연동 시 추가 테스트 필요
- localStorage 데이터는 브라우저를 닫아도 유지되므로, 테스트 후 수동 삭제 필요
- 권한 변경 테스트 시 localStorage의 user 객체 직접 수정
- 새로고침 시 Context 복원 확인 필수

---

## 📝 7. 버그 리포트 템플릿

발견된 문제는 아래 형식으로 기록:

```markdown
### 문제 설명
[문제 상황 상세 설명]

### 재현 방법
1. [단계 1]
2. [단계 2]
3. [단계 3]

### 예상 동작
[정상적으로 동작했을 때의 결과]

### 실제 동작
[현재 발생하는 문제]

### 환경
- 브라우저: [버전]
- OS: [버전]
- 화면 크기: [해상도]
``` 