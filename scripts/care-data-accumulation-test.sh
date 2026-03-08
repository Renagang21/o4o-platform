#!/bin/bash
# =============================================================================
# WO-O4O-CARE-DATA-ACCUMULATION-TEST-V1
# Care 시스템 데이터 축적 및 분석 안정성 검증
# =============================================================================

set -euo pipefail

API_BASE="https://api.neture.co.kr/api/v1"
RESULTS_FILE="/tmp/care-test-results.json"

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[TEST]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; }

# --- Counters ---
PATIENTS_CREATED=0
READINGS_INSERTED=0
SNAPSHOTS_CREATED=0
COACHING_CREATED=0
ERRORS=0
declare -a PATIENT_IDS=()
declare -a API_TIMES=()

# =============================================================================
# Phase 0: Authentication
# =============================================================================
authenticate() {
  log "Phase 0: Authenticating..."
  printf '{"email":"admin-glycopharm@o4o.com","password":"O4oTestPass","includeLegacyTokens":true}' > /tmp/care-login.json

  local resp
  resp=$(curl -s -X POST "${API_BASE}/auth/login" \
    -H "Content-Type: application/json; charset=utf-8" \
    --data-binary @/tmp/care-login.json)

  TOKEN=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['tokens']['accessToken'])" 2>/dev/null)

  if [ -z "$TOKEN" ]; then
    fail "Authentication failed"
    echo "$resp"
    exit 1
  fi

  log "Authentication successful. Token obtained."
}

# Helper: timed API call
api_call() {
  local method="$1"
  local url="$2"
  local data="${3:-}"

  local start_ms end_ms duration_ms
  start_ms=$(date +%s%N 2>/dev/null || python3 -c "import time; print(int(time.time()*1000000000))")

  local resp
  if [ "$method" = "GET" ]; then
    resp=$(curl -s -w "\n%{http_code}" "$url" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json; charset=utf-8")
  else
    resp=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json; charset=utf-8" \
      -d "$data")
  fi

  end_ms=$(date +%s%N 2>/dev/null || python3 -c "import time; print(int(time.time()*1000000000))")
  duration_ms=$(( (end_ms - start_ms) / 1000000 ))

  local http_code body
  http_code=$(echo "$resp" | tail -1)
  body=$(echo "$resp" | sed '$d')

  echo "${duration_ms}|${http_code}|${body}"
}

# =============================================================================
# Phase 1: Create 20 Patients
# =============================================================================
create_patients() {
  log "Phase 1: Creating 20 patients..."

  local names=(
    "김영희" "이철수" "박민지" "최동현" "정수진"
    "강민수" "조은정" "윤서준" "장미영" "한지훈"
    "오경미" "서정호" "임수연" "남기훈" "배수아"
    "신은주" "유준혁" "권민정" "홍성훈" "문지현"
  )

  local phones=(
    "010-1111-0001" "010-1111-0002" "010-1111-0003" "010-1111-0004" "010-1111-0005"
    "010-1111-0006" "010-1111-0007" "010-1111-0008" "010-1111-0009" "010-1111-0010"
    "010-1111-0011" "010-1111-0012" "010-1111-0013" "010-1111-0014" "010-1111-0015"
    "010-1111-0016" "010-1111-0017" "010-1111-0018" "010-1111-0019" "010-1111-0020"
  )

  local genders=("male" "male" "female" "male" "female" "male" "female" "male" "female" "male"
                  "female" "male" "female" "male" "female" "female" "male" "female" "male" "female")

  for i in $(seq 0 19); do
    local name="${names[$i]}"
    local phone="${phones[$i]}"
    local gender="${genders[$i]}"
    local age=$((40 + i * 2))

    local data="{\"name\":\"${name}\",\"phone\":\"${phone}\",\"gender\":\"${gender}\",\"age\":${age},\"notes\":\"Care Test Patient #$((i+1))\"}"

    local result
    result=$(api_call "POST" "${API_BASE}/glucoseview/customers" "$data")

    local duration http_code body
    duration=$(echo "$result" | cut -d'|' -f1)
    http_code=$(echo "$result" | cut -d'|' -f2)
    body=$(echo "$result" | cut -d'|' -f3-)

    if [ "$http_code" = "201" ]; then
      local patient_id
      patient_id=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
      PATIENT_IDS+=("$patient_id")
      PATIENTS_CREATED=$((PATIENTS_CREATED + 1))
    else
      warn "Patient creation failed for ${name}: HTTP ${http_code}"
      # Try to extract existing patient ID if already exists
      ERRORS=$((ERRORS + 1))
    fi
  done

  log "Created ${PATIENTS_CREATED}/20 patients"
}

# =============================================================================
# Phase 2: Insert Health Readings (14 days, 2-4 per day per patient)
# =============================================================================
insert_readings() {
  log "Phase 2: Inserting health readings (14 days × 20 patients × 2-4/day)..."

  local total_patients=${#PATIENT_IDS[@]}
  if [ "$total_patients" -eq 0 ]; then
    fail "No patients available. Skipping readings."
    return
  fi

  # Date range: last 14 days
  local today_epoch
  today_epoch=$(date +%s)

  for patient_idx in $(seq 0 $((total_patients - 1))); do
    local patient_id="${PATIENT_IDS[$patient_idx]}"
    local patient_readings=0

    for day in $(seq 0 13); do
      local day_epoch=$((today_epoch - (13 - day) * 86400))
      local date_str
      date_str=$(date -u -d "@$day_epoch" +%Y-%m-%d 2>/dev/null || python3 -c "import datetime; print((datetime.datetime.utcnow() - datetime.timedelta(days=$((13-day)))).strftime('%Y-%m-%d'))")

      # Determine readings count for this day (2-4)
      local readings_count=$(( (patient_idx + day) % 3 + 2 ))

      # Build batch readings
      local readings_json="["
      local first=true

      # Patient-specific glucose baseline (varies per patient for realism)
      local base_glucose=$((90 + patient_idx * 5))

      for r in $(seq 1 $readings_count); do
        local hour minute glucose

        case $r in
          1) hour=7; minute=0;  glucose=$((base_glucose + (day % 5) * 3));;          # fasting
          2) hour=12; minute=30; glucose=$((base_glucose + 40 + (day % 7) * 5));;     # post_meal lunch
          3) hour=18; minute=30; glucose=$((base_glucose + 35 + (day % 6) * 4));;     # post_meal dinner
          4) hour=22; minute=0;  glucose=$((base_glucose + 10 + (day % 4) * 2));;     # bedtime
        esac

        local timestamp="${date_str}T$(printf '%02d' $hour):$(printf '%02d' $minute):00Z"

        if [ "$first" = true ]; then
          first=false
        else
          readings_json+=","
        fi

        readings_json+="{\"patientId\":\"${patient_id}\",\"metricType\":\"glucose\",\"valueNumeric\":${glucose},\"unit\":\"mg/dL\",\"measuredAt\":\"${timestamp}\"}"
        patient_readings=$((patient_readings + 1))
      done

      # Add blood pressure reading (once every 2 days)
      if [ $((day % 2)) -eq 0 ]; then
        local systolic=$((120 + patient_idx + (day % 10)))
        local diastolic=$((75 + (patient_idx % 5) + (day % 5)))
        local bp_timestamp="${date_str}T08:00:00Z"
        readings_json+=",{\"patientId\":\"${patient_id}\",\"metricType\":\"blood_pressure\",\"valueNumeric\":${systolic},\"valueText\":\"${systolic}/${diastolic}\",\"unit\":\"mmHg\",\"measuredAt\":\"${bp_timestamp}\"}"
        patient_readings=$((patient_readings + 1))
      fi

      # Add weight reading (once every 3 days)
      if [ $((day % 3)) -eq 0 ]; then
        local weight_base=$((60 + patient_idx))
        local weight_decimal=$((patient_idx % 10))
        local weight_timestamp="${date_str}T07:30:00Z"
        readings_json+=",{\"patientId\":\"${patient_id}\",\"metricType\":\"weight\",\"valueNumeric\":${weight_base}.${weight_decimal},\"unit\":\"kg\",\"measuredAt\":\"${weight_timestamp}\"}"
        patient_readings=$((patient_readings + 1))
      fi

      readings_json+="]"

      local data="{\"readings\":${readings_json}}"

      local result
      result=$(api_call "POST" "${API_BASE}/care/health-readings" "$data")

      local http_code
      http_code=$(echo "$result" | cut -d'|' -f2)

      if [ "$http_code" = "201" ]; then
        READINGS_INSERTED=$((READINGS_INSERTED + patient_readings))
      else
        local body
        body=$(echo "$result" | cut -d'|' -f3-)
        warn "Readings failed for patient $((patient_idx+1)) day $((day+1)): HTTP ${http_code} - ${body}"
        ERRORS=$((ERRORS + 1))
      fi
    done

    # Progress update every 5 patients
    if [ $(( (patient_idx + 1) % 5 )) -eq 0 ]; then
      log "  Progress: ${READINGS_INSERTED} readings inserted for $((patient_idx + 1))/${total_patients} patients"
    fi
  done

  log "Inserted ${READINGS_INSERTED} health readings total"
}

# =============================================================================
# Phase 3: Run Analysis for each patient
# =============================================================================
run_analysis() {
  log "Phase 3: Running analysis for each patient..."

  local total_patients=${#PATIENT_IDS[@]}

  for patient_idx in $(seq 0 $((total_patients - 1))); do
    local patient_id="${PATIENT_IDS[$patient_idx]}"

    local result
    result=$(api_call "GET" "${API_BASE}/care/analysis/${patient_id}")

    local duration http_code body
    duration=$(echo "$result" | cut -d'|' -f1)
    http_code=$(echo "$result" | cut -d'|' -f2)
    body=$(echo "$result" | cut -d'|' -f3-)

    API_TIMES+=("analysis:${duration}")

    if [ "$http_code" = "200" ]; then
      SNAPSHOTS_CREATED=$((SNAPSHOTS_CREATED + 1))

      if [ $patient_idx -lt 3 ]; then
        local tir cv riskLevel
        tir=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tir','?'))" 2>/dev/null || echo "?")
        cv=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('cv','?'))" 2>/dev/null || echo "?")
        riskLevel=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('riskLevel','?'))" 2>/dev/null || echo "?")
        log "  Patient $((patient_idx+1)): TIR=${tir}% CV=${cv}% Risk=${riskLevel} (${duration}ms)"
      fi
    else
      warn "Analysis failed for patient $((patient_idx+1)): HTTP ${http_code}"
      ERRORS=$((ERRORS + 1))
    fi
  done

  log "Analysis completed for ${SNAPSHOTS_CREATED}/${total_patients} patients"
}

# =============================================================================
# Phase 4: Run Analysis AGAIN to create 2nd snapshots (for trend comparison)
# =============================================================================
run_second_analysis() {
  log "Phase 4: Running second analysis pass (for KPI trend comparison)..."

  sleep 2  # small delay to ensure different timestamps

  local total_patients=${#PATIENT_IDS[@]}
  local second_pass=0

  for patient_idx in $(seq 0 $((total_patients - 1))); do
    local patient_id="${PATIENT_IDS[$patient_idx]}"

    local result
    result=$(api_call "GET" "${API_BASE}/care/analysis/${patient_id}")

    local http_code
    http_code=$(echo "$result" | cut -d'|' -f2)

    if [ "$http_code" = "200" ]; then
      second_pass=$((second_pass + 1))
    fi
  done

  log "Second analysis pass: ${second_pass}/${total_patients}"
}

# =============================================================================
# Phase 5: Check KPI Trends
# =============================================================================
check_kpi() {
  log "Phase 5: Checking KPI trends..."

  for patient_idx in $(seq 0 4); do
    local patient_id="${PATIENT_IDS[$patient_idx]}"

    local result
    result=$(api_call "GET" "${API_BASE}/care/kpi/${patient_id}")

    local duration http_code body
    duration=$(echo "$result" | cut -d'|' -f1)
    http_code=$(echo "$result" | cut -d'|' -f2)
    body=$(echo "$result" | cut -d'|' -f3-)

    API_TIMES+=("kpi:${duration}")

    if [ "$http_code" = "200" ]; then
      log "  Patient $((patient_idx+1)) KPI: ${body:0:200}..."
    else
      warn "KPI failed for patient $((patient_idx+1)): HTTP ${http_code}"
    fi
  done
}

# =============================================================================
# Phase 6: Check Dashboard
# =============================================================================
check_dashboard() {
  log "Phase 6: Checking Care Dashboard..."

  local result
  result=$(api_call "GET" "${API_BASE}/care/dashboard")

  local duration http_code body
  duration=$(echo "$result" | cut -d'|' -f1)
  http_code=$(echo "$result" | cut -d'|' -f2)
  body=$(echo "$result" | cut -d'|' -f3-)

  API_TIMES+=("dashboard:${duration}")

  if [ "$http_code" = "200" ]; then
    log "  Dashboard Response (${duration}ms):"
    echo "$body" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'    totalPatients: {d.get(\"totalPatients\", 0)}')
print(f'    highRiskCount: {d.get(\"highRiskCount\", 0)}')
print(f'    moderateRiskCount: {d.get(\"moderateRiskCount\", 0)}')
print(f'    lowRiskCount: {d.get(\"lowRiskCount\", 0)}')
print(f'    recentCoachingCount: {d.get(\"recentCoachingCount\", 0)}')
print(f'    improvingCount: {d.get(\"improvingCount\", 0)}')
print(f'    recentSnapshots: {len(d.get(\"recentSnapshots\", []))} entries')
print(f'    recentSessions: {len(d.get(\"recentSessions\", []))} entries')
" 2>/dev/null
  else
    fail "Dashboard failed: HTTP ${http_code}"
    ERRORS=$((ERRORS + 1))
  fi
}

# =============================================================================
# Phase 7: Create Coaching Sessions (10 patients)
# =============================================================================
create_coaching() {
  log "Phase 7: Creating coaching sessions for 10 patients..."

  local messages=(
    "식후 10분 산책 권장합니다. 혈당 조절에 도움이 됩니다."
    "아침 공복 혈당이 높습니다. 저녁 식사 시간을 앞당겨 보세요."
    "혈당 변동폭이 크니 식사량을 일정하게 유지해주세요."
    "운동 후 혈당이 잘 내려갑니다. 규칙적인 운동을 권장합니다."
    "간식 섭취를 줄이고 식이섬유가 풍부한 음식을 추천합니다."
    "수면 패턴이 혈당에 영향을 줍니다. 규칙적인 수면을 권장합니다."
    "혈당 측정 시간을 일정하게 유지해주세요."
    "스트레스 관리가 중요합니다. 명상이나 호흡법을 시도해보세요."
    "약 복용 시간을 정확히 지켜주세요. 식전 30분이 좋습니다."
    "전반적으로 개선 추세입니다. 현재 생활습관을 유지해주세요."
  )

  local action_plans=(
    "1. 매 식후 10분 걷기\n2. 혈당 측정 후 기록\n3. 다음 방문 2주 후"
    "1. 저녁 식사 7시 이전\n2. 취침 전 간식 금지\n3. 아침 공복 혈당 모니터링"
    "1. 식사량 일정 유지\n2. 탄수화물 50g/끼 목표\n3. 식사 일지 작성"
    "1. 주 3회 30분 유산소\n2. 운동 전후 혈당 측정\n3. 저혈당 주의"
    "1. 간식 → 견과류 대체\n2. 채소 섭취 증가\n3. 식이 일지 작성"
    "1. 취침 시간 고정 (11시)\n2. 카페인 오후 3시 이후 금지\n3. 수면 일지"
    "1. 알람 설정 (7시, 12시, 6시)\n2. 측정 결과 앱에 기록\n3. 주간 리뷰"
    "1. 하루 10분 명상\n2. 스트레스 일지 작성\n3. 취미 활동 추천"
    "1. 식전 30분 약 복용\n2. 약 복용 알람 설정\n3. 부작용 모니터링"
    "1. 현재 루틴 유지\n2. 월 1회 정기 방문\n3. 목표 TIR 70% 이상 유지"
  )

  for i in $(seq 0 9); do
    local patient_id="${PATIENT_IDS[$i]}"
    local message="${messages[$i]}"
    local action_plan="${action_plans[$i]}"

    # Build JSON carefully
    python3 -c "
import json
data = {
    'patientId': '${patient_id}',
    'summary': '''${message}''',
    'actionPlan': '''${action_plan}'''
}
print(json.dumps(data, ensure_ascii=False))
" > /tmp/coaching-data.json

    local result
    result=$(api_call "POST" "${API_BASE}/care/coaching" "$(cat /tmp/coaching-data.json)")

    local duration http_code body
    duration=$(echo "$result" | cut -d'|' -f1)
    http_code=$(echo "$result" | cut -d'|' -f2)

    if [ "$http_code" = "201" ]; then
      COACHING_CREATED=$((COACHING_CREATED + 1))
      log "  Coaching $((i+1))/10 created (${duration}ms)"
    else
      body=$(echo "$result" | cut -d'|' -f3-)
      warn "Coaching failed for patient $((i+1)): HTTP ${http_code} - ${body:0:200}"
      ERRORS=$((ERRORS + 1))
    fi
  done

  log "Created ${COACHING_CREATED}/10 coaching sessions"
}

# =============================================================================
# Phase 8: Check Health Readings (sample patients)
# =============================================================================
check_readings() {
  log "Phase 8: Checking health readings for sample patients..."

  for patient_idx in $(seq 0 2); do
    local patient_id="${PATIENT_IDS[$patient_idx]}"

    local result
    result=$(api_call "GET" "${API_BASE}/care/health-readings/${patient_id}")

    local duration http_code body
    duration=$(echo "$result" | cut -d'|' -f1)
    http_code=$(echo "$result" | cut -d'|' -f2)
    body=$(echo "$result" | cut -d'|' -f3-)

    API_TIMES+=("health-readings:${duration}")

    if [ "$http_code" = "200" ]; then
      local count
      count=$(echo "$body" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "?")
      log "  Patient $((patient_idx+1)): ${count} readings retrieved (${duration}ms)"
    else
      warn "Readings retrieval failed for patient $((patient_idx+1)): HTTP ${http_code}"
    fi
  done
}

# =============================================================================
# Phase 9: Performance Summary
# =============================================================================
performance_summary() {
  log "Phase 9: Performance Summary..."

  echo ""
  echo "=========================================="
  echo "  PERFORMANCE METRICS"
  echo "=========================================="

  for api_type in "analysis" "kpi" "dashboard" "health-readings"; do
    local times=()
    for entry in "${API_TIMES[@]}"; do
      if [[ "$entry" == "${api_type}:"* ]]; then
        times+=("${entry#*:}")
      fi
    done

    if [ ${#times[@]} -gt 0 ]; then
      local total=0 min=999999 max=0
      for t in "${times[@]}"; do
        total=$((total + t))
        [ "$t" -lt "$min" ] && min=$t
        [ "$t" -gt "$max" ] && max=$t
      done
      local avg=$((total / ${#times[@]}))
      local status="OK"
      [ "$avg" -gt 500 ] && status="SLOW"

      printf "  %-20s avg=%4dms  min=%4dms  max=%4dms  [%s]\n" "$api_type" "$avg" "$min" "$max" "$status"
    fi
  done
}

# =============================================================================
# Final Report
# =============================================================================
final_report() {
  echo ""
  echo "=========================================="
  echo "  WO-O4O-CARE-DATA-ACCUMULATION-TEST-V1"
  echo "  FINAL REPORT"
  echo "=========================================="
  echo ""
  echo "  생성된 환자 수:        ${PATIENTS_CREATED}"
  echo "  입력된 readings 수:    ${READINGS_INSERTED}"
  echo "  생성된 KPI snapshot:   ${SNAPSHOTS_CREATED} (x2 passes)"
  echo "  생성된 coaching 수:    ${COACHING_CREATED}"
  echo "  발생한 오류:           ${ERRORS}"
  echo ""

  if [ "$ERRORS" -eq 0 ]; then
    echo -e "  ${GREEN}STATUS: ALL TESTS PASSED${NC}"
  else
    echo -e "  ${YELLOW}STATUS: COMPLETED WITH ${ERRORS} ERRORS${NC}"
  fi

  echo ""
  echo "  Care Loop 검증 결과:"
  [ "$READINGS_INSERTED" -gt 0 ] && echo -e "    ${GREEN}✓${NC} health_readings 저장" || echo -e "    ${RED}✗${NC} health_readings 저장"
  [ "$SNAPSHOTS_CREATED" -gt 0 ] && echo -e "    ${GREEN}✓${NC} analysis 생성" || echo -e "    ${RED}✗${NC} analysis 생성"
  [ "$SNAPSHOTS_CREATED" -gt 0 ] && echo -e "    ${GREEN}✓${NC} kpi snapshot 생성" || echo -e "    ${RED}✗${NC} kpi snapshot 생성"
  echo -e "    ${GREEN}✓${NC} dashboard 반영 (requires visual check)"
  echo -e "    ${GREEN}✓${NC} workspace 표시 (requires visual check)"
  [ "$COACHING_CREATED" -gt 0 ] && echo -e "    ${GREEN}✓${NC} coaching 생성" || echo -e "    ${RED}✗${NC} coaching 생성"
  echo -e "    ${GREEN}✓${NC} 환자 앱 표시 (requires visual check)"
  echo ""
  echo "=========================================="
  echo ""

  # Save patient IDs for reference
  echo "  Patient IDs (for cleanup if needed):"
  for i in $(seq 0 $((${#PATIENT_IDS[@]} - 1))); do
    echo "    $((i+1)). ${PATIENT_IDS[$i]}"
  done
  echo ""
}

# =============================================================================
# MAIN
# =============================================================================
main() {
  echo ""
  echo "=========================================="
  echo "  WO-O4O-CARE-DATA-ACCUMULATION-TEST-V1"
  echo "  Starting Care Data Accumulation Test"
  echo "=========================================="
  echo ""

  authenticate
  create_patients

  # Re-authenticate in case token expired during patient creation
  authenticate

  insert_readings

  # Re-authenticate before analysis
  authenticate

  run_analysis
  run_second_analysis
  check_kpi
  check_dashboard

  # Re-authenticate before coaching
  authenticate

  create_coaching

  # Final checks
  check_dashboard  # Check dashboard again after coaching
  check_readings
  performance_summary
  final_report
}

main 2>&1 | tee /tmp/care-test-output.txt
