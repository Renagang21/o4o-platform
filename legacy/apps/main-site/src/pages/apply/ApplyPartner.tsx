import { FC, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { cookieAuthClient } from '@o4o/auth-client';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/layout/Layout';
import toast from 'react-hot-toast';

/**
 * P0 RBAC: Partner Application Page
 */
const ApplyPartner: FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: user?.email || '',
    partnershipType: '',
    agreeTerms: false,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.agreeTerms) {
      toast.error('약관에 동의해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await cookieAuthClient.createEnrollment({
        role: 'partner',
        metadata: {
          companyName: formData.companyName,
          contactPerson: formData.contactPerson,
          phone: formData.phone,
          email: formData.email,
          partnershipType: formData.partnershipType,
        },
      });
      toast.success('파트너 신청이 완료되었습니다.');
      navigate('/apply/partner/status');
    } catch (error: any) {
      const errorCode = error.response?.data?.code;
      if (errorCode === 'DUPLICATE_ENROLLMENT') {
        toast.error('이미 신청하셨습니다.');
        navigate('/apply/partner/status');
      } else {
        toast.error('신청 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">파트너 신청</h1>
            <p className="text-gray-600 mb-8">
              O4O 플랫폼에 파트너로 등록하시려면 아래 양식을 작성해주세요.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">회사명 *</label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">담당자명 *</label>
                <input
                  type="text"
                  required
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">연락처 *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">이메일 *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">파트너십 유형</label>
                <select
                  value={formData.partnershipType}
                  onChange={(e) => setFormData({ ...formData, partnershipType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">선택하세요</option>
                  <option value="distributor">유통 파트너</option>
                  <option value="tech">기술 파트너</option>
                  <option value="marketing">마케팅 파트너</option>
                  <option value="other">기타</option>
                </select>
              </div>
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={(e) => setFormData({ ...formData, agreeTerms: e.target.checked })}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="agreeTerms" className="ml-2 text-sm text-gray-700">
                  개인정보 수집 및 이용에 동의합니다. *
                </label>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? '신청 중...' : '신청하기'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ApplyPartner;
