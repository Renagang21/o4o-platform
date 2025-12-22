/**
 * CGM Data Hooks
 *
 * CGM 데이터 조회 및 상태 관리 훅
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  PatientSummary,
  GetPatientsResponse,
  GetPatientDetailResponse,
  GetAlertsResponse,
  CoachingSession,
  RiskLevel,
} from '../../backend/dto/index.js';
import { patientService } from '../../backend/services/PatientService.js';
import { coachingService } from '../../backend/services/CoachingService.js';
import { alertService } from '../../backend/services/AlertService.js';

// ===== 환자 목록 =====

interface UsePatientListParams {
  page?: number;
  limit?: number;
  riskLevel?: RiskLevel;
  sortBy?: 'riskLevel' | 'lastCoaching' | 'name';
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

interface UsePatientListResult {
  patients: PatientSummary[];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function usePatientList(params: UsePatientListParams = {}): UsePatientListResult {
  const [data, setData] = useState<GetPatientsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPatients = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await patientService.getPatients(params);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  return {
    patients: data?.patients ?? [],
    total: data?.total ?? 0,
    hasMore: data?.hasMore ?? false,
    isLoading,
    error,
    refetch: fetchPatients,
  };
}

// ===== 위험 환자 목록 =====

export function useRiskPatients() {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRiskPatients = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await patientService.getRiskPatients();
      setPatients(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRiskPatients();
  }, [fetchRiskPatients]);

  return { patients, isLoading, error, refetch: fetchRiskPatients };
}

// ===== 환자 상세 =====

export function usePatientDetail(patientId: string | null) {
  const [data, setData] = useState<GetPatientDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPatientDetail = useCallback(async () => {
    if (!patientId) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await patientService.getPatientDetail(patientId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchPatientDetail();
  }, [fetchPatientDetail]);

  return { data, isLoading, error, refetch: fetchPatientDetail };
}

// ===== 오늘 상담 환자 =====

export function useTodayCoachingPatients() {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTodayCoaching = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await patientService.getTodayCoachingPatients();
      setPatients(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayCoaching();
  }, [fetchTodayCoaching]);

  return { patients, isLoading, error, refetch: fetchTodayCoaching };
}

// ===== 코칭 세션 =====

export function useCoachingSessions(patientId: string | null) {
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!patientId) {
      setSessions([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await coachingService.getCoachingSessions(patientId);
      setSessions(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return { sessions, isLoading, error, refetch: fetchSessions };
}

// ===== 알림 =====

export function useAlerts() {
  const [data, setData] = useState<GetAlertsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await alertService.getAlerts();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      await alertService.acknowledgeAlert(alertId, 'pharmacist-001');
      fetchAlerts();
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  }, [fetchAlerts]);

  return {
    alerts: data?.alerts ?? [],
    total: data?.total ?? 0,
    unacknowledgedCount: data?.unacknowledgedCount ?? 0,
    isLoading,
    error,
    refetch: fetchAlerts,
    acknowledgeAlert,
  };
}
