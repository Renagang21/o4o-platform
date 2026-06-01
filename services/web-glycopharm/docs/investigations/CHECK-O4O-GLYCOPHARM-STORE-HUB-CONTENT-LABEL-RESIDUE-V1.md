# CHECK-O4O-GLYCOPHARM-STORE-HUB-CONTENT-LABEL-RESIDUE-V1

**날짜**: 2026-06-01  
**목적**: GlycoPharm Store HUB 콘텐츠 영역에 `내 약국에 복사` 계열 표현이 실제 코드에 남아 있는지 확인  
**결과**: **FIXED** — 코드 UI 문자열 3건 수정 완료

---

## 배경

`CHECK-O4O-CROSSSERVICE-STORE-HUB-CANONICAL-ALIGNMENT-CYCLE1-V1`에서  
GlycoPharm 콘텐츠 `copyLabel: '내 약국에 복사'`가 잔존 항목으로 기록됨.  
`WO-O4O-CROSSSERVICE-STORE-HUB-CONTENT-LABEL-ALIGNMENT-V1`에서 수정 완료로 보고됐으나 실제 코드 상태를 직접 확인.

---

## 검색 명령 및 결과

### 검색 대상: `services/web-glycopharm/src/`

```bash
grep -rn "내 약국에 복사|내 약국에 복사되었습니다|내 약국 > 자산 관리" \
  services/web-glycopharm/src/ --include="*.tsx" --include="*.ts"
```

**발견 결과:**

| 파일 | 라인 | 유형 | 내용 |
|------|------|------|------|
| `HubContentListPage.tsx` | L180 | UI 문자열 | `toast.success('내 약국에 복사되었습니다.')` |
| `HubContentListPage.tsx` | L183 | UI 문자열 | `copyLabel: '내 약국에 복사'` |
| `HubContentListPage.tsx` | L191 | UI 문자열 | `infoLinks label: '내 약국 > 자산 관리'` |
| `HubSignageLibraryPage.tsx` | L16 | **파일 헤더 주석** | `내 약국에 복사` (비대상) |

---

## 코드·문서 분리

| 위치 | 유형 | 수정 대상 |
|------|------|---------|
| `HubContentListPage.tsx` L180/183/191 | **UI 코드** — 사용자-facing 문자열 | ✅ 수정 |
| `HubSignageLibraryPage.tsx` L16 | 파일 헤더 주석 | ❌ 비대상 |
| `docs/investigations/` 문서 | 과거 IR/CHECK 기록 | ❌ 비대상 |

---

## 수정 내용

**파일**: `services/web-glycopharm/src/pages/hub/HubContentListPage.tsx`

| 라인 | 변경 전 | 변경 후 |
|------|---------|---------|
| L180 | `내 약국에 복사되었습니다.` | `내 매장에 복사되었습니다.` |
| L183 | `copyLabel: '내 약국에 복사'` | `copyLabel: '내 매장에 복사'` |
| L191 | `'내 약국 > 자산 관리'` | `'내 매장 > 자산 관리'` |

기능 변경 없음. API/route/ContentHubTemplate 구조 변경 없음.

---

## 수정 후 검증

```bash
grep -n "내 약국\|내 매장" services/web-glycopharm/src/pages/hub/HubContentListPage.tsx
# L180: 내 매장에 복사되었습니다.
# L183: copyLabel: '내 매장에 복사'
# L191: 내 매장 > 자산 관리
```

TypeScript: `0 errors`

---

## 최종 판정

**FIXED** ✅

코드 UI 문자열 3건 `'내 약국'` → `'내 매장'` 수정.  
GlycoPharm Store HUB 콘텐츠 사용자 표현이 KPA/K-Cosmetics canonical과 통일됨.

---

## 후속 필요 여부

없음. Store HUB 콘텐츠 레이블 drift 정리 완료.
