# O4O Platform Alpha 상태 표시 기준

> **작성일**: 2026-01-20
> **Work Order**: WO-GLOBAL-ALPHA-STATUS-HERO-V080
> **적용 버전**: v0.8.0 (운영형 알파)

---

## 1. 개요

O4O Platform 전체 서비스는 현재 **운영형 알파 (Operational Alpha)** 단계에 있습니다.
이 문서는 모든 공개 서비스의 Hero 영역에 표시되는 상태 정보의 기준을 정의합니다.

---

## 2. 전역 결정 사항

| 항목 | 값 |
|------|-----|
| **플랫폼 단계** | 운영형 알파 (Operational Alpha) |
| **공통 버전** | v0.8.0 |
| **적용 대상** | 모든 공개 서비스 Hero 영역 |
| **제외 대상** | admin-dashboard (Hero 없음) |

---

## 3. "운영형 알파"의 정의

> **운영형 알파란:**
> 일반 사용자 공개 단계가 아닌, 협력업체·사업 파트너·운영 주체가 실제 사용하며
> 구조와 흐름을 정비하는 단계입니다.

### 핵심 메시지 (3가지)

1. 현재 단계는 **운영형 알파**
2. 실제 운영·검증·정비가 진행 중
3. 파트너/운영자 중심 사용 단계

---

## 4. 표시 요소

### 4.1 Alpha 배지 (필수)

```
[●] 운영형 알파 · v0.8.0
```

- **위치**: Hero 영역 상단 (메인 헤드라인 위)
- **형태**: 둥근 모서리 배지 (pill badge)
- **색상**: 반투명 흰색 배경 (`bg-white/10` 또는 `rgba(255,255,255,0.1)`)
- **인디케이터**: 초록색 점 (`#34d399` / emerald-400)

### 4.2 안내 문구 (권장)

각 서비스 성격에 맞는 안내 문구 1줄:

| 서비스 | 안내 문구 |
|--------|----------|
| web-neture | 현재 파트너 기반 운영 검증 단계입니다 |
| web-k-cosmetics | 매장·브랜드와 함께 운영 구조를 검증하는 단계입니다 |
| web-glycopharm | 협력 약국과 함께 운영 구조를 검증하는 단계입니다 |
| web-glucoseview | (subtitle에 통합) |
| web-kpa-society | 지역약사회와 함께 운영 구조를 검증하는 단계입니다 |

---

## 5. UI 배치 원칙

1. **시각적 우선순위**: Hero 메인 카피보다 낮게
2. **형태**: 배지 또는 보조 텍스트
3. **색상**: Neutral 톤 (경고 색상 사용 금지)
4. **위치**: Hero 상단, 메인 헤드라인 바로 위

---

## 6. 금지 사항

- ❌ "베타", "정식", "안정화" 표현 사용
- ❌ 경고 색상 (빨강/노랑) 사용
- ❌ 출시 일정 언급
- ❌ 서비스별 개별 버전 부여

---

## 7. 적용 서비스 목록

### 7.1 Hero 영역 적용

| 서비스 | 파일 | 상태 |
|--------|------|------|
| web-neture | `src/pages/HomePage.tsx` | ✅ 적용됨 |
| web-k-cosmetics | `src/pages/HomePage.tsx` | ✅ 적용됨 |
| web-glycopharm | `src/pages/HomePage.tsx`, `src/config/heroConfig.ts` | ✅ 적용됨 |
| web-glucoseview | `src/pages/HomePage.tsx` | ✅ 적용됨 |
| web-kpa-society | `src/components/platform/HeroSection.tsx` | ✅ 적용됨 |

### 7.2 파트너 안내 페이지 적용 (WO-V080-PARTNER-STABILITY-CHECKLIST-UPDATE)

| 페이지 | 파일 | 상태 |
|--------|------|------|
| 파트너 매뉴얼 | `src/pages/test-guide/manual/PartnerManualPage.tsx` | ✅ 체크리스트 섹션 추가 |
| 참여 안내 | `src/pages/PartnerInfoPage.tsx` | ✅ 상태 배너 추가 |
| 운영자 안내 | `src/pages/PartnerOverviewInfoPage.tsx` | ✅ 상태 배너 추가 |

---

## 8. 신규 서비스 적용 가이드

신규 서비스 추가 시:

1. Hero 영역에 Alpha 배지 추가
2. 서비스 성격에 맞는 안내 문구 작성
3. 이 문서의 적용 서비스 목록 업데이트

### 코드 예시 (Tailwind CSS)

```tsx
{/* Alpha Status Badge */}
<div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs text-white/80 mb-4">
  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
  <span>운영형 알파 · v0.8.0</span>
</div>
```

### 코드 예시 (Inline Style)

```tsx
<div style={{
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '4px 12px',
  backgroundColor: 'rgba(255,255,255,0.1)',
  borderRadius: '20px',
  fontSize: '12px',
  color: 'rgba(255,255,255,0.8)',
  marginBottom: '16px',
}}>
  <span style={{
    width: '6px',
    height: '6px',
    backgroundColor: '#34d399',
    borderRadius: '50%',
  }}></span>
  <span>운영형 알파 · v0.8.0</span>
</div>
```

---

## 9. 단계 전환 시

Alpha → Beta 전환 시:

1. 이 문서의 버전 및 단계 명칭 업데이트
2. 모든 서비스의 배지 텍스트 일괄 변경
3. 안내 문구 내용 조정

---

## 10. 파트너 안정화 체크리스트

> WO-V080-PARTNER-STABILITY-CHECKLIST-UPDATE에 따라 추가됨

파트너가 운영형 알파 단계에서 확인해야 할 항목:

1. ☐ 공급자 목록에서 연결 가능한 공급자를 확인했습니다
2. ☐ 제휴 요청 기능이 정상 동작하는지 테스트했습니다
3. ☐ 대시보드에서 현황 카드가 올바르게 표시됩니다
4. ☐ 발주 흐름(수량 입력 → 요청)을 한 번 이상 진행했습니다
5. ☐ 불편하거나 이상한 점을 테스트 포럼에 공유했습니다

### 알파 단계 유의사항

- 화면이나 기능이 예고 없이 변경될 수 있습니다
- 일부 기능은 아직 개발 중이거나 미완성일 수 있습니다
- 테스트 데이터는 주기적으로 초기화될 수 있습니다

---

## 11. 참조

- [CLAUDE.md](../../CLAUDE.md) - 플랫폼 헌법
- [WO-GLOBAL-ALPHA-STATUS-HERO-V080] - Hero 영역 상태 표시 Work Order
- [WO-V080-PARTNER-STABILITY-CHECKLIST-UPDATE] - 파트너 체크리스트 Work Order

---

*이 문서는 O4O Platform 운영형 알파 단계의 공식 상태 표시 기준입니다.*
