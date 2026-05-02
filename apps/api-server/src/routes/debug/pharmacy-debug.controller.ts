/**
 * Pharmacy Debug — SSR HTML Page
 *
 * GET /__debug__/pharmacy           → 약국 목록 (organizations + glycopharm_pharmacies)
 * GET /__debug__/pharmacy/deactivate?id=xxx → 비활성화 (isActive=false)
 *
 * 임시 운영 도구 — 깨진 데이터 정리용
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function page(title: string, body: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font:14px/1.6 monospace;max-width:900px;margin:2em auto;padding:0 1em}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:4px 8px;text-align:left}
.warn{color:red;font-weight:bold}a{color:#0066cc}</style>
</head><body>${body}</body></html>`;
}

export function createPharmacyDebugRouter(dataSource: DataSource): Router {
  const router = Router();

  // GET / — 약국 목록
  // WO-O4O-GLUCOSEVIEW-POST-DROP-CLEANUP-V1: glucoseview_customers JOIN(환자수) 제거
  router.get('/', async (_req, res) => {
    try {
      const rows = await dataSource.query(`
        SELECT
          o.id,
          o.name AS org_name,
          gp.name AS gp_name,
          o."isActive",
          o."createdAt"
        FROM organizations o
        JOIN organization_service_enrollments e
          ON e.organization_id = o.id
          AND e.service_code = 'glycopharm'
          AND e.status = 'active'
        LEFT JOIN glycopharm_pharmacies gp ON gp.id = o.id
        ORDER BY o."createdAt"
      `);

      const tableRows = rows.map((r: any) => `<tr>
        <td>${esc(r.id)}</td>
        <td>${esc(r.org_name)}</td>
        <td>${esc(r.gp_name)}</td>
        <td>${r.isActive ? 'YES' : '<span class="warn">NO</span>'}</td>
        <td>${esc(r.created_at)}</td>
        <td>${r.isActive ? `<a href="/__debug__/pharmacy/deactivate?id=${esc(r.id)}">비활성화</a>` : '-'}</td>
      </tr>`).join('\n');

      res.send(page('Pharmacy Debug', `
        <h1>GlycoPharm 약국 목록</h1>
        <p>총 ${rows.length}개</p>
        <table>
          <tr><th>ID</th><th>Org Name</th><th>GP Name</th><th>Active</th><th>Created</th><th>Action</th></tr>
          ${tableRows}
        </table>
        <p><a href="/__debug__/pharmacy">새로고침</a></p>
      `));
    } catch (err) {
      res.status(500).send(page('Error', `<pre>${esc(err)}</pre>`));
    }
  });

  // GET /deactivate?id=xxx — 비활성화 확인 페이지
  router.get('/deactivate', async (req, res) => {
    const id = req.query.id as string;
    if (!id) return res.status(400).send(page('Error', 'id 파라미터 필요'));

    try {
      const rows = await dataSource.query(
        `SELECT id, name, "isActive" FROM organizations WHERE id = $1`,
        [id],
      );
      if (rows.length === 0) return res.status(404).send(page('Not Found', '해당 조직 없음'));

      const org = rows[0];
      res.send(page('비활성화 확인', `
        <h1>약국 비활성화</h1>
        <p><strong>ID:</strong> ${esc(org.id)}</p>
        <p><strong>Name:</strong> ${esc(org.name)}</p>
        <p><strong>Active:</strong> ${org.isActive ? 'YES' : 'NO'}</p>
        <form method="POST" action="/__debug__/pharmacy/deactivate">
          <input type="hidden" name="id" value="${esc(id)}" />
          <button type="submit" style="background:red;color:white;padding:8px 16px;border:none;cursor:pointer">
            비활성화 실행
          </button>
        </form>
        <p><a href="/__debug__/pharmacy">← 돌아가기</a></p>
      `));
    } catch (err) {
      res.status(500).send(page('Error', `<pre>${esc(err)}</pre>`));
    }
  });

  // POST /deactivate — 실제 비활성화
  router.post('/deactivate', async (req, res) => {
    const id = req.body?.id as string;
    if (!id) return res.status(400).send(page('Error', 'id 파라미터 필요'));

    try {
      await dataSource.query(
        `UPDATE organizations SET "isActive" = false WHERE id = $1`,
        [id],
      );
      // Also deactivate enrollment
      await dataSource.query(
        `UPDATE organization_service_enrollments SET status = 'inactive' WHERE organization_id = $1 AND service_code = 'glycopharm'`,
        [id],
      );

      res.send(page('완료', `
        <h1>비활성화 완료</h1>
        <p>Organization <strong>${esc(id)}</strong> 비활성화됨</p>
        <p><a href="/__debug__/pharmacy">← 목록으로</a></p>
      `));
    } catch (err) {
      res.status(500).send(page('Error', `<pre>${esc(err)}</pre>`));
    }
  });

  // GET /lookup?q=최고 — '최고약국' 미노출 원인 실측
  // WO-O4O-GLYCOPHARM-PHARMACY-SEARCH-DEBUG-MEASUREMENT-V1
  router.get('/lookup', async (req, res) => {
    const q = (req.query.q as string) || '';
    if (!q.trim()) {
      res.send(page('Pharmacy Lookup', `
        <h1>Pharmacy Search Lookup (실측)</h1>
        <p>WO-O4O-GLYCOPHARM-PHARMACY-SEARCH-DEBUG-MEASUREMENT-V1</p>
        <form method="GET">
          <p>검색 키워드 (organization_name / applicant_name 부분일치):</p>
          <input name="q" placeholder="최고" style="width:300px;padding:4px" />
          <button type="submit" style="padding:6px 16px;background:#0066cc;color:white;border:none;cursor:pointer">조회</button>
        </form>
        <p>예: <a href="/__debug__/pharmacy/lookup?q=최고">/__debug__/pharmacy/lookup?q=최고</a></p>
      `));
      return;
    }

    const like = `%${q}%`;
    const result: Record<string, any> = { keyword: q };

    try {
      // 1. glycopharm_applications
      result.applications = await dataSource.query(
        `SELECT id, status, organization_name, applicant_name, user_id, created_at, reviewed_at
         FROM glycopharm_applications
         WHERE organization_name ILIKE $1 OR applicant_name ILIKE $1
         ORDER BY created_at DESC
         LIMIT 20`,
        [like],
      );

      // 2. organizations
      result.organizations = await dataSource.query(
        `SELECT id, name, "isActive", "createdAt"
         FROM organizations
         WHERE name ILIKE $1
         ORDER BY "createdAt" DESC
         LIMIT 20`,
        [like],
      );

      const orgIds: string[] = result.organizations.map((o: any) => o.id);

      // 3. organization_service_enrollments (해당 organizations 기준)
      if (orgIds.length > 0) {
        result.enrollments = await dataSource.query(
          `SELECT organization_id, service_code, status, created_at
           FROM organization_service_enrollments
           WHERE organization_id = ANY($1::uuid[])
           ORDER BY organization_id, service_code`,
          [orgIds],
        );

        // 4. glycopharm_pharmacies
        result.glycopharm_pharmacies = await dataSource.query(
          `SELECT id, name FROM glycopharm_pharmacies WHERE id = ANY($1::uuid[])`,
          [orgIds],
        );
      } else {
        result.enrollments = [];
        result.glycopharm_pharmacies = [];
      }

      // 5. 환자 검색 SoR 실제 쿼리 — 키워드와 무관하게 노출되는지 확인
      result.patient_search_includes_keyword = await dataSource.query(
        `SELECT
           o.id,
           COALESCE(gp.name, o.name) AS displayed_name,
           o.name AS org_name,
           gp.name AS gp_name,
           o."isActive" AS org_active,
           e.status AS enrollment_status
         FROM organizations o
         JOIN organization_service_enrollments e
           ON e.organization_id = o.id
           AND e.service_code = 'glycopharm'
           AND e.status = 'active'
         LEFT JOIN glycopharm_pharmacies gp ON gp.id = o.id
         WHERE o."isActive" = true
           AND (o.name ILIKE $1 OR gp.name ILIKE $1)
         ORDER BY COALESCE(gp.name, o.name)`,
        [like],
      );

      // 6. 시나리오 자동 판정
      const scenarios: string[] = [];
      if (result.applications.length === 0) {
        scenarios.push('A0: glycopharm_applications에 해당 row가 없음 (가입 자체가 안 들어감)');
      } else {
        const approved = result.applications.filter((a: any) => a.status === 'approved');
        if (approved.length === 0) {
          scenarios.push(`A1: application이 있으나 approved 없음 (현재 상태: ${result.applications.map((a: any) => a.status).join(', ')})`);
        }
      }
      if (result.organizations.length === 0) {
        scenarios.push('B: organizations row 없음 (승인 핸들러가 organization 생성 단계까지 못 갔음)');
      }
      const inactiveOrgs = result.organizations.filter((o: any) => !o.isActive);
      if (inactiveOrgs.length > 0) {
        scenarios.push(`C: organizations.isActive=false 인 row 존재 (${inactiveOrgs.length}건)`);
      }
      if (orgIds.length > 0) {
        const glycoEnrolls = (result.enrollments as any[]).filter((e) => e.service_code === 'glycopharm');
        if (glycoEnrolls.length === 0) {
          scenarios.push('D: 해당 organization에 service_code=glycopharm enrollment가 없음');
        } else {
          const inactiveEnrolls = glycoEnrolls.filter((e) => e.status !== 'active');
          if (inactiveEnrolls.length > 0) {
            scenarios.push(`E: enrollment.status가 active 아님 (${inactiveEnrolls.map((e) => e.status).join(', ')})`);
          }
        }
        if (result.glycopharm_pharmacies.length === 0) {
          scenarios.push('F: glycopharm_pharmacies row 없음 → COALESCE로 organizations.name fallback (이름 불일치 가능성)');
        }
      }
      if (result.patient_search_includes_keyword.length > 0) {
        scenarios.push('G: 환자 검색 SoR에는 키워드 매칭 결과가 존재함 → "검색 안 됨" 증상의 원인은 backend가 아니라 프론트 검색/필터일 수 있음');
      } else if (orgIds.length > 0) {
        scenarios.push('H: organizations는 있으나 환자 검색 SoR JOIN 결과는 0건 → enrollment.status 또는 isActive에서 탈락');
      }
      result.scenarios = scenarios.length > 0 ? scenarios : ['판정 불가 — 데이터 없음'];

      res.send(page('Pharmacy Lookup', `
        <h1>Pharmacy Search Lookup: <code>${esc(q)}</code></h1>
        <p>WO-O4O-GLYCOPHARM-PHARMACY-SEARCH-DEBUG-MEASUREMENT-V1</p>

        <h2>시나리오 자동 판정</h2>
        <ul>${result.scenarios.map((s: string) => `<li>${esc(s)}</li>`).join('')}</ul>

        <h2>1. glycopharm_applications (${result.applications.length})</h2>
        <pre>${esc(JSON.stringify(result.applications, null, 2))}</pre>

        <h2>2. organizations (${result.organizations.length})</h2>
        <pre>${esc(JSON.stringify(result.organizations, null, 2))}</pre>

        <h2>3. organization_service_enrollments (${result.enrollments.length})</h2>
        <pre>${esc(JSON.stringify(result.enrollments, null, 2))}</pre>

        <h2>4. glycopharm_pharmacies (${result.glycopharm_pharmacies.length})</h2>
        <pre>${esc(JSON.stringify(result.glycopharm_pharmacies, null, 2))}</pre>

        <h2>5. 환자 검색 SoR 실제 쿼리 결과 (${result.patient_search_includes_keyword.length})</h2>
        <pre>${esc(JSON.stringify(result.patient_search_includes_keyword, null, 2))}</pre>

        <p><a href="/__debug__/pharmacy/lookup">← 다시 조회</a> | <a href="/__debug__/pharmacy">전체 약국 목록</a></p>
      `));
    } catch (err) {
      res.status(500).send(page('Error', `<pre>${esc(err)}</pre><pre>${esc(JSON.stringify(result, null, 2))}</pre>`));
    }
  });

  // WO-O4O-GLUCOSEVIEW-POST-DROP-CLEANUP-V1
  // GET /care-data 제거 — 100% glucoseview_customers 진단용 endpoint.
  // glucoseview_customers 테이블 삭제(20260600000000)로 더 이상 동작하지 않음.

  // GET /appointment-trace?patient=전화수&pharmacy=테스트약국
  // IR-O4O-GLYCOPHARM-APPOINTMENT-REQUEST-MISSING-IN-PHARMACY-V1
  router.get('/appointment-trace', async (req, res) => {
    const patient = (req.query.patient as string) || '';
    const pharmacy = (req.query.pharmacy as string) || '';
    if (!patient && !pharmacy) {
      res.send(page('Appointment Trace', `
        <h1>Appointment / Link Request 추적</h1>
        <p>IR-O4O-GLYCOPHARM-APPOINTMENT-REQUEST-MISSING-IN-PHARMACY-V1</p>
        <form method="GET">
          <p>환자 이름 (부분일치): <input name="patient" placeholder="전화수" style="width:300px;padding:4px" /></p>
          <p>약국명 (부분일치): <input name="pharmacy" placeholder="테스트약국" style="width:300px;padding:4px" /></p>
          <button type="submit" style="padding:6px 16px;background:#0066cc;color:white;border:none;cursor:pointer">조회</button>
        </form>
      `));
      return;
    }

    const result: Record<string, any> = { patient, pharmacy };

    try {
      // 1. 환자 조회
      result.patients = await dataSource.query(
        `SELECT id, email, name, status, "isActive", "createdAt"
         FROM users
         WHERE name ILIKE $1
         ORDER BY "createdAt" DESC
         LIMIT 10`,
        [`%${patient}%`],
      );
      const patientIds: string[] = result.patients.map((p: any) => p.id);

      // 2. 약국 조회
      result.pharmacies = pharmacy
        ? await dataSource.query(
            `SELECT o.id, o.name, o."isActive", o."createdAt",
                    e.service_code, e.status AS enrollment_status
             FROM organizations o
             LEFT JOIN organization_service_enrollments e
               ON e.organization_id = o.id AND e.service_code = 'glycopharm'
             WHERE o.name ILIKE $1
             ORDER BY o."createdAt" DESC
             LIMIT 10`,
            [`%${pharmacy}%`],
          )
        : [];
      const pharmacyIds: string[] = result.pharmacies.map((p: any) => p.id);

      // 3. care_pharmacy_link_requests
      result.link_requests = await dataSource.query(
        `SELECT id, patient_id, patient_name, patient_email, pharmacy_id, pharmacy_name, status, message, reject_reason, handled_by, handled_at, created_at
         FROM care_pharmacy_link_requests
         WHERE ($1::uuid[] IS NULL OR patient_id = ANY($1::uuid[]))
            OR ($2::uuid[] IS NULL OR pharmacy_id = ANY($2::uuid[]))
         ORDER BY created_at DESC
         LIMIT 30`,
        [patientIds.length > 0 ? patientIds : null, pharmacyIds.length > 0 ? pharmacyIds : null],
      ).catch((e: any) => ({ error: String(e?.message || e) }));

      // WO-O4O-GLUCOSEVIEW-POST-DROP-CLEANUP-V1: glucoseview_customers 진단 블록 제거
      // (테이블 삭제 — 약국-환자 연결은 향후 Care Core 기반으로 재진단 예정)

      // 5. care_appointments (상담 예약)
      result.appointments = await dataSource.query(
        `SELECT id, patient_id, patient_name, patient_email, pharmacy_id, pharmacy_name, pharmacist_id, status, scheduled_at, notes, reject_reason, created_at
         FROM care_appointments
         WHERE ($1::uuid[] IS NULL OR patient_id = ANY($1::uuid[]))
            OR ($2::uuid[] IS NULL OR pharmacy_id = ANY($2::uuid[]))
         ORDER BY created_at DESC
         LIMIT 30`,
        [patientIds.length > 0 ? patientIds : null, pharmacyIds.length > 0 ? pharmacyIds : null],
      ).catch((e: any) => ({ error: String(e?.message || e) }));

      // 6. 약국 owner / member 확인
      if (pharmacyIds.length > 0) {
        result.pharmacy_owners_and_members = await dataSource.query(
          `SELECT o.id AS pharmacy_id, o.name AS pharmacy_name,
                  o.created_by_user_id,
                  om.user_id AS member_user_id, om.role, om.is_primary,
                  u.email, u.name AS user_name
           FROM organizations o
           LEFT JOIN organization_members om ON om.organization_id = o.id
           LEFT JOIN users u ON u.id = om.user_id
           WHERE o.id = ANY($1::uuid[])`,
          [pharmacyIds],
        ).catch((e: any) => ({ error: String(e?.message || e) }));
      } else {
        result.pharmacy_owners_and_members = [];
      }

      // 자동 진단
      const findings: string[] = [];
      if (result.patients.length === 0) findings.push('❌ 환자(이름 매칭) 조회 결과 없음');
      if (result.pharmacies.length === 0 && pharmacy) findings.push('❌ 약국(이름 매칭) 조회 결과 없음');

      if (Array.isArray(result.link_requests)) {
        if (result.link_requests.length === 0) {
          findings.push('❌ care_pharmacy_link_requests 레코드 없음 → 환자가 약국 연결 요청을 보낸 적이 없거나, 다른 약국에 보냄');
        } else {
          const pending = result.link_requests.filter((r: any) => r.status === 'pending');
          const approved = result.link_requests.filter((r: any) => r.status === 'approved');
          if (pending.length > 0) findings.push(`⚠️ link_requests pending ${pending.length}건 — 약국이 아직 승인하지 않음 (당뇨인 연결 요청 화면에서 확인 필요)`);
          if (approved.length > 0) findings.push(`✅ link_requests approved ${approved.length}건 — 연결 승인됨`);
        }
      }

      // WO-O4O-GLUCOSEVIEW-POST-DROP-CLEANUP-V1: glucoseview_customers 진단 항목 제거

      if (Array.isArray(result.appointments)) {
        if (result.appointments.length === 0) {
          findings.push('❌ care_appointments 없음 → 상담 예약 자체가 생성되지 않음');
        } else {
          findings.push(`✅ care_appointments ${result.appointments.length}건`);
        }
      }

      result.findings = findings;

      res.send(page('Appointment Trace', `
        <h1>Appointment / Link Request 추적</h1>
        <p>환자: <code>${esc(patient)}</code> / 약국: <code>${esc(pharmacy)}</code></p>

        <h2>자동 진단</h2>
        <ul>${findings.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>

        <h2>1. 환자 (users) — ${result.patients.length}건</h2>
        <pre>${esc(JSON.stringify(result.patients, null, 2))}</pre>

        <h2>2. 약국 (organizations + glycopharm enrollment) — ${result.pharmacies.length}건</h2>
        <pre>${esc(JSON.stringify(result.pharmacies, null, 2))}</pre>

        <h2>3. care_pharmacy_link_requests</h2>
        <pre>${esc(JSON.stringify(result.link_requests, null, 2))}</pre>

        <h2>5. care_appointments (상담 예약)</h2>
        <pre>${esc(JSON.stringify(result.appointments, null, 2))}</pre>

        <h2>6. 약국 owner/member</h2>
        <pre>${esc(JSON.stringify(result.pharmacy_owners_and_members, null, 2))}</pre>

        <p><a href="/__debug__/pharmacy/appointment-trace">← 다시 조회</a></p>
      `));
    } catch (err) {
      res.status(500).send(page('Error', `<pre>${esc(err)}</pre><pre>${esc(JSON.stringify(result, null, 2))}</pre>`));
    }
  });

  return router;
}
