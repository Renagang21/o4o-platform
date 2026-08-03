# WO-O4O-COMMONIZATION-STANDARD-SCOPE-REALIGNMENT-V1

> **성격**: docs-only. 코드/DB/package/route 변경 0.
> **선행 문서**: [`IR-O4O-EXISTING-COMMONIZATION-ASSET-AND-STATUS-REGISTRY-V1`](../investigations/IR-O4O-EXISTING-COMMONIZATION-ASSET-AND-STATUS-REGISTRY-V1.md) (Phase 0 read-only 조사, commit `4fda8b51e` / `f787d1561`)
> **대상 문서**: [`docs/architecture/O4O-COMMONIZATION-STANDARD.md`](../architecture/O4O-COMMONIZATION-STANDARD.md)
> **기준 commit**: `f787d1561` (main)
> **상태**: **DONE** (본 WO 와 동일 세션에서 실행 — §8 참조)

---

## 0. 목표 (한 문장)

> 기존 O4O Commonization Standard 의 **Cycle 1 성과와 frozen core 를 유지하면서**, 공식 대상 서비스 집합을 **KPA Society · K-Cosmetics · Neture · PharmacyHub** 로 재정렬하고 **GlycoPharm 은 historical out-of-scope 로 분리**한다.

---

## 1. 배경

Phase 0 조사(선행 IR)에서 확정된 사실:

1. 공통화 Cycle 1 은 **2026-06-15 CLOSED** 되었고, 14개 축이 현재 HEAD 에서도 유지된다. → **새 공통화 설계를 시작하면 중복 작업**이다.
2. `O4O-COMMONIZATION-STANDARD.md` §3 / §9 의 대상 서비스 집합은 **KPA / GlycoPharm / K-Cosmetics / Neture** 다.
3. 현재 공식 대상 서비스는 **KPA / K-Cosmetics / Neture / PharmacyHub** 다. GlycoPharm 은 제거 검토 중이라 조사·적용·리팩터링 전 범위에서 제외한다.
4. 즉 기준 문서와 현재 운영 대상이 **1개 서비스만큼 어긋나 있다**(`DOC_CODE_MISMATCH`).

이 어긋남을 먼저 해소하지 않으면, 이후 모든 adoption 판정이 **갱신되지 않은 매트릭스 위에서** 이뤄진다.

---

## 2. 작업 성격

```
docs-only
코드 변경 0
DB 조회·write 0
migration 0
package·dependency·lockfile 변경 0
route 변경 0
배포 0
GlycoPharm 코드 접촉 0
```

**단순 서비스 이름 한 줄 치환 작업이 아니다.** §3 의 8개 항목을 모두 반영해야 한다.

---

## 3. 필수 반영 항목 (8)

| # | 항목 | 내용 |
|:-:|------|------|
| A1 | **공식 대상 서비스 변경** | §3 표를 KPA / K-Cosmetics / Neture / PharmacyHub 로 교체 |
| A2 | **서비스별 역할 재정의** | KPA=reference(두꺼움) · KCos=frame 검증체(얇은 thin-wrapper 소비자) · Neture=독립앱+넓은 공통 소비 · PharmacyHub=adoption 초기. 성숙도 판정값 명시 |
| A3 | **PharmacyHub 오해 방지 명시** | PharmacyHub 를 "모든 core 의무 적용 대상"으로 해석하지 않도록 명문화. 채택 대상 / 화면별 판단 / 서비스 고유 3구분 |
| A4 | **GlycoPharm historical status** | 삭제가 아니라 **이력 분리**. 기존 GP 기재를 지우지 말고 out-of-scope 로 표시 — Cycle 1 검증 기록의 사실성 보존 |
| A5 | **Cycle 1 ↔ 신규 Cycle 관계** | Cycle 1 CLOSED 는 유효. 신규 Cycle 은 "재설계"가 아니라 "재정렬 + adoption" |
| A6 | **adoption matrix 갱신 원칙** | 매트릭스 갱신 시 `package.json` dependency 가 아니라 **실제 import 실측**을 근거로 한다 |
| A7 | **frozen core 유지 확인** | UX-CORE-FREEZE / STORE-UI-CORE-FREEZE / O4O-CORE-FREEZE(F10) 는 본 WO 로 변경되지 않음 |
| A8 | **legacy 정비 ↔ 신규 adoption 구분** | 두 작업을 섞지 않는다. legacy 정비(operator-core, auth-context)는 별도 트랙 |

---

## 4. 하지 않을 것

- 코드·package.json·lockfile·route 수정
- GlycoPharm 코드/문서 삭제 (문서 기재도 **삭제 아닌 상태 표시**로 처리)
- 새 공통 패키지 설계
- PharmacyHub 화면별 adoption 판정 (→ 후속 IR 범위)
- `@o4o/operator-core` 제거 (→ 별도 WO)
- frozen baseline 변경
- Cycle 1 종료 판정 번복
- §9 채택 매트릭스에 PharmacyHub 를 **추정으로** 채워 넣기 (실측 없는 칸은 미조사로 표기)

---

## 5. 중지 조건

- 작업 트리가 clean 이 아님
- 기준 commit 변경
- frozen baseline 변경이 불가피해짐
- GlycoPharm 기재 분리가 문서 정합성을 깨뜨림
- 범위가 실제 adoption 판정으로 확대됨

---

## 6. 완료 기준

- `O4O-COMMONIZATION-STANDARD.md` 개정 (버전 V1 → V2, Changelog 항목 추가)
- docs-only **path-specific** commit + origin/main push
- 커밋 메시지 예: `docs(architecture): realign commonization standard to official four services`

---

## 7. 후속

| 순위 | 문서 | 성격 |
|:---:|------|------|
| 1 | `IR-O4O-PHARMACY-HUB-COMMON-CORE-ADOPTION-SCOPE-V1` | read-only — 화면군 10개 × 판정값 9종 |
| 2 | `WO-O4O-OPERATOR-CORE-LEGACY-RETIREMENT-V1` | 소규모 코드 |
| 3 | `IR-O4O-GP-PAIRED-EXTRACTION-RESIDUAL-CONSUMER-AUDIT-V1` | read-only |
| 4 | `IR-O4O-AUTH-CONTEXT-CANONICAL-POSITION-V1` | read-only |
| 5 | `IR-O4O-FORUM-CORE-VS-SHARED-SPACE-UI-SEAM-V1` | read-only |

---

## 8. 실행 결과

**실행일**: 2026-08-03 · **결과**: 완료

`O4O-COMMONIZATION-STANDARD.md` V1 → **V2** 개정. 반영 내역:

| 항목 | 반영 위치 |
|------|----------|
| A1 공식 대상 서비스 | §3 표 교체 (4서비스 + 성숙도 판정) |
| A2 서비스별 역할 | §3 표 "역할" 열 + §3.1 |
| A3 PharmacyHub 오해 방지 | **§3.3 신설** — 3구분(기반 채택 / 화면별 판단 / 서비스 고유) |
| A4 GlycoPharm historical | **§3.4 신설** + §9 매트릭스 GP 열에 `(historical)` 표기 유지 |
| A5 Cycle 1 관계 | **§0 신설** (문서 상단 스코프 선언) |
| A6 매트릭스 갱신 원칙 | **§9.0 신설** — 실측 import 근거 원칙 |
| A7 frozen core 유지 | §0 명시 |
| A8 legacy ↔ adoption 구분 | §0.4 + **§10 신설**(현재 트랙 3축 — 기존 §10 참조 문서는 §11 로 밀림) |

**미조사 표기**: §9.1 PharmacyHub 열은 Hub Template import 0 이 실측되었으므로 `—(미채택)` 로 기재하고, 화면별 적용 가능 여부는 후속 IR 로 명시 이관.

---

*Date: 2026-08-03 · docs-only · 코드/DB/package 변경 0 · GlycoPharm 무접촉(문서 기재는 삭제 아닌 historical 표시)*
