import React, { useState, useEffect } from 'react';
import { X, Save, User, Award, Percent, Building, Hash } from 'lucide-react';
import { dropshippingAPI } from '../../api/dropshipping-cpt';
import { toast } from 'react-hot-toast';

interface PartnerFormProps {
  partner?: any;
  onClose: () => void;
}

const PartnerForm: React.FC<PartnerFormProps> = ({ partner, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    acf: {
      partner_type: 'individual' as 'individual' | 'business',
      partner_grade: 'bronze' as 'bronze' | 'silver' | 'gold' | 'platinum',
      partner_referral_code: '',
      partner_commission_rate: 10
    }
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (partner) {
      setFormData({
        title: partner.title || '',
        content: partner.content || '',
        acf: {
          partner_type: partner.acf?.partner_type || 'individual',
          partner_grade: partner.acf?.partner_grade || 'bronze',
          partner_referral_code: partner.acf?.partner_referral_code || '',
          partner_commission_rate: partner.acf?.partner_commission_rate || 10
        }
      });
    }
  }, [partner]);

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('파트너 이름을 입력해주세요');
      return;
    }

    setSaving(true);
    try {
      let response;
      if (partner) {
        response = await dropshippingAPI.updatePartner(partner.id, formData);
      } else {
        response = await dropshippingAPI.createPartner(formData);
      }

      if (response.success) {
        toast.success(partner ? '파트너 정보가 수정되었습니다' : '파트너가 등록되었습니다');
        onClose();
      }
    } catch (error) {
      console.error('Failed to save partner:', error);
      toast.error('파트너 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const getGradeInfo = (grade: string) => {
    const gradeInfo = {
      bronze: { label: '브론즈', description: '기본 등급 파트너', color: 'text-orange-600' },
      silver: { label: '실버', description: '중급 등급 파트너', color: 'text-gray-600' },
      gold: { label: '골드', description: '상급 등급 파트너', color: 'text-yellow-600' },
      platinum: { label: '플래티넘', description: '최상급 등급 파트너', color: 'text-purple-600' }
    };
    return gradeInfo[grade as keyof typeof gradeInfo] || gradeInfo.bronze;
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6">
        {/* WordPress Style Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-normal text-gray-900">
            {partner ? '파트너 편집' : '새 파트너 추가'}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area (WordPress Editor Style) */}
          <div className="lg:col-span-2">
            {/* Title Box */}
            <div className="bg-white border border-gray-300 rounded-lg mb-4">
              <div className="p-4">
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 text-xl border border-gray-300 rounded focus:border-wordpress-blue focus:outline-none"
                  placeholder="여기에 제목을 입력하세요"
                />
              </div>
            </div>

            {/* Content Editor Box */}
            <div className="bg-white border border-gray-300 rounded-lg">
              <div className="border-b border-gray-300 px-4 py-2 bg-gray-50">
                <span className="text-sm font-medium text-gray-700">설명</span>
              </div>
              <div className="p-4">
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:border-wordpress-blue focus:outline-none"
                  placeholder="파트너에 대한 상세 정보를 입력하세요..."
                />
              </div>
            </div>
          </div>

          {/* Sidebar (WordPress Metabox Style) */}
          <div className="lg:col-span-1 space-y-4">
            {/* Publish Box */}
            <div className="bg-white border border-gray-300 rounded-lg">
              <div className="border-b border-gray-300 px-3 py-2 bg-gray-50">
                <h3 className="text-sm font-medium">공개</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">상태:</span>
                  <strong>공개</strong>
                </div>
                {partner && formData.acf.partner_referral_code && (
                  <div className="pt-3 border-t">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      추천 코드
                    </label>
                    <div className="flex items-center space-x-2">
                      <Hash className="h-4 w-4 text-gray-400" />
                      <code className="flex-1 px-2 py-1 bg-gray-100 rounded text-sm">
                        {formData.acf.partner_referral_code}
                      </code>
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t border-gray-300 px-4 py-3 bg-gray-50 flex justify-between">
                <button
                  onClick={onClose}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-1 bg-wordpress-blue text-white text-sm rounded hover:bg-wordpress-blue-hover disabled:opacity-50"
                >
                  {saving ? '저장 중...' : (partner ? '업데이트' : '공개')}
                </button>
              </div>
            </div>

            {/* Partner Type Box */}
            <div className="bg-white border border-gray-300 rounded-lg">
              <div className="border-b border-gray-300 px-3 py-2 bg-gray-50">
                <h3 className="text-sm font-medium flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  파트너 유형
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="partner_type"
                    value="individual"
                    checked={formData.acf.partner_type === 'individual'}
                    onChange={(e) => setFormData({
                      ...formData,
                      acf: { ...formData.acf, partner_type: 'individual' }
                    })}
                    className="text-wordpress-blue focus:ring-wordpress-blue"
                  />
                  <span className="text-sm">개인</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="partner_type"
                    value="business"
                    checked={formData.acf.partner_type === 'business'}
                    onChange={(e) => setFormData({
                      ...formData,
                      acf: { ...formData.acf, partner_type: 'business' }
                    })}
                    className="text-wordpress-blue focus:ring-wordpress-blue"
                  />
                  <span className="text-sm">사업자</span>
                </label>
              </div>
            </div>

            {/* Partner Grade Box */}
            <div className="bg-white border border-gray-300 rounded-lg">
              <div className="border-b border-gray-300 px-3 py-2 bg-gray-50">
                <h3 className="text-sm font-medium flex items-center">
                  <Award className="h-4 w-4 mr-2" />
                  파트너 등급
                </h3>
              </div>
              <div className="p-4">
                <select
                  value={formData.acf.partner_grade}
                  onChange={(e) => setFormData({
                    ...formData,
                    acf: { ...formData.acf, partner_grade: e.target.value as any }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:border-wordpress-blue focus:outline-none"
                >
                  <option value="bronze">브론즈</option>
                  <option value="silver">실버</option>
                  <option value="gold">골드</option>
                  <option value="platinum">플래티넘</option>
                </select>
                <p className={`text-xs mt-2 ${getGradeInfo(formData.acf.partner_grade).color}`}>
                  {getGradeInfo(formData.acf.partner_grade).description}
                </p>
              </div>
            </div>

            {/* Commission Rate Box */}
            <div className="bg-white border border-gray-300 rounded-lg">
              <div className="border-b border-gray-300 px-3 py-2 bg-gray-50">
                <h3 className="text-sm font-medium flex items-center">
                  <Percent className="h-4 w-4 mr-2" />
                  수수료 정책
                </h3>
              </div>
              <div className="p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  기본 수수료율
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={formData.acf.partner_commission_rate}
                    onChange={(e) => setFormData({
                      ...formData,
                      acf: { ...formData.acf, partner_commission_rate: parseInt(e.target.value) || 0 }
                    })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:border-wordpress-blue focus:outline-none"
                    min="0"
                    max="100"
                    step="1"
                  />
                  <span className="text-gray-600">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  파트너가 판매 시 받게 되는 기본 수수료율입니다
                </p>

                {/* Commission Preview */}
                <div className="mt-4 p-3 bg-gray-50 rounded">
                  <p className="text-xs text-gray-600 mb-1">수수료 계산 예시</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>판매가 ₩100,000 기준:</span>
                      <strong>₩{(100000 * formData.acf.partner_commission_rate / 100).toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerForm;