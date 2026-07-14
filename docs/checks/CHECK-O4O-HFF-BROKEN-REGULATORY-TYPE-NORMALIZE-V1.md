# CHECK-O4O-HFF-BROKEN-REGULATORY-TYPE-NORMALIZE-V1

WO: `WO-O4O-HFF-BROKEN-REGULATORY-TYPE-NORMALIZE-V1`
상태: **CLOSED / PASS** (2026-07-14)
commits: `14cd98b91` (docs/grounding) · `e7dddb246` (migration)
migration: `20270208000000-NormalizeHffRegulatoryTypeBrokenLiteral`

---

## 0. 목적

건강기능식품(HFF) 설명서 제작 종합 CHECK 전, **제작 대상 모수에서 누락된 손상 마스터를 보정**한다.
데이터 정비이며 설명서 제작이 아니다. QR·ProductLanding·기존 설명서 무변경.

## 1. Dry-run 발견 (프로덕션 read-only, Cloud SQL Auth Proxy)

- `product_masters.regulatory_type` 정상 HFF 값 = 한글 리터럴 **`건강기능식품`**(30건). (`HEALTH_FUNCTIONAL` 은 candidate/코드 레이어이고 master 레이어는 한글 리터럴.)
- **손상 리터럴 5건** — CP949→UTF8 mis-decode(U+FFFD 치환, hex `efbfbdc7b0…c7b0`). 5건 손상 hex **완전 동일** → 원래 값이 모두 `건강기능식품` 이었다는 강한 증거.
- 동시 손상: `name`·`manufacturer_name` 도 mojibake, `mfds_permit_number`·`barcode`·`product_identifiers` 부재. 생성 2026-07-10~12 = 바코드리스 admin 등록(Phase D) 라이브 시점 일치 → 등록 경로 인코딩 버그 추정.
- **중복 ProductMaster 0건** (permit/name 기준). 4/5 는 이미 SPD 설명서 존재(실사용 파이프라인) = 진짜 건기식.

| master_id | 실체(SPD 근거) | SPD | 처리 |
|---|---|:--:|---|
| 38a9d3e4 | 프로바이오틱스 | 8 | 정규화 |
| bcc5d466 | 쏘팔메토/전립선 | 4 | 정규화 |
| db20f469 | 홍삼스틱 | 4 | 정규화 |
| fb7d9684 | 비타민C | 4 | 정규화 |
| 0b5502e5 | 설명서 0·분류 근거 부족 | 0 | **HOLD** |

## 2. 범위 결정 (사용자 승인)

- **regulatory_type 만** `건강기능식품` 으로 정규화. 4건 대상.
- **name / manufacturer_name 무변경** — 상품명 기준은 식약처 공식 제품명이며 **SPD 설명서 제목/본문을 상품 정체성 근거로 쓰지 않는다(CR-007)**. 인코딩 원문 복구는 식약처 공식 원천(candidate raw_payload·품목보고번호) 매칭 후 **별도 guarded WO**.
- **0b5502e5 HOLD** — 근거 부족(설명서 0·분류 미검증). CR-007 "근거 부족 제품은 제작하지 않음" 원칙에 부합.

## 3. 문서화 — CR-007 강화 (신규 번호 아님)

"근거 부족 제품은 제작하지 않고 HOLD" 는 **이미 CR-007** 이 담고 있어 신규 CR 미생성(CR-015 는 타 규칙 점유). 전 상품군 공통으로 강화:

- `HFF-DESCRIPTION-RULES-SSOT-V1 HFF-R09` — 근거 부족 HOLD 문단 추가.
- `content-authoring/CONTENT-AUTHORING-PRINCIPLES §7` — 공통 원칙(3구분: 충분→작성 / 보완가능→조사 후 재판정 / 핵심 부족→HOLD·미작성). 유사/다른 제품 대체 금지, 보수적 추정 설명서 금지.
- `common/CONTENT-RULE-REGISTRY CR-007` — 설명 강화.

## 4. Migration (idempotent · 스냅샷 백업)

- 대상 4 UUID, `regulatory_type` 단일 컬럼 UPDATE. 이미 `건강기능식품` 이면 0건(idempotent). 타 환경 UUID 부재 → no-op.
- `product_master_hff_regtype_snapshots` 에 손상 old값 hex 보존(down 복원 = `convert_from(decode(hex))`).
- 사후 불변식: 대상 present == normalized 아니면 throw→롤백.

## 5. 검증 (배포 후 프로덕션 read-only)

| 검증 | 기대 | 결과 |
|---|---|:--:|
| 4개 타깃 regulatory_type | 전부 `건강기능식품` | ✅ 4/4 |
| 잔여 손상 리터럴 | 1건(0b5502e5)만 | ✅ 1건 |
| HFF 총량 재측정 | 30 + 4 = **34** | ✅ 34 |
| 스냅샷 백업 | 4건 old hex 보존 | ✅ |

- API 배포 성공(`Deploy API Server` run 29338499192). 마이그레이션 CI 자동 적용.

## 6. 후속 (별도 WO)

1. **name/manufacturer 인코딩 원문 복구** — 식약처 공식 원천 매칭 후 guarded WO. SPD 근거 금지.
2. **0b5502e5 분류·정체 검증** — HOLD 해제는 공식 근거 확보 후.
3. **등록 경로 인코딩 버그** — 바코드리스 admin 등록/임포트 CP949 손상 원인 조사(신규 등록 재발 방지) 별도 조사 WO.
4. (관찰) 일반식품 `일반`(15) vs `GENERAL`(9) 한/영 리터럴 혼재 — 이번 범위 외.

## 7. 다음 순서 (HFF 트랙)

정규화 완료 → **제작 준비 완료 종합 CHECK** 가능 → 본작업 Batch 0(구형 photo 15건 semantic ko+en) → 41,261 후보 중 시판 확인 제품 master 생성·설명서 제작.
