import { FC, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { cookieAuthClient } from '@o4o/auth-client';
import { useAuth } from '@o4o/auth-context';
import Layout from '@/components/layout/Layout';
import toast from 'react-hot-toast';

/**
 * P0 RBAC: Seller Application Page
 */
const ApplySeller: FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    storeName: '',
    businessNumber: '',
    phone: '',
    email: user?.email || '',
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
        role: 'seller',
        metadata: {
          storeName: formData.storeName,
          businessNumber: formData.businessNumber,
          phone: formData.phone,
          email: formData.email,
        },
      });
      toast.success('판매자 신청이 완료되었습니다.');
      navigate('/apply/seller/status');
    } catch (error: any) {
      const errorCode = error.response?.data?.code;
      if (errorCode === 'DUPLICATE_ENROLLMENT') {
        toast.error('이미 신청하셨습니다.');
        navigate('/apply/seller/status');
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">판매자 신청</h1>
            <p className="text-gray-600 mb-8">
              O4O 플랫폼에 판매자로 등록하시려면 아래 양식을 작성해주세요.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">상호명 *</label>
                <input
                  type="text"
                  required
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">사업자 번호 *</label>
                <input
                  type="text"
                  required
                  value={formData.businessNumber}
                  onChange={(e) => setFormData({ ...formData, businessNumber: e.target.value })}
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

export default ApplySeller;
