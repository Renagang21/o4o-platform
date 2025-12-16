# Design Core v1.0 적용 운영 규칙

> **Status**: ACTIVE (Phase 5 확정)
> **Version**: 1.2.0
> **Date**: 2025-12-16

---

## 1. 기본 원칙

Design Core v1.0은 O4O Platform의 **공식 UI 표준**이다.

- **신규 화면**: Design Core 필수
- **기존 화면**: Variant 방식으로만 전환
- **확장 요청**: Phase 기반으로만 처리

---

## 2. 신규 화면 적용 규칙 (강제)

모든 신규 화면은 **Design Core v1.0을 기본 UI로 사용**한다.

```tsx
// ✅ 올바른 예: Design Core 컴포넌트 사용
import { AGPageHeader, AGSection, AGCard, AGKPIBlock } from '@o4o/ui';

// ❌ 금지: 신규 화면에서 default UI 생성
// ❌ 금지: 신규 화면에서 Variant 분기
```

### 필수 사용 컴포넌트

| 영역 | 컴포넌트 |
|------|----------|
| 페이지 헤더 | `AGPageHeader` |
| 섹션 구분 | `AGSection` |
| 카드 컨테이너 | `AGCard` |
| KPI 지표 | `AGKPIBlock`, `AGKPIGrid` |
| 레이아웃 | `AGAppLayout`, `AGContent` |

---

## 3. 기존 화면 전환 규칙

기존 화면은 **Variant 방식으로만 전환**한다.

### 전환 흐름

```
default UI 유지
    ↓
Design Core Variant 추가 (병렬 운영)
    ↓
충분한 검증 후 default 전환 여부 판단
```

### Variant 구현 패턴

```tsx
// 1. Variant 타입 정의
export type ViewVariant = 'default' | 'design-core-v1';

// 2. Props에 variant 추가
interface PageProps {
  variant?: ViewVariant;
}

// 3. 분기 처리
export default function Page({ variant = 'default' }: PageProps) {
  if (variant === 'design-core-v1') {
    return <PageDesignCoreV1 {...props} />;
  }
  return <DefaultPage {...props} />;
}
```

### 금지 사항

- 기존 UI 즉시 제거 ❌
- 암묵적 자동 전환 ❌
- Variant 없이 직접 교체 ❌

---

## 4. 적용 우선순위

### 우선 적용 (Low Risk)

1. 관리자 대시보드
2. 통계 / 리포트 화면
3. 읽기 위주 화면

### 후순위 적용

1. 입력 폼이 많은 화면
2. 업무 핵심 플로우 화면
3. 외부 사용자 노출 화면

> 후순위는 **충분한 운영 관찰 후 결정**

---

## 5. Variant 활성화 조건

Variant를 활성화하려면 다음 중 하나를 충족해야 한다:

- [ ] 디자인 팀 승인
- [ ] 플랫폼 총괄 승인
- [ ] 특정 실험 Phase 명시

---

## 6. 확장 요청 처리

### 확장 요청 발생 조건

- 반복적으로 동일한 UI 요구 발생
- AGCard/AGSection 조합으로 해결 불가

### 처리 방식

```
즉시 확장 ❌
    ↓
요구사항 수집
    ↓
별도 Work Order 작성
    ↓
Phase 4+ 에서 처리
```

### 금지 사항

- 서비스 요구로 임의 확장 ❌
- Design Core 구조 무단 변경 ❌
- 앱별 커스텀 컴포넌트 생성 ❌

---

## 7. 역할 분담

| 역할 | 책임 |
|------|------|
| **디자인 팀** | Design Asset 관리, 적용 여부 판단 |
| **개발 팀** | Variant 적용 구현, 기존 로직 유지 |
| **플랫폼 총괄** | 기준 감시, Phase 전환 승인 |

---

## 8. 검증된 적용 사례

### Phase 2-A: PoC 검증

- 파일: `packages/ui/src/poc/antigravity-dashboard-poc.tsx`
- 결과: Design Core 컴포넌트만으로 Admin Dashboard 구현 가능

### Phase 2-B: 실서비스 Variant 적용

- 대상: LMS-Yaksa Dashboard
- 파일: `apps/admin-dashboard/src/pages/lms-yaksa/dashboard/`
- 결과: 기존 화면과 공존하며 Variant 전환 성공

### Phase 4-A: Cosmetics 파트너 대시보드 Variant

- 대상: Cosmetics Partner Dashboard
- 파일: `apps/admin-dashboard/src/pages/cosmetics-partner/CosmeticsPartnerDashboardDesignCoreV1.tsx`
- 결과: KPI Grid, 활동 로그, 링크 성과 등 대시보드 전체 Design Core 전환 성공

### Phase 4-B: Yaksa Inner Page Variant

- 대상: 필수 교육 정책 관리 페이지
- 파일: `apps/admin-dashboard/src/pages/lms-yaksa/required-policy/RequiredPolicyDesignCoreV1.tsx`
- 결과: CRUD 기능 포함 Inner Page의 Design Core Variant 적용 성공

---

## 9. Design Core Default Services

Phase 5부터 특정 서비스를 **Design Core Default Service**로 선언한다.

### 9.1 Default Service 정의

Default Service로 선언된 서비스는 다음 규칙을 따른다:

| 구분 | 규칙 |
|------|------|
| **신규 화면** | Design Core v1.0 필수 (Variant 분기 ❌) |
| **기존 화면** | 단계적 Variant → default 전환 |
| **확장 요청** | 별도 Work Order로만 처리 |

### 9.2 선언된 Default Services

#### Yaksa (LMS-Yaksa)

```
선언일: 2025-12-16
상태: Design Core Default Service
전환 로드맵: docs/specs/yaksa-design-core-transition.md
```

> Yaksa 서비스는 Design Core v1.0 기본 서비스다.
> 신규 화면은 Design Core 기본값,
> 기존 화면은 단계적 Variant → default 전환만 허용한다.

#### Cosmetics (화장품 서비스)

```
선언일: 2025-12-16
상태: Design Core Default Service
전환 로드맵: docs/specs/cosmetics-design-core-transition.md
```

> Cosmetics 서비스는 Design Core v1.0 기본 서비스다.
> 신규 화면은 Design Core 기본값,
> 기존 화면은 단계적 Variant → default 전환만 허용한다.

### 9.3 Default Service 추가 조건

새로운 서비스를 Default Service로 추가하려면:

- [ ] 해당 서비스에 Design Core Variant 적용 사례 1건 이상 완료
- [ ] 플랫폼 총괄 승인
- [ ] 전환 로드맵 문서 작성

---

## 10. 위반 경로

다음 경로는 **Design Core 기준 위반**으로 간주한다:

- 신규 화면에서 shadcn/Tailwind 직접 사용
- Variant 없이 기존 화면 직접 교체
- 승인 없이 Design Core 확장
- 앱별 커스텀 UI 시스템 생성

---

*Design Core Phase 5 - Yaksa/Cosmetics Default Service 선언 완료*
