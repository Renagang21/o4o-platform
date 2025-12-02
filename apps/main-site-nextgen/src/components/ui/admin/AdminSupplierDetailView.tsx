interface AdminSupplierDetailViewProps {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  businessInfo: {
    name: string;
    registration: string;
    address: string;
  };
  productsCount: number;
  ordersCount: number;
  joinedAt: string;
  lastActive: string;
  notes?: string;
}

const statusConfig = {
  pending: { label: '대기중', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: '승인됨', color: 'bg-green-100 text-green-800' },
  rejected: { label: '거부됨', color: 'bg-red-100 text-red-800' },
  suspended: { label: '정지됨', color: 'bg-gray-100 text-gray-800' },
};

export function AdminSupplierDetailView({
  name,
  email,
  phone,
  status,
  businessInfo,
  productsCount,
  ordersCount,
  joinedAt,
  lastActive,
  notes,
}: AdminSupplierDetailViewProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">공급자 상세 정보</h1>
        <span
          className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
            statusConfig[status].color
          }`}
        >
          {statusConfig[status].label}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-sm text-gray-600 mb-1">상품수</div>
          <div className="text-3xl font-bold text-blue-600">{productsCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-sm text-gray-600 mb-1">주문수</div>
          <div className="text-3xl font-bold text-green-600">{ordersCount}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">개인 정보</h2>
        <div className="space-y-3">
          <div className="flex">
            <span className="text-gray-600 w-32">이름:</span>
            <span className="font-medium">{name}</span>
          </div>
          <div className="flex">
            <span className="text-gray-600 w-32">이메일:</span>
            <span className="font-medium">{email}</span>
          </div>
          <div className="flex">
            <span className="text-gray-600 w-32">전화번호:</span>
            <span className="font-medium">{phone}</span>
          </div>
          <div className="flex">
            <span className="text-gray-600 w-32">가입일:</span>
            <span className="font-medium">{new Date(joinedAt).toLocaleDateString()}</span>
          </div>
          <div className="flex">
            <span className="text-gray-600 w-32">최근 활동:</span>
            <span className="font-medium">{new Date(lastActive).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">사업자 정보</h2>
        <div className="space-y-3">
          <div className="flex">
            <span className="text-gray-600 w-32">상호명:</span>
            <span className="font-medium">{businessInfo.name}</span>
          </div>
          <div className="flex">
            <span className="text-gray-600 w-32">사업자등록번호:</span>
            <span className="font-medium">{businessInfo.registration}</span>
          </div>
          <div className="flex">
            <span className="text-gray-600 w-32">주소:</span>
            <span className="font-medium">{businessInfo.address}</span>
          </div>
        </div>
      </div>

      {notes && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">관리자 메모</h2>
          <div className="text-gray-700">{notes}</div>
        </div>
      )}

      <div className="flex gap-4">
        {status === 'pending' && (
          <>
            <button className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition">
              승인
            </button>
            <button className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition">
              거부
            </button>
          </>
        )}
        {status === 'approved' && (
          <button className="px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition">
            정지
          </button>
        )}
        <button className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:border-gray-400 transition">
          메모 수정
        </button>
      </div>
    </div>
  );
}
