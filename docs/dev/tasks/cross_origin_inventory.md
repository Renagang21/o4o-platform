# 교차 출처 호출 인벤토리

**목적**: Admin (admin.neture.co.kr) → Main Site (neture.co.kr) 교차 호출 추적 및 제거

---

## 🔍 검색 방법

### 1. 코드 검색
```bash
# Admin 프로젝트에서 neture.co.kr 참조 검색
cd apps/admin-dashboard
grep -r "neture.co.kr" src/ --exclude-dir=node_modules

# API 호출 패턴 검색
grep -r "fetch.*neture.co.kr" src/
grep -r "axios.*neture.co.kr" src/
grep -r "\.get.*neture\.co\.kr" src/
grep -r "\.post.*neture\.co\.kr" src/
```

### 2. Chrome DevTools Network 모니터링
1. `/admin/customize` 페이지 진입
2. Network 탭 열기
3. Filter: `neture.co.kr`
4. 5분간 모니터링
5. 각 요청의 Initiator 확인

---

## 📋 발견된 호출 목록

### 발견일: 2025-11-09

| # | 파일 경로 | 라인 | 호출 URL | 목적 | 제거 여부 | 대응 |
|---|-----------|------|----------|------|-----------|------|
| 1 | `src/pages/appearance/Customize.tsx` | 36-47 | `${protocol}//${currentHost.replace('admin.', '')}` | 프리뷰 URL | 유지 | iframe src만 사용 |
| 2 | TBD | - | - | - | - | - |
| 3 | TBD | - | - | - | - | - |

---

## 🚫 제거 대상 패턴

### 패턴 1: 직접 인증 체크
❌ **제거 필요**
```typescript
// Admin에서 Main Site의 /me 호출
fetch('https://neture.co.kr/api/v1/auth/cookie/me')
  .then(res => res.json())
  .then(user => setUser(user))
```

**대응**: Admin 자체 인증 상태만 확인, Main Site는 iframe 내부에서 자체 확인

### 패턴 2: 활성 상태 폴링
❌ **제거 필요**
```typescript
// Admin에서 Main Site의 /active 호출
setInterval(() => {
  fetch('https://neture.co.kr/api/v1/pages/active')
}, 30000)
```

**대응**: Admin 자체 활성 상태만 관리, Main Site는 분리

### 패턴 3: 교차 데이터 로드
⚠️ **검토 필요**
```typescript
// Admin에서 Main Site 설정 직접 로드
fetch('https://neture.co.kr/api/v1/settings/...')
```

**대응**: API는 api.neture.co.kr로 통합 사용

---

## ✅ 허용 패턴

### 패턴 1: iframe src (프리뷰용)
✅ **허용**
```typescript
// 프리뷰 iframe 로드만 허용
<iframe src="https://neture.co.kr?preview=true" />
```

### 패턴 2: API 서버 호출 (api.neture.co.kr)
✅ **허용**
```typescript
// API 서버는 admin과 main-site 공용
authClient.api.get('/settings/customizer')
// → https://api.neture.co.kr/api/v1/settings/customizer
```

---

## 🔧 제거 작업 체크리스트

### Phase 1: 검색 및 목록화
- [ ] Admin 프로젝트 전체 코드 검색
- [ ] Network 탭 모니터링 (5분)
- [ ] Initiator 추적 (각 요청별)
- [ ] 목록 작성 (위 표 업데이트)

### Phase 2: 우선순위 결정
- [ ] 인증 관련 호출 (최우선)
- [ ] 활성 상태 폴링 (우선)
- [ ] 데이터 로드 (검토)
- [ ] 프리뷰 URL (유지)

### Phase 3: 제거 작업
- [ ] 각 호출별 제거 또는 대체
- [ ] 단위 테스트 (해당 파일별)
- [ ] 통합 테스트 (Customizer 전체)

### Phase 4: 검증
- [ ] Network 탭에서 neture.co.kr 호출 0건 확인
- [ ] Console 에러 0건
- [ ] 기능 정상 동작 확인

---

## 🎯 검증 기준

### Chrome DevTools 체크
1. **Network 탭**
   - Filter: `neture.co.kr`
   - 프리뷰 iframe 로드 외 요청 0건
   - `/me`, `/active` 호출 0건

2. **Initiator 추적**
   - 모든 neture.co.kr 요청의 Initiator 확인
   - admin 번들에서 시작된 요청 0건

3. **Console 로그**
   - CORS 에러 0건
   - Failed to fetch 0건

---

## 📊 제거 결과 보고

### 작업 정보
- 작업자: [이름]
- 작업일: YYYY-MM-DD
- 브랜치: stabilize/customizer-save
- 커밋: [hash]

### 제거 현황
| 카테고리 | 발견 | 제거 | 유지 | 사유 |
|----------|------|------|------|------|
| 인증 호출 | N | N | N | - |
| 활성 상태 | N | N | N | - |
| 데이터 로드 | N | N | N | - |
| 프리뷰 URL | N | 0 | N | iframe src 전용 |
| **합계** | **N** | **N** | **N** | - |

### 변경 파일 목록
- [ ] `src/...`
- [ ] `src/...`

### 테스트 결과
- [ ] Network 탭: neture.co.kr 호출 0건 (iframe 제외)
- [ ] Console 에러 0건
- [ ] Customizer 기능 정상

---

## 🔄 지속적 모니터링

### 정기 점검 (주 1회)
- [ ] Network 탭 모니터링
- [ ] 새로운 교차 호출 발견 시 즉시 제거
- [ ] 인벤토리 업데이트

### 알림 설정 (선택)
- Sentry에서 CORS 에러 알림
- API Gateway에서 교차 호출 로그 알림

---

**다음 단계**: 제거 작업 완료 후 스모크 테스트 실행
