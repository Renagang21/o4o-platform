import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';

interface LoginFormData {
  email: string;
  password: string;
}

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const [loginError, setLoginError] = useState<string>('');

  const validateForm = () => {
    const newErrors: Partial<LoginFormData> = {};

    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '유효한 이메일 주소를 입력해주세요';
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!validateForm()) {
      return;
    }

    try {
      // API 호출 로직 구현
      // 임시로 성공했다고 가정
      const userRole = 'seller'; // API 응답에서 받아올 값
      const isApproved = false; // API 응답에서 받아올 값

      if (!isApproved && ['seller', 'supplier', 'yaksa'].includes(userRole)) {
        navigate('/pending', {
          state: {
            role: userRole,
            message: '승인이 완료되지 않았습니다. 승인 완료 시 알려드리겠습니다.'
          }
        });
      } else {
        navigate('/');
      }
    } catch (error) {
      setLoginError('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div>
          <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-text-main">
            로그인
          </h2>
          <p className="mt-2 text-center text-sm text-text-secondary">
            O4O 플랫폼에 오신 것을 환영합니다
          </p>
          {location.state?.message && (
            <p className="mt-2 text-center text-sm text-success">
              {location.state.message}
            </p>
          )}
        </div>

        <form className="mt-6 sm:mt-8 space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-3 sm:space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                이메일
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-text-secondary" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="appearance-none rounded-lg relative block w-full px-3 py-3 sm:py-2 pl-10 border border-gray-300 placeholder-gray-500 text-text-main focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm min-h-[48px]"
                  placeholder="이메일"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-danger">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                비밀번호
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-text-secondary" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="appearance-none rounded-lg relative block w-full px-3 py-3 sm:py-2 pl-10 border border-gray-300 placeholder-gray-500 text-text-main focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm min-h-[48px]"
                  placeholder="비밀번호"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-danger">{errors.password}</p>
              )}
            </div>
          </div>

          {loginError && (
            <div className="text-center">
              <p className="text-sm text-danger">{loginError}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 sm:py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary min-h-[48px]"
            >
              로그인
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-text-secondary">
              계정이 없으신가요?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="font-medium text-primary hover:text-primary-dark"
              >
                회원가입
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm; 