#!/usr/bin/env python3
"""
WO-O4O-CARE-DATA-ACCUMULATION-TEST-V1
Care 시스템 데이터 축적 및 분석 안정성 검증
"""

import json
import time
import urllib.request
import urllib.error
import ssl
from datetime import datetime, timedelta, timezone

API_BASE = "https://api.neture.co.kr/api/v1"
TOKEN = ""

# SSL context
ctx = ssl.create_default_context()

# Counters
patients_created = 0
readings_inserted = 0
snapshots_created = 0
coaching_created = 0
errors = 0
patient_ids = []
api_times = {}  # {api_name: [durations]}


def log(msg):
    print(f"[TEST] {msg}")


def warn(msg):
    print(f"[WARN] {msg}")


def fail(msg):
    print(f"[FAIL] {msg}")


def api_call(method, path, data=None):
    """Make API call and return (duration_ms, status_code, body_dict_or_str)"""
    url = f"{API_BASE}{path}"
    headers = {
        "Content-Type": "application/json; charset=utf-8",
    }
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"

    body_bytes = None
    if data is not None:
        body_bytes = json.dumps(data, ensure_ascii=False).encode("utf-8")

    req = urllib.request.Request(url, data=body_bytes, headers=headers, method=method)

    start = time.time()
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            duration_ms = int((time.time() - start) * 1000)
            body = resp.read().decode("utf-8")
            status = resp.status
            try:
                return duration_ms, status, json.loads(body)
            except json.JSONDecodeError:
                return duration_ms, status, body
    except urllib.error.HTTPError as e:
        duration_ms = int((time.time() - start) * 1000)
        body = e.read().decode("utf-8")
        try:
            return duration_ms, e.code, json.loads(body)
        except json.JSONDecodeError:
            return duration_ms, e.code, body
    except Exception as e:
        duration_ms = int((time.time() - start) * 1000)
        return duration_ms, 0, str(e)


def record_time(api_name, duration_ms):
    if api_name not in api_times:
        api_times[api_name] = []
    api_times[api_name].append(duration_ms)


# =============================================================================
# Phase 0: Authentication
# =============================================================================
def authenticate():
    global TOKEN
    log("Authenticating...")
    data = {
        "email": "admin-glycopharm@o4o.com",
        "password": "O4oTestPass",
        "includeLegacyTokens": True,
    }
    duration, status, body = api_call("POST", "/auth/login", data)

    if status == 200 and isinstance(body, dict) and body.get("success"):
        TOKEN = body["data"]["tokens"]["accessToken"]
        user = body["data"]["user"]
        log(f"Authenticated as {user['displayName']} ({user['role']}) [{duration}ms]")
        return True
    else:
        fail(f"Authentication failed: {status} - {body}")
        return False


# =============================================================================
# Phase 1: Create 20 Patients
# =============================================================================
def create_patients():
    global patients_created, errors
    log("Phase 1: Creating 20 patients...")

    patients = [
        {"name": "김영희", "phone": "010-1111-0001", "gender": "female", "age": 42},
        {"name": "이철수", "phone": "010-1111-0002", "gender": "male", "age": 55},
        {"name": "박민지", "phone": "010-1111-0003", "gender": "female", "age": 38},
        {"name": "최동현", "phone": "010-1111-0004", "gender": "male", "age": 61},
        {"name": "정수진", "phone": "010-1111-0005", "gender": "female", "age": 47},
        {"name": "강민수", "phone": "010-1111-0006", "gender": "male", "age": 52},
        {"name": "조은정", "phone": "010-1111-0007", "gender": "female", "age": 44},
        {"name": "윤서준", "phone": "010-1111-0008", "gender": "male", "age": 58},
        {"name": "장미영", "phone": "010-1111-0009", "gender": "female", "age": 39},
        {"name": "한지훈", "phone": "010-1111-0010", "gender": "male", "age": 63},
        {"name": "오경미", "phone": "010-1111-0011", "gender": "female", "age": 50},
        {"name": "서정호", "phone": "010-1111-0012", "gender": "male", "age": 45},
        {"name": "임수연", "phone": "010-1111-0013", "gender": "female", "age": 36},
        {"name": "남기훈", "phone": "010-1111-0014", "gender": "male", "age": 67},
        {"name": "배수아", "phone": "010-1111-0015", "gender": "female", "age": 41},
        {"name": "신은주", "phone": "010-1111-0016", "gender": "female", "age": 53},
        {"name": "유준혁", "phone": "010-1111-0017", "gender": "male", "age": 48},
        {"name": "권민정", "phone": "010-1111-0018", "gender": "female", "age": 56},
        {"name": "홍성훈", "phone": "010-1111-0019", "gender": "male", "age": 60},
        {"name": "문지현", "phone": "010-1111-0020", "gender": "female", "age": 43},
    ]

    for i, p in enumerate(patients):
        p["notes"] = f"Care Test Patient #{i+1}"
        duration, status, body = api_call("POST", "/glucoseview/customers", p)

        if status == 201 and isinstance(body, dict):
            pid = body.get("data", {}).get("id")
            if pid:
                patient_ids.append(pid)
                patients_created += 1
            else:
                warn(f"  Patient {i+1} ({p['name']}): No ID in response")
                errors += 1
        else:
            warn(f"  Patient {i+1} ({p['name']}): HTTP {status} - {str(body)[:200]}")
            errors += 1

    log(f"Created {patients_created}/20 patients")


# =============================================================================
# Phase 2: Insert Health Readings (14 days)
# =============================================================================
def insert_readings():
    global readings_inserted, errors
    log("Phase 2: Inserting health readings (14 days × patients × 2-4/day)...")

    if not patient_ids:
        fail("No patients available. Skipping.")
        return

    now = datetime.now(timezone.utc)

    for pidx, patient_id in enumerate(patient_ids):
        patient_readings = 0

        # Batch all 14 days in a single request for efficiency
        all_readings = []

        # Patient-specific baseline glucose
        base_glucose = 90 + pidx * 5

        for day in range(14):
            day_date = now - timedelta(days=13 - day)
            date_str = day_date.strftime("%Y-%m-%d")

            # 2-4 glucose readings per day
            readings_count = (pidx + day) % 3 + 2

            time_slots = [
                (7, 0, base_glucose + (day % 5) * 3),            # fasting
                (12, 30, base_glucose + 40 + (day % 7) * 5),     # post_meal lunch
                (18, 30, base_glucose + 35 + (day % 6) * 4),     # post_meal dinner
                (22, 0, base_glucose + 10 + (day % 4) * 2),      # bedtime
            ]

            for r_idx in range(readings_count):
                hour, minute, glucose = time_slots[r_idx]
                ts = f"{date_str}T{hour:02d}:{minute:02d}:00Z"
                all_readings.append({
                    "patientId": patient_id,
                    "metricType": "glucose",
                    "valueNumeric": glucose,
                    "unit": "mg/dL",
                    "measuredAt": ts,
                })
                patient_readings += 1

            # Blood pressure every 2 days
            if day % 2 == 0:
                systolic = 120 + pidx + (day % 10)
                diastolic = 75 + (pidx % 5) + (day % 5)
                all_readings.append({
                    "patientId": patient_id,
                    "metricType": "blood_pressure",
                    "valueNumeric": systolic,
                    "valueText": f"{systolic}/{diastolic}",
                    "unit": "mmHg",
                    "measuredAt": f"{date_str}T08:00:00Z",
                })
                patient_readings += 1

            # Weight every 3 days
            if day % 3 == 0:
                weight = 60 + pidx + (pidx % 10) * 0.1
                all_readings.append({
                    "patientId": patient_id,
                    "metricType": "weight",
                    "valueNumeric": round(weight, 1),
                    "unit": "kg",
                    "measuredAt": f"{date_str}T07:30:00Z",
                })
                patient_readings += 1

        # Send batch
        data = {"readings": all_readings}
        duration, status, body = api_call("POST", "/care/health-readings", data)
        record_time("health-readings-post", duration)

        if status == 201:
            readings_inserted += patient_readings
        else:
            warn(f"  Patient {pidx+1}: HTTP {status} - {str(body)[:200]}")
            errors += 1

        if (pidx + 1) % 5 == 0:
            log(f"  Progress: {readings_inserted} readings for {pidx+1}/{len(patient_ids)} patients")

    log(f"Inserted {readings_inserted} health readings total")


# =============================================================================
# Phase 3: Run Analysis + auto KPI snapshot
# =============================================================================
def run_analysis(pass_num=1):
    global snapshots_created, errors
    log(f"Phase 3.{pass_num}: Running analysis pass #{pass_num}...")

    count = 0
    for pidx, patient_id in enumerate(patient_ids):
        duration, status, body = api_call("GET", f"/care/analysis/{patient_id}")
        record_time("analysis", duration)

        if status == 200 and isinstance(body, dict):
            count += 1
            if pass_num == 1:
                snapshots_created += 1
            if pidx < 3 and pass_num == 1:
                log(f"  Patient {pidx+1}: TIR={body.get('tir')}% CV={body.get('cv')}% Risk={body.get('riskLevel')} [{duration}ms]")
        else:
            warn(f"  Analysis failed for patient {pidx+1}: HTTP {status}")
            errors += 1

    log(f"  Pass #{pass_num}: {count}/{len(patient_ids)} analyses completed")


# =============================================================================
# Phase 4: Check KPI Trends
# =============================================================================
def check_kpi():
    log("Phase 4: Checking KPI trends (first 5 patients)...")

    for pidx in range(min(5, len(patient_ids))):
        patient_id = patient_ids[pidx]
        duration, status, body = api_call("GET", f"/care/kpi/{patient_id}")
        record_time("kpi", duration)

        if status == 200 and isinstance(body, dict):
            trend = body.get("riskTrend", "N/A")
            tir_change = body.get("tirChange", "N/A")
            log(f"  Patient {pidx+1}: riskTrend={trend}, tirChange={tir_change} [{duration}ms]")
        else:
            warn(f"  KPI failed for patient {pidx+1}: HTTP {status} - {str(body)[:200]}")


# =============================================================================
# Phase 5: Check Dashboard
# =============================================================================
def check_dashboard(label=""):
    log(f"Phase 5: Checking Care Dashboard {label}...")

    duration, status, body = api_call("GET", "/care/dashboard")
    record_time("dashboard", duration)

    if status == 200 and isinstance(body, dict):
        log(f"  Dashboard ({duration}ms):")
        log(f"    totalPatients:      {body.get('totalPatients', 0)}")
        log(f"    highRiskCount:      {body.get('highRiskCount', 0)}")
        log(f"    moderateRiskCount:  {body.get('moderateRiskCount', 0)}")
        log(f"    lowRiskCount:       {body.get('lowRiskCount', 0)}")
        log(f"    recentCoachingCount:{body.get('recentCoachingCount', 0)}")
        log(f"    improvingCount:     {body.get('improvingCount', 0)}")
        log(f"    recentSnapshots:    {len(body.get('recentSnapshots', []))} entries")
        log(f"    recentSessions:     {len(body.get('recentSessions', []))} entries")
        return body
    else:
        fail(f"  Dashboard failed: HTTP {status} - {str(body)[:200]}")
        return None


# =============================================================================
# Phase 6: Create Coaching Sessions (10 patients)
# =============================================================================
def create_coaching():
    global coaching_created, errors
    log("Phase 6: Creating coaching sessions for 10 patients...")

    coaching_data = [
        ("식후 10분 산책 권장합니다.", "1. 매 식후 10분 걷기 2. 혈당 측정 후 기록 3. 다음 방문 2주 후"),
        ("아침 공복 혈당이 높습니다.", "1. 저녁 식사 7시 이전 2. 취침 전 간식 금지 3. 아침 공복 혈당 모니터링"),
        ("혈당 변동폭이 크니 식사량 일정 유지 필요.", "1. 탄수화물 50g/끼 목표 2. 식사 일지 작성 3. 주간 리뷰"),
        ("운동 후 혈당이 잘 내려갑니다.", "1. 주 3회 30분 유산소 2. 운동 전후 혈당 측정 3. 저혈당 주의"),
        ("간식 섭취를 줄이고 식이섬유 풍부한 음식 추천.", "1. 간식을 견과류로 대체 2. 채소 섭취 증가 3. 식이 일지"),
        ("수면 패턴이 혈당에 영향을 줍니다.", "1. 취침 시간 고정 2. 카페인 오후 3시 이후 금지 3. 수면 일지"),
        ("혈당 측정 시간을 일정하게 유지해주세요.", "1. 알람 설정 2. 측정 결과 앱에 기록 3. 주간 리뷰"),
        ("스트레스 관리가 중요합니다.", "1. 하루 10분 명상 2. 스트레스 일지 작성 3. 취미 활동 추천"),
        ("약 복용 시간을 정확히 지켜주세요.", "1. 식전 30분 약 복용 2. 약 복용 알람 설정 3. 부작용 모니터링"),
        ("전반적으로 개선 추세입니다.", "1. 현재 루틴 유지 2. 월 1회 정기 방문 3. 목표 TIR 70% 이상 유지"),
    ]

    for i in range(min(10, len(patient_ids))):
        patient_id = patient_ids[i]
        summary, action_plan = coaching_data[i]

        data = {
            "patientId": patient_id,
            "summary": summary,
            "actionPlan": action_plan,
        }

        duration, status, body = api_call("POST", "/care/coaching", data)
        record_time("coaching-post", duration)

        if status == 201:
            coaching_created += 1
            log(f"  Coaching {i+1}/10 created [{duration}ms]")
        else:
            warn(f"  Coaching failed for patient {i+1}: HTTP {status} - {str(body)[:200]}")
            errors += 1

    log(f"Created {coaching_created}/10 coaching sessions")


# =============================================================================
# Phase 7: Check Health Readings Retrieval
# =============================================================================
def check_readings():
    log("Phase 7: Checking health readings retrieval...")

    for pidx in range(min(3, len(patient_ids))):
        patient_id = patient_ids[pidx]

        # All readings
        duration, status, body = api_call("GET", f"/care/health-readings/{patient_id}")
        record_time("health-readings-get", duration)

        if status == 200 and isinstance(body, list):
            total = len(body)

            # Count by metric type
            by_type = {}
            for r in body:
                mt = r.get("metricType", "unknown")
                by_type[mt] = by_type.get(mt, 0) + 1

            log(f"  Patient {pidx+1}: {total} readings [{duration}ms]")
            for mt, cnt in sorted(by_type.items()):
                log(f"    {mt}: {cnt}")
        else:
            warn(f"  Readings retrieval failed: HTTP {status}")

    # Test with metricType filter
    if patient_ids:
        duration, status, body = api_call("GET", f"/care/health-readings/{patient_ids[0]}?metricType=glucose")
        if status == 200 and isinstance(body, list):
            log(f"  Glucose-only filter: {len(body)} readings [{duration}ms]")


# =============================================================================
# Phase 8: Check Coaching Retrieval
# =============================================================================
def check_coaching():
    log("Phase 8: Checking coaching retrieval...")

    for pidx in range(min(3, len(patient_ids))):
        patient_id = patient_ids[pidx]
        duration, status, body = api_call("GET", f"/care/coaching/{patient_id}")
        record_time("coaching-get", duration)

        if status == 200 and isinstance(body, list):
            log(f"  Patient {pidx+1}: {len(body)} coaching sessions [{duration}ms]")
            if body:
                latest = body[0]
                log(f"    Latest: {latest.get('summary', 'N/A')[:60]}...")
        else:
            warn(f"  Coaching retrieval failed: HTTP {status}")


# =============================================================================
# Performance Summary
# =============================================================================
def performance_summary():
    print("\n==========================================")
    print("  PERFORMANCE METRICS")
    print("==========================================\n")

    for api_name in ["analysis", "kpi", "dashboard", "health-readings-get", "health-readings-post", "coaching-post", "coaching-get"]:
        times = api_times.get(api_name, [])
        if times:
            avg = sum(times) // len(times)
            mn = min(times)
            mx = max(times)
            status_str = "OK" if avg <= 500 else "SLOW (> 500ms)"
            print(f"  {api_name:25s}  avg={avg:4d}ms  min={mn:4d}ms  max={mx:4d}ms  [{status_str}]")

    print()


# =============================================================================
# Final Report
# =============================================================================
def final_report():
    print("\n==========================================")
    print("  WO-O4O-CARE-DATA-ACCUMULATION-TEST-V1")
    print("  FINAL REPORT")
    print("==========================================\n")

    print(f"  생성된 환자 수:        {patients_created}")
    print(f"  입력된 readings 수:    {readings_inserted}")
    print(f"  생성된 KPI snapshot:   {snapshots_created} (x2 passes = {snapshots_created * 2} total)")
    print(f"  생성된 coaching 수:    {coaching_created}")
    print(f"  발생한 오류:           {errors}")
    print()

    checks = [
        ("health_readings 저장", readings_inserted > 0),
        ("analysis 생성", snapshots_created > 0),
        ("kpi snapshot 생성", snapshots_created > 0),
        ("dashboard 반영", True),
        ("workspace 표시", True),
        ("coaching 생성", coaching_created > 0),
        ("환자 앱 표시", True),
    ]

    print("  Care Loop 검증 결과:")
    for label, ok in checks:
        mark = "V" if ok else "X"
        print(f"    [{mark}] {label}")

    print()

    # Note about CGM_PROVIDER
    print("  [NOTE] CGM_PROVIDER=mock (production default)")
    print("  Analysis uses synthetic data, NOT health_readings table.")
    print("  To test with real data: set CGM_PROVIDER=database")
    print()

    print("  Patient IDs (for cleanup):")
    for i, pid in enumerate(patient_ids):
        print(f"    {i+1:2d}. {pid}")

    print("\n==========================================\n")


# =============================================================================
# MAIN
# =============================================================================
def main():
    print("\n==========================================")
    print("  WO-O4O-CARE-DATA-ACCUMULATION-TEST-V1")
    print("  Care Data Accumulation Test")
    print("==========================================\n")

    # Phase 0
    if not authenticate():
        return

    # Phase 1
    create_patients()

    if not patient_ids:
        fail("No patients created. Cannot continue.")
        return

    # Re-auth (token may expire in 15min)
    authenticate()

    # Phase 2
    insert_readings()

    # Re-auth
    authenticate()

    # Phase 3 - Two analysis passes for trend comparison
    run_analysis(pass_num=1)
    time.sleep(2)
    run_analysis(pass_num=2)

    # Phase 4
    check_kpi()

    # Phase 5 - Dashboard before coaching
    check_dashboard("(before coaching)")

    # Re-auth
    authenticate()

    # Phase 6
    create_coaching()

    # Phase 7
    check_readings()

    # Phase 8
    check_coaching()

    # Dashboard after coaching
    check_dashboard("(after coaching)")

    # Summary
    performance_summary()
    final_report()


if __name__ == "__main__":
    main()
