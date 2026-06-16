# CHECK-O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-DOCUMENTATION-V1

> **작업명:** WO-O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-DOCUMENTATION-V1
> **유형:** 문서화 only. 코드/DB/UI **무변경**.
> **결과: PASS — 콘텐츠 제작 6단계 canonical SSOT 문서 신규 작성. 용도별 콘텐츠↔산출물 분리 / 템플릿=산출물 시점 / POP 모범 / 대상별 현재 상태 / 후속 Gate 명시.**
> 근거: `IR-O4O-CONTENT-PRODUCTION-EDITOR-TO-TARGET-OUTPUT-FLOW-AUDIT-V1` — 2026-06-16

---

## 1. 생성/수정 문서

| 문서 | 구분 |
|------|------|
| `docs/architecture/O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-V1.md` | **신규** (canonical SSOT) |
| `docs/investigations/CHECK-O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-DOCUMENTATION-V1.md` | 본 CHECK |

> 위치: `O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1`(테이블 정의)의 자매 문서. 본 문서는 그 위의 **흐름(flow)** 기준.

## 2. 문서화한 canonical 핵심

- **6단계 고정** (§1): 대상선택 → 자료투입 → 편집·AI → **용도별 콘텐츠 저장** → 템플릿 → **실사용 산출물**. 4→6 단방향, 재제작은 4에서 재시작.
- **핵심 분리 원칙** (§2): 용도별 콘텐츠(재편집·대상별 테이블, 양식 미포함) ↔ 산출물(`store_execution_assets`, 재편집 대상 아님) ↔ 템플릿(**산출물 생성 시점 적용**, 콘텐츠에 영구 결합 금지, `templateId`는 산출물 메타에만).
- **공통 골격** (§3): StartProductionModal/ProductionRouterState/AiContentModal/템플릿 레지스트리/store_execution_assets — 신규 대상 재사용 대상.
- **저장 위치 표** (§4): POP/QR/블로그/상품설명/사이니지/안내문 각각의 ④콘텐츠·⑥산출물 위치.

## 3. POP 모범 사례 반영 여부

- §5 에 POP 전체 흐름(운영자 발행→HUB→가져오기→사본→AI/편집→**store_pops 콘텐츠 저장**→템플릿(생성 시)→**store_execution_assets PDF**→재제작) 명시.
- 모범 포인트(store_pops=재사용 콘텐츠, execution_asset=산출물, templateId=산출물 메타, 양식 미포함) 명시.
- 구현 근거 WO(POP-SAVE-AS-CONTENT, POP-QR-SELECTOR) 인용. ✅

## 4. 대상별 현재 상태 요약 (§6)

| 대상 | 상태 |
|------|------|
| POP | ● Canonical 정합 (모범) |
| 블로그 | ● 대체로 정합 (콘텐츠=게시물 이중 역할 허용) |
| QR | ◐ 저장 정합 / AI·통계 parity 후속 |
| 상품설명 | ◐ 콘텐츠 저장 O / 산출물 노출 경로 X |
| 사이니지 | ◐ 별도 패러다임 / 편입 여부 후속 |
| 고객 안내문 | ✗ 부재 / 구현·보류 결정 필요 |

→ §7 후속 Gate(7 질문) + Drift 신호, §8 후속 WO 로드맵(P2 상품설명·저장표준 / P3 사이니지·안내문·QR) 포함.

## 5. 검증 항목 점검

- [x] 신규 문서 생성
- [x] 6단계 canonical 명시
- [x] 용도별 콘텐츠 vs 산출물 분리 명시
- [x] 템플릿 적용 시점(산출물 시점) 명시
- [x] POP 모범 사례 명시
- [x] 대상별 현재 상태 명시
- [x] 후속 작업 판단 기준(Gate) 명시
- [x] 코드/DB/UI 변경 없음

## 6. 무변경 확인

- 코드/DB/마이그레이션/route/UI/공통 컴포넌트/템플릿/AI prompt **변경 0**. 문서 2개만 생성.
- 동시 세션 WIP 미접촉. `git add .` 미사용 — path-specific stage.

## 7. 완료 판정

**PASS.** 콘텐츠 제작 프로세스 canonical 이 SSOT 로 고정됨. 이후 상품설명 산출물 / 사이니지 편입 / 고객 안내문 / QR parity 정비는 본 문서 §1·§2·§7 기준으로 판단.

## 8. commit/push

- 커밋: `<본 커밋 해시>` (path-specific: canonical + CHECK 2파일)
- push: origin/main

---

*Date: 2026-06-16 · 콘텐츠 제작 6단계 canonical SSOT 문서화 PASS · 용도별 콘텐츠↔산출물 분리 + 템플릿=산출물 시점 + POP 모범 고정 · 코드/DB/UI 무변경 · 다음: 상품설명 산출물 / 사이니지 편입 / 고객 안내문 중 선택.*
