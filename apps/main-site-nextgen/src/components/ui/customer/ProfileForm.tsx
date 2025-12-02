interface ProfileFormProps {
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  bio?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  preferences: {
    newsletter: boolean;
    notifications: boolean;
  };
}

export function ProfileForm({
  name,
  email,
  phone,
  avatar,
  bio,
  address,
  preferences,
}: ProfileFormProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">프로필 설정</h1>

      {/* Profile Picture */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">프로필 사진</h2>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden">
            {avatar ? (
              <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl">
                👤
              </div>
            )}
          </div>
          <button className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:border-blue-500 transition">
            사진 변경
          </button>
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">기본 정보</h2>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
            <input
              type="text"
              defaultValue={name}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <input
              type="email"
              defaultValue={email}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
            <input
              type="tel"
              defaultValue={phone}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">자기소개</label>
            <textarea
              defaultValue={bio}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="자기소개를 입력하세요"
            />
          </div>
        </form>
      </div>

      {/* Address */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">주소</h2>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">도로명 주소</label>
            <input
              type="text"
              defaultValue={address.street}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">도시</label>
              <input
                type="text"
                defaultValue={address.city}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">시/도</label>
              <input
                type="text"
                defaultValue={address.state}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">우편번호</label>
              <input
                type="text"
                defaultValue={address.zipCode}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">국가</label>
              <input
                type="text"
                defaultValue={address.country}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </form>
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">알림 설정</h2>
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              defaultChecked={preferences.newsletter}
              className="mr-3"
            />
            <div>
              <div className="font-medium">뉴스레터 수신</div>
              <div className="text-sm text-gray-600">최신 상품 및 프로모션 정보를 받습니다</div>
            </div>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              defaultChecked={preferences.notifications}
              className="mr-3"
            />
            <div>
              <div className="font-medium">주문 알림</div>
              <div className="text-sm text-gray-600">주문 상태 변경 시 알림을 받습니다</div>
            </div>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition">
          변경사항 저장
        </button>
        <button className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:border-gray-400 transition">
          취소
        </button>
      </div>
    </div>
  );
}
