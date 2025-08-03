import { useState, FC } from 'react';
import { useNavigate } from 'react-router-dom';
import useToast from '../../hooks/useToast';

interface ApprovalUser {
  id: string;
  name: string;
  email: string;
  licenseNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

// Mock data for testing
const mockUsers: ApprovalUser[] = [
  {
    id: '1',
    name: '김약사',
    email: 'pharmacist1@example.com',
    licenseNumber: '12345',
    status: 'pending',
    createdAt: '2024-03-15T10:00:00Z',
  },
  {
    id: '2',
    name: '이약사',
    email: 'pharmacist2@example.com',
    licenseNumber: '67890',
    status: 'pending',
    createdAt: '2024-03-15T11:30:00Z',
  },
];

const YaksaApprovalList: FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [users, setUsers] = useState(mockUsers);

  const handleApprove = (id: string) => {
    setUsers(users.map((user: any) => 
      user.id === id ? { ...user, status: 'approved' } : user
    ));
    showToast({ type: 'success', message: '약사 회원이 승인되었습니다.' });
  };

  const handleReject = (id: string) => {
    setUsers(users.map((user: any) => 
      user.id === id ? { ...user, status: 'rejected' } : user
    ));
    showToast({ type: 'error', message: '약사 회원이 거절되었습니다.' });
  };

  const getStatusBadge = (status: ApprovalUser['status']) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    const labels = {
      pending: '대기중',
      approved: '승인됨',
      rejected: '거절됨',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">약사 회원 승인 관리</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            약사 회원 가입 요청을 검토하고 승인 또는 거절할 수 있습니다.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    이름
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    이메일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    면허번호
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    가입일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {user.licenseNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {user.status === 'pending' && (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleApprove(user.id)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => handleReject(user.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            거절
                          </button>
                        </div>
                      )}
                      {user.status !== 'pending' && (
                        <button
                          onClick={() => navigate(`/admin/approvals/${user.id}`)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          상세보기
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YaksaApprovalList; 