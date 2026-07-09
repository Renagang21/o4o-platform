/**
 * ProductMasterCreatePage — 관리자 수동 상품 등록
 *
 * WO-O4O-ADMIN-PRODUCT-MASTER-MANUAL-REGISTRATION-UI-V1
 *
 * 신규 공식 상품(ProductMaster) 등록 폼. 바코드는 선택 — 비우면 O4O 자체 내부코드가 자동 생성된다
 * (WO-O4O-PRODUCT-MASTER-BARCODELESS-REGISTRATION-INTERNAL-CODE-V1).
 * 카테고리/브랜드/이미지는 등록 후 상세 화면에서 이어서 편집한다.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createProductMaster, CreateProductMasterInput } from '@/api/o4o-product-db.api';

const REGULATORY_TYPES = ['일반', '건강기능식품', '의약품', '의료기기', '의약외품', '화장품'];

export default function ProductMasterCreatePage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    manufacturerName: '',
    barcode: '',
    regulatoryType: '일반',
    specification: '',
    originCountry: '',
    mfdsPermitNumber: '',
    tags: '',
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const canSubmit = form.name.trim().length > 0 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const input: CreateProductMasterInput = {
        name: form.name.trim(),
        manufacturerName: form.manufacturerName.trim() || undefined,
        barcode: form.barcode.trim() || undefined,
        regulatoryType: form.regulatoryType || undefined,
        specification: form.specification.trim() || undefined,
        originCountry: form.originCountry.trim() || undefined,
        mfdsPermitNumber: form.mfdsPermitNumber.trim() || undefined,
        tags: form.tags.trim()
          ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : undefined,
      };
      const created = await createProductMaster(input);
      toast.success('상품이 등록되었습니다');
      navigate(`/admin/o4o-product-db/masters/${created.id}`);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || '상품 등록에 실패했습니다';
      toast.error(typeof msg === 'string' ? msg : '상품 등록에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  const field = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-admin-blue';
  const label = 'block text-sm font-medium text-gray-700 mb-1.5';

  return (
    <div className="max-w-2xl">
      <button
        type="button"
        onClick={() => navigate('/admin/o4o-product-db/masters')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> 기본 상품 목록
      </button>

      <h1 className="text-xl font-semibold text-gray-900 mb-1">새 상품 등록</h1>
      <p className="text-sm text-gray-500 mb-6">
        공식 상품(ProductMaster)을 등록합니다. 바코드는 선택 항목이며, 비우면 O4O 자체 코드가 자동 생성됩니다.
        카테고리 · 브랜드 · 이미지는 등록 후 상세 화면에서 이어서 설정할 수 있습니다.
      </p>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
        <div>
          <label className={label} htmlFor="name">
            상품명 <span className="text-red-500">*</span>
          </label>
          <input id="name" className={field} value={form.name} onChange={set('name')}
            placeholder="예: 맨 파워 포텐" autoFocus />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={label} htmlFor="manufacturerName">제조사</label>
            <input id="manufacturerName" className={field} value={form.manufacturerName}
              onChange={set('manufacturerName')} placeholder="제조사명" />
          </div>
          <div>
            <label className={label} htmlFor="regulatoryType">분류</label>
            <select id="regulatoryType" className={field} value={form.regulatoryType} onChange={set('regulatoryType')}>
              {REGULATORY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={label} htmlFor="barcode">바코드 <span className="text-gray-400 font-normal">(선택)</span></label>
          <input id="barcode" className={field} value={form.barcode} onChange={set('barcode')}
            placeholder="비우면 O4O 자체 코드 자동 생성" inputMode="numeric" />
          <p className="text-xs text-gray-400 mt-1">있으면 유효한 GTIN(8/12/13/14자리)만 허용됩니다.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={label} htmlFor="specification">규격</label>
            <input id="specification" className={field} value={form.specification}
              onChange={set('specification')} placeholder="예: 1,300mg × 60캡슐 × 3BOX" />
          </div>
          <div>
            <label className={label} htmlFor="originCountry">원산지</label>
            <input id="originCountry" className={field} value={form.originCountry}
              onChange={set('originCountry')} placeholder="예: 미국(USA)" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={label} htmlFor="mfdsPermitNumber">허가번호 <span className="text-gray-400 font-normal">(선택)</span></label>
            <input id="mfdsPermitNumber" className={field} value={form.mfdsPermitNumber}
              onChange={set('mfdsPermitNumber')} placeholder="식약처 허가번호" />
          </div>
          <div>
            <label className={label} htmlFor="tags">태그 <span className="text-gray-400 font-normal">(쉼표 구분)</span></label>
            <input id="tags" className={field} value={form.tags} onChange={set('tags')}
              placeholder="예: 남성, 건강" />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex items-center gap-1.5 bg-admin-blue text-white px-4 py-2 rounded text-sm disabled:opacity-40"
          >
            <Save className="w-4 h-4" /> {submitting ? '등록 중…' : '등록'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/o4o-product-db/masters')}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
