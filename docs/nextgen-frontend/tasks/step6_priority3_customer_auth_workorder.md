# 📄 **Priority 3 — Customer/Auth Function Component 변환 Work Order**

## NextGen Frontend Customer & Auth Migration Package

Version: 2025-12
Author: ChatGPT PM

---

## 0. 목적

Priority 3에서는 **고객/인증(Customer/Auth)** 관련 기능 전체를
기존 shortcode 기반 구조에서
NextGen **Function Component + UI Component + View JSON** 구조로 재구성한다.

이 단계가 끝나면 NextGen Frontend는 아래 기능을 완전히 갖추게 된다:

* 로그인(Login)
* 회원가입(Signup)
* 비밀번호 재설정(Reset Password)
* 마이페이지(My Account Dashboard)
* 주문내역(개인용 Order History)
* 위시리스트(Wishlist)
* 프로필(Profile)

Priority 1 + 2에 이어
**사이트 전체 사용자 흐름이 완성되는 핵심 단계**이다.

---

## 1. 변환 대상 컴포넌트 목록 (총 7개)

| 카테고리     | 컴포넌트              | 목적        |
| -------- | ----------------- | --------- |
| Auth     | LoginForm         | 로그인       |
| Auth     | SignupForm        | 회원가입      |
| Auth     | ResetPasswordForm | 비밀번호 재설정  |
| Customer | CustomerDashboard | 개인 대시보드   |
| Customer | WishlistView      | 위시리스트     |
| Customer | MyAccountOverview | 계정 요약     |
| Customer | ProfileForm       | 사용자 정보 수정 |

---

## 2. 작업에 필요한 폴더 구조

NextGen 구조로 아래 폴더를 생성:

```
apps/main-site-nextgen/src/
  shortcodes/_functions/customer/
      login.ts
      signup.ts
      resetPassword.ts
      myAccount.ts
      wishlist.ts
      profile.ts

  hooks/queries/customer/
      useMyAccount.ts
      useWishlist.ts
      useProfile.ts

  components/ui/customer/
      LoginForm.tsx
      SignupForm.tsx
      ResetPasswordForm.tsx
      CustomerOverview.tsx
      WishlistList.tsx
      ProfileForm.tsx

  views/
      login.json
      signup.json
      reset-password.json
      my-account.json
      wishlist.json
      profile.json
```

---

## 3. Fetch Hook 생성

### 예: MyAccount

**파일:** `useMyAccount.ts`

```ts
export function useMyAccount() {
  return useQuery({
    queryKey: ["my-account"],
    queryFn: () => axios.get("/api/customer/account").then(r => r.data),
  });
}
```

### Wishlist

```ts
export function useWishlist() {
  return useQuery({
    queryKey: ["wishlist"],
    queryFn: () => axios.get("/api/customer/wishlist").then(r => r.data),
  });
}
```

### Profile

```ts
export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => axios.get("/api/customer/profile").then(r => r.data),
  });
}
```

---

## 4. Function Component 템플릿

Function Component는 **데이터 → UI Props 변환**만 담당한다.

예: MyAccount

```ts
export const myAccount = (props, context) => {
  const data = props.data || {};

  return {
    type: "CustomerOverview",
    props: {
      name: data.name,
      email: data.email,
      ordersCount: data.ordersCount,
      wishlistCount: data.wishlistCount,
    }
  };
};
```

Wishlist:

```ts
export const wishlist = (props, context) => {
  const items = props.data?.items || [];

  return {
    type: "WishlistList",
    props: { items }
  };
};
```

Login:

```ts
export const login = (props, context) => {
  return {
    type: "LoginForm",
    props: {}
  };
};
```

---

## 5. UI Component 템플릿

### LoginForm.tsx

```tsx
export function LoginForm() {
  return (
    <div className="max-w-md mx-auto p-8 bg-white rounded shadow-sm">
      <h2 className="text-xl font-bold mb-4">로그인</h2>
      <form className="flex flex-col gap-4">
        <input className="border rounded p-2" placeholder="Email" />
        <input className="border rounded p-2" placeholder="Password" type="password" />
        <button className="bg-black text-white py-2 rounded">로그인</button>
      </form>
    </div>
  );
}
```

### SignupForm.tsx

```tsx
export function SignupForm() {
  return (
    <div className="max-w-md mx-auto p-8 bg-white rounded shadow-sm">
      <h2 className="text-xl font-bold mb-4">회원가입</h2>
      <form className="flex flex-col gap-4">
        <input className="border rounded p-2" placeholder="Email" />
        <input className="border rounded p-2" placeholder="Password" type="password" />
        <button className="bg-black text-white py-2 rounded">가입하기</button>
      </form>
    </div>
  );
}
```

### CustomerOverview.tsx

```tsx
export function CustomerOverview({ name, email, ordersCount, wishlistCount }) {
  return (
    <div className="p-6 bg-white rounded shadow-sm">
      <h2 className="text-lg font-bold mb-2">{name} 님의 계정</h2>
      <p className="text-gray-600 mb-1">{email}</p>
      <p>주문 수: {ordersCount}</p>
      <p>위시리스트: {wishlistCount}개</p>
    </div>
  );
}
```

### WishlistList.tsx

```tsx
export function WishlistList({ items }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map((item, index) => (
        <div key={index} className="p-4 bg-white rounded shadow">
          {item.title}
        </div>
      ))}
    </div>
  );
}
```

---

## 6. View JSON 템플릿

로그인 화면: `login.json`

```json
{
  "viewId": "login",
  "layout": { "type": "AuthLayout" },
  "components": [
    { "type": "login", "props": {} }
  ]
}
```

회원가입: `signup.json`

```json
{
  "viewId": "signup",
  "layout": { "type": "AuthLayout" },
  "components": [
    { "type": "signup", "props": {} }
  ]
}
```

마이페이지: `my-account.json`

```json
{
  "viewId": "my-account",
  "layout": { "type": "DashboardLayout" },
  "components": [
    {
      "type": "myAccount",
      "props": {
        "fetch": {
          "queryKey": ["my-account"],
          "url": "/api/customer/account"
        }
      }
    }
  ]
}
```

위시리스트:

```json
{
  "viewId": "wishlist",
  "layout": { "type": "DashboardLayout" },
  "components": [
    {
      "type": "wishlist",
      "props": {
        "fetch": {
          "queryKey": ["wishlist"],
          "url": "/api/customer/wishlist"
        }
      }
    }
  ]
}
```

---

## 7. URL 매핑

`view/loader.ts` 추가:

```ts
"/login": "login",
"/signup": "signup",
"/reset-password": "reset-password",
"/my-account": "my-account",
"/wishlist": "wishlist",
"/profile": "profile",
```

---

## 8. Registry 등록

**function.ts**

```ts
export const FunctionRegistry = {
  login,
  signup,
  resetPassword,
  myAccount,
  wishlist,
  profile,
};
```

**ui.ts**

```ts
export const UIComponentRegistry = {
  LoginForm,
  SignupForm,
  ResetPasswordForm,
  CustomerOverview,
  WishlistList,
  ProfileForm,
};
```

---

## 9. 성공 판정 기준 (DoD)

* [ ] 로그인 화면 렌더링 성공
* [ ] 회원가입 화면 렌더링 성공
* [ ] 마이페이지 데이터 fetch 성공
* [ ] Wishlist 렌더링 성공
* [ ] ViewRenderer를 통해 전체 흐름 정상
* [ ] Layout (AuthLayout / DashboardLayout) 정상 작동
* [ ] TS 에러 없음
* [ ] fetch 에러 처리 정상
* [ ] 모든 화면에서 콘솔 에러 없음

---

## 10. 예상 개발 시간

총: **약 18시간**

* Fetch Hooks: 3h
* Function Components: 5h
* UI Components: 6h
* View JSON: 2h
* Registry 등록: 1h
* 테스트: 1h

---

## ✔ Priority 3 Work Order 생성 완료

---
