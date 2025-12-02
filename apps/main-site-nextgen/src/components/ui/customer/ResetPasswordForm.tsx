export function ResetPasswordForm() {
  return (
    <div className="max-w-md mx-auto p-8 bg-white rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">비밀번호 재설정</h2>
      <p className="text-sm text-gray-600 mb-6">
        등록된 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
      </p>
      <form className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            이메일
          </label>
          <input
            id="email"
            type="email"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="your@email.com"
          />
        </div>
        <button
          type="submit"
          className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
        >
          재설정 링크 보내기
        </button>
        <div className="text-center text-sm text-gray-600">
          <a href="/login" className="text-blue-600 hover:underline">
            ← 로그인으로 돌아가기
          </a>
        </div>
      </form>
    </div>
  );
}
