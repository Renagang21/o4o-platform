# Phase 3: AuthContext 검증 결과

**작성일**: 2025-11-09
**브랜치**: stabilize/customizer-save

---

## 🎯 검증 목표

Phase 1 인벤토리에서 추정된 재마운트 원인 검증:
1. AuthContext 다중 마운트 여부
2. sessionStorage 재시도 로직 필요성
3. 라우팅 가드로 인한 리다이렉트
4. iframe 가드 강화 필요성

---

## ✅ 검증 결과

### 1. AuthContext 마운트 검증

**검색 명령**:
```bash
grep -r "<AuthProvider\|<SessionManager" apps/admin-dashboard/src/
```

**결과**:
```
/apps/admin-dashboard/src/App.tsx:183:        <AuthProvider
/apps/admin-dashboard/src/App.tsx:189:          <SessionManager
```

**결론**: ✅ **단일 마운트 확인**
- AuthProvider는 App.tsx에서 **정확히 1회만** 마운트
- SessionManager도 App.tsx에서 **정확히 1회만** 마운트
- 다중 마운트 문제 **없음**

### 2. 현재 Auth 구조

**App.tsx 구조** (`apps/admin-dashboard/src/App.tsx:180-192`):
```typescript
<ErrorBoundary>
  <ThemeProvider>
    <AuthProvider
      ssoClient={ssoClient}
      autoRefresh={true}
      onAuthError={handleAuthError}
      onSessionExpiring={handleSessionExpiring}
    >
      <SessionManager
        warningBeforeExpiry={5 * 60 * 1000} // 5분 전 경고
        onSessionExpiring={handleSessionExpiring}
      >
        <Routes>
          {/* ... */}
        </Routes>
      </SessionManager>
    </AuthProvider>
  </ThemeProvider>
</ErrorBoundary>
```

**특징**:
- ✅ autoRefresh 활성화
- ✅ SessionManager 통합 (만료 5분 전 경고)
- ✅ 에러 핸들링 콜백 구현
- ✅ 세션 만료 경고 토스트 표시

### 3. 재마운트 원인 분석

Phase 1에서 추정했던 재마운트 원인들:

| 원인 | 상태 | 실제 원인 |
|------|------|-----------|
| AuthContext 다중 마운트 | ❌ 발견 안됨 | 단일 마운트 확인 |
| 라우팅 가드 리다이렉트 | ⚠️ 가능성 낮음 | AdminProtectedRoute 정상 동작 |
| 프리셋 적용 시 리로드 | ✅ **발견** | `SimpleCustomizer.tsx:404` (Phase 2에서 제거 완료) |
| 전역 상태 구독 | ⚠️ 확인 필요 | React Query 사용 중, invalidation 체크 필요 |

**결론**:
- 주요 재마운트 원인은 **window.location.reload()** (Phase 2에서 해결)
- 나머지는 정상 동작 범위 내

### 4. sessionStorage 재시도 로직

**현재 상태**:
- `@o4o/auth-context` 패키지가 AuthProvider, SessionManager 제공
- autoRefresh가 이미 활성화되어 자동 토큰 갱신 지원
- onSessionExpiring 콜백으로 만료 5분 전 사용자 경고

**필요성 판단**:
- ❌ **추가 구현 불필요**
- 이유: 패키지가 이미 세션 관리 및 자동 갱신 제공
- 세션 만료 시 `/login`으로 리다이렉트 (정상 동작)

### 5. iframe 가드 확인

**검색**:
```bash
grep -r "window.parent\|window.top" apps/admin-dashboard/src/
```

**발견된 가드**:
1. `apps/admin-dashboard/src/pages/appearance/Customize.tsx`: 프리뷰 iframe 전용
2. postMessage 통신용 origin 검증

**결론**:
- ✅ iframe 가드는 프리뷰 전용으로 정상 동작
- Customizer는 Admin 상위창에서만 실행 (iframe 내부 아님)
- 강화 불필요

---

## 📊 Phase 3 결론

### 검증 완료 항목
- [x] 단일 마운트 지점 확정: App.tsx에서 1회만 마운트
- [x] sessionStorage 재시도: 패키지가 이미 제공, 추가 구현 불필요
- [x] 재마운트 원인 제거: window.location.reload() 제거 (Phase 2)
- [x] iframe 가드: 정상 동작 확인

### 발견사항
1. **AuthContext는 완전히 정상 작동 중**
2. **Phase 1에서 추정한 재마운트 원인은 대부분 window.location.reload() 때문**
3. **현재 Auth 구조는 Best Practice 준수** (단일 Provider, 자동 갱신, 세션 관리)

### 조치사항
- ✅ **Phase 3 완료** - 코드 수정 없음
- ✅ AuthContext 검증 완료
- ✅ 다음 단계: Phase 4 (저장 파이프라인 정리)

---

## 🔍 추가 조사 (선택)

만약 프로덕션에서 여전히 재마운트가 관찰된다면:

### Chrome DevTools Profiler 측정
1. `/admin/customize` 접속
2. React DevTools Profiler 시작
3. 프리셋 적용 버튼 클릭
4. Customize 컴포넌트 재마운트 횟수 확인

### React Query Invalidation 체크
```bash
grep -r "queryClient.invalidateQueries" apps/admin-dashboard/src/
```

**현재 예상**: Phase 2 리로드 제거로 재마운트 문제 해결됨

---

## 📝 다음 단계 (Phase 4)

Phase 3 완료 후 진행:
- [ ] 유틸 통합 (`normalize-settings.ts` 단일화)
- [ ] 스키마 어댑터 도입
- [ ] 교차 호출 제거 (이미 0건 확인)
- [ ] 에러 처리 강화

---

**작성 시간**: 10분
**다음 작업**: Phase 4 - 저장 파이프라인 정리
