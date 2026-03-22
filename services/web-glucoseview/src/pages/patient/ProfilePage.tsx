/**
 * ProfilePage — 개인 설정 관리
 * WO-GLYCOPHARM-PATIENT-PROFILE-V1 + PATCH-V1
 *
 * 기본 정보 (읽기 전용) + 건강 프로필 (편집)
 * Flat API response, validation, unknown options
 */

import { useState, useEffect, useCallback } from 'react';
import { Settings, Save, CheckCircle } from 'lucide-react';
import { patientApi } from '@/api/patient';
import type { PatientProfile, HealthProfilePayload } from '@/api/patient';

const GENDER_LABELS: Record<string, string> = {
  male: '남성',
  female: '여성',
};

const DIABETES_TYPE_OPTIONS = [
  { value: '', label: '선택하세요' },
  { value: 'type1', label: '제1형 당뇨' },
  { value: 'type2', label: '제2형 당뇨' },
  { value: 'gestational', label: '임신성 당뇨' },
  { value: 'prediabetes', label: '당뇨 전단계' },
  { value: 'unknown', label: '모름' },
];

const TREATMENT_OPTIONS = [
  { value: '', label: '선택하세요' },
  { value: 'insulin', label: '인슐린' },
  { value: 'oral', label: '경구약' },
  { value: 'diet', label: '식이요법' },
  { value: 'combined', label: '병합 치료' },
  { value: 'unknown', label: '모름' },
];

interface FormData {
  diabetesType: string | null;
  treatmentMethod: string | null;
  height: string | null;
  weight: string | null;
  targetHbA1c: string | null;
  targetGlucoseLow: number;
  targetGlucoseHigh: number;
  birthDate: string | null;
}

const DEFAULT_FORM: FormData = {
  diabetesType: null,
  treatmentMethod: null,
  height: null,
  weight: null,
  targetHbA1c: null,
  targetGlucoseLow: 70,
  targetGlucoseHigh: 180,
  birthDate: null,
};

function validate(form: FormData): string | null {
  const h = form.height ? Number(form.height) : null;
  if (h !== null && (h < 80 || h > 250)) return '키는 80~250cm 범위로 입력하세요.';

  const w = form.weight ? Number(form.weight) : null;
  if (w !== null && (w < 20 || w > 300)) return '몸무게는 20~300kg 범위로 입력하세요.';

  const a = form.targetHbA1c ? Number(form.targetHbA1c) : null;
  if (a !== null && (a < 4.0 || a > 15.0)) return 'HbA1c 목표는 4.0~15.0% 범위로 입력하세요.';

  return null;
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [profileData, setProfileData] = useState<PatientProfile | null>(null);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [hasExisting, setHasExisting] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await patientApi.getMyProfile();
      if (res.success && res.data) {
        setProfileData(res.data);
        if (res.data.id) {
          setForm({
            diabetesType: res.data.diabetesType,
            treatmentMethod: res.data.treatmentMethod,
            height: res.data.height,
            weight: res.data.weight,
            targetHbA1c: res.data.targetHbA1c,
            targetGlucoseLow: res.data.targetGlucoseLow,
            targetGlucoseHigh: res.data.targetGlucoseHigh,
            birthDate: res.data.birthDate,
          });
          setHasExisting(true);
        }
      }
    } catch {
      setError('프로필을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    const validationError = validate(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const payload: HealthProfilePayload = {
        diabetesType: form.diabetesType || null,
        treatmentMethod: form.treatmentMethod || null,
        height: form.height || null,
        weight: form.weight || null,
        targetHbA1c: form.targetHbA1c || null,
        targetGlucoseLow: form.targetGlucoseLow,
        targetGlucoseHigh: form.targetGlucoseHigh,
        birthDate: form.birthDate || null,
      };

      const res = hasExisting
        ? await patientApi.updateProfile(payload)
        : await patientApi.createProfile(payload);

      if (res.success) {
        setSaved(true);
        setHasExisting(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(res.error?.message || '저장에 실패했습니다.');
      }
    } catch {
      setError('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const updateForm = (field: keyof FormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-6">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
            <Settings className="w-5 h-5 text-slate-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">개인 설정 관리</h1>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* 기본 정보 (읽기 전용) */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            기본 정보
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <InfoRow label="이름" value={profileData?.name || '-'} />
            <InfoRow label="이메일" value={profileData?.email || '-'} />
            <InfoRow label="전화번호" value={profileData?.phone || '-'} />
            <InfoRow
              label="성별"
              value={
                profileData?.gender
                  ? GENDER_LABELS[profileData.gender] || profileData.gender
                  : '-'
              }
            />
          </div>
        </section>

        {/* 건강 프로필 (편집) */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            건강 프로필
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
            {/* 당뇨 유형 */}
            <FormSelect
              label="당뇨 유형"
              value={form.diabetesType || ''}
              options={DIABETES_TYPE_OPTIONS}
              onChange={(v) => updateForm('diabetesType', v || null)}
            />

            {/* 치료 방식 */}
            <FormSelect
              label="치료 방식"
              value={form.treatmentMethod || ''}
              options={TREATMENT_OPTIONS}
              onChange={(v) => updateForm('treatmentMethod', v || null)}
            />

            {/* 생년월일 */}
            <FormInput
              label="생년월일"
              type="date"
              value={form.birthDate || ''}
              onChange={(v) => updateForm('birthDate', v || null)}
              max={new Date().toISOString().split('T')[0]}
              min="1920-01-01"
            />

            {/* 키 / 몸무게 */}
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="키 (cm)"
                type="number"
                value={form.height || ''}
                onChange={(v) => updateForm('height', v || null)}
                placeholder="170"
                min="80"
                max="250"
              />
              <FormInput
                label="몸무게 (kg)"
                type="number"
                value={form.weight || ''}
                onChange={(v) => updateForm('weight', v || null)}
                placeholder="70"
                min="20"
                max="300"
              />
            </div>

            {/* HbA1c 목표 */}
            <FormInput
              label="HbA1c 목표 (%)"
              type="number"
              value={form.targetHbA1c || ''}
              onChange={(v) => updateForm('targetHbA1c', v || null)}
              placeholder="7.0"
              step="0.1"
              min="4.0"
              max="15.0"
            />

            {/* 혈당 목표 범위 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                혈당 목표 범위 (mg/dL)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={form.targetGlucoseLow}
                  onChange={(e) => updateForm('targetGlucoseLow', Number(e.target.value) || 70)}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="70"
                />
                <span className="text-slate-400 text-sm">~</span>
                <input
                  type="number"
                  value={form.targetGlucoseHigh}
                  onChange={(e) => updateForm('targetGlucoseHigh', Number(e.target.value) || 180)}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="180"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-teal-600 text-white text-lg font-semibold rounded-xl hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              저장 중...
            </>
          ) : saved ? (
            <>
              <CheckCircle className="w-4 h-4" />
              저장 완료
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              저장
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ---- Subcomponents ---- */

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}

function FormSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function FormInput({
  label,
  type,
  value,
  onChange,
  placeholder,
  step,
  min,
  max,
}: {
  label: string;
  type: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  step?: string;
  min?: string;
  max?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        placeholder={placeholder}
        step={step}
        min={min}
        max={max}
      />
    </div>
  );
}
