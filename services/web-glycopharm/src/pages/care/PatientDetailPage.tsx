/**
 * PatientDetailPage - 환자 상세 (placeholder)
 * WO-CARE-INTERNAL-NAV-STRUCTURE-V1
 */

import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User } from 'lucide-react';
import CareSubNav from './CareSubNav';

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <CareSubNav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => navigate('/care/patients')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          환자 목록으로
        </button>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-slate-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">환자 상세</h1>
          <p className="text-sm text-slate-500 mb-1">Patient ID: {id}</p>
          <p className="text-sm text-slate-400">상세 화면은 다음 단계에서 구현됩니다.</p>
        </div>
      </div>
    </div>
  );
}
