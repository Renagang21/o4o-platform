# CHECK-O4O-CONTENT-DOCUMENT-ARCHITECTURE-APPLY-V1

Status: DONE — 문서 구조 반영 완료 · DB write 0 · 코드 변경 0 (2026-07-08)
WO: `WO-O4O-CONTENT-DOCUMENT-ARCHITECTURE-APPLY-V1`
근거(역사): `IR-O4O-CONTENT-AUTHORING-DOCUMENT-ARCHITECTURE-V1` · `CHECK-O4O-DRUG-DESCRIPTION-RULES-CONSOLIDATION-V1`

이번 CHECK는 IR에서 확정한 **Content Authoring 문서 아키텍처를 실제 운영 문서로 반영**한 결과다. IR은 수정하지 않았고(역사 보존), 운영은 `common/DOCUMENT-ARCHITECTURE.md`가 승계한다. 설명서 신규 작성·DB write·코드 변경 없음.

---

## 1. 생성한 구조

```text
docs/guides/
  common/                    DOCUMENT-INDEX · DOCUMENT-ARCHITECTURE · WORKFLOW · CONTENT-CHECK-STANDARD · CONTENT-RULE-REGISTRY(CR)   [5]
  content-authoring/         CONTENT-AUTHORING-PRINCIPLES                                                                             [1]
  ai/                        AI-PROMPT-STANDARD · AI-GROUNDING · AI-REVIEW · AI-SAFETY · AI-RULE-REGISTRY(AR)                          [5]
  products/drug/             DRUG-STANDARD · DRUG-WRITING · DRUG-GROUPING · DRUG-TEMPLATE · DRUG-RULE-REGISTRY(DR)                     [5]
  products/medical-device/   README (scaffold)   products/quasi-drug/ README   products/health-functional-food/ README               [3]
  services/kpa|gp|kcos|neture/ README (scaffold)                                                                                      [4]
```

- Rule Registry 3계층 실체화: **CR**(공통 14) · **DR**(의약품 17) · **AR**(AI 6). 다른 문서는 Rule ID만 참조.
- WORKFLOW = 작성→검토→승인→배포(Process+Pipeline 통합). 이중게이트·rollback·canonical 승격은 승인/배포 단계 규칙으로 흡수.

## 2. 기존 문서 처리 (비파괴)

| 문서 | 처리 | 이유 |
|---|---|---|
| `O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md` | **원위치 보존 + 운영 이관 헤더** | 66개 문서가 참조 → 이동 시 참조 파괴. 상세 원문·역사로 보존, 신규 참조는 `products/drug/DRUG-WRITING·DRUG-TEMPLATE` |
| `O4O-DRUG-STORE-DESCRIPTION-CANONICAL-STANDARD-V1.md` | **원위치 보존 + 운영 이관 헤더** | 5개 문서 참조. 신규 참조는 `products/drug/DRUG-STANDARD` |
| `docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md` | **유지(무변경)** | 운영 상태 데이터, 규칙 문서와 분리 원칙 |
| 규칙 확립 CHECK(NORM/SEED/COMBO/HIGHRISK/ROUTE/SRCGAP) | **역사로 보존(무변경)** | 규칙은 DR/DRUG-GROUPING로 승격, CHECK는 감사 근거 |
| 배치 CHECK ~70건 | **무변경** | 실행 결과 기록(역사) |

> **대량 삭제 0.** 운영 이관은 헤더 표기 + 신규 진입점 참조로 처리. 기존 CHECK의 옛 경로 참조는 그대로 유효.

## 3. CLAUDE.md 변경 요약

- "상세 규칙 문서 목록"에 **1행 추가**: `콘텐츠 문서 체계 (진입점) → docs/guides/common/DOCUMENT-INDEX.md`.
- **불변 원칙 1블록 추가**(외부 LLM 초안 자동생성 안 함 · 경로/제형 다르면 공유 금지 · read-only). 규칙 본문은 복사하지 않고 진입점만 안내.
- 그 외 CLAUDE.md 무변경.

## 4. MEMORY.md 변경 요약 (비파괴적)

- **repo에 MEMORY.md 없음** — 대상은 auto-memory 인덱스(크로스세션 자산).
- **파괴적 삭제 회피**: 배치 진행 상세는 track memory 파일(`wo-drug-otc-description-*-track`)에 이미 존재하는 올바른 home이므로 **그대로 보존**.
- 신규 memory 파일 `content-authoring-doc-architecture.md`(불변식 + 진입점) 생성 + MEMORY.md에 **불변식 포인터 1블록** 추가. (배치 track 포인터는 삭제하지 않음 — 삭제 시 네비게이션 손실)
- 판단 근거: "MEMORY는 불변식만"의 취지는 충족하되, 진행 상세는 이미 track으로 분리돼 있어 인덱스 포인터 유지가 안전. 이 결정을 본 CHECK에 명시.

## 5. IR 미수정 확인

- `IR-O4O-CONTENT-AUTHORING-DOCUMENT-ARCHITECTURE-V1.md` **무변경**(git diff 0). IR = 역사(Historical Decision), 운영은 `common/DOCUMENT-ARCHITECTURE.md`가 승계.

## 6. 완료 보고 (WO 기준)

| 항목 | 값 |
|---|---|
| **생성 문서 수** | **24** (guide 23 + 본 CHECK 1) · guide 내역: common 5 + content-authoring 1 + ai 5 + products/drug 5 + scaffold 7 |
| **이동/재배치 문서 수** | **0 물리 이동** (논리적 재배치 = 운영 이관 헤더 2건) |
| **수정 문서 수** | **3** (WRITING-GUIDE 헤더 · CANONICAL-STANDARD 헤더 · CLAUDE.md) |
| **deprecated(운영 이관) 처리** | **2** (WRITING-GUIDE · CANONICAL-STANDARD, 원문 보존) |
| **삭제 문서 수** | **0** |
| **CLAUDE.md 변경** | 진입점 1행 + 불변 1블록 |
| **MEMORY.md 변경** | 불변식 memory 파일 1 + 인덱스 포인터 1블록 (배치 상세 보존) |
| **IR 미수정** | ✅ diff 0 |
| **DB write** | **0** (문서만, 코드/DB 무접촉) |
| **commit hash** | (아래 §7) |
| **push** | main (아래 §7) |

## 7. 검증 / commit

- `git diff --stat` 로 변경 범위 확인: 신규 24 파일 + 수정 3 파일, 삭제 0. 코드·스키마 무변경. IR diff 0(미수정).
- 참조 무결성: 신규 문서 간 상대경로 링크 정합(common ↔ products/drug ↔ ai ↔ content-authoring), 기존 CHECK의 옛 경로 참조 유지.
- **commit: `260014922`** (main에 push 완료). ⚠️ **동시 세션 스테이징 레이스**로 본 APPLY 파일 전체가 병렬 세션 커밋("add EAR OTC check")에 함께 묶여 커밋·push됨 — 내용 전량 정상(29 files/1,110 insertions), 손실 0. 이미 push된 히스토리라 force 재작성은 동시 세션 보호를 위해 수행하지 않음.
- 본 §7 갱신은 별도 후속 커밋으로 기록.

## 8. 후속

- **content 전문 이관(V2, 선택)**: WRITING-GUIDE/CANONICAL-STANDARD 본문을 products/drug/* 로 물리 이관하고 옛 문서를 redirect stub화(참조 일괄 갱신 포함). 지금은 66참조 안정성을 위해 헤더 이관만 수행.
- 의료기기·의약외품·건기식·서비스별 문서는 스캐폴드만 — 착수 시 후속 WO/IR.
- QR·POP·블로그·동영상 콘텐츠 유형 규칙은 content-authoring/ 확장으로 후속.
