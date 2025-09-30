import React, { useEffect } from 'react';
import { AstraCustomizer } from './astra-customizer/AstraCustomizer';
import { useNavigate } from 'react-router-dom';
import { getPublicOrigin } from '../../utils/publicUrls';
import { authClient } from '@o4o/auth-client';
import { useAdminFullscreen } from '@/hooks/useAdminFullscreen';
import toast from 'react-hot-toast';

const Customize: React.FC = () => {
  const navigate = useNavigate();
  const adminFullscreen = useAdminFullscreen();
  
  // Apply fullscreen CSS class while Customizer is mounted
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
      // Save customizer settings via authenticated API
      const response = await authClient.api.post('/v1/settings/customizer', {
        settings: settings,
        type: 'astra-customizer'
      });

      if (response.data?.success) {
        toast.success('Customizer settings saved successfully');
      }
    } catch (error: any) {
      const statusCode = error?.response?.status;
      const errorCode = error?.response?.data?.code;

      // Handle authentication errors
      if (statusCode === 401 || statusCode === 403) {
        if (errorCode === 'USER_NOT_AUTHENTICATED') {
          toast.error('Session expired. Please log in again.');
          // Optionally redirect to login
          setTimeout(() => {
            window.location.href = '/admin/login';
          }, 2000);
        } else if (errorCode === 'INSUFFICIENT_PERMISSIONS') {
          toast.error('You do not have permission to save customizer settings.');
        } else {
          toast.error('Authentication error. Please try logging in again.');
        }
      } else {
        const message = error?.response?.data?.message || 'Failed to save customizer settings';
        toast.error(message);
      }
      throw error;
    }
  };
  
  return (
    <AstraCustomizer
      onClose={handleClose}
      previewUrl={import.meta.env.VITE_PUBLIC_APP_ORIGIN || getPublicOrigin()}
      siteName="Neture Platform"
      onSave={handleSave}
    />
  );
};

export default Customize;
