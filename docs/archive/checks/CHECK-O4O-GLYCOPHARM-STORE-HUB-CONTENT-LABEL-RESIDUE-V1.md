# CHECK-O4O-GLYCOPHARM-STORE-HUB-CONTENT-LABEL-RESIDUE-V1

**날짜**: 2026-06-01  
**목적**: GlycoPharm Store HUB 콘텐츠 영역에 `내 약국에 복사` 계열 표현이 실제 코드에 남아 있는지 확인  
**결과**: **INTENTIONAL** — GlycoPharm은 약국 전용 서비스로서 `내 약국` 표현을 의도적으로 유지

---

## 배경

`CHECK-O4O-CROSSSERVICE-STORE-HUB-CANONICAL-ALIGNMENT-CYCLE1-V1`에서  
GlycoPharm 콘텐츠 `copyLabel: '내 약국에 복사'`가 잔존 항목으로 기록됨.  
실제 코드를 확인하여 코드 잔존인지, 의도된 서비스 정책인지 판단.

---

## 검색 결과

### 검색 대상: `services/web-glycopharm/src/`

**발견 결과:**

| 파일 | 라인 | 유형 | 내용 |
|------|------|------|------|
| `HubContentListPage.tsx` | L182 | UI 문자열 | `toast.success('내 약국에 복사되었습니다.')` |
| `HubContentListPage.tsx` | L185 | UI 문자열 | `copyLabel: '내 약국에 복사'` |
| `HubContentListPage.tsx` | L193 | UI 문자열 | `infoLinks label: '내 약국 > 자산 관리'` |
| `HubSignageLibraryPage.tsx` | L16 | 파일 헤더 주석 | `내 약국에 복사` (비대상) |

---

## 판정: 의도적 유지 (정책 결정)

`HubContentListPage.tsx`에 가드 주석이 명시적으로 추가됨:

```typescript
// GlycoPharm 사용자-facing 문구는 "내 약국" 표현 유지
// (WO-O4O-GLYCOPHARM-HUBCONTENT-PHARMACY-LABEL-RESTORE-AND-GUARD-V1)
// ⚠️ "내 매장"으로 일괄 치환 금지 — GlycoPharm은 약국 전용 서비스
```

**결론:**

- GlycoPharm은 약국(pharmacy) 전용 서비스
- `내 약국에 복사`, `내 약국 > 자산 관리`는 서비스 컨텍스트에 맞는 의도된 표현
- O4O Store HUB 공통 정렬 기준(`내 매장`)과 서비스별 예외가 병존할 수 있음
- **수정 대상 아님** — GlycoPharm의 pharmacy 컨텍스트를 반영한 적절한 표현

---

## 코드·문서 분리

| 위치 | 유형 | 처리 |
|------|------|------|
| `HubContentListPage.tsx` L182/185/193 | UI 코드 — 의도적 pharmacy 표현 | ✅ 유지 (가드 주석 보호) |
| `HubSignageLibraryPage.tsx` L16 | 파일 헤더 주석 | 비대상 |
| `docs/investigations/` 문서 | 과거 IR/CHECK 기록 | 비대상 |

---

## 최종 판정

**INTENTIONAL** — 코드 수정 없음

```
GlycoPharm Store HUB 콘텐츠 레이블:
  copyLabel: '내 약국에 복사'          ← 의도적 약국 컨텍스트
  toast: '내 약국에 복사되었습니다.'    ← 의도적 약국 컨텍스트
  infoLinks: '내 약국 > 자산 관리'     ← 의도적 약국 컨텍스트

KPA / K-Cosmetics: '내 매장에 복사'    ← 서비스 중립 공통 표현

서비스별 pharmacy/store 표현 차이는 O4O 서비스 다양성 정책상 허용.
WO-O4O-GLYCOPHARM-HUBCONTENT-PHARMACY-LABEL-RESTORE-AND-GUARD-V1으로 가드 처리됨.
```

---

## 후속 필요 여부

없음. GlycoPharm `내 약국` 표현은 의도된 서비스 정책으로 확정.  
`CHECK-O4O-CROSSSERVICE-STORE-HUB-CANONICAL-ALIGNMENT-CYCLE1-V1`의  
"잔존 항목" 기록을 의도된 예외로 재분류한다.
