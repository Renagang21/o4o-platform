# P2 Kickoff Draft
## Advanced Performance & Operations

**작성일:** 2025-11-09
**예상 시작:** P1 Phase D 운영 검증 완료 후 (2025-11-12 예상)
**Phase 기간:** 1-2주
**목표:** 대규모 트래픽 대응 + 운영 고도화

---

## 🎯 P2 Overview

P2는 **P1에서 구축한 기반 위에서 성능과 운영을 극대화**하는 단계입니다.
P1이 "기능 완성"이었다면, P2는 "성능 최적화 + 운영 자동화"입니다.

**핵심 목표:**
1. **대규모 데이터 처리** - 10,000+ 항목 리스트 60fps 렌더링
2. **운영 투명성** - 모든 관리 액션 추적 및 감사
3. **데이터 분석 지원** - CSV 내보내기 및 통계
4. **사용자 경험 향상** - Command Palette, 고급 단축키

---

## 📋 P2 Phase 구성

### Phase A: Virtual Scrolling & Infinite Load (2-3일)
**목표:** 대규모 리스트 성능 최적화

**구현 내용:**
1. **react-window 도입**
   - FixedSizeList or VariableSizeList
   - 가상화된 렌더링 (visible items only)
   - 스크롤 위치 복원

2. **무한 스크롤 (Infinite Scroll)**
   - Intersection Observer API
   - 자동 페이지 로드 (스크롤 하단 도달 시)
   - 로딩 스피너

3. **커서 페이지네이션 (Cursor Pagination)**
   - Offset 대신 Cursor 사용 (성능 향상)
   - `GET /admin/enrollments?cursor=abc123&limit=20`
   - 이전/다음 페이지 커서 반환

4. **이미지 Lazy Loading**
   - Intersection Observer로 지연 로딩
   - 플레이스홀더 이미지
   - Progressive JPEG 지원

**성능 목표:**
- 1,000개 항목 렌더링: **5초 → 0.5초** (90% 단축)
- 메모리 사용량: **500MB → 50MB** (90% 감소)
- 스크롤 FPS: **60fps 유지**

**API 변경:**
```typescript
// Before: Offset Pagination
GET /admin/enrollments?page=10&limit=20
// 문제: page 번호가 커질수록 느려짐 (OFFSET 10000 LIMIT 20)

// After: Cursor Pagination
GET /admin/enrollments?cursor=eyJpZCI6IjEyMyJ9&limit=20
// 장점: 커서 기반으로 일정한 성능 (WHERE id > '123' LIMIT 20)

Response:
{
  "items": [...],
  "nextCursor": "eyJpZCI6IjE0MyJ9",
  "prevCursor": "eyJpZCI6IjEwMyJ9",
  "hasMore": true
}
```

**Frontend 구현:**
```tsx
import { FixedSizeList } from 'react-window';

const VirtualizedEnrollmentList = ({ enrollments }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <EnrollmentRow enrollment={enrollments[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={enrollments.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};
```

---

### Phase B: Audit Logs & CSV Export (3-4일)
**목표:** 운영 추적 및 규정 준수

**구현 내용:**
1. **감사 로그 뷰어 페이지**
   - 경로: `/admin/audit-logs`
   - 필터: 사용자, 액션 타입, 날짜 범위
   - 페이지네이션 (커서 기반)
   - 상세 뷰 (변경 전/후 비교)

2. **대량 작업 히스토리**
   - Bulk 작업별 상세 내역
   - 성공/실패 항목 리스트
   - 재시도 기능

3. **CSV 스트리밍 내보내기**
   - 대용량 파일 대응 (10,000+ rows)
   - 스트리밍 방식 (메모리 절약)
   - 진행률 표시
   - 다운로드 링크 생성

4. **통계 대시보드**
   - 관리자별 액션 통계
   - 일/주/월별 승인/거부 추이
   - 평균 처리 시간

**API 엔드포인트:**
```typescript
// 감사 로그 목록
GET /admin/audit-logs?cursor=&limit=20&user=&action=&dateFrom=&dateTo=

// 감사 로그 상세
GET /admin/audit-logs/:id

// CSV 내보내기 (스트리밍)
POST /admin/enrollments/export
Request: {
  "filters": { "status": "approved", "dateFrom": "2025-11-01" },
  "format": "csv"
}
Response: Stream (Content-Type: text/csv)
```

**스트리밍 구현 (Backend):**
```typescript
router.post('/export', requireAdmin, async (req, res) => {
  const { filters, format } = req.body;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=enrollments.csv');

  // CSV 헤더
  res.write('ID,User,Role,Status,Submitted At\n');

  // 스트리밍 쿼리 (메모리 절약)
  const stream = enrollmentRepo.createQueryBuilder()
    .where(filters)
    .stream();

  for await (const enrollment of stream) {
    const row = `${enrollment.id},${enrollment.user.email},${enrollment.role},${enrollment.status},${enrollment.createdAt}\n`;
    res.write(row);
  }

  res.end();
});
```

**규정 준수:**
- GDPR Article 30 (Processing activities record)
- SOC 2 Type II (Audit trail)
- ISO 27001 (Access control logging)

---

### Phase C: Command Palette & Advanced Shortcuts (2-3일)
**목표:** 키보드 중심 워크플로우

**구현 내용:**
1. **Command Palette (Cmd+K)**
   - 전역 검색 (페이지, 액션, 사용자)
   - 퍼지 검색 (Fuse.js)
   - 최근 사용 액션
   - 단축키 힌트

2. **리스트 단축키**
   - `J/K`: 항목 이동 (위/아래)
   - `X`: 체크박스 토글
   - `A`: 전체 선택
   - `Shift + A`: 대량 승인
   - `Shift + R`: 대량 거부
   - `Enter`: 상세 뷰

3. **단축키 도움말 (Cmd+/)**
   - 모든 단축키 목록
   - 카테고리별 분류 (네비게이션, 액션, 리스트)
   - 검색 기능

4. **우클릭 컨텍스트 메뉴**
   - 행 우클릭 시 메뉴 표시
   - 복사, 상세 보기, 승인, 거부 등

**Command Palette 구현:**
```tsx
import { Command } from 'cmdk';

const CommandPalette = ({ open, onOpenChange }) => {
  return (
    <Command.Dialog open={open} onOpenChange={onOpenChange}>
      <Command.Input placeholder="명령어 또는 페이지 검색..." />
      <Command.List>
        <Command.Group heading="페이지">
          <Command.Item onSelect={() => navigate('/admin')}>
            대시보드
          </Command.Item>
          <Command.Item onSelect={() => navigate('/admin/enrollments')}>
            역할 신청 관리
          </Command.Item>
        </Command.Group>
        <Command.Group heading="액션">
          <Command.Item onSelect={handleBulkApprove}>
            선택 항목 승인
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
};
```

---

### Phase D: Performance Monitoring & Optimization (2일)
**목표:** 실시간 성능 모니터링 및 최적화

**구현 내용:**
1. **성능 대시보드**
   - API 응답 시간 (P50, P95, P99)
   - 에러율 (4xx, 5xx)
   - 활성 사용자 수
   - 메모리/CPU 사용량

2. **Redis 캐싱**
   - 검색 결과 캐싱 (TTL 5분)
   - 사용자 세션 캐싱
   - Rate Limiting (Redis)

3. **Database 최적화**
   - 인덱스 추가 (검색 필드)
   - Query 최적화 (N+1 문제 해결)
   - Connection Pooling

4. **프론트엔드 최적화**
   - Code Splitting (React.lazy)
   - Prefetching (next page)
   - Service Worker (오프라인 지원)

**Redis 캐싱 예시:**
```typescript
// Cache key: search:{status}:{role}:{query}:{page}
const cacheKey = `search:${status}:${role}:${query}:${page}`;

// Try cache first
const cached = await redis.get(cacheKey);
if (cached) {
  return JSON.parse(cached);
}

// Query database
const results = await enrollmentRepo.find(...);

// Cache for 5 minutes
await redis.setex(cacheKey, 300, JSON.stringify(results));

return results;
```

---

## 📊 P2 예상 일정

| Phase | 기간 | 인력 | 우선순위 |
|-------|------|------|----------|
| **A: Virtual Scrolling** | 2-3일 | 1명 | High |
| **B: Audit Logs & Export** | 3-4일 | 1명 | Medium |
| **C: Command Palette** | 2-3일 | 1명 | Low |
| **D: Performance Monitoring** | 2일 | 1명 | Medium |
| **Total** | **9-12일** | 1명 | - |

**병렬 작업 가능:**
- Phase A + Phase B 동시 진행 가능 (독립적)
- Phase C는 Phase A 완료 후 시작 권장

---

## 🎯 P2 성공 지표

### 성능 지표
- [ ] 1,000개 항목 렌더링: **< 1초**
- [ ] 10,000개 항목 스크롤: **60fps 유지**
- [ ] 검색 응답 시간: **< 100ms** (캐시 적중 시)
- [ ] CSV 내보내기 (10,000 rows): **< 30초**

### 운영 지표
- [ ] 감사 로그 커버리지: **100%** (모든 관리 액션 기록)
- [ ] 감사 로그 보존 기간: **1년**
- [ ] CSV 내보내기 성공률: **> 99%**

### 사용성 지표
- [ ] Command Palette 사용률: **> 30%**
- [ ] 키보드 단축키 사용률: **> 50%**
- [ ] 관리자 만족도: **> 4.5/5**

---

## 🔧 기술 스택

### 새로 도입할 라이브러리
- **react-window:** 가상 스크롤링
- **cmdk:** Command Palette
- **fuse.js:** 퍼지 검색
- **papaparse:** CSV 파싱/생성
- **date-fns:** 날짜 필터링

### 백엔드 최적화
- **Redis:** 캐싱 및 Rate Limiting
- **PostgreSQL:** 인덱스 최적화
- **Stream API:** 대용량 데이터 처리

---

## 📝 사전 준비 사항

### Phase A 시작 전
- [ ] react-window 라이브러리 검토
- [ ] 현재 EnrollmentManagement 컴포넌트 분석
- [ ] 커서 페이지네이션 DB 쿼리 설계

### Phase B 시작 전
- [ ] AuditLog 엔티티 확인 (이미 구현됨)
- [ ] CSV 스트리밍 방식 POC
- [ ] 감사 로그 UI 목업

### Phase C 시작 전
- [ ] cmdk 라이브러리 검토
- [ ] 단축키 충돌 확인
- [ ] 컨텍스트 메뉴 디자인

### Phase D 시작 전
- [ ] Redis 서버 설정 확인
- [ ] 성능 모니터링 도구 선택 (Grafana, Datadog 등)

---

## 🚀 Kickoff Checklist

### 기술 검토
- [ ] P1 Phase D 운영 검증 완료 (72시간)
- [ ] P1 Phase D 성능 지표 수집
- [ ] P2 라이브러리 호환성 확인

### 기획 준비
- [ ] Phase A, B, C, D 상세 개발 지시서 작성
- [ ] UI/UX 목업 준비
- [ ] 사용자 시나리오 정의

### 인프라 준비
- [ ] Redis 서버 설정 (캐싱용)
- [ ] Monitoring 도구 설정
- [ ] Staging 환경 준비

### 팀 준비
- [ ] P2 Kickoff Meeting 일정 조율
- [ ] 개발자 할당 및 역할 분담
- [ ] 코드 리뷰어 지정

---

## 📅 예상 타임라인

```
Week 1 (Nov 12-15):
  Day 1-2: Phase A - Virtual Scrolling 구현
  Day 3-4: Phase B - Audit Logs 백엔드 API

Week 2 (Nov 18-22):
  Day 1-2: Phase B - Audit Logs 프론트엔드 UI
  Day 3-4: Phase C - Command Palette 구현
  Day 5: Phase D - Performance Monitoring 설정

Week 3 (Nov 25-26):
  Day 1: 통합 테스트 및 버그 수정
  Day 2: P2 최종 검증 및 배포
```

---

## 🎉 P2 완료 시 기대 효과

**성능:**
- 대규모 리스트도 **즉시 렌더링**
- 검색 속도 **10배 향상** (캐싱)
- 메모리 사용량 **90% 감소**

**운영:**
- **모든 관리 액션 추적** (규정 준수)
- **데이터 분석 지원** (CSV 내보내기)
- **투명한 운영** (감사 로그 뷰어)

**사용성:**
- **키보드 중심 워크플로우** (Command Palette)
- **빠른 네비게이션** (고급 단축키)
- **직관적인 UI** (우클릭 메뉴)

---

**Last Updated:** 2025-11-09
**Status:** Draft (P1 Phase D 운영 검증 후 Kickoff)
**Next Action:** P1 Phase D 72시간 운영 검증 모니터링
