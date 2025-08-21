# 📅 date-fns 사용 현황 분석 보고서

## 📊 사용 통계
- **총 사용 파일**: 25개
- **주요 함수**: `format()`, `formatDistanceToNow()`, `subDays()`, `startOfMonth()`, `endOfMonth()`
- **현재 버전**: 2.30.0 (v3.6.0에서 다운그레이드)

## 🔍 사용처별 분석

### 1. **대시보드 통계 (useDashboardStats.ts)** ⚠️
```typescript
// 날짜 범위 계산 및 차트 데이터 생성
format(startOfMonth(new Date()), 'yyyy-MM-dd')
format(endOfMonth(new Date()), 'yyyy-MM-dd')
format(date, 'yyyy-MM-dd')  // 차트 x축 레이블
```
**용도**: 통계 차트의 날짜 축 생성
**중요도**: 낮음 - AI 기반 통계로 대체 예정

### 2. **주문 관리 (Orders.tsx, OrderDetail.tsx)** 
```typescript
format(new Date(order.createdAt), 'yyyy.MM.dd HH:mm', { locale: ko })
```
**용도**: 주문 날짜 표시
**중요도**: 중간 - UI 표시용

### 3. **사용자 목록 (UserList.tsx, UserDetail.tsx)**
```typescript
formatDistanceToNow(new Date(user.lastLogin))  // "3일 전"
format(new Date(user.createdAt), 'yyyy.MM.dd')
```
**용도**: 상대 시간 표시 ("3일 전", "방금 전")
**중요도**: 낮음 - 간단한 함수로 대체 가능

### 4. **페이지 관리 (Pages.tsx)**
```typescript
format(new Date(page.createdAt), 'yyyy.MM.dd', { locale: ko })
```
**용도**: 페이지 생성일 표시
**중요도**: 낮음

### 5. **양식 관리 (FormList.tsx, FormSubmissions.tsx)**
```typescript
format(new Date(form.createdAt), 'MM/dd HH:mm', { locale: ko })
format(new Date(form.lastSubmission), 'MM/dd HH:mm', { locale: ko })
```
**용도**: 양식 제출 시간 표시
**중요도**: 낮음

### 6. **자동 저장 표시 (AutoSaveIndicator.tsx)**
```typescript
format(lastSaved, 'HH:mm')  // "14:30에 저장됨"
```
**용도**: 마지막 저장 시간 표시
**중요도**: 낮음

### 7. **미디어 라이브러리 (MediaLibraryModal.tsx)**
```typescript
format(new Date(media.uploadedAt), 'yyyy.MM.dd')
```
**용도**: 업로드 날짜 표시
**중요도**: 낮음

### 8. **드롭쉬핑 관련 컴포넌트**
- PayoutRequests.tsx
- CommissionDashboard.tsx  
- OrderManagement.tsx
```typescript
format(new Date(payout.requestedAt), 'yyyy.MM.dd')
```
**용도**: 거래 날짜 표시
**중요도**: 낮음

## 💡 대체 방안

### **Option 1: Native JavaScript Date 사용** ✅ 권장
```typescript
// format() 대체
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
};

// formatDistanceToNow() 대체
const getRelativeTime = (date: Date): string => {
  const rtf = new Intl.RelativeTimeFormat('ko', { numeric: 'auto' });
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return '오늘';
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  return `${Math.floor(days / 30)}개월 전`;
};
```

### **Option 2: 경량 유틸리티 함수 작성**
```typescript
// packages/utils/src/date.ts
export const dateUtils = {
  format: (date: Date, pattern: string) => {
    // 간단한 포맷팅 로직
  },
  relativeTime: (date: Date) => {
    // 상대 시간 계산
  },
  startOfMonth: (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  },
  endOfMonth: (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }
};
```

## 🎯 제거 가능성 평가

### **제거 가능한 사용처** (80%)
- ✅ 통계 대시보드 - AI 서비스로 대체
- ✅ 상대 시간 표시 - 간단한 함수로 대체
- ✅ 날짜 포맷팅 - Intl.DateTimeFormat 사용

### **유지 필요한 사용처** (20%)
- ⚠️ 복잡한 날짜 계산이 필요한 경우
- ⚠️ 타임존 처리가 필요한 경우

## 📈 제거 시 영향

### **긍정적 영향**
1. **번들 크기 감소**: ~75KB (gzip: ~20KB)
2. **빌드 속도 향상**: WordPress와의 충돌 해결
3. **의존성 단순화**: 버전 충돌 문제 해소

### **부정적 영향**
1. **개발 시간**: 유틸리티 함수 작성 필요 (약 2-3시간)
2. **테스트 필요**: 날짜 관련 기능 재테스트
3. **유지보수**: 자체 날짜 유틸리티 관리

## 🚀 실행 계획

### **Phase 1: 유틸리티 함수 작성** (1시간)
```bash
# packages/utils/src/date.ts 생성
# 필수 함수 구현
```

### **Phase 2: 점진적 마이그레이션** (2시간)
1. 통계 관련 컴포넌트부터 시작
2. 단순 포맷팅 사용처 변경
3. 복잡한 로직 검토 후 변경

### **Phase 3: date-fns 제거** (30분)
```bash
npm uninstall date-fns
# package.json에서 제거
# import 문 모두 변경
```

## 💬 결론

**date-fns는 완전히 제거 가능합니다.**

이유:
1. 사용처의 80%가 단순 포맷팅
2. AI 기반 통계로 대체 예정
3. Native JavaScript API로 충분히 대체 가능
4. WordPress와의 호환성 문제 해결

**예상 작업 시간**: 3-4시간
**위험도**: 낮음
**권장 사항**: 즉시 제거 진행