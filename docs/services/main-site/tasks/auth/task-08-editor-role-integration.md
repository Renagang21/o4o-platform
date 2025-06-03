# 🧾 Task 08: 페이지 편집기에서 역할 제한 설정 기능 구현

## 📌 목적

콘텐츠 페이지를 생성/편집할 때,  
해당 페이지에 **어떤 사용자 역할(roles)만 접근 가능한지** 설정할 수 있는 기능을 편집기(Tiptap 등)에 추가합니다.

예를 들어,  
- 특정 페이지는 `yaksa`, `operator`만 접근 가능  
- 일반 사용자(`user`, `member`)는 접근 시 경고 후 리디렉션  

---

## 🧱 기능 구성

### 1. 편집기 UI 구성

- 페이지 생성/편집 화면에 "접근 가능 역할 선택" 옵션 추가
- 체크박스 또는 멀티셀렉트로 구성
- 예시 UI:
  - `[✓] yaksa`
  - `[✓] partner`
  - `[ ] user`
  - `[ ] member`
- 기본값: 전체 공개 (`[]` 또는 `['user']`)

### 2. 페이지 메타 정보 구조

```ts
{
  title: 'B2B 제품 등록',
  slug: '/b2b/product-upload',
  content: '<p>...</p>',
  allowedRoles: ['yaksa', 'operator', 'administrator']
}
```

- 페이지 JSON 또는 DB 스키마에 `allowedRoles: UserRole[]` 포함

### 3. 렌더링 시 접근 체크

```ts
if (!user || !page.allowedRoles.some(role => user.roles.includes(role))) {
  return <Navigate to="/" />;
}
```

- `RoleProtectedPage` 같은 컴포넌트로 감쌀 수 있음

---

## 🗂️ 구현 위치 제안

- 편집기 통합 모듈: `src/editor/PageEditor.tsx` 또는 `src/pages/admin/editor/`
- 페이지 모델/DB 연동: `pages.meta.ts`, `editor.store.ts`, `page.schema.ts` 등
- 라우팅 시 보호: `PageRenderer`, `RoleProtectedPage.tsx`

---

## 🧪 테스트 조건

- 관리자: 모든 페이지 접근 가능
- user: 제한된 페이지 접근 시 차단 → 메시지 + 리디렉션
- yaksa: 본인 권한이 부여된 페이지만 접근 가능

---

## 📎 참고 문서

- `task-07-role-page-guard.md`
- `task-10-roles-array-implementation.md`
- `o4o-role-definition-guideline.md`

---

**이 기능은 CMS, 포럼, 강의 시스템 등 다양한 콘텐츠 기반 서비스로 확장할 수 있는 핵심 역할 기반 접근 시스템입니다.**
