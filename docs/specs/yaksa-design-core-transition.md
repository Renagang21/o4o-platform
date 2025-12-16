# Yaksa Design Core v1.0 전환 로드맵

> **Status**: ACTIVE
> **Version**: 1.0.0
> **Date**: 2025-12-16
> **Service**: LMS-Yaksa (약사 교육 관리)

---

## 1. 서비스 개요

Yaksa 서비스는 약사 교육 관리 기능을 담당하며 다음 화면을 포함한다:

| 화면 | 설명 | 파일 |
|------|------|------|
| Dashboard | 대시보드 | `dashboard/index.tsx` |
| Required Policy | 필수 교육 정책 관리 | `required-policy/index.tsx` |
| Assignments | 교육 배정 관리 | `assignments/index.tsx` |
| Credits | 학점 관리 | `credits/index.tsx` |
| Reports | 보고서 | `reports/index.tsx` |
| License Profiles | 면허 프로필 | `license-profiles/index.tsx` |

**총 대상 화면**: 6개

---

## 2. 전환 원칙

### 2.1 기본 규칙

```
신규 화면 → Design Core v1.0 필수
기존 화면 → Variant 방식으로 단계적 전환
```

### 2.2 금지 사항

- 기존 UI 즉시 제거 ❌
- Variant 없이 직접 교체 ❌
- 앱별 커스텀 컴포넌트 생성 ❌

---

## 3. 전환 단계

### Stage 1: Low Risk (우선 적용)

대시보드 및 읽기 위주 화면을 우선 전환한다.

| 파일 | 화면명 | 상태 |
|------|--------|------|
| `dashboard/index.tsx` | 대시보드 | ✅ Variant 완료 (Phase 2-B) |
| `reports/index.tsx` | 보고서 | ⬜ 대기 |

### Stage 2: Medium Risk (중순위)

설정/관리 중심 화면을 전환한다.

| 파일 | 화면명 | 상태 |
|------|--------|------|
| `required-policy/index.tsx` | 필수 교육 정책 | ⬜ 대기 (Phase 4-B 대상) |
| `credits/index.tsx` | 학점 관리 | ⬜ 대기 |
| `license-profiles/index.tsx` | 면허 프로필 | ⬜ 대기 |

### Stage 3: High Risk (후순위)

복잡한 CRUD 및 배정 화면을 전환한다.

| 파일 | 화면명 | 상태 |
|------|--------|------|
| `assignments/index.tsx` | 교육 배정 관리 | ⬜ 대기 |

---

## 4. 완료된 전환

### Phase 2-B: 대시보드 Variant

- **대상**: `dashboard/index.tsx`
- **결과**: Design Core Variant 적용 완료
- **상태**: Variant 병렬 운영 중

---

## 5. Variant 운영 규칙

### 5.1 Variant 구현 패턴

```tsx
// 1. 타입 정의
type ViewVariant = 'default' | 'design-core-v1';

// 2. Props 추가
interface PageProps {
  variant?: ViewVariant;
}

// 3. 분기 처리
export default function Page({ variant = 'default' }: PageProps) {
  if (variant === 'design-core-v1') {
    return <PageDesignCoreV1 />;
  }
  return <PageDefault />;
}
```

### 5.2 Variant 활성화

- 개발/테스트: Props로 직접 전달
- 프로덕션: 플랫폼 총괄 승인 후 활성화

---

## 6. 확장 요청 처리

Yaksa 서비스에서 Design Core 확장이 필요한 경우:

```
즉시 확장 ❌
    ↓
요구사항 수집
    ↓
별도 Work Order 작성
    ↓
Phase 6+ 에서 처리
```

---

## 7. 참조 문서

- Design Core 운영 규칙: `docs/app-guidelines/design-core-governance.md`
- CLAUDE.md: `CLAUDE.md` (플랫폼 헌법)

---

*Yaksa Design Core Transition Roadmap v1.0.0*
