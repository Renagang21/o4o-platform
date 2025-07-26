import React from 'react';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

const ApprovalNotice: FC = () => {
  const notices = [
    {
      id: '1',
      type: 'success',
      title: '판매자 인증 완료',
      message: '판매자 인증이 완료되었습니다. 이제 상품을 등록하고 판매를 시작할 수 있습니다.',
      date: '2024-03-15'
    },
    {
      id: '2',
      type: 'warning',
      title: '상품 승인 대기',
      message: '3개의 상품이 승인 대기 중입니다. 승인까지 1-2일이 소요될 수 있습니다.',
      date: '2024-03-14'
    },
    {
      id: '3',
      type: 'error',
      title: '서류 제출 필요',
      message: '판매자 인증을 위해 추가 서류가 필요합니다. 마이페이지에서 확인해주세요.',
      date: '2024-03-13'
    }
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          승인 현황
        </h2>
      </div>

      <div className="divide-y divide-gray-200">
        {notices.map((notice) => (
          <div key={notice.id} className="p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {getIcon(notice.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {notice.title}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {notice.message}
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  {notice.date}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApprovalNotice; 