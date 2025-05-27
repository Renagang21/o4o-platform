
# 🔐 Wireframe 08: 역할별 기능 접근 권한 정의

## 🎯 목적
yaksa.site 플랫폼에서 각 사용자 유형(B2C, 약사, 관리자)의 기능 접근을 명확히 구분하여 보안성과 UX를 동시에 확보한다.

---

## ✅ 사용자 역할 정의

| 역할 | 설명 |
|------|------|
| b2c | 일반 소비자 |
| yaksa | 약사, 기업 사용자 |
| admin | 관리자(운영자) |
| superadmin | 시스템 전체 권한 보유자 |

---

## 📋 역할별 접근 권한 매트릭스

| 기능 | b2c | yaksa | admin | superadmin |
|------|-----|-------|--------|-------------|
| 쇼핑몰 접근 | ✅ `/shop` | ✅ `/yaksa-shop` | ❌ | ❌ |
| 펀딩 참여 | ✅ | ✅ | ❌ | ❌ |
| 펀딩 등록 | ❌ | ✅ | ❌ | ❌ |
| 포럼 글 읽기 | ❌ | ✅ | ❌ | ❌ |
| 포럼 글 작성 | ❌ | ✅ | ❌ | ❌ |
| 디지털사이니지 제어 | ❌ | ✅ | ✅ | ✅ |
| 관리자 대시보드 | ❌ | ❌ | ✅ | ✅ |
| 사용자 권한 변경 | ❌ | ❌ | ❌ | ✅ |
| 설정 백업/복원 | ❌ | ❌ | ❌ | ✅ |
| 활동 로그 열람 | ❌ | ❌ | ❌ | ✅ |
| 알림 시스템 | ✅ | ✅ | ✅ | ✅ |

---

## 🔒 보호 컴포넌트 예시

```tsx
<ProtectedRoute roles={['yaksa', 'admin']}>
  <PageComponent />
</ProtectedRoute>

<AdminRoleProtectedRoute roles={['superadmin']}>
  <AdminLogs />
</AdminRoleProtectedRoute>
```

---

## 🛠️ 권한 데이터 관리 방식

- `authStore.ts` 또는 `adminAuthStore.ts`에 역할(role) 저장
- 로그인 응답에서 역할 포함 (JWT claims or API payload)
- 메뉴 렌더링 및 접근 제어에 일관되게 사용

---

## 📎 확장 고려 사항

- 역할별 알림 필터링
- 역할 전환 기능 (관리자가 약사 계정으로 전환 등)
- `ROLE_VIEWER`, `ROLE_EDITOR` 등 하위 역할 체계

---

## ⏭️ 다음 문서

- `ui-theme-system.md`: 테마 설정 및 다크모드 대응 전략
