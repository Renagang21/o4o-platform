interface CustomerOverviewProps {
  name: string;
  email: string;
  phone?: string;
  ordersCount: number;
  wishlistCount: number;
  memberSince: string;
  address?: {
    street: string;
    city: string;
    zipCode: string;
  };
}

export function CustomerOverview({
  name,
  email,
  phone,
  ordersCount,
  wishlistCount,
  memberSince,
  address,
}: CustomerOverviewProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{name} 님의 계정</h1>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-gray-600 w-24">이메일:</span>
            <span className="font-medium">{email}</span>
          </div>

          {phone && (
            <div className="flex items-center gap-3">
              <span className="text-gray-600 w-24">전화번호:</span>
              <span className="font-medium">{phone}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="text-gray-600 w-24">가입일:</span>
            <span className="font-medium">{new Date(memberSince).toLocaleDateString()}</span>
          </div>
        </div>

        {address && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm font-medium text-gray-600 mb-2">배송 주소</div>
            <div className="text-gray-900">
              {address.street}, {address.city} {address.zipCode}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <a
          href="/orders"
          className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">주문 내역</div>
              <div className="text-3xl font-bold text-blue-600">{ordersCount}</div>
            </div>
            <div className="text-4xl">📦</div>
          </div>
        </a>

        <a
          href="/wishlist"
          className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">위시리스트</div>
              <div className="text-3xl font-bold text-purple-600">{wishlistCount}</div>
            </div>
            <div className="text-4xl">❤️</div>
          </div>
        </a>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">빠른 링크</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/profile"
            className="px-4 py-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-center"
          >
            프로필 수정
          </a>
          <a
            href="/orders"
            className="px-4 py-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-center"
          >
            주문 내역
          </a>
          <a
            href="/wishlist"
            className="px-4 py-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-center"
          >
            위시리스트
          </a>
        </div>
      </div>
    </div>
  );
}
