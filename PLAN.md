# Plan: WO-O4O-NETURE-CSV-APPLY-VISIBILITY-FIX-V1

## 현재 상태 분석

- Apply 버튼은 이미 **배치 상세 모달 내부에만** 존재 (line 743-751)
- READY 상태가 VALID/VALIDATED와 동일한 **초록색** — 완료된 것처럼 보임
- 배치 리스트 테이블에서는 Apply 없이 상세 모달을 열어야만 적용 가능
- 업로드 후 안내 문구 없음 → 사용자가 "업로드 = 등록"으로 오해

## 변경 대상: 1개 파일

### `services/web-neture/src/pages/supplier/SupplierCsvImportPage.tsx`

### A. 배치 리스트에 Apply 버튼 노출

배치 테이블 행의 우측 버튼 영역(line 523-538)에 READY 상태일 때 `[적용하기]` 버튼 추가.
- 새로운 `handleQuickApply(batchId, e)` 함수 추가
- applyBatch API 호출 → 성공 시 alert로 결과 표시 + loadBatches() 새로고침

### B. 상태 표시 개선

**B-1.** StatusBadge에서 READY 색상 변경: 초록 → **주황색(amber)** (상품 생성 전 상태를 시각적으로 구분)
```
READY: 'bg-amber-100 text-amber-800'  // 기존: 'bg-green-100 text-green-800'
```

**B-2.** StatusBadge에서 READY 텍스트를 `생성 대기`로 표시하도록 label 매핑 추가

### C. 업로드 영역 하단 안내 메시지

Section 2 (Upload) 하단에 상시 안내 추가:
```
업로드 후 '적용하기'를 눌러야 상품이 생성됩니다.
```

### D. 배치 리스트에서 직접 Apply 시 피드백

리스트에서 Apply 클릭 시:
- 성공: `"상품 N건이 생성되었습니다"` alert
- 부분 성공: `"N건 성공, M건 실패"` alert
- 실패: `"상품 생성에 실패했습니다"` alert

### E. 빈 상품 리스트 안내

변경하지 않음 — CSV import 페이지 자체에서 충분히 가이드.

### F. 자동 이동

배치 리스트에서 Apply 성공 후 자동 이동 않음 (배치 상태가 APPLIED로 바뀌어 시각적 확인 충분).

## 요약

| 항목 | 변경 내용 |
|------|----------|
| Apply 버튼 | 배치 리스트 테이블 행에 READY 상태 시 노출 |
| READY 색상 | 초록 → 주황(amber) |
| READY 텍스트 | `READY` → `생성 대기` |
| 안내 문구 | 업로드 영역 하단에 상시 표시 |
| 피드백 | Apply 결과를 alert로 표시 |
