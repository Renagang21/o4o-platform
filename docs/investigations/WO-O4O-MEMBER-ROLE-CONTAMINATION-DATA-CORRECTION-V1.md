# WO-O4O-MEMBER-ROLE-CONTAMINATION-DATA-CORRECTION-V1

> 데이터 보정 기록 — 프로덕션 service_memberships.role 오염 정리. **사용자 승인 후 1 row UPDATE 실행.**
> 일자: 2026-05-30
> 선행: `IR-O4O-MEMBER-ROLE-CONTAMINATION-READONLY-AUDIT-V1`(영향 범위) · `WO-O4O-MEMBER-ROLE-WRITE-PATH-HARDENING-V1`(재오염 차단)

---

## 1. 요약

- 오염 9 rows 중 **참여 유형 복원 근거가 명확한 1 row만 보정 실행**(사용자 승인).
- 보류 5 rows(운영자/관리자 전용, 참여유형 근거 없음) + 테스트 별도 트랙 3 rows(@o4o.com).
- 보정 후 오염 **9 → 8**. role_assignments 무변경, 운영 권한 손실 없음. authorized-networks 임시변경 원복.

---

## 2. 사전 SELECT (보정 직전 재확인)

Q1 집계 9 rows 동일(GP 4 · Neture 2 · KCos 2 · KPA 1, 전부 bare·active). 대상 row(보정 실행분) 사전 확인:
```
 user_id=52a4c1e6-... | service_key=neture | role=operator | status=active   (1 row)
```

## 3. Row별 보정 계획표 (승인 결과 반영)

| email | service_key | 현재 role | canonical role_assignment | 참여유형 근거 | 보정 | 처리 |
|---|---|---|---|---|---|---|
| sohae21@naver.com | neture | operator | `neture:operator`(active) | **`supplier`(active)** | operator→**supplier** | **실행됨** |
| ksmgamil@gmail.com | glycopharm | admin | `glycopharm:admin`(a) | 없음 | — | 보류 |
| mmgi71537@gmail.com | glycopharm | operator | `glycopharm:operator`(a) | 없음 | — | 보류 |
| sohae2100@gmail.com | glycopharm | operator | super_admin 전체(a) | 없음 | — | 보류 |
| sohae2100@gmail.com | kpa-society | admin | super_admin 전체(a) | 없음 | — | 보류 |
| sohae2100@gmail.com | neture | operator | super_admin 전체(a) | 없음 | — | 보류 |
| glyco-operator@o4o.com | glycopharm | operator | `glycopharm:operator`**(inactive)** | — | — | 테스트 별도 트랙 |
| kcos-admin@o4o.com | k-cosmetics | admin | `cosmetics:admin`**(inactive)** | — | — | 테스트 별도 트랙 |
| kcos-operator@o4o.com | k-cosmetics | operator | `cosmetics:operator`**(inactive)** | — | — | 테스트 별도 트랙 |

## 4. 사용자 승인

- 옵션 "**승인: 1건만 실행(sohae21→supplier)**" 선택. 보류 5 / 테스트 3 은 미실행.

## 5. 실행한 UPDATE SQL

```sql
UPDATE service_memberships SET role = 'supplier', updated_at = NOW()
WHERE user_id = '52a4c1e6-6fba-4a41-a020-a47637e8ca3a'
  AND service_key = 'neture' AND role = 'operator';
-- 결과: UPDATE 1
```
조건에 `user_id + service_key + 기존 role` 모두 포함 → 정확히 1 row.

## 6. 사후 SELECT 검증

- 대상 membership: `neture / role=supplier / active` (operator 제거됨) ✓
- Q1 재집계: `neture operator` **2 → 1** (오염 총 9 → 8). 나머지 neture operator 1건은 sohae2100(보류).
- role_assignments(sohae21) 무변경: `neture:operator`(a) · `supplier`(a) · `kpa:store_owner`(a) 그대로 → **운영 권한 손실 없음**.

## 7. 카운트

| 구분 | rows |
|---|---|
| 보정 실행 | **1** (sohae21 neture operator→supplier) |
| 보류 | 5 (ksmgamil, mmgi71537, sohae2100×3 — 참여유형 근거 없음) |
| 테스트 별도 트랙 | 3 (@o4o.com, canonical inactive) |
| 보정 후 잔존 오염 | 8 |

## 8. role_assignments 무변경 확인

✅ sohae21 role_assignments 3건 그대로 유지(삭제·수정 0). bare `super_admin` 1건(별도)도 미접촉. role_assignments는 본 작업 범위 외.

## 9. 서비스별 영향

| 서비스 | 보정 전 오염 | 보정 후 오염 |
|---|---|---|
| Neture | 2 | **1** (sohae21 정리, sohae2100 보류) |
| GlycoPharm | 4 | 4 (전부 보류/테스트) |
| K-Cosmetics | 2 | 2 (테스트 별도 트랙) |
| KPA-Society | 1 | 1 (sohae2100 보류) |

보정 결과 sohae21@naver.com: 회원 유형=**공급자**(membership=supplier), 운영 권한=**운영자**(neture:operator), 두 축이 **데이터 레벨에서도 분리** 정합. (UI 표시는 기존에도 token 기반으로 공급자/운영자였으나, 이제 membership.role 원천도 정상.)

## 10. 후속 cleanup 필요 여부

- **보류 5건**: 운영자/관리자 전용 계정의 membership.role(operator/admin). 참여유형 근거 없어 보류. 향후 "운영자/관리자 계정에 service_membership 참여 row 가 필요한가" 정책 결정 후 중립값 정리 또는 membership 제거를 별도 판단.
- **테스트 3건(@o4o.com)**: 테스트 계정 cleanup 트랙(삭제/비활성)에서 처리. 본 보정 범위 외.
- **role_assignments bare super_admin 1건**: `platform:super_admin` 정규화 — 별도 소작업.
- write-path는 하드닝 완료 → 재오염 없음.

## 11. 격리 무결성

- DB 변경: **승인된 1 row UPDATE만**. SELECT 외 다른 write 0. role_assignments/users 미변경.
- authorized-networks 임시 추가(기존 보존) 후 **원복 확인**(124.194.156.36/32만 잔존).
- 코드 수정 0. 본 문서 1건만 신설.

*프로덕션 데이터 변경은 사용자 명시 승인(1 row) 하에 수행. 사전/사후 SELECT 검증 완료.*
