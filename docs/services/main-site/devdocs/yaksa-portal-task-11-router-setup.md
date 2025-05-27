
# 🧾 Task 11: yaksa.site 전체 라우터 구성 및 연결

## 🎯 목적
지금까지 정의된 페이지 컴포넌트를 실제 라우팅 시스템에 연결하여, 사용자가 URL로 접근할 수 있도록 라우터를 설정한다.

---

## ✅ 라우터 설정 파일
- 위치: `src/routes/index.tsx` 또는 `App.tsx` 내 React Router 설정

---

## 🔌 연결할 경로 및 보호 구조

| 경로 | 컴포넌트 | 보호 방식 |
|------|-----------|------------|
| `/` | `<Home />` | 공개 |
| `/login` | `<Login />` | 공개 |
| `/register` | `<Register />` | 공개 |
| `/shop` | `<Shop />` | `<ProtectedRoute />` |
| `/yaksa-shop` | `<YaksaShop />` | `<YaksaProtectedRoute />` |
| `/yaksa/dashboard` | `<Dashboard />` | `<YaksaProtectedRoute />` |
| `/yaksa/notifications` | `<Notifications />` | `<YaksaProtectedRoute />` |
| `/yaksa/profile` | `<Profile />` | `<YaksaProtectedRoute />` |
| `/admin/yaksa-approvals` | `<YaksaApprovals />` | `<RoleProtectedRoute roles={['superadmin']}>` |

---

## 🧱 구현 가이드

### 1. Router 구조 예시 (React Router v6)

```tsx
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />

  <Route path="/shop" element={
    <ProtectedRoute><Shop /></ProtectedRoute>
  } />
  <Route path="/yaksa-shop" element={
    <YaksaProtectedRoute><YaksaShop /></YaksaProtectedRoute>
  } />
  <Route path="/yaksa/dashboard" element={
    <YaksaProtectedRoute><Dashboard /></YaksaProtectedRoute>
  } />
  <Route path="/yaksa/notifications" element={
    <YaksaProtectedRoute><Notifications /></YaksaProtectedRoute>
  } />
  <Route path="/yaksa/profile" element={
    <YaksaProtectedRoute><Profile /></YaksaProtectedRoute>
  } />
  <Route path="/admin/yaksa-approvals" element={
    <RoleProtectedRoute roles={['superadmin']}>
      <YaksaApprovals />
    </RoleProtectedRoute>
  } />
</Routes>
```

---

## 📎 참고 문서

- `yaksa-portal-task-00-start.md`
- `yaksa-portal-task-03-protected-route.md`
- `yaksa-portal-task-06-yaksa-protection.md`
- `yaksa-portal-task-07-admin-approval.md`
