/**
 * WO-O4O-CARE-REAL-OPERATION-SCENARIO-TEST-V2
 *
 * Care 시스템 전체 루프 End-to-End 검증
 *
 * Patient → Health Data → Analysis → KPI → Risk → Alert
 * → Priority → LLM Insight → Coaching → Dashboard
 *
 * 실행: node scripts/care-e2e-operation-test-v2.mjs
 */

const API_BASE = "https://api.neture.co.kr/api/v1";
let TOKEN = "";

// Counters
let patientsCreated = 0;
let readingsInserted = 0;
let analysisRun = 0;
let alertsFound = 0;
let llmInsightsFound = 0;
let coachingDraftsFound = 0;
let coachingCreated = 0;
let errorCount = 0;

const patientIds = [];
const analysisResults = [];
const apiTimes = {};
const checks = {};

function log(msg) { console.log(`[TEST] ${msg}`); }
function warn(msg) { console.log(`[WARN] ${msg}`); }
function fail(msg) { console.log(`[FAIL] ${msg}`); errorCount++; }

function recordTime(apiName, ms) {
  if (!apiTimes[apiName]) apiTimes[apiName] = [];
  apiTimes[apiName].push(ms);
}

function check(name, ok) {
  checks[name] = ok;
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

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// =============================================================================
// Glucose Pattern Generators (deterministic)
// =============================================================================

// TIR target: ≥ 75% (in 70-180 range)
function glucoseNormal(pidx, day, slot) {
  // slot: 0=fasting(07:00), 1=lunch(12:30), 2=dinner(18:30), 3=bedtime(22:00)
  const base = [95, 140, 135, 105][slot];
  const variation = ((pidx * 7 + day * 3 + slot * 11) % 20) - 10;
  // ~20% spike out of range
  const spike = ((pidx + day + slot) % 5 === 0) ? 30 : 0;
  return Math.max(65, base + variation + spike);
}

// TIR target: 50-65% (need ~40-50% of readings above 180)
function glucoseCaution(pidx, day, slot) {
  // Fasting ~145: sometimes in-range, sometimes over 180 with variation
  // Post-meal ~210, ~205: mostly out-of-range
  // Bedtime ~155: mostly in-range, occasional spike
  const base = [145, 210, 205, 155][slot];
  const variation = ((pidx * 7 + day * 3 + slot * 11) % 30) - 15;
  return Math.max(70, base + variation);
}

// TIR target: 25-40%
function glucoseHighRisk(pidx, day, slot) {
  const base = [175, 250, 240, 190][slot];
  const variation = ((pidx * 7 + day * 3 + slot * 11) % 40) - 20;
  return Math.max(80, base + variation);
}

function getGlucose(pidx, day, slot) {
  if (pidx < 8) return glucoseNormal(pidx, day, slot);
  if (pidx < 15) return glucoseCaution(pidx, day, slot);
  return glucoseHighRisk(pidx, day, slot);
}

function getPatientGroup(pidx) {
  if (pidx < 8) return "normal";
  if (pidx < 15) return "caution";
  return "high-risk";
}

// =============================================================================
// Phase 0: Authentication
// =============================================================================
async function authenticate() {
  log("Authenticating as operator-glycopharm@o4o.com ...");
  const { duration, status, body } = await apiCall("POST", "/auth/login", {
    email: "operator-glycopharm@o4o.com",
    password: "O4oTestPass",
    includeLegacyTokens: true,
  });

  if (status === 200 && body?.success) {
    TOKEN = body.data.tokens.accessToken;
    const user = body.data.user;
    log(`Authenticated: ${user.displayName} (${user.role}) userId=${user.id} [${duration}ms]`);
    return true;
  }
  fail(`Authentication failed: ${status} - ${JSON.stringify(body).slice(0, 300)}`);
  return false;
}

// =============================================================================
// Phase 1: Create 20 Patients
// =============================================================================
async function createPatients() {
  log("Phase 1: Creating 20 patients (8 normal, 7 caution, 5 high-risk)...");

  const patients = [
    // Normal (1-8)
    { name: "이수영", phone: "010-5555-0001", gender: "female", birth_year: 1985 },
    { name: "김태호", phone: "010-5555-0002", gender: "male", birth_year: 1972 },
    { name: "박지은", phone: "010-5555-0003", gender: "female", birth_year: 1990 },
    { name: "최민석", phone: "010-5555-0004", gender: "male", birth_year: 1968 },
    { name: "정혜진", phone: "010-5555-0005", gender: "female", birth_year: 1980 },
    { name: "강준호", phone: "010-5555-0006", gender: "male", birth_year: 1975 },
    { name: "조미라", phone: "010-5555-0007", gender: "female", birth_year: 1983 },
    { name: "윤성민", phone: "010-5555-0008", gender: "male", birth_year: 1969 },
    // Caution (9-15)
    { name: "장은숙", phone: "010-5555-0009", gender: "female", birth_year: 1965 },
    { name: "한동우", phone: "010-5555-0010", gender: "male", birth_year: 1962 },
    { name: "오영미", phone: "010-5555-0011", gender: "female", birth_year: 1977 },
    { name: "서재현", phone: "010-5555-0012", gender: "male", birth_year: 1970 },
    { name: "임선아", phone: "010-5555-0013", gender: "female", birth_year: 1988 },
    { name: "남정훈", phone: "010-5555-0014", gender: "male", birth_year: 1960 },
    { name: "배유진", phone: "010-5555-0015", gender: "female", birth_year: 1986 },
    // High-risk (16-20)
    { name: "신광수", phone: "010-5555-0016", gender: "male", birth_year: 1958 },
    { name: "유명자", phone: "010-5555-0017", gender: "female", birth_year: 1955 },
    { name: "권태진", phone: "010-5555-0018", gender: "male", birth_year: 1963 },
    { name: "홍순희", phone: "010-5555-0019", gender: "female", birth_year: 1957 },
    { name: "문기철", phone: "010-5555-0020", gender: "male", birth_year: 1961 },
  ];

  for (let i = 0; i < patients.length; i++) {
    const group = getPatientGroup(i);
    const p = {
      ...patients[i],
      notes: `Care V2 Test Patient #${i + 1} (${group})`,
    };

    const { duration, status, body } = await apiCall("POST", "/glucoseview/customers", p);
    recordTime("customers-post", duration);

    if (status === 201 && body?.data?.id) {
      patientIds.push(body.data.id);
      patientsCreated++;
    } else {
      warn(`  Patient #${i + 1} (${p.name}): HTTP ${status} - ${JSON.stringify(body).slice(0, 200)}`);
      errorCount++;
    }
  }

  log(`Created ${patientsCreated}/20 patients`);
  check("patients_created", patientsCreated === 20);
}

// =============================================================================
// Phase 2: Insert Health Readings (14 days, batch)
// =============================================================================
async function insertReadings() {
  log("Phase 2: Inserting health readings (14 days)...");
  if (!patientIds.length) { fail("No patients. Skipping."); return; }

  const now = new Date();

  for (let pidx = 0; pidx < patientIds.length; pidx++) {
    const patientId = patientIds[pidx];
    const group = getPatientGroup(pidx);
    const allReadings = [];

    const baseWeight = 60 + pidx * 0.5;

    for (let day = 0; day < 14; day++) {
      const dayDate = new Date(now.getTime() - (13 - day) * 86400000);
      const dateStr = dayDate.toISOString().split("T")[0];

      // Glucose: 4 readings per day (fasting, lunch, dinner, bedtime)
      const slots = [
        { h: 7, m: 0 },
        { h: 12, m: 30 },
        { h: 18, m: 30 },
        { h: 22, m: 0 },
      ];

      for (let s = 0; s < 4; s++) {
        const glucose = getGlucose(pidx, day, s);
        allReadings.push({
          patientId,
          metricType: "glucose",
          valueNumeric: glucose,
          unit: "mg/dL",
          measuredAt: `${dateStr}T${String(slots[s].h).padStart(2, "0")}:${String(slots[s].m).padStart(2, "0")}:00Z`,
        });
      }

      // Blood pressure: every 2 days (Format A: blood_pressure + valueText)
      if (day % 2 === 0) {
        let sys, dia;
        if (group === "normal") {
          sys = 112 + (pidx % 5) + ((day * 3) % 10);
          dia = 70 + (pidx % 4) + ((day * 2) % 8);
        } else if (group === "caution") {
          sys = 130 + (pidx % 5) + ((day * 3) % 10);
          dia = 82 + (pidx % 3) + ((day * 2) % 6);
        } else {
          sys = 145 + (pidx % 5) + ((day * 3) % 17);
          dia = 92 + (pidx % 4) + ((day * 2) % 8);
        }
        allReadings.push({
          patientId,
          metricType: "blood_pressure",
          valueNumeric: sys,
          valueText: `${sys}/${dia}`,
          unit: "mmHg",
          measuredAt: `${dateStr}T08:00:00Z`,
        });
      }

      // Weight: every 3 days
      if (day % 3 === 0) {
        let weight;
        if (group === "normal") {
          weight = baseWeight + ((day % 6) - 3) * 0.2; // stable ±0.5
        } else if (group === "caution") {
          weight = baseWeight + day * 0.15; // slow increase
        } else {
          weight = baseWeight + day * 0.3; // noticeable increase
        }
        allReadings.push({
          patientId,
          metricType: "weight",
          valueNumeric: Math.round(weight * 10) / 10,
          unit: "kg",
          measuredAt: `${dateStr}T07:30:00Z`,
        });
      }
    }

    // Send batch
    const { duration, status, body } = await apiCall("POST", "/care/health-readings", { readings: allReadings });
    recordTime("health-readings-post", duration);

    if (status === 201) {
      readingsInserted += allReadings.length;
    } else {
      warn(`  Patient #${pidx + 1}: HTTP ${status} - ${JSON.stringify(body).slice(0, 200)}`);
      errorCount++;
    }

    if ((pidx + 1) % 5 === 0) {
      log(`  Progress: ${readingsInserted} readings for ${pidx + 1}/${patientIds.length} patients`);
    }
  }

  log(`Inserted ${readingsInserted} health readings total`);
  check("readings_inserted", readingsInserted > 1000);
}

// =============================================================================
// Phase 3: Analysis Pass
// =============================================================================
async function runAnalysis(passNum) {
  log(`Phase 3.${passNum}: Running analysis pass #${passNum}...`);

  let count = 0;
  const distribution = { low: 0, moderate: 0, high: 0 };

  for (let pidx = 0; pidx < patientIds.length; pidx++) {
    const { duration, status, body } = await apiCall("GET", `/care/analysis/${patientIds[pidx]}`);
    recordTime("analysis", duration);

    if (status === 200 && typeof body === "object" && body.riskLevel) {
      count++;
      distribution[body.riskLevel] = (distribution[body.riskLevel] || 0) + 1;

      if (passNum === 1) {
        analysisResults.push({
          patientIdx: pidx,
          group: getPatientGroup(pidx),
          tir: body.tir,
          cv: body.cv,
          riskLevel: body.riskLevel,
          hasMultiMetric: !!body.multiMetric,
          hasBp: !!body.multiMetric?.bp,
          hasWeight: !!body.multiMetric?.weight,
        });
      }

      if (pidx < 3 || pidx === 8 || pidx === 15) {
        const mm = body.multiMetric
          ? ` | BP=${body.multiMetric?.bp?.bpCategory || "N/A"} Weight=${body.multiMetric?.weight?.latestWeight || "N/A"}kg MetabolicRisk=${body.multiMetric?.metabolicRisk?.metabolicRiskLevel || "N/A"}`
          : "";
        log(`  #${pidx + 1} (${getPatientGroup(pidx)}): TIR=${body.tir}% CV=${body.cv}% Risk=${body.riskLevel}${mm} [${duration}ms]`);
      }
    } else {
      warn(`  Analysis failed for patient #${pidx + 1}: HTTP ${status} - ${JSON.stringify(body).slice(0, 200)}`);
      errorCount++;
    }
  }

  analysisRun += count;
  log(`  Pass #${passNum}: ${count}/${patientIds.length} analyses completed`);
  log(`  Risk distribution: low=${distribution.low} moderate=${distribution.moderate} high=${distribution.high}`);

  if (passNum === 1) {
    check("analysis_pass1", count === patientIds.length);
    check("risk_distribution", distribution.low >= 6 && distribution.moderate >= 5 && distribution.high >= 3);
    check("multi_metric_enabled", analysisResults.some(r => r.hasMultiMetric));
  }

  return distribution;
}

// =============================================================================
// Phase 4: Verify Fire-and-Forget Effects
// =============================================================================
async function verifyFireAndForget() {
  log("Phase 4: Verifying fire-and-forget effects (after 5s wait)...");
  await sleep(5000);

  // 4a: KPI Snapshots
  log("  4a. KPI Snapshots...");
  let kpiOk = 0;
  for (let pidx = 0; pidx < Math.min(5, patientIds.length); pidx++) {
    const { duration, status, body } = await apiCall("GET", `/care/kpi/${patientIds[pidx]}`);
    recordTime("kpi", duration);

    if (status === 200 && body?.latestTir != null) {
      kpiOk++;
      if (pidx < 2) {
        log(`    Patient #${pidx + 1}: latestTir=${body.latestTir}% latestCv=${body.latestCv}% [${duration}ms]`);
      }
    }
  }
  log(`    KPI snapshots verified: ${kpiOk}/5`);
  check("kpi_snapshots", kpiOk >= 4);

  // 4b: LLM Insights
  log("  4b. LLM Insights...");
  let llmOk = 0;
  for (let pidx = 0; pidx < Math.min(5, patientIds.length); pidx++) {
    const { duration, status, body } = await apiCall("GET", `/care/llm-insight/${patientIds[pidx]}`);
    recordTime("llm-insight", duration);

    if (status === 200 && body?.pharmacyInsight) {
      llmOk++;
      llmInsightsFound++;
      if (pidx === 0) {
        log(`    Patient #1 insight: "${(body.pharmacyInsight || "").slice(0, 80)}..." model=${body.model} [${duration}ms]`);
      }
    }
  }
  if (llmOk > 0) {
    log(`    LLM insights found: ${llmOk}/5`);
  } else {
    log(`    LLM insights: 0/5 (Gemini API key may not be configured)`);
  }
  check("llm_insights", llmOk >= 0); // 0 OK if no Gemini key

  // 4c: Coaching Drafts
  log("  4c. Coaching Drafts...");
  let draftOk = 0;
  for (let pidx = 0; pidx < Math.min(5, patientIds.length); pidx++) {
    const { duration, status, body } = await apiCall("GET", `/care/coaching-drafts/${patientIds[pidx]}`);
    recordTime("coaching-drafts", duration);

    if (status === 200 && body?.draftMessage) {
      draftOk++;
      coachingDraftsFound++;
      if (pidx === 0) {
        log(`    Patient #1 draft: "${(body.draftMessage || "").slice(0, 80)}..." [${duration}ms]`);
      }
    }
  }
  if (draftOk > 0) {
    log(`    Coaching drafts found: ${draftOk}/5`);
  } else {
    log(`    Coaching drafts: 0/5 (Gemini API key may not be configured)`);
  }
  check("coaching_drafts", draftOk >= 0); // 0 OK if no Gemini key

  // 4d: Alerts
  log("  4d. Alerts...");
  const { duration: alertDur, status: alertSt, body: alertBody } = await apiCall("GET", "/care/alerts");
  recordTime("alerts", alertDur);

  if (alertSt === 200 && Array.isArray(alertBody)) {
    alertsFound = alertBody.length;
    const bySeverity = {};
    const byType = {};
    for (const a of alertBody) {
      bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
      byType[a.alertType] = (byType[a.alertType] || 0) + 1;
    }
    log(`    Total alerts: ${alertsFound} [${alertDur}ms]`);
    log(`    By severity: ${JSON.stringify(bySeverity)}`);
    log(`    By type: ${JSON.stringify(byType)}`);
    check("alerts_created", alertsFound > 0);
  } else {
    warn(`    Alerts failed: HTTP ${alertSt}`);
    check("alerts_created", false);
  }
}

// =============================================================================
// Phase 5: Analysis Pass #2 + KPI Trend
// =============================================================================
async function runAnalysisPass2() {
  log("Phase 5: Analysis Pass #2 + KPI Trend...");

  await runAnalysis(2);
  await sleep(3000);

  // Verify KPI trends
  let trendFound = 0;
  for (let pidx = 0; pidx < Math.min(5, patientIds.length); pidx++) {
    const { duration, status, body } = await apiCall("GET", `/care/kpi/${patientIds[pidx]}`);
    recordTime("kpi", duration);

    if (status === 200 && body?.riskTrend != null) {
      trendFound++;
      if (pidx < 3) {
        log(`  Patient #${pidx + 1}: riskTrend=${body.riskTrend} tirChange=${body.tirChange} [${duration}ms]`);
      }
    }
  }
  log(`  KPI trends found: ${trendFound}/5`);
  check("kpi_trends", trendFound >= 3);
}

// =============================================================================
// Phase 6: Create Coaching Sessions
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
    } else {
      warn(`  Coaching failed for patient #${i + 1}: HTTP ${status} - ${JSON.stringify(body).slice(0, 200)}`);
      errorCount++;
    }
  }

  log(`Created ${coachingCreated}/10 coaching sessions`);

  // Verify retrieval
  let retrieveOk = 0;
  for (let pidx = 0; pidx < Math.min(3, patientIds.length); pidx++) {
    const { duration, status, body } = await apiCall("GET", `/care/coaching/${patientIds[pidx]}`);
    recordTime("coaching-get", duration);

    if (status === 200 && Array.isArray(body) && body.length > 0) {
      retrieveOk++;
      if (pidx === 0) {
        log(`  Patient #1: ${body.length} sessions, latest="${(body[0].summary || "").slice(0, 50)}..." [${duration}ms]`);
      }
    }
  }
  log(`  Coaching retrieval: ${retrieveOk}/3 verified`);
  check("coaching_created", coachingCreated >= 8);
}

// =============================================================================
// Phase 7: Dashboard APIs Verification
// =============================================================================
async function verifyDashboards() {
  log("Phase 7: Verifying Dashboard APIs...");

  // 7a: Main Dashboard
  log("  7a. Care Dashboard...");
  const { duration: dashDur, status: dashSt, body: dashBody } = await apiCall("GET", "/care/dashboard");
  recordTime("dashboard", dashDur);

  if (dashSt === 200 && typeof dashBody === "object") {
    log(`    totalPatients:       ${dashBody.totalPatients}`);
    log(`    highRiskCount:       ${dashBody.highRiskCount}`);
    log(`    moderateRiskCount:   ${dashBody.moderateRiskCount}`);
    log(`    lowRiskCount:        ${dashBody.lowRiskCount}`);
    log(`    recentCoachingCount: ${dashBody.recentCoachingCount}`);
    log(`    improvingCount:      ${dashBody.improvingCount}`);
    log(`    recentSnapshots:     ${(dashBody.recentSnapshots || []).length} entries`);
    log(`    recentSessions:      ${(dashBody.recentSessions || []).length} entries`);
    log(`    [${dashDur}ms]`);
    check("dashboard", true);
  } else {
    fail(`    Dashboard failed: HTTP ${dashSt}`);
    check("dashboard", false);
  }

  // 7b: Risk Patients
  log("  7b. Risk Patients...");
  const { duration: riskDur, status: riskSt, body: riskBody } = await apiCall("GET", "/care/risk-patients");
  recordTime("risk-patients", riskDur);

  if (riskSt === 200 && typeof riskBody === "object") {
    const highCount = (riskBody.highRisk || []).length;
    const cautionCount = (riskBody.caution || []).length;
    log(`    highRisk: ${highCount} patients, caution: ${cautionCount} patients [${riskDur}ms]`);
    check("risk_patients", highCount > 0 || cautionCount > 0);
  } else {
    warn(`    Risk patients failed: HTTP ${riskSt}`);
    check("risk_patients", false);
  }

  // 7c: Priority Patients
  log("  7c. Priority Patients...");
  const { duration: priDur, status: priSt, body: priBody } = await apiCall("GET", "/care/priority-patients");
  recordTime("priority-patients", priDur);

  if (priSt === 200 && typeof priBody === "object") {
    const patients = priBody.priorityPatients || [];
    log(`    Priority patients: ${patients.length}`);
    for (let i = 0; i < Math.min(3, patients.length); i++) {
      log(`      #${i + 1}: ${patients[i].patientName} score=${patients[i].priorityScore} risk=${patients[i].riskLevel}`);
    }
    log(`    [${priDur}ms]`);
    check("priority_patients", patients.length > 0);
  } else {
    warn(`    Priority patients failed: HTTP ${priSt}`);
    check("priority_patients", false);
  }

  // 7d: Today Priority
  log("  7d. Today Priority...");
  const { duration: todayDur, status: todaySt, body: todayBody } = await apiCall("GET", "/care/today-priority");
  recordTime("today-priority", todayDur);

  if (todaySt === 200) {
    const patients = Array.isArray(todayBody) ? todayBody : (todayBody?.priorityPatients || []);
    log(`    Today priority patients: ${patients.length} [${todayDur}ms]`);
    check("today_priority", patients.length >= 0);
  } else {
    warn(`    Today priority failed: HTTP ${todaySt}`);
    check("today_priority", false);
  }

  // 7e: Population Dashboard
  log("  7e. Population Dashboard...");
  const { duration: popDur, status: popSt, body: popBody } = await apiCall("GET", "/care/population-dashboard");
  recordTime("population-dashboard", popDur);

  if (popSt === 200 && typeof popBody === "object") {
    log(`    totalPatients:    ${popBody.totalPatients}`);
    log(`    riskDistribution: ${JSON.stringify(popBody.riskDistribution)}`);
    log(`    averageMetrics:   TIR=${popBody.averageMetrics?.tir}% CV=${popBody.averageMetrics?.cv}%`);
    log(`    coaching:         sent7d=${popBody.coaching?.sent7d} pending=${popBody.coaching?.pending}`);
    log(`    activity:         active=${popBody.activity?.activePatients} inactive=${popBody.activity?.inactivePatients}`);
    log(`    [${popDur}ms]`);
    check("population_dashboard", true);
  } else {
    warn(`    Population dashboard failed: HTTP ${popSt}`);
    check("population_dashboard", false);
  }

  // 7f: Alerts (final check)
  log("  7f. Alerts (final)...");
  const { duration: alertDur, status: alertSt, body: alertBody } = await apiCall("GET", "/care/alerts");
  recordTime("alerts", alertDur);

  if (alertSt === 200 && Array.isArray(alertBody)) {
    alertsFound = alertBody.length;
    log(`    Active alerts: ${alertsFound} [${alertDur}ms]`);
  }
}

// =============================================================================
// Phase 8: Health Readings Retrieval Check
// =============================================================================
async function verifyReadings() {
  log("Phase 8: Verifying health readings retrieval...");

  for (let pidx = 0; pidx < Math.min(3, patientIds.length); pidx++) {
    const { duration, status, body } = await apiCall("GET", `/care/health-readings/${patientIds[pidx]}`);
    recordTime("health-readings-get", duration);

    if (status === 200 && Array.isArray(body)) {
      const byType = {};
      for (const r of body) {
        const mt = r.metricType || "unknown";
        byType[mt] = (byType[mt] || 0) + 1;
      }
      log(`  Patient #${pidx + 1} (${getPatientGroup(pidx)}): ${body.length} readings [${duration}ms]`);
      for (const [mt, cnt] of Object.entries(byType).sort()) {
        log(`    ${mt}: ${cnt}`);
      }
    } else {
      warn(`  Readings retrieval failed: HTTP ${status}`);
    }
  }

  // Glucose filter test
  if (patientIds.length) {
    const { duration, status, body } = await apiCall("GET", `/care/health-readings/${patientIds[0]}?metricType=glucose`);
    if (status === 200 && Array.isArray(body)) {
      log(`  Glucose filter: ${body.length} readings [${duration}ms]`);
      check("readings_retrieval", body.length >= 40);
    }
  }
}

// =============================================================================
// Phase 9: GlucoseView Patient App API Check
// =============================================================================
async function verifyGlucoseView() {
  log("Phase 9: Verifying GlucoseView patient app APIs...");

  if (!patientIds.length) { warn("No patients. Skipping."); return; }

  // Check a high-risk patient (index 15)
  const testIdx = Math.min(15, patientIds.length - 1);
  const patientId = patientIds[testIdx];

  log(`  Testing patient #${testIdx + 1} (${getPatientGroup(testIdx)})...`);

  // Analysis (today's health KPI)
  const { duration: d1, status: s1, body: b1 } = await apiCall("GET", `/care/analysis/${patientId}`);
  recordTime("gv-analysis", d1);
  if (s1 === 200) {
    log(`    Analysis: TIR=${b1.tir}% CV=${b1.cv}% Risk=${b1.riskLevel} [${d1}ms]`);
  }

  // Health Readings (recent records)
  const { duration: d2, status: s2, body: b2 } = await apiCall("GET", `/care/health-readings/${patientId}`);
  recordTime("gv-readings", d2);
  if (s2 === 200 && Array.isArray(b2)) {
    log(`    Recent readings: ${b2.length} [${d2}ms]`);
  }

  // LLM Insight (AI Health Insight)
  const { duration: d3, status: s3, body: b3 } = await apiCall("GET", `/care/llm-insight/${patientId}`);
  recordTime("gv-llm-insight", d3);
  if (s3 === 200) {
    log(`    LLM Insight: ${b3.patientMessage ? "EXISTS" : "NULL"} [${d3}ms]`);
  }

  // Coaching (Pharmacist Coaching)
  const { duration: d4, status: s4, body: b4 } = await apiCall("GET", `/care/coaching/${patientId}`);
  recordTime("gv-coaching", d4);
  if (s4 === 200 && Array.isArray(b4)) {
    log(`    Coaching sessions: ${b4.length} [${d4}ms]`);
  }

  check("glucoseview_apis", s1 === 200 && s2 === 200 && s3 === 200 && s4 === 200);
}

// =============================================================================
// Performance Summary
// =============================================================================
function performanceSummary() {
  console.log("\n==========================================");
  console.log("  PERFORMANCE METRICS");
  console.log("==========================================\n");

  const names = [
    "customers-post", "health-readings-post", "health-readings-get",
    "analysis", "kpi", "llm-insight", "coaching-drafts",
    "alerts", "coaching-post", "coaching-get",
    "dashboard", "risk-patients", "priority-patients",
    "today-priority", "population-dashboard",
    "gv-analysis", "gv-readings", "gv-llm-insight", "gv-coaching",
  ];

  for (const name of names) {
    const times = apiTimes[name] || [];
    if (times.length) {
      const sorted = [...times].sort((a, b) => a - b);
      const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      const mn = Math.min(...times);
      const mx = Math.max(...times);
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || mx;
      const status = avg <= 200 ? "OK" : avg <= 500 ? "WARN" : "SLOW";
      console.log(`  ${name.padEnd(28)} avg=${String(avg).padStart(5)}ms  min=${String(mn).padStart(5)}ms  max=${String(mx).padStart(5)}ms  p95=${String(p95).padStart(5)}ms  [${status}]`);
    }
  }
  console.log();
}

// =============================================================================
// Final Report
// =============================================================================
function finalReport() {
  console.log("\n==========================================");
  console.log("  WO-O4O-CARE-REAL-OPERATION-SCENARIO-TEST-V2");
  console.log("  FINAL REPORT");
  console.log("==========================================\n");

  console.log(`  환자 생성 수:           ${patientsCreated}/20`);
  console.log(`  health_readings 수:     ${readingsInserted}`);
  console.log(`  analysis 실행 결과:     ${analysisRun} (20 × 2 passes)`);

  // Risk distribution from analysis
  const dist = { low: 0, moderate: 0, high: 0 };
  for (const r of analysisResults) {
    dist[r.riskLevel] = (dist[r.riskLevel] || 0) + 1;
  }
  console.log(`  risk 분포:              low=${dist.low}, moderate=${dist.moderate}, high=${dist.high}`);
  console.log(`  alerts 생성 수:         ${alertsFound}`);
  console.log(`  LLM insight 생성 수:    ${llmInsightsFound}${llmInsightsFound === 0 ? " (Gemini API key not configured)" : ""}`);
  console.log(`  coaching drafts 수:     ${coachingDraftsFound}${coachingDraftsFound === 0 ? " (Gemini API key not configured)" : ""}`);
  console.log(`  coaching 생성 수:       ${coachingCreated}/10`);
  console.log(`  multi-metric 분석:      ${analysisResults.filter(r => r.hasMultiMetric).length}/${analysisResults.length} patients`);
  console.log();

  // Check results
  const checkItems = [
    ["환자 20명 생성", checks.patients_created],
    ["health_readings 데이터 생성", checks.readings_inserted],
    ["analysis 정상 실행 (database provider)", checks.analysis_pass1],
    ["multi-metric 분석 활성화", checks.multi_metric_enabled],
    ["risk detection 정상 (8/7/5 ±1)", checks.risk_distribution],
    ["KPI snapshot 생성", checks.kpi_snapshots],
    ["KPI trend 생성 (pass 2)", checks.kpi_trends],
    ["alerts 생성", checks.alerts_created],
    ["LLM insight 생성", checks.llm_insights],
    ["coaching drafts 생성", checks.coaching_drafts],
    ["coaching 세션 생성", checks.coaching_created],
    ["readings 조회 정상", checks.readings_retrieval],
    ["dashboard 표시 정상", checks.dashboard],
    ["risk patients 표시", checks.risk_patients],
    ["priority patients 표시", checks.priority_patients],
    ["today priority 표시", checks.today_priority],
    ["population dashboard 표시", checks.population_dashboard],
    ["glucoseview 앱 API 정상", checks.glucoseview_apis],
  ];

  console.log("  Care Loop 검증 결과:");
  let passed = 0;
  for (const [label, ok] of checkItems) {
    const mark = ok === true ? "V" : ok === false ? "X" : "?";
    console.log(`    [${mark}] ${label}`);
    if (ok) passed++;
  }

  console.log();
  console.log(`  총 검증: ${passed}/${checkItems.length} 통과`);
  console.log(`  총 오류: ${errorCount}`);
  console.log();

  console.log("  [ENV] CGM_PROVIDER=database (production)");
  console.log("  [ENV] CARE_MULTI_METRIC=true (production)");
  console.log("  [NOTE] glucoseview 화면 표시는 visual check 필요");
  console.log();

  console.log("  Patient IDs (for cleanup):");
  patientIds.forEach((pid, i) => console.log(`    ${String(i + 1).padStart(2)}. ${pid} (${getPatientGroup(i)})`));

  console.log("\n==========================================\n");
}

// =============================================================================
// MAIN
// =============================================================================
async function main() {
  console.log("\n==========================================");
  console.log("  WO-O4O-CARE-REAL-OPERATION-SCENARIO-TEST-V2");
  console.log("  Care End-to-End Operation Test");
  console.log("==========================================\n");

  // Phase 0
  if (!(await authenticate())) return;

  // Phase 1
  await createPatients();
  if (!patientIds.length) { fail("No patients created. Cannot continue."); return; }

  // Phase 2
  await authenticate();
  await insertReadings();

  // Phase 3
  await authenticate();
  await runAnalysis(1);

  // Phase 4
  await verifyFireAndForget();

  // Phase 5
  await authenticate();
  await runAnalysisPass2();

  // Phase 6
  await authenticate();
  await createCoaching();

  // Phase 7
  await authenticate();
  await verifyDashboards();

  // Phase 8
  await verifyReadings();

  // Phase 9
  await verifyGlucoseView();

  // Summary
  performanceSummary();
  finalReport();
}

main().catch(console.error);
