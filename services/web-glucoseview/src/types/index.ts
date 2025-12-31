export type PatientStatus = 'normal' | 'warning' | 'risk';

export interface Patient {
    id: string;
    name: string;
    user_id: string;
    pharmacy_id?: string;
    registered_at: string;
    is_active: boolean;
}

export interface PatientSummary {
    id: string;
    patient_id: string;
    period_start: string;
    period_end: string;
    status: PatientStatus;
    avg_glucose: number;
    time_in_range: number;
    time_above_range?: number;
    time_below_range?: number;
    summary_text?: string;
    created_at: string;
}

export interface GlucoseInsight {
    id: string;
    patient_id: string;
    insight_type: string;
    description: string;
    generated_by: 'system' | 'pharmacist' | 'ai';
    reference_period?: string;
    created_at: string;
}

export interface PatientWithSummary extends Patient {
    latest_summary?: PatientSummary;
}

export interface PatientDetail extends Patient {
    summaries: PatientSummary[];
    insights: GlucoseInsight[];
}
