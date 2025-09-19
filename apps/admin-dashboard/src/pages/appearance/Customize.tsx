import React from 'react';
import { AstraCustomizer } from './astra-customizer/AstraCustomizer';
import { useNavigate } from 'react-router-dom';

const Customize: React.FC = () => {
  const navigate = useNavigate();
  
  const handleClose = () => {
    navigate('/appearance/themes');
  };
  
  const handleSave = async (settings: any) => {
    try {
      // Save customizer settings via API
      const response = await fetch('/api/v1/settings/customizer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: settings,
          type: 'astra-customizer'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save customizer settings');
      }

      // Settings saved successfully
    } catch (error) {
      console.error('Failed to save customizer settings:', error);
      throw error;
    }
  };
  
  return (
    <AstraCustomizer
      onClose={handleClose}
      previewUrl={process.env.REACT_APP_MAIN_SITE_URL || "https://neture.co.kr"}
      siteName="Neture Platform"
      onSave={handleSave}
    />
  );
};

export default Customize;