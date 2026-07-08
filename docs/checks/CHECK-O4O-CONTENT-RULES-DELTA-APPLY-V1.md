# CHECK-O4O-CONTENT-RULES-DELTA-APPLY-V1

Status: DONE — DELTA 규칙 반영 완료 · DB write 0 · 코드 변경 0 (2026-07-08)
WO: `WO-O4O-CONTENT-RULES-DELTA-APPLY-V1`
선행: `CHECK-O4O-DRUG-DESCRIPTION-RULES-DELTA-AUDIT-V1`(§10 OR/KB/ADR 분리)

DELTA-AUDIT가 확정한 신규·보강 규칙과 신규 문서 유형(OR·Knowledge·ADR)을 실제 반영했다. IR 소급 변환·기존 문서 삭제/대량 이동은 하지 않았다.

---

## 1. 반영 내역

### 1-1. Rule Registry
| 계층 | 반영 | 파일 |
|---|---|---|
| **CR** | **CR-015~019 추가**(IR=역사/운영·결정계보 IR→ADR→Guide·문서 4역할·INDEX 진입점·products·services 직교) + **CR-011 보강**(신규 규칙은 CHECK 아닌 Guide/Registry) | common/CONTENT-RULE-REGISTRY.md |
| **DR** | **DR-018 추가**(성분별↔세대/계열 대표 공존) + **DR-001·DR-005 보강**(KB 참조 링크) | products/drug/DRUG-RULE-REGISTRY.md |
| **AR** | **AR-005 보강**(편집·검수·번역 보조 제한) | ai/AI-RULE-REGISTRY.md |
| **OR** | **신규 계층 생성 — OR-001~004**(대량 삭제 금지·이동보다 헤더/참조·force rewrite 금지·path-specific commit) | common/OPERATIONAL-RULE-REGISTRY.md |

### 1-2. Knowledge Catalog (3종, Rule 아님)
- `products/drug/knowledge/ATC-FALSE-POSITIVE-CATALOG.md` — R01B·R02A·S01·A01A 오탐 + 향후 A07/D11/G02 축적
- `products/drug/knowledge/GROUPING-PATTERNS.md` — 함량축 분할·성분별↔세대별 공존·이중 분리·과병합 예외·spec≠농도
- `products/drug/knowledge/CONSUMER-WRITING-PATTERNS.md` — 소비자 문체·블록별 상투 문형

### 1-3. ADR (폴더 + 템플릿만, 소급 변환 없음)
- `docs/adr/README.md` (인덱스·원칙) · `docs/adr/ADR-TEMPLATE.md` (템플릿)
- **기존 IR 무변환** — 새 중요 결정부터 ADR로 기록.

### 1-4. Guide 보강 / 정합
- `common/CONTENT-CHECK-STANDARD.md` — **적용 ProductMaster 수(총/grounded) 필수화**(D-020)
- `common/DOCUMENT-INDEX.md` — OR·Knowledge·ADR 링크 추가(지도 정합)
- `common/DOCUMENT-ARCHITECTURE.md` — (선행 커밋에서) 4계층·KB 3종·IR→ADR→Guide 계보 반영 완료

## 2. Rule Registry 정합 확인

- CR: 001~019 연속(019까지). 다음 신규 = CR-020. 운영 규칙은 OR로 분리 명시.
- DR: 001~018 연속. DR-001/005는 규칙 유지 + KB 참조.
- AR: 001~006. AR-005 문구 확장.
- OR: 001~004 신규. CONTENT-RULE-REGISTRY·DOCUMENT-ARCHITECTURE·DOCUMENT-INDEX에서 상호 링크.
- 4계층(CR/DR/AR/OR) + Knowledge(3) + ADR = DOCUMENT-ARCHITECTURE §4·§4-1·§1-2와 일치.

## 3. 참조 확인

- DOCUMENT-INDEX: OR registry · knowledge/ 3종 · adr/ 링크 등재 ✅
- DOCUMENT-ARCHITECTURE: §4 4계층에 OR, §4-1 KB 3종, §1-2 ADR 계보 ✅
- DR-001→ATC-FALSE-POSITIVE-CATALOG, DR-005→GROUPING-PATTERNS 링크 ✅
- CONSUMER-WRITING-PATTERNS→CR-003/DR-017 역참조 ✅

## 4. 변경 없음 확인

- IR 소급 변환 0 · 기존 CHECK/WO 삭제 0 · 기존 Guide 대량 이동 0
- **DB write 0** · 코드 변경 0 · 설명서 신규 작성 0
- 기존 문서 수정은 Registry/INDEX 정합 편집에 한정(대량 이동 아님)

## 5. 완료 보고

| 항목 | 값 |
|---|---|
| **생성 문서 수** | **8** (OR registry 1 + Knowledge 3 + ADR README/TEMPLATE 2 + WO 1 + 본 CHECK 1) |
| **수정 문서 수** | **5** (CONTENT-RULE-REGISTRY · DRUG-RULE-REGISTRY · AI-RULE-REGISTRY · CONTENT-CHECK-STANDARD · DOCUMENT-INDEX) |
| **추가 Rule 수** | **10** (CR 5 + DR 1 + OR 4) + 보강 3(CR-011·DR-001/005·AR-005) |
| **KB 생성 수** | **3** (ATC · Grouping · Writing) |
| **ADR 생성 여부** | ✅ 폴더+템플릿+인덱스 (소급 변환 없음) |
| **DB write** | **0** |
| **commit hash** | (아래) |
| **push** | main (아래) |

## 6. 후속

- 새 중요 설계 결정 발생 시 `docs/adr/ADR-0001-*.md`부터 기록.
- Knowledge Catalog는 새 batch에서 오탐·패턴·문체 발견 시 행 추가(Registry 무수정).
- 의료기기·의약외품·건기식·서비스 문서는 스캐폴드 유지(착수 시 후속 WO).

## 7. commit / push

- commit: (기록) · push: main. 동시 세션 번들 방지 위해 **path-specific `git add`**(OR-004) 사용.
