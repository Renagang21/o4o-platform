import { FC } from 'react';
const PendingUsers: FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">승인 대기 사용자</h1>
        <p className="text-gray-600 mt-1">가입 승인을 기다리는 사용자들을 관리합니다</p>
      </div>

      <div className="wp-card">
        <div className="wp-card-body">
          <div className="text-center py-12 text-gray-500">
            <p>승인 대기 사용자 페이지는 개발 중입니다.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PendingUsers
