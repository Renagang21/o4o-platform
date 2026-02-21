# Design Core Governance v1

> **Status**: Active
> **CLAUDE.md**: §15 (Design Core 규칙)

---

## 1. Design Core란

Design Core는 O4O Platform 전체 서비스의 **통합 디자인 시스템**이다.

모든 신규 화면은 Design Core v1.0을 사용해야 하며,
App 내 독자적 디자인 시스템 생성은 금지된다.

---

## 2. 핵심 규칙

### 허용

- Design Core 컴포넌트 사용
- Design Core 테마 커스터마이징 (변수 수준)
- 서비스별 색상/폰트 변수 조정

### 금지

| 금지 항목 | 이유 |
|-----------|------|
| App별 독자 디자인 시스템 | 일관성 훼손 |
| Core 컴포넌트 fork/override | 유지보수 불가 |
| 인라인 스타일로 Core 우회 | 표준 이탈 |
| 디자인 토큰 직접 하드코딩 | 테마 전환 불가 |

---

## 3. 변경 절차

디자인 변경은 Work Order를 통해서만 승인된다:

1. WO 작성 (변경 사유, 영향 범위)
2. 디자인 리뷰
3. Design Core 패키지 업데이트
4. 전 서비스 적용 확인

---

## 4. 관련 문서

- [카드 추가 표준](./card-design-governance.md) — 대시보드 카드 설계 규칙
- [Hub UX Guidelines](../platform/hub/HUB-UX-GUIDELINES-V1.md) — 운영 허브 화면 구조

---

*이 문서는 CLAUDE.md §15에서 참조하는 기준 문서이다.*
