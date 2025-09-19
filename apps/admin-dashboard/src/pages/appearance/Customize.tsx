import React from 'react';
import { AstraCustomizer } from './astra-customizer/AstraCustomizer';
import { useNavigate } from 'react-router-dom';
import { getPublicOrigin } from '../../utils/publicUrls';
import { authClient } from '@o4o/auth-client';

const Customize: React.FC = () => {
  const navigate = useNavigate();
  
  const handleClose = () => {
    navigate('/appearance/themes');
  };
  
  const handleSave = async (settings: any) => {
    try {
      // Save customizer settings via authenticated API
      const response = await authClient.api.post('/v1/settings/customizer', {
        settings: settings,
        type: 'astra-customizer'
      });

      // Settings saved successfully
    } catch (error) {
      console.error('Failed to save customizer settings:', error);
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