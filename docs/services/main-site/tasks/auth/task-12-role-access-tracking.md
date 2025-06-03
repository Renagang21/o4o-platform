# 🧾 Task 12: 역할 기반 접근 기록 및 통계 기능 통합

## 📌 목적

사용자의 페이지 접근 및 역할 변경 활동을 기록하고,  
관리자 대시보드에서 이를 시각화하여 운영에 도움을 주는 기능을 개발합니다.

---

## ✅ 기능 구성

### 1️⃣ 접근 기록 로그 (Access Log)

#### 📦 기능
- 사용자 접근 시도 시 기록 (userId, pagePath, timestamp)
- API 예: `POST /api/access-log`

#### 💻 클라이언트 코드 (예시)
```ts
// src/utils/logAccess.ts
export async function logAccess(userId: string, page: string) {
  await fetch('/api/access-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, page, timestamp: Date.now() }),
  });
}
```

```tsx
// RoleProtectedPage.tsx
if (user) logAccess(user.id, location.pathname);
```

---

### 2️⃣ 역할 변경 이력 기록 (Role Change History)

#### 📦 기능
- 관리자가 사용자 역할을 변경할 때 이력을 기록
- 기록 내용: 관리자 ID, 대상 사용자 ID, 변경된 roles, timestamp
- API 예: `POST /api/role-history`

#### 💻 클라이언트 코드 (예시)
```ts
// src/utils/logRoleChange.ts
export async function logRoleChange(adminId: string, targetUserId: string, newRoles: UserRole[]) {
  await fetch('/api/role-history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminId, targetUserId, newRoles, timestamp: Date.now() }),
  });
}
```

```tsx
// UserRoleManager.tsx
await logRoleChange(currentAdminId, user.id, pendingRoles[user.id]);
```

---

### 3️⃣ 관리자 대시보드 통계 시각화

#### 📦 기능
- 접근 로그, 역할 변경 이력 등 통계 데이터를 집계
- 관리자 페이지에서 시각화 (예: 페이지별 접근 수량, 역할별 분포 등)

#### 💻 시각화 예시
```tsx
// src/pages/admin/AdminStats.tsx
import { Bar } from 'react-chartjs-2';

<Bar data={chartData} options={chartOptions} />
```

---

## 🔐 보호 조건

- 이 기능은 `administrator`, `operator`만 접근 가능
- `RoleProtectedRoute allowedRoles={['administrator', 'operator']}`로 보호

---

## 🧪 테스트 조건

- 페이지 접근 시 로그 API 호출 확인
- 역할 변경 시 이력 API 호출 확인
- 관리자 대시보드에서 통계 차트 정상 표시

---

## 📎 참고 문서

- `task-09-role-change-ui.md`
- `task-10-roles-array-implementation.md`
- `task-11-403-page.md`
