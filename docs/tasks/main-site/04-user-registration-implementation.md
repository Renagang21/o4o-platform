# Cursor 구현 요청서: 사용자 가입 처리 기능

## 📋 구현 목표
o4o-platform에서 사용자 회원가입 기능을 완전히 구현하여 프론트엔드 가입 폼과 Medusa.js 백엔드 API를 연동합니다.

## 🔧 기술 요구사항
- **백엔드**: Medusa.js 프레임워크 기반
- **프론트엔드**: React + TypeScript + Tailwind CSS
- **데이터베이스**: PostgreSQL
- **인증**: JWT 토큰 기반
- **유효성 검증**: 이메일 형식, 비밀번호 강도 확인

## 📁 파일 구조
```
ecommerce/api/
├── src/
│   ├── routes/auth/              # 새로 생성
│   │   └── register.js           # 회원가입 라우트
│   ├── services/                 # 커스터마이징 서비스
│   │   └── user-registration.js  # 회원가입 로직
│   └── models/                   # 필요시 사용자 모델 확장

main-site/src/
├── pages/
│   └── Register.tsx              # 기존 파일 개선
├── utils/
│   └── api.ts                    # API 호출 함수 추가
└── context/
    └── AuthContext.tsx           # 인증 상태 관리 개선
```

## 🎯 구현 사항

### 1. 백엔드 API 구현 (Medusa.js)

#### 1.1 회원가입 엔드포인트 생성
- **경로**: `POST /auth/register`
- **요청 데이터**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123!",
  "confirm_password": "securePassword123!"
}
```
- **응답 데이터** (성공):
```json
{
  "success": true,
  "message": "회원가입이 완료되었습니다.",
  "user": {
    "id": "user_01234567890",
    "email": "user@example.com",
    "created_at": "2025-06-05T10:00:00Z"
  },
  "token": "jwt_token_here"
}
```
- **응답 데이터** (실패):
```json
{
  "success": false,
  "message": "이미 존재하는 이메일입니다.",
  "errors": {
    "email": ["이메일이 이미 사용 중입니다."]
  }
}
```

#### 1.2 서버사이드 유효성 검증
- 이메일 형식 검증 (정규식)
- 이메일 중복 확인
- 비밀번호 강도 검증 (최소 8자, 영문+숫자+특수문자)
- 비밀번호 확인 일치 검증

#### 1.3 보안 처리
- bcrypt를 사용한 비밀번호 해싱
- JWT 토큰 생성 및 반환
- 에러 메시지 표준화

### 2. 프론트엔드 구현 개선

#### 2.1 Register.tsx 컴포넌트 개선
- **입력 필드**:
  - 이메일 (email validation)
  - 비밀번호 (강도 표시기 포함)
  - 비밀번호 확인
- **실시간 유효성 검증**:
  - 이메일 형식 확인 (타이핑 중)
  - 비밀번호 강도 표시
  - 비밀번호 일치 여부 확인
- **UI 상태 관리**:
  - 로딩 상태 (가입 처리 중)
  - 에러 메시지 표시
  - 성공 메시지 및 리디렉션

#### 2.2 API 연동 구현
```typescript
// utils/api.ts
export const registerUser = async (userData: {
  email: string;
  password: string;
  confirm_password: string;
}) => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  
  return response.json();
};
```

#### 2.3 인증 컨텍스트 업데이트
- 가입 성공 시 자동 로그인 처리
- JWT 토큰 저장 (localStorage 또는 secure cookie)
- 사용자 상태 업데이트

### 3. UX/UI 개선사항

#### 3.1 폼 디자인
- Tailwind CSS 기반 모던한 디자인
- 입력 필드 포커스 효과
- 에러 상태 시각적 표시 (빨간 테두리, 에러 아이콘)
- 성공 상태 표시 (체크 아이콘)

#### 3.2 사용자 가이드
- 비밀번호 규칙 표시
- 실시간 유효성 검증 피드백
- 가입 완료 후 안내 메시지

#### 3.3 접근성 고려
- 스크린 리더 지원 (aria-label)
- 키보드 네비게이션 지원
- 적절한 대비율 유지

## ✅ 테스트 시나리오

### 백엔드 테스트
1. **정상 가입**: 유효한 이메일과 비밀번호로 가입 성공
2. **중복 이메일**: 이미 존재하는 이메일로 가입 시도
3. **잘못된 이메일**: 유효하지 않은 이메일 형식
4. **약한 비밀번호**: 규칙에 맞지 않는 비밀번호
5. **비밀번호 불일치**: 확인 비밀번호가 다른 경우

### 프론트엔드 테스트
1. **폼 유효성 검증**: 각 필드의 실시간 검증 동작
2. **API 호출**: 백엔드와의 정상적인 통신 확인
3. **에러 처리**: 서버 오류 시 적절한 에러 메시지 표시
4. **성공 처리**: 가입 성공 시 로그인 상태 변경 및 리디렉션
5. **로딩 상태**: 처리 중 상태의 UI 반응

## 🔗 참고 문서
- [Medusa.js 커스터마이징 가이드](https://docs.medusajs.com/)
- [React Hook Form 문서](https://react-hook-form.com/)
- [Tailwind CSS 컴포넌트](https://tailwindui.com/)

## 📌 구현 순서
1. Medusa.js 백엔드 회원가입 API 구현
2. 프론트엔드 Register 컴포넌트 개선
3. API 연동 및 상태 관리 구현
4. 유효성 검증 및 에러 처리 완성
5. UI/UX 개선 및 테스트

## 🚨 주의사항
- 비밀번호는 반드시 해싱하여 저장
- JWT 토큰은 적절한 만료 시간 설정
- CORS 정책 확인 및 설정
- 프로덕션 환경에서는 HTTPS 필수
- 개인정보 처리 방침 준수

---

**이 문서를 기반으로 사용자 가입 처리 기능을 단계별로 구현해주세요.**
