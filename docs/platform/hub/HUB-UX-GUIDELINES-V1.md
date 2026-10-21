# Hub UX Guidelines V1 — O4O 운영 허브 공통 규칙

> **상위 문서**: `CLAUDE.md` (Section 18: APP 표준화 규칙)
> **적용 범위**: KPA, Neture, Platform Hub
> **상태**: ACTIVE
> **작성일**: 2026-02-16 · **최종 갱신**: 2026-10-21 (Platform 상태·책임 경계 정비)

---

## 0. 이 문서의 지위

Hub UX Guidelines는 모든 운영 허브의 **화면 구조, 카드 배치, 신호 체계, 실행 흐름**을 지배하는 규칙이다.
hub-core 패키지(`@o4o/hub-core`)의 타입과 컴포넌트가 이 규칙의 기술적 구현체이다.

---

## 1. 허브 분류 체계

모든 허브는 3개 등급 중 하나로 분류된다.

| 등급 | 정의 | 대상 |
|------|------|------|
| **운영 OS** | Signal + QuickAction + AI + ActionLog 완전 루프 | Neture |
| **경량 허브** | Signal + Navigation 카드, Trigger 최소 | KPA |
| **전략 허브** | Cross-service 집계 + Proxy Trigger | Platform |

### 규칙
- 등급은 서비스 성격에 따라 차등 유지한다
- 모든 허브가 동일 밀도일 필요 없다
- 등급 변경은 Work Order를 통해서만 승인

---

## 2. 화면 구조 (Layout Standard)

### 2.1 표준 레이아웃

```
┌────────────────────────────────────────┐
│ Title + Subtitle + 새로고침 버튼        │  ← Header
├────────────────────────────────────────┤
│ [beforeSections]                       │  ← AI Summary / Status Cards
│  - AI Insight Card (운영 OS만)          │
│  - Service Status (경량 허브)           │
├────────────────────────────────────────┤
│ Section 1: 운영 카드 (Operator)         │  ← 모든 역할 접근
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│  │Card │ │Card │ │Card │ │Card │      │
│  └─────┘ └─────┘ └─────┘ └─────┘      │
├────────────────────────────────────────┤
│ Section 2: 관리자 카드 (Admin Only)     │  ← roles: ['admin'] 필터
│  ┌─────┐ ┌─────┐ ┌─────┐              │
│  │Card │ │Card │ │Card │              │
│  └─────┘ └─────┘ └─────┘              │
├────────────────────────────────────────┤
│ [afterSections]                        │  ← 최근 활동 / 보조 정보
├────────────────────────────────────────┤
│ Footer Note                            │
└────────────────────────────────────────┘
```

### 2.2 섹션 순서 원칙

| 순서 | 역할 | 이유 |
|------|------|------|
| 1 | beforeSections (AI/Status) | 가장 먼저 상황 인지 |
| 2 | 운영 카드 | 일상 업무 실행 |
| 3 | 관리자 카드 | 정책/구조 변경 |
| 4 | afterSections (활동 로그) | 후행 확인 |

**금지**: 관리자 카드를 운영 카드 위에 배치하지 않는다.

---

## 3. 카드 규칙

### 3.1 카드 최대 수

| 섹션 유형 | 최대 카드 수 | 근거 |
|-----------|-------------|------|
| 운영 섹션 | **6** | 인지 과부하 방지 (2행 × 3열) |
| 관리자 섹션 | **6** | 동일 |
| 전체 허브 | **12** | KPA 현행 기준 (상한) |

초과 시: 카드를 분리하지 말고 **섹션을 분리**한다.

### 3.2 카드 구성 요소

```typescript
interface HubCardDefinition {
  id: string;          // 필수: 고유 식별자
  title: string;       // 필수: 3~8자 권장
  description: string; // 필수: 15~30자 권장
  href: string;        // 필수: 클릭 대상 경로
  icon: ReactNode;     // 필수: LucideIcon 또는 emoji
  signalKey?: string;  // 선택: 신호 연결 키
}
```

### 3.3 카드 유형 분류

| 유형 | Signal | Action | 예시 |
|------|--------|--------|------|
| **Action 카드** | signalKey 필수 | QuickAction 연결 | "고위험 환자 관리" |
| **Navigation 카드** | signalKey 선택 | href만 | "상품 관리" |
| **Policy 카드** | 없음 | 없음 | "정책 설정" |
| **AI 카드** | signalKey 필수 | AI 재분석 | "AI 리포트" |

### 3.4 카드 배치 원칙

```
우선순위: Action 카드 > AI 카드 > Navigation 카드 > Policy 카드

배치:
  [Critical Signal 카드] → 섹션 첫 번째 위치
  [Action 카드]         → 섹션 앞쪽
  [Navigation 카드]     → 섹션 중간
  [Policy 카드]         → 섹션 마지막 또는 Admin 섹션
```

---

## 4. Signal 체계

### 4.1 Signal 수준

| Level | 색상 | 의미 | 사용 조건 |
|-------|------|------|----------|
| `info` | 파랑 | 정보 표시 | 정상 상태, 카운트 표시 |
| `warning` | 주황 | 주의 필요 | 임계값 초과, 미처리 존재 |
| `critical` | 빨강 | 즉시 조치 | 위험 비율 30%+, 긴급 |

### 4.2 Signal 커버리지 목표

| 허브 등급 | 최소 Signal 비율 | 현행 |
|-----------|----------------|------|
| 운영 OS | **70%** | Neture 80% |
| 경량 허브 | **40%** | KPA 25% (미달) |
| 전략 허브 | N/A (집계형) | Platform |

### 4.3 Signal 생성 규칙

```typescript
// 기본 신호 (정보 표시)
createSignal('info', { label: '양호', count: 5 });

// 경고 신호 (임계값 초과)
createSignal('warning', { label: '미처리', count: 3 });

// 액션 신호 (즉시 실행 가능)
createActionSignal('critical', {
  label: '고위험',
  count: 7,
  pulse: true,                    // 시각적 강조
  action: {
    key: 'service.trigger.action', // ACTION_KEYS 상수
    buttonLabel: '리뷰 시작',       // 2~4자 권장
  },
});
```

### 4.4 pulse 사용 기준

| 조건 | pulse |
|------|-------|
| critical + action 있음 | **true** |
| warning + count >= 5 | true (선택) |
| 그 외 | false |

---

## 5. 실행 흐름 (QuickAction)

### 5.1 완전 실행 루프

```
Signal 인지 → QuickAction 클릭 → API 호출 →
→ 로딩 표시 → 결과 피드백 → 자동 새로고침 → Signal 반영
```

모든 운영 OS 허브는 이 루프를 완전히 구현해야 한다.

### 5.2 필수 상태 표시

| 상태 | UI | 구현 |
|------|-----|------|
| 대기 | QuickAction 버튼 | `buttonLabel` |
| 로딩 | Spinner + 비활성화 | `loading` state |
| 성공 | 성공 메시지 + 색상 | `result.success` |
| 실패 | 오류 메시지 + 색상 | `result.success === false` |
| 반영 | Signal 업데이트 | `fetchData()` 재호출 |

### 5.3 자동 새로고침 타이밍

| 서비스 | 현행 | 권장 |
|--------|------|------|
| Neture | `refreshKey` 증가 | 유지 (즉시) |
| Platform | `await fetchData()` | 유지 (동기 대기) |

---

## 6. 데이터 패턴

### 6.1 Fetch 패턴

| 패턴 | 사용 서비스 | 권장 |
|------|-----------|------|
| `Promise.allSettled` | Platform | 모든 허브 필수 |
| `Promise.all` | Neture | allSettled로 전환 권장 |
| 단일 fetch | KPA | 현행 유지 가능 |

### 6.2 에러 처리

```
개별 서비스 실패 → 해당 섹션만 fallback
전체 실패 → 에러 화면 + 재시도 버튼
```

**금지**: 하나의 API 실패로 전체 허브가 에러 상태가 되면 안 된다.

---

## 7. 역할 분리

### 7.1 섹션 역할 필터링

```typescript
// hub-core가 자동으로 역할 필터링
sections: [
  {
    id: 'operator',
    title: '운영 관리',
    // roles 미지정 → 모든 역할에 노출
    cards: [...]
  },
  {
    id: 'admin',
    title: '관리자 전용',
    badge: 'Admin',
    roles: ['kpa:admin'],  // admin만 볼 수 있음
    cards: [...]
  }
]
```

### 7.2 역할 시각화

| 요소 | 표시 방법 |
|------|----------|
| Admin 섹션 | `badge: 'Admin'` 표시 |
| Admin 전용 카드 | 섹션 분리로 구분 |
| 동일 섹션 내 혼합 | **금지** — 역할이 다르면 섹션을 분리 |

---

## 8. beforeSections 규칙

### 8.1 유형별 beforeSections

| 허브 등급 | beforeSections 내용 | 필수 여부 |
|-----------|-------------------|----------|
| 운영 OS | AI Insight Card | 필수 |
| 경량 허브 | Service Status Cards | 권장 |
| 전략 허브 | Global Risk Overview | 필수 |

### 8.2 AI Insight Card 표준

```
┌────────────────────────────────────────┐
│ 🧠 AI 운영 인사이트              [위험도] │
│                                        │
│ "요약 텍스트..."                        │
│                                        │
│ • 추천 행동 1                           │
│ • 추천 행동 2                           │
│ • 추천 행동 3                           │
│                                  신뢰도% │
└────────────────────────────────────────┘
```

구성 요소:
- 위험도 배지 (high/medium/low → 빨강/주황/초록)
- AI 요약 텍스트 (1~2문장)
- 추천 행동 목록 (최대 3개)
- 메타 정보 (provider, 신뢰도 — optional)

---

## 9. 현행 서비스별 적합도

### 9.1 기존 서비스 Hub 비교

| 규칙 | KPA | Neture | Platform |
| ------ | ----- | -------- | ---------- |
| 카드 ≤ 12 | 12 (상한) | 11 | N/A |
| Signal ≥ 40%/70% | 25% ❌ | 80% ✅ | N/A |
| beforeSections | StatusCards ✅ | AI Card ✅ | §10 상태 점검으로 변경 |
| QuickAction 루프 | 없음 ❌ | 완전 ✅ | 업무 실행 제거 (§10) |
| Admin 섹션 분리 | ✅ | ✅ | N/A |
| allSettled fetch | 단일 | Promise.all ⚠️ | 제한된 동시 점검 (§10) |
| ActionLog | 없음 ❌ | 8/8 ✅ | 읽기 전용 (§10) |

### 9.2 개선 필요 항목

| 우선순위 | 서비스 | 항목 | 현행 → 목표 |
|---------|--------|------|------------|
| 1 | KPA | Signal 커버리지 | 25% → 40%+ |
| 2 | Neture | fetch 패턴 | Promise.all → allSettled |
| 4 | KPA | QuickAction | 0 → 2+개 |

---

## 10. 전체 관리자 서비스 상태 화면

2026-10-21 사용자 승인에 따라 `/admin/platform/hub`의 목적을 현행 서비스·공통 공간의 기본 기술 상태 확인으로 정비한다. 기존 Risk Overview/Service Health/Action Queue 고정 구성과 cross-service 업무 trigger 의무를 이 화면에 적용하지 않는다. 각 서비스의 Hub·회원/승인/거래 업무는 해당 서비스 책임이다. 이 결정은 다른 서비스 Hub의 업무 동작을 변경하지 않는다.

| 규칙 | 설명 |
|---|---|
| 목록 | 공식 약국 협력사업 4곳, 독립 서비스 5곳, 대표 홈·내 매장·전체 관리자 3곳의 주소 12개. 주소 등록과 사업 개설/활성·가입·권한은 별개 |
| 웹 점검 | HTTPS 응답, 제한된 HTML 읽기, 동일 origin `/assets/` 앱 JavaScript 응답. 실제 browser 실행·서비스 identity 일치·로그인/업무 성공으로 해석하지 않음 |
| 공통 기반 | 기존 서버 시작 READY 상태와 DB SELECT 1. 모든 API·DB schema·업무 원장 일치 보장이 아님 |
| 표시 | 개별 확인/점검 실패/확인 불가, 실제 점검 시각과 결과 재사용 표시. 수집 실패·빈 작업 목록·0 통계로 전체 정상 판정 금지 |
| 최신성 | 최근 결과는 60초 재사용. 조회 실패/오래된 결과를 현재 정상처럼 표시하지 않음 |
| 접근/통신 | 전체 관리자만 조회. 서버가 소유한 공식 HTTPS allowlist만 요청하며 사용자 URL·cookie·token 전달 및 redirect 추적 금지. 시간·응답 크기·동시성 제한 |
| 업무 경계 | 회원 대기·승인율·콘텐츠 수 및 승인/게시/정산/AI 갱신 trigger를 이 화면에서 제거. 실제 서비스 운영자가 해당 서비스에서 처리 |
| 저장·검증 | 새 상태 DB나 sites 기반 legacy monitor를 복구하지 않음. 운영 설정/계정 변경과 유료 호출은 개발 테스트와 분리 |

[정비 TODO](../../work-orders/TODO-O4O-ADMIN-HEALTH-AUTHORITY-CONSOLIDATION-V1.md)와 [검증 CHECK](../../checks/CHECK-O4O-ADMIN-HEALTH-AUTHORITY-CONSOLIDATION-V1.md)에 실제 개발·검증·배포 여부를 기록한다. 본 절 갱신은 main 병합·운영 배포 완료를 뜻하지 않는다.

---

## 11. 금지 사항

| # | 금지 | 이유 |
|---|------|------|
| 1 | 카드 13개 이상 | 인지 과부하 |
| 2 | Admin/Operator 카드 혼합 배치 | 책임 경계 불명확 |
| 3 | Signal 없는 Action 버튼 | 맥락 없는 실행 위험 |
| 4 | Promise.all (3개+ 병렬 fetch) | 연쇄 실패 위험 |
| 5 | 허브 내 인라인 데이터 편집 | 허브는 진입점, 상세는 각 페이지 |
| 6 | 서비스별 독자 허브 컴포넌트 | hub-core 사용 필수 (Platform 제외) |
| 7 | pulse 남용 (3개+) | 시각적 과부하 |

---

## 12. 변경 이력

| 날짜 | 버전 | 변경 |
|------|------|------|
| 2026-02-16 | v1.0 | 초안 작성 — 4개 서비스 구조 분석 기반 |

---

*이 문서는 CLAUDE.md §13-A (APP 표준화)의 하위 문서이다.*
