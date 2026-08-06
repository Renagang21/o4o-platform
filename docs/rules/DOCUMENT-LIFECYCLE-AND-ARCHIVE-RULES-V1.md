# 문서 생명주기 · archive 규칙 V1

> **WO-O4O-DOCUMENTATION-INDEX-AND-LIFECYCLE-BASELINE-V1**
> **작성일**: 2026-08-06 · **적용 범위**: `docs/**` 의 추적 `.md` 문서 (2026-08-06 기준 2,952개)
> **성격**: 문서 관리 규칙. `CLAUDE.md` 및 영역별 Freeze/Baseline 문서에 **종속**하며 이를 대체하지 않는다.

---

## 1. 목적

3,000개에 가까운 문서를 **대량 이동·삭제 없이** 안전하게 관리하기 위한 최소 기준을 정한다.

이 문서가 정하는 것:
- 문서 상태(state) 정의
- 문서 종류별 상태 흐름
- archive 이동 조건
- 금지 사항
- 문서 헤더 권장 형식

이 문서가 **정하지 않는** 것:
- 어떤 문서를 지금 옮길지 (→ [`../investigations/IR-O4O-DOCUMENT-ARCHIVE-CANDIDATE-METHOD-V1.md`](../investigations/IR-O4O-DOCUMENT-ARCHIVE-CANDIDATE-METHOD-V1.md))
- 폴더 구조 변경, `docs/ir` ↔ `docs/investigations` 통합
- `CLAUDE.md` · `AGENTS.md` · 루트 `README.md` 의 내용

---

## 2. 문서 상태 정의

| 상태 | 의미 | 위치 | 수정 가능 |
|------|------|------|:---------:|
| **DRAFT** | 작성 중. 아직 판단 근거로 쓰면 안 됨 | 원래 폴더 | ✅ |
| **ACTIVE** | 현재 유효한 기준·계획. 판단 근거로 사용 | 원래 폴더 | 조건부 (§3) |
| **SUPERSEDED** | 후속 문서가 대체함. **대체 문서를 반드시 명시** | 원래 폴더 → archive | ❌ (링크 추가만) |
| **COMPLETED** | 작업이 끝나 실행 대상이 없음. 이력으로서 유효 | 원래 폴더 → archive | ❌ |
| **ARCHIVED** | `docs/archive/**` 로 이동 완료 | `docs/archive/**` | ❌ |
| **OBSOLETE** | 전제(서비스·정책·테이블)가 사라져 **내용 자체가 무효** | `docs/archive/obsolete/**` | ❌ |

### 상태 판정 원칙

1. **COMPLETED ≠ OBSOLETE.** 작업이 끝난 것과 내용이 틀린 것은 다르다. 끝난 작업은 COMPLETED 이고, 전제가 사라진 것만 OBSOLETE 다.
2. **SUPERSEDED 는 대체 문서 없이 붙일 수 없다.** 대체 문서 경로를 문서 상단에 적지 못하면 SUPERSEDED 가 아니다.
3. **판정 불가는 그대로 둔다.** 애매하면 ACTIVE 로 유지한다. 잘못된 archive 이동보다 방치가 안전하다.
4. **중지(STOP)로 끝난 작업도 결과가 확정되고 후속 작업으로 대체되었다면 COMPLETED 에 포함한다.** 별도 상태를 만들지 않는다. 유사 사례가 반복되면 그때 `STOPPED` 상태 신설을 검토한다.
5. **트랙 내부에서 후속 문서가 앞 문서의 판정을 정정한 경우, 개별 문서에 SUPERSEDED 를 붙이지 않는다.** 정정 관계가 후속 문서 본문에 남아 있고 트랙 전체가 함께 이동하면 트랙 단위 COMPLETED 로 충분하다. SUPERSEDED 는 **트랙 밖 문서가 대체할 때** 쓴다.

---

## 3. 문서 종류별 상태 흐름

### 3-1. 기준 문서 — `baseline/` · `architecture/` · `rbac/` · `rules/` · `services/` · `platform/` · `guides/`

```
DRAFT → ACTIVE → (SUPERSEDED) → ARCHIVED
```

- **ACTIVE 수정에는 WO 가 필요하다** (`CLAUDE.md §14`: Frozen 항목의 구조 변경은 명시적 WO 필수. 버그 수정·문서·테스트는 허용).
- **COMPLETED 상태를 쓰지 않는다.** 기준 문서는 "완료"되지 않고 대체(SUPERSEDED)되거나 유지된다.
- `CLAUDE.md` 에서 직접 링크된 문서는 **경로를 바꾸지 않는다** (§5 금지).

### 3-2. 작업요청서 — `work-orders/`

```
DRAFT → ACTIVE(실행 전/중) → COMPLETED → ARCHIVED(docs/archive/work-orders/)
                            ↘ OBSOLETE(docs/archive/obsolete/work-orders/)
```

- **반복 참조 가치가 있는 WO 는 COMPLETED 여도 이동하지 않는다** (예: `PLAN-ROLE-*` 체인, `CLAUDE.md` 직접 링크 WO). `work-orders/README.md` 의 "유지 대상" 규칙이 우선한다.
- 전제 서비스·정책이 폐기된 WO 만 OBSOLETE.

### 3-3. 조사 기록 — `investigations/` · `ir/`

```
DRAFT → ACTIVE(판정 유효) → COMPLETED(후속 조치 종료) → ARCHIVED(docs/archive/investigations/)
```

- IR 의 판정이 baseline/architecture 문서로 **승격**되면, 원본 IR 은 승격 문서를 명시하고 COMPLETED 로 본다.
- 판정만 나고 실행 WO 가 없는 **보류 IR 은 ACTIVE 로 유지한다.** 보류는 완료가 아니다.

### 3-4. 검증 회차 기록 — `checks/`

```
ACTIVE(회차 진행 중) → COMPLETED(트랙 종료) → ARCHIVED(docs/archive/checks/)
```

- 배치·생산 트랙의 회차 문서는 **트랙 단위로만** 상태가 바뀐다. 개별 회차 문서 하나만 archive 하지 않는다.

### 3-5. 감사 기록 — `audits/` · `data-audits/`

```
ACTIVE → COMPLETED → ARCHIVED(docs/archive/audits/)
```

### 3-6. 의사결정 — `adr/` · `decisions/`

```
DRAFT → ACTIVE → SUPERSEDED(대체 ADR 명시)
```

- **ADR 은 archive 로 옮기지 않는다.** 결정 이력 자체가 가치이며, 뒤집힌 결정도 SUPERSEDED 로 제자리에 남긴다.

---

## 4. archive 이동 조건

아래 **4개 조건을 모두** 만족할 때만 이동 후보가 된다.

1. **종료 확인** — 문서가 기술하는 작업·조사가 끝났음이 문서 내용 또는 커밋 이력으로 확인된다.
2. **외부 참조 없음** — 다른 추적 문서·코드가 그 문서 경로/파일명을 참조하지 않는다.
3. **`CLAUDE.md` 미링크** — `CLAUDE.md` 및 그 링크 체인에서 직접 참조되지 않는다.
4. **대체 관계 명시** — SUPERSEDED 인 경우 대체 문서를 문서 상단에 기록했다.

### 이동 대상 폴더 결정 기준

**archive 목적지는 현재 저장 위치가 아니라 문서의 실제 종류와 역할을 우선하여 결정한다. 문서 종류가 불명확한 경우에만 원래 폴더와 관련 문맥을 보조 기준으로 사용한다.**

문서가 원래 폴더와 성격이 어긋나 보관되어 있는 경우가 실재하므로(`checks/` 에 `WO-` 52건, `work-orders/` 에 `CHECK-` 다수), 아래 표는 **문서 종류** 기준이며 원래 폴더 기준이 아니다.

| 문서 종류 | archive 대상 |
|-----------|--------------|
| 검증 회차 기록 (CHECK) | `archive/checks/` |
| 조사 기록 (IR) | `archive/investigations/` |
| 작업요청서 (WO) | `archive/work-orders/` |
| 감사 기록 (AUDIT) | `archive/audits/` |
| 완료 보고서 (REPORT · COMPLETION · ROLLOUT) | `archive/reports/` |
| 전제 소멸(OBSOLETE) | `archive/obsolete/` |

> **적용 실적**: `CHECK-O4O-HFF-ZH-*` 7건은 `docs/work-orders/` 에 있었으나 성격이 완료된 검증 기록이므로 `archive/checks/` 로 이동했다 (2026-08-06, `WO-O4O-HFF-ZH-CHECK-DOCUMENTS-ARCHIVE-PILOT-V1`).

### 이동 단위

- **트랙 단위로 이동한다.** 하나의 작업 트랙에 속한 문서는 함께 옮긴다.
- 한 번의 커밋에서 옮기는 문서 수는 **트랙 1개**로 제한한다. 여러 트랙을 한 커밋에 섞지 않는다.
- 이동은 `git mv` 로 수행해 이력을 보존한다.

---

## 5. 금지 사항

1. **prefix 기반 일괄 이동 금지.** 파일명 prefix 는 폴더·상태를 결정하지 않는다 (`checks/` 에 `WO-` 52건, `investigations/` 에 `CHECK-` 352건).
2. **날짜만으로 archive 판정 금지.** 오래된 문서가 곧 종료된 문서는 아니다. §4 의 4개 조건을 모두 확인한다.
3. **`CLAUDE.md` 링크 문서 경로 변경 금지.** 옮기려면 `CLAUDE.md` 수정이 필요하고, 그것은 별도 WO 대상이다.
4. **문서 삭제 금지.** archive 이동만 한다. 삭제는 별도 IR 판정 후에만 수행한다.
5. **archive 문서 수정 금지.** archive 는 이력이다. 내용이 틀렸으면 현재 문서 쪽을 고친다.
6. **자동 스크립트 일괄 이동 금지.** 후보 산출은 자동화할 수 있으나, 이동은 사람이 트랙 단위로 승인한다.
7. **archive 를 삭제 대기열로 쓰지 않는다.** archive 는 보존 위치이지 폐기 예정 위치가 아니다.

---

## 6. 문서 헤더 권장 형식

신규 문서와, 상태가 바뀌는 기존 문서에 권장한다. **기존 문서 전체를 일괄 수정하지 않는다.**

```markdown
# <문서 제목>

> **상태**: ACTIVE | DRAFT | SUPERSEDED | COMPLETED | OBSOLETE
> **작성일**: YYYY-MM-DD · **최종 갱신**: YYYY-MM-DD
> **근거 WO/IR**: <WO 또는 IR 이름>
> **대체 문서**: <SUPERSEDED 인 경우에만. 없으면 줄 자체를 생략>
```

- **상태 줄이 없는 문서는 ACTIVE 로 간주한다.** 헤더 부재를 이유로 archive 판정하지 않는다.
- 상태를 바꿀 때는 상태 줄과 **최종 갱신 날짜를 함께** 고친다.

---

## 7. 이 규칙의 적용 순서

1. 이 문서를 근거로 **후보를 산출**한다 → [`../investigations/IR-O4O-DOCUMENT-ARCHIVE-CANDIDATE-METHOD-V1.md`](../investigations/IR-O4O-DOCUMENT-ARCHIVE-CANDIDATE-METHOD-V1.md)
2. **종료된 트랙 1개**를 골라 시험 적용한다.
3. 시험 결과로 이 규칙을 보정한 뒤 다음 트랙으로 넘어간다.

**전체 문서에 한 번에 적용하지 않는다.**

---

## 8. 관련 문서

- [`../README.md`](../README.md) — `docs/**` 최상위 폴더 색인
- [`../checks/README.md`](../checks/README.md) · [`../investigations/README.md`](../investigations/README.md) · [`../ir/README.md`](../ir/README.md) — 폴더별 진입 문서
- [`../work-orders/README.md`](../work-orders/README.md) — WO 분류·유지 대상 규칙
- `../../CLAUDE.md §14` — Frozen Baselines (기준 문서 수정 조건)
