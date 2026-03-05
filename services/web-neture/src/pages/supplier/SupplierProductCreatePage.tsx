/**
 * SupplierProductCreatePage - 공급자 상품 등록
 *
 * WO-O4O-ADMIN-UI-COMPLETION-V1
 * Uses: POST /api/v1/neture/supplier/products (barcode 기반)
 * Pattern: OperatorsPage.tsx
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supplierApi, adminMasterApi, type AdminMaster } from '../../lib/api';

type Step = 'barcode' | 'confirm';

export default function SupplierProductCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('barcode');
  const [barcode, setBarcode] = useState('');
  const [searching, setSearching] = useState(false);
  const [master, setMaster] = useState<AdminMaster | null>(null);
  const [searchError, setSearchError] = useState('');
  const [distributionType, setDistributionType] = useState('PUBLIC');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSearch = async () => {
    if (!barcode.trim()) return;
    setSearching(true);
    setSearchError('');
    setMaster(null);

    const result = await adminMasterApi.getMasterByBarcode(barcode.trim());
    setSearching(false);

    if (result) {
      setMaster(result);
      setStep('confirm');
    } else {
      setSearchError('해당 바코드의 ProductMaster가 없습니다. 관리자에게 등록을 요청하세요.');
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');

    const result = await supplierApi.createProduct({
      barcode: barcode.trim(),
      distributionType,
    });

    setSubmitting(false);

    if (result.success) {
      navigate('/workspace/supplier/products');
    } else {
      setSubmitError(result.error || '상품 등록에 실패했습니다.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">상품 등록</h1>
        <p className="text-slate-500 mt-1">바코드를 입력하여 새 상품을 등록합니다</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 ${step === 'barcode' ? 'text-emerald-600' : 'text-slate-400'}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
            step === 'barcode' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
          }`}>1</span>
          <span className="text-sm font-medium">바코드 입력</span>
        </div>
        <div className="h-px flex-1 bg-slate-200" />
        <div className={`flex items-center gap-2 ${step === 'confirm' ? 'text-emerald-600' : 'text-slate-400'}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
            step === 'confirm' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
          }`}>2</span>
          <span className="text-sm font-medium">정보 확인 및 등록</span>
        </div>
      </div>

      {/* Step 1: Barcode */}
      {step === 'barcode' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">바코드</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="상품 바코드를 입력하세요"
                className="flex-1 px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-lg font-mono"
                autoFocus
              />
              <button
                onClick={handleSearch}
                disabled={searching || !barcode.trim()}
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium"
              >
                {searching ? '검색중...' : '검색'}
              </button>
            </div>
          </div>

          {searchError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {searchError}
            </div>
          )}

          <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-500">
            <p>바코드를 입력하면 ProductMaster에서 상품 정보를 자동으로 조회합니다.</p>
            <p className="mt-1">ProductMaster에 등록되지 않은 바코드는 관리자에게 등록을 요청해주세요.</p>
          </div>
        </div>
      )}

      {/* Step 2: Confirm */}
      {step === 'confirm' && master && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">ProductMaster 정보</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">바코드</p>
                <p className="font-mono text-slate-800">{master.barcode}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">상품명</p>
                <p className="font-medium text-slate-800">{master.marketingName || '(이름 없음)'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">브랜드</p>
                <p className="text-slate-800">{master.brandName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">카테고리</p>
                <p className="text-slate-800">{master.category || '-'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">유통 설정</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">유통 정책</label>
              <div className="space-y-2">
                {[
                  { value: 'PUBLIC', label: '공개', desc: '모든 판매자에게 자동 노출' },
                  { value: 'SERVICE', label: '서비스', desc: '서비스 참여 승인 후 노출' },
                  { value: 'PRIVATE', label: '비공개', desc: '지정된 판매자에게만 노출' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      distributionType === opt.value
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="distributionType"
                      value={opt.value}
                      checked={distributionType === opt.value}
                      onChange={(e) => setDistributionType(e.target.value)}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-slate-800">{opt.label}</p>
                      <p className="text-sm text-slate-500">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {submitError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { setStep('barcode'); setMaster(null); }}
              className="px-6 py-3 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-medium"
            >
              이전
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium"
            >
              {submitting ? '등록중...' : '상품 등록'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
