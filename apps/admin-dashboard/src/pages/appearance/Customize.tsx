import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminFullscreen } from '@/hooks/useAdminFullscreen';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { AstraCustomizer } from './astra-customizer/AstraCustomizer';

const Customize: React.FC = () => {
  const navigate = useNavigate();
  const { enter, exit } = useAdminFullscreen();
  
  // 풀스크린 모드 관리
  useEffect(() => {
    document.body.classList.add('customizer-fullscreen');
    enter('customize');
    
    return () => {
      document.body.classList.remove('customizer-fullscreen');
      exit();
    };
  }, [enter, exit]);
  
  const handleClose = () => {
    navigate('/admin');
  };
  
  const handleSave = async (settings: any) => {
    try {
      // API를 통해 설정 저장
      const response = await authClient.api.post('/v1/settings/customizer', {
        settings: settings,
        type: 'astra-customizer'
      });

      if (response.data?.success) {
        toast.success('설정이 저장되었습니다.');
        return true;
      }
      return false;
    } catch (error: any) {
      const statusCode = error?.response?.status;
      const errorCode = error?.response?.data?.code;

      if (statusCode === 401 || statusCode === 403) {
        if (errorCode === 'USER_NOT_AUTHENTICATED') {
          toast.error('세션이 만료되었습니다. 다시 로그인해주세요.');
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        } else if (errorCode === 'INSUFFICIENT_PERMISSIONS') {
          toast.error('설정을 저장할 권한이 없습니다.');
        } else {
          toast.error('인증 오류가 발생했습니다.');
        }
      } else {
        const message = error?.response?.data?.message || '설정 저장 중 오류가 발생했습니다.';
        toast.error(message);
      }
      return false;
    }
  };
  
  return (
    <AstraCustomizer
      onClose={handleClose}
      previewUrl={import.meta.env.VITE_PUBLIC_APP_ORIGIN || window.location.origin}
      siteName="Neture Platform"
      onSave={handleSave}
    />
  );
};

export default Customize;
