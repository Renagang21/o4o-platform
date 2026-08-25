# CHECK — WO-O4O-CLOUDSQL-AND-RUNTIME-SECRET-HARDENING-V1
(이전 세션 CHECK가 디스크에 없어 본 파일로 이어서 기록)

## BASELINE (변경 전) — 2026-08-25
- instance: netureyoutube:asia-northeast3:o4o-platform-db (POSTGRES_15, RUNNABLE)
- ipConfiguration: ipv4Enabled=true, authorizedNetworks=[124.194.156.36/32],
  sslMode=ALLOW_UNENCRYPTED_AND_ENCRYPTED, requireSsl=false
- NOTE: *.run.app URL은 라우팅되지 않아 404. 검증 기준 호스트 = https://api.neture.co.kr
- /health           = 200 status:alive v0.5.0
- /health/database  = 200 status:healthy pg15.17 pingMs=3
- /api/health       = 200 database.status=healthy
- 대표 read API /api/v1/forum/categories = 200 (DB row 반환)
- Cloud Run o4o-core-api: Ready=True, rev o4o-core-api-03455-krf
  DB_USERNAME=o4o_api_v2, DB_PASSWORD -> secretKeyRef o4o-db-password:latest
- jobs 8개 중 o4o-api-migrations 만 secretKeyRef(o4o-db-password), 나머지 7개는 literal DB_PASSWORD(len=11), DB_USER/DB_USERNAME 미지정(앱 기본값 사용)

## STEP 1 — authorizedNetworks 제거 : DONE
- `gcloud sql instances patch o4o-platform-db --clear-authorized-networks`
- 결과: authorizedNetworks 비어있음, ipv4Enabled=true 유지, private IP/VPC 무변경

## STEP 2 — 검증 : PASS
- /health 200 · /health/database healthy · /api/health healthy
- /api/v1/forum/categories 200 (DB read 정상)
- Cloud Run o4o-core-api Ready=True, rev o4o-core-api-03455-krf (무변경)
- ERROR/5xx/DB auth·connection 로그 0건 (freshness 8m)

## STEP 3 — sslMode=ENCRYPTED_ONLY 적용 : DONE
- `gcloud sql instances patch o4o-platform-db --ssl-mode=ENCRYPTED_ONLY`
- 결과: sslMode=ENCRYPTED_ONLY, state=RUNNABLE

## STEP 4 — 재검증 : PASS
- /health, /health/database, /api/health, 대표 read API 전부 200
- 연속 30회 요청 전부 200 (신규 커넥션 handshake 포함)
- ERROR/5xx/SSL/pg_hba/auth 로그 0건 (freshness 10m)
- Cloud SQL 연결 설정: o4o-core-api 및 job 8개 전부
  run.googleapis.com/cloudsql-instances = netureyoutube:asia-northeast3:o4o-platform-db 정상

=> Cloud SQL network/TLS hardening 구간 CLOSED

## STEP 5 — o4o_api credential closure : BLOCKED (판단 필요)
실측 결과:
- 7개 job은 DB_USERNAME 미지정 → 코드 기본값 `o4o_api` 사용 (apps/api-server 다수 스크립트: `process.env.DB_USERNAME || 'o4o_api'`)
- job literal DB_PASSWORD(len=11) 로 o4o_api 인증 시도 → FATAL: password authentication failed  (무효 확인)
- ~/.pgpass 의 o4o_api 비밀번호도 동일하게 FAIL
- Secret `o4o-db-password` 값으로 o4o_api 인증 → FAIL / o4o_api_v2 인증 → OK
- Secret Manager 보유 secret: cafe24-client-id, cafe24-client-secret, o4o-db-password, o4o-encryption-key
  → **유효한 o4o_api 비밀번호가 어디에도 존재하지 않음**
결론: "새 secret 생성 후 참조" 만으로는 불가. o4o_api 비밀번호 재설정이 선행되어야 함(미승인 항목).

## STEP 5 — o4o_api credential closure : 실행 (옵션2 승인)
1. o4o_api 비밀번호 재설정 (32자 alnum, 로컬 생성 → 쉘 변수로만 전달, 채팅/파일/로그 미노출)
   `gcloud sql users set-password o4o_api --instance=o4o-platform-db` → done
2. 신규 secret `o4o-api-db-password` 생성 (stdin 주입, version 1)
3. runtime SA `117791934476-compute@developer.gserviceaccount.com`
   에 roles/secretmanager.secretAccessor 최소 권한 부여 (해당 secret 한정)
4. 7개 job DB_PASSWORD: literal → secretKeyRef(o4o-api-db-password:latest) 전환 — spec 7/7 반영 확인
   DB_USERNAME=o4o_api 는 원래부터 명시되어 있었고 그대로 유지
5. 최종 구조
   o4o-core-api / o4o-api-migrations → o4o_api_v2 + o4o-db-password
   drug·easy-drug 7개 job          → o4o_api    + o4o-api-db-password
6. 자격증명 실측: cloud-sql-proxy(5599) 경유 psql, 신규 secret 값으로 o4o_api → AUTH_OK
   (pg_stat_ssl ssl=false 는 proxy가 TLS 종단이기 때문. proxy→instance 구간은 TLS)
7. 평문 credential 잔존 0건

### 신규 발견 결함 (본 WO 범위 밖, 별도 조치 필요)
- 7개 job 전부 Artifact Registry에서 **삭제된 옛 SHA 태그 이미지를 고정 참조** → status Ready=False
  ("Image ... not found"). 이미지 필드는 본 작업에서 변경하지 않았으며 기존 상태.
- 따라서 read-only job 실행 검증은 수행 불가 (이미지 pull 단계에서 실패).
- o4o-api-migrations 는 Ready=True (유효 이미지 참조).

### 잔여 사항
- ~/.pgpass 의 o4o_api 항목은 이제 무효값. 정리 권장(본 작업에서 미변경).

## STEP 6 — ~/.pgpass 무효 항목 정리 : DONE
- 백업 1회: ~/.pgpass.bak-20260825 (원본 1행 보존, 값은 이미 무효)
- 삭제 대상 행 존재 확인 후 제거: `localhost:*:o4o_platform:o4o_api:<pw len=11>` 1건
- 파일 자체 유지, 권한 644 변경 없음 (전/후 동일)
- 새 o4o_api 비밀번호는 pgpass에 기록하지 않음
- 검증: o4o_api 잔존 항목 0 / 기타 host·user 항목 0 (원래 이 1행이 파일 전체였음)
- 이후 로컬 접근 경로: Cloud SQL Auth Proxy(ADC) + 필요 시 Secret Manager

## 최종 판정
CLOUDSQL_RUNTIME_SECRET_HARDENING = CLOSED

근거:
- Cloud SQL 공개 노출면 축소: authorizedNetworks 0건
- 전송 구간 암호화 강제: sslMode=ENCRYPTED_ONLY
- 프로덕션 무중단 확인: 변경 전후 health/read API 전량 200, 오류 로그 0건
- 런타임 평문 credential 잔존 0건 (7개 job literal → secretKeyRef 전환 완료)
- 무효화됐던 o4o_api 자격증명 복구 및 실측 AUTH_OK
- 로컬 무효 credential 정리 완료

## 이월 (별도 WO 필요)
WO-O4O-CLOUDRUN-JOB-IMAGE-REFERENCE-RECOVERY-AND-DEPLOYMENT-CONTRACT-V1
- 대상: drug·easy-drug 계열 7개 job (전부 status Ready=False)
- 증상: Artifact Registry에서 GC된 옛 SHA 태그 이미지를 고정 참조 ("Image ... not found")
- 범위: 현재 참조 SHA 목록화 / 레지스트리 실재 여부 / 마지막 정상 이미지·빌드 소스 추적 /
        재빌드 가능성 / SHA tag GC로 재발하지 않는 배포 계약 수립
- 성격: DB credential hardening 축과 무관한 배포 파이프라인 결함
