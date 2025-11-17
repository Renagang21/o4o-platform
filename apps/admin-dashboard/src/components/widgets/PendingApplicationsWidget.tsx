import { FC } from 'react';
import { Link } from 'react-router-dom';
import { FileCheck, ArrowRight } from 'lucide-react';
import { useRoleApplicationsCount } from '@/hooks/useRoleApplicationsCount';

/**
 * Pending Applications Widget for Admin Dashboard
 * Displays the number of pending role applications
 */
const PendingApplicationsWidget: FC = () => {
  const { count, isLoading } = useRoleApplicationsCount();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="font-medium">역할 신청 관리</h3>
      </div>
      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-50">
                <FileCheck className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <div className="text-3xl font-semibold">
                  {count}
                </div>
                <div className="text-sm text-gray-600">
                  대기 중인 신청
                </div>
              </div>
            </div>

            {count > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-700 mb-3">
                  {count}개의 역할 신청이 승인을 기다리고 있습니다.
                </p>
                <Link
                  to="/admin/role-applications"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  신청 관리하기
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {count === 0 && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  현재 대기 중인 역할 신청이 없습니다.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingApplicationsWidget;
