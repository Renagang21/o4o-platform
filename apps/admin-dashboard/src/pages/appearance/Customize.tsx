import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminFullscreen } from '@/hooks/useAdminFullscreen';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { SimpleCustomizer } from './astra-customizer/SimpleCustomizer';

const Customize: React.FC = () => {
  const navigate = useNavigate();
  const adminFullscreen = useAdminFullscreen();
  
  // 풀스크린 모드 관리
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.add('customizer-fullscreen');
    }
    // Manage fullscreen state
    adminFullscreen.enter('customize');
    return () => {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('customizer-fullscreen');
      }
      adminFullscreen.exit();
    };
  }, [adminFullscreen]);
  
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
    <SimpleCustomizer
      onClose={handleClose}
      previewUrl="/"
      siteName="Neture Platform"
      onSave={handleSave}
    />
  );
};

export default Customize;
