/**
 * 원내 약품 데이터셋 = 브라우저 localStorage (D2: Local-first V1 · 서버 미저장 · 환자정보 제외 · DDL 0).
 *
 * SSOT 는 @o4o/hospital-pharmacy-core 의 HOSPITAL_DRUG_STORAGE_KEY / isHospitalDrugDataset.
 * 서버에는 원내 목록을 저장하지 않는다 — 파일 이해(GFU)만 서버를 경유하고 결과는 여기(브라우저)에만 남는다.
 * private/차단 환경에서 접근이 던질 수 있으므로 모든 read/write 를 try/catch 로 감싼다.
 */

import {
  HOSPITAL_DRUG_STORAGE_KEY,
  isHospitalDrugDataset,
  type HospitalDrugDataset,
} from '@o4o/hospital-pharmacy-core';

export function loadDataset(): HospitalDrugDataset | null {
  try {
    const raw = localStorage.getItem(HOSPITAL_DRUG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isHospitalDrugDataset(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveDataset(dataset: HospitalDrugDataset): { ok: boolean; reason?: string } {
  try {
    localStorage.setItem(HOSPITAL_DRUG_STORAGE_KEY, JSON.stringify(dataset));
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : '저장 실패' };
  }
}

export function clearDataset(): void {
  try {
    localStorage.removeItem(HOSPITAL_DRUG_STORAGE_KEY);
  } catch {
    // 무시 — 이미 없거나 접근 차단
  }
}
