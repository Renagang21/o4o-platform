# WO-O4O-CONTENT-RESOURCE-VERSIONING-V1

## 1. 작업명

WO-O4O-CONTENT-RESOURCE-VERSIONING-V1

---

## 2. 배경

현재 O4O Content Resource 는 수정 시 메타데이터만 변경되며 변경 이력이 관리되지 않는다. [`content_hash`](WO-O4O-CONTENT-RESOURCE-DEDUP-HASH-V1.md) 는 파일 자체를 식별할 뿐 Resource 의 변경 이력을 나타내지 않는다.

장기적으로 AI 추천 · Resource 비교 · 승인 이력 · 변경 추적을 위해 Version 정보가 필요하다. **단, 이번 WO 는 Git 과 같은 버전관리 시스템을 만드는 것이 아니다.**

## 2-A. 용어 정의 (오해 방지 — 필수)

> **이번 WO 의 `version` 은 "현재 Revision 번호(Revision Counter)"이며, Git 과 같은 버전 관리 시스템을 의미하지 않는다. 이전 버전의 데이터는 저장하지 않으며, History / Restore / Compare / Diff 는 별도 WO 에서 다룬다.**

- `version = 1, 2, 3…` 은 **현재 Resource 가 몇 번 수정되었는지**를 나타내는 카운터다.
- 이전 버전 내용 보관·복원 기능은 없다.
- 시리즈 이름은 "Versioning" 이지만 실제 구현 범위는 **Revision Counter** 다. 이후 진짜 Revision History 는 자연스럽게 확장한다.

## 3. 목적

모든 Content Resource 가 **현재 버전(Current Revision) 번호**를 갖게 한다. 이번 WO 는 **Version 번호만 관리**하며 버전별 데이터 보존은 하지 않는다.

## 4. 적용 대상

- `media_assets`

## 5. 구현 원칙

### 5.1 Version 은 Resource 속성
파일이 아니라 Resource 자체(메타데이터 상태)의 리비전 번호다. Hash(파일 속성)와 역할이 분리된다.

### 5.2 최초 생성
`version = 1`.

### 5.3 Metadata 수정 시
Metadata PATCH 성공 시 `version++`, `updated_at` 갱신.

### 5.4 파일 교체
현재 지원하지 않는다. 파일 교체 = 새 Resource 생성(Resource 독립성). 따라서 version 증가는 **파일 변경이 아니라 메타데이터 변경**에서만 발생.

### 5.5 Revision History 없음
이번 WO 는 **현재 버전 번호만** 관리. 이전 버전 복원 기능 제외(§2-A, §14).

## 6. 데이터 모델 (신규 컬럼)

```
version  integer  NOT NULL  DEFAULT 1
```

## 7. 증가 규칙

```
Metadata PATCH 성공 → version = version + 1
```
- 파일 속성 변경(불가) · Hash · folder 이동은 version 증가 대상 아님. **서술 metadata 변경만** 증가(정확 대상 필드는 §12 검증에서 확정, Metadata WO 화이트리스트와 일치).

## 8. 기존 Resource

`version = 1` 로 Backfill(단순 UPDATE). NOT NULL DEFAULT 1 이므로 기존 row 도 1 로 채워짐.

## 9. Admin

Resource 상세에 추가 표시(읽기 전용):
```
Current Version · Updated At
```

## 10. API

기존 `GET /platform/media-library` 및 상세/PATCH 응답에 `version` 필드 추가(additive).

## 11. Migration

```
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
```
- DEFAULT 1 로 기존 데이터 자동 채움(별도 UPDATE 불필요, 단 명시적 `UPDATE ... SET version=1 WHERE version IS NULL` 안전망 허용). 타임스탬프 = 순차 카운터 규칙 준수.

## 12. 검증

- 신규 Resource = version 1.
- Metadata 수정 → version 증가(1→2→3).
- content_hash 변경 없음(Hash 와 Version 역할 분리 확인).
- folder 이동 등 비-metadata 변경은 version 미증가(확정 후 CHECK 기록).
- 기존 목록/검색/업로드 회귀 없음.
- typecheck · build · 배포 · 브라우저 smoke · 콘솔 에러 없음.

## 13. 완료 기준

version 저장 · PATCH 시 증가 · Admin 표시 · API 제공 · 기존 회귀 없음 · CHECK · commit/push.

## 14. 제외

Revision History · 이전 버전 복원(Restore) · Branch · Compare · Diff · 승인 버전 관리 · 파일 버전 관리.

## 15. 작업 원칙

Additive · 최소 변경 · Resource 독립성 유지 · **Hash 와 Version 역할 분리** · **Metadata 변경만 Version 증가** · Revision History 없음(§2-A).

## 16. 산출물

CHECK — `CHECK-O4O-CONTENT-RESOURCE-VERSIONING-V1.md`

## 17. 후속 WO

```text
WO-O4O-CONTENT-RESOURCE-VERSIONING-V1  (본 WO)
      ↓
WO-O4O-AI-RESOURCE-METADATA-V1
      ↓
WO-O4O-CONTENT-RESOURCE-AI-RECOMMENDATION-V1
```

---

## 목표

모든 Content Resource 가 **현재 Revision 번호**를 갖는다. version 은 Git 식 버전관리가 아니라 "몇 번 수정되었는지"의 카운터이며(§2-A), 이전 버전 데이터는 저장하지 않는다. 이 기반 위에서 이후 AI Metadata 가 "어떤 Resource 의 어떤 리비전"을 대상으로 하는지 명확히 할 수 있다.

---

*Status: 확정 (핸드오프 대기). version = Revision Counter(History/Restore 별도 WO). 실행은 별도 지시로 착수.*
