# GlycoPharm UX Trust Rules v1

> 사용자 신뢰도 개선을 위한 UI 규칙
> WO-UX-TRUST-POLISH-GLYCOPHARM-V1 기준

---

## 목적

**개발자용/관리자용 UI 인상을 제거**하여 다음 인상을 달성한다:
- "실제 서비스처럼 보인다"
- "의료/헬스케어 서비스로서 신뢰할 수 있다"
- "내부 툴이 외부에 노출된 느낌이 아니다"

---

## Rule 1. 아이콘 규칙

| 항목 | 규칙 |
|------|------|
| 기본 색상 | `text-slate-500` (gray-500) |
| hover 시 | 명도 변화만 허용 |
| 색상 아이콘 | **전면 금지** |

### 예외 (허용)
- 상태 아이콘 (success/warning/error)
- 단, **아이콘 + 텍스트 동반 필수**

### 변경 사항
```
Before: text-blue-600, text-green-600, text-purple-600, ...
After:  text-slate-500
```

---

## Rule 2. 색상 사용 규칙

| 항목 | 규칙 |
|------|------|
| Primary 색상 | **1개만 유지** (`primary-600`) |
| 그 외 UI | white / off-white / gray 계열만 |

### 금지
- 카드별 다른 색상
- 기능별 다른 색상
- 섹션 배경 컬러 사용

### 변경 사항
```
Before: bg-blue-50, bg-cyan-50, bg-amber-50, bg-purple-50, bg-green-50
After:  bg-white border border-slate-200
```

---

## Rule 3. 카드 / 섹션 표현

| 항목 | 규칙 |
|------|------|
| 카드 배경 | white |
| 구분 방식 | 여백, border (`border-slate-200`) |
| 그림자 | 최소 또는 제거 |

### 변경 사항
```
Before: bg-blue-100, bg-green-100, bg-purple-100
After:  bg-slate-100 또는 bg-white border border-slate-200
```

---

## Rule 4. 버튼 위계 강제

| 항목 | 규칙 |
|------|------|
| Primary Action | **항상 1개** |
| Secondary | outline 또는 text |
| 버튼 색으로 역할 구분 | **금지** |

---

## Rule 5. 뱃지 / 태그 정리

| 유지 | 제거 |
|------|------|
| TEST, NEW | 의미 없는 상태 뱃지 |
| | 기능 설명용 뱃지 |

### 색상 규칙
- 모든 뱃지: `bg-slate-100 text-slate-700` (neutral)

### 변경 사항
```
Before: bg-green-100 text-green-700, bg-blue-100 text-blue-700, bg-purple-100 text-purple-700
After:  bg-slate-100 text-slate-700
```

---

## Rule 6. 관리자 UI 패턴 제거 (사용자 화면)

| Before | After |
|--------|-------|
| 테이블 중심 UI | 카드/요약형 |
| 상태 나열 | 핵심 요약 |
| 내부 코드/ID 노출 | **금지** |

> "이건 내부 관리 화면인가?"라는 의문이 들면 **실패**

---

## 적용 파일

| 파일 | 변경 내용 |
|------|-----------|
| `OperationFrameSection.tsx` | 4개 카드 아이콘 색상 `slate-500` 통일 |
| `HomePage.tsx` | QuickActionCards, NowRunning 뱃지, Partner 색상 중립화 |
| `PharmacyDashboard.tsx` | Block 2-4 운영 카드, 서비스 아이콘, 뱃지 중립화 |
| `StoreFront.tsx` | Trust Badges 아이콘 색상 `slate-500` 통일 |
| `LoginPage.tsx` | 테스트 계정 뱃지 색상 중립화 |

---

## DoD (Definition of Done)

- [x] 색을 대부분 제거해도 화면이 이해되는가?
- [x] 관리자 화면처럼 보이지 않는가?
- [x] 아이콘 없이도 기능이 이해되는가?
- [x] 의료/헬스케어 서비스로 보이는가?
- [x] 이 화면을 외부에 보여줘도 괜찮은가?

---

## 다음 단계

**WO-UX-TRUST-POLISH-ALL-SERVICES-V1**로 확산:
- K-Cosmetics
- Neture
- GlucoseView
- KPA-Society

---

*Created: 2026-01-13*
*Version: 1.0*
*Status: Active*
