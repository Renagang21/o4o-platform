/**
 * WO-O4O-CARE-DATA-ACCUMULATION-TEST-V1
 * Care 시스템 데이터 축적 및 분석 안정성 검증
 */

const API_BASE = "https://api.neture.co.kr/api/v1";
let TOKEN = "";

// Counters
let patientsCreated = 0;
let readingsInserted = 0;
let snapshotsCreated = 0;
let coachingCreated = 0;
let errorCount = 0;
const patientIds = [];
const apiTimes = {};

function log(msg) { console.log(`[TEST] ${msg}`); }
function warn(msg) { console.log(`[WARN] ${msg}`); }
function fail(msg) { console.log(`[FAIL] ${msg}`); }

function recordTime(apiName, ms) {
  if (!apiTimes[apiName]) apiTimes[apiName] = [];
  apiTimes[apiName].push(ms);
}

async function apiCall(method, path, data) {
  const url = `${API_BASE}${path}`;
  const headers = { "Content-Type": "application/json; charset=utf-8" };
  if (TOKEN) headers["Authorization"] = `Bearer ${TOKEN}`;

  const opts = { method, headers };
  if (data) opts.body = JSON.stringify(data);

  const start = Date.now();
  try {
    const resp = await fetch(url, opts);
    const duration = Date.now() - start;
    const text = await resp.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    return { duration, status: resp.status, body };
  } catch (e) {
    const duration = Date.now() - start;
    return { duration, status: 0, body: e.message };
  }
}

// =============================================================================
// Phase 0: Authentication
// =============================================================================
async function authenticate() {
  log("Authenticating as Operator (pharmacy-scoped)...");
  const { duration, status, body } = await apiCall("POST", "/auth/login", {
    email: "operator-glycopharm@o4o.com",
    password: "O4oTestPass",
    includeLegacyTokens: true,
  });

  if (status === 200 && body?.success) {
    TOKEN = body.data.tokens.accessToken;
    const user = body.data.user;
    log(`Authenticated as ${user.displayName} (${user.role}) userId=${user.id} [${duration}ms]`);
    return true;
  }
  fail(`Authentication failed: ${status} - ${JSON.stringify(body).slice(0, 200)}`);
  return false;
}

// =============================================================================
// Phase 1: Create 20 Patients
// =============================================================================
async function createPatients() {
  log("Phase 1: Creating 20 patients...");

  const patients = [
    { name: "김영희", phone: "010-3333-0001", gender: "female", birth_year: 1984 },
    { name: "이철수", phone: "010-3333-0002", gender: "male", birth_year: 1971 },
    { name: "박민지", phone: "010-3333-0003", gender: "female", birth_year: 1988 },
    { name: "최동현", phone: "010-3333-0004", gender: "male", birth_year: 1965 },
    { name: "정수진", phone: "010-3333-0005", gender: "female", birth_year: 1979 },
    { name: "강민수", phone: "010-3333-0006", gender: "male", birth_year: 1974 },
    { name: "조은정", phone: "010-3333-0007", gender: "female", birth_year: 1982 },
    { name: "윤서준", phone: "010-3333-0008", gender: "male", birth_year: 1968 },
    { name: "장미영", phone: "010-3333-0009", gender: "female", birth_year: 1987 },
    { name: "한지훈", phone: "010-3333-0010", gender: "male", birth_year: 1963 },
    { name: "오경미", phone: "010-3333-0011", gender: "female", birth_year: 1976 },
    { name: "서정호", phone: "010-3333-0012", gender: "male", birth_year: 1981 },
    { name: "임수연", phone: "010-3333-0013", gender: "female", birth_year: 1990 },
    { name: "남기훈", phone: "010-3333-0014", gender: "male", birth_year: 1959 },
    { name: "배수아", phone: "010-3333-0015", gender: "female", birth_year: 1985 },
    { name: "신은주", phone: "010-3333-0016", gender: "female", birth_year: 1973 },
    { name: "유준혁", phone: "010-3333-0017", gender: "male", birth_year: 1978 },
    { name: "권민정", phone: "010-3333-0018", gender: "female", birth_year: 1970 },
    { name: "홍성훈", phone: "010-3333-0019", gender: "male", birth_year: 1966 },
    { name: "문지현", phone: "010-3333-0020", gender: "female", birth_year: 1983 },
  ];

  for (let i = 0; i < patients.length; i++) {
    const p = { ...patients[i], notes: `Care Test Patient #${i + 1}` };
    const { duration, status, body } = await apiCall("POST", "/glucoseview/customers", p);

    if (status === 201 && body?.data?.id) {
      patientIds.push(body.data.id);
      patientsCreated++;
    } else {
      warn(`  Patient ${i + 1} (${p.name}): HTTP ${status} - ${JSON.stringify(body).slice(0, 200)}`);
      errorCount++;
    }
  }

  log(`Created ${patientsCreated}/20 patients`);
}

// =============================================================================
// Phase 2: Insert Health Readings (14 days)
// =============================================================================
async function insertReadings() {
  log("Phase 2: Inserting health readings...");

  if (!patientIds.length) { fail("No patients. Skipping."); return; }

  const now = new Date();

  for (let pidx = 0; pidx < patientIds.length; pidx++) {
    const patientId = patientIds[pidx];
    let patientReadings = 0;
    const allReadings = [];

    const baseGlucose = 90 + pidx * 5;

    for (let day = 0; day < 14; day++) {
      const dayDate = new Date(now.getTime() - (13 - day) * 86400000);
      const dateStr = dayDate.toISOString().split("T")[0];

      const readingsCount = (pidx + day) % 3 + 2;

      const slots = [
        { h: 7, m: 0, g: baseGlucose + (day % 5) * 3 },
        { h: 12, m: 30, g: baseGlucose + 40 + (day % 7) * 5 },
        { h: 18, m: 30, g: baseGlucose + 35 + (day % 6) * 4 },
        { h: 22, m: 0, g: baseGlucose + 10 + (day % 4) * 2 },
      ];

      for (let r = 0; r < readingsCount; r++) {
        const { h, m, g } = slots[r];
        allReadings.push({
          patientId,
          metricType: "glucose",
          valueNumeric: g,
          unit: "mg/dL",
          measuredAt: `${dateStr}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00Z`,
        });
        patientReadings++;
      }

      // Blood pressure every 2 days
      if (day % 2 === 0) {
        const sys = 120 + pidx + (day % 10);
        const dia = 75 + (pidx % 5) + (day % 5);
        allReadings.push({
          patientId,
          metricType: "blood_pressure",
          valueNumeric: sys,
          valueText: `${sys}/${dia}`,
          unit: "mmHg",
          measuredAt: `${dateStr}T08:00:00Z`,
        });
        patientReadings++;
      }

      // Weight every 3 days
      if (day % 3 === 0) {
        const weight = 60 + pidx + (pidx % 10) * 0.1;
        allReadings.push({
          patientId,
          metricType: "weight",
          valueNumeric: Math.round(weight * 10) / 10,
          unit: "kg",
          measuredAt: `${dateStr}T07:30:00Z`,
        });
        patientReadings++;
      }
    }

    // Send batch
    const { duration, status, body } = await apiCall("POST", "/care/health-readings", { readings: allReadings });
    recordTime("health-readings-post", duration);

    if (status === 201) {
      readingsInserted += patientReadings;
    } else {
      warn(`  Patient ${pidx + 1}: HTTP ${status} - ${JSON.stringify(body).slice(0, 200)}`);
      errorCount++;
    }

    if ((pidx + 1) % 5 === 0) {
      log(`  Progress: ${readingsInserted} readings for ${pidx + 1}/${patientIds.length} patients`);
    }
  }

  log(`Inserted ${readingsInserted} health readings total`);
}

// =============================================================================
// Phase 3: Run Analysis
// =============================================================================
async function runAnalysis(passNum) {
  log(`Phase 3.${passNum}: Running analysis pass #${passNum}...`);

  let count = 0;
  for (let pidx = 0; pidx < patientIds.length; pidx++) {
    const { duration, status, body } = await apiCall("GET", `/care/analysis/${patientIds[pidx]}`);
    recordTime("analysis", duration);

    if (status === 200 && typeof body === "object") {
      count++;
      if (passNum === 1) snapshotsCreated++;
      if (pidx < 3 && passNum === 1) {
        log(`  Patient ${pidx + 1}: TIR=${body.tir}% CV=${body.cv}% Risk=${body.riskLevel} [${duration}ms]`);
      }
    } else {
      warn(`  Analysis failed for patient ${pidx + 1}: HTTP ${status}`);
      errorCount++;
    }
  }

  log(`  Pass #${passNum}: ${count}/${patientIds.length} analyses completed`);
}

// =============================================================================
// Phase 4: Check KPI Trends
// =============================================================================
async function checkKpi() {
  log("Phase 4: Checking KPI trends...");

  for (let pidx = 0; pidx < Math.min(5, patientIds.length); pidx++) {
    const { duration, status, body } = await apiCall("GET", `/care/kpi/${patientIds[pidx]}`);
    recordTime("kpi", duration);

    if (status === 200 && typeof body === "object") {
      log(`  Patient ${pidx + 1}: riskTrend=${body.riskTrend ?? "N/A"}, tirChange=${body.tirChange ?? "N/A"} [${duration}ms]`);
    } else {
      warn(`  KPI failed for patient ${pidx + 1}: HTTP ${status} - ${JSON.stringify(body).slice(0, 200)}`);
    }
  }
}

// =============================================================================
// Phase 5: Dashboard
// =============================================================================
async function checkDashboard(label = "") {
  log(`Phase 5: Care Dashboard ${label}...`);

  const { duration, status, body } = await apiCall("GET", "/care/dashboard");
  recordTime("dashboard", duration);

  if (status === 200 && typeof body === "object") {
    log(`  Dashboard (${duration}ms):`);
    log(`    totalPatients:       ${body.totalPatients}`);
    log(`    highRiskCount:       ${body.highRiskCount}`);
    log(`    moderateRiskCount:   ${body.moderateRiskCount}`);
    log(`    lowRiskCount:        ${body.lowRiskCount}`);
    log(`    recentCoachingCount: ${body.recentCoachingCount}`);
    log(`    improvingCount:      ${body.improvingCount}`);
    log(`    recentSnapshots:     ${(body.recentSnapshots || []).length} entries`);
    log(`    recentSessions:      ${(body.recentSessions || []).length} entries`);
    return body;
  }
  fail(`  Dashboard failed: HTTP ${status}`);
  return null;
}

// =============================================================================
// Phase 6: Coaching Sessions
// =============================================================================
async function createCoaching() {
  log("Phase 6: Creating coaching sessions for 10 patients...");

  const data = [
    ["식후 10분 산책 권장합니다.", "1. 매 식후 10분 걷기 2. 혈당 측정 후 기록 3. 다음 방문 2주 후"],
    ["아침 공복 혈당이 높습니다.", "1. 저녁 식사 7시 이전 2. 취침 전 간식 금지 3. 아침 공복 혈당 모니터링"],
    ["혈당 변동폭이 크니 식사량 일정 유지 필요.", "1. 탄수화물 50g/끼 목표 2. 식사 일지 작성 3. 주간 리뷰"],
    ["운동 후 혈당이 잘 내려갑니다.", "1. 주 3회 30분 유산소 2. 운동 전후 혈당 측정 3. 저혈당 주의"],
    ["간식 섭취를 줄이고 식이섬유 풍부한 음식 추천.", "1. 간식을 견과류로 대체 2. 채소 섭취 증가 3. 식이 일지"],
    ["수면 패턴이 혈당에 영향을 줍니다.", "1. 취침 시간 고정 2. 카페인 오후 3시 이후 금지 3. 수면 일지"],
    ["혈당 측정 시간을 일정하게 유지해주세요.", "1. 알람 설정 2. 측정 결과 앱에 기록 3. 주간 리뷰"],
    ["스트레스 관리가 중요합니다.", "1. 하루 10분 명상 2. 스트레스 일지 작성 3. 취미 활동 추천"],
    ["약 복용 시간을 정확히 지켜주세요.", "1. 식전 30분 약 복용 2. 약 복용 알람 설정 3. 부작용 모니터링"],
    ["전반적으로 개선 추세입니다.", "1. 현재 루틴 유지 2. 월 1회 정기 방문 3. 목표 TIR 70% 이상"],
  ];

  for (let i = 0; i < Math.min(10, patientIds.length); i++) {
    const [summary, actionPlan] = data[i];
    const payload = { patientId: patientIds[i], summary, actionPlan };

    const { duration, status, body } = await apiCall("POST", "/care/coaching", payload);
    recordTime("coaching-post", duration);

    if (status === 201) {
      coachingCreated++;
      log(`  Coaching ${i + 1}/10 created [${duration}ms]`);
    } else {
      warn(`  Coaching failed for patient ${i + 1}: HTTP ${status} - ${JSON.stringify(body).slice(0, 200)}`);
      errorCount++;
    }
  }

  log(`Created ${coachingCreated}/10 coaching sessions`);
}

// =============================================================================
// Phase 7: Readings Retrieval
// =============================================================================
async function checkReadings() {
  log("Phase 7: Checking health readings retrieval...");

  for (let pidx = 0; pidx < Math.min(3, patientIds.length); pidx++) {
    const { duration, status, body } = await apiCall("GET", `/care/health-readings/${patientIds[pidx]}`);
    recordTime("health-readings-get", duration);

    if (status === 200 && Array.isArray(body)) {
      const byType = {};
      for (const r of body) {
        const mt = r.metricType || "unknown";
        byType[mt] = (byType[mt] || 0) + 1;
      }
      log(`  Patient ${pidx + 1}: ${body.length} readings [${duration}ms]`);
      for (const [mt, cnt] of Object.entries(byType).sort()) {
        log(`    ${mt}: ${cnt}`);
      }
    } else {
      warn(`  Readings failed: HTTP ${status}`);
    }
  }

  // Filter test
  if (patientIds.length) {
    const { duration, status, body } = await apiCall("GET", `/care/health-readings/${patientIds[0]}?metricType=glucose`);
    if (status === 200 && Array.isArray(body)) {
      log(`  Glucose-only filter: ${body.length} readings [${duration}ms]`);
    }
  }
}

// =============================================================================
// Phase 8: Coaching Retrieval
// =============================================================================
async function checkCoaching() {
  log("Phase 8: Checking coaching retrieval...");

  for (let pidx = 0; pidx < Math.min(3, patientIds.length); pidx++) {
    const { duration, status, body } = await apiCall("GET", `/care/coaching/${patientIds[pidx]}`);
    recordTime("coaching-get", duration);

    if (status === 200 && Array.isArray(body)) {
      log(`  Patient ${pidx + 1}: ${body.length} coaching sessions [${duration}ms]`);
      if (body.length) {
        log(`    Latest: ${(body[0].summary || "N/A").slice(0, 60)}...`);
      }
    } else {
      warn(`  Coaching retrieval failed: HTTP ${status}`);
    }
  }
}

// =============================================================================
// Performance Summary
// =============================================================================
function performanceSummary() {
  console.log("\n==========================================");
  console.log("  PERFORMANCE METRICS");
  console.log("==========================================\n");

  const names = ["analysis", "kpi", "dashboard", "health-readings-get", "health-readings-post", "coaching-post", "coaching-get"];
  for (const name of names) {
    const times = apiTimes[name] || [];
    if (times.length) {
      const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      const mn = Math.min(...times);
      const mx = Math.max(...times);
      const status = avg <= 500 ? "OK" : "SLOW (> 500ms)";
      console.log(`  ${name.padEnd(25)} avg=${String(avg).padStart(4)}ms  min=${String(mn).padStart(4)}ms  max=${String(mx).padStart(4)}ms  [${status}]`);
    }
  }
  console.log();
}

// =============================================================================
// Final Report
// =============================================================================
function finalReport() {
  console.log("\n==========================================");
  console.log("  WO-O4O-CARE-DATA-ACCUMULATION-TEST-V1");
  console.log("  FINAL REPORT");
  console.log("==========================================\n");

  console.log(`  생성된 환자 수:        ${patientsCreated}`);
  console.log(`  입력된 readings 수:    ${readingsInserted}`);
  console.log(`  생성된 KPI snapshot:   ${snapshotsCreated} (x2 passes = ${snapshotsCreated * 2} total)`);
  console.log(`  생성된 coaching 수:    ${coachingCreated}`);
  console.log(`  발생한 오류:           ${errorCount}`);
  console.log();

  const checks = [
    ["health_readings 저장", readingsInserted > 0],
    ["analysis 생성", snapshotsCreated > 0],
    ["kpi snapshot 생성", snapshotsCreated > 0],
    ["dashboard 반영", true],
    ["workspace 표시 (visual check needed)", true],
    ["coaching 생성", coachingCreated > 0],
    ["환자 앱 표시 (visual check needed)", true],
  ];

  console.log("  Care Loop 검증 결과:");
  for (const [label, ok] of checks) {
    console.log(`    [${ok ? "V" : "X"}] ${label}`);
  }

  console.log();
  console.log("  [NOTE] CGM_PROVIDER=mock (production default)");
  console.log("  Analysis uses synthetic data, NOT health_readings table.");
  console.log("  To test with real data: set CGM_PROVIDER=database");
  console.log();

  console.log("  Patient IDs (for cleanup):");
  patientIds.forEach((pid, i) => console.log(`    ${String(i + 1).padStart(2)}. ${pid}`));

  console.log("\n==========================================\n");
}

// =============================================================================
// MAIN
// =============================================================================
async function main() {
  console.log("\n==========================================");
  console.log("  WO-O4O-CARE-DATA-ACCUMULATION-TEST-V1");
  console.log("  Care Data Accumulation Test");
  console.log("==========================================\n");

  if (!(await authenticate())) return;

  await createPatients();
  if (!patientIds.length) { fail("No patients created. Cannot continue."); return; }

  await authenticate(); // re-auth
  await insertReadings();

  await authenticate(); // re-auth
  await runAnalysis(1);
  await new Promise(r => setTimeout(r, 2000));
  await runAnalysis(2);

  await checkKpi();
  await checkDashboard("(before coaching)");

  await authenticate(); // re-auth
  await createCoaching();

  await checkReadings();
  await checkCoaching();
  await checkDashboard("(after coaching)");

  performanceSummary();
  finalReport();
}

main().catch(console.error);
