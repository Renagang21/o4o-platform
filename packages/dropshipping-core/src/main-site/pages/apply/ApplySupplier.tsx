import { FC, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { cookieAuthClient } from '@o4o/auth-client';
import { useAuth } from '@o4o/auth-context';
import Layout from '@/components/layout/Layout';
import toast from 'react-hot-toast';

/**
 * P0 RBAC: Supplier Application Page
 * - Users apply to become a supplier
 * - Creates enrollment with 'supplier' role
 */
const ApplySupplier: FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    companyName: '',
    businessNumber: '',
    contactPerson: '',
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
      // Create enrollment
      await cookieAuthClient.createEnrollment({
        role: 'supplier',
        metadata: {
          companyName: formData.companyName,
          businessNumber: formData.businessNumber,
          contactPerson: formData.contactPerson,
          phone: formData.phone,
          email: formData.email,
        },
      });

      toast.success('공급자 신청이 완료되었습니다.');
      navigate('/apply/supplier/status');
    } catch (error: any) {
      const errorCode = error.response?.data?.code;

      switch (errorCode) {
        case 'DUPLICATE_ENROLLMENT':
          toast.error('이미 신청하셨습니다.');
          navigate('/apply/supplier/status');
          break;
        case 'VALIDATION_ERROR':
          toast.error('입력 정보를 확인해주세요.');
          break;
        case 'TOO_MANY_REQUESTS':
          toast.error('너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.');
          break;
        default:
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">공급자 신청</h1>
            <p className="text-gray-600 mb-8">
              O4O 플랫폼에 공급자로 등록하시려면 아래 양식을 작성해주세요.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  회사명 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  사업자 번호 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.businessNumber}
                  onChange={(e) => setFormData({ ...formData, businessNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  담당자명 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  연락처 *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이메일 *
                </label>
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

export default ApplySupplier;
