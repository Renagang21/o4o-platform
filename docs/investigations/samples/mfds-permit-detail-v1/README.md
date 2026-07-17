# 제품허가정보 표본 응답 drop 지점 — WO-O4O-OTC-MFDS-PERMIT-DETAIL-SAMPLE-FETCH-V1

> **회사 머신에서 조회한 표본 응답 JSON 을 이 디렉터리에 둔다.** 집 PC 는 여기서 키 없이 검증을 이어간다.

## 넣을 파일 (품목기준코드별 1개)

```
199802620.json   쎄로테정(세티리진염산염)        ← NB_DOC 크레아티닌 청소율 온전성
200905228.json   알드라민정(세티리진염산염)       ← 동
199401186.json   무테린캡슐200(아세틸시스테인)     ← MATERIAL_NAME 아스파탐 식별
199600422.json   뮤세틸캡슐200(아세틸시스테인)     ← 동
199300215.json   아이잘정160(아세트아미노펜)       ← 동
199301063.json   라페론정160(아세트아미노펜)       ← 동
```

- 파일명 = **품목기준코드.json** (제품명 아님).
- **응답 원본 그대로** 저장(가공·정형·필드 추출 금지). API 가 준 JSON body 를 그대로.
- 호출 **실패 응답도 보존**(`<코드>.error.json` 등, 원본 그대로).

## 위생 규칙 (필수)

| 금지 | 이유 |
|---|---|
| **serviceKey 값** 을 파일 내부·파일명·주석에 남기지 않음 | 비밀정보 |
| **serviceKey 가 포함된 요청 URL** 저장 금지 | 키가 URL 에 노출됨 |
| 요청 헤더 중 인증 관련 값 저장 금지 | 동 |

> 저장 대상은 **응답 body(공개 품목허가 데이터)** 뿐. 응답 body 자체는 공개 데이터라 commit 가능하나, **요청 메타(URL·헤더·키)는 절대 포함하지 않는다.**

## 집 PC 후속 (표본 도착 후, 키 불필요)

1. **응답 스키마 확인** → NB_DOC / MATERIAL_NAME 필드 경로 파악.
2. **NB_DOC 온전성 검증**: 세티리진 2건에 "크레아티닌 청소율 … 10 mL/min 미만"(또는 `< 10`) + 괄호·문장 경계 보존 여부.
3. **MATERIAL_NAME 첨가제 식별**: 아세틸시스테인·아세트아미노펜 4건에서 아스파탐 성분명 식별 가능 여부.
4. 결과 → `CHECK-O4O-OTC-MFDS-PERMIT-DETAIL-SAMPLE-VALIDATION-V1` **본검증 갱신**(현재 "호출 중단" 상태 → 실측 판정).
5. 통과 시: **composer escape-before-sanitize 보강**(`easy-drug-shared-description-derive.service.ts:60`) → 유실 복구 → 첨가제 분류.

> 근거: [SAMPLE-VALIDATION CHECK](../../../checks/CHECK-O4O-OTC-MFDS-PERMIT-DETAIL-SAMPLE-VALIDATION-V1.md) · [SOURCE-RECOVERY IR](../../IR-O4O-OTC-OFFICIAL-SOURCE-RECOVERY-AUDIT-V1.md)
