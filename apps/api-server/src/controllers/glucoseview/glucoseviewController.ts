/**
 * GlucoseView API Controllers
 * 
 * Provides endpoints for CGM patient summary and insight data
 */

import { Request, Response } from 'express';

/**
 * GET /api/v1/glucoseview/patients
 * Get all patients with their latest summary
 */
export async function getPatients(req: Request, res: Response) {
    try {
        const { pool } = req.app.locals;

        const query = `
      SELECT 
        p.*,
        json_build_object(
          'id', s.id,
          'patient_id', s.patient_id,
          'period_start', s.period_start,
          'period_end', s.period_end,
          'status', s.status,
          'avg_glucose', s.avg_glucose,
          'time_in_range', s.time_in_range,
          'time_above_range', s.time_above_range,
          'time_below_range', s.time_below_range,
          'summary_text', s.summary_text,
          'created_at', s.created_at
        ) as latest_summary
      FROM cgm_patients p
      LEFT JOIN LATERAL (
        SELECT * FROM cgm_patient_summaries
        WHERE patient_id = p.id
        ORDER BY period_end DESC
        LIMIT 1
      ) s ON true
      WHERE p.is_active = true
      ORDER BY s.status DESC NULLS LAST, p.name ASC
    `;

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('[GlucoseView] Error fetching patients:', error);
        res.status(500).json({ error: 'Failed to fetch patients' });
    }
}

/**
 * GET /api/v1/glucoseview/patients/:id
 * Get patient detail with all summaries and insights
 */
export async function getPatientDetail(req: Request, res: Response) {
    try {
        const { pool } = req.app.locals;
        const { id } = req.params;

        // Get patient info
        const patientQuery = 'SELECT * FROM cgm_patients WHERE id = $1';
        const patientResult = await pool.query(patientQuery, [id]);

        if (patientResult.rows.length === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        const patient = patientResult.rows[0];

        // Get all summaries (ordered by period_end DESC)
        const summariesQuery = `
      SELECT * FROM cgm_patient_summaries
      WHERE patient_id = $1
      ORDER BY period_end DESC
    `;
        const summariesResult = await pool.query(summariesQuery, [id]);

        // Get all insights (ordered by created_at DESC)
        const insightsQuery = `
      SELECT * FROM cgm_glucose_insights
      WHERE patient_id = $1
      ORDER BY created_at DESC
    `;
        const insightsResult = await pool.query(insightsQuery, [id]);

        res.json({
            ...patient,
            summaries: summariesResult.rows,
            insights: insightsResult.rows,
        });
    } catch (error) {
        console.error('[GlucoseView] Error fetching patient detail:', error);
        res.status(500).json({ error: 'Failed to fetch patient detail' });
    }
}
