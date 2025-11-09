# Phase 1: 인벤토리 작성 결과

**작성일**: 2025-11-09
**브랜치**: stabilize/customizer-save

---

## 🔍 1. 교차 호출 목록

### 발견된 neture.co.kr 참조 (Admin → Main Site)

| # | 파일 | 라인 | 내용 | 분류 | 제거 필요 | 대응 |
|---|------|------|------|------|-----------|------|
| 1 | `Customize.tsx` | 40 | `currentHost.replace('admin.', '')` | 프리뷰 URL | ❌ 유지 | iframe src 전용 |
| 2 | `AccessDenied.tsx` | 13, 23 | `https://neture.co.kr` | 리다이렉트 | ⚠️ 검토 | 로그인 페이지로? |
| 3 | `PartnerLinks.tsx` | 30, 31, 50 | 파트너 링크 예시 | 데이터 | ❌ 유지 | 예시 데이터 |
| 4 | `postmessage.ts` | 186, 193 | 허용 origin 목록 | 보안 | ❌ 유지 | iframe 통신용 |
| 5 | `apps.config.ts` | 5, 12, 19, 29 | SSO/앱 URL | 설정 | ❌ 유지 | 환경변수 |

**교차 호출 직접 발견**: **0건** ✅

**결론**:
- Admin에서 Main Site로 직접 API 호출하는 코드 없음
- 모든 참조는 설정/예시/iframe 용도
- `/me`, `/active` 호출은 코드에 없음 (iframe 내부에서만 발생)

---

## 🔄 2. 리로드 트리거 목록

### 발견된 window.location.reload() 사용

| # | 파일 | 라인 | 컨텍스트 | 제거 필요 | 대응 |
|---|------|------|----------|-----------|------|
| 1 | **`SimpleCustomizer.tsx`** | 404 | 프리셋 적용 후 | ✅ **제거** | **설정 다시 로드만** |
| 2 | `WordPressMenuList.tsx` | 292 | 에러 복구 버튼 | ⚠️ 검토 | 토스트 + 재시도 |
| 3 | `StatsOverview/index.tsx` | 137 | 통계 새로고침 | ⚠️ 검토 | API 재호출 |
| 4 | `ErrorBoundary.tsx` | 37, 53 | 에러 복구 | ⚠️ 검토 | 컴포넌트 재마운트 |
| 5 | `PermalinkSettings.tsx` | 463 | 설정 저장 후 | ⚠️ 검토 | 설정 다시 로드 |
| 6 | `versionCheck.ts` | 36 | 버전 업데이트 | ❌ 유지 | 배포 후 필요 |

**Customizer 경로 리로드**: **1건** (SimpleCustomizer.tsx:404)

---

## 🔁 3. 재마운트 유발원 (추정)

### 가능성 높은 원인

#### 1. AuthContext 다중 마운트
- **위치**: 앱 루트 여러 곳
- **원인**: Provider 중복 래핑 가능성
- **대응**: 단일 마운트 지점 확인 필요

#### 2. 라우팅 가드
- **파일**: `src/routes/` (확인 필요)
- **원인**: 인증 체크 시 리다이렉트
- **대응**: 가드 로직 검토

#### 3. 프리셋 적용 시 리로드
- **파일**: `SimpleCustomizer.tsx:404`
- **원인**: `window.location.reload()` 호출
- **대응**: 설정 다시 로드로 대체

#### 4. 전역 상태 구독
- **가능성**: React Query invalidation
- **대응**: 확인 필요

---

## 📊 4. 핵심 발견사항 요약

### ✅ 좋은 소식
1. **교차 호출 없음**: Admin에서 Main Site로 직접 API 호출 0건
2. **깔끔한 분리**: 모든 API는 api.neture.co.kr 통합
3. **명확한 경계**: iframe 통신만 cross-origin

### ⚠️ 주의 필요
1. **리로드 트리거**: `SimpleCustomizer.tsx:404` 제거 필수
2. **에러 바운더리**: 리로드 대신 컴포넌트 재마운트 검토
3. **재마운트 원인**: 추가 조사 필요

### 🔴 즉시 대응 필요
1. **SimpleCustomizer.tsx:404**
   ```typescript
   // 현재
   onPresetApplied={() => {
     window.location.reload(); // ❌ 제거
   }}

   // 변경 후
   onPresetApplied={async (newSettings) => {
     await loadSettings(); // ✅ 설정만 다시 로드
     toast.success('프리셋이 적용되었습니다.');
   }}
   ```

---

## 🎯 Phase 1 완료 기준

- [x] 교차 호출 목록화: 0건 발견 ✅
- [x] 리로드 트리거 목록화: 6건 발견 (1건 Customizer)
- [x] 재마운트 유발원 추정: 4가지 가능성
- [ ] Chrome DevTools Profiler 측정 (수동 필요)
- [ ] Network 탭 5분 모니터링 (수동 필요)

---

## 📝 다음 단계 (Phase 2)

### 우선순위 1: 리로드 제거
- [ ] `SimpleCustomizer.tsx:404` 수정
- [ ] 프리셋 적용 시 설정 다시 로드 로직 추가
- [ ] 테스트: 프리셋 적용 → 페이지 리로드 없음

### 우선순위 2: AuthContext 확인
- [ ] Provider 마운트 지점 확인
- [ ] 재마운트 횟수 측정 (React Profiler)
- [ ] 단일 마운트 보장

### 우선순위 3: 에러 처리 개선
- [ ] ErrorBoundary 리로드 → 컴포넌트 재마운트
- [ ] 토스트 + 재시도 패턴 적용

---

**작성 시간**: 15분
**다음 작업**: Phase 2 - AuthContext 안정화
