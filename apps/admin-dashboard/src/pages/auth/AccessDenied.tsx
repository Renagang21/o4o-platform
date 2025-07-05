import { useEffect } from 'react'
import { useAuthStore } from '@/api/authStore'

const AccessDenied = () => {
  const logout = useAuthStore(state => state.logout)

  useEffect(() => {
    // 3초 후 자동 로그아웃 및 메인 사이트로 리디렉션
    const timer = setTimeout(() => {
      logout()
      // 메인 사이트로 리디렉션
      window.location.href = process.env.NODE_ENV === 'production' 
        ? 'https://neture.co.kr' 
        : 'http://localhost:3000'
    }, 3000)

    return () => clearTimeout(timer)
  }, [logout])

  const handleRedirectNow = () => {
    logout()
    window.location.href = process.env.NODE_ENV === 'production' 
      ? 'https://neture.co.kr' 
      : 'http://localhost:3000'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            접근 권한이 없습니다
          </h1>
          <p className="text-gray-600 mb-6">
            관리자 권한이 필요한 페이지입니다.<br />
            일반 사용자는 접근할 수 없습니다.
          </p>
        </div>

        <div className="space-y-4">
          <div className="text-sm text-gray-500">
            3초 후 자동으로 메인 페이지로 이동합니다...
          </div>
          
          <button
            onClick={handleRedirectNow}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200"
          >
            지금 메인 페이지로 이동
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            관리자 권한이 필요하시다면 시스템 관리자에게 문의하세요.
          </p>
        </div>
      </div>
    </div>
  )
}

export default AccessDenied