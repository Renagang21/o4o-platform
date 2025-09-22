import { useState, useEffect, FC } from 'react';
import { X } from 'lucide-react';
import { useAuth, UserRole } from '../contexts/AuthContext';

const getBannerContent = (role: string | undefined) => {
  switch (role) {
    case 'b2c':
      return {
        title: '환영합니다! 🎉',
        message: '커뮤니티에 참여하고 다양한 정보를 나눠보세요.',
        bg: 'bg-blue-100',
        text: 'text-blue-800',
      };
    case 'yaksa':
      return {
        title: '약사 인증 대기 중',
        message: '약사 인증이 완료되면 모든 기능을 이용할 수 있습니다.',
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
      };
    case 'admin':
      return {
        title: '관리자님, 환영합니다!',
        message: '승인 및 모니터링을 시작하세요.',
        bg: 'bg-green-100',
        text: 'text-green-800',
      };
    default:
      return null;
  }
};

const OnboardingBanner: FC = () => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    const key = `onboarding_banner_${user.roles[0] as UserRole}`;
    const dismissed = localStorage.getItem(key);
    setIsVisible(!dismissed);
  }, [user]);

  if (!user) return null;
  const content = getBannerContent(user.roles[0] as UserRole);
  if (!content || !isVisible) return null;

  const handleDismiss = () => {
    localStorage.setItem(`onboarding_banner_${user.roles[0] as UserRole}`, '1');
    setIsVisible(false);
  };

  return (
    <div className={`w-full flex items-center justify-between px-4 py-3 ${content.bg} ${content.text} shadow-md`}>
      <div>
        <div className="font-bold text-lg">{content.title}</div>
        <div className="text-sm mt-1">{content.message}</div>
      </div>
      <button onClick={handleDismiss} className="ml-4 p-1 rounded hover:bg-white/20 focus:outline-none">
        <X size={20} />
      </button>
    </div>
  );
};

export default OnboardingBanner; 
