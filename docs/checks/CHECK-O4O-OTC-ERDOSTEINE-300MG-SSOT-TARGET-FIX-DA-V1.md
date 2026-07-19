# CHECK — 에르도스테인 300mg 정 SSOT 대상 재현 수정

**WO:** WO-O4O-OTC-ERDOSTEINE-300MG-SSOT-TARGET-FIX-DA-V1 (에이전트 다)
**성격:** 스크립트 수정 · **DB write 0** · dry-run 재실행은 에이전트 가(인증 세션)
**스크립트:** `apps/api-server/src/scripts/drug-otc-erdosteine-300mg-canonical-upgrade-pilot.ts`

---

## 0. 근본 원인 (가 dry-run FAIL 진단 확정)

파일럿의 fingerprint 재계산이 bridge 정본(`drug-otc-full-corpus-authored-bridge-integration.ts`, f2c819451)과 **달라** coarse 30 master 가 전부 `4b4e162690065e8e`(그대로확장 26)·`d68b3eec1cb56646`(안전지문불일치 4) 어디에도 안 맞음(target 0).

**차이 지점:**
- bridge 는 `easySections`(없으면 `freeSections`) → **`bucketSections`** 로 정규제목 정규식 매칭해 ind/dos/cau/**itx** 분리. **상호작용은 `itx`(cau 제외)**.
- 이전 파일럿은 정확 키(`sec['상호작용']`)를 **cau 에 포함** → `norm_cau` 상이 → fingerprint 상이.

---

## 1. ⚠️ WO 전제 정정 — bridge JSON 에 master ID 없음

WO 작업①("bridge JSON 에서 26 master ID 를 결정론적으로 읽어")은 **실행 불가**:
- `otc-full-corpus-authored-bridge-groups-v1.json`: fingerprint·size·bucket·sampleName **만**(master ID 없음).
- `...-exceptions-v1.json` `안전지문불일치_샘플`: **그룹당 1 표본**(에르도스테인=엘도테인정 1건) — 4 전부 아님.
- summary·grounded-upgrade-candidate: master ID 없음.

→ **어느 bridge 산출물도 26/4 master ID 를 영속화하지 않음.** ID 주입이 불가하므로, 26/4 분할의 **유일한 결정론적 방법 = bridge 알고리즘 재현**.

## 2. 수정 (최소, bridge 산식 변경 아님)

- 파일럿의 fingerprint 함수를 **bridge 정본 함수 VERBATIM 채용**(`easySections`/`freeSections`/`bucketSections`/`formOf`/`routeSig`/`ingredientOf`/`strengthOf`/`groupKeyOf`). **bridge 산식 무변경 — 동치 재현.**
- 이전 커스텀 `sections`(상호작용 cau 포함) 제거 → `bucketSections`(상호작용 itx 분리)로 교정 = 오차 원인 해소.
- **교집합 0 게이트 추가**: `target∩exclude==0`, `excluded==4` 게이트 추가.
- **진단 JSON pre-gate 기록**(WO §6): anomaly ABORT 전에 `otc-erdosteine-300mg-upgrade-dryrun-v1.json` 에 fpDistribution·target/exclude 수·master IDs 를 남김.
- **resolved 26 master ID 를 JSON `target_master_ids` 로 고정**(재계산 결과의 결정론 산출물 = 이후 검증·재사용 기준).
- typecheck: 내 파일 오류 **0**.

> 재계산을 완전히 제거하지 못한 이유 = §1(bridge 가 ID 미영속화). **권고**: bridge 가 그대로확장 26 master ID 를 산출·영속화하면, 파일럿은 순수 ID 주입으로 전환 가능(재계산 0). 현 수정은 그 전까지의 **SSOT-충실 재현**.

---

## 3. 완료 보고

- **SSOT 26 재현:** bridge 함수 verbatim 채용으로 `4b4e162690065e8e`=26 재현(코드 정합; 실행 검증은 가 세션). 이전 오차(상호작용 cau 혼입) 제거.
- **제외 4 교집합 0:** `excluded(d68b3eec…)==4` + `target∩exclude==0` 게이트 추가.
- **대상 고정 방식:** bridge 정본 알고리즘 verbatim 재현 → coarse 30 → fp 계산 → 4b4e=26 / d68b=4 / 기타=0. resolved 26 ID 를 JSON 고정. (bridge JSON 에 ID 부재로 순수 주입 불가 — §1.)
- **fingerprint 산식:** 변경 없음(bridge verbatim). **제외 4 편입 없음. 실제 DB write 0. 정책·audit 규약 변경 없음. bridge 원본 JSON 미수정.**
- **commit·push:** ↓ 커밋 SHA
- **에이전트 가 재실행 명령:**
  ```bash
  # 인증(.env DB_PASSWORD) 세션, Cloud SQL Proxy :5442 SELECT-only
  cd apps/api-server
  npx tsx src/scripts/drug-otc-erdosteine-300mg-canonical-upgrade-pilot.ts   # 2회
  # 기대: target 26 · excluded 4 · other 0 · target∩exclude 0 · anomalies 0 · JSON byte-identical
  # PASS 시 승인 봉투(target 26·anomalies 0·byte-identical 확인) 발급
  ```

---

*fingerprint 재현 교정(bridge verbatim). 실제 write 0. dry-run 재실행 = 가.*
